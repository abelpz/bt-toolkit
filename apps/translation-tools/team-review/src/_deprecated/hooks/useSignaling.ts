import { useEffect, useCallback, useRef } from 'react';
import { SignalBus } from '../services/SignalBus';
import { 
  Signal, 
  SignalHandler, 
  PanelId, 
  ResourceId, 
  SignalType,
  SIGNAL_TYPES 
} from '../types/signaling';

// Hook for emitting signals
export function useSignalEmitter() {
  const signalBus = SignalBus.getInstance();
  
  const emit = useCallback(async <TPayload = any>(
    type: SignalType,
    payload: TPayload,
    source: { panelId: PanelId; resourceId: ResourceId },
    target?: { panelId?: PanelId; resourceId?: ResourceId },
    metadata?: Record<string, any>
  ) => {
    await signalBus.emit({
      type,
      source,
      target,
      payload,
      metadata
    });
  }, [signalBus]);

  return { emit };
}

// Hook for listening to signals globally
export function useGlobalSignalListener(
  signalType: SignalType,
  handler: SignalHandler,
  deps: React.DependencyList = []
) {
  const signalBus = SignalBus.getInstance();
  const handlerRef = useRef(handler);
  
  // Update handler ref when dependencies change
  useEffect(() => {
    handlerRef.current = handler;
  }, deps);

  useEffect(() => {
    const wrappedHandler = (signal: Signal) => handlerRef.current(signal);
    const unsubscribe = signalBus.onGlobal(signalType, wrappedHandler);
    
    return unsubscribe;
  }, [signalBus, signalType]);
}

// Hook for listening to signals for a specific resource
export function useResourceSignalListener(
  resourceId: ResourceId,
  signalType: SignalType,
  handler: SignalHandler,
  deps: React.DependencyList = []
) {
  const signalBus = SignalBus.getInstance();
  const handlerRef = useRef(handler);
  
  useEffect(() => {
    handlerRef.current = handler;
  }, deps);

  useEffect(() => {
    const wrappedHandler = (signal: Signal) => handlerRef.current(signal);
    const unsubscribe = signalBus.onResource(resourceId, signalType, wrappedHandler);
    
    return unsubscribe;
  }, [signalBus, resourceId, signalType]);
}

// Hook for listening to signals for a specific panel
export function usePanelSignalListener(
  panelId: PanelId,
  signalType: SignalType,
  handler: SignalHandler,
  deps: React.DependencyList = []
) {
  const signalBus = SignalBus.getInstance();
  const handlerRef = useRef(handler);
  
  useEffect(() => {
    handlerRef.current = handler;
  }, deps);

  useEffect(() => {
    const wrappedHandler = (signal: Signal) => handlerRef.current(signal);
    const unsubscribe = signalBus.onPanel(panelId, signalType, wrappedHandler);
    
    return unsubscribe;
  }, [signalBus, panelId, signalType]);
}

// Hook for multiple signal listeners
export function useMultipleSignalListeners(
  listeners: Array<{
    type: 'global' | 'resource' | 'panel';
    signalType: SignalType;
    handler: SignalHandler;
    resourceId?: ResourceId;
    panelId?: PanelId;
  }>,
  deps: React.DependencyList = []
) {
  const signalBus = SignalBus.getInstance();
  const listenersRef = useRef(listeners);
  
  useEffect(() => {
    listenersRef.current = listeners;
  }, deps);

  useEffect(() => {
    const unsubscribeFunctions: (() => void)[] = [];
    
    listenersRef.current.forEach(listener => {
      const wrappedHandler = (signal: Signal) => listener.handler(signal);
      
      let unsubscribe: () => void;
      
      switch (listener.type) {
        case 'global':
          unsubscribe = signalBus.onGlobal(listener.signalType, wrappedHandler);
          break;
        case 'resource':
          if (listener.resourceId) {
            unsubscribe = signalBus.onResource(listener.resourceId, listener.signalType, wrappedHandler);
          } else {
            console.warn('Resource listener requires resourceId');
            return;
          }
          break;
        case 'panel':
          if (listener.panelId) {
            unsubscribe = signalBus.onPanel(listener.panelId, listener.signalType, wrappedHandler);
          } else {
            console.warn('Panel listener requires panelId');
            return;
          }
          break;
        default:
          console.warn('Unknown listener type:', listener.type);
          return;
      }
      
      unsubscribeFunctions.push(unsubscribe);
    });
    
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [signalBus]);
}

// Hook for common signal patterns
export function useCommonSignals(
  panelId: PanelId,
  resourceId: ResourceId
) {
  const { emit } = useSignalEmitter();
  
  const navigateToVerse = useCallback(async (book: string, chapter: number, verse: number) => {
    await emit(
      SIGNAL_TYPES.NAVIGATE_TO_VERSE,
      { book, chapter, verse },
      { panelId, resourceId }
    );
  }, [emit, panelId, resourceId]);

  const highlightText = useCallback(async (
    text: string,
    startOffset: number,
    endOffset: number,
    highlightId: string,
    color?: string
  ) => {
    await emit(
      SIGNAL_TYPES.HIGHLIGHT_TEXT,
      { text, startOffset, endOffset, highlightId, color },
      { panelId, resourceId }
    );
  }, [emit, panelId, resourceId]);

  const focusResource = useCallback(async (
    targetResourceId: ResourceId,
    targetPanelId?: PanelId,
    scrollTo = true,
    highlight = false
  ) => {
    await emit(
      SIGNAL_TYPES.FOCUS_RESOURCE,
      { resourceId: targetResourceId, panelId: targetPanelId, scrollTo, highlight },
      { panelId, resourceId },
      { panelId: targetPanelId, resourceId: targetResourceId }
    );
  }, [emit, panelId, resourceId]);

  const showNotes = useCallback(async (
    verseRef: string,
    noteType?: string,
    noteId?: string
  ) => {
    await emit(
      SIGNAL_TYPES.SHOW_NOTES,
      { verseRef, noteType, noteId },
      { panelId, resourceId }
    );
  }, [emit, panelId, resourceId]);

  const dataUpdated = useCallback(async (
    dataType: string,
    data: any
  ) => {
    await emit(
      SIGNAL_TYPES.DATA_UPDATED,
      { dataType, resourceId, data },
      { panelId, resourceId }
    );
  }, [emit, panelId, resourceId]);

  const selectionChanged = useCallback(async (
    selectedText: string,
    verseRef: string
  ) => {
    await emit(
      SIGNAL_TYPES.SELECTION_CHANGED,
      { selectedText, verseRef, resourceId },
      { panelId, resourceId }
    );
  }, [emit, panelId, resourceId]);

  return {
    navigateToVerse,
    highlightText,
    focusResource,
    showNotes,
    dataUpdated,
    selectionChanged
  };
}

// Hook for debugging signals
export function useSignalDebugger() {
  const signalBus = SignalBus.getInstance();
  
  const getStats = useCallback(() => signalBus.getStats(), [signalBus]);
  const getHistory = useCallback(() => signalBus.getSignalHistory(), [signalBus]);
  const clearHistory = useCallback(() => signalBus.clearHistory(), [signalBus]);
  
  return {
    getStats,
    getHistory,
    clearHistory
  };
} 