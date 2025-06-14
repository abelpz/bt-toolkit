import { usePanelSystemContext } from '../context/PanelSystemContext';
import type { 
  PanelManager, 
  SignalBus, 
  ResourceRegistry, 
  NavigationController, 
  CleanupManager,
  ResourceLifecycle,
  ResourceCleanup,
  PanelSystemContainer
} from '../..';

/**
 * Main hook for accessing the Panel System services
 * Provides access to all core services through the React context
 */
export interface UsePanelSystemReturn {
  // Core services
  panelManager: PanelManager;
  signalBus: SignalBus;
  resourceRegistry: ResourceRegistry;
  navigationController: NavigationController;
  cleanupManager: CleanupManager;
  resourceLifecycle: ResourceLifecycle;
  resourceCleanup: ResourceCleanup;
  
  // DI container for advanced usage
  container: PanelSystemContainer;
  
  // System state
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to access the Panel System services
 * Must be used within a PanelSystemProvider
 */
export function usePanelSystem(): UsePanelSystemReturn {
  const context = usePanelSystemContext();
  
  return {
    panelManager: context.panelManager,
    signalBus: context.signalBus,
    resourceRegistry: context.resourceRegistry,
    navigationController: context.navigationController,
    cleanupManager: context.cleanupManager,
    resourceLifecycle: context.resourceLifecycle,
    resourceCleanup: context.resourceCleanup,
    container: context.container,
    isInitialized: context.isInitialized,
    isLoading: context.isLoading,
    error: context.error
  };
} 