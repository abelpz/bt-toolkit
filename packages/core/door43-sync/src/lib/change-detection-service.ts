/**
 * Change Detection Service
 * Detects and tracks changes in resources for synchronization
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import { IStorageBackend } from '@bt-toolkit/door43-storage';

// ============================================================================
// Change Detection Types
// ============================================================================

/**
 * Resource change types
 */
export type ChangeType = 
  | 'created'     // Resource was created
  | 'updated'     // Resource content/metadata was updated
  | 'deleted'     // Resource was deleted
  | 'moved'       // Resource was moved/renamed
  | 'restored';   // Resource was restored from deletion

/**
 * Change operation details
 */
export interface ChangeOperation {
  /** Type of change */
  type: ChangeType;
  /** Resource ID affected */
  resourceId: string;
  /** Field/property that changed (for updates) */
  field?: string;
  /** Old value (for updates/deletes) */
  oldValue?: any;
  /** New value (for creates/updates) */
  newValue?: any;
  /** Change timestamp */
  timestamp: Date;
  /** User/system that made the change */
  changedBy: string;
  /** Change context/reason */
  context?: string;
  /** Checksum of the change for integrity */
  checksum: string;
}

/**
 * Resource version information
 */
export interface ResourceVersion {
  /** Resource ID */
  resourceId: string;
  /** Version number (incremental) */
  version: number;
  /** Content hash */
  contentHash: string;
  /** Metadata hash */
  metadataHash: string;
  /** Last modified timestamp */
  lastModified: Date;
  /** Last modified by */
  modifiedBy: string;
  /** Server timestamp (for remote resources) */
  serverTimestamp?: Date;
  /** ETag from server (for HTTP-based resources) */
  etag?: string;
  /** Revision ID from server */
  revisionId?: string;
}

/**
 * Change detection result
 */
export interface ChangeDetectionResult {
  /** Resource ID */
  resourceId: string;
  /** Whether resource has changed */
  hasChanged: boolean;
  /** Type of change detected */
  changeType?: ChangeType;
  /** Local version */
  localVersion: ResourceVersion;
  /** Remote version (if available) */
  remoteVersion?: ResourceVersion;
  /** Specific changes detected */
  changes: ChangeOperation[];
  /** Conflict detected */
  hasConflict: boolean;
  /** Conflict details */
  conflictInfo?: ConflictInfo;
}

/**
 * Conflict information
 */
export interface ConflictInfo {
  /** Type of conflict */
  type: 'content' | 'metadata' | 'version' | 'concurrent';
  /** Conflicting changes */
  conflictingChanges: ChangeOperation[];
  /** Resolution strategy suggestions */
  resolutionStrategies: ConflictResolutionStrategy[];
  /** Automatic resolution possible */
  autoResolvable: boolean;
}

/**
 * Conflict resolution strategies
 */
export type ConflictResolutionStrategy = 
  | 'local-wins'      // Keep local changes
  | 'remote-wins'     // Accept remote changes
  | 'merge'           // Attempt automatic merge
  | 'manual'          // Require manual resolution
  | 'create-branch';  // Create branch for conflicting changes

/**
 * Change tracking configuration
 */
export interface ChangeTrackingConfig {
  /** Enable change tracking */
  enabled: boolean;
  /** Track content changes */
  trackContent: boolean;
  /** Track metadata changes */
  trackMetadata: boolean;
  /** Maximum change history to keep */
  maxHistorySize: number;
  /** Change detection interval (ms) */
  detectionInterval?: number;
  /** Batch change operations */
  batchChanges: boolean;
  /** Compress change history */
  compressHistory: boolean;
}

// ============================================================================
// Change Detection Service Implementation
// ============================================================================

/**
 * Change detection service tracks resource modifications
 */
export class ChangeDetectionService {
  private storageBackend: IStorageBackend;
  private config: ChangeTrackingConfig;
  private versionCache = new Map<string, ResourceVersion>();
  private changeHistory = new Map<string, ChangeOperation[]>();
  private detectionTimer?: NodeJS.Timeout;

  constructor(
    storageBackend: IStorageBackend,
    config: ChangeTrackingConfig = {
      enabled: true,
      trackContent: true,
      trackMetadata: true,
      maxHistorySize: 1000,
      batchChanges: true,
      compressHistory: false
    }
  ) {
    this.storageBackend = storageBackend;
    this.config = config;
  }

  /**
   * Initialize change detection service
   */
  async initialize(): AsyncResult<void> {
    try {
      if (!this.config.enabled) {
        console.log('📊 Change detection disabled');
        return { success: true, data: undefined };
      }

      // Load existing version cache
      const versionCacheResult = await this.storageBackend.get<Map<string, ResourceVersion>>('change-detection:version-cache');
      if (versionCacheResult.success && versionCacheResult.data) {
        this.versionCache = new Map(Object.entries(versionCacheResult.data));
      }

      // Load change history
      const historyResult = await this.storageBackend.get<Map<string, ChangeOperation[]>>('change-detection:change-history');
      if (historyResult.success && historyResult.data) {
        this.changeHistory = new Map(Object.entries(historyResult.data));
      }

      // Start periodic detection if configured
      if (this.config.detectionInterval) {
        this.detectionTimer = setInterval(
          () => this.performPeriodicDetection(),
          this.config.detectionInterval
        );
      }

      console.log('📊 Change detection service initialized');
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize change detection service'
      };
    }
  }

  /**
   * Record a resource version
   */
  async recordVersion(
    resourceId: string,
    contentHash: string,
    metadataHash: string,
    modifiedBy: string = 'system',
    serverInfo?: {
      serverTimestamp?: Date;
      etag?: string;
      revisionId?: string;
    }
  ): AsyncResult<ResourceVersion> {
    try {
      const existingVersion = this.versionCache.get(resourceId);
      const version = existingVersion ? existingVersion.version + 1 : 1;

      const resourceVersion: ResourceVersion = {
        resourceId,
        version,
        contentHash,
        metadataHash,
        lastModified: new Date(),
        modifiedBy,
        serverTimestamp: serverInfo?.serverTimestamp,
        etag: serverInfo?.etag,
        revisionId: serverInfo?.revisionId
      };

      // Update version cache
      this.versionCache.set(resourceId, resourceVersion);

      // Persist version cache
      await this.persistVersionCache();

      console.log(`📝 Recorded version ${version} for ${resourceId}`);

      return { success: true, data: resourceVersion };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record version'
      };
    }
  }

  /**
   * Record a change operation
   */
  async recordChange(change: ChangeOperation): AsyncResult<void> {
    try {
      if (!this.config.enabled) {
        return { success: true, data: undefined };
      }

      // Get existing change history
      const history = this.changeHistory.get(change.resourceId) || [];

      // Add new change
      history.push(change);

      // Trim history if needed
      if (history.length > this.config.maxHistorySize) {
        history.splice(0, history.length - this.config.maxHistorySize);
      }

      // Update change history
      this.changeHistory.set(change.resourceId, history);

      // Persist change history
      await this.persistChangeHistory();

      console.log(`📝 Recorded ${change.type} change for ${change.resourceId}`);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record change'
      };
    }
  }

  /**
   * Detect changes for a specific resource
   */
  async detectChanges(
    resourceId: string,
    currentContentHash: string,
    currentMetadataHash: string,
    remoteVersion?: ResourceVersion
  ): AsyncResult<ChangeDetectionResult> {
    try {
      const localVersion = this.versionCache.get(resourceId);
      const changes: ChangeOperation[] = [];
      let hasChanged = false;
      let changeType: ChangeType | undefined;
      let hasConflict = false;
      let conflictInfo: ConflictInfo | undefined;

      // If no local version exists, this is a new resource
      if (!localVersion) {
        hasChanged = true;
        changeType = 'created';
      } else {
        // Check for content changes
        if (this.config.trackContent && localVersion.contentHash !== currentContentHash) {
          hasChanged = true;
          changeType = 'updated';
          changes.push({
            type: 'updated',
            resourceId,
            field: 'content',
            oldValue: localVersion.contentHash,
            newValue: currentContentHash,
            timestamp: new Date(),
            changedBy: 'system',
            checksum: this.calculateChecksum(`${resourceId}:content:${currentContentHash}`)
          });
        }

        // Check for metadata changes
        if (this.config.trackMetadata && localVersion.metadataHash !== currentMetadataHash) {
          hasChanged = true;
          changeType = changeType || 'updated';
          changes.push({
            type: 'updated',
            resourceId,
            field: 'metadata',
            oldValue: localVersion.metadataHash,
            newValue: currentMetadataHash,
            timestamp: new Date(),
            changedBy: 'system',
            checksum: this.calculateChecksum(`${resourceId}:metadata:${currentMetadataHash}`)
          });
        }
      }

      // Check for conflicts with remote version
      if (remoteVersion && localVersion) {
        hasConflict = this.detectConflict(localVersion, remoteVersion);
        if (hasConflict) {
          conflictInfo = this.analyzeConflict(localVersion, remoteVersion, changes);
        }
      }

      const result: ChangeDetectionResult = {
        resourceId,
        hasChanged,
        changeType,
        localVersion: localVersion || {
          resourceId,
          version: 0,
          contentHash: currentContentHash,
          metadataHash: currentMetadataHash,
          lastModified: new Date(),
          modifiedBy: 'system'
        },
        remoteVersion,
        changes,
        hasConflict,
        conflictInfo
      };

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to detect changes'
      };
    }
  }

  /**
   * Get change history for a resource
   */
  async getChangeHistory(resourceId: string, limit?: number): AsyncResult<ChangeOperation[]> {
    try {
      const history = this.changeHistory.get(resourceId) || [];
      const result = limit ? history.slice(-limit) : history;
      
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get change history'
      };
    }
  }

  /**
   * Get resource version
   */
  async getResourceVersion(resourceId: string): AsyncResult<ResourceVersion | null> {
    try {
      const version = this.versionCache.get(resourceId) || null;
      return { success: true, data: version };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get resource version'
      };
    }
  }

  /**
   * Clear change history for a resource
   */
  async clearChangeHistory(resourceId: string): AsyncResult<void> {
    try {
      this.changeHistory.delete(resourceId);
      await this.persistChangeHistory();
      
      console.log(`🗑️ Cleared change history for ${resourceId}`);
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear change history'
      };
    }
  }

  /**
   * Get change detection statistics
   */
  async getStatistics(): AsyncResult<{
    totalResources: number;
    totalChanges: number;
    changesByType: Record<ChangeType, number>;
    averageChangesPerResource: number;
    oldestChange?: Date;
    newestChange?: Date;
  }> {
    try {
      let totalChanges = 0;
      const changesByType: Record<ChangeType, number> = {
        created: 0,
        updated: 0,
        deleted: 0,
        moved: 0,
        restored: 0
      };
      let oldestChange: Date | undefined;
      let newestChange: Date | undefined;

      // Analyze change history
      for (const [, changes] of this.changeHistory) {
        totalChanges += changes.length;
        
        for (const change of changes) {
          changesByType[change.type]++;
          
          if (!oldestChange || change.timestamp < oldestChange) {
            oldestChange = change.timestamp;
          }
          
          if (!newestChange || change.timestamp > newestChange) {
            newestChange = change.timestamp;
          }
        }
      }

      const stats = {
        totalResources: this.versionCache.size,
        totalChanges,
        changesByType,
        averageChangesPerResource: this.versionCache.size > 0 ? totalChanges / this.versionCache.size : 0,
        oldestChange,
        newestChange
      };

      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get statistics'
      };
    }
  }

  /**
   * Shutdown change detection service
   */
  async shutdown(): AsyncResult<void> {
    try {
      // Clear detection timer
      if (this.detectionTimer) {
        clearInterval(this.detectionTimer);
        this.detectionTimer = undefined;
      }

      // Persist final state
      await this.persistVersionCache();
      await this.persistChangeHistory();

      console.log('📊 Change detection service shutdown');
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to shutdown change detection service'
      };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async performPeriodicDetection(): Promise<void> {
    try {
      console.log('🔍 Performing periodic change detection...');
      // This would scan for changes in resources
      // Implementation would depend on the specific use case
    } catch (error) {
      console.error('❌ Periodic detection failed:', error);
    }
  }

  private detectConflict(localVersion: ResourceVersion, remoteVersion: ResourceVersion): boolean {
    // Check for concurrent modifications
    if (localVersion.version !== remoteVersion.version) {
      return true;
    }

    // Check for hash mismatches
    if (localVersion.contentHash !== remoteVersion.contentHash ||
        localVersion.metadataHash !== remoteVersion.metadataHash) {
      return true;
    }

    // Check for timestamp conflicts
    if (localVersion.lastModified && remoteVersion.serverTimestamp) {
      const timeDiff = Math.abs(localVersion.lastModified.getTime() - remoteVersion.serverTimestamp.getTime());
      // Consider conflict if modifications are within 1 second but hashes differ
      if (timeDiff < 1000 && localVersion.contentHash !== remoteVersion.contentHash) {
        return true;
      }
    }

    return false;
  }

  private analyzeConflict(
    localVersion: ResourceVersion,
    remoteVersion: ResourceVersion,
    changes: ChangeOperation[]
  ): ConflictInfo {
    const conflictType: ConflictInfo['type'] = 
      localVersion.contentHash !== remoteVersion.contentHash ? 'content' :
      localVersion.metadataHash !== remoteVersion.metadataHash ? 'metadata' :
      localVersion.version !== remoteVersion.version ? 'version' : 'concurrent';

    const resolutionStrategies: ConflictResolutionStrategy[] = [];
    let autoResolvable = false;

    // Determine resolution strategies based on conflict type
    switch (conflictType) {
      case 'content':
        resolutionStrategies.push('local-wins', 'remote-wins', 'merge', 'manual');
        // Auto-resolvable if changes are in different fields
        autoResolvable = this.canAutoMergeContent(changes);
        break;
      
      case 'metadata':
        resolutionStrategies.push('local-wins', 'remote-wins', 'merge');
        autoResolvable = true; // Metadata conflicts are usually auto-resolvable
        break;
      
      case 'version':
        resolutionStrategies.push('remote-wins', 'create-branch');
        autoResolvable = false;
        break;
      
      case 'concurrent':
        resolutionStrategies.push('manual', 'create-branch');
        autoResolvable = false;
        break;
    }

    return {
      type: conflictType,
      conflictingChanges: changes,
      resolutionStrategies,
      autoResolvable
    };
  }

  private canAutoMergeContent(changes: ChangeOperation[]): boolean {
    // Simple heuristic: if changes are in different fields, they can be auto-merged
    const fields = new Set(changes.map(c => c.field).filter(Boolean));
    return fields.size === changes.length;
  }

  private calculateChecksum(data: string): string {
    // Simple checksum calculation - in production would use crypto
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `chk_${Math.abs(hash).toString(16)}`;
  }

  private async persistVersionCache(): Promise<void> {
    try {
      const cacheData = Object.fromEntries(this.versionCache.entries());
      await this.storageBackend.set('change-detection:version-cache', cacheData, {
        tags: ['change-detection', 'version-cache']
      });
    } catch (error) {
      console.error('❌ Failed to persist version cache:', error);
    }
  }

  private async persistChangeHistory(): Promise<void> {
    try {
      const historyData = Object.fromEntries(this.changeHistory.entries());
      await this.storageBackend.set('change-detection:change-history', historyData, {
        tags: ['change-detection', 'change-history'],
        compress: this.config.compressHistory
      });
    } catch (error) {
      console.error('❌ Failed to persist change history:', error);
    }
  }
}
