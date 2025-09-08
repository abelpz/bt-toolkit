/**
 * Mock Linked Panels Implementation
 * Simple implementation for Iteration 1 testing
 */

import React, { createContext, useContext, ReactNode } from 'react';

// Mock types
interface Resource {
  id: string;
  component: ReactNode;
  title: string;
  metadata?: any;
}

interface PanelConfig {
  resourceIds: string[];
  initialResourceId: string;
}

interface LinkedPanelsConfig {
  resources: Resource[];
  panels: Record<string, PanelConfig>;
}

interface PanelContext {
  current: {
    resource?: Resource;
    index: number;
    panel: {
      canGoPrevious: boolean;
      canGoNext: boolean;
      totalResources: number;
    };
  };
  navigate: {
    previous: () => void;
    next: () => void;
    to: (index: number) => void;
  };
}

// Context for linked panels
const LinkedPanelsContext = createContext<{
  config: LinkedPanelsConfig;
  currentResources: Record<string, string>;
} | null>(null);

// LinkedPanelsContainer component
export const LinkedPanelsContainer: React.FC<{
  config: LinkedPanelsConfig;
  children: ReactNode;
}> = ({ config, children }) => {
  // Initialize with first resource for each panel
  const currentResources = Object.entries(config.panels).reduce((acc, [panelId, panelConfig]) => {
    acc[panelId] = panelConfig.initialResourceId;
    return acc;
  }, {} as Record<string, string>);

  return (
    <LinkedPanelsContext.Provider value={{ config, currentResources }}>
      {children}
    </LinkedPanelsContext.Provider>
  );
};

// LinkedPanel component
export const LinkedPanel: React.FC<{
  id: string;
  children: (context: PanelContext) => ReactNode;
}> = ({ id, children }) => {
  const context = useContext(LinkedPanelsContext);
  
  if (!context) {
    throw new Error('LinkedPanel must be used within LinkedPanelsContainer');
  }

  const { config, currentResources } = context;
  const panelConfig = config.panels[id];
  const currentResourceId = currentResources[id];
  const currentResource = config.resources.find(r => r.id === currentResourceId);
  const currentIndex = panelConfig.resourceIds.indexOf(currentResourceId);

  const panelContext: PanelContext = {
    current: {
      resource: currentResource,
      index: currentIndex,
      panel: {
        canGoPrevious: currentIndex > 0,
        canGoNext: currentIndex < panelConfig.resourceIds.length - 1,
        totalResources: panelConfig.resourceIds.length,
      },
    },
    navigate: {
      previous: () => console.log('Navigate previous'),
      next: () => console.log('Navigate next'),
      to: (index: number) => console.log('Navigate to', index),
    },
  };

  return <>{children(panelContext)}</>;
};
