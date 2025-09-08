/**
 * Sections Navigator - Iteration 2
 * Navigate by sections extracted from USFM or default sections
 */

import React, { useState, useEffect } from 'react';
import { RangeReference, SectionReference } from '../../types/navigation';
import { getBookVersification } from '../../data/versification';
import { fetchScripture } from '../../services/door43-api';
import type { TranslatorSection } from '../../services/usfm-processor';

// Section data structure for UI
interface BookSection {
  id: string;
  title: string;
  range: RangeReference;
  description?: string;
}

export interface SectionsNavigatorProps {
  currentRange: RangeReference;
  onRangeSelect: (range: RangeReference) => void;
  availableBooks?: string[];
}

export const SectionsNavigator: React.FC<SectionsNavigatorProps> = ({
  currentRange,
  onRangeSelect,
  availableBooks = ['jon', 'phm']
}) => {
  const [selectedBook, setSelectedBook] = useState<string>(currentRange.book);
  const [sections, setSections] = useState<BookSection[]>([]);
  const [loading, setLoading] = useState(false);

  // Load sections for selected book
  useEffect(() => {
    const loadSections = async () => {
      setLoading(true);
      
      try {
        // Fetch scripture data which includes the translator sections
        const scriptureData = await fetchScripture(selectedBook);
        
        if (scriptureData?.processingResult?.translatorSections) {
          const translatorSections = scriptureData.processingResult.translatorSections;
          
          // Convert TranslatorSection[] to BookSection[] for UI
          const bookSections: BookSection[] = translatorSections.map((section, index) => ({
            id: `${selectedBook}-${section.start.chapter}-${section.start.verse}`,
            title: `Section ${index + 1}`,
            range: {
              book: selectedBook,
              startChapter: section.start.chapter,
              startVerse: section.start.verse,
              endChapter: section.end.chapter,
              endVerse: section.end.verse
            },
            description: `${selectedBook.toUpperCase()} ${section.start.chapter}:${section.start.verse} - ${section.end.chapter}:${section.end.verse}`
          }));
          
          setSections(bookSections);
          console.log(`✅ Loaded ${bookSections.length} sections from USFM processing for ${selectedBook}`);
        } else {
          console.log(`⚠️ No translator sections found for ${selectedBook}`);
          setSections([]);
        }
      } catch (error) {
        console.error(`❌ Failed to load sections for ${selectedBook}:`, error);
        setSections([]);
      }
      
      setLoading(false);
    };

    loadSections();
  }, [selectedBook]);

  const handleBookSelect = (bookCode: string) => {
    setSelectedBook(bookCode);
  };

  const handleSectionSelect = (section: BookSection) => {
    onRangeSelect(section.range);
  };

  const formatSectionRange = (range: RangeReference): string => {
    if (!range.endChapter || (range.startChapter === range.endChapter && !range.endVerse)) {
      return `${range.startChapter}:${range.startVerse}`;
    }
    
    if (range.startChapter === range.endChapter) {
      return `${range.startChapter}:${range.startVerse}-${range.endVerse}`;
    }
    
    return `${range.startChapter}:${range.startVerse}-${range.endChapter}:${range.endVerse}`;
  };

  const isCurrentSection = (section: BookSection): boolean => {
    const range = section.range;
    const current = currentRange;
    
    return (
      range.book === current.book &&
      range.startChapter === current.startChapter &&
      range.startVerse === current.startVerse &&
      range.endChapter === current.endChapter &&
      range.endVerse === current.endVerse
    );
  };

  const getBookDisplayName = (bookCode: string): string => {
    const book = getBookVersification(bookCode);
    return book ? book.name : bookCode.toUpperCase();
  };

  return (
    <div className="sections-navigator space-y-4">
      {/* Book Selection */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Select Book
        </h3>
        <div className="flex flex-wrap gap-2">
          {availableBooks.map((bookCode) => (
            <button
              key={bookCode}
              onClick={() => handleBookSelect(bookCode)}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                ${bookCode === selectedBook
                  ? 'bg-blue-500 dark:bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              {getBookDisplayName(bookCode)}
            </button>
          ))}
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Sections in {getBookDisplayName(selectedBook)}
          </h3>
          {loading && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Loading sections...
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : sections.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionSelect(section)}
                className={`
                  w-full p-3 text-left rounded-lg transition-all duration-200
                  ${isCurrentSection(section)
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400'
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className={`font-medium ${
                      isCurrentSection(section)
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {section.title}
                    </div>
                    {section.description && (
                      <div className={`text-sm mt-1 ${
                        isCurrentSection(section)
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {section.description}
                      </div>
                    )}
                  </div>
                  <div className={`text-xs font-mono ml-3 ${
                    isCurrentSection(section)
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-500'
                  }`}>
                    {formatSectionRange(section.range)}
                  </div>
                </div>
                
                {isCurrentSection(section) && (
                  <div className="mt-2 flex items-center text-xs text-blue-600 dark:text-blue-400">
                    <span className="mr-1">✓</span>
                    Current section
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-2xl mb-2">📑</div>
            <div className="font-medium">No translator sections found</div>
            <div className="text-sm mt-1">
              This book may not have translator section markers (\ts\*) in the USFM
            </div>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        <div className="font-medium mb-1">About Sections</div>
        <div>
          Sections are extracted from USFM translator section markers (\ts\*) during processing. 
          These represent natural content divisions created by the translators.
        </div>
      </div>
    </div>
  );
};

export default SectionsNavigator;
