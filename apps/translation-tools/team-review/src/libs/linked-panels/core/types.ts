import { ReactNode } from 'react';

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

// Generic message interface with pluggable content types
export interface ResourceMessage<TContent = unknown> {
  id: string;
  fromResourceId: string;
  toResourceId: string;
  content: TContent;
  timestamp: number;
  chainId?: string; // For message chains
  messageType?: string; // Runtime type identifier
}

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
  };
}

// Resource messages storage
export interface ResourceMessages<TContent = unknown> {
  [resourceId: string]: ResourceMessage<TContent>[];
}

// Core store interface - generic and extensible
export interface LinkedPanelsStore<TContent = unknown> {
  resources: Map<string, Resource>;
  panelConfig: PanelConfig;
  panelNavigation: PanelNavigation;
  resourceMessages: ResourceMessages<TContent>;
  
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
  getMessages: (resourceId: string) => ResourceMessage<TContent>[];
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
}

// Configuration for the linked panels system
export interface LinkedPanelsConfig {
  resources: Resource[];
  panels: PanelConfig;
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