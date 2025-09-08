/**
 * Cache Service Interfaces
 * Multi-level caching for Door43 resources with repository containers
 */

import {
  RepositoryIdentifier,
  RepositoryContainer,
  CacheConfiguration,
  CacheStats,
  BulkDownloadRequest,
  BulkDownloadResult,
  OnDemandRequest,
  OnDemandResult,
  CrossReferenceIndex,
  ProcessedFile,
  ResourceType
} from './cache-types.js';
import { AsyncResult, BookId } from './types.js';

// ============================================================================
// Repository Cache Service
// ============================================================================

/**
 * Repository-level cache management
 * Handles entire repository containers (Scripture Burrito-like structure)
 */
export interface IRepositoryCacheService {
  /** Initialize the cache service */
  initialize(config: CacheConfiguration): AsyncResult<void>;
  
  /** Check if repository is cached */
  hasRepository(repository: RepositoryIdentifier): AsyncResult<boolean>;
  
  /** Get repository container */
  getRepository(repository: RepositoryIdentifier): AsyncResult<RepositoryContainer | null>;
  
  /** Store repository container */
  setRepository(container: RepositoryContainer): AsyncResult<void>;
  
  /** Remove repository from cache */
  removeRepository(repository: RepositoryIdentifier): AsyncResult<void>;
  
  /** List all cached repositories */
  listRepositories(): AsyncResult<RepositoryIdentifier[]>;
  
  /** Get cache statistics */
  getStats(): AsyncResult<CacheStats>;
  
  /** Cleanup expired entries */
  cleanup(): AsyncResult<void>;
  
  /** Clear all cache */
  clear(): AsyncResult<void>;
}

// ============================================================================
// Resource Cache Service
// ============================================================================

/**
 * File-level cache management within repositories
 * Handles individual processed files and cross-references
 */
export interface IResourceCacheService {
  /** Get processed file from repository */
  getFile(
    repository: RepositoryIdentifier,
    filePath: string
  ): AsyncResult<ProcessedFile | null>;
  
  /** Store processed file in repository */
  setFile(
    repository: RepositoryIdentifier,
    filePath: string,
    file: ProcessedFile
  ): AsyncResult<void>;
  
  /** Check if file exists in cache */
  hasFile(
    repository: RepositoryIdentifier,
    filePath: string
  ): AsyncResult<boolean>;
  
  /** Get all files of specific type */
  getFilesByType(
    repository: RepositoryIdentifier,
    resourceType: ResourceType
  ): AsyncResult<ProcessedFile[]>;
  
  /** Get files for specific book */
  getFilesForBook(
    repository: RepositoryIdentifier,
    book: BookId
  ): AsyncResult<ProcessedFile[]>;
  
  /** Remove file from cache */
  removeFile(
    repository: RepositoryIdentifier,
    filePath: string
  ): AsyncResult<void>;
}

// ============================================================================
// Bulk Download Service
// ============================================================================

/**
 * Bulk repository download and processing
 * Downloads entire repository as ZIP and processes all files
 */
export interface IBulkDownloadService {
  /** Download entire repository */
  downloadRepository(request: BulkDownloadRequest): AsyncResult<BulkDownloadResult>;
  
  /** Check download progress */
  getDownloadProgress(repository: RepositoryIdentifier): AsyncResult<{
    inProgress: boolean;
    progress: number; // 0-1
    stage: 'downloading' | 'extracting' | 'processing' | 'caching';
    filesProcessed: number;
    totalFiles: number;
  }>;
  
  /** Cancel ongoing download */
  cancelDownload(repository: RepositoryIdentifier): AsyncResult<void>;
  
  /** List available downloads */
  listAvailableDownloads(): AsyncResult<RepositoryIdentifier[]>;
}

// ============================================================================
// On-Demand Building Service
// ============================================================================

/**
 * On-demand resource processing and caching
 * Fetches and processes individual files as needed
 */
export interface IOnDemandBuildService {
  /** Build resource on demand */
  buildResource<T = any>(request: OnDemandRequest): AsyncResult<OnDemandResult<T>>;
  
  /** Preload commonly used resources */
  preloadResources(
    repository: RepositoryIdentifier,
    resourcePaths: string[]
  ): AsyncResult<void>;
  
  /** Check if resource is being built */
  isBuildingResource(
    repository: RepositoryIdentifier,
    resourcePath: string
  ): AsyncResult<boolean>;
  
  /** Get build queue status */
  getBuildQueue(): AsyncResult<{
    pending: OnDemandRequest[];
    inProgress: OnDemandRequest[];
    completed: number;
    failed: number;
  }>;
}

// ============================================================================
// Cross-Reference Cache Service
// ============================================================================

/**
 * Cross-reference indexing and lookup
 * Maintains indexes for fast cross-resource navigation
 */
export interface ICrossReferenceCacheService {
  /** Build cross-reference index for repository */
  buildIndex(repository: RepositoryIdentifier): AsyncResult<void>;
  
  /** Get cross-reference index */
  getIndex(repository: RepositoryIdentifier): AsyncResult<CrossReferenceIndex | null>;
  
  /** Find resources by Strong's number */
  findByStrongs(
    repository: RepositoryIdentifier,
    strongsNumber: string
  ): AsyncResult<ProcessedFile[]>;
  
  /** Find resources by lemma */
  findByLemma(
    repository: RepositoryIdentifier,
    lemma: string
  ): AsyncResult<ProcessedFile[]>;
  
  /** Resolve support reference to TA article */
  resolveSupportReference(
    repository: RepositoryIdentifier,
    supportRef: string
  ): AsyncResult<string | null>; // Returns TA path
  
  /** Resolve TW link to TW article */
  resolveTWLink(
    repository: RepositoryIdentifier,
    twLink: string
  ): AsyncResult<string | null>; // Returns TW path
  
  /** Get all resources for book */
  getBookResources(
    repository: RepositoryIdentifier,
    book: BookId
  ): AsyncResult<ProcessedFile[]>;
  
  /** Update index incrementally */
  updateIndex(
    repository: RepositoryIdentifier,
    filePath: string,
    file: ProcessedFile
  ): AsyncResult<void>;
}

// ============================================================================
// Unified Cache Manager
// ============================================================================

/**
 * High-level cache management
 * Coordinates all cache services and strategies
 */
export interface ICacheManager {
  /** Initialize cache manager */
  initialize(config: CacheConfiguration): AsyncResult<void>;
  
  /** Get or create repository container */
  getOrCreateRepository(
    repository: RepositoryIdentifier,
    strategy?: 'on-demand' | 'bulk'
  ): AsyncResult<RepositoryContainer>;
  
  /** Get processed resource */
  getResource<T = any>(
    repository: RepositoryIdentifier,
    resourcePath: string,
    options?: {
      forceRefresh?: boolean;
      includeRaw?: boolean;
    }
  ): AsyncResult<T | null>;
  
  /** Ensure resources are available for book */
  ensureBookResources(
    repository: RepositoryIdentifier,
    book: BookId,
    resourceTypes?: ResourceType[]
  ): AsyncResult<void>;
  
  /** Prefetch related resources */
  prefetchRelated(
    repository: RepositoryIdentifier,
    resourcePath: string
  ): AsyncResult<void>;
  
  /** Get comprehensive cache statistics */
  getComprehensiveStats(): AsyncResult<{
    repositories: CacheStats;
    crossReferences: {
      totalIndexes: number;
      totalEntries: number;
      indexSize: number;
    };
    performance: {
      hitRate: number;
      avgResponseTime: number;
      cacheEfficiency: number;
    };
  }>;
  
  /** Optimize cache (cleanup, defrag, etc.) */
  optimize(): AsyncResult<{
    freedSpace: number;
    optimizedRepositories: number;
    rebuildIndexes: number;
  }>;
  
  /** Export cache for backup */
  exportCache(options?: {
    includeRaw?: boolean;
    repositories?: RepositoryIdentifier[];
  }): AsyncResult<Blob | Buffer>;
  
  /** Import cache from backup */
  importCache(data: Blob | Buffer): AsyncResult<{
    imported: number;
    skipped: number;
    errors: string[];
  }>;
}

// ============================================================================
// Cache Event System
// ============================================================================

export interface CacheEvent {
  type: 'repository-added' | 'repository-removed' | 'file-processed' | 
        'index-updated' | 'cache-full' | 'cleanup-completed';
  repository?: RepositoryIdentifier;
  filePath?: string;
  data?: any;
  timestamp: Date;
}

export interface ICacheEventEmitter {
  /** Subscribe to cache events */
  on(event: CacheEvent['type'], listener: (event: CacheEvent) => void): void;
  
  /** Unsubscribe from cache events */
  off(event: CacheEvent['type'], listener: (event: CacheEvent) => void): void;
  
  /** Emit cache event */
  emit(event: CacheEvent): void;
}

// ============================================================================
// Cache Strategy Factory
// ============================================================================

export interface ICacheStrategyFactory {
  /** Create cache manager with specific strategy */
  createCacheManager(
    strategy: 'on-demand' | 'bulk' | 'hybrid',
    config: CacheConfiguration
  ): ICacheManager;
  
  /** Create repository cache service */
  createRepositoryCache(config: CacheConfiguration): IRepositoryCacheService;
  
  /** Create resource cache service */
  createResourceCache(config: CacheConfiguration): IResourceCacheService;
  
  /** Create bulk download service */
  createBulkDownloadService(config: CacheConfiguration): IBulkDownloadService;
  
  /** Create on-demand build service */
  createOnDemandBuildService(config: CacheConfiguration): IOnDemandBuildService;
  
  /** Create cross-reference cache service */
  createCrossReferenceCache(config: CacheConfiguration): ICrossReferenceCacheService;
}
