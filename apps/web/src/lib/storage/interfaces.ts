/**
 * Storage System Interfaces
 * Platform-agnostic storage interfaces for Bible Translation Toolkit
 */

// Core Storage Interfaces
export interface StorageKey {
  server: string
  owner: string
  language: string
  resourceType: string
  contentPath: string
  
  toString(): string
}

export interface StorageResult<T> {
  content: T | null
  metadata: ContentMetadata | null
  found: boolean
  expired: boolean
  stale: boolean
}

export interface StorageItem<T> {
  key: StorageKey
  content: T
  metadata: ContentMetadata
}

export interface StoragePattern {
  server?: string
  owner?: string
  language?: string
  resourceType?: string
  contentPath?: string // Supports wildcards: "translate/*", "books/jon*"
}

// Version Management
export interface VersionMetadata {
  type: VersionType
  identifier: string
  etag?: string
  lastModified?: Date
  checksum?: string
  revision?: number
  serverSpecific?: any
}

export enum VersionType {
  GIT_SHA = "git-sha",
  TIMESTAMP = "timestamp", 
  VERSION_NUMBER = "version",
  ETAG = "etag",
  CHECKSUM = "checksum",
  REVISION = "revision",
  CUSTOM = "custom"
}

// Content Metadata
export interface ContentMetadata {
  id: string
  title: string
  description?: string
  contentType: string
  format: string
  size: number
  version: VersionMetadata
  cachedAt: Date
  dependencies: string[]
  relatedContent: string[]
  
  // Additional properties for different content types
  commitSha?: string
  etag?: string
  lastModified?: Date
}

// Storage Layer Interface
export interface UnifiedStorageLayer {
  // Content operations
  store<T>(key: StorageKey, content: T, metadata: ContentMetadata): Promise<void>
  retrieve<T>(key: StorageKey): Promise<StorageResult<T>>
  exists(key: StorageKey): Promise<boolean>
  remove(key: StorageKey): Promise<void>
  
  // Metadata operations
  getMetadata(key: StorageKey): Promise<ContentMetadata | null>
  setMetadata(key: StorageKey, metadata: ContentMetadata): Promise<void>
  
  // Batch operations
  storeBatch<T>(items: StorageItem<T>[]): Promise<void>
  retrieveBatch<T>(keys: StorageKey[]): Promise<StorageResult<T>[]>
  
  // Cache management
  clear(pattern?: StoragePattern): Promise<void>
  getSize(pattern?: StoragePattern): Promise<number>
  cleanup(maxAge?: number, maxSize?: number): Promise<void>
  getAllByPattern<T>(pattern: StoragePattern): Promise<StorageItem<T>[]>
}

// Platform-specific Storage Adapter
export interface StorageAdapter {
  // Platform identification
  readonly platform: StoragePlatform
  readonly capabilities: StorageCapabilities
  
  // Core storage operations
  store(key: string, data: any, metadata?: any): Promise<void>
  retrieve(key: string): Promise<{ data: any; metadata?: any } | null>
  exists(key: string): Promise<boolean>
  remove(key: string): Promise<void>
  
  // Batch operations
  storeBatch(items: Array<{ key: string; data: any; metadata?: any }>): Promise<void>
  retrieveBatch(keys: string[]): Promise<Array<{ key: string; data: any; metadata?: any } | null>>
  
  // Management operations
  clear(keyPattern?: string): Promise<void>
  getSize(keyPattern?: string): Promise<number>
  getAllKeys(pattern?: string): Promise<string[]>
  
  // Lifecycle
  initialize(): Promise<void>
  close(): Promise<void>
}

export enum StoragePlatform {
  WEB_INDEXEDDB = "web-indexeddb",
  WEB_CACHE_API = "web-cache-api", 
  NODE_FILE_SYSTEM = "node-fs",
  REACT_NATIVE_ASYNC_STORAGE = "rn-async-storage",
  REACT_NATIVE_SQLITE = "rn-sqlite",
  ELECTRON_SQLITE = "electron-sqlite",
  MEMORY = "memory"
}

export interface StorageCapabilities {
  supportsTransactions: boolean
  supportsIndexes: boolean
  supportsBinaryData: boolean
  supportsLargeFiles: boolean
  maxItemSize?: number
  maxTotalSize?: number
  persistent: boolean
}

// Content Type Strategies
export enum ContentType {
  TEXT = "text",
  BINARY = "binary", 
  JSON = "json",
  MEDIA = "media"
}

export interface ContentTypeStrategy {
  contentType: ContentType
  preferredAdapter: StoragePlatform[]
  maxSize?: number
  compression?: boolean
  encryption?: boolean
}

// Error Types
export class StorageError extends Error {
  constructor(
    message: string,
    public code: StorageErrorCode,
    public cause?: Error
  ) {
    super(message)
    this.name = 'StorageError'
  }
}

export enum StorageErrorCode {
  NOT_FOUND = "NOT_FOUND",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  INVALID_KEY = "INVALID_KEY",
  SERIALIZATION_ERROR = "SERIALIZATION_ERROR",
  ADAPTER_ERROR = "ADAPTER_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}
