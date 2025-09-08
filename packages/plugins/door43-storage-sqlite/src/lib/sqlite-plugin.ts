/**
 * SQLite Storage Plugin
 * Separate plugin library for SQLite storage backend
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import { 
  IStoragePlugin, 
  StoragePluginMetadata, 
  IStorageBackend, 
  StorageConfig 
} from '@bt-toolkit/door43-storage';

/**
 * SQLite storage plugin implementation
 */
export class SQLiteStoragePlugin implements IStoragePlugin {
  metadata: StoragePluginMetadata = {
    name: '@bt-toolkit/door43-storage-sqlite',
    version: '1.0.0',
    type: 'sqlite',
    description: 'SQLite database storage backend for mobile and desktop platforms',
    platforms: ['mobile', 'desktop', 'server'],
    dependencies: ['better-sqlite3', 'sqlite3', 'react-native-sqlite-storage'],
    author: 'BT Toolkit Team',
    builtin: false
  };

  createBackend(): IStorageBackend {
    return new SQLiteStorageBackend();
  }

  async validateConfig(config: StorageConfig): AsyncResult<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.type !== 'sqlite') {
      errors.push('Config type must be "sqlite"');
    }

    if (!config.options?.databasePath && !config.options?.databaseName) {
      errors.push('Either databasePath or databaseName must be specified');
    }

    if (config.options?.enableWAL === undefined) {
      warnings.push('Consider enabling WAL mode for better performance');
    }

    return {
      success: true,
      data: {
        valid: errors.length === 0,
        errors,
        warnings
      }
    };
  }

  async isAvailable(): AsyncResult<boolean> {
    try {
      // Check if SQLite is available on current platform
      if (typeof window !== 'undefined') {
        // Browser environment - SQLite not directly available
        return { success: true, data: false };
      }

      if (typeof process !== 'undefined') {
        // Node.js environment - check for SQLite packages
        try {
          // Try to require SQLite packages
          require.resolve('better-sqlite3');
          return { success: true, data: true };
        } catch {
          try {
            require.resolve('sqlite3');
            return { success: true, data: true };
          } catch {
            return { success: true, data: false };
          }
        }
      }

      // React Native environment - check for react-native-sqlite-storage
      try {
        require.resolve('react-native-sqlite-storage');
        return { success: true, data: true };
      } catch {
        return { success: true, data: false };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check SQLite availability'
      };
    }
  }

  getConfigSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['sqlite'] },
        options: {
          type: 'object',
          properties: {
            databasePath: { 
              type: 'string', 
              description: 'Full path to SQLite database file' 
            },
            databaseName: { 
              type: 'string', 
              description: 'Database name (for React Native)' 
            },
            enableWAL: { 
              type: 'boolean', 
              description: 'Enable Write-Ahead Logging for better performance',
              default: true
            },
            cacheSize: { 
              type: 'number', 
              description: 'SQLite cache size in pages',
              default: 10000
            },
            journalMode: { 
              type: 'string', 
              enum: ['DELETE', 'TRUNCATE', 'PERSIST', 'MEMORY', 'WAL', 'OFF'],
              description: 'SQLite journal mode',
              default: 'WAL'
            },
            synchronous: {
              type: 'string',
              enum: ['OFF', 'NORMAL', 'FULL', 'EXTRA'],
              description: 'SQLite synchronous mode',
              default: 'NORMAL'
            }
          },
          anyOf: [
            { required: ['databasePath'] },
            { required: ['databaseName'] }
          ]
        }
      },
      required: ['type', 'options']
    };
  }

  async initialize(): AsyncResult<void> {
    console.log('🔌 SQLite storage plugin initialized');
    return { success: true, data: undefined };
  }

  async cleanup(): AsyncResult<void> {
    console.log('🔌 SQLite storage plugin cleaned up');
    return { success: true, data: undefined };
  }
}

/**
 * SQLite storage backend implementation
 * This is a mock implementation - real implementation would use platform-specific SQLite
 */
class SQLiteStorageBackend implements IStorageBackend {
  private config?: StorageConfig;
  private isInitialized = false;
  private mockStorage = new Map<string, any>();

  async initialize(config: StorageConfig): AsyncResult<void> {
    try {
      this.config = config;
      
      // In a real implementation, this would:
      // 1. Create/open SQLite database
      // 2. Create tables if they don't exist
      // 3. Set up indexes
      // 4. Configure WAL mode, cache size, etc.
      
      console.log(`📦 Initializing SQLite database: ${config.options?.databasePath || config.options?.databaseName}`);
      
      this.isInitialized = true;
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize SQLite backend'
      };
    }
  }

  async isAvailable(): AsyncResult<boolean> {
    return { success: true, data: this.isInitialized };
  }

  async getStorageInfo(): AsyncResult<any> {
    return {
      success: true,
      data: {
        type: 'sqlite',
        usedSpace: this.mockStorage.size * 100, // Mock calculation
        version: '1.0.0',
        connected: this.isInitialized,
        performance: {
          avgReadTime: 1,
          avgWriteTime: 2,
          errorRate: 0
        }
      }
    };
  }

  async set(key: string, value: any, options?: any): AsyncResult<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Backend not initialized');
      }
      
      // Mock implementation - real version would use SQL INSERT/UPDATE
      this.mockStorage.set(key, { value, options, createdAt: new Date() });
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Set operation failed'
      };
    }
  }

  async get<T = any>(key: string): AsyncResult<T | null> {
    try {
      if (!this.isInitialized) {
        throw new Error('Backend not initialized');
      }
      
      // Mock implementation - real version would use SQL SELECT
      const entry = this.mockStorage.get(key);
      return { success: true, data: entry ? entry.value : null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Get operation failed'
      };
    }
  }

  async has(key: string): AsyncResult<boolean> {
    try {
      if (!this.isInitialized) {
        throw new Error('Backend not initialized');
      }
      
      return { success: true, data: this.mockStorage.has(key) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Has operation failed'
      };
    }
  }

  async delete(key: string): AsyncResult<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Backend not initialized');
      }
      
      this.mockStorage.delete(key);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete operation failed'
      };
    }
  }

  async keys(prefix?: string): AsyncResult<string[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('Backend not initialized');
      }
      
      const allKeys = Array.from(this.mockStorage.keys());
      if (!prefix) {
        return { success: true, data: allKeys };
      }
      
      const filteredKeys = allKeys.filter(key => key.startsWith(prefix));
      return { success: true, data: filteredKeys };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Keys operation failed'
      };
    }
  }

  async clear(): AsyncResult<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Backend not initialized');
      }
      
      this.mockStorage.clear();
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Clear operation failed'
      };
    }
  }

  // Mock implementations for remaining methods
  async batch(operations: any[]): AsyncResult<any> {
    const results = [];
    for (const op of operations) {
      try {
        let result: any;
        switch (op.type) {
          case 'set':
            await this.set(op.key, op.value, op.options);
            result = { key: op.key, success: true };
            break;
          case 'get':
            const getResult = await this.get(op.key);
            result = { key: op.key, success: true, value: getResult.data };
            break;
          case 'delete':
            await this.delete(op.key);
            result = { key: op.key, success: true };
            break;
          case 'has':
            const hasResult = await this.has(op.key);
            result = { key: op.key, success: true, value: hasResult.data };
            break;
          default:
            result = { key: op.key, success: false, error: 'Unknown operation' };
        }
        results.push(result);
      } catch (error) {
        results.push({ 
          key: op.key, 
          success: false, 
          error: error instanceof Error ? error.message : 'Operation failed' 
        });
      }
    }
    
    return {
      success: true,
      data: {
        results,
        executionTime: 1 // Mock timing
      }
    };
  }

  async getMultiple<T = any>(keys: string[]): AsyncResult<Array<{ key: string; value: T | null }>> {
    const results = [];
    for (const key of keys) {
      const result = await this.get<T>(key);
      results.push({ key, value: result.success ? result.data : null });
    }
    return { success: true, data: results };
  }

  async setMultiple(entries: Array<{ key: string; value: any; options?: any }>): AsyncResult<void> {
    for (const entry of entries) {
      const result = await this.set(entry.key, entry.value, entry.options);
      if (!result.success) {
        return result;
      }
    }
    return { success: true, data: undefined };
  }

  async deleteMultiple(keys: string[]): AsyncResult<void> {
    for (const key of keys) {
      const result = await this.delete(key);
      if (!result.success) {
        return result;
      }
    }
    return { success: true, data: undefined };
  }

  async subscribe(pattern: string, callback: any): AsyncResult<string> {
    // Mock subscription
    return { success: true, data: 'mock-subscription-id' };
  }

  async unsubscribe(subscriptionId: string): AsyncResult<void> {
    return { success: true, data: undefined };
  }

  async optimize(): AsyncResult<any> {
    return {
      success: true,
      data: {
        spaceFreed: 0,
        operations: ['VACUUM', 'ANALYZE'],
        optimizationTime: 10,
        performanceImprovement: 0.05
      }
    };
  }

  async close(): AsyncResult<void> {
    try {
      this.isInitialized = false;
      this.mockStorage.clear();
      console.log('📦 SQLite database closed');
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close SQLite backend'
      };
    }
  }
}
