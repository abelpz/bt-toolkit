/**
 * Bible Repository Service
 * 
 * Platform-agnostic service for downloading and caching Bible repositories
 * with hierarchical storage: owner => language => repository => books
 */

import { fetchResourceMetadata, fetchScripture } from './door43-api';
import type { Door43ResourceContext } from './offline-cache';
import type { ProcessedScripture } from './usfm-processor';

// ============================================================================
// Storage Abstraction Layer
// ============================================================================

/**
 * Platform-agnostic storage interface
 * Implementations: IndexedDB (browser), SQLite (mobile), File System (desktop)
 */
export interface StorageAdapter {
  // Repository metadata operations
  getRepositoryMetadata(owner: string, language: string, repoName: string): Promise<RepositoryMetadata | null>;
  setRepositoryMetadata(owner: string, language: string, repoName: string, metadata: RepositoryMetadata): Promise<void>;
  
  // Book operations
  getBook(owner: string, language: string, repoName: string, bookCode: string): Promise<CachedBook | null>;
  setBook(owner: string, language: string, repoName: string, bookCode: string, book: CachedBook): Promise<void>;
  
  // Cache validation
  isBookCacheValid(owner: string, language: string, repoName: string, bookCode: string, currentSha: string): Promise<boolean>;
  
  // Cleanup operations
  clearOwner(owner: string): Promise<void>;
  clearLanguage(owner: string, language: string): Promise<void>;
  clearRepository(owner: string, language: string, repoName: string): Promise<void>;
}

// ============================================================================
// Data Interfaces
// ============================================================================

export interface RepositoryMetadata {
  name: string;           // Unique repo name (e.g., "en_ult")
  title: string;          // User-friendly title (e.g., "English ULT")
  description: string;    // Repository description
  resourceType: string;   // Type: "ult", "glt", "ust", etc.
  availableBooks: string[]; // List of available book codes
  lastUpdated: number;    // Timestamp of last update
  version?: string;       // Repository version/branch
}

export interface CachedBook {
  bookCode: string;
  processedScripture: ProcessedScripture;
  bookSha: string;        // For cache validation
  lastFetched: number;    // Timestamp
  metadata: {
    title: string;
    chapters: number;
    verses: number;
  };
}

export interface BibleRepository {
  name: string;           // Unique repo name
  title: string;          // User-friendly title
  description: string;    // Repository description
  books: {
    [bookCode: string]: {
      get(): Promise<ProcessedScripture & { bookSha: string }>;
    };
  };
}

// ============================================================================
// Default IndexedDB Storage Implementation
// ============================================================================

class IndexedDBStorageAdapter implements StorageAdapter {
  private dbName = 'BibleRepositoryCache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        
        // Store: owner/language/repo => metadata
        if (!db.objectStoreNames.contains('repositories')) {
          const repoStore = db.createObjectStore('repositories', { keyPath: 'id' });
          repoStore.createIndex('owner', 'owner');
          repoStore.createIndex('language', 'language');
        }
        
        // Store: owner/language/repo/book => book data
        if (!db.objectStoreNames.contains('books')) {
          const bookStore = db.createObjectStore('books', { keyPath: 'id' });
          bookStore.createIndex('repository', 'repositoryId');
          bookStore.createIndex('bookCode', 'bookCode');
        }
      };
    });
  }

  private getRepositoryId(owner: string, language: string, repoName: string): string {
    return `${owner}/${language}/${repoName}`;
  }

  private getBookId(owner: string, language: string, repoName: string, bookCode: string): string {
    return `${owner}/${language}/${repoName}/${bookCode}`;
  }

  async getRepositoryMetadata(owner: string, language: string, repoName: string): Promise<RepositoryMetadata | null> {
    const db = await this.getDB();
    const transaction = db.transaction(['repositories'], 'readonly');
    const store = transaction.objectStore('repositories');
    
    return new Promise((resolve, reject) => {
      const request = store.get(this.getRepositoryId(owner, language, repoName));
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.metadata : null);
      };
    });
  }

  async setRepositoryMetadata(owner: string, language: string, repoName: string, metadata: RepositoryMetadata): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction(['repositories'], 'readwrite');
    const store = transaction.objectStore('repositories');
    
    return new Promise((resolve, reject) => {
      const request = store.put({
        id: this.getRepositoryId(owner, language, repoName),
        owner,
        language,
        repoName,
        metadata,
        timestamp: Date.now()
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getBook(owner: string, language: string, repoName: string, bookCode: string): Promise<CachedBook | null> {
    const db = await this.getDB();
    const transaction = db.transaction(['books'], 'readonly');
    const store = transaction.objectStore('books');
    
    return new Promise((resolve, reject) => {
      const request = store.get(this.getBookId(owner, language, repoName, bookCode));
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.book : null);
      };
    });
  }

  async setBook(owner: string, language: string, repoName: string, bookCode: string, book: CachedBook): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction(['books'], 'readwrite');
    const store = transaction.objectStore('books');
    
    return new Promise((resolve, reject) => {
      const request = store.put({
        id: this.getBookId(owner, language, repoName, bookCode),
        repositoryId: this.getRepositoryId(owner, language, repoName),
        owner,
        language,
        repoName,
        bookCode,
        book,
        timestamp: Date.now()
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async isBookCacheValid(owner: string, language: string, repoName: string, bookCode: string, currentSha: string): Promise<boolean> {
    const cachedBook = await this.getBook(owner, language, repoName, bookCode);
    return cachedBook ? cachedBook.bookSha === currentSha : false;
  }

  async clearOwner(owner: string): Promise<void> {
    // Implementation for clearing all data for an owner
    // Would iterate through stores and delete matching records
    throw new Error('Not implemented yet');
  }

  async clearLanguage(owner: string, language: string): Promise<void> {
    // Implementation for clearing all data for an owner/language
    throw new Error('Not implemented yet');
  }

  async clearRepository(owner: string, language: string, repoName: string): Promise<void> {
    // Implementation for clearing all data for a specific repository
    throw new Error('Not implemented yet');
  }
}

// ============================================================================
// Bible Repository Service
// ============================================================================

export class BibleRepositoryService {
  private storage: StorageAdapter;
  private isOnline: boolean = true;

  constructor(storage?: StorageAdapter) {
    this.storage = storage || new IndexedDBStorageAdapter();
    
    // Monitor online status
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => { this.isOnline = true; });
      window.addEventListener('offline', () => { this.isOnline = false; });
    }
  }

  /**
   * Get a Bible repository with lazy-loaded books
   */
  async getRepository(
    owner: string, 
    language: string, 
    resourceType: 'ult' | 'glt' | 'ust' = 'ult'
  ): Promise<BibleRepository> {
    const repoName = `${language}_${resourceType}`;
    
    console.log(`📚 Getting repository ${owner}/${language}/${resourceType}...`);

    // Try to get cached metadata first
    let metadata = await this.storage.getRepositoryMetadata(owner, language, repoName);
    
    // If not cached or if online, fetch fresh metadata
    if (!metadata || (this.isOnline && this.shouldRefreshMetadata(metadata))) {
      metadata = await this.fetchRepositoryMetadata(owner, language, resourceType);
      if (metadata) {
        await this.storage.setRepositoryMetadata(owner, language, repoName, metadata);
      }
    }

    if (!metadata) {
      throw new Error(`Repository not found: ${owner}/${language}/${resourceType}`);
    }

    // Create repository with lazy-loaded books
    const books: BibleRepository['books'] = {};
    
    for (const bookCode of metadata.availableBooks) {
      books[bookCode] = {
        get: () => this.getBook(owner, language, resourceType, bookCode)
      };
    }

    return {
      name: metadata.name,
      title: metadata.title,
      description: metadata.description,
      books
    };
  }

  /**
   * Get a specific book from a repository
   */
  private async getBook(
    owner: string,
    language: string,
    resourceType: string,
    bookCode: string
  ): Promise<ProcessedScripture & { bookSha: string }> {
    const repoName = `${language}_${resourceType}`;
    
    console.log(`📖 Getting book ${bookCode} from ${owner}/${language}/${resourceType}...`);

    // Check cache first
    const cachedBook = await this.storage.getBook(owner, language, repoName, bookCode);
    
    // If offline, return cached version or throw error
    if (!this.isOnline) {
      if (cachedBook) {
        console.log(`📱 Offline: Using cached ${bookCode}`);
        return {
          ...cachedBook.processedScripture,
          bookSha: cachedBook.bookSha
        };
      } else {
        throw new Error(`Book ${bookCode} not available offline`);
      }
    }

    // If online, validate cache and fetch if needed
    if (cachedBook) {
      // TODO: Validate SHA with remote (would need API enhancement)
      // For now, use cached version if it exists
      console.log(`📦 Using cached ${bookCode}`);
      return {
        ...cachedBook.processedScripture,
        bookSha: cachedBook.bookSha
      };
    }

    // Fetch fresh book data
    const context: Door43ResourceContext = {
      organization: owner,
      language,
      resourceType
    };

    const result = await fetchScripture(bookCode, undefined, context);
    if (!result) {
      throw new Error(`Failed to fetch book ${bookCode}`);
    }

    // Cache the book
    const cachedBookData: CachedBook = {
      bookCode,
      processedScripture: result.processedScripture,
      bookSha: 'temp-sha', // TODO: Get actual SHA from API
      lastFetched: Date.now(),
      metadata: {
        title: result.processedScripture.book,
        chapters: result.processedScripture.chapters.length,
        verses: result.processedScripture.metadata.totalVerses
      }
    };

    await this.storage.setBook(owner, language, repoName, bookCode, cachedBookData);

    return {
      ...result.processedScripture,
      bookSha: cachedBookData.bookSha
    };
  }

  /**
   * Fetch repository metadata from Door43 API
   */
  private async fetchRepositoryMetadata(
    owner: string,
    language: string,
    resourceType: string
  ): Promise<RepositoryMetadata | null> {
    const repoName = `${language}_${resourceType}`;
    
    try {
      const apiMetadata = await fetchResourceMetadata(owner, repoName);
      if (!apiMetadata) return null;

      // TODO: Get available books from manifest.yaml
      // For now, use a default set
      const availableBooks = ['gen', 'exo', 'mat', 'mrk', 'luk', 'jhn', 'jon', 'tit'];

      return {
        name: repoName,
        title: apiMetadata.metadata?.title || `${language.toUpperCase()} ${resourceType.toUpperCase()}`,
        description: apiMetadata.metadata?.description || `${resourceType.toUpperCase()} resource`,
        resourceType,
        availableBooks,
        lastUpdated: Date.now(),
        version: 'master'
      };
    } catch (error) {
      console.error(`Failed to fetch repository metadata:`, error);
      return null;
    }
  }

  /**
   * Check if metadata should be refreshed (e.g., older than 24 hours)
   */
  private shouldRefreshMetadata(metadata: RepositoryMetadata): boolean {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return Date.now() - metadata.lastUpdated > maxAge;
  }

  /**
   * Clear cache for specific scope
   */
  async clearCache(scope: 'all' | { owner?: string; language?: string; repository?: string }): Promise<void> {
    if (scope === 'all') {
      // Clear everything - would need full implementation
      throw new Error('Clear all not implemented yet');
    }

    const { owner, language, repository } = scope;
    
    if (owner && language && repository) {
      await this.storage.clearRepository(owner, language, repository);
    } else if (owner && language) {
      await this.storage.clearLanguage(owner, language);
    } else if (owner) {
      await this.storage.clearOwner(owner);
    }
  }

  /**
   * Get storage adapter for platform-specific operations
   */
  getStorageAdapter(): StorageAdapter {
    return this.storage;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const bibleRepositoryService = new BibleRepositoryService();
