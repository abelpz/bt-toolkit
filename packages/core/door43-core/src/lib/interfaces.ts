/**
 * Service Interfaces for Door43 Ecosystem
 * Platform-agnostic contracts for all Door43 services
 */

import {
  BookId,
  LanguageCode,

  ResourceId,
  VerseReference,
  AlignmentReference,
  ProcessedScripture,
  TranslationNote,
  TranslationWordsLink,
  TranslationQuestion,
  TranslationWord,
  TranslationAcademyArticle,
  BookTranslationPackage,

  CrossReference,
  WordInteractionResult,
  AsyncResult,
  ServiceResult,
  RuntimeMode,
  PlatformTarget,
  StorageBackend,
  CacheStrategy,
  Door43Config,
  PlatformConfig
} from './types.js';

// ============================================================================
// Core Service Interfaces
// ============================================================================

/**
 * Resource Service Interface
 * Provides access to Door43 resources in both online and offline modes
 */
export interface IResourceService {
  /** Initialize the service */
  initialize(): Promise<void>;
  
  /** Check if service is initialized */
  isInitialized(): boolean;
  
  /** Get available books for current language/organization */
  getAvailableBooks(): AsyncResult<BookId[]>;
  
  /** Get Bible text (ULT/UST) for a book */
  getBibleText(book: BookId, textType: 'literal' | 'simplified'): AsyncResult<ProcessedScripture | null>;
  
  /** Get translation notes for a book */
  getTranslationNotes(book: BookId): AsyncResult<TranslationNote[] | null>;
  
  /** Get translation words links for a book */
  getTranslationWordsLinks(book: BookId): AsyncResult<TranslationWordsLink[] | null>;
  
  /** Get translation questions for a book */
  getTranslationQuestions(book: BookId): AsyncResult<TranslationQuestion[] | null>;
  
  /** Get a specific translation word */
  getTranslationWord(wordId: string): AsyncResult<TranslationWord | null>;
  
  /** Get a specific translation academy article */
  getTranslationAcademyArticle(articleId: string): AsyncResult<TranslationAcademyArticle | null>;
  
  /** Get complete book translation package */
  getBookTranslationPackage(book: BookId, resourceTypes?: ResourceId[]): AsyncResult<BookTranslationPackage>;
  
  /** Search across translation helps */
  searchHelps(query: string, book?: BookId): AsyncResult<any[]>;
  
  /** Clear all caches */
  clearCache(): void;
}

/**
 * Cache Service Interface
 * Provides caching capabilities across different storage backends
 */
export interface ICacheService {
  /** Store data in cache */
  set<T>(key: string, data: T, ttl?: number): AsyncResult<void>;
  
  /** Retrieve data from cache */
  get<T>(key: string): AsyncResult<T | null>;
  
  /** Check if key exists in cache */
  has(key: string): AsyncResult<boolean>;
  
  /** Remove data from cache */
  delete(key: string): AsyncResult<void>;
  
  /** Clear all cache data */
  clear(): AsyncResult<void>;
  
  /** Get cache statistics */
  getStats(): AsyncResult<{
    size: number;
    keys: number;
    hitRate: number;
    memoryUsage?: number;
  }>;
  
  /** Cleanup expired entries */
  cleanup(): AsyncResult<void>;
}

/**
 * Parser Service Interface
 * Provides parsing capabilities for different resource formats
 */
export interface IParserService {
  /** Parse USFM content to ProcessedScripture */
  parseUSFM(content: string, options?: {
    includeAlignment?: boolean;
    book?: BookId;
    language?: LanguageCode;
  }): ServiceResult<ProcessedScripture>;
  
  /** Parse TSV content to structured data */
  parseTSV<T>(content: string, options?: {
    hasHeader?: boolean;
    delimiter?: string;
    quote?: string;
  }): ServiceResult<T[]>;
  
  /** Parse YAML content to object */
  parseYAML<T>(content: string): ServiceResult<T>;
  
  /** Parse Markdown content */
  parseMarkdown(content: string, options?: {
    extractFrontmatter?: boolean;
    processLinks?: boolean;
  }): ServiceResult<{
    content: string;
    frontmatter?: Record<string, any>;
    headings?: Array<{ level: number; text: string; id: string }>;
  }>;
}

/**
 * Alignment Service Interface
 * Provides word-level alignment and cross-reference capabilities
 */
export interface IAlignmentService {
  /** Build alignment index from scripture */
  buildAlignmentIndex(scripture: ProcessedScripture): ServiceResult<void>;
  
  /** Get alignment data for a specific word */
  getAlignmentData(reference: VerseReference, wordIndex: number): ServiceResult<AlignmentReference | null>;
  
  /** Find words with same Strong's number */
  findWordsByStrongs(strongsNumber: string, book?: BookId): ServiceResult<AlignmentReference[]>;
  
  /** Find words with same lemma */
  findWordsByLemma(lemma: string, book?: BookId): ServiceResult<AlignmentReference[]>;
  
  /** Clear alignment index */
  clearIndex(): void;
}

/**
 * Word Interaction Service Interface
 * Handles word tap interactions and cross-resource filtering
 */
export interface IWordInteractionService {
  /** Handle word tap interaction */
  handleWordTap(
    book: BookId,
    chapter: number,
    verse: number,
    wordIndex: number,
    wordText: string
  ): AsyncResult<WordInteractionResult>;
  
  /** Find cross-references for alignment reference */
  findCrossReferences(alignmentRef: AlignmentReference): AsyncResult<CrossReference[]>;
  
  /** Score relevance of cross-references */
  scoreRelevance(
    alignmentRef: AlignmentReference,
    crossRef: CrossReference
  ): number;
}

/**
 * Service Factory Interface
 * Creates and configures service instances for different platforms
 */
export interface IServiceFactory {
  /** Create resource service */
  createResourceService(
    mode: RuntimeMode,
    config: Door43Config,
    platformConfig: PlatformConfig
  ): IResourceService;
  
  /** Create cache service */
  createCacheService(
    backend: StorageBackend,
    strategy: CacheStrategy,
    options?: {
      maxSize?: number;
      defaultTTL?: number;
    }
  ): ICacheService;
  
  /** Create parser service */
  createParserService(): IParserService;
  
  /** Create alignment service */
  createAlignmentService(): IAlignmentService;
  
  /** Create word interaction service */
  createWordInteractionService(
    resourceService: IResourceService,
    alignmentService: IAlignmentService
  ): IWordInteractionService;
}

// ============================================================================
// Storage Backend Interfaces
// ============================================================================

/**
 * Storage Backend Interface
 * Low-level storage operations for different platforms
 */
export interface IStorageBackend {
  /** Store data */
  setItem(key: string, value: string): AsyncResult<void>;
  
  /** Retrieve data */
  getItem(key: string): AsyncResult<string | null>;
  
  /** Remove data */
  removeItem(key: string): AsyncResult<void>;
  
  /** Clear all data */
  clear(): AsyncResult<void>;
  
  /** Get all keys */
  getAllKeys(): AsyncResult<string[]>;
  
  /** Get storage info */
  getStorageInfo(): AsyncResult<{
    totalSize: number;
    availableSize: number;
    usedSize: number;
  }>;
}

/**
 * Network Client Interface
 * HTTP operations for different platforms
 */
export interface INetworkClient {
  /** Make GET request */
  get(url: string, options?: {
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
  }): AsyncResult<{
    status: number;
    headers: Record<string, string>;
    data: any;
  }>;
  
  /** Make POST request */
  post(url: string, data: any, options?: {
    headers?: Record<string, string>;
    timeout?: number;
  }): AsyncResult<{
    status: number;
    headers: Record<string, string>;
    data: any;
  }>;
  
  /** Check network connectivity */
  isOnline(): Promise<boolean>;
}

// ============================================================================
// Event System Interfaces
// ============================================================================

/**
 * Event Emitter Interface
 * Cross-platform event system
 */
export interface IEventEmitter {
  /** Subscribe to event */
  on(event: string, listener: (...args: any[]) => void): void;
  
  /** Unsubscribe from event */
  off(event: string, listener: (...args: any[]) => void): void;
  
  /** Emit event */
  emit(event: string, ...args: any[]): void;
  
  /** Subscribe once */
  once(event: string, listener: (...args: any[]) => void): void;
  
  /** Remove all listeners */
  removeAllListeners(event?: string): void;
}

// ============================================================================
// CLI Testing Interfaces
// ============================================================================

/**
 * CLI Test Runner Interface
 * For testing services via command line
 */
export interface ICLITestRunner {
  /** Run all tests */
  runAllTests(): Promise<CLITestResults>;
  
  /** Run specific test suite */
  runTestSuite(suiteName: string): Promise<CLITestResults>;
  
  /** Run single test */
  runTest(testName: string): Promise<CLITestResult>;
  
  /** List available tests */
  listTests(): string[];
  
  /** Validate test data */
  validateTestData(): Promise<ValidationResults>;
}

export interface CLITestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface CLITestResults {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: CLITestResult[];
}

export interface ValidationResults {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, any>;
}

// ============================================================================
// Configuration Interfaces
// ============================================================================

/**
 * Service Configuration Interface
 */
export interface IServiceConfig {
  /** Runtime mode */
  mode: RuntimeMode;
  
  /** Platform target */
  platform: PlatformTarget;
  
  /** Door43 configuration */
  door43: Door43Config;
  
  /** Platform-specific configuration */
  platformConfig: PlatformConfig;
  
  /** Debug mode */
  debug?: boolean;
  
  /** Feature flags */
  features?: Record<string, boolean>;
}

/**
 * Logger Interface
 * Cross-platform logging
 */
export interface ILogger {
  /** Log debug message */
  debug(message: string, data?: any): void;
  
  /** Log info message */
  info(message: string, data?: any): void;
  
  /** Log warning message */
  warn(message: string, data?: any): void;
  
  /** Log error message */
  error(message: string, error?: Error | any): void;
  
  /** Set log level */
  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void;
}
