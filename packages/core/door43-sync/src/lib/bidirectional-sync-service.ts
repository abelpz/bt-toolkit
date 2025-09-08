/**
 * Bidirectional Sync Service
 * Handles syncing processed JSON back to Door43 in original formats
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import { IStorageBackend } from '@bt-toolkit/door43-storage';
import { 
  Door43ApiService, 
  Door43ResourceMetadata, 
  SyncRequest, 
  SyncResult,
  SyncOperation 
} from './door43-api-service.js';
import { 
  FormatConversionService,
  globalFormatConversionService,
  ResourceFormat,
  registerBuiltInAdapters
} from './adapters/index.js';

// ============================================================================
// Bidirectional Sync Types
// ============================================================================

/**
 * Processed resource data
 */
export interface ProcessedResource {
  /** Resource identifier */
  resourceId: string;
  /** Processed JSON content */
  processedContent: string;
  /** Original format */
  originalFormat: ResourceFormat;
  /** Resource type */
  resourceType: string;
  /** Door43 metadata */
  door43Metadata: Door43ResourceMetadata;
  /** Last modified timestamp */
  lastModified: Date;
  /** Version/ETag */
  version?: string;
}

/**
 * Sync back request
 */
export interface SyncBackRequest {
  /** Resource to sync back */
  resource: ProcessedResource;
  /** Sync operation */
  operation: SyncOperation;
  /** Commit message */
  commitMessage: string;
  /** Author information */
  author?: {
    name: string;
    email: string;
  };
  /** Force sync even if no changes detected */
  force?: boolean;
}

/**
 * Sync back result
 */
export interface SyncBackResult {
  /** Operation success */
  success: boolean;
  /** Resource ID */
  resourceId: string;
  /** Operation performed */
  operation: SyncOperation;
  /** New version/ETag */
  newVersion?: string;
  /** Commit SHA */
  commitSha?: string;
  /** Conversion warnings */
  warnings?: string[];
  /** Error message if failed */
  error?: string;
  /** Processing statistics */
  stats?: {
    conversionTime: number;
    uploadTime: number;
    totalTime: number;
  };
}

/**
 * Batch sync request
 */
export interface BatchSyncRequest {
  /** Resources to sync */
  resources: SyncBackRequest[];
  /** Batch commit message */
  batchCommitMessage?: string;
  /** Continue on individual failures */
  continueOnError?: boolean;
}

/**
 * Batch sync result
 */
export interface BatchSyncResult {
  /** Overall success */
  success: boolean;
  /** Individual results */
  results: SyncBackResult[];
  /** Summary statistics */
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  /** Batch processing time */
  totalTime: number;
}

// ============================================================================
// Bidirectional Sync Service
// ============================================================================

/**
 * Bidirectional Sync Service
 * Handles syncing processed JSON back to Door43 in original formats
 */
export class BidirectionalSyncService {
  private door43Api: Door43ApiService;
  private formatConverter: FormatConversionService;
  private storageBackend: IStorageBackend;

  constructor(
    storageBackend: IStorageBackend,
    door43Api: Door43ApiService,
    formatConverter?: FormatConversionService
  ) {
    this.storageBackend = storageBackend;
    this.door43Api = door43Api;
    this.formatConverter = formatConverter || globalFormatConversionService;
    
    // Ensure built-in adapters are registered
    registerBuiltInAdapters();
    console.log('🔧 Bidirectional sync service initialized with enhanced adapters');
  }

  /**
   * Sync a single resource back to Door43
   */
  async syncBack(request: SyncBackRequest): AsyncResult<SyncBackResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Syncing back ${request.resource.resourceId} as ${request.operation}`);
      
      // Convert JSON back to original format
      const conversionStartTime = Date.now();
      const conversionResult = await this.formatConverter.fromJson(
        request.resource.processedContent,
        request.resource.originalFormat,
        request.resource.resourceType
      );
      
      if (!conversionResult.success) {
        return {
          success: false,
          error: `Format conversion failed: ${conversionResult.error}`
        };
      }
      
      const conversionTime = Date.now() - conversionStartTime;
      const originalContent = conversionResult.data!.content;
      
      // Check if resource has actually changed (unless forced)
      if (!request.force && request.operation === 'update') {
        const hasChanges = await this.detectChanges(request.resource, originalContent);
        if (!hasChanges) {
          console.log(`⏭️ No changes detected for ${request.resource.resourceId}, skipping sync`);
          return {
            success: true,
            data: {
              success: true,
              resourceId: request.resource.resourceId,
              operation: 'update',
              stats: {
                conversionTime,
                uploadTime: 0,
                totalTime: Date.now() - startTime
              }
            }
          };
        }
      }
      
      // Sync to Door43 with enhanced options
      const uploadStartTime = Date.now();
      const syncRequest: SyncRequest = {
        operation: request.operation,
        metadata: request.resource.door43Metadata,
        content: originalContent,
        commitMessage: request.commitMessage,
        author: request.author,
        // Enable automatic diff patch for large files
        patchThreshold: 1024 * 1024 // 1MB threshold
      };
      
      const syncResult = await this.door43Api.syncResource(syncRequest);
      
      if (!syncResult.success) {
        return {
          success: false,
          error: `Door43 sync failed: ${syncResult.error}`
        };
      }
      
      const uploadTime = Date.now() - uploadStartTime;
      
      // Update local version tracking
      if (syncResult.data?.commitSha) {
        await this.updateVersionTracking(
          request.resource.resourceId,
          syncResult.data.commitSha,
          syncResult.data.etag
        );
      }
      
      const result: SyncBackResult = {
        success: true,
        resourceId: request.resource.resourceId,
        operation: request.operation,
        newVersion: syncResult.data?.etag,
        commitSha: syncResult.data?.commitSha,
        warnings: conversionResult.data?.warnings,
        stats: {
          conversionTime,
          uploadTime,
          totalTime: Date.now() - startTime
        }
      };
      
      console.log(`✅ Sync back completed for ${request.resource.resourceId}`);
      return { success: true, data: result };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync back failed';
      console.error(`❌ Sync back error for ${request.resource.resourceId}:`, errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Sync multiple resources back to Door43
   */
  async syncBackBatch(request: BatchSyncRequest): AsyncResult<BatchSyncResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Starting batch sync of ${request.resources.length} resources`);
      
      const results: SyncBackResult[] = [];
      let successful = 0;
      let failed = 0;
      let skipped = 0;
      
      for (const resourceRequest of request.resources) {
        try {
          const result = await this.syncBack(resourceRequest);
          
          if (result.success && result.data) {
            results.push(result.data);
            if (result.data.operation === 'update' && !result.data.commitSha) {
              skipped++;
            } else {
              successful++;
            }
          } else {
            results.push({
              success: false,
              resourceId: resourceRequest.resource.resourceId,
              operation: resourceRequest.operation,
              error: result.error
            });
            failed++;
            
            // Stop on error if not configured to continue
            if (!request.continueOnError) {
              console.log('⏹️ Stopping batch sync due to error');
              break;
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            success: false,
            resourceId: resourceRequest.resource.resourceId,
            operation: resourceRequest.operation,
            error: errorMessage
          });
          failed++;
          
          if (!request.continueOnError) {
            break;
          }
        }
      }
      
      const batchResult: BatchSyncResult = {
        success: failed === 0,
        results,
        summary: {
          total: request.resources.length,
          successful,
          failed,
          skipped
        },
        totalTime: Date.now() - startTime
      };
      
      console.log(`✅ Batch sync completed: ${successful} successful, ${failed} failed, ${skipped} skipped`);
      return { success: true, data: batchResult };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch sync failed';
      console.error(`❌ Batch sync error:`, errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get sync status for a resource
   */
  async getSyncStatus(resourceId: string): AsyncResult<{
    lastSynced?: Date;
    version?: string;
    hasLocalChanges: boolean;
    needsSync: boolean;
  }> {
    try {
      const versionResult = await this.storageBackend.get(`sync-version:${resourceId}`);
      const lastSynced = versionResult.data?.lastSynced ? new Date(versionResult.data.lastSynced) : undefined;
      const version = versionResult.data?.version;
      
      // Check for local changes (simplified - in real implementation would compare content)
      const hasLocalChanges = await this.hasLocalChanges(resourceId);
      const needsSync = hasLocalChanges || !lastSynced;
      
      return {
        success: true,
        data: {
          lastSynced,
          version,
          hasLocalChanges,
          needsSync
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync status'
      };
    }
  }

  /**
   * List resources that need syncing
   */
  async getResourcesNeedingSync(): AsyncResult<string[]> {
    try {
      // In a real implementation, this would query the storage for resources with changes
      const keysResult = await this.storageBackend.keys('processed-resource:');
      
      if (!keysResult.success || !keysResult.data) {
        return { success: true, data: [] };
      }
      
      const resourceIds: string[] = [];
      
      for (const key of keysResult.data) {
        const resourceId = key.replace('processed-resource:', '');
        const statusResult = await this.getSyncStatus(resourceId);
        
        if (statusResult.success && statusResult.data?.needsSync) {
          resourceIds.push(resourceId);
        }
      }
      
      return { success: true, data: resourceIds };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get resources needing sync'
      };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Detect if resource has changes compared to last sync
   */
  private async detectChanges(resource: ProcessedResource, newContent: string): Promise<boolean> {
    try {
      const lastSyncResult = await this.storageBackend.get(`sync-content:${resource.resourceId}`);
      
      if (!lastSyncResult.success || !lastSyncResult.data) {
        return true; // No previous sync, consider as changed
      }
      
      const lastContent = lastSyncResult.data.content;
      return lastContent !== newContent;
    } catch (error) {
      console.warn(`Failed to detect changes for ${resource.resourceId}:`, error);
      return true; // Assume changed on error
    }
  }

  /**
   * Update version tracking after successful sync
   */
  private async updateVersionTracking(
    resourceId: string,
    commitSha: string,
    etag?: string
  ): Promise<void> {
    try {
      await this.storageBackend.set(`sync-version:${resourceId}`, {
        lastSynced: new Date().toISOString(),
        commitSha,
        version: etag,
        resourceId
      });
    } catch (error) {
      console.warn(`Failed to update version tracking for ${resourceId}:`, error);
    }
  }

  /**
   * Check if resource has local changes
   */
  private async hasLocalChanges(resourceId: string): Promise<boolean> {
    try {
      const resourceResult = await this.storageBackend.get(`processed-resource:${resourceId}`);
      const versionResult = await this.storageBackend.get(`sync-version:${resourceId}`);
      
      if (!resourceResult.success || !resourceResult.data) {
        return false; // No resource, no changes
      }
      
      if (!versionResult.success || !versionResult.data) {
        return true; // No sync record, consider as changed
      }
      
      const resourceModified = new Date(resourceResult.data.lastModified);
      const lastSynced = new Date(versionResult.data.lastSynced);
      
      return resourceModified > lastSynced;
    } catch (error) {
      console.warn(`Failed to check local changes for ${resourceId}:`, error);
      return true; // Assume changed on error
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create bidirectional sync service
 */
export function createBidirectionalSyncService(
  storageBackend: IStorageBackend,
  door43Api: Door43ApiService,
  formatConverter?: FormatConversionService
): BidirectionalSyncService {
  return new BidirectionalSyncService(storageBackend, door43Api, formatConverter);
}
