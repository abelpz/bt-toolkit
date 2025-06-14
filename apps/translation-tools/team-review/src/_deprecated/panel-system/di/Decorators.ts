import 'reflect-metadata';
import { injectable, inject, multiInject, optional, named, tagged } from 'inversify';
import { TYPES, ServiceMetadata } from './types';

/**
 * Re-export Inversify decorators for convenience
 */
export { injectable, inject, multiInject, optional, named, tagged };

/**
 * Metadata key for service information
 */
const SERVICE_METADATA_KEY = Symbol.for('ServiceMetadata');

/**
 * Decorator to mark a class as a service with metadata
 */
export function service(metadata: Partial<ServiceMetadata>) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    // Apply @injectable decorator
    injectable()(constructor);
    
    // Store service metadata
    const serviceMetadata: ServiceMetadata = {
      name: constructor.name,
      singleton: true,
      framework: 'all',
      platform: 'all',
      ...metadata
    };
    
    Reflect.defineMetadata(SERVICE_METADATA_KEY, serviceMetadata, constructor);
    
    return constructor;
  };
}

/**
 * Decorator to mark a class as a singleton service
 */
export function singleton(metadata?: Partial<ServiceMetadata>) {
  return service({
    singleton: true,
    ...metadata
  });
}

/**
 * Decorator to mark a class as a transient service
 */
export function transient(metadata?: Partial<ServiceMetadata>) {
  return service({
    singleton: false,
    ...metadata
  });
}

/**
 * Decorator to mark a service as React-specific
 */
export function reactService(metadata?: Partial<ServiceMetadata>) {
  return service({
    framework: 'react',
    ...metadata
  });
}

/**
 * Decorator to mark a service as React Native-specific
 */
export function reactNativeService(metadata?: Partial<ServiceMetadata>) {
  return service({
    framework: 'react-native',
    ...metadata
  });
}

/**
 * Decorator to mark a service as vanilla JS
 */
export function vanillaService(metadata?: Partial<ServiceMetadata>) {
  return service({
    framework: 'vanilla',
    ...metadata
  });
}

/**
 * Decorator to mark a service as web platform-specific
 */
export function webService(metadata?: Partial<ServiceMetadata>) {
  return service({
    platform: 'web',
    ...metadata
  });
}

/**
 * Decorator to mark a service as mobile platform-specific
 */
export function mobileService(metadata?: Partial<ServiceMetadata>) {
  return service({
    platform: 'mobile',
    ...metadata
  });
}

/**
 * Decorator to mark a service as desktop platform-specific
 */
export function desktopService(metadata?: Partial<ServiceMetadata>) {
  return service({
    platform: 'desktop',
    ...metadata
  });
}

/**
 * Decorator to inject a specific service type
 */
export function injectService(serviceType: symbol) {
  return inject(serviceType);
}

/**
 * Decorator to inject the SignalBus
 */
export function injectSignalBus() {
  return inject(TYPES.SignalBus);
}

/**
 * Decorator to inject the PanelManager
 */
export function injectPanelManager() {
  return inject(TYPES.PanelManager);
}

/**
 * Decorator to inject the ResourceRegistry
 */
export function injectResourceRegistry() {
  return inject(TYPES.ResourceRegistry);
}

/**
 * Decorator to inject the NavigationController
 */
export function injectNavigationController() {
  return inject(TYPES.NavigationController);
}

/**
 * Decorator to inject the CleanupManager
 */
export function injectCleanupManager() {
  return inject(TYPES.CleanupManager);
}

/**
 * Decorator to inject a logger
 */
export function injectLogger() {
  return inject(TYPES.Logger);
}

/**
 * Decorator to inject a configuration service
 */
export function injectConfiguration() {
  return inject(TYPES.ConfigurationService);
}

/**
 * Decorator to mark a method as an initializer
 */
export function initialize() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Mark the method as an initializer
    const existingInitializers = Reflect.getMetadata('initializers', target.constructor) || [];
    existingInitializers.push(propertyKey);
    Reflect.defineMetadata('initializers', existingInitializers, target.constructor);
  };
}

/**
 * Decorator to mark a method as a disposer
 */
export function dispose() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Mark the method as a disposer
    const existingDisposers = Reflect.getMetadata('disposers', target.constructor) || [];
    existingDisposers.push(propertyKey);
    Reflect.defineMetadata('disposers', existingDisposers, target.constructor);
  };
}

/**
 * Decorator to mark a service as requiring specific dependencies
 */
export function requires(...dependencies: symbol[]) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    const existingMetadata = Reflect.getMetadata(SERVICE_METADATA_KEY, constructor) || {};
    const updatedMetadata: ServiceMetadata = {
      ...existingMetadata,
      dependencies: [...(existingMetadata.dependencies || []), ...dependencies]
    };
    
    Reflect.defineMetadata(SERVICE_METADATA_KEY, updatedMetadata, constructor);
    
    return constructor;
  };
}

/**
 * Decorator to mark a service as optional
 */
export function optionalService(metadata?: Partial<ServiceMetadata>) {
  return service({
    optional: true,
    ...metadata
  });
}

/**
 * Get service metadata from a class
 */
export function getServiceMetadata(constructor: any): ServiceMetadata | undefined {
  return Reflect.getMetadata(SERVICE_METADATA_KEY, constructor);
}

/**
 * Check if a class has service metadata
 */
export function hasServiceMetadata(constructor: any): boolean {
  return Reflect.hasMetadata(SERVICE_METADATA_KEY, constructor);
}

/**
 * Get initializer methods from a class
 */
export function getInitializers(constructor: any): string[] {
  return Reflect.getMetadata('initializers', constructor) || [];
}

/**
 * Get disposer methods from a class
 */
export function getDisposers(constructor: any): string[] {
  return Reflect.getMetadata('disposers', constructor) || [];
}

/**
 * Utility function to create a service identifier
 */
export function createServiceIdentifier<T>(name: string): symbol {
  return Symbol.for(name);
}

/**
 * Utility function to create a tagged service identifier
 */
export function createTaggedServiceIdentifier<T>(name: string, tag: string, value: any): symbol {
  return Symbol.for(`${name}:${tag}:${value}`);
} 