/**
 * Breadcrumbs - Iteration 2
 * Navigation breadcrumbs with history tracking
 */

import React from 'react';
import { ScriptureReference } from './ScriptureNavigator';

export interface BreadcrumbsProps {
  currentReference: ScriptureReference;
  navigationHistory?: ScriptureReference[];
  onReferenceClick: (reference: ScriptureReference) => void;
  onHistoryClick?: (reference: ScriptureReference) => void;
  showHistory?: boolean;
  className?: string;
}

// Book display names (same as ScriptureNavigator)
const BOOK_NAMES: Record<string, string> = {
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

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  currentReference,
  navigationHistory = [],
  onReferenceClick,
  onHistoryClick,
  showHistory = false,
  className = ''
}) => {
  const bookName = BOOK_NAMES[currentReference.book] || currentReference.book.toUpperCase();

  const handleBookClick = () => {
    onReferenceClick({
      book: currentReference.book,
      chapter: 1,
      verse: 1
    });
  };

  const handleChapterClick = () => {
    onReferenceClick({
      book: currentReference.book,
      chapter: currentReference.chapter,
      verse: 1
    });
  };

  // Filter and limit history to avoid clutter
  const recentHistory = navigationHistory
    .filter(ref => 
      ref.book !== currentReference.book || 
      ref.chapter !== currentReference.chapter || 
      ref.verse !== currentReference.verse
    )
    .slice(-5); // Show last 5 different references

  return (
    <div className={`breadcrumbs ${className}`}>
      {/* Main Breadcrumb Navigation */}
      <nav className="flex items-center space-x-1 text-sm">
        {/* Home/Root */}
        <button
          onClick={() => onReferenceClick({ book: 'jon', chapter: 1, verse: 1 })}
          className="
            text-gray-500 dark:text-gray-400 
            hover:text-gray-700 dark:hover:text-gray-200
            transition-colors duration-200
          "
          title="Go to Jonah 1:1"
        >
          <span role="img" aria-label="Home">🏠</span>
        </button>

        <span className="text-gray-400 dark:text-gray-600">›</span>

        {/* Book */}
        <button
          onClick={handleBookClick}
          className="
            text-blue-600 dark:text-blue-400 
            hover:text-blue-800 dark:hover:text-blue-200
            font-medium transition-colors duration-200
          "
          title={`Go to ${bookName} 1:1`}
        >
          {bookName}
        </button>

        <span className="text-gray-400 dark:text-gray-600">›</span>

        {/* Chapter */}
        <button
          onClick={handleChapterClick}
          className="
            text-blue-600 dark:text-blue-400 
            hover:text-blue-800 dark:hover:text-blue-200
            font-medium transition-colors duration-200
          "
          title={`Go to ${bookName} ${currentReference.chapter}:1`}
        >
          Chapter {currentReference.chapter}
        </button>

        {/* Verse (if specified) */}
        {currentReference.verse && (
          <>
            <span className="text-gray-400 dark:text-gray-600">›</span>
            <span className="text-gray-900 dark:text-gray-100 font-semibold">
              Verse {currentReference.verse}
            </span>
          </>
        )}
      </nav>

      {/* Navigation History */}
      {showHistory && recentHistory.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Recent:
            </span>
            <div className="flex items-center space-x-2 overflow-x-auto">
              {recentHistory.map((ref, index) => {
                const historyBookName = BOOK_NAMES[ref.book] || ref.book.toUpperCase();
                const referenceText = ref.verse 
                  ? `${historyBookName} ${ref.chapter}:${ref.verse}`
                  : `${historyBookName} ${ref.chapter}`;

                return (
                  <button
                    key={`${ref.book}-${ref.chapter}-${ref.verse}-${index}`}
                    onClick={() => onHistoryClick?.(ref)}
                    className="
                      px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap
                      bg-gray-100 dark:bg-gray-700
                      text-gray-600 dark:text-gray-400
                      hover:bg-gray-200 dark:hover:bg-gray-600
                      hover:text-gray-900 dark:hover:text-gray-100
                      transition-colors duration-200
                    "
                    title={`Go to ${referenceText}`}
                  >
                    {referenceText}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-2 flex items-center space-x-2">
        {/* Copy Reference */}
        <button
          onClick={() => {
            const referenceText = currentReference.verse 
              ? `${bookName} ${currentReference.chapter}:${currentReference.verse}`
              : `${bookName} ${currentReference.chapter}`;
            navigator.clipboard.writeText(referenceText);
          }}
          className="
            text-xs text-gray-500 dark:text-gray-400
            hover:text-gray-700 dark:hover:text-gray-200
            transition-colors duration-200
          "
          title="Copy reference to clipboard"
        >
          📋 Copy
        </button>

        {/* Share Link */}
        <button
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.set('book', currentReference.book);
            url.searchParams.set('chapter', currentReference.chapter.toString());
            if (currentReference.verse) {
              url.searchParams.set('verse', currentReference.verse.toString());
            }
            navigator.clipboard.writeText(url.toString());
          }}
          className="
            text-xs text-gray-500 dark:text-gray-400
            hover:text-gray-700 dark:hover:text-gray-200
            transition-colors duration-200
          "
          title="Copy shareable link"
        >
          🔗 Share
        </button>

        {/* Bookmark */}
        <button
          onClick={() => {
            // In a real implementation, this would save to user preferences
            console.log('Bookmarked:', currentReference);
          }}
          className="
            text-xs text-gray-500 dark:text-gray-400
            hover:text-gray-700 dark:hover:text-gray-200
            transition-colors duration-200
          "
          title="Bookmark this reference"
        >
          ⭐ Bookmark
        </button>
      </div>
    </div>
  );
};

export default Breadcrumbs;
