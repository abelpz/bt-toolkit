import React, { ReactNode } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { enableMapSet } from 'immer';

// Enable MapSet plugin for Immer to work with Map and Set
enableMapSet();

interface PanelNavigation {
  [panelId: string]: {
    currentIndex: number;
  };
}
export interface Resource {
  id: string;
  component: ReactNode;
}

interface PanelConfig {
  [panelId: string]: {
    resourceIds: string[];
  };
}
// Message system for inter-resource communication
export interface ResourceMessage {
  id: string;
  fromResourceId: string;
  toResourceId: string;
  content: any; // Can be any object shape that users want to send
  timestamp: number;
  chainId?: string; // For message chains
}

interface ResourceMessages {
  [resourceId: string]: ResourceMessage[];
}

export interface LinkedPanelRenderProps {
  // Only essential panel-specific state that can't be accessed elsewhere
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
  
  // Only panel-specific navigation (for this specific panel)
  navigate: {
    toIndex: (index: number) => void;
    next: () => void;
    previous: () => void;
  };
}

interface LinkedPanelsStore {
  resources: Map<string, Resource>;
  panelConfig: PanelConfig;
  panelNavigation: PanelNavigation;
  resourceMessages: ResourceMessages;
  setConfig: (config: LinkedPanelsConfig) => void;
  setCurrentResource: (panelId: string, index: number) => void;
  nextResource: (panelId: string) => void;
  previousResource: (panelId: string) => void;
  setPanelResourceById: (panelId: string, resourceId: string) => boolean;
  sendMessage: (
    fromResourceId: string,
    toResourceId: string,
    content: any,
    chainId?: string
  ) => boolean;
  getMessages: (resourceId: string) => ResourceMessage[];
  clearMessages: (resourceId: string) => void;
  getAllResourceIds: () => string[];
  getResourcePanel: (resourceId: string) => string | null;
  getVisibleResourcesPerPanel: () => { [panelId: string]: string };
  getAllPanels: () => string[];
  getResourcesInPanel: (panelId: string) => string[];
  getPanelResourceMapping: () => { [panelId: string]: string[] };
}

// Pure Zustand store with Immer for safer state updates and devtools for debugging
export const useLinkedPanelsStore = create<LinkedPanelsStore>()(
  devtools(
    immer((set, get) => ({
      resources: new Map<string, Resource>(),
      panelConfig: {},
      panelNavigation: {},
      resourceMessages: {},

      setConfig: (config: LinkedPanelsConfig) => {
        set((state) => {
          // Clear and rebuild resources map
          state.resources.clear();
          config.resources.forEach((resource: Resource) => {
            state.resources.set(resource.id, resource);
          });

          // Reset panel config
          state.panelConfig = config.panels;

          // Initialize navigation state for each panel
          state.panelNavigation = {};
          Object.keys(config.panels).forEach((panelId) => {
            state.panelNavigation[panelId] = { currentIndex: 0 };
          });
        }, false, 'setConfig');
      },

      setCurrentResource: (panelId: string, index: number) => {
        set((state) => {
          const panelInfo = state.panelConfig[panelId];
          if (!panelInfo) return;

          const maxIndex = panelInfo.resourceIds.length - 1;
          const clampedIndex = Math.max(0, Math.min(index, maxIndex));

          if (!state.panelNavigation[panelId]) {
            state.panelNavigation[panelId] = { currentIndex: 0 };
          }
          state.panelNavigation[panelId].currentIndex = clampedIndex;
        }, false, `setCurrentResource:${panelId}:${index}`);
      },

      nextResource: (panelId: string) => {
        set((state) => {
          const current = state.panelNavigation[panelId]?.currentIndex ?? 0;
          const panelInfo = state.panelConfig[panelId];
          if (!panelInfo) return;

          const maxIndex = panelInfo.resourceIds.length - 1;
          if (current < maxIndex) {
            if (!state.panelNavigation[panelId]) {
              state.panelNavigation[panelId] = { currentIndex: 0 };
            }
            state.panelNavigation[panelId].currentIndex = current + 1;
          }
        }, false, `nextResource:${panelId}`);
      },

      previousResource: (panelId: string) => {
        set((state) => {
          const current = state.panelNavigation[panelId]?.currentIndex ?? 0;
          if (current > 0) {
            if (!state.panelNavigation[panelId]) {
              state.panelNavigation[panelId] = { currentIndex: 0 };
            }
            state.panelNavigation[panelId].currentIndex = current - 1;
          }
        }, false, `previousResource:${panelId}`);
      },

      setPanelResourceById: (panelId: string, resourceId: string) => {
        const state = get();
        const panelInfo = state.panelConfig[panelId];

        if (!panelInfo) {
          console.warn(`Panel "${panelId}" does not exist`);
          return false;
        }

        const resourceIndex = panelInfo.resourceIds.findIndex(
          (id) => id === resourceId
        );
        if (resourceIndex !== -1) {
          get().setCurrentResource(panelId, resourceIndex);
          return true;
        } else {
          // Check if the resource exists globally but not in this panel
          const resourceExists = state.resources.has(resourceId);
          if (resourceExists) {
            console.warn(
              `Resource "${resourceId}" exists but is not available in panel "${panelId}". Available resources: [${panelInfo.resourceIds.join(
                ', '
              )}]`
            );
          } else {
            console.warn(`Resource "${resourceId}" does not exist in the system`);
          }
          return false;
        }
      },

      sendMessage: (
        fromResourceId: string,
        toResourceId: string,
        content: any,
        chainId?: string
      ) => {
        const state = get();

        // Check if both resources exist
        if (!state.resources.has(fromResourceId)) {
          console.warn(`Sender resource "${fromResourceId}" does not exist`);
          return false;
        }
        if (!state.resources.has(toResourceId)) {
          console.warn(`Receiver resource "${toResourceId}" does not exist`);
          return false;
        }

        const message: ResourceMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fromResourceId,
          toResourceId,
          content,
          timestamp: Date.now(),
          chainId,
        };

        set((state) => {
          if (!state.resourceMessages[toResourceId]) {
            state.resourceMessages[toResourceId] = [];
          }
          state.resourceMessages[toResourceId].push(message);
        }, false, `sendMessage:${fromResourceId}→${toResourceId}`);

        return true;
      },

      getMessages: (resourceId: string) => {
        const state = get();
        return state.resourceMessages[resourceId] || [];
      },

      clearMessages: (resourceId: string) => {
        set((state) => {
          state.resourceMessages[resourceId] = [];
        }, false, `clearMessages:${resourceId}`);
      },

      getAllResourceIds: () => {
        const state = get();
        return Array.from(state.resources.keys());
      },

      getResourcePanel: (resourceId: string) => {
        const state = get();
        for (const [panelId, panelInfo] of Object.entries(state.panelConfig)) {
          if (panelInfo.resourceIds.includes(resourceId)) {
            return panelId;
          }
        }
        return null;
      },

      getVisibleResourcesPerPanel: () => {
        const state = get();
        const visibleResources: { [panelId: string]: string } = {};

        for (const [panelId, panelInfo] of Object.entries(state.panelConfig)) {
          const currentIndex = state.panelNavigation[panelId]?.currentIndex ?? 0;
          const currentResourceId = panelInfo.resourceIds[currentIndex];
          if (currentResourceId) {
            visibleResources[panelId] = currentResourceId;
          }
        }

        return visibleResources;
      },

      getAllPanels: () => {
        const state = get();
        return Object.keys(state.panelConfig);
      },

      getResourcesInPanel: (panelId: string) => {
        const state = get();
        const panelInfo = state.panelConfig[panelId];
        return panelInfo ? panelInfo.resourceIds : [];
      },

      getPanelResourceMapping: () => {
        const state = get();
        const mapping: { [panelId: string]: string[] } = {};

        for (const [panelId, panelInfo] of Object.entries(state.panelConfig)) {
          mapping[panelId] = panelInfo.resourceIds;
        }

        return mapping;
      },
    })),
    { name: 'LinkedPanelsStore' }
  )
);

export interface LinkedPanelsConfig {
  resources: Resource[];
  panels: PanelConfig;
}

interface LinkedPanelsContainerProps {
  config: LinkedPanelsConfig;
  children: ReactNode;
}

export const LinkedPanelsContainer: React.FC<LinkedPanelsContainerProps> = ({
  config,
  children,
}) => {
  React.useEffect(() => {
    useLinkedPanelsStore.getState().setConfig(config);
  }, [config]);

  return children;
};

interface LinkedPanelProps {
  id: string;
  children: (props: LinkedPanelRenderProps) => ReactNode;
}

export const LinkedPanel: React.FC<LinkedPanelProps> = ({ id, children }) => {
  // ✅ Use the new panel API hook internally
  const panelAPI = usePanelAPI(id);
  
  // ✅ Simplified render props - only essential panel state
  const renderProps: LinkedPanelRenderProps = React.useMemo(() => ({
    current: panelAPI.current,
    navigate: panelAPI.navigate,
  }), [panelAPI.current, panelAPI.navigate]);

  return <>{children(renderProps)}</>;
};

// New hook for panel operations - cleaner than render props
export const usePanelAPI = (panelId: string) => {
  // ✅ Subscribe to panel-specific state with stable selectors
  const panelConfig = useLinkedPanelsStore((state) => state.panelConfig[panelId]);
  const currentIndex = useLinkedPanelsStore((state) => state.panelNavigation[panelId]?.currentIndex ?? 0);
  const resources = useLinkedPanelsStore((state) => state.resources);

  // ✅ Get stable actions
  const actions = React.useMemo(() => {
    const store = useLinkedPanelsStore.getState();
    return {
      navigation: {
        setCurrentResource: store.setCurrentResource,
        setPanelResourceById: store.setPanelResourceById,
        nextResource: store.nextResource,
        previousResource: store.previousResource,
      },
      messaging: {
        sendMessage: store.sendMessage,
        getMessages: store.getMessages,
        clearMessages: store.clearMessages,
      },
      system: {
        getAllResourceIds: store.getAllResourceIds,
        getResourcePanel: store.getResourcePanel,
        getVisibleResourcesPerPanel: store.getVisibleResourcesPerPanel,
        getAllPanels: store.getAllPanels,
        getResourcesInPanel: store.getResourcesInPanel,
        getPanelResourceMapping: store.getPanelResourceMapping,
      }
    };
  }, []);

  // ✅ Panel-specific derived state
  const panelResources = React.useMemo(() => {
    if (!panelConfig) return [];
    return panelConfig.resourceIds
      .map((resourceId: string) => resources.get(resourceId))
      .filter((resource): resource is Resource => resource !== undefined);
  }, [resources, panelConfig]);

  const currentResource = panelResources[currentIndex] || null;

  return React.useMemo(() => ({
    // Current panel state
    current: {
      resource: currentResource,
      index: currentIndex,
      panel: {
        id: panelId,
        resources: panelResources,
        totalResources: panelResources.length,
        canGoNext: currentIndex < panelResources.length - 1,
        canGoPrevious: currentIndex > 0,
      },
    },
    
    // Panel navigation
    navigate: {
      toIndex: (index: number) => actions.navigation.setCurrentResource(panelId, index),
      next: () => actions.navigation.nextResource(panelId),
      previous: () => actions.navigation.previousResource(panelId),
      showResource: (resourceId: string) => actions.navigation.setPanelResourceById(panelId, resourceId),
    },
    
    // Cross-panel operations
    panels: {
      getAll: actions.system.getAllPanels,
      getResources: actions.system.getResourcesInPanel,
      getMapping: actions.system.getPanelResourceMapping,
      getVisible: actions.system.getVisibleResourcesPerPanel,
      setResource: (targetPanelId: string, resourceId: string) => 
        actions.navigation.setPanelResourceById(targetPanelId, resourceId),
    },
    
    // Resource operations (for convenience)
    resources: {
      getAll: actions.system.getAllResourceIds,
      findPanel: actions.system.getResourcePanel,
    },
  }), [panelId, currentResource, currentIndex, panelResources, actions]);
};

// Stable empty array to avoid creating new arrays on every render
const EMPTY_MESSAGES: ResourceMessage[] = [];

// Comprehensive resource API hook with full panel system access
export const useResourceAPI = (resourceId: string) => {
  // ✅ Optimized: Only subscribe to messages for this specific resource with stable empty array
  const myMessages = useLinkedPanelsStore((state) => state.resourceMessages[resourceId] || EMPTY_MESSAGES);

  // ✅ Optimized: Categorized actions for better API design
  const actions = React.useMemo(() => {
    const store = useLinkedPanelsStore.getState();
    
    return {
      // Navigation actions
      navigation: {
        setCurrentResource: store.setCurrentResource,
        setPanelResourceById: store.setPanelResourceById,
        nextResource: store.nextResource,
        previousResource: store.previousResource,
      },
      
      // Messaging actions  
      messaging: {
        sendMessage: store.sendMessage,
        getMessages: store.getMessages,
        clearMessages: store.clearMessages,
      },
      
      // System information
      system: {
        getAllResourceIds: store.getAllResourceIds,
        getResourcePanel: store.getResourcePanel,
        getVisibleResourcesPerPanel: store.getVisibleResourcesPerPanel,
        getAllPanels: store.getAllPanels,
        getResourcesInPanel: store.getResourcesInPanel,
        getPanelResourceMapping: store.getPanelResourceMapping,
      }
    };
  }, []);

  // ✅ Optimized: Memoized lifecycle effect to prevent unnecessary re-runs
  React.useEffect(() => {
    // Send mount message to all other resources
    const allResources = actions.system.getAllResourceIds();
    const otherResources = allResources.filter((id) => id !== resourceId);

    otherResources.forEach((targetId) => {
      const mountMessage = {
        text: `Resource ${resourceId} has mounted and is ready!`,
        originalSender: `${resourceId}@${actions.system.getResourcePanel(resourceId)}`,
        timestamp: Date.now(),
        type: 'lifecycle',
      };
      actions.messaging.sendMessage(
        resourceId,
        targetId,
        mountMessage,
        `mount_${resourceId}_${Date.now()}`
      );
    });

    // Cleanup function for unmount
    return () => {
      const allResources = actions.system.getAllResourceIds();
      const otherResources = allResources.filter((id) => id !== resourceId);

      otherResources.forEach((targetId) => {
        const unmountMessage = {
          text: `Resource ${resourceId} is unmounting!`,
          originalSender: `${resourceId}@${actions.system.getResourcePanel(resourceId)}`,
          timestamp: Date.now(),
          type: 'lifecycle',
        };
        actions.messaging.sendMessage(
          resourceId,
          targetId,
          unmountMessage,
          `unmount_${resourceId}_${Date.now()}`
        );
      });
    };
  }, [resourceId, actions]);

  // ✅ Get current panel and visibility outside of useMemo to avoid recalculation
  const currentPanel = React.useMemo(() => actions.system.getResourcePanel(resourceId), [actions.system, resourceId]);
  const isVisible = React.useMemo(() => {
    const visibleResources = actions.system.getVisibleResourcesPerPanel();
    return Object.values(visibleResources).includes(resourceId);
  }, [actions.system, resourceId]);

  // ✅ Optimized: Clean developer-friendly API structure
  return React.useMemo(() => ({
    // Current state - "what's my current situation?"
    current: {
      resourceId,
      panel: currentPanel,
      isVisible,
      messages: myMessages,
    },
    
    // Navigation - "how do I move around?"
    navigate: {
      // Show specific resource in specific panel
      showInPanel: (panelId: string, targetResourceId: string) => {
        return actions.navigation.setPanelResourceById(panelId, targetResourceId);
      },
      
      // Panel navigation
      nextInPanel: (panelId: string) => actions.navigation.nextResource(panelId),
      previousInPanel: (panelId: string) => actions.navigation.previousResource(panelId),
      goToIndexInPanel: (panelId: string, index: number) => actions.navigation.setCurrentResource(panelId, index),
    },
    
    // Messaging - "how do I communicate?"
    messaging: {
      // Direct messaging
      sendTo: (targetResourceId: string, content: any, chainId?: string) => {
        return actions.messaging.sendMessage(resourceId, targetResourceId, content, chainId);
      },
      
      // Bulk messaging
      sendToPanel: (panelId: string, content: any) => {
        const resourcesInPanel = actions.system.getResourcesInPanel(panelId);
        return resourcesInPanel
          .filter((id) => id !== resourceId)
          .map((targetId) => actions.messaging.sendMessage(resourceId, targetId, content, `panel_${panelId}_${Date.now()}`));
      },
      
      broadcast: (content: any) => {
        const allResources = actions.system.getAllResourceIds();
        return allResources
          .filter((id) => id !== resourceId)
          .map((targetId) => actions.messaging.sendMessage(resourceId, targetId, content, `broadcast_${Date.now()}`));
      },
      
      // Message management
      getMyMessages: () => myMessages,
      clearMyMessages: () => actions.messaging.clearMessages(resourceId),
    },
    
    // System - "what's available?"
    system: {
      resources: {
        getAll: actions.system.getAllResourceIds,
        findPanel: actions.system.getResourcePanel,
      },
      panels: {
        getAll: actions.system.getAllPanels,
        getResources: actions.system.getResourcesInPanel,
        getMapping: actions.system.getPanelResourceMapping,
        getVisible: actions.system.getVisibleResourcesPerPanel,
      },
    },
  }), [resourceId, myMessages, actions, currentPanel, isVisible]);
};