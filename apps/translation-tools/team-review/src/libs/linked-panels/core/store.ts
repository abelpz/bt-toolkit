import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { enableMapSet } from 'immer';
import { 
  LinkedPanelsStore, 
  LinkedPanelsConfig, 
  LinkedPanelsOptions,
  Resource,
  ResourceMessage,
  StatePersistenceOptions
} from './types';
import { PluginRegistry } from '../plugins/base';
import { MessagingSystem } from './messaging';
import { StatePersistenceManager } from './persistence';

// Enable MapSet plugin for Immer to work with Map and Set
enableMapSet();

// Factory function to create a store with plugin support
export function createLinkedPanelsStore<TContent = unknown>(
  options: LinkedPanelsOptions = {},
  pluginRegistry?: PluginRegistry,
  persistenceOptions?: StatePersistenceOptions
) {
  const {
    enableDevtools = true,
    storeName = 'LinkedPanelsStore'
  } = options;

  // Initialize persistence manager if options provided
  const persistenceManager = persistenceOptions 
    ? new StatePersistenceManager(persistenceOptions)
    : null;

  const storeImplementation = (set: any, get: any): LinkedPanelsStore<TContent> => {
    // Create messaging system instance with plugin registry
    const messagingSystem = new MessagingSystem(pluginRegistry);

    return {
      resources: new Map<string, Resource>(),
      panelConfig: {},
      panelNavigation: {},
      resourceMessages: {},
      messagingSystem, // Add messaging system to store

      setConfig: (config: LinkedPanelsConfig) => {
        set((state: any) => {
          // Clear and rebuild resources map
          state.resources.clear();
          config.resources.forEach((resource: Resource) => {
            state.resources.set(resource.id, resource);
          });

          // Reset panel config
          state.panelConfig = config.panels;

          // Initialize navigation state for each panel with enhanced logic
          state.panelNavigation = {};
          
          // Initialize each panel with synchronous logic
          Object.entries(config.panels).forEach(([panelId, panelInfo]) => {
            let initialIndex = 0;

            // Priority 1: Use config.initialState if provided
            if (config.initialState?.panelNavigation?.[panelId]) {
              initialIndex = config.initialState.panelNavigation[panelId].currentIndex;
            }
            // Priority 2: Use panel-specific initial configuration
            else if (panelInfo.initialIndex !== undefined) {
              initialIndex = panelInfo.initialIndex;
            }
            // Priority 3: Use initialResourceId to find index
            else if (panelInfo.initialResourceId) {
              const foundIndex = panelInfo.resourceIds.findIndex(
                id => id === panelInfo.initialResourceId
              );
              if (foundIndex !== -1) {
                initialIndex = foundIndex;
              }
            }
            // Priority 4: Default to 0

            // Clamp index to valid range
            const maxIndex = Math.max(0, panelInfo.resourceIds.length - 1);
            const clampedIndex = Math.max(0, Math.min(initialIndex, maxIndex));
            
            state.panelNavigation[panelId] = { currentIndex: clampedIndex };
          });

          // Restore messages if available in initialState
          if (config.initialState?.resourceMessages) {
            state.resourceMessages = { ...config.initialState.resourceMessages };
          }

          // If persistence is enabled, try to load and apply persisted state asynchronously
          if (persistenceManager) {
            persistenceManager.loadState().then(persistedState => {
              if (persistedState) {
                // Apply persisted navigation if no explicit initial state was provided
                if (!config.initialState?.panelNavigation) {
                  set((state: any) => {
                    Object.entries(persistedState.panelNavigation).forEach(([panelId, navigation]) => {
                      if (state.panelConfig[panelId]) {
                        const maxIndex = Math.max(0, state.panelConfig[panelId].resourceIds.length - 1);
                        const clampedIndex = Math.max(0, Math.min(navigation.currentIndex, maxIndex));
                        state.panelNavigation[panelId] = { currentIndex: clampedIndex };
                      }
                    });
                  }, false, 'loadPersistedNavigation');
                }

                // Apply persisted messages if no explicit initial messages were provided
                if (!config.initialState?.resourceMessages && persistedState.resourceMessages) {
                  set((state: any) => {
                    state.resourceMessages = { ...persistedState.resourceMessages };
                  }, false, 'loadPersistedMessages');
                }
              }
            }).catch(error => {
              console.warn('Failed to load persisted state:', error);
            });
          }
        }, false, 'setConfig');
      },

      setCurrentResource: (panelId: string, index: number) => {
        set((state: any) => {
          const panelInfo = state.panelConfig[panelId];
          if (!panelInfo) return;

          const maxIndex = panelInfo.resourceIds.length - 1;
          const clampedIndex = Math.max(0, Math.min(index, maxIndex));

          if (!state.panelNavigation[panelId]) {
            state.panelNavigation[panelId] = { currentIndex: 0 };
          }
          state.panelNavigation[panelId].currentIndex = clampedIndex;
        }, false, `setCurrentResource:${panelId}:${index}`);
        
        // Schedule auto-save if persistence is enabled
        if (persistenceManager) {
          const state = get();
          persistenceManager.scheduleAutoSave(state.panelNavigation, state.resourceMessages);
        }
      },

      nextResource: (panelId: string) => {
        set((state: any) => {
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
        
        // Schedule auto-save if persistence is enabled
        if (persistenceManager) {
          const state = get();
          persistenceManager.scheduleAutoSave(state.panelNavigation, state.resourceMessages);
        }
      },

      previousResource: (panelId: string) => {
        set((state: any) => {
          const current = state.panelNavigation[panelId]?.currentIndex ?? 0;
          if (current > 0) {
            if (!state.panelNavigation[panelId]) {
              state.panelNavigation[panelId] = { currentIndex: 0 };
            }
            state.panelNavigation[panelId].currentIndex = current - 1;
          }
        }, false, `previousResource:${panelId}`);
        
        // Schedule auto-save if persistence is enabled
        if (persistenceManager) {
          const state = get();
          persistenceManager.scheduleAutoSave(state.panelNavigation, state.resourceMessages);
        }
      },

      setPanelResourceById: (panelId: string, resourceId: string) => {
        const state = get();
        const panelInfo = state.panelConfig[panelId];

        if (!panelInfo) {
          console.warn(`Panel "${panelId}" does not exist`);
          return false;
        }

        const resourceIndex = panelInfo.resourceIds.findIndex(
          (id: string) => id === resourceId
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
      content: TContent,
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

      // Use the new messaging system for lifecycle-aware handling
      messagingSystem.sendMessage(content as any, fromResourceId, toResourceId);

      // Update the store state to trigger React re-renders
      set((state: any) => {
        // Get current messages from messaging system
        state.resourceMessages[toResourceId] = messagingSystem.getMessages(toResourceId);
      }, false, `sendMessage:${fromResourceId}→${toResourceId}`);

      // Schedule auto-save if persistence is enabled
      if (persistenceManager) {
        const state = get();
        persistenceManager.scheduleAutoSave(state.panelNavigation, state.resourceMessages);
      }

      return true;
    },

          getMessages: (resourceId: string) => {
      return messagingSystem.getMessages(resourceId);
    },

          clearMessages: (resourceId: string) => {
      messagingSystem.clearMessages(resourceId);
      
      // Update the store state to trigger React re-renders
      set((state: any) => {
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
          if ((panelInfo as any).resourceIds.includes(resourceId)) {
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
          const currentResourceId = (panelInfo as any).resourceIds[currentIndex];
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
        return panelInfo ? (panelInfo as any).resourceIds : [];
      },

      getPanelResourceMapping: () => {
        const state = get();
        const mapping: { [panelId: string]: string[] } = {};

        for (const [panelId, panelInfo] of Object.entries(state.panelConfig)) {
          mapping[panelId] = (panelInfo as any).resourceIds;
        }

        return mapping;
      },

      getResourceInfo: (resourceId: string) => {
        const state = get();
        const resource = state.resources.get(resourceId);
        if (!resource) return null;

        return {
          id: resource.id,
          title: resource.title || resource.id,
          description: resource.description || '',
          icon: resource.icon || '',
          category: resource.category || '',
          metadata: resource.metadata,
        };
      },

      getResourcesInfoInPanel: (panelId: string) => {
        const state = get();
        const panelInfo = state.panelConfig[panelId];
        if (!panelInfo) return [];

        return (panelInfo as any).resourceIds.map((resourceId: string) => {
          const resource = state.resources.get(resourceId);
          return resource ? {
            id: resource.id,
            title: resource.title || resource.id,
            description: resource.description || '',
            icon: resource.icon || '',
            category: resource.category || '',
            metadata: resource.metadata,
          } : null;
        }).filter(Boolean);
      },

      getResourcesByCategory: () => {
        const state = get();
        const resourcesByCategory: { [category: string]: any[] } = {};

        for (const resource of state.resources.values()) {
          const category = resource.category || 'uncategorized';
          if (!resourcesByCategory[category]) {
            resourcesByCategory[category] = [];
          }
          resourcesByCategory[category].push({
            id: resource.id,
            title: resource.title || resource.id,
            description: resource.description || '',
            icon: resource.icon || '',
            category: resource.category || '',
            metadata: resource.metadata,
          });
        }

        return resourcesByCategory;
      },

      // State persistence methods
      saveState: async () => {
        if (!persistenceManager) {
          console.warn('Persistence not enabled for this store');
          return false;
        }
        const state = get();
        return await persistenceManager.saveState(state.panelNavigation, state.resourceMessages);
      },

      loadState: async () => {
        if (!persistenceManager) {
          console.warn('Persistence not enabled for this store');
          return null;
        }
        return await persistenceManager.loadState();
      },

      clearPersistedState: async () => {
        if (!persistenceManager) {
          console.warn('Persistence not enabled for this store');
          return;
        }
        await persistenceManager.clearState();
      },

      getStorageInfo: async () => {
        if (!persistenceManager) {
          return {
            hasStoredState: false,
            stateSize: 0,
            savedAt: null,
            version: null,
          };
        }
        return await persistenceManager.getStorageInfo();
      },
    };
  };

  const store = enableDevtools
    ? create<LinkedPanelsStore<TContent>>()(
        devtools(immer(storeImplementation), { name: storeName })
      )
    : create<LinkedPanelsStore<TContent>>()(immer(storeImplementation));

  return store;
}

// Stable empty array to avoid creating new arrays on every render
export const EMPTY_MESSAGES: ResourceMessage[] = []; 