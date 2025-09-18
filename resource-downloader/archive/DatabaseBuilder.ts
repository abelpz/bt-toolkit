/**
 * Database Builder
 * 
 * Creates and populates SQLite database with downloaded resources.
 * Provides a ready-to-use database that can be shared with others.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// For now, we'll use a simple interface for SQLite operations
// In a real implementation, you would use a library like 'sqlite3' or 'better-sqlite3'
interface SQLiteDatabase {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }>;
  get(sql: string, params?: any[]): Promise<any>;
  all(sql: string, params?: any[]): Promise<any[]>;
  close(): Promise<void>;
}

// Mock SQLite implementation for demonstration
// Replace with actual SQLite library in production
class MockSQLiteDatabase implements SQLiteDatabase {
  private dbPath: string;
  private operations: string[] = [];

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async exec(sql: string): Promise<void> {
    this.operations.push(`EXEC: ${sql}`);
    console.log(`📊 DB EXEC: ${sql.substring(0, 100)}...`);
  }

  async run(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
    this.operations.push(`RUN: ${sql} | PARAMS: ${JSON.stringify(params)}`);
    console.log(`📊 DB RUN: ${sql.substring(0, 100)}... | PARAMS: ${JSON.stringify(params)}`);
    return { lastID: Math.floor(Math.random() * 1000), changes: 1 };
  }

  async get(sql: string, params?: any[]): Promise<any> {
    this.operations.push(`GET: ${sql} | PARAMS: ${JSON.stringify(params)}`);
    console.log(`📊 DB GET: ${sql.substring(0, 100)}... | PARAMS: ${JSON.stringify(params)}`);
    return null;
  }

  async all(sql: string, params?: any[]): Promise<any[]> {
    this.operations.push(`ALL: ${sql} | PARAMS: ${JSON.stringify(params)}`);
    console.log(`📊 DB ALL: ${sql.substring(0, 100)}... | PARAMS: ${JSON.stringify(params)}`);
    return [];
  }

  async close(): Promise<void> {
    // Save operations log for debugging
    const logPath = this.dbPath.replace('.db', '.sql.log');
    await fs.writeFile(logPath, this.operations.join('\n'), 'utf-8');
    console.log(`📊 Database operations logged to: ${logPath}`);
  }
}

export class DatabaseBuilder {
  private dbPath: string;
  private db?: SQLiteDatabase;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Initialize the database and create tables
   */
  async initialize(): Promise<void> {
    // Ensure directory exists
    const dbDir = path.dirname(this.dbPath);
    await fs.mkdir(dbDir, { recursive: true });

    // Initialize database connection
    this.db = new MockSQLiteDatabase(this.dbPath);

    // Create tables
    await this.createTables();

    console.log(`🗄️ Database initialized: ${this.dbPath}`);
  }

  /**
   * Create database schema
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Resources table - stores metadata for each resource
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id TEXT NOT NULL,
        server TEXT NOT NULL,
        owner TEXT NOT NULL,
        language TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        version TEXT,
        last_updated TEXT,
        metadata TEXT, -- JSON metadata
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(server, owner, language, resource_id)
      )
    `);

    // Books table - stores book-organized content (Scripture, Notes, Questions)
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id INTEGER NOT NULL,
        book_code TEXT NOT NULL,
        book_name TEXT,
        testament TEXT,
        content TEXT, -- JSON content
        size INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources (id),
        UNIQUE(resource_id, book_code)
      )
    `);

    // Entries table - stores entry-organized content (Academy, Translation Words)
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id INTEGER NOT NULL,
        entry_id TEXT NOT NULL,
        title TEXT,
        category TEXT,
        content TEXT, -- JSON content
        size INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources (id),
        UNIQUE(resource_id, entry_id)
      )
    `);

    // Verses table - for quick verse lookup in scripture resources
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS verses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id INTEGER NOT NULL,
        book_code TEXT NOT NULL,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        text TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources (id),
        UNIQUE(resource_id, book_code, chapter, verse)
      )
    `);

    // Notes table - for quick note lookup
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id INTEGER NOT NULL,
        book_code TEXT NOT NULL,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        note_text TEXT NOT NULL,
        reference TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resource_id) REFERENCES resources (id)
      )
    `);

    // Create indexes for performance
    await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_resources_lookup ON resources (server, owner, language, resource_id)`);
    await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_books_lookup ON books (resource_id, book_code)`);
    await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_entries_lookup ON entries (resource_id, entry_id)`);
    await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_verses_lookup ON verses (resource_id, book_code, chapter, verse)`);
    await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_notes_lookup ON notes (resource_id, book_code, chapter, verse)`);

    console.log('📊 Database tables created');
  }

  /**
   * Add a resource to the database
   */
  async addResource(metadata: any): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.run(`
      INSERT OR REPLACE INTO resources (
        resource_id, server, owner, language, type, title, description, 
        version, last_updated, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      metadata.id,
      metadata.server,
      metadata.owner,
      metadata.language,
      metadata.type,
      metadata.title,
      metadata.description,
      metadata.version,
      metadata.lastUpdated?.toISOString() || new Date().toISOString(),
      JSON.stringify(metadata)
    ]);

    console.log(`📊 Added resource to database: ${metadata.id} (ID: ${result.lastID})`);
    return result.lastID;
  }

  /**
   * Add book content to the database
   */
  async addBookContent(resourceId: string, bookCode: string, content: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Get the database resource ID
    const resource = await this.db.get(
      'SELECT id FROM resources WHERE resource_id = ?',
      [resourceId]
    );

    if (!resource) {
      console.warn(`⚠️ Resource not found for book content: ${resourceId}`);
      return;
    }

    // Add book content
    await this.db.run(`
      INSERT OR REPLACE INTO books (
        resource_id, book_code, book_name, testament, content, size
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      resource.id,
      bookCode.toLowerCase(),
      content.meta?.bookName || bookCode,
      content.meta?.testament || this.getTestament(bookCode),
      JSON.stringify(content),
      JSON.stringify(content).length
    ]);

    // If this is scripture content, extract verses for quick lookup
    if (content.type === 'scripture' && content.chapters) {
      await this.extractVerses(resource.id, bookCode, content);
    }

    // If this is notes content, extract notes for quick lookup
    if (content.type === 'notes' && content.notes) {
      await this.extractNotes(resource.id, bookCode, content);
    }

    console.log(`📊 Added book content to database: ${bookCode}`);
  }

  /**
   * Add entry content to the database
   */
  async addEntryContent(resourceId: string, entryId: string, content: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Get the database resource ID
    const resource = await this.db.get(
      'SELECT id FROM resources WHERE resource_id = ?',
      [resourceId]
    );

    if (!resource) {
      console.warn(`⚠️ Resource not found for entry content: ${resourceId}`);
      return;
    }

    // Extract category from entryId (e.g., "bible/kt/grace" -> "kt")
    const entryParts = entryId.split('/');
    const category = entryParts.length > 1 ? entryParts[entryParts.length - 2] : 'unknown';
    
    // Extract title from content
    const title = content.article?.title || content.word?.term || entryId;

    // Add entry content
    await this.db.run(`
      INSERT OR REPLACE INTO entries (
        resource_id, entry_id, title, category, content, size
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      resource.id,
      entryId,
      title,
      category,
      JSON.stringify(content),
      JSON.stringify(content).length
    ]);

    console.log(`📊 Added entry content to database: ${entryId}`);
  }

  /**
   * Extract verses from scripture content for quick lookup
   */
  private async extractVerses(resourceId: number, bookCode: string, content: any): Promise<void> {
    if (!this.db || !content.chapters) return;

    for (const chapter of content.chapters) {
      const chapterNum = chapter.number;
      
      if (chapter.verses) {
        for (const verse of chapter.verses) {
          const verseNum = verse.number;
          const text = verse.text || '';
          
          await this.db.run(`
            INSERT OR REPLACE INTO verses (
              resource_id, book_code, chapter, verse, text
            ) VALUES (?, ?, ?, ?, ?)
          `, [resourceId, bookCode.toLowerCase(), chapterNum, verseNum, text]);
        }
      }
    }
  }

  /**
   * Extract notes from notes content for quick lookup
   */
  private async extractNotes(resourceId: number, bookCode: string, content: any): Promise<void> {
    if (!this.db || !content.notes) return;

    for (const note of content.notes) {
      const chapter = note.chapter || 0;
      const verse = note.verse || 0;
      const noteText = note.note || note.text || '';
      const reference = note.reference || '';
      
      await this.db.run(`
        INSERT INTO notes (
          resource_id, book_code, chapter, verse, note_text, reference
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [resourceId, bookCode.toLowerCase(), chapter, verse, noteText, reference]);
    }
  }

  /**
   * Get testament for a book code
   */
  private getTestament(bookCode: string): 'OT' | 'NT' {
    const otBooks = [
      'gen', 'exo', 'lev', 'num', 'deu', 'jos', 'jdg', 'rut', '1sa', '2sa',
      '1ki', '2ki', '1ch', '2ch', 'ezr', 'neh', 'est', 'job', 'psa', 'pro',
      'ecc', 'sng', 'isa', 'jer', 'lam', 'ezk', 'dan', 'hos', 'jol', 'amo',
      'oba', 'jon', 'mic', 'nam', 'hab', 'zep', 'hag', 'zec', 'mal'
    ];
    
    return otBooks.includes(bookCode.toLowerCase()) ? 'OT' : 'NT';
  }

  /**
   * Finalize the database (close connections, optimize, etc.)
   */
  async finalize(): Promise<void> {
    if (!this.db) return;

    // Optimize database
    await this.db.exec('VACUUM');
    await this.db.exec('ANALYZE');

    // Get statistics
    const stats = await this.getStatistics();
    
    console.log('📊 Database Statistics:');
    console.log(`  • Resources: ${stats.resources}`);
    console.log(`  • Books: ${stats.books}`);
    console.log(`  • Entries: ${stats.entries}`);
    console.log(`  • Verses: ${stats.verses}`);
    console.log(`  • Notes: ${stats.notes}`);

    // Close database
    await this.db.close();
    this.db = undefined;

    console.log(`✅ Database finalized: ${this.dbPath}`);
  }

  /**
   * Get database statistics
   */
  private async getStatistics(): Promise<{
    resources: number;
    books: number;
    entries: number;
    verses: number;
    notes: number;
  }> {
    if (!this.db) {
      return { resources: 0, books: 0, entries: 0, verses: 0, notes: 0 };
    }

    const [
      resourcesResult,
      booksResult,
      entriesResult,
      versesResult,
      notesResult
    ] = await Promise.all([
      this.db.get('SELECT COUNT(*) as count FROM resources'),
      this.db.get('SELECT COUNT(*) as count FROM books'),
      this.db.get('SELECT COUNT(*) as count FROM entries'),
      this.db.get('SELECT COUNT(*) as count FROM verses'),
      this.db.get('SELECT COUNT(*) as count FROM notes')
    ]);

    return {
      resources: resourcesResult?.count || 0,
      books: booksResult?.count || 0,
      entries: entriesResult?.count || 0,
      verses: versesResult?.count || 0,
      notes: notesResult?.count || 0
    };
  }

  /**
   * Create database backup
   */
  async createBackup(backupPath?: string): Promise<string> {
    if (!backupPath) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      backupPath = this.dbPath.replace('.db', `_backup_${timestamp}.db`);
    }

    await fs.copyFile(this.dbPath, backupPath);
    console.log(`💾 Database backup created: ${backupPath}`);
    
    return backupPath;
  }
}
