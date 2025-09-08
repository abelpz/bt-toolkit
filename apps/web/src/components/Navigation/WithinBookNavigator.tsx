/**
 * Within Book Navigator - Iteration 2
 * Navigate within a selected book using sections or BCV
 */

import React, { useState, useEffect } from 'react';
import { RangeReference } from '../../types/navigation';
import type { TranslatorSection, ProcessedScripture } from '../../services/usfm-processor';
import { RangeSelector } from './RangeSelector';

export interface WithinBookNavigatorProps {
  bookData: {
    bookCode: string;
    sections: TranslatorSection[];
    processedScripture: ProcessedScripture;
  };
  currentRange: RangeReference;
  onRangeSelect: (range: RangeReference) => void;
}

type NavigationMode = 'sections' | 'range';

const NAVIGATION_MODE_KEY = 'bt-toolkit-within-book-navigation-mode';

export const WithinBookNavigator: React.FC<WithinBookNavigatorProps> = ({
  bookData,
  currentRange,
  onRangeSelect
}) => {
  // Initialize mode from localStorage or default to 'sections'
  const [mode, setMode] = useState<NavigationMode>(() => {
    try {
      const savedMode = localStorage.getItem(NAVIGATION_MODE_KEY) as NavigationMode;
      return savedMode === 'sections' || savedMode === 'range' ? savedMode : 'sections';
    } catch {
      return 'sections';
    }
  });
  
  const { bookCode, sections, processedScripture } = bookData;

  // Save mode preference to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(NAVIGATION_MODE_KEY, mode);
    } catch (error) {
      console.warn('Failed to save navigation mode preference:', error);
    }
  }, [mode]);

  const handleSectionSelect = (section: TranslatorSection) => {
    // Remember that sections navigation was used
    setMode('sections');
    
    const range: RangeReference = {
      book: bookCode,
      startChapter: section.start.chapter,
      startVerse: section.start.verse,
      endChapter: section.end.chapter,
      endVerse: section.end.verse
    };
    onRangeSelect(range);
  };

  const handleRangeSelect = (range: RangeReference) => {
    // Remember that custom range navigation was used
    setMode('range');
    
    onRangeSelect(range);
  };

  const formatSectionRange = (section: TranslatorSection): string => {
    if (section.start.chapter === section.end.chapter) {
      return `${section.start.chapter}:${section.start.verse}-${section.end.verse}`;
    }
    return `${section.start.chapter}:${section.start.verse}-${section.end.chapter}:${section.end.verse}`;
  };

  const isCurrentSection = (section: TranslatorSection): boolean => {
    return (
      currentRange.startChapter === section.start.chapter &&
      currentRange.startVerse === section.start.verse &&
      currentRange.endChapter === section.end.chapter &&
      currentRange.endVerse === section.end.verse
    );
  };

  const renderSections = () => {
    if (sections.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-2xl mb-2">📑</div>
          <div className="font-medium">∅</div>
        </div>
      );
    }

    return (
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sections.map((section, index) => (
          <button
            key={`${section.start.chapter}-${section.start.verse}`}
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
                  #{index + 1}
                </div>
                <div className={`text-sm mt-1 ${
                  isCurrentSection(section)
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {formatSectionRange(section)}
                </div>
              </div>
            </div>
            
            {isCurrentSection(section) && (
              <div className="mt-2 flex items-center text-xs text-blue-600 dark:text-blue-400">
                <span className="mr-1">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>
    );
  };



  return (
    <div className="within-book-navigator space-y-4">
      {/* Mode Selection */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setMode('sections')}
          className={`
            px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200
            ${mode === 'sections'
              ? 'bg-blue-500 dark:bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }
          `}
        >
          <span role="img" aria-label="Sections">📑</span> {sections.length > 0 && sections.length}
        </button>
        <button
          onClick={() => setMode('range')}
          className={`
            px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200
            ${mode === 'range'
              ? 'bg-blue-500 dark:bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }
          `}
        >
          <span role="img" aria-label="Range">🎯</span>
        </button>
      </div>

      {/* Content based on selected mode */}
      {mode === 'sections' && renderSections()}
      {mode === 'range' && (
        <RangeSelector
          processedScripture={processedScripture}
          currentRange={currentRange}
          onRangeSelect={handleRangeSelect}
        />
      )}
    </div>
  );
};

export default WithinBookNavigator;
