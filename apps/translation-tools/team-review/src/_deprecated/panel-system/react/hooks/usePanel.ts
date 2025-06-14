import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePanelSystem } from './usePanelSystem';
import type { 
  PanelAPI, 
  PanelState, 
  PanelConfig
} from '../..';
import { 
  PanelLifecyclePhase,
  PanelVisibility
} from '../../types/Panel';

/**
 * Hook return type for panel management
 */
export interface UsePanelReturn {
  // Panel instance
  panel: PanelAPI | null;
  
  // Panel state
  state: PanelState | null;
  isActive: boolean;
  isFocused: boolean;
  isVisible: boolean;
  isLoading: boolean;
  hasError: boolean;
  
  // Panel actions
  activate: () => Promise<void>;
  deactivate: () => Promise<void>;
  focus: () => Promise<void>;
  blur: () => Promise<void>;
  show: () => Promise<void>;
  hide: () => Promise<void>;
  destroy: () => Promise<void>;
  
  // Panel configuration
  updateConfig: (config: Partial<PanelConfig>) => Promise<void>;
  
  // Resource management
  addResource: (resource: any) => Promise<void>;
  removeResource: (resourceId: string) => Promise<void>;
  setActiveResource: (resourceId: string) => Promise<void>;
  
  // Error state
  error: Error | null;
}

/**
 * Hook for managing an individual panel
 * Provides reactive state and actions for panel operations
 */
export function usePanel(panelId: string): UsePanelReturn {
  const { panelManager } = usePanelSystem();
  const [panel, setPanel] = useState<PanelAPI | null>(null);
  const [state, setState] = useState<PanelState | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Get panel instance
  useEffect(() => {
    const updatePanel = () => {
      const panelInstance = panelManager.getRegistry().getPanel(panelId);
      setPanel(panelInstance || null);
      
      if (panelInstance) {
        const currentState = panelInstance.getState();
        setState(currentState);
        setError(null);
      } else {
        setState(null);
      }
    };

    // Initial update
    updatePanel();

    // Listen for panel changes
    const unsubscribe = panelManager.getRegistry().onPanelCreated((createdPanel) => {
      if (createdPanel.id === panelId) {
        updatePanel();
      }
    });

    return unsubscribe;
  }, [panelId, panelManager]);

  // Listen for state changes
  useEffect(() => {
    if (!panel) return;

    const unsubscribeLifecycle = panel.onLifecycleEvent((event) => {
      setState(panel.getState());
    });

    const unsubscribeVisibility = panel.onVisibilityEvent((event) => {
      setState(panel.getState());
    });

    const unsubscribeFocus = panel.onFocusEvent((event) => {
      setState(panel.getState());
    });

    return () => {
      unsubscribeLifecycle();
      unsubscribeVisibility();
      unsubscribeFocus();
    };
  }, [panel]);

  // Computed state values
  const isActive = useMemo(() => 
    state?.isActive ?? false, [state]);
  
  const isFocused = useMemo(() => 
    state?.isFocused ?? false, [state]);
  
  const isVisible = useMemo(() => 
    state?.visibility === PanelVisibility.VISIBLE, [state]);
  
  const isLoading = useMemo(() => 
    state?.phase === PanelLifecyclePhase.INITIALIZING || 
    state?.phase === PanelLifecyclePhase.READY ||
    state?.isLoading === true, [state]);
  
  const hasError = useMemo(() => 
    state?.phase === PanelLifecyclePhase.DESTROYED || 
    state?.hasError === true, [state]);

  // Panel actions
  const activate = useCallback(async () => {
    if (!panel) {
      throw new Error(`Panel '${panelId}' not found`);
    }
    
    try {
      await panelManager.switchToPanel(panelId);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to activate panel');
      setError(error);
      throw error;
    }
  }, [panel, panelId, panelManager]);

  const deactivate = useCallback(async () => {
    if (!panel) return;
    
    try {
      await panel.deactivate();
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to deactivate panel');
      setError(error);
      throw error;
    }
  }, [panel]);

  const focus = useCallback(async () => {
    if (!panel) {
      throw new Error(`Panel '${panelId}' not found`);
    }
    
    try {
      await panelManager.focusPanel(panelId);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to focus panel');
      setError(error);
      throw error;
    }
  }, [panel, panelId, panelManager]);

  const blur = useCallback(async () => {
    if (!panel) return;
    
    try {
      await panel.blur();
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to blur panel');
      setError(error);
      throw error;
    }
  }, [panel]);

  const show = useCallback(async () => {
    if (!panel) {
      throw new Error(`Panel '${panelId}' not found`);
    }
    
    try {
      await panelManager.showPanel(panelId);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to show panel');
      setError(error);
      throw error;
    }
  }, [panel, panelId, panelManager]);

  const hide = useCallback(async () => {
    if (!panel) return;
    
    try {
      await panelManager.hidePanel(panelId);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to hide panel');
      setError(error);
      throw error;
    }
  }, [panel, panelId, panelManager]);

  const destroy = useCallback(async () => {
    if (!panel) return;
    
    try {
      await panelManager.destroyPanel(panelId);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to destroy panel');
      setError(error);
      throw error;
    }
  }, [panel, panelId, panelManager]);

  const updateConfig = useCallback(async (config: Partial<PanelConfig>) => {
    if (!panel) {
      throw new Error(`Panel '${panelId}' not found`);
    }
    
    try {
      const currentConfig = panel.getConfig();
      const newConfig = { ...currentConfig, ...config };
      await panel.updateConfig(newConfig);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update panel config');
      setError(error);
      throw error;
    }
  }, [panel, panelId]);

  const addResource = useCallback(async (resource: any) => {
    if (!panel) {
      throw new Error(`Panel '${panelId}' not found`);
    }
    
    try {
      await panel.addResource(resource);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add resource');
      setError(error);
      throw error;
    }
  }, [panel, panelId]);

  const removeResource = useCallback(async (resourceId: string) => {
    if (!panel) return;
    
    try {
      await panel.removeResource(resourceId);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to remove resource');
      setError(error);
      throw error;
    }
  }, [panel]);

  const setActiveResource = useCallback(async (resourceId: string) => {
    if (!panel) {
      throw new Error(`Panel '${panelId}' not found`);
    }
    
    try {
      await panel.setActiveResource(resourceId);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to set active resource');
      setError(error);
      throw error;
    }
  }, [panel, panelId]);

  return {
    panel,
    state,
    isActive,
    isFocused,
    isVisible,
    isLoading,
    hasError,
    activate,
    deactivate,
    focus,
    blur,
    show,
    hide,
    destroy,
    updateConfig,
    addResource,
    removeResource,
    setActiveResource,
    error
  };
} 