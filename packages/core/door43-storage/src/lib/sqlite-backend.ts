/**
 * SQLite Storage Backend
 * SQLite database implementation for mobile and desktop platforms
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import {
  IStorageBackend,
  StorageConfig,
  StorageInfo,
  StorageOptions,
  BatchStorageOperation,
  BatchStorageResult,
  StorageChangeEvent,
  StorageOptimizationResult
} from './storage-interface.js';

// SQLite interface (will be provided by platform-specific implementation)
interface SQLiteDatabase {
  exec(sql: string, params?: any[]): Promise<any>;
  get(sql: string, params?: any[]): Promise<any>;
  all(sql: string, params?: any[]): Promise<any[]>;
  run(sql: string, params?: any[]): Promise<{ lastID?: number; changes: number }>;
  close(): Promise<void>;
}

/**
 * SQLite storage backend implementation
 */
export class SQLiteStorageBackend implements IStorageBackend {
  private db?: SQLiteDatabase;
  private config?: StorageConfig;
  private isInitialized = false;
  private subscriptions = new Map<string, { pattern: RegExp; callback: (event: StorageChangeEvent) => void }>();
  private subscriptionCounter = 0;
  private performanceMetrics = {
    totalReads: 0,
    totalWrites: 0,
    totalReadTime: 0,
    totalWriteTime: 0,
    errors: 0
  };

  async initialize(config: StorageConfig): AsyncResult<void> {
    try {
      this.config = config;
      
      // Create SQLite database instance
      // Note: This will need platform-specific implementation
      this.db = await this.createDatabase(config);
      
      // Create tables
      await this.createTables();
      
      // Create indexes
      await this.createIndexes();
      
      this.isInitialized = true;
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize SQLite storage'
      };
    }
  }

  async isAvailable(): AsyncResult<boolean> {
    return { success: true, data: this.isInitialized && !!this.db };
  }

  async getStorageInfo(): AsyncResult<StorageInfo> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      // Get database size and statistics
      const sizeResult = await this.db.get('PRAGMA page_count');
      const pageSizeResult = await this.db.get('PRAGMA page_size');
      const usedSpace = (sizeResult?.page_count || 0) * (pageSizeResult?.page_size || 4096);

      // Get entry count (for future use)
      // const countResult = await this.db.get('SELECT COUNT(*) as count FROM storage_entries');
      // const entryCount = countResult?.count || 0;

      return {
        success: true,
        data: {
          type: 'sqlite',
          usedSpace,
          version: '1.0.0',
          connected: this.isInitialized,
          performance: {
            avgReadTime: this.performanceMetrics.totalReads > 0 
              ? this.performanceMetrics.totalReadTime / this.performanceMetrics.totalReads 
              : 0,
            avgWriteTime: this.performanceMetrics.totalWrites > 0
              ? this.performanceMetrics.totalWriteTime / this.performanceMetrics.totalWrites
              : 0,
            errorRate: (this.performanceMetrics.totalReads + this.performanceMetrics.totalWrites) > 0
              ? this.performanceMetrics.errors / (this.performanceMetrics.totalReads + this.performanceMetrics.totalWrites)
              : 0
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get storage info'
      };
    }
  }

  async set(key: string, value: any, options?: StorageOptions): AsyncResult<void> {
    const startTime = Date.now();
    
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const now = new Date().toISOString();
      const expiresAt = options?.ttl ? new Date(Date.now() + options.ttl).toISOString() : null;
      const processedValue = this.processValue(value, options);
      
      // Upsert the entry
      await this.db.run(`
        INSERT OR REPLACE INTO storage_entries 
        (key, value, created_at, expires_at, options, access_count, last_accessed_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `, [key, processedValue, now, expiresAt, JSON.stringify(options || {}), now]);

      // Emit change event
      this.emitChangeEvent({
        type: 'set',
        key,
        newValue: value,
        timestamp: new Date()
      });

      this.performanceMetrics.totalWrites++;
      this.performanceMetrics.totalWriteTime += Date.now() - startTime;

      return { success: true, data: undefined };
    } catch (error) {
      this.performanceMetrics.errors++;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set value'
      };
    }
  }

  async get<T = any>(key: string): AsyncResult<T | null> {
    const startTime = Date.now();
    
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      // Get the entry
      const entry = await this.db.get(`
        SELECT value, expires_at, options, access_count 
        FROM storage_entries 
        WHERE key = ?
      `, [key]);

      if (!entry) {
        this.performanceMetrics.totalReads++;
        this.performanceMetrics.totalReadTime += Date.now() - startTime;
        return { success: true, data: null };
      }

      // Check if expired
      if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
        await this.delete(key);
        this.performanceMetrics.totalReads++;
        this.performanceMetrics.totalReadTime += Date.now() - startTime;
        return { success: true, data: null };
      }

      // Update access metrics
      await this.db.run(`
        UPDATE storage_entries 
        SET access_count = access_count + 1, last_accessed_at = ?
        WHERE key = ?
      `, [new Date().toISOString(), key]);

      const options = entry.options ? JSON.parse(entry.options) : undefined;
      const value = this.unprocessValue(entry.value, options);

      this.performanceMetrics.totalReads++;
      this.performanceMetrics.totalReadTime += Date.now() - startTime;

      return { success: true, data: value };
    } catch (error) {
      this.performanceMetrics.errors++;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get value'
      };
    }
  }

  async has(key: string): AsyncResult<boolean> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const entry = await this.db.get(`
        SELECT expires_at FROM storage_entries WHERE key = ?
      `, [key]);

      if (!entry) {
        return { success: true, data: false };
      }

      // Check if expired
      if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
        await this.delete(key);
        return { success: true, data: false };
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check key existence'
      };
    }
  }

  async delete(key: string): AsyncResult<void> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      // Get the value before deleting for the event
      const entry = await this.db.get('SELECT value, options FROM storage_entries WHERE key = ?', [key]);
      
      const result = await this.db.run('DELETE FROM storage_entries WHERE key = ?', [key]);

      if (result.changes > 0 && entry) {
        const options = entry.options ? JSON.parse(entry.options) : undefined;
        const value = this.unprocessValue(entry.value, options);
        
        this.emitChangeEvent({
          type: 'delete',
          key,
          oldValue: value,
          timestamp: new Date()
        });
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete key'
      };
    }
  }

  async keys(prefix?: string): AsyncResult<string[]> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      let sql = 'SELECT key FROM storage_entries';
      const params: any[] = [];

      if (prefix) {
        sql += ' WHERE key LIKE ?';
        params.push(`${prefix}%`);
      }

      const results = await this.db.all(sql, params);
      const keys = results.map(row => row.key);

      return { success: true, data: keys };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get keys'
      };
    }
  }

  async clear(): AsyncResult<void> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      await this.db.run('DELETE FROM storage_entries');
      
      this.emitChangeEvent({
        type: 'clear',
        key: '*',
        timestamp: new Date()
      });

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear storage'
      };
    }
  }

  async batch(operations: BatchStorageOperation[]): AsyncResult<BatchStorageResult> {
    const startTime = Date.now();
    const results: BatchStorageResult['results'] = [];

    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      // Use transaction for batch operations
      await this.db.exec('BEGIN TRANSACTION');

      try {
        for (const operation of operations) {
          try {
            let result: any;
            let success = true;

            switch (operation.type) {
              case 'set':
                const setResult = await this.set(operation.key, operation.value, operation.options);
                success = setResult.success;
                if (!success) throw new Error(setResult.error);
                break;

              case 'get':
                const getResult = await this.get(operation.key);
                success = getResult.success;
                result = getResult.data;
                if (!success) throw new Error(getResult.error);
                break;

              case 'delete':
                const deleteResult = await this.delete(operation.key);
                success = deleteResult.success;
                if (!success) throw new Error(deleteResult.error);
                break;

              case 'has':
                const hasResult = await this.has(operation.key);
                success = hasResult.success;
                result = hasResult.data;
                if (!success) throw new Error(hasResult.error);
                break;

              default:
                throw new Error(`Unknown operation type: ${operation.type}`);
            }

            results.push({
              key: operation.key,
              success,
              value: result
            });
          } catch (error) {
            results.push({
              key: operation.key,
              success: false,
              error: error instanceof Error ? error.message : 'Operation failed'
            });
          }
        }

        await this.db.exec('COMMIT');
      } catch (error) {
        await this.db.exec('ROLLBACK');
        throw error;
      }

      return {
        success: true,
        data: {
          results,
          executionTime: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch operation failed'
      };
    }
  }

  async getMultiple<T = any>(keys: string[]): AsyncResult<Array<{ key: string; value: T | null }>> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const placeholders = keys.map(() => '?').join(',');
      const entries = await this.db.all(`
        SELECT key, value, expires_at, options 
        FROM storage_entries 
        WHERE key IN (${placeholders})
      `, keys);

      const results: Array<{ key: string; value: T | null }> = [];
      const entryMap = new Map(entries.map(entry => [entry.key, entry]));

      for (const key of keys) {
        const entry = entryMap.get(key);
        
        if (!entry) {
          results.push({ key, value: null });
          continue;
        }

        // Check if expired
        if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
          await this.delete(key);
          results.push({ key, value: null });
          continue;
        }

        const options = entry.options ? JSON.parse(entry.options) : undefined;
        const value = this.unprocessValue(entry.value, options);
        results.push({ key, value });
      }

      return { success: true, data: results };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get multiple values'
      };
    }
  }

  async setMultiple(entries: Array<{ key: string; value: any; options?: StorageOptions }>): AsyncResult<void> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      await this.db.exec('BEGIN TRANSACTION');

      try {
        for (const entry of entries) {
          const result = await this.set(entry.key, entry.value, entry.options);
          if (!result.success) {
            throw new Error(`Failed to set ${entry.key}: ${result.error}`);
          }
        }

        await this.db.exec('COMMIT');
      } catch (error) {
        await this.db.exec('ROLLBACK');
        throw error;
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set multiple values'
      };
    }
  }

  async deleteMultiple(keys: string[]): AsyncResult<void> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const placeholders = keys.map(() => '?').join(',');
      await this.db.run(`DELETE FROM storage_entries WHERE key IN (${placeholders})`, keys);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete multiple keys'
      };
    }
  }

  async subscribe(pattern: string, callback: (event: StorageChangeEvent) => void): AsyncResult<string> {
    try {
      const subscriptionId = `sub_${++this.subscriptionCounter}`;
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      
      this.subscriptions.set(subscriptionId, { pattern: regex, callback });
      
      return { success: true, data: subscriptionId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe'
      };
    }
  }

  async unsubscribe(subscriptionId: string): AsyncResult<void> {
    try {
      this.subscriptions.delete(subscriptionId);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe'
      };
    }
  }

  async optimize(): AsyncResult<StorageOptimizationResult> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const startTime = Date.now();
      let spaceFreed = 0;
      const operations: string[] = [];

      // Remove expired entries
      const expiredResult = await this.db.run(`
        DELETE FROM storage_entries 
        WHERE expires_at IS NOT NULL AND expires_at < ?
      `, [new Date().toISOString()]);

      if (expiredResult.changes > 0) {
        operations.push(`Removed ${expiredResult.changes} expired entries`);
      }

      // Vacuum database to reclaim space
      await this.db.exec('VACUUM');
      operations.push('Vacuumed database');

      // Analyze tables for query optimization
      await this.db.exec('ANALYZE');
      operations.push('Analyzed tables');

      return {
        success: true,
        data: {
          spaceFreed,
          operations,
          optimizationTime: Date.now() - startTime,
          performanceImprovement: expiredResult.changes > 0 ? 0.1 : 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to optimize storage'
      };
    }
  }

  async close(): AsyncResult<void> {
    try {
      if (this.db) {
        await this.db.close();
        this.db = undefined;
      }
      
      this.subscriptions.clear();
      this.isInitialized = false;
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close storage'
      };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async createDatabase(config: StorageConfig): Promise<SQLiteDatabase> {
    // This is a placeholder - actual implementation will depend on platform
    // For Node.js: use better-sqlite3 or sqlite3
    // For React Native: use react-native-sqlite-storage or expo-sqlite
    // For Electron: use better-sqlite3
    
    throw new Error('SQLite database creation not implemented - requires platform-specific implementation');
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS storage_entries (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT,
        options TEXT,
        access_count INTEGER DEFAULT 0,
        last_accessed_at TEXT NOT NULL
      )
    `);
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Index for expiration cleanup
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_expires_at 
      ON storage_entries(expires_at) 
      WHERE expires_at IS NOT NULL
    `);

    // Index for prefix searches
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_key_prefix 
      ON storage_entries(key)
    `);

    // Index for access patterns (LRU)
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_last_accessed 
      ON storage_entries(last_accessed_at)
    `);
  }

  private processValue(value: any, options?: StorageOptions): string {
    let processedValue = JSON.stringify(value);

    // Apply compression if enabled
    if (options?.compress || this.config?.compression?.enabled) {
      // TODO: Implement compression
      // For now, just keep as JSON string
    }

    // Apply encryption if enabled
    if (options?.encrypt || this.config?.encryption?.enabled) {
      // TODO: Implement encryption
      // For now, just base64 encode
      processedValue = Buffer.from(processedValue).toString('base64');
    }

    return processedValue;
  }

  private unprocessValue(value: string, options?: StorageOptions): any {
    let processedValue = value;

    // Reverse encryption if enabled
    if (options?.encrypt || this.config?.encryption?.enabled) {
      // TODO: Implement decryption
      // For now, just base64 decode
      try {
        processedValue = Buffer.from(processedValue, 'base64').toString();
      } catch {
        // If decoding fails, return original value
      }
    }

    // Reverse compression if enabled
    if (options?.compress || this.config?.compression?.enabled) {
      // TODO: Implement decompression
      // For now, just parse JSON
    }

    try {
      return JSON.parse(processedValue);
    } catch {
      return processedValue;
    }
  }

  private emitChangeEvent(event: StorageChangeEvent): void {
    for (const { pattern, callback } of this.subscriptions.values()) {
      if (pattern.test(event.key)) {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in storage change callback:', error);
        }
      }
    }
  }
}
