/**
 * Memory Storage Backend
 * In-memory storage implementation for testing and fast access
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

/**
 * Memory storage entry
 */
interface MemoryStorageEntry {
  value: any;
  createdAt: Date;
  expiresAt?: Date;
  options?: StorageOptions;
  accessCount: number;
  lastAccessedAt: Date;
}

/**
 * Memory storage backend implementation
 */
export class MemoryStorageBackend implements IStorageBackend {
  private storage = new Map<string, MemoryStorageEntry>();
  private subscriptions = new Map<string, { pattern: RegExp; callback: (event: StorageChangeEvent) => void }>();
  private config?: StorageConfig;
  private isInitialized = false;
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
      this.isInitialized = true;
      
      // Start cleanup timer for expired entries
      this.startCleanupTimer();
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize memory storage'
      };
    }
  }

  async isAvailable(): AsyncResult<boolean> {
    return { success: true, data: this.isInitialized };
  }

  async getStorageInfo(): AsyncResult<StorageInfo> {
    try {
      const usedSpace = this.calculateUsedSpace();
      const maxSize = this.config?.performance?.batchSize || 100 * 1024 * 1024; // 100MB default
      
      return {
        success: true,
        data: {
          type: 'memory',
          usedSpace,
          totalQuota: maxSize,
          availableSpace: maxSize - usedSpace,
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
      if (!this.isInitialized) {
        throw new Error('Storage not initialized');
      }

      const now = new Date();
      const expiresAt = options?.ttl ? new Date(now.getTime() + options.ttl) : undefined;
      
      const entry: MemoryStorageEntry = {
        value: this.processValue(value, options),
        createdAt: now,
        expiresAt,
        options,
        accessCount: 0,
        lastAccessedAt: now
      };

      this.storage.set(key, entry);
      
      // Emit change event
      this.emitChangeEvent({
        type: 'set',
        key,
        newValue: value,
        timestamp: now
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
      if (!this.isInitialized) {
        throw new Error('Storage not initialized');
      }

      const entry = this.storage.get(key);
      
      if (!entry) {
        this.performanceMetrics.totalReads++;
        this.performanceMetrics.totalReadTime += Date.now() - startTime;
        return { success: true, data: null };
      }

      // Check if expired
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        this.storage.delete(key);
        this.performanceMetrics.totalReads++;
        this.performanceMetrics.totalReadTime += Date.now() - startTime;
        return { success: true, data: null };
      }

      // Update access metrics
      entry.accessCount++;
      entry.lastAccessedAt = new Date();

      const value = this.unprocessValue(entry.value, entry.options);

      this.performanceMetrics.totalReads++;
      this.performanceMetrics.totalReadTime += Date.now() - startTime;

      return { success: true, data: value as T };
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
      if (!this.isInitialized) {
        throw new Error('Storage not initialized');
      }

      const entry = this.storage.get(key);
      
      if (!entry) {
        return { success: true, data: false };
      }

      // Check if expired
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        this.storage.delete(key);
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
      if (!this.isInitialized) {
        throw new Error('Storage not initialized');
      }

      const entry = this.storage.get(key);
      const deleted = this.storage.delete(key);

      if (deleted && entry) {
        this.emitChangeEvent({
          type: 'delete',
          key,
          oldValue: this.unprocessValue(entry.value, entry.options),
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
      if (!this.isInitialized) {
        throw new Error('Storage not initialized');
      }

      const allKeys = Array.from(this.storage.keys());
      
      if (!prefix) {
        return { success: true, data: allKeys };
      }

      const filteredKeys = allKeys.filter(key => key.startsWith(prefix));
      return { success: true, data: filteredKeys };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get keys'
      };
    }
  }

  async clear(): AsyncResult<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('Storage not initialized');
      }

      this.storage.clear();
      
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
      if (!this.isInitialized) {
        throw new Error('Storage not initialized');
      }

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
      const results: Array<{ key: string; value: T | null }> = [];

      for (const key of keys) {
        const result = await this.get<T>(key);
        results.push({
          key,
          value: result.success ? (result.data ?? null) : null
        });
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
      for (const entry of entries) {
        const result = await this.set(entry.key, entry.value, entry.options);
        if (!result.success) {
          throw new Error(`Failed to set ${entry.key}: ${result.error}`);
        }
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
      for (const key of keys) {
        const result = await this.delete(key);
        if (!result.success) {
          throw new Error(`Failed to delete ${key}: ${result.error}`);
        }
      }

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
      const startTime = Date.now();
      let spaceFreed = 0;
      const operations: string[] = [];

      // Remove expired entries
      const now = new Date();
      const expiredKeys: string[] = [];
      
      for (const [key, entry] of this.storage.entries()) {
        if (entry.expiresAt && entry.expiresAt < now) {
          expiredKeys.push(key);
        }
      }

      for (const key of expiredKeys) {
        const entry = this.storage.get(key);
        if (entry) {
          spaceFreed += this.calculateEntrySize(entry);
          this.storage.delete(key);
        }
      }

      if (expiredKeys.length > 0) {
        operations.push(`Removed ${expiredKeys.length} expired entries`);
      }

      // TODO: Implement LRU eviction if needed
      // TODO: Implement compression optimization

      return {
        success: true,
        data: {
          spaceFreed,
          operations,
          optimizationTime: Date.now() - startTime,
          performanceImprovement: expiredKeys.length > 0 ? 0.1 : 0
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
      this.storage.clear();
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

  private processValue(value: any, options?: StorageOptions): any {
    let processedValue = value;

    // Apply compression if enabled
    if (options?.compress || this.config?.compression?.enabled) {
      // TODO: Implement compression
      // For now, just serialize to JSON
      processedValue = JSON.stringify(value);
    }

    // Apply encryption if enabled
    if (options?.encrypt || this.config?.encryption?.enabled) {
      // TODO: Implement encryption
      // For now, just base64 encode
      if (typeof processedValue === 'string') {
        processedValue = Buffer.from(processedValue).toString('base64');
      }
    }

    return processedValue;
  }

  private unprocessValue(value: any, options?: StorageOptions): any {
    let processedValue = value;

    // Reverse encryption if enabled
    if (options?.encrypt || this.config?.encryption?.enabled) {
      // TODO: Implement decryption
      // For now, just base64 decode
      if (typeof processedValue === 'string') {
        try {
          processedValue = Buffer.from(processedValue, 'base64').toString();
        } catch {
          // If decoding fails, return original value
        }
      }
    }

    // Reverse compression if enabled
    if (options?.compress || this.config?.compression?.enabled) {
      // TODO: Implement decompression
      // For now, just parse JSON
      if (typeof processedValue === 'string') {
        try {
          processedValue = JSON.parse(processedValue);
        } catch {
          // If parsing fails, return original value
        }
      }
    }

    return processedValue;
  }

  private calculateUsedSpace(): number {
    let totalSize = 0;
    
    for (const entry of this.storage.values()) {
      totalSize += this.calculateEntrySize(entry);
    }
    
    return totalSize;
  }

  private calculateEntrySize(entry: MemoryStorageEntry): number {
    // Rough estimation of memory usage
    const valueSize = JSON.stringify(entry.value).length * 2; // UTF-16 characters
    const metadataSize = 200; // Rough estimate for dates, options, etc.
    return valueSize + metadataSize;
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

  private startCleanupTimer(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.optimize().catch(error => {
        console.error('Error during automatic cleanup:', error);
      });
    }, 5 * 60 * 1000);
  }
}
