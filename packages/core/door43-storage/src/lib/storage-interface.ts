/**
 * Storage Backend Interface
 * Platform-agnostic storage interface for extensible cache system
 */

import { AsyncResult } from '@bt-toolkit/door43-core';

// ============================================================================
// Storage Backend Interface
// ============================================================================

/**
 * Storage backend types
 */
export type StorageType = 
  | 'memory'        // In-memory (fastest, volatile)
  | 'sqlite'        // SQLite database
  | 'indexeddb'     // Web IndexedDB
  | 'localstorage'  // Web localStorage
  | 'asyncstorage'  // React Native AsyncStorage
  | 'filesystem'    // File system
  | 'redis'         // Redis cache
  | 'postgresql'    // PostgreSQL database
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

/**
 * Storage options for individual operations
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

// ============================================================================
// Storage Backend Factory Interface
// ============================================================================

/**
 * Factory for creating storage backend instances
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

export * from './storage-interface.js';
