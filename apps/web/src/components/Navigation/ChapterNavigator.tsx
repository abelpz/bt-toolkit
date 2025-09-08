/**
 * Chapter Navigator - Iteration 2
 * Quick chapter jumping with context
 */

import React from 'react';

export interface ChapterNavigatorProps {
  book: string;
  selectedChapter: number;
  onChapterSelect: (chapter: number) => void;
}

// Chapter counts for each book (same as BookSelector)
const CHAPTER_COUNTS: Record<string, number> = {
  // Old Testament
  'gen': 50, 'exo': 40, 'lev': 27, 'num': 36, 'deu': 34,
  'jos': 24, 'jdg': 21, 'rut': 4, '1sa': 31, '2sa': 24,
  '1ki': 22, '2ki': 25, '1ch': 29, '2ch': 36, 'ezr': 10,
  'neh': 13, 'est': 10, 'job': 42, 'psa': 150, 'pro': 31,
  'ecc': 12, 'sng': 8, 'isa': 66, 'jer': 52, 'lam': 5,
  'ezk': 48, 'dan': 12, 'hos': 14, 'jol': 3, 'amo': 9,
  'oba': 1, 'jon': 4, 'mic': 7, 'nam': 3, 'hab': 3,
  'zep': 3, 'hag': 2, 'zec': 14, 'mal': 4,
  
  // New Testament
  'mat': 28, 'mrk': 16, 'luk': 24, 'jhn': 21, 'act': 28,
  'rom': 16, '1co': 16, '2co': 13, 'gal': 6, 'eph': 6,
  'php': 4, 'col': 4, '1th': 5, '2th': 3, '1ti': 6,
  '2ti': 4, 'tit': 3, 'phm': 1, 'heb': 13, 'jas': 5,
  '1pe': 5, '2pe': 3, '1jn': 5, '2jn': 1, '3jn': 1,
  'jud': 1, 'rev': 22
};

export const ChapterNavigator: React.FC<ChapterNavigatorProps> = ({
  book,
  selectedChapter,
  onChapterSelect
}) => {
  const totalChapters = CHAPTER_COUNTS[book] || 1;
  const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1);

  // Group chapters into rows for better layout
  const chapterRows: number[][] = [];
  const chaptersPerRow = Math.min(10, Math.ceil(Math.sqrt(totalChapters)));
  
  for (let i = 0; i < chapters.length; i += chaptersPerRow) {
    chapterRows.push(chapters.slice(i, i + chaptersPerRow));
  }

  const handlePreviousChapter = () => {
    if (selectedChapter > 1) {
      onChapterSelect(selectedChapter - 1);
    }
  };

  const handleNextChapter = () => {
    if (selectedChapter < totalChapters) {
      onChapterSelect(selectedChapter + 1);
    }
  };

  return (
    <div className="chapter-navigator space-y-4">
      {/* Chapter Navigation Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Select Chapter
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {totalChapters} chapters available
          </p>
        </div>
        
        {/* Quick Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePreviousChapter}
            disabled={selectedChapter <= 1}
            className="
              p-2 rounded-lg text-sm font-medium
              bg-gray-100 dark:bg-gray-700
              text-gray-700 dark:text-gray-300
              hover:bg-gray-200 dark:hover:bg-gray-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
            title="Previous Chapter"
          >
            ← Prev
          </button>
          
          <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Chapter {selectedChapter}
            </span>
          </div>
          
          <button
            onClick={handleNextChapter}
            disabled={selectedChapter >= totalChapters}
            className="
              p-2 rounded-lg text-sm font-medium
              bg-gray-100 dark:bg-gray-700
              text-gray-700 dark:text-gray-300
              hover:bg-gray-200 dark:hover:bg-gray-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
            title="Next Chapter"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Chapter Grid */}
      <div className="max-h-64 overflow-y-auto">
        <div className="space-y-2">
          {chapterRows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-2 justify-center">
              {row.map((chapter) => (
                <button
                  key={chapter}
                  onClick={() => onChapterSelect(chapter)}
                  className={`
                    w-10 h-10 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${chapter === selectedChapter
                      ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-md scale-105'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-105'
                    }
                  `}
                >
                  {chapter}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Chapter Range Selector for Large Books */}
      {totalChapters > 20 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Jump to Chapter:
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min={1}
              max={totalChapters}
              value={selectedChapter}
              onChange={(e) => {
                const chapter = parseInt(e.target.value);
                if (chapter >= 1 && chapter <= totalChapters) {
                  onChapterSelect(chapter);
                }
              }}
              className="
                w-20 px-3 py-2 text-sm rounded-lg
                bg-white dark:bg-gray-700
                border border-gray-200 dark:border-gray-600
                text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              of {totalChapters}
            </span>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{Math.round((selectedChapter / totalChapters) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 dark:bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(selectedChapter / totalChapters) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ChapterNavigator;
