import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import type { ProcessedScripture } from '@bt-toolkit/usfm-processor';

// Enhanced interfaces that match qa-app patterns
interface ProcessedVerse {
  number: number;
  text: string;
  reference: string;
  paragraphId?: string;
  hasSectionMarker?: boolean;
  sectionMarkers?: number;
}

interface ProcessedParagraph {
  id: string;
  type: 'paragraph' | 'quote';
  style: 'p' | 'q' | 'q1' | 'q2' | 'm' | 'mi' | 'pc' | 'pr' | 'cls';
  indentLevel: number;
  startVerse: number;
  endVerse: number;
  verseCount: number;
  verseNumbers: number[];
  combinedText: string;
  verses: ProcessedVerse[];
  chapterNumber?: number; // Added for cross-chapter support
}

interface ProcessedChapter {
  number: number;
  verseCount: number;
  paragraphCount: number;
  verses: ProcessedVerse[];
  paragraphs: ProcessedParagraph[];
}

interface ParagraphAwareScriptureRendererProps {
  scripture: ProcessedScripture | null;
  reference?: string; // e.g., "ROM 1:3-5" or chapter reference like "ROM 1"
  showVerseNumbers?: boolean;
  showReference?: boolean;
  highlightVerses?: number[];
  highlightWords?: string[]; // Added for word highlighting like qa-app
  style?: any;
  verseStyle?: any;
  maxHeight?: number;
  onVersePress?: (chapter: number, verse: number) => void;
  onWordPress?: (word: string, verse: number, chapter: number) => void;
  // Enhanced navigation context integration
  currentChapter?: number;
  currentVerse?: number;
  contextualRendering?: boolean; // Enable smart contextual chunk rendering
}

export const ParagraphAwareScriptureRenderer: React.FC<ParagraphAwareScriptureRendererProps> = ({
  scripture,
  reference,
  showVerseNumbers = true,
  showReference = true,
  highlightVerses = [],
  highlightWords = [],
  style,
  verseStyle,
  maxHeight,
  onVersePress,
  onWordPress,
  currentChapter,
  currentVerse,
  contextualRendering = true
}) => {
  if (!scripture) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.noContentText}>
          No scripture data available
        </Text>
      </View>
    );
  }

  // Convert ProcessedScripture to the format expected by the renderer
  const convertToExpectedFormat = (processedScripture: ProcessedScripture): { chapters: ProcessedChapter[] } => {
    return {
      chapters: processedScripture.chapters.map(chapter => ({
        ...chapter,
        paragraphs: (chapter.paragraphs || []).map(paragraph => ({
          ...paragraph,
          chapterNumber: chapter.number // Add chapter context to paragraphs
        }))
      }))
    };
  };

  const convertedScripture = convertToExpectedFormat(scripture);

  // Enhanced contextual reference determination
  const getContextualReference = (): string => {
    // Priority 1: Explicit reference prop
    if (reference) return reference;
    
    // Priority 2: Current navigation context
    if (currentChapter && currentVerse && contextualRendering) {
      const bookCode = scripture?.bookCode || 'BOOK';
      return `${bookCode} ${currentChapter}:${currentVerse}`;
    }
    
    // Priority 3: Current chapter context (show whole chapter)
    if (currentChapter && contextualRendering) {
      const bookCode = scripture?.bookCode || 'BOOK';
      return `${bookCode} ${currentChapter}`;
    }
    
    // Fallback: First chapter
    const bookCode = scripture?.bookCode || 'BOOK';
    return `${bookCode} 1`;
  };

  const effectiveReference = getContextualReference();

  // Parse reference and get relevant paragraphs using effective reference
  const getParagraphsForRange = (): ProcessedParagraph[] => {
    const refToUse = effectiveReference;
    
    if (!refToUse) {
      // Return all paragraphs from first chapter
      const firstChapter = convertedScripture.chapters?.[0];
      return firstChapter?.paragraphs || [];
    }

    // Parse reference to get chapter and verse range
    // Support both same-chapter (ROM 1:17-19) and cross-chapter (ROM 1:17-2:1) references
    const sameChapterMatch = refToUse.match(/^([A-Z]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/i);
    const crossChapterMatch = refToUse.match(/^([A-Z]+)\s+(\d+):(\d+)-(\d+):(\d+)$/i);
    
    if (crossChapterMatch) {
      // Handle cross-chapter references like "ROM 1:17-2:1"
      const startChapter = parseInt(crossChapterMatch[2]);
      const startVerse = parseInt(crossChapterMatch[3]);
      const endChapter = parseInt(crossChapterMatch[4]);
      const endVerse = parseInt(crossChapterMatch[5]);
      
      const allParagraphs: ProcessedParagraph[] = [];
      
      // Collect paragraphs from all chapters in the range
      for (let chapterNum = startChapter; chapterNum <= endChapter; chapterNum++) {
        const chapter = convertedScripture.chapters?.find(ch => ch.number === chapterNum);
        if (chapter?.paragraphs) {
          const filteredParagraphs = chapter.paragraphs.filter(paragraph => {
            if (chapterNum === startChapter && chapterNum === endChapter) {
              // Same chapter (shouldn't happen with cross-chapter match, but just in case)
              return paragraph.startVerse <= endVerse && paragraph.endVerse >= startVerse;
            } else if (chapterNum === startChapter) {
              // First chapter - from startVerse to end of chapter
              return paragraph.endVerse >= startVerse;
            } else if (chapterNum === endChapter) {
              // Last chapter - from beginning to endVerse
              return paragraph.startVerse <= endVerse;
            } else {
              // Middle chapters - include all paragraphs
              return true;
            }
          });
          
          // Mark paragraphs with their chapter context
          const contextualParagraphs = filteredParagraphs.map(p => ({
            ...p,
            chapterNumber: chapterNum
          }));
          
          allParagraphs.push(...contextualParagraphs);
        }
      }
      
      return allParagraphs;
      
    } else if (sameChapterMatch) {
      // Handle same-chapter references like "ROM 1:17-19" or "ROM 1:17"
      const chapter = parseInt(sameChapterMatch[2]);
      const startVerse = sameChapterMatch[3] ? parseInt(sameChapterMatch[3]) : null;
      const endVerse = sameChapterMatch[4] ? parseInt(sameChapterMatch[4]) : startVerse;

      const targetChapter = convertedScripture.chapters?.find(ch => ch.number === chapter);
      if (!targetChapter || !targetChapter.paragraphs) return [];

      if (startVerse === null) {
        // Return all paragraphs in chapter
        return targetChapter.paragraphs;
      }

      // Find paragraphs that intersect with the verse range
      return targetChapter.paragraphs.filter(paragraph => {
        // Check if paragraph overlaps with requested range
        return paragraph.startVerse <= (endVerse || startVerse) && 
               paragraph.endVerse >= startVerse;
      });
    }
    
    return [];
  };

  const relevantParagraphs = getParagraphsForRange();

  if (!relevantParagraphs || relevantParagraphs.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.noContentText}>
          No content found for reference: {effectiveReference}
        </Text>
      </View>
    );
  }

  // Get verse range for filtering using effective reference
  const getVerseRange = (): { 
    start: number; 
    end: number; 
    startChapter?: number; 
    endChapter?: number; 
    isCrossChapter?: boolean;
  } | null => {
    const refToUse = effectiveReference;
    if (!refToUse) return null;
    
    // Check for cross-chapter reference first
    const crossChapterMatch = refToUse.match(/^([A-Z]+)\s+(\d+):(\d+)-(\d+):(\d+)$/i);
    if (crossChapterMatch) {
      const startChapter = parseInt(crossChapterMatch[2]);
      const startVerse = parseInt(crossChapterMatch[3]);
      const endChapter = parseInt(crossChapterMatch[4]);
      const endVerse = parseInt(crossChapterMatch[5]);
      
      return {
        start: startVerse,
        end: endVerse,
        startChapter,
        endChapter,
        isCrossChapter: true
      };
    }
    
    // Handle same-chapter reference
    const sameChapterMatch = refToUse.match(/^([A-Z]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/i);
    if (sameChapterMatch) {
      const startVerse = sameChapterMatch[3] ? parseInt(sameChapterMatch[3]) : null;
      const endVerse = sameChapterMatch[4] ? parseInt(sameChapterMatch[4]) : startVerse;

      return startVerse ? { 
        start: startVerse, 
        end: endVerse || startVerse,
        isCrossChapter: false
      } : null;
    }
    
    return null;
  };

  const renderParagraph = (paragraph: ProcessedParagraph) => {
    if (!paragraph || !paragraph.verses) return null;
    
    const isPoetry = paragraph.type === 'quote';
    const verseRange = getVerseRange();

    // Filter verses within this paragraph to only show those in the requested range
    const versesToShow = paragraph.verses.filter(verse => {
      if (!verseRange) return true; // Show all if no specific range
      
      if (verseRange.isCrossChapter && verseRange.startChapter && verseRange.endChapter) {
        // Handle cross-chapter filtering
        const paragraphChapter = (paragraph as any).chapterNumber || 
          // Fallback: try to determine chapter from verse reference if available
          (verse.reference ? parseInt(verse.reference.match(/(\d+):/)?.[1] || '1') : 1);
        
        if (paragraphChapter === verseRange.startChapter && paragraphChapter === verseRange.endChapter) {
          // Same chapter (edge case)
          return verse.number >= verseRange.start && verse.number <= verseRange.end;
        } else if (paragraphChapter === verseRange.startChapter) {
          // First chapter - from startVerse to end of chapter
          return verse.number >= verseRange.start;
        } else if (paragraphChapter === verseRange.endChapter) {
          // Last chapter - from beginning to endVerse
          return verse.number <= verseRange.end;
        } else if (paragraphChapter > verseRange.startChapter && paragraphChapter < verseRange.endChapter) {
          // Middle chapters - include all verses
          return true;
        } else {
          // Outside the chapter range
          return false;
        }
      } else {
        // Same-chapter filtering
        return verse.number >= verseRange.start && verse.number <= verseRange.end;
      }
    });

    if (versesToShow.length === 0) return null;

    // Calculate proper indentation based on Bible formatting standards
    const getPoetryIndentation = () => {
      if (!isPoetry) return 0;
      
      // Traditional Bible poetry indentation standards:
      // q/q1: base level (no extra indent)
      // q2: secondary level (moderate indent) 
      // q3: tertiary level (deeper indent)
      // q4: quaternary level (deepest indent)
      const baseIndent = 16; // Adjusted for mobile
      return paragraph.indentLevel * baseIndent;
    };

    // Handle word press events
    const handleWordPress = (word: string, verse: ProcessedVerse) => {
      if (onWordPress) {
        const chapterNum = (paragraph as any).chapterNumber || 1;
        onWordPress(word, verse.number, chapterNum);
      }
    };

    // Handle verse press events
    const handleVersePress = (verse: ProcessedVerse) => {
      if (onVersePress) {
        const chapterNum = (paragraph as any).chapterNumber || 1;
        onVersePress(chapterNum, verse.number);
      }
    };

    // Enhanced word rendering with highlighting support (like qa-app)
    const renderVerseText = (verse: ProcessedVerse) => {
      const words = verse.text.split(/(\s+)/);
      return words.map((word, index) => {
        if (/^\s+$/.test(word)) {
          return <Text key={index}>{word}</Text>;
        }
        
        // Check if word should be highlighted
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        const isHighlighted = highlightWords.some(highlightWord => 
          cleanWord.includes(highlightWord.toLowerCase())
        );
        
        return (
          <Pressable
            key={index}
            onPress={() => handleWordPress(word, verse)}
            style={({ pressed }) => [
              styles.wordContainer,
              isHighlighted && styles.highlightedWordContainer,
              pressed && styles.pressedWordContainer
            ]}
          >
            <Text style={[
              styles.word,
              isHighlighted && styles.highlightedWord
            ]}>
              {word}
            </Text>
          </Pressable>
        );
      });
    };

    // For poetry, render verses as separate lines for better readability
    if (isPoetry) {
      return (
        <View
          key={paragraph.id}
          style={[
            styles.paragraphContainer,
            styles.poetryContainer,
            { marginLeft: getPoetryIndentation() }
          ]}
        >
          {versesToShow.map((verse, index) => {
            if (!verse || verse.number === undefined || !verse.text) return null;
            
            const isHighlighted = highlightVerses.includes(verse.number);
            
            return (
              <View key={verse.number} style={styles.poetryLineContainer}>
                <Text 
                  style={[styles.poetryText, verseStyle]}
                  onPress={() => handleVersePress(verse)}
                >
                  {showVerseNumbers && (
                    <Text style={[
                      styles.verseNumber,
                      styles.poetryVerseNumber,
                      isHighlighted && styles.highlightedNumber
                    ]}>
                      {verse.number}
                    </Text>
                  )}
                  <Text style={[
                    styles.poetryVerseText,
                    isHighlighted && styles.highlightedText
                  ]}>
                    {renderVerseText(verse)}
                  </Text>
                </Text>
              </View>
            );
          })}
        </View>
      );
    }

    // For prose, render verses inline as before
    return (
      <View
        key={paragraph.id}
        style={[styles.paragraphContainer]}
      >
        <Text style={[styles.paragraphText, isPoetry && styles.poetryText, verseStyle]}>
          {versesToShow.map((verse, index) => {
            if (!verse || verse.number === undefined || !verse.text) return null;
            
            const isHighlighted = highlightVerses.includes(verse.number);
            
            return (
              <Text 
                key={verse.number}
                onPress={() => handleVersePress(verse)}
              >
                {showVerseNumbers && (
                  <Text style={[
                    styles.verseNumber,
                    isHighlighted && styles.highlightedNumber
                  ]}>
                    {verse.number}
                  </Text>
                )}
                <Text style={[isHighlighted && styles.highlightedText]}>
                  {renderVerseText(verse)}
                </Text>
                {index < versesToShow.length - 1 && ' '}
              </Text>
            );
          })}
        </Text>
      </View>
    );
  };

  // Render paragraphs with chapter separators for cross-chapter content
  const renderParagraphsWithChapterSeparators = () => {
    const filteredParagraphs = relevantParagraphs.filter(p => p != null);
    const elements: React.ReactElement[] = [];
    let currentChapter: number | null = null;
    
    filteredParagraphs.forEach((paragraph, index) => {
      const paragraphChapter = (paragraph as any).chapterNumber || 
        // Fallback: try to determine chapter from first verse reference
        (paragraph.verses?.[0]?.reference ? 
         parseInt(paragraph.verses[0].reference.match(/(\d+):/)?.[1] || '1') : 1);
      
      // Add chapter separator for the first chapter or when chapter changes
      if (currentChapter === null || paragraphChapter !== currentChapter) {
        elements.push(
          <View key={`chapter-separator-${paragraphChapter}`} style={styles.chapterSeparator}>
            <View style={styles.chapterSeparatorLine} />
            <Text style={styles.chapterSeparatorText}>
              Chapter {paragraphChapter}
            </Text>
            <View style={styles.chapterSeparatorLine} />
          </View>
        );
      }
      
      // Render the paragraph
      const renderedParagraph = renderParagraph(paragraph);
      if (renderedParagraph) {
        elements.push(renderedParagraph);
      }
      
      currentChapter = paragraphChapter;
    });
    
    return elements;
  };

  return (
    <View style={[styles.container, style, maxHeight && { maxHeight }]}>
      {showReference && effectiveReference && (
        <View style={styles.referenceContainer}>
          <Text style={styles.referenceText}>
            {effectiveReference}
          </Text>
          {contextualRendering && currentChapter && currentVerse && (
            <Text style={styles.contextualIndicator}>
              📍 Current: {currentChapter}:{currentVerse}
            </Text>
          )}
        </View>
      )}
      
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {renderParagraphsWithChapterSeparators()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  referenceContainer: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingBottom: 8,
  },
  referenceText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1f2937',
  },
  contextualIndicator: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  contentContainer: {
    flex: 1,
  },
  verseContainer: {
    marginBottom: 8,
  },
  paragraphContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  poetryContainer: {
    marginBottom: 20,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(59, 130, 246, 0.3)',
    backgroundColor: 'rgba(59, 130, 246, 0.03)',
    paddingVertical: 10,
    borderRadius: 6,
  },
  poetryLineContainer: {
    marginBottom: 6,
    paddingLeft: 4,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
  paragraphText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
  poetryText: {
    fontSize: 16,
    lineHeight: 26,
    color: 'rgba(0, 0, 0, 0.85)',
  },
  poetryVerseText: {
    fontStyle: 'italic',
    fontWeight: '400',
  },
  poetryVerseNumber: {
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 8,
    color: '#3b82f6',
    opacity: 0.7,
  },
  verseNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 10,
    color: '#3b82f6',
  },
  highlightedNumber: {
    fontWeight: '700',
    color: '#3b82f6',
  },
  highlightedText: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 4,
    padding: 4,
  },
  noContentText: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.7,
    padding: 20,
    color: '#6b7280',
  },
  chapterSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  chapterSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  chapterSeparatorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 12,
    paddingVertical: 4,
  },
  wordContainer: {
    borderRadius: 3,
    paddingHorizontal: 1,
  },
  word: {
    // Base word styling
  },
  highlightedWordContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  highlightedWord: {
    color: '#1d4ed8',
    fontWeight: '500',
  },
  pressedWordContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
});

export default ParagraphAwareScriptureRenderer;
