import React, { useState, useRef, useEffect } from 'react';
import { createLinkedPanelsStore } from '../core/store';
import { LinkedPanelsStore, LinkedPanelsConfig, LinkedPanelsOptions, StatePersistenceOptions } from '../core/types';
import { PluginRegistry } from '../plugins/base';

// Global store instance for the LinkedPanels system
let globalStore: ReturnType<typeof createLinkedPanelsStore> | null = null;

interface LinkedPanelsContainerProps {
  config: LinkedPanelsConfig;
  options?: LinkedPanelsOptions;
  plugins?: PluginRegistry;
  persistence?: StatePersistenceOptions;
  children: React.ReactNode;
}

export function LinkedPanelsContainer({ 
  config, 
  options = {}, 
  plugins,
  persistence,
  children 
}: LinkedPanelsContainerProps) {
  const [isConfigured, setIsConfigured] = useState(false);
  const storeRef = useRef<ReturnType<typeof createLinkedPanelsStore> | null>(null);
  const configRef = useRef<LinkedPanelsConfig | null>(null);
  
  // Create store instance only once or when plugins/persistence change
  useEffect(() => {
    console.log('🏪 Creating store with config:', config);
    const newStore = createLinkedPanelsStore(options, plugins, persistence);
    storeRef.current = newStore;
    globalStore = newStore;
  }, [plugins, persistence]); // Only recreate when plugins or persistence change

  // Update config when it changes
  useEffect(() => {
    if (storeRef.current && configRef.current !== config) {
      console.log('⚙️ Setting store config:', config);
      storeRef.current.getState().setConfig(config);
      configRef.current = config;
      
      // Debug: Log the store state after setting config
      const state = storeRef.current.getState();
      console.log('📊 Store state after config update:', {
        resources: Object.entries(state.resources),
        panelConfig: state.panelConfig,
        panelNavigation: state.panelNavigation,
      });
      
      setIsConfigured(true);
    }
  }, [config]);

  // Initial configuration
  useEffect(() => {
    if (storeRef.current && !isConfigured) {
      console.log('⚙️ Setting initial store config:', config);
      storeRef.current.getState().setConfig(config);
      configRef.current = config;
      setIsConfigured(true);
    }
  }, [isConfigured]);

  // Don't render children until store is configured
  if (!isConfigured) {
    return null; // Return null instead of HTML div for React Native compatibility
  }

  return <>{children}</>;
}

// Hook to access the Zustand store directly
export function useLinkedPanelsStore<T = LinkedPanelsStore>(
  selector?: (state: LinkedPanelsStore) => T
): T extends LinkedPanelsStore ? LinkedPanelsStore : T {
  if (!globalStore) {
    throw new Error('useLinkedPanelsStore must be used within a LinkedPanelsContainer');
  }

  if (selector) {
    return globalStore(selector) as any;
  }
  
  return globalStore.getState() as any;
}

// Export the store getter for other hooks
export function getLinkedPanelsStore() {
  if (!globalStore) {
    throw new Error('LinkedPanels store not initialized. Make sure you have wrapped your app with LinkedPanelsContainer');
  }
  return globalStore;
}

// Hook to access the plugin registry (if we need it)
export function usePluginRegistry(): PluginRegistry | null {
  // For now, return null since plugins are handled during store creation
  // If we need runtime plugin access, we can store it in the global scope
  return null;
}

// Function to reset the global store (for testing purposes)
export function resetGlobalStore() {
  globalStore = null;
} 