import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePanelSystem } from './usePanelSystem';
import type { 
  ResourceAPI, 
  ResourceState
} from '../..';

/**
 * Hook return type for resource management
 */
export interface UseResourceReturn {
  // Resource instance
  resource: ResourceAPI | null;
  
  // Resource state
  state: ResourceState | null;
  isLoaded: boolean;
  isLoading: boolean;
  hasError: boolean;
  
  // Resource actions
  load: () => Promise<void>;
  unload: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Resource data
  data: any;
  
  // Error state
  error: Error | null;
}

/**
 * Hook for managing an individual resource
 * Provides reactive state and actions for resource operations
 */
export function useResource(resourceId: string): UseResourceReturn {
  const { resourceRegistry, signalBus } = usePanelSystem();
  const [resource, setResource] = useState<ResourceAPI | null>(null);
  const [state, setState] = useState<ResourceState | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Get resource instance
  useEffect(() => {
    const updateResource = () => {
      const resourceInstance = resourceRegistry.getResource(resourceId);
      setResource(resourceInstance || null);
      
      if (resourceInstance) {
        const currentState = resourceInstance.getState();
        setState(currentState);
        setError(null);
      } else {
        setState(null);
      }
    };

    // Initial update
    updateResource();

    // Listen for resource changes via signal bus
    const unsubscribe = signalBus.onGlobal('resource_mounted', (signal: any) => {
      if (signal.payload?.resourceId === resourceId) {
        updateResource();
      }
    });

    return unsubscribe;
  }, [resourceId, resourceRegistry, signalBus]);

  // Computed state values
  const isLoaded = useMemo(() => 
    state?.isVisible === true && !state?.isLoading, [state]);
  
  const isLoading = useMemo(() => 
    state?.isLoading === true, [state]);
  
  const hasError = useMemo(() => 
    state?.hasError === true, [state]);

  const data = useMemo(() => 
    resource ? {} : null, [resource]);

  // Resource actions
  const load = useCallback(async () => {
    if (!resource) {
      throw new Error(`Resource '${resourceId}' not found`);
    }
    
    try {
      await resource.mount();
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load resource');
      setError(error);
      throw error;
    }
  }, [resource, resourceId]);

  const unload = useCallback(async () => {
    if (!resource) return;
    
    try {
      await resource.unmount();
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to unload resource');
      setError(error);
      throw error;
    }
  }, [resource]);

  const refresh = useCallback(async () => {
    if (!resource) {
      throw new Error(`Resource '${resourceId}' not found`);
    }
    
    try {
      // Unmount and remount to refresh
      if (isLoaded) {
        await resource.unmount();
      }
      await resource.mount();
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh resource');
      setError(error);
      throw error;
    }
  }, [resource, resourceId, isLoaded]);

  return {
    resource,
    state,
    isLoaded,
    isLoading,
    hasError,
    load,
    unload,
    refresh,
    data,
    error
  };
} 