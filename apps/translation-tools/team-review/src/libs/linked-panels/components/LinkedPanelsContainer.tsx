import React, { createContext, useContext, useMemo, useState } from 'react';
import { StoreApi, UseBoundStore } from 'zustand';
import { createLinkedPanelsStore } from '../core/store';
import { LinkedPanelsStore, LinkedPanelsConfig, LinkedPanelsOptions } from '../core/types';
import { PluginRegistry } from '../plugins/base';

// Context for the store
const LinkedPanelsStoreContext = createContext<UseBoundStore<StoreApi<LinkedPanelsStore>> | null>(null);

// Context for the plugin registry
const PluginRegistryContext = createContext<PluginRegistry | null>(null);

interface LinkedPanelsContainerProps {
  config: LinkedPanelsConfig;
  options?: LinkedPanelsOptions;
  plugins?: PluginRegistry;
  children: React.ReactNode;
}

export function LinkedPanelsContainer({ 
  config, 
  options = {}, 
  plugins,
  children 
}: LinkedPanelsContainerProps) {
  const [isConfigured, setIsConfigured] = useState(false);
  
  // Create store instance (stable across re-renders)
  const store = useMemo(() => {
    console.log('🏪 Creating store with config:', config);
    const newStore = createLinkedPanelsStore(options, plugins);
    
    // Set config immediately during store creation
    console.log('⚙️ Setting store config immediately:', config);
    newStore.getState().setConfig(config);
    
    // Debug: Log the store state after setting config
    const state = newStore.getState();
    console.log('📊 Store state after immediate config:', {
      resources: Array.from(state.resources.entries()),
      panelConfig: state.panelConfig,
      panelNavigation: state.panelNavigation,
    });
    
    setIsConfigured(true);
    return newStore;
  }, [config, options, plugins]);

  // Don't render children until store is configured
  if (!isConfigured) {
    return <div>Loading...</div>;
  }

  return (
    <LinkedPanelsStoreContext.Provider value={store}>
      <PluginRegistryContext.Provider value={plugins || null}>
        {children}
      </PluginRegistryContext.Provider>
    </LinkedPanelsStoreContext.Provider>
  );
}

// Hook to access the store
export function useLinkedPanelsStore<T = LinkedPanelsStore>(
  selector?: (state: LinkedPanelsStore) => T
): T extends LinkedPanelsStore ? LinkedPanelsStore : T {
  const store = useContext(LinkedPanelsStoreContext);
  
  if (!store) {
    throw new Error('useLinkedPanelsStore must be used within a LinkedPanelsContainer');
  }

  if (selector) {
    return store(selector) as any;
  }
  
  return store.getState() as any;
}

// Hook to access the plugin registry
export function usePluginRegistry(): PluginRegistry | null {
  return useContext(PluginRegistryContext);
}

// Export the context for LinkedPanel to use
export { LinkedPanelsStoreContext }; 