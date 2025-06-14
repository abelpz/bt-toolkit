import { ResourceAPI, ResourceConfig } from '../types/Resource';
import { CleanupReason, ResourceCleanupEvent } from '../types/Cleanup';
import { SignalBus } from './SignalBus';
import { SIGNAL_TYPES } from '../signals/SignalTypes';

// Add missing ResourceMetrics interface
export interface ResourceMetrics {
  totalCreated: number;
  totalDestroyed: number;
  currentActive: number;
  averageLifetime: number;
  lastCreated?: number;
  lastDestroyed?: number;
}

// Add missing CleanupEvent interface
export interface CleanupEvent {
  timestamp: number;
  reason: CleanupReason;
  phase: 'started' | 'completed' | 'failed' | 'dismissed';
  metadata?: Record<string, any>;
}

/**
 * Registry for managing resource types, instances, and lifecycle
 * Enhanced with cleanup tracking and resource dismissal handling
 */
export class ResourceRegistry {
  private resourceTypes = new Map<string, ResourceConstructor>();
  private resourceInstances = new Map<string, ResourceAPI>();
  private resourceMetrics = new Map<string, ResourceMetrics>();
  private cleanupTracking = new Map<string, CleanupEvent[]>();

  // Event handlers
  private onResourceCreatedHandlers: Array<(resource: ResourceAPI) => void> = [];
  private onResourceDestroyedHandlers: Array<(resourceId: string) => void> = [];
  private onResourceDismissedHandlers: Array<(resourceId: string, reason: CleanupReason) => void> = [];

  constructor(private signalBus: SignalBus) {
    this.setupSignalHandlers();
  }

  /**
   * Register a resource type with its constructor
   */
  registerResourceType(type: string, constructor: ResourceConstructor): void {
    if (this.resourceTypes.has(type)) {
      throw new Error(`Resource type '${type}' is already registered`);
    }

    this.resourceTypes.set(type, constructor);
    
    // Initialize metrics for this type
    this.resourceMetrics.set(type, {
      totalCreated: 0,
      totalDestroyed: 0,
      currentActive: 0,
      averageLifetime: 0,
      lastCreated: undefined,
      lastDestroyed: undefined
    });
  }

  /**
   * Unregister a resource type
   */
  unregisterResourceType(type: string): void {
    this.resourceTypes.delete(type);
    this.resourceMetrics.delete(type);
  }

  /**
   * Get all registered resource types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.resourceTypes.keys());
  }

  /**
   * Check if a resource type is registered
   */
  isTypeRegistered(type: string): boolean {
    return this.resourceTypes.has(type);
  }

  /**
   * Create a new resource instance
   */
  async createResource(config: ResourceConfig): Promise<ResourceAPI> {
    const constructor = this.resourceTypes.get(config.type);
    if (!constructor) {
      throw new Error(`Unknown resource type: ${config.type}`);
    }

    // Create resource directly using constructor
    const resource = new constructor(config);

    // Register instance
    this.resourceInstances.set(resource.id, resource);

    // Update metrics
    this.updateCreationMetrics(config.type);

    // Track cleanup events
    this.cleanupTracking.set(resource.id, []);

    // Emit creation signal (using existing signal type)
    await this.signalBus.emit({
      type: SIGNAL_TYPES.RESOURCE_MOUNTED,
      source: { panelId: 'resource-registry', resourceId: resource.id },
      payload: {
        resourceId: resource.id,
        resourceType: config.type,
        panelId: config.panelId
      }
    });

    // Notify handlers
    this.onResourceCreatedHandlers.forEach(handler => handler(resource));

    return resource;
  }

  /**
   * Get a resource instance by ID
   */
  getResource(resourceId: string): ResourceAPI | undefined {
    return this.resourceInstances.get(resourceId);
  }

  /**
   * Get all resource instances
   */
  getAllResources(): ResourceAPI[] {
    return Array.from(this.resourceInstances.values());
  }

  /**
   * Get resources by type
   */
  getResourcesByType(type: string): ResourceAPI[] {
    return Array.from(this.resourceInstances.values())
      .filter(resource => resource.type === type);
  }

  /**
   * Destroy a resource instance
   */
  async destroyResource(resourceId: string, reason: CleanupReason = CleanupReason.MANUAL): Promise<void> {
    const resource = this.resourceInstances.get(resourceId);
    if (!resource) {
      return; // Resource doesn't exist, nothing to destroy
    }

    // Track cleanup event
    this.trackCleanupEvent(resourceId, {
      timestamp: Date.now(),
      reason,
      phase: 'started',
      metadata: { initiatedBy: 'registry' }
    });

    try {
      // Call resource cleanup if available
      if (resource.onCleanup) {
        await resource.onCleanup({
          resourceId,
          resourceType: resource.type,
          reason,
          timestamp: Date.now()
        });
      }

      // Call unmount
      await resource.unmount();

      // Remove from registry
      this.resourceInstances.delete(resourceId);

      // Update metrics
      this.updateDestructionMetrics(resource.type);

      // Track completion
      this.trackCleanupEvent(resourceId, {
        timestamp: Date.now(),
        reason,
        phase: 'completed',
        metadata: { success: true }
      });

      // Emit destruction signal (using existing signal type)
      await this.signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_UNMOUNTED,
        source: { panelId: 'resource-registry', resourceId },
        payload: {
          resourceId,
          resourceType: resource.type,
          panelId: resource.panelId,
          reason: reason.toString()
        }
      });

      // Notify handlers
      this.onResourceDestroyedHandlers.forEach(handler => handler(resourceId));

    } catch (error) {
      // Track failure
      this.trackCleanupEvent(resourceId, {
        timestamp: Date.now(),
        reason,
        phase: 'failed',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });

      throw new Error(`Failed to destroy resource '${resourceId}': ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Clean up tracking data
      this.cleanupTracking.delete(resourceId);
    }
  }

  /**
   * Handle resource dismissal (when resource becomes unavailable)
   */
  async handleResourceDismissal(resourceId: string, reason: CleanupReason): Promise<void> {
    const resource = this.resourceInstances.get(resourceId);
    if (!resource) {
      return;
    }

    // Track dismissal event
    this.trackCleanupEvent(resourceId, {
      timestamp: Date.now(),
      reason,
      phase: 'dismissed',
      metadata: { type: 'dismissal' }
    });

    // Emit dismissal signal
    await this.signalBus.emit({
      type: SIGNAL_TYPES.RESOURCE_DISMISSED,
      source: { panelId: 'resource-registry', resourceId },
      payload: {
        resourceId,
        resourceType: resource.type,
        reason
      }
    });

    // Notify handlers
    this.onResourceDismissedHandlers.forEach(handler => handler(resourceId, reason));

    // If dismissal is permanent, destroy the resource
    if (reason === CleanupReason.UNMOUNTED || reason === CleanupReason.ERROR) {
      await this.destroyResource(resourceId, reason);
    }
  }

  /**
   * Get resource metrics for a specific type
   */
  getResourceMetrics(type: string): ResourceMetrics | undefined {
    return this.resourceMetrics.get(type);
  }

  /**
   * Get all resource metrics
   */
  getAllMetrics(): Map<string, ResourceMetrics> {
    return new Map(this.resourceMetrics);
  }

  /**
   * Get cleanup tracking data for a resource
   */
  getCleanupHistory(resourceId: string): CleanupEvent[] {
    return this.cleanupTracking.get(resourceId) || [];
  }

  /**
   * Get cleanup statistics
   */
  getCleanupStatistics(): {
    totalCleanupEvents: number;
    cleanupsByReason: Record<string, number>;
    averageCleanupTime: number;
    failedCleanups: number;
  } {
    const allEvents = Array.from(this.cleanupTracking.values()).flat();
    
    const cleanupsByReason: Record<string, number> = {
      [CleanupReason.MANUAL]: 0,
      [CleanupReason.UNMOUNTED]: 0,
      [CleanupReason.HIDDEN]: 0,
      [CleanupReason.PANEL_SWITCHED]: 0,
      [CleanupReason.ERROR]: 0
    };

    let totalCleanupTime = 0;
    let completedCleanups = 0;
    let failedCleanups = 0;

    allEvents.forEach(event => {
      if (event.phase === 'completed') {
        completedCleanups++;
        // Calculate cleanup time if we have a start event
        const startEvent = allEvents.find(e => 
          e.reason === event.reason && e.phase === 'started'
        );
        if (startEvent) {
          totalCleanupTime += event.timestamp - startEvent.timestamp;
        }
      } else if (event.phase === 'failed') {
        failedCleanups++;
      }

      const reasonKey = event.reason.toString();
      cleanupsByReason[reasonKey] = (cleanupsByReason[reasonKey] || 0) + 1;
    });

    return {
      totalCleanupEvents: allEvents.length,
      cleanupsByReason,
      averageCleanupTime: completedCleanups > 0 ? totalCleanupTime / completedCleanups : 0,
      failedCleanups
    };
  }

  /**
   * Register event handlers
   */
  onResourceCreated(handler: (resource: ResourceAPI) => void): () => void {
    this.onResourceCreatedHandlers.push(handler);
    return () => {
      const index = this.onResourceCreatedHandlers.indexOf(handler);
      if (index > -1) {
        this.onResourceCreatedHandlers.splice(index, 1);
      }
    };
  }

  onResourceDestroyed(handler: (resourceId: string) => void): () => void {
    this.onResourceDestroyedHandlers.push(handler);
    return () => {
      const index = this.onResourceDestroyedHandlers.indexOf(handler);
      if (index > -1) {
        this.onResourceDestroyedHandlers.splice(index, 1);
      }
    };
  }

  onResourceDismissed(handler: (resourceId: string, reason: CleanupReason) => void): () => void {
    this.onResourceDismissedHandlers.push(handler);
    return () => {
      const index = this.onResourceDismissedHandlers.indexOf(handler);
      if (index > -1) {
        this.onResourceDismissedHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    const resourceIds = Array.from(this.resourceInstances.keys());
    
    // Destroy all resources
    await Promise.all(
      resourceIds.map(id => this.destroyResource(id, CleanupReason.MANUAL))
    );

    // Clear handlers
    this.onResourceCreatedHandlers = [];
    this.onResourceDestroyedHandlers = [];
    this.onResourceDismissedHandlers = [];

    // Clear tracking data
    this.cleanupTracking.clear();
  }

  /**
   * Setup signal handlers for resource dismissal
   */
  private setupSignalHandlers(): void {
    // Handle resource dismissal signals
    this.signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_DISMISSED, async (signal) => {
      const { resourceId, reason } = signal.payload;
      await this.handleResourceDismissal(resourceId, reason);
    });

    // Handle panel destruction signals (using existing signal type)
    this.signalBus.onGlobal(SIGNAL_TYPES.HIDE_PANEL, async (signal) => {
      const { panelId } = signal.payload;
      
      // Find and dismiss all resources in the hidden panel
      const panelResources = Array.from(this.resourceInstances.values())
        .filter(resource => resource.panelId === panelId);

      await Promise.all(
        panelResources.map(resource => 
          this.handleResourceDismissal(resource.id, CleanupReason.PANEL_SWITCHED)
        )
      );
    });
  }

  /**
   * Track cleanup events
   */
  private trackCleanupEvent(resourceId: string, event: CleanupEvent): void {
    const events = this.cleanupTracking.get(resourceId) || [];
    events.push(event);
    this.cleanupTracking.set(resourceId, events);
  }

  /**
   * Update creation metrics
   */
  private updateCreationMetrics(type: string): void {
    const metrics = this.resourceMetrics.get(type);
    if (metrics) {
      metrics.totalCreated++;
      metrics.currentActive++;
      metrics.lastCreated = Date.now();
      this.resourceMetrics.set(type, metrics);
    }
  }

  /**
   * Update destruction metrics
   */
  private updateDestructionMetrics(type: string): void {
    const metrics = this.resourceMetrics.get(type);
    if (metrics) {
      metrics.totalDestroyed++;
      metrics.currentActive = Math.max(0, metrics.currentActive - 1);
      metrics.lastDestroyed = Date.now();

      // Calculate average lifetime
      if (metrics.lastCreated && metrics.lastDestroyed) {
        const lifetime = metrics.lastDestroyed - metrics.lastCreated;
        metrics.averageLifetime = metrics.totalDestroyed === 1 
          ? lifetime 
          : (metrics.averageLifetime * (metrics.totalDestroyed - 1) + lifetime) / metrics.totalDestroyed;
      }

      this.resourceMetrics.set(type, metrics);
    }
  }
}

/**
 * Resource constructor type
 */
export type ResourceConstructor = new (config: ResourceConfig) => ResourceAPI; 