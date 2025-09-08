/**
 * Scripture Navigator - Iteration 2
 * Comprehensive Book/Chapter/Verse navigation system
 */

import React, { useState } from 'react';
import { BookSelector } from './BookSelector';
import { ChapterNavigator } from './ChapterNavigator';
import { VerseNavigator } from './VerseNavigator';

export interface ScriptureReference {
  book: string;
  chapter: number;
  verse?: number;
}

export interface ScriptureNavigatorProps {
  currentReference: ScriptureReference;
  onReferenceChange: (reference: ScriptureReference) => void;
  availableBooks?: string[];
  className?: string;
}

export const ScriptureNavigator: React.FC<ScriptureNavigatorProps> = ({
  currentReference,
  onReferenceChange,
  availableBooks = ['jon', 'phm'], // Default to test books from Iteration 1
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'book' | 'chapter' | 'verse'>('book');

  const handleBookChange = (book: string) => {
    onReferenceChange({
      book,
      chapter: 1,
      verse: 1
    });
    setActiveTab('chapter');
  };

  const handleChapterChange = (chapter: number) => {
    onReferenceChange({
      ...currentReference,
      chapter,
      verse: 1
    });
    setActiveTab('verse');
  };

  const handleVerseChange = (verse: number) => {
    onReferenceChange({
      ...currentReference,
      verse
    });
  };

  const formatReference = (ref: ScriptureReference) => {
    const bookName = getBookDisplayName(ref.book);
    if (ref.verse) {
      return `${bookName} ${ref.chapter}:${ref.verse}`;
    }
    return `${bookName} ${ref.chapter}`;
  };

  return (
    <div className={`scripture-navigator ${className}`}>
      {/* Compact Reference Display */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="
            flex items-center space-x-2 px-4 py-2 rounded-lg
            bg-white dark:bg-gray-800 
            border border-gray-200 dark:border-gray-700
            hover:border-gray-300 dark:hover:border-gray-600
            text-gray-900 dark:text-gray-100
            font-medium text-sm
            transition-all duration-200
            shadow-sm hover:shadow-md
          "
        >
          <span className="text-blue-600 dark:text-blue-400">📖</span>
          <span>{formatReference(currentReference)}</span>
          <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Quick Navigation Arrows */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleChapterChange(Math.max(1, currentReference.chapter - 1))}
            disabled={currentReference.chapter <= 1}
            className="
              p-2 rounded-md text-gray-500 dark:text-gray-400
              hover:text-gray-700 dark:hover:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
            title="Previous Chapter"
          >
            ◀
          </button>
          <button
            onClick={() => handleChapterChange(currentReference.chapter + 1)}
            className="
              p-2 rounded-md text-gray-500 dark:text-gray-400
              hover:text-gray-700 dark:hover:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-700
              transition-colors duration-200
            "
            title="Next Chapter"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Expanded Navigation Panel */}
      {isExpanded && (
        <div className="
          absolute top-full left-0 right-0 mt-2 z-50
          bg-white dark:bg-gray-800 
          border border-gray-200 dark:border-gray-700
          rounded-xl shadow-xl dark:shadow-2xl
          overflow-hidden
        ">
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {(['book', 'chapter', 'verse'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  flex-1 px-4 py-3 text-sm font-medium capitalize
                  transition-colors duration-200
                  ${activeTab === tab
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Navigation Content */}
          <div className="p-4">
            {activeTab === 'book' && (
              <BookSelector
                availableBooks={availableBooks}
                selectedBook={currentReference.book}
                onBookSelect={handleBookChange}
              />
            )}
            
            {activeTab === 'chapter' && (
              <ChapterNavigator
                book={currentReference.book}
                selectedChapter={currentReference.chapter}
                onChapterSelect={handleChapterChange}
              />
            )}
            
            {activeTab === 'verse' && (
              <VerseNavigator
                book={currentReference.book}
                chapter={currentReference.chapter}
                selectedVerse={currentReference.verse || 1}
                onVerseSelect={handleVerseChange}
              />
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end p-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setIsExpanded(false)}
              className="
                px-4 py-2 text-sm font-medium rounded-lg
                text-gray-600 dark:text-gray-400
                hover:text-gray-900 dark:hover:text-gray-100
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors duration-200
              "
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get display name for books
function getBookDisplayName(bookCode: string): string {
  const bookNames: Record<string, string> = {
    'jon': 'Jonah',
    'phm': 'Philemon',
    'gen': 'Genesis',
    'exo': 'Exodus',
    'mat': 'Matthew',
    'mrk': 'Mark',
    'luk': 'Luke',
    'jhn': 'John',
    'act': 'Acts',
    'rom': 'Romans',
    '1co': '1 Corinthians',
    '2co': '2 Corinthians',
    'gal': 'Galatians',
    'eph': 'Ephesians',
    'php': 'Philippians',
    'col': 'Colossians',
    '1th': '1 Thessalonians',
    '2th': '2 Thessalonians',
    '1ti': '1 Timothy',
    '2ti': '2 Timothy',
    'tit': 'Titus',
    'heb': 'Hebrews',
    'jas': 'James',
    '1pe': '1 Peter',
    '2pe': '2 Peter',
    '1jn': '1 John',
    '2jn': '2 John',
    '3jn': '3 John',
    'jud': 'Jude',
    'rev': 'Revelation'
  };
  
  return bookNames[bookCode] || bookCode.toUpperCase();
}

export default ScriptureNavigator;
