/**
 * USFM Renderer Component
 * Renders processed USFM data with paragraph-based structure
 * Supports verse ranges, cross-chapter rendering, and alignment display
 */

import React from 'react';
import type { ProcessedScripture, ProcessedVerse, WordAlignment } from '../services/usfm-processor';

export interface USFMRendererProps {
  scripture: ProcessedScripture;
  /** Optional: render only specific chapter */
  chapter?: number;
  /** Optional: render specific verse range (e.g., "1-5" or "3") */
  verseRange?: string;
  /** Optional: render from start reference to end reference (can cross chapters) */
  startRef?: { chapter: number; verse: number };
  endRef?: { chapter: number; verse: number };
  /** Show verse numbers */
  showVerseNumbers?: boolean;
  /** Show chapter headers */
  showChapterNumbers?: boolean;
  /** Show paragraph structure */
  showParagraphs?: boolean;
  /** Show alignment data */
  showAlignments?: boolean;
  /** Highlight specific words */
  highlightWords?: string[];
  /** Callback when word is clicked */
  onWordClick?: (word: string, verse: ProcessedVerse, alignment?: WordAlignment) => void;
  /** Custom styling */
  className?: string;
}

export const USFMRenderer: React.FC<USFMRendererProps> = ({
  scripture,
  chapter,
  verseRange,
  startRef,
  endRef,
  showVerseNumbers = true,
  showChapterNumbers = true,
  showParagraphs = true,
  showAlignments = false,
  highlightWords = [],
  onWordClick,
  className = ''
}) => {
  // Determine which verses to render
  const versesToRender = getVersesToRender(scripture, {
    chapter,
    verseRange,
    startRef,
    endRef
  });

  if (versesToRender.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 dark:text-gray-400 ${className}`}>
        <div className="text-lg font-medium">No verses found</div>
        <div className="text-sm">No content matches the specified criteria</div>
      </div>
    );
  }

  // Group verses by paragraphs if showing paragraph structure
  if (showParagraphs) {
    return (
      <div className={`usfm-renderer prose prose-lg max-w-none dark:prose-invert ${className}`}>
        {renderByParagraphs(versesToRender, {
          showVerseNumbers,
          showChapterNumbers,
          showAlignments,
          highlightWords,
          onWordClick
        })}
      </div>
    );
  }

  // Render as simple verse list
  return (
    <div className={`usfm-renderer prose prose-lg max-w-none dark:prose-invert ${className}`}>
      {versesToRender.map((verse) => (
        <VerseRenderer
          key={verse.reference}
          verse={verse}
          showVerseNumbers={showVerseNumbers}
          showAlignments={showAlignments}
          highlightWords={highlightWords}
          onWordClick={onWordClick}
        />
      ))}
    </div>
  );
};

/**
 * Render verses grouped by paragraphs with chapter headers
 */
function renderByParagraphs(
  verses: ProcessedVerse[],
  options: {
    showVerseNumbers: boolean;
    showChapterNumbers: boolean;
    showAlignments: boolean;
    highlightWords: string[];
    onWordClick?: (word: string, verse: ProcessedVerse, alignment?: WordAlignment) => void;
  }
): React.ReactNode {
  // Group verses by chapter first, then by paragraph
  const chapterGroups: { [chapterNum: number]: ProcessedVerse[] } = {};
  
  verses.forEach(verse => {
    const chapterNum = extractChapterFromReference(verse.reference);
    if (!chapterGroups[chapterNum]) {
      chapterGroups[chapterNum] = [];
    }
    chapterGroups[chapterNum].push(verse);
  });

  return (
    <>
      {Object.entries(chapterGroups)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([chapterNumStr, chapterVerses]) => {
          const chapterNum = parseInt(chapterNumStr);
          
          // Group verses by paragraph within this chapter
          const paragraphGroups: { [paragraphId: string]: ProcessedVerse[] } = {};
          const orphanVerses: ProcessedVerse[] = [];

          chapterVerses.forEach(verse => {
            if (verse.paragraphId) {
              if (!paragraphGroups[verse.paragraphId]) {
                paragraphGroups[verse.paragraphId] = [];
              }
              paragraphGroups[verse.paragraphId].push(verse);
            } else {
              orphanVerses.push(verse);
            }
          });

          return (
            <div key={chapterNum} className="chapter-container">
              {/* Chapter Header */}
              {options.showChapterNumbers && (
                <div className="chapter-header mb-8 mt-10 first:mt-0">
                  <h2 className="
                    text-3xl font-bold 
                    text-gray-800 dark:text-gray-200 
                    border-b-2 border-gray-300 dark:border-gray-600 
                    pb-3 mb-6
                    bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400
                  ">
                    {chapterNum}
                  </h2>
                </div>
              )}

              {/* Render paragraph groups for this chapter */}
              {Object.entries(paragraphGroups).map(([paragraphId, paragraphVerses]) => (
                <ParagraphRenderer
                  key={paragraphId}
                  paragraphId={paragraphId}
                  verses={paragraphVerses}
                  showVerseNumbers={options.showVerseNumbers}
                  showAlignments={options.showAlignments}
                  highlightWords={options.highlightWords}
                  onWordClick={options.onWordClick}
                />
              ))}

              {/* Render orphan verses for this chapter */}
              {orphanVerses.map((verse) => (
                <VerseRenderer
                  key={verse.reference}
                  verse={verse}
                  showVerseNumbers={options.showVerseNumbers}
                  showAlignments={options.showAlignments}
                  highlightWords={options.highlightWords}
                  onWordClick={options.onWordClick}
                />
              ))}
            </div>
          );
        })}
    </>
  );
}

/**
 * Paragraph Renderer Component
 */
interface ParagraphRendererProps {
  paragraphId: string;
  verses: ProcessedVerse[];
  showVerseNumbers: boolean;
  showAlignments: boolean;
  highlightWords: string[];
  onWordClick?: (word: string, verse: ProcessedVerse, alignment?: WordAlignment) => void;
}

const ParagraphRenderer: React.FC<ParagraphRendererProps> = ({
  paragraphId,
  verses,
  showVerseNumbers,
  showAlignments,
  highlightWords,
  onWordClick
}) => {
  // Determine paragraph style from ID or first verse
  const isQuote = paragraphId.includes('quote') || verses[0]?.paragraphId?.includes('q');
  const indentLevel = getIndentLevelFromId(paragraphId);

  return (
    <div 
      className={`
        paragraph-container mb-6 leading-relaxed
        ${isQuote ? 'italic text-gray-700 dark:text-gray-300 border-l-4 border-blue-300 dark:border-blue-600 pl-4' : ''}
        ${indentLevel > 0 ? `ml-${indentLevel * 4}` : ''}
        text-gray-900 dark:text-gray-100
      `}
    >
      {verses.map((verse, index) => (
        <span key={verse.reference} className="verse-in-paragraph">
          {showVerseNumbers && (
            <span className="
              verse-number text-xs font-semibold mr-1.5
              text-blue-600 dark:text-blue-400
              bg-blue-50 dark:bg-blue-900/30
              px-1.5 py-0.5 rounded-full
              border border-blue-200 dark:border-blue-700
            ">
              {verse.number}
            </span>
          )}
          <VerseTextRenderer
            verse={verse}
            showAlignments={showAlignments}
            highlightWords={highlightWords}
            onWordClick={onWordClick}
            inline={true}
          />
          {index < verses.length - 1 && ' '}
        </span>
      ))}
    </div>
  );
};

/**
 * Verse Renderer Component
 */
interface VerseRendererProps {
  verse: ProcessedVerse;
  showVerseNumbers: boolean;
  showAlignments: boolean;
  highlightWords: string[];
  onWordClick?: (word: string, verse: ProcessedVerse, alignment?: WordAlignment) => void;
}

const VerseRenderer: React.FC<VerseRendererProps> = ({
  verse,
  showVerseNumbers,
  showAlignments,
  highlightWords,
  onWordClick
}) => {
  return (
    <div className="verse-container mb-4 flex space-x-4">
      {showVerseNumbers && (
        <div className="flex-shrink-0 w-10 text-right">
          <span className="
            inline-flex items-center justify-center w-8 h-8 text-sm font-bold 
            text-blue-600 dark:text-blue-400 
            bg-blue-50 dark:bg-blue-900/30 
            border-2 border-blue-200 dark:border-blue-700
            rounded-full shadow-sm
          ">
            {verse.number}
          </span>
        </div>
      )}
      <div className="flex-1">
        <VerseTextRenderer
          verse={verse}
          showAlignments={showAlignments}
          highlightWords={highlightWords}
          onWordClick={onWordClick}
          inline={false}
        />
        {verse.hasSectionMarker && (
          <div className="
            mt-2 text-xs font-medium
            text-blue-600 dark:text-blue-400
            bg-blue-50 dark:bg-blue-900/20
            border border-blue-200 dark:border-blue-700
            rounded-lg px-3 py-1.5
            flex items-center space-x-2
          ">
            <span>📖</span>
            <span>Section marker ({verse.sectionMarkers} marker{verse.sectionMarkers !== 1 ? 's' : ''})</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Verse Text Renderer with word-level interaction
 */
interface VerseTextRendererProps {
  verse: ProcessedVerse;
  showAlignments: boolean;
  highlightWords: string[];
  onWordClick?: (word: string, verse: ProcessedVerse, alignment?: WordAlignment) => void;
  inline: boolean;
}

const VerseTextRenderer: React.FC<VerseTextRendererProps> = ({
  verse,
  showAlignments,
  highlightWords,
  onWordClick,
  inline
}) => {
  const words = verse.text.split(/(\s+)/);
  
  return (
    <span className={`verse-text ${inline ? 'inline' : 'block'} text-gray-900 dark:text-gray-100 leading-relaxed`}>
      {words.map((word, index) => {
        const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
        const isHighlighted = highlightWords.some(hw => 
          cleanWord.includes(hw.toLowerCase()) || hw.toLowerCase().includes(cleanWord)
        );
        const isWhitespace = /^\s+$/.test(word);
        
        // Find alignment for this word
        const alignment = verse.alignments?.find(a => 
          a.targetWords.some(tw => tw.toLowerCase().includes(cleanWord))
        );

        if (isWhitespace) {
          return <span key={index}>{word}</span>;
        }

        return (
          <span
            key={index}
            className={`
              word transition-colors duration-150
              ${onWordClick ? 'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:rounded px-0.5' : ''}
              ${isHighlighted ? 'bg-yellow-200 dark:bg-yellow-800/50 rounded px-1 font-medium' : ''}
              ${alignment && showAlignments ? 'border-b border-blue-400 dark:border-blue-500 border-dotted' : ''}
            `}
            onClick={() => onWordClick?.(word, verse, alignment)}
            title={alignment && showAlignments ? 
              `Strong: ${alignment.alignmentData[0]?.strong || 'N/A'}\nLemma: ${alignment.alignmentData[0]?.lemma || 'N/A'}` : 
              undefined
            }
          >
            {word}
          </span>
        );
      })}
      
      {showAlignments && verse.alignments && verse.alignments.length > 0 && (
        <div className="
          mt-3 text-xs 
          text-gray-600 dark:text-gray-400 
          bg-gray-50 dark:bg-gray-800/50 
          border border-gray-200 dark:border-gray-700
          p-3 rounded-lg
        ">
          <strong className="text-gray-800 dark:text-gray-200">Alignments ({verse.alignments.length}):</strong>
          {verse.alignments.slice(0, 3).map((alignment, i) => (
            <div key={i} className="ml-2 mt-1">
              • {alignment.targetWords.join(' ')} → {alignment.sourceWords.join(' ')} 
              {alignment.alignmentData[0]?.strong && (
                <span className="text-blue-600 dark:text-blue-400 font-mono">
                  ({alignment.alignmentData[0].strong})
                </span>
              )}
            </div>
          ))}
          {verse.alignments.length > 3 && (
            <div className="ml-2 text-gray-500 dark:text-gray-400 mt-1">
              ... and {verse.alignments.length - 3} more
            </div>
          )}
        </div>
      )}
    </span>
  );
};

/**
 * Utility function to get verses to render based on various criteria
 */
function getVersesToRender(
  scripture: ProcessedScripture,
  options: {
    chapter?: number;
    verseRange?: string;
    startRef?: { chapter: number; verse: number };
    endRef?: { chapter: number; verse: number };
  }
): ProcessedVerse[] {
  const { chapter, verseRange, startRef, endRef } = options;

  // If start and end references are provided (can cross chapters)
  if (startRef && endRef) {
    const verses: ProcessedVerse[] = [];
    
    for (const chapterData of scripture.chapters) {
      if (chapterData.number < startRef.chapter || chapterData.number > endRef.chapter) {
        continue;
      }
      
      for (const verse of chapterData.verses) {
        let isInRange = false;
        
        if (startRef.chapter === endRef.chapter) {
          // Same chapter: check both start and end boundaries
          isInRange = chapterData.number === startRef.chapter && 
                     verse.number >= startRef.verse && 
                     verse.number <= endRef.verse;
        } else {
          // Cross-chapter: use original logic
          isInRange = 
            (chapterData.number === startRef.chapter && verse.number >= startRef.verse) ||
            (chapterData.number > startRef.chapter && chapterData.number < endRef.chapter) ||
            (chapterData.number === endRef.chapter && verse.number <= endRef.verse);
        }
          
        if (isInRange) {
          verses.push(verse);
        }
      }
    }
    
    return verses;
  }

  // Single chapter with optional verse range
  if (chapter) {
    const chapterData = scripture.chapters.find(ch => ch.number === chapter);
    if (!chapterData) return [];

    if (verseRange) {
      if (verseRange.includes('-')) {
        const [start, end] = verseRange.split('-').map(n => parseInt(n.trim()));
        return chapterData.verses.filter(v => v.number >= start && v.number <= end);
      } else {
        const verseNum = parseInt(verseRange.trim());
        return chapterData.verses.filter(v => v.number === verseNum);
      }
    }

    return chapterData.verses;
  }

  // Return all verses
  return scripture.chapters.flatMap(ch => ch.verses);
}

/**
 * Get indent level from paragraph ID
 */
function getIndentLevelFromId(paragraphId: string): number {
  if (paragraphId.includes('q1')) return 1;
  if (paragraphId.includes('q2')) return 2;
  if (paragraphId.includes('q3')) return 3;
  if (paragraphId.includes('q4')) return 4;
  if (paragraphId.includes('q')) return 1;
  return 0;
}

/**
 * Extract chapter number from verse reference (e.g., "JON 2:3" -> 2)
 */
function extractChapterFromReference(reference: string): number {
  const match = reference.match(/\s(\d+):/);
  return match ? parseInt(match[1]) : 1;
}

export default USFMRenderer;
