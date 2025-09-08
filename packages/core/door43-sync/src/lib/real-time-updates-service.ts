/**
 * Real-Time Updates Service
 * Handles real-time synchronization with WebSocket/polling support
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import { IStorageBackend } from '@bt-toolkit/door43-storage';
import { ResourceVersion, ChangeOperation } from './change-detection-service.js';

// ============================================================================
// Real-Time Updates Types
// ============================================================================

/**
 * Update transport types
 */
export type UpdateTransport = 'websocket' | 'polling' | 'server-sent-events' | 'webhook';

/**
 * Real-time update event
 */
export interface RealTimeUpdateEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: UpdateEventType;
  /** Resource ID affected */
  resourceId: string;
  /** Repository information */
  repository: {
    server: string;
    owner: string;
    repoId: string;
    ref: string;
  };
  /** Update payload */
  payload: UpdatePayload;
  /** Event timestamp */
  timestamp: Date;
  /** Source of the update */
  source: string;
  /** Update priority */
  priority: UpdatePriority;
  /** Retry count */
  retryCount: number;
}

/**
 * Update event types
 */
export type UpdateEventType = 
  | 'resource-created'
  | 'resource-updated'
  | 'resource-deleted'
  | 'resource-moved'
  | 'batch-update'
  | 'sync-request'
  | 'conflict-detected'
  | 'merge-completed';

/**
 * Update payload
 */
export type UpdatePayload = 
  | ResourceUpdatePayload
  | BatchUpdatePayload
  | SyncRequestPayload
  | ConflictPayload
  | MergePayload;

/**
 * Resource update payload
 */
export interface ResourceUpdatePayload {
  /** New version information */
  version: ResourceVersion;
  /** Changes made */
  changes: ChangeOperation[];
  /** Content delta (for efficient updates) */
  contentDelta?: ContentDelta;
  /** Metadata delta */
  metadataDelta?: MetadataDelta;
}

/**
 * Batch update payload
 */
export interface BatchUpdatePayload {
  /** Multiple resource updates */
  updates: Array<{
    resourceId: string;
    payload: ResourceUpdatePayload;
  }>;
  /** Batch operation ID */
  batchId: string;
  /** Total items in batch */
  totalItems: number;
  /** Current item index */
  currentItem: number;
}

/**
 * Sync request payload
 */
export interface SyncRequestPayload {
  /** Resources to sync */
  resourceIds: string[];
  /** Sync mode */
  mode: 'full' | 'incremental' | 'force';
  /** Since timestamp (for incremental) */
  since?: Date;
}

/**
 * Conflict payload
 */
export interface ConflictPayload {
  /** Conflicting versions */
  versions: ResourceVersion[];
  /** Conflict type */
  conflictType: 'content' | 'metadata' | 'concurrent';
  /** Suggested resolution */
  suggestedResolution?: string;
}

/**
 * Merge payload
 */
export interface MergePayload {
  /** Merged version */
  mergedVersion: ResourceVersion;
  /** Source versions */
  sourceVersions: string[];
  /** Merge strategy used */
  strategy: string;
}

/**
 * Content delta for efficient updates
 */
export interface ContentDelta {
  /** Delta type */
  type: 'json-patch' | 'text-diff' | 'binary-diff';
  /** Delta operations */
  operations: DeltaOperation[];
  /** Base version hash */
  baseHash: string;
  /** Target version hash */
  targetHash: string;
}

/**
 * Metadata delta
 */
export interface MetadataDelta {
  /** Added fields */
  added: Record<string, any>;
  /** Modified fields */
  modified: Record<string, { old: any; new: any }>;
  /** Removed fields */
  removed: string[];
}

/**
 * Delta operation
 */
export interface DeltaOperation {
  /** Operation type */
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  /** Path to operate on */
  path: string;
  /** Value for operation */
  value?: any;
  /** From path (for move/copy) */
  from?: string;
}

/**
 * Update priority levels
 */
export type UpdatePriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Update subscription
 */
export interface UpdateSubscription {
  /** Subscription ID */
  id: string;
  /** Resource patterns to watch */
  resourcePatterns: string[];
  /** Event types to listen for */
  eventTypes: UpdateEventType[];
  /** Callback function */
  callback: (event: RealTimeUpdateEvent) => Promise<void>;
  /** Subscription options */
  options: SubscriptionOptions;
  /** Created timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Active status */
  active: boolean;
}

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  /** Include content deltas */
  includeDeltas?: boolean;
  /** Buffer updates */
  bufferUpdates?: boolean;
  /** Buffer size */
  bufferSize?: number;
  /** Buffer timeout (ms) */
  bufferTimeout?: number;
  /** Retry failed updates */
  retryFailures?: boolean;
  /** Max retry attempts */
  maxRetries?: number;
}

/**
 * Connection status
 */
export interface ConnectionStatus {
  /** Connection state */
  state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  /** Transport being used */
  transport: UpdateTransport;
  /** Connection timestamp */
  connectedAt?: Date;
  /** Last activity timestamp */
  lastActivity?: Date;
  /** Reconnection attempts */
  reconnectAttempts: number;
  /** Error information */
  error?: string;
}

// ============================================================================
// Real-Time Updates Service Implementation
// ============================================================================

/**
 * Real-time updates service handles live synchronization
 */
export class RealTimeUpdatesService {
  private storageBackend: IStorageBackend;
  private transport: UpdateTransport;
  private subscriptions = new Map<string, UpdateSubscription>();
  private connectionStatus: ConnectionStatus;
  private eventQueue: RealTimeUpdateEvent[] = [];
  private processingQueue = false;
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  
  // Transport-specific connections
  private websocket?: WebSocket;
  private pollingTimer?: NodeJS.Timeout;
  private eventSource?: EventSource;
  
  // Event listeners
  private updateListeners: ((event: RealTimeUpdateEvent) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];

  constructor(
    storageBackend: IStorageBackend,
    transport: UpdateTransport = 'polling'
  ) {
    this.storageBackend = storageBackend;
    this.transport = transport;
    this.connectionStatus = {
      state: 'disconnected',
      transport,
      reconnectAttempts: 0
    };
  }

  /**
   * Add update event listener
   */
  onUpdate(listener: (event: RealTimeUpdateEvent) => void): void {
    this.updateListeners.push(listener);
  }

  /**
   * Add connection change listener
   */
  onConnectionChange(listener: (connected: boolean) => void): void {
    this.connectionListeners.push(listener);
  }

  /**
   * Remove update event listener
   */
  offUpdate(listener: (event: RealTimeUpdateEvent) => void): void {
    const index = this.updateListeners.indexOf(listener);
    if (index > -1) {
      this.updateListeners.splice(index, 1);
    }
  }

  /**
   * Remove connection change listener
   */
  offConnectionChange(listener: (connected: boolean) => void): void {
    const index = this.connectionListeners.indexOf(listener);
    if (index > -1) {
      this.connectionListeners.splice(index, 1);
    }
  }

  /**
   * Notify connection listeners of status change
   */
  private notifyConnectionChange(): void {
    const connected = this.connectionStatus.state === 'connected';
    this.connectionListeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        console.error('❌ Connection listener error:', error);
      }
    });
  }

  /**
   * Initialize real-time updates service
   */
  async initialize(): AsyncResult<void> {
    try {
      // Load existing subscriptions
      const subscriptionsResult = await this.storageBackend.get<any>('real-time:subscriptions');
      if (subscriptionsResult.success && subscriptionsResult.data) {
        this.subscriptions = this.deserializeSubscriptions(subscriptionsResult.data);
      }

      // Start connection based on transport
      const connectResult = await this.connect();
      if (!connectResult.success) {
        console.warn(`⚠️ Failed to connect: ${connectResult.error}`);
      }

      console.log(`📡 Real-time updates service initialized with ${this.transport} transport`);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize real-time updates service'
      };
    }
  }

  /**
   * Connect to update source
   */
  async connect(): AsyncResult<void> {
    try {
      this.connectionStatus.state = 'connecting';
      
      switch (this.transport) {
        case 'websocket':
          return await this.connectWebSocket();
        
        case 'polling':
          return await this.connectPolling();
        
        case 'server-sent-events':
          return await this.connectServerSentEvents();
        
        case 'webhook':
          return await this.connectWebhook();
        
        default:
          return {
            success: false,
            error: `Unsupported transport: ${this.transport}`
          };
      }
    } catch (error) {
      this.connectionStatus.state = 'error';
      this.connectionStatus.error = error instanceof Error ? error.message : 'Connection failed';
      this.notifyConnectionChange();
      
      return {
        success: false,
        error: this.connectionStatus.error
      };
    }
  }

  /**
   * Disconnect from update source
   */
  async disconnect(): AsyncResult<void> {
    try {
      this.connectionStatus.state = 'disconnected';
      this.notifyConnectionChange();
      
      // Clear timers
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = undefined;
      }
      
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = undefined;
      }
      
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
        this.pollingTimer = undefined;
      }

      // Close connections
      if (this.websocket) {
        this.websocket.close();
        this.websocket = undefined;
      }
      
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = undefined;
      }

      console.log('📡 Disconnected from real-time updates');
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect'
      };
    }
  }

  /**
   * Subscribe to updates
   */
  async subscribe(
    resourcePatterns: string[],
    eventTypes: UpdateEventType[],
    callback: (event: RealTimeUpdateEvent) => Promise<void>,
    options: SubscriptionOptions = {}
  ): AsyncResult<string> {
    try {
      const subscriptionId = this.generateSubscriptionId();
      
      const subscription: UpdateSubscription = {
        id: subscriptionId,
        resourcePatterns,
        eventTypes,
        callback,
        options,
        createdAt: new Date(),
        lastActivity: new Date(),
        active: true
      };

      this.subscriptions.set(subscriptionId, subscription);
      
      // Persist subscriptions
      await this.persistSubscriptions();

      console.log(`📡 Created subscription ${subscriptionId} for patterns: ${resourcePatterns.join(', ')}`);

      return { success: true, data: subscriptionId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription'
      };
    }
  }

  /**
   * Unsubscribe from updates
   */
  async unsubscribe(subscriptionId: string): AsyncResult<void> {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        return {
          success: false,
          error: 'Subscription not found'
        };
      }

      subscription.active = false;
      this.subscriptions.delete(subscriptionId);
      
      // Persist subscriptions
      await this.persistSubscriptions();

      console.log(`📡 Removed subscription ${subscriptionId}`);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe'
      };
    }
  }

  /**
   * Publish an update event
   */
  async publishUpdate(event: RealTimeUpdateEvent): AsyncResult<void> {
    try {
      // Add to event queue
      this.eventQueue.push(event);
      
      // Process queue if not already processing
      if (!this.processingQueue) {
        await this.processEventQueue();
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish update'
      };
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): UpdateSubscription[] {
    return Array.from(this.subscriptions.values()).filter(s => s.active);
  }

  /**
   * Force sync for specific resources
   */
  async forceSync(resourceIds: string[]): AsyncResult<void> {
    try {
      const syncEvent: RealTimeUpdateEvent = {
        id: this.generateEventId(),
        type: 'sync-request',
        resourceId: 'batch',
        repository: {
          server: 'local',
          owner: 'system',
          repoId: 'sync',
          ref: 'master'
        },
        payload: {
          resourceIds,
          mode: 'force'
        } as SyncRequestPayload,
        timestamp: new Date(),
        source: 'local',
        priority: 'high',
        retryCount: 0
      };

      return await this.publishUpdate(syncEvent);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to force sync'
      };
    }
  }

  // ============================================================================
  // Private Methods - Transport Implementations
  // ============================================================================

  private async connectWebSocket(): AsyncResult<void> {
    return new Promise((resolve) => {
      try {
        // In a real implementation, this would connect to an actual WebSocket server
        console.log('📡 WebSocket transport not implemented - using mock connection');
        
        this.connectionStatus.state = 'connected';
        this.connectionStatus.connectedAt = new Date();
        this.connectionStatus.lastActivity = new Date();
        this.notifyConnectionChange();
        
        // Start heartbeat
        this.heartbeatTimer = setInterval(() => {
          this.connectionStatus.lastActivity = new Date();
        }, 30000);

        resolve({ success: true, data: undefined });
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'WebSocket connection failed'
        });
      }
    });
  }

  private async connectPolling(): AsyncResult<void> {
    try {
      this.connectionStatus.state = 'connected';
      this.connectionStatus.connectedAt = new Date();
      this.notifyConnectionChange();
      
      // Start polling timer
      this.pollingTimer = setInterval(async () => {
        await this.pollForUpdates();
      }, 5000); // Poll every 5 seconds

      console.log('📡 Polling transport connected');
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Polling connection failed'
      };
    }
  }

  private async connectServerSentEvents(): AsyncResult<void> {
    return new Promise((resolve) => {
      try {
        // In a real implementation, this would connect to an SSE endpoint
        console.log('📡 Server-Sent Events transport not implemented - using mock connection');
        
        this.connectionStatus.state = 'connected';
        this.connectionStatus.connectedAt = new Date();
        
        resolve({ success: true, data: undefined });
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'SSE connection failed'
        });
      }
    });
  }

  private async connectWebhook(): AsyncResult<void> {
    try {
      // Webhook transport is passive - just mark as connected
      this.connectionStatus.state = 'connected';
      this.connectionStatus.connectedAt = new Date();
      
      console.log('📡 Webhook transport ready');
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook setup failed'
      };
    }
  }

  private async pollForUpdates(): Promise<void> {
    try {
      this.connectionStatus.lastActivity = new Date();
      
      // In a real implementation, this would make HTTP requests to check for updates
      // For now, we'll just simulate occasional updates
      if (Math.random() < 0.1) { // 10% chance of simulated update
        const mockEvent: RealTimeUpdateEvent = {
          id: this.generateEventId(),
          type: 'resource-updated',
          resourceId: 'mock-resource',
          repository: {
            server: 'door43',
            owner: 'unfoldingWord',
            repoId: 'en_ult',
            ref: 'master'
          },
          payload: {
            version: {
              resourceId: 'mock-resource',
              version: 1,
              contentHash: 'mock-hash',
              metadataHash: 'mock-meta-hash',
              lastModified: new Date(),
              modifiedBy: 'polling-system'
            },
            changes: []
          } as ResourceUpdatePayload,
          timestamp: new Date(),
          source: 'polling',
          priority: 'normal',
          retryCount: 0
        };

        await this.publishUpdate(mockEvent);
      }
    } catch (error) {
      console.error('❌ Polling error:', error);
    }
  }

  // ============================================================================
  // Private Methods - Event Processing
  // ============================================================================

  private async processEventQueue(): Promise<void> {
    if (this.processingQueue || this.eventQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()!;
        await this.processEvent(event);
      }
    } catch (error) {
      console.error('❌ Event queue processing error:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  private async processEvent(event: RealTimeUpdateEvent): Promise<void> {
    try {
      // Notify update listeners
      this.updateListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('❌ Update listener error:', error);
        }
      });
      
      // Find matching subscriptions
      const matchingSubscriptions = this.findMatchingSubscriptions(event);
      
      // Notify subscribers
      for (const subscription of matchingSubscriptions) {
        try {
          await subscription.callback(event);
          subscription.lastActivity = new Date();
        } catch (error) {
          console.error(`❌ Subscription callback error for ${subscription.id}:`, error);
          
          // Retry if configured
          if (subscription.options.retryFailures && event.retryCount < (subscription.options.maxRetries || 3)) {
            event.retryCount++;
            this.eventQueue.push(event);
          }
        }
      }

      console.log(`📡 Processed ${event.type} event for ${event.resourceId}`);
    } catch (error) {
      console.error('❌ Event processing error:', error);
    }
  }

  private findMatchingSubscriptions(event: RealTimeUpdateEvent): UpdateSubscription[] {
    const matching: UpdateSubscription[] = [];

    for (const subscription of this.subscriptions.values()) {
      if (!subscription.active) continue;

      // Check event type match
      if (!subscription.eventTypes.includes(event.type)) continue;

      // Check resource pattern match
      const patternMatch = subscription.resourcePatterns.some(pattern => 
        this.matchesPattern(event.resourceId, pattern)
      );

      if (patternMatch) {
        matching.push(subscription);
      }
    }

    return matching;
  }

  private matchesPattern(resourceId: string, pattern: string): boolean {
    // Simple pattern matching - would be more sophisticated in production
    if (pattern === '*') return true;
    if (pattern.endsWith('*')) {
      return resourceId.startsWith(pattern.slice(0, -1));
    }
    return resourceId === pattern;
  }

  // ============================================================================
  // Private Methods - Utilities
  // ============================================================================

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async persistSubscriptions(): Promise<void> {
    try {
      const subscriptionsData = this.serializeSubscriptions(this.subscriptions);
      await this.storageBackend.set('real-time:subscriptions', subscriptionsData, {
        tags: ['real-time', 'subscriptions']
      });
    } catch (error) {
      console.error('❌ Failed to persist subscriptions:', error);
    }
  }

  private serializeSubscriptions(subscriptions: Map<string, UpdateSubscription>): any {
    const result: any = {};
    for (const [id, subscription] of subscriptions) {
      result[id] = {
        ...subscription,
        callback: undefined // Don't serialize callback functions
      };
    }
    return result;
  }

  private deserializeSubscriptions(data: any): Map<string, UpdateSubscription> {
    const result = new Map<string, UpdateSubscription>();
    for (const [id, subscriptionData] of Object.entries(data)) {
      const subscription = subscriptionData as UpdateSubscription;
      // Note: Callbacks would need to be re-registered after deserialization
      subscription.callback = async () => {}; // Placeholder
      result.set(id, subscription);
    }
    return result;
  }
}
