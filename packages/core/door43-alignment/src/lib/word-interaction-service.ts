/**
 * Word Interaction Service
 * Handles word tap interactions and cross-resource filtering
 */

import {
  BookId,
  AlignmentReference,
  CrossReference,
  WordInteractionResult,
  TranslationNote,
  TranslationWordsLink,
  TranslationQuestion,

  AsyncResult,
  IWordInteractionService,
  IResourceService,
  IAlignmentService
} from '@bt-toolkit/door43-core';

export class WordInteractionService implements IWordInteractionService {
  private resourceService: IResourceService;
  private alignmentService: IAlignmentService;

  constructor(resourceService: IResourceService, alignmentService: IAlignmentService) {
    this.resourceService = resourceService;
    this.alignmentService = alignmentService;
  }

  /**
   * Handle word tap interaction
   */
  async handleWordTap(
    book: BookId,
    chapter: number,
    verse: number,
    wordIndex: number,
    wordText: string
  ): AsyncResult<WordInteractionResult> {
    try {
      const startTime = Date.now();
      
      console.log(`👆 Word tap: ${book} ${chapter}:${verse} word[${wordIndex}] "${wordText}"`);
      
      // Step 1: Get alignment data for the word
      const alignmentResult = this.alignmentService.getAlignmentData(
        { book, chapter, verse },
        wordIndex
      );
      
      if (!alignmentResult.success || !alignmentResult.data) {
        return {
          success: false,
          error: `No alignment data found for word at ${book} ${chapter}:${verse}[${wordIndex}]`
        };
      }
      
      const alignmentRef = alignmentResult.data;
      
      // Step 2: Find cross-references
      const crossRefsResult = await this.findCrossReferences(alignmentRef);
      
      if (!crossRefsResult.success) {
        return {
          success: false,
          error: crossRefsResult.error
        };
      }
      
      const crossReferences = crossRefsResult.data || [];
      const processingTime = Date.now() - startTime;
      
      const result: WordInteractionResult = {
        alignmentReference: alignmentRef,
        crossReferences,
        metadata: {
          processedAt: new Date(),
          processingTimeMs: processingTime,
          totalResults: crossReferences.length
        }
      };
      
      console.log(`✅ Word interaction processed: ${crossReferences.length} cross-references found (${processingTime}ms)`);
      
      return {
        success: true,
        data: result,
        metadata: {
          source: 'api' as const,
          timestamp: new Date(),
          processingTimeMs: processingTime
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown word interaction error'
      };
    }
  }

  /**
   * Find cross-references for alignment reference
   */
  async findCrossReferences(alignmentRef: AlignmentReference): AsyncResult<CrossReference[]> {
    try {
      const startTime = Date.now();
      const crossReferences: CrossReference[] = [];
      
      console.log(`🔍 Finding cross-references for alignment:`, {
        reference: alignmentRef.reference,
        wordText: alignmentRef.wordText,
        strong: alignmentRef.alignment.strong,
        lemma: alignmentRef.alignment.lemma,
        occurrence: alignmentRef.alignment.occurrence
      });
      
      // Step 1: Find Translation Notes
      const notesResult = await this.findTranslationNotes(alignmentRef);
      if (notesResult.success && notesResult.data) {
        crossReferences.push(...notesResult.data);
      }
      
      // Step 2: Find Translation Words Links
      const wordsLinksResult = await this.findTranslationWordsLinks(alignmentRef);
      if (wordsLinksResult.success && wordsLinksResult.data) {
        crossReferences.push(...wordsLinksResult.data);
      }
      
      // Step 3: Find Translation Questions
      const questionsResult = await this.findTranslationQuestions(alignmentRef);
      if (questionsResult.success && questionsResult.data) {
        crossReferences.push(...questionsResult.data);
      }
      
      // Step 4: Sort by relevance
      crossReferences.sort((a, b) => b.relevance - a.relevance);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Cross-references found: ${crossReferences.length} (${processingTime}ms)`);
      
      return {
        success: true,
        data: crossReferences,
        metadata: {
          source: 'api' as const,
          timestamp: new Date(),
          processingTimeMs: processingTime,
          totalFound: crossReferences.length
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown cross-reference error'
      };
    }
  }

  /**
   * Find Translation Notes cross-references
   */
  private async findTranslationNotes(alignmentRef: AlignmentReference): AsyncResult<CrossReference[]> {
    try {
      const notesResult = await this.resourceService.getTranslationNotes(alignmentRef.reference.book);
      
      if (!notesResult.success || !notesResult.data) {
        return { success: true, data: [] };
      }
      
      const notes = notesResult.data;
      const crossRefs: CrossReference[] = [];
      
      // Filter notes by verse and word occurrence
      const relevantNotes = notes.filter(note => {
        // Check verse match
        if (note.chapter !== alignmentRef.reference.chapter || 
            note.verse !== alignmentRef.reference.verse) {
          return false;
        }
        
        // Check word/quote match
        if (note.Quote && alignmentRef.wordText) {
          return note.Quote.toLowerCase().includes(alignmentRef.wordText.toLowerCase()) ||
                 alignmentRef.wordText.toLowerCase().includes(note.Quote.toLowerCase());
        }
        
        return true;
      });
      
      // Convert to cross-references with relevance scoring
      for (const note of relevantNotes) {
        const relevance = this.scoreTranslationNoteRelevance(alignmentRef, note);
        
        crossRefs.push({
          type: 'translation-note',
          resourceId: note.ID,
          reference: alignmentRef.reference,
          relevance,
          matchReason: this.getTranslationNoteMatchReason(alignmentRef, note),
          data: note
        });
      }
      
      return {
        success: true,
        data: crossRefs,
        metadata: {
          source: 'api' as const,
          timestamp: new Date(),
          totalNotes: notes.length,
          relevantNotes: relevantNotes.length
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Translation Notes lookup error'
      };
    }
  }

  /**
   * Find Translation Words Links cross-references
   */
  private async findTranslationWordsLinks(alignmentRef: AlignmentReference): AsyncResult<CrossReference[]> {
    try {
      const linksResult = await this.resourceService.getTranslationWordsLinks(alignmentRef.reference.book);
      
      if (!linksResult.success || !linksResult.data) {
        return { success: true, data: [] };
      }
      
      const links = linksResult.data;
      const crossRefs: CrossReference[] = [];
      
      // Filter links by verse and original words
      const relevantLinks = links.filter(link => {
        // Check verse match
        if (link.chapter !== alignmentRef.reference.chapter || 
            link.verse !== alignmentRef.reference.verse) {
          return false;
        }
        
        // Check original words match with Strong's or lemma
        if (alignmentRef.alignment.strong && link.OrigWords) {
          return link.OrigWords.includes(alignmentRef.alignment.strong);
        }
        
        if (alignmentRef.alignment.lemma && link.OrigWords) {
          return link.OrigWords.includes(alignmentRef.alignment.lemma);
        }
        
        // Check gateway words match
        if (link.GLWords && alignmentRef.wordText) {
          return link.GLWords.toLowerCase().includes(alignmentRef.wordText.toLowerCase()) ||
                 alignmentRef.wordText.toLowerCase().includes(link.GLWords.toLowerCase());
        }
        
        return false;
      });
      
      // Convert to cross-references with relevance scoring
      for (const link of relevantLinks) {
        const relevance = this.scoreTranslationWordsLinkRelevance(alignmentRef, link);
        
        crossRefs.push({
          type: 'translation-word',
          resourceId: link.ID,
          reference: alignmentRef.reference,
          relevance,
          matchReason: this.getTranslationWordsLinkMatchReason(alignmentRef, link),
          data: link
        });
      }
      
      return {
        success: true,
        data: crossRefs,
        metadata: {
          source: 'api' as const,
          timestamp: new Date(),
          totalLinks: links.length,
          relevantLinks: relevantLinks.length
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Translation Words Links lookup error'
      };
    }
  }

  /**
   * Find Translation Questions cross-references
   */
  private async findTranslationQuestions(alignmentRef: AlignmentReference): AsyncResult<CrossReference[]> {
    try {
      const questionsResult = await this.resourceService.getTranslationQuestions(alignmentRef.reference.book);
      
      if (!questionsResult.success || !questionsResult.data) {
        return { success: true, data: [] };
      }
      
      const questions = questionsResult.data;
      const crossRefs: CrossReference[] = [];
      
      // Filter questions by verse context
      const relevantQuestions = questions.filter(question => {
        // Check verse match (questions might cover verse ranges)
        return question.chapter === alignmentRef.reference.chapter &&
               question.verse === alignmentRef.reference.verse;
      });
      
      // Convert to cross-references with relevance scoring
      for (const question of relevantQuestions) {
        const relevance = this.scoreTranslationQuestionRelevance(alignmentRef, question);
        
        crossRefs.push({
          type: 'translation-question',
          resourceId: question.ID,
          reference: alignmentRef.reference,
          relevance,
          matchReason: 'verse-context',
          data: question
        });
      }
      
      return {
        success: true,
        data: crossRefs,
        metadata: {
          source: 'api' as const,
          timestamp: new Date(),
          totalQuestions: questions.length,
          relevantQuestions: relevantQuestions.length
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Translation Questions lookup error'
      };
    }
  }

  /**
   * Score relevance of cross-references
   */
  scoreRelevance(alignmentRef: AlignmentReference, crossRef: CrossReference): number {
    switch (crossRef.type) {
      case 'translation-note':
        return this.scoreTranslationNoteRelevance(alignmentRef, crossRef.data as TranslationNote);
      case 'translation-word':
        return this.scoreTranslationWordsLinkRelevance(alignmentRef, crossRef.data as TranslationWordsLink);
      case 'translation-question':
        return this.scoreTranslationQuestionRelevance(alignmentRef, crossRef.data as TranslationQuestion);
      default:
        return 0.5; // Default relevance
    }
  }

  /**
   * Score Translation Note relevance
   */
  private scoreTranslationNoteRelevance(alignmentRef: AlignmentReference, note: TranslationNote): number {
    let score = 0.5; // Base score
    
    // Exact quote match
    if (note.Quote && alignmentRef.wordText && 
        note.Quote.toLowerCase() === alignmentRef.wordText.toLowerCase()) {
      score += 0.4;
    }
    
    // Partial quote match
    else if (note.Quote && alignmentRef.wordText && 
             (note.Quote.toLowerCase().includes(alignmentRef.wordText.toLowerCase()) ||
              alignmentRef.wordText.toLowerCase().includes(note.Quote.toLowerCase()))) {
      score += 0.2;
    }
    
    // Occurrence match
    if (note.Occurrence === alignmentRef.alignment.occurrence) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Score Translation Words Link relevance
   */
  private scoreTranslationWordsLinkRelevance(alignmentRef: AlignmentReference, link: TranslationWordsLink): number {
    let score = 0.5; // Base score
    
    // Strong's number match
    if (alignmentRef.alignment.strong && link.OrigWords && 
        link.OrigWords.includes(alignmentRef.alignment.strong)) {
      score += 0.3;
    }
    
    // Lemma match
    if (alignmentRef.alignment.lemma && link.OrigWords && 
        link.OrigWords.includes(alignmentRef.alignment.lemma)) {
      score += 0.2;
    }
    
    // Gateway words match
    if (link.GLWords && alignmentRef.wordText && 
        link.GLWords.toLowerCase().includes(alignmentRef.wordText.toLowerCase())) {
      score += 0.2;
    }
    
    // Occurrence match
    if (link.Occurrence === alignmentRef.alignment.occurrence) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Score Translation Question relevance
   */
  private scoreTranslationQuestionRelevance(alignmentRef: AlignmentReference, question: TranslationQuestion): number {
    // Questions are verse-context based, so lower relevance
    return 0.3;
  }

  /**
   * Get Translation Note match reason
   */
  private getTranslationNoteMatchReason(alignmentRef: AlignmentReference, note: TranslationNote): CrossReference['matchReason'] {
    if (note.Quote && alignmentRef.wordText && 
        note.Quote.toLowerCase() === alignmentRef.wordText.toLowerCase()) {
      return 'exact-word';
    }
    
    if (note.Quote && alignmentRef.wordText && 
        (note.Quote.toLowerCase().includes(alignmentRef.wordText.toLowerCase()) ||
         alignmentRef.wordText.toLowerCase().includes(note.Quote.toLowerCase()))) {
      return 'exact-word';
    }
    
    return 'verse-context';
  }

  /**
   * Get Translation Words Link match reason
   */
  private getTranslationWordsLinkMatchReason(alignmentRef: AlignmentReference, link: TranslationWordsLink): CrossReference['matchReason'] {
    if (alignmentRef.alignment.strong && link.OrigWords && 
        link.OrigWords.includes(alignmentRef.alignment.strong)) {
      return 'strong-number';
    }
    
    if (alignmentRef.alignment.lemma && link.OrigWords && 
        link.OrigWords.includes(alignmentRef.alignment.lemma)) {
      return 'lemma';
    }
    
    if (link.GLWords && alignmentRef.wordText && 
        link.GLWords.toLowerCase().includes(alignmentRef.wordText.toLowerCase())) {
      return 'exact-word';
    }
    
    return 'verse-context';
  }
}

// Factory function for creating word interaction service
export function createWordInteractionService(
  resourceService: IResourceService,
  alignmentService: IAlignmentService
): WordInteractionService {
  return new WordInteractionService(resourceService, alignmentService);
}
