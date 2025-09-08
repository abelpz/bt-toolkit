/**
 * Search Bar - Iteration 2
 * Quick scripture search with intelligent parsing
 */

import React, { useState, useRef, useEffect } from 'react';
import { ScriptureReference } from './ScriptureNavigator';

export interface SearchResult {
  reference: ScriptureReference;
  displayText: string;
  matchType: 'exact' | 'partial' | 'suggestion';
}

export interface SearchBarProps {
  onReferenceSelect: (reference: ScriptureReference) => void;
  onSearchResults?: (results: SearchResult[]) => void;
  placeholder?: string;
  className?: string;
}

// Book abbreviations and variations
const BOOK_ABBREVIATIONS: Record<string, string[]> = {
  'jon': ['jon', 'jonah', 'jnh'],
  'phm': ['phm', 'philemon', 'phlm', 'pm'],
  'gen': ['gen', 'genesis', 'gn'],
  'exo': ['exo', 'exodus', 'ex'],
  'mat': ['mat', 'matthew', 'mt'],
  'mrk': ['mrk', 'mark', 'mk'],
  'luk': ['luk', 'luke', 'lk'],
  'jhn': ['jhn', 'john', 'jn'],
  'act': ['act', 'acts'],
  'rom': ['rom', 'romans', 'ro'],
  '1co': ['1co', '1cor', '1 cor', '1 corinthians', '1corinthians'],
  '2co': ['2co', '2cor', '2 cor', '2 corinthians', '2corinthians'],
  'gal': ['gal', 'galatians'],
  'eph': ['eph', 'ephesians'],
  'php': ['php', 'philippians', 'phil'],
  'col': ['col', 'colossians'],
  '1th': ['1th', '1thes', '1 thes', '1 thessalonians', '1thessalonians'],
  '2th': ['2th', '2thes', '2 thes', '2 thessalonians', '2thessalonians'],
  '1ti': ['1ti', '1tim', '1 tim', '1 timothy', '1timothy'],
  '2ti': ['2ti', '2tim', '2 tim', '2 timothy', '2timothy'],
  'tit': ['tit', 'titus'],
  'heb': ['heb', 'hebrews'],
  'jas': ['jas', 'james', 'jam'],
  '1pe': ['1pe', '1pet', '1 pet', '1 peter', '1peter'],
  '2pe': ['2pe', '2pet', '2 pet', '2 peter', '2peter'],
  '1jn': ['1jn', '1john', '1 john'],
  '2jn': ['2jn', '2john', '2 john'],
  '3jn': ['3jn', '3john', '3 john'],
  'jud': ['jud', 'jude'],
  'rev': ['rev', 'revelation', 'rv']
};

// Book display names
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

export const SearchBar: React.FC<SearchBarProps> = ({
  onReferenceSelect,
  onSearchResults,
  placeholder = "Search scripture (e.g., 'Jonah 2:1', 'Jon 2', 'Philemon')",
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Parse search term and generate results
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchResults = parseSearchTerm(searchTerm);
    setResults(searchResults);
    setIsOpen(searchResults.length > 0);
    setSelectedIndex(-1);
    onSearchResults?.(searchResults);
  }, [searchTerm, onSearchResults]);

  // Parse search term into possible scripture references
  const parseSearchTerm = (term: string): SearchResult[] => {
    const results: SearchResult[] = [];
    const normalizedTerm = term.toLowerCase().trim();

    // Try to parse as full reference (e.g., "Jonah 2:1", "Jon 2", "1 Cor 13:4")
    const fullReferenceMatch = normalizedTerm.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
    if (fullReferenceMatch) {
      const [, bookPart, chapterStr, verseStr] = fullReferenceMatch;
      const bookCode = findBookCode(bookPart);
      
      if (bookCode) {
        const chapter = parseInt(chapterStr);
        const verse = verseStr ? parseInt(verseStr) : undefined;
        
        const reference: ScriptureReference = {
          book: bookCode,
          chapter,
          verse
        };
        
        const displayText = verse 
          ? `${BOOK_NAMES[bookCode]} ${chapter}:${verse}`
          : `${BOOK_NAMES[bookCode]} ${chapter}`;
          
        results.push({
          reference,
          displayText,
          matchType: 'exact'
        });
      }
    }

    // Try to parse as book only (e.g., "Jonah", "1 Cor")
    const bookCode = findBookCode(normalizedTerm);
    if (bookCode) {
      results.push({
        reference: { book: bookCode, chapter: 1, verse: 1 },
        displayText: `${BOOK_NAMES[bookCode]} 1:1`,
        matchType: 'exact'
      });
    }

    // Add partial matches for book names
    Object.entries(BOOK_NAMES).forEach(([code, name]) => {
      if (name.toLowerCase().includes(normalizedTerm) && !results.some(r => r.reference.book === code)) {
        results.push({
          reference: { book: code, chapter: 1, verse: 1 },
          displayText: `${name} 1:1`,
          matchType: 'partial'
        });
      }
    });

    // Add suggestions based on abbreviations
    Object.entries(BOOK_ABBREVIATIONS).forEach(([code, abbreviations]) => {
      abbreviations.forEach(abbrev => {
        if (abbrev.includes(normalizedTerm) && normalizedTerm.length >= 2 && !results.some(r => r.reference.book === code)) {
          results.push({
            reference: { book: code, chapter: 1, verse: 1 },
            displayText: `${BOOK_NAMES[code]} 1:1`,
            matchType: 'suggestion'
          });
        }
      });
    });

    return results.slice(0, 8); // Limit results
  };

  // Find book code from search term
  const findBookCode = (term: string): string | null => {
    const normalizedTerm = term.toLowerCase().trim();
    
    for (const [code, abbreviations] of Object.entries(BOOK_ABBREVIATIONS)) {
      if (abbreviations.includes(normalizedTerm)) {
        return code;
      }
    }
    
    return null;
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleResultSelect(results[selectedIndex]);
        } else if (results.length > 0) {
          handleResultSelect(results[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle result selection
  const handleResultSelect = (result: SearchResult) => {
    onReferenceSelect(result.reference);
    setSearchTerm(result.displayText);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`search-bar relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => searchTerm && setIsOpen(results.length > 0)}
          placeholder={placeholder}
          className="
            w-full px-4 py-2 pl-10 pr-4 text-sm rounded-lg
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-600
            text-gray-900 dark:text-gray-100
            placeholder-gray-500 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-all duration-200
          "
        />
        
        {/* Search Icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <span className="text-gray-400 dark:text-gray-500 text-sm">🔍</span>
        </div>

        {/* Clear Button */}
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="
              absolute right-3 top-1/2 transform -translate-y-1/2
              text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300
              transition-colors duration-200
            "
          >
            ✕
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={resultsRef}
          className="
            absolute top-full left-0 right-0 mt-1 z-50
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-lg shadow-lg dark:shadow-2xl
            max-h-64 overflow-y-auto
          "
        >
          {results.map((result, index) => (
            <button
              key={`${result.reference.book}-${result.reference.chapter}-${result.reference.verse}-${index}`}
              onClick={() => handleResultSelect(result)}
              className={`
                w-full px-4 py-3 text-left flex items-center justify-between
                transition-colors duration-200
                ${index === selectedIndex
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
                ${index === 0 ? 'rounded-t-lg' : ''}
                ${index === results.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-100 dark:border-gray-700'}
              `}
            >
              <div>
                <div className="font-medium">
                  {result.displayText}
                </div>
                <div className={`text-xs mt-1 ${
                  index === selectedIndex
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {result.matchType === 'exact' ? 'Exact match' :
                   result.matchType === 'partial' ? 'Partial match' :
                   'Suggestion'}
                </div>
              </div>
              
              {result.matchType === 'exact' && (
                <span className="text-blue-500 dark:text-blue-400 text-sm">✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {isOpen && searchTerm && results.length === 0 && (
        <div className="
          absolute top-full left-0 right-0 mt-1 z-50
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-lg shadow-lg dark:shadow-2xl
          px-4 py-3
        ">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="text-2xl mb-2">🔍</div>
            <div className="font-medium">No matches found</div>
            <div className="text-xs mt-1">
              Try searching for a book name, abbreviation, or reference like "Jonah 2:1"
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
