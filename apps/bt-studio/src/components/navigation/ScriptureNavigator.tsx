/**
 * Scripture Navigator for BT Studio
 * 
 * Two separate dropdowns:
 * 1. Book selection dropdown
 * 2. Chapter/Verse navigation dropdown with range selection and sections
 */

import { useState, useEffect } from 'react';
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

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isNavModalOpen, setIsNavModalOpen] = useState(false);
  const [navTab, setNavTab] = useState<'range' | 'sections'>('range');
  const [chapterCount, setChapterCount] = useState<number>(1);
  const [verseCountByChapter, setVerseCountByChapter] = useState<Record<number, number>>({});
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [currentRangeSelection, setCurrentRangeSelection] = useState<VerseRange | null>(null);
  

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
    setIsBookModalOpen(false);
  };

  const handleBookModalToggle = () => {
    setIsBookModalOpen(!isBookModalOpen);
  };

  const handleNavModalToggle = () => {
    setIsNavModalOpen(!isNavModalOpen);
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
    setIsNavModalOpen(false);
  };

  return (
    <>
      <div className="scripture-navigator flex items-center space-x-3 relative">
        {/* Book Selection Button */}
        <button
          onClick={handleBookModalToggle}
          className="
            flex items-center space-x-2 px-4 py-2 h-10
            bg-white 
            border border-gray-200
            hover:bg-gray-50
            text-gray-900
            font-medium text-sm
            transition-colors duration-200
          "
        >
          <span className="text-blue-600" role="img" aria-label="book">📖</span>
          <span>{currentBookInfo?.name || currentReference.book.toUpperCase()}</span>
          <span className="text-gray-400">
            ▼
          </span>
        </button>

        {/* Chapter/Verse Navigation Button */}
        <button
          onClick={handleNavModalToggle}
          disabled={!isContentLoaded}
          className={`
            flex items-center space-x-2 px-4 py-2 h-10
            border font-medium text-sm
            transition-colors duration-200
            ${isContentLoaded 
              ? 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
              : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <span className="text-green-600" role="img" aria-label="target">🎯</span>
          <span>{formatReferenceOnly()}</span>
          {isContentLoaded ? (
            <span className="text-gray-400">
              ▼
            </span>
          ) : (
            <span className="animate-spin">⟳</span>
          )}
        </button>
      </div>

      {/* Book Selection Modal */}
      {isBookModalOpen && (
        <Modal
          isOpen={isBookModalOpen}
          onClose={() => setIsBookModalOpen(false)}
          title="Select Book"
        >
          <BookSelector
            availableBooks={availableBooks}
            selectedBook={currentReference.book}
            onBookSelect={handleBookSelect}
          />
        </Modal>
      )}

      {/* Chapter/Verse Navigation Modal */}
      {isNavModalOpen && isContentLoaded && (
        <Modal
          isOpen={isNavModalOpen}
          onClose={() => setIsNavModalOpen(false)}
          title="Navigate to Reference"
        >
          <div className="space-y-4">
            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setNavTab('range')}
                className={`
                  flex-1 px-4 py-3 text-sm font-medium
                  transition-colors duration-200
                  ${navTab === 'range'
                    ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
                    ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                Sections
              </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
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
          </div>
        </Modal>
      )}
    </>
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
      <h3 className="text-sm font-medium text-gray-700 mb-3">
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
                ? 'bg-blue-100 text-blue-900 border-2 border-blue-300'
                : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
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

      

      <div className="max-h-64 overflow-y-auto space-y-3">
        {Array.from({ length: chapterCount }, (_, i) => i + 1).map((chapter) => {
          const verseCount = verseCountByChapter[chapter] || 31;
          return (
            <div key={chapter} className="space-y-2">
              <h4 className="text-xs font-medium text-gray-600">
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
                          ? 'bg-blue-200 text-blue-900'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
      
      {/* Done Button */}
      {selectedStart && (
        <div className="flex justify-end pt-3 border-t border-gray-200">
          <button
            onClick={() => {
              const range: VerseRange = {
                startChapter: selectedStart.chapter,
                startVerse: selectedStart.verse,
                endChapter: selectedEnd?.chapter || selectedStart.chapter,
                endVerse: selectedEnd?.verse || selectedStart.verse
              };
              onRangeSelect(range);
            }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
          >
            Done
          </button>
        </div>
      )}
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
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Predefined Sections ({sections.length})
      </h3>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {sections.length === 0 ? (
          <div className="text-sm text-gray-500 p-3">
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
                  ? 'bg-blue-100 text-blue-900 border-2 border-blue-300'
                  : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
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

// Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScriptureNavigator;
