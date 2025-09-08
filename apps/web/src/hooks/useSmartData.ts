/**
 * Hook for accessing SmartDataManager from components
 * Provides optimistic data loading and cache-first approach
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDataManager } from '../services/data-manager';
import { fetchScripture, fetchTranslationNotes } from '../services/door43-api';
import { useDoor43 } from '../contexts/Door43Context';
import { RangeReference } from '../types/navigation';

export interface UseSmartDataOptions {
  resourceId: string;
  range: RangeReference;
  enabled?: boolean;
}

export interface UseSmartDataResult<T = any> {
  data: T | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get data from SmartDataManager with optimistic loading
 */
export function useSmartData<T = any>({
  resourceId,
  range,
  enabled = true
}: UseSmartDataOptions): UseSmartDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { config } = useDoor43();
  const dataRef = useRef<T | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const fetchData = useCallback(async (showLoading = true) => {
    if (!enabled) return;

    try {
      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      setError(null);

      // Try to use SmartDataManager first, fallback to direct API calls
      let result;
      try {
        const dataManager = getDataManager({
          organization: config.organization,
          language: config.language
        });
        result = await dataManager.getResourceData(
          resourceId,
          range,
          (newData: T) => {
            // Callback for when data is ready
            setData(newData);
            setIsLoading(false);
            setIsRefreshing(false);
          }
        );
      } catch (err) {
        console.warn(`DataManager not ready for ${resourceId}, using direct API fallback...`);
        
        // Fallback to direct API calls
        if (resourceId === 'ult-scripture') {
          result = await fetchScripture(range.book, undefined, {
            organization: config.organization,
            language: config.language,
            resourceType: 'ult'
          });
        } else if (resourceId === 'ust-scripture') {
          result = await fetchScripture(range.book, undefined, {
            organization: config.organization,
            language: config.language,
            resourceType: 'ust'
          });
        } else if (resourceId === 'translation-notes') {
          result = await fetchTranslationNotes(range.book, range.startChapter, {
            organization: config.organization,
            language: config.language,
            resourceType: 'tn'
          });
        }
      }

      // If we got data, use it
      if (result) {
        setData(result);
        setIsLoading(false);
        setIsRefreshing(false);
      } else {
        // If no result, just stop loading/refreshing but keep existing data
        console.warn(`No new data for ${resourceId}, keeping existing data`);
        setIsRefreshing(false);
        setIsLoading(false);
      }

    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      console.error(`Failed to fetch ${resourceId}:`, errorObj);
      
      // Always preserve existing data during failures
      console.warn(`Fetch failed for ${resourceId}, preserving existing data`);
      setIsLoading(false);
      setIsRefreshing(false);
      
      // Only set error for initial load failures (when we have no data)
      setError(dataRef.current ? null : errorObj);
    }
  }, [resourceId, range, enabled, config]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refetch
  };
}

/**
 * Hook specifically for scripture data
 */
export function useSmartScriptureData(
  resourceType: 'ult' | 'ust',
  range: RangeReference,
  enabled = true
) {
  const resourceId = resourceType === 'ult' ? 'ult-scripture' : 'ust-scripture';
  
  return useSmartData({
    resourceId,
    range,
    enabled
  });
}

/**
 * Hook specifically for translation notes data
 */
export function useSmartNotesData(
  range: RangeReference,
  enabled = true
) {
  return useSmartData({
    resourceId: 'translation-notes',
    range,
    enabled
  });
}
