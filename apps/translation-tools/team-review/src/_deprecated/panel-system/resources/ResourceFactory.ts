import { ResourceAPI, ResourceConfig } from '../types/Resource';
import { 
  ResourceFactory as IResourceFactory,
  ResourceFactoryRegistry as IResourceFactoryRegistry
} from '../types/Resource';

/**
 * Abstract base class for resource factories.
 * Provides a framework for creating specific resource types.
 */
export abstract class ResourceFactory<TProps = any> implements IResourceFactory<TProps> {
  public readonly type: string;

  constructor(type: string) {
    this.type = type;
  }

  // Abstract methods that must be implemented by concrete factories
  abstract create(config: ResourceConfig, props?: TProps): Promise<ResourceAPI>;
  abstract canCreate(config: ResourceConfig): boolean;
  abstract getDefaultConfig(): Partial<ResourceConfig>;

  /**
   * Validate resource configuration
   */
  validateConfig(config: ResourceConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!config.id) {
      errors.push('Resource ID is required');
    }

    if (!config.type) {
      errors.push('Resource type is required');
    }

    if (config.type !== this.type) {
      errors.push(`Expected resource type '${this.type}', got '${config.type}'`);
    }

    if (!config.panelId) {
      errors.push('Panel ID is required');
    }

    // Validate dependencies
    if (config.dependencies) {
      if (!Array.isArray(config.dependencies)) {
        errors.push('Dependencies must be an array');
      } else {
        const duplicates = config.dependencies.filter(
          (dep, index) => config.dependencies!.indexOf(dep) !== index
        );
        if (duplicates.length > 0) {
          errors.push(`Duplicate dependencies found: ${duplicates.join(', ')}`);
        }
      }
    }

    // Validate cleanup strategies
    if (config.cleanupStrategies) {
      if (!Array.isArray(config.cleanupStrategies)) {
        errors.push('Cleanup strategies must be an array');
      }
    }

    // Allow subclasses to add additional validation
    const customErrors = this.validateCustomConfig(config);
    errors.push(...customErrors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Override this method to add custom validation logic
   */
  protected validateCustomConfig(config: ResourceConfig): string[] {
    return [];
  }

  /**
   * Get configuration merged with defaults
   */
  getMergedConfig(config: Partial<ResourceConfig>): ResourceConfig {
    const defaults = this.getDefaultConfig();
    return {
      ...defaults,
      ...config,
      type: this.type, // Ensure type is correct
    } as ResourceConfig;
  }

  /**
   * Check if this factory can handle the given props
   */
  canHandleProps(props: any): props is TProps {
    // Default implementation - override in subclasses for specific validation
    return true;
  }

  /**
   * Get factory metadata
   */
  getMetadata() {
    return {
      type: this.type,
      version: '1.0.0',
      description: `Factory for ${this.type} resources`,
      capabilities: this.getCapabilities(),
    };
  }

  /**
   * Override to specify factory capabilities
   */
  protected getCapabilities(): string[] {
    return ['create', 'validate'];
  }
}

/**
 * Registry for managing resource factories.
 * Handles factory registration and resource creation coordination.
 */
export class ResourceFactoryRegistry implements IResourceFactoryRegistry {
  private factories = new Map<string, IResourceFactory>();
  private creationCount = new Map<string, number>();

  // Factory Management

  register<TProps = any>(factory: IResourceFactory<TProps>): void {
    if (this.factories.has(factory.type)) {
      throw new Error(`Resource factory for type '${factory.type}' is already registered`);
    }

    this.factories.set(factory.type, factory);
    this.creationCount.set(factory.type, 0);
  }

  unregister(type: string): void {
    if (!this.factories.has(type)) {
      return; // Factory doesn't exist
    }

    this.factories.delete(type);
    this.creationCount.delete(type);
  }

  get(type: string): IResourceFactory | undefined {
    return this.factories.get(type);
  }

  getAll(): IResourceFactory[] {
    return Array.from(this.factories.values());
  }

  canCreate(type: string): boolean {
    return this.factories.has(type);
  }

  // Resource Creation

  async createResource(config: ResourceConfig, props?: any): Promise<ResourceAPI> {
    const factory = this.factories.get(config.type);
    if (!factory) {
      throw new Error(`No factory registered for resource type '${config.type}'`);
    }

    // Validate configuration - check if method exists
    let validation: { isValid: boolean; errors: string[] };
    if (typeof (factory as any).validateConfig === 'function') {
      validation = (factory as any).validateConfig(config);
    } else {
      // Basic validation fallback
      validation = {
        isValid: !!config.id && !!config.type && !!config.panelId,
        errors: !config.id ? ['Resource ID is required'] : 
                !config.type ? ['Resource type is required'] :
                !config.panelId ? ['Panel ID is required'] : []
      };
    }
    
    if (!validation.isValid) {
      throw new Error(`Invalid resource configuration: ${validation.errors.join(', ')}`);
    }

    // Check if factory can create with this configuration
    if (!factory.canCreate(config)) {
      throw new Error(`Factory for '${config.type}' cannot create resource with the provided configuration`);
    }

    try {
      // Create the resource
      const resource = await factory.create(config, props);

      // Update creation count
      const currentCount = this.creationCount.get(config.type) || 0;
      this.creationCount.set(config.type, currentCount + 1);

      return resource;

    } catch (error) {
      throw new Error(`Failed to create resource '${config.id}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility Methods

  /**
   * Get factory statistics
   */
  getStatistics() {
    const factories = Array.from(this.factories.values());
    const totalCreations = Array.from(this.creationCount.values()).reduce((sum, count) => sum + count, 0);

    return {
      totalFactories: factories.length,
      totalCreations,
      factoryTypes: factories.map(f => f.type),
      creationsByType: Object.fromEntries(this.creationCount),
    };
  }

  /**
   * Get factory metadata for all registered factories
   */
  getFactoryMetadata() {
    const metadata: Record<string, any> = {};
    
    for (const [type, factory] of this.factories) {
      if (factory instanceof ResourceFactory) {
        metadata[type] = factory.getMetadata();
      } else {
        metadata[type] = {
          type,
          version: 'unknown',
          description: `Factory for ${type} resources`,
        };
      }
    }

    return metadata;
  }

  /**
   * Validate configuration for a specific resource type
   */
  validateResourceConfig(type: string, config: ResourceConfig): { isValid: boolean; errors: string[] } {
    const factory = this.factories.get(type);
    if (!factory) {
      return {
        isValid: false,
        errors: [`No factory registered for resource type '${type}'`],
      };
    }

    // Check if factory has validateConfig method
    if (typeof (factory as any).validateConfig === 'function') {
      return (factory as any).validateConfig(config);
    }

    // Basic validation fallback
    return {
      isValid: !!config.id && !!config.type && !!config.panelId,
      errors: !config.id ? ['Resource ID is required'] : 
              !config.type ? ['Resource type is required'] :
              !config.panelId ? ['Panel ID is required'] : []
    };
  }

  /**
   * Get default configuration for a resource type
   */
  getDefaultConfig(type: string): Partial<ResourceConfig> {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`No factory registered for resource type '${type}'`);
    }

    return factory.getDefaultConfig();
  }

  /**
   * Get merged configuration (defaults + provided)
   */
  getMergedConfig(type: string, config: Partial<ResourceConfig>): ResourceConfig {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`No factory registered for resource type '${type}'`);
    }

    if (factory instanceof ResourceFactory) {
      return factory.getMergedConfig(config);
    }

    // Fallback for non-ResourceFactory implementations
    const defaults = factory.getDefaultConfig();
    return {
      ...defaults,
      ...config,
      type,
    } as ResourceConfig;
  }

  /**
   * Check if a factory can create a resource with given configuration
   */
  canFactoryCreate(type: string, config: ResourceConfig): boolean {
    const factory = this.factories.get(type);
    if (!factory) {
      return false;
    }

    return factory.canCreate(config);
  }

  /**
   * List all available resource types
   */
  getAvailableTypes(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Check if all required factories are registered
   */
  validateRequiredFactories(requiredTypes: string[]): { isValid: boolean; missing: string[] } {
    const missing = requiredTypes.filter(type => !this.factories.has(type));
    
    return {
      isValid: missing.length === 0,
      missing,
    };
  }

  /**
   * Clear all factories and reset registry
   */
  clear(): void {
    this.factories.clear();
    this.creationCount.clear();
  }

  /**
   * Get factory creation count
   */
  getCreationCount(type: string): number {
    return this.creationCount.get(type) || 0;
  }

  /**
   * Reset creation count for a specific type
   */
  resetCreationCount(type: string): void {
    this.creationCount.set(type, 0);
  }

  /**
   * Export registry state for persistence
   */
  exportState() {
    return {
      factoryTypes: Array.from(this.factories.keys()),
      creationCounts: Object.fromEntries(this.creationCount),
      metadata: this.getFactoryMetadata(),
    };
  }
}

// Singleton instance for global access
let globalFactoryRegistry: ResourceFactoryRegistry | undefined;

/**
 * Get the global resource factory registry instance
 */
export function getGlobalResourceFactoryRegistry(): ResourceFactoryRegistry {
  if (!globalFactoryRegistry) {
    globalFactoryRegistry = new ResourceFactoryRegistry();
  }
  return globalFactoryRegistry;
}

/**
 * Set a custom global resource factory registry
 */
export function setGlobalResourceFactoryRegistry(registry: ResourceFactoryRegistry): void {
  globalFactoryRegistry = registry;
}

export default ResourceFactory; 