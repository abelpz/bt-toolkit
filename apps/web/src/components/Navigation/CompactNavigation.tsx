/**
 * Compact Navigation - Iteration 2
 * Two separate dropdown buttons: Book selection and within-book navigation
 * Designed to take minimal space at the top of the screen
 */

import React, { useState, useRef, useEffect } from 'react';
import { NavigationMode, RangeReference, NavigationState } from '../../types/navigation';
import { BookSelector } from './BookSelector';
import { WithinBookNavigator } from './WithinBookNavigator';
import { PassageSetsNavigator } from './PassageSetsNavigator';
import { fetchScripture } from '../../services/door43-api';
import type { TranslatorSection, ProcessedScripture } from '../../services/usfm-processor';

export interface CompactNavigationProps {
  navigationState: NavigationState;
  onNavigationChange: (range: RangeReference, mode: NavigationMode) => void;
  availableBooks?: string[];
  className?: string;
}

interface BookData {
  bookCode: string;
  sections: TranslatorSection[];
  processedScripture: ProcessedScripture;
  isLoading: boolean;
  error?: string;
}

export const CompactNavigation: React.FC<CompactNavigationProps> = ({
  navigationState,
  onNavigationChange,
  availableBooks = ['jon', 'phm'],
  className = ''
}) => {
  const [isBookSelectorExpanded, setIsBookSelectorExpanded] = useState(false);
  const [isWithinBookExpanded, setIsWithinBookExpanded] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'book' | 'passage-set'>('book');
  const [bookData, setBookData] = useState<BookData | null>(null);
  
  const bookSelectorRef = useRef<HTMLDivElement>(null);
  const withinBookRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bookSelectorRef.current && !bookSelectorRef.current.contains(event.target as Node)) {
        setIsBookSelectorExpanded(false);
      }
      if (withinBookRef.current && !withinBookRef.current.contains(event.target as Node)) {
        setIsWithinBookExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load book data when current range changes to a different book
  useEffect(() => {
    if (navigationState.currentRange.book && navigationState.currentRange.book !== bookData?.bookCode) {
      loadBookData(navigationState.currentRange.book);
    }
  }, [navigationState.currentRange.book]);

  const loadBookData = async (bookCode: string) => {
    setBookData({
      bookCode,
      sections: [],
      processedScripture: {} as ProcessedScripture,
      isLoading: true
    });

    try {
      const scriptureData = await fetchScripture(bookCode);
      
      if (!scriptureData) {
        throw new Error('Failed to fetch scripture data');
      }
      
      const sections = scriptureData.processingResult?.translatorSections || [];
      const processedScripture = scriptureData.processedScripture;
      
      setBookData({
        bookCode,
        sections,
        processedScripture,
        isLoading: false
      });
      
    } catch (error) {
      setBookData({
        bookCode,
        sections: [],
        processedScripture: {} as ProcessedScripture,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load book data'
      });
    }
  };

  const handleBookSelect = async (bookCode: string) => {
    await loadBookData(bookCode);
    
    // Navigate to the first verse of the selected book
    const newRange: RangeReference = {
      book: bookCode,
      startChapter: 1,
      startVerse: 1
    };
    
    onNavigationChange(newRange, navigationState.mode);
    setIsBookSelectorExpanded(false);
  };

  const handlePassageSelect = async (range: RangeReference) => {
    if (range.book !== bookData?.bookCode) {
      await loadBookData(range.book);
    }
    onNavigationChange(range, navigationState.mode);
    setIsBookSelectorExpanded(false);
  };

  const handleWithinBookNavigation = (range: RangeReference) => {
    onNavigationChange(range, navigationState.mode);
    setIsWithinBookExpanded(false);
  };

  const getCurrentDisplayText = () => {
    const range = navigationState.currentRange;
    const bookCode = range.book.toUpperCase();
    
    if (!range.endChapter || (range.startChapter === range.endChapter && !range.endVerse)) {
      return `${range.startChapter}:${range.startVerse}`;
    }
    
    if (range.startChapter === range.endChapter) {
      return `${range.startChapter}:${range.startVerse}-${range.endVerse}`;
    }
    
    return `${range.startChapter}:${range.startVerse}-${range.endChapter}:${range.endVerse}`;
  };

  return (
    <div className={`compact-navigation flex items-center space-x-2 ${className}`}>
      {/* Book/Passage Selection Dropdown */}
      <div className="relative" ref={bookSelectorRef}>
        <button
          onClick={() => setIsBookSelectorExpanded(!isBookSelectorExpanded)}
          className="
            flex items-center space-x-2 px-3 py-2 rounded-lg
            bg-white dark:bg-gray-800 
            border border-gray-200 dark:border-gray-700
            hover:border-gray-300 dark:hover:border-gray-600
            text-gray-900 dark:text-gray-100
            font-medium text-sm
            transition-all duration-200
            shadow-sm hover:shadow-md
          "
        >
          <span role="img" aria-label="Books">📚</span>
          <span>{navigationState.currentRange.book.toUpperCase()}</span>
          <span className={`transform transition-transform duration-200 ${isBookSelectorExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Book Selection Dropdown */}
        {isBookSelectorExpanded && (
          <div className="
            absolute top-full left-0 mt-2 w-80 z-50
            bg-white dark:bg-gray-800 
            border border-gray-200 dark:border-gray-700
            rounded-xl shadow-xl dark:shadow-2xl
            animate-in slide-in-from-top-2 duration-200
            max-h-[70vh] flex flex-col
          ">
            <div className="p-4 overflow-y-auto">
              {/* Mode Selection */}
              <div className="flex items-center space-x-2 mb-4">
                <button
                  onClick={() => setSelectedMode('book')}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                    ${selectedMode === 'book'
                      ? 'bg-blue-500 dark:bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  📖
                </button>
                <button
                  onClick={() => setSelectedMode('passage-set')}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                    ${selectedMode === 'passage-set'
                      ? 'bg-blue-500 dark:bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  📚
                </button>
              </div>

              {/* Content based on selected mode */}
              {selectedMode === 'book' ? (
                <BookSelector
                  availableBooks={availableBooks}
                  onBookSelect={handleBookSelect}
                  currentBook={navigationState.currentRange.book}
                />
              ) : (
                <PassageSetsNavigator
                  currentRange={navigationState.currentRange}
                  onRangeSelect={handlePassageSelect}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Within-Book Navigation Dropdown */}
      <div className="relative" ref={withinBookRef}>
        <button
          onClick={() => setIsWithinBookExpanded(!isWithinBookExpanded)}
          className="
            flex items-center space-x-2 px-3 py-2 rounded-lg
            bg-white dark:bg-gray-800 
            border border-gray-200 dark:border-gray-700
            hover:border-gray-300 dark:hover:border-gray-600
            text-gray-900 dark:text-gray-100
            font-medium text-sm
            transition-all duration-200
            shadow-sm hover:shadow-md
          "
        >
          <span role="img" aria-label="Navigation">🎯</span>
          <span>{getCurrentDisplayText()}</span>
          <span className={`transform transition-transform duration-200 ${isWithinBookExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Within-Book Navigation Dropdown */}
        {isWithinBookExpanded && (
          <div className="
            absolute top-full left-0 mt-2 w-80 z-50
            bg-white dark:bg-gray-800 
            border border-gray-200 dark:border-gray-700
            rounded-xl shadow-xl dark:shadow-2xl
            animate-in slide-in-from-top-2 duration-200
            max-h-[70vh] flex flex-col
          ">
            <div className="p-4 overflow-y-auto">
              {!bookData ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <div className="text-2xl mb-2">📖</div>
                  <div className="text-sm">Select a book first</div>
                </div>
              ) : bookData.isLoading ? (
                <div className="text-center py-8">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    ⏳ {bookData.bookCode.toUpperCase()}
                  </div>
                </div>
              ) : bookData.error ? (
                <div className="text-center py-8">
                  <div className="text-sm text-red-600 dark:text-red-400 mb-2">❌</div>
                  <button
                    onClick={() => loadBookData(bookData.bookCode)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    🔄
                  </button>
                </div>
              ) : (
                <div>
                  {/* Header with current book info */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {bookData.bookCode.toUpperCase()}
                    </div>
                    {bookData.sections && bookData.sections.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        📑 {bookData.sections.length}
                      </div>
                    )}
                  </div>

                  {/* Within-book navigation */}
                  <WithinBookNavigator
                    bookData={{
                      bookCode: bookData.bookCode,
                      sections: bookData.sections,
                      processedScripture: bookData.processedScripture
                    }}
                    currentRange={navigationState.currentRange}
                    onRangeSelect={handleWithinBookNavigation}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompactNavigation;