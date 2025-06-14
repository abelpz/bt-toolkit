import { 
  Signal, 
  SignalHandler, 
  PanelId, 
  ResourceId, 
  SignalType,
  PanelAPI,
  ResourceAPI 
} from '../types/signaling';

export class SignalBus {
  private static instance: SignalBus;
  
  // Registry of panels and resources
  private panels = new Map<PanelId, PanelAPI>();
  private resources = new Map<ResourceId, ResourceAPI>();
  
  // Signal handlers
  private globalHandlers = new Map<SignalType, Set<SignalHandler>>();
  private resourceHandlers = new Map<ResourceId, Map<SignalType, Set<SignalHandler>>>();
  private panelHandlers = new Map<PanelId, Map<SignalType, Set<SignalHandler>>>();
  
  // Signal history for debugging
  private signalHistory: Signal[] = [];
  private maxHistorySize = 100;
  
  // Event listeners for external monitoring
  private eventListeners = new Set<(signal: Signal) => void>();

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): SignalBus {
    if (!SignalBus.instance) {
      SignalBus.instance = new SignalBus();
    }
    return SignalBus.instance;
  }

  // Panel Management
  registerPanel(panel: PanelAPI): void {
    this.panels.set(panel.id, panel);
    console.log(`[SignalBus] Panel registered: ${panel.id}`);
  }

  unregisterPanel(panelId: PanelId): void {
    const panel = this.panels.get(panelId);
    if (panel) {
      // Unregister all resources in this panel
      panel.resources.forEach((resource) => {
        this.unregisterResource(resource.id);
      });
      
      this.panels.delete(panelId);
      this.panelHandlers.delete(panelId);
      console.log(`[SignalBus] Panel unregistered: ${panelId}`);
    }
  }

  // Resource Management
  registerResource(resource: ResourceAPI): void {
    this.resources.set(resource.id, resource);
    
    // Add to panel if it exists
    const panel = this.panels.get(resource.panelId);
    if (panel) {
      panel.addResource(resource);
    }
    
    console.log(`[SignalBus] Resource registered: ${resource.id} in panel ${resource.panelId}`);
  }

  unregisterResource(resourceId: ResourceId): void {
    const resource = this.resources.get(resourceId);
    if (resource) {
      // Remove from panel
      const panel = this.panels.get(resource.panelId);
      if (panel) {
        panel.removeResource(resourceId);
      }
      
      this.resources.delete(resourceId);
      this.resourceHandlers.delete(resourceId);
      console.log(`[SignalBus] Resource unregistered: ${resourceId}`);
    }
  }

  // Signal Handlers Registration
  onGlobal(signalType: SignalType, handler: SignalHandler): () => void {
    if (!this.globalHandlers.has(signalType)) {
      this.globalHandlers.set(signalType, new Set());
    }
    this.globalHandlers.get(signalType)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.globalHandlers.get(signalType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.globalHandlers.delete(signalType);
        }
      }
    };
  }

  onResource(resourceId: ResourceId, signalType: SignalType, handler: SignalHandler): () => void {
    if (!this.resourceHandlers.has(resourceId)) {
      this.resourceHandlers.set(resourceId, new Map());
    }
    
    const resourceMap = this.resourceHandlers.get(resourceId)!;
    if (!resourceMap.has(signalType)) {
      resourceMap.set(signalType, new Set());
    }
    
    resourceMap.get(signalType)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      const resourceMap = this.resourceHandlers.get(resourceId);
      if (resourceMap) {
        const handlers = resourceMap.get(signalType);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            resourceMap.delete(signalType);
            if (resourceMap.size === 0) {
              this.resourceHandlers.delete(resourceId);
            }
          }
        }
      }
    };
  }

  onPanel(panelId: PanelId, signalType: SignalType, handler: SignalHandler): () => void {
    if (!this.panelHandlers.has(panelId)) {
      this.panelHandlers.set(panelId, new Map());
    }
    
    const panelMap = this.panelHandlers.get(panelId)!;
    if (!panelMap.has(signalType)) {
      panelMap.set(signalType, new Set());
    }
    
    panelMap.get(signalType)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      const panelMap = this.panelHandlers.get(panelId);
      if (panelMap) {
        const handlers = panelMap.get(signalType);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            panelMap.delete(signalType);
            if (panelMap.size === 0) {
              this.panelHandlers.delete(panelId);
            }
          }
        }
      }
    };
  }

  // Signal Emission
  async emit<TPayload = any>(signal: Omit<Signal<TPayload>, 'id' | 'timestamp'>): Promise<void> {
    const fullSignal: Signal<TPayload> = {
      ...signal,
      id: this.generateSignalId(),
      timestamp: Date.now()
    };

    // Add to history
    this.signalHistory.push(fullSignal);
    if (this.signalHistory.length > this.maxHistorySize) {
      this.signalHistory.shift();
    }

    console.log(`[SignalBus] Emitting signal:`, fullSignal);

    // Notify event listeners
    this.eventListeners.forEach(listener => {
      try {
        listener(fullSignal);
      } catch (error) {
        console.error('[SignalBus] Error in event listener:', error);
      }
    });

    // Handle signal routing
    await this.routeSignal(fullSignal);
  }

  private async routeSignal<TPayload = any>(signal: Signal<TPayload>): Promise<void> {
    const promises: Promise<void>[] = [];

    // 1. Global handlers
    const globalHandlers = this.globalHandlers.get(signal.type);
    if (globalHandlers) {
      globalHandlers.forEach(handler => {
        promises.push(this.safeHandlerCall(handler, signal));
      });
    }

    // 2. Targeted resource handlers
    if (signal.target?.resourceId) {
      const resourceHandlers = this.resourceHandlers.get(signal.target.resourceId);
      if (resourceHandlers) {
        const handlers = resourceHandlers.get(signal.type);
        if (handlers) {
          handlers.forEach(handler => {
            promises.push(this.safeHandlerCall(handler, signal));
          });
        }
      }

      // Also call the resource's onSignal method
      const resource = this.resources.get(signal.target.resourceId);
      if (resource) {
        promises.push(this.safeHandlerCall(resource.onSignal.bind(resource), signal));
      }
    }

    // 3. Targeted panel handlers
    if (signal.target?.panelId) {
      const panelHandlers = this.panelHandlers.get(signal.target.panelId);
      if (panelHandlers) {
        const handlers = panelHandlers.get(signal.type);
        if (handlers) {
          handlers.forEach(handler => {
            promises.push(this.safeHandlerCall(handler, signal));
          });
        }
      }

      // Also call the panel's onSignal method
      const panel = this.panels.get(signal.target.panelId);
      if (panel) {
        promises.push(this.safeHandlerCall(panel.onSignal.bind(panel), signal));
      }
    }

    // 4. Broadcast to all resources in target panel if no specific resource targeted
    if (signal.target?.panelId && !signal.target.resourceId) {
      const panel = this.panels.get(signal.target.panelId);
      if (panel) {
        panel.resources.forEach(resource => {
          promises.push(this.safeHandlerCall(resource.onSignal.bind(resource), signal));
        });
      }
    }

    // 5. Broadcast to all if no target specified
    if (!signal.target) {
      this.resources.forEach(resource => {
        promises.push(this.safeHandlerCall(resource.onSignal.bind(resource), signal));
      });
    }

    // Wait for all handlers to complete
    await Promise.allSettled(promises);
  }

  private async safeHandlerCall(handler: SignalHandler, signal: Signal): Promise<void> {
    try {
      await handler(signal);
    } catch (error) {
      console.error(`[SignalBus] Error in signal handler for ${signal.type}:`, error);
    }
  }

  private generateSignalId(): string {
    return `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility methods
  getPanel(panelId: PanelId): PanelAPI | undefined {
    return this.panels.get(panelId);
  }

  getResource(resourceId: ResourceId): ResourceAPI | undefined {
    return this.resources.get(resourceId);
  }

  getAllPanels(): PanelAPI[] {
    return Array.from(this.panels.values());
  }

  getAllResources(): ResourceAPI[] {
    return Array.from(this.resources.values());
  }

  getSignalHistory(): Signal[] {
    return [...this.signalHistory];
  }

  // Event monitoring
  addEventListener(listener: (signal: Signal) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  // Debug methods
  clearHistory(): void {
    this.signalHistory = [];
  }

  getStats() {
    return {
      panels: this.panels.size,
      resources: this.resources.size,
      globalHandlers: Array.from(this.globalHandlers.entries()).map(([type, handlers]) => ({
        type,
        count: handlers.size
      })),
      signalHistory: this.signalHistory.length
    };
  }
} 