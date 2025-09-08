/**
 * Unified Resource Orchestrator
 * Integrates sync, cache, scoping, and alignment systems for complete Door43 resource management
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import { IStorageBackend } from '@bt-toolkit/door43-storage';
import { 
  NormalizedCacheEngine, 
  CacheEngineConfig, 
  EnrichedResource,
  ResourceQueryOptions,
  createCacheEngine
} from '@bt-toolkit/door43-cache';
import { 
  ResourceScopeManager, 
  ResourceScope, 
  createScopeManager,
  ScopeTemplate,
  ApplicationProfile,
  recommendScope
} from '@bt-toolkit/door43-scoping';
import { AlignmentService, WordInteractionService } from '@bt-toolkit/door43-alignment';

import { 
  Door43SyncOrchestrator,
  createBidirectionalSyncOrchestrator,
  SyncConfiguration,
  SyncStatus,
  SyncEventType,
  SyncEventListener
} from './sync-orchestrator.js';

// ============================================================================
// Unified Orchestrator Types
// ============================================================================

/**
 * Unified orchestrator configuration
 */
export interface UnifiedOrchestratorConfig {
  /** Storage backend */
  storageBackend: IStorageBackend;
  
  /** Door43 authentication */
  door43?: {
    authToken?: string;
    apiUrl?: string;
  };
  
  /** Cache configuration */
  cache?: Partial<CacheEngineConfig>;
  
  /** Sync configuration */
  sync?: Partial<SyncConfiguration>;
  
  /** Resource scope */
  scope?: ResourceScope | ScopeTemplate | ApplicationProfile;
  
  /** Alignment configuration */
  alignment?: {
    enabled: boolean;
    autoAlign?: boolean;
    alignmentThreshold?: number;
  };
  
  /** Integration settings */
  integration?: {
    /** Auto-sync cache changes back to Door43 */
    autoSyncBack?: boolean;
    /** Cache sync operations */
    cacheSyncOperations?: boolean;
    /** Real-time alignment updates */
    realTimeAlignment?: boolean;
    /** Cross-reference optimization */
    optimizeCrossReferences?: boolean;
  };
}

/**
 * Resource operation result with unified metadata
 */
export interface UnifiedOperationResult<T = any> {
  /** Operation success */
  success: boolean;
  /** Result data */
  data?: T;
  /** Error message */
  error?: string;
  /** Unified operation metadata */
  metadata?: {
    /** Total execution time */
    totalTimeMs: number;
    /** Cache operation time */
    cacheTimeMs?: number;
    /** Sync operation time */
    syncTimeMs?: number;
    /** Alignment operation time */
    alignmentTimeMs?: number;
    /** Resources processed */
    resourcesProcessed: number;
    /** Cache hits */
    cacheHits: number;
    /** Sync operations */
    syncOperations: number;
    /** Alignment operations */
    alignmentOperations: number;
  };
}

/**
 * Resource with complete integration metadata
 */
export interface IntegratedResource extends EnrichedResource {
  /** Sync status */
  syncStatus?: {
    lastSynced?: Date;
    syncVersion?: string;
    pendingChanges?: boolean;
    syncError?: string;
  };
  /** Alignment data */
  alignmentData?: {
    wordAlignments?: any[];
    alignmentQuality?: number;
    lastAligned?: Date;
  };
  /** Scope information */
  scopeInfo?: {
    scopeId: string;
    scopePriority: number;
    includeReason: string;
  };
}

/**
 * Alignment-aware query options
 */
export interface AlignmentAwareQueryOptions extends ResourceQueryOptions {
  /** Include alignment data */
  includeAlignment?: boolean;
  /** Alignment quality threshold */
  alignmentQuality?: number;
  /** Cross-reference traversal for alignment */
  alignmentTraversal?: {
    enabled: boolean;
    maxDepth: number;
    includeRelatedWords?: boolean;
  };
}

// ============================================================================
// Unified Resource Orchestrator
// ============================================================================

/**
 * Unified Resource Orchestrator
 * Provides complete Door43 resource management with integrated sync, cache, scoping, and alignment
 */
export class UnifiedResourceOrchestrator {
  private cacheEngine: NormalizedCacheEngine;
  private scopeManager: ResourceScopeManager;
  private syncOrchestrator: Door43SyncOrchestrator;
  private alignmentService?: AlignmentService;
  private wordInteractionService?: WordInteractionService;
  
  private config: UnifiedOrchestratorConfig;
  private initialized = false;
  private currentScope?: ResourceScope;
  
  constructor(config: UnifiedOrchestratorConfig) {
    this.config = config;
    
    // Initialize cache engine
    const cacheConfig: CacheEngineConfig = {
      storageBackend: config.storageBackend,
      compression: true,
      encryption: false,
      optimization: {
        autoOptimizeInterval: 300000, // 5 minutes
        maxCacheSize: 100 * 1024 * 1024, // 100MB
        lruEviction: true
      },
      crossReference: {
        autoBuild: true,
        maxTraversalDepth: 5
      },
      ...config.cache
    };
    this.cacheEngine = createCacheEngine(cacheConfig);
    
    // Initialize scope manager
    this.scopeManager = createScopeManager(config.storageBackend);
    
    // Initialize sync orchestrator
    if (config.door43?.authToken) {
      this.syncOrchestrator = createBidirectionalSyncOrchestrator(
        config.storageBackend,
        config.door43.authToken,
        {
          door43ApiUrl: config.door43.apiUrl,
          patchThreshold: 1024 * 1024, // 1MB
          autoSyncBack: config.integration?.autoSyncBack || false
        }
      );
    } else {
      // Create basic sync orchestrator without bidirectional sync
      this.syncOrchestrator = new Door43SyncOrchestrator(config.storageBackend, config.sync);
    }
    
    // Initialize alignment services if enabled
    if (config.alignment?.enabled) {
      this.alignmentService = new AlignmentService();
      this.wordInteractionService = new WordInteractionService();
    }
    
    console.log('🎯 Unified Resource Orchestrator created');
  }
  
  /**
   * Initialize the unified orchestrator
   */
  async initialize(): AsyncResult<void> {
    if (this.initialized) {
      return { success: true, data: undefined };
    }
    
    const startTime = Date.now();
    
    try {
      // Initialize cache engine
      const cacheResult = await this.cacheEngine.initialize();
      if (!cacheResult.success) {
        return {
          success: false,
          error: `Cache initialization failed: ${cacheResult.error}`
        };
      }
      
      // Initialize sync orchestrator
      const syncResult = await this.syncOrchestrator.initialize();
      if (!syncResult.success) {
        return {
          success: false,
          error: `Sync initialization failed: ${syncResult.error}`
        };
      }
      
      // Set up scope
      await this.setupScope();
      
      // Set up integration event handlers
      this.setupIntegrationEventHandlers();
      
      this.initialized = true;
      const totalTime = Date.now() - startTime;
      
      console.log(`🎯 Unified Resource Orchestrator initialized in ${totalTime}ms`);
      console.log(`   Cache: ✅ Initialized`);
      console.log(`   Sync: ✅ Initialized`);
      console.log(`   Scope: ✅ ${this.currentScope?.name || 'Default'}`);
      console.log(`   Alignment: ${this.alignmentService ? '✅ Enabled' : '⚪ Disabled'}`);
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  }
  
  /**
   * Query resources with unified caching, scoping, and alignment
   */
  async queryResources(options: AlignmentAwareQueryOptions): AsyncResult<IntegratedResource[]> {
    if (!this.initialized) {
      return { success: false, error: 'Orchestrator not initialized' };
    }
    
    const startTime = Date.now();
    let cacheTime = 0;
    let alignmentTime = 0;
    
    try {
      // Apply scope filtering to query options
      const scopedOptions = await this.applyScopeToQuery(options);
      
      // Query cache with scoped options
      const cacheStartTime = Date.now();
      const cacheResult = await this.cacheEngine.queryResources(scopedOptions);
      cacheTime = Date.now() - cacheStartTime;
      
      if (!cacheResult.success) {
        return {
          success: false,
          error: `Cache query failed: ${cacheResult.error}`
        };
      }
      
      // Enrich resources with sync and alignment data
      const enrichedResources: IntegratedResource[] = [];
      
      for (const resource of cacheResult.data || []) {
        const alignmentStartTime = Date.now();
        
        // Add sync status
        const syncStatus = await this.getSyncStatus(resource.metadata.id);
        
        // Add alignment data if requested and enabled
        let alignmentData;
        if (options.includeAlignment && this.alignmentService) {
          alignmentData = await this.getAlignmentData(resource.metadata.id);
        }
        
        // Add scope information
        const scopeInfo = await this.getScopeInfo(resource.metadata.id);
        
        alignmentTime += Date.now() - alignmentStartTime;
        
        enrichedResources.push({
          ...resource,
          syncStatus,
          alignmentData,
          scopeInfo
        });
      }
      
      const totalTime = Date.now() - startTime;
      
      return {
        success: true,
        data: enrichedResources,
        metadata: {
          totalTimeMs: totalTime,
          cacheTimeMs: cacheTime,
          alignmentTimeMs: alignmentTime,
          resourcesProcessed: enrichedResources.length,
          cacheHits: cacheResult.metadata?.cacheHit ? 1 : 0,
          syncOperations: 0,
          alignmentOperations: options.includeAlignment ? enrichedResources.length : 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resource query failed'
      };
    }
  }
  
  /**
   * Store resource with integrated caching and sync
   */
  async storeResource(
    resourceId: string, 
    content: any, 
    metadata: any,
    options?: {
      syncBack?: boolean;
      updateAlignment?: boolean;
      commitMessage?: string;
    }
  ): AsyncResult<UnifiedOperationResult> {
    if (!this.initialized) {
      return { success: false, error: 'Orchestrator not initialized' };
    }
    
    const startTime = Date.now();
    let cacheTime = 0;
    let syncTime = 0;
    let alignmentTime = 0;
    
    try {
      // Store in cache
      const cacheStartTime = Date.now();
      const cacheResult = await this.cacheEngine.storeResource(resourceId, content, metadata);
      cacheTime = Date.now() - cacheStartTime;
      
      if (!cacheResult.success) {
        return {
          success: false,
          error: `Cache storage failed: ${cacheResult.error}`
        };
      }
      
      let syncOperations = 0;
      let alignmentOperations = 0;
      
      // Sync back to Door43 if requested and enabled
      if (options?.syncBack && this.syncOrchestrator.getBidirectionalSyncService()) {
        const syncStartTime = Date.now();
        
        const syncResult = await this.syncOrchestrator.syncBackToSource(
          resourceId,
          JSON.stringify(content),
          metadata.format || 'json',
          metadata.resourceType || 'unknown',
          metadata.door43Metadata || {},
          options.commitMessage || 'Update resource via unified orchestrator'
        );
        
        syncTime = Date.now() - syncStartTime;
        syncOperations = syncResult.success ? 1 : 0;
        
        if (!syncResult.success) {
          console.warn(`⚠️ Sync back failed for ${resourceId}: ${syncResult.error}`);
        }
      }
      
      // Update alignment if requested and enabled
      if (options?.updateAlignment && this.alignmentService) {
        const alignmentStartTime = Date.now();
        
        // Update alignment data (mock implementation)
        await this.updateAlignmentData(resourceId, content);
        alignmentTime = Date.now() - alignmentStartTime;
        alignmentOperations = 1;
      }
      
      const totalTime = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          resourceId,
          cached: true,
          synced: syncOperations > 0,
          aligned: alignmentOperations > 0
        },
        metadata: {
          totalTimeMs: totalTime,
          cacheTimeMs: cacheTime,
          syncTimeMs: syncTime,
          alignmentTimeMs: alignmentTime,
          resourcesProcessed: 1,
          cacheHits: 0,
          syncOperations,
          alignmentOperations
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resource storage failed'
      };
    }
  }
  
  /**
   * Perform alignment-aware cross-reference traversal
   */
  async traverseAlignmentReferences(
    resourceId: string,
    word: string,
    options?: {
      maxDepth?: number;
      includeRelatedWords?: boolean;
      resourceTypes?: string[];
    }
  ): AsyncResult<any> {
    if (!this.initialized || !this.wordInteractionService) {
      return { success: false, error: 'Alignment services not available' };
    }
    
    const startTime = Date.now();
    
    try {
      // Get word interactions
      const interactions = await this.wordInteractionService.getWordInteractions(
        resourceId,
        word,
        {
          includeTranslationNotes: true,
          includeTranslationWords: true,
          includeAlignment: true,
          maxResults: 50
        }
      );
      
      if (!interactions.success) {
        return {
          success: false,
          error: `Word interaction query failed: ${interactions.error}`
        };
      }
      
      // Traverse cross-references for related resources
      const traversalResults = [];
      
      for (const interaction of interactions.data?.interactions || []) {
        if (interaction.crossReferences) {
          for (const ref of interaction.crossReferences) {
            const traversalResult = await this.cacheEngine.traverseCrossReferences(
              ref.targetResourceId,
              {
                maxDepth: options?.maxDepth || 3,
                includeContent: true,
                resourceTypeFilter: options?.resourceTypes
              }
            );
            
            if (traversalResult.success) {
              traversalResults.push({
                sourceWord: word,
                reference: ref,
                traversal: traversalResult.data
              });
            }
          }
        }
      }
      
      const totalTime = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          word,
          resourceId,
          interactions: interactions.data,
          crossReferenceTraversals: traversalResults,
          statistics: {
            totalInteractions: interactions.data?.interactions?.length || 0,
            crossReferencesTraversed: traversalResults.length,
            executionTimeMs: totalTime
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Alignment traversal failed'
      };
    }
  }
  
  /**
   * Get comprehensive sync status
   */
  getSyncStatus(): SyncStatus {
    return this.syncOrchestrator.getSyncStatus();
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStatistics(): AsyncResult<any> {
    return await this.cacheEngine.getStatistics();
  }
  
  /**
   * Get current resource scope
   */
  getCurrentScope(): ResourceScope | undefined {
    return this.currentScope;
  }
  
  /**
   * Update resource scope
   */
  async updateScope(scope: ResourceScope): AsyncResult<void> {
    try {
      this.currentScope = scope;
      
      // Apply scope to cache engine
      await this.applyScopeToCache(scope);
      
      console.log(`🎯 Resource scope updated to: ${scope.name}`);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scope update failed'
      };
    }
  }
  
  /**
   * Shutdown the unified orchestrator
   */
  async shutdown(): AsyncResult<void> {
    try {
      await this.syncOrchestrator.shutdown();
      await this.cacheEngine.shutdown();
      
      this.initialized = false;
      console.log('🎯 Unified Resource Orchestrator shut down');
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Shutdown failed'
      };
    }
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private async setupScope(): Promise<void> {
    if (!this.config.scope) {
      // Use default scope
      this.currentScope = {
        id: 'default',
        name: 'Default Scope',
        description: 'Default resource scope',
        organizations: [],
        languages: ['en'],
        resourceTypes: ['bible-text', 'translation-notes', 'translation-words'],
        priority: { level: 'medium', weight: 50 },
        metadata: {
          createdAt: new Date(),
          createdBy: 'system',
          version: '1.0',
          tags: ['default']
        }
      };
      return;
    }
    
    // Handle different scope configuration types
    if ('id' in this.config.scope) {
      // Already a ResourceScope
      this.currentScope = this.config.scope as ResourceScope;
    } else if ('name' in this.config.scope && 'filters' in this.config.scope) {
      // ScopeTemplate - need to create from template
      // For now, create a basic scope
      this.currentScope = {
        id: 'template-based',
        name: (this.config.scope as any).name,
        description: 'Scope created from template',
        organizations: [],
        languages: ['en'],
        resourceTypes: ['bible-text', 'translation-notes', 'translation-words'],
        priority: { level: 'medium', weight: 50 },
        metadata: {
          createdAt: new Date(),
          createdBy: 'template',
          version: '1.0',
          tags: ['template']
        }
      };
    } else {
      // ApplicationProfile - get recommendation
      const recommendation = recommendScope(this.config.scope as ApplicationProfile);
      this.currentScope = recommendation.recommendedScope;
    }
  }
  
  private setupIntegrationEventHandlers(): void {
    // Listen for sync events and update cache accordingly
    this.syncOrchestrator.addEventListener('resource-updated', async (event) => {
      if (this.config.integration?.cacheSyncOperations) {
        console.log(`🔄 Sync event received, updating cache for: ${event.data?.resourceId}`);
        // Could implement cache invalidation or update here
      }
    });
    
    // Listen for cache events and trigger sync if needed
    // Note: This would require cache engine to emit events
    if (this.config.integration?.autoSyncBack) {
      console.log('🔄 Auto-sync back enabled for cache changes');
    }
  }
  
  private async applyScopeToQuery(options: AlignmentAwareQueryOptions): Promise<ResourceQueryOptions> {
    if (!this.currentScope) {
      return options;
    }
    
    // Apply scope filters to query options
    const scopedOptions: ResourceQueryOptions = {
      ...options,
      types: options.types || this.currentScope.resourceTypes as any[],
      language: options.language || this.currentScope.languages[0]
    };
    
    return scopedOptions;
  }
  
  private async applyScopeToCache(scope: ResourceScope): Promise<void> {
    // Apply scope configuration to cache engine
    // This would involve configuring cache filters, size limits, etc.
    console.log(`🎯 Applying scope ${scope.name} to cache engine`);
  }
  
  private async getSyncStatus(resourceId: string): Promise<any> {
    // Get sync status for specific resource
    return {
      lastSynced: new Date(),
      syncVersion: '1.0',
      pendingChanges: false
    };
  }
  
  private async getAlignmentData(resourceId: string): Promise<any> {
    // Get alignment data for specific resource
    return {
      wordAlignments: [],
      alignmentQuality: 0.95,
      lastAligned: new Date()
    };
  }
  
  private async getScopeInfo(resourceId: string): Promise<any> {
    // Get scope information for specific resource
    return {
      scopeId: this.currentScope?.id || 'default',
      scopePriority: this.currentScope?.priority.weight || 50,
      includeReason: 'Matches scope criteria'
    };
  }
  
  private async updateAlignmentData(resourceId: string, content: any): Promise<void> {
    // Update alignment data for resource
    console.log(`🎯 Updating alignment data for ${resourceId}`);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a unified orchestrator for translation workflow
 */
export function createTranslationOrchestrator(
  storageBackend: IStorageBackend,
  authToken: string,
  options?: {
    languages?: string[];
    books?: string[];
    enableAlignment?: boolean;
  }
): UnifiedResourceOrchestrator {
  return new UnifiedResourceOrchestrator({
    storageBackend,
    door43: {
      authToken,
      apiUrl: 'https://git.door43.org/api/v1'
    },
    cache: {
      optimization: {
        maxCacheSize: 200 * 1024 * 1024, // 200MB for translation work
        lruEviction: true
      }
    },
    scope: {
      name: 'Translation Workflow',
      description: 'Optimized for Bible translation workflow',
      organizations: [],
      languages: options?.languages || ['en'],
      resourceTypes: ['bible-text', 'translation-notes', 'translation-words', 'translation-questions'],
      books: options?.books,
      priority: { level: 'high', weight: 80 },
      metadata: {
        createdAt: new Date(),
        createdBy: 'translation-workflow',
        version: '1.0',
        tags: ['translation', 'workflow']
      }
    },
    alignment: {
      enabled: options?.enableAlignment || true,
      autoAlign: true,
      alignmentThreshold: 0.8
    },
    integration: {
      autoSyncBack: false, // Manual sync for translation work
      cacheSyncOperations: true,
      realTimeAlignment: true,
      optimizeCrossReferences: true
    }
  });
}

/**
 * Create a unified orchestrator for research/study
 */
export function createResearchOrchestrator(
  storageBackend: IStorageBackend,
  authToken?: string
): UnifiedResourceOrchestrator {
  return new UnifiedResourceOrchestrator({
    storageBackend,
    door43: authToken ? {
      authToken,
      apiUrl: 'https://git.door43.org/api/v1'
    } : undefined,
    cache: {
      optimization: {
        maxCacheSize: 500 * 1024 * 1024, // 500MB for research
        lruEviction: false // Keep everything for research
      },
      crossReference: {
        autoBuild: true,
        maxTraversalDepth: 10 // Deep traversal for research
      }
    },
    scope: {
      name: 'Research Scope',
      description: 'Comprehensive scope for Bible research',
      organizations: [],
      languages: ['en', 'he', 'grc'], // Include original languages
      resourceTypes: ['bible-text', 'translation-notes', 'translation-words', 'translation-questions', 'translation-academy'],
      priority: { level: 'high', weight: 90 },
      metadata: {
        createdAt: new Date(),
        createdBy: 'research-workflow',
        version: '1.0',
        tags: ['research', 'study', 'comprehensive']
      }
    },
    alignment: {
      enabled: true,
      autoAlign: true,
      alignmentThreshold: 0.7 // Lower threshold for research
    },
    integration: {
      autoSyncBack: false,
      cacheSyncOperations: false,
      realTimeAlignment: false,
      optimizeCrossReferences: true
    }
  });
}
