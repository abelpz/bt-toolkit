/**
 * useTTS Hook
 * 
 * React hook for Text-to-Speech functionality
 * Provides easy integration with components
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TTSPlaybackState, TTSOptions } from '../types/tts';
import { getTTSService } from '../services/tts/tts-service';
import { useProcessedResourceLanguage, useWorkspaceLanguage } from '../contexts/WorkspaceContext';

export interface UseTTSOptions {
  /** Auto-initialize TTS service on mount */
  autoInitialize?: boolean;
  /** Default TTS options for this hook */
  defaultOptions?: TTSOptions;
}

export interface UseTTSReturn {
  /** Whether TTS is available and initialized */
  isAvailable: boolean;
  /** Whether current language is supported */
  isLanguageSupported: boolean;
  /** Current playback state */
  playbackState: TTSPlaybackState;
  /** Speak the given text */
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  /** Pause current speech */
  pause: () => Promise<void>;
  /** Resume paused speech */
  resume: () => Promise<void>;
  /** Stop current speech */
  stop: () => Promise<void>;
  /** Initialize TTS service manually */
  initialize: () => Promise<boolean>;
  /** Whether TTS is currently initializing */
  isInitializing: boolean;
  /** Error message if initialization failed */
  error: string | null;
}

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { autoInitialize = true, defaultOptions } = options;
  const processedResourceLanguage = useProcessedResourceLanguage();
  const workspaceLanguage = useWorkspaceLanguage();
  
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLanguageSupported, setIsLanguageSupported] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<TTSPlaybackState>({
    isPlaying: false,
    isPaused: false,
    isLoading: false
  });

  const ttsService = useRef(getTTSService());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Get current language from workspace - try multiple sources (memoized to prevent infinite loops)
  const currentLanguage = useMemo(() => {
    const language = processedResourceLanguage || workspaceLanguage || 'en';
    console.log('🔊 TTS Language resolved:', language);
    return language;
  }, [processedResourceLanguage, workspaceLanguage]);

  const initialize = useCallback(async (): Promise<boolean> => {
    if (isInitializing) return false;
    
    setIsInitializing(true);
    setError(null);

    try {
      // Set current language in TTS service
      ttsService.current.setCurrentLanguage(currentLanguage);
      
      const success = await ttsService.current.initialize();
      
      if (success) {
        setIsAvailable(true);
        
        // Check language support
        const langSupported = await ttsService.current.isCurrentLanguageSupported();
        setIsLanguageSupported(langSupported);
        
        // Subscribe to state changes
        unsubscribeRef.current = ttsService.current.onStateChange(setPlaybackState);
      } else {
        setError('TTS not available on this platform');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize TTS';
      setError(errorMessage);
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [currentLanguage, isInitializing]);

  const speak = useCallback(async (text: string, options?: TTSOptions): Promise<void> => {
    if (!isAvailable) {
      throw new Error('TTS not available');
    }

    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
      await ttsService.current.speak(text, mergedOptions);
    } catch (err) {
      console.error('🔊 useTTS: Speech failed:', err);
      throw err;
    }
  }, [isAvailable, defaultOptions]);

  const pause = useCallback(async (): Promise<void> => {
    if (!isAvailable) return;
    await ttsService.current.pause();
  }, [isAvailable]);

  const resume = useCallback(async (): Promise<void> => {
    if (!isAvailable) return;
    await ttsService.current.resume();
  }, [isAvailable]);

  const stop = useCallback(async (): Promise<void> => {
    if (!isAvailable) return;
    await ttsService.current.stop();
  }, [isAvailable]);

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize && !isAvailable && !isInitializing) {
      initialize();
    }
  }, [autoInitialize, isAvailable, isInitializing, initialize]);

  // Re-check language support when language changes
  useEffect(() => {
    if (isAvailable && currentLanguage) {
      ttsService.current.setCurrentLanguage(currentLanguage);
      ttsService.current.isCurrentLanguageSupported().then(setIsLanguageSupported);
    }
  }, [isAvailable, currentLanguage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // Debug logging for TTS states (can be removed in production)
  // console.log('🔊 useTTS states:', {
  //   isAvailable,
  //   isLanguageSupported,
  //   isInitializing,
  //   currentLanguage,
  //   error,
  //   autoInitialize
  // });

  return {
    isAvailable,
    isLanguageSupported,
    playbackState,
    speak,
    pause,
    resume,
    stop,
    initialize,
    isInitializing,
    error
  };
}
