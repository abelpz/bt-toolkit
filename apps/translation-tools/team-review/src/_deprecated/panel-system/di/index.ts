// Core DI components
export { PanelSystemContainer, getGlobalContainer, setGlobalContainer, clearGlobalContainer } from './Container';
export type { PanelSystemContainerConfig } from './Container';
export { ServiceRegistry } from './ServiceRegistry';
export { TYPES } from './types';
export type { ServiceMetadata, IInitializable, IDisposable, IPlugin, IServiceFactory, IConfiguration, ILogger, IMetricsCollector, IEventBus } from './types';

// Decorators and utilities
export {
  // Inversify re-exports
  injectable,
  inject,
  multiInject,
  optional,
  named,
  tagged,
  
  // Custom decorators
  service,
  singleton,
  transient,
  reactService,
  reactNativeService,
  vanillaService,
  webService,
  mobileService,
  desktopService,
  
  // Injection decorators
  injectService,
  injectSignalBus,
  injectPanelManager,
  injectResourceRegistry,
  injectNavigationController,
  injectCleanupManager,
  injectLogger,
  injectConfiguration,
  
  // Lifecycle decorators
  initialize,
  dispose,
  requires,
  optionalService,
  
  // Utility functions
  getServiceMetadata,
  hasServiceMetadata,
  getInitializers,
  getDisposers,
  createServiceIdentifier,
  createTaggedServiceIdentifier
} from './Decorators';

// Version and feature information
export const DI_VERSION = '1.0.0';
export const DI_FEATURES = {
  INVERSIFY_INTEGRATION: true,
  FRAMEWORK_AGNOSTIC: true,
  LIFECYCLE_MANAGEMENT: true,
  METADATA_DECORATORS: true,
  SERVICE_DISCOVERY: true,
  DEPENDENCY_VALIDATION: true
} as const; 