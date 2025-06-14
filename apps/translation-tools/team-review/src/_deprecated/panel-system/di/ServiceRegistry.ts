import { Container } from 'inversify';
import { TYPES, ServiceMetadata } from './types';
import type { PanelSystemContainerConfig } from './Container';

/**
 * Service registration and management for the panel system
 * Handles framework-agnostic service binding and lifecycle management
 */
export class ServiceRegistry {
  private registeredServices = new Map<symbol, ServiceMetadata>();

  constructor(
    private container: Container,
    private config: Required<PanelSystemContainerConfig>
  ) {}

  /**
   * Register all core panel system services
   */
  async registerCoreServices(): Promise<void> {
    // Import core services dynamically to avoid circular dependencies
    const { SignalBus } = await import('../core/SignalBus');
    const { ResourceRegistry } = await import('../core/ResourceRegistry');
    const { NavigationController } = await import('../core/NavigationController');
    const { PanelManager } = await import('../panels/PanelManager');
    const { PanelRegistry } = await import('../panels/PanelRegistry');
    const { CleanupManager } = await import('../utils/CleanupManager');
    const { ResourceLifecycle } = await import('../resources/ResourceLifecycle');
    const { ResourceCleanup } = await import('../resources/ResourceCleanup');

    // Register SignalBus (no dependencies)
    this.container.bind(TYPES.SignalBus).to(SignalBus).inSingletonScope();
    this.registeredServices.set(TYPES.SignalBus, {
      name: 'SignalBus',
      version: '1.0.0',
      framework: 'all',
      platform: 'all',
      dependencies: [],
      singleton: true
    });

    // Register PanelRegistry (no dependencies)
    this.container.bind(TYPES.PanelRegistry).to(PanelRegistry).inSingletonScope();
    this.registeredServices.set(TYPES.PanelRegistry, {
      name: 'PanelRegistry',
      version: '1.0.0',
      framework: 'all',
      platform: 'all',
      dependencies: [],
      singleton: true
    });

    // Register services with dependencies using factory functions
    this.container.bind(TYPES.ResourceRegistry).toDynamicValue(() => {
      const signalBus = this.container.get<any>(TYPES.SignalBus);
      return new ResourceRegistry(signalBus);
    }).inSingletonScope();
    this.registeredServices.set(TYPES.ResourceRegistry, {
      name: 'ResourceRegistry',
      version: '1.0.0',
      framework: 'all',
      platform: 'all',
      dependencies: [TYPES.SignalBus],
      singleton: true
    });

    this.container.bind(TYPES.NavigationController).toDynamicValue(() => {
      const signalBus = this.container.get<any>(TYPES.SignalBus);
      return new NavigationController(signalBus);
    }).inSingletonScope();
    this.registeredServices.set(TYPES.NavigationController, {
      name: 'NavigationController',
      version: '1.0.0',
      framework: 'all',
      platform: 'all',
      dependencies: [TYPES.SignalBus],
      singleton: true
    });

    this.container.bind(TYPES.PanelManager).toDynamicValue(() => {
      const signalBus = this.container.get<any>(TYPES.SignalBus);
      const panelRegistry = this.container.get<any>(TYPES.PanelRegistry);
      return new PanelManager(signalBus, panelRegistry);
    }).inSingletonScope();
    this.registeredServices.set(TYPES.PanelManager, {
      name: 'PanelManager',
      version: '1.0.0',
      framework: 'all',
      platform: 'all',
      dependencies: [TYPES.SignalBus, TYPES.PanelRegistry],
      singleton: true
    });

    this.container.bind(TYPES.CleanupManager).toDynamicValue(() => {
      const signalBus = this.container.get<any>(TYPES.SignalBus);
      return new CleanupManager(signalBus);
    }).inSingletonScope();
    this.registeredServices.set(TYPES.CleanupManager, {
      name: 'CleanupManager',
      version: '1.0.0',
      framework: 'all',
      platform: 'all',
      dependencies: [TYPES.SignalBus],
      singleton: true
    });

    this.container.bind(TYPES.ResourceLifecycle).toDynamicValue(() => {
      const signalBus = this.container.get<any>(TYPES.SignalBus);
      return new ResourceLifecycle(signalBus);
    }).inSingletonScope();
    this.registeredServices.set(TYPES.ResourceLifecycle, {
      name: 'ResourceLifecycle',
      version: '1.0.0',
      framework: 'all',
      platform: 'all',
      dependencies: [TYPES.SignalBus],
      singleton: true
    });

    this.container.bind(TYPES.ResourceCleanup).toDynamicValue(() => {
      const signalBus = this.container.get<any>(TYPES.SignalBus);
      return new ResourceCleanup(signalBus);
    }).inSingletonScope();
    this.registeredServices.set(TYPES.ResourceCleanup, {
      name: 'ResourceCleanup',
      version: '1.0.0',
      framework: 'all',
      platform: 'all',
      dependencies: [TYPES.SignalBus],
      singleton: true
    });
  }

  /**
   * Register framework-specific services
   */
  async registerFrameworkServices(framework: 'react' | 'react-native' | 'vanilla'): Promise<void> {
    switch (framework) {
      case 'react':
        await this.registerReactServices();
        break;
      case 'react-native':
        await this.registerReactNativeServices();
        break;
      case 'vanilla':
        await this.registerVanillaServices();
        break;
    }
  }

  /**
   * Register platform-specific services
   */
  async registerPlatformServices(features: Required<PanelSystemContainerConfig>['platformFeatures']): Promise<void> {
    if (features.navigation) {
      // Navigation service would be registered here
    }

    if (features.storage) {
      // Storage service would be registered here
    }

    if (features.notifications) {
      // Notification service would be registered here
    }
  }

  /**
   * Register a service with the container
   */
  registerService<T>(
    identifier: symbol,
    implementation: new (...args: any[]) => T,
    metadata: ServiceMetadata
  ): void {
    // Store metadata
    this.registeredServices.set(identifier, metadata);

    // Bind to container
    const binding = this.container.bind<T>(identifier).to(implementation);

    // Configure scope
    if (metadata.singleton !== false) {
      binding.inSingletonScope();
    } else {
      binding.inTransientScope();
    }

    // Mark as initializable if it implements the interface
    if (this.implementsInterface(implementation, 'initialize')) {
      this.container.bind(TYPES.InitializableService).toService(identifier);
    }

    // Mark as disposable if it implements the interface
    if (this.implementsInterface(implementation, 'dispose')) {
      this.container.bind(TYPES.DisposableService).toService(identifier);
    }
  }

  /**
   * Register a constant value
   */
  registerConstant<T>(
    identifier: symbol,
    value: T,
    metadata: ServiceMetadata
  ): void {
    this.registeredServices.set(identifier, metadata);
    this.container.bind<T>(identifier).toConstantValue(value);
  }

  /**
   * Unregister a service
   */
  unregisterService(identifier: symbol): void {
    if (this.container.isBound(identifier)) {
      this.container.unbind(identifier);
    }
    this.registeredServices.delete(identifier);
  }

  /**
   * Get service metadata
   */
  getServiceMetadata(identifier: symbol): ServiceMetadata | undefined {
    return this.registeredServices.get(identifier);
  }

  /**
   * Get all registered services
   */
  getAllServices(): Map<symbol, ServiceMetadata> {
    return new Map(this.registeredServices);
  }

  /**
   * Check if a service is registered
   */
  isServiceRegistered(identifier: symbol): boolean {
    return this.registeredServices.has(identifier);
  }

  /**
   * Get services by framework
   */
  getServicesByFramework(framework: string): Array<[symbol, ServiceMetadata]> {
    return Array.from(this.registeredServices.entries())
      .filter(([, metadata]) => 
        metadata.framework === framework || metadata.framework === 'all'
      );
  }

  /**
   * Get services by platform
   */
  getServicesByPlatform(platform: string): Array<[symbol, ServiceMetadata]> {
    return Array.from(this.registeredServices.entries())
      .filter(([, metadata]) => 
        metadata.platform === platform || metadata.platform === 'all'
      );
  }

  /**
   * Validate service dependencies
   */
  validateDependencies(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [identifier, metadata] of this.registeredServices.entries()) {
      if (metadata.dependencies) {
        for (const dependency of metadata.dependencies) {
          if (!this.container.isBound(dependency)) {
            errors.push(
              `Service ${metadata.name} depends on ${dependency.toString()} which is not registered`
            );
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Register React-specific services
   */
  private async registerReactServices(): Promise<void> {
    // React hooks and components would be registered here
  }

  /**
   * Register React Native-specific services
   */
  private async registerReactNativeServices(): Promise<void> {
    // React Native specific services would be registered here
  }

  /**
   * Register vanilla JS services
   */
  private async registerVanillaServices(): Promise<void> {
    // Vanilla JavaScript services would be registered here
  }

  /**
   * Check if a class implements a specific interface method
   */
  private implementsInterface(
    implementation: any,
    methodName: string
  ): boolean {
    if (typeof implementation !== 'function') {
      return false;
    }

    // Check prototype for the method
    return typeof implementation.prototype?.[methodName] === 'function';
  }
} 