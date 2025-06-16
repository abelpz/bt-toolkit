import { useMemo } from 'react';
import { getLinkedPanelsStore, useLinkedPanelsStore } from '../components/LinkedPanelsContainer';
import { ResourceMessage } from '../core/types';

// Stable empty array to avoid creating new arrays on every render
const EMPTY_MESSAGES: ResourceMessage[] = [];

/**
 * API interface for resource operations within the Linked Panels system.
 * 
 * Provides categorized methods for navigation, messaging, and system information access.
 * All methods are reactive and will trigger re-renders when relevant state changes.
 * 
 * @template TContent - Type of message content this resource handles
 */
export interface ResourceAPI<TContent = unknown> {
  /**
   * Navigation functions for moving between resources and panels
   */
  navigation: {
    /** 
     * Navigate to a specific resource (finds its panel automatically)
     * @param resourceId - ID of the resource to navigate to
     * @returns true if navigation succeeded, false otherwise
     */
    goToResource: (resourceId: string) => boolean;
    
    /** 
     * Navigate to a specific panel (shows first resource in that panel)
     * @param panelId - ID of the panel to navigate to
     * @returns true if navigation succeeded, false otherwise
     */
    goToPanel: (panelId: string) => boolean;
    
    /** 
     * Navigate to a specific resource within a specific panel
     * @param panelId - ID of the target panel
     * @param resourceId - ID of the resource to show in that panel
     * @returns true if navigation succeeded, false if resource not available in panel
     */
    goToResourceInPanel: (panelId: string, resourceId: string) => boolean;
    
    /** 
     * Get the panel ID where this resource is currently located
     * @returns Panel ID or null if resource not found
     */
    getMyPanel: () => string | null;
    
    /** 
     * Get currently visible resources across all panels
     * @returns Object mapping panel IDs to visible resource IDs
     */
    getVisibleResources: () => { [panelId: string]: string };
  };

  /**
   * Messaging functions for inter-resource communication
   */
  messaging: {
    /** 
     * Send a message to a specific resource
     * @param toResourceId - ID of the target resource
     * @param content - Message content (typed according to TContent)
     * @param chainId - Optional chain ID for message threading
     * @returns true if message sent successfully, false otherwise
     */
    send: (toResourceId: string, content: TContent, chainId?: string) => boolean;
    
    /** 
     * Get all messages received by this resource
     * @returns Array of messages sent to this resource
     */
    getMessages: () => ResourceMessage<any>[];
    
    /** 
     * Clear all messages for this resource
     */
    clearMessages: () => void;
    
    /** 
     * Send a message to all other resources in the system
     * @param content - Message content to broadcast
     * @returns Number of resources that received the message
     */
    sendToAll: (content: TContent) => number;
    
    /** 
     * Send a message to all resources in a specific panel
     * @param panelId - ID of the target panel
     * @param content - Message content to send
     * @returns Number of resources that received the message
     */
    sendToPanel: (panelId: string, content: TContent) => number;
  };

  /**
   * System information functions for querying the current state
   */
  system: {
    /** 
     * Get all resource IDs in the system
     * @returns Array of all resource IDs
     */
    getAllResources: () => string[];
    
    /** 
     * Get all panel IDs in the system
     * @returns Array of all panel IDs
     */
    getAllPanels: () => string[];
    
    /** 
     * Get all resource IDs available in a specific panel
     * @param panelId - ID of the panel to query
     * @returns Array of resource IDs in the specified panel
     */
    getResourcesInPanel: (panelId: string) => string[];
    
    /** 
     * Get the complete mapping of panels to their available resources
     * @returns Object mapping panel IDs to arrays of resource IDs
     */
    getPanelMapping: () => { [panelId: string]: string[] };
    
    /** 
     * Get the panel ID where this resource is located (same as navigation.getMyPanel)
     * @returns Panel ID or null if resource not found
     */
    getMyPanel: () => string | null;
    
    /** 
     * Get metadata for a specific resource
     * @param resourceId - ID of the resource to get metadata for
     * @returns Resource metadata object or null if resource not found
     */
    getResourceInfo: (resourceId: string) => {
      id: string;
      title: string;
      description: string;
      icon: string;
      category: string;
      metadata?: Record<string, unknown>;
    } | null;
    
    /** 
     * Get metadata for the current resource (convenience method)
     * @returns Current resource metadata object or null if not found
     */
    getMyResourceInfo: () => {
      id: string;
      title: string;
      description: string;
      icon: string;
      category: string;
      metadata?: Record<string, unknown>;
    } | null;
    
    /** 
     * Get metadata for all resources in a specific panel
     * @param panelId - ID of the panel to query
     * @returns Array of resource metadata objects
     */
    getResourcesInfoInPanel: (panelId: string) => Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
      category: string;
      metadata?: Record<string, unknown>;
    }>;
    
    /** 
     * Get all resources grouped by category
     * @returns Object mapping category names to arrays of resource metadata
     */
    getResourcesByCategory: () => { [category: string]: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
      category: string;
      metadata?: Record<string, unknown>;
    }> };
  };
}

/**
 * React hook for resource operations within the Linked Panels system.
 * 
 * This hook provides a complete API for a resource to interact with the panel system,
 * including navigation between resources/panels, sending/receiving messages, and
 * querying system state. All operations are reactive and will trigger re-renders
 * when relevant state changes.
 * 
 * The hook automatically subscribes to messages for the specified resource and
 * provides stable function references to prevent unnecessary re-renders.
 * 
 * @template TContent - Type of message content this resource handles (defaults to unknown)
 * @param resourceId - Unique identifier for this resource
 * @returns ResourceAPI object with categorized methods for navigation, messaging, and system queries
 * 
 * @example
 * ```tsx
 * function MyResourceComponent({ id }: { id: string }) {
 *   const api = useResourceAPI<{ text: string }>(id);
 *   
 *   // Send a message
 *   const sendMessage = () => {
 *     api.messaging.send('other-resource', { text: 'Hello!' });
 *   };
 *   
 *   // Navigate to another resource
 *   const navigate = () => {
 *     api.navigation.goToResource('target-resource');
 *   };
 *   
 *   // Get received messages
 *   const messages = api.messaging.getMessages();
 *   
 *   return (
 *     <div>
 *       <button onClick={sendMessage}>Send Message</button>
 *       <button onClick={navigate}>Navigate</button>
 *       <div>Messages: {messages.length}</div>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @throws {Error} If used outside of a LinkedPanelsContainer
 */
export function useResourceAPI<TContent = unknown>(resourceId: string): ResourceAPI<TContent> {
  // Use Zustand selector to subscribe to messages for this specific resource
  const myMessages = useLinkedPanelsStore((state: any) => 
    state.resourceMessages[resourceId] || EMPTY_MESSAGES
  ) as ResourceMessage<any>[];

  // Get stable actions
  const actions = useMemo(() => {
    const store = getLinkedPanelsStore();
    const storeState = store.getState();
    return {
      // Navigation actions
      navigation: {
        setCurrentResource: storeState.setCurrentResource,
        setPanelResourceById: storeState.setPanelResourceById,
        nextResource: storeState.nextResource,
        previousResource: storeState.previousResource,
      },
      
      // Messaging actions  
      messaging: {
        sendMessage: storeState.sendMessage,
        getMessages: storeState.getMessages,
        clearMessages: storeState.clearMessages,
      },
      
      // System information
      system: {
        getAllResourceIds: storeState.getAllResourceIds,
        getResourcePanel: storeState.getResourcePanel,
        getVisibleResourcesPerPanel: storeState.getVisibleResourcesPerPanel,
        getAllPanels: storeState.getAllPanels,
        getResourcesInPanel: storeState.getResourcesInPanel,
        getPanelResourceMapping: storeState.getPanelResourceMapping,
        getResourceInfo: storeState.getResourceInfo,
        getResourcesInfoInPanel: storeState.getResourcesInfoInPanel,
        getResourcesByCategory: storeState.getResourcesByCategory,
      }
    };
  }, []); // Empty dependency array

  // Memoize the API (same pattern as old implementation)
  return useMemo(() => ({
    navigation: {
      goToResource: (targetResourceId: string) => {
        const targetPanel = actions.system.getResourcePanel(targetResourceId);
        if (targetPanel) {
          return actions.navigation.setPanelResourceById(targetPanel, targetResourceId);
        }
        return false;
      },
      
      goToPanel: (panelId: string) => {
        const resourcesInPanel = actions.system.getResourcesInPanel(panelId);
        if (resourcesInPanel.length > 0) {
          return actions.navigation.setPanelResourceById(panelId, resourcesInPanel[0]);
        }
        return false;
      },

      goToResourceInPanel: (panelId: string, targetResourceId: string) => {
        // Check if the resource exists in the specified panel
        const resourcesInPanel = actions.system.getResourcesInPanel(panelId);
        if (resourcesInPanel.includes(targetResourceId)) {
          return actions.navigation.setPanelResourceById(panelId, targetResourceId);
        }
        console.warn(`Resource "${targetResourceId}" is not available in panel "${panelId}". Available resources: [${resourcesInPanel.join(', ')}]`);
        return false;
      },
      
      getMyPanel: () => actions.system.getResourcePanel(resourceId),
      
      getVisibleResources: () => actions.system.getVisibleResourcesPerPanel(),
    },

    messaging: {
      send: (toResourceId: string, content: TContent, chainId?: string) => {
        return actions.messaging.sendMessage(resourceId, toResourceId, content, chainId);
      },
      
      getMessages: () => myMessages,
      
      clearMessages: () => actions.messaging.clearMessages(resourceId),
      
      sendToAll: (content: TContent) => {
        const allResources = actions.system.getAllResourceIds();
        let sentCount = 0;
        
        allResources.forEach((targetId: string) => {
          if (targetId !== resourceId) {
            if (actions.messaging.sendMessage(resourceId, targetId, content)) {
              sentCount++;
            }
          }
        });
        
        return sentCount;
      },
      
      sendToPanel: (panelId: string, content: TContent) => {
        const resourcesInPanel = actions.system.getResourcesInPanel(panelId);
        let sentCount = 0;
        
        resourcesInPanel.forEach((targetId: string) => {
          if (targetId !== resourceId) {
            if (actions.messaging.sendMessage(resourceId, targetId, content)) {
              sentCount++;
            }
          }
        });
        
        return sentCount;
      },
    },

    system: {
      getAllResources: () => actions.system.getAllResourceIds(),
      getAllPanels: () => actions.system.getAllPanels(),
      getResourcesInPanel: (panelId: string) => actions.system.getResourcesInPanel(panelId),
      getPanelMapping: () => actions.system.getPanelResourceMapping(),
      getMyPanel: () => actions.system.getResourcePanel(resourceId),
      getResourceInfo: (resourceId: string) => {
        const resourceInfo = actions.system.getResourceInfo(resourceId);
        return resourceInfo ? {
          id: resourceInfo.id,
          title: resourceInfo.title,
          description: resourceInfo.description,
          icon: resourceInfo.icon,
          category: resourceInfo.category,
          metadata: resourceInfo.metadata
        } : null;
      },
      getMyResourceInfo: () => {
        const resourceInfo = actions.system.getResourceInfo(resourceId);
        return resourceInfo ? {
          id: resourceInfo.id,
          title: resourceInfo.title,
          description: resourceInfo.description,
          icon: resourceInfo.icon,
          category: resourceInfo.category,
          metadata: resourceInfo.metadata
        } : null;
      },
      getResourcesInfoInPanel: (panelId: string) => {
        const resourcesInfo = actions.system.getResourcesInfoInPanel(panelId);
        return resourcesInfo.map((info) => ({
          id: info.id,
          title: info.title,
          description: info.description,
          icon: info.icon,
          category: info.category,
          metadata: info.metadata
        }));
      },
      getResourcesByCategory: () => {
        const resourcesByCategory = actions.system.getResourcesByCategory();
        return Object.fromEntries(
          Object.entries(resourcesByCategory).map(([category, resources]) => [
            category,
            resources.map((resource) => ({
              id: resource.id,
              title: resource.title,
              description: resource.description,
              icon: resource.icon,
              category: resource.category,
              metadata: resource.metadata
            }))
          ])
        );
      },
    },
  }), [resourceId, myMessages, actions]);
} 