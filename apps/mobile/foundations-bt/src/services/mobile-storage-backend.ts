/**
 * Mobile Storage Backend
 * React Native/Expo optimized storage backend for Door43 systems
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { AsyncResult } from '@bt-toolkit/door43-core';

/**
 * Mobile storage backend using AsyncStorage and FileSystem
 */
export class MobileStorageBackend {
  private memoryCache = new Map<string, any>();
  private cacheSize = 0;
  private maxCacheSize = 50 * 1024 * 1024; // 50MB memory cache
  
  constructor(private options?: {
    maxCacheSize?: number;
    persistLargeItems?: boolean;
    fileSystemPath?: string;
  }) {
    if (options?.maxCacheSize) {
      this.maxCacheSize = options.maxCacheSize;
    }
  }
  
  /**
   * Get value by key
   */
  async get(key: string): AsyncResult<any> {
    try {
      // Check memory cache first
      if (this.memoryCache.has(key)) {
        return { success: true, data: this.memoryCache.get(key) };
      }
      
      // Try AsyncStorage
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        const parsed = JSON.parse(value);
        
        // Cache in memory if not too large
        const size = this.estimateSize(parsed);
        if (this.cacheSize + size <= this.maxCacheSize) {
          this.memoryCache.set(key, parsed);
          this.cacheSize += size;
        }
        
        return { success: true, data: parsed };
      }
      
      // Try file system for large items
      if (this.options?.persistLargeItems) {
        const filePath = this.getFilePath(key);
        const fileExists = await FileSystem.getInfoAsync(filePath);
        
        if (fileExists.exists) {
          const content = await FileSystem.readAsStringAsync(filePath);
          const parsed = JSON.parse(content);
          return { success: true, data: parsed };
        }
      }
      
      return { success: true, data: null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Get operation failed'
      };
    }
  }
  
  /**
   * Set value by key
   */
  async set(key: string, value: any): AsyncResult<void> {
    try {
      const serialized = JSON.stringify(value);
      const size = serialized.length * 2; // Rough estimate for UTF-16
      
      // For large items, consider file system storage
      if (size > 1024 * 1024 && this.options?.persistLargeItems) { // 1MB threshold
        const filePath = this.getFilePath(key);
        await FileSystem.writeAsStringAsync(filePath, serialized);
        
        // Store reference in AsyncStorage
        await AsyncStorage.setItem(key + '_ref', JSON.stringify({ 
          type: 'file',
          path: filePath,
          size 
        }));
      } else {
        // Store in AsyncStorage
        await AsyncStorage.setItem(key, serialized);
        
        // Update memory cache
        if (this.cacheSize + size <= this.maxCacheSize) {
          this.memoryCache.set(key, value);
          this.cacheSize += size;
        } else {
          // Evict from memory cache if too large
          this.memoryCache.delete(key);
        }
      }
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Set operation failed'
      };
    }
  }
  
  /**
   * Check if key exists
   */
  async has(key: string): AsyncResult<boolean> {
    try {
      // Check memory cache
      if (this.memoryCache.has(key)) {
        return { success: true, data: true };
      }
      
      // Check AsyncStorage
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        return { success: true, data: true };
      }
      
      // Check file system reference
      const ref = await AsyncStorage.getItem(key + '_ref');
      if (ref !== null) {
        const refData = JSON.parse(ref);
        if (refData.type === 'file') {
          const fileExists = await FileSystem.getInfoAsync(refData.path);
          return { success: true, data: fileExists.exists };
        }
      }
      
      return { success: true, data: false };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Has operation failed'
      };
    }
  }
  
  /**
   * Delete value by key
   */
  async delete(key: string): AsyncResult<boolean> {
    try {
      let existed = false;
      
      // Remove from memory cache
      if (this.memoryCache.has(key)) {
        this.memoryCache.delete(key);
        existed = true;
      }
      
      // Remove from AsyncStorage
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        await AsyncStorage.removeItem(key);
        existed = true;
      }
      
      // Remove file system reference and file
      const ref = await AsyncStorage.getItem(key + '_ref');
      if (ref !== null) {
        const refData = JSON.parse(ref);
        if (refData.type === 'file') {
          await FileSystem.deleteAsync(refData.path, { idempotent: true });
          await AsyncStorage.removeItem(key + '_ref');
          existed = true;
        }
      }
      
      return { success: true, data: existed };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete operation failed'
      };
    }
  }
  
  /**
   * Get all keys
   */
  async keys(): AsyncResult<string[]> {
    try {
      const asyncStorageKeys = await AsyncStorage.getAllKeys();
      
      // Filter out reference keys
      const dataKeys = asyncStorageKeys.filter(key => !key.endsWith('_ref'));
      
      // Add memory cache keys
      const memoryKeys = Array.from(this.memoryCache.keys());
      
      // Combine and deduplicate
      const allKeys = [...new Set([...dataKeys, ...memoryKeys])];
      
      return { success: true, data: allKeys };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Keys operation failed'
      };
    }
  }
  
  /**
   * Clear all data
   */
  async clear(): AsyncResult<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();
      this.cacheSize = 0;
      
      // Clear AsyncStorage
      await AsyncStorage.clear();
      
      // Clear file system directory if using file storage
      if (this.options?.persistLargeItems) {
        const dirPath = this.getFileDirectory();
        const dirExists = await FileSystem.getInfoAsync(dirPath);
        if (dirExists.exists) {
          await FileSystem.deleteAsync(dirPath, { idempotent: true });
        }
      }
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Clear operation failed'
      };
    }
  }
  
  /**
   * Close storage backend
   */
  async close(): AsyncResult<void> {
    try {
      // Clear memory cache to free memory
      this.memoryCache.clear();
      this.cacheSize = 0;
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Close operation failed'
      };
    }
  }
  
  /**
   * Get storage statistics
   */
  async getStatistics(): AsyncResult<{
    memoryCacheSize: number;
    memoryCacheItems: number;
    asyncStorageItems: number;
    fileSystemItems: number;
    totalEstimatedSize: number;
  }> {
    try {
      const asyncStorageKeys = await AsyncStorage.getAllKeys();
      const dataKeys = asyncStorageKeys.filter(key => !key.endsWith('_ref'));
      const refKeys = asyncStorageKeys.filter(key => key.endsWith('_ref'));
      
      // Estimate AsyncStorage size
      let asyncStorageSize = 0;
      for (const key of dataKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          asyncStorageSize += value.length * 2; // UTF-16 estimate
        }
      }
      
      // Estimate file system size
      let fileSystemSize = 0;
      for (const refKey of refKeys) {
        const ref = await AsyncStorage.getItem(refKey);
        if (ref) {
          const refData = JSON.parse(ref);
          if (refData.size) {
            fileSystemSize += refData.size;
          }
        }
      }
      
      return {
        success: true,
        data: {
          memoryCacheSize: this.cacheSize,
          memoryCacheItems: this.memoryCache.size,
          asyncStorageItems: dataKeys.length,
          fileSystemItems: refKeys.length,
          totalEstimatedSize: this.cacheSize + asyncStorageSize + fileSystemSize
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Statistics operation failed'
      };
    }
  }
  
  // Private helper methods
  
  private getFileDirectory(): string {
    return this.options?.fileSystemPath || 
           `${FileSystem.documentDirectory}door43-storage/`;
  }
  
  private getFilePath(key: string): string {
    const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `${this.getFileDirectory()}${safeKey}.json`;
  }
  
  private estimateSize(obj: any): number {
    return JSON.stringify(obj).length * 2; // UTF-16 estimate
  }
}

/**
 * Create mobile storage backend with default configuration
 */
export function createMobileStorageBackend(options?: {
  maxCacheSize?: number;
  persistLargeItems?: boolean;
  fileSystemPath?: string;
}): MobileStorageBackend {
  return new MobileStorageBackend({
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    persistLargeItems: true,
    ...options
  });
}

/**
 * Create lightweight mobile storage backend (memory + AsyncStorage only)
 */
export function createLightweightMobileStorageBackend(): MobileStorageBackend {
  return new MobileStorageBackend({
    maxCacheSize: 20 * 1024 * 1024, // 20MB
    persistLargeItems: false
  });
}
