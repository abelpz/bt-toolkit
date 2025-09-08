/**
 * Format Adapter System
 * Extensible system for round-trip format conversions (JSON ↔ Original Format)
 */

import { AsyncResult } from '@bt-toolkit/door43-core';

// ============================================================================
// Core Adapter Types
// ============================================================================

/**
 * Resource format types
 */
export type ResourceFormat = 'usfm' | 'tsv' | 'md' | 'yaml' | 'json' | string;

/**
 * Conversion direction
 */
export type ConversionDirection = 'to-json' | 'from-json';

/**
 * Format conversion context
 */
export interface ConversionContext {
  /** Source format */
  sourceFormat: ResourceFormat;
  /** Target format */
  targetFormat: ResourceFormat;
  /** Resource type (e.g., 'translation-notes', 'translation-words') */
  resourceType: string;
  /** Resource metadata */
  metadata?: Record<string, any>;
  /** Conversion options */
  options?: Record<string, any>;
}

/**
 * Conversion result
 */
export interface ConversionResult {
  /** Converted content */
  content: string;
  /** Output metadata */
  metadata?: Record<string, any>;
  /** Conversion warnings */
  warnings?: string[];
  /** Conversion statistics */
  stats?: {
    inputSize: number;
    outputSize: number;
    processingTime: number;
  };
}

/**
 * Format adapter interface
 */
export interface IFormatAdapter {
  /** Adapter identifier */
  readonly id: string;
  /** Supported source formats */
  readonly supportedFormats: ResourceFormat[];
  /** Supported resource types (empty array = supports all) */
  readonly supportedResourceTypes: string[];
  /** Adapter version */
  readonly version: string;
  /** Adapter description */
  readonly description: string;
  /** Adapter priority for resource type (higher = preferred) */
  readonly priority: number;

  /**
   * Check if adapter supports conversion
   */
  supports(context: ConversionContext): boolean;

  /**
   * Convert from original format to JSON
   */
  toJson(content: string, context: ConversionContext): AsyncResult<ConversionResult>;

  /**
   * Convert from JSON to original format
   */
  fromJson(jsonContent: string, context: ConversionContext): AsyncResult<ConversionResult>;

  /**
   * Validate content format
   */
  validate(content: string, format: ResourceFormat): AsyncResult<boolean>;

  /**
   * Get adapter configuration schema
   */
  getConfigSchema?(): Record<string, any>;
}

/**
 * Adapter factory function
 */
export type AdapterFactory = (config?: Record<string, any>) => IFormatAdapter;

/**
 * Adapter registration info
 */
export interface AdapterRegistration {
  /** Adapter factory */
  factory: AdapterFactory;
  /** Supported formats */
  formats: ResourceFormat[];
  /** Priority (higher = preferred) */
  priority: number;
  /** Configuration */
  config?: Record<string, any>;
}

// ============================================================================
// Format Adapter Registry
// ============================================================================

/**
 * Format Adapter Registry
 * Manages registration and discovery of format adapters
 */
export class FormatAdapterRegistry {
  private adapters = new Map<string, AdapterRegistration>();
  private formatIndex = new Map<ResourceFormat, string[]>();

  /**
   * Register a format adapter
   */
  register(
    id: string, 
    factory: AdapterFactory, 
    formats: ResourceFormat[], 
    priority: number = 100,
    config?: Record<string, any>
  ): void {
    console.log(`📝 Registering format adapter: ${id} for ${formats.join(', ')}`);
    
    this.adapters.set(id, {
      factory,
      formats,
      priority,
      config
    });

    // Update format index
    formats.forEach(format => {
      if (!this.formatIndex.has(format)) {
        this.formatIndex.set(format, []);
      }
      
      const adapterIds = this.formatIndex.get(format)!;
      if (!adapterIds.includes(id)) {
        adapterIds.push(id);
        // Sort by priority (descending)
        adapterIds.sort((a, b) => {
          const priorityA = this.adapters.get(a)?.priority || 0;
          const priorityB = this.adapters.get(b)?.priority || 0;
          return priorityB - priorityA;
        });
      }
    });
  }

  /**
   * Unregister a format adapter
   */
  unregister(id: string): boolean {
    const registration = this.adapters.get(id);
    if (!registration) {
      return false;
    }

    console.log(`🗑️ Unregistering format adapter: ${id}`);
    
    // Remove from format index
    registration.formats.forEach(format => {
      const adapterIds = this.formatIndex.get(format);
      if (adapterIds) {
        const index = adapterIds.indexOf(id);
        if (index > -1) {
          adapterIds.splice(index, 1);
        }
        if (adapterIds.length === 0) {
          this.formatIndex.delete(format);
        }
      }
    });

    this.adapters.delete(id);
    return true;
  }

  /**
   * Get adapter by ID
   */
  getAdapter(id: string): IFormatAdapter | null {
    const registration = this.adapters.get(id);
    if (!registration) {
      return null;
    }

    try {
      return registration.factory(registration.config);
    } catch (error) {
      console.error(`❌ Failed to create adapter ${id}:`, error);
      return null;
    }
  }

  /**
   * Find best adapter for conversion context
   */
  findAdapter(context: ConversionContext): IFormatAdapter | null {
    const format = context.sourceFormat;
    const adapterIds = this.formatIndex.get(format) || [];

    // Sort adapters by resource type compatibility and priority
    const compatibleAdapters = adapterIds
      .map(id => this.getAdapter(id))
      .filter(adapter => adapter && adapter.supports(context))
      .sort((a, b) => {
        // Prioritize adapters that specifically support the resource type
        const aSupportsResource = a!.supportedResourceTypes.length === 0 || 
                                 a!.supportedResourceTypes.includes(context.resourceType);
        const bSupportsResource = b!.supportedResourceTypes.length === 0 || 
                                 b!.supportedResourceTypes.includes(context.resourceType);
        
        if (aSupportsResource && !bSupportsResource) return -1;
        if (!aSupportsResource && bSupportsResource) return 1;
        
        // Then by priority
        return b!.priority - a!.priority;
      });

    if (compatibleAdapters.length > 0) {
      const selectedAdapter = compatibleAdapters[0]!;
      console.log(`🔧 Using adapter ${selectedAdapter.id} for ${format} (${context.resourceType}) conversion`);
      return selectedAdapter;
    }

    console.warn(`⚠️ No adapter found for format: ${format}, resource: ${context.resourceType}`);
    return null;
  }

  /**
   * List all registered adapters
   */
  listAdapters(): Array<{ id: string; formats: ResourceFormat[]; priority: number }> {
    return Array.from(this.adapters.entries()).map(([id, registration]) => ({
      id,
      formats: registration.formats,
      priority: registration.priority
    }));
  }

  /**
   * Get supported formats
   */
  getSupportedFormats(): ResourceFormat[] {
    return Array.from(this.formatIndex.keys());
  }

  /**
   * Clear all adapters
   */
  clear(): void {
    console.log('🧹 Clearing all format adapters');
    this.adapters.clear();
    this.formatIndex.clear();
  }
}

// ============================================================================
// Format Conversion Service
// ============================================================================

/**
 * Format Conversion Service
 * High-level service for format conversions using registered adapters
 */
export class FormatConversionService {
  constructor(private registry: FormatAdapterRegistry) {}

  /**
   * Convert content to JSON
   */
  async toJson(
    content: string,
    sourceFormat: ResourceFormat,
    resourceType: string,
    options?: Record<string, any>
  ): AsyncResult<ConversionResult> {
    const context: ConversionContext = {
      sourceFormat,
      targetFormat: 'json',
      resourceType,
      options
    };

    const adapter = this.registry.findAdapter(context);
    if (!adapter) {
      return {
        success: false,
        error: `No adapter found for format: ${sourceFormat}`
      };
    }

    console.log(`🔄 Converting ${sourceFormat} → JSON`);
    const startTime = Date.now();
    
    const result = await adapter.toJson(content, context);
    
    if (result.success && result.data) {
      result.data.stats = {
        ...result.data.stats,
        processingTime: Date.now() - startTime,
        inputSize: content.length,
        outputSize: result.data.content.length
      };
      console.log(`✅ Conversion completed in ${result.data.stats.processingTime}ms`);
    }

    return result;
  }

  /**
   * Convert content from JSON
   */
  async fromJson(
    jsonContent: string,
    targetFormat: ResourceFormat,
    resourceType: string,
    options?: Record<string, any>
  ): AsyncResult<ConversionResult> {
    const context: ConversionContext = {
      sourceFormat: 'json',
      targetFormat,
      resourceType,
      options
    };

    const adapter = this.registry.findAdapter({
      ...context,
      sourceFormat: targetFormat // Find adapter that supports the target format
    });
    
    if (!adapter) {
      return {
        success: false,
        error: `No adapter found for format: ${targetFormat}`
      };
    }

    console.log(`🔄 Converting JSON → ${targetFormat}`);
    const startTime = Date.now();
    
    const result = await adapter.fromJson(jsonContent, context);
    
    if (result.success && result.data) {
      result.data.stats = {
        ...result.data.stats,
        processingTime: Date.now() - startTime,
        inputSize: jsonContent.length,
        outputSize: result.data.content.length
      };
      console.log(`✅ Conversion completed in ${result.data.stats.processingTime}ms`);
    }

    return result;
  }

  /**
   * Validate content format
   */
  async validate(
    content: string,
    format: ResourceFormat,
    resourceType: string
  ): AsyncResult<boolean> {
    const context: ConversionContext = {
      sourceFormat: format,
      targetFormat: format,
      resourceType
    };

    const adapter = this.registry.findAdapter(context);
    if (!adapter) {
      return {
        success: false,
        error: `No adapter found for format: ${format}`
      };
    }

    return await adapter.validate(content, format);
  }

  /**
   * Check if format is supported
   */
  isFormatSupported(format: ResourceFormat): boolean {
    return this.registry.getSupportedFormats().includes(format);
  }

  /**
   * Get conversion statistics
   */
  getConversionStats(): {
    supportedFormats: ResourceFormat[];
    registeredAdapters: number;
    adapterList: Array<{ id: string; formats: ResourceFormat[]; priority: number }>;
  } {
    return {
      supportedFormats: this.registry.getSupportedFormats(),
      registeredAdapters: this.registry.listAdapters().length,
      adapterList: this.registry.listAdapters()
    };
  }
}

// ============================================================================
// Base Adapter Implementation
// ============================================================================

/**
 * Base format adapter with common functionality
 */
export abstract class BaseFormatAdapter implements IFormatAdapter {
  abstract readonly id: string;
  abstract readonly supportedFormats: ResourceFormat[];
  abstract readonly supportedResourceTypes: string[];
  abstract readonly version: string;
  abstract readonly description: string;
  abstract readonly priority: number;

  /**
   * Default support check
   */
  supports(context: ConversionContext): boolean {
    const formatSupported = this.supportedFormats.includes(context.sourceFormat) ||
                           this.supportedFormats.includes(context.targetFormat);
    
    const resourceSupported = this.supportedResourceTypes.length === 0 ||
                             this.supportedResourceTypes.includes(context.resourceType);
    
    return formatSupported && resourceSupported;
  }

  /**
   * Convert to JSON (must be implemented by subclasses)
   */
  abstract toJson(content: string, context: ConversionContext): AsyncResult<ConversionResult>;

  /**
   * Convert from JSON (must be implemented by subclasses)
   */
  abstract fromJson(jsonContent: string, context: ConversionContext): AsyncResult<ConversionResult>;

  /**
   * Basic validation (can be overridden)
   */
  async validate(content: string, format: ResourceFormat): AsyncResult<boolean> {
    try {
      // Basic validation - check if content is not empty
      const isValid = content.trim().length > 0;
      return { success: true, data: isValid };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Helper method to create conversion result
   */
  protected createResult(
    content: string,
    metadata?: Record<string, any>,
    warnings?: string[]
  ): ConversionResult {
    return {
      content,
      metadata,
      warnings,
      stats: {
        inputSize: 0,
        outputSize: content.length,
        processingTime: 0
      }
    };
  }

  /**
   * Helper method to parse JSON safely
   */
  protected parseJson(jsonContent: string): any {
    try {
      return JSON.parse(jsonContent);
    } catch (error) {
      throw new Error(`Invalid JSON content: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  }

  /**
   * Helper method to stringify JSON safely
   */
  protected stringifyJson(data: any, pretty: boolean = false): string {
    try {
      return JSON.stringify(data, null, pretty ? 2 : 0);
    } catch (error) {
      throw new Error(`JSON stringify failed: ${error instanceof Error ? error.message : 'Stringify error'}`);
    }
  }
}

// ============================================================================
// Global Registry Instance
// ============================================================================

/**
 * Global format adapter registry
 */
export const globalFormatAdapterRegistry = new FormatAdapterRegistry();

/**
 * Global format conversion service
 */
export const globalFormatConversionService = new FormatConversionService(globalFormatAdapterRegistry);

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new format adapter registry
 */
export function createFormatAdapterRegistry(): FormatAdapterRegistry {
  return new FormatAdapterRegistry();
}

/**
 * Create a new format conversion service
 */
export function createFormatConversionService(registry?: FormatAdapterRegistry): FormatConversionService {
  return new FormatConversionService(registry || globalFormatAdapterRegistry);
}
