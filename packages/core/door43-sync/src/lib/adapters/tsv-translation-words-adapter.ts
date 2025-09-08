/**
 * TSV Translation Words Adapter
 * Specialized adapter for Translation Words TSV format
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import { 
  BaseFormatAdapter, 
  ConversionContext, 
  ConversionResult,
  ResourceFormat 
} from '../format-adapter-system.js';

// ============================================================================
// Translation Words Types
// ============================================================================

/**
 * Translation Words TSV row structure
 */
export interface TranslationWordsRow {
  /** Book identifier */
  Book: string;
  /** Chapter number */
  Chapter: string;
  /** Verse number */
  Verse: string;
  /** Word ID */
  ID: string;
  /** Occurrence number */
  Occurrence: string;
  /** GL quote */
  GLQuote: string;
}

/**
 * Translation Words JSON structure
 */
export interface TranslationWordsJson {
  /** Resource metadata */
  metadata: {
    resourceType: 'translation-words';
    format: 'tsv';
    version: string;
    language: string;
    book?: string;
  };
  /** Translation words grouped by chapter and verse */
  words: {
    [chapter: string]: {
      [verse: string]: TranslationWordsRow[];
    };
  };
  /** Raw words array for processing */
  rawWords: TranslationWordsRow[];
  /** Word frequency analysis */
  wordFrequency: {
    [wordId: string]: {
      id: string;
      totalOccurrences: number;
      chapters: string[];
      verses: string[];
    };
  };
  /** Statistics */
  statistics: {
    totalWords: number;
    uniqueWords: number;
    chaptersCount: number;
    versesCount: number;
  };
}

// ============================================================================
// Translation Words TSV Adapter
// ============================================================================

/**
 * Translation Words TSV Adapter
 * Specialized for Door43 Translation Words TSV format
 */
export class TsvTranslationWordsAdapter extends BaseFormatAdapter {
  readonly id = 'tsv-translation-words-adapter';
  readonly supportedFormats: ResourceFormat[] = ['tsv'];
  readonly supportedResourceTypes = ['translation-words'];
  readonly version = '1.0.0';
  readonly description = 'Translation Words TSV to JSON converter';
  readonly priority = 200; // Higher priority than generic TSV adapter

  /**
   * Convert Translation Words TSV to JSON
   */
  async toJson(content: string, context: ConversionContext): AsyncResult<ConversionResult> {
    try {
      console.log('📖 Converting Translation Words TSV to JSON...');
      
      const wordsData = this.parseTranslationWordsTsv(content, context);
      const jsonContent = this.stringifyJson(wordsData, true);
      
      const result = this.createResult(jsonContent, {
        originalFormat: 'tsv',
        resourceType: 'translation-words',
        conversionTimestamp: new Date().toISOString(),
        totalWords: wordsData.statistics.totalWords,
        uniqueWords: wordsData.statistics.uniqueWords
      });

      return { success: true, data: result };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Translation Words TSV to JSON conversion failed'
      };
    }
  }

  /**
   * Convert JSON to Translation Words TSV
   */
  async fromJson(jsonContent: string, context: ConversionContext): AsyncResult<ConversionResult> {
    try {
      console.log('📝 Converting JSON to Translation Words TSV...');
      
      const wordsData = this.parseJson(jsonContent) as TranslationWordsJson;
      const tsvContent = this.generateTranslationWordsTsv(wordsData, context);
      
      const result = this.createResult(tsvContent, {
        targetFormat: 'tsv',
        resourceType: 'translation-words',
        conversionTimestamp: new Date().toISOString(),
        totalWords: wordsData.statistics.totalWords
      });

      return { success: true, data: result };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'JSON to Translation Words TSV conversion failed'
      };
    }
  }

  /**
   * Validate Translation Words content
   */
  async validate(content: string, format: ResourceFormat): AsyncResult<boolean> {
    try {
      if (format === 'tsv') {
        // Check for Translation Words specific headers
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) return { success: true, data: false };
        
        const headers = lines[0].split('\t');
        const requiredHeaders = ['Book', 'Chapter', 'Verse', 'ID', 'Occurrence', 'GLQuote'];
        
        const hasRequiredHeaders = requiredHeaders.every(header => headers.includes(header));
        return { success: true, data: hasRequiredHeaders };
      }
      
      if (format === 'json') {
        const data = this.parseJson(content);
        const isValid = data && 
                        data.metadata?.resourceType === 'translation-words' &&
                        data.words && 
                        data.rawWords &&
                        Array.isArray(data.rawWords);
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
   * Parse Translation Words TSV content
   */
  private parseTranslationWordsTsv(content: string, context: ConversionContext): TranslationWordsJson {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length === 0) {
      throw new Error('Empty Translation Words TSV content');
    }

    const headers = lines[0].split('\t');
    const requiredHeaders = ['Book', 'Chapter', 'Verse', 'ID', 'Occurrence', 'GLQuote'];
    
    // Validate headers
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    const rawWords: TranslationWordsRow[] = [];
    const words: { [chapter: string]: { [verse: string]: TranslationWordsRow[] } } = {};
    const wordFrequency: { [wordId: string]: any } = {};
    const chapters = new Set<string>();
    const verses = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const values = line.split('\t');
      
      // Create word object
      const word: TranslationWordsRow = {
        Book: values[headers.indexOf('Book')] || '',
        Chapter: values[headers.indexOf('Chapter')] || '',
        Verse: values[headers.indexOf('Verse')] || '',
        ID: values[headers.indexOf('ID')] || '',
        Occurrence: values[headers.indexOf('Occurrence')] || '',
        GLQuote: values[headers.indexOf('GLQuote')] || ''
      };

      rawWords.push(word);
      chapters.add(word.Chapter);
      verses.add(`${word.Chapter}:${word.Verse}`);

      // Group by chapter and verse
      if (!words[word.Chapter]) {
        words[word.Chapter] = {};
      }
      if (!words[word.Chapter][word.Verse]) {
        words[word.Chapter][word.Verse] = [];
      }
      words[word.Chapter][word.Verse].push(word);

      // Track word frequency
      if (!wordFrequency[word.ID]) {
        wordFrequency[word.ID] = {
          id: word.ID,
          totalOccurrences: 0,
          chapters: new Set<string>(),
          verses: new Set<string>()
        };
      }
      wordFrequency[word.ID].totalOccurrences++;
      wordFrequency[word.ID].chapters.add(word.Chapter);
      wordFrequency[word.ID].verses.add(`${word.Chapter}:${word.Verse}`);
    }

    // Convert sets to arrays for JSON serialization
    const processedWordFrequency: { [wordId: string]: any } = {};
    for (const [wordId, freq] of Object.entries(wordFrequency)) {
      processedWordFrequency[wordId] = {
        id: freq.id,
        totalOccurrences: freq.totalOccurrences,
        chapters: Array.from(freq.chapters),
        verses: Array.from(freq.verses)
      };
    }

    return {
      metadata: {
        resourceType: 'translation-words',
        format: 'tsv',
        version: '1.0',
        language: context.metadata?.language || 'en',
        book: rawWords[0]?.Book
      },
      words,
      rawWords,
      wordFrequency: processedWordFrequency,
      statistics: {
        totalWords: rawWords.length,
        uniqueWords: Object.keys(wordFrequency).length,
        chaptersCount: chapters.size,
        versesCount: verses.size
      }
    };
  }

  /**
   * Generate Translation Words TSV from JSON
   */
  private generateTranslationWordsTsv(data: TranslationWordsJson, context: ConversionContext): string {
    const headers = ['Book', 'Chapter', 'Verse', 'ID', 'Occurrence', 'GLQuote'];
    const lines: string[] = [];

    // Add headers
    lines.push(headers.join('\t'));

    // Sort words by chapter and verse for consistent output
    const sortedWords = data.rawWords.sort((a, b) => {
      const chapterA = parseInt(a.Chapter) || 0;
      const chapterB = parseInt(b.Chapter) || 0;
      if (chapterA !== chapterB) return chapterA - chapterB;
      
      const verseA = parseInt(a.Verse) || 0;
      const verseB = parseInt(b.Verse) || 0;
      if (verseA !== verseB) return verseA - verseB;
      
      // Sort by ID for consistent ordering within same verse
      return a.ID.localeCompare(b.ID);
    });

    // Add rows
    for (const word of sortedWords) {
      const values = headers.map(header => {
        const value = word[header as keyof TranslationWordsRow] || '';
        // Escape tabs and newlines in values
        return value.replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
      });
      lines.push(values.join('\t'));
    }

    return lines.join('\n');
  }

  /**
   * Get word statistics for analysis
   */
  getWordStatistics(data: TranslationWordsJson): {
    mostFrequentWords: Array<{ id: string; occurrences: number }>;
    chaptersWithMostWords: Array<{ chapter: string; wordCount: number }>;
    averageWordsPerVerse: number;
  } {
    // Most frequent words
    const mostFrequentWords = Object.values(data.wordFrequency)
      .sort((a, b) => b.totalOccurrences - a.totalOccurrences)
      .slice(0, 10)
      .map(word => ({ id: word.id, occurrences: word.totalOccurrences }));

    // Chapters with most words
    const chapterWordCounts: { [chapter: string]: number } = {};
    for (const word of data.rawWords) {
      chapterWordCounts[word.Chapter] = (chapterWordCounts[word.Chapter] || 0) + 1;
    }
    
    const chaptersWithMostWords = Object.entries(chapterWordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([chapter, wordCount]) => ({ chapter, wordCount }));

    // Average words per verse
    const averageWordsPerVerse = data.statistics.versesCount > 0 
      ? data.statistics.totalWords / data.statistics.versesCount 
      : 0;

    return {
      mostFrequentWords,
      chaptersWithMostWords,
      averageWordsPerVerse: Math.round(averageWordsPerVerse * 100) / 100
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create Translation Words TSV adapter
 */
export function createTsvTranslationWordsAdapter(config?: Record<string, any>): TsvTranslationWordsAdapter {
  return new TsvTranslationWordsAdapter();
}
