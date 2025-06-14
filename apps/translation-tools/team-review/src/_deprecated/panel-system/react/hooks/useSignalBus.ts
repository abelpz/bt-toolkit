import { useEffect, useCallback, useRef } from 'react';
import { usePanelSystem } from './usePanelSystem';
import type { 
  Signal, 
  SignalHandler, 
  SignalUnsubscribe,
  SignalType,
  SignalSource
} from '../..';

/**
 * Hook return type for signal bus operations
 */
export interface UseSignalBusReturn {
  // Signal emission
  emit: (signal: Signal) => void;
  
  // Signal subscription
  subscribe: (type: SignalType, handler: SignalHandler) => SignalUnsubscribe;
  subscribeToSource: (source: SignalSource, handler: SignalHandler) => SignalUnsubscribe;
  
  // Signal utilities
  createSignal: (type: SignalType, payload?: any, source?: SignalSource) => Signal;
  
  // Signal history
  getHistory: () => Signal[];
  clearHistory: () => void;
}

/**
 * Hook for signal bus operations
 * Provides signal emission and subscription capabilities
 */
export function useSignalBus(): UseSignalBusReturn {
  const { signalBus } = usePanelSystem();
  const subscriptionsRef = useRef<SignalUnsubscribe[]>([]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('Failed to unsubscribe from signal:', error);
        }
      });
      subscriptionsRef.current = [];
    };
  }, []);

  // Signal emission
  const emit = useCallback((signal: Signal) => {
    signalBus.emit(signal);
  }, [signalBus]);

  // Signal subscription with automatic cleanup tracking
  const subscribe = useCallback((type: SignalType, handler: SignalHandler): SignalUnsubscribe => {
    const unsubscribe = signalBus.onGlobal(type, handler);
    
    // Track subscription for cleanup
    subscriptionsRef.current.push(unsubscribe);
    
    // Return wrapped unsubscribe that removes from tracking
    return () => {
      const index = subscriptionsRef.current.indexOf(unsubscribe);
      if (index > -1) {
        subscriptionsRef.current.splice(index, 1);
      }
      unsubscribe();
    };
  }, [signalBus]);

  // Source-based subscription with automatic cleanup tracking
  const subscribeToSource = useCallback((source: SignalSource, handler: SignalHandler): SignalUnsubscribe => {
    // Use panel or resource specific subscription based on source
    const unsubscribe = source.panelId 
      ? signalBus.onPanel(source.panelId, 'custom', handler)
      : source.resourceId
      ? signalBus.onResource(source.resourceId, 'custom', handler)
      : signalBus.onGlobal('custom', handler);
    
    // Track subscription for cleanup
    subscriptionsRef.current.push(unsubscribe);
    
    // Return wrapped unsubscribe that removes from tracking
    return () => {
      const index = subscriptionsRef.current.indexOf(unsubscribe);
      if (index > -1) {
        subscriptionsRef.current.splice(index, 1);
      }
      unsubscribe();
    };
  }, [signalBus]);

  // Signal creation utility
  const createSignal = useCallback((type: SignalType, payload?: any, source?: SignalSource): Signal => {
    return {
      type,
      source: source || { panelId: 'unknown', resourceId: 'unknown' },
      payload: payload || {},
      id: `signal-${Date.now()}-${Math.random()}`,
      timestamp: Date.now()
    };
  }, [signalBus]);

  // Signal history utilities
  const getHistory = useCallback((): Signal[] => {
    return signalBus.getHistory().map(entry => entry.signal);
  }, [signalBus]);

  const clearHistory = useCallback(() => {
    signalBus.clearHistory();
  }, [signalBus]);

  return {
    emit,
    subscribe,
    subscribeToSource,
    createSignal,
    getHistory,
    clearHistory
  };
}

/**
 * Hook for subscribing to specific signal types
 * Automatically handles subscription cleanup
 */
export function useSignalSubscription(
  type: SignalType, 
  handler: SignalHandler,
  deps: React.DependencyList = []
): void {
  const { subscribe } = useSignalBus();

  useEffect(() => {
    const unsubscribe = subscribe(type, handler);
    return unsubscribe;
  }, [subscribe, type, ...deps]);
}

/**
 * Hook for subscribing to signals from a specific source
 * Automatically handles subscription cleanup
 */
export function useSignalSourceSubscription(
  source: SignalSource,
  handler: SignalHandler,
  deps: React.DependencyList = []
): void {
  const { subscribeToSource } = useSignalBus();

  useEffect(() => {
    const unsubscribe = subscribeToSource(source, handler);
    return unsubscribe;
  }, [subscribeToSource, source, ...deps]);
} 