import {
  Signal,
  SignalHandler,
  SignalUnsubscribe,
  SignalBusConfig,
  SignalMetrics,
  SignalHistoryEntry,
  SignalMiddleware,
  SignalValidationRule,
  SignalValidationResult,
  PanelId,
  ResourceId,
  SignalType
} from '../types/Signal';

/**
 * Core SignalBus implementation for the panel system
 * Handles signal routing, middleware, validation, and cleanup
 */
export class SignalBus {
  private static instance: SignalBus | null = null;
  
  // Signal handlers organized by type and scope
  private globalHandlers = new Map<SignalType, Set<SignalHandler>>();
  private panelHandlers = new Map<PanelId, Map<SignalType, Set<SignalHandler>>>();
  private resourceHandlers = new Map<ResourceId, Map<SignalType, Set<SignalHandler>>>();
  
  // Configuration and middleware
  private config: SignalBusConfig;
  private middleware: SignalMiddleware[] = [];
  private validationRules = new Map<SignalType, SignalValidationRule>();
  
  // Metrics and history
  private metrics: SignalMetrics = {
    totalSignals: 0,
    signalsByType: {},
    averageProcessingTime: 0,
    errorCount: 0
  };
  private history: SignalHistoryEntry[] = [];
  private processingTimes: number[] = [];
  
  // Signal ID generation
  private signalCounter = 0;

  constructor(config: SignalBusConfig = {}) {
    this.config = {
      enableLogging: false,
      enableMetrics: true,
      maxHistorySize: 100,
      ...config
    };
    
    if (config.middleware) {
      this.middleware = [...config.middleware];
    }
    
    if (config.validationRules) {
      config.validationRules.forEach(rule => {
        this.validationRules.set(rule.type, rule);
      });
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: SignalBusConfig): SignalBus {
    if (!SignalBus.instance) {
      SignalBus.instance = new SignalBus(config);
    }
    return SignalBus.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static resetInstance(): void {
    SignalBus.instance = null;
  }

  /**
   * Emit a signal to all registered handlers
   */
  async emit<TPayload = any>(signal: Omit<Signal<TPayload>, 'id' | 'timestamp'>): Promise<void> {
    const startTime = performance.now();
    
    // Add metadata to signal
    const fullSignal: Signal<TPayload> = {
      ...signal,
      id: this.generateSignalId(),
      timestamp: Date.now()
    };

    try {
      // Validate signal
      const validationResult = this.validateSignal(fullSignal);
      if (!validationResult.isValid) {
        throw new Error(`Signal validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Log signal if enabled
      if (this.config.enableLogging) {
        console.log(`[SignalBus] Emitting signal:`, fullSignal);
      }

      // Process through middleware pipeline
      await this.processMiddleware(fullSignal);

      // Route signal to handlers
      await this.routeSignal(fullSignal);

      // Update metrics
      const processingTime = performance.now() - startTime;
      this.updateMetrics(fullSignal, processingTime, true);

    } catch (error) {
      const processingTime = performance.now() - startTime;
      this.updateMetrics(fullSignal, processingTime, false, error as Error);
      
      if (this.config.enableLogging) {
        console.error(`[SignalBus] Error processing signal:`, error);
      }
      
      throw error;
    }
  }

  /**
   * Subscribe to global signals of a specific type
   */
  onGlobal(signalType: SignalType, handler: SignalHandler): SignalUnsubscribe {
    if (!this.globalHandlers.has(signalType)) {
      this.globalHandlers.set(signalType, new Set());
    }
    
    this.globalHandlers.get(signalType)!.add(handler);
    
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

  /**
   * Subscribe to panel-specific signals
   */
  onPanel(panelId: PanelId, signalType: SignalType, handler: SignalHandler): SignalUnsubscribe {
    if (!this.panelHandlers.has(panelId)) {
      this.panelHandlers.set(panelId, new Map());
    }
    
    const panelMap = this.panelHandlers.get(panelId)!;
    if (!panelMap.has(signalType)) {
      panelMap.set(signalType, new Set());
    }
    
    panelMap.get(signalType)!.add(handler);
    
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

  /**
   * Subscribe to resource-specific signals
   */
  onResource(resourceId: ResourceId, signalType: SignalType, handler: SignalHandler): SignalUnsubscribe {
    if (!this.resourceHandlers.has(resourceId)) {
      this.resourceHandlers.set(resourceId, new Map());
    }
    
    const resourceMap = this.resourceHandlers.get(resourceId)!;
    if (!resourceMap.has(signalType)) {
      resourceMap.set(signalType, new Set());
    }
    
    resourceMap.get(signalType)!.add(handler);
    
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

  /**
   * Add middleware to the processing pipeline
   */
  addMiddleware(middleware: SignalMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Remove middleware from the processing pipeline
   */
  removeMiddleware(middleware: SignalMiddleware): void {
    const index = this.middleware.indexOf(middleware);
    if (index !== -1) {
      this.middleware.splice(index, 1);
    }
  }

  /**
   * Add validation rule for a signal type
   */
  addValidationRule(rule: SignalValidationRule): void {
    this.validationRules.set(rule.type, rule);
  }

  /**
   * Remove validation rule for a signal type
   */
  removeValidationRule(signalType: SignalType): void {
    this.validationRules.delete(signalType);
  }

  /**
   * Get current metrics
   */
  getMetrics(): SignalMetrics {
    return { ...this.metrics };
  }

  /**
   * Get signal history
   */
  getHistory(): SignalHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Clear signal history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      globalHandlers: this.globalHandlers.size,
      panelHandlers: this.panelHandlers.size,
      resourceHandlers: this.resourceHandlers.size,
      middleware: this.middleware.length,
      validationRules: this.validationRules.size,
      metrics: this.metrics,
      recentHistory: this.history.slice(-5)
    };
  }

  /**
   * Cleanup all handlers for a panel
   */
  cleanupPanel(panelId: PanelId): void {
    this.panelHandlers.delete(panelId);
    
    if (this.config.enableLogging) {
      console.log(`[SignalBus] Cleaned up panel: ${panelId}`);
    }
  }

  /**
   * Cleanup all handlers for a resource
   */
  cleanupResource(resourceId: ResourceId): void {
    this.resourceHandlers.delete(resourceId);
    
    if (this.config.enableLogging) {
      console.log(`[SignalBus] Cleaned up resource: ${resourceId}`);
    }
  }

  // Private methods

  private generateSignalId(): string {
    return `signal_${Date.now()}_${++this.signalCounter}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateSignal(signal: Signal): SignalValidationResult {
    const rule = this.validationRules.get(signal.type);
    if (!rule) {
      return { isValid: true, errors: [] };
    }

    const isValid = rule.validator(signal.payload);
    return {
      isValid,
      errors: isValid ? [] : [rule.errorMessage || `Validation failed for signal type: ${signal.type}`]
    };
  }

  private async processMiddleware(signal: Signal): Promise<void> {
    let index = 0;
    
    const next = async (): Promise<void> => {
      if (index < this.middleware.length) {
        const middleware = this.middleware[index++];
        await middleware(signal, next);
      }
    };
    
    await next();
  }

  private async routeSignal(signal: Signal): Promise<void> {
    const promises: Promise<void>[] = [];

    // Route to global handlers
    const globalHandlers = this.globalHandlers.get(signal.type);
    if (globalHandlers) {
      globalHandlers.forEach(handler => {
        promises.push(this.safeHandlerCall(handler, signal));
      });
    }

    // Route to panel-specific handlers
    if (signal.target?.panelId) {
      const panelMap = this.panelHandlers.get(signal.target.panelId);
      if (panelMap) {
        const panelHandlers = panelMap.get(signal.type);
        if (panelHandlers) {
          panelHandlers.forEach(handler => {
            promises.push(this.safeHandlerCall(handler, signal));
          });
        }
      }
    }

    // Route to resource-specific handlers
    if (signal.target?.resourceId) {
      const resourceMap = this.resourceHandlers.get(signal.target.resourceId);
      if (resourceMap) {
        const resourceHandlers = resourceMap.get(signal.type);
        if (resourceHandlers) {
          resourceHandlers.forEach(handler => {
            promises.push(this.safeHandlerCall(handler, signal));
          });
        }
      }
    }

    // Wait for all handlers to complete
    await Promise.all(promises);
  }

  private async safeHandlerCall(handler: SignalHandler, signal: Signal): Promise<void> {
    try {
      await handler(signal);
    } catch (error) {
      if (this.config.enableLogging) {
        console.error(`[SignalBus] Handler error for signal ${signal.type}:`, error);
      }
      // Don't rethrow - we want other handlers to continue processing
    }
  }

  private updateMetrics(signal: Signal, processingTime: number, success: boolean, error?: Error): void {
    if (!this.config.enableMetrics) return;

    this.metrics.totalSignals++;
    
    if (!this.metrics.signalsByType[signal.type]) {
      this.metrics.signalsByType[signal.type] = 0;
    }
    this.metrics.signalsByType[signal.type]++;

    this.processingTimes.push(processingTime);
    this.metrics.averageProcessingTime = 
      this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;

    if (!success) {
      this.metrics.errorCount++;
    }

    // Add to history
    const historyEntry: SignalHistoryEntry = {
      signal,
      timestamp: Date.now(),
      processingTime,
      success,
      error: error?.message
    };

    this.history.push(historyEntry);

    // Trim history if needed
    if (this.config.maxHistorySize && this.history.length > this.config.maxHistorySize) {
      this.history = this.history.slice(-this.config.maxHistorySize);
    }

    // Trim processing times array to prevent memory leaks
    if (this.processingTimes.length > 1000) {
      this.processingTimes = this.processingTimes.slice(-1000);
    }
  }
} 