import { SignalBus } from '../core/SignalBus';
import { Signal, ResourceId, PanelId, SignalHandler } from '../types/Signal';
import { ResourceAPI } from '../types/Resource';
import { 
  PanelAPI,
  PanelConfig,
  PanelState,
  PanelMetrics,
  PanelLifecyclePhase,
  PanelVisibility,
  PanelLifecycleEvent,
  PanelVisibilityEvent,
  PanelFocusEvent,
  PanelCoordination
} from '../types/Panel';
import { SIGNAL_TYPES } from '../signals/SignalTypes';

/**
 * Abstract base class for all panels in the panel system.
 * Provides lifecycle management, resource coordination, signal handling,
 * and state management with proper cleanup coordination.
 */
export abstract class BasePanel implements PanelAPI {
  public readonly id: PanelId;
  public readonly type: string;
  public config: PanelConfig;

  protected state: PanelState;
  protected metrics: PanelMetrics;
  protected resources = new Map<ResourceId, ResourceAPI>();
  protected signalBus: SignalBus;
  
  // Signal handling
  private signalHandlers = new Map<string, Set<SignalHandler>>();
  private cleanupCallbacks = new Set<() => void>();
  
  // Event handlers
  private lifecycleEventHandlers = new Set<(event: PanelLifecycleEvent) => void>();
  private visibilityEventHandlers = new Set<(event: PanelVisibilityEvent) => void>();
  private focusEventHandlers = new Set<(event: PanelFocusEvent) => void>();
  
  // Coordination
  private coordinations = new Map<string, PanelCoordination>();
  
  constructor(
    config: PanelConfig,
    signalBus: SignalBus = SignalBus.getInstance()
  ) {
    this.id = config.id;
    this.type = config.type;
    this.config = { ...config };
    this.signalBus = signalBus;
    
    this.state = {
      phase: PanelLifecyclePhase.CREATED,
      visibility: config.visibility || PanelVisibility.HIDDEN,
      isActive: false,
      isFocused: false,
      isLoading: false,
      hasError: false,
      resourceCount: 0,
      lastActivity: Date.now(),
    };
    
    this.metrics = {
      createdAt: Date.now(),
      lastActivated: 0,
      totalActivations: 0,
      totalTimeActive: 0,
      resourcesLoaded: 0,
      resourcesUnloaded: 0,
      signalsEmitted: 0,
      signalsReceived: 0,
      errors: 0,
    };
    
    this.setupDefaultSignalHandlers();
  }

  // Abstract methods that must be implemented by concrete panels
  abstract render(): any;
  protected abstract initializePanel(): Promise<void>;
  protected abstract destroyPanel(): Promise<void>;

  // Lifecycle Management
  
  async initialize(): Promise<void> {
    if (this.state.phase !== PanelLifecyclePhase.CREATED) {
      throw new Error(`Cannot initialize panel in ${this.state.phase} phase`);
    }
    
    this.setState({ phase: PanelLifecyclePhase.INITIALIZING, isLoading: true });
    
    try {
      await this.initializePanel();
      this.setState({ 
        phase: PanelLifecyclePhase.READY, 
        isLoading: false 
      });
      
      this.emitLifecycleEvent({
        panelId: this.id,
        phase: PanelLifecyclePhase.READY,
        previousPhase: PanelLifecyclePhase.INITIALIZING,
        timestamp: Date.now(),
      });
      
      await this.emitSignal(SIGNAL_TYPES.SHOW_PANEL, {
        panelId: this.id,
        resourceId: this.state.activeResourceId,
      });
      
    } catch (error) {
      this.setState({ 
        phase: PanelLifecyclePhase.ERROR, 
        isLoading: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      this.metrics.errors++;
      throw error;
    }
  }

  async activate(): Promise<void> {
    if (this.state.phase === PanelLifecyclePhase.ERROR) {
      throw new Error('Cannot activate panel in error state');
    }
    
    if (this.state.phase === PanelLifecyclePhase.CREATED) {
      await this.initialize();
    }
    
    const wasActive = this.state.isActive;
    this.setState({ 
      phase: PanelLifecyclePhase.ACTIVE,
      isActive: true,
      lastActivity: Date.now()
    });
    
    if (!wasActive) {
      this.metrics.totalActivations++;
      this.metrics.lastActivated = Date.now();
      
      this.emitLifecycleEvent({
        panelId: this.id,
        phase: PanelLifecyclePhase.ACTIVE,
        previousPhase: PanelLifecyclePhase.READY,
        timestamp: Date.now(),
      });
    }
  }

  async deactivate(): Promise<void> {
    if (!this.state.isActive) {
      return; // Already inactive
    }
    
    const activeTime = Date.now() - this.metrics.lastActivated;
    this.metrics.totalTimeActive += activeTime;
    
    this.setState({ 
      phase: PanelLifecyclePhase.INACTIVE,
      isActive: false,
      isFocused: false
    });
    
    this.emitLifecycleEvent({
      panelId: this.id,
      phase: PanelLifecyclePhase.INACTIVE,
      previousPhase: PanelLifecyclePhase.ACTIVE,
      timestamp: Date.now(),
    });
    
    await this.emitSignal(SIGNAL_TYPES.HIDE_PANEL, {
      panelId: this.id,
      reason: 'deactivated',
    });
  }

  async destroy(): Promise<void> {
    if (this.state.phase === PanelLifecyclePhase.DESTROYED) {
      return; // Already destroyed
    }
    
    this.setState({ phase: PanelLifecyclePhase.DESTROYING });
    
    try {
      // Clean up all resources
      for (const resource of this.resources.values()) {
        await this.removeResource(resource.id);
      }
      
      // Perform panel-specific cleanup
      await this.destroyPanel();
      
      // Clean up signal handlers and callbacks
      this.cleanupSignalHandlers();
      this.executeCleanupCallbacks();
      
      this.setState({ phase: PanelLifecyclePhase.DESTROYED });
      
      this.emitLifecycleEvent({
        panelId: this.id,
        phase: PanelLifecyclePhase.DESTROYED,
        previousPhase: PanelLifecyclePhase.DESTROYING,
        timestamp: Date.now(),
      });
      
    } catch (error) {
      this.setState({ 
        phase: PanelLifecyclePhase.ERROR,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Destroy failed'
      });
      this.metrics.errors++;
      throw error;
    }
  }

  // State Management
  
  getState(): PanelState {
    return { ...this.state };
  }

  setState(newState: Partial<PanelState>): void {
    const previousState = { ...this.state };
    this.state = { ...this.state, ...newState };
    
    // Emit state change signal
    this.emitSignal(SIGNAL_TYPES.RESOURCE_STATE_CHANGED, {
      panelId: this.id,
      state: this.state,
      previousState,
      timestamp: Date.now(),
    });
  }

  getMetrics(): PanelMetrics {
    return { ...this.metrics };
  }

  // Visibility Management
  
  async show(): Promise<void> {
    await this.setVisibility(PanelVisibility.VISIBLE);
  }

  async hide(): Promise<void> {
    await this.setVisibility(PanelVisibility.HIDDEN);
  }

  async minimize(): Promise<void> {
    await this.setVisibility(PanelVisibility.MINIMIZED);
  }

  async maximize(): Promise<void> {
    await this.setVisibility(PanelVisibility.MAXIMIZED);
  }

  async setVisibility(visibility: PanelVisibility): Promise<void> {
    const previousVisibility = this.state.visibility;
    
    if (previousVisibility === visibility) {
      return; // No change needed
    }
    
    this.setState({ visibility });
    this.config.visibility = visibility;
    
    this.emitVisibilityEvent({
      panelId: this.id,
      visibility,
      previousVisibility,
      timestamp: Date.now(),
    });
    
    await this.emitSignal(SIGNAL_TYPES.PANEL_VISIBILITY_CHANGED, {
      panelId: this.id,
      visibility,
      previousVisibility,
      isVisible: visibility === PanelVisibility.VISIBLE,
    });
  }

  // Focus Management
  
  async focus(): Promise<void> {
    if (this.state.isFocused) {
      return; // Already focused
    }
    
    this.setState({ isFocused: true, lastActivity: Date.now() });
    
    this.emitFocusEvent({
      panelId: this.id,
      isFocused: true,
      timestamp: Date.now(),
      source: 'system',
    });
    
    await this.emitSignal(SIGNAL_TYPES.FOCUS_PANEL, {
      panelId: this.id,
      focus: true,
    });
  }

  async blur(): Promise<void> {
    if (!this.state.isFocused) {
      return; // Already blurred
    }
    
    this.setState({ isFocused: false });
    
    this.emitFocusEvent({
      panelId: this.id,
      isFocused: false,
      timestamp: Date.now(),
      source: 'system',
    });
  }

  isFocused(): boolean {
    return this.state.isFocused;
  }

  // Resource Management
  
  async addResource(resource: ResourceAPI): Promise<void> {
    if (this.resources.has(resource.id)) {
      throw new Error(`Resource ${resource.id} already exists in panel ${this.id}`);
    }
    
    this.resources.set(resource.id, resource);
    this.setState({ 
      resourceCount: this.resources.size,
      lastActivity: Date.now()
    });
    this.metrics.resourcesLoaded++;
    
    // Set as active resource if it's the first one
    if (this.resources.size === 1) {
      this.setState({ activeResourceId: resource.id });
    }
    
    await this.emitSignal(SIGNAL_TYPES.SHOW_RESOURCE, {
      resourceId: resource.id,
      panelId: this.id,
    });
  }

  async removeResource(resourceId: ResourceId): Promise<void> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return; // Resource doesn't exist
    }
    
    // Unmount the resource if it has an unmount method
    if (typeof resource.unmount === 'function') {
      await resource.unmount();
    }
    
    this.resources.delete(resourceId);
    this.setState({ resourceCount: this.resources.size });
    this.metrics.resourcesUnloaded++;
    
    // Update active resource if needed
    if (this.state.activeResourceId === resourceId) {
      const remainingResources = Array.from(this.resources.keys());
      this.setState({ 
        activeResourceId: remainingResources.length > 0 ? remainingResources[0] : undefined 
      });
    }
    
    await this.emitSignal(SIGNAL_TYPES.HIDE_RESOURCE, {
      resourceId,
      panelId: this.id,
    });
  }

  getResource(resourceId: ResourceId): ResourceAPI | undefined {
    return this.resources.get(resourceId);
  }

  getResources(): ResourceAPI[] {
    return Array.from(this.resources.values());
  }

  getActiveResource(): ResourceAPI | undefined {
    return this.state.activeResourceId ? this.resources.get(this.state.activeResourceId) : undefined;
  }

  async setActiveResource(resourceId: ResourceId): Promise<void> {
    if (!this.resources.has(resourceId)) {
      throw new Error(`Resource ${resourceId} not found in panel ${this.id}`);
    }
    
    const previousActiveId = this.state.activeResourceId;
    this.setState({ 
      activeResourceId: resourceId,
      lastActivity: Date.now()
    });
    
    await this.emitSignal(SIGNAL_TYPES.FOCUS_RESOURCE, {
      resourceId,
      panelId: this.id,
      previousResourceId: previousActiveId,
    });
  }

  // Signal Handling
  
  onSignal(signalType: string, handler: SignalHandler): () => void {
    if (!this.signalHandlers.has(signalType)) {
      this.signalHandlers.set(signalType, new Set());
    }
    
    this.signalHandlers.get(signalType)!.add(handler);
    
    // Register with signal bus
    const unsubscribe = this.signalBus.onPanel(this.id, signalType, handler);
    
    // Return cleanup function
    return () => {
      this.signalHandlers.get(signalType)?.delete(handler);
      unsubscribe();
    };
  }

  async emitSignal<TPayload = any>(
    signalType: string,
    payload: TPayload,
    target?: { panelId?: PanelId; resourceId?: ResourceId }
  ): Promise<void> {
    const signal: Signal<TPayload> = {
      type: signalType,
      source: { 
        panelId: this.id,
        resourceId: this.state.activeResourceId || 'panel-system'
      },
      target,
      payload,
      metadata: {
        timestamp: Date.now(),
      }
    };
    
    this.metrics.signalsEmitted++;
    await this.signalBus.emit(signal);
  }

  // Configuration
  
  async updateConfig(config: Partial<PanelConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Update state if visibility changed
    if (config.visibility && config.visibility !== this.state.visibility) {
      await this.setVisibility(config.visibility);
    }
  }

  getConfig(): PanelConfig {
    return { ...this.config };
  }

  // Event Handling
  
  onLifecycleEvent(handler: (event: PanelLifecycleEvent) => void): () => void {
    this.lifecycleEventHandlers.add(handler);
    return () => this.lifecycleEventHandlers.delete(handler);
  }

  onVisibilityEvent(handler: (event: PanelVisibilityEvent) => void): () => void {
    this.visibilityEventHandlers.add(handler);
    return () => this.visibilityEventHandlers.delete(handler);
  }

  onFocusEvent(handler: (event: PanelFocusEvent) => void): () => void {
    this.focusEventHandlers.add(handler);
    return () => this.focusEventHandlers.delete(handler);
  }

  // Coordination
  
  addCoordination(coordination: PanelCoordination): void {
    this.coordinations.set(coordination.id, coordination);
  }

  removeCoordination(coordinationId: string): void {
    this.coordinations.delete(coordinationId);
  }

  getCoordinations(): PanelCoordination[] {
    return Array.from(this.coordinations.values());
  }

  // Layout and Positioning
  
  async setPosition(x: number, y: number): Promise<void> {
    this.config.position = { ...this.config.position!, x, y };
  }

  async setSize(width: number, height: number): Promise<void> {
    this.config.position = { ...this.config.position!, width, height };
  }

  async setBounds(x: number, y: number, width: number, height: number): Promise<void> {
    this.config.position = { x, y, width, height };
  }

  // Refresh
  
  async refresh(): Promise<void> {
    this.setState({ lastActivity: Date.now() });
    // Override in subclasses for specific refresh logic
  }

  // Protected helper methods
  
  protected addCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.add(callback);
  }

  protected setupDefaultSignalHandlers(): void {
    // Handle resource lifecycle signals
    this.onSignal(SIGNAL_TYPES.RESOURCE_MOUNTED, async (signal) => {
      if (signal.payload.panelId === this.id) {
        this.metrics.signalsReceived++;
      }
    });
    
    this.onSignal(SIGNAL_TYPES.RESOURCE_UNMOUNTED, async (signal) => {
      if (signal.payload.panelId === this.id) {
        this.metrics.signalsReceived++;
      }
    });
  }

  // Private helper methods
  
  private emitLifecycleEvent(event: PanelLifecycleEvent): void {
    for (const handler of this.lifecycleEventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`[BasePanel] Lifecycle event handler failed:`, error);
      }
    }
  }

  private emitVisibilityEvent(event: PanelVisibilityEvent): void {
    for (const handler of this.visibilityEventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`[BasePanel] Visibility event handler failed:`, error);
      }
    }
  }

  private emitFocusEvent(event: PanelFocusEvent): void {
    for (const handler of this.focusEventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`[BasePanel] Focus event handler failed:`, error);
      }
    }
  }

  private cleanupSignalHandlers(): void {
    this.signalHandlers.clear();
  }

  private executeCleanupCallbacks(): void {
    for (const callback of this.cleanupCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error(`[BasePanel] Cleanup callback failed:`, error);
      }
    }
    this.cleanupCallbacks.clear();
  }
}

export default BasePanel; 