import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { enableMapSet } from 'immer';
import { 
  LinkedPanelsStore, 
  LinkedPanelsConfig, 
  LinkedPanelsOptions,
  ResourceMessage,
  Resource 
} from './types';
import { PluginRegistry } from '../plugins/base';

// Enable MapSet plugin for Immer to work with Map and Set
enableMapSet();

// Factory function to create a store with plugin support
export function createLinkedPanelsStore<TContent = unknown>(
  options: LinkedPanelsOptions = {},
  pluginRegistry?: PluginRegistry<any>
) {
  const {
    enableDevtools = true,
    storeName = 'LinkedPanelsStore'
  } = options;

  const storeImplementation = (set: any, get: any): LinkedPanelsStore<TContent> => ({
    resources: new Map<string, Resource>(),
    panelConfig: {},
    panelNavigation: {},
    resourceMessages: {},

    setConfig: (config: LinkedPanelsConfig) => {
      set((state: any) => {
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

      const message: ResourceMessage<TContent> = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromResourceId,
        toResourceId,
        content,
        timestamp: Date.now(),
        chainId,
        messageType: typeof content === 'object' && content !== null && 'type' in content 
          ? (content as any).type 
          : undefined,
      };

      // Let plugins handle the message if they want to
      pluginRegistry?.handleMessage(message);

      set((state: any) => {
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
  });

  const store = enableDevtools
    ? create<LinkedPanelsStore<TContent>>()(
        devtools(immer(storeImplementation), { name: storeName })
      )
    : create<LinkedPanelsStore<TContent>>()(immer(storeImplementation));

  return store;
}

// Stable empty array to avoid creating new arrays on every render
export const EMPTY_MESSAGES: ResourceMessage[] = []; 