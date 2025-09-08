/**
 * Scripture Data Hook
 * Manages scripture data with efficient caching and prevents unnecessary refetching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchScripture, type Door43Resource } from '../services/door43-api';
import type { ProcessedScripture, ProcessingResult } from '../services/usfm-processor';
import type { RangeReference } from '../types/navigation';
import { useDoor43 } from '../contexts/Door43Context';

interface ScriptureData {
  book: string;
  resource: Door43Resource;
  processedScripture: ProcessedScripture;
  processingResult: ProcessingResult;
  fromCache?: boolean;
}

interface ScriptureCache {
  [key: string]: ScriptureData; // key format: "org/lang/resourceType/book"
}

interface UseScriptureDataOptions {
  resourceType?: string;
}

// Global cache to prevent refetching across component instances
const globalScriptureCache: ScriptureCache = {};
const loadingPromises: { [key: string]: Promise<ScriptureData | null> } = {};

export const useScriptureData = (
  currentRange?: RangeReference,
  options: UseScriptureDataOptions = {}
) => {
  const [scriptureData, setScriptureData] = useState<ScriptureData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<'checking' | 'hit' | 'miss' | 'error'>('checking');
  const { config } = useDoor43();
  
  // Use current range or default to Jonah
  const book = currentRange?.book || 'jon';
  const resourceType = options.resourceType || config.resourceType;
  
  // Generate cache key
  const cacheKey = `${config.organization}/${config.language}/${resourceType}/${book}`;
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadScripture = useCallback(async () => {
    // Check if data is already in global cache
    if (globalScriptureCache[cacheKey]) {
      console.log(`📦 Using global cache for ${cacheKey}`);
      if (isMountedRef.current) {
        setScriptureData(globalScriptureCache[cacheKey]);
        setIsLoading(false);
        setError(null);
        setCacheStatus('hit');
      }
      return;
    }

    // Check if already loading this data
    if (loadingPromises[cacheKey]) {
      console.log(`⏳ Already loading ${cacheKey}, waiting...`);
      try {
        const result = await loadingPromises[cacheKey];
        if (result && isMountedRef.current) {
          setScriptureData(result);
          setIsLoading(false);
          setError(null);
          setCacheStatus('hit');
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load scripture');
          setIsLoading(false);
          setCacheStatus('error');
        }
      }
      return;
    }

    // Start loading
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
      setCacheStatus('checking');
    }

    console.log(`🔍 Loading ${resourceType.toUpperCase()} ${book}...`);

    // Create loading promise
    const loadingPromise = fetchScripture(book, undefined, {
      organization: config.organization,
      language: config.language,
      resourceType: resourceType
    }).then((result) => {
      if (!result) {
        throw new Error('Failed to fetch scripture');
      }

      const scriptureData: ScriptureData = {
        book: book.toUpperCase(),
        resource: result.resource,
        processedScripture: result.processedScripture,
        processingResult: result.processingResult,
        fromCache: result.fromCache
      };

      // Store in global cache
      globalScriptureCache[cacheKey] = scriptureData;
      
      // Clean up loading promise
      delete loadingPromises[cacheKey];
      
      return scriptureData;
    }).catch((err) => {
      // Clean up loading promise
      delete loadingPromises[cacheKey];
      throw err;
    });

    // Store loading promise
    loadingPromises[cacheKey] = loadingPromise;

    try {
      const result = await loadingPromise;
      if (result && isMountedRef.current) {
        setScriptureData(result);
        setIsLoading(false);
        setError(null);
        setCacheStatus(result.fromCache ? 'hit' : 'miss');
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load scripture');
        setIsLoading(false);
        setCacheStatus('error');
      }
    }
  }, [cacheKey, book, resourceType, config.organization, config.language]);

  useEffect(() => {
    loadScripture();
  }, [loadScripture]);

  // Function to clear cache for a specific key or all
  const clearCache = useCallback((specificKey?: string) => {
    if (specificKey) {
      delete globalScriptureCache[specificKey];
      delete loadingPromises[specificKey];
    } else {
      // Clear all cache
      Object.keys(globalScriptureCache).forEach(key => delete globalScriptureCache[key]);
      Object.keys(loadingPromises).forEach(key => delete loadingPromises[key]);
    }
  }, []);

  return {
    scriptureData,
    isLoading,
    error,
    cacheStatus,
    clearCache,
    refresh: loadScripture
  };
};

// Export function to clear all scripture cache (useful for config changes)
export const clearAllScriptureCache = () => {
  Object.keys(globalScriptureCache).forEach(key => delete globalScriptureCache[key]);
  Object.keys(loadingPromises).forEach(key => delete loadingPromises[key]);
  console.log('🧹 Cleared all scripture cache');
};
