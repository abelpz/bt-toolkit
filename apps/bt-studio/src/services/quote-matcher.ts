/**
 * Quote Matching System for Original Language Texts
 * 
 * This system enables precise matching of quotes in original language texts
 * and finding corresponding aligned tokens in target language translations.
 */

import { WordToken, ProcessedVerse, ProcessedChapter } from './usfm-processor';

export interface QuoteReference {
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter?: number;
  endVerse?: number;
}

export interface QuoteMatch {
  quote: string;
  occurrence: number;
  tokens: WordToken[];
  verseRef: string;
  startPosition: number;
  endPosition: number;
}

export interface QuoteMatchResult {
  success: boolean;
  matches: QuoteMatch[];
  totalTokens: WordToken[];
  error?: string;
}

export interface AlignedTokenMatch {
  originalToken: WordToken;
  alignedTokens: WordToken[];
  verseRef: string;
}

export interface AlignmentMatchResult {
  success: boolean;
  alignedMatches: AlignedTokenMatch[];
  totalAlignedTokens: WordToken[];
  error?: string;
}

export class QuoteMatcher {
  
  /**
   * Main method to find original language tokens matching a quote system
   * 
   * @param chapters - Processed chapters from original language text
   * @param quote - Quote string (can contain & for multiple quotes)
   * @param occurrence - Which occurrence to find
   * @param reference - Reference range to search in
   * @returns QuoteMatchResult with matched tokens
   */
  findOriginalTokens(
    chapters: ProcessedChapter[],
    quote: string,
    occurrence: number,
    reference: QuoteReference
  ): QuoteMatchResult {
    try {
      // Parse multiple quotes separated by &
      const quotes = quote.split('&').map(q => q.trim());
      
      // Get verses in the reference range
      const verses = this.getVersesInRange(chapters, reference);
      
      if (verses.length === 0) {
        return {
          success: false,
          matches: [],
          totalTokens: [],
          error: `No verses found in range ${this.formatReference(reference)}`
        };
      }
      
      // Find matches for each quote
      const matches: QuoteMatch[] = [];
      let searchStartVerse = 0; // Start searching from beginning for first quote
      let searchStartPosition = 0; // Position within verse to start searching from
      
      for (let i = 0; i < quotes.length; i++) {
        const currentQuote = quotes[i];
        const isFirstQuote = i === 0;
        const targetOccurrence = isFirstQuote ? occurrence : 1; // First quote uses specified occurrence, others use 1st
        
        const match = this.findSingleQuoteMatch(
          verses,
          currentQuote,
          targetOccurrence,
          searchStartVerse,
          searchStartPosition
        );
        
        if (!match) {
          return {
            success: false,
            matches: [],
            totalTokens: [],
            error: `Quote "${currentQuote}" (occurrence ${targetOccurrence}) not found in ${this.formatReference(reference)}`
          };
        }
        
        matches.push(match);
        
        // Next quote should search after this match
        const matchVerseIndex = this.getVerseIndex(verses, match.verseRef);
        if (matchVerseIndex === searchStartVerse) {
          // Same verse - search after this match position
          searchStartPosition = match.endPosition;
        } else {
          // Different verse - search from beginning of next verse
          searchStartVerse = matchVerseIndex + 1;
          searchStartPosition = 0;
        }
      }
      
      // Combine all tokens
      const totalTokens = matches.flatMap(m => m.tokens);
      
      return {
        success: true,
        matches,
        totalTokens,
      };
      
    } catch (error) {
      return {
        success: false,
        matches: [],
        totalTokens: [],
        error: `Error processing quote: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Find aligned tokens in target language that correspond to original language tokens
   * 
   * @param originalTokens - Tokens from original language
   * @param targetChapters - Processed chapters from aligned target language
   * @param reference - Reference range to search in
   * @returns AlignmentMatchResult with aligned tokens
   */
  findAlignedTokens(
    originalTokens: WordToken[],
    targetChapters: ProcessedChapter[],
    reference: QuoteReference
  ): AlignmentMatchResult {
    try {
      const alignedMatches: AlignedTokenMatch[] = [];
      const targetVerses = this.getVersesInRange(targetChapters, reference);
      
      for (const originalToken of originalTokens) {
        // Find target verse that corresponds to original token's verse
        const targetVerse = this.findCorrespondingVerse(targetVerses, originalToken.verseRef);
        
        if (!targetVerse || !targetVerse.wordTokens) {
          continue;
        }
        
        // Find aligned tokens based on Strong's numbers, lemmas, or content
        const alignedTokens = this.findAlignedTokensInVerse(originalToken, targetVerse);
        
        if (alignedTokens.length > 0) {
          alignedMatches.push({
            originalToken,
            alignedTokens,
            verseRef: targetVerse.reference
          });
        }
      }
      
      const totalAlignedTokens = alignedMatches.flatMap(m => m.alignedTokens);
      
      return {
        success: true,
        alignedMatches,
        totalAlignedTokens
      };
      
    } catch (error) {
      return {
        success: false,
        alignedMatches: [],
        totalAlignedTokens: [],
        error: `Error finding aligned tokens: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Find a single quote match in verses
   */
  private findSingleQuoteMatch(
    verses: ProcessedVerse[],
    quote: string,
    occurrence: number,
    startVerseIndex: number = 0,
    startPosition: number = 0
  ): QuoteMatch | null {
    const normalizedQuote = this.normalizeText(quote);
    let foundOccurrences = 0;
    
    // Search through verses starting from startVerseIndex
    for (let i = startVerseIndex; i < verses.length; i++) {
      const verse = verses[i];
      
      if (!verse.wordTokens || verse.wordTokens.length === 0) {
        continue;
      }
      
      // Create searchable text from tokens
      const verseText = verse.wordTokens
        .filter(token => token.type === 'word')
        .map(token => this.normalizeText(token.content))
        .join(' ');
      
      // Find all occurrences of the quote in this verse
      const matches = this.findQuoteOccurrencesInText(verseText, normalizedQuote);
      
      for (const match of matches) {
        // Skip matches that are before our start position (for sequential quote matching)
        if (i === startVerseIndex && match.start < startPosition) {
          continue;
        }
        
        foundOccurrences++;
        
        if (foundOccurrences === occurrence) {
          // Found the target occurrence, extract tokens
          const tokens = this.extractTokensForMatch(verse, match.start, match.end);
          
          return {
            quote,
            occurrence,
            tokens,
            verseRef: verse.reference,
            startPosition: match.start,
            endPosition: match.end
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Find all occurrences of a quote in text
   */
  private findQuoteOccurrencesInText(text: string, quote: string): Array<{start: number, end: number}> {
    const matches: Array<{start: number, end: number}> = [];
    let startIndex = 0;
    
    while (true) {
      const index = text.indexOf(quote, startIndex);
      if (index === -1) break;
      
      matches.push({
        start: index,
        end: index + quote.length
      });
      
      startIndex = index + 1;
    }
    
    return matches;
  }
  
  /**
   * Extract tokens that correspond to a text match
   */
  private extractTokensForMatch(
    verse: ProcessedVerse,
    startPos: number,
    endPos: number
  ): WordToken[] {
    if (!verse.wordTokens) return [];
    
    const wordTokens = verse.wordTokens.filter(token => token.type === 'word');
    const tokens: WordToken[] = [];
    let currentPos = 0;
    
    for (const token of wordTokens) {
      const tokenText = this.normalizeText(token.content);
      const tokenStart = currentPos;
      const tokenEnd = currentPos + tokenText.length;
      
      // Check if this token overlaps with the match range
      if (tokenEnd > startPos && tokenStart < endPos) {
        tokens.push(token);
      }
      
      currentPos = tokenEnd + 1; // +1 for space
    }
    
    return tokens;
  }
  
  /**
   * Find aligned tokens in a target verse based on original token
   */
  private findAlignedTokensInVerse(
    originalToken: WordToken,
    targetVerse: ProcessedVerse
  ): WordToken[] {
    if (!targetVerse.wordTokens) return [];
    
    const alignedTokens: WordToken[] = [];
    
    for (const targetToken of targetVerse.wordTokens) {
      if (!targetToken.alignment) continue;
      
      // Check if target token is aligned to the original token
      const isAligned = this.isTokenAligned(originalToken, targetToken);
      
      if (isAligned) {
        alignedTokens.push(targetToken);
      }
    }
    
    return alignedTokens;
  }
  
  /**
   * Check if a target token is aligned to an original token
   * Uses token IDs for precise cross-panel communication
   */
  private isTokenAligned(originalToken: WordToken, targetToken: WordToken): boolean {
    if (!targetToken.alignment) return false;
    
    // Primary method: Check if target token references the original token ID
    if (targetToken.alignment.sourceWordId && targetToken.alignment.sourceWordId === originalToken.uniqueId) {
      return true;
    }
    
    // Fallback method 1: Strong's number match (for legacy alignment data)
    if (originalToken.alignment?.strong && targetToken.alignment.strong) {
      if (originalToken.alignment.strong === targetToken.alignment.strong) {
        // Additional verification: check if they're from the same verse
        if (originalToken.verseRef === targetToken.verseRef) {
          return true;
        }
      }
    }
    
    // Fallback method 2: Content and occurrence match (most precise fallback)
    if (originalToken.verseRef === targetToken.verseRef && 
        targetToken.alignment.sourceContent && 
        targetToken.alignment.sourceOccurrence) {
      
      const contentMatch = this.normalizeText(originalToken.content) === 
                          this.normalizeText(targetToken.alignment.sourceContent);
      const occurrenceMatch = originalToken.occurrence === targetToken.alignment.sourceOccurrence;
      
      if (contentMatch && occurrenceMatch) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get verses within a reference range
   */
  private getVersesInRange(chapters: ProcessedChapter[], reference: QuoteReference): ProcessedVerse[] {
    const verses: ProcessedVerse[] = [];
    
    for (const chapter of chapters) {
      // Check if chapter is in range
      const isInChapterRange = 
        chapter.number >= reference.startChapter &&
        chapter.number <= (reference.endChapter || reference.startChapter);
      
      if (!isInChapterRange) continue;
      
      for (const verse of chapter.verses) {
        let isInVerseRange = false;
        
        if (reference.startChapter === (reference.endChapter || reference.startChapter)) {
          // Same chapter range
          isInVerseRange = 
            verse.number >= reference.startVerse &&
            verse.number <= (reference.endVerse || reference.startVerse);
        } else {
          // Multi-chapter range
          if (chapter.number === reference.startChapter) {
            isInVerseRange = verse.number >= reference.startVerse;
          } else if (chapter.number === reference.endChapter) {
            isInVerseRange = verse.number <= (reference.endVerse || 999);
          } else {
            isInVerseRange = true; // Middle chapters, all verses
          }
        }
        
        if (isInVerseRange) {
          verses.push(verse);
        }
      }
    }
    
    return verses;
  }
  
  /**
   * Find corresponding verse in target language
   */
  private findCorrespondingVerse(verses: ProcessedVerse[], originalVerseRef: string): ProcessedVerse | null {
    // Parse original verse reference (e.g., "3JN 1:1")
    const refParts = originalVerseRef.split(' ');
    if (refParts.length !== 2) return null;
    
    const [, chapterVerse] = refParts;
    const [chapter, verse] = chapterVerse.split(':').map(Number);
    
    // Find matching verse in target
    return verses.find(v => {
      const targetRefParts = v.reference.split(' ');
      if (targetRefParts.length !== 2) return false;
      
      const [, targetChapterVerse] = targetRefParts;
      const [targetChapter, targetVerse] = targetChapterVerse.split(':').map(Number);
      
      return targetChapter === chapter && targetVerse === verse;
    }) || null;
  }
  
  /**
   * Get verse index in array
   */
  private getVerseIndex(verses: ProcessedVerse[], verseRef: string): number {
    return verses.findIndex(v => v.reference === verseRef);
  }
  
  /**
   * Normalize text for comparison (handles Greek and other Unicode text)
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '') // Remove punctuation but keep Unicode letters and numbers
      .replace(/\s+/g, ' ')             // Normalize whitespace
      .trim();
  }
  
  /**
   * Format reference for display
   */
  private formatReference(reference: QuoteReference): string {
    const { book, startChapter, startVerse, endChapter, endVerse } = reference;
    
    if (endChapter && endChapter !== startChapter) {
      return `${book} ${startChapter}:${startVerse}-${endChapter}:${endVerse || ''}`;
    } else if (endVerse && endVerse !== startVerse) {
      return `${book} ${startChapter}:${startVerse}-${endVerse}`;
    } else {
      return `${book} ${startChapter}:${startVerse}`;
    }
  }
}
