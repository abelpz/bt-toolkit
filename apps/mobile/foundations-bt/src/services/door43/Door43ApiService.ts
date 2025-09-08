/**
 * Door43 API Service
 * Implements online resource fetching from Door43 Content Service using Book Translation Packages
 */

import { IResourceService } from '../interfaces/IResourceService';
import { 
  BookTranslationPackageService,
  BookTranslationPackageConfig,
  BookPackageRequest,
  BookTranslationPackage,
  OnDemandResourceRequest,
  OnDemandResource
} from './BookTranslationPackageService';
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
} from '../translationHelpsParser';

export interface Door43ApiConfig {
  baseUrl?: string;
  catalogUrl?: string;
  apiToken?: string;
  userAgent?: string;
  language?: string;
  organization?: string;
}

export interface CatalogResource {
  name: string;
  owner: {
    login: string;
    full_name: string;
  };
  full_name: string;
  description: string;
  subject: string;
  language: string;
  stage: string;
  updated_at: string;
  url: string;
  git_url: string;
  clone_url: string;
  default_branch: string;
}

export class Door43ApiService implements IResourceService {
  private config: Door43ApiConfig;
  private initialized = false;
  private packageService: BookTranslationPackageService;
  
  // Caches for IResourceService compatibility
  private availableBooksCache: string[] = [];
  private packageCache = new Map<string, BookTranslationPackage>();

  constructor(config: Door43ApiConfig = {}) {
    this.config = {
      baseUrl: 'https://git.door43.org/api/v1',
      catalogUrl: 'https://git.door43.org/api/v1/catalog',
      language: 'en',
      organization: 'unfoldingWord',
      userAgent: 'FoundationsBT/1.0.0',
      ...config,
    };

    // Initialize the Book Translation Package Service
    this.packageService = new BookTranslationPackageService({
      defaults: {
        language: this.config.language!,
        organization: this.config.organization!
      }
    });

    if (this.config.apiToken) {
      this.packageService.setApiToken(this.config.apiToken);
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('🔄 Initializing Door43 API Service with Book Translation Packages...');
    
    try {
      // Load available books from ULT repository
      await this.loadAvailableBooks();
      
      this.initialized = true;
      console.log('✅ Door43 API Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Door43 API Service:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Helper method to get book package with caching
   */
  private async getBookPackage(
    book: string, 
    resourceTypes?: (keyof BookTranslationPackageConfig['resourceTypes'])[]
  ): Promise<BookTranslationPackage> {
    const cacheKey = `${this.config.organization}/${this.config.language}/${book}`;
    
    if (this.packageCache.has(cacheKey)) {
      return this.packageCache.get(cacheKey)!;
    }

    const packageRequest: BookPackageRequest = {
      book,
      language: this.config.language!,
      organization: this.config.organization!,
      resourceTypes
    };

    const bookPackage = await this.packageService.fetchBookPackage(packageRequest);
    this.packageCache.set(cacheKey, bookPackage);
    
    return bookPackage;
  }



  private async loadAvailableBooks(): Promise<void> {
    try {
      // Return all Bible books since they exist in the Door43 repositories
      const bookNumbers = {
        'GEN': '01', 'EXO': '02', 'LEV': '03', 'NUM': '04', 'DEU': '05',
        'JOS': '06', 'JDG': '07', 'RUT': '08', '1SA': '09', '2SA': '10',
        '1KI': '11', '2KI': '12', '1CH': '13', '2CH': '14', 'EZR': '15',
        'NEH': '16', 'EST': '17', 'JOB': '18', 'PSA': '19', 'PRO': '20',
        'ECC': '21', 'SNG': '22', 'ISA': '23', 'JER': '24', 'LAM': '25',
        'EZK': '26', 'DAN': '27', 'HOS': '28', 'JOL': '29', 'AMO': '30',
        'OBA': '31', 'JON': '32', 'MIC': '33', 'NAM': '34', 'HAB': '35',
        'ZEP': '36', 'HAG': '37', 'ZEC': '38', 'MAL': '39', 'MAT': '40',
        'MRK': '41', 'LUK': '42', 'JHN': '43', 'ACT': '44', 'ROM': '45',
        '1CO': '46', '2CO': '47', 'GAL': '48', 'EPH': '49', 'PHP': '50',
        'COL': '51', '1TH': '52', '2TH': '53', '1TI': '54', '2TI': '55',
        'TIT': '56', 'PHM': '57', 'HEB': '58', 'JAS': '59', '1PE': '60',
        '2PE': '61', '1JN': '62', '2JN': '63', '3JN': '64', 'JUD': '65',
        'REV': '66'
      };
      
      this.availableBooksCache = Object.keys(bookNumbers);
      console.log(`📖 Available books from Door43: ${this.availableBooksCache.length} books`);
      
    } catch (error) {
      console.warn('⚠️ Failed to load available books:', error);
      this.availableBooksCache = ['JON', 'PHM']; // Fallback
    }
  }

  async getAvailableBooks(): Promise<string[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return [...this.availableBooksCache];
  }

  async getBibleText(book: string, textType: 'ult' | 'ust'): Promise<BibleText | null> {
    try {
      const packageRequest: BookPackageRequest = {
        book,
        language: this.config.language!,
        organization: this.config.organization!,
        resourceTypes: [textType === 'ult' ? 'literalText' : 'simplifiedText']
      };

      const bookPackage = await this.packageService.fetchBookPackage(packageRequest);
      
      if (textType === 'ult' && bookPackage.literalText) {
        return bookPackage.literalText.processed;
      } else if (textType === 'ust' && bookPackage.simplifiedText) {
        return bookPackage.simplifiedText.processed;
      }

      console.warn(`⚠️ No ${textType.toUpperCase()} found for ${book}`);
      return null;
      
    } catch (error) {
      console.error(`❌ Failed to load ${textType.toUpperCase()} for ${book}:`, error);
      return null;
    }
  }

  async getTranslationNotes(book: string): Promise<TranslationNotesData | null> {
    try {
      const bookPackage = await this.getBookPackage(book, ['translationNotes']);
      
      if (bookPackage.translationNotes) {
        return bookPackage.translationNotes.processed;
      }

      console.warn(`⚠️ No Translation Notes found for ${book}`);
      return null;
      
    } catch (error) {
      console.error(`❌ Failed to load Translation Notes for ${book}:`, error);
      return null;
    }
  }

  async getTranslationWordsLinks(book: string): Promise<TranslationWordsLinksData | null> {
    try {
      const bookPackage = await this.getBookPackage(book, ['translationWordsLinks']);
      
      if (bookPackage.translationWordsLinks) {
        return bookPackage.translationWordsLinks.processed;
      }

      console.warn(`⚠️ No Translation Words Links found for ${book}`);
      return null;
      
    } catch (error) {
      console.error(`❌ Failed to load Translation Words Links for ${book}:`, error);
      return null;
    }
  }

  async getTranslationQuestions(book: string): Promise<TranslationQuestionsData | null> {
    try {
      const bookPackage = await this.getBookPackage(book, ['translationQuestions']);
      
      if (bookPackage.translationQuestions) {
        return bookPackage.translationQuestions.processed;
      }

      console.warn(`⚠️ No Translation Questions found for ${book}`);
      return null;
      
    } catch (error) {
      console.error(`❌ Failed to load Translation Questions for ${book}:`, error);
      return null;
    }
  }

  async getTranslationWord(wordId: string): Promise<TranslationWord | null> {
    try {
      const request: OnDemandResourceRequest = {
        type: 'translation-words',
        identifier: wordId,
        language: this.config.language!,
        organization: this.config.organization!
      };

      const resource = await this.packageService.fetchOnDemandResource(request);
      
      if (resource) {
        return resource.processed;
      }

      console.warn(`⚠️ No Translation Word found for ${wordId}`);
      return null;
      
    } catch (error) {
      console.error(`❌ Failed to load Translation Word ${wordId}:`, error);
      return null;
    }
  }

  async getTranslationAcademyArticle(articleId: string): Promise<TranslationAcademyArticle | null> {
    try {
      const request: OnDemandResourceRequest = {
        type: 'translation-academy',
        identifier: articleId,
        language: this.config.language!,
        organization: this.config.organization!
      };

      const resource = await this.packageService.fetchOnDemandResource(request);
      
      if (resource) {
        return resource.processed;
      }

      console.warn(`⚠️ No Translation Academy article found for ${articleId}`);
      return null;
      
    } catch (error) {
      console.error(`❌ Failed to load Translation Academy article ${articleId}:`, error);
      return null;
    }
  }

  async getPassageHelps(reference: VerseReference): Promise<PassageHelps> {
    const book = reference.book;
    
    try {
      // Get complete book package with all helps
      const bookPackage = await this.getBookPackage(book, [
        'translationNotes',
        'translationWordsLinks', 
        'translationQuestions'
      ]);

      const notes = bookPackage.translationNotes?.processed;
      const wordsLinks = bookPackage.translationWordsLinks?.processed;
      const questions = bookPackage.translationQuestions?.processed;

      const basicHelps = getHelpsForReference(reference, notes, questions, wordsLinks);
      
      // Convert to full PassageHelps interface
      return {
        reference,
        notes: basicHelps.notes,
        questions: basicHelps.questions,
        wordLinks: basicHelps.wordLinks,
        words: [], // Will be loaded on-demand when user clicks TWLinks
        academyArticles: [], // Will be loaded on-demand when user clicks support references
        bibleTexts: [] // Could include ULT/UST if needed
      };
      
    } catch (error) {
      console.error(`❌ Failed to load passage helps for ${reference.book} ${reference.chapter}:${reference.verse}:`, error);
      
      // Return empty helps on error
      return {
        reference,
        notes: [],
        questions: [],
        wordLinks: [],
        words: [],
        academyArticles: [],
        bibleTexts: []
      };
    }
  }

  async searchHelps(query: string, book?: string): Promise<any[]> {
    const results: any[] = [];
    
    try {
      // Search in translation notes for specific book
      if (book) {
        const notes = await this.getTranslationNotes(book);
        if (notes) {
          const matchingNotes = notes.notes.filter(note =>
            note.Quote.toLowerCase().includes(query.toLowerCase()) ||
            note.Note.toLowerCase().includes(query.toLowerCase())
          );
          results.push(...matchingNotes.map(note => ({ type: 'note', book, ...note })));
        }
      }

      // For translation words, we'd need to implement a search across the TW repository
      // This would be a more complex operation and might be better done server-side

    } catch (error) {
      console.error('❌ Search failed:', error);
    }

    return results;
  }

  /**
   * Get complete book translation package (exposed for advanced usage)
   */
  async getBookTranslationPackage(
    book: string,
    resourceTypes?: (keyof BookTranslationPackageConfig['resourceTypes'])[]
  ): Promise<BookTranslationPackage> {
    return this.getBookPackage(book, resourceTypes);
  }

  /**
   * Fetch on-demand resource (Translation Academy or Translation Words)
   */
  async fetchOnDemandResource(request: OnDemandResourceRequest): Promise<OnDemandResource | null> {
    return this.packageService.fetchOnDemandResource(request);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.packageCache.clear();
    this.packageService.clearCache();
    this.availableBooksCache = [];
    console.log('🧹 Door43 API Service caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    packages: number;
    packageService: {
      repositories: number;
      manifests: number;
      packages: number;
      onDemand: number;
    };
  } {
    return {
      packages: this.packageCache.size,
      packageService: this.packageService.getCacheStats()
    };
  }
}
