import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPanelSystemWithDI } from '../..';
import type { 
  SignalBus, 
  PanelManager, 
  ResourceRegistry, 
  NavigationController,
  CleanupManager,
  ResourceLifecycle,
  ResourceCleanup,
  PanelSystemContainer,
  PanelSystemConfig,
  PanelSystemContainerConfig
} from '../..';

// Panel System Context Type
export interface PanelSystemContextValue {
  // Core services
  panelManager: PanelManager;
  signalBus: SignalBus;
  resourceRegistry: ResourceRegistry;
  navigationController: NavigationController;
  cleanupManager: CleanupManager;
  resourceLifecycle: ResourceLifecycle;
  resourceCleanup: ResourceCleanup;
  
  // DI container
  container: PanelSystemContainer;
  
  // System state
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
}

// Create the context
const PanelSystemContext = createContext<PanelSystemContextValue | null>(null);

// Provider Props
export interface PanelSystemProviderProps {
  config?: PanelSystemConfig & { di?: PanelSystemContainerConfig };
  children: ReactNode;
  onInitialized?: (system: PanelSystemContextValue) => void;
  onError?: (error: Error) => void;
}

// Provider Component
export function PanelSystemProvider({ 
  config = {}, 
  children, 
  onInitialized,
  onError 
}: PanelSystemProviderProps) {
  const [systemState, setSystemState] = useState<{
    system: PanelSystemContextValue | null;
    isLoading: boolean;
    error: Error | null;
  }>({
    system: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;
    let system: PanelSystemContextValue | null = null;

    const initializeSystem = async () => {
      try {
        setSystemState(prev => ({ ...prev, isLoading: true, error: null }));

        // Create system with DI
        const panelSystem = await createPanelSystemWithDI({
          ...config,
          di: {
            framework: 'react',
            enableLogging: true,
            enableMetrics: true,
            platformFeatures: {
              navigation: true,
              storage: true,
              notifications: true
            },
            ...config.di
          }
        });

        if (!mounted) return;

        // Create context value
        system = {
          ...panelSystem,
          isInitialized: true,
          isLoading: false,
          error: null
        };

        setSystemState({
          system,
          isLoading: false,
          error: null
        });

        // Notify initialization complete
        onInitialized?.(system);

      } catch (error) {
        if (!mounted) return;

        const err = error instanceof Error ? error : new Error('Failed to initialize panel system');
        
        setSystemState({
          system: null,
          isLoading: false,
          error: err
        });

        onError?.(err);
      }
    };

    initializeSystem();

    // Cleanup function
    return () => {
      mounted = false;
      if (system?.container) {
        system.container.dispose().catch(console.error);
      }
    };
  }, [config, onInitialized, onError]);

  // Show loading state
  if (systemState.isLoading) {
    return (
      <div className="panel-system-loading">
        <div>Initializing Panel System...</div>
      </div>
    );
  }

  // Show error state
  if (systemState.error) {
    return (
      <div className="panel-system-error">
        <div>Failed to initialize Panel System</div>
        <div>{systemState.error.message}</div>
      </div>
    );
  }

  // Provide system context
  return (
    <PanelSystemContext.Provider value={systemState.system}>
      {children}
    </PanelSystemContext.Provider>
  );
}

// Hook to use Panel System context
export function usePanelSystemContext(): PanelSystemContextValue {
  const context = useContext(PanelSystemContext);
  
  if (!context) {
    throw new Error('usePanelSystemContext must be used within a PanelSystemProvider');
  }
  
  return context;
}

// Hook to check if Panel System is available
export function usePanelSystemAvailable(): boolean {
  const context = useContext(PanelSystemContext);
  return context !== null && context.isInitialized;
}

// Export context for advanced usage
export { PanelSystemContext }; 