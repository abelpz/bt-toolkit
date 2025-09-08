/**
 * Storage Plugin Registry
 * Manages registration and discovery of storage backend plugins
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import { IStorageBackend, StorageType, StorageConfig } from './storage-interface.js';

/**
 * Storage plugin metadata
 */
export interface StoragePluginMetadata {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Storage type this plugin provides */
  type: StorageType;
  /** Plugin description */
  description: string;
  /** Supported platforms */
  platforms: Array<'web' | 'mobile' | 'desktop' | 'server'>;
  /** Plugin dependencies */
  dependencies: string[];
  /** Plugin author */
  author?: string;
  /** Plugin homepage */
  homepage?: string;
  /** Whether plugin is built-in */
  builtin: boolean;
}

/**
 * Storage plugin interface
 */
export interface IStoragePlugin {
  /** Plugin metadata */
  metadata: StoragePluginMetadata;
  
  /** Create storage backend instance */
  createBackend(): IStorageBackend;
  
  /** Validate configuration for this plugin */
  validateConfig(config: StorageConfig): AsyncResult<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  /** Check if plugin is available on current platform */
  isAvailable(): AsyncResult<boolean>;
  
  /** Get plugin-specific configuration schema */
  getConfigSchema(): Record<string, any>;
  
  /** Initialize plugin (called once when registered) */
  initialize?(): AsyncResult<void>;
  
  /** Cleanup plugin (called when unregistered) */
  cleanup?(): AsyncResult<void>;
}

/**
 * Storage plugin registry
 */
export class StoragePluginRegistry {
  private plugins = new Map<StorageType, IStoragePlugin>();
  private initialized = false;

  /**
   * Initialize the plugin registry
   */
  async initialize(): AsyncResult<void> {
    try {
      if (this.initialized) {
        return { success: true, data: undefined };
      }

      // Register built-in plugins
      await this.registerBuiltinPlugins();
      
      this.initialized = true;
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize plugin registry'
      };
    }
  }

  /**
   * Register a storage plugin
   */
  async registerPlugin(plugin: IStoragePlugin): AsyncResult<void> {
    try {
      // Validate plugin
      const validation = await this.validatePlugin(plugin);
      if (!validation.success) {
        return validation;
      }

      // Check if plugin is available on current platform
      const availability = await plugin.isAvailable();
      if (!availability.success || !availability.data) {
        return {
          success: false,
          error: `Plugin ${plugin.metadata.name} is not available on current platform`
        };
      }

      // Initialize plugin if needed
      if (plugin.initialize) {
        const initResult = await plugin.initialize();
        if (!initResult.success) {
          return {
            success: false,
            error: `Failed to initialize plugin ${plugin.metadata.name}: ${initResult.error}`
          };
        }
      }

      // Register plugin
      this.plugins.set(plugin.metadata.type, plugin);
      
      console.log(`✅ Registered storage plugin: ${plugin.metadata.name} (${plugin.metadata.type})`);
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register plugin'
      };
    }
  }

  /**
   * Unregister a storage plugin
   */
  async unregisterPlugin(type: StorageType): AsyncResult<void> {
    try {
      const plugin = this.plugins.get(type);
      if (!plugin) {
        return {
          success: false,
          error: `Plugin for storage type ${type} not found`
        };
      }

      // Cleanup plugin if needed
      if (plugin.cleanup) {
        const cleanupResult = await plugin.cleanup();
        if (!cleanupResult.success) {
          console.warn(`Warning: Failed to cleanup plugin ${plugin.metadata.name}: ${cleanupResult.error}`);
        }
      }

      this.plugins.delete(type);
      
      console.log(`🗑️ Unregistered storage plugin: ${plugin.metadata.name} (${type})`);
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unregister plugin'
      };
    }
  }

  /**
   * Get registered plugin for storage type
   */
  getPlugin(type: StorageType): IStoragePlugin | null {
    return this.plugins.get(type) || null;
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): IStoragePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get available storage types
   */
  getAvailableTypes(): StorageType[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Check if storage type is supported
   */
  isTypeSupported(type: StorageType): boolean {
    return this.plugins.has(type);
  }

  /**
   * Get plugin metadata
   */
  getPluginMetadata(type: StorageType): StoragePluginMetadata | null {
    const plugin = this.plugins.get(type);
    return plugin ? plugin.metadata : null;
  }

  /**
   * Find plugins by platform
   */
  getPluginsByPlatform(platform: 'web' | 'mobile' | 'desktop' | 'server'): IStoragePlugin[] {
    return Array.from(this.plugins.values()).filter(plugin => 
      plugin.metadata.platforms.includes(platform)
    );
  }

  /**
   * Auto-discover and register plugins
   */
  async discoverPlugins(searchPaths?: string[]): AsyncResult<{
    discovered: number;
    registered: number;
    errors: string[];
  }> {
    try {
      // This would scan for plugin packages in node_modules or specified paths
      // For now, just return empty result
      return {
        success: true,
        data: {
          discovered: 0,
          registered: 0,
          errors: []
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to discover plugins'
      };
    }
  }

  /**
   * Validate plugin configuration
   */
  async validatePluginConfig(type: StorageType, config: StorageConfig): AsyncResult<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const plugin = this.plugins.get(type);
      if (!plugin) {
        return {
          success: false,
          error: `Plugin for storage type ${type} not found`
        };
      }

      return await plugin.validateConfig(config);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate plugin config'
      };
    }
  }

  /**
   * Get plugin configuration schema
   */
  getPluginConfigSchema(type: StorageType): Record<string, any> | null {
    const plugin = this.plugins.get(type);
    return plugin ? plugin.getConfigSchema() : null;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async validatePlugin(plugin: IStoragePlugin): AsyncResult<void> {
    try {
      // Check required metadata
      if (!plugin.metadata) {
        throw new Error('Plugin metadata is required');
      }

      if (!plugin.metadata.name) {
        throw new Error('Plugin name is required');
      }

      if (!plugin.metadata.version) {
        throw new Error('Plugin version is required');
      }

      if (!plugin.metadata.type) {
        throw new Error('Plugin storage type is required');
      }

      if (!plugin.metadata.platforms || plugin.metadata.platforms.length === 0) {
        throw new Error('Plugin must specify supported platforms');
      }

      // Check required methods
      if (typeof plugin.createBackend !== 'function') {
        throw new Error('Plugin must implement createBackend method');
      }

      if (typeof plugin.validateConfig !== 'function') {
        throw new Error('Plugin must implement validateConfig method');
      }

      if (typeof plugin.isAvailable !== 'function') {
        throw new Error('Plugin must implement isAvailable method');
      }

      if (typeof plugin.getConfigSchema !== 'function') {
        throw new Error('Plugin must implement getConfigSchema method');
      }

      // Check for conflicts
      if (this.plugins.has(plugin.metadata.type)) {
        const existing = this.plugins.get(plugin.metadata.type)!;
        throw new Error(`Storage type ${plugin.metadata.type} is already registered by plugin ${existing.metadata.name}`);
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Plugin validation failed'
      };
    }
  }

  private async registerBuiltinPlugins(): AsyncResult<void> {
    try {
      // Built-in plugins will be registered here
      // For now, we'll register the memory plugin that's included in this package
      
      const memoryPlugin = await this.createMemoryPlugin();
      const registerResult = await this.registerPlugin(memoryPlugin);
      
      if (!registerResult.success) {
        console.warn(`Failed to register built-in memory plugin: ${registerResult.error}`);
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register built-in plugins'
      };
    }
  }

  private async createMemoryPlugin(): Promise<IStoragePlugin> {
    // Import the memory backend (we'll move it to a separate plugin later)
    const { MemoryStorageBackend } = await import('./memory-backend.js');
    
    return {
      metadata: {
        name: '@bt-toolkit/door43-storage-memory',
        version: '1.0.0',
        type: 'memory',
        description: 'In-memory storage backend for testing and fast access',
        platforms: ['web', 'mobile', 'desktop', 'server'],
        dependencies: [],
        builtin: true
      },
      
      createBackend(): IStorageBackend {
        return new MemoryStorageBackend();
      },
      
      async validateConfig(config: StorageConfig): AsyncResult<{
        valid: boolean;
        errors: string[];
        warnings: string[];
      }> {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        if (config.type !== 'memory') {
          errors.push('Config type must be "memory"');
        }
        
        return {
          success: true,
          data: {
            valid: errors.length === 0,
            errors,
            warnings
          }
        };
      },
      
      async isAvailable(): AsyncResult<boolean> {
        // Memory storage is always available
        return { success: true, data: true };
      },
      
      getConfigSchema(): Record<string, any> {
        return {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['memory'] },
            options: {
              type: 'object',
              properties: {
                maxSize: { type: 'number', description: 'Maximum cache size in bytes' },
                gcInterval: { type: 'number', description: 'Garbage collection interval in ms' }
              }
            }
          },
          required: ['type']
        };
      }
    };
  }
}

// Global plugin registry instance
export const storagePluginRegistry = new StoragePluginRegistry();
