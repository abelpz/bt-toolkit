import { SignalBus } from '../core/SignalBus';
import { SIGNAL_TYPES } from './SignalTypes';
import {
  ResourceCleanupEvent,
  CleanupReason,
  CleanupStrategy,
  CleanupCoordinator,
  CleanupTracker,
  CleanupValidationResult,
  CleanupDependency,
  CleanupGraph,
  HighlightingKey,
  ClearHighlightingPayload
} from '../types/Cleanup';
import { ResourceId, Signal } from '../types/Signal';

/**
 * SignalCleanup orchestrates cleanup operations through signal-based coordination
 */
export class SignalCleanup implements CleanupCoordinator, CleanupTracker {
  private signalBus: SignalBus;
  private strategies = new Map<string, CleanupStrategy>();
  private pendingCleanups = new Map<ResourceId, Set<string>>();
  private cleanupGraph: CleanupGraphImpl = new CleanupGraphImpl();
  
  constructor(signalBus: SignalBus) {
    this.signalBus = signalBus;
    this.setupDefaultStrategies();
    this.setupSignalHandlers();
  }

  /**
   * Register a cleanup strategy
   */
  registerStrategy(strategy: CleanupStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Unregister a cleanup strategy
   */
  unregisterStrategy(name: string): void {
    this.strategies.delete(name);
  }

  /**
   * Execute cleanup for a resource cleanup event
   */
  async executeCleanup(event: ResourceCleanupEvent): Promise<void> {
    // Get cleanup order based on dependencies
    const cleanupOrder = this.cleanupGraph.getCleanupOrder(event.resourceId);
    
    // Track this cleanup
    this.trackCleanup(event.resourceId, 'resource_cleanup');
    
    try {
      // Execute strategies in priority order
      const applicableStrategies = Array.from(this.strategies.values())
        .filter(strategy => strategy.canHandle(event))
        .sort((a, b) => b.priority - a.priority);

      for (const strategy of applicableStrategies) {
        try {
          await strategy.execute(event);
        } catch (error) {
          console.error(`[SignalCleanup] Strategy ${strategy.name} failed:`, error);
          // Re-throw the error to propagate to CleanupManager
          throw error;
        }
      }

      // Execute cleanup for dependent resources
      for (const dependentResourceId of cleanupOrder) {
        if (dependentResourceId !== event.resourceId) {
          const dependentEvent: ResourceCleanupEvent = {
            ...event,
            resourceId: dependentResourceId,
            reason: CleanupReason.MANUAL
          };
          await this.executeCleanup(dependentEvent);
        }
      }

      // Mark cleanup as complete
      this.markComplete(event.resourceId, 'resource_cleanup');

    } catch (error) {
      console.error(`[SignalCleanup] Cleanup failed for resource ${event.resourceId}:`, error);
      throw error;
    }
  }

  /**
   * Get registered strategies
   */
  getStrategies(): CleanupStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Track a cleanup operation
   */
  trackCleanup(resourceId: ResourceId, cleanupType: string): void {
    if (!this.pendingCleanups.has(resourceId)) {
      this.pendingCleanups.set(resourceId, new Set());
    }
    this.pendingCleanups.get(resourceId)!.add(cleanupType);
  }

  /**
   * Mark cleanup as complete
   */
  markComplete(resourceId: ResourceId, cleanupType: string): void {
    const pending = this.pendingCleanups.get(resourceId);
    if (pending) {
      pending.delete(cleanupType);
      if (pending.size === 0) {
        this.pendingCleanups.delete(resourceId);
      }
    }
  }

  /**
   * Get pending cleanups
   */
  getPendingCleanups(resourceId?: ResourceId): string[] {
    if (resourceId) {
      const pending = this.pendingCleanups.get(resourceId);
      return pending ? Array.from(pending) : [];
    }
    
    const allPending: string[] = [];
    for (const [id, cleanups] of Array.from(this.pendingCleanups.entries())) {
      for (const cleanup of Array.from(cleanups)) {
        allPending.push(`${id}:${cleanup}`);
      }
    }
    return allPending;
  }

  /**
   * Validate cleanup completion
   */
  validate(resourceId?: ResourceId): CleanupValidationResult {
    const pendingCleanups = this.getPendingCleanups(resourceId);
    const errors: string[] = [];
    
    // Check for long-running cleanups
    for (const cleanupType of pendingCleanups) {
      // Check if cleanup has been running too long (example: more than 30 seconds)
      const startTime = Date.now() - 30000; // 30 seconds ago
      if (startTime > 0) {
        errors.push(`Cleanup '${cleanupType}' may be stuck`);
      }
    }

    return {
      isComplete: pendingCleanups.length === 0,
      pendingCleanups,
      errors
    };
  }

  /**
   * Handle resource dismissal with proper cleanup
   */
  async handleResourceDismissal(resourceId: ResourceId, resourceType: string, reason: CleanupReason): Promise<void> {
    const event: ResourceCleanupEvent = {
      resourceId,
      resourceType,
      reason,
      timestamp: Date.now()
    };

    // Execute cleanup
    await this.executeCleanup(event);

    // Emit resource dismissed signal
    await this.signalBus.emit({
      type: SIGNAL_TYPES.RESOURCE_DISMISSED,
      source: { panelId: '', resourceId },
      payload: {
        resourceId,
        resourceType,
        reason
      }
    });
  }

  /**
   * Handle highlighting cleanup
   */
  async handleHighlightingCleanup(key: HighlightingKey | string, reason?: string): Promise<void> {
    const payload: ClearHighlightingPayload = { key, reason };
    
    await this.signalBus.emit({
      type: SIGNAL_TYPES.CLEAR_HIGHLIGHTING,
      source: { panelId: '', resourceId: '' },
      payload
    });
  }

  /**
   * Handle alignment highlighting cleanup
   */
  async handleAlignmentCleanup(reason?: string): Promise<void> {
    await this.signalBus.emit({
      type: SIGNAL_TYPES.CLEAR_ALIGNMENT_HIGHLIGHTS,
      source: { panelId: '', resourceId: '' },
      payload: { reason }
    });
  }

  /**
   * Coordinate cross-resource cleanup
   */
  async coordinateCleanup(resourceIds: ResourceId[], reason: CleanupReason): Promise<void> {
    const cleanupPromises = resourceIds.map(async (resourceId) => {
      const event: ResourceCleanupEvent = {
        resourceId,
        resourceType: 'unknown', // Will be determined by strategies
        reason,
        timestamp: Date.now()
      };
      return this.executeCleanup(event);
    });

    await Promise.all(cleanupPromises);
  }

  /**
   * Add cleanup dependency
   */
  addCleanupDependency(dependency: CleanupDependency): void {
    this.cleanupGraph.addDependency(dependency);
  }

  /**
   * Remove cleanup dependency
   */
  removeCleanupDependency(sourceId: ResourceId, targetId: ResourceId): void {
    this.cleanupGraph.removeDependency(sourceId, targetId);
  }

  /**
   * Setup default cleanup strategies
   */
  private setupDefaultStrategies(): void {
    // Highlighting cleanup strategy
    this.registerStrategy({
      name: 'highlighting_cleanup',
      priority: 100,
      canHandle: (event) => true, // Can handle all resource types
      execute: async (event) => {
        // Clear highlighting for this resource
        await this.handleHighlightingCleanup(event.resourceId, event.reason);
      }
    });

    // Panel cleanup strategy
    this.registerStrategy({
      name: 'panel_cleanup',
      priority: 90,
      canHandle: (event) => event.reason === CleanupReason.PANEL_SWITCHED,
      execute: async (event) => {
        // Handle panel-specific cleanup
        await this.signalBus.emit({
          type: SIGNAL_TYPES.HIDE_RESOURCE,
          source: { panelId: '', resourceId: event.resourceId },
          payload: { resourceId: event.resourceId, reason: event.reason }
        });
      }
    });

    // Error cleanup strategy
    this.registerStrategy({
      name: 'error_cleanup',
      priority: 80,
      canHandle: (event) => event.reason === CleanupReason.ERROR,
      execute: async (event) => {
        // Handle error-related cleanup
        await this.signalBus.emit({
          type: SIGNAL_TYPES.RESOURCE_ERROR,
          source: { panelId: '', resourceId: event.resourceId },
          payload: { resourceId: event.resourceId, error: 'Cleanup due to error' }
        });
      }
    });
  }

  /**
   * Setup signal handlers for cleanup coordination
   */
  private setupSignalHandlers(): void {
    // Handle resource unmounted signals
    this.signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_UNMOUNTED, async (signal: Signal) => {
      const { resourceId, resourceType, reason } = signal.payload;
      await this.handleResourceDismissal(
        resourceId,
        resourceType,
        reason || CleanupReason.UNMOUNTED
      );
    });

    // Handle resource dismissed signals
    this.signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_DISMISSED, async (signal: Signal) => {
      const { resourceId } = signal.payload;
      // Additional cleanup coordination if needed
      this.markComplete(resourceId, 'dismissal_handling');
    });

    // Handle panel switch signals
    this.signalBus.onGlobal(SIGNAL_TYPES.SWITCH_PANEL, async (signal: Signal) => {
      // Coordinate cleanup for resources in the previous panel
      // This would require getting resources from the panel
    });
  }
}

/**
 * CleanupGraph implementation for managing cleanup dependencies
 */
class CleanupGraphImpl implements CleanupGraph {
  private dependencies = new Map<ResourceId, CleanupDependency[]>();

  addDependency(dependency: CleanupDependency): void {
    if (!this.dependencies.has(dependency.sourceResourceId)) {
      this.dependencies.set(dependency.sourceResourceId, []);
    }
    this.dependencies.get(dependency.sourceResourceId)!.push(dependency);
  }

  removeDependency(sourceId: ResourceId, targetId: ResourceId): void {
    const deps = this.dependencies.get(sourceId);
    if (deps) {
      const filtered = deps.filter(dep => dep.targetResourceId !== targetId);
      if (filtered.length === 0) {
        this.dependencies.delete(sourceId);
      } else {
        this.dependencies.set(sourceId, filtered);
      }
    }
  }

  getCleanupOrder(resourceId: ResourceId): ResourceId[] {
    const visited = new Set<ResourceId>();
    const order: ResourceId[] = [];

    const visit = (id: ResourceId) => {
      if (visited.has(id)) return;
      visited.add(id);

      const deps = this.dependencies.get(id) || [];
      // Sort by priority (higher priority first)
      const sortedDeps = deps.sort((a, b) => b.priority - a.priority);
      
      for (const dep of sortedDeps) {
        visit(dep.targetResourceId);
      }
      
      order.push(id);
    };

    visit(resourceId);
    return order;
  }

  hasCycles(): boolean {
    const visited = new Set<ResourceId>();
    const recursionStack = new Set<ResourceId>();

    const hasCycle = (resourceId: ResourceId): boolean => {
      if (recursionStack.has(resourceId)) return true;
      if (visited.has(resourceId)) return false;

      visited.add(resourceId);
      recursionStack.add(resourceId);

      const deps = this.dependencies.get(resourceId) || [];
      for (const dep of deps) {
        if (hasCycle(dep.targetResourceId)) {
          return true;
        }
      }

      recursionStack.delete(resourceId);
      return false;
    };

    for (const resourceId of Array.from(this.dependencies.keys())) {
      if (hasCycle(resourceId)) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Utility functions for signal-based cleanup
 */
export class SignalCleanupUtils {
  /**
   * Create a cleanup event
   */
  static createCleanupEvent(
    resourceId: ResourceId,
    resourceType: string,
    reason: CleanupReason,
    metadata?: Record<string, any>
  ): ResourceCleanupEvent {
    return {
      resourceId,
      resourceType,
      reason,
      timestamp: Date.now(),
      metadata
    };
  }

  /**
   * Check if cleanup is needed based on signal
   */
  static needsCleanup(signal: Signal): boolean {
    const cleanupSignals = [
      SIGNAL_TYPES.RESOURCE_UNMOUNTED,
      SIGNAL_TYPES.RESOURCE_DISMISSED,
      SIGNAL_TYPES.HIDE_PANEL,
      SIGNAL_TYPES.SWITCH_PANEL
    ];
    return cleanupSignals.includes(signal.type as any);
  }

  /**
   * Extract cleanup reason from signal
   */
  static extractCleanupReason(signal: Signal): CleanupReason {
    switch (signal.type) {
      case SIGNAL_TYPES.RESOURCE_UNMOUNTED:
        return CleanupReason.UNMOUNTED;
      case SIGNAL_TYPES.HIDE_PANEL:
        return CleanupReason.HIDDEN;
      case SIGNAL_TYPES.SWITCH_PANEL:
        return CleanupReason.PANEL_SWITCHED;
      case SIGNAL_TYPES.RESOURCE_ERROR:
        return CleanupReason.ERROR;
      default:
        return CleanupReason.MANUAL;
    }
  }
} 