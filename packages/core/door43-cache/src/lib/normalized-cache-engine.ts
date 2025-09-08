/**
 * Normalized Cache Engine
 * Main orchestrator for the normalized cache system
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import { IStorageBackend } from '@bt-toolkit/door43-storage';
import { ResourceRegistry, ResourceId, ResourceMetadata, NormalizedResourceType } from './resource-registry.js';
import { ContentStore, NormalizedContent, ContentEntry } from './content-store.js';
import { CrossReferenceSystem, CrossReference, TraversalOptions, TraversalResult } from './cross-reference-system.js';

// ============================================================================
// Cache Engine Types
// ============================================================================

/**
 * Cache engine configuration
 */
export interface CacheEngineConfig {
  /** Storage backend */
  storageBackend: IStorageBackend;
  /** Enable content compression */
  compression?: boolean;
  /** Enable content encryption */
  encryption?: boolean;
  /** Cache optimization settings */
  optimization?: {
    /** Auto-optimize interval in ms */
    autoOptimizeInterval?: number;
    /** Maximum cache size in bytes */
    maxCacheSize?: number;
    /** LRU eviction enabled */
    lruEviction?: boolean;
  };
  /** Cross-reference settings */
  crossReference?: {
    /** Auto-build cross-references from content */
    autoBuild?: boolean;
    /** Maximum traversal depth */
    maxTraversalDepth?: number;
  };
}

/**
 * Cache operation result
 */
export interface CacheOperationResult<T = any> {
  /** Operation success */
  success: boolean;
  /** Result data */
  data?: T;
  /** Error message */
  error?: string;
  /** Operation metadata */
  metadata?: {
    /** Execution time in ms */
    executionTimeMs: number;
    /** Cache hit/miss */
    cacheHit?: boolean;
    /** Resources affected */
    resourcesAffected?: number;
  };
}

/**
 * Resource query options
 */
export interface ResourceQueryOptions {
  /** Resource types to include */
  types?: NormalizedResourceType[];
  /** Book filter */
  book?: string;
  /** Chapter filter */
  chapter?: number;
  /** Verse filter */
  verse?: number;
  /** Language filter */
  language?: string;
  /** Include content in results */
  includeContent?: boolean;
  /** Include cross-references */
  includeCrossReferences?: boolean;
  /** Maximum results */
  limit?: number;
  /** Sort order */
  sortBy?: 'id' | 'type' | 'lastAccessed' | 'createdAt';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Resource with optional content and cross-references
 */
export interface EnrichedResource {
  /** Resource metadata */
  metadata: ResourceMetadata;
  /** Resource content (if requested) */
  content?: NormalizedContent;
  /** Outgoing cross-references (if requested) */
  outgoingReferences?: CrossReference[];
  /** Incoming cross-references (if requested) */
  incomingReferences?: CrossReference[];
}

/**
 * Batch operation request
 */
export interface BatchOperationRequest {
  /** Operation type */
  type: 'store' | 'get' | 'delete' | 'update';
  /** Resource ID */
  resourceId: ResourceId;
  /** Resource metadata (for store/update) */
  metadata?: ResourceMetadata;
  /** Resource content (for store/update) */
  content?: NormalizedContent;
  /** Update data (for update) */
  updates?: Partial<ResourceMetadata>;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  /** Resource registry stats */
  registry: {
    totalResources: number;
    resourcesByType: Record<string, number>;
    resourcesByRepository: Record<string, number>;
    averageReferencesPerResource: number;
  };
  /** Content store stats */
  content: {
    totalContent: number;
    totalSize: number;
    contentByType: Record<string, number>;
    averageSize: number;
    compressionRatio: number;
  };
  /** Cross-reference stats */
  crossReferences: {
    totalReferences: number;
    referencesByType: Record<string, number>;
    averageReferencesPerResource: number;
    strongestConnections: Array<{ fromId: ResourceId; toId: ResourceId; strength: number }>;
  };
  /** Performance stats */
  performance: {
    cacheHitRate: number;
    averageQueryTime: number;
    totalQueries: number;
    lastOptimization?: Date;
  };
}

// ============================================================================
// Normalized Cache Engine Implementation
// ============================================================================

/**
 * Normalized cache engine orchestrates resource registry, content store, and cross-references
 */
export class NormalizedCacheEngine {
  private config: CacheEngineConfig;
  private registry: ResourceRegistry;
  private contentStore: ContentStore;
  private crossRefSystem: CrossReferenceSystem;
  private initialized = false;
  
  // Performance tracking
  private queryCount = 0;
  private totalQueryTime = 0;
  private cacheHits = 0;
  private optimizationTimer?: NodeJS.Timeout;

  constructor(config: CacheEngineConfig) {
    this.config = config;
    this.registry = new ResourceRegistry();
    this.contentStore = new ContentStore(config.storageBackend, {
      compression: config.compression,
      encryption: config.encryption
    });
    this.crossRefSystem = new CrossReferenceSystem(config.storageBackend);
  }

  /**
   * Initialize the cache engine
   */
  async initialize(): AsyncResult<void> {
    const startTime = Date.now();
    
    try {
      console.log('🚀 Initializing normalized cache engine...');

      // Initialize cross-reference system
      const xrefResult = await this.crossRefSystem.initialize();
      if (!xrefResult.success) {
        return {
          success: false,
          error: `Failed to initialize cross-reference system: ${xrefResult.error}`
        };
      }

      // Set up auto-optimization if configured
      if (this.config.optimization?.autoOptimizeInterval) {
        this.optimizationTimer = setInterval(
          () => this.optimize(),
          this.config.optimization.autoOptimizeInterval
        );
      }

      this.initialized = true;
      
      console.log(`✅ Cache engine initialized in ${Date.now() - startTime}ms`);
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize cache engine'
      };
    }
  }

  /**
   * Store a resource with content and build cross-references
   */
  async storeResource(
    metadata: ResourceMetadata,
    content: NormalizedContent
  ): AsyncResult<void> {
    const startTime = Date.now();
    
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      // Register resource metadata
      const registerResult = await this.registry.registerResource(metadata);
      if (!registerResult.success) {
        return {
          success: false,
          error: `Failed to register resource: ${registerResult.error}`
        };
      }

      // Store content
      const storeResult = await this.contentStore.storeContent(metadata.id, content);
      if (!storeResult.success) {
        return {
          success: false,
          error: `Failed to store content: ${storeResult.error}`
        };
      }

      // Build cross-references if enabled
      if (this.config.crossReference?.autoBuild) {
        const xrefResult = await this.crossRefSystem.buildIndexFromContent(metadata.id, content);
        if (!xrefResult.success) {
          console.warn(`Failed to build cross-references for ${metadata.id}: ${xrefResult.error}`);
        }
      }

      console.log(`💾 Stored resource: ${metadata.id} (${metadata.type})`);
      
      return {
        success: true,
        data: undefined,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          resourcesAffected: 1
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to store resource'
      };
    }
  }

  /**
   * Get a resource with optional content and cross-references
   */
  async getResource(
    resourceId: ResourceId,
    options: {
      includeContent?: boolean;
      includeCrossReferences?: boolean;
    } = {}
  ): AsyncResult<EnrichedResource | null> {
    const startTime = Date.now();
    this.queryCount++;
    
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      // Get resource metadata
      const metadataResult = await this.registry.getResourceMetadata(resourceId);
      if (!metadataResult.success) {
        return {
          success: false,
          error: `Failed to get resource metadata: ${metadataResult.error}`
        };
      }

      if (!metadataResult.data) {
        this.totalQueryTime += Date.now() - startTime;
        return { success: true, data: null };
      }

      const enrichedResource: EnrichedResource = {
        metadata: metadataResult.data
      };

      // Get content if requested
      if (options.includeContent) {
        const contentResult = await this.contentStore.getContent(resourceId);
        if (contentResult.success && contentResult.data) {
          enrichedResource.content = contentResult.data;
          this.cacheHits++;
        }
      }

      // Get cross-references if requested
      if (options.includeCrossReferences) {
        const outgoingResult = await this.crossRefSystem.getOutgoingReferences(resourceId);
        const incomingResult = await this.crossRefSystem.getIncomingReferences(resourceId);
        
        if (outgoingResult.success) {
          enrichedResource.outgoingReferences = outgoingResult.data;
        }
        
        if (incomingResult.success) {
          enrichedResource.incomingReferences = incomingResult.data;
        }
      }

      this.totalQueryTime += Date.now() - startTime;
      
      return {
        success: true,
        data: enrichedResource,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          cacheHit: !!enrichedResource.content
        }
      };
    } catch (error) {
      this.totalQueryTime += Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get resource'
      };
    }
  }

  /**
   * Query resources with filtering and enrichment options
   */
  async queryResources(options: ResourceQueryOptions = {}): AsyncResult<EnrichedResource[]> {
    const startTime = Date.now();
    this.queryCount++;
    
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      // Build filter for registry
      const filter: any = {};
      
      if (options.types && options.types.length > 0) {
        // For now, query each type separately and combine results
        // In a real implementation, this would be optimized
      }
      
      if (options.book || options.chapter || options.verse || options.language) {
        filter.location = {
          book: options.book,
          chapter: options.chapter,
          verse: options.verse,
          language: options.language
        };
      }

      // Get resources from registry
      const listResult = await this.registry.listResources(filter);
      if (!listResult.success) {
        return {
          success: false,
          error: `Failed to query resources: ${listResult.error}`
        };
      }

      let resources = listResult.data;

      // Apply type filter if specified
      if (options.types && options.types.length > 0) {
        resources = resources.filter(r => options.types!.includes(r.type));
      }

      // Apply sorting
      if (options.sortBy) {
        resources.sort((a, b) => {
          let aValue: any;
          let bValue: any;
          
          switch (options.sortBy) {
            case 'id':
              aValue = a.id;
              bValue = b.id;
              break;
            case 'type':
              aValue = a.type;
              bValue = b.type;
              break;
            case 'lastAccessed':
              aValue = a.cache.lastAccessedAt;
              bValue = b.cache.lastAccessedAt;
              break;
            case 'createdAt':
              aValue = a.cache.cachedAt;
              bValue = b.cache.cachedAt;
              break;
            default:
              aValue = a.id;
              bValue = b.id;
          }
          
          const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          return options.sortDirection === 'desc' ? -comparison : comparison;
        });
      }

      // Apply limit
      if (options.limit) {
        resources = resources.slice(0, options.limit);
      }

      // Enrich resources with content and cross-references if requested
      const enrichedResources: EnrichedResource[] = [];
      
      for (const metadata of resources) {
        const enriched: EnrichedResource = { metadata };
        
        // Get content if requested
        if (options.includeContent) {
          const contentResult = await this.contentStore.getContent(metadata.id);
          if (contentResult.success && contentResult.data) {
            enriched.content = contentResult.data;
            this.cacheHits++;
          }
        }
        
        // Get cross-references if requested
        if (options.includeCrossReferences) {
          const outgoingResult = await this.crossRefSystem.getOutgoingReferences(metadata.id);
          const incomingResult = await this.crossRefSystem.getIncomingReferences(metadata.id);
          
          if (outgoingResult.success) {
            enriched.outgoingReferences = outgoingResult.data;
          }
          
          if (incomingResult.success) {
            enriched.incomingReferences = incomingResult.data;
          }
        }
        
        enrichedResources.push(enriched);
      }

      this.totalQueryTime += Date.now() - startTime;
      
      return {
        success: true,
        data: enrichedResources,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          resourcesAffected: enrichedResources.length
        }
      };
    } catch (error) {
      this.totalQueryTime += Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to query resources'
      };
    }
  }

  /**
   * Find related resources using cross-reference traversal
   */
  async findRelatedResources(
    resourceId: ResourceId,
    options: TraversalOptions = {}
  ): AsyncResult<EnrichedResource[]> {
    const startTime = Date.now();
    this.queryCount++;
    
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      // Apply default traversal depth from config
      const traversalOptions = {
        maxDepth: this.config.crossReference?.maxTraversalDepth || 3,
        ...options
      };

      // Traverse cross-references
      const traversalResult = await this.crossRefSystem.traverseReferences(resourceId, traversalOptions);
      if (!traversalResult.success) {
        return {
          success: false,
          error: `Failed to traverse references: ${traversalResult.error}`
        };
      }

      // Get enriched resources for found resource IDs
      const enrichedResources: EnrichedResource[] = [];
      
      for (const relatedId of traversalResult.data.resources) {
        const resourceResult = await this.getResource(relatedId, {
          includeContent: true,
          includeCrossReferences: false // Avoid recursive loading
        });
        
        if (resourceResult.success && resourceResult.data) {
          enrichedResources.push(resourceResult.data);
        }
      }

      this.totalQueryTime += Date.now() - startTime;
      
      return {
        success: true,
        data: enrichedResources,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          resourcesAffected: enrichedResources.length
        }
      };
    } catch (error) {
      this.totalQueryTime += Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find related resources'
      };
    }
  }

  /**
   * Update a resource
   */
  async updateResource(
    resourceId: ResourceId,
    updates: {
      metadata?: Partial<ResourceMetadata>;
      content?: Partial<NormalizedContent>;
    },
    modifiedBy: string = 'system'
  ): AsyncResult<void> {
    const startTime = Date.now();
    
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      let resourcesAffected = 0;

      // Update metadata if provided
      if (updates.metadata) {
        const updateMetadataResult = await this.registry.updateResourceMetadata(resourceId, updates.metadata);
        if (!updateMetadataResult.success) {
          return {
            success: false,
            error: `Failed to update metadata: ${updateMetadataResult.error}`
          };
        }
        resourcesAffected++;
      }

      // Update content if provided
      if (updates.content) {
        const updateContentResult = await this.contentStore.updateContent(resourceId, updates.content, modifiedBy);
        if (!updateContentResult.success) {
          return {
            success: false,
            error: `Failed to update content: ${updateContentResult.error}`
          };
        }
        resourcesAffected++;

        // Rebuild cross-references if content changed and auto-build is enabled
        if (this.config.crossReference?.autoBuild) {
          const contentResult = await this.contentStore.getContent(resourceId);
          if (contentResult.success && contentResult.data) {
            await this.crossRefSystem.buildIndexFromContent(resourceId, contentResult.data);
          }
        }
      }

      console.log(`📝 Updated resource: ${resourceId} by ${modifiedBy}`);
      
      return {
        success: true,
        data: undefined,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          resourcesAffected
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update resource'
      };
    }
  }

  /**
   * Delete a resource
   */
  async deleteResource(resourceId: ResourceId): AsyncResult<void> {
    const startTime = Date.now();
    
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      // Delete from content store
      const deleteContentResult = await this.contentStore.deleteContent(resourceId);
      if (!deleteContentResult.success) {
        console.warn(`Failed to delete content for ${resourceId}: ${deleteContentResult.error}`);
      }

      // Remove from registry
      const unregisterResult = await this.registry.unregisterResource(resourceId);
      if (!unregisterResult.success) {
        return {
          success: false,
          error: `Failed to unregister resource: ${unregisterResult.error}`
        };
      }

      // TODO: Remove cross-references (would need method in CrossReferenceSystem)

      console.log(`🗑️ Deleted resource: ${resourceId}`);
      
      return {
        success: true,
        data: undefined,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          resourcesAffected: 1
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete resource'
      };
    }
  }

  /**
   * Batch operations for efficiency
   */
  async batchOperations(requests: BatchOperationRequest[]): AsyncResult<Array<{
    resourceId: ResourceId;
    success: boolean;
    error?: string;
  }>> {
    const startTime = Date.now();
    
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      const results = [];
      
      for (const request of requests) {
        try {
          let success = true;
          let error: string | undefined;

          switch (request.type) {
            case 'store':
              if (!request.metadata || !request.content) {
                throw new Error('Metadata and content required for store operation');
              }
              const storeResult = await this.storeResource(request.metadata, request.content);
              success = storeResult.success;
              error = storeResult.error;
              break;

            case 'get':
              // Get operations don't modify state, just validate existence
              const getResult = await this.getResource(request.resourceId);
              success = getResult.success;
              error = getResult.error;
              break;

            case 'update':
              if (!request.updates && !request.content) {
                throw new Error('Updates or content required for update operation');
              }
              const updateResult = await this.updateResource(request.resourceId, {
                metadata: request.updates,
                content: request.content
              });
              success = updateResult.success;
              error = updateResult.error;
              break;

            case 'delete':
              const deleteResult = await this.deleteResource(request.resourceId);
              success = deleteResult.success;
              error = deleteResult.error;
              break;

            default:
              throw new Error(`Unknown operation type: ${request.type}`);
          }

          results.push({
            resourceId: request.resourceId,
            success,
            error
          });
        } catch (err) {
          results.push({
            resourceId: request.resourceId,
            success: false,
            error: err instanceof Error ? err.message : 'Operation failed'
          });
        }
      }

      return {
        success: true,
        data: results,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          resourcesAffected: results.filter(r => r.success).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch operations failed'
      };
    }
  }

  /**
   * Optimize cache performance
   */
  async optimize(): AsyncResult<{
    freedBytes: number;
    optimizedResources: number;
    executionTimeMs: number;
  }> {
    const startTime = Date.now();
    
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      console.log('🔧 Optimizing cache...');

      // Optimize content store
      const contentOptimizeResult = await this.contentStore.optimizeStorage();
      let freedBytes = 0;
      let optimizedResources = 0;

      if (contentOptimizeResult.success) {
        freedBytes += contentOptimizeResult.data.freedBytes;
        optimizedResources += contentOptimizeResult.data.optimizedResources;
      }

      // TODO: Implement LRU eviction if enabled
      // TODO: Implement cache size limits
      // TODO: Optimize cross-reference indexes

      const executionTimeMs = Date.now() - startTime;
      
      console.log(`✅ Cache optimization completed in ${executionTimeMs}ms`);
      console.log(`   Freed: ${freedBytes} bytes, Optimized: ${optimizedResources} resources`);
      
      return {
        success: true,
        data: {
          freedBytes,
          optimizedResources,
          executionTimeMs
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to optimize cache'
      };
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  async getStatistics(): AsyncResult<CacheStatistics> {
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      // Get registry statistics
      const registryStatsResult = await this.registry.getStatistics();
      if (!registryStatsResult.success) {
        return {
          success: false,
          error: `Failed to get registry statistics: ${registryStatsResult.error}`
        };
      }

      // Get content store statistics
      const contentStatsResult = await this.contentStore.getStatistics();
      if (!contentStatsResult.success) {
        return {
          success: false,
          error: `Failed to get content statistics: ${contentStatsResult.error}`
        };
      }

      // Get cross-reference statistics
      const xrefStatsResult = await this.crossRefSystem.getStatistics();
      if (!xrefStatsResult.success) {
        return {
          success: false,
          error: `Failed to get cross-reference statistics: ${xrefStatsResult.error}`
        };
      }

      const stats: CacheStatistics = {
        registry: {
          totalResources: registryStatsResult.data.totalResources,
          resourcesByType: registryStatsResult.data.resourcesByType,
          resourcesByRepository: registryStatsResult.data.resourcesByRepository,
          averageReferencesPerResource: registryStatsResult.data.averageReferencesPerResource
        },
        content: {
          totalContent: contentStatsResult.data.totalContent,
          totalSize: contentStatsResult.data.totalSize,
          contentByType: contentStatsResult.data.contentByType,
          averageSize: contentStatsResult.data.averageSize,
          compressionRatio: contentStatsResult.data.compressionRatio
        },
        crossReferences: {
          totalReferences: xrefStatsResult.data.totalReferences,
          referencesByType: xrefStatsResult.data.referencesByType,
          averageReferencesPerResource: xrefStatsResult.data.averageReferencesPerResource,
          strongestConnections: xrefStatsResult.data.strongestConnections
        },
        performance: {
          cacheHitRate: this.queryCount > 0 ? this.cacheHits / this.queryCount : 0,
          averageQueryTime: this.queryCount > 0 ? this.totalQueryTime / this.queryCount : 0,
          totalQueries: this.queryCount
        }
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
   * Shutdown the cache engine
   */
  async shutdown(): AsyncResult<void> {
    try {
      console.log('🛑 Shutting down cache engine...');

      // Clear optimization timer
      if (this.optimizationTimer) {
        clearInterval(this.optimizationTimer);
        this.optimizationTimer = undefined;
      }

      // Close storage backend
      await this.config.storageBackend.close();

      this.initialized = false;
      
      console.log('✅ Cache engine shutdown complete');
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to shutdown cache engine'
      };
    }
  }
}
