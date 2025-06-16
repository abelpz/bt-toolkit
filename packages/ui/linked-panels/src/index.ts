/**
 * Linked Panels Library - Main entry point
 * 
 * A powerful React library for creating interconnected panel systems with resource management,
 * navigation, and messaging capabilities. Built for Bible translation tools but flexible enough
 * for any multi-panel application.
 * 
 * @author Bible Translation Toolkit Team
 * @version 1.0.0
 */

// Internal imports for utility functions
import { PluginRegistry } from './plugins/base';
import { textMessagePlugin } from './plugins/built-in/text-message';

/**
 * Core types and interfaces for the Linked Panels system
 */
export type {
  /** Represents a resource that can be displayed in panels */
  Resource,
  /** Message structure for inter-resource communication */
  ResourceMessage,
  /** Navigation state for panels */
  PanelNavigation,
  /** Configuration for panel-resource relationships */
  PanelConfig,
  /** Storage structure for resource messages */
  ResourceMessages,
  /** Main store interface for the Linked Panels system */
  LinkedPanelsStore,
  /** Configuration object for initializing the Linked Panels system */
  LinkedPanelsConfig,
  /** Props passed to LinkedPanel render function */
  LinkedPanelRenderProps,
  /** Options for configuring the Linked Panels store */
  LinkedPanelsOptions,
} from './core/types';

/**
 * Store creation and management utilities
 */
export { 
  /** Factory function to create a Linked Panels store with plugin support */
  createLinkedPanelsStore, 
  /** Stable empty array constant to prevent unnecessary re-renders */
  EMPTY_MESSAGES 
} from './core/store';

/**
 * React components for building Linked Panel interfaces
 */
export { 
  /** Provider component that manages the Linked Panels store and context */
  LinkedPanelsContainer, 
  /** Hook to access the Linked Panels store directly */
  useLinkedPanelsStore, 
  /** Hook to access the plugin registry */
  usePluginRegistry 
} from './components/LinkedPanelsContainer';

export { 
  /** Panel component that renders resources using render props pattern */
  LinkedPanel 
} from './components/LinkedPanel';

/**
 * React hooks for interacting with the Linked Panels system
 */
export { 
  /** Comprehensive hook for resource operations including navigation and messaging */
  useResourceAPI 
} from './hooks/useResourceAPI';

export type { 
  /** TypeScript interface for the Resource API */
  ResourceAPI 
} from './hooks/useResourceAPI';

/**
 * State persistence utilities
 */
export { 
  /** Class for managing state persistence */
  StatePersistenceManager,
  /** Factory function to create a persistence manager */
  createStatePersistence,
  /** Quick save function for manual state saving */
  saveLinkedPanelsState,
  /** Quick load function for manual state loading */
  loadLinkedPanelsState,
  /** Quick clear function for manual state clearing */
  clearLinkedPanelsState
} from './core/persistence';

/**
 * Storage adapters for different persistence backends
 */
export {
  /** localStorage adapter for web environments */
  LocalStorageAdapter,
  /** sessionStorage adapter for web environments */
  SessionStorageAdapter,
  /** In-memory storage adapter (no persistence) */
  MemoryStorageAdapter,
  /** Async storage adapter for React Native or similar */
  AsyncStorageAdapter,
  /** IndexedDB adapter for robust browser storage */
  IndexedDBAdapter,
  /** HTTP API adapter for server-side storage */
  HTTPStorageAdapter,
  /** Factory function to create default storage adapter */
  createDefaultStorageAdapter
} from './core/storage-adapters';

export type {
  /** Interface for persisted state structure */
  LinkedPanelsPersistedState,
  /** Options for configuring state persistence */
  StatePersistenceOptions,
  /** Interface for custom storage adapters */
  PersistenceStorageAdapter
} from './core/types';

/**
 * Plugin system for extending messaging capabilities
 */
export { 
  /** Registry class for managing message type plugins */
  PluginRegistry, 
  /** Utility function to create new plugins */
  createPlugin 
} from './plugins/base';

export type { 
  /** Interface for creating message type plugins */
  MessageTypePlugin 
} from './plugins/base';

/**
 * Built-in plugins for common messaging scenarios
 */
export { 
  /** Built-in plugin for text messaging with validation */
  textMessagePlugin, 
  /** Utility to create formatted text messages */
  createTextMessage, 
  /** Utility to create chained text messages */
  createChainedTextMessage 
} from './plugins/built-in/text-message';

export type { 
  /** Type definitions for text message content */
  TextMessageTypes 
} from './plugins/built-in/text-message';

/**
 * Creates a plugin registry pre-loaded with built-in plugins.
 * 
 * This is the recommended way to initialize the plugin system as it includes
 * commonly used plugins like text messaging.
 * 
 * @returns A PluginRegistry instance with built-in plugins registered
 * 
 * @example
 * ```tsx
 * const pluginRegistry = createDefaultPluginRegistry();
 * 
 * <LinkedPanelsContainer 
 *   config={config} 
 *   plugins={pluginRegistry}
 * >
 *   {children}
 * </LinkedPanelsContainer>
 * ```
 */
export function createDefaultPluginRegistry() {
  const registry = new PluginRegistry();
  registry.register(textMessagePlugin);
  return registry;
}

/** Current version of the Linked Panels Library */
export const LINKED_PANELS_VERSION = '1.0.0';

/** Display name of the Linked Panels Library */
export const LINKED_PANELS_NAME = 'Linked Panels Library';

// Core exports
export * from './core/types';
export * from './core/messaging';
export * from './core/store';

// Hook exports
export * from './hooks/useResourceAPI';
export * from './hooks/useSimpleMessaging';

// Plugin exports
export * from './plugins/base';

// Component exports
export * from './components/LinkedPanelsContainer';
export * from './components/LinkedPanel';

// Legacy exports for backward compatibility
export * from './plugins/built-in/text-message';
 