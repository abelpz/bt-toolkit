/**
 * USFM Parser
 * Parses Unified Standard Format Markers (USFM) content into structured scripture data
 */

import {
  ProcessedScripture,
  ProcessedChapter,
  ProcessedVerse,
  AlignmentGroup,
  AlignmentData,
  BookId,
  LanguageCode,
  ServiceResult
} from '@bt-toolkit/door43-core';

export interface USFMParseOptions {
  /** Include alignment data parsing */
  includeAlignment?: boolean;
  /** Book identifier for metadata */
  book?: BookId;
  /** Language code for metadata */
  language?: LanguageCode;
  /** Resource type */
  resourceType?: 'literal' | 'simplified';
}

export class USFMParser {
  /**
   * Parse USFM content into ProcessedScripture
   */
  parseUSFM(content: string, options: USFMParseOptions = {}): ServiceResult<ProcessedScripture> {
    try {
      const startTime = Date.now();
      
      // Clean and normalize content
      const normalizedContent = this.normalizeContent(content);
      
      // Extract book information
      const bookInfo = this.extractBookInfo(normalizedContent, options.book);
      
      // Parse chapters and verses
      const chapters = this.parseChaptersAndVerses(normalizedContent, options.includeAlignment);
      
      // Build full content string
      const fullContent = this.buildFullContent(chapters);
      
      const result: ProcessedScripture = {
        book: bookInfo.book,
        bookName: bookInfo.bookName,
        language: options.language || 'en',
        resourceType: options.resourceType || 'literal',
        chapters,
        content: fullContent,
        metadata: {
          source: 'api' as const,
          processedAt: new Date(),
          version: '1.0.0'
        }
      };
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        data: result,
        metadata: {
          source: 'api' as const,
          timestamp: new Date(),
          processingTimeMs: processingTime,
          chaptersFound: chapters.length,
          versesFound: chapters.reduce((total, ch) => total + ch.verses.length, 0)
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown parsing error'
      };
    }
  }
  
  /**
   * Normalize USFM content by cleaning up line breaks and whitespace
   */
  private normalizeContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')   // Handle old Mac line endings
      .replace(/\n{3,}/g, '\n\n') // Collapse multiple empty lines
      .trim();
  }
  
  /**
   * Extract book information from USFM content
   */
  private extractBookInfo(content: string, bookHint?: BookId): { book: BookId; bookName: string } {
    // Look for \id marker
    const idMatch = content.match(/\\id\s+([A-Z0-9]{3})\s*(.*)/);
    if (idMatch) {
      return {
        book: idMatch[1] as BookId,
        bookName: idMatch[2]?.trim() || idMatch[1]
      };
    }
    
    // Look for \h marker (header/book name)
    const headerMatch = content.match(/\\h\s+(.+)/);
    const bookName = headerMatch ? headerMatch[1].trim() : (bookHint || 'Unknown');
    
    return {
      book: bookHint || 'UNK' as BookId,
      bookName: typeof bookName === 'string' ? bookName : String(bookName)
    };
  }
  
  /**
   * Parse chapters and verses from USFM content
   */
  private parseChaptersAndVerses(content: string, includeAlignment = false): ProcessedChapter[] {
    const lines = content.split('\n');
    const chapters: ProcessedChapter[] = [];
    let currentChapter: ProcessedChapter | null = null;
    let currentVerse: ProcessedVerse | null = null;
    let verseContent: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line || line.startsWith('\\id') || line.startsWith('\\h') || line.startsWith('\\toc')) {
        continue; // Skip metadata lines
      }
      
      // Chapter marker
      if (line.startsWith('\\c ')) {
        // Save previous verse if exists
        if (currentVerse && currentChapter) {
          currentVerse.text = verseContent.join(' ').trim();
          if (includeAlignment) {
            currentVerse.alignments = this.parseAlignments(verseContent.join(' '));
          }
          currentChapter.verses.push(currentVerse);
        }
        
        // Save previous chapter if exists
        if (currentChapter) {
          chapters.push(currentChapter);
        }
        
        // Start new chapter
        const chapterNum = parseInt(line.substring(3).trim());
        currentChapter = {
          number: chapterNum,
          verses: []
        };
        currentVerse = null;
        verseContent = [];
        continue;
      }
      
      // Verse marker
      if (line.startsWith('\\v ')) {
        // Save previous verse if exists
        if (currentVerse && currentChapter) {
          currentVerse.text = verseContent.join(' ').trim();
          if (includeAlignment) {
            currentVerse.alignments = this.parseAlignments(verseContent.join(' '));
          }
          currentChapter.verses.push(currentVerse);
        }
        
        // Start new verse
        const verseMatch = line.match(/\\v\s+(\d+)(?:-(\d+))?\s*(.*)/);
        if (verseMatch) {
          const verseNum = parseInt(verseMatch[1]);
          const verseText = verseMatch[3] || '';
          
          currentVerse = {
            number: verseNum,
            text: '', // Will be filled when verse is complete
            alignments: [],
            usfm: line
          };
          verseContent = verseText ? [verseText] : [];
        }
        continue;
      }
      
      // Chapter title
      if (line.startsWith('\\s') || line.startsWith('\\ms')) {
        if (currentChapter) {
          currentChapter.title = line.replace(/^\\s\d*\s*/, '').replace(/^\\ms\d*\s*/, '').trim();
        }
        continue;
      }
      
      // Regular content line (part of current verse)
      if (currentVerse && line) {
        // Remove USFM markers but keep content
        const cleanLine = this.cleanUSFMMarkers(line);
        if (cleanLine.trim()) {
          verseContent.push(cleanLine);
        }
      }
    }
    
    // Save final verse and chapter
    if (currentVerse && currentChapter) {
      currentVerse.text = verseContent.join(' ').trim();
      if (includeAlignment) {
        currentVerse.alignments = this.parseAlignments(verseContent.join(' '));
      }
      currentChapter.verses.push(currentVerse);
    }
    
    if (currentChapter) {
      chapters.push(currentChapter);
    }
    
    return chapters;
  }
  
  /**
   * Clean USFM markers from text while preserving content
   */
  private cleanUSFMMarkers(text: string): string {
    return text
      // Remove paragraph markers
      .replace(/\\p\s*/g, '')
      .replace(/\\m\s*/g, '')
      .replace(/\\pi\d*\s*/g, '')
      .replace(/\\q\d*\s*/g, '')
      .replace(/\\li\d*\s*/g, '')
      // Remove formatting markers but keep content
      .replace(/\\(add|nd|wj|em|bd|it|bdit|no|sc)\s*([^\\]*?)\\?\1?\*/g, '$2')
      // Remove footnote markers
      .replace(/\\f\s*[^\\]*?\\f\*/g, '')
      // Remove cross-reference markers
      .replace(/\\x\s*[^\\]*?\\x\*/g, '')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Parse alignment data from USFM content
   */
  private parseAlignments(content: string): AlignmentGroup[] {
    const alignments: AlignmentGroup[] = [];
    
    // Find alignment spans: \zaln-s ... \zaln-e\*
    const alignmentRegex = /\\zaln-s\s+\|([^\\]*?)\\\*([^\\]*?)\\zaln-e\\\*/g;
    let match;
    let currentIndex = 0;
    
    while ((match = alignmentRegex.exec(content)) !== null) {
      const attributes = match[1];
      const alignedText = match[2];
      
      // Parse alignment attributes
      const alignment = this.parseAlignmentAttributes(attributes);
      
      // Extract gateway words
      const words = this.extractGatewayWords(alignedText);
      
      if (alignment && words.length > 0) {
        // Update alignment with gateway words
        alignment.gatewayWords = words;
        
        alignments.push({
          alignment,
          words,
          startIndex: currentIndex,
          endIndex: currentIndex + this.cleanUSFMMarkers(alignedText).length
        });
      }
      
      currentIndex += this.cleanUSFMMarkers(alignedText).length;
    }
    
    return alignments;
  }
  
  /**
   * Parse alignment attributes from zaln-s marker
   */
  private parseAlignmentAttributes(attributes: string): AlignmentData | null {
    try {
      const strongMatch = attributes.match(/x-strong="([^"]+)"/);
      const lemmaMatch = attributes.match(/x-lemma="([^"]+)"/);
      const morphMatch = attributes.match(/x-morph="([^"]+)"/);
      const occurrenceMatch = attributes.match(/x-occurrence="(\d+)"/);
      const occurrencesMatch = attributes.match(/x-occurrences="(\d+)"/);
      
      if (!occurrenceMatch || !occurrencesMatch) {
        return null; // Occurrence data is required
      }
      
      return {
        strong: strongMatch ? strongMatch[1] : undefined,
        lemma: lemmaMatch ? lemmaMatch[1] : undefined,
        morph: morphMatch ? morphMatch[1] : undefined,
        occurrence: parseInt(occurrenceMatch[1]),
        occurrences: parseInt(occurrencesMatch[1]),
        originalWord: lemmaMatch ? lemmaMatch[1] : undefined,
        gatewayWords: [] // Will be filled by extractGatewayWords
      };
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Extract gateway words from aligned text
   */
  private extractGatewayWords(alignedText: string): string[] {
    const words: string[] = [];
    
    // Find \w markers: \w word|x-occurrence="1" x-occurrences="1"\w*
    const wordRegex = /\\w\s+([^|\\]+)(?:\|[^\\]*?)?\\w\*/g;
    let match;
    
    while ((match = wordRegex.exec(alignedText)) !== null) {
      const word = match[1].trim();
      if (word) {
        words.push(word);
      }
    }
    
    // If no \w markers found, extract plain text
    if (words.length === 0) {
      const plainText = alignedText
        .replace(/\\w\s*([^\\]*?)\\w\*/g, '$1')
        .replace(/\|[^\\]*?(?=\\|$)/g, '')
        .trim();
      
      if (plainText) {
        words.push(...plainText.split(/\s+/).filter(w => w.length > 0));
      }
    }
    
    return words;
  }
  
  /**
   * Build full content string from chapters
   */
  private buildFullContent(chapters: ProcessedChapter[]): string {
    return chapters
      .map(chapter => 
        chapter.verses
          .map(verse => verse.text)
          .join(' ')
      )
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

// Export singleton instance
export const usfmParser = new USFMParser();
