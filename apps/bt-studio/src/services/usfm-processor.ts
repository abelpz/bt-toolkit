/**
 * USFM Processor Service for Translation Studio Web
 * Integrates USFM processing with Door43 API data
 * Based on @bt-toolkit/usfm-processor
 */

import * as usfm from 'usfm-js';
import { defaultSectionsService } from './default-sections';

// USFM Types (simplified from @bt-toolkit/usfm-processor)
export interface USFMHeader {
  tag?: string;
  content?: string;
  type?: string;
  text?: string;
}

export interface USFMWordObject {
  text: string;
  tag: 'w';
  type: 'word';
  occurrence: string;
  occurrences: string;
}

export interface USFMTextObject {
  type: 'text';
  text: string;
}

export interface USFMAlignmentObject {
  tag: 'zaln';
  type: 'milestone';
  strong: string;
  lemma: string;
  morph: string;
  occurrence: string;
  occurrences: string;
  content: string;
  children: (USFMWordObject | USFMTextObject)[];
  endTag: string;
}

export interface USFMParagraphObject {
  tag: 'p' | 'q' | 'q1' | 'q2' | 'm' | 'mi' | 'pc' | 'pr' | 'cls';
  type: 'paragraph' | 'quote';
  nextChar?: string;
}

export type USFMVerseObject = USFMAlignmentObject | USFMTextObject | USFMWordObject | USFMParagraphObject;

export interface USFMVerse {
  verseObjects: USFMVerseObject[];
}

export interface USFMChapter {
  [verseNumber: string]: USFMVerse;
}

export interface USFMDocument {
  headers: USFMHeader[];
  chapters: { [chapterNumber: string]: USFMChapter };
}

// Processed Types
export interface ProcessedVerse {
  number: number;
  text: string;
  reference: string;
  paragraphId?: string;
  hasSectionMarker?: boolean;
  sectionMarkers?: number;
  alignments?: WordAlignment[];
  // Verse span support
  isSpan?: boolean;
  spanStart?: number;
  spanEnd?: number;
  originalVerseString?: string; // e.g., "1-2", "3", "4-6"
}

export interface ProcessedParagraph {
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
}

export interface ProcessedChapter {
  number: number;
  verseCount: number;
  paragraphCount: number;
  verses: ProcessedVerse[];
  paragraphs: ProcessedParagraph[];
}

export interface TranslatorSection {
  start: {
    chapter: number;
    verse: number;
    reference: { chapter: string; verse: string };
  };
  end: {
    chapter: number;
    verse: number;
    reference: { chapter: string; verse: string };
  };
}

export interface WordAlignment {
  verseRef: string;
  sourceWords: string[];
  targetWords: string[];
  alignmentData: {
    strong: string;
    lemma: string;
    morph: string;
    occurrence: string;
    occurrences: string;
  }[];
}

export interface ProcessedScripture {
  book: string;
  bookCode: string;
  metadata: {
    bookCode: string;
    bookName: string;
    processingDate: string;
    processingDuration: number;
    version: string;
    hasAlignments: boolean;
    hasSections: boolean;
    totalChapters: number;
    totalVerses: number;
    totalParagraphs: number;
    statistics: {
      totalChapters: number;
      totalVerses: number;
      totalParagraphs: number;
      totalSections: number;
      totalAlignments: number;
    };
  };
  chapters: ProcessedChapter[];
  translatorSections?: TranslatorSection[];
  alignments?: WordAlignment[];
}

export interface ProcessingResult {
  structuredText: ProcessedScripture;
  translatorSections: TranslatorSection[];
  alignments: WordAlignment[];
  metadata: ProcessedScripture['metadata'];
}

/**
 * USFM Processor Class
 */
export class USFMProcessor {
  private readonly PROCESSING_VERSION = '1.0.0-web';

  /**
   * Process USFM content into structured data
   */
  async processUSFM(
    usfmContent: string,
    bookCode: string,
    bookName: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      
      
      // Debug: Check raw USFM content for \ts\* markers
      const tsMarkerCount = (usfmContent.match(/\\ts\\\*/g) || []).length;
      
      
      if (tsMarkerCount > 0) {
        
        const tsMatches = usfmContent.match(/(.{0,50}\\ts\\\*.{0,50})/g);
      }
      
      // Step 1: Convert USFM to JSON
      const usfmJson: USFMDocument = usfm.toJSON(usfmContent);
      
      // Step 2: Extract structured text
      const structuredText = this.extractStructuredText(usfmJson, bookCode, bookName);
      
      // Step 3: Extract translator sections
      let translatorSections = this.extractTranslatorSections(usfmJson, bookCode);
      console.log(`🔍 USFM extracted ${translatorSections.length} sections for ${bookCode}:`, translatorSections);
      
      // Use default sections if none found in USFM
      if (translatorSections.length === 0) {
        console.log(`📚 No USFM sections found for ${bookCode}, trying default sections...`);
        try {
          const defaultSections = await defaultSectionsService.getDefaultSections(bookCode);
          console.log(`📚 Default sections service returned ${defaultSections.length} sections for ${bookCode}:`, defaultSections);
          if (defaultSections.length > 0) {
            translatorSections = defaultSections;
            console.log(`✅ Using ${translatorSections.length} default sections for ${bookCode}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to load default sections for ${bookCode}:`, error);
        }
      } else {
        console.log(`✅ Using ${translatorSections.length} USFM sections for ${bookCode}`);
      }
      
      // Step 4: Extract alignments
      const alignments = this.extractWordAlignments(usfmJson, bookCode);
      
      // Step 5: Generate metadata
      const processingDuration = Date.now() - startTime;
      const metadata = this.generateMetadata(
        bookCode, 
        bookName, 
        structuredText, 
        translatorSections, 
        alignments, 
        processingDuration
      );

      
      
      
      
      
      

      return {
        structuredText,
        translatorSections,
        alignments,
        metadata
      };

    } catch (error) {
      console.error('❌ USFM processing failed:', error);
      throw new Error(`Failed to process USFM content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract structured text with paragraph processing
   */
  private extractStructuredText(
    usfmJson: USFMDocument, 
    bookCode: string, 
    bookName: string
  ): ProcessedScripture {
    const chapters: ProcessedChapter[] = [];
    
    if (!usfmJson.chapters) {
      throw new Error('No chapters found in USFM JSON');
    }

    for (const [chapterNumStr, chapterData] of Object.entries(usfmJson.chapters)) {
      const chapterNum = parseInt(chapterNumStr);
      if (isNaN(chapterNum)) continue;

      const chapter = this.processChapter(chapterData, chapterNum, bookCode);
      if (chapter.verses.length > 0) {
        chapters.push(chapter);
      }
    }

    const totalVerses = chapters.reduce((sum, ch) => sum + ch.verseCount, 0);
    const totalParagraphs = chapters.reduce((sum, ch) => sum + ch.paragraphCount, 0);

    return {
      book: bookName,
      bookCode,
      metadata: {
        bookCode,
        bookName,
        processingDate: new Date().toISOString(),
        processingDuration: 0,
        version: this.PROCESSING_VERSION,
        hasAlignments: false,
        hasSections: false,
        totalChapters: chapters.length,
        totalVerses,
        totalParagraphs,
        statistics: {
          totalChapters: chapters.length,
          totalVerses,
          totalParagraphs,
          totalSections: 0,
          totalAlignments: 0
        }
      },
      chapters
    };
  }

  /**
   * Process a single chapter
   */
  private processChapter(
    chapterData: Record<string, USFMVerse>, 
    chapterNum: number, 
    bookCode: string
  ): ProcessedChapter {
    const verses: ProcessedVerse[] = [];
    const paragraphs: ProcessedParagraph[] = [];
    
    let currentParagraph: ProcessedParagraph | null = null;
    let paragraphCounter = 1;
    let nextParagraphStyle: string | null = null;

    // First pass: collect verses and identify paragraph breaks
    const verseEntries = Object.entries(chapterData)
      .filter(([verseNumStr]) => {
        const parsedVerse = this.parseVerseNumber(verseNumStr);
        return parsedVerse.number >= 1; // Skip non-numeric entries
      })
      .sort(([a], [b]) => {
        const aNum = this.parseVerseNumber(a).number;
        const bNum = this.parseVerseNumber(b).number;
        return aNum - bNum;
      });

    // Check for initial paragraph marker in "front" verse
    if (chapterData.front?.verseObjects) {
      const frontParagraphObj = chapterData.front.verseObjects.find((obj: any) => 
        this.isParagraphObject(obj)
      );
      if (frontParagraphObj) {
        nextParagraphStyle = frontParagraphObj.tag || 'p';
        
      }
    }

    for (let i = 0; i < verseEntries.length; i++) {
      const [verseNumStr, verseData] = verseEntries[i];
      const parsedVerse = this.parseVerseNumber(verseNumStr);

      const { verse, hasParagraphMarker, paragraphStyle } = this.processVerse(
        verseData, 
        verseNumStr, 
        chapterNum, 
        bookCode
      );

      // Skip empty verses (they often appear at chapter boundaries)
      if (!verse.text.trim()) {
        
        continue;
      }

      // Start a new paragraph if:
      // 1. This is the first verse and we have no current paragraph
      // 2. The previous verse had a paragraph marker (indicating this verse starts a new paragraph)
      const shouldStartNewParagraph = currentParagraph === null || nextParagraphStyle !== null;

      if (shouldStartNewParagraph) {
        // Close the current paragraph
        if (currentParagraph) {
          paragraphs.push(currentParagraph);
        }

        // Determine the style for this new paragraph
        const styleForThisParagraph = nextParagraphStyle || 'p';
        nextParagraphStyle = null; // Reset for next iteration

        currentParagraph = {
          id: `chapter-${chapterNum}-paragraph-${paragraphCounter++}`,
          type: styleForThisParagraph?.startsWith('q') ? 'quote' : 'paragraph',
          style: styleForThisParagraph as ProcessedParagraph['style'],
          indentLevel: this.getIndentLevel(styleForThisParagraph),
          startVerse: parsedVerse.number,
          endVerse: parsedVerse.number,
          verseCount: 1,
          verseNumbers: [parsedVerse.number],
          combinedText: verse.text,
          verses: [verse]
        };

        
      } else if (currentParagraph) {
        // Add verse to current paragraph
        currentParagraph.endVerse = parsedVerse.number;
        currentParagraph.verseCount++;
        currentParagraph.verseNumbers.push(parsedVerse.number);
        currentParagraph.combinedText += ' ' + verse.text;
        currentParagraph.verses.push(verse);

        
      }

      // If this verse has a paragraph marker, it indicates the NEXT paragraph's style
      if (hasParagraphMarker && paragraphStyle) {
        nextParagraphStyle = paragraphStyle;
        
      }

      verse.paragraphId = currentParagraph?.id;
      verses.push(verse);
    }

    if (currentParagraph) {
      paragraphs.push(currentParagraph);
    }

    return {
      number: chapterNum,
      verseCount: verses.length,
      paragraphCount: paragraphs.length,
      verses,
      paragraphs
    };
  }

  /**
   * Process a single verse
   */
  private processVerse(
    verseData: USFMVerse, 
    verseNumStr: string, 
    chapterNum: number, 
    bookCode: string
  ): { verse: ProcessedVerse; hasParagraphMarker: boolean; paragraphStyle?: string } {
    // Parse the verse number (handles spans like "1-2")
    const parsedVerse = this.parseVerseNumber(verseNumStr);
    
    
    let cleanText = '';
    let hasParagraphMarker = false;
    let paragraphStyle: string | undefined;
    let hasSectionMarker = false;
    let sectionMarkerCount = 0;
    const alignments: WordAlignment[] = [];

    if (!verseData.verseObjects) {
      return {
        verse: {
          number: parsedVerse.number,
          text: '',
          reference: `${bookCode} ${chapterNum}:${parsedVerse.originalVerseString}`,
          hasSectionMarker: false,
          sectionMarkers: 0,
          alignments: [],
          isSpan: parsedVerse.isSpan,
          spanStart: parsedVerse.spanStart,
          spanEnd: parsedVerse.spanEnd,
          originalVerseString: parsedVerse.originalVerseString
        },
        hasParagraphMarker: false
      };
    }

    // Process verse objects
    for (const verseObj of verseData.verseObjects) {
      if (this.isTextObject(verseObj)) {
        cleanText += verseObj.text;
      } else if (this.isWordObject(verseObj)) {
        cleanText += verseObj.text;
      } else if (this.isAlignmentObject(verseObj)) {
        cleanText += this.extractTextFromAlignment(verseObj);
        // Extract alignment data (now returns array)
        const verseAlignments = this.extractAlignmentData(verseObj, `${bookCode} ${chapterNum}:${parsedVerse.originalVerseString}`);
        alignments.push(...verseAlignments);
      } else if (this.isParagraphObject(verseObj)) {
        hasParagraphMarker = true;
        paragraphStyle = verseObj.tag;
      }
    }

    // Check for section markers
    const rawContent = JSON.stringify(verseData);
    if (rawContent.includes('\\ts\\*') || rawContent.includes('ts\\*')) {
      hasSectionMarker = true;
      sectionMarkerCount = (rawContent.match(/\\ts\\*/g) || []).length;
    }

    cleanText = this.cleanText(cleanText);

    const verse: ProcessedVerse = {
      number: parsedVerse.number,
      text: cleanText,
      reference: `${bookCode} ${chapterNum}:${parsedVerse.originalVerseString}`,
      hasSectionMarker,
      sectionMarkers: sectionMarkerCount,
      alignments: alignments.length > 0 ? alignments : undefined,
      // Verse span information
      isSpan: parsedVerse.isSpan,
      spanStart: parsedVerse.spanStart,
      spanEnd: parsedVerse.spanEnd,
      originalVerseString: parsedVerse.originalVerseString
    };

    return { verse, hasParagraphMarker, paragraphStyle };
  }

  /**
   * Extract translator sections (translation sections marked with \ts\*)
   */
  private extractTranslatorSections(usfmJson: USFMDocument, bookCode: string): TranslatorSection[] {
    const sections: TranslatorSection[] = [];
    let currentSection: {
      startChapter: number;
      startVerse: number;
      startVerseString: string;
    } | null = null;

    
    
    // First, let's search the entire JSON for any \ts\* markers
    const fullJsonString = JSON.stringify(usfmJson);
    const tsMarkerCount = (fullJsonString.match(/\\ts\\\*/g) || []).length;
    const tsMarkerCountAlt = (fullJsonString.match(/ts\\\*/g) || []).length;
    
    
    // Also check for other possible variations
    const tsVariations = [
      { name: 'raw \\ts\\*', pattern: /\\ts\\\*/g },
      { name: 'tag:ts\\*', pattern: /"tag":"ts\\\\\*"/g },
      { name: 'tag:ts', pattern: /"tag":"ts"/g },
      { name: 'ts marker', pattern: /"ts"/g }
    ];
    
    tsVariations.forEach((variation, index) => {
      const matches = (fullJsonString.match(variation.pattern) || []).length;
      
    });

    // Check for pre-chapter \ts\* markers in headers
    if (usfmJson.headers) {
      const headersJson = JSON.stringify(usfmJson.headers);
      if (headersJson.includes('"tag":"ts"') || headersJson.includes('"tag":"ts\\\\*"')) {
        
        currentSection = {
          startChapter: 1,
          startVerse: 1,
          startVerseString: "1"
        };
      }
    }

    // Find the last chapter and verse for final section handling
    let lastChapter = 0;
    let lastVerse = 0;
    for (const [chapterNumStr, chapterData] of Object.entries(usfmJson.chapters)) {
      const chapterNum = parseInt(chapterNumStr);
      if (isNaN(chapterNum)) continue;
      
      lastChapter = Math.max(lastChapter, chapterNum);
      
      for (const [verseNumStr] of Object.entries(chapterData)) {
        const parsedVerse = this.parseVerseNumber(verseNumStr);
        if (parsedVerse.number < 1) continue;
        
        if (chapterNum === lastChapter) {
          // For spans, use the end of the span as the last verse
          const effectiveLastVerse = parsedVerse.isSpan ? parsedVerse.spanEnd! : parsedVerse.number;
          lastVerse = Math.max(lastVerse, effectiveLastVerse);
        }
      }
    }

    

    // Process chapters and verses
    for (const [chapterNumStr, chapterData] of Object.entries(usfmJson.chapters)) {
      const chapterNum = parseInt(chapterNumStr);
      if (isNaN(chapterNum)) continue;

      for (const [verseNumStr, verseData] of Object.entries(chapterData)) {
        const parsedVerse = this.parseVerseNumber(verseNumStr);
        if (parsedVerse.number < 1) continue;

        const rawContent = JSON.stringify(verseData);
        
        // Check for translation section markers in the parsed JSON
        // \ts\* markers get parsed as {"tag": "ts\\*"}
        const hasTranslationSection = rawContent.includes('"tag":"ts\\\\*"');
        
        if (hasTranslationSection) {
          
          
          
          // Close the previous section
          if (currentSection) {
            // For sections that end before a new section starts
            const endChapter = chapterNum;
            // If the previous verse was a span, use the end of the span as the end verse
            const endVerse = parsedVerse.number > 1 ? parsedVerse.number - 1 : parsedVerse.number;
            
            // Find the previous verse to check if it was a span
            let prevVerseString = "1";
            let prevVerse = endVerse;
            for (const [prevVerseNumStr] of Object.entries(chapterData)) {
              const prevParsedVerse = this.parseVerseNumber(prevVerseNumStr);
              if (prevParsedVerse.number === endVerse) {
                prevVerseString = prevParsedVerse.originalVerseString;
                // If it's a span, use the end of the span
                if (prevParsedVerse.isSpan && prevParsedVerse.spanEnd) {
                  prevVerse = prevParsedVerse.spanEnd;
                }
                break;
              }
            }
            
            sections.push({
              start: {
                chapter: currentSection.startChapter,
                verse: currentSection.startVerse,
                reference: { 
                  chapter: currentSection.startChapter.toString(), 
                  verse: currentSection.startVerseString 
                }
              },
              end: {
                chapter: endChapter,
                verse: prevVerse,
                reference: { 
                  chapter: endChapter.toString(), 
                  verse: prevVerseString 
                }
              }
            });
          }

          // Start new section
          // If this verse is a span, use the start of the span as the start verse
          const startVerse = parsedVerse.isSpan && parsedVerse.spanStart ? parsedVerse.spanStart : parsedVerse.number;
          currentSection = {
            startChapter: chapterNum,
            startVerse: startVerse,
            startVerseString: parsedVerse.originalVerseString
          };
        }
      }
    }

    // Handle the final section (ends at the last verse of the book)
    if (currentSection) {
      // Find the last verse string to handle spans correctly
      let lastVerseString = lastVerse.toString();
      for (const [chapterNumStr, chapterData] of Object.entries(usfmJson.chapters)) {
        const chapterNum = parseInt(chapterNumStr);
        if (chapterNum === lastChapter) {
          for (const [verseNumStr] of Object.entries(chapterData)) {
            const parsedVerse = this.parseVerseNumber(verseNumStr);
            if (parsedVerse.isSpan && parsedVerse.spanEnd === lastVerse) {
              lastVerseString = parsedVerse.originalVerseString;
              break;
            } else if (parsedVerse.number === lastVerse) {
              lastVerseString = parsedVerse.originalVerseString;
            }
          }
          break;
        }
      }
      
      sections.push({
        start: {
          chapter: currentSection.startChapter,
          verse: currentSection.startVerse,
          reference: { 
            chapter: currentSection.startChapter.toString(), 
            verse: currentSection.startVerseString 
          }
        },
        end: {
          chapter: lastChapter,
          verse: lastVerse,
          reference: { 
            chapter: lastChapter.toString(), 
            verse: lastVerseString 
          }
        }
      });
    }

    
    sections.forEach((section, index) => {
      const startRef = `${bookCode} ${section.start.reference.chapter}:${section.start.reference.verse}`;
      const endRef = `${bookCode} ${section.end.reference.chapter}:${section.end.reference.verse}`;
      
    });
    
    return sections;
  }

  /**
   * Extract word alignments
   */
  private extractWordAlignments(usfmJson: USFMDocument, bookCode: string): WordAlignment[] {
    const alignments: WordAlignment[] = [];

    for (const [chapterNumStr, chapterData] of Object.entries(usfmJson.chapters)) {
      const chapterNum = parseInt(chapterNumStr);
      if (isNaN(chapterNum)) continue;

      for (const [verseNumStr, verseData] of Object.entries(chapterData)) {
        const parsedVerse = this.parseVerseNumber(verseNumStr);
        if (parsedVerse.number < 1) continue;

        const verseAlignments = this.extractVerseAlignments(verseData, chapterNum, parsedVerse.number, bookCode);
        alignments.push(...verseAlignments);
      }
    }

    return alignments;
  }

  /**
   * Extract alignments from a verse
   */
  private extractVerseAlignments(
    verseData: USFMVerse, 
    chapterNum: number, 
    verseNum: number, 
    bookCode: string
  ): WordAlignment[] {
    const alignments: WordAlignment[] = [];
    const verseRef = `${bookCode} ${chapterNum}:${verseNum}`;

    if (!verseData.verseObjects) return alignments;

    for (const verseObj of verseData.verseObjects) {
      if (this.isAlignmentObject(verseObj)) {
        const verseAlignments = this.extractAlignmentData(verseObj, verseRef);
        alignments.push(...verseAlignments);
      }
    }

    return alignments;
  }

  /**
   * Extract alignment data from alignment object
   */
  private extractAlignmentData(alignmentObj: USFMAlignmentObject, verseRef: string): WordAlignment[] {
    const alignments: WordAlignment[] = [];
    
    // Extract compound alignment data (for nested structures)
    const compoundAlignment = this.extractCompoundAlignment(alignmentObj, verseRef);
    if (compoundAlignment) {
      alignments.push(compoundAlignment);
    }
    
    return alignments;
  }

  /**
   * Extract compound alignment data including nested alignments
   */
  private extractCompoundAlignment(alignmentObj: USFMAlignmentObject, verseRef: string): WordAlignment | null {
    const targetWords: string[] = [];
    const sourceWords: string[] = [];
    const alignmentData: Array<{
      strong: string;
      lemma: string;
      morph: string;
      occurrence: string;
      occurrences: string;
    }> = [];
    
    // Add this level's alignment data
    if (alignmentObj.content || alignmentObj.strong) {
      sourceWords.push(alignmentObj.content || '');
      alignmentData.push({
        strong: alignmentObj.strong || '',
        lemma: alignmentObj.lemma || '',
        morph: alignmentObj.morph || '',
        occurrence: alignmentObj.occurrence || '',
        occurrences: alignmentObj.occurrences || ''
      });
    }
    
    if (alignmentObj.children) {
      for (const child of alignmentObj.children) {
        if (this.isWordObject(child)) {
          targetWords.push(child.text);
        } else if (this.isTextObject(child)) {
          // Only add non-whitespace text
          const text = child.text.trim();
          if (text) {
            targetWords.push(text);
          }
        } else if (this.isAlignmentObject(child)) {
          // For nested alignments, merge their data into this compound alignment
          const nestedAlignment = this.extractCompoundAlignment(child, verseRef);
          if (nestedAlignment) {
            // Merge target words
            targetWords.push(...nestedAlignment.targetWords);
            // Merge source words
            sourceWords.push(...nestedAlignment.sourceWords);
            // Merge alignment data
            alignmentData.push(...nestedAlignment.alignmentData);
          }
        }
      }
    }

    // Create compound alignment if we have target words
    if (targetWords.length > 0) {
      return {
        verseRef,
        sourceWords,
        targetWords,
        alignmentData
      };
    }

    return null;
  }

  /**
   * Generate processing metadata
   */
  private generateMetadata(
    bookCode: string,
    bookName: string,
    structuredText: ProcessedScripture,
    translatorSections: TranslatorSection[],
    alignments: WordAlignment[],
    processingDuration: number
  ): ProcessedScripture['metadata'] {
    return {
      bookCode,
      bookName,
      processingDate: new Date().toISOString(),
      processingDuration,
      version: this.PROCESSING_VERSION,
      hasAlignments: alignments.length > 0,
      hasSections: translatorSections.length > 0,
      totalChapters: structuredText.metadata.totalChapters,
      totalVerses: structuredText.metadata.totalVerses,
      totalParagraphs: structuredText.metadata.totalParagraphs,
      statistics: {
        totalChapters: structuredText.metadata.totalChapters,
        totalVerses: structuredText.metadata.totalVerses,
        totalParagraphs: structuredText.metadata.totalParagraphs,
        totalSections: translatorSections.length,
        totalAlignments: alignments.length
      }
    };
  }

  /**
   * Parse verse number that may be a span (e.g., "1-2") or single number (e.g., "3")
   */
  private parseVerseNumber(verseString: string): {
    number: number;
    isSpan: boolean;
    spanStart?: number;
    spanEnd?: number;
    originalVerseString: string;
  } {
    const trimmed = verseString.trim();
    
    // Check if it's a span (contains a dash)
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-');
      if (parts.length === 2) {
        const start = parseInt(parts[0].trim());
        const end = parseInt(parts[1].trim());
        
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          return {
            number: start, // Use the start number as the primary number
            isSpan: true,
            spanStart: start,
            spanEnd: end,
            originalVerseString: trimmed
          };
        }
      }
    }
    
    // Single verse number
    const singleNumber = parseInt(trimmed);
    if (!isNaN(singleNumber)) {
      return {
        number: singleNumber,
        isSpan: false,
        originalVerseString: trimmed
      };
    }
    
    // Fallback for invalid verse numbers
    // console.debug(`⚠️ Invalid verse number: "${trimmed}"`);
    return {
      number: 1,
      isSpan: false,
      originalVerseString: trimmed
    };
  }

  // Type guards
  private isTextObject(obj: USFMVerseObject): obj is USFMTextObject {
    return obj.type === 'text';
  }

  private isWordObject(obj: USFMVerseObject): obj is USFMWordObject {
    return obj.type === 'word' && 'tag' in obj && obj.tag === 'w';
  }

  private isParagraphObject(obj: USFMVerseObject): obj is USFMParagraphObject {
    return obj.type === 'paragraph' || obj.type === 'quote';
  }

  private isAlignmentObject(obj: USFMVerseObject): obj is USFMAlignmentObject {
    return obj.type === 'milestone' && 'tag' in obj && obj.tag === 'zaln';
  }

  /**
   * Extract text from alignment object (handles nested alignments)
   */
  private extractTextFromAlignment(alignmentObj: USFMAlignmentObject): string {
    let text = '';
    if (alignmentObj.children) {
      for (const child of alignmentObj.children) {
        if (this.isTextObject(child)) {
          text += child.text;
        } else if (this.isWordObject(child)) {
          text += child.text;
        } else if (this.isAlignmentObject(child)) {
          // Recursively handle nested alignment objects
          text += this.extractTextFromAlignment(child);
        }
      }
    }
    return text;
  }

  /**
   * Get indentation level for paragraph styles
   */
  private getIndentLevel(style: string): number {
    if (style === 'q1') return 1;
    if (style === 'q2') return 2;
    if (style === 'q3') return 3;
    if (style === 'q4') return 4;
    if (style.startsWith('q')) return 1;
    return 0;
  }

  /**
   * Clean text by removing artifacts
   */
  private cleanText(text: string): string {
    return text
      .replace(/\\[a-z-]+\*?/g, '')  // Remove USFM markers
      .replace(/\|[^\\|]*\\?/g, '')   // Remove metadata
      .replace(/\\\*/g, '')           // Remove backslash-asterisk
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .trim();
  }
}

// Create a default processor instance
export const usfmProcessor = new USFMProcessor();
