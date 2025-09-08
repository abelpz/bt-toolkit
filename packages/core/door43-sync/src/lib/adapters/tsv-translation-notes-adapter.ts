/**
 * TSV Translation Notes Adapter
 * Specialized adapter for Translation Notes TSV format
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import { 
  BaseFormatAdapter, 
  ConversionContext, 
  ConversionResult,
  ResourceFormat 
} from '../format-adapter-system.js';

// ============================================================================
// Translation Notes Types
// ============================================================================

/**
 * Translation Notes TSV row structure
 */
export interface TranslationNotesRow {
  /** Book identifier */
  Book: string;
  /** Chapter number */
  Chapter: string;
  /** Verse number */
  Verse: string;
  /** Note ID */
  ID: string;
  /** Support reference (rc://star/ta/man/translate/...) */
  SupportReference: string;
  /** Original quote */
  OriginalQuote: string;
  /** Occurrence number */
  Occurrence: string;
  /** GL quote */
  GLQuote: string;
  /** Occurrence note */
  OccurrenceNote: string;
}

/**
 * Translation Notes JSON structure
 */
export interface TranslationNotesJson {
  /** Resource metadata */
  metadata: {
    resourceType: 'translation-notes';
    format: 'tsv';
    version: string;
    language: string;
    book?: string;
  };
  /** Translation notes grouped by chapter and verse */
  notes: {
    [chapter: string]: {
      [verse: string]: TranslationNotesRow[];
    };
  };
  /** Raw notes array for processing */
  rawNotes: TranslationNotesRow[];
  /** Statistics */
  statistics: {
    totalNotes: number;
    chaptersCount: number;
    versesCount: number;
  };
}

// ============================================================================
// Translation Notes TSV Adapter
// ============================================================================

/**
 * Translation Notes TSV Adapter
 * Specialized for Door43 Translation Notes TSV format
 */
export class TsvTranslationNotesAdapter extends BaseFormatAdapter {
  readonly id = 'tsv-translation-notes-adapter';
  readonly supportedFormats: ResourceFormat[] = ['tsv'];
  readonly supportedResourceTypes = ['translation-notes'];
  readonly version = '1.0.0';
  readonly description = 'Translation Notes TSV to JSON converter';
  readonly priority = 200; // Higher priority than generic TSV adapter

  /**
   * Convert Translation Notes TSV to JSON
   */
  async toJson(content: string, context: ConversionContext): AsyncResult<ConversionResult> {
    try {
      console.log('📖 Converting Translation Notes TSV to JSON...');
      
      const notesData = this.parseTranslationNotesTsv(content, context);
      const jsonContent = this.stringifyJson(notesData, true);
      
      const result = this.createResult(jsonContent, {
        originalFormat: 'tsv',
        resourceType: 'translation-notes',
        conversionTimestamp: new Date().toISOString(),
        totalNotes: notesData.statistics.totalNotes,
        chaptersCount: notesData.statistics.chaptersCount
      });

      return { success: true, data: result };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Translation Notes TSV to JSON conversion failed'
      };
    }
  }

  /**
   * Convert JSON to Translation Notes TSV
   */
  async fromJson(jsonContent: string, context: ConversionContext): AsyncResult<ConversionResult> {
    try {
      console.log('📝 Converting JSON to Translation Notes TSV...');
      
      const notesData = this.parseJson(jsonContent) as TranslationNotesJson;
      const tsvContent = this.generateTranslationNotesTsv(notesData, context);
      
      const result = this.createResult(tsvContent, {
        targetFormat: 'tsv',
        resourceType: 'translation-notes',
        conversionTimestamp: new Date().toISOString(),
        totalNotes: notesData.statistics.totalNotes
      });

      return { success: true, data: result };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'JSON to Translation Notes TSV conversion failed'
      };
    }
  }

  /**
   * Validate Translation Notes content
   */
  async validate(content: string, format: ResourceFormat): AsyncResult<boolean> {
    try {
      if (format === 'tsv') {
        // Check for Translation Notes specific headers
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) return { success: true, data: false };
        
        const headers = lines[0].split('\t');
        const requiredHeaders = ['Book', 'Chapter', 'Verse', 'ID', 'SupportReference', 'OriginalQuote', 'Occurrence', 'GLQuote', 'OccurrenceNote'];
        
        const hasRequiredHeaders = requiredHeaders.every(header => headers.includes(header));
        return { success: true, data: hasRequiredHeaders };
      }
      
      if (format === 'json') {
        const data = this.parseJson(content);
        const isValid = data && 
                        data.metadata?.resourceType === 'translation-notes' &&
                        data.notes && 
                        data.rawNotes &&
                        Array.isArray(data.rawNotes);
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
   * Parse Translation Notes TSV content
   */
  private parseTranslationNotesTsv(content: string, context: ConversionContext): TranslationNotesJson {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length === 0) {
      throw new Error('Empty Translation Notes TSV content');
    }

    const headers = lines[0].split('\t');
    const requiredHeaders = ['Book', 'Chapter', 'Verse', 'ID', 'SupportReference', 'OriginalQuote', 'Occurrence', 'GLQuote', 'OccurrenceNote'];
    
    // Validate headers
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    const rawNotes: TranslationNotesRow[] = [];
    const notes: { [chapter: string]: { [verse: string]: TranslationNotesRow[] } } = {};
    const chapters = new Set<string>();
    const verses = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const values = line.split('\t');
      
      // Create note object
      const note: TranslationNotesRow = {
        Book: values[headers.indexOf('Book')] || '',
        Chapter: values[headers.indexOf('Chapter')] || '',
        Verse: values[headers.indexOf('Verse')] || '',
        ID: values[headers.indexOf('ID')] || '',
        SupportReference: values[headers.indexOf('SupportReference')] || '',
        OriginalQuote: values[headers.indexOf('OriginalQuote')] || '',
        Occurrence: values[headers.indexOf('Occurrence')] || '',
        GLQuote: values[headers.indexOf('GLQuote')] || '',
        OccurrenceNote: values[headers.indexOf('OccurrenceNote')] || ''
      };

      rawNotes.push(note);
      chapters.add(note.Chapter);
      verses.add(`${note.Chapter}:${note.Verse}`);

      // Group by chapter and verse
      if (!notes[note.Chapter]) {
        notes[note.Chapter] = {};
      }
      if (!notes[note.Chapter][note.Verse]) {
        notes[note.Chapter][note.Verse] = [];
      }
      notes[note.Chapter][note.Verse].push(note);
    }

    return {
      metadata: {
        resourceType: 'translation-notes',
        format: 'tsv',
        version: '1.0',
        language: context.metadata?.language || 'en',
        book: rawNotes[0]?.Book
      },
      notes,
      rawNotes,
      statistics: {
        totalNotes: rawNotes.length,
        chaptersCount: chapters.size,
        versesCount: verses.size
      }
    };
  }

  /**
   * Generate Translation Notes TSV from JSON
   */
  private generateTranslationNotesTsv(data: TranslationNotesJson, context: ConversionContext): string {
    const headers = ['Book', 'Chapter', 'Verse', 'ID', 'SupportReference', 'OriginalQuote', 'Occurrence', 'GLQuote', 'OccurrenceNote'];
    const lines: string[] = [];

    // Add headers
    lines.push(headers.join('\t'));

    // Sort notes by chapter and verse for consistent output
    const sortedNotes = data.rawNotes.sort((a, b) => {
      const chapterA = parseInt(a.Chapter) || 0;
      const chapterB = parseInt(b.Chapter) || 0;
      if (chapterA !== chapterB) return chapterA - chapterB;
      
      const verseA = parseInt(a.Verse) || 0;
      const verseB = parseInt(b.Verse) || 0;
      return verseA - verseB;
    });

    // Add rows
    for (const note of sortedNotes) {
      const values = headers.map(header => {
        const value = note[header as keyof TranslationNotesRow] || '';
        // Escape tabs and newlines in values
        return value.replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
      });
      lines.push(values.join('\t'));
    }

    return lines.join('\n');
  }

  /**
   * Process support reference for Translation Academy integration
   */
  private processSupportReference(supportReference: string): {
    taPath?: string;
    category?: string;
    article?: string;
  } {
    // Parse rc://*/ta/man/translate/figs-abstractnouns format
    const match = supportReference.match(/rc:\/\/\*\/ta\/man\/([^\/]+)\/([^\/]+)/);
    
    if (match) {
      const [, category, article] = match;
      return {
        taPath: `/${category}/${article}`,
        category,
        article
      };
    }
    
    return {};
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create Translation Notes TSV adapter
 */
export function createTsvTranslationNotesAdapter(config?: Record<string, any>): TsvTranslationNotesAdapter {
  return new TsvTranslationNotesAdapter();
}
