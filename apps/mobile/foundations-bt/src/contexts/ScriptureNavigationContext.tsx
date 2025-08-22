import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ScriptureReference {
  book: string;
  chapter: number;
  verse: number;
  endChapter?: number;
  endVerse?: number;
}

export interface ScriptureNavigationState {
  currentReference: ScriptureReference;
  availableBooks: string[];
  isLoading: boolean;
  error: string | null;
}

export interface ScriptureNavigationActions {
  setCurrentReference: (reference: ScriptureReference) => void;
  navigateToVerse: (book: string, chapter: number, verse: number) => void;
  navigateToRange: (book: string, startChapter: number, startVerse: number, endChapter?: number, endVerse?: number) => void;
  parseReference: (referenceString: string) => ScriptureReference | null;
  formatReference: (reference: ScriptureReference) => string;
  setAvailableBooks: (books: string[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export type ScriptureNavigationContextType = ScriptureNavigationState & ScriptureNavigationActions;

const ScriptureNavigationContext = createContext<ScriptureNavigationContextType | null>(null);

export interface ScriptureNavigationProviderProps {
  children: ReactNode;
  initialReference?: ScriptureReference;
  initialBooks?: string[];
}

export const ScriptureNavigationProvider: React.FC<ScriptureNavigationProviderProps> = ({
  children,
  initialReference = { book: 'Jonah', chapter: 1, verse: 1 },
  initialBooks = ['Genesis', 'Exodus', 'Matthew', 'Mark', 'Luke', 'John', 'Romans', 'Titus', 'Jonah']
}) => {
  const [currentReference, setCurrentReferenceState] = useState<ScriptureReference>(initialReference);
  const [availableBooks, setAvailableBooks] = useState<string[]>(initialBooks);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Parse reference string like "ROM 1:1-3" or "ROM 1:1-2:5"
  const parseReference = (referenceString: string): ScriptureReference | null => {
    try {
      // Handle cross-chapter references like "ROM 1:1-2:5"
      const crossChapterMatch = referenceString.match(/^([A-Z]{3}|[A-Za-z]+)\s+(\d+):(\d+)-(\d+):(\d+)$/i);
      if (crossChapterMatch) {
        const [, book, startChapter, startVerse, endChapter, endVerse] = crossChapterMatch;
        return {
          book: book.toUpperCase(),
          chapter: parseInt(startChapter),
          verse: parseInt(startVerse),
          endChapter: parseInt(endChapter),
          endVerse: parseInt(endVerse)
        };
      }

      // Handle same-chapter references like "ROM 1:1-3"
      const sameChapterMatch = referenceString.match(/^([A-Z]{3}|[A-Za-z]+)\s+(\d+):(\d+)(?:-(\d+))?$/i);
      if (sameChapterMatch) {
        const [, book, chapter, startVerse, endVerse] = sameChapterMatch;
        return {
          book: book.toUpperCase(),
          chapter: parseInt(chapter),
          verse: parseInt(startVerse),
          endVerse: endVerse ? parseInt(endVerse) : undefined
        };
      }

      // Handle chapter-only references like "ROM 1"
      const chapterMatch = referenceString.match(/^([A-Z]{3}|[A-Za-z]+)\s+(\d+)$/i);
      if (chapterMatch) {
        const [, book, chapter] = chapterMatch;
        return {
          book: book.toUpperCase(),
          chapter: parseInt(chapter),
          verse: 1
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing reference:', error);
      return null;
    }
  };

  // Format reference to string
  const formatReference = (reference: ScriptureReference): string => {
    const { book, chapter, verse, endChapter, endVerse } = reference;
    
    if (endChapter && endVerse && endChapter !== chapter) {
      // Cross-chapter range: "ROM 1:1-2:5"
      return `${book} ${chapter}:${verse}-${endChapter}:${endVerse}`;
    } else if (endVerse && endVerse !== verse) {
      // Same-chapter range: "ROM 1:1-3"
      return `${book} ${chapter}:${verse}-${endVerse}`;
    } else {
      // Single verse: "ROM 1:1"
      return `${book} ${chapter}:${verse}`;
    }
  };

  // Set current reference with validation
  const setCurrentReference = (reference: ScriptureReference) => {
    try {
      setError(null);
      setCurrentReferenceState(reference);
      
      // Log for debugging
      console.log('📍 Navigation: Reference changed to:', formatReference(reference));
    } catch (error) {
      console.error('Error setting reference:', error);
      setError('Invalid reference');
    }
  };

  // Navigate to specific verse
  const navigateToVerse = (book: string, chapter: number, verse: number) => {
    setCurrentReference({
      book: book.toUpperCase(),
      chapter,
      verse
    });
  };

  // Navigate to verse range
  const navigateToRange = (
    book: string, 
    startChapter: number, 
    startVerse: number, 
    endChapter?: number, 
    endVerse?: number
  ) => {
    setCurrentReference({
      book: book.toUpperCase(),
      chapter: startChapter,
      verse: startVerse,
      endChapter,
      endVerse
    });
  };

  // Set loading state
  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  // Notify listeners when reference changes
  useEffect(() => {
    // This effect can be used to trigger resource filtering
    // when the current reference changes
    console.log('🔄 Scripture Navigation: Current reference updated:', formatReference(currentReference));
  }, [currentReference]);

  const contextValue: ScriptureNavigationContextType = {
    // State
    currentReference,
    availableBooks,
    isLoading,
    error,
    
    // Actions
    setCurrentReference,
    navigateToVerse,
    navigateToRange,
    parseReference,
    formatReference,
    setAvailableBooks,
    setLoading,
    setError
  };

  return (
    <ScriptureNavigationContext.Provider value={contextValue}>
      {children}
    </ScriptureNavigationContext.Provider>
  );
};

// Hook to use the scripture navigation context
export const useScriptureNavigation = (): ScriptureNavigationContextType => {
  const context = useContext(ScriptureNavigationContext);
  if (!context) {
    throw new Error('useScriptureNavigation must be used within a ScriptureNavigationProvider');
  }
  return context;
};

// Hook to get filtered resources based on current reference
export const useFilteredResources = () => {
  const { currentReference, formatReference } = useScriptureNavigation();
  
  const currentReferenceString = formatReference(currentReference);
  
  // This hook can be extended to filter different types of resources
  // based on the current scripture reference
  const filterResourcesByReference = <T extends { reference?: string }>(
    resources: T[]
  ): T[] => {
    if (!resources || resources.length === 0) return [];
    
    return resources.filter(resource => {
      if (!resource.reference) return true; // Show resources without specific references
      
      // Parse both references for comparison
      const resourceRef = parseReference(resource.reference);
      if (!resourceRef) return false;
      
      // Check if resource reference overlaps with current reference
      return isReferenceInRange(resourceRef, currentReference);
    });
  };
  
  return {
    currentReference,
    currentReferenceString,
    filterResourcesByReference
  };
};

// Helper function to check if a reference is within a range
const isReferenceInRange = (
  targetRef: ScriptureReference, 
  currentRef: ScriptureReference
): boolean => {
  // Must be same book
  if (targetRef.book !== currentRef.book) return false;
  
  const targetStart = targetRef.chapter * 1000 + targetRef.verse;
  const targetEnd = targetRef.endChapter && targetRef.endVerse 
    ? targetRef.endChapter * 1000 + targetRef.endVerse
    : targetStart;
  
  const currentStart = currentRef.chapter * 1000 + currentRef.verse;
  const currentEnd = currentRef.endChapter && currentRef.endVerse
    ? currentRef.endChapter * 1000 + currentRef.endVerse
    : currentStart;
  
  // Check for overlap
  return targetStart <= currentEnd && targetEnd >= currentStart;
};

// Helper function to parse reference string (exported for use outside context)
export const parseReference = (referenceString: string): ScriptureReference | null => {
  try {
    // Handle cross-chapter references like "ROM 1:1-2:5"
    const crossChapterMatch = referenceString.match(/^([A-Z]{3}|[A-Za-z]+)\s+(\d+):(\d+)-(\d+):(\d+)$/i);
    if (crossChapterMatch) {
      const [, book, startChapter, startVerse, endChapter, endVerse] = crossChapterMatch;
      return {
        book: book.toUpperCase(),
        chapter: parseInt(startChapter),
        verse: parseInt(startVerse),
        endChapter: parseInt(endChapter),
        endVerse: parseInt(endVerse)
      };
    }

    // Handle same-chapter references like "ROM 1:1-3"
    const sameChapterMatch = referenceString.match(/^([A-Z]{3}|[A-Za-z]+)\s+(\d+):(\d+)(?:-(\d+))?$/i);
    if (sameChapterMatch) {
      const [, book, chapter, startVerse, endVerse] = sameChapterMatch;
      return {
        book: book.toUpperCase(),
        chapter: parseInt(chapter),
        verse: parseInt(startVerse),
        endVerse: endVerse ? parseInt(endVerse) : undefined
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing reference:', error);
    return null;
  }
};
