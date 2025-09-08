/**
 * Verse Navigator - Iteration 2
 * Precise verse targeting with context
 */

import React, { useState, useEffect } from 'react';

export interface VerseNavigatorProps {
  book: string;
  chapter: number;
  selectedVerse: number;
  onVerseSelect: (verse: number) => void;
}

// Approximate verse counts per chapter for major books
// In a real implementation, this would come from the USFM data
const VERSE_COUNTS: Record<string, Record<number, number>> = {
  'jon': {
    1: 17, 2: 10, 3: 10, 4: 11
  },
  'phm': {
    1: 25
  },
  'gen': {
    1: 31, 2: 25, 3: 24, 4: 26, 5: 32, 6: 22, 7: 24, 8: 22, 9: 29, 10: 32,
    11: 32, 12: 20, 13: 18, 14: 24, 15: 21, 16: 16, 17: 27, 18: 33, 19: 38, 20: 18
    // ... would continue for all chapters
  },
  'mat': {
    1: 25, 2: 23, 3: 17, 4: 25, 5: 48, 6: 34, 7: 29, 8: 34, 9: 38, 10: 42,
    11: 30, 12: 50, 13: 58, 14: 36, 15: 39, 16: 28, 17: 27, 18: 35, 19: 30, 20: 34
    // ... would continue for all chapters
  }
  // In practice, this would be populated from actual USFM data
};

export const VerseNavigator: React.FC<VerseNavigatorProps> = ({
  book,
  chapter,
  selectedVerse,
  onVerseSelect
}) => {
  const [estimatedVerseCount, setEstimatedVerseCount] = useState(25); // Default estimate
  const [jumpToVerse, setJumpToVerse] = useState(selectedVerse.toString());

  // Get verse count for current chapter
  useEffect(() => {
    const bookVerses = VERSE_COUNTS[book];
    if (bookVerses && bookVerses[chapter]) {
      setEstimatedVerseCount(bookVerses[chapter]);
    } else {
      // Fallback estimates based on book type
      if (book === 'psa') {
        setEstimatedVerseCount(20); // Psalms vary widely
      } else if (book === 'pro') {
        setEstimatedVerseCount(35); // Proverbs chapters are typically longer
      } else if (['1jn', '2jn', '3jn', 'jud', 'phm', 'oba'].includes(book)) {
        setEstimatedVerseCount(15); // Short epistles
      } else {
        setEstimatedVerseCount(25); // General estimate
      }
    }
  }, [book, chapter]);

  const verses = Array.from({ length: estimatedVerseCount }, (_, i) => i + 1);

  // Group verses into rows for better layout
  const verseRows: number[][] = [];
  const versesPerRow = 10;
  
  for (let i = 0; i < verses.length; i += versesPerRow) {
    verseRows.push(verses.slice(i, i + versesPerRow));
  }

  const handlePreviousVerse = () => {
    if (selectedVerse > 1) {
      onVerseSelect(selectedVerse - 1);
    }
  };

  const handleNextVerse = () => {
    if (selectedVerse < estimatedVerseCount) {
      onVerseSelect(selectedVerse + 1);
    }
  };

  const handleJumpToVerse = () => {
    const verse = parseInt(jumpToVerse);
    if (verse >= 1 && verse <= estimatedVerseCount) {
      onVerseSelect(verse);
    }
  };

  return (
    <div className="verse-navigator space-y-4">
      {/* Verse Navigation Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Select Verse
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Chapter {chapter} • ~{estimatedVerseCount} verses
          </p>
        </div>
        
        {/* Quick Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePreviousVerse}
            disabled={selectedVerse <= 1}
            className="
              p-2 rounded-lg text-sm font-medium
              bg-gray-100 dark:bg-gray-700
              text-gray-700 dark:text-gray-300
              hover:bg-gray-200 dark:hover:bg-gray-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
            title="Previous Verse"
          >
            ← Prev
          </button>
          
          <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Verse {selectedVerse}
            </span>
          </div>
          
          <button
            onClick={handleNextVerse}
            disabled={selectedVerse >= estimatedVerseCount}
            className="
              p-2 rounded-lg text-sm font-medium
              bg-gray-100 dark:bg-gray-700
              text-gray-700 dark:text-gray-300
              hover:bg-gray-200 dark:hover:bg-gray-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
            title="Next Verse"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Verse Grid */}
      <div className="max-h-48 overflow-y-auto">
        <div className="space-y-2">
          {verseRows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1 justify-center flex-wrap">
              {row.map((verse) => (
                <button
                  key={verse}
                  onClick={() => onVerseSelect(verse)}
                  className={`
                    w-8 h-8 rounded-md text-xs font-medium
                    transition-all duration-200
                    ${verse === selectedVerse
                      ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-md scale-110'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-105'
                    }
                  `}
                >
                  {verse}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Jump to Verse */}
      <div className="flex items-center space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Jump to:
        </label>
        <input
          type="number"
          min={1}
          max={estimatedVerseCount}
          value={jumpToVerse}
          onChange={(e) => setJumpToVerse(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleJumpToVerse();
            }
          }}
          className="
            w-16 px-2 py-1 text-sm rounded-md
            bg-white dark:bg-gray-700
            border border-gray-200 dark:border-gray-600
            text-gray-900 dark:text-gray-100
            focus:outline-none focus:ring-2 focus:ring-blue-500
          "
        />
        <button
          onClick={handleJumpToVerse}
          className="
            px-3 py-1 text-sm font-medium rounded-md
            bg-blue-500 dark:bg-blue-600 text-white
            hover:bg-blue-600 dark:hover:bg-blue-700
            transition-colors duration-200
          "
        >
          Go
        </button>
      </div>

      {/* Verse Range Selector */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quick Ranges
        </h4>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '1-5', start: 1, end: 5 },
            { label: '6-10', start: 6, end: 10 },
            { label: '11-15', start: 11, end: 15 },
            { label: '16-20', start: 16, end: 20 },
            { label: 'Last 5', start: Math.max(1, estimatedVerseCount - 4), end: estimatedVerseCount }
          ].map((range) => (
            <button
              key={range.label}
              onClick={() => onVerseSelect(range.start)}
              disabled={range.start > estimatedVerseCount}
              className="
                px-2 py-1 text-xs font-medium rounded-md
                bg-white dark:bg-gray-700 
                border border-gray-200 dark:border-gray-600
                text-gray-600 dark:text-gray-400
                hover:bg-gray-50 dark:hover:bg-gray-600
                hover:text-gray-900 dark:hover:text-gray-100
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200
              "
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{Math.round((selectedVerse / estimatedVerseCount) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-blue-500 dark:bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(selectedVerse / estimatedVerseCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Note about verse counts */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        <span role="img" aria-label="Info">ℹ️</span> Verse counts are estimated and may vary by translation
      </div>
    </div>
  );
};

export default VerseNavigator;
