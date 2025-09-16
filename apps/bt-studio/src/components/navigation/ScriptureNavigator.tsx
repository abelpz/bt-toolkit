/**
 * Scripture Navigator for BT Studio
 * 
 * Two separate dropdowns:
 * 1. Book selection dropdown
 * 2. Chapter/Verse navigation dropdown with range selection and sections
 */

import { useState, useEffect } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { Icon } from '../ui/Icon';
import { TranslatorSection } from '../../types/context';
import { 
  PassageSet, 
  PassageSetNode, 
  PassageGroup, 
  PassageLeaf, 
  Passage 
} from '../../types/passage-sets';
import { 
  loadPassageSetFromObject, 
  parsePassageString 
} from '../../utils/passage-sets';
import newGenerationsStorySets from '../../examples/new-generations-story-sets.json';

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
  const [bookModalTab, setBookModalTab] = useState<'books' | 'passages'>('books');
  const [navTab, setNavTab] = useState<'range' | 'sections'>('range');
  const [chapterCount, setChapterCount] = useState<number>(1);
  const [verseCountByChapter, setVerseCountByChapter] = useState<Record<number, number>>({});
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  // Removed unused currentRangeSelection state
  const [passageSet, setPassageSet] = useState<PassageSet | null>(null);
  const [passageSetError, setPassageSetError] = useState<string | null>(null);
  

  const currentBookInfo = getBookInfo(currentReference.book);

  // Load passage set data on component mount
  useEffect(() => {
    try {
      const loadedPassageSet = loadPassageSetFromObject(newGenerationsStorySets);
      setPassageSet(loadedPassageSet);
      setPassageSetError(null);
    } catch (error) {
      console.error('Failed to load passage set:', error);
      setPassageSetError(error instanceof Error ? error.message : 'Failed to load passage set');
      setPassageSet(null);
    }
  }, []);

  // Convert TranslatorSection to Section format
  const convertTranslatorSections = (translatorSections: TranslatorSection[]): Section[] => {
    return translatorSections.map((section, index) => {
      const startRef = `${section.start.chapter}:${section.start.verse}`;
      const endRef = `${section.end.chapter}:${section.end.verse}`;
      
      // Create a descriptive title
      let title = `${index + 1}`;
      if (section.start.chapter === section.end.chapter) {
        if (section.start.verse === section.end.verse) {
          title = `${section.start.chapter}:${section.start.verse}`;
        } else {
          title = `${section.start.chapter}:${section.start.verse}-${section.end.verse}`;
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
        const content = await (window as { loadBookContentWithWorkspace?: (book: string) => Promise<{ chapters: { verses?: unknown[] }[]; translatorSections?: unknown[] }> }).loadBookContentWithWorkspace?.(currentReference.book);
        
        if (content && content.chapters) {
          // Extract chapter count
          const count = content.chapters.length;
          setChapterCount(count);
          
          // Extract verse counts for all chapters from the loaded content
          const verseCounts: Record<number, number> = {};
          content.chapters.forEach((chapter: { verses?: unknown[] }, index: number) => {
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
                title: `${chapter}`,
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
                { title: '1', range: { startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 31 } }
              ]);
            }
          } catch (error) {
            console.warn(`Failed to load sections for ${currentReference.book}:`, error);
            setSections([
              { title: '1', range: { startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 31 } }
            ]);
          }
        }
        
        setIsContentLoaded(true);
      } catch (error) {
        console.warn(`Failed to load book data for ${currentReference.book}:`, error);
        setChapterCount(1);
        setVerseCountByChapter({ 1: 31 });
        setSections([
          { title: '1', range: { startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 31 } }
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

  const handlePassageSelect = (passage: Passage) => {
    try {
      // Convert passage reference to navigation format
      // NavigationContext expects lowercase book codes
      let reference: {
        book: string;
        chapter?: number;
        verse?: number;
        endChapter?: number;
        endVerse?: number;
      } = {
        book: passage.bookCode.toLowerCase()
      };

      if (typeof passage.ref === 'string') {
        // Parse string reference like "1:1-25"
        const parsed = parsePassageString(`${passage.bookCode} ${passage.ref}`);
        if (typeof parsed.ref === 'object') {
          reference = {
            book: parsed.bookCode.toLowerCase(),
            chapter: parsed.ref.startChapter,
            verse: parsed.ref.startVerse,
            endChapter: parsed.ref.endChapter,
            endVerse: parsed.ref.endVerse
          };
        }
      } else {
        // Use RefRange object directly
        reference = {
          book: passage.bookCode.toLowerCase(),
          chapter: passage.ref.startChapter,
          verse: passage.ref.startVerse,
          endChapter: passage.ref.endChapter,
          endVerse: passage.ref.endVerse
        };
      }

      // Fix endChapter when it's undefined but endVerse is defined
      // This ensures proper range filtering in the scripture viewer
      if (reference.endVerse !== undefined && reference.endChapter === undefined) {
        reference.endChapter = reference.chapter;
      }

      navigateToReference(reference);
      setIsBookModalOpen(false);
    } catch (error) {
      console.error('Failed to navigate to passage:', error);
    }
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
          <Icon
            name="book-open"
            size={16}
            className="text-blue-600"
            aria-label="book"
          />
          <span>
            {currentBookInfo?.name || currentReference.book.toUpperCase()}
          </span>
          <span className="text-gray-400">▼</span>
        </button>

        {/* Chapter/Verse Navigation Button */}
        <button
          onClick={handleNavModalToggle}
          disabled={!isContentLoaded}
          className={`
            flex items-center space-x-2 px-4 py-2 h-10
            border font-medium text-sm
            transition-colors duration-200
            ${
              isContentLoaded
                ? 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
                : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <Icon
            name="search"
            size={16}
            className="text-green-600"
            aria-label="target"
          />
          <span>{formatReferenceOnly()}</span>
          {isContentLoaded ? (
            <span className="text-gray-400">▼</span>
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
          title={
            <div className="flex items-center space-x-2 text-gray-400">
              <Icon name="book-open" size={20} />
            </div>
          }
          disableContentScrolling={bookModalTab === 'passages'}
        >
          <div className="space-y-4">
            {/* Book Modal Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setBookModalTab('books')}
                className={`
                  flex-1 px-4 py-3 text-sm font-medium
                  transition-colors duration-200 flex items-center justify-center space-x-2
                  ${
                    bookModalTab === 'books'
                      ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
                title="Books"
              >
                <Icon name="book-open" size={16} />
              </button>
              <button
                onClick={() => setBookModalTab('passages')}
                className={`
                  flex-1 px-4 py-3 text-sm font-medium
                  transition-colors duration-200 flex items-center justify-center space-x-2
                  ${
                    bookModalTab === 'passages'
                      ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
                title="Passage Sets"
              >
                <Icon name="layers" size={16} />
              </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
              {bookModalTab === 'books' && (
                <BookSelector
                  availableBooks={availableBooks}
                  selectedBook={currentReference.book}
                  onBookSelect={handleBookSelect}
                />
              )}

              {bookModalTab === 'passages' && (
                <PassageSetSelector
                  passageSet={passageSet}
                  error={passageSetError}
                  onPassageSelect={handlePassageSelect}
                />
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Chapter/Verse Navigation Modal */}
      {isNavModalOpen && isContentLoaded && (
        <Modal
          isOpen={isNavModalOpen}
          onClose={() => setIsNavModalOpen(false)}
          title={
            <div className="flex items-center space-x-2 text-gray-400">
              <Icon name="search" size={20} />
            </div>
          }
        >
          <div className="space-y-4">
            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setNavTab('range')}
                className={`
                  flex-1 px-4 py-3 text-sm font-medium
                  transition-colors duration-200 flex items-center justify-center space-x-2
                  ${
                    navTab === 'range'
                      ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
                title="Custom Range"
              >
                <Icon name="grid" size={16} />
              </button>
              <button
                onClick={() => setNavTab('sections')}
                className={`
                  flex-1 px-4 py-3 text-sm font-medium
                  transition-colors duration-200 flex items-center justify-center space-x-2
                  ${
                    navTab === 'sections'
                      ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
                title="Sections"
              >
                <Icon name="list" size={16} />
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
                  onSelectionChange={() => {}} // No longer needed
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
      
      <div className="grid grid-cols-2 gap-2 max-h-[calc(90vh-200px)] overflow-y-auto overflow-x-hidden">
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
                <h4 className="text-sm font-bold text-gray-700 bg-gray-100 rounded-md px-2 py-1 inline-block">
                  {chapter}
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
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
            title="Done"
          >
            <Icon name="check" size={16} />
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
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {sections.length === 0 ? (
          <div className="text-sm text-gray-500 p-3">
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Icon name="info" size={24} />
              <span className="text-sm mt-2">No sections available</span>
            </div>
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
  title: string | React.ReactNode;
  children: React.ReactNode;
  disableContentScrolling?: boolean;
}

function Modal({ isOpen, onClose, title, children, disableContentScrolling = false }: ModalProps) {
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
          <div className={`p-4 ${disableContentScrolling ? '' : 'overflow-y-auto max-h-[calc(90vh-80px)]'}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Passage Set Selector Component
interface PassageSetSelectorProps {
  passageSet: PassageSet | null;
  error: string | null;
  onPassageSelect: (passage: Passage) => void;
}

function PassageSetSelector({ passageSet, error, onPassageSelect }: PassageSetSelectorProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const { getBookInfo } = useNavigation();

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // Helper function to check if a node matches the search term
  const nodeMatchesSearch = (node: PassageSetNode): boolean => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    if (node.type === 'group') {
      const group = node as PassageGroup;
      // Check if group label or description matches
      if (group.label.toLowerCase().includes(searchLower) ||
          group.description?.toLowerCase().includes(searchLower)) {
        return true;
      }
      // Check if any child matches
      return group.children.some(child => nodeMatchesSearch(child));
    } else {
      const leaf = node as PassageLeaf;
      // Check if leaf label matches
      if (leaf.label.toLowerCase().includes(searchLower)) {
        return true;
      }
      // Check if any passage matches
      return leaf.passages.some(passage => {
        const bookInfo = getBookInfo(passage.bookCode);
        const bookName = bookInfo?.name || passage.bookCode;
        
        return passage.label?.toLowerCase().includes(searchLower) ||
               passage.metadata?.title?.toLowerCase().includes(searchLower) ||
               passage.bookCode.toLowerCase().includes(searchLower) ||
               bookName.toLowerCase().includes(searchLower);
      });
    }
  };

  const renderPassageSetNode = (node: PassageSetNode, depth = 0): React.ReactNode => {
    // Filter out nodes that don't match the search
    if (!nodeMatchesSearch(node)) {
      return null;
    }

    const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 12)}` : '';
    
    if (node.type === 'group') {
      const group = node as PassageGroup;
      // Auto-expand groups when searching to show matching results
      const isExpanded = searchTerm ? true : expandedGroups.has(group.id);
      
      return (
        <div key={group.id} className={`${indentClass}`}>
          <button
            onClick={() => toggleGroup(group.id)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg transition-colors duration-200"
          >
            <div className="flex items-center space-x-2">
              <Icon 
                name={isExpanded ? "chevron-down" : "chevron-right"} 
                size={16} 
                className="text-gray-400" 
              />
              <div>
                <div className="font-medium text-sm text-gray-900">{group.label}</div>
                {group.description && (
                  <div className="text-xs text-gray-500 mt-1">{group.description}</div>
                )}
                {group.metadata?.totalVerses && (
                  <div className="text-xs text-blue-600 mt-1">
                    {group.metadata.totalVerses} verses
                  </div>
                )}
              </div>
            </div>
            {group.metadata?.difficulty && (
              <div className="flex items-center space-x-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < (group.metadata?.difficulty || 0)
                        ? 'bg-yellow-400' 
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </button>
          
          {isExpanded && (
            <div className="mt-2 space-y-1">
              {group.children.map(child => renderPassageSetNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      const leaf = node as PassageLeaf;
      
      return (
        <div key={leaf.id} className={`${indentClass}`}>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="font-medium text-sm text-gray-800 mb-2">{leaf.label}</div>
            <div className="space-y-2">
              {leaf.passages.map((passage, index) => {
                // Always calculate bookName and bookInfo for use in rendering
                const bookInfo = getBookInfo(passage.bookCode);
                const bookName = bookInfo?.name || passage.bookCode;
                
                // If there's a search term, only show passages that match
                if (searchTerm) {
                  const searchLower = searchTerm.toLowerCase();
                  
                  const passageMatches = passage.label?.toLowerCase().includes(searchLower) ||
                                       passage.metadata?.title?.toLowerCase().includes(searchLower) ||
                                       passage.bookCode.toLowerCase().includes(searchLower) ||
                                       bookName.toLowerCase().includes(searchLower);
                  
                  if (!passageMatches) {
                    return null;
                  }
                }

                const refString = typeof passage.ref === 'string' 
                  ? passage.ref 
                  : `${passage.ref.startChapter}:${passage.ref.startVerse}${
                      passage.ref.endVerse ? `-${passage.ref.endVerse}` : ''
                    }${passage.ref.endChapter && passage.ref.endChapter !== passage.ref.startChapter 
                      ? `-${passage.ref.endChapter}:${passage.ref.endVerse}` : ''}`;

                return (
                  <button
                    key={`${leaf.id}-${index}`}
                    onClick={() => onPassageSelect(passage)}
                    className="w-full text-left p-2 hover:bg-white rounded border border-transparent hover:border-blue-200 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {bookName} {refString}
                          </span>
                          {passage.metadata?.difficulty && (
                            <div className="flex items-center space-x-1">
                              {Array.from({ length: 5 }, (_, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    i < (passage.metadata?.difficulty || 0)
                                      ? 'bg-yellow-400' 
                                      : 'bg-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 mt-1">
                          {passage.metadata?.title || passage.label}
                        </div>
                        {passage.metadata?.theme && (
                          <div className="text-xs text-gray-500 mt-1">
                            Theme: {passage.metadata.theme}
                          </div>
                        )}
                      </div>
                      {passage.metadata?.estimatedTime && (
                        <div className="text-xs text-gray-500 ml-2">
                          ~{passage.metadata.estimatedTime}min
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-red-500">
        <Icon name="alert-circle" size={24} />
        <span className="text-sm mt-2">Failed to load passage sets</span>
        <span className="text-xs mt-1 text-gray-500">{error}</span>
      </div>
    );
  }

  if (!passageSet) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <div className="animate-spin">⟳</div>
        <span className="text-sm mt-2">Loading passage sets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Icon 
          name="search" 
          size={16} 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
        />
        <input
          type="text"
          placeholder="Search passages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Passage Set Info */}
      <div className="bg-blue-50 rounded-lg p-3">
        <div className="font-medium text-sm text-blue-900">{passageSet.name}</div>
        {passageSet.description && (
          <div className="text-xs text-blue-700 mt-1">{passageSet.description}</div>
        )}
            {passageSet.metadata && (
              <div className="flex items-center space-x-4 mt-2 text-xs text-blue-600">
                {passageSet.metadata.passageCount && (
                  <span>{passageSet.metadata.passageCount} passages</span>
                )}
                {passageSet.metadata.totalTime && (
                  <span>~{passageSet.metadata.totalTime}min total</span>
                )}
                {passageSet.metadata.difficulty && (
                  <div className="flex items-center space-x-1">
                    <span>Difficulty:</span>
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < (passageSet.metadata?.difficulty || 0)
                            ? 'bg-blue-400' 
                            : 'bg-blue-200'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
      </div>

      {/* Passage Set Navigation */}
      <div className="max-h-[calc(90vh-300px)] overflow-y-auto space-y-2">
        {passageSet.root.map(node => renderPassageSetNode(node))}
      </div>
    </div>
  );
}

export default ScriptureNavigator;
