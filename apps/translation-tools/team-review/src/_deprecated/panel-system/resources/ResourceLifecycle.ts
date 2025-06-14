import { ResourceAPI, ResourceConfig, ResourceLifecyclePhase, ResourceLifecycleEvent } from '../types/Resource';
import { CleanupReason, ResourceCleanupEvent } from '../types/Cleanup';
import { ResourceId, PanelId } from '../types/Signal';
import { SignalBus } from '../core/SignalBus';
import { SIGNAL_TYPES } from '../signals/SignalTypes';

/**
 * Manages resource lifecycle orchestration with enhanced cleanup coordination
 * Handles dependency injection integration, error handling, and unmount signal handling
 */
export class ResourceLifecycle {
  private resources = new Map<ResourceId, ResourceAPI>();
  private lifecycleStates = new Map<ResourceId, ResourceLifecyclePhase>();
  private dependencies = new Map<ResourceId, Set<ResourceId>>();
  private dependents = new Map<ResourceId, Set<ResourceId>>();
  private cleanupEvents = new Map<ResourceId, ResourceCleanupEvent[]>();

  // Event handlers
  private onLifecycleEventHandlers: Array<(event: ResourceLifecycleEvent) => void> = [];
  private onCleanupEventHandlers: Array<(event: ResourceCleanupEvent) => void> = [];

  constructor(private signalBus: SignalBus) {
    this.setupSignalHandlers();
  }

  /**
   * Register a resource with the lifecycle manager
   */
  registerResource(resource: ResourceAPI): void {
    this.resources.set(resource.id, resource);
    this.lifecycleStates.set(resource.id, ResourceLifecyclePhase.CREATED);
    
    // Initialize dependency tracking
    this.dependencies.set(resource.id, new Set());
    this.dependents.set(resource.id, new Set());
    this.cleanupEvents.set(resource.id, []);

    // Setup dependencies if specified in config
    const config = resource.getConfig();
    if (config.dependencies) {
      config.dependencies.forEach(depId => {
        this.addDependency(resource.id, depId);
      });
    }

    this.emitLifecycleEvent(resource.id, ResourceLifecyclePhase.CREATED);
  }

  /**
   * Unregister a resource from the lifecycle manager
   */
  unregisterResource(resourceId: ResourceId): void {
    // Remove all dependencies
    this.removeDependencies(resourceId);

    // Clean up tracking data
    this.resources.delete(resourceId);
    this.lifecycleStates.delete(resourceId);
    this.dependencies.delete(resourceId);
    this.dependents.delete(resourceId);
    this.cleanupEvents.delete(resourceId);
  }

  /**
   * Add a dependency relationship between resources
   */
  addDependency(resourceId: ResourceId, dependsOnId: ResourceId): void {
    // Add to dependencies
    if (!this.dependencies.has(resourceId)) {
      this.dependencies.set(resourceId, new Set());
    }
    this.dependencies.get(resourceId)!.add(dependsOnId);

    // Add to dependents
    if (!this.dependents.has(dependsOnId)) {
      this.dependents.set(dependsOnId, new Set());
    }
    this.dependents.get(dependsOnId)!.add(resourceId);
  }

  /**
   * Remove a dependency relationship
   */
  removeDependency(resourceId: ResourceId, dependsOnId: ResourceId): void {
    const deps = this.dependencies.get(resourceId);
    if (deps) {
      deps.delete(dependsOnId);
    }

    const dependents = this.dependents.get(dependsOnId);
    if (dependents) {
      dependents.delete(resourceId);
    }
  }

  /**
   * Remove all dependencies for a resource
   */
  removeDependencies(resourceId: ResourceId): void {
    // Remove from dependencies
    const deps = this.dependencies.get(resourceId);
    if (deps) {
      deps.forEach(depId => {
        const dependents = this.dependents.get(depId);
        if (dependents) {
          dependents.delete(resourceId);
        }
      });
      deps.clear();
    }

    // Remove from dependents
    const dependents = this.dependents.get(resourceId);
    if (dependents) {
      dependents.forEach(depId => {
        const deps = this.dependencies.get(depId);
        if (deps) {
          deps.delete(resourceId);
        }
      });
      dependents.clear();
    }
  }

  /**
   * Mount a resource and its dependencies
   */
  async mountResource(resourceId: ResourceId): Promise<void> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      throw new Error(`Resource '${resourceId}' not found`);
    }

    const currentPhase = this.lifecycleStates.get(resourceId);
    if (currentPhase === ResourceLifecyclePhase.MOUNTED) {
      return; // Already mounted
    }

    try {
      // Set mounting phase
      this.setLifecyclePhase(resourceId, ResourceLifecyclePhase.MOUNTING);

      // Mount dependencies first
      const deps = this.dependencies.get(resourceId) || new Set();
      for (const depId of deps) {
        await this.mountResource(depId);
      }

      // Mount the resource
      await resource.mount();

      // Set mounted phase
      this.setLifecyclePhase(resourceId, ResourceLifecyclePhase.MOUNTED);

      // Emit mount signal
      await this.signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: resource.panelId, resourceId },
        payload: {
          resourceId,
          resourceType: resource.type,
          panelId: resource.panelId
        }
      });

    } catch (error) {
      // Set error phase
      this.setLifecyclePhase(resourceId, ResourceLifecyclePhase.ERROR);
      
      this.emitLifecycleEvent(resourceId, ResourceLifecyclePhase.ERROR, {
        error: error instanceof Error ? error : new Error(String(error))
      });

      throw new Error(`Failed to mount resource '${resourceId}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Unmount a resource and handle cleanup
   */
  async unmountResource(resourceId: ResourceId, reason: CleanupReason = CleanupReason.MANUAL): Promise<void> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return; // Resource doesn't exist
    }

    const currentPhase = this.lifecycleStates.get(resourceId);
    if (currentPhase === ResourceLifecyclePhase.UNMOUNTED) {
      return; // Already unmounted
    }

    try {
      // Set unmounting phase
      this.setLifecyclePhase(resourceId, ResourceLifecyclePhase.UNMOUNTING);

      // Create cleanup event
      const cleanupEvent: ResourceCleanupEvent = {
        resourceId,
        resourceType: resource.type,
        reason,
        timestamp: Date.now(),
        metadata: { initiatedBy: 'lifecycle' }
      };

      // Track cleanup event
      this.trackCleanupEvent(resourceId, cleanupEvent);

      // Emit cleanup signals before unmounting
      await this.emitCleanupSignals(resource, reason);

      // Unmount dependents first
      const dependents = this.dependents.get(resourceId) || new Set();
      for (const depId of dependents) {
        await this.unmountResource(depId, CleanupReason.UNMOUNTED);
      }

      // Call resource cleanup if available
      if (resource.onCleanup) {
        await resource.onCleanup(cleanupEvent);
      }

      // Unmount the resource
      await resource.unmount();

      // Set unmounted phase
      this.setLifecyclePhase(resourceId, ResourceLifecyclePhase.UNMOUNTED);

      // Emit unmount signal
      await this.signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_UNMOUNTED,
        source: { panelId: resource.panelId, resourceId },
        payload: {
          resourceId,
          resourceType: resource.type,
          panelId: resource.panelId,
          reason: reason.toString()
        }
      });

      // Emit dismissal signal
      await this.signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_DISMISSED,
        source: { panelId: resource.panelId, resourceId },
        payload: {
          resourceId,
          resourceType: resource.type,
          reason
        }
      });

    } catch (error) {
      // Set error phase
      this.setLifecyclePhase(resourceId, ResourceLifecyclePhase.ERROR);
      
      this.emitLifecycleEvent(resourceId, ResourceLifecyclePhase.ERROR, {
        error: error instanceof Error ? error : new Error(String(error))
      });

      throw new Error(`Failed to unmount resource '${resourceId}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get resource lifecycle phase
   */
  getLifecyclePhase(resourceId: ResourceId): ResourceLifecyclePhase | undefined {
    return this.lifecycleStates.get(resourceId);
  }

  /**
   * Get resource dependencies
   */
  getDependencies(resourceId: ResourceId): ResourceId[] {
    return Array.from(this.dependencies.get(resourceId) || []);
  }

  /**
   * Get resource dependents
   */
  getDependents(resourceId: ResourceId): ResourceId[] {
    return Array.from(this.dependents.get(resourceId) || []);
  }

  /**
   * Get cleanup events for a resource
   */
  getCleanupEvents(resourceId: ResourceId): ResourceCleanupEvent[] {
    return this.cleanupEvents.get(resourceId) || [];
  }

  /**
   * Check if resource can be safely unmounted
   */
  canUnmount(resourceId: ResourceId): { canUnmount: boolean; blockedBy: ResourceId[] } {
    const dependents = this.dependents.get(resourceId) || new Set();
    const activeDependents = Array.from(dependents).filter(depId => {
      const phase = this.lifecycleStates.get(depId);
      return phase === ResourceLifecyclePhase.MOUNTED || phase === ResourceLifecyclePhase.MOUNTING;
    });

    return {
      canUnmount: activeDependents.length === 0,
      blockedBy: activeDependents
    };
  }

  /**
   * Get mount order for resources
   */
  getMountOrder(resourceIds: ResourceId[]): ResourceId[] {
    const visited = new Set<ResourceId>();
    const visiting = new Set<ResourceId>();
    const result: ResourceId[] = [];

    const visit = (resourceId: ResourceId) => {
      if (visited.has(resourceId)) return;
      if (visiting.has(resourceId)) {
        throw new Error(`Circular dependency detected involving resource '${resourceId}'`);
      }

      visiting.add(resourceId);

      // Visit dependencies first
      const deps = this.dependencies.get(resourceId) || new Set();
      deps.forEach(depId => {
        if (resourceIds.includes(depId)) {
          visit(depId);
        }
      });

      visiting.delete(resourceId);
      visited.add(resourceId);
      result.push(resourceId);
    };

    resourceIds.forEach(resourceId => visit(resourceId));
    return result;
  }

  /**
   * Get unmount order for resources (reverse of mount order)
   */
  getUnmountOrder(resourceIds: ResourceId[]): ResourceId[] {
    return this.getMountOrder(resourceIds).reverse();
  }

  /**
   * Register lifecycle event handler
   */
  onLifecycleEvent(handler: (event: ResourceLifecycleEvent) => void): () => void {
    this.onLifecycleEventHandlers.push(handler);
    return () => {
      const index = this.onLifecycleEventHandlers.indexOf(handler);
      if (index > -1) {
        this.onLifecycleEventHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Register cleanup event handler
   */
  onCleanupEvent(handler: (event: ResourceCleanupEvent) => void): () => void {
    this.onCleanupEventHandlers.push(handler);
    return () => {
      const index = this.onCleanupEventHandlers.indexOf(handler);
      if (index > -1) {
        this.onCleanupEventHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Cleanup the lifecycle manager
   */
  async cleanup(): Promise<void> {
    // Unmount all resources
    const resourceIds = Array.from(this.resources.keys());
    const unmountOrder = this.getUnmountOrder(resourceIds);

    for (const resourceId of unmountOrder) {
      try {
        await this.unmountResource(resourceId, CleanupReason.MANUAL);
      } catch (error) {
        console.warn(`Failed to unmount resource '${resourceId}' during cleanup:`, error);
      }
    }

    // Clear all tracking data
    this.resources.clear();
    this.lifecycleStates.clear();
    this.dependencies.clear();
    this.dependents.clear();
    this.cleanupEvents.clear();

    // Clear handlers
    this.onLifecycleEventHandlers = [];
    this.onCleanupEventHandlers = [];
  }

  /**
   * Setup signal handlers
   */
  private setupSignalHandlers(): void {
    // Handle resource dismissal signals
    this.signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_DISMISSED, async (signal) => {
      const { resourceId, reason } = signal.payload;
      if (this.resources.has(resourceId)) {
        await this.unmountResource(resourceId, reason);
      }
    });

    // Handle panel hide signals
    this.signalBus.onGlobal(SIGNAL_TYPES.HIDE_PANEL, async (signal) => {
      const { panelId } = signal.payload;
      
      // Find and unmount all resources in the hidden panel
      const panelResources = Array.from(this.resources.values())
        .filter(resource => resource.panelId === panelId)
        .map(resource => resource.id);

      for (const resourceId of panelResources) {
        await this.unmountResource(resourceId, CleanupReason.PANEL_SWITCHED);
      }
    });
  }

  /**
   * Set lifecycle phase and emit event
   */
  private setLifecyclePhase(resourceId: ResourceId, phase: ResourceLifecyclePhase): void {
    const previousPhase = this.lifecycleStates.get(resourceId);
    this.lifecycleStates.set(resourceId, phase);
    this.emitLifecycleEvent(resourceId, phase, { previousPhase });
  }

  /**
   * Emit lifecycle event
   */
  private emitLifecycleEvent(
    resourceId: ResourceId,
    phase: ResourceLifecyclePhase,
    metadata?: { previousPhase?: ResourceLifecyclePhase; error?: Error }
  ): void {
    const event: ResourceLifecycleEvent = {
      resourceId,
      phase,
      timestamp: Date.now(),
      metadata,
      error: metadata?.error
    };

    this.onLifecycleEventHandlers.forEach(handler => handler(event));
  }

  /**
   * Track cleanup event
   */
  private trackCleanupEvent(resourceId: ResourceId, event: ResourceCleanupEvent): void {
    const events = this.cleanupEvents.get(resourceId) || [];
    events.push(event);
    this.cleanupEvents.set(resourceId, events);

    // Notify cleanup event handlers
    this.onCleanupEventHandlers.forEach(handler => handler(event));
  }

  /**
   * Emit cleanup signals before unmounting
   */
  private async emitCleanupSignals(resource: ResourceAPI, reason: CleanupReason): Promise<void> {
    // Emit highlighting cleanup signals
    await this.signalBus.emit({
      type: SIGNAL_TYPES.CLEAR_HIGHLIGHTING,
      source: { panelId: resource.panelId, resourceId: resource.id },
      payload: {
        key: resource.id,
        reason: 'resource_unmounted'
      }
    });

    // Emit alignment cleanup signals
    await this.signalBus.emit({
      type: SIGNAL_TYPES.CLEAR_ALIGNMENT_HIGHLIGHTS,
      source: { panelId: resource.panelId, resourceId: resource.id },
      payload: {
        reason: 'resource_unmounted'
      }
    });

    // Emit custom cleanup signals based on resource type
    if (resource.type === 'translation-notes') {
      await this.signalBus.emit({
        type: SIGNAL_TYPES.CLEAR_HIGHLIGHTING,
        source: { panelId: resource.panelId, resourceId: resource.id },
        payload: {
          key: 'translation_notes',
          reason: 'resource_dismissed'
        }
      });
    }
  }
} 