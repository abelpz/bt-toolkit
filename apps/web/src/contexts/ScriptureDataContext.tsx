/**
 * Scripture Data Context
 * Centralized data management for all scripture and notes
 * Prevents redundant fetching and provides instant navigation
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchScripture, fetchTranslationNotes, type Door43Resource } from '../services/door43-api';
import type { ProcessedScripture, ProcessingResult } from '../services/usfm-processor';
import type { TranslationNote } from '../services/door43-api';
import { useDoor43 } from './Door43Context';

// Data interfaces
interface ScriptureData {
  book: string;
  resource: Door43Resource;
  processedScripture: ProcessedScripture;
  processingResult: ProcessingResult;
  fromCache?: boolean;
}

interface NotesData {
  book: string;
  resource: Door43Resource;
  notes: TranslationNote[];
  fromCache?: boolean;
}

// Cache structures
interface ScriptureCache {
  [key: string]: ScriptureData; // key: "org/lang/resourceType/book"
}

interface NotesCache {
  [key: string]: NotesData; // key: "org/lang/book"
}

interface LoadingState {
  [key: string]: boolean;
}

interface ScriptureDataContextType {
  // Data getters
  getScriptureData: (book: string, resourceType: string) => ScriptureData | null;
  getNotesData: (book: string) => NotesData | null;
  
  // Loading states
  isScriptureLoading: (book: string, resourceType: string) => boolean;
  isNotesLoading: (book: string) => boolean;
  
  // Actions
  preloadScripture: (book: string, resourceType: string) => Promise<void>;
  preloadNotes: (book: string) => Promise<void>;
  clearCache: () => void;
  
  // Bulk operations for better UX
  preloadBook: (book: string) => Promise<void>; // Loads all resources for a book
  preloadAdjacentBooks: (currentBook: string) => Promise<void>; // Preload prev/next books
}

const ScriptureDataContext = createContext<ScriptureDataContextType | undefined>(undefined);

export const ScriptureDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scriptureCache, setScriptureCache] = useState<ScriptureCache>({});
  const [notesCache, setNotesCache] = useState<NotesCache>({});
  const [scriptureLoading, setScriptureLoading] = useState<LoadingState>({});
  const [notesLoading, setNotesLoading] = useState<LoadingState>({});
  
  const { config, availableResources } = useDoor43();

  // Generate cache keys
  const getScriptureKey = (book: string, resourceType: string) => 
    `${config.organization}/${config.language}/${resourceType}/${book}`;
  
  const getNotesKey = (book: string) => 
    `${config.organization}/${config.language}/tn/${book}`;

  // Get scripture data from cache
  const getScriptureData = useCallback((book: string, resourceType: string): ScriptureData | null => {
    const key = getScriptureKey(book, resourceType);
    return scriptureCache[key] || null;
  }, [scriptureCache, config]);

  // Get notes data from cache
  const getNotesData = useCallback((book: string): NotesData | null => {
    const key = getNotesKey(book);
    return notesCache[key] || null;
  }, [notesCache, config]);

  // Check loading states
  const isScriptureLoading = useCallback((book: string, resourceType: string): boolean => {
    const key = getScriptureKey(book, resourceType);
    return scriptureLoading[key] || false;
  }, [scriptureLoading, config]);

  const isNotesLoading = useCallback((book: string): boolean => {
    const key = getNotesKey(book);
    return notesLoading[key] || false;
  }, [notesLoading, config]);

  // Preload scripture data
  const preloadScripture = useCallback(async (book: string, resourceType: string) => {
    const key = getScriptureKey(book, resourceType);
    
    // Skip if already cached or loading
    if (scriptureCache[key] || scriptureLoading[key]) {
      return;
    }

    console.log(`📚 Preloading ${resourceType.toUpperCase()} ${book}...`);
    
    // Set loading state
    setScriptureLoading(prev => ({ ...prev, [key]: true }));

    try {
      const result = await fetchScripture(book, undefined, {
        organization: config.organization,
        language: config.language,
        resourceType: resourceType
      });

      if (result) {
        const scriptureData: ScriptureData = {
          book: book.toUpperCase(),
          resource: result.resource,
          processedScripture: result.processedScripture,
          processingResult: result.processingResult,
          fromCache: result.fromCache
        };

        // Update cache
        setScriptureCache(prev => ({ ...prev, [key]: scriptureData }));
        console.log(`✅ Cached ${resourceType.toUpperCase()} ${book}`);
      }
    } catch (error) {
      console.error(`❌ Failed to load ${resourceType} ${book}:`, error);
    } finally {
      // Clear loading state
      setScriptureLoading(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    }
  }, [config, scriptureCache, scriptureLoading]);

  // Preload notes data
  const preloadNotes = useCallback(async (book: string) => {
    const key = getNotesKey(book);
    
    // Skip if already cached or loading
    if (notesCache[key] || notesLoading[key]) {
      return;
    }

    console.log(`📝 Preloading Translation Notes ${book}...`);
    
    // Set loading state
    setNotesLoading(prev => ({ ...prev, [key]: true }));

    try {
      const result = await fetchTranslationNotes(book, undefined, {
        organization: config.organization,
        language: config.language,
        resourceType: 'tn'
      });

      if (result) {
        const notesData: NotesData = {
          book: book.toUpperCase(),
          resource: result.resource,
          notes: result.notes,
          fromCache: result.fromCache
        };

        // Update cache
        setNotesCache(prev => ({ ...prev, [key]: notesData }));
        console.log(`✅ Cached Translation Notes ${book}`);
      }
    } catch (error) {
      console.error(`❌ Failed to load notes ${book}:`, error);
    } finally {
      // Clear loading state
      setNotesLoading(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    }
  }, [config, notesCache, notesLoading]);

  // Preload all resources for a book (ULT, UST, Notes)
  const preloadBook = useCallback(async (book: string) => {
    console.log(`📖 Preloading all resources for ${book}...`);
    
    const resourceTypes = availableResources
      .filter(r => ['ult', 'ust'].includes(r.resourceType))
      .map(r => r.resourceType);

    // Load scripture resources and notes in parallel
    const promises = [
      ...resourceTypes.map(resourceType => preloadScripture(book, resourceType)),
      preloadNotes(book)
    ];

    await Promise.all(promises);
    console.log(`✅ Preloaded all resources for ${book}`);
  }, [availableResources, preloadScripture, preloadNotes]);

  // Preload adjacent books for smooth navigation
  const preloadAdjacentBooks = useCallback(async (currentBook: string) => {
    // Simple book order (you might want to use a more sophisticated approach)
    const bookOrder = ['gen', 'exo', 'lev', 'num', 'deu', 'jos', 'jdg', 'rut', '1sa', '2sa', 
                      '1ki', '2ki', '1ch', '2ch', 'ezr', 'neh', 'est', 'job', 'psa', 'pro', 
                      'ecc', 'sng', 'isa', 'jer', 'lam', 'ezk', 'dan', 'hos', 'jol', 'amo', 
                      'oba', 'jon', 'mic', 'nam', 'hab', 'zep', 'hag', 'zec', 'mal',
                      'mat', 'mrk', 'luk', 'jhn', 'act', 'rom', '1co', '2co', 'gal', 'eph', 
                      'php', 'col', '1th', '2th', '1ti', '2ti', 'tit', 'phm', 'heb', 'jas', 
                      '1pe', '2pe', '1jn', '2jn', '3jn', 'jud', 'rev'];
    
    const currentIndex = bookOrder.indexOf(currentBook.toLowerCase());
    if (currentIndex === -1) return;

    const adjacentBooks = [];
    if (currentIndex > 0) adjacentBooks.push(bookOrder[currentIndex - 1]); // Previous
    if (currentIndex < bookOrder.length - 1) adjacentBooks.push(bookOrder[currentIndex + 1]); // Next

    console.log(`🔄 Preloading adjacent books: ${adjacentBooks.join(', ')}`);
    
    // Preload adjacent books in background (don't await)
    adjacentBooks.forEach(book => {
      preloadBook(book).catch(error => 
        console.warn(`⚠️ Failed to preload ${book}:`, error)
      );
    });
  }, [preloadBook]);

  // Clear all cache
  const clearCache = useCallback(() => {
    setScriptureCache({});
    setNotesCache({});
    setScriptureLoading({});
    setNotesLoading({});
    console.log('🧹 Cleared all scripture data cache');
  }, []);

  // Clear cache when config changes
  useEffect(() => {
    clearCache();
  }, [config.organization, config.language, clearCache]);

  const contextValue: ScriptureDataContextType = {
    getScriptureData,
    getNotesData,
    isScriptureLoading,
    isNotesLoading,
    preloadScripture,
    preloadNotes,
    preloadBook,
    preloadAdjacentBooks,
    clearCache
  };

  return (
    <ScriptureDataContext.Provider value={contextValue}>
      {children}
    </ScriptureDataContext.Provider>
  );
};

export const useScriptureDataContext = (): ScriptureDataContextType => {
  const context = useContext(ScriptureDataContext);
  if (context === undefined) {
    throw new Error('useScriptureDataContext must be used within a ScriptureDataProvider');
  }
  return context;
};

export default ScriptureDataContext;
