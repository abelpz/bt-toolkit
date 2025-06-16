import { ReactNode } from 'react';
import { MessagingSystem } from './messaging';

// Core resource interface with metadata for navigation
export interface Resource {
  id: string;
  component: ReactNode;
  /** Display title for the resource, shown in navigation headers */
  title?: string;
  /** Brief description of the resource content */
  description?: string;
  /** Optional icon or emoji for the resource */
  icon?: string;
  /** Category or type of resource (e.g., 'scripture', 'notes', 'alignment') */
  category?: string;
  /** Additional metadata for the resource */
  metadata?: Record<string, unknown>;
}

// Remove this - we'll use the new ResourceMessage format only

// Panel navigation state
export interface PanelNavigation {
  [panelId: string]: {
    currentIndex: number;
  };
}

// Panel configuration
export interface PanelConfig {
  [panelId: string]: {
    resourceIds: string[];
    /** Optional: Specify which resource should be initially displayed (by ID) */
    initialResourceId?: string;
    /** Optional: Specify initial resource index (takes precedence over initialResourceId) */
    initialIndex?: number;
  };
}

// Resource messages storage
export interface ResourceMessages<TContent = unknown> {
  [resourceId: string]: ResourceMessage<any>[];
}

// Core store interface - generic and extensible
export interface LinkedPanelsStore<TContent = unknown> {
  resources: Map<string, Resource>;
  panelConfig: PanelConfig;
  panelNavigation: PanelNavigation;
  resourceMessages: ResourceMessages<TContent>;
  messagingSystem: MessagingSystem;
  
  // Configuration
  setConfig: (config: LinkedPanelsConfig) => void;
  
  // Navigation actions
  setCurrentResource: (panelId: string, index: number) => void;
  nextResource: (panelId: string) => void;
  previousResource: (panelId: string) => void;
  setPanelResourceById: (panelId: string, resourceId: string) => boolean;
  
  // Messaging actions
  sendMessage: (
    fromResourceId: string,
    toResourceId: string,
    content: TContent,
    chainId?: string
  ) => boolean;
  getMessages: (resourceId: string) => ResourceMessage<any>[];
  clearMessages: (resourceId: string) => void;
  
  // System queries
  getAllResourceIds: () => string[];
  getResourcePanel: (resourceId: string) => string | null;
  getVisibleResourcesPerPanel: () => { [panelId: string]: string };
  getAllPanels: () => string[];
  getResourcesInPanel: (panelId: string) => string[];
  getPanelResourceMapping: () => { [panelId: string]: string[] };
  
  // Resource metadata queries
  getResourceInfo: (resourceId: string) => {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    metadata?: Record<string, unknown>;
  } | null;
  getResourcesInfoInPanel: (panelId: string) => Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    metadata?: Record<string, unknown>;
  }>;
  getResourcesByCategory: () => { [category: string]: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    metadata?: Record<string, unknown>;
  }> };

  // State persistence methods
  saveState: () => Promise<boolean>;
  loadState: () => Promise<LinkedPanelsPersistedState | null>;
  clearPersistedState: () => Promise<void>;
  getStorageInfo: () => Promise<{
    hasStoredState: boolean;
    stateSize: number;
    savedAt: number | null;
    version: string | null;
  }>;
}

// Configuration for the linked panels system
export interface LinkedPanelsConfig {
  resources: Resource[];
  panels: PanelConfig;
  /** Optional: Global initial state configuration */
  initialState?: {
    /** Override panel navigation for specific panels */
    panelNavigation?: {
      [panelId: string]: {
        currentIndex: number;
      };
    };
    /** Restore previous messages (useful for state recovery) */
    resourceMessages?: ResourceMessages;
  };
}

// Render props interface for LinkedPanel component
export interface LinkedPanelRenderProps {
  current: {
    resource: Resource | null;
    index: number;
    panel: {
      resources: Resource[];
      totalResources: number;
      canGoNext: boolean;
      canGoPrevious: boolean;
    };
  };
  
  navigate: {
    toIndex: (index: number) => void;
    next: () => void;
    previous: () => void;
  };
  
  // Helper to get current resource metadata for navigation display
  getResourceInfo: () => {
    title: string;
    description: string;
    icon: string;
    category: string;
  } | null;
}

// Library setup options
export interface LinkedPanelsOptions {
  enableDevtools?: boolean;
  enableChaining?: boolean;
  maxChainHops?: number;
  messageRetention?: number;
  storeName?: string;
}

/**
 * Core types for the linked-panels messaging system
 */

export enum MessageLifecycle {
  STATE = 'state',
  EVENT = 'event',
  COMMAND = 'command'
}

/**
 * Base message content that all messages must extend
 */
export interface BaseMessageContent {
  type: string;
  
  // Lifecycle management - developers just add these properties!
  lifecycle?: MessageLifecycle | 'state' | 'event' | 'command';  // Optional, defaults to 'event'
  stateKey?: string;            // Required for 'state' messages
  ttl?: number;                 // Optional TTL in milliseconds
}

/**
 * Resource message with automatic lifecycle management
 */
export interface ResourceMessage<T extends BaseMessageContent = BaseMessageContent> {
  content: T;
  fromResourceId: string;
  toResourceId?: string;
  
  // Automatically added by the system
  id: string;
  timestamp: number;
  consumed?: boolean;
}

/**
 * Legacy support - existing messages without lifecycle info
 */
export interface LegacyResourceMessage<T = any> {
  content: T;
  fromResourceId: string;
  toResourceId?: string;
  timestamp: number;
}

/**
 * Serializable state for persistence
 */
export interface LinkedPanelsPersistedState {
  /** Current navigation state for all panels */
  panelNavigation: PanelNavigation;
  /** All resource messages (only persistable ones) */
  resourceMessages: ResourceMessages;
  /** Timestamp when state was saved */
  savedAt: number;
  /** Version of the state format for migration compatibility */
  version: string;
}

/**
 * Storage interface for state persistence
 * Consumers can implement this to use any storage backend
 */
export interface PersistenceStorageAdapter {
  /** Get data from storage */
  getItem(key: string): string | null | Promise<string | null>;
  /** Set data in storage */
  setItem(key: string, value: string): void | Promise<void>;
  /** Remove data from storage */
  removeItem(key: string): void | Promise<void>;
  /** Check if storage is available */
  isAvailable(): boolean | Promise<boolean>;
}

/**
 * Options for state persistence
 */
export interface StatePersistenceOptions {
  /** Storage key to use for persistence */
  storageKey?: string;
  /** Storage adapter (defaults to localStorage) */
  storageAdapter?: PersistenceStorageAdapter;
  /** Whether to persist messages (default: true) */
  persistMessages?: boolean;
  /** Whether to persist navigation state (default: true) */
  persistNavigation?: boolean;
  /** TTL for persisted state in milliseconds (default: 7 days) */
  stateTTL?: number;
  /** Function to filter which messages should be persisted */
  messageFilter?: (message: ResourceMessage) => boolean;
  /** Whether to auto-save state changes (default: true) */
  autoSave?: boolean;
  /** Debounce time for auto-save in milliseconds (default: 1000) */
  autoSaveDebounce?: number;
} 