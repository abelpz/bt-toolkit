import { useMemo } from 'react';
import { mockBookResources } from '../data/mockData';
import { VerseText, TranslationNote } from '../types';

interface UseVerseDataReturn {
  ultVerse: VerseText;
  ustVerse: VerseText;
  verseNotes: TranslationNote[];
  isLoading: boolean;
  error: string | null;
}

interface UseVerseDataParams {
  book?: string;
  chapter?: number;
  verse?: number;
  reference?: string;
}

/**
 * Custom hook to fetch and process verse data for translation tools
 * @param params - Parameters for fetching verse data
 * @returns Processed verse data including ULT, UST, and translation notes
 */
export const useVerseData = (params: UseVerseDataParams = {}): UseVerseDataReturn => {
  const { reference = '1:1' } = params;

  // In a real app, this would be an async data fetch
  // For now, we're using mock data synchronously
  const { ultVerse, ustVerse, verseNotes, isLoading, error } = useMemo(() => {
    try {
      // Simulate loading state (in real app, this would be actual async loading)
      const isLoading = false;
      
      // Get verse data from mock resources
      const ultVerse = mockBookResources.ult[0]; // First verse (Romans 1:1)
      const ustVerse = mockBookResources.ust[0]; // First verse (Romans 1:1)
      
      // Filter notes by reference
      const verseNotes = mockBookResources.tn.filter(
        (note) => note.reference === reference
      );

      return {
        ultVerse,
        ustVerse,
        verseNotes,
        isLoading,
        error: null,
      };
    } catch (err) {
      return {
        ultVerse: mockBookResources.ult[0], // Fallback
        ustVerse: mockBookResources.ust[0], // Fallback
        verseNotes: [],
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error occurred',
      };
    }
  }, [reference]);

  return {
    ultVerse,
    ustVerse,
    verseNotes,
    isLoading,
    error,
  };
}; 