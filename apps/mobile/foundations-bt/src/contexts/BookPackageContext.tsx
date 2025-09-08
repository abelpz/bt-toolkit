/**
 * Book Package Context
 * Manages the current book translation package and provides it to all components
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BookTranslationPackage } from '../services/door43/BookTranslationPackageService';
import { useUnifiedResourceService } from './UnifiedResourceServiceContext';
import { useScriptureNavigation } from './ScriptureNavigationContext';

export interface BookPackageState {
  currentPackage: BookTranslationPackage | null;
  isLoading: boolean;
  error: string | null;
  lastLoadedBook: string | null;
}

export interface BookPackageActions {
  loadBookPackage: (book: string) => Promise<void>;
  clearPackage: () => void;
  refreshPackage: () => Promise<void>;
}

export type BookPackageContextType = BookPackageState & BookPackageActions;

const BookPackageContext = createContext<BookPackageContextType | null>(null);

export interface BookPackageProviderProps {
  children: ReactNode;
}

export const BookPackageProvider: React.FC<BookPackageProviderProps> = ({ children }) => {
  const [currentPackage, setCurrentPackage] = useState<BookTranslationPackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedBook, setLastLoadedBook] = useState<string | null>(null);

  const { getResourcesForReference, isInitialized } = useUnifiedResourceService();
  const { currentReference } = useScriptureNavigation();

  const loadBookPackage = async (book: string) => {
    if (!isInitialized) {
      console.warn('⚠️ Resource service not ready for book package loading');
      return;
    }

    // Don't reload if it's the same book and we already have a package
    if (lastLoadedBook === book && currentPackage) {
      console.log(`📦 Book package for ${book} already loaded`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`📦 Loading book package for: ${book}`);

      // Create a simple package structure using the unified service
      // Note: Advanced book package loading will be implemented when needed
      if (false) { // Temporarily disabled
        // Use the advanced book package system
        // This section is temporarily disabled - will be re-implemented with unified service
        const bookPackage = await (null as any).getBookTranslationPackage(book, [
          'literalText',
          'simplifiedText', 
          'translationNotes',
          'translationWordsLinks',
          'translationQuestions'
        ]);

        setCurrentPackage(bookPackage);
        setLastLoadedBook(book);
        
        console.log(`✅ Book package loaded for ${book}:`, {
          literalText: !!bookPackage.literalText,
          simplifiedText: !!bookPackage.simplifiedText,
          translationNotes: !!bookPackage.translationNotes,
          translationWordsLinks: !!bookPackage.translationWordsLinks,
          translationQuestions: !!bookPackage.translationQuestions,
          repositories: Object.keys(bookPackage.repositories).length
        });
      } else {
        // Fallback: Load resources individually (for SampleResourcesService)
        console.log(`📦 Loading individual resources for ${book} (fallback mode)`);
        
        const [literalText, simplifiedText, translationNotes, translationWordsLinks, translationQuestions] = await Promise.all([
          resourceService.getBibleText(book, 'ult'),
          resourceService.getBibleText(book, 'ust'),
          resourceService.getTranslationNotes(book),
          resourceService.getTranslationWordsLinks(book),
          resourceService.getTranslationQuestions(book)
        ]);

        // Create a package-like structure for compatibility
        const fallbackPackage: BookTranslationPackage = {
          book,
          language: 'en', // Default for sample service
          organization: 'unfoldingWord',
          fetchedAt: new Date(),
          repositories: {},
          literalText: literalText ? {
            source: 'sample-ult',
            content: literalText.content,
            processed: literalText
          } : undefined,
          simplifiedText: simplifiedText ? {
            source: 'sample-ust', 
            content: simplifiedText.content,
            processed: simplifiedText
          } : undefined,
          translationNotes: translationNotes ? {
            source: 'sample-tn',
            content: '', // Raw content not available in sample service
            processed: translationNotes
          } : undefined,
          translationWordsLinks: translationWordsLinks ? {
            source: 'sample-twl',
            content: '',
            processed: translationWordsLinks
          } : undefined,
          translationQuestions: translationQuestions ? {
            source: 'sample-tq',
            content: '',
            processed: translationQuestions
          } : undefined
        };

        setCurrentPackage(fallbackPackage);
        setLastLoadedBook(book);
        
        console.log(`✅ Fallback book package created for ${book}`);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load book package';
      console.error(`❌ Failed to load book package for ${book}:`, err);
      setError(errorMessage);
      setCurrentPackage(null);
      setLastLoadedBook(null);
    } finally {
      setIsLoading(false);
    }
  };

  const clearPackage = () => {
    setCurrentPackage(null);
    setLastLoadedBook(null);
    setError(null);
    console.log('🧹 Book package cleared');
  };

  const refreshPackage = async () => {
    if (lastLoadedBook) {
      // Force reload by clearing the last loaded book
      const bookToReload = lastLoadedBook;
      setLastLoadedBook(null);
      await loadBookPackage(bookToReload);
    }
  };

  // Auto-load book package when the current reference book changes
  useEffect(() => {
    if (currentReference.book && isInitialized) {
      loadBookPackage(currentReference.book);
    }
  }, [currentReference.book, isInitialized]);

  const contextValue: BookPackageContextType = {
    currentPackage,
    isLoading,
    error,
    lastLoadedBook,
    loadBookPackage,
    clearPackage,
    refreshPackage,
  };

  return (
    <BookPackageContext.Provider value={contextValue}>
      {children}
    </BookPackageContext.Provider>
  );
};

export const useBookPackage = (): BookPackageContextType => {
  const context = useContext(BookPackageContext);
  if (!context) {
    throw new Error('useBookPackage must be used within a BookPackageProvider');
  }
  return context;
};

// Convenience hooks for specific resources
export const useCurrentBookPackage = (): BookTranslationPackage | null => {
  const { currentPackage } = useBookPackage();
  return currentPackage;
};

export const useBookPackageResource = <T = any>(
  resourceType: keyof BookTranslationPackage,
  fallback: T | null = null
): T | null => {
  const { currentPackage } = useBookPackage();
  
  if (!currentPackage) {
    return fallback;
  }

  const resource = currentPackage[resourceType] as any;
  return resource?.processed || fallback;
};

export const useBookPackageLoading = (): boolean => {
  const { isLoading } = useBookPackage();
  return isLoading;
};
