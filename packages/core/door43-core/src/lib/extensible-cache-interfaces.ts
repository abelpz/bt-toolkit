/**
 * Extensible Cache Interfaces
 * Platform-agnostic cache system with pluggable backends and flexible scoping
 */

import {
  PlatformType,
  PlatformCapabilities,
  StorageType,
  StorageConfig,
  ResourceScope,
  TenantConfig,
  ExtensibleCacheConfig,
  ApplicationProfile
} from './extensible-cache-types.js';
import {
  ResourceId,
  RepositoryIdentifier,
  NormalizedResource
} from './normalized-cache-types.js';
import { AsyncResult } from './types.js';

// ============================================================================
// Storage Backend Interface (local definition)
// ============================================================================

/**
 * Generic storage backend interface
 */
export interface IStorageBackend {
  initialize(config: StorageConfig): AsyncResult<void>;
  isAvailable(): AsyncResult<boolean>;
  getStorageInfo(): AsyncResult<any>;
  set(key: string, value: any, options?: any): AsyncResult<void>;
  get<T = any>(key: string): AsyncResult<T | null>;
  has(key: string): AsyncResult<boolean>;
  delete(key: string): AsyncResult<void>;
  keys(prefix?: string): AsyncResult<string[]>;
  clear(): AsyncResult<void>;
  batch(operations: any[]): AsyncResult<any>;
  getMultiple<T = any>(keys: string[]): AsyncResult<Array<{ key: string; value: T | null }>>;
  setMultiple(entries: Array<{ key: string; value: any; options?: any }>): AsyncResult<void>;
  deleteMultiple(keys: string[]): AsyncResult<void>;
  subscribe(pattern: string, callback: any): AsyncResult<string>;
  unsubscribe(subscriptionId: string): AsyncResult<void>;
  optimize(): AsyncResult<any>;
  close(): AsyncResult<void>;
}

// ============================================================================
// Platform Detection Service
// ============================================================================

/**
 * Detects platform capabilities and recommends optimal configuration
 */
export interface IPlatformDetectionService {
  /** Detect current platform */
  detectPlatform(): PlatformType;
  
  /** Get platform capabilities */
  getPlatformCapabilities(): PlatformCapabilities;
  
  /** Get available storage backends */
  getAvailableStorageBackends(): StorageType[];
  
  /** Recommend storage configuration */
  recommendStorageConfig(requirements: {
    expectedDataSize: number;
    readWriteRatio: number;
    offlineSupport: boolean;
    performanceRequirements: 'low' | 'medium' | 'high';
  }): StorageConfig[];
  
  /** Recommend application profile */
  recommendApplicationProfile(requirements: {
    appType: 'reader' | 'editor' | 'reviewer' | 'server' | 'custom';
    resourceCount: number;
    concurrentUsers: number;
    languages: string[];
    organizations: string[];
  }): ApplicationProfile;
  
  /** Test storage backend performance */
  testStoragePerformance(storageConfig: StorageConfig): AsyncResult<{
    readLatency: number;
    writeLatency: number;
    throughput: number;
    reliability: number;
    score: number;
  }>;
}

// ============================================================================
// Storage Backend Factory
// ============================================================================

/**
 * Creates storage backend instances for different platforms
 */
export interface IStorageBackendFactory {
  /** Register storage backend implementation */
  registerBackend(type: StorageType, implementation: new () => IStorageBackend): void;
  
  /** Create storage backend */
  createBackend(config: StorageConfig): AsyncResult<IStorageBackend>;
  
  /** Get available backend types */
  getAvailableBackends(): StorageType[];
  
  /** Validate storage configuration */
  validateConfig(config: StorageConfig): AsyncResult<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  /** Create multi-layer storage */
  createMultiLayerStorage(configs: Array<{
    name: string;
    config: StorageConfig;
    priority: number;
  }>): AsyncResult<IStorageBackend>;
  
  /** Create replicated storage */
  createReplicatedStorage(
    primary: StorageConfig,
    replicas: StorageConfig[]
  ): AsyncResult<IStorageBackend>;
}

// ============================================================================
// Resource Scope Manager
// ============================================================================

/**
 * Manages resource scoping for different application needs
 */
export interface IResourceScopeManager {
  /** Initialize scope manager */
  initialize(scopes: ResourceScope[]): AsyncResult<void>;
  
  /** Set active scope */
  setActiveScope(scopeId: string): AsyncResult<void>;
  
  /** Get active scope */
  getActiveScope(): AsyncResult<ResourceScope | null>;
  
  /** Check if resource is in scope */
  isResourceInScope(resourceId: ResourceId, scopeId?: string): AsyncResult<boolean>;
  
  /** Filter resources by scope */
  filterResourcesByScope(
    resources: ResourceId[],
    scopeId?: string
  ): AsyncResult<ResourceId[]>;
  
  /** Get scope statistics */
  getScopeStatistics(scopeId: string): AsyncResult<{
    totalResources: number;
    resourcesByType: Record<string, number>;
    resourcesByOrganization: Record<string, number>;
    resourcesByLanguage: Record<string, number>;
    estimatedSize: number;
  }>;
  
  /** Create dynamic scope */
  createDynamicScope(
    name: string,
    criteria: {
      organizations?: string[];
      languages?: string[];
      resourceTypes?: string[];
      books?: string[];
      dateRange?: { from: Date; to: Date };
    }
  ): AsyncResult<ResourceScope>;
  
  /** Optimize scope for performance */
  optimizeScope(scopeId: string): AsyncResult<{
    originalSize: number;
    optimizedSize: number;
    removedResources: ResourceId[];
    recommendations: string[];
  }>;
  
  /** Switch scope with migration */
  switchScope(
    fromScopeId: string,
    toScopeId: string,
    migrationStrategy: 'immediate' | 'lazy' | 'background'
  ): AsyncResult<{
    migrationId: string;
    resourcesToAdd: ResourceId[];
    resourcesToRemove: ResourceId[];
    estimatedTime: number;
  }>;
}

// ============================================================================
// Multi-Tenant Cache Manager
// ============================================================================

/**
 * Manages multi-tenant cache instances
 */
export interface IMultiTenantCacheManager {
  /** Initialize multi-tenant manager */
  initialize(config: {
    tenants: TenantConfig[];
    defaultTenant: string;
    isolation: 'shared' | 'database' | 'instance' | 'physical';
  }): AsyncResult<void>;
  
  /** Create tenant */
  createTenant(config: TenantConfig): AsyncResult<void>;
  
  /** Delete tenant */
  deleteTenant(tenantId: string): AsyncResult<void>;
  
  /** Get tenant cache instance */
  getTenantCache(tenantId: string): AsyncResult<IExtensibleCache>;
  
  /** Switch tenant context */
  switchTenant(tenantId: string): AsyncResult<void>;
  
  /** Get current tenant */
  getCurrentTenant(): AsyncResult<string | null>;
  
  /** List all tenants */
  listTenants(): AsyncResult<TenantConfig[]>;
  
  /** Get tenant statistics */
  getTenantStatistics(tenantId: string): AsyncResult<{
    resourceCount: number;
    storageUsed: number;
    lastActivity: Date;
    activeUsers: number;
    operationsPerSecond: number;
  }>;
  
  /** Migrate tenant data */
  migrateTenant(
    tenantId: string,
    newConfig: TenantConfig
  ): AsyncResult<{
    migrationId: string;
    estimatedTime: number;
    affectedResources: number;
  }>;
  
  /** Backup tenant data */
  backupTenant(tenantId: string): AsyncResult<{
    backupId: string;
    backupSize: number;
    backupLocation: string;
  }>;
  
  /** Restore tenant data */
  restoreTenant(tenantId: string, backupId: string): AsyncResult<void>;
}

// ============================================================================
// Extensible Cache Interface
// ============================================================================

/**
 * Main extensible cache interface
 */
export interface IExtensibleCache {
  /** Initialize cache with configuration */
  initialize(config: ExtensibleCacheConfig): AsyncResult<void>;
  
  /** Get cache configuration */
  getConfiguration(): ExtensibleCacheConfig;
  
  /** Update cache configuration */
  updateConfiguration(updates: Partial<ExtensibleCacheConfig>): AsyncResult<void>;
  
  /** Store resource */
  storeResource(resource: NormalizedResource): AsyncResult<void>;
  
  /** Get resource */
  getResource(resourceId: ResourceId): AsyncResult<NormalizedResource | null>;
  
  /** Get multiple resources */
  getResources(resourceIds: ResourceId[]): AsyncResult<NormalizedResource[]>;
  
  /** Check if resource exists */
  hasResource(resourceId: ResourceId): AsyncResult<boolean>;
  
  /** Delete resource */
  deleteResource(resourceId: ResourceId): AsyncResult<void>;
  
  /** Query resources */
  queryResources(query: {
    scope?: string;
    types?: string[];
    organizations?: string[];
    languages?: string[];
    textSearch?: string;
    limit?: number;
    offset?: number;
  }): AsyncResult<{
    resources: NormalizedResource[];
    totalCount: number;
    hasMore: boolean;
  }>;
  
  /** Batch operations */
  batchOperations(operations: Array<{
    type: 'store' | 'get' | 'delete';
    resourceId: ResourceId;
    resource?: NormalizedResource;
  }>): AsyncResult<Array<{
    resourceId: ResourceId;
    success: boolean;
    result?: any;
    error?: string;
  }>>;
  
  /** Import resources from repository */
  importRepository(
    repository: RepositoryIdentifier,
    options?: {
      scope?: string;
      overwrite?: boolean;
      progressCallback?: (progress: number) => void;
    }
  ): AsyncResult<{
    imported: ResourceId[];
    skipped: ResourceId[];
    failed: Array<{ resourceId: ResourceId; error: string }>;
  }>;
  
  /** Export resources to format */
  exportResources(
    resourceIds: ResourceId[],
    format: 'json' | 'repository' | 'backup',
    options?: any
  ): AsyncResult<{
    data: any;
    metadata: {
      exportedCount: number;
      totalSize: number;
      exportTime: number;
    };
  }>;
  
  /** Get cache statistics */
  getStatistics(): AsyncResult<{
    totalResources: number;
    resourcesByType: Record<string, number>;
    resourcesByScope: Record<string, number>;
    storageUsed: number;
    storageAvailable: number;
    cacheHitRate: number;
    averageResponseTime: number;
    operationsPerSecond: number;
  }>;
  
  /** Optimize cache performance */
  optimize(): AsyncResult<{
    optimizationsApplied: string[];
    performanceImprovement: number;
    spaceSaved: number;
  }>;
  
  /** Clear cache */
  clear(options?: {
    scope?: string;
    types?: string[];
    olderThan?: Date;
  }): AsyncResult<{
    clearedResources: number;
    spaceSaved: number;
  }>;
  
  /** Shutdown cache */
  shutdown(): AsyncResult<void>;
}

// ============================================================================
// Cache Factory
// ============================================================================

/**
 * Factory for creating extensible cache instances
 */
export interface IExtensibleCacheFactory {
  /** Create cache instance */
  createCache(config: ExtensibleCacheConfig): AsyncResult<IExtensibleCache>;
  
  /** Create cache from application profile */
  createCacheFromProfile(
    profileId: string,
    customizations?: Partial<ExtensibleCacheConfig>
  ): AsyncResult<IExtensibleCache>;
  
  /** Create multi-tenant cache */
  createMultiTenantCache(
    tenants: TenantConfig[],
    defaultTenant: string
  ): AsyncResult<IMultiTenantCacheManager>;
  
  /** Register custom storage backend */
  registerStorageBackend(
    type: StorageType,
    implementation: new () => IStorageBackend
  ): void;
  
  /** Register application profile */
  registerApplicationProfile(profile: ApplicationProfile): void;
  
  /** Get available profiles */
  getAvailableProfiles(): ApplicationProfile[];
  
  /** Validate cache configuration */
  validateConfiguration(config: ExtensibleCacheConfig): AsyncResult<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  }>;
}

// ============================================================================
// Platform-Specific Implementations
// ============================================================================

/**
 * Web platform cache implementation
 */
export interface IWebCache extends IExtensibleCache {
  /** Use Service Worker for background sync */
  enableServiceWorkerSync(): AsyncResult<void>;
  
  /** Handle browser storage quota */
  requestStorageQuota(bytes: number): AsyncResult<boolean>;
  
  /** Get storage usage */
  getStorageUsage(): AsyncResult<{
    quota: number;
    usage: number;
    available: number;
  }>;
}

/**
 * Mobile platform cache implementation
 */
export interface IMobileCache extends IExtensibleCache {
  /** Handle app backgrounding */
  onAppBackground(): AsyncResult<void>;
  
  /** Handle app foregrounding */
  onAppForeground(): AsyncResult<void>;
  
  /** Handle low memory warnings */
  onLowMemory(): AsyncResult<void>;
  
  /** Optimize for battery usage */
  optimizeForBattery(): AsyncResult<void>;
}

/**
 * Desktop platform cache implementation
 */
export interface IDesktopCache extends IExtensibleCache {
  /** Use file system watching */
  enableFileSystemWatching(paths: string[]): AsyncResult<void>;
  
  /** Handle system shutdown */
  onSystemShutdown(): AsyncResult<void>;
  
  /** Use native notifications */
  enableNativeNotifications(): AsyncResult<void>;
}

/**
 * Server platform cache implementation
 */
export interface IServerCache extends IExtensibleCache {
  /** Handle clustering */
  enableClustering(nodes: string[]): AsyncResult<void>;
  
  /** Handle load balancing */
  enableLoadBalancing(): AsyncResult<void>;
  
  /** Get health status */
  getHealthStatus(): AsyncResult<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail';
      message?: string;
    }>;
  }>;
  
  /** Enable metrics collection */
  enableMetrics(): AsyncResult<void>;
}

// ============================================================================
// Cache Adapter Interface
// ============================================================================

/**
 * Adapter interface for integrating with existing cache systems
 */
export interface ICacheAdapter {
  /** Adapt existing cache to extensible interface */
  adapt(existingCache: any): IExtensibleCache;
  
  /** Check if cache is compatible */
  isCompatible(existingCache: any): boolean;
  
  /** Get adaptation capabilities */
  getCapabilities(): {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canQuery: boolean;
    canBatch: boolean;
    canSubscribe: boolean;
  };
  
  /** Migrate from existing cache */
  migrate(
    existingCache: any,
    targetCache: IExtensibleCache,
    options?: {
      batchSize?: number;
      continueOnError?: boolean;
      progressCallback?: (progress: number) => void;
    }
  ): AsyncResult<{
    migrated: number;
    failed: number;
    errors: string[];
  }>;
}
