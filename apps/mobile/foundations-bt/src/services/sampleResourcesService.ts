/**
 * Sample Resources Service
 * Loads and manages the sample translation helps resources fetched from Door43
 */

import {
  TranslationNotesData,
  TranslationWordsLinksData,
  TranslationQuestionsData,
  TranslationWord,
  TranslationAcademyArticle,
  BibleText,
  PassageHelps,
  VerseReference,
} from '../types/translationHelps';

import { IResourceService } from './interfaces/IResourceService';

import {
  parseTranslationNotes,
  parseTranslationWordsLinks,
  parseTranslationQuestions,
  parseTranslationWord,
  parseTranslationAcademyArticle,
  parseBibleText,
  getHelpsForReference,
  extractBookFromFilename,
  parseVerseReference,
} from './translationHelpsParser';

import {
  SAMPLE_TRANSLATION_NOTES,
  SAMPLE_TRANSLATION_QUESTIONS,
  SAMPLE_TRANSLATION_WORDS_LINKS,
  SAMPLE_TRANSLATION_WORDS,
  SAMPLE_TRANSLATION_ACADEMY,
  SAMPLE_BIBLE_TEXTS,
} from '../data/embeddedSampleData';

// Helper function to load embedded sample data
const loadSampleFile = async (relativePath: string): Promise<string> => {
  try {
    // Map file paths to embedded data
    if (relativePath === 'translation-notes/tn_JON.tsv') {
      return SAMPLE_TRANSLATION_NOTES.JON;
    }
    if (relativePath === 'translation-notes/tn_PHM.tsv') {
      return SAMPLE_TRANSLATION_NOTES.PHM;
    }
    if (relativePath === 'translation-questions/tq_JON.tsv') {
      return SAMPLE_TRANSLATION_QUESTIONS.JON;
    }
    if (relativePath === 'translation-questions/tq_PHM.tsv') {
      return SAMPLE_TRANSLATION_QUESTIONS.PHM;
    }
    if (relativePath === 'translation-words-links/twl_JON.tsv') {
      return SAMPLE_TRANSLATION_WORDS_LINKS.JON;
    }
    if (relativePath === 'translation-words-links/twl_PHM.tsv') {
      return SAMPLE_TRANSLATION_WORDS_LINKS.PHM;
    }
    if (relativePath === 'translation-words/bible/kt/god.md') {
      return SAMPLE_TRANSLATION_WORDS.god;
    }
    if (relativePath === 'translation-words/bible/kt/love.md') {
      return SAMPLE_TRANSLATION_WORDS.love;
    }
    if (relativePath === 'translation-words/bible/kt/mercy.md') {
      return SAMPLE_TRANSLATION_WORDS.love; // Reuse for demo
    }
    if (relativePath === 'translation-words/bible/kt/grace.md') {
      return SAMPLE_TRANSLATION_WORDS.love; // Reuse for demo
    }
    if (relativePath === 'translation-words/bible/names/jonah.md') {
      return SAMPLE_TRANSLATION_WORDS.jonah;
    }
    if (relativePath === 'translation-academy/translate/figs-metaphor/title.md') {
      return SAMPLE_TRANSLATION_ACADEMY['translate/figs-metaphor'].title;
    }
    if (relativePath === 'translation-academy/translate/figs-metaphor/sub-title.md') {
      return SAMPLE_TRANSLATION_ACADEMY['translate/figs-metaphor'].subtitle;
    }
    if (relativePath === 'translation-academy/translate/figs-metaphor/01.md') {
      return SAMPLE_TRANSLATION_ACADEMY['translate/figs-metaphor'].content;
    }
    if (relativePath === 'translation-academy/translate/writing-newevent/title.md') {
      return SAMPLE_TRANSLATION_ACADEMY['translate/writing-newevent'].title;
    }
    if (relativePath === 'translation-academy/translate/writing-newevent/sub-title.md') {
      return SAMPLE_TRANSLATION_ACADEMY['translate/writing-newevent'].subtitle;
    }
    if (relativePath === 'translation-academy/translate/writing-newevent/01.md') {
      return SAMPLE_TRANSLATION_ACADEMY['translate/writing-newevent'].content;
    }
    if (relativePath === 'bible-text/ult/32-JON.usfm') {
      return SAMPLE_BIBLE_TEXTS['JON-ULT'];
    }
    if (relativePath === 'bible-text/ust/32-JON.usfm') {
      return SAMPLE_BIBLE_TEXTS['JON-UST'];
    }
    
    throw new Error(`Sample file not found: ${relativePath}`);
  } catch (error) {
    console.warn(`Could not load sample file ${relativePath}:`, error);
    throw error;
  }
};

/**
 * Sample Resources Service Class
 */
export class SampleResourcesService implements IResourceService {
  private translationNotesCache = new Map<string, TranslationNotesData>();
  private translationWordsLinksCache = new Map<string, TranslationWordsLinksData>();
  private translationQuestionsCache = new Map<string, TranslationQuestionsData>();
  private translationWordsCache = new Map<string, TranslationWord>();
  private translationAcademyCache = new Map<string, TranslationAcademyArticle>();
  private bibleTextsCache = new Map<string, BibleText>();
  
  private initialized = false;

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get available books for navigation
   */
  async getAvailableBooks(): Promise<string[]> {
    await this.initialize();
    // Extract unique books from all cached resources
    const books = new Set<string>();
    
    // From translation notes
    for (const book of this.translationNotesCache.keys()) {
      books.add(book);
    }
    
    // From bible texts
    for (const key of this.bibleTextsCache.keys()) {
      const book = key.split('-')[0]; // Extract book from "JON-ULT" format
      books.add(book);
    }
    
    return Array.from(books).sort();
  }

  /**
   * Get Bible text for a specific book and text type
   */
  async getBibleText(book: string, textType: 'ult' | 'ust'): Promise<BibleText | null> {
    await this.initialize();
    const key = `${book}-${textType.toUpperCase()}`;
    return this.bibleTextsCache.get(key) || null;
  }

  /**
   * Get translation notes for a specific book
   */
  async getTranslationNotes(book: string): Promise<TranslationNotesData | null> {
    await this.initialize();
    return this.translationNotesCache.get(book) || null;
  }

  /**
   * Get translation words links for a specific book
   */
  async getTranslationWordsLinks(book: string): Promise<TranslationWordsLinksData | null> {
    await this.initialize();
    return this.translationWordsLinksCache.get(book) || null;
  }

  /**
   * Get translation questions for a specific book
   */
  async getTranslationQuestions(book: string): Promise<TranslationQuestionsData | null> {
    await this.initialize();
    return this.translationQuestionsCache.get(book) || null;
  }

  /**
   * Get a specific translation word by ID
   */
  async getTranslationWord(wordId: string): Promise<TranslationWord | null> {
    await this.initialize();
    return this.translationWordsCache.get(wordId) || null;
  }

  /**
   * Get a specific translation academy article by ID
   */
  async getTranslationAcademyArticle(articleId: string): Promise<TranslationAcademyArticle | null> {
    await this.initialize();
    return this.translationAcademyCache.get(articleId) || null;
  }

  /**
   * Initialize the service by loading all sample resources
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('🔄 Initializing Sample Resources Service...');
    
    try {
      // Load Translation Notes
      await this.loadTranslationNotes();
      
      // Load Translation Words Links
      await this.loadTranslationWordsLinks();
      
      // Load Translation Questions
      await this.loadTranslationQuestions();
      
      // Load Translation Words
      await this.loadTranslationWords();
      
      // Load Translation Academy
      await this.loadTranslationAcademy();
      
      // Load Bible Texts
      await this.loadBibleTexts();
      
      this.initialized = true;
      console.log('✅ Sample Resources Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Sample Resources Service:', error);
      throw error;
    }
  }

  /**
   * Load Translation Notes from sample files
   */
  private async loadTranslationNotes(): Promise<void> {
    // In a real app, these would be loaded from the file system
    // For now, we'll simulate the loading process
    
    const books = ['JON', 'PHM'];
    
    for (const book of books) {
      try {
        // Simulate file loading - in real app, use file system APIs
        const content = await loadSampleFile(`translation-notes/tn_${book}.tsv`);
        const notesData = parseTranslationNotes(content, book);
        this.translationNotesCache.set(book, notesData);
        console.log(`📝 Loaded ${notesData.notes.length} notes for ${book}`);
      } catch (error) {
        console.warn(`⚠️  Could not load Translation Notes for ${book}:`, error);
      }
    }
  }

  /**
   * Load Translation Words Links from sample files
   */
  private async loadTranslationWordsLinks(): Promise<void> {
    const books = ['JON', 'PHM'];
    
    for (const book of books) {
      try {
        const content = await loadSampleFile(`translation-words-links/twl_${book}.tsv`);
        const linksData = parseTranslationWordsLinks(content, book);
        this.translationWordsLinksCache.set(book, linksData);
        console.log(`🔗 Loaded ${linksData.links.length} word links for ${book}`);
      } catch (error) {
        console.warn(`⚠️  Could not load Translation Words Links for ${book}:`, error);
      }
    }
  }

  /**
   * Load Translation Questions from sample files
   */
  private async loadTranslationQuestions(): Promise<void> {
    const books = ['JON', 'PHM'];
    
    for (const book of books) {
      try {
        const content = await loadSampleFile(`translation-questions/tq_${book}.tsv`);
        const questionsData = parseTranslationQuestions(content, book);
        this.translationQuestionsCache.set(book, questionsData);
        console.log(`❓ Loaded ${questionsData.questions.length} questions for ${book}`);
      } catch (error) {
        console.warn(`⚠️  Could not load Translation Questions for ${book}:`, error);
      }
    }
  }

  /**
   * Load Translation Words from sample files
   */
  private async loadTranslationWords(): Promise<void> {
    const words = [
      { id: 'god', path: 'translation-words/bible/kt/god.md' },
      { id: 'love', path: 'translation-words/bible/kt/love.md' },
      { id: 'mercy', path: 'translation-words/bible/kt/mercy.md' },
      { id: 'grace', path: 'translation-words/bible/kt/grace.md' },
      { id: 'jonah', path: 'translation-words/bible/names/jonah.md' },
    ];
    
    for (const word of words) {
      try {
        const content = await loadSampleFile(word.path);
        const wordData = parseTranslationWord(content, word.id, word.path);
        this.translationWordsCache.set(word.id, wordData);
        console.log(`📖 Loaded Translation Word: ${wordData.title} (${wordData.category})`);
      } catch (error) {
        console.warn(`⚠️  Could not load Translation Word ${word.id}:`, error);
      }
    }
  }

  /**
   * Load Translation Academy articles from sample files
   */
  private async loadTranslationAcademy(): Promise<void> {
    const articles = [
      'translate/figs-metaphor',
      'translate/writing-newevent'
    ];
    
    for (const articlePath of articles) {
      try {
        // Load the 3 files for each article
        const titleContent = await loadSampleFile(`translation-academy/${articlePath}/title.md`);
        const subtitleContent = await loadSampleFile(`translation-academy/${articlePath}/sub-title.md`);
        const mainContent = await loadSampleFile(`translation-academy/${articlePath}/01.md`);
        
        const articleData = parseTranslationAcademyArticle(
          mainContent, 
          articlePath, 
          titleContent, 
          subtitleContent
        );
        
        this.translationAcademyCache.set(articlePath, articleData);
        console.log(`📚 Loaded Translation Academy: ${articleData.title}`);
      } catch (error) {
        console.warn(`⚠️  Could not load Translation Academy article ${articlePath}:`, error);
      }
    }
  }

  /**
   * Load Bible texts from sample files
   */
  private async loadBibleTexts(): Promise<void> {
    const texts = [
      { book: 'JON', translation: 'ULT' as const, path: 'bible-text/ult/32-JON.usfm' },
      { book: 'JON', translation: 'UST' as const, path: 'bible-text/ust/32-JON.usfm' },
    ];
    
    for (const text of texts) {
      try {
        const content = await loadSampleFile(text.path);
        const bibleData = parseBibleText(content, text.book, text.translation);
        const key = `${text.book}-${text.translation}`;
        this.bibleTextsCache.set(key, bibleData);
        console.log(`📜 Loaded Bible Text: ${text.book} ${text.translation} (${bibleData.hasAlignment ? 'with alignment' : 'no alignment'})`);
      } catch (error) {
        console.warn(`⚠️  Could not load Bible text ${text.book} ${text.translation}:`, error);
      }
    }
  }



  /**
   * Get translation helps for a specific passage
   */
  async getPassageHelps(reference: VerseReference): Promise<PassageHelps> {
    await this.initialize();
    
    const notesData = this.translationNotesCache.get(reference.book);
    const questionsData = this.translationQuestionsCache.get(reference.book);
    const linksData = this.translationWordsLinksCache.get(reference.book);
    
    const helps = getHelpsForReference(reference, notesData, questionsData, linksData);
    
    // Get related Translation Words
    const words: TranslationWord[] = [];
    for (const link of helps.wordLinks) {
      const rcLink = link.TWLink;
      // Extract word ID from RC link (simplified)
      const wordId = rcLink.split('/').pop()?.toLowerCase();
      if (wordId && this.translationWordsCache.has(wordId)) {
        const word = this.translationWordsCache.get(wordId);
        if (word) words.push(word);
      }
    }
    
    // Get related Translation Academy articles from notes
    const academyArticles: TranslationAcademyArticle[] = [];
    for (const note of helps.notes) {
      if (note.SupportReference && note.SupportReference.includes('ta/man/translate/')) {
        // Extract article path from RC link
        const parts = note.SupportReference.split('/');
        const articlePath = parts.slice(-2).join('/'); // e.g., "translate/figs-metaphor"
        
        if (this.translationAcademyCache.has(articlePath)) {
          const article = this.translationAcademyCache.get(articlePath);
          if (article && !academyArticles.find(a => a.id === article.id)) {
            academyArticles.push(article);
          }
        }
      }
    }
    
    // Get Bible texts for the book
    const bibleTexts: BibleText[] = [];
    const ultKey = `${reference.book}-ULT`;
    const ustKey = `${reference.book}-UST`;
    
    if (this.bibleTextsCache.has(ultKey)) {
      const ult = this.bibleTextsCache.get(ultKey);
      if (ult) bibleTexts.push(ult);
    }
    
    if (this.bibleTextsCache.has(ustKey)) {
      const ust = this.bibleTextsCache.get(ustKey);
      if (ust) bibleTexts.push(ust);
    }
    
    return {
      reference,
      notes: helps.notes,
      questions: helps.questions,
      wordLinks: helps.wordLinks,
      words,
      academyArticles,
      bibleTexts
    };
  }

  /**
   * Get all Translation Academy articles
   */
  getAllTranslationAcademyArticles(): TranslationAcademyArticle[] {
    return Array.from(this.translationAcademyCache.values());
  }

  /**
   * Get all available Bible texts
   */
  getAllBibleTexts(): BibleText[] {
    return Array.from(this.bibleTextsCache.values());
  }

  /**
   * Search across all resources
   */
  async searchHelps(query: string, book?: string): Promise<any[]> {
    await this.initialize();
    
    const results: any[] = [];
    const searchTerm = query.toLowerCase();
    
    // Search in notes
    for (const [bookId, notesData] of this.translationNotesCache) {
      if (book && book !== bookId) continue;
      
      for (const note of notesData.notes) {
        if (note.Note.toLowerCase().includes(searchTerm) || 
            note.Quote.toLowerCase().includes(searchTerm)) {
          results.push({
            type: 'note',
            book: bookId,
            reference: note.Reference,
            content: note,
            relevance: 1
          });
        }
      }
    }
    
    // Search in words
    for (const [wordId, word] of this.translationWordsCache) {
      if (word.title.toLowerCase().includes(searchTerm) ||
          word.definition.toLowerCase().includes(searchTerm)) {
        results.push({
          type: 'word',
          wordId,
          content: word,
          relevance: 1
        });
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const sampleResourcesService = new SampleResourcesService();
