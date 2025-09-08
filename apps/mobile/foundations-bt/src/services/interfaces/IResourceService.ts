/**
 * Resource Service Interface
 * Defines the contract for resource services (online/offline)
 */

import {
  PassageHelps,
  VerseReference,
  TranslationNotesData,
  TranslationWordsLinksData,
  TranslationQuestionsData,
  TranslationWord,
  TranslationAcademyArticle,
  BibleText,
} from '../../types/translationHelps';

export interface IResourceService {
  /**
   * Initialize the service
   */
  initialize(): Promise<void>;

  /**
   * Get all translation helps for a specific verse reference
   */
  getPassageHelps(reference: VerseReference): Promise<PassageHelps>;

  /**
   * Search helps by query and optional book filter
   */
  searchHelps(query: string, book?: string): Promise<any[]>;

  /**
   * Get available books for navigation
   */
  getAvailableBooks(): Promise<string[]>;

  /**
   * Get Bible text for a specific book and text type
   */
  getBibleText(book: string, textType: 'ult' | 'ust'): Promise<BibleText | null>;

  /**
   * Get translation notes for a specific book
   */
  getTranslationNotes(book: string): Promise<TranslationNotesData | null>;

  /**
   * Get translation words links for a specific book
   */
  getTranslationWordsLinks(book: string): Promise<TranslationWordsLinksData | null>;

  /**
   * Get translation questions for a specific book
   */
  getTranslationQuestions(book: string): Promise<TranslationQuestionsData | null>;

  /**
   * Get a specific translation word by ID
   */
  getTranslationWord(wordId: string): Promise<TranslationWord | null>;

  /**
   * Get a specific translation academy article by ID
   */
  getTranslationAcademyArticle(articleId: string): Promise<TranslationAcademyArticle | null>;

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean;
}

export interface IResourceServiceFactory {
  /**
   * Create a resource service instance
   */
  createResourceService(): IResourceService;
}
