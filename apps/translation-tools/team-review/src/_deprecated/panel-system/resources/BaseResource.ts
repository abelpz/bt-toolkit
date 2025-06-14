import { SignalBus } from '../core/SignalBus';
import { Signal, ResourceId, PanelId, SignalHandler } from '../types/Signal';
import { CleanupReason } from '../types/Cleanup';
import { 
  ResourceState, 
  ResourceConfig, 
  ResourceMetadata,
  ResourceNavigationData,
  ResourceLifecyclePhase as LifecyclePhase
} from '../types/Resource';
import { SIGNAL_TYPES } from '../signals/SignalTypes';

/**
 * Abstract base class for all resources in the panel system.
 * Provides lifecycle management, signal handling, state management,
 * and navigation capabilities with proper cleanup coordination.
 */
export abstract class BaseResource<
  TState extends ResourceState = ResourceState,
  TConfig extends ResourceConfig = ResourceConfig
> {
  protected readonly resourceId: ResourceId;
  protected readonly panelId: PanelId;
  protected readonly resourceType: string;
  protected readonly signalBus: SignalBus;
  
  protected state: TState;
  protected config: TConfig;
  protected metadata: ResourceMetadata;
  protected lifecyclePhase: LifecyclePhase = LifecyclePhase.CREATED;
  
  // Signal handling
  private signalHandlers = new Map<string, Set<SignalHandler>>();
  private cleanupCallbacks = new Set<() => void>();
  
  // Navigation
  private navigationHistory: ResourceNavigationData[] = [];
  private currentNavigationIndex = -1;
  
  constructor(
    panelId: PanelId,
    resourceId: ResourceId,
    resourceType: string,
    initialState: TState,
    config: TConfig,
    signalBus: SignalBus = SignalBus.getInstance()
  ) {
    this.panelId = panelId;
    this.resourceId = resourceId;
    this.resourceType = resourceType;
    this.state = initialState;
    this.config = config;
    this.signalBus = signalBus;
    
    this.metadata = {
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      version: '1.0.0',
      tags: [],
      custom: {}
    };
    
    this.setupDefaultSignalHandlers();
  }

  // Abstract methods that must be implemented by concrete resources
  abstract initialize(): Promise<void>;
  abstract render(): any; // Platform-specific rendering
  abstract cleanup(): Promise<void>;
  abstract getDisplayName(): string;

  // Lifecycle Management
  
  /**
   * Mount the resource and initialize it
   */
  async mount(): Promise<void> {
    if (this.lifecyclePhase !== LifecyclePhase.CREATED) {
      throw new Error(`Cannot mount resource in ${this.lifecyclePhase} phase`);
    }
    
    this.lifecyclePhase = LifecyclePhase.MOUNTING;
    
    try {
      await this.initialize();
      this.lifecyclePhase = LifecyclePhase.MOUNTED;
      this.updateMetadata();
      
      // Emit mounted signal
      await this.emitSignal(SIGNAL_TYPES.RESOURCE_MOUNTED, {
        resourceId: this.resourceId,
        resourceType: this.resourceType,
        panelId: this.panelId
      });
      
    } catch (error) {
      this.lifecyclePhase = LifecyclePhase.ERROR;
      throw error;
    }
  }

  /**
   * Unmount the resource with proper cleanup signal emission
   */
  async unmount(reason: CleanupReason = CleanupReason.UNMOUNTED): Promise<void> {
    if (this.lifecyclePhase === LifecyclePhase.UNMOUNTED) {
      return; // Already unmounted
    }
    
    this.lifecyclePhase = LifecyclePhase.UNMOUNTING;
    
    try {
      // 1. Emit cleanup signals first (before cleanup)
      await this.emitCleanupSignals(reason);
      
      // 2. Perform resource-specific cleanup
      await this.cleanup();
      
      // 3. Clean up signal handlers and callbacks
      this.cleanupSignalHandlers();
      this.executeCleanupCallbacks();
      
      // 4. Mark as unmounted
      this.lifecyclePhase = LifecyclePhase.UNMOUNTED;
      this.updateMetadata();
      
    } catch (error) {
      this.lifecyclePhase = LifecyclePhase.ERROR;
      throw error;
    }
  }

  // State Management
  
  /**
   * Update resource state
   */
  protected setState(newState: Partial<TState>): void {
    this.state = { ...this.state, ...newState };
    this.updateMetadata();
    
    // Emit state change signal
    this.emitSignal(SIGNAL_TYPES.RESOURCE_STATE_CHANGED, {
      resourceId: this.resourceId,
      resourceType: this.resourceType,
      state: this.state,
      timestamp: Date.now()
    });
  }

  /**
   * Get current resource state
   */
  getState(): Readonly<TState> {
    return { ...this.state };
  }

  /**
   * Get resource configuration
   */
  getConfig(): Readonly<TConfig> {
    return { ...this.config };
  }

  /**
   * Update resource configuration
   */
  updateConfig(newConfig: Partial<TConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.updateMetadata();
  }

  // Signal Handling
  
  /**
   * Subscribe to a signal type
   */
  onSignal(signalType: string, handler: SignalHandler): () => void {
    if (!this.signalHandlers.has(signalType)) {
      this.signalHandlers.set(signalType, new Set());
    }
    
    this.signalHandlers.get(signalType)!.add(handler);
    
    // Register with signal bus
    const unsubscribe = this.signalBus.onResource(
      this.resourceId,
      signalType,
      handler
    );
    
    // Return cleanup function
    return () => {
      this.signalHandlers.get(signalType)?.delete(handler);
      unsubscribe();
    };
  }

  /**
   * Emit a signal from this resource
   */
  protected async emitSignal<TPayload = any>(
    signalType: string,
    payload: TPayload,
    target?: { panelId?: PanelId; resourceId?: ResourceId },
    metadata?: Record<string, any>
  ): Promise<void> {
    const signal: Signal<TPayload> = {
      type: signalType,
      source: { panelId: this.panelId, resourceId: this.resourceId },
      target,
      payload,
      metadata: {
        timestamp: Date.now(),
        ...metadata
      }
    };
    
    await this.signalBus.emit(signal);
  }

  // Navigation
  
  /**
   * Navigate to specific content within this resource
   */
  async navigateToContent(navigationData: ResourceNavigationData): Promise<void> {
    try {
      // Add to navigation history
      this.navigationHistory = this.navigationHistory.slice(0, this.currentNavigationIndex + 1);
      this.navigationHistory.push(navigationData);
      this.currentNavigationIndex = this.navigationHistory.length - 1;
      
      // Perform navigation
      await this.performNavigation(navigationData);
      
      // Emit navigation signal
      await this.emitSignal(SIGNAL_TYPES.RESOURCE_NAVIGATED, {
        resourceId: this.resourceId,
        resourceType: this.resourceType,
        navigationData,
        canGoBack: this.canGoBack(),
        canGoForward: this.canGoForward()
      });
      
    } catch (error) {
      // Remove failed navigation from history
      this.navigationHistory.pop();
      this.currentNavigationIndex = this.navigationHistory.length - 1;
      throw error;
    }
  }

  /**
   * Go back in navigation history
   */
  async goBack(): Promise<boolean> {
    if (!this.canGoBack()) {
      return false;
    }
    
    this.currentNavigationIndex--;
    const navigationData = this.navigationHistory[this.currentNavigationIndex];
    await this.performNavigation(navigationData);
    
    await this.emitSignal(SIGNAL_TYPES.RESOURCE_NAVIGATED, {
      resourceId: this.resourceId,
      resourceType: this.resourceType,
      navigationData,
      canGoBack: this.canGoBack(),
      canGoForward: this.canGoForward()
    });
    
    return true;
  }

  /**
   * Go forward in navigation history
   */
  async goForward(): Promise<boolean> {
    if (!this.canGoForward()) {
      return false;
    }
    
    this.currentNavigationIndex++;
    const navigationData = this.navigationHistory[this.currentNavigationIndex];
    await this.performNavigation(navigationData);
    
    await this.emitSignal(SIGNAL_TYPES.RESOURCE_NAVIGATED, {
      resourceId: this.resourceId,
      resourceType: this.resourceType,
      navigationData,
      canGoBack: this.canGoBack(),
      canGoForward: this.canGoForward()
    });
    
    return true;
  }

  canGoBack(): boolean {
    return this.currentNavigationIndex > 0;
  }

  canGoForward(): boolean {
    return this.currentNavigationIndex < this.navigationHistory.length - 1;
  }

  /**
   * Get current navigation state
   */
  getNavigationState() {
    return {
      current: this.navigationHistory[this.currentNavigationIndex] || null,
      canGoBack: this.canGoBack(),
      canGoForward: this.canGoForward(),
      historyLength: this.navigationHistory.length
    };
  }

  // Utility Methods
  
  /**
   * Add cleanup callback to be executed on unmount
   */
  protected addCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.add(callback);
  }

  /**
   * Get resource metadata
   */
  getMetadata(): Readonly<ResourceMetadata> {
    return { ...this.metadata };
  }

  /**
   * Get resource identifier info
   */
  getIdentifier() {
    return {
      resourceId: this.resourceId,
      panelId: this.panelId,
      resourceType: this.resourceType
    };
  }

  /**
   * Check if resource is in a specific lifecycle phase
   */
  isInPhase(phase: LifecyclePhase): boolean {
    return this.lifecyclePhase === phase;
  }

  /**
   * Get current lifecycle phase
   */
  getLifecyclePhase(): LifecyclePhase {
    return this.lifecyclePhase;
  }

  // Protected methods for subclasses
  
  /**
   * Abstract method for performing navigation - must be implemented by subclasses
   */
  protected abstract performNavigation(navigationData: ResourceNavigationData): Promise<void>;

  /**
   * Setup default signal handlers for common resource signals
   */
  protected setupDefaultSignalHandlers(): void {
    // Handle visibility changes
    this.onSignal(SIGNAL_TYPES.PANEL_VISIBILITY_CHANGED, async (signal) => {
      if (signal.payload.panelId === this.panelId) {
        const wasVisible = (this.state as any).isVisible;
        // Use type assertion to handle the type compatibility issue
        const visibilityUpdate = { isVisible: signal.payload.isVisible } as Partial<TState>;
        this.setState(visibilityUpdate);
        
        // Emit resource dismissed signal if becoming invisible
        if (wasVisible && !signal.payload.isVisible) {
          await this.emitCleanupSignals(CleanupReason.HIDDEN);
        }
      }
    });
    
    // Handle panel switching
    this.onSignal(SIGNAL_TYPES.SWITCH_PANEL, async (signal) => {
      if (signal.payload.fromPanelId === this.panelId) {
        await this.emitCleanupSignals(CleanupReason.PANEL_SWITCHED);
      }
    });
  }

  /**
   * Emit cleanup signals when resource is being dismissed
   */
  private async emitCleanupSignals(reason: CleanupReason): Promise<void> {
    // Emit resource dismissed signal
    await this.emitSignal(SIGNAL_TYPES.RESOURCE_DISMISSED, {
      resourceId: this.resourceId,
      resourceType: this.resourceType,
      reason,
      timestamp: Date.now()
    });
    
    // Emit resource unmounted signal for cleanup coordination
    await this.emitSignal(SIGNAL_TYPES.RESOURCE_UNMOUNTED, {
      resourceId: this.resourceId,
      resourceType: this.resourceType,
      reason,
      metadata: {
        panelId: this.panelId,
        unmountedAt: Date.now()
      }
    });
    
    // Allow subclasses to emit additional cleanup signals
    await this.emitCustomCleanupSignals(reason);
  }

  /**
   * Override this method to emit custom cleanup signals
   */
  protected async emitCustomCleanupSignals(reason: CleanupReason): Promise<void> {
    // Default implementation does nothing
    // Subclasses can override to emit specific cleanup signals
  }

  /**
   * Clean up all signal handlers
   */
  private cleanupSignalHandlers(): void {
    this.signalHandlers.clear();
  }

  /**
   * Execute all cleanup callbacks
   */
  private executeCleanupCallbacks(): void {
    for (const callback of this.cleanupCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error(`[BaseResource] Cleanup callback failed:`, error);
      }
    }
    this.cleanupCallbacks.clear();
  }

  /**
   * Update metadata timestamps
   */
  private updateMetadata(): void {
    this.metadata.lastUpdated = Date.now();
  }
}

export default BaseResource;
