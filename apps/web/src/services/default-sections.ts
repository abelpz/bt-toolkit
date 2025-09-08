/**
 * Default Translator Sections Service
 * 
 * This service provides access to default translator sections extracted from
 * the unfoldingWord/en_ult repository. These sections serve as a baseline
 * and are available even when other section types are present.
 * 
 * Uses dynamic imports to avoid bloating the app bundle - sections are only
 * loaded when requested for a specific book.
 */

import type { TranslatorSection } from './usfm-processor';

// Static metadata that doesn't bloat the bundle
export interface BookMetadata {
  bookCode: string;
  bookName: string;
  sectionsCount: number;
  extractedAt: string;
  error?: string;
}

// Book metadata without sections (lightweight)
const availableBooks: Array<{ bookCode: string; bookName: string; sectionsCount: number }> = [
  { bookCode: 'GEN', bookName: 'Genesis', sectionsCount: 635 },
  { bookCode: 'EXO', bookName: 'Exodus', sectionsCount: 507 },
  { bookCode: 'LEV', bookName: 'Leviticus', sectionsCount: 347 },
  { bookCode: 'NUM', bookName: 'Numbers', sectionsCount: 542 },
  { bookCode: 'DEU', bookName: 'Deuteronomy', sectionsCount: 473 },
  { bookCode: 'JOS', bookName: 'Joshua', sectionsCount: 139 },
  { bookCode: 'JDG', bookName: 'Judges', sectionsCount: 0 },
  { bookCode: 'RUT', bookName: 'Ruth', sectionsCount: 38 },
  { bookCode: '1SA', bookName: '1 Samuel', sectionsCount: 346 },
  { bookCode: '2SA', bookName: '2 Samuel', sectionsCount: 410 },
  { bookCode: '1KI', bookName: '1 Kings', sectionsCount: 356 },
  { bookCode: '2KI', bookName: '2 Kings', sectionsCount: 311 },
  { bookCode: '1CH', bookName: '1 Chronicles', sectionsCount: 357 },
  { bookCode: '2CH', bookName: '2 Chronicles', sectionsCount: 373 },
  { bookCode: 'EZR', bookName: 'Ezra', sectionsCount: 94 },
  { bookCode: 'NEH', bookName: 'Nehemiah', sectionsCount: 144 },
  { bookCode: 'EST', bookName: 'Esther', sectionsCount: 71 },
  { bookCode: 'JOB', bookName: 'Job', sectionsCount: 434 },
  { bookCode: 'PSA', bookName: 'Psalms', sectionsCount: 1127 },
  { bookCode: 'PRO', bookName: 'Proverbs', sectionsCount: 418 },
  { bookCode: 'ECC', bookName: 'Ecclesiastes', sectionsCount: 112 },
  { bookCode: 'SNG', bookName: 'Song of Songs', sectionsCount: 81 },
  { bookCode: 'ISA', bookName: 'Isaiah', sectionsCount: 431 },
  { bookCode: 'JER', bookName: 'Jeremiah', sectionsCount: 551 },
  { bookCode: 'LAM', bookName: 'Lamentations', sectionsCount: 67 },
  { bookCode: 'EZK', bookName: 'Ezekiel', sectionsCount: 550 },
  { bookCode: 'DAN', bookName: 'Daniel', sectionsCount: 175 },
  { bookCode: 'HOS', bookName: 'Hosea', sectionsCount: 101 },
  { bookCode: 'JOL', bookName: 'Joel', sectionsCount: 36 },
  { bookCode: 'AMO', bookName: 'Amos', sectionsCount: 77 },
  { bookCode: 'OBA', bookName: 'Obadiah', sectionsCount: 9 },
  { bookCode: 'JON', bookName: 'Jonah', sectionsCount: 22 },
  { bookCode: 'MIC', bookName: 'Micah', sectionsCount: 51 },
  { bookCode: 'NAM', bookName: 'Nahum', sectionsCount: 26 },
  { bookCode: 'HAB', bookName: 'Habakkuk', sectionsCount: 29 },
  { bookCode: 'ZEP', bookName: 'Zephaniah', sectionsCount: 0 },
  { bookCode: 'HAG', bookName: 'Haggai', sectionsCount: 14 },
  { bookCode: 'ZEC', bookName: 'Zechariah', sectionsCount: 94 },
  { bookCode: 'MAL', bookName: 'Malachi', sectionsCount: 24 },
  { bookCode: 'MAT', bookName: 'Matthew', sectionsCount: 430 },
  { bookCode: 'MRK', bookName: 'Mark', sectionsCount: 269 },
  { bookCode: 'LUK', bookName: 'Luke', sectionsCount: 491 },
  { bookCode: 'JHN', bookName: 'John', sectionsCount: 362 },
  { bookCode: 'ACT', bookName: 'Acts', sectionsCount: 399 },
  { bookCode: 'ROM', bookName: 'Romans', sectionsCount: 197 },
  { bookCode: '1CO', bookName: '1 Corinthians', sectionsCount: 178 },
  { bookCode: '2CO', bookName: '2 Corinthians', sectionsCount: 110 },
  { bookCode: 'GAL', bookName: 'Galatians', sectionsCount: 59 },
  { bookCode: 'EPH', bookName: 'Ephesians', sectionsCount: 61 },
  { bookCode: 'PHP', bookName: 'Philippians', sectionsCount: 37 },
  { bookCode: 'COL', bookName: 'Colossians', sectionsCount: 35 },
  { bookCode: '1TH', bookName: '1 Thessalonians', sectionsCount: 32 },
  { bookCode: '2TH', bookName: '2 Thessalonians', sectionsCount: 18 },
  { bookCode: '1TI', bookName: '1 Timothy', sectionsCount: 0 },
  { bookCode: '2TI', bookName: '2 Timothy', sectionsCount: 0 },
  { bookCode: 'TIT', bookName: 'Titus', sectionsCount: 23 },
  { bookCode: 'PHM', bookName: 'Philemon', sectionsCount: 8 },
  { bookCode: 'HEB', bookName: 'Hebrews', sectionsCount: 122 },
  { bookCode: 'JAS', bookName: 'James', sectionsCount: 0 },
  { bookCode: '1PE', bookName: '1 Peter', sectionsCount: 43 },
  { bookCode: '2PE', bookName: '2 Peter', sectionsCount: 24 },
  { bookCode: '1JN', bookName: '1 John', sectionsCount: 0 },
  { bookCode: '2JN', bookName: '2 John', sectionsCount: 5 },
  { bookCode: '3JN', bookName: '3 John', sectionsCount: 5 },
  { bookCode: 'JUD', bookName: 'Jude', sectionsCount: 11 },
  { bookCode: 'REV', bookName: 'Revelation', sectionsCount: 190 },
];

const extractionMetadata = {
  extractedAt: '2025-08-24T14:26:16.686Z',
  source: {
    owner: 'unfoldingWord',
    repository: 'en_ult',
    apiBase: 'https://git.door43.org/unfoldingWord/en_ult/raw/branch/master'
  },
  totalBooks: 66,
  booksWithSections: 60,
  totalSections: 12681
};

export class DefaultSectionsService {
  private sectionsCache = new Map<string, TranslatorSection[]>();

  /**
   * Get default translator sections for a specific book using dynamic imports
   */
  async getDefaultSections(bookCode: string): Promise<TranslatorSection[]> {
    const upperBookCode = bookCode.toUpperCase();
    
    // Check cache first
    if (this.sectionsCache.has(upperBookCode)) {
      const cached = this.sectionsCache.get(upperBookCode)!;
      console.log(`📚 Using cached ${cached.length} default sections for ${upperBookCode}`);
      return cached;
    }

    // Check if book has sections
    const bookInfo = availableBooks.find(book => book.bookCode === upperBookCode);
    if (!bookInfo || bookInfo.sectionsCount === 0) {
      console.log(`📚 No default sections available for ${upperBookCode}`);
      this.sectionsCache.set(upperBookCode, []);
      return [];
    }

    try {
      // Dynamic import based on book code
      const fileName = upperBookCode.toLowerCase();
      const module = await this.dynamicImportBook(fileName);
      
      if (module && module.sections) {
        console.log(`📚 Dynamically loaded ${module.sections.length} default sections for ${upperBookCode}`);
        this.sectionsCache.set(upperBookCode, module.sections);
        return module.sections;
      } else {
        console.warn(`⚠️ No sections found in dynamically imported module for ${upperBookCode}`);
        this.sectionsCache.set(upperBookCode, []);
        return [];
      }
    } catch (error) {
      console.error(`❌ Failed to dynamically load default sections for ${upperBookCode}:`, error);
      this.sectionsCache.set(upperBookCode, []);
      return [];
    }
  }

  /**
   * Dynamic import helper that handles different book naming patterns
   */
  private async dynamicImportBook(fileName: string): Promise<{ sections: TranslatorSection[]; metadata: BookMetadata } | null> {
    try {
      // Handle books that start with numbers (they have 'book' prefix in exports)
      const startsWithNumber = /^[0-9]/.test(fileName);
      const exportPrefix = startsWithNumber ? `book${fileName}` : fileName;
      
      const module = await import(`../data/default-sections/${fileName}.js`);
      
      return {
        sections: module[`${exportPrefix}Sections`] || [],
        metadata: module[`${exportPrefix}Metadata`] || null
      };
    } catch (error) {
      console.error(`Failed to import ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Get basic metadata for a specific book (lightweight, no dynamic import needed)
   */
  getBookMetadata(bookCode: string): { bookCode: string; bookName: string; sectionsCount: number } | null {
    const upperBookCode = bookCode.toUpperCase();
    return availableBooks.find(book => book.bookCode === upperBookCode) || null;
  }

  /**
   * Get detailed metadata for a specific book (includes extractedAt, error info)
   * Uses dynamic import to get full metadata from the book module
   */
  async getDetailedBookMetadata(bookCode: string): Promise<BookMetadata | null> {
    const upperBookCode = bookCode.toUpperCase();
    
    try {
      const fileName = upperBookCode.toLowerCase();
      const module = await this.dynamicImportBook(fileName);
      
      if (module && module.metadata) {
        return module.metadata;
      }
      
      // Fallback to basic metadata
      const basic = this.getBookMetadata(upperBookCode);
      if (basic) {
        return {
          ...basic,
          extractedAt: extractionMetadata.extractedAt
        };
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Failed to load detailed metadata for ${upperBookCode}:`, error);
      return null;
    }
  }

  /**
   * Check if default sections are available for a book (lightweight check)
   */
  hasDefaultSections(bookCode: string): boolean {
    const bookInfo = this.getBookMetadata(bookCode);
    return bookInfo ? bookInfo.sectionsCount > 0 : false;
  }

  /**
   * Get list of all available books with section counts (lightweight)
   */
  getAvailableBooks(): Array<{ bookCode: string; bookName: string; sectionsCount: number }> {
    return [...availableBooks]; // Return a copy to prevent mutations
  }

  /**
   * Get extraction metadata (lightweight)
   */
  getExtractionMetadata() {
    return { ...extractionMetadata }; // Return a copy to prevent mutations
  }

  /**
   * Get books that have sections (non-zero section count) - lightweight
   */
  getBooksWithSections(): Array<{ bookCode: string; bookName: string; sectionsCount: number }> {
    return availableBooks.filter(book => book.sectionsCount > 0);
  }

  /**
   * Get books that don't have sections (zero section count) - lightweight
   */
  getBooksWithoutSections(): Array<{ bookCode: string; bookName: string; sectionsCount: number }> {
    return availableBooks.filter(book => book.sectionsCount === 0);
  }

  /**
   * Get total statistics (lightweight)
   */
  getStatistics() {
    const booksWithSections = this.getBooksWithSections();
    const booksWithoutSections = this.getBooksWithoutSections();
    
    return {
      totalBooks: availableBooks.length,
      booksWithSections: booksWithSections.length,
      booksWithoutSections: booksWithoutSections.length,
      totalSections: extractionMetadata.totalSections,
      extractedAt: extractionMetadata.extractedAt,
      source: extractionMetadata.source
    };
  }

  /**
   * Clear the sections cache (useful for memory management)
   */
  clearCache(): void {
    this.sectionsCache.clear();
    console.log('🧹 Cleared default sections cache');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const cachedBooks = Array.from(this.sectionsCache.keys());
    const totalCachedSections = Array.from(this.sectionsCache.values())
      .reduce((sum, sections) => sum + sections.length, 0);
    
    return {
      cachedBooks: cachedBooks.length,
      cachedBookCodes: cachedBooks,
      totalCachedSections
    };
  }
}

// Create a singleton instance
export const defaultSectionsService = new DefaultSectionsService();

// Export types for convenience
export type { BookMetadata, TranslatorSection };