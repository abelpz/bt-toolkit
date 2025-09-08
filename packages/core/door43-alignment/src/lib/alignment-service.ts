/**
 * Alignment Service
 * Provides word-level alignment and cross-reference capabilities
 */

import {
  ProcessedScripture,
  VerseReference,
  AlignmentReference,


  BookId,
  ServiceResult,
  IAlignmentService
} from '@bt-toolkit/door43-core';

export interface AlignmentIndex {
  /** Map from book:chapter:verse:wordIndex to AlignmentReference */
  wordIndex: Map<string, AlignmentReference>;
  /** Map from Strong's number to AlignmentReference[] */
  strongsIndex: Map<string, AlignmentReference[]>;
  /** Map from lemma to AlignmentReference[] */
  lemmaIndex: Map<string, AlignmentReference[]>;
  /** Map from book to all AlignmentReference[] in that book */
  bookIndex: Map<BookId, AlignmentReference[]>;
}

export class AlignmentService implements IAlignmentService {
  private alignmentIndex: AlignmentIndex;
  private isIndexBuilt = false;

  constructor() {
    this.alignmentIndex = {
      wordIndex: new Map(),
      strongsIndex: new Map(),
      lemmaIndex: new Map(),
      bookIndex: new Map()
    };
  }

  /**
   * Build alignment index from scripture
   */
  buildAlignmentIndex(scripture: ProcessedScripture): ServiceResult<void> {
    try {
      const startTime = Date.now();
      
      console.log(`🔍 Building alignment index for ${scripture.book}...`);
      
      // Clear existing index for this book
      this.clearBookFromIndex(scripture.book);
      
      let totalAlignments = 0;
      let totalWords = 0;
      
      // Process each chapter
      for (const chapter of scripture.chapters) {
        for (const verse of chapter.verses) {
          // Process each alignment group in the verse
          for (let groupIndex = 0; groupIndex < verse.alignments.length; groupIndex++) {
            const alignmentGroup = verse.alignments[groupIndex];
            
            // Process each word in the alignment group
            for (let wordIndex = 0; wordIndex < alignmentGroup.words.length; wordIndex++) {
              const word = alignmentGroup.words[wordIndex];
              
              const alignmentRef: AlignmentReference = {
                reference: {
                  book: scripture.book,
                  chapter: chapter.number,
                  verse: verse.number
                },
                wordIndex: alignmentGroup.startIndex + wordIndex,
                wordText: word,
                alignment: alignmentGroup.alignment
              };
              
              // Add to word index
              const wordKey = this.createWordKey(
                scripture.book,
                chapter.number,
                verse.number,
                alignmentRef.wordIndex
              );
              this.alignmentIndex.wordIndex.set(wordKey, alignmentRef);
              
              // Add to Strong's index
              if (alignmentGroup.alignment.strong) {
                const strongsRefs = this.alignmentIndex.strongsIndex.get(alignmentGroup.alignment.strong) || [];
                strongsRefs.push(alignmentRef);
                this.alignmentIndex.strongsIndex.set(alignmentGroup.alignment.strong, strongsRefs);
              }
              
              // Add to lemma index
              if (alignmentGroup.alignment.lemma) {
                const lemmaRefs = this.alignmentIndex.lemmaIndex.get(alignmentGroup.alignment.lemma) || [];
                lemmaRefs.push(alignmentRef);
                this.alignmentIndex.lemmaIndex.set(alignmentGroup.alignment.lemma, lemmaRefs);
              }
              
              // Add to book index
              const bookRefs = this.alignmentIndex.bookIndex.get(scripture.book) || [];
              bookRefs.push(alignmentRef);
              this.alignmentIndex.bookIndex.set(scripture.book, bookRefs);
              
              totalWords++;
            }
            
            totalAlignments++;
          }
        }
      }
      
      this.isIndexBuilt = true;
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Alignment index built for ${scripture.book}: ${totalAlignments} alignments, ${totalWords} words (${processingTime}ms)`);
      
      return {
        success: true,
        metadata: {
          source: 'api' as const,
          timestamp: new Date(),
          processingTimeMs: processingTime,
          totalAlignments,
          totalWords,
          book: scripture.book
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown alignment indexing error'
      };
    }
  }

  /**
   * Get alignment data for a specific word
   */
  getAlignmentData(reference: VerseReference, wordIndex: number): ServiceResult<AlignmentReference | null> {
    try {
      if (!this.isIndexBuilt) {
        return {
          success: false,
          error: 'Alignment index not built. Call buildAlignmentIndex first.'
        };
      }
      
      const wordKey = this.createWordKey(reference.book, reference.chapter, reference.verse, wordIndex);
      const alignmentRef = this.alignmentIndex.wordIndex.get(wordKey);
      
      return {
        success: true,
        data: alignmentRef || null,
        metadata: {
          source: 'api' as const,
          timestamp: new Date(),
          wordKey
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown alignment lookup error'
      };
    }
  }

  /**
   * Find words with same Strong's number
   */
  findWordsByStrongs(strongsNumber: string, book?: BookId): ServiceResult<AlignmentReference[]> {
    try {
      if (!this.isIndexBuilt) {
        return {
          success: false,
          error: 'Alignment index not built. Call buildAlignmentIndex first.'
        };
      }
      
      const allRefs = this.alignmentIndex.strongsIndex.get(strongsNumber) || [];
      
      // Filter by book if specified
      const filteredRefs = book 
        ? allRefs.filter(ref => ref.reference.book === book)
        : allRefs;
      
      return {
        success: true,
        data: filteredRefs,
        metadata: {
          source: 'api' as const,
          timestamp: new Date(),
          strongsNumber,
          book,
          totalFound: filteredRefs.length
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Strong\'s lookup error'
      };
    }
  }

  /**
   * Find words with same lemma
   */
  findWordsByLemma(lemma: string, book?: BookId): ServiceResult<AlignmentReference[]> {
    try {
      if (!this.isIndexBuilt) {
        return {
          success: false,
          error: 'Alignment index not built. Call buildAlignmentIndex first.'
        };
      }
      
      const allRefs = this.alignmentIndex.lemmaIndex.get(lemma) || [];
      
      // Filter by book if specified
      const filteredRefs = book 
        ? allRefs.filter(ref => ref.reference.book === lemma)
        : allRefs;
      
      return {
        success: true,
        data: filteredRefs,
        metadata: {
          source: 'api' as const,
          timestamp: new Date(),
          lemma,
          book,
          totalFound: filteredRefs.length
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown lemma lookup error'
      };
    }
  }

  /**
   * Get all alignment references for a book
   */
  getBookAlignments(book: BookId): ServiceResult<AlignmentReference[]> {
    try {
      if (!this.isIndexBuilt) {
        return {
          success: false,
          error: 'Alignment index not built. Call buildAlignmentIndex first.'
        };
      }
      
      const bookRefs = this.alignmentIndex.bookIndex.get(book) || [];
      
      return {
        success: true,
        data: bookRefs,
        metadata: {
          source: 'api' as const,
          timestamp: new Date(),
          book,
          totalFound: bookRefs.length
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown book alignment lookup error'
      };
    }
  }

  /**
   * Get alignment statistics
   */
  getAlignmentStats(): ServiceResult<{
    totalWords: number;
    totalAlignments: number;
    uniqueStrongs: number;
    uniqueLemmas: number;
    booksIndexed: number;
  }> {
    try {
      return {
        success: true,
        data: {
          totalWords: this.alignmentIndex.wordIndex.size,
          totalAlignments: Array.from(this.alignmentIndex.bookIndex.values())
            .reduce((total, refs) => total + refs.length, 0),
          uniqueStrongs: this.alignmentIndex.strongsIndex.size,
          uniqueLemmas: this.alignmentIndex.lemmaIndex.size,
          booksIndexed: this.alignmentIndex.bookIndex.size
        },
        metadata: {
          source: 'api' as const,
          timestamp: new Date(),
          isIndexBuilt: this.isIndexBuilt
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown stats error'
      };
    }
  }

  /**
   * Clear alignment index
   */
  clearIndex(): void {
    this.alignmentIndex.wordIndex.clear();
    this.alignmentIndex.strongsIndex.clear();
    this.alignmentIndex.lemmaIndex.clear();
    this.alignmentIndex.bookIndex.clear();
    this.isIndexBuilt = false;
    
    console.log('🧹 Alignment index cleared');
  }

  /**
   * Clear specific book from index
   */
  private clearBookFromIndex(book: BookId): void {
    // Remove from book index
    const bookRefs = this.alignmentIndex.bookIndex.get(book) || [];
    this.alignmentIndex.bookIndex.delete(book);
    
    // Remove from word index
    for (const ref of bookRefs) {
      const wordKey = this.createWordKey(
        ref.reference.book,
        ref.reference.chapter,
        ref.reference.verse,
        ref.wordIndex
      );
      this.alignmentIndex.wordIndex.delete(wordKey);
    }
    
    // Remove from Strong's index
    for (const [strongs, refs] of this.alignmentIndex.strongsIndex.entries()) {
      const filteredRefs = refs.filter(ref => ref.reference.book !== book);
      if (filteredRefs.length === 0) {
        this.alignmentIndex.strongsIndex.delete(strongs);
      } else {
        this.alignmentIndex.strongsIndex.set(strongs, filteredRefs);
      }
    }
    
    // Remove from lemma index
    for (const [lemma, refs] of this.alignmentIndex.lemmaIndex.entries()) {
      const filteredRefs = refs.filter(ref => ref.reference.book !== book);
      if (filteredRefs.length === 0) {
        this.alignmentIndex.lemmaIndex.delete(lemma);
      } else {
        this.alignmentIndex.lemmaIndex.set(lemma, filteredRefs);
      }
    }
    
    console.log(`🧹 Cleared alignment index for book: ${book}`);
  }

  /**
   * Create a unique key for word indexing
   */
  private createWordKey(book: BookId, chapter: number, verse: number, wordIndex: number): string {
    return `${book}:${chapter}:${verse}:${wordIndex}`;
  }

  /**
   * Check if index is built
   */
  isReady(): boolean {
    return this.isIndexBuilt;
  }
}

// Export singleton instance
export const alignmentService = new AlignmentService();