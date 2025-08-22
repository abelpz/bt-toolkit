import { useState, useEffect, useCallback } from 'react';
import { processUSFMSimple } from '@bt-toolkit/usfm-processor';
import type { ProcessedScripture } from '@bt-toolkit/usfm-processor';
import { useScriptureNavigation } from '../contexts/ScriptureNavigationContext';
import { getUSFMForBook } from '../data/sampleUSFMData';

interface UseContextualScriptureRendererOptions {
  enableWordHighlighting?: boolean;
  contextualChunkSize?: 'verse' | 'paragraph' | 'chapter' | 'section';
  autoLoadOnNavigation?: boolean;
}

interface UseContextualScriptureRendererResult {
  processedScripture: ProcessedScripture | null;
  loading: boolean;
  error: string | null;
  highlightedWords: string[];
  contextualReference: string;
  // Actions
  highlightWords: (words: string[]) => void;
  clearHighlights: () => void;
  refreshScripture: () => Promise<void>;
  // Context-aware helpers
  getContextualChunk: (chapterOffset?: number, verseOffset?: number) => string;
  isVerseInCurrentContext: (chapter: number, verse: number) => boolean;
}

/**
 * Enhanced hook for contextual scripture rendering that adapts qa-app patterns to React Native
 * Provides smart contextual chunk rendering based on navigation state
 */
export function useContextualScriptureRenderer(
  options: UseContextualScriptureRendererOptions = {}
): UseContextualScriptureRendererResult {
  const {
    enableWordHighlighting = true,
    contextualChunkSize = 'paragraph',
    autoLoadOnNavigation = true
  } = options;

  // Get navigation context
  const { 
    currentReference, 
    formatReference,
    availableBooks 
  } = useScriptureNavigation();

  // Local state
  const [processedScripture, setProcessedScripture] = useState<ProcessedScripture | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedWords, setHighlightedWords] = useState<string[]>([]);

  // Generate contextual reference based on chunk size and navigation
  const getContextualReference = useCallback((): string => {
    const { book, chapter, verse } = currentReference;
    
    switch (contextualChunkSize) {
      case 'verse':
        return formatReference(currentReference);
      
      case 'paragraph':
        // Show paragraph context (typically 3-5 verses around current)
        const startVerse = Math.max(1, verse - 2);
        const endVerse = verse + 2;
        return `${book} ${chapter}:${startVerse}-${endVerse}`;
      
      case 'chapter':
        return `${book} ${chapter}`;
      
      case 'section':
        // Show section context (could be multiple paragraphs)
        const sectionStart = Math.max(1, verse - 5);
        const sectionEnd = verse + 5;
        return `${book} ${chapter}:${sectionStart}-${sectionEnd}`;
      
      default:
        return formatReference(currentReference);
    }
  }, [currentReference, contextualChunkSize, formatReference]);

  const contextualReference = getContextualReference();

  // Load and process scripture for current book
  const loadScripture = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading contextual scripture for:', currentReference.book);
      
      // Get USFM data for current book
      const usfmText = getUSFMForBook(currentReference.book);
      
      if (!usfmText) {
        throw new Error(`No USFM data found for ${currentReference.book}`);
      }

      // Process USFM using bt-toolkit processor
      const processed = processUSFMSimple(usfmText, currentReference.book);
      setProcessedScripture(processed);
      
      console.log('✅ Contextual scripture processed:', {
        book: currentReference.book,
        chapters: processed.metadata.totalChapters,
        verses: processed.metadata.totalVerses,
        contextualReference,
        chunkSize: contextualChunkSize
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Contextual scripture loading failed:', message);
      setError(message);
      setProcessedScripture(null);
    } finally {
      setLoading(false);
    }
  }, [currentReference.book, contextualReference, contextualChunkSize]);

  // Auto-load on navigation changes
  useEffect(() => {
    if (autoLoadOnNavigation) {
      loadScripture();
    }
  }, [loadScripture, autoLoadOnNavigation]);

  // Word highlighting actions
  const highlightWords = useCallback((words: string[]) => {
    if (enableWordHighlighting) {
      setHighlightedWords(words);
      console.log('🎯 Highlighting words:', words);
    }
  }, [enableWordHighlighting]);

  const clearHighlights = useCallback(() => {
    setHighlightedWords([]);
    console.log('🧹 Cleared word highlights');
  }, []);

  // Get contextual chunk with offset support
  const getContextualChunk = useCallback((chapterOffset = 0, verseOffset = 0): string => {
    const { book, chapter, verse } = currentReference;
    const targetChapter = chapter + chapterOffset;
    const targetVerse = verse + verseOffset;
    
    // Ensure we don't go below 1
    const safeChapter = Math.max(1, targetChapter);
    const safeVerse = Math.max(1, targetVerse);
    
    switch (contextualChunkSize) {
      case 'verse':
        return `${book} ${safeChapter}:${safeVerse}`;
      
      case 'paragraph':
        const startVerse = Math.max(1, safeVerse - 2);
        const endVerse = safeVerse + 2;
        return `${book} ${safeChapter}:${startVerse}-${endVerse}`;
      
      case 'chapter':
        return `${book} ${safeChapter}`;
      
      case 'section':
        const sectionStart = Math.max(1, safeVerse - 5);
        const sectionEnd = safeVerse + 5;
        return `${book} ${safeChapter}:${sectionStart}-${sectionEnd}`;
      
      default:
        return `${book} ${safeChapter}:${safeVerse}`;
    }
  }, [currentReference, contextualChunkSize]);

  // Check if a verse is in current context
  const isVerseInCurrentContext = useCallback((chapter: number, verse: number): boolean => {
    const { chapter: currentChapter, verse: currentVerse } = currentReference;
    
    switch (contextualChunkSize) {
      case 'verse':
        return chapter === currentChapter && verse === currentVerse;
      
      case 'paragraph':
        if (chapter !== currentChapter) return false;
        const paragraphStart = Math.max(1, currentVerse - 2);
        const paragraphEnd = currentVerse + 2;
        return verse >= paragraphStart && verse <= paragraphEnd;
      
      case 'chapter':
        return chapter === currentChapter;
      
      case 'section':
        if (chapter !== currentChapter) return false;
        const sectionStart = Math.max(1, currentVerse - 5);
        const sectionEnd = currentVerse + 5;
        return verse >= sectionStart && verse <= sectionEnd;
      
      default:
        return chapter === currentChapter && verse === currentVerse;
    }
  }, [currentReference, contextualChunkSize]);

  return {
    processedScripture,
    loading,
    error,
    highlightedWords,
    contextualReference,
    // Actions
    highlightWords,
    clearHighlights,
    refreshScripture: loadScripture,
    // Context-aware helpers
    getContextualChunk,
    isVerseInCurrentContext
  };
}
