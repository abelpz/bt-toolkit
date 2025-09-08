/**
 * Normalized Cache Service Interfaces
 * Optimized for cross-reference traversal and bidirectional sync
 */

import {
  ResourceId,
  NormalizedResource,
  ResourceMetadata,
  ResourceQuery,
  ResourceQueryResult,
  BatchOperation,
  BatchOperationResult,
  CrossReference,
  ResourceModification,
  NormalizedContent
} from './normalized-cache-types.js';
import { RepositoryIdentifier } from './cache-types.js';
import { AsyncResult, BookId } from './types.js';

// ============================================================================
// Resource Registry Service
// ============================================================================

/**
 * Central registry for all cached resources
 * Maps Resource IDs to metadata and manages resource lifecycle
 */
export interface IResourceRegistryService {
  /** Initialize the registry */
  initialize(): AsyncResult<void>;
  
  /** Register a new resource */
  registerResource(metadata: ResourceMetadata): AsyncResult<void>;
  
  /** Get resource metadata */
  getResourceMetadata(id: ResourceId): AsyncResult<ResourceMetadata | null>;
  
  /** Update resource metadata */
  updateResourceMetadata(id: ResourceId, updates: Partial<ResourceMetadata>): AsyncResult<void>;
  
  /** Unregister resource */
  unregisterResource(id: ResourceId): AsyncResult<void>;
  
  /** Check if resource exists */
  hasResource(id: ResourceId): AsyncResult<boolean>;
  
  /** List all resources */
  listResources(filter?: Partial<ResourceMetadata>): AsyncResult<ResourceMetadata[]>;
  
  /** Generate resource ID from source info */
  generateResourceId(
    repository: RepositoryIdentifier,
    resourceType: string,
    resourcePath: string,
    section?: any
  ): ResourceId;
  
  /** Parse resource ID back to components */
  parseResourceId(id: ResourceId): {
    server: string;
    owner: string;
    repo: string;
    resourceType: string;
    resourcePath: string;
  };
}

// ============================================================================
// Normalized Content Service
// ============================================================================

/**
 * Content storage optimized for access patterns and editing
 */
export interface INormalizedContentService {
  /** Store normalized content */
  storeContent(id: ResourceId, content: NormalizedContent): AsyncResult<void>;
  
  /** Get normalized content */
  getContent<T extends NormalizedContent = NormalizedContent>(id: ResourceId): AsyncResult<T | null>;
  
  /** Update content (with change tracking) */
  updateContent(
    id: ResourceId, 
    updates: Partial<NormalizedContent>,
    modifiedBy: string
  ): AsyncResult<void>;
  
  /** Delete content */
  deleteContent(id: ResourceId): AsyncResult<void>;
  
  /** Batch content operations */
  batchOperations(operations: BatchOperation[]): AsyncResult<BatchOperationResult>;
  
  /** Get content size */
  getContentSize(id: ResourceId): AsyncResult<number>;
  
  /** Compress/optimize content storage */
  optimizeStorage(): AsyncResult<{ freedBytes: number; optimizedResources: number }>;
}

// ============================================================================
// Cross-Reference Service
// ============================================================================

/**
 * Cross-reference graph management for fast traversal
 */
export interface ICrossReferenceService {
  /** Add cross-reference */
  addCrossReference(fromId: ResourceId, toId: ResourceId, reference: CrossReference): AsyncResult<void>;
  
  /** Remove cross-reference */
  removeCrossReference(fromId: ResourceId, toId: ResourceId): AsyncResult<void>;
  
  /** Get outgoing references */
  getOutgoingReferences(id: ResourceId): AsyncResult<CrossReference[]>;
  
  /** Get incoming references (backlinks) */
  getIncomingReferences(id: ResourceId): AsyncResult<CrossReference[]>;
  
  /** Find resources by Strong's number */
  findByStrongs(strongsNumber: string): AsyncResult<ResourceId[]>;
  
  /** Find resources by lemma */
  findByLemma(lemma: string): AsyncResult<ResourceId[]>;
  
  /** Find related resources */
  findRelatedResources(
    id: ResourceId,
    options?: {
      maxDepth?: number;
      minStrength?: number;
      types?: string[];
    }
  ): AsyncResult<Array<{
    resourceId: ResourceId;
    path: ResourceId[];
    strength: number;
  }>>;
  
  /** Build cross-reference index for repository */
  buildIndexForRepository(repository: RepositoryIdentifier): AsyncResult<void>;
  
  /** Update cross-references for resource */
  updateCrossReferences(id: ResourceId, content: NormalizedContent): AsyncResult<void>;
  
  /** Get cross-reference statistics */
  getCrossReferenceStats(): AsyncResult<{
    totalReferences: number;
    averageReferencesPerResource: number;
    strongestConnections: Array<{ fromId: ResourceId; toId: ResourceId; strength: number }>;
    mostReferencedResources: Array<{ resourceId: ResourceId; incomingCount: number }>;
  }>;
}

// ============================================================================
// Query Service
// ============================================================================

/**
 * Flexible resource querying with optimization
 */
export interface IResourceQueryService {
  /** Execute resource query */
  query(query: ResourceQuery): AsyncResult<ResourceQueryResult>;
  
  /** Get resources for book */
  getBookResources(
    book: BookId,
    options?: {
      types?: string[];
      includeShared?: boolean;
      language?: string;
    }
  ): AsyncResult<NormalizedResource[]>;
  
  /** Get resources for verse */
  getVerseResources(
    book: BookId,
    chapter: number,
    verse: number,
    options?: {
      types?: string[];
      includeRelated?: boolean;
    }
  ): AsyncResult<NormalizedResource[]>;
  
  /** Search resources by text */
  searchResources(
    searchText: string,
    options?: {
      types?: string[];
      fuzzy?: boolean;
      maxResults?: number;
    }
  ): AsyncResult<ResourceQueryResult>;
  
  /** Get resource path (for navigation) */
  getResourcePath(fromId: ResourceId, toId: ResourceId): AsyncResult<ResourceId[] | null>;
  
  /** Suggest related resources */
  suggestRelatedResources(
    id: ResourceId,
    options?: {
      maxSuggestions?: number;
      minRelevance?: number;
    }
  ): AsyncResult<Array<{
    resourceId: ResourceId;
    relevance: number;
    reason: string;
  }>>;
}

// ============================================================================
// Synchronization Service
// ============================================================================

/**
 * Bidirectional sync with original repositories
 */
export interface ISynchronizationService {
  /** Check for server updates */
  checkForUpdates(resourceId: ResourceId): AsyncResult<{
    hasUpdates: boolean;
    serverModifiedAt?: Date;
    localModifiedAt?: Date;
    conflictDetected: boolean;
  }>;
  
  /** Pull updates from server */
  pullUpdates(resourceId: ResourceId): AsyncResult<{
    updated: boolean;
    conflicts: ResourceModification[];
    mergeRequired: boolean;
  }>;
  
  /** Push local changes to server */
  pushChanges(resourceId: ResourceId): AsyncResult<{
    success: boolean;
    conflicts: ResourceModification[];
    serverResponse?: any;
  }>;
  
  /** Resolve conflicts */
  resolveConflicts(
    resourceId: ResourceId,
    resolution: 'accept-local' | 'accept-server' | 'merge',
    mergeData?: any
  ): AsyncResult<void>;
  
  /** Get dirty resources (need sync) */
  getDirtyResources(): AsyncResult<ResourceId[]>;
  
  /** Batch synchronization */
  batchSync(
    resourceIds: ResourceId[],
    direction: 'pull' | 'push' | 'bidirectional'
  ): AsyncResult<{
    successful: ResourceId[];
    failed: Array<{ resourceId: ResourceId; error: string }>;
    conflicts: Array<{ resourceId: ResourceId; conflicts: ResourceModification[] }>;
  }>;
  
  /** Auto-sync configuration */
  configureAutoSync(options: {
    enabled: boolean;
    interval: number; // milliseconds
    conflictResolution: 'manual' | 'accept-server' | 'accept-local';
    resourceTypes?: string[];
  }): AsyncResult<void>;
}

// ============================================================================
// Change Tracking Service
// ============================================================================

/**
 * Track and manage resource modifications
 */
export interface IChangeTrackingService {
  /** Record resource modification */
  recordModification(
    resourceId: ResourceId,
    modification: ResourceModification
  ): AsyncResult<void>;
  
  /** Get modification history */
  getModificationHistory(resourceId: ResourceId): AsyncResult<ResourceModification[]>;
  
  /** Mark resource as dirty */
  markDirty(resourceId: ResourceId, reason: string): AsyncResult<void>;
  
  /** Mark resource as clean */
  markClean(resourceId: ResourceId): AsyncResult<void>;
  
  /** Check if resource is dirty */
  isDirty(resourceId: ResourceId): AsyncResult<boolean>;
  
  /** Get all dirty resources */
  getDirtyResources(): AsyncResult<ResourceId[]>;
  
  /** Create resource snapshot */
  createSnapshot(resourceId: ResourceId, description: string): AsyncResult<string>; // Returns snapshot ID
  
  /** Restore from snapshot */
  restoreFromSnapshot(resourceId: ResourceId, snapshotId: string): AsyncResult<void>;
  
  /** List snapshots */
  listSnapshots(resourceId: ResourceId): AsyncResult<Array<{
    id: string;
    description: string;
    createdAt: Date;
    size: number;
  }>>;
}

// ============================================================================
// Unified Normalized Cache Manager
// ============================================================================

/**
 * High-level normalized cache management
 */
export interface INormalizedCacheManager {
  /** Initialize cache manager */
  initialize(): AsyncResult<void>;
  
  /** Store resource (normalized) */
  storeResource(resource: NormalizedResource): AsyncResult<void>;
  
  /** Get resource with all related data */
  getResource(id: ResourceId): AsyncResult<NormalizedResource | null>;
  
  /** Get multiple resources efficiently */
  getResources(ids: ResourceId[]): AsyncResult<NormalizedResource[]>;
  
  /** Update resource content */
  updateResource(
    id: ResourceId,
    updates: Partial<NormalizedContent>,
    modifiedBy: string
  ): AsyncResult<void>;
  
  /** Delete resource */
  deleteResource(id: ResourceId): AsyncResult<void>;
  
  /** Import from repository (convert to normalized) */
  importFromRepository(repository: RepositoryIdentifier): AsyncResult<{
    imported: ResourceId[];
    failed: Array<{ path: string; error: string }>;
    crossReferencesBuilt: number;
  }>;
  
  /** Export to repository format */
  exportToRepository(
    resourceIds: ResourceId[],
    targetRepository: RepositoryIdentifier
  ): AsyncResult<{
    exported: Array<{ resourceId: ResourceId; path: string }>;
    failed: Array<{ resourceId: ResourceId; error: string }>;
  }>;
  
  /** Traverse cross-references */
  traverseReferences(
    startId: ResourceId,
    options?: {
      maxDepth?: number;
      followTypes?: string[];
      includeBacklinks?: boolean;
    }
  ): AsyncResult<{
    resources: NormalizedResource[];
    relationships: Array<{
      fromId: ResourceId;
      toId: ResourceId;
      type: string;
      strength: number;
    }>;
  }>;
  
  /** Get book package (normalized) */
  getBookPackage(
    book: BookId,
    language: string,
    owner: string
  ): AsyncResult<{
    book: BookId;
    language: string;
    owner: string;
    resources: NormalizedResource[];
    crossReferences: CrossReference[];
    lastUpdated: Date;
  }>;
  
  /** Optimize cache performance */
  optimize(): AsyncResult<{
    defragmented: boolean;
    indexesRebuilt: number;
    spaceSaved: number;
    performanceImprovement: number; // percentage
  }>;
  
  /** Get comprehensive statistics */
  getStats(): AsyncResult<{
    totalResources: number;
    resourcesByType: Record<string, number>;
    totalCrossReferences: number;
    averageAccessTime: number;
    cacheHitRate: number;
    dirtyResources: number;
    storageUsed: number;
    indexSize: number;
  }>;
}

// ============================================================================
// Cache Factory
// ============================================================================

/**
 * Factory for creating normalized cache services
 */
export interface INormalizedCacheFactory {
  /** Create complete cache manager */
  createCacheManager(): INormalizedCacheManager;
  
  /** Create resource registry */
  createResourceRegistry(): IResourceRegistryService;
  
  /** Create content service */
  createContentService(): INormalizedContentService;
  
  /** Create cross-reference service */
  createCrossReferenceService(): ICrossReferenceService;
  
  /** Create query service */
  createQueryService(): IResourceQueryService;
  
  /** Create synchronization service */
  createSynchronizationService(): ISynchronizationService;
  
  /** Create change tracking service */
  createChangeTrackingService(): IChangeTrackingService;
}
