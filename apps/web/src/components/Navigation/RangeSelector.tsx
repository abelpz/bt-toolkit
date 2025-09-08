/**
 * Range Selector - Iteration 2
 * Unified grid for selecting verse ranges across chapters
 * Click start verse, click end verse, see highlighted range, confirm with Go button
 */

import React, { useState, useMemo, useEffect } from 'react';
import { RangeReference } from '../../types/navigation';
import type { ProcessedScripture } from '../../services/usfm-processor';

export interface RangeSelectorProps {
  processedScripture: ProcessedScripture;
  currentRange: RangeReference;
  onRangeSelect: (range: RangeReference) => void;
}

interface VersePosition {
  chapter: number;
  verse: number;
  position: number; // Global position for easy range calculation
}

export const RangeSelector: React.FC<RangeSelectorProps> = ({
  processedScripture,
  currentRange,
  onRangeSelect
}) => {
  const [startPosition, setStartPosition] = useState<VersePosition | null>(null);
  const [endPosition, setEndPosition] = useState<VersePosition | null>(null);

  // Create a flat list of all verses with their positions
  const allVerses = useMemo(() => {
    const verses: VersePosition[] = [];
    let globalPosition = 0;

    processedScripture.chapters.forEach((chapter) => {
      chapter.verses.forEach((verse) => {
        verses.push({
          chapter: chapter.number,
          verse: verse.number,
          position: globalPosition++
        });
      });
    });

    return verses;
  }, [processedScripture]);

  // Initialize selection based on current range
  useEffect(() => {
    if (currentRange && allVerses.length > 0) {
      // Find the start verse position
      const startVerse = allVerses.find(v => 
        v.chapter === currentRange.startChapter && v.verse === currentRange.startVerse
      );
      
      if (startVerse) {
        setStartPosition(startVerse);
        
        // If there's an end range, find the end verse position
        if (currentRange.endChapter && currentRange.endVerse) {
          const endVerse = allVerses.find(v => 
            v.chapter === currentRange.endChapter && v.verse === currentRange.endVerse
          );
          
          if (endVerse) {
            setEndPosition(endVerse);
          } else {
            // If end verse not found, treat as single verse selection
            setEndPosition(startVerse);
          }
        } else {
          // Single verse selection
          setEndPosition(startVerse);
        }
      }
    }
  }, [currentRange, allVerses]);

  // Group verses by chapter for display
  const versesByChapter = useMemo(() => {
    const grouped: Record<number, VersePosition[]> = {};
    
    allVerses.forEach((verse) => {
      if (!grouped[verse.chapter]) {
        grouped[verse.chapter] = [];
      }
      grouped[verse.chapter].push(verse);
    });

    return grouped;
  }, [allVerses]);

  const handleVerseClick = (verse: VersePosition) => {
    if (!startPosition) {
      // First click - set start position
      setStartPosition(verse);
      setEndPosition(null);
    } else if (!endPosition) {
      // Second click - set end position
      if (verse.position >= startPosition.position) {
        setEndPosition(verse);
      } else {
        // If clicked verse is before start, make it the new start
        setEndPosition(startPosition);
        setStartPosition(verse);
      }
    } else {
      // Third click - check if clicking within range to deselect
      const minPos = Math.min(startPosition.position, endPosition.position);
      const maxPos = Math.max(startPosition.position, endPosition.position);
      
      if (verse.position >= minPos && verse.position <= maxPos) {
        // Clicking within range - deselect
        setStartPosition(null);
        setEndPosition(null);
      } else {
        // Clicking outside range - start new selection
        setStartPosition(verse);
        setEndPosition(null);
      }
    }
  };

  const getVerseState = (verse: VersePosition) => {
    if (!startPosition) return 'normal';
    
    if (!endPosition) {
      return verse.position === startPosition.position ? 'start' : 'normal';
    }

    const minPos = Math.min(startPosition.position, endPosition.position);
    const maxPos = Math.max(startPosition.position, endPosition.position);

    if (verse.position === minPos && verse.position === maxPos) {
      return 'single'; // Same verse selected as start and end
    } else if (verse.position === minPos) {
      return 'start';
    } else if (verse.position === maxPos) {
      return 'end';
    } else if (verse.position > minPos && verse.position < maxPos) {
      return 'middle';
    }
    
    return 'normal';
  };

  const getVerseClassName = (state: string) => {
    const baseClasses = "w-8 h-8 rounded text-xs font-medium transition-all duration-200 cursor-pointer";
    
    switch (state) {
      case 'start':
        return `${baseClasses} bg-blue-500 dark:bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-400`;
      case 'end':
        return `${baseClasses} bg-blue-500 dark:bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-400`;
      case 'middle':
        return `${baseClasses} bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100`;
      case 'single':
        return `${baseClasses} bg-blue-500 dark:bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-400`;
      default:
        return `${baseClasses} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600`;
    }
  };

  const handleGoToRange = () => {
    if (!startPosition || !endPosition) return;

    const minPos = startPosition.position <= endPosition.position ? startPosition : endPosition;
    const maxPos = startPosition.position <= endPosition.position ? endPosition : startPosition;

    const range: RangeReference = {
      book: processedScripture.bookCode,
      startChapter: minPos.chapter,
      startVerse: minPos.verse,
      endChapter: maxPos.chapter,
      endVerse: maxPos.verse
    };

    onRangeSelect(range);
    
    // Reset selection after navigation
    setStartPosition(null);
    setEndPosition(null);
  };

  const getSelectionSummary = () => {
    if (!startPosition) return "🎯";
    if (!endPosition) return `${startPosition.chapter}:${startPosition.verse} → ?`;
    
    const minPos = startPosition.position <= endPosition.position ? startPosition : endPosition;
    const maxPos = startPosition.position <= endPosition.position ? endPosition : startPosition;
    
    const verseCount = maxPos.position - minPos.position + 1;
    
    if (minPos.chapter === maxPos.chapter) {
      return `${minPos.chapter}:${minPos.verse}-${maxPos.verse} (${verseCount})`;
    } else {
      return `${minPos.chapter}:${minPos.verse}-${maxPos.chapter}:${maxPos.verse} (${verseCount})`;
    }
  };

  return (
    <div className="range-selector space-y-3">
      {/* Selection Status & Action */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {getSelectionSummary()}
        </div>
        
        {startPosition && endPosition && (
          <button
            onClick={handleGoToRange}
            className="
              px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg
              hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200
              text-sm font-medium flex items-center space-x-2
            "
          >
            <span>→</span>
          </button>
        )}
      </div>

      {/* Verse Grid by Chapter */}
      <div className="space-y-4">
        {Object.entries(versesByChapter).map(([chapterNum, verses]) => (
          <div key={chapterNum} className="space-y-2">
            {/* Chapter Header */}
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {chapterNum}
              </h4>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                ({verses.length})
              </div>
            </div>
            
            {/* Verses Grid */}
            <div className="grid grid-cols-12 gap-1">
              {verses.map((verse) => {
                const state = getVerseState(verse);
                return (
                  <button
                    key={`${verse.chapter}-${verse.verse}`}
                    onClick={() => handleVerseClick(verse)}
                    className={getVerseClassName(state)}
                    title={`${verse.chapter}:${verse.verse}`}
                  >
                    {verse.verse}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {(startPosition || endPosition) && (
        <div className="flex justify-center pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setStartPosition(null);
              setEndPosition(null);
            }}
            className="
              text-xs text-gray-600 dark:text-gray-400
              hover:text-gray-900 dark:hover:text-gray-100
              transition-colors duration-200
            "
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default RangeSelector;
