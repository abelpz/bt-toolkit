/**
 * Scripture Navigator for BT Studio
 * 
 * Two separate dropdowns:
 * 1. Book selection dropdown
 * 2. Chapter/Verse navigation dropdown with range selection and sections
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { TranslatorSection } from '../../types/context';

interface VerseRange {
  startChapter: number;
  startVerse: number;
  endChapter?: number;
  endVerse?: number;
}

interface Section {
  title: string;
  range: VerseRange;
}

export function ScriptureNavigator() {
  const { 
    currentReference, 
    availableBooks, 
    navigateToBook, 
    navigateToReference,
    getBookInfo,
    getChapterCount,
    getVerseCount,
    getBookSections
  } = useNavigation();

  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);
  const [isNavDropdownOpen, setIsNavDropdownOpen] = useState(false);
  const [navTab, setNavTab] = useState<'range' | 'sections'>('range');
  const [chapterCount, setChapterCount] = useState<number>(1);
  const [verseCountByChapter, setVerseCountByChapter] = useState<Record<number, number>>({});
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [currentRangeSelection, setCurrentRangeSelection] = useState<VerseRange | null>(null);
  
  const bookDropdownRef = useRef<HTMLDivElement>(null);
  const navDropdownRef = useRef<HTMLDivElement>(null);

  const currentBookInfo = getBookInfo(currentReference.book);

  // Convert TranslatorSection to Section format
  const convertTranslatorSections = (translatorSections: TranslatorSection[]): Section[] => {
    return translatorSections.map((section, index) => {
      const startRef = `${section.start.chapter}:${section.start.verse}`;
      const endRef = `${section.end.chapter}:${section.end.verse}`;
      
      // Create a descriptive title
      let title = `Section ${index + 1}`;
      if (section.start.chapter === section.end.chapter) {
        if (section.start.verse === section.end.verse) {
          title = `Chapter ${section.start.chapter}:${section.start.verse}`;
        } else {
          title = `Chapter ${section.start.chapter}:${section.start.verse}-${section.end.verse}`;
        }
      } else {
        title = `${startRef} - ${endRef}`;
      }
      
      return {
        title,
        range: {
          startChapter: section.start.chapter,
          startVerse: section.start.verse,
          endChapter: section.end.chapter,
          endVerse: section.end.verse
        }
      };
    });
  };

  // Load book content data when book changes
  useEffect(() => {
    const loadBookData = async () => {
      setIsContentLoaded(false);
      try {
        // Load content once and extract all information from it
        const content = await (window as any).loadBookContentWithWorkspace?.(currentReference.book);
        
        if (content && content.chapters) {
          // Extract chapter count
          const count = content.chapters.length;
          setChapterCount(count);
          
          // Extract verse counts for all chapters from the loaded content
          const verseCounts: Record<number, number> = {};
          content.chapters.forEach((chapter: any, index: number) => {
            const chapterNumber = index + 1;
            verseCounts[chapterNumber] = chapter.verses?.length || 31;
          });
          setVerseCountByChapter(verseCounts);
          
          // Extract sections from the loaded content
          if (content.translatorSections && content.translatorSections.length > 0) {
            const convertedSections = convertTranslatorSections(content.translatorSections);
            setSections(convertedSections);
          } else {
            // No translator sections found, use chapter-based fallback
            const fallbackSections = [];
            for (let chapter = 1; chapter <= count; chapter++) {
              fallbackSections.push({
                title: `Chapter ${chapter}`,
                range: { 
                  startChapter: chapter, 
                  startVerse: 1, 
                  endChapter: chapter, 
                  endVerse: verseCounts[chapter] || 31 
                }
              });
            }
            setSections(fallbackSections);
          }
        } else {
          // Fallback to individual API calls if direct content loading fails
          console.warn(`Failed to load content directly, falling back to individual calls for ${currentReference.book}`);
          
          const count = await getChapterCount(currentReference.book);
          setChapterCount(count);
          
          // Load verse counts for all chapters
          const verseCounts: Record<number, number> = {};
          for (let chapter = 1; chapter <= Math.min(count, 10); chapter++) { // Limit to 10 chapters to prevent infinite loops
            try {
              const verseCount = await getVerseCount(currentReference.book, chapter);
              verseCounts[chapter] = verseCount;
            } catch (error) {
              console.warn(`Failed to get verse count for ${currentReference.book} ${chapter}:`, error);
              verseCounts[chapter] = 31; // Fallback
            }
          }
          setVerseCountByChapter(verseCounts);
          
          // Load sections
          try {
            const translatorSections = await getBookSections(currentReference.book);
            if (translatorSections.length > 0) {
              const convertedSections = convertTranslatorSections(translatorSections);
              setSections(convertedSections);
            } else {
              setSections([
                { title: 'Chapter 1', range: { startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 31 } }
              ]);
            }
          } catch (error) {
            console.warn(`Failed to load sections for ${currentReference.book}:`, error);
            setSections([
              { title: 'Chapter 1', range: { startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 31 } }
            ]);
          }
        }
        
        setIsContentLoaded(true);
      } catch (error) {
        console.warn(`Failed to load book data for ${currentReference.book}:`, error);
        setChapterCount(1);
        setVerseCountByChapter({ 1: 31 });
        setSections([
          { title: 'Chapter 1', range: { startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 31 } }
        ]);
        setIsContentLoaded(true);
      }
    };

    loadBookData();
  }, [currentReference.book]); // Removed the individual function dependencies

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bookDropdownRef.current && !bookDropdownRef.current.contains(event.target as Node)) {
        setIsBookDropdownOpen(false);
      }
      if (navDropdownRef.current && !navDropdownRef.current.contains(event.target as Node)) {
        setIsNavDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatReferenceOnly = () => {
    const chapter = currentReference.chapter || 1;
    const verse = currentReference.verse;
    
    if (verse) {
      if (currentReference.endChapter && currentReference.endVerse) {
        // If same chapter, show simplified format: 1:1-6 (only if different verses)
        if (currentReference.endChapter === chapter) {
          if (currentReference.endVerse !== verse) {
            return `${chapter}:${verse}-${currentReference.endVerse}`;
          }
          return `${chapter}:${verse}`; // Same verse, no range needed
        }
        // Different chapters, show full format: 1:1-2:5
        return `${chapter}:${verse}-${currentReference.endChapter}:${currentReference.endVerse}`;
      } else if (currentReference.endVerse && currentReference.endVerse !== verse) {
        // Same chapter range: 1:1-6 (only if different verses)
        return `${chapter}:${verse}-${currentReference.endVerse}`;
      }
      return `${chapter}:${verse}`;
    }
    return `${chapter}`;
  };

  const handleBookSelect = (bookCode: string) => {
    navigateToBook(bookCode);
    setIsBookDropdownOpen(false);
  };

  // Close other dropdown when opening one
  const handleBookDropdownToggle = () => {
    if (isNavDropdownOpen) {
      setIsNavDropdownOpen(false);
    }
    setIsBookDropdownOpen(!isBookDropdownOpen);
  };

  const handleNavDropdownToggle = () => {
    if (isBookDropdownOpen) {
      setIsBookDropdownOpen(false);
    }
    setIsNavDropdownOpen(!isNavDropdownOpen);
  };

  const handleRangeSelect = (range: VerseRange) => {
    // Create a new reference that preserves the current book
    const newReference = {
      book: currentReference.book, // Always use the current book from context
      chapter: range.startChapter,
      verse: range.startVerse,
      endChapter: range.endChapter,
      endVerse: range.endVerse
    };
    
    navigateToReference(newReference);
    setIsNavDropdownOpen(false);
  };

  return (
    <div className="scripture-navigator flex items-center space-x-3 relative">
      {/* Book Selection Dropdown */}
      <div className="relative" ref={bookDropdownRef}>
        <button
          onClick={handleBookDropdownToggle}
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
          <span className="text-blue-600 dark:text-blue-400" role="img" aria-label="book">📖</span>
          <span>{currentBookInfo?.name || currentReference.book.toUpperCase()}</span>
          <span className={`transform transition-transform duration-200 ${isBookDropdownOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Book Dropdown Panel */}
        {isBookDropdownOpen && (
          <div className="
            absolute top-full right-0 mt-2 z-50
            bg-white dark:bg-gray-800 
            border border-gray-200 dark:border-gray-700
            rounded-xl shadow-xl dark:shadow-2xl
            overflow-hidden
            w-80 max-w-[calc(100vw-2rem)]
            max-h-[calc(100vh-8rem)]
            sm:right-0 
            max-sm:right-1/2 max-sm:transform max-sm:translate-x-1/2
          ">
            <div className="p-4">
              <BookSelector
                availableBooks={availableBooks}
                selectedBook={currentReference.book}
                onBookSelect={handleBookSelect}
              />
            </div>
          </div>
        )}
      </div>

      {/* Chapter/Verse Navigation Dropdown */}
      <div className="relative" ref={navDropdownRef}>
        <button
          onClick={handleNavDropdownToggle}
          disabled={!isContentLoaded}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg
            border font-medium text-sm
            transition-all duration-200
            shadow-sm hover:shadow-md
            ${isContentLoaded 
              ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-100'
              : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <span className="text-green-600 dark:text-green-400" role="img" aria-label="target">🎯</span>
          <span>{formatReferenceOnly()}</span>
          {isContentLoaded ? (
            <span className={`transform transition-transform duration-200 ${isNavDropdownOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          ) : (
            <span className="animate-spin">⟳</span>
          )}
        </button>

        {/* Chapter/Verse Navigation Panel */}
        {isNavDropdownOpen && isContentLoaded && (
          <div className="
            absolute top-full right-0 mt-2 z-50
            bg-white dark:bg-gray-800 
            border border-gray-200 dark:border-gray-700
            rounded-xl shadow-xl dark:shadow-2xl
            overflow-hidden
            w-96 max-w-[calc(100vw-2rem)]
            max-h-[calc(100vh-8rem)]
            sm:right-0 
            max-sm:right-1/2 max-sm:transform max-sm:translate-x-1/2
          ">
            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setNavTab('range')}
                className={`
                  flex-1 px-4 py-3 text-sm font-medium
                  transition-colors duration-200
                  ${navTab === 'range'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }
                `}
              >
                Custom Range
              </button>
              <button
                onClick={() => setNavTab('sections')}
                className={`
                  flex-1 px-4 py-3 text-sm font-medium
                  transition-colors duration-200
                  ${navTab === 'sections'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }
                `}
              >
                Sections
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-4">
              {navTab === 'range' && (
                <RangeSelector
                  chapterCount={chapterCount}
                  verseCountByChapter={verseCountByChapter}
                  currentReference={currentReference}
                  onRangeSelect={handleRangeSelect}
                  onSelectionChange={setCurrentRangeSelection}
                />
              )}
              
              {navTab === 'sections' && (
                <SectionsNavigator
                  sections={sections}
                  currentReference={currentReference}
                  onRangeSelect={handleRangeSelect}
                />
              )}
            </div>

            {/* Done Button */}
            <div className="flex justify-end p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  // Apply range selection if in range tab and has selection
                  if (navTab === 'range' && currentRangeSelection) {
                    handleRangeSelect(currentRangeSelection);
                  }
                  setIsNavDropdownOpen(false);
                }}
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
    </div>
  );
}

// Book Selector Component
interface BookSelectorProps {
  availableBooks: Array<{ code: string; name: string; testament?: string }>;
  selectedBook: string;
  onBookSelect: (bookCode: string) => void;
}

function BookSelector({ availableBooks, selectedBook, onBookSelect }: BookSelectorProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Available Books ({availableBooks.length})
      </h3>
      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto overflow-x-hidden">
        {availableBooks.map((book) => (
          <button
            key={book.code}
            onClick={() => onBookSelect(book.code)}
            className={`
              p-3 rounded-lg text-left transition-colors duration-200
              ${selectedBook === book.code
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border-2 border-blue-300 dark:border-blue-600'
                : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
              }
            `}
          >
            <div className="font-medium text-sm">{book.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Range Selector Component with verse highlighting
interface RangeSelectorProps {
  chapterCount: number;
  verseCountByChapter: Record<number, number>;
  currentReference: { book: string; chapter?: number; verse?: number; endChapter?: number; endVerse?: number };
  onRangeSelect: (range: VerseRange) => void;
  onSelectionChange: (range: VerseRange | null) => void;
}

function RangeSelector({ chapterCount, verseCountByChapter, currentReference, onRangeSelect, onSelectionChange }: RangeSelectorProps) {
  const [selectedStart, setSelectedStart] = useState<{ chapter: number; verse: number } | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<{ chapter: number; verse: number } | null>(null);
  const [hoveredVerse, setHoveredVerse] = useState<{ chapter: number; verse: number } | null>(null);

  // Initialize selection with current reference when component mounts
  useEffect(() => {
    if (currentReference.chapter && currentReference.verse) {
      const start = {
        chapter: currentReference.chapter,
        verse: currentReference.verse
      };
      
      const end = (currentReference.endChapter && currentReference.endVerse) ? {
        chapter: currentReference.endChapter,
        verse: currentReference.endVerse
      } : null;
      
      setSelectedStart(start);
      setSelectedEnd(end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount to initialize with current reference

  // Notify parent of selection changes
  useEffect(() => {
    if (selectedStart) {
      const range: VerseRange = {
        startChapter: selectedStart.chapter,
        startVerse: selectedStart.verse,
        endChapter: selectedEnd?.chapter,
        endVerse: selectedEnd?.verse
      };
      onSelectionChange(range);
    } else {
      onSelectionChange(null);
    }
  }, [selectedStart, selectedEnd, onSelectionChange]);

  const handleVerseClick = (chapter: number, verse: number) => {
    if (!selectedStart) {
      // First selection
      setSelectedStart({ chapter, verse });
      setSelectedEnd(null);
    } else if (!selectedEnd) {
      // Second selection - determine range
      const start = selectedStart;
      const end = { chapter, verse };
      
      // Ensure start comes before end
      const isEndAfterStart = 
        end.chapter > start.chapter || 
        (end.chapter === start.chapter && end.verse >= start.verse);
      
      if (isEndAfterStart) {
        setSelectedEnd(end);
      } else {
        // Swap if end comes before start
        setSelectedStart(end);
        setSelectedEnd(start);
      }
    } else {
      // Reset and start new selection
      setSelectedStart({ chapter, verse });
      setSelectedEnd(null);
    }
  };

  const isVerseInRange = (chapter: number, verse: number) => {
    if (!selectedStart) return false;
    
    const start = selectedStart;
    const end = selectedEnd || (hoveredVerse && selectedStart ? hoveredVerse : selectedStart);
    
    // Ensure proper ordering
    const actualStart = 
      end.chapter < start.chapter || 
      (end.chapter === start.chapter && end.verse < start.verse) 
        ? end : start;
    const actualEnd = actualStart === start ? end : start;
    
    return (
      (chapter > actualStart.chapter || (chapter === actualStart.chapter && verse >= actualStart.verse)) &&
      (chapter < actualEnd.chapter || (chapter === actualEnd.chapter && verse <= actualEnd.verse))
    );
  };

  // Remove the handleDone function as it's no longer needed

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Range
        </h3>
      </div>
      
      {selectedStart && (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {selectedEnd 
            ? `Selected: ${selectedStart.chapter}:${selectedStart.verse}-${selectedEnd.chapter}:${selectedEnd.verse}`
            : `Start: ${selectedStart.chapter}:${selectedStart.verse} (click another verse to set range)`
          }
        </div>
      )}

      <div className="max-h-64 overflow-y-auto space-y-3">
        {Array.from({ length: chapterCount }, (_, i) => i + 1).map((chapter) => {
          const verseCount = verseCountByChapter[chapter] || 31;
          return (
            <div key={chapter} className="space-y-2">
              <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Chapter {chapter}
              </h4>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: verseCount }, (_, i) => i + 1).map((verse) => {
                  const isSelected = 
                    (selectedStart?.chapter === chapter && selectedStart?.verse === verse) ||
                    (selectedEnd?.chapter === chapter && selectedEnd?.verse === verse);
                  const isInRange = isVerseInRange(chapter, verse);
                  
                  return (
                    <button
                      key={verse}
                      onClick={() => handleVerseClick(chapter, verse)}
                      onMouseEnter={() => selectedStart && !selectedEnd && setHoveredVerse({ chapter, verse })}
                      onMouseLeave={() => setHoveredVerse(null)}
                      className={`
                        p-1 text-xs rounded transition-colors duration-150
                        ${isSelected
                          ? 'bg-blue-600 text-white font-medium'
                          : isInRange
                          ? 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }
                      `}
                    >
                      {verse}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Sections Navigator Component
interface SectionsNavigatorProps {
  sections: Section[];
  currentReference: { book: string; chapter?: number; verse?: number; endChapter?: number; endVerse?: number };
  onRangeSelect: (range: VerseRange) => void;
}

function SectionsNavigator({ sections, currentReference, onRangeSelect }: SectionsNavigatorProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Predefined Sections ({sections.length})
      </h3>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {sections.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 p-3">
            No sections available for this book.
          </div>
        ) : (
          sections.map((section, index) => {
          const isSelected = 
            currentReference.chapter === section.range.startChapter &&
            currentReference.verse === section.range.startVerse &&
            currentReference.endChapter === section.range.endChapter &&
            currentReference.endVerse === section.range.endVerse;
            
          return (
            <button
              key={index}
              onClick={() => onRangeSelect(section.range)}
              className={`
                w-full p-3 rounded-lg text-left transition-colors duration-200
                ${isSelected
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border-2 border-blue-300 dark:border-blue-600'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                }
              `}
            >
              <div className="font-medium text-sm">{section.title}</div>
              <div className="text-xs opacity-75">
                {section.range.startChapter}:{section.range.startVerse}
                {section.range.endChapter && section.range.endVerse && 
                  ` - ${section.range.endChapter}:${section.range.endVerse}`
                }
              </div>
            </button>
          );
        }))}
      </div>
    </div>
  );
}

export default ScriptureNavigator;
