import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types';
import { ServiceRegistry } from './ServiceRegistry';

/**
 * Configuration options for the panel system container
 */
export interface PanelSystemContainerConfig {
  // Container options
  defaultScope?: 'Singleton' | 'Transient' | 'Request';
  
  // Panel system specific options
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableHotReload?: boolean;
  
  // Framework-specific options
  framework?: 'react' | 'react-native' | 'vanilla';
  platformFeatures?: {
    navigation?: boolean;
    storage?: boolean;
    notifications?: boolean;
  };
}

/**
 * Main dependency injection container for the panel system
 * Provides framework-agnostic service registration and resolution
 */
export class PanelSystemContainer {
  private container: Container;
  private serviceRegistry: ServiceRegistry;
  private config: Required<PanelSystemContainerConfig>;
  private isInitialized = false;

  constructor(config: PanelSystemContainerConfig = {}) {
    this.config = {
      defaultScope: 'Singleton',
      enableLogging: false,
      enableMetrics: false,
      enableHotReload: false,
      framework: 'react',
      platformFeatures: {
        navigation: true,
        storage: true,
        notifications: true
      },
      ...config
    };

    this.container = new Container();
    this.serviceRegistry = new ServiceRegistry(this.container, this.config);
    this.setupCoreBindings();
  }

  /**
   * Initialize the container with all services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Register core services
      await this.serviceRegistry.registerCoreServices();
      
      // Register framework-specific services
      await this.serviceRegistry.registerFrameworkServices(this.config.framework);
      
      // Register platform-specific services
      await this.serviceRegistry.registerPlatformServices(this.config.platformFeatures);
      
      // Initialize all singleton services
      await this.initializeSingletonServices();
      
      this.isInitialized = true;
      
      if (this.config.enableLogging) {
        console.log('[PanelSystemContainer] Initialized successfully');
      }
    } catch (error) {
      console.error('[PanelSystemContainer] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get a service by type identifier
   */
  get<T>(serviceIdentifier: symbol): T {
    if (!this.isInitialized) {
      throw new Error('Container must be initialized before resolving services');
    }
    
    try {
      return this.container.get<T>(serviceIdentifier);
    } catch (error) {
      if (this.config.enableLogging) {
        console.error(`[PanelSystemContainer] Failed to resolve service:`, serviceIdentifier, error);
      }
      throw error;
    }
  }

  /**
   * Get a service by type identifier (optional)
   */
  getOptional<T>(serviceIdentifier: symbol): T | undefined {
    if (!this.isInitialized) {
      return undefined;
    }
    
    try {
      return this.container.isBound(serviceIdentifier) 
        ? this.container.get<T>(serviceIdentifier)
        : undefined;
    } catch (error) {
      if (this.config.enableLogging) {
        console.warn(`[PanelSystemContainer] Optional service not available:`, serviceIdentifier);
      }
      return undefined;
    }
  }

  /**
   * Get all services of a given type
   */
  getAll<T>(serviceIdentifier: symbol): T[] {
    if (!this.isInitialized) {
      return [];
    }
    
    try {
      return this.container.getAll<T>(serviceIdentifier);
    } catch (error) {
      if (this.config.enableLogging) {
        console.error(`[PanelSystemContainer] Failed to resolve all services:`, serviceIdentifier, error);
      }
      return [];
    }
  }

  /**
   * Check if a service is bound
   */
  isBound<T>(serviceIdentifier: symbol): boolean {
    return this.container.isBound(serviceIdentifier);
  }

  /**
   * Bind a service to the container
   */
  bind<T>(serviceIdentifier: symbol) {
    return this.container.bind<T>(serviceIdentifier);
  }

  /**
   * Rebind a service in the container
   */
  rebind<T>(serviceIdentifier: symbol) {
    return this.container.rebind<T>(serviceIdentifier);
  }

  /**
   * Unbind a service from the container
   */
  unbind<T>(serviceIdentifier: symbol): void {
    this.container.unbind(serviceIdentifier);
  }

  /**
   * Create a child container
   */
  createChild(config?: Partial<PanelSystemContainerConfig>): PanelSystemContainer {
    const childConfig = { ...this.config, ...config };
    const childContainer = new PanelSystemContainer(childConfig);
    
    // Set the parent container
    (childContainer as any).container.parent = this.container;
    
    return childContainer;
  }

  /**
   * Get service registry for advanced operations
   */
  getServiceRegistry(): ServiceRegistry {
    return this.serviceRegistry;
  }

  /**
   * Get container configuration
   */
  getConfig(): Required<PanelSystemContainerConfig> {
    return { ...this.config };
  }

  /**
   * Cleanup and dispose of the container
   */
  async dispose(): Promise<void> {
    try {
      // Dispose of all disposable services
      await this.disposeServices();
      
      // Clear all bindings
      this.container.unbindAll();
      
      this.isInitialized = false;
      
      if (this.config.enableLogging) {
        console.log('[PanelSystemContainer] Disposed successfully');
      }
    } catch (error) {
      console.error('[PanelSystemContainer] Disposal failed:', error);
      throw error;
    }
  }

  /**
   * Setup core container bindings
   */
  private setupCoreBindings(): void {
    // Bind the container itself for self-injection
    this.container.bind<Container>(TYPES.Container).toConstantValue(this.container);
    this.container.bind<PanelSystemContainer>(TYPES.PanelSystemContainer).toConstantValue(this);
    this.container.bind<ServiceRegistry>(TYPES.ServiceRegistry).toConstantValue(this.serviceRegistry);
  }

  /**
   * Initialize all singleton services
   */
  private async initializeSingletonServices(): Promise<void> {
    try {
      const bindings = this.container.getAll(TYPES.InitializableService);
      
      const initPromises = bindings.map(async (service: any) => {
        if (service && typeof service.initialize === 'function') {
          try {
            await service.initialize();
          } catch (error) {
            console.error('[PanelSystemContainer] Failed to initialize service:', service.constructor.name, error);
            throw error;
          }
        }
      });

      await Promise.all(initPromises);
    } catch (error) {
      // Ignore if no initializable services are bound
      if (this.config.enableLogging) {
        console.debug('[PanelSystemContainer] No initializable services found');
      }
    }
  }

  /**
   * Dispose of all disposable services
   */
  private async disposeServices(): Promise<void> {
    try {
      const disposableServices = this.container.getAll(TYPES.DisposableService);
      
      const disposePromises = disposableServices.map(async (service: any) => {
        if (service && typeof service.dispose === 'function') {
          try {
            await service.dispose();
          } catch (error) {
            console.error('[PanelSystemContainer] Failed to dispose service:', service.constructor.name, error);
          }
        }
      });

      await Promise.all(disposePromises);
    } catch (error) {
      // Ignore errors during disposal - services might not be bound
      if (this.config.enableLogging) {
        console.warn('[PanelSystemContainer] Some services failed to dispose:', error);
      }
    }
  }
}

/**
 * Global container instance for convenience
 * Use this for simple scenarios, or create your own container for advanced use cases
 */
let globalContainer: PanelSystemContainer | null = null;

/**
 * Get or create the global container instance
 */
export function getGlobalContainer(config?: PanelSystemContainerConfig): PanelSystemContainer {
  if (!globalContainer) {
    globalContainer = new PanelSystemContainer(config);
  }
  return globalContainer;
}

/**
 * Set the global container instance
 */
export function setGlobalContainer(container: PanelSystemContainer): void {
  globalContainer = container;
}

/**
 * Clear the global container instance
 */
export function clearGlobalContainer(): void {
  if (globalContainer) {
    globalContainer.dispose();
    globalContainer = null;
  }
} 