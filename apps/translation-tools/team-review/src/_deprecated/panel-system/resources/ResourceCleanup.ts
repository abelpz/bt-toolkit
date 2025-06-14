import { ResourceAPI } from '../types/Resource';
import { 
  CleanupReason, 
  ResourceCleanupEvent, 
  CleanupStrategy, 
  CleanupCoordinator,
  CleanupDependency,
  CleanupGraph
} from '../types/Cleanup';
import { ResourceId } from '../types/Signal';
import { SignalBus } from '../core/SignalBus';
import { SIGNAL_TYPES } from '../signals/SignalTypes';

/**
 * Manages resource cleanup strategies and cross-resource cleanup coordination
 * Handles signal emission on unmount and cleanup validation
 */
export class ResourceCleanup implements CleanupCoordinator {
  private strategies = new Map<string, CleanupStrategy>();
  private cleanupGraph: ResourceCleanupGraph;
  private activeCleanups = new Map<ResourceId, Promise<void>>();
  private cleanupResults = new Map<ResourceId, { success: boolean; error?: string; timestamp: number }>();

  constructor(private signalBus: SignalBus) {
    this.cleanupGraph = new ResourceCleanupGraph();
    this.setupDefaultStrategies();
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
    // Check if cleanup is already in progress
    if (this.activeCleanups.has(event.resourceId)) {
      await this.activeCleanups.get(event.resourceId);
      return;
    }

    // Start cleanup process
    const cleanupPromise = this.performCleanup(event);
    this.activeCleanups.set(event.resourceId, cleanupPromise);

    try {
      await cleanupPromise;
      this.cleanupResults.set(event.resourceId, {
        success: true,
        timestamp: Date.now()
      });
    } catch (error) {
      this.cleanupResults.set(event.resourceId, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
      throw error;
    } finally {
      this.activeCleanups.delete(event.resourceId);
    }
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
   * Get cleanup order for a resource
   */
  getCleanupOrder(resourceId: ResourceId): ResourceId[] {
    return this.cleanupGraph.getCleanupOrder(resourceId);
  }

  /**
   * Check if cleanup has cycles
   */
  hasCleanupCycles(): boolean {
    return this.cleanupGraph.hasCycles();
  }

  /**
   * Get cleanup result for a resource
   */
  getCleanupResult(resourceId: ResourceId): { success: boolean; error?: string; timestamp: number } | undefined {
    return this.cleanupResults.get(resourceId);
  }

  /**
   * Check if cleanup is in progress for a resource
   */
  isCleanupInProgress(resourceId: ResourceId): boolean {
    return this.activeCleanups.has(resourceId);
  }

  /**
   * Wait for cleanup to complete for a resource
   */
  async waitForCleanup(resourceId: ResourceId): Promise<void> {
    const activeCleanup = this.activeCleanups.get(resourceId);
    if (activeCleanup) {
      await activeCleanup;
    }
  }

  /**
   * Cleanup all resources with dependencies
   */
  async cleanupWithDependencies(resourceIds: ResourceId[], reason: CleanupReason): Promise<void> {
    // Get cleanup order considering dependencies
    const allResourceIds = new Set<ResourceId>();
    
    // Add all resources and their dependencies
    resourceIds.forEach(resourceId => {
      allResourceIds.add(resourceId);
      const cleanupOrder = this.getCleanupOrder(resourceId);
      cleanupOrder.forEach(id => allResourceIds.add(id));
    });

    // Sort by cleanup order
    const sortedResources = Array.from(allResourceIds).sort((a, b) => {
      const aOrder = this.getCleanupOrder(a);
      const bOrder = this.getCleanupOrder(b);
      return bOrder.length - aOrder.length; // Resources with more dependencies first
    });

    // Execute cleanup in order
    for (const resourceId of sortedResources) {
      const event: ResourceCleanupEvent = {
        resourceId,
        resourceType: 'unknown', // Would need resource registry to get actual type
        reason,
        timestamp: Date.now(),
        metadata: { coordinatedCleanup: true }
      };

      try {
        await this.executeCleanup(event);
      } catch (error) {
        console.warn(`Failed to cleanup resource '${resourceId}':`, error);
        // Continue with other resources
      }
    }
  }

  /**
   * Validate cleanup completion
   */
  validateCleanup(resourceIds: ResourceId[]): {
    isComplete: boolean;
    pending: ResourceId[];
    failed: ResourceId[];
    successful: ResourceId[];
  } {
    const pending: ResourceId[] = [];
    const failed: ResourceId[] = [];
    const successful: ResourceId[] = [];

    resourceIds.forEach(resourceId => {
      if (this.isCleanupInProgress(resourceId)) {
        pending.push(resourceId);
      } else {
        const result = this.getCleanupResult(resourceId);
        if (result) {
          if (result.success) {
            successful.push(resourceId);
          } else {
            failed.push(resourceId);
          }
        } else {
          pending.push(resourceId); // No result means not started
        }
      }
    });

    return {
      isComplete: pending.length === 0 && failed.length === 0,
      pending,
      failed,
      successful
    };
  }

  /**
   * Force cleanup of stuck resources
   */
  async forceCleanup(resourceIds: ResourceId[]): Promise<void> {
    const forceCleanupPromises = resourceIds.map(async resourceId => {
      // Cancel any active cleanup
      this.activeCleanups.delete(resourceId);

      // Execute force cleanup
      const event: ResourceCleanupEvent = {
        resourceId,
        resourceType: 'unknown',
        reason: CleanupReason.MANUAL,
        timestamp: Date.now(),
        metadata: { forced: true }
      };

      try {
        await this.executeCleanup(event);
      } catch (error) {
        console.warn(`Force cleanup failed for resource '${resourceId}':`, error);
      }
    });

    await Promise.all(forceCleanupPromises);
  }

  /**
   * Cleanup the cleanup manager itself
   */
  async cleanup(): Promise<void> {
    // Wait for all active cleanups to complete
    const activeCleanups = Array.from(this.activeCleanups.values());
    await Promise.allSettled(activeCleanups);

    // Clear all data
    this.strategies.clear();
    this.activeCleanups.clear();
    this.cleanupResults.clear();
    this.cleanupGraph = new ResourceCleanupGraph();
  }

  /**
   * Perform the actual cleanup process
   */
  private async performCleanup(event: ResourceCleanupEvent): Promise<void> {
    // Get applicable strategies
    const applicableStrategies = Array.from(this.strategies.values())
      .filter(strategy => strategy.canHandle(event))
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    if (applicableStrategies.length === 0) {
      console.warn(`No cleanup strategies available for resource '${event.resourceId}'`);
      return;
    }

    // Execute strategies
    const errors: Error[] = [];
    for (const strategy of applicableStrategies) {
      try {
        await strategy.execute(event);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
        console.warn(`Cleanup strategy '${strategy.name}' failed for resource '${event.resourceId}':`, error);
      }
    }

    // If all strategies failed, throw the first error
    if (errors.length === applicableStrategies.length && errors.length > 0) {
      throw errors[0];
    }
  }

  /**
   * Setup default cleanup strategies
   */
  private setupDefaultStrategies(): void {
    // Signal-based cleanup strategy
    this.registerStrategy({
      name: 'signal-cleanup',
      priority: 100,
      canHandle: () => true,
      execute: async (event) => {
        // Emit resource dismissed signal
        await this.signalBus.emit({
          type: SIGNAL_TYPES.RESOURCE_DISMISSED,
          source: { panelId: 'cleanup-manager', resourceId: event.resourceId },
          payload: {
            resourceId: event.resourceId,
            resourceType: event.resourceType,
            reason: event.reason
          }
        });

        // Emit highlighting cleanup signals
        await this.signalBus.emit({
          type: SIGNAL_TYPES.CLEAR_HIGHLIGHTING,
          source: { panelId: 'cleanup-manager', resourceId: event.resourceId },
          payload: {
            key: event.resourceId,
            reason: 'resource_cleanup'
          }
        });

        // Emit alignment cleanup signals
        await this.signalBus.emit({
          type: SIGNAL_TYPES.CLEAR_ALIGNMENT_HIGHLIGHTS,
          source: { panelId: 'cleanup-manager', resourceId: event.resourceId },
          payload: {
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
        // Clear any cached data
        if (event.metadata?.clearCache) {
          // Implementation would depend on caching system
        }

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    });

    // DOM cleanup strategy (for web environments)
    this.registerStrategy({
      name: 'dom-cleanup',
      priority: 75,
      canHandle: (event) => typeof document !== 'undefined',
      execute: async (event) => {
        // Remove any DOM elements associated with the resource
        const elements = document.querySelectorAll(`[data-resource-id="${event.resourceId}"]`);
        elements.forEach(element => {
          element.remove();
        });

        // Clear any event listeners
        // This would need more specific implementation based on how events are tracked
      }
    });

    // Translation-specific cleanup strategy
    this.registerStrategy({
      name: 'translation-cleanup',
      priority: 80,
      canHandle: (event) => event.resourceType.includes('translation') || event.resourceType.includes('verse'),
      execute: async (event) => {
        // Clear translation-specific highlighting
        await this.signalBus.emit({
          type: SIGNAL_TYPES.CLEAR_HIGHLIGHTING,
          source: { panelId: 'cleanup-manager', resourceId: event.resourceId },
          payload: {
            key: 'translation_notes',
            reason: 'resource_dismissed'
          }
        });

        // Clear word-click highlighting
        await this.signalBus.emit({
          type: SIGNAL_TYPES.CLEAR_HIGHLIGHTING,
          source: { panelId: 'cleanup-manager', resourceId: event.resourceId },
          payload: {
            key: 'word_click',
            reason: 'resource_dismissed'
          }
        });
      }
    });
  }
}

/**
 * Implementation of cleanup dependency graph
 */
class ResourceCleanupGraph implements CleanupGraph {
  private dependencies = new Map<ResourceId, Set<ResourceId>>();
  private dependents = new Map<ResourceId, Set<ResourceId>>();

  addDependency(dependency: CleanupDependency): void {
    // Add to dependencies map
    if (!this.dependencies.has(dependency.sourceResourceId)) {
      this.dependencies.set(dependency.sourceResourceId, new Set());
    }
    this.dependencies.get(dependency.sourceResourceId)!.add(dependency.targetResourceId);

    // Add to dependents map
    if (!this.dependents.has(dependency.targetResourceId)) {
      this.dependents.set(dependency.targetResourceId, new Set());
    }
    this.dependents.get(dependency.targetResourceId)!.add(dependency.sourceResourceId);
  }

  removeDependency(sourceId: ResourceId, targetId: ResourceId): void {
    const deps = this.dependencies.get(sourceId);
    if (deps) {
      deps.delete(targetId);
      if (deps.size === 0) {
        this.dependencies.delete(sourceId);
      }
    }

    const dependents = this.dependents.get(targetId);
    if (dependents) {
      dependents.delete(sourceId);
      if (dependents.size === 0) {
        this.dependents.delete(targetId);
      }
    }
  }

  getCleanupOrder(resourceId: ResourceId): ResourceId[] {
    const visited = new Set<ResourceId>();
    const visiting = new Set<ResourceId>();
    const result: ResourceId[] = [];

    const visit = (id: ResourceId) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected in cleanup graph for resource '${id}'`);
      }

      visiting.add(id);

      // Visit dependencies first
      const deps = this.dependencies.get(id) || new Set();
      deps.forEach(depId => visit(depId));

      visiting.delete(id);
      visited.add(id);
      result.push(id);
    };

    visit(resourceId);
    return result;
  }

  hasCycles(): boolean {
    const visited = new Set<ResourceId>();
    const visiting = new Set<ResourceId>();

    const hasCycle = (resourceId: ResourceId): boolean => {
      if (visited.has(resourceId)) return false;
      if (visiting.has(resourceId)) return true;

      visiting.add(resourceId);

      const deps = this.dependencies.get(resourceId) || new Set();
      for (const depId of deps) {
        if (hasCycle(depId)) return true;
      }

      visiting.delete(resourceId);
      visited.add(resourceId);
      return false;
    };

    // Check all resources
    for (const resourceId of this.dependencies.keys()) {
      if (hasCycle(resourceId)) return true;
    }

    return false;
  }
} 