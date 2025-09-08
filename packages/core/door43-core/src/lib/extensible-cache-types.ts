/**
 * Extensible Cache Types for Multi-Platform, Multi-Tenant Systems
 * Platform-agnostic cache with pluggable storage backends and flexible scoping
 */

// Note: ResourceId is defined in normalized-cache-types.js
// import { RepositoryIdentifier } from './cache-types.js';
import { AsyncResult } from './types.js';

// ============================================================================
// Platform Abstraction
// ============================================================================

/**
 * Platform type identification
 */
export type PlatformType = 'web' | 'mobile' | 'desktop' | 'server' | 'cloud' | 'edge';

/**
 * Platform capabilities
 */
export interface PlatformCapabilities {
  /** Platform type */
  type: PlatformType;
  /** Available storage types */
  storageTypes: StorageType[];
  /** Maximum storage quota */
  maxStorageQuota?: number;
  /** Supports background processing */
  supportsBackground: boolean;
  /** Supports real-time updates */
  supportsRealTime: boolean;
  /** Supports file system access */
  supportsFileSystem: boolean;
  /** Supports network requests */
  supportsNetwork: boolean;
  /** Supports compression */
  supportsCompression: boolean;
  /** Supports encryption */
  supportsEncryption: boolean;
  /** Concurrent operation limit */
  maxConcurrentOps: number;
  /** Memory constraints */
  memoryConstraints?: {
    maxCacheSize: number;
    lowMemoryThreshold: number;
  };
}

/**
 * Storage backend types
 */
export type StorageType = 
  | 'memory'        // In-memory (fastest, volatile)
  | 'indexeddb'     // Web IndexedDB
  | 'localstorage'  // Web localStorage
  | 'asyncstorage'  // React Native AsyncStorage
  | 'sqlite'        // SQLite database
  | 'filesystem'    // File system
  | 'redis'         // Redis cache
  | 'postgresql'    // PostgreSQL database
  | 'mongodb'       // MongoDB
  | 's3'            // AWS S3
  | 'dynamodb'      // AWS DynamoDB
  | 'firestore'     // Google Firestore
  | 'custom';       // Custom implementation

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Storage type */
  type: StorageType;
  /** Storage-specific options */
  options: Record<string, any>;
  /** Connection string/URL */
  connectionString?: string;
  /** Encryption settings */
  encryption?: {
    enabled: boolean;
    algorithm: string;
    key?: string;
  };
  /** Compression settings */
  compression?: {
    enabled: boolean;
    algorithm: 'gzip' | 'brotli' | 'lz4';
    level?: number;
  };
  /** Performance tuning */
  performance?: {
    batchSize: number;
    connectionPoolSize?: number;
    timeout: number;
    retryAttempts: number;
  };
}

// ============================================================================
// Storage Backend Interface
// ============================================================================

/**
 * Generic storage backend interface
 * All platform-specific adapters implement this interface
 */
export interface IStorageBackend {
  /** Initialize storage backend */
  initialize(config: StorageConfig): AsyncResult<void>;
  
  /** Check if storage is available */
  isAvailable(): AsyncResult<boolean>;
  
  /** Get storage info */
  getStorageInfo(): AsyncResult<StorageInfo>;
  
  /** Store data */
  set(key: string, value: any, options?: StorageOptions): AsyncResult<void>;
  
  /** Retrieve data */
  get<T = any>(key: string): AsyncResult<T | null>;
  
  /** Check if key exists */
  has(key: string): AsyncResult<boolean>;
  
  /** Delete data */
  delete(key: string): AsyncResult<void>;
  
  /** List keys with optional prefix */
  keys(prefix?: string): AsyncResult<string[]>;
  
  /** Clear all data */
  clear(): AsyncResult<void>;
  
  /** Batch operations */
  batch(operations: BatchStorageOperation[]): AsyncResult<BatchStorageResult>;
  
  /** Get multiple values */
  getMultiple<T = any>(keys: string[]): AsyncResult<Array<{ key: string; value: T | null }>>;
  
  /** Set multiple values */
  setMultiple(entries: Array<{ key: string; value: any; options?: StorageOptions }>): AsyncResult<void>;
  
  /** Delete multiple keys */
  deleteMultiple(keys: string[]): AsyncResult<void>;
  
  /** Subscribe to changes */
  subscribe(pattern: string, callback: (event: StorageChangeEvent) => void): AsyncResult<string>; // Returns subscription ID
  
  /** Unsubscribe from changes */
  unsubscribe(subscriptionId: string): AsyncResult<void>;
  
  /** Optimize storage */
  optimize(): AsyncResult<StorageOptimizationResult>;
  
  /** Close/cleanup storage */
  close(): AsyncResult<void>;
}

/**
 * Storage information
 */
export interface StorageInfo {
  /** Storage type */
  type: StorageType;
  /** Available space (bytes) */
  availableSpace?: number;
  /** Used space (bytes) */
  usedSpace: number;
  /** Total quota (bytes) */
  totalQuota?: number;
  /** Storage version */
  version: string;
  /** Connection status */
  connected: boolean;
  /** Performance metrics */
  performance: {
    avgReadTime: number;
    avgWriteTime: number;
    errorRate: number;
  };
}

/**
 * Storage options
 */
export interface StorageOptions {
  /** Time to live (TTL) in milliseconds */
  ttl?: number;
  /** Compression override */
  compress?: boolean;
  /** Encryption override */
  encrypt?: boolean;
  /** Priority for eviction */
  priority?: 'low' | 'normal' | 'high';
  /** Tags for categorization */
  tags?: string[];
  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Batch storage operation
 */
export interface BatchStorageOperation {
  /** Operation type */
  type: 'set' | 'get' | 'delete' | 'has';
  /** Key */
  key: string;
  /** Value (for set operations) */
  value?: any;
  /** Options */
  options?: StorageOptions;
}

/**
 * Batch storage result
 */
export interface BatchStorageResult {
  /** Operation results */
  results: Array<{
    key: string;
    success: boolean;
    value?: any;
    error?: string;
  }>;
  /** Total execution time */
  executionTime: number;
}

/**
 * Storage change event
 */
export interface StorageChangeEvent {
  /** Event type */
  type: 'set' | 'delete' | 'clear';
  /** Key that changed */
  key: string;
  /** New value (for set events) */
  newValue?: any;
  /** Old value (for delete events) */
  oldValue?: any;
  /** Event timestamp */
  timestamp: Date;
}

/**
 * Storage optimization result
 */
export interface StorageOptimizationResult {
  /** Space freed (bytes) */
  spaceFreed: number;
  /** Operations performed */
  operations: string[];
  /** Time taken */
  optimizationTime: number;
  /** Performance improvement */
  performanceImprovement?: number;
}

// ============================================================================
// Resource Scoping System
// ============================================================================

/**
 * Resource scope definition
 * Defines which resources an application instance should cache
 */
export interface ResourceScope {
  /** Scope identifier */
  id: string;
  /** Scope name */
  name: string;
  /** Scope description */
  description: string;
  /** Organizations to include */
  organizations: OrganizationScope[];
  /** Languages to include */
  languages: string[];
  /** Resource types to include */
  resourceTypes: string[];
  /** Books to include (for Bible resources) */
  books?: string[];
  /** Custom filters */
  filters?: ResourceFilter[];
  /** Maximum cache size */
  maxCacheSize?: number;
  /** Priority settings */
  priority: ScopePriority;
}

/**
 * Organization scope
 */
export interface OrganizationScope {
  /** Organization identifier */
  organizationId: string;
  /** Repositories to include */
  repositories: string[];
  /** Exclude specific repositories */
  excludeRepositories?: string[];
  /** Include only specific branches/tags */
  refs?: string[];
}

/**
 * Resource filter
 */
export interface ResourceFilter {
  /** Filter type */
  type: 'include' | 'exclude';
  /** Filter criteria */
  criteria: {
    /** Resource ID pattern */
    resourceIdPattern?: string;
    /** Metadata filters */
    metadata?: Record<string, any>;
    /** Content filters */
    content?: Record<string, any>;
    /** Date filters */
    dateRange?: {
      from?: Date;
      to?: Date;
    };
  };
}

/**
 * Scope priority settings
 */
export interface ScopePriority {
  /** Default priority for resources in this scope */
  default: 'low' | 'normal' | 'high' | 'critical';
  /** Per-resource-type priorities */
  perType?: Record<string, 'low' | 'normal' | 'high' | 'critical'>;
  /** Per-organization priorities */
  perOrganization?: Record<string, 'low' | 'normal' | 'high' | 'critical'>;
}

// ============================================================================
// Multi-Tenant Support
// ============================================================================

/**
 * Tenant configuration
 */
export interface TenantConfig {
  /** Tenant identifier */
  tenantId: string;
  /** Tenant name */
  name: string;
  /** Resource scopes for this tenant */
  scopes: ResourceScope[];
  /** Storage configuration */
  storage: StorageConfig;
  /** Isolation level */
  isolation: TenantIsolation;
  /** Resource limits */
  limits: TenantLimits;
  /** Permissions */
  permissions: TenantPermissions;
}

/**
 * Tenant isolation level
 */
export type TenantIsolation = 
  | 'shared'      // Shared storage with tenant prefixes
  | 'database'    // Separate database per tenant
  | 'instance'    // Separate cache instance per tenant
  | 'physical';   // Separate physical storage

/**
 * Tenant resource limits
 */
export interface TenantLimits {
  /** Maximum storage space */
  maxStorageSize: number;
  /** Maximum number of resources */
  maxResources: number;
  /** Maximum concurrent operations */
  maxConcurrentOps: number;
  /** Rate limiting */
  rateLimit: {
    requestsPerSecond: number;
    burstSize: number;
  };
  /** Bandwidth limits */
  bandwidth?: {
    maxBytesPerSecond: number;
    maxBytesPerDay: number;
  };
}

/**
 * Tenant permissions
 */
export interface TenantPermissions {
  /** Can read resources */
  canRead: boolean;
  /** Can write resources */
  canWrite: boolean;
  /** Can delete resources */
  canDelete: boolean;
  /** Can create new resources */
  canCreate: boolean;
  /** Can sync with servers */
  canSync: boolean;
  /** Can access real-time updates */
  canRealTime: boolean;
  /** Allowed resource types */
  allowedResourceTypes: string[];
  /** Allowed organizations */
  allowedOrganizations: string[];
}

// ============================================================================
// Cache Configuration
// ============================================================================

/**
 * Extensible cache configuration
 */
export interface ExtensibleCacheConfig {
  /** Platform capabilities */
  platform: PlatformCapabilities;
  /** Storage backend configuration */
  storage: StorageBackendConfig;
  /** Resource scoping */
  scoping: ScopingConfig;
  /** Multi-tenant configuration */
  multiTenant?: MultiTenantConfig;
  /** Performance tuning */
  performance: PerformanceConfig;
  /** Feature flags */
  features: FeatureFlags;
}

/**
 * Storage backend configuration
 */
export interface StorageBackendConfig {
  /** Primary storage backend */
  primary: StorageConfig;
  /** Secondary/backup storage */
  secondary?: StorageConfig;
  /** Cache layers */
  layers: Array<{
    name: string;
    storage: StorageConfig;
    ttl: number;
    maxSize: number;
  }>;
  /** Fallback strategy */
  fallbackStrategy: 'fail' | 'memory' | 'readonly';
}

/**
 * Scoping configuration
 */
export interface ScopingConfig {
  /** Default scope */
  defaultScope: ResourceScope;
  /** Available scopes */
  availableScopes: ResourceScope[];
  /** Dynamic scoping enabled */
  dynamicScoping: boolean;
  /** Scope switching strategy */
  scopeSwitchStrategy: 'immediate' | 'lazy' | 'background';
}

/**
 * Multi-tenant configuration
 */
export interface MultiTenantConfig {
  /** Multi-tenancy enabled */
  enabled: boolean;
  /** Default tenant */
  defaultTenant: string;
  /** Tenant configurations */
  tenants: TenantConfig[];
  /** Tenant resolution strategy */
  tenantResolution: 'header' | 'subdomain' | 'path' | 'custom';
  /** Custom tenant resolver */
  customResolver?: (context: any) => string;
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  /** Memory management */
  memory: {
    maxCacheSize: number;
    evictionStrategy: 'lru' | 'lfu' | 'ttl' | 'priority';
    gcInterval: number;
  };
  /** Concurrency settings */
  concurrency: {
    maxConcurrentReads: number;
    maxConcurrentWrites: number;
    queueSize: number;
  };
  /** Batching settings */
  batching: {
    enabled: boolean;
    batchSize: number;
    batchTimeout: number;
  };
  /** Prefetching */
  prefetching: {
    enabled: boolean;
    strategy: 'aggressive' | 'conservative' | 'adaptive';
    maxPrefetchSize: number;
  };
}

/**
 * Feature flags
 */
export interface FeatureFlags {
  /** Enable compression */
  compression: boolean;
  /** Enable encryption */
  encryption: boolean;
  /** Enable real-time updates */
  realTimeUpdates: boolean;
  /** Enable cross-reference indexing */
  crossReferenceIndexing: boolean;
  /** Enable collaborative editing */
  collaborativeEditing: boolean;
  /** Enable offline support */
  offlineSupport: boolean;
  /** Enable analytics */
  analytics: boolean;
  /** Enable debugging */
  debugging: boolean;
}

// ============================================================================
// Application Profiles
// ============================================================================

/**
 * Pre-defined application profiles for common use cases
 */
export interface ApplicationProfile {
  /** Profile identifier */
  id: string;
  /** Profile name */
  name: string;
  /** Profile description */
  description: string;
  /** Recommended configuration */
  config: ExtensibleCacheConfig;
  /** Resource scope templates */
  scopeTemplates: ResourceScope[];
  /** Performance characteristics */
  characteristics: {
    /** Expected resource count */
    expectedResourceCount: number;
    /** Read/write ratio */
    readWriteRatio: number;
    /** Concurrent users */
    concurrentUsers: number;
    /** Offline usage */
    offlineUsage: boolean;
    /** Real-time requirements */
    realTimeRequirements: boolean;
  };
}

/**
 * Common application profiles
 */
export const APPLICATION_PROFILES: Record<string, ApplicationProfile> = {
  BIBLE_READER: {
    id: 'bible-reader',
    name: 'Bible Reader App',
    description: 'Read-only Bible app with minimal resource requirements',
    config: {
      // Optimized for reading, minimal storage
    } as ExtensibleCacheConfig,
    scopeTemplates: [
      {
        id: 'single-language-bible',
        name: 'Single Language Bible',
        description: 'Bible text only for one language',
        organizations: [{ organizationId: 'unfoldingWord', repositories: ['*_ult', '*_ust'] }],
        languages: ['en'],
        resourceTypes: ['bible-verse'],
        priority: { default: 'high' }
      } as ResourceScope
    ],
    characteristics: {
      expectedResourceCount: 31000, // ~31k verses
      readWriteRatio: 100, // Read-only
      concurrentUsers: 1,
      offlineUsage: true,
      realTimeRequirements: false
    }
  },
  
  TRANSLATION_TOOL: {
    id: 'translation-tool',
    name: 'Translation Tool',
    description: 'Full-featured translation application',
    config: {
      // Full features enabled
    } as ExtensibleCacheConfig,
    scopeTemplates: [
      {
        id: 'full-translation-resources',
        name: 'Full Translation Resources',
        description: 'All resources for translation work',
        organizations: [{ organizationId: 'unfoldingWord', repositories: ['*'] }],
        languages: ['en', 'es'], // Source and target
        resourceTypes: ['bible-verse', 'translation-note', 'translation-word', 'translation-academy', 'translation-question'],
        priority: { default: 'high' }
      } as ResourceScope
    ],
    characteristics: {
      expectedResourceCount: 100000, // Full resource set
      readWriteRatio: 3, // More reads than writes
      concurrentUsers: 1,
      offlineUsage: true,
      realTimeRequirements: false
    }
  },
  
  REVIEW_PLATFORM: {
    id: 'review-platform',
    name: 'Review Platform',
    description: 'Multi-organization collaborative review system',
    config: {
      // Multi-tenant, collaborative features
    } as ExtensibleCacheConfig,
    scopeTemplates: [
      {
        id: 'multi-org-review',
        name: 'Multi-Organization Review',
        description: 'Resources from multiple organizations for review',
        organizations: [
          { organizationId: 'unfoldingWord', repositories: ['*'] },
          { organizationId: 'WA', repositories: ['*'] },
          { organizationId: 'GLO', repositories: ['*'] }
        ],
        languages: ['*'], // All languages
        resourceTypes: ['*'], // All types
        priority: { default: 'normal' }
      } as ResourceScope
    ],
    characteristics: {
      expectedResourceCount: 500000, // Multi-org resources
      readWriteRatio: 5, // Review-heavy
      concurrentUsers: 50,
      offlineUsage: false,
      realTimeRequirements: true
    }
  },
  
  SERVER_API: {
    id: 'server-api',
    name: 'Server API',
    description: 'High-performance server-side API',
    config: {
      // Server-optimized, multi-tenant
    } as ExtensibleCacheConfig,
    scopeTemplates: [
      {
        id: 'all-resources',
        name: 'All Resources',
        description: 'Complete resource collection for API serving',
        organizations: [{ organizationId: '*', repositories: ['*'] }],
        languages: ['*'],
        resourceTypes: ['*'],
        priority: { default: 'normal' }
      } as ResourceScope
    ],
    characteristics: {
      expectedResourceCount: 1000000, // Complete collection
      readWriteRatio: 20, // API serving
      concurrentUsers: 1000,
      offlineUsage: false,
      realTimeRequirements: true
    }
  }
};

export * from './extensible-cache-types.js';
