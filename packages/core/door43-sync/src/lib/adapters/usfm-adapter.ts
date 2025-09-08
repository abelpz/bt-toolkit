/**
 * USFM Format Adapter
 * Handles round-trip conversion between USFM and JSON
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import { 
  BaseFormatAdapter, 
  ConversionContext, 
  ConversionResult,
  ResourceFormat 
} from '../format-adapter-system.js';

// ============================================================================
// USFM Types
// ============================================================================

/**
 * USFM verse structure
 */
export interface UsfmVerse {
  /** Verse number */
  verse: string;
  /** Verse content */
  content: string;
  /** Verse markers */
  markers?: string[];
}

/**
 * USFM chapter structure
 */
export interface UsfmChapter {
  /** Chapter number */
  chapter: string;
  /** Chapter verses */
  verses: UsfmVerse[];
  /** Chapter markers */
  markers?: string[];
}

/**
 * USFM book structure (JSON representation)
 */
export interface UsfmBookJson {
  /** Book identifier */
  book: string;
  /** Book name */
  name?: string;
  /** Book chapters */
  chapters: UsfmChapter[];
  /** Book headers */
  headers?: Record<string, string>;
  /** Book metadata */
  metadata?: Record<string, any>;
}

// ============================================================================
// USFM Adapter
// ============================================================================

/**
 * USFM Format Adapter
 * Converts between USFM text format and structured JSON
 */
export class UsfmFormatAdapter extends BaseFormatAdapter {
  readonly id = 'usfm-adapter';
  readonly supportedFormats: ResourceFormat[] = ['usfm'];
  readonly supportedResourceTypes: string[] = []; // Supports all resource types
  readonly version = '1.0.0';
  readonly description = 'USFM to JSON round-trip converter';
  readonly priority = 100;

  /**
   * Convert USFM to JSON
   */
  async toJson(content: string, context: ConversionContext): AsyncResult<ConversionResult> {
    try {
      console.log('📖 Converting USFM to JSON...');
      
      const usfmData = this.parseUsfm(content);
      const jsonContent = this.stringifyJson(usfmData, true);
      
      const result = this.createResult(jsonContent, {
        originalFormat: 'usfm',
        resourceType: context.resourceType,
        conversionTimestamp: new Date().toISOString()
      });

      return { success: true, data: result };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'USFM to JSON conversion failed'
      };
    }
  }

  /**
   * Convert JSON to USFM
   */
  async fromJson(jsonContent: string, context: ConversionContext): AsyncResult<ConversionResult> {
    try {
      console.log('📝 Converting JSON to USFM...');
      
      const usfmData = this.parseJson(jsonContent) as UsfmBookJson;
      const usfmContent = this.generateUsfm(usfmData);
      
      const result = this.createResult(usfmContent, {
        targetFormat: 'usfm',
        resourceType: context.resourceType,
        conversionTimestamp: new Date().toISOString()
      });

      return { success: true, data: result };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'JSON to USFM conversion failed'
      };
    }
  }

  /**
   * Validate USFM content
   */
  async validate(content: string, format: ResourceFormat): AsyncResult<boolean> {
    try {
      if (format === 'usfm') {
        // Basic USFM validation
        const hasBookMarker = /\\id\s+\w+/.test(content);
        const hasChapterMarker = /\\c\s+\d+/.test(content);
        const hasVerseMarker = /\\v\s+\d+/.test(content);
        
        const isValid = hasBookMarker && (hasChapterMarker || hasVerseMarker);
        return { success: true, data: isValid };
      }
      
      if (format === 'json') {
        const data = this.parseJson(content);
        const isValid = data && typeof data === 'object' && 
                        'book' in data && 'chapters' in data;
        return { success: true, data: isValid };
      }

      return { success: true, data: false };

    } catch (error) {
      return { success: true, data: false };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Parse USFM content into structured data
   */
  private parseUsfm(content: string): UsfmBookJson {
    const lines = content.split('\n');
    const result: UsfmBookJson = {
      book: '',
      chapters: [],
      headers: {},
      metadata: {}
    };

    let currentChapter: UsfmChapter | null = null;
    let currentVerse: UsfmVerse | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Book identifier
      if (trimmedLine.startsWith('\\id ')) {
        result.book = trimmedLine.substring(4).split(' ')[0];
        continue;
      }

      // Headers
      if (trimmedLine.startsWith('\\h ')) {
        result.headers!['title'] = trimmedLine.substring(3);
        continue;
      }

      if (trimmedLine.startsWith('\\toc1 ')) {
        result.headers!['longTitle'] = trimmedLine.substring(6);
        continue;
      }

      if (trimmedLine.startsWith('\\toc2 ')) {
        result.headers!['shortTitle'] = trimmedLine.substring(6);
        continue;
      }

      if (trimmedLine.startsWith('\\toc3 ')) {
        result.headers!['abbreviation'] = trimmedLine.substring(6);
        continue;
      }

      // Chapter marker
      if (trimmedLine.startsWith('\\c ')) {
        // Save previous chapter
        if (currentChapter) {
          if (currentVerse) {
            currentChapter.verses.push(currentVerse);
            currentVerse = null;
          }
          result.chapters.push(currentChapter);
        }

        // Start new chapter
        currentChapter = {
          chapter: trimmedLine.substring(3).trim(),
          verses: [],
          markers: []
        };
        continue;
      }

      // Verse marker
      if (trimmedLine.startsWith('\\v ')) {
        // Save previous verse
        if (currentVerse && currentChapter) {
          currentChapter.verses.push(currentVerse);
        }

        // Start new verse
        const verseMatch = trimmedLine.match(/\\v\s+(\d+(?:-\d+)?)\s*(.*)/);
        if (verseMatch) {
          currentVerse = {
            verse: verseMatch[1],
            content: verseMatch[2] || '',
            markers: []
          };
        }
        continue;
      }

      // Verse content continuation
      if (currentVerse && !trimmedLine.startsWith('\\')) {
        currentVerse.content += (currentVerse.content ? ' ' : '') + trimmedLine;
        continue;
      }

      // Other markers
      if (trimmedLine.startsWith('\\')) {
        const marker = trimmedLine.split(' ')[0];
        if (currentVerse) {
          currentVerse.markers = currentVerse.markers || [];
          currentVerse.markers.push(marker);
        } else if (currentChapter) {
          currentChapter.markers = currentChapter.markers || [];
          currentChapter.markers.push(marker);
        }
      }
    }

    // Save final verse and chapter
    if (currentVerse && currentChapter) {
      currentChapter.verses.push(currentVerse);
    }
    if (currentChapter) {
      result.chapters.push(currentChapter);
    }

    return result;
  }

  /**
   * Generate USFM content from structured data
   */
  private generateUsfm(data: UsfmBookJson): string {
    const lines: string[] = [];

    // Book identifier
    if (data.book) {
      lines.push(`\\id ${data.book}`);
    }

    // Headers
    if (data.headers) {
      if (data.headers.title) {
        lines.push(`\\h ${data.headers.title}`);
      }
      if (data.headers.longTitle) {
        lines.push(`\\toc1 ${data.headers.longTitle}`);
      }
      if (data.headers.shortTitle) {
        lines.push(`\\toc2 ${data.headers.shortTitle}`);
      }
      if (data.headers.abbreviation) {
        lines.push(`\\toc3 ${data.headers.abbreviation}`);
      }
    }

    // Add blank line after headers
    lines.push('');

    // Chapters
    for (const chapter of data.chapters) {
      // Chapter marker
      lines.push(`\\c ${chapter.chapter}`);
      
      // Chapter markers
      if (chapter.markers) {
        lines.push(...chapter.markers);
      }

      // Verses
      for (const verse of chapter.verses) {
        const verseLine = `\\v ${verse.verse} ${verse.content}`;
        lines.push(verseLine);
        
        // Verse markers
        if (verse.markers) {
          lines.push(...verse.markers);
        }
      }

      // Add blank line after chapter
      lines.push('');
    }

    return lines.join('\n').trim();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create USFM format adapter
 */
export function createUsfmAdapter(config?: Record<string, any>): UsfmFormatAdapter {
  return new UsfmFormatAdapter();
}
