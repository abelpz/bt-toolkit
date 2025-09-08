/**
 * Synchronization Service Interfaces
 * Multi-editor collaborative editing with real-time updates
 */

import {
  ResourceId,
  RepositoryIdentifier,
  ResourceSyncState,
  ResourceVersion,
  SyncMetadata,
  ChangeDetectionConfig,
  ChangeDetectionResult,
  SyncStrategyConfig,
  RealTimeUpdateEvent,
  RealTimeConnectionStatus,
  ActiveEditor,
  CollaborativeSession,
  SyncOperationRequest,
  SyncOperationResult,
  BatchSyncRequest,
  SyncProgress,
  ConflictInfo,
  ConflictResolution
} from './sync-types.js';
import { AsyncResult } from './types.js';

// ============================================================================
// Change Detection Service
// ============================================================================

/**
 * Monitors resources for changes on the server
 */
export interface IChangeDetectionService {
  /** Initialize change detection */
  initialize(config: ChangeDetectionConfig): AsyncResult<void>;
  
  /** Start monitoring resources */
  startMonitoring(resourceIds: ResourceId[]): AsyncResult<void>;
  
  /** Stop monitoring resources */
  stopMonitoring(resourceIds: ResourceId[]): AsyncResult<void>;
  
  /** Check for changes manually */
  checkForChanges(resourceIds: ResourceId[]): AsyncResult<ChangeDetectionResult[]>;
  
  /** Get current monitoring status */
  getMonitoringStatus(): AsyncResult<{
    isActive: boolean;
    monitoredResources: ResourceId[];
    lastCheckAt: Date;
    nextCheckAt: Date;
    errorCount: number;
  }>;
  
  /** Subscribe to change events */
  onChangesDetected(callback: (changes: ChangeDetectionResult[]) => void): void;
  
  /** Unsubscribe from change events */
  offChangesDetected(callback: (changes: ChangeDetectionResult[]) => void): void;
  
  /** Force immediate check */
  forceCheck(resourceIds?: ResourceId[]): AsyncResult<ChangeDetectionResult[]>;
  
  /** Update monitoring configuration */
  updateConfig(config: Partial<ChangeDetectionConfig>): AsyncResult<void>;
}

// ============================================================================
// Version Management Service
// ============================================================================

/**
 * Manages resource versions and ETags
 */
export interface IVersionManagementService {
  /** Get resource version info */
  getResourceVersion(resourceId: ResourceId): AsyncResult<ResourceVersion | null>;
  
  /** Update resource version */
  updateResourceVersion(resourceId: ResourceId, version: ResourceVersion): AsyncResult<void>;
  
  /** Compare versions */
  compareVersions(local: ResourceVersion, server: ResourceVersion): AsyncResult<{
    isEqual: boolean;
    localNewer: boolean;
    serverNewer: boolean;
    conflicted: boolean;
  }>;
  
  /** Get version history */
  getVersionHistory(resourceId: ResourceId, limit?: number): AsyncResult<ResourceVersion[]>;
  
  /** Create version snapshot */
  createSnapshot(resourceId: ResourceId, description: string): AsyncResult<string>;
  
  /** Restore from snapshot */
  restoreFromSnapshot(resourceId: ResourceId, snapshotId: string): AsyncResult<void>;
  
  /** Clean old versions */
  cleanOldVersions(options: {
    olderThan: Date;
    keepMinimum: number;
    resourceTypes?: string[];
  }): AsyncResult<{
    cleaned: number;
    spaceSaved: number;
  }>;
}

// ============================================================================
// Sync State Management Service
// ============================================================================

/**
 * Manages synchronization state for resources
 */
export interface ISyncStateService {
  /** Get sync metadata */
  getSyncMetadata(resourceId: ResourceId): AsyncResult<SyncMetadata | null>;
  
  /** Update sync state */
  updateSyncState(resourceId: ResourceId, state: ResourceSyncState): AsyncResult<void>;
  
  /** Update sync metadata */
  updateSyncMetadata(resourceId: ResourceId, metadata: Partial<SyncMetadata>): AsyncResult<void>;
  
  /** Get resources by sync state */
  getResourcesByState(state: ResourceSyncState): AsyncResult<ResourceId[]>;
  
  /** Get dirty resources */
  getDirtyResources(): AsyncResult<ResourceId[]>;
  
  /** Get stale resources */
  getStaleResources(): AsyncResult<ResourceId[]>;
  
  /** Get conflicted resources */
  getConflictedResources(): AsyncResult<ResourceId[]>;
  
  /** Mark resource as clean */
  markClean(resourceId: ResourceId): AsyncResult<void>;
  
  /** Mark resource as dirty */
  markDirty(resourceId: ResourceId, reason: string): AsyncResult<void>;
  
  /** Mark resource as stale */
  markStale(resourceId: ResourceId, serverVersion: ResourceVersion): AsyncResult<void>;
  
  /** Mark resource as conflicted */
  markConflicted(resourceId: ResourceId, conflicts: ConflictInfo[]): AsyncResult<void>;
  
  /** Get sync statistics */
  getSyncStats(): AsyncResult<{
    totalResources: number;
    clean: number;
    dirty: number;
    stale: number;
    conflicted: number;
    syncing: number;
    errors: number;
  }>;
}

// ============================================================================
// Conflict Resolution Service
// ============================================================================

/**
 * Handles conflict detection and resolution
 */
export interface IConflictResolutionService {
  /** Detect conflicts between versions */
  detectConflicts(
    resourceId: ResourceId,
    localVersion: any,
    serverVersion: any
  ): AsyncResult<ConflictInfo[]>;
  
  /** Resolve conflicts automatically */
  resolveConflictsAuto(
    resourceId: ResourceId,
    conflicts: ConflictInfo[],
    strategy: ConflictResolution
  ): AsyncResult<{
    resolved: ConflictInfo[];
    unresolved: ConflictInfo[];
    mergedContent: any;
  }>;
  
  /** Resolve conflicts manually */
  resolveConflictsManual(
    resourceId: ResourceId,
    resolutions: Array<{
      conflict: ConflictInfo;
      resolution: any;
    }>
  ): AsyncResult<{
    mergedContent: any;
    remainingConflicts: ConflictInfo[];
  }>;
  
  /** Get conflict resolution suggestions */
  getResolutionSuggestions(
    resourceId: ResourceId,
    conflicts: ConflictInfo[]
  ): AsyncResult<Array<{
    conflict: ConflictInfo;
    suggestions: Array<{
      strategy: ConflictResolution;
      confidence: number;
      description: string;
      preview: any;
    }>;
  }>>;
  
  /** Create merge preview */
  createMergePreview(
    resourceId: ResourceId,
    strategy: ConflictResolution
  ): AsyncResult<{
    mergedContent: any;
    conflicts: ConflictInfo[];
    warnings: string[];
  }>;
  
  /** Apply conflict resolution */
  applyResolution(
    resourceId: ResourceId,
    mergedContent: any
  ): AsyncResult<void>;
}

// ============================================================================
// Real-Time Updates Service
// ============================================================================

/**
 * Handles real-time updates via WebSocket/SSE
 */
export interface IRealTimeUpdatesService {
  /** Initialize real-time connection */
  initialize(endpoint: string, options?: {
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    heartbeatInterval?: number;
  }): AsyncResult<void>;
  
  /** Connect to real-time updates */
  connect(): AsyncResult<void>;
  
  /** Disconnect from real-time updates */
  disconnect(): AsyncResult<void>;
  
  /** Subscribe to repository updates */
  subscribeToRepository(repository: RepositoryIdentifier): AsyncResult<void>;
  
  /** Unsubscribe from repository updates */
  unsubscribeFromRepository(repository: RepositoryIdentifier): AsyncResult<void>;
  
  /** Subscribe to resource updates */
  subscribeToResource(resourceId: ResourceId): AsyncResult<void>;
  
  /** Unsubscribe from resource updates */
  unsubscribeFromResource(resourceId: ResourceId): AsyncResult<void>;
  
  /** Get connection status */
  getConnectionStatus(): AsyncResult<RealTimeConnectionStatus>;
  
  /** Subscribe to update events */
  onUpdate(callback: (event: RealTimeUpdateEvent) => void): void;
  
  /** Unsubscribe from update events */
  offUpdate(callback: (event: RealTimeUpdateEvent) => void): void;
  
  /** Send real-time event */
  sendEvent(event: Omit<RealTimeUpdateEvent, 'timestamp' | 'eventId'>): AsyncResult<void>;
}

// ============================================================================
// Collaborative Editing Service
// ============================================================================

/**
 * Manages collaborative editing sessions
 */
export interface ICollaborativeEditingService {
  /** Start collaborative session */
  startSession(repository: RepositoryIdentifier): AsyncResult<CollaborativeSession>;
  
  /** Join existing session */
  joinSession(sessionId: string): AsyncResult<CollaborativeSession>;
  
  /** Leave session */
  leaveSession(sessionId: string): AsyncResult<void>;
  
  /** Get active sessions */
  getActiveSessions(): AsyncResult<CollaborativeSession[]>;
  
  /** Get session info */
  getSession(sessionId: string): AsyncResult<CollaborativeSession | null>;
  
  /** Update editor presence */
  updatePresence(sessionId: string, currentResource?: ResourceId): AsyncResult<void>;
  
  /** Get active editors */
  getActiveEditors(sessionId: string): AsyncResult<ActiveEditor[]>;
  
  /** Broadcast change to session */
  broadcastChange(sessionId: string, change: {
    resourceId: ResourceId;
    changeType: string;
    data: any;
  }): AsyncResult<void>;
  
  /** Subscribe to session events */
  onSessionEvent(callback: (event: {
    type: 'editor-joined' | 'editor-left' | 'resource-changed' | 'session-ended';
    sessionId: string;
    data: any;
  }) => void): void;
  
  /** Lock resource for editing */
  lockResource(sessionId: string, resourceId: ResourceId): AsyncResult<{
    locked: boolean;
    lockedBy?: string;
    lockExpires?: Date;
  }>;
  
  /** Unlock resource */
  unlockResource(sessionId: string, resourceId: ResourceId): AsyncResult<void>;
}

// ============================================================================
// Synchronization Orchestrator
// ============================================================================

/**
 * High-level synchronization orchestration
 */
export interface ISynchronizationOrchestrator {
  /** Initialize synchronization */
  initialize(config: SyncStrategyConfig): AsyncResult<void>;
  
  /** Start automatic synchronization */
  startAutoSync(): AsyncResult<void>;
  
  /** Stop automatic synchronization */
  stopAutoSync(): AsyncResult<void>;
  
  /** Perform manual sync operation */
  sync(request: SyncOperationRequest): AsyncResult<SyncOperationResult>;
  
  /** Perform batch synchronization */
  batchSync(request: BatchSyncRequest): AsyncResult<SyncOperationResult>;
  
  /** Force full repository sync */
  fullRepositorySync(repository: RepositoryIdentifier): AsyncResult<SyncOperationResult>;
  
  /** Get sync status */
  getSyncStatus(): AsyncResult<{
    isAutoSyncActive: boolean;
    lastSyncAt: Date;
    nextSyncAt: Date;
    pendingOperations: number;
    activeOperations: number;
    errorCount: number;
  }>;
  
  /** Subscribe to sync progress */
  onSyncProgress(callback: (progress: SyncProgress) => void): void;
  
  /** Subscribe to sync completion */
  onSyncComplete(callback: (result: SyncOperationResult) => void): void;
  
  /** Subscribe to sync errors */
  onSyncError(callback: (error: {
    resourceId: ResourceId;
    error: string;
    recoverable: boolean;
  }) => void): void;
  
  /** Pause synchronization */
  pauseSync(): AsyncResult<void>;
  
  /** Resume synchronization */
  resumeSync(): AsyncResult<void>;
  
  /** Update sync configuration */
  updateConfig(config: Partial<SyncStrategyConfig>): AsyncResult<void>;
}

// ============================================================================
// Door43 API Integration Service
// ============================================================================

/**
 * Integrates with Door43 API for change detection and synchronization
 */
export interface IDoor43SyncService {
  /** Get repository commit history */
  getCommitHistory(
    repository: RepositoryIdentifier,
    since?: Date,
    limit?: number
  ): AsyncResult<Array<{
    hash: string;
    message: string;
    author: string;
    timestamp: Date;
    files: string[];
  }>>;
  
  /** Get file history */
  getFileHistory(
    repository: RepositoryIdentifier,
    filePath: string,
    limit?: number
  ): AsyncResult<Array<{
    hash: string;
    message: string;
    author: string;
    timestamp: Date;
    changes: 'added' | 'modified' | 'deleted' | 'renamed';
  }>>;
  
  /** Get repository branches/tags */
  getBranchesAndTags(repository: RepositoryIdentifier): AsyncResult<{
    branches: Array<{
      name: string;
      lastCommit: string;
      lastModified: Date;
    }>;
    tags: Array<{
      name: string;
      commit: string;
      createdAt: Date;
    }>;
  }>;
  
  /** Check if file exists and get metadata */
  checkFileExists(
    repository: RepositoryIdentifier,
    filePath: string
  ): AsyncResult<{
    exists: boolean;
    size?: number;
    lastModified?: Date;
    etag?: string;
    contentHash?: string;
  }>;
  
  /** Get file content with version info */
  getFileWithVersion(
    repository: RepositoryIdentifier,
    filePath: string
  ): AsyncResult<{
    content: string;
    version: ResourceVersion;
    metadata: any;
  }>;
  
  /** Push file changes */
  pushFileChanges(
    repository: RepositoryIdentifier,
    filePath: string,
    content: string,
    message: string,
    options?: {
      branch?: string;
      createBranch?: boolean;
      expectedHash?: string;
    }
  ): AsyncResult<{
    success: boolean;
    newHash: string;
    conflicts?: string[];
  }>;
  
  /** Create pull request */
  createPullRequest(
    repository: RepositoryIdentifier,
    options: {
      title: string;
      description: string;
      sourceBranch: string;
      targetBranch: string;
      changes: Array<{
        filePath: string;
        content: string;
      }>;
    }
  ): AsyncResult<{
    pullRequestId: string;
    url: string;
  }>;
  
  /** Setup webhook for repository */
  setupWebhook(
    repository: RepositoryIdentifier,
    webhookUrl: string,
    events: string[]
  ): AsyncResult<{
    webhookId: string;
    secret: string;
  }>;
  
  /** Handle webhook event */
  handleWebhookEvent(payload: any, signature: string): AsyncResult<RealTimeUpdateEvent[]>;
}

// ============================================================================
// Unified Sync Manager
// ============================================================================

/**
 * Unified synchronization manager
 */
export interface ISyncManager {
  /** Initialize sync manager */
  initialize(config: {
    changeDetection: ChangeDetectionConfig;
    syncStrategy: SyncStrategyConfig;
    realTimeEndpoint?: string;
    door43ApiConfig?: any;
  }): AsyncResult<void>;
  
  /** Add repository for synchronization */
  addRepository(repository: RepositoryIdentifier): AsyncResult<void>;
  
  /** Remove repository from synchronization */
  removeRepository(repository: RepositoryIdentifier): AsyncResult<void>;
  
  /** Get all managed repositories */
  getManagedRepositories(): AsyncResult<RepositoryIdentifier[]>;
  
  /** Start collaborative session */
  startCollaboration(repository: RepositoryIdentifier): AsyncResult<string>; // Returns session ID
  
  /** Stop collaborative session */
  stopCollaboration(sessionId: string): AsyncResult<void>;
  
  /** Get comprehensive sync status */
  getComprehensiveStatus(): AsyncResult<{
    repositories: Array<{
      repository: RepositoryIdentifier;
      resourceCount: number;
      syncState: {
        clean: number;
        dirty: number;
        stale: number;
        conflicted: number;
      };
      lastSync: Date;
      collaborators: number;
    }>;
    realTimeConnection: RealTimeConnectionStatus;
    autoSyncActive: boolean;
    pendingOperations: number;
  }>;
  
  /** Shutdown sync manager */
  shutdown(): AsyncResult<void>;
}
