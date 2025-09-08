/**
 * Book Selector - Iteration 2
 * Visual book grid with progress indicators
 */

import React, { useState } from 'react';
import { useDoor43 } from '../../contexts/Door43Context';

export interface BookSelectorProps {
  availableBooks: string[];
  onBookSelect: (book: string) => void;
  currentBook?: string;
}

interface BookInfo {
  code: string;
  name: string;
  testament: 'OT' | 'NT';
  category: 'Law' | 'History' | 'Wisdom' | 'Prophets' | 'Gospels' | 'History' | 'Epistles' | 'Prophecy';
  chapters: number;
}

// Comprehensive book information
const BOOK_INFO: Record<string, BookInfo> = {
  // Old Testament
  'gen': { code: 'gen', name: 'Genesis', testament: 'OT', category: 'Law', chapters: 50 },
  'exo': { code: 'exo', name: 'Exodus', testament: 'OT', category: 'Law', chapters: 40 },
  'lev': { code: 'lev', name: 'Leviticus', testament: 'OT', category: 'Law', chapters: 27 },
  'num': { code: 'num', name: 'Numbers', testament: 'OT', category: 'Law', chapters: 36 },
  'deu': { code: 'deu', name: 'Deuteronomy', testament: 'OT', category: 'Law', chapters: 34 },
  'jos': { code: 'jos', name: 'Joshua', testament: 'OT', category: 'History', chapters: 24 },
  'jdg': { code: 'jdg', name: 'Judges', testament: 'OT', category: 'History', chapters: 21 },
  'rut': { code: 'rut', name: 'Ruth', testament: 'OT', category: 'History', chapters: 4 },
  '1sa': { code: '1sa', name: '1 Samuel', testament: 'OT', category: 'History', chapters: 31 },
  '2sa': { code: '2sa', name: '2 Samuel', testament: 'OT', category: 'History', chapters: 24 },
  '1ki': { code: '1ki', name: '1 Kings', testament: 'OT', category: 'History', chapters: 22 },
  '2ki': { code: '2ki', name: '2 Kings', testament: 'OT', category: 'History', chapters: 25 },
  '1ch': { code: '1ch', name: '1 Chronicles', testament: 'OT', category: 'History', chapters: 29 },
  '2ch': { code: '2ch', name: '2 Chronicles', testament: 'OT', category: 'History', chapters: 36 },
  'ezr': { code: 'ezr', name: 'Ezra', testament: 'OT', category: 'History', chapters: 10 },
  'neh': { code: 'neh', name: 'Nehemiah', testament: 'OT', category: 'History', chapters: 13 },
  'est': { code: 'est', name: 'Esther', testament: 'OT', category: 'History', chapters: 10 },
  'job': { code: 'job', name: 'Job', testament: 'OT', category: 'Wisdom', chapters: 42 },
  'psa': { code: 'psa', name: 'Psalms', testament: 'OT', category: 'Wisdom', chapters: 150 },
  'pro': { code: 'pro', name: 'Proverbs', testament: 'OT', category: 'Wisdom', chapters: 31 },
  'ecc': { code: 'ecc', name: 'Ecclesiastes', testament: 'OT', category: 'Wisdom', chapters: 12 },
  'sng': { code: 'sng', name: 'Song of Songs', testament: 'OT', category: 'Wisdom', chapters: 8 },
  'isa': { code: 'isa', name: 'Isaiah', testament: 'OT', category: 'Prophets', chapters: 66 },
  'jer': { code: 'jer', name: 'Jeremiah', testament: 'OT', category: 'Prophets', chapters: 52 },
  'lam': { code: 'lam', name: 'Lamentations', testament: 'OT', category: 'Prophets', chapters: 5 },
  'ezk': { code: 'ezk', name: 'Ezekiel', testament: 'OT', category: 'Prophets', chapters: 48 },
  'dan': { code: 'dan', name: 'Daniel', testament: 'OT', category: 'Prophets', chapters: 12 },
  'hos': { code: 'hos', name: 'Hosea', testament: 'OT', category: 'Prophets', chapters: 14 },
  'jol': { code: 'jol', name: 'Joel', testament: 'OT', category: 'Prophets', chapters: 3 },
  'amo': { code: 'amo', name: 'Amos', testament: 'OT', category: 'Prophets', chapters: 9 },
  'oba': { code: 'oba', name: 'Obadiah', testament: 'OT', category: 'Prophets', chapters: 1 },
  'jon': { code: 'jon', name: 'Jonah', testament: 'OT', category: 'Prophets', chapters: 4 },
  'mic': { code: 'mic', name: 'Micah', testament: 'OT', category: 'Prophets', chapters: 7 },
  'nam': { code: 'nam', name: 'Nahum', testament: 'OT', category: 'Prophets', chapters: 3 },
  'hab': { code: 'hab', name: 'Habakkuk', testament: 'OT', category: 'Prophets', chapters: 3 },
  'zep': { code: 'zep', name: 'Zephaniah', testament: 'OT', category: 'Prophets', chapters: 3 },
  'hag': { code: 'hag', name: 'Haggai', testament: 'OT', category: 'Prophets', chapters: 2 },
  'zec': { code: 'zec', name: 'Zechariah', testament: 'OT', category: 'Prophets', chapters: 14 },
  'mal': { code: 'mal', name: 'Malachi', testament: 'OT', category: 'Prophets', chapters: 4 },
  
  // New Testament
  'mat': { code: 'mat', name: 'Matthew', testament: 'NT', category: 'Gospels', chapters: 28 },
  'mrk': { code: 'mrk', name: 'Mark', testament: 'NT', category: 'Gospels', chapters: 16 },
  'luk': { code: 'luk', name: 'Luke', testament: 'NT', category: 'Gospels', chapters: 24 },
  'jhn': { code: 'jhn', name: 'John', testament: 'NT', category: 'Gospels', chapters: 21 },
  'act': { code: 'act', name: 'Acts', testament: 'NT', category: 'History', chapters: 28 },
  'rom': { code: 'rom', name: 'Romans', testament: 'NT', category: 'Epistles', chapters: 16 },
  '1co': { code: '1co', name: '1 Corinthians', testament: 'NT', category: 'Epistles', chapters: 16 },
  '2co': { code: '2co', name: '2 Corinthians', testament: 'NT', category: 'Epistles', chapters: 13 },
  'gal': { code: 'gal', name: 'Galatians', testament: 'NT', category: 'Epistles', chapters: 6 },
  'eph': { code: 'eph', name: 'Ephesians', testament: 'NT', category: 'Epistles', chapters: 6 },
  'php': { code: 'php', name: 'Philippians', testament: 'NT', category: 'Epistles', chapters: 4 },
  'col': { code: 'col', name: 'Colossians', testament: 'NT', category: 'Epistles', chapters: 4 },
  '1th': { code: '1th', name: '1 Thessalonians', testament: 'NT', category: 'Epistles', chapters: 5 },
  '2th': { code: '2th', name: '2 Thessalonians', testament: 'NT', category: 'Epistles', chapters: 3 },
  '1ti': { code: '1ti', name: '1 Timothy', testament: 'NT', category: 'Epistles', chapters: 6 },
  '2ti': { code: '2ti', name: '2 Timothy', testament: 'NT', category: 'Epistles', chapters: 4 },
  'tit': { code: 'tit', name: 'Titus', testament: 'NT', category: 'Epistles', chapters: 3 },
  'phm': { code: 'phm', name: 'Philemon', testament: 'NT', category: 'Epistles', chapters: 1 },
  'heb': { code: 'heb', name: 'Hebrews', testament: 'NT', category: 'Epistles', chapters: 13 },
  'jas': { code: 'jas', name: 'James', testament: 'NT', category: 'Epistles', chapters: 5 },
  '1pe': { code: '1pe', name: '1 Peter', testament: 'NT', category: 'Epistles', chapters: 5 },
  '2pe': { code: '2pe', name: '2 Peter', testament: 'NT', category: 'Epistles', chapters: 3 },
  '1jn': { code: '1jn', name: '1 John', testament: 'NT', category: 'Epistles', chapters: 5 },
  '2jn': { code: '2jn', name: '2 John', testament: 'NT', category: 'Epistles', chapters: 1 },
  '3jn': { code: '3jn', name: '3 John', testament: 'NT', category: 'Epistles', chapters: 1 },
  'jud': { code: 'jud', name: 'Jude', testament: 'NT', category: 'Epistles', chapters: 1 },
  'rev': { code: 'rev', name: 'Revelation', testament: 'NT', category: 'Prophecy', chapters: 22 }
};

export const BookSelector: React.FC<BookSelectorProps> = ({
  availableBooks,
  currentBook,
  onBookSelect
}) => {
  const [filter, setFilter] = useState<'all' | 'OT' | 'NT'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Use Door43 context for book information - this should always be available since we wrap the app
  const door43Context = useDoor43();

  // Get book information from Door43 context or fallback to local data
  const getBookInfo = (code: string): BookInfo | undefined => {
    if (door43Context) {
      const door43Book = door43Context.getBookInfo(code);
      if (door43Book) {
        // Convert Door43 BookInfo to local BookInfo format
        const localBook = BOOK_INFO[code];
        return {
          ...localBook,
          ...door43Book,
          // Ensure we have the category from local data
          category: localBook?.category || 'History'
        } as BookInfo;
      }
    }
    return BOOK_INFO[code];
  };

  // Filter books based on availability, testament, and search
  const filteredBooks: BookInfo[] = availableBooks
    .map(code => getBookInfo(code))
    .filter((book): book is BookInfo => book !== undefined) // Remove undefined books with type guard
    .filter(book => filter === 'all' || book.testament === filter)
    .filter(book => 
      searchTerm === '' || 
      book.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Debug logging
  console.log('BookSelector - availableBooks:', availableBooks);
  console.log('BookSelector - filteredBooks:', filteredBooks);
  console.log('BookSelector - door43Context available books:', door43Context?.availableBooks?.filter(b => b.available).map(b => b.code));

  // Group books by testament
  const otBooks = filteredBooks.filter(book => book.testament === 'OT');
  const ntBooks = filteredBooks.filter(book => book.testament === 'NT');

  const renderBookCard = (book: BookInfo) => {
    const isSelected = book.code === currentBook;
    const isAvailable = door43Context 
      ? (book as BookInfo & { available?: boolean }).available !== false // Door43 books have available property
      : availableBooks.includes(book.code); // Local books are available if in the list
    
    return (
      <button
        key={book.code}
        onClick={() => isAvailable && onBookSelect(book.code)}
        disabled={!isAvailable}
        className={`
          p-3 rounded-lg text-left transition-all duration-200
          border-2 min-h-[80px] flex flex-col justify-between
          ${isSelected
            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : isAvailable
              ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
              : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-50 cursor-not-allowed'
          }
          ${isAvailable ? 'hover:shadow-md' : ''}
        `}
      >
        <div>
          <div className={`font-semibold text-sm ${
            isSelected 
              ? 'text-blue-900 dark:text-blue-100' 
              : isAvailable
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-500'
            }`}>
            {book.code.toUpperCase()}
          </div>
          <div className={`text-xs mt-1 ${
            isSelected
              ? 'text-blue-700 dark:text-blue-300'
              : isAvailable
                ? 'text-gray-600 dark:text-gray-400'
                : 'text-gray-400 dark:text-gray-600'
          }`}>
            {book.testament}
          </div>
        </div>
        
        <div className="flex items-center justify-end mt-2">
          {isSelected && (
            <span className="text-blue-500 dark:text-blue-400 text-sm">✓</span>
          )}
          
          {!isAvailable && (
            <span className="text-gray-400 dark:text-gray-600 text-xs">✕</span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="book-selector space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="🔍"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="
            flex-1 px-3 py-2 text-sm rounded-lg
            bg-white dark:bg-gray-700
            border border-gray-200 dark:border-gray-600
            text-gray-900 dark:text-gray-100
            placeholder-gray-500 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500
          "
        />
        
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
          {(['all', 'OT', 'NT'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`
                px-3 py-2 text-xs font-medium transition-colors duration-200
                ${filter === filterOption
                  ? 'bg-blue-500 dark:bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                }
              `}
            >
              {filterOption === 'all' ? '📚' : filterOption}
            </button>
          ))}
        </div>
      </div>

      {/* Books Grid */}
      <div>
        {/* Old Testament */}
        {(filter === 'all' || filter === 'OT') && otBooks.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              OT ({otBooks.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {otBooks.map(renderBookCard)}
            </div>
          </div>
        )}

        {/* New Testament */}
        {(filter === 'all' || filter === 'NT') && ntBooks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              NT ({ntBooks.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ntBooks.map(renderBookCard)}
            </div>
          </div>
        )}

        {/* No Results */}
        {filteredBooks.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-2xl mb-2">
              <span role="img" aria-label="Books">📚</span>
            </div>
            <div className="font-medium">∅</div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
        {filteredBooks.length}/{availableBooks.length}
      </div>
    </div>
  );
};

export default BookSelector;
