/**
 * TypeScript USFM Processor
 * 
 * A comprehensive USFM processing class that handles:
 * - USFM to JSON conversion
 * - Text extraction and cleaning
 * - Paragraph and section detection
 * - Word alignment processing
 * - Metadata generation
 */

import * as usfm from 'usfm-js';
import {
  USFMDocument,
  USFMVerse,
  USFMVerseObject,
  USFMAlignmentObject,
  USFMTextObject,
  USFMWordObject,
  USFMParagraphObject,
  ProcessedScripture,
  ProcessedChapter,
  ProcessedVerse,
  ProcessedParagraph,
  TranslationSection,
  WordAlignment,
  ProcessingResult,
  ProcessingMetadata
} from '../types/usfm.js';

export class USFMProcessor {
  private readonly PROCESSING_VERSION = '1.0.0-typescript';

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
      // Step 1: Convert USFM to JSON
      const usfmJson: USFMDocument = usfm.toJSON(usfmContent);
      
      // Step 2: Extract structured text
      const structuredText = this.extractStructuredText(usfmJson, bookCode, bookName);
      
      // Step 3: Extract sections
      const sections = this.extractTranslationSections(usfmJson, bookCode);
      
      // Step 4: Extract alignments
      const alignments = this.extractWordAlignments(usfmJson, bookCode);
      
      // Step 5: Generate metadata
      const processingDuration = Date.now() - startTime;
      const metadata = this.generateMetadata(
        bookCode, 
        bookName, 
        structuredText, 
        sections, 
        alignments, 
        processingDuration
      );

      return {
        structuredText,
        sections,
        alignments,
        metadata
      };

    } catch (error) {
      throw new Error(`Failed to process USFM content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Simple processing that returns just structured text
   */
  processUSFMSimple(usfmContent: string, bookName: string = 'Unknown'): ProcessedScripture {
    try {
      const usfmJson: USFMDocument = usfm.toJSON(usfmContent);
      return this.extractStructuredText(usfmJson, 'UNK', bookName);
    } catch (error) {
      return {
        book: bookName,
        bookCode: 'UNK',
        chapters: [],
        metadata: {
          bookCode: 'UNK',
          bookName,
          processingDate: new Date().toISOString(),
          processingDuration: 0,
          version: this.PROCESSING_VERSION,
          hasAlignments: false,
          hasSections: false,
          totalChapters: 0,
          totalVerses: 0,
          totalParagraphs: 0,
          statistics: {
            totalChapters: 0,
            totalVerses: 0,
            totalParagraphs: 0,
            totalSections: 0,
            totalAlignments: 0
          }
        }
      };
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

    for (const [verseNumStr, verseData] of Object.entries(chapterData)) {
      const verseNum = parseInt(verseNumStr);
      if (isNaN(verseNum)) continue;

      const { verse, hasParagraphMarker, paragraphStyle } = this.processVerse(
        verseData, 
        verseNum, 
        chapterNum, 
        bookCode
      );

      // Handle paragraph grouping
      if (hasParagraphMarker || currentParagraph === null) {
        if (currentParagraph) {
          paragraphs.push(currentParagraph);
        }

        currentParagraph = {
          id: `chapter-${chapterNum}-paragraph-${paragraphCounter++}`,
          type: paragraphStyle?.startsWith('q') ? 'quote' : 'paragraph',
          style: (paragraphStyle || 'p') as ProcessedParagraph['style'],
          indentLevel: this.getIndentLevel(paragraphStyle || 'p'),
          startVerse: verseNum,
          endVerse: verseNum,
          verseCount: 1,
          verseNumbers: [verseNum],
          combinedText: verse.text,
          verses: [verse]
        };
      } else if (currentParagraph) {
        currentParagraph.endVerse = verseNum;
        currentParagraph.verseCount++;
        currentParagraph.verseNumbers.push(verseNum);
        currentParagraph.combinedText += ' ' + verse.text;
        currentParagraph.verses.push(verse);
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
    verseNum: number, 
    chapterNum: number, 
    bookCode: string
  ): { verse: ProcessedVerse; hasParagraphMarker: boolean; paragraphStyle?: string } {
    let cleanText = '';
    let hasParagraphMarker = false;
    let paragraphStyle: string | undefined;
    let hasSectionMarker = false;
    let sectionMarkerCount = 0;

    if (!verseData.verseObjects) {
      return {
        verse: {
          number: verseNum,
          text: '',
          reference: `${bookCode} ${chapterNum}:${verseNum}`,
          hasSectionMarker: false,
          sectionMarkers: 0
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
      number: verseNum,
      text: cleanText,
      reference: `${bookCode} ${chapterNum}:${verseNum}`,
      hasSectionMarker,
      sectionMarkers: sectionMarkerCount
    };

    return { verse, hasParagraphMarker, paragraphStyle };
  }

  /**
   * Extract translation sections
   */
  private extractTranslationSections(usfmJson: USFMDocument, bookCode: string): TranslationSection[] {
    const sections: TranslationSection[] = [];
    let sectionCounter = 1;
    let currentSection: Partial<TranslationSection> | null = null;

    for (const [chapterNumStr, chapterData] of Object.entries(usfmJson.chapters)) {
      const chapterNum = parseInt(chapterNumStr);
      if (isNaN(chapterNum)) continue;

      for (const [verseNumStr, verseData] of Object.entries(chapterData)) {
        const verseNum = parseInt(verseNumStr);
        if (isNaN(verseNum)) continue;

        const rawContent = JSON.stringify(verseData);
        if (rawContent.includes('\\ts\\*') || rawContent.includes('ts\\*')) {
          if (currentSection) {
            sections.push({
              id: currentSection.id!,
              startReference: currentSection.startReference!,
              startChapter: currentSection.startChapter!,
              startVerse: currentSection.startVerse!,
              endReference: `${bookCode} ${chapterNum}:${verseNum - 1}`,
              endChapter: chapterNum,
              endVerse: verseNum - 1,
              title: currentSection.title!
            });
          }

          currentSection = {
            id: `section-${sectionCounter++}`,
            startReference: `${bookCode} ${chapterNum}:${verseNum}`,
            startChapter: chapterNum,
            startVerse: verseNum,
            title: `Section ${sectionCounter - 1}`
          };
        }
      }
    }

    if (currentSection) {
      sections.push({
        id: currentSection.id!,
        startReference: currentSection.startReference!,
        startChapter: currentSection.startChapter!,
        startVerse: currentSection.startVerse!,
        endReference: null,
        endChapter: null,
        endVerse: null,
        title: currentSection.title!
      });
    }

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
        const verseNum = parseInt(verseNumStr);
        if (isNaN(verseNum)) continue;

        const verseAlignments = this.extractVerseAlignments(verseData, chapterNum, verseNum, bookCode);
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
        const targetWords: string[] = [];
        
        if (verseObj.children) {
          for (const child of verseObj.children) {
            if (this.isWordObject(child)) {
              targetWords.push(child.text);
            } else if (this.isTextObject(child)) {
              targetWords.push(child.text);
            }
          }
        }

        if (targetWords.length > 0) {
          alignments.push({
            verseRef,
            sourceWords: [verseObj.content || ''],
            targetWords,
            alignmentData: [{
              strong: verseObj.strong || '',
              lemma: verseObj.lemma || '',
              morph: verseObj.morph || '',
              occurrence: verseObj.occurrence || '',
              occurrences: verseObj.occurrences || ''
            }]
          });
        }
      }
    }

    return alignments;
  }

  /**
   * Generate processing metadata
   */
  private generateMetadata(
    bookCode: string,
    bookName: string,
    structuredText: ProcessedScripture,
    sections: TranslationSection[],
    alignments: WordAlignment[],
    processingDuration: number
  ): ProcessingMetadata {
    return {
      bookCode,
      bookName,
      processingDate: new Date().toISOString(),
      processingDuration,
      version: this.PROCESSING_VERSION,
      hasAlignments: alignments.length > 0,
      hasSections: sections.length > 0,
      totalChapters: structuredText.metadata.totalChapters,
      totalVerses: structuredText.metadata.totalVerses,
      totalParagraphs: structuredText.metadata.totalParagraphs,
      statistics: {
        totalChapters: structuredText.metadata.totalChapters,
        totalVerses: structuredText.metadata.totalVerses,
        totalParagraphs: structuredText.metadata.totalParagraphs,
        totalSections: sections.length,
        totalAlignments: alignments.length
      }
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
   * Extract text from alignment object
   */
  private extractTextFromAlignment(alignmentObj: USFMAlignmentObject): string {
    let text = '';
    if (alignmentObj.children) {
      for (const child of alignmentObj.children) {
        if (this.isTextObject(child)) {
          text += child.text;
        } else if (this.isWordObject(child)) {
          text += child.text;
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
