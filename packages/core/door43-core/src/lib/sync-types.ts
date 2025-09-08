/**
 * Synchronization Types for Multi-Editor Collaborative Editing
 * Handles real-time updates, conflict detection, and cache invalidation
 */

// Note: ResourceId and RepositoryIdentifier are defined in other files
// We'll define them locally to avoid circular dependencies

/**
 * Resource identifier (local definition)
 */
export type ResourceId = string;

/**
 * Repository identifier (local definition)
 */
export interface RepositoryIdentifier {
  server: string;
  owner: string;
  repoId: string;
  ref: string;
}

// ============================================================================
// Resource State Management
// ============================================================================

/**
 * Resource synchronization state
 */
export type ResourceSyncState = 
  | 'clean'        // Local matches server, no changes
  | 'dirty'        // Local has changes, server unchanged
  | 'stale'        // Server has changes, local unchanged
  | 'conflict'     // Both local and server have changes
  | 'syncing'      // Currently synchronizing
  | 'error';       // Sync failed

/**
 * Resource version information
 */
export interface ResourceVersion {
  /** Resource identifier */
  resourceId: ResourceId;
  /** Content hash */
  contentHash: string;
  /** ETag from server */
  etag?: string;
  /** Last modified timestamp */
  lastModified: Date;
  /** Commit hash (if available) */
  commitHash?: string;
  /** Version number (if available) */
  version?: string;
  /** Branch/tag reference */
  ref: string;
}

/**
 * Synchronization metadata
 */
export interface SyncMetadata {
  /** Current sync state */
  state: ResourceSyncState;
  /** Local version */
  localVersion: ResourceVersion;
  /** Server version */
  serverVersion?: ResourceVersion;
  /** Last successful sync */
  lastSyncAt?: Date;
  /** Last sync attempt */
  lastSyncAttemptAt?: Date;
  /** Sync attempt count */
  syncAttempts: number;
  /** Next scheduled sync */
  nextSyncAt?: Date;
  /** Sync errors */
  errors: SyncError[];
  /** Conflict information */
  conflicts?: ConflictInfo[];
}

/**
 * Sync error information
 */
export interface SyncError {
  /** Error timestamp */
  timestamp: Date;
  /** Error type */
  type: 'network' | 'conflict' | 'permission' | 'validation' | 'server' | 'unknown';
  /** Error message */
  message: string;
  /** Error details */
  details?: any;
  /** Whether error is recoverable */
  recoverable: boolean;
  /** Retry count */
  retryCount: number;
}

/**
 * Conflict information
 */
export interface ConflictInfo {
  /** Conflict type */
  type: 'content' | 'metadata' | 'structure';
  /** Field that conflicts */
  field: string;
  /** Local value */
  localValue: any;
  /** Server value */
  serverValue: any;
  /** Conflict resolution strategy */
  resolution?: ConflictResolution;
  /** When conflict was detected */
  detectedAt: Date;
  /** Whether conflict is resolved */
  resolved: boolean;
}

/**
 * Conflict resolution strategy
 */
export type ConflictResolution = 
  | 'accept-local'     // Keep local changes
  | 'accept-server'    // Accept server changes
  | 'merge-automatic'  // Automatic merge
  | 'merge-manual'     // Manual merge required
  | 'create-branch';   // Create new branch

// ============================================================================
// Change Detection
// ============================================================================

/**
 * Change detection configuration
 */
export interface ChangeDetectionConfig {
  /** How often to check for changes (ms) */
  pollInterval: number;
  /** Use real-time updates if available */
  useRealTime: boolean;
  /** WebSocket/SSE endpoint */
  realTimeEndpoint?: string;
  /** Batch size for checking multiple resources */
  batchSize: number;
  /** Maximum concurrent checks */
  maxConcurrentChecks: number;
  /** Exponential backoff for failed checks */
  backoffConfig: {
    initialDelay: number;
    maxDelay: number;
    multiplier: number;
    maxRetries: number;
  };
}

/**
 * Change detection result
 */
export interface ChangeDetectionResult {
  /** Resource ID */
  resourceId: ResourceId;
  /** Whether resource changed */
  hasChanged: boolean;
  /** Change type */
  changeType?: 'content' | 'metadata' | 'deleted' | 'moved';
  /** New version info */
  newVersion?: ResourceVersion;
  /** Change details */
  changes?: ResourceChange[];
  /** Detection timestamp */
  detectedAt: Date;
}

/**
 * Resource change details
 */
export interface ResourceChange {
  /** Change type */
  type: 'added' | 'modified' | 'deleted' | 'moved' | 'renamed';
  /** Field that changed */
  field: string;
  /** Old value */
  oldValue?: any;
  /** New value */
  newValue?: any;
  /** Change author */
  author?: string;
  /** Change timestamp */
  timestamp: Date;
  /** Change description */
  description?: string;
}

// ============================================================================
// Synchronization Strategies
// ============================================================================

/**
 * Synchronization strategy configuration
 */
export interface SyncStrategyConfig {
  /** Strategy type */
  strategy: SyncStrategy;
  /** Sync frequency */
  frequency: SyncFrequency;
  /** Conflict resolution policy */
  conflictResolution: ConflictResolutionPolicy;
  /** Retry policy */
  retryPolicy: RetryPolicy;
  /** Bandwidth optimization */
  bandwidthOptimization: BandwidthOptimization;
}

/**
 * Synchronization strategy
 */
export type SyncStrategy = 
  | 'aggressive'    // Sync immediately on any change
  | 'balanced'      // Sync periodically with batching
  | 'conservative'  // Sync only when explicitly requested
  | 'offline-first' // Prioritize local changes, sync when online
  | 'server-first'; // Always prefer server version

/**
 * Sync frequency configuration
 */
export interface SyncFrequency {
  /** Immediate sync for high-priority resources */
  immediate: string[]; // Resource types or IDs
  /** Fast sync interval (seconds) */
  fast: number;
  /** Normal sync interval (minutes) */
  normal: number;
  /** Slow sync interval (hours) */
  slow: number;
  /** Background sync interval (when app inactive) */
  background: number;
}

/**
 * Conflict resolution policy
 */
export interface ConflictResolutionPolicy {
  /** Default resolution strategy */
  default: ConflictResolution;
  /** Per-resource-type strategies */
  perType: Record<string, ConflictResolution>;
  /** Per-field strategies */
  perField: Record<string, ConflictResolution>;
  /** Whether to prompt user for conflicts */
  promptUser: boolean;
  /** Auto-resolve threshold (confidence 0-1) */
  autoResolveThreshold: number;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Initial retry delay (ms) */
  initialDelay: number;
  /** Maximum retry delay (ms) */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Jitter to avoid thundering herd */
  jitter: boolean;
  /** Retry on specific error types */
  retryOnErrors: string[];
}

/**
 * Bandwidth optimization settings
 */
export interface BandwidthOptimization {
  /** Use delta/patch updates */
  useDeltaUpdates: boolean;
  /** Compress sync data */
  compression: boolean;
  /** Batch multiple updates */
  batching: boolean;
  /** Maximum batch size */
  maxBatchSize: number;
  /** Prioritize critical resources */
  prioritization: boolean;
}

// ============================================================================
// Real-Time Updates
// ============================================================================

/**
 * Real-time update event
 */
export interface RealTimeUpdateEvent {
  /** Event type */
  type: 'resource-updated' | 'resource-deleted' | 'resource-moved' | 'branch-updated' | 'user-joined' | 'user-left';
  /** Repository */
  repository: RepositoryIdentifier;
  /** Resource ID (if applicable) */
  resourceId?: ResourceId;
  /** Event data */
  data: any;
  /** Event timestamp */
  timestamp: Date;
  /** Event author */
  author?: UserInfo;
  /** Event ID (for deduplication) */
  eventId: string;
}

/**
 * User information
 */
export interface UserInfo {
  /** User ID */
  id: string;
  /** User name */
  name: string;
  /** User email */
  email?: string;
  /** User role */
  role?: string;
  /** User avatar */
  avatar?: string;
}

/**
 * Real-time connection status
 */
export interface RealTimeConnectionStatus {
  /** Connection state */
  state: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
  /** Last connection time */
  lastConnectedAt?: Date;
  /** Connection error */
  error?: string;
  /** Reconnection attempts */
  reconnectAttempts: number;
  /** Subscribed repositories */
  subscriptions: RepositoryIdentifier[];
}

// ============================================================================
// Collaborative Editing
// ============================================================================

/**
 * Active editor information
 */
export interface ActiveEditor {
  /** Editor user info */
  user: UserInfo;
  /** Currently editing resource */
  currentResource?: ResourceId;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Editor capabilities */
  capabilities: EditorCapabilities;
  /** Connection info */
  connection: {
    platform: 'web' | 'mobile' | 'desktop' | 'cli';
    version: string;
    userAgent?: string;
  };
}

/**
 * Editor capabilities
 */
export interface EditorCapabilities {
  /** Can edit content */
  canEdit: boolean;
  /** Can resolve conflicts */
  canResolveConflicts: boolean;
  /** Can create branches */
  canCreateBranches: boolean;
  /** Can merge changes */
  canMerge: boolean;
  /** Supported resource types */
  supportedTypes: string[];
}

/**
 * Collaborative session
 */
export interface CollaborativeSession {
  /** Session ID */
  id: string;
  /** Repository being edited */
  repository: RepositoryIdentifier;
  /** Active editors */
  activeEditors: ActiveEditor[];
  /** Session start time */
  startedAt: Date;
  /** Last activity */
  lastActivity: Date;
  /** Shared resources */
  sharedResources: ResourceId[];
  /** Session settings */
  settings: {
    allowConcurrentEditing: boolean;
    autoSaveInterval: number;
    conflictResolution: ConflictResolution;
    broadcastChanges: boolean;
  };
}

// ============================================================================
// Sync Operations
// ============================================================================

/**
 * Sync operation request
 */
export interface SyncOperationRequest {
  /** Operation type */
  type: 'pull' | 'push' | 'sync' | 'force-pull' | 'force-push';
  /** Resources to sync */
  resourceIds: ResourceId[];
  /** Sync options */
  options: {
    /** Force sync even if no changes detected */
    force?: boolean;
    /** Include related resources */
    includeRelated?: boolean;
    /** Conflict resolution strategy */
    conflictResolution?: ConflictResolution;
    /** Create backup before sync */
    createBackup?: boolean;
    /** Dry run (don't actually sync) */
    dryRun?: boolean;
  };
}

/**
 * Sync operation result
 */
export interface SyncOperationResult {
  /** Operation success */
  success: boolean;
  /** Synced resources */
  synced: ResourceId[];
  /** Failed resources */
  failed: Array<{
    resourceId: ResourceId;
    error: string;
    recoverable: boolean;
  }>;
  /** Conflicts detected */
  conflicts: Array<{
    resourceId: ResourceId;
    conflicts: ConflictInfo[];
  }>;
  /** Operation statistics */
  stats: {
    totalResources: number;
    syncedResources: number;
    failedResources: number;
    conflictedResources: number;
    bytesTransferred: number;
    operationTime: number;
  };
  /** Backup created */
  backupId?: string;
}

/**
 * Batch sync request
 */
export interface BatchSyncRequest {
  /** Repository to sync */
  repository: RepositoryIdentifier;
  /** Sync strategy */
  strategy: SyncStrategy;
  /** Resource filters */
  filters?: {
    types?: string[];
    modifiedSince?: Date;
    authors?: string[];
    priority?: 'high' | 'normal' | 'low';
  };
  /** Batch options */
  options: {
    batchSize: number;
    maxConcurrency: number;
    continueOnError: boolean;
    progressCallback?: (progress: SyncProgress) => void;
  };
}

/**
 * Sync progress information
 */
export interface SyncProgress {
  /** Current phase */
  phase: 'detecting-changes' | 'downloading' | 'processing' | 'resolving-conflicts' | 'uploading' | 'finalizing';
  /** Progress percentage (0-100) */
  progress: number;
  /** Current resource being processed */
  currentResource?: ResourceId;
  /** Processed resources count */
  processedCount: number;
  /** Total resources count */
  totalCount: number;
  /** Estimated time remaining (ms) */
  estimatedTimeRemaining?: number;
  /** Current operation description */
  description: string;
}

export * from './sync-types.js';
