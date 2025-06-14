import { SignalBus } from '../core/SignalBus';
import { SignalCleanup } from '../signals/SignalCleanup';
import { SIGNAL_TYPES } from '../signals/SignalTypes';
import {
  ResourceCleanupEvent,
  CleanupReason,
  CleanupStrategy,
  CleanupValidationResult,
  CleanupDependency
} from '../types/Cleanup';
import { ResourceId, Signal } from '../types/Signal';
import { PanelId } from '../types/Signal';
import { CleanupCoordinator } from '../types/Cleanup';

/**
 * Configuration for the CleanupManager
 */
export interface CleanupManagerConfig {
  // Memory leak prevention
  maxPendingCleanups: number;
  cleanupTimeout: number;
  enableMemoryTracking: boolean;
  
  // Event tracking
  enableEventTracking: boolean;
  maxEventHistory: number;
  
  // Performance monitoring
  enablePerformanceMonitoring: boolean;
  performanceThreshold: number;
  
  // Automatic cleanup
  enableAutomaticCleanup: boolean;
  automaticCleanupInterval: number;
}

/**
 * Cleanup event for tracking and monitoring
 */
export interface CleanupEventRecord {
  id: string;
  resourceId: ResourceId;
  resourceType: string;
  reason: CleanupReason;
  timestamp: number;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Memory usage tracking for cleanup monitoring
 */
export interface MemoryUsageMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  resourceCount: number;
  timestamp: number;
}

/**
 * Performance metrics for cleanup operations
 */
export interface CleanupPerformanceMetrics {
  totalCleanups: number;
  successfulCleanups: number;
  failedCleanups: number;
  averageCleanupTime: number;
  slowestCleanupTime: number;
  fastestCleanupTime: number;
  cleanupsByReason: Record<CleanupReason, number>;
  recentCleanupTimes: number[];
}

/**
 * Manages resource cleanup orchestration and coordination
 * Handles signal-based cleanup, memory leak prevention, and cleanup event tracking
 */
export class CleanupManager implements CleanupCoordinator {
  private strategies = new Map<string, CleanupStrategy>();
  private cleanupQueue: ResourceCleanupEvent[] = [];
  private isProcessing = false;
  private cleanupHistory: ResourceCleanupEvent[] = [];
  private maxHistorySize = 1000;

  // Cleanup tracking
  private pendingCleanups = new Map<ResourceId, Set<string>>();
  private completedCleanups = new Map<ResourceId, Set<string>>();
  private failedCleanups = new Map<ResourceId, Array<{ type: string; error: string; timestamp: number }>>();

  // Event handlers
  private onCleanupStartedHandlers: Array<(event: ResourceCleanupEvent) => void> = [];
  private onCleanupCompletedHandlers: Array<(event: ResourceCleanupEvent) => void> = [];
  private onCleanupFailedHandlers: Array<(event: ResourceCleanupEvent, error: Error) => void> = [];

  constructor(private signalBus: SignalBus) {
    this.setupSignalHandlers();
    this.registerDefaultStrategies();
  }

  /**
   * Register a cleanup strategy
   */
  registerStrategy(strategy: CleanupStrategy): void {
    if (this.strategies.has(strategy.name)) {
      throw new Error(`Cleanup strategy '${strategy.name}' is already registered`);
    }

    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Unregister a cleanup strategy
   */
  unregisterStrategy(name: string): void {
    this.strategies.delete(name);
  }

  /**
   * Get all registered strategies
   */
  getStrategies(): CleanupStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Execute cleanup for a resource
   */
  async executeCleanup(event: ResourceCleanupEvent): Promise<void> {
    // Add to queue
    this.cleanupQueue.push(event);

    // Track as pending
    this.trackPendingCleanup(event.resourceId, 'cleanup');

    // Process queue if not already processing
    if (!this.isProcessing) {
      await this.processCleanupQueue();
    }
  }

  /**
   * Schedule cleanup for a resource
   */
  async scheduleCleanup(
    resourceId: ResourceId,
    resourceType: string,
    reason: CleanupReason,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: ResourceCleanupEvent = {
      resourceId,
      resourceType,
      reason,
      timestamp: Date.now(),
      metadata
    };

    await this.executeCleanup(event);
  }

  /**
   * Cancel pending cleanup for a resource
   */
  cancelCleanup(resourceId: ResourceId): void {
    // Remove from queue
    this.cleanupQueue = this.cleanupQueue.filter(event => event.resourceId !== resourceId);

    // Clear pending tracking
    this.pendingCleanups.delete(resourceId);
  }

  /**
   * Get pending cleanups for a resource
   */
  getPendingCleanups(resourceId?: ResourceId): string[] {
    if (resourceId) {
      return Array.from(this.pendingCleanups.get(resourceId) || []);
    }

    // Return all pending cleanups
    const allPending: string[] = [];
    this.pendingCleanups.forEach((cleanups, id) => {
      cleanups.forEach(cleanup => allPending.push(`${id}:${cleanup}`));
    });
    return allPending;
  }

  /**
   * Get completed cleanups for a resource
   */
  getCompletedCleanups(resourceId: ResourceId): string[] {
    return Array.from(this.completedCleanups.get(resourceId) || []);
  }

  /**
   * Get failed cleanups for a resource
   */
  getFailedCleanups(resourceId: ResourceId): Array<{ type: string; error: string; timestamp: number }> {
    return this.failedCleanups.get(resourceId) || [];
  }

  /**
   * Check if all cleanups are complete for a resource
   */
  isCleanupComplete(resourceId: ResourceId): boolean {
    const pending = this.pendingCleanups.get(resourceId);
    return !pending || pending.size === 0;
  }

  /**
   * Get cleanup statistics
   */
  getCleanupStatistics(): {
    totalCleanups: number;
    pendingCleanups: number;
    completedCleanups: number;
    failedCleanups: number;
    cleanupsByReason: Record<CleanupReason, number>;
    averageCleanupTime: number;
  } {
    const cleanupsByReason: Record<CleanupReason, number> = {
      [CleanupReason.UNMOUNTED]: 0,
      [CleanupReason.HIDDEN]: 0,
      [CleanupReason.PANEL_SWITCHED]: 0,
      [CleanupReason.ERROR]: 0,
      [CleanupReason.MANUAL]: 0
    };

    let totalTime = 0;
    let completedCount = 0;

    this.cleanupHistory.forEach(event => {
      cleanupsByReason[event.reason]++;
      if (event.metadata?.duration) {
        totalTime += event.metadata.duration;
        completedCount++;
      }
    });

    const totalPending = Array.from(this.pendingCleanups.values())
      .reduce((sum, set) => sum + set.size, 0);

    const totalCompleted = Array.from(this.completedCleanups.values())
      .reduce((sum, set) => sum + set.size, 0);

    const totalFailed = Array.from(this.failedCleanups.values())
      .reduce((sum, failures) => sum + failures.length, 0);

    return {
      totalCleanups: this.cleanupHistory.length,
      pendingCleanups: totalPending,
      completedCleanups: totalCompleted,
      failedCleanups: totalFailed,
      cleanupsByReason,
      averageCleanupTime: completedCount > 0 ? totalTime / completedCount : 0
    };
  }

  /**
   * Force cleanup of all pending resources
   */
  async forceCleanupAll(): Promise<void> {
    const allPendingResources = Array.from(this.pendingCleanups.keys());
    
    await Promise.all(
      allPendingResources.map(resourceId =>
        this.scheduleCleanup(resourceId, 'unknown', CleanupReason.MANUAL, {
          forced: true,
          timestamp: Date.now()
        })
      )
    );
  }

  /**
   * Register event handlers
   */
  onCleanupStarted(handler: (event: ResourceCleanupEvent) => void): () => void {
    this.onCleanupStartedHandlers.push(handler);
    return () => {
      const index = this.onCleanupStartedHandlers.indexOf(handler);
      if (index > -1) {
        this.onCleanupStartedHandlers.splice(index, 1);
      }
    };
  }

  onCleanupCompleted(handler: (event: ResourceCleanupEvent) => void): () => void {
    this.onCleanupCompletedHandlers.push(handler);
    return () => {
      const index = this.onCleanupCompletedHandlers.indexOf(handler);
      if (index > -1) {
        this.onCleanupCompletedHandlers.splice(index, 1);
      }
    };
  }

  onCleanupFailed(handler: (event: ResourceCleanupEvent, error: Error) => void): () => void {
    this.onCleanupFailedHandlers.push(handler);
    return () => {
      const index = this.onCleanupFailedHandlers.indexOf(handler);
      if (index > -1) {
        this.onCleanupFailedHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Cleanup the cleanup manager itself
   */
  async cleanup(): Promise<void> {
    // Process any remaining cleanups
    await this.processCleanupQueue();

    // Clear all tracking data
    this.pendingCleanups.clear();
    this.completedCleanups.clear();
    this.failedCleanups.clear();
    this.cleanupHistory = [];
    this.cleanupQueue = [];

    // Clear handlers
    this.onCleanupStartedHandlers = [];
    this.onCleanupCompletedHandlers = [];
    this.onCleanupFailedHandlers = [];
  }

  /**
   * Setup signal handlers for cleanup coordination
   */
  private setupSignalHandlers(): void {
    // Handle resource dismissal signals
    this.signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_DISMISSED, async (signal) => {
      const { resourceId, resourceType, reason } = signal.payload;
      await this.scheduleCleanup(resourceId, resourceType, reason, {
        source: 'signal',
        signalSource: signal.source
      });
    });

    // Handle resource unmount signals
    this.signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_UNMOUNTED, async (signal) => {
      const { resourceId, resourceType } = signal.payload;
      await this.scheduleCleanup(resourceId, resourceType, CleanupReason.UNMOUNTED, {
        source: 'signal',
        signalSource: signal.source
      });
    });

    // Handle panel hide signals
    this.signalBus.onGlobal(SIGNAL_TYPES.HIDE_PANEL, async (signal) => {
      const { panelId } = signal.payload;
      // This would need access to resource registry to find resources by panel
      // For now, emit a signal that other components can handle
      await this.signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_DISMISSED,
        source: { panelId: 'cleanup-manager', resourceId: 'cleanup-manager' },
        payload: {
          panelId,
          reason: CleanupReason.PANEL_SWITCHED,
          source: 'panel_hidden'
        }
      });
    });
  }

  /**
   * Process the cleanup queue
   */
  private async processCleanupQueue(): Promise<void> {
    if (this.isProcessing || this.cleanupQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.cleanupQueue.length > 0) {
        const event = this.cleanupQueue.shift()!;
        await this.processCleanupEvent(event);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single cleanup event
   */
  private async processCleanupEvent(event: ResourceCleanupEvent): Promise<void> {
    const startTime = Date.now();

    // Notify cleanup started
    this.onCleanupStartedHandlers.forEach(handler => handler(event));

    try {
      // Find applicable strategies
      const applicableStrategies = Array.from(this.strategies.values())
        .filter(strategy => strategy.canHandle(event))
        .sort((a, b) => b.priority - a.priority); // Higher priority first

      // Execute strategies
      for (const strategy of applicableStrategies) {
        try {
          await strategy.execute(event);
        } catch (error) {
          console.warn(`Cleanup strategy '${strategy.name}' failed:`, error);
          // Continue with other strategies
        }
      }

      // Mark as completed
      this.markCleanupCompleted(event.resourceId, 'cleanup');

      // Add to history with duration
      const duration = Date.now() - startTime;
      const historyEvent = {
        ...event,
        metadata: {
          ...event.metadata,
          duration,
          strategiesExecuted: applicableStrategies.length
        }
      };
      this.addToHistory(historyEvent);

      // Notify cleanup completed
      this.onCleanupCompletedHandlers.forEach(handler => handler(historyEvent));

    } catch (error) {
      // Mark as failed
      this.markCleanupFailed(event.resourceId, 'cleanup', error instanceof Error ? error.message : String(error));

      // Add to history
      const duration = Date.now() - startTime;
      const historyEvent = {
        ...event,
        metadata: {
          ...event.metadata,
          duration,
          error: error instanceof Error ? error.message : String(error)
        }
      };
      this.addToHistory(historyEvent);

      // Notify cleanup failed
      this.onCleanupFailedHandlers.forEach(handler => 
        handler(historyEvent, error instanceof Error ? error : new Error(String(error)))
      );
    }
  }

  /**
   * Register default cleanup strategies
   */
  private registerDefaultStrategies(): void {
    // Signal cleanup strategy
    this.registerStrategy({
      name: 'signal-cleanup',
      priority: 100,
      canHandle: () => true,
      execute: async (event) => {
        // Emit cleanup signals
        await this.signalBus.emit({
          type: SIGNAL_TYPES.CLEAR_HIGHLIGHTING,
          source: { panelId: 'cleanup-manager', resourceId: event.resourceId },
          payload: {
            key: event.resourceId,
            reason: 'resource_cleanup'
          }
        });
      }
    });

    // Memory cleanup strategy
    this.registerStrategy({
      name: 'memory-cleanup',
      priority: 50,
      canHandle: (event) => event.reason === CleanupReason.UNMOUNTED || event.reason === CleanupReason.ERROR,
      execute: async (event) => {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    });
  }

  /**
   * Track pending cleanup
   */
  private trackPendingCleanup(resourceId: ResourceId, cleanupType: string): void {
    if (!this.pendingCleanups.has(resourceId)) {
      this.pendingCleanups.set(resourceId, new Set());
    }
    this.pendingCleanups.get(resourceId)!.add(cleanupType);
  }

  /**
   * Mark cleanup as completed
   */
  private markCleanupCompleted(resourceId: ResourceId, cleanupType: string): void {
    // Remove from pending
    const pending = this.pendingCleanups.get(resourceId);
    if (pending) {
      pending.delete(cleanupType);
      if (pending.size === 0) {
        this.pendingCleanups.delete(resourceId);
      }
    }

    // Add to completed
    if (!this.completedCleanups.has(resourceId)) {
      this.completedCleanups.set(resourceId, new Set());
    }
    this.completedCleanups.get(resourceId)!.add(cleanupType);
  }

  /**
   * Mark cleanup as failed
   */
  private markCleanupFailed(resourceId: ResourceId, cleanupType: string, error: string): void {
    // Remove from pending
    const pending = this.pendingCleanups.get(resourceId);
    if (pending) {
      pending.delete(cleanupType);
      if (pending.size === 0) {
        this.pendingCleanups.delete(resourceId);
      }
    }

    // Add to failed
    if (!this.failedCleanups.has(resourceId)) {
      this.failedCleanups.set(resourceId, []);
    }
    this.failedCleanups.get(resourceId)!.push({
      type: cleanupType,
      error,
      timestamp: Date.now()
    });
  }

  /**
   * Add event to history
   */
  private addToHistory(event: ResourceCleanupEvent): void {
    this.cleanupHistory.push(event);

    // Trim history if needed
    if (this.cleanupHistory.length > this.maxHistorySize) {
      this.cleanupHistory = this.cleanupHistory.slice(-this.maxHistorySize);
    }
  }
} 