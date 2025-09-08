/**
 * Storage Factory
 * Creates storage backend instances using registered plugins
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import { IStorageBackend, StorageConfig, StorageType } from './storage-interface.js';
import { storagePluginRegistry, IStoragePlugin } from './plugin-registry.js';

/**
 * Multi-layer storage configuration
 */
export interface MultiLayerStorageConfig {
  layers: Array<{
    name: string;
    config: StorageConfig;
    priority: number;
    fallback?: boolean;
  }>;
  strategy: 'cascade' | 'parallel' | 'primary-fallback';
}

/**
 * Replicated storage configuration
 */
export interface ReplicatedStorageConfig {
  primary: StorageConfig;
  replicas: StorageConfig[];
  consistency: 'eventual' | 'strong';
  replicationDelay?: number;
}

/**
 * Storage factory for creating backend instances
 */
export class StorageFactory {
  private initialized = false;

  /**
   * Initialize the storage factory
   */
  async initialize(): AsyncResult<void> {
    try {
      if (this.initialized) {
        return { success: true, data: undefined };
      }

      // Initialize plugin registry
      const registryResult = await storagePluginRegistry.initialize();
      if (!registryResult.success) {
        return registryResult;
      }

      this.initialized = true;
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize storage factory'
      };
    }
  }

  /**
   * Create storage backend instance
   */
  async createBackend(config: StorageConfig): AsyncResult<IStorageBackend> {
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return {
            success: false,
            error: initResult.error || 'Initialization failed'
          };
        }
      }

      // Get plugin for storage type
      const plugin = storagePluginRegistry.getPlugin(config.type);
      if (!plugin) {
        return {
          success: false,
          error: `No plugin found for storage type: ${config.type}. Available types: ${storagePluginRegistry.getAvailableTypes().join(', ')}`
        };
      }

      // Validate configuration
      const validation = await plugin.validateConfig(config);
      if (!validation.success) {
        return {
          success: false,
          error: `Configuration validation failed: ${validation.error}`
        };
      }

      if (!validation.data?.valid) {
        return {
          success: false,
          error: `Invalid configuration: ${validation.data?.errors.join(', ') || 'Unknown validation error'}`
        };
      }

      // Create backend instance
      const backend = plugin.createBackend();
      
      // Initialize backend
      const initResult = await backend.initialize(config);
      if (!initResult.success) {
        return {
          success: false,
          error: `Failed to initialize ${config.type} backend: ${initResult.error}`
        };
      }

      console.log(`✅ Created ${config.type} storage backend`);
      
      return { success: true, data: backend };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create storage backend'
      };
    }
  }

  /**
   * Create multi-layer storage backend
   */
  async createMultiLayerBackend(config: MultiLayerStorageConfig): AsyncResult<IStorageBackend> {
    try {
      // Create individual backends
      const backends: Array<{ name: string; backend: IStorageBackend; priority: number; fallback?: boolean }> = [];
      
      for (const layerConfig of config.layers) {
        const backendResult = await this.createBackend(layerConfig.config);
        if (!backendResult.success) {
          return {
            success: false,
            error: `Failed to create layer ${layerConfig.name}: ${backendResult.error}`
          };
        }
        
        if (backendResult.data) {
          backends.push({
            name: layerConfig.name,
            backend: backendResult.data,
            priority: layerConfig.priority,
            fallback: layerConfig.fallback
          });
        }
      }

      // Sort by priority (higher priority first)
      backends.sort((a, b) => b.priority - a.priority);

      // Create multi-layer wrapper
      const multiLayerBackend = new MultiLayerStorageBackend(backends, config.strategy);
      
      console.log(`✅ Created multi-layer storage backend with ${backends.length} layers`);
      
      return { success: true, data: multiLayerBackend };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create multi-layer storage backend'
      };
    }
  }

  /**
   * Create replicated storage backend
   */
  async createReplicatedBackend(config: ReplicatedStorageConfig): AsyncResult<IStorageBackend> {
    try {
      // Create primary backend
      const primaryResult = await this.createBackend(config.primary);
      if (!primaryResult.success) {
        return {
          success: false,
          error: `Failed to create primary backend: ${primaryResult.error}`
        };
      }

      // Create replica backends
      const replicas: IStorageBackend[] = [];
      for (const replicaConfig of config.replicas) {
        const replicaResult = await this.createBackend(replicaConfig);
        if (!replicaResult.success) {
          console.warn(`Failed to create replica backend: ${replicaResult.error}`);
          continue; // Continue with other replicas
        }
        if (replicaResult.data) {
          replicas.push(replicaResult.data);
        }
      }

      // Create replicated wrapper
      if (!primaryResult.data) {
        return {
          success: false,
          error: 'Primary backend creation failed'
        };
      }
      
      const replicatedBackend = new ReplicatedStorageBackend(
        primaryResult.data,
        replicas,
        config.consistency,
        config.replicationDelay
      );
      
      console.log(`✅ Created replicated storage backend with ${replicas.length} replicas`);
      
      return { success: true, data: replicatedBackend };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create replicated storage backend'
      };
    }
  }

  /**
   * Get available storage types
   */
  getAvailableTypes(): StorageType[] {
    return storagePluginRegistry.getAvailableTypes();
  }

  /**
   * Check if storage type is supported
   */
  isTypeSupported(type: StorageType): boolean {
    return storagePluginRegistry.isTypeSupported(type);
  }

  /**
   * Get plugin information
   */
  getPluginInfo(type: StorageType) {
    return storagePluginRegistry.getPluginMetadata(type);
  }

  /**
   * Validate storage configuration
   */
  async validateConfig(config: StorageConfig): AsyncResult<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      if (!storagePluginRegistry.isTypeSupported(config.type)) {
        return {
          success: true,
          data: {
            valid: false,
            errors: [`Unsupported storage type: ${config.type}`],
            warnings: []
          }
        };
      }

      return await storagePluginRegistry.validatePluginConfig(config.type, config);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate configuration'
      };
    }
  }

  /**
   * Get configuration schema for storage type
   */
  getConfigSchema(type: StorageType): Record<string, any> | null {
    return storagePluginRegistry.getPluginConfigSchema(type);
  }

  /**
   * Register a storage plugin
   */
  async registerPlugin(plugin: IStoragePlugin): AsyncResult<void> {
    return await storagePluginRegistry.registerPlugin(plugin);
  }

  /**
   * Auto-discover plugins
   */
  async discoverPlugins(searchPaths?: string[]): AsyncResult<{
    discovered: number;
    registered: number;
    errors: string[];
  }> {
    return await storagePluginRegistry.discoverPlugins(searchPaths);
  }
}

// ============================================================================
// Multi-Layer Storage Backend Implementation
// ============================================================================

class MultiLayerStorageBackend implements IStorageBackend {
  constructor(
    private backends: Array<{ name: string; backend: IStorageBackend; priority: number; fallback?: boolean }>,
    private strategy: 'cascade' | 'parallel' | 'primary-fallback'
  ) {}

  async initialize(config: StorageConfig): AsyncResult<void> {
    // Already initialized during creation
    return { success: true, data: undefined };
  }

  async isAvailable(): AsyncResult<boolean> {
    // Check if at least one backend is available
    for (const { backend } of this.backends) {
      const result = await backend.isAvailable();
      if (result.success && result.data) {
        return { success: true, data: true };
      }
    }
    return { success: true, data: false };
  }

  async getStorageInfo(): AsyncResult<any> {
    // Return info from primary backend
    if (this.backends.length > 0) {
      return await this.backends[0].backend.getStorageInfo();
    }
    return { success: false, error: 'No backends available' };
  }

  async set(key: string, value: any, options?: any): AsyncResult<void> {
    switch (this.strategy) {
      case 'cascade':
        return await this.setCascade(key, value, options);
      case 'parallel':
        return await this.setParallel(key, value, options);
      case 'primary-fallback':
        return await this.setPrimaryFallback(key, value, options);
      default:
        return { success: false, error: 'Unknown strategy' };
    }
  }

  async get<T = any>(key: string): AsyncResult<T | null> {
    // Try backends in priority order
    for (const { backend } of this.backends) {
      const result = await backend.get<T>(key);
      if (result.success && result.data !== null) {
        return result;
      }
    }
    return { success: true, data: null };
  }

  // Implement other IStorageBackend methods...
  async has(key: string): AsyncResult<boolean> {
    for (const { backend } of this.backends) {
      const result = await backend.has(key);
      if (result.success && result.data) {
        return { success: true, data: true };
      }
    }
    return { success: true, data: false };
  }

  async delete(key: string): AsyncResult<void> {
    // Delete from all backends
    const errors: string[] = [];
    for (const { backend } of this.backends) {
      const result = await backend.delete(key);
      if (!result.success) {
        errors.push(result.error || 'Unknown error');
      }
    }
    
    if (errors.length === this.backends.length) {
      return { success: false, error: `All backends failed: ${errors.join(', ')}` };
    }
    
    return { success: true, data: undefined };
  }

  async keys(prefix?: string): AsyncResult<string[]> {
    // Combine keys from all backends
    const allKeys = new Set<string>();
    
    for (const { backend } of this.backends) {
      const result = await backend.keys(prefix);
      if (result.success && result.data) {
        result.data.forEach(key => allKeys.add(key));
      }
    }
    
    return { success: true, data: Array.from(allKeys) };
  }

  async clear(): AsyncResult<void> {
    // Clear all backends
    const errors: string[] = [];
    for (const { backend } of this.backends) {
      const result = await backend.clear();
      if (!result.success) {
        errors.push(result.error || 'Unknown error');
      }
    }
    
    if (errors.length === this.backends.length) {
      return { success: false, error: `All backends failed: ${errors.join(', ')}` };
    }
    
    return { success: true, data: undefined };
  }

  // Implement remaining methods with similar patterns...
  async batch(operations: any[]): AsyncResult<any> {
    return await this.backends[0].backend.batch(operations);
  }

  async getMultiple<T = any>(keys: string[]): AsyncResult<Array<{ key: string; value: T | null }>> {
    return await this.backends[0].backend.getMultiple<T>(keys);
  }

  async setMultiple(entries: Array<{ key: string; value: any; options?: any }>): AsyncResult<void> {
    return await this.backends[0].backend.setMultiple(entries);
  }

  async deleteMultiple(keys: string[]): AsyncResult<void> {
    return await this.backends[0].backend.deleteMultiple(keys);
  }

  async subscribe(pattern: string, callback: any): AsyncResult<string> {
    return await this.backends[0].backend.subscribe(pattern, callback);
  }

  async unsubscribe(subscriptionId: string): AsyncResult<void> {
    return await this.backends[0].backend.unsubscribe(subscriptionId);
  }

  async optimize(): AsyncResult<any> {
    return await this.backends[0].backend.optimize();
  }

  async close(): AsyncResult<void> {
    const errors: string[] = [];
    for (const { backend } of this.backends) {
      const result = await backend.close();
      if (!result.success) {
        errors.push(result.error || 'Unknown error');
      }
    }
    
    if (errors.length === this.backends.length) {
      return { success: false, error: `All backends failed: ${errors.join(', ')}` };
    }
    
    return { success: true, data: undefined };
  }

  // Private methods for different strategies
  private async setCascade(key: string, value: any, options?: any): AsyncResult<void> {
    // Write to highest priority backend first, then cascade down
    for (const { backend } of this.backends) {
      const result = await backend.set(key, value, options);
      if (result.success) {
        return result;
      }
    }
    return { success: false, error: 'All backends failed' };
  }

  private async setParallel(key: string, value: any, options?: any): AsyncResult<void> {
    // Write to all backends in parallel
    const promises = this.backends.map(({ backend }) => backend.set(key, value, options));
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    if (successful > 0) {
      return { success: true, data: undefined };
    }
    
    return { success: false, error: 'All backends failed' };
  }

  private async setPrimaryFallback(key: string, value: any, options?: any): AsyncResult<void> {
    // Write to primary, fallback to others if primary fails
    const primary = this.backends.find(b => !b.fallback) || this.backends[0];
    const result = await primary.backend.set(key, value, options);
    
    if (result.success) {
      return result;
    }
    
    // Try fallback backends
    const fallbacks = this.backends.filter(b => b.fallback);
    for (const { backend } of fallbacks) {
      const fallbackResult = await backend.set(key, value, options);
      if (fallbackResult.success) {
        return fallbackResult;
      }
    }
    
    return { success: false, error: 'Primary and all fallback backends failed' };
  }
}

// ============================================================================
// Replicated Storage Backend Implementation
// ============================================================================

class ReplicatedStorageBackend implements IStorageBackend {
  constructor(
    private primary: IStorageBackend,
    private replicas: IStorageBackend[],
    private consistency: 'eventual' | 'strong',
    private replicationDelay: number = 0
  ) {}

  async initialize(config: StorageConfig): AsyncResult<void> {
    // Already initialized during creation
    return { success: true, data: undefined };
  }

  async isAvailable(): AsyncResult<boolean> {
    return await this.primary.isAvailable();
  }

  async getStorageInfo(): AsyncResult<any> {
    return await this.primary.getStorageInfo();
  }

  async set(key: string, value: any, options?: any): AsyncResult<void> {
    // Write to primary first
    const primaryResult = await this.primary.set(key, value, options);
    if (!primaryResult.success) {
      return primaryResult;
    }

    // Replicate to replicas
    if (this.consistency === 'strong') {
      // Wait for all replicas
      await this.replicateToAll(key, value, options);
    } else {
      // Eventual consistency - replicate in background
      this.replicateToAllAsync(key, value, options);
    }

    return { success: true, data: undefined };
  }

  async get<T = any>(key: string): AsyncResult<T | null> {
    return await this.primary.get<T>(key);
  }

  // Implement other methods delegating to primary...
  async has(key: string): AsyncResult<boolean> {
    return await this.primary.has(key);
  }

  async delete(key: string): AsyncResult<void> {
    const result = await this.primary.delete(key);
    if (result.success) {
      // Replicate deletion
      if (this.consistency === 'strong') {
        await this.replicateDeleteToAll(key);
      } else {
        this.replicateDeleteToAllAsync(key);
      }
    }
    return result;
  }

  async keys(prefix?: string): AsyncResult<string[]> {
    return await this.primary.keys(prefix);
  }

  async clear(): AsyncResult<void> {
    const result = await this.primary.clear();
    if (result.success) {
      // Replicate clear
      if (this.consistency === 'strong') {
        await this.replicateClearToAll();
      } else {
        this.replicateClearToAllAsync();
      }
    }
    return result;
  }

  async batch(operations: any[]): AsyncResult<any> {
    return await this.primary.batch(operations);
  }

  async getMultiple<T = any>(keys: string[]): AsyncResult<Array<{ key: string; value: T | null }>> {
    return await this.primary.getMultiple<T>(keys);
  }

  async setMultiple(entries: Array<{ key: string; value: any; options?: any }>): AsyncResult<void> {
    return await this.primary.setMultiple(entries);
  }

  async deleteMultiple(keys: string[]): AsyncResult<void> {
    return await this.primary.deleteMultiple(keys);
  }

  async subscribe(pattern: string, callback: any): AsyncResult<string> {
    return await this.primary.subscribe(pattern, callback);
  }

  async unsubscribe(subscriptionId: string): AsyncResult<void> {
    return await this.primary.unsubscribe(subscriptionId);
  }

  async optimize(): AsyncResult<any> {
    return await this.primary.optimize();
  }

  async close(): AsyncResult<void> {
    await Promise.allSettled([
      this.primary.close(),
      ...this.replicas.map(r => r.close())
    ]);
    
    return { success: true, data: undefined };
  }

  // Private replication methods
  private async replicateToAll(key: string, value: any, options?: any): Promise<void> {
    await Promise.allSettled(
      this.replicas.map(replica => replica.set(key, value, options))
    );
  }

  private replicateToAllAsync(key: string, value: any, options?: any): void {
    setTimeout(() => {
      this.replicateToAll(key, value, options).catch(error => {
        console.error('Replication error:', error);
      });
    }, this.replicationDelay);
  }

  private async replicateDeleteToAll(key: string): Promise<void> {
    await Promise.allSettled(
      this.replicas.map(replica => replica.delete(key))
    );
  }

  private replicateDeleteToAllAsync(key: string): void {
    setTimeout(() => {
      this.replicateDeleteToAll(key).catch(error => {
        console.error('Replication delete error:', error);
      });
    }, this.replicationDelay);
  }

  private async replicateClearToAll(): Promise<void> {
    await Promise.allSettled(
      this.replicas.map(replica => replica.clear())
    );
  }

  private replicateClearToAllAsync(): void {
    setTimeout(() => {
      this.replicateClearToAll().catch(error => {
        console.error('Replication clear error:', error);
      });
    }, this.replicationDelay);
  }
}

// Global storage factory instance
export const storageFactory = new StorageFactory();
