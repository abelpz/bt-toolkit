/**
 * Navigation Flow - Iteration 2
 * Two-panel navigation: Book/passage selection (left) and within-book navigation (right)
 */

import React, { useState, useEffect } from 'react';
import { NavigationMode, RangeReference } from '../../types/navigation';
import { BookSelector } from './BookSelector';
import { WithinBookNavigator } from './WithinBookNavigator';
import { PassageSetsNavigator } from './PassageSetsNavigator';
import { fetchScripture } from '../../services/door43-api';
import type { TranslatorSection, ProcessedScripture } from '../../services/usfm-processor';

export interface NavigationFlowProps {
  currentRange: RangeReference;
  onRangeSelect: (range: RangeReference) => void;
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

export const NavigationFlow: React.FC<NavigationFlowProps> = ({
  currentRange,
  onRangeSelect,
  availableBooks = ['jon', 'phm'],
  className = ''
}) => {
  const [selectedMode, setSelectedMode] = useState<'book' | 'passage-set'>('book');
  const [bookData, setBookData] = useState<BookData | null>(null);

  // Note: We don't automatically load book data on mount to avoid unexpected UI changes
  // Book data is only loaded when user explicitly selects a book

  const loadBookData = async (bookCode: string) => {
    setBookData({
      bookCode,
      sections: [],
      processedScripture: {} as ProcessedScripture,
      isLoading: true
    });

    try {
      console.log(`🔍 Loading book data for ${bookCode}...`);
      
      // Load scripture data to get sections and processed scripture
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
      
      console.log(`✅ Loaded ${sections.length} sections and ${processedScripture.chapters.length} chapters for ${bookCode}`);
      
    } catch (error) {
      console.error(`❌ Failed to load book data for ${bookCode}:`, error);
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
  };

  const handlePassageSelect = async (range: RangeReference) => {
    // When selecting from passage sets, load the book data and navigate
    if (range.book !== bookData?.bookCode) {
      await loadBookData(range.book);
    }
    onRangeSelect(range);
  };

  const handleWithinBookNavigation = (range: RangeReference) => {
    onRangeSelect(range);
  };

  // Load book data when current range changes to a different book
  useEffect(() => {
    if (currentRange.book && currentRange.book !== bookData?.bookCode) {
      loadBookData(currentRange.book);
    }
  }, [currentRange.book]);

  return (
    <div className={`navigation-flow grid grid-cols-2 gap-4 h-full ${className}`}>
      {/* Left Panel: Book/Passage Selection */}
      <div className="border-r border-gray-200 dark:border-gray-700 pr-4">
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
            currentBook={currentRange.book}
          />
        ) : (
          <PassageSetsNavigator
            currentRange={currentRange}
            onRangeSelect={handlePassageSelect}
          />
        )}
      </div>

      {/* Right Panel: Within-Book Navigation */}
      <div className="pl-4">
        {!bookData ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-2xl mb-2">📖</div>
            <div className="text-sm">Select a book to navigate</div>
          </div>
        ) : bookData.isLoading ? (
          <div className="text-center py-8">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ⏳ {bookData.bookCode.toUpperCase()}
            </div>
          </div>
        ) : bookData.error ? (
          <div className="text-center py-8">
            <div className="text-sm text-red-600 dark:text-red-400 mb-2">
              ❌
            </div>
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
              currentRange={currentRange}
              onRangeSelect={handleWithinBookNavigation}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationFlow;
