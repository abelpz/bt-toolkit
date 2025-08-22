import React, { useMemo } from 'react';
import { LinkedPanelRenderProps, Resource } from '../core/types';
import { getLinkedPanelsStore, useLinkedPanelsStore } from './LinkedPanelsContainer';

/**
 * Props interface for the LinkedPanel component.
 */
interface LinkedPanelProps {
  /** Unique identifier for this panel */
  id: string;
  /** Render function that receives panel state and navigation functions */
  children: (props: LinkedPanelRenderProps) => React.ReactNode;
}

/**
 * Panel component that displays resources using render props pattern.
 * 
 * LinkedPanel automatically subscribes to the Zustand store and provides reactive
 * updates when the panel's state changes. It passes current resource information
 * and navigation functions to its children via render props.
 * 
 * The component uses Zustand selectors for optimal performance, only re-rendering
 * when the specific panel's state actually changes.
 * 
 * @param props - Component props including panel ID and render function
 * @returns JSX element rendered by the children render function
 * 
 * @example
 * ```tsx
 * <LinkedPanel id="main-panel">
 *   {({ current, navigate }) => (
 *     <div>
 *       <h2>Current Resource: {current.resource?.id}</h2>
 *       <p>Index: {current.index + 1} of {current.panel.totalResources}</p>
 *       <button 
 *         onClick={navigate.next}
 *         disabled={!current.panel.canGoNext}
 *       >
 *         Next
 *       </button>
 *       <button 
 *         onClick={navigate.previous}
 *         disabled={!current.panel.canGoPrevious}
 *       >
 *         Previous
 *       </button>
 *       <div>{current.resource?.component}</div>
 *     </div>
 *   )}
 * </LinkedPanel>
 * ```
 * 
 * @throws {Error} If used outside of a LinkedPanelsContainer
 */
export function LinkedPanel({ id, children }: LinkedPanelProps) {
  // Use Zustand selectors to automatically subscribe to state changes
  const panelConfig = useLinkedPanelsStore((state: any) => state.panelConfig[id]);
  const currentIndex = useLinkedPanelsStore((state: any) => state.panelNavigation[id]?.currentIndex ?? 0);
  const resources = useLinkedPanelsStore((state: any) => state.resources);
  
  // Get stable actions
  const actions = useMemo(() => {
    const store = getLinkedPanelsStore();
    const storeState = store.getState();
    return {
      setCurrentResource: storeState.setCurrentResource,
      nextResource: storeState.nextResource,
      previousResource: storeState.previousResource,
    };
  }, []);
  
  // Panel-specific derived state (like old implementation)
  const panelResources = useMemo(() => {
    if (!panelConfig) return [];
    return panelConfig.resourceIds
      .map((resourceId: string) => resources[resourceId])
      .filter((resource: any): resource is Resource => resource !== undefined);
  }, [resources, panelConfig]);

  const currentResource = panelResources[currentIndex] || null;
  
  // Create render props (like old implementation)
  const renderProps = useMemo((): LinkedPanelRenderProps => {
    console.log(`📊 Panel ${id} render props:`, {
      currentIndex,
      totalResources: panelResources.length,
      resourceIds: panelConfig?.resourceIds || [],
      currentResourceId: currentResource?.id,
    });
    
    return {
      current: {
        resource: currentResource,
        index: currentIndex,
        panel: {
          resources: panelResources,
          totalResources: panelResources.length,
          canGoNext: currentIndex < panelResources.length - 1,
          canGoPrevious: currentIndex > 0,
        },
      },
      navigate: {
        toIndex: (index: number) => {
          console.log(`🎯 Panel ${id}: navigating to index ${index}`);
          actions.setCurrentResource(id, index);
        },
        next: () => {
          console.log(`➡️ Panel ${id}: navigating next from index ${currentIndex}`);
          actions.nextResource(id);
        },
        previous: () => {
          console.log(`⬅️ Panel ${id}: navigating previous from index ${currentIndex}`);
          actions.previousResource(id);
        },
      },
      getResourceInfo: () => {
        if (!currentResource) return null;
        
        return {
          title: currentResource.title || currentResource.id,
          description: currentResource.description || '',
          icon: currentResource.icon || '',
          category: currentResource.category || '',
        };
      },
    };
  }, [id, currentResource, currentIndex, panelResources, actions, panelConfig]);

  return <>{children(renderProps)}</>;
} 