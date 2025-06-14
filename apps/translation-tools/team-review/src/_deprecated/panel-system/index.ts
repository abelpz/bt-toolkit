// Import classes for factory function
import { SignalBus } from './core/SignalBus';
import { ResourceRegistry } from './core/ResourceRegistry';
import { NavigationController } from './core/NavigationController';
import { PanelManager } from './panels/PanelManager';
import { PanelRegistry } from './panels/PanelRegistry';
import { CleanupManager } from './utils/CleanupManager';
import { ResourceLifecycle } from './resources/ResourceLifecycle';
import { ResourceCleanup } from './resources/ResourceCleanup';

// Import DI components for factory function
import { PanelSystemContainer, TYPES } from './di';
import type { PanelSystemContainerConfig } from './di';

// Import types for factory function
import type { SignalBusConfig } from './types/Signal';

// Core components
export { SignalBus } from './core/SignalBus';
export { ResourceRegistry } from './core/ResourceRegistry';
export { NavigationController } from './core/NavigationController';

// Panel components
export { PanelManager } from './panels/PanelManager';
export { BasePanel } from './panels/BasePanel';
export { PanelRegistry } from './panels/PanelRegistry';

// Resource components
export { ResourceFactory } from './resources/ResourceFactory';
export { BaseResource } from './resources/BaseResource';
export { ResourceLifecycle } from './resources/ResourceLifecycle';
export { ResourceCleanup } from './resources/ResourceCleanup';

// Signal components
export { SIGNAL_TYPES } from './signals/SignalTypes';
export { SignalCleanup } from './signals/SignalCleanup';

// Utility components
export { CleanupManager } from './utils/CleanupManager';

// Dependency Injection components
export {
  PanelSystemContainer,
  getGlobalContainer,
  setGlobalContainer,
  clearGlobalContainer,
  ServiceRegistry,
  TYPES,
  DI_VERSION,
  DI_FEATURES
} from './di';
export type {
  PanelSystemContainerConfig,
  ServiceMetadata,
  IInitializable,
  IDisposable,
  IPlugin,
  IServiceFactory,
  IConfiguration,
  ILogger,
  IMetricsCollector,
  IEventBus
} from './di';

// DI Decorators
export {
  injectable,
  inject,
  multiInject,
  optional,
  named,
  tagged,
  service,
  singleton,
  transient,
  reactService,
  reactNativeService,
  vanillaService,
  webService,
  mobileService,
  desktopService,
  injectService,
  injectSignalBus,
  injectPanelManager,
  injectResourceRegistry,
  injectNavigationController,
  injectCleanupManager,
  injectLogger,
  injectConfiguration,
  initialize,
  dispose,
  requires,
  optionalService,
  getServiceMetadata,
  hasServiceMetadata,
  getInitializers,
  getDisposers,
  createServiceIdentifier,
  createTaggedServiceIdentifier
} from './di';

// Type exports
export type {
  // Signal types
  Signal,
  SignalSource,
  SignalTarget,
  SignalHandler,
  SignalUnsubscribe,
  SignalRoute,
  SignalFilter,
  SignalMiddleware,
  SignalBusConfig,
  SignalMetrics,
  SignalHistoryEntry,
  PanelId,
  ResourceId,
  SignalType
} from './types/Signal';

export type {
  // Panel types
  PanelConfig,
  PanelState,
  PanelMetrics,
  PanelLifecycleEvent,
  PanelVisibilityEvent,
  PanelFocusEvent,
  PanelCoordination,
  PanelAPI,
  PanelFactory,
  PanelRegistry as IPanelRegistry,
  PanelManager as IPanelManager,
  PanelLayoutConstraints,
  PanelTheme
} from './types/Panel';

export {
  // Panel enums
  PanelLifecyclePhase,
  PanelVisibility,
  PanelLayout
} from './types/Panel';

export type {
  // Resource types
  ResourceState,
  ResourceConfig,
  ResourceAPI,
  ResourceFactory as IResourceFactory,
  ResourceFactoryRegistry,
  ResourceDependency,
  ResourceDependencyGraph,
  ResourceRegistry as IResourceRegistry,
  ResourceValidationRule,
  ResourceValidator,
  ResourceMetadata,
  ResourceNavigationData,
  ResourceLifecycleEvent
} from './types/Resource';

export {
  // Resource enums
  ResourceLifecyclePhase
} from './types/Resource';

export type {
  // Cleanup types
  ResourceCleanupEvent,
  ResourceDismissedPayload,
  SetHighlightingPayload,
  ClearHighlightingPayload,
  CleanupStrategy,
  CleanupCoordinator,
  CleanupValidationResult,
  CleanupTracker,
  CleanupDependency,
  CleanupGraph
} from './types/Cleanup';

export {
  // Cleanup enums
  CleanupReason,
  HighlightingKey
} from './types/Cleanup';

export type {
  // Navigation types
  NavigationEntry,
  NavigationHistory,
  NavigationOptions,
  NavigationControllerAPI,
  NavigationSearchCriteria,
  NavigationEvent,
  NavigationConfig
} from './types/Navigation';

// Signal type exports
export type {
  SignalTypeConstant,
  ResourceMountedPayload,
  ResourceUnmountedPayload,
  ResourceDismissedPayload as SignalResourceDismissedPayload,
  ShowPanelPayload,
  HidePanelPayload,
  SwitchPanelPayload,
  FocusResourcePayload,
  NavigateToResourcePayload,
  SetHighlightingPayload as SignalSetHighlightingPayload,
  ClearHighlightingPayload as SignalClearHighlightingPayload,
  HighlightAlignmentPayload,
  WordClickedPayload,
  QuoteHoveredPayload,
  NavigateToNotePayload,
  ShowNotePayload,
  ShowAlignmentPayload,
  SystemReadyPayload,
  SystemErrorPayload,
  CustomSignalPayload,
  SignalTypeConfig
} from './signals/SignalTypes';

export {
  // Signal enums
  SignalPriority,
  SignalCategory
} from './signals/SignalTypes';

// Re-export commonly used interfaces with aliases to avoid conflicts
export type {
  ResourceMetrics,
  CleanupEvent
} from './core/ResourceRegistry';

// Utility type helpers
export type PanelSystemConfig = {
  signalBus?: SignalBusConfig;
  maxHistorySize?: number;
  enableCleanupTracking?: boolean;
  enablePerformanceMetrics?: boolean;
};

// Factory function for creating a complete panel system
export interface PanelSystemFactory {
  createPanelSystem(config?: PanelSystemConfig): {
    signalBus: SignalBus;
    panelManager: PanelManager;
    resourceRegistry: ResourceRegistry;
    navigationController: NavigationController;
    cleanupManager: CleanupManager;
    resourceLifecycle: ResourceLifecycle;
    resourceCleanup: ResourceCleanup;
  };
}

// Default factory implementation
export const createPanelSystem = (config: PanelSystemConfig = {}): ReturnType<PanelSystemFactory['createPanelSystem']> => {
  // Create core components
  const signalBus = new SignalBus(config.signalBus || {});
  const resourceRegistry = new ResourceRegistry(signalBus);
  const panelRegistry = new PanelRegistry();
  const panelManager = new PanelManager(signalBus, panelRegistry);
  const navigationController = new NavigationController(signalBus);
  const cleanupManager = new CleanupManager(signalBus);
  const resourceLifecycle = new ResourceLifecycle(signalBus);
  const resourceCleanup = new ResourceCleanup(signalBus);

  // Configure navigation controller
  if (config.maxHistorySize) {
    navigationController.setMaxHistorySize(config.maxHistorySize);
  }

  return {
    signalBus,
    panelManager,
    resourceRegistry,
    navigationController,
    cleanupManager,
    resourceLifecycle,
    resourceCleanup
  };
};

// DI-based factory implementation
export const createPanelSystemWithDI = async (config: PanelSystemConfig & { di?: PanelSystemContainerConfig } = {}): Promise<{
  container: PanelSystemContainer;
  signalBus: SignalBus;
  panelManager: PanelManager;
  resourceRegistry: ResourceRegistry;
  navigationController: NavigationController;
  cleanupManager: CleanupManager;
  resourceLifecycle: ResourceLifecycle;
  resourceCleanup: ResourceCleanup;
}> => {
  // Create DI container
  const container = new PanelSystemContainer(config.di);
  
  // Initialize the container
  await container.initialize();
  
  // Get services from container
  const signalBus = container.get<SignalBus>(TYPES.SignalBus);
  const panelManager = container.get<PanelManager>(TYPES.PanelManager);
  const resourceRegistry = container.get<ResourceRegistry>(TYPES.ResourceRegistry);
  const navigationController = container.get<NavigationController>(TYPES.NavigationController);
  const cleanupManager = container.get<CleanupManager>(TYPES.CleanupManager);
  const resourceLifecycle = container.get<ResourceLifecycle>(TYPES.ResourceLifecycle);
  const resourceCleanup = container.get<ResourceCleanup>(TYPES.ResourceCleanup);

  // Configure navigation controller
  if (config.maxHistorySize) {
    navigationController.setMaxHistorySize(config.maxHistorySize);
  }

  return {
    container,
    signalBus,
    panelManager,
    resourceRegistry,
    navigationController,
    cleanupManager,
    resourceLifecycle,
    resourceCleanup
  };
};

// Version information
export const PANEL_SYSTEM_VERSION = '1.0.0';

// React Integration (Phase 5)
export * from './react';

// Feature flags
export const FEATURES = {
  SIGNAL_BASED_CLEANUP: true,
  RESOURCE_LIFECYCLE_MANAGEMENT: true,
  NAVIGATION_HISTORY: true,
  CLEANUP_COORDINATION: true,
  PERFORMANCE_METRICS: true,
  DEPENDENCY_INJECTION: true,  // ✅ Implemented with Inversify
  REACT_INTEGRATION: true,     // ✅ Implemented with hooks, components, and context
  SIGNAL_MIDDLEWARE: false     // Not yet implemented
} as const; 