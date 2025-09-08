/**
 * Offline Cache Service
 * Provides persistent storage for scripture and translation notes using IndexedDB
 * Enables offline functionality when network is unavailable
 */

import type { ProcessedScripture, ProcessingResult } from './usfm-processor';
import type { Door43Resource, TranslationNote } from './door43-api';

// Cache database configuration
const DB_NAME = 'BT_Toolkit_Cache';
const DB_VERSION = 3; // Incremented to include repo_metadata store

// Object store names
const STORES = {
  SCRIPTURE: 'scripture',
  TRANSLATION_NOTES: 'translation_notes',
  MANIFESTS: 'manifests',
  METADATA: 'metadata',
  REPO_METADATA: 'repo_metadata'
} as const;

// Door43 resource context for cache keys
export interface Door43ResourceContext {
  organization: string;
  language: string;
  resourceType: string;
}

// Cache entry interfaces
interface CachedScripture {
  id: string; // composite key: org/lang/resource/book
  organization: string;
  language: string;
  resourceType: string;
  bookName: string;
  resource: Door43Resource;
  processedScripture: ProcessedScripture;
  processingResult: ProcessingResult;
  timestamp: number;
  lastAccessed: number;
  sha?: string; // SHA hash for cache invalidation
  fileSize?: number;
  lastModified?: string;
}

interface CachedTranslationNotes {
  id: string; // composite key: org/lang/resource/book or org/lang/resource/book-chapter
  organization: string;
  language: string;
  resourceType: string;
  bookName: string;
  chapter?: number;
  resource: Door43Resource;
  notes: TranslationNote[];
  timestamp: number;
  lastAccessed: number;
  sha?: string; // SHA hash for cache invalidation
  fileSize?: number;
  lastModified?: string;
}

interface CachedManifest {
  id: string; // composite key: org/lang/resource
  context: Door43ResourceContext;
  manifestContent: string; // Raw YAML content
  parsedBooks: Array<{
    code: string;
    name: string;
    testament: 'OT' | 'NT';
    chapters: number;
    available: boolean;
  }>;
  timestamp: number;
  lastAccessed: number;
  sha?: string; // SHA hash for cache invalidation
  fileSize?: number;
  lastModified?: string;
}

interface CachedRepoMetadata {
  id: string; // composite key: org/repo
  organization: string;
  repositoryId: string;
  metadata: Door43Resource;
  timestamp: number;
  lastAccessed: number;
}

interface CacheMetadata {
  id: string;
  totalSize: number;
  lastCleanup: number;
  entries: {
    scripture: number;
    translationNotes: number;
    repoMetadata: number;
  };
}

class OfflineCacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Generate a composite cache key from Door43 context and book name
   */
  private generateCacheKey(context: Door43ResourceContext, bookName: string, chapter?: number): string {
    const baseKey = `${context.organization}/${context.language}/${context.resourceType}/${bookName.toLowerCase()}`;
    return chapter ? `${baseKey}-${chapter}` : baseKey;
  }

  /**
   * Generate a composite cache key for manifests
   */
  private generateManifestCacheKey(context: Door43ResourceContext): string {
    return `${context.organization}/${context.language}/${context.resourceType}`;
  }



  /**
   * Initialize the IndexedDB database
   */
  private async initDB(): Promise<void> {
    if (this.db) return;
    
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create scripture store
        if (!db.objectStoreNames.contains(STORES.SCRIPTURE)) {
          const scriptureStore = db.createObjectStore(STORES.SCRIPTURE, { keyPath: 'id' });
          scriptureStore.createIndex('bookName', 'bookName', { unique: false });
          scriptureStore.createIndex('timestamp', 'timestamp', { unique: false });
          scriptureStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        // Create translation notes store
        if (!db.objectStoreNames.contains(STORES.TRANSLATION_NOTES)) {
          const notesStore = db.createObjectStore(STORES.TRANSLATION_NOTES, { keyPath: 'id' });
          notesStore.createIndex('bookName', 'bookName', { unique: false });
          notesStore.createIndex('chapter', 'chapter', { unique: false });
          notesStore.createIndex('timestamp', 'timestamp', { unique: false });
          notesStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        // Create manifests store
        if (!db.objectStoreNames.contains(STORES.MANIFESTS)) {
          const manifestsStore = db.createObjectStore(STORES.MANIFESTS, { keyPath: 'id' });
          manifestsStore.createIndex('organization', 'context.organization', { unique: false });
          manifestsStore.createIndex('language', 'context.language', { unique: false });
          manifestsStore.createIndex('resourceType', 'context.resourceType', { unique: false });
          manifestsStore.createIndex('timestamp', 'timestamp', { unique: false });
          manifestsStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'id' });
        }

        // Create repository metadata store
        if (!db.objectStoreNames.contains(STORES.REPO_METADATA)) {
          const repoMetadataStore = db.createObjectStore(STORES.REPO_METADATA, { keyPath: 'id' });
          repoMetadataStore.createIndex('organization', 'organization', { unique: false });
          repoMetadataStore.createIndex('repositoryId', 'repositoryId', { unique: false });
          repoMetadataStore.createIndex('timestamp', 'timestamp', { unique: false });
          repoMetadataStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        console.log('📦 IndexedDB stores created/updated');
      };
    });

    await this.initPromise;
  }

  /**
   * Cache scripture data
   */
  async cacheScripture(
    context: Door43ResourceContext,
    bookName: string,
    resource: Door43Resource,
    processedScripture: ProcessedScripture,
    processingResult: ProcessingResult,
    fileMetadata?: {
      sha: string;
      size: number;
      lastModified: string;
    }
  ): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([STORES.SCRIPTURE], 'readwrite');
    const store = transaction.objectStore(STORES.SCRIPTURE);

    const cacheKey = this.generateCacheKey(context, bookName);
    const cacheEntry: CachedScripture = {
      id: cacheKey,
      organization: context.organization,
      language: context.language,
      resourceType: context.resourceType,
      bookName: bookName.toLowerCase(),
      resource,
      processedScripture,
      processingResult,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      sha: fileMetadata?.sha,
      fileSize: fileMetadata?.size,
      lastModified: fileMetadata?.lastModified
    };

    return new Promise((resolve, reject) => {
      const request = store.put(cacheEntry);
      
      request.onsuccess = () => {
        console.log(`💾 Cached scripture for ${context.organization}/${context.language}/${context.resourceType}/${bookName}`);
        this.updateMetadata();
        resolve();
      };
      
      request.onerror = () => {
        console.error(`❌ Failed to cache scripture for ${bookName}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Cache translation notes
   */
  async cacheTranslationNotes(
    context: Door43ResourceContext,
    bookName: string,
    resource: Door43Resource,
    notes: TranslationNote[],
    chapter?: number
  ): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([STORES.TRANSLATION_NOTES], 'readwrite');
    const store = transaction.objectStore(STORES.TRANSLATION_NOTES);

    const cacheKey = this.generateCacheKey(context, bookName, chapter);
    const cacheEntry: CachedTranslationNotes = {
      id: cacheKey,
      organization: context.organization,
      language: context.language,
      resourceType: context.resourceType,
      bookName: bookName.toLowerCase(),
      chapter,
      resource,
      notes,
      timestamp: Date.now(),
      lastAccessed: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(cacheEntry);
      
      request.onsuccess = () => {
        console.log(`💾 Cached translation notes for ${context.organization}/${context.language}/${context.resourceType}/${bookName}${chapter ? ` chapter ${chapter}` : ''}`);
        this.updateMetadata();
        resolve();
      };
      
      request.onerror = () => {
        console.error(`❌ Failed to cache translation notes for ${bookName}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Check if cached scripture is valid (based on SHA hash)
   */
  async isCacheValid(context: Door43ResourceContext, bookName: string, currentSha: string): Promise<boolean> {
    await this.initDB();
    if (!this.db) return false;

    const transaction = this.db.transaction([STORES.SCRIPTURE], 'readonly');
    const store = transaction.objectStore(STORES.SCRIPTURE);
    const cacheKey = this.generateCacheKey(context, bookName);

    return new Promise((resolve) => {
      const request = store.get(cacheKey);
      
      request.onsuccess = () => {
        const result = request.result as CachedScripture | undefined;
        
        if (result && result.sha) {
          const isValid = result.sha === currentSha;
          console.log(`🔍 Cache validation for ${cacheKey}: ${isValid ? 'VALID' : 'INVALID'} (cached: ${result.sha?.substring(0, 8)}, current: ${currentSha.substring(0, 8)})`);
          resolve(isValid);
        } else {
          console.log(`🔍 Cache validation for ${cacheKey}: NO SHA FOUND (treating as invalid)`);
          resolve(false);
        }
      };
      
      request.onerror = () => {
        console.error(`❌ Failed to validate cache for ${cacheKey}:`, request.error);
        resolve(false);
      };
    });
  }

  /**
   * Get cached scripture
   */
  async getCachedScripture(context: Door43ResourceContext, bookName: string): Promise<{
    resource: Door43Resource;
    processedScripture: ProcessedScripture;
    processingResult: ProcessingResult;
  } | null> {
    await this.initDB();
    if (!this.db) return null;

    const transaction = this.db.transaction([STORES.SCRIPTURE], 'readwrite');
    const store = transaction.objectStore(STORES.SCRIPTURE);
    const cacheKey = this.generateCacheKey(context, bookName);

    return new Promise((resolve, reject) => {
      const request = store.get(cacheKey);
      
      request.onsuccess = () => {
        const result = request.result as CachedScripture | undefined;
        
        if (result) {
          // Update last accessed time
          result.lastAccessed = Date.now();
          store.put(result);
          
          console.log(`📖 Retrieved cached scripture for ${cacheKey}`);
          resolve({
            resource: result.resource,
            processedScripture: result.processedScripture,
            processingResult: result.processingResult
          });
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error(`❌ Failed to get cached scripture for ${cacheKey}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get cached translation notes
   */
  async getCachedTranslationNotes(context: Door43ResourceContext, bookName: string, chapter?: number): Promise<{
    resource: Door43Resource;
    notes: TranslationNote[];
  } | null> {
    await this.initDB();
    if (!this.db) return null;

    const transaction = this.db.transaction([STORES.TRANSLATION_NOTES], 'readwrite');
    const store = transaction.objectStore(STORES.TRANSLATION_NOTES);
    const cacheKey = this.generateCacheKey(context, bookName, chapter);

    return new Promise((resolve, reject) => {
      const request = store.get(cacheKey);
      
      request.onsuccess = () => {
        const result = request.result as CachedTranslationNotes | undefined;
        
        if (result) {
          // Update last accessed time
          result.lastAccessed = Date.now();
          store.put(result);
          
          console.log(`📝 Retrieved cached translation notes for ${cacheKey}`);
          resolve({
            resource: result.resource,
            notes: result.notes
          });
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error(`❌ Failed to get cached translation notes for ${cacheKey}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Check if scripture is cached
   */
  async hasScripture(context: Door43ResourceContext, bookName: string): Promise<boolean> {
    const cached = await this.getCachedScripture(context, bookName);
    return cached !== null;
  }

  /**
   * Check if translation notes are cached
   */
  async hasTranslationNotes(context: Door43ResourceContext, bookName: string, chapter?: number): Promise<boolean> {
    const cached = await this.getCachedTranslationNotes(context, bookName, chapter);
    return cached !== null;
  }

  /**
   * Get all cached books (optionally filtered by context)
   */
  async getCachedBooks(context?: Door43ResourceContext): Promise<{
    scripture: string[];
    translationNotes: string[];
  }> {
    await this.initDB();
    if (!this.db) return { scripture: [], translationNotes: [] };

    const scriptureBooks: string[] = [];
    const translationNotesBooks: string[] = [];

    // Get scripture books
    const scriptureTransaction = this.db.transaction([STORES.SCRIPTURE], 'readonly');
    const scriptureStore = scriptureTransaction.objectStore(STORES.SCRIPTURE);
    
    await new Promise<void>((resolve) => {
      const request = scriptureStore.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value as CachedScripture;
          // Filter by context if provided
          if (!context || (
            entry.organization === context.organization &&
            entry.language === context.language &&
            entry.resourceType === context.resourceType
          )) {
            scriptureBooks.push(entry.bookName);
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
    });

    // Get translation notes books
    const notesTransaction = this.db.transaction([STORES.TRANSLATION_NOTES], 'readonly');
    const notesStore = notesTransaction.objectStore(STORES.TRANSLATION_NOTES);
    
    await new Promise<void>((resolve) => {
      const request = notesStore.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value as CachedTranslationNotes;
          // Filter by context if provided
          if (!context || (
            entry.organization === context.organization &&
            entry.language === context.language &&
            entry.resourceType === context.resourceType
          )) {
            const bookName = entry.bookName;
            if (!translationNotesBooks.includes(bookName)) {
              translationNotesBooks.push(bookName);
            }
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
    });

    return {
      scripture: [...new Set(scriptureBooks)],
      translationNotes: [...new Set(translationNotesBooks)]
    };
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    const transaction = this.db.transaction([STORES.SCRIPTURE, STORES.TRANSLATION_NOTES, STORES.METADATA], 'readwrite');
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(STORES.SCRIPTURE).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(STORES.TRANSLATION_NOTES).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore(STORES.METADATA).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);

    console.log('🗑️ Cache cleared successfully');
  }

  /**
   * Remove specific cached item
   */
  async removeCachedScripture(context: Door43ResourceContext, bookName: string): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    const transaction = this.db.transaction([STORES.SCRIPTURE], 'readwrite');
    const store = transaction.objectStore(STORES.SCRIPTURE);
    const cacheKey = this.generateCacheKey(context, bookName);

    return new Promise((resolve, reject) => {
      const request = store.delete(cacheKey);
      
      request.onsuccess = () => {
        console.log(`🗑️ Removed cached scripture for ${cacheKey}`);
        this.updateMetadata();
        resolve();
      };
      
      request.onerror = () => {
        console.error(`❌ Failed to remove cached scripture for ${cacheKey}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Remove cached translation notes
   */
  async removeCachedTranslationNotes(context: Door43ResourceContext, bookName: string, chapter?: number): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    const transaction = this.db.transaction([STORES.TRANSLATION_NOTES], 'readwrite');
    const store = transaction.objectStore(STORES.TRANSLATION_NOTES);
    const cacheKey = this.generateCacheKey(context, bookName, chapter);

    return new Promise((resolve, reject) => {
      const request = store.delete(cacheKey);
      
      request.onsuccess = () => {
        console.log(`🗑️ Removed cached translation notes for ${cacheKey}`);
        this.updateMetadata();
        resolve();
      };
      
      request.onerror = () => {
        console.error(`❌ Failed to remove cached translation notes for ${cacheKey}:`, request.error);
        reject(request.error);
      };
    });
  }

  // ===== MANIFEST CACHING METHODS =====

  /**
   * Cache a manifest with its parsed book data
   */
  async cacheManifest(
    context: Door43ResourceContext,
    manifestContent: string,
    parsedBooks: Array<{
      code: string;
      name: string;
      testament: 'OT' | 'NT';
      chapters: number;
      available: boolean;
    }>,
    sha?: string,
    fileSize?: number,
    lastModified?: string
  ): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    const cacheKey = this.generateManifestCacheKey(context);
    const now = Date.now();

    const cachedManifest: CachedManifest = {
      id: cacheKey,
      context,
      manifestContent,
      parsedBooks,
      timestamp: now,
      lastAccessed: now,
      sha,
      fileSize,
      lastModified
    };

    const transaction = this.db.transaction([STORES.MANIFESTS], 'readwrite');
    const store = transaction.objectStore(STORES.MANIFESTS);

    return new Promise((resolve, reject) => {
      const request = store.put(cachedManifest);
      
      request.onsuccess = () => {
        console.log(`💾 Cached manifest for ${cacheKey} (${parsedBooks.length} books)`);
        this.updateMetadata();
        resolve();
      };
      
      request.onerror = () => {
        console.error(`❌ Failed to cache manifest for ${cacheKey}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get cached manifest data
   */
  async getCachedManifest(context: Door43ResourceContext): Promise<{
    manifestContent: string;
    parsedBooks: Array<{
      code: string;
      name: string;
      testament: 'OT' | 'NT';
      chapters: number;
      available: boolean;
    }>;
    timestamp: number;
  } | null> {
    await this.initDB();
    if (!this.db) return null;

    const cacheKey = this.generateManifestCacheKey(context);
    const transaction = this.db.transaction([STORES.MANIFESTS], 'readwrite');
    const store = transaction.objectStore(STORES.MANIFESTS);

    return new Promise((resolve, reject) => {
      const request = store.get(cacheKey);
      
      request.onsuccess = () => {
        const result = request.result as CachedManifest | undefined;
        if (result) {
          // Update last accessed time
          result.lastAccessed = Date.now();
          store.put(result);
          
          resolve({
            manifestContent: result.manifestContent,
            parsedBooks: result.parsedBooks,
            timestamp: result.timestamp
          });
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error(`❌ Failed to get cached manifest for ${cacheKey}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Check if manifest cache is valid (not expired and SHA matches if provided)
   */
  async isManifestCacheValid(context: Door43ResourceContext, sha?: string, maxAge: number = 24 * 60 * 60 * 1000): Promise<boolean> {
    await this.initDB();
    if (!this.db) return false;

    const cacheKey = this.generateManifestCacheKey(context);
    const transaction = this.db.transaction([STORES.MANIFESTS], 'readonly');
    const store = transaction.objectStore(STORES.MANIFESTS);

    return new Promise((resolve, reject) => {
      const request = store.get(cacheKey);
      
      request.onsuccess = () => {
        const result = request.result as CachedManifest | undefined;
        if (!result) {
          resolve(false);
          return;
        }

        const now = Date.now();
        const isExpired = (now - result.timestamp) > maxAge;
        
        if (isExpired) {
          resolve(false);
          return;
        }

        // If SHA is provided, check if it matches
        if (sha && result.sha && result.sha !== sha) {
          resolve(false);
          return;
        }

        resolve(true);
      };
      
      request.onerror = () => {
        console.error(`❌ Failed to check manifest cache validity for ${cacheKey}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Check if a manifest is cached
   */
  async hasManifest(context: Door43ResourceContext): Promise<boolean> {
    await this.initDB();
    if (!this.db) return false;

    const cacheKey = this.generateManifestCacheKey(context);
    const transaction = this.db.transaction([STORES.MANIFESTS], 'readonly');
    const store = transaction.objectStore(STORES.MANIFESTS);

    return new Promise((resolve, reject) => {
      const request = store.count(cacheKey);
      
      request.onsuccess = () => {
        resolve(request.result > 0);
      };
      
      request.onerror = () => {
        console.error(`❌ Failed to check manifest existence for ${cacheKey}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Remove cached manifest
   */
  async removeCachedManifest(context: Door43ResourceContext): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    const transaction = this.db.transaction([STORES.MANIFESTS], 'readwrite');
    const store = transaction.objectStore(STORES.MANIFESTS);
    const cacheKey = this.generateManifestCacheKey(context);

    return new Promise((resolve, reject) => {
      const request = store.delete(cacheKey);
      
      request.onsuccess = () => {
        console.log(`🗑️ Removed cached manifest for ${cacheKey}`);
        this.updateMetadata();
        resolve();
      };
      
      request.onerror = () => {
        console.error(`❌ Failed to remove cached manifest for ${cacheKey}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    scriptureEntries: number;
    translationNotesEntries: number;
    manifestEntries: number;
    repoMetadataEntries: number;
    estimatedSize: string;
    lastUpdated: Date | null;
  }> {
    await this.initDB();
    if (!this.db) return {
      totalEntries: 0,
      scriptureEntries: 0,
      translationNotesEntries: 0,
      manifestEntries: 0,
      repoMetadataEntries: 0,
      estimatedSize: '0 KB',
      lastUpdated: null
    };

    const [scriptureCount, notesCount, manifestCount, repoMetadataCount] = await Promise.all([
      this.getStoreCount(STORES.SCRIPTURE),
      this.getStoreCount(STORES.TRANSLATION_NOTES),
      this.getStoreCount(STORES.MANIFESTS),
      this.getStoreCount(STORES.REPO_METADATA)
    ]);

    // Rough size estimation (this is approximate)
    const estimatedSizeBytes = (scriptureCount * 50000) + (notesCount * 10000) + (manifestCount * 5000) + (repoMetadataCount * 2000); // Rough estimates
    const estimatedSize = this.formatBytes(estimatedSizeBytes);

    return {
      totalEntries: scriptureCount + notesCount + manifestCount + repoMetadataCount,
      scriptureEntries: scriptureCount,
      translationNotesEntries: notesCount,
      manifestEntries: manifestCount,
      repoMetadataEntries: repoMetadataCount,
      estimatedSize,
      lastUpdated: new Date()
    };
  }

  /**
   * Update cache metadata
   */
  private async updateMetadata(): Promise<void> {
    if (!this.db) return;

    const stats = await this.getCacheStats();
    const metadata: CacheMetadata = {
      id: 'main',
      totalSize: stats.totalEntries,
      lastCleanup: Date.now(),
      entries: {
        scripture: stats.scriptureEntries,
        translationNotes: stats.translationNotesEntries,
        repoMetadata: stats.repoMetadataEntries
      }
    };

    const transaction = this.db.transaction([STORES.METADATA], 'readwrite');
    const store = transaction.objectStore(STORES.METADATA);
    store.put(metadata);
  }

  /**
   * Get count of items in a store
   */
  private async getStoreCount(storeName: string): Promise<number> {
    if (!this.db) return 0;

    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if we're online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Clean up old cache entries (LRU-style cleanup)
   */
  async cleanupOldEntries(maxEntries = 50): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    // Clean up scripture entries
    await this.cleanupStore(STORES.SCRIPTURE, maxEntries / 2);
    
    // Clean up translation notes entries
    await this.cleanupStore(STORES.TRANSLATION_NOTES, maxEntries / 2);
    
    console.log(`🧹 Cache cleanup completed (max ${maxEntries} entries)`);
  }

  /**
   * Cache repository metadata
   */
  async cacheRepoMetadata(organization: string, repositoryId: string, metadata: Door43Resource): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    const cacheKey = `${organization}/${repositoryId}`;
    const cachedData: CachedRepoMetadata = {
      id: cacheKey,
      organization,
      repositoryId,
      metadata,
      timestamp: Date.now(),
      lastAccessed: Date.now()
    };

    const transaction = this.db.transaction([STORES.REPO_METADATA], 'readwrite');
    const store = transaction.objectStore(STORES.REPO_METADATA);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(cachedData);
      request.onsuccess = () => {
        console.log(`💾 Cached repository metadata for ${organization}/${repositoryId}`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cached repository metadata
   */
  async getCachedRepoMetadata(organization: string, repositoryId: string): Promise<Door43Resource | null> {
    await this.initDB();
    if (!this.db) return null;

    const cacheKey = `${organization}/${repositoryId}`;
    const transaction = this.db.transaction([STORES.REPO_METADATA], 'readwrite');
    const store = transaction.objectStore(STORES.REPO_METADATA);

    return new Promise<Door43Resource | null>((resolve) => {
      const request = store.get(cacheKey);
      request.onsuccess = () => {
        const result = request.result as CachedRepoMetadata | undefined;
        if (result) {
          // Update last accessed time
          result.lastAccessed = Date.now();
          store.put(result);
          
          console.log(`📦 Retrieved cached repository metadata for ${organization}/${repositoryId}`);
          resolve(result.metadata);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Check if repository metadata cache is valid (for future TTL implementation)
   */
  async isRepoMetadataCacheValid(organization: string, repositoryId: string, maxAgeHours = 24): Promise<boolean> {
    await this.initDB();
    if (!this.db) return false;

    const cacheKey = `${organization}/${repositoryId}`;
    const transaction = this.db.transaction([STORES.REPO_METADATA], 'readonly');
    const store = transaction.objectStore(STORES.REPO_METADATA);

    return new Promise<boolean>((resolve) => {
      const request = store.get(cacheKey);
      request.onsuccess = () => {
        const result = request.result as CachedRepoMetadata | undefined;
        if (result) {
          const ageHours = (Date.now() - result.timestamp) / (1000 * 60 * 60);
          resolve(ageHours < maxAgeHours);
        } else {
          resolve(false);
        }
      };
      request.onerror = () => resolve(false);
    });
  }

  /**
   * Clean up a specific store
   */
  private async cleanupStore(storeName: string, maxEntries: number): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const index = store.index('lastAccessed');

    // Get all entries sorted by lastAccessed (oldest first)
    const entries: any[] = [];
    
    await new Promise<void>((resolve) => {
      const request = index.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          entries.push(cursor.value);
          cursor.continue();
        } else {
          resolve();
        }
      };
    });

    // Remove oldest entries if we exceed maxEntries
    if (entries.length > maxEntries) {
      const entriesToRemove = entries.slice(0, entries.length - maxEntries);
      
      for (const entry of entriesToRemove) {
        await new Promise<void>((resolve) => {
          const deleteRequest = store.delete(entry.id);
          deleteRequest.onsuccess = () => resolve();
        });
      }
      
      console.log(`🗑️ Removed ${entriesToRemove.length} old entries from ${storeName}`);
    }
  }
}

// Export singleton instance
export const offlineCache = new OfflineCacheService();
