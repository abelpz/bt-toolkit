/**
 * SQLite Storage Adapter
 * 
 * A file-based storage adapter that mimics IndexedDB structure using SQLite.
 * Perfect for Node.js testing with temp files while maintaining the same interface
 * that will be used for the browser-based IndexedDBStorageAdapter.
 */

import Database from 'better-sqlite3';
import { ResourceMetadata, ResourceContent, StorageAdapter, StorageInfo, QuotaInfo, StorageTransaction } from '../../types/context';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class SQLiteStorageAdapter implements StorageAdapter {
  private db: Database.Database | null = null;
  private dbPath: string;
  private isInitialized = false;

  constructor(dbPath?: string) {
    // Use temp file if no path provided (perfect for testing)
    this.dbPath = dbPath || path.join(os.tmpdir(), `bt-studio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.db`);
  }

  /**
   * Initialize the SQLite database with proper schema
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log(`📦 Initializing SQLite storage: ${this.dbPath}`);
    
    this.db = new Database(this.dbPath);
    
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    
    // Create tables that mirror IndexedDB structure
    this.createTables();
    
    this.isInitialized = true;
    console.log(`✅ SQLite storage initialized successfully`);
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Resource Metadata table (equivalent to IndexedDB object store)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS resource_metadata (
        id TEXT PRIMARY KEY,
        server TEXT NOT NULL,
        owner TEXT NOT NULL,
        language TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        lastUpdated INTEGER NOT NULL,
        available INTEGER NOT NULL,
        toc TEXT, -- JSON string
        isAnchor INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Resource Content table (equivalent to IndexedDB object store)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS resource_content (
        key TEXT PRIMARY KEY,
        resourceId TEXT NOT NULL,
        server TEXT NOT NULL,
        owner TEXT NOT NULL,
        language TEXT NOT NULL,
        type TEXT NOT NULL,
        bookCode TEXT,
        articleId TEXT,
        content TEXT NOT NULL, -- JSON string
        lastFetched INTEGER NOT NULL,
        cachedUntil INTEGER,
        checksum TEXT,
        size INTEGER NOT NULL,
        sourceSha TEXT, -- SHA of the source file (from Door43)
        sourceCommit TEXT, -- Git commit SHA when content was fetched
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Create indexes for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_metadata_server_owner_lang 
      ON resource_metadata(server, owner, language);
      
      CREATE INDEX IF NOT EXISTS idx_content_resource_type 
      ON resource_content(resourceId, type);
      
      CREATE INDEX IF NOT EXISTS idx_content_book 
      ON resource_content(bookCode) WHERE bookCode IS NOT NULL;
      
      CREATE INDEX IF NOT EXISTS idx_content_cached_until 
      ON resource_content(cachedUntil) WHERE cachedUntil IS NOT NULL;
    `);

    console.log(`📋 Database tables created successfully`);
  }

  /**
   * Get all resource metadata for a server/owner/language combination
   */
  async getResourceMetadata(server: string, owner: string, language: string): Promise<ResourceMetadata[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    console.log(`🔍 Fetching metadata for ${server}/${owner}/${language}`);

    const stmt = this.db.prepare(`
      SELECT * FROM resource_metadata 
      WHERE server = ? AND owner = ? AND language = ?
      ORDER BY name
    `);

    const rows = stmt.all(server, owner, language) as any[];
    
    const metadata = rows.map(row => ({
      id: row.id,
      server: row.server,
      owner: row.owner,
      language: row.language,
      type: row.type,
      title: row.title,
      description: row.description,
      name: row.name,
      version: row.version,
      lastUpdated: new Date(row.lastUpdated),
      available: Boolean(row.available),
      toc: row.toc ? JSON.parse(row.toc) : undefined,
      isAnchor: Boolean(row.isAnchor)
    }));

    console.log(`📊 Found ${metadata.length} metadata records`);
    return metadata;
  }

  /**
   * Save resource metadata to storage
   */
  async saveResourceMetadata(metadata: ResourceMetadata[]): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    console.log(`💾 Saving ${metadata.length} metadata records`);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO resource_metadata (
        id, server, owner, language, type, title, description, name, 
        version, lastUpdated, available, toc, isAnchor, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
    `);

    const transaction = this.db.transaction((metadataList: ResourceMetadata[]) => {
      for (const meta of metadataList) {
        stmt.run(
          meta.id,
          meta.server,
          meta.owner,
          meta.language,
          meta.type,
          meta.title,
          meta.description || null,
          meta.name,
          meta.version,
          meta.lastUpdated.getTime(),
          meta.available ? 1 : 0,
          meta.toc ? JSON.stringify(meta.toc) : null,
          meta.isAnchor ? 1 : 0
        );
      }
    });

    transaction(metadata);
    console.log(`✅ Metadata saved successfully`);
  }

  /**
   * Get resource content by key
   */
  async getResourceContent(key: string): Promise<ResourceContent | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    console.log(`🔍 Fetching content for key: ${key}`);

    const stmt = this.db.prepare(`
      SELECT * FROM resource_content WHERE key = ?
    `);

    const row = stmt.get(key) as any;
    
    if (!row) {
      console.log(`❌ Content not found for key: ${key}`);
      return null;
    }

    const content: ResourceContent = {
      key: row.key,
      resourceId: row.resourceId,
      server: row.server,
      owner: row.owner,
      language: row.language,
      type: row.type,
      bookCode: row.bookCode || undefined,
      articleId: row.articleId || undefined,
      content: JSON.parse(row.content),
      lastFetched: new Date(row.lastFetched),
      cachedUntil: row.cachedUntil ? new Date(row.cachedUntil) : undefined,
      checksum: row.checksum || undefined,
      size: row.size,
      sourceSha: row.sourceSha || undefined,
      sourceCommit: row.sourceCommit || undefined
    };

    console.log(`✅ Content found: ${content.size} bytes, fetched ${content.lastFetched.toISOString()}`);
    return content;
  }

  /**
   * Save resource content to storage
   */
  async saveResourceContent(content: ResourceContent): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    console.log(`💾 Saving content for key: ${content.key} (${content.size} bytes)`);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO resource_content (
        key, resourceId, server, owner, language, type, bookCode, articleId,
        content, lastFetched, cachedUntil, checksum, size, sourceSha, sourceCommit, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
    `);

    stmt.run(
      content.key,
      content.resourceId,
      content.server,
      content.owner,
      content.language,
      content.type,
      content.bookCode || null,
      content.articleId || null,
      JSON.stringify(content.content),
      content.lastFetched.getTime(),
      content.cachedUntil?.getTime() || null,
      content.checksum || null,
      content.size,
      content.sourceSha || null,
      content.sourceCommit || null
    );

    console.log(`✅ Content saved successfully`);
  }

  /**
   * Get multiple content items by keys (batch operation)
   */
  async getMultipleContent(keys: string[]): Promise<ResourceContent[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    if (keys.length === 0) return [];

    console.log(`🔍 Fetching ${keys.length} content items`);

    const placeholders = keys.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      SELECT * FROM resource_content WHERE key IN (${placeholders})
    `);

    const rows = stmt.all(...keys) as any[];
    
    const contents = rows.map(row => ({
      key: row.key,
      resourceId: row.resourceId,
      server: row.server,
      owner: row.owner,
      language: row.language,
      type: row.type,
      bookCode: row.bookCode || undefined,
      articleId: row.articleId || undefined,
      content: JSON.parse(row.content),
      lastFetched: new Date(row.lastFetched),
      cachedUntil: row.cachedUntil ? new Date(row.cachedUntil) : undefined,
      checksum: row.checksum || undefined,
      size: row.size
    }));

    console.log(`📊 Found ${contents.length}/${keys.length} content items`);
    return contents;
  }

  /**
   * Save multiple content items (batch operation with transaction)
   */
  async saveMultipleContent(contents: ResourceContent[]): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    if (contents.length === 0) return;

    console.log(`💾 Batch saving ${contents.length} content items`);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO resource_content (
        key, resourceId, server, owner, language, type, bookCode, articleId,
        content, lastFetched, cachedUntil, checksum, size, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
    `);

    const transaction = this.db.transaction((contentList: ResourceContent[]) => {
      for (const content of contentList) {
        stmt.run(
          content.key,
          content.resourceId,
          content.server,
          content.owner,
          content.language,
          content.type,
          content.bookCode || null,
          content.articleId || null,
          JSON.stringify(content.content),
          content.lastFetched.getTime(),
          content.cachedUntil?.getTime() || null,
          content.checksum || null,
          content.size
        );
      }
    });

    transaction(contents);
    console.log(`✅ Batch save completed successfully`);
  }

  /**
   * Begin a transaction for atomic operations
   */
  async beginTransaction(): Promise<StorageTransaction> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new SQLiteTransaction(this.db);
  }

  /**
   * Clear expired content based on cachedUntil timestamps
   */
  async clearExpiredContent(): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    console.log(`🧹 Clearing expired content`);

    const now = Date.now();
    const stmt = this.db.prepare(`
      DELETE FROM resource_content 
      WHERE cachedUntil IS NOT NULL AND cachedUntil < ?
    `);

    const result = stmt.run(now);
    console.log(`✅ Cleared ${result.changes} expired content items`);
  }

  /**
   * Clear all content (keep metadata)
   */
  async clearAllContent(): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    console.log(`🧹 Clearing all content`);

    const stmt = this.db.prepare('DELETE FROM resource_content');
    const result = stmt.run();
    
    console.log(`✅ Cleared ${result.changes} content items`);
  }

  /**
   * Get storage information and statistics
   */
  async getStorageInfo(): Promise<StorageInfo> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    // Get database file size
    let totalSize = 0;
    try {
      const stats = fs.statSync(this.dbPath);
      totalSize = stats.size;
    } catch (error) {
      console.warn('Could not get database file size:', error);
    }

    // Get item count
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM resource_content');
    const countResult = countStmt.get() as { count: number };

    return {
      totalSize,
      availableSpace: -1, // Not applicable for file-based storage
      itemCount: countResult.count,
      lastCleanup: new Date() // Could track this in metadata table
    };
  }

  /**
   * Check storage quota (simplified for file-based storage)
   */
  async checkQuota(): Promise<QuotaInfo> {
    const info = await this.getStorageInfo();
    
    // For file-based storage, we'll use a simple size-based quota
    const maxSize = 1024 * 1024 * 1024; // 1GB default limit
    const used = info.totalSize;
    const available = Math.max(0, maxSize - used);
    
    return {
      used,
      available,
      total: maxSize,
      nearLimit: used > (maxSize * 0.8) // 80% threshold
    };
  }

  /**
   * Close the database connection and optionally clean up temp file
   */
  async close(deleteTempFile = false): Promise<void> {
    if (this.db) {
      console.log(`🔒 Closing SQLite database: ${this.dbPath}`);
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }

    // Clean up temp file if requested (useful for tests)
    if (deleteTempFile && this.dbPath.includes(os.tmpdir())) {
      try {
        fs.unlinkSync(this.dbPath);
        console.log(`🗑️  Deleted temp database file: ${this.dbPath}`);
      } catch (error) {
        console.warn('Could not delete temp database file:', error);
      }
    }
  }

  /**
   * Get the database file path (useful for debugging)
   */
  getDatabasePath(): string {
    return this.dbPath;
  }
}

/**
 * SQLite Transaction implementation
 */
class SQLiteTransaction implements StorageTransaction {
  private operations: (() => void)[] = [];
  private isCommitted = false;
  private isRolledBack = false;

  constructor(private db: Database.Database) {}

  async save(content: ResourceContent): Promise<void> {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error('Transaction already completed');
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO resource_content (
        key, resourceId, server, owner, language, type, bookCode, articleId,
        content, lastFetched, cachedUntil, checksum, size, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
    `);

    this.operations.push(() => {
      stmt.run(
        content.key,
        content.resourceId,
        content.server,
        content.owner,
        content.language,
        content.type,
        content.bookCode || null,
        content.articleId || null,
        JSON.stringify(content.content),
        content.lastFetched.getTime(),
        content.cachedUntil?.getTime() || null,
        content.checksum || null,
        content.size
      );
    });
  }

  async delete(key: string): Promise<void> {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error('Transaction already completed');
    }

    const stmt = this.db.prepare('DELETE FROM resource_content WHERE key = ?');
    this.operations.push(() => {
      stmt.run(key);
    });
  }

  async commit(): Promise<void> {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error('Transaction already completed');
    }

    const transaction = this.db.transaction(() => {
      for (const operation of this.operations) {
        operation();
      }
    });

    transaction();
    this.isCommitted = true;
    console.log(`✅ Transaction committed with ${this.operations.length} operations`);
  }

  async rollback(): Promise<void> {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error('Transaction already completed');
    }

    this.operations = [];
    this.isRolledBack = true;
    console.log(`↩️  Transaction rolled back`);
  }
}

// Export a default instance factory for easy testing
export const createTempSQLiteStorage = (): SQLiteStorageAdapter => {
  return new SQLiteStorageAdapter(); // Uses temp file by default
};

export const createSQLiteStorage = (dbPath: string): SQLiteStorageAdapter => {
  return new SQLiteStorageAdapter(dbPath);
};
