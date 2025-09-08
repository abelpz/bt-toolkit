/**
 * Panels Layer
 * Manages navigation state and coordinates multiple panels using linked-panels
 * Receives owner/language from WorkspaceLayer, passes navigation to PanelLayer
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LinkedPanelsContainer, LinkedPanel } from 'linked-panels';
import { ResourceLayer } from './ResourceLayer';
import { useWorkspace } from './WorkspaceLayer';

// Navigation interfaces
export interface NavigationRange {
  book: string;
  chapter: number;
  verse: number;
  endChapter?: number;
  endVerse?: number;
}

export interface NavigationState {
  currentRange: NavigationRange;
  availableBooks: string[];
}

// Navigation context interface
interface NavigationContextType {
  navigationState: NavigationState;
  navigateToRange: (range: NavigationRange) => void;
  navigateToReference: (book: string, chapter: number, verse: number) => void;
}

// Create navigation context
const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Hook to use navigation context
export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within PanelsLayer');
  }
  return context;
};

// Default navigation state
const DEFAULT_RANGE: NavigationRange = {
  book: 'jon',
  chapter: 1,
  verse: 1
};

export const PanelsLayer: React.FC = () => {
  const { config } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize navigation state from URL or defaults
  const [navigationState, setNavigationState] = useState<NavigationState>(() => {
    const book = searchParams.get('book') || DEFAULT_RANGE.book;
    const chapter = parseInt(searchParams.get('chapter') || DEFAULT_RANGE.chapter.toString());
    const verse = parseInt(searchParams.get('verse') || DEFAULT_RANGE.verse.toString());
    const endChapter = searchParams.get('endChapter') ? parseInt(searchParams.get('endChapter')!) : undefined;
    const endVerse = searchParams.get('endVerse') ? parseInt(searchParams.get('endVerse')!) : undefined;

    return {
      currentRange: {
        book,
        chapter,
        verse,
        endChapter,
        endVerse
      },
      availableBooks: ['jon', 'phm', 'tit', 'est', 'rut', '3jn'] // Will be populated dynamically
    };
  });

  // Update URL when navigation changes
  useEffect(() => {
    const { currentRange } = navigationState;
    const newParams = new URLSearchParams();
    
    newParams.set('book', currentRange.book);
    newParams.set('chapter', currentRange.chapter.toString());
    newParams.set('verse', currentRange.verse.toString());
    
    if (currentRange.endChapter) {
      newParams.set('endChapter', currentRange.endChapter.toString());
    }
    if (currentRange.endVerse) {
      newParams.set('endVerse', currentRange.endVerse.toString());
    }

    // Only update URL if different
    if (searchParams.toString() !== newParams.toString()) {
      setSearchParams(newParams);
    }
  }, [navigationState, searchParams, setSearchParams]);

  const navigateToRange = useCallback((range: NavigationRange) => {
    setNavigationState(prev => ({
      ...prev,
      currentRange: range
    }));
    console.log('🧭 Navigation updated:', range);
  }, []);

  const navigateToReference = useCallback((book: string, chapter: number, verse: number) => {
    const range: NavigationRange = { book, chapter, verse };
    navigateToRange(range);
  }, [navigateToRange]);

  const contextValue: NavigationContextType = {
    navigationState,
    navigateToRange,
    navigateToReference
  };

  // Create linked-panels configuration
  const linkedPanelsConfig = useMemo(() => ({
    resources: [
      {
        id: 'ult-scripture',
        title: 'ULT - Literal Translation',
        description: 'UnfoldingWord Literal Text',
        category: 'scripture',
        icon: '📖',
        component: (
          <ResourceLayer
            resourceType="ult"
            owner={config.owner}
            language={config.language}
            navigationRange={navigationState.currentRange}
          />
        ),
      },
      {
        id: 'ust-scripture',
        title: 'UST - Simplified Translation',
        description: 'UnfoldingWord Simplified Text',
        category: 'scripture',
        icon: '📚',
        component: (
          <ResourceLayer
            resourceType="ust"
            owner={config.owner}
            language={config.language}
            navigationRange={navigationState.currentRange}
          />
        ),
      },
      {
        id: 'translation-notes',
        title: 'Translation Notes',
        description: 'Detailed explanatory notes',
        category: 'notes',
        icon: '📝',
        component: (
          <ResourceLayer
            resourceType="tn"
            owner={config.owner}
            language={config.language}
            navigationRange={navigationState.currentRange}
          />
        ),
      },
    ],
    panels: {
      'left-panel': {
        resourceIds: ['ult-scripture', 'ust-scripture'],
        initialResourceId: 'ult-scripture'
      },
      'right-panel': {
        resourceIds: ['ust-scripture', 'translation-notes'],
        initialResourceId: 'translation-notes'
      }
    },
  }), [config.owner, config.language, navigationState.currentRange]);

  return (
    <NavigationContext.Provider value={contextValue}>
      <div className="h-full w-full flex flex-col">
        {/* Navigation Header */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2">
          <div className="flex items-center space-x-4">
            {/* Book Selector */}
            <select
              value={navigationState.currentRange.book}
              onChange={(e) => navigateToReference(e.target.value, 1, 1)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              {navigationState.availableBooks.map(book => (
                <option key={book} value={book}>
                  {book.toUpperCase()}
                </option>
              ))}
            </select>

            {/* Chapter Selector */}
            <input
              type="number"
              min="1"
              max="150"
              value={navigationState.currentRange.chapter}
              onChange={(e) => navigateToReference(
                navigationState.currentRange.book,
                parseInt(e.target.value) || 1,
                navigationState.currentRange.verse
              )}
              className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />

            {/* Verse Selector */}
            <input
              type="number"
              min="1"
              max="176"
              value={navigationState.currentRange.verse}
              onChange={(e) => navigateToReference(
                navigationState.currentRange.book,
                navigationState.currentRange.chapter,
                parseInt(e.target.value) || 1
              )}
              className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />

            {/* Current Reference Display */}
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {navigationState.currentRange.book.toUpperCase()} {navigationState.currentRange.chapter}:{navigationState.currentRange.verse}
              {navigationState.currentRange.endChapter && navigationState.currentRange.endVerse && 
                `-${navigationState.currentRange.endChapter}:${navigationState.currentRange.endVerse}`
              }
            </div>

            {/* Workspace Config Display */}
            <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
              {config.owner}/{config.language}
            </div>
          </div>
        </div>

        {/* Linked Panels Container */}
        <div className="flex-1 overflow-hidden">
          <LinkedPanelsContainer
            config={linkedPanelsConfig}
            persistence={{
              storageKey: 'translation-studio-panels',
              persistNavigation: true,
              autoSaveDebounce: 500
            }}
          >
            <div className="h-full flex">
              <div className="flex-1 border-r border-gray-200 dark:border-gray-700">
                <LinkedPanel panelId="left-panel" />
              </div>
              <div className="flex-1">
                <LinkedPanel panelId="right-panel" />
              </div>
            </div>
          </LinkedPanelsContainer>
        </div>
      </div>
    </NavigationContext.Provider>
  );
};
