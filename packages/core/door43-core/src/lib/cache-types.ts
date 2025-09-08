/**
 * Cache Types for Door43 Resource Management
 * Multi-level caching with repository containers and processed resources
 */

import { BookId, LanguageCode } from './types.js';

// ============================================================================
// Repository Container Types (Scripture Burrito-like structure)
// ============================================================================

export interface RepositoryIdentifier {
  /** Server/platform (e.g., 'door43', 'git.door43.org') */
  server: string;
  /** Organization/owner (e.g., 'unfoldingWord') */
  owner: string;
  /** Repository ID (e.g., 'en_ult', 'en_ta') */
  repoId: string;
  /** Branch or tag reference (e.g., 'master', 'v86') */
  ref: string;
}

export interface RepositoryContainer {
  /** Repository identification */
  id: RepositoryIdentifier;
  /** Repository metadata */
  metadata: RepositoryMetadata;
  /** Processed manifest */
  manifest: ProcessedManifest;
  /** File structure with processed content */
  files: Map<string, ProcessedFile>;
  /** Cache metadata */
  cache: CacheMetadata;
}

export interface RepositoryMetadata {
  /** Repository name */
  name: string;
  /** Description */
  description: string;
  /** Language code */
  language: LanguageCode;
  /** Subject (Bible, Translation Notes, etc.) */
  subject: string;
  /** Stage (prod, preprod, draft) */
  stage: string;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Repository size in bytes */
  size?: number;
  /** Commit hash */
  commitHash?: string;
}

export interface ProcessedManifest {
  /** Dublin Core metadata */
  dublinCore: {
    identifier: string;
    title: string;
    version: string;
    language: LanguageCode;
    subject: string;
    type: string;
    format: string;
  };
  /** Projects with processed paths */
  projects: ProcessedProject[];
  /** Resource type classification */
  resourceType: ResourceType;
}

export interface ProcessedProject {
  /** Project identifier (book ID for Bible resources) */
  identifier: string;
  /** Project title */
  title: string;
  /** Original file path */
  originalPath: string;
  /** Processed file key in container */
  processedKey: string;
  /** Categories */
  categories: string[];
  /** Sort order */
  sort?: number;
}

export interface ProcessedFile {
  /** Original file path */
  originalPath: string;
  /** Raw content (for reference) */
  rawContent?: string;
  /** Processed JSON data */
  processedData: any;
  /** Processing metadata */
  processing: ProcessingMetadata;
  /** File dependencies (for cross-references) */
  dependencies: string[];
}

export interface ProcessingMetadata {
  /** When this file was processed */
  processedAt: Date;
  /** Processing duration in milliseconds */
  processingTimeMs: number;
  /** Parser used */
  parser: string;
  /** Processing options used */
  options: Record<string, any>;
  /** Content hash for change detection */
  contentHash: string;
  /** Processing errors/warnings */
  issues: ProcessingIssue[];
}

export interface ProcessingIssue {
  level: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  context?: string;
}

// ============================================================================
// Cache Strategy Types
// ============================================================================

export type CacheStrategy = 'on-demand' | 'bulk-download' | 'hybrid';

export interface CacheConfiguration {
  /** Primary caching strategy */
  strategy: CacheStrategy;
  /** Storage backend to use */
  storageBackend: 'indexeddb' | 'asyncstorage' | 'filesystem' | 'memory';
  /** Maximum cache size in bytes */
  maxCacheSize: number;
  /** Default TTL for cached items */
  defaultTTL: number;
  /** Enable compression for stored data */
  enableCompression: boolean;
  /** Preload commonly used resources */
  preloadResources: string[];
  /** Auto-cleanup configuration */
  autoCleanup: {
    enabled: boolean;
    interval: number; // milliseconds
    maxAge: number; // milliseconds
  };
}

export interface CacheMetadata {
  /** When this container was created */
  createdAt: Date;
  /** Last accessed timestamp */
  lastAccessedAt: Date;
  /** Access count */
  accessCount: number;
  /** Size in bytes */
  sizeBytes: number;
  /** TTL expiration */
  expiresAt?: Date;
  /** Cache strategy used */
  strategy: CacheStrategy;
  /** Compression used */
  compressed: boolean;
}

// ============================================================================
// Resource Classification
// ============================================================================

export type ResourceType = 
  | 'bible-text'           // ULT, UST, GLT, GST
  | 'translation-notes'    // TN
  | 'translation-words'    // TW
  | 'translation-academy'  // TA
  | 'translation-questions'// TQ
  | 'translation-words-links' // TWL
  | 'obs'                  // Open Bible Stories
  | 'other';

export interface ResourceClassification {
  type: ResourceType;
  /** Whether this resource is book-specific */
  bookSpecific: boolean;
  /** Whether this resource is shared across books */
  shared: boolean;
  /** Expected file patterns */
  filePatterns: string[];
  /** Dependencies on other resource types */
  dependencies: ResourceType[];
}

// ============================================================================
// Cache Operations
// ============================================================================

export interface CacheKey {
  /** Repository identifier */
  repository: RepositoryIdentifier;
  /** Resource path within repository */
  resourcePath?: string;
  /** Additional parameters */
  params?: Record<string, string>;
}

export interface CacheEntry<T = any> {
  /** Cache key */
  key: string;
  /** Cached data */
  data: T;
  /** Cache metadata */
  metadata: CacheMetadata;
}

export interface CacheStats {
  /** Total number of cached repositories */
  repositories: number;
  /** Total number of cached files */
  files: number;
  /** Total cache size in bytes */
  totalSize: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Memory usage breakdown */
  breakdown: {
    repositories: number;
    bibleText: number;
    translationNotes: number;
    translationWords: number;
    translationAcademy: number;
    other: number;
  };
  /** Storage backend info */
  storage: {
    backend: string;
    available: number;
    used: number;
    quota?: number;
  };
}

// ============================================================================
// Bulk Download Types
// ============================================================================

export interface BulkDownloadRequest {
  /** Repository to download */
  repository: RepositoryIdentifier;
  /** Include raw files in cache */
  includeRaw: boolean;
  /** Process files during download */
  processOnDownload: boolean;
  /** File filters (glob patterns) */
  fileFilters?: string[];
  /** Maximum download size */
  maxSize?: number;
}

export interface BulkDownloadResult {
  /** Success status */
  success: boolean;
  /** Repository container created */
  container?: RepositoryContainer;
  /** Download statistics */
  stats: {
    totalFiles: number;
    processedFiles: number;
    totalSize: number;
    downloadTime: number;
    processingTime: number;
  };
  /** Any errors encountered */
  errors: string[];
}

// ============================================================================
// On-Demand Building Types
// ============================================================================

export interface OnDemandRequest {
  /** Repository identifier */
  repository: RepositoryIdentifier;
  /** Specific resource path */
  resourcePath: string;
  /** Processing options */
  options?: Record<string, any>;
  /** Force reprocessing even if cached */
  forceRefresh?: boolean;
}

export interface OnDemandResult<T = any> {
  /** Success status */
  success: boolean;
  /** Processed data */
  data?: T;
  /** Whether this was served from cache */
  fromCache: boolean;
  /** Processing metadata */
  metadata?: ProcessingMetadata;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Cross-Reference Cache Types
// ============================================================================

export interface CrossReferenceIndex {
  /** Strong's number to resource references */
  strongsIndex: Map<string, CrossReferenceEntry[]>;
  /** Lemma to resource references */
  lemmaIndex: Map<string, CrossReferenceEntry[]>;
  /** Support reference to TA articles */
  supportRefIndex: Map<string, string>; // rc:// link to TA path
  /** TW link to TW articles */
  twLinkIndex: Map<string, string>; // rc:// link to TW path
  /** Book to resource files */
  bookIndex: Map<BookId, string[]>; // book to file keys
}

export interface CrossReferenceEntry {
  /** Repository container */
  repository: RepositoryIdentifier;
  /** File key within container */
  fileKey: string;
  /** Specific location within file */
  location: {
    book?: BookId;
    chapter?: number;
    verse?: number;
    lineNumber?: number;
    fieldName?: string;
  };
  /** Reference strength/relevance */
  relevance: number;
}

// ============================================================================
// Export all cache types
// ============================================================================

export * from './cache-types.js';
