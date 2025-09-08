/**
 * Door43 Translation Questions Adapter
 * Fetches Translation Questions (TQ) content from Door43 API
 * Supports TSV format parsing and question-answer processing
 */

import { BaseResourceAdapter, ResourceType, QuestionsMetadata, BookInfo, ResourceAdapterInfo, AdapterConfig } from '../../types/context';
import { questionsProcessor, ProcessedQuestions } from '../questions-processor';

export interface Door43QuestionsConfig {
  resourceId: string;              // 'tq' for Translation Questions
  serverId?: string;              // Default: 'git.door43.org'
  timeout?: number;               // Request timeout (default: 30000)
  retryAttempts?: number;         // Retry attempts (default: 3)
  retryDelay?: number;            // Retry delay (default: 1000)
  validateContent?: boolean;      // Validate content (default: true)
}

export class Door43QuestionsAdapter implements BaseResourceAdapter {
  resourceType = ResourceType.QUESTIONS;
  organizationType = 'book' as const;
  serverId: string;
  resourceId: string;
  
  private config: AdapterConfig;
  private questionsConfig: Door43QuestionsConfig;

  constructor(config: Door43QuestionsConfig) {
    this.questionsConfig = {
      serverId: 'git.door43.org',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      validateContent: true,
      ...config
    };

    this.serverId = this.questionsConfig.serverId!;
    this.resourceId = this.questionsConfig.resourceId;
    
    console.log(`🔧 Door43QuestionsAdapter initialized with resourceId: ${this.resourceId}`);

    this.config = {
      timeout: this.questionsConfig.timeout!,
      retryAttempts: this.questionsConfig.retryAttempts!,
      retryDelay: this.questionsConfig.retryDelay!,
      fallbackOptions: [],
      processingCapabilities: ['tsv-parsing', 'question-answer-processing']
    };
  }

  /**
   * Get resource metadata from Door43 catalog
   */
  async getResourceMetadata(server: string, owner: string, language: string): Promise<QuestionsMetadata> {
    console.log(`📋 Fetching questions metadata for ${owner}/${language} from ${server} (${this.resourceId})`);
    
    try {
      const repoName = `${language}_${this.resourceId}`; // e.g., "en_tq"
      const catalogUrl = `https://${server}/api/v1/catalog/search?repo=${repoName}&owner=${owner}&stage=prod`;
      console.log(`🔍 Searching for ${this.resourceId.toUpperCase()}: ${catalogUrl}`);
      
      const catalogResponse = await this.fetchWithTimeout(catalogUrl, 10000);
      if (!catalogResponse.ok) {
        throw new Error(`Questions metadata not found: ${catalogResponse.status} ${catalogResponse.statusText}`);
      }
      
      const catalogData = await catalogResponse.json();
      
      if (!catalogData.ok || !catalogData.data || !Array.isArray(catalogData.data) || catalogData.data.length === 0) {
        throw new Error(`No questions resources found for ${repoName}`);
      }
      
      const resource = catalogData.data[0];
      console.log(`✅ Found ${this.resourceId.toUpperCase()} resource: ${resource.name}`);
      
      // Get available books by checking the repository structure
      const availableBooks = await this.getAvailableBooksFromRepo(server, owner, repoName);
      
      const metadata: QuestionsMetadata = {
        id: this.resourceId,
        server,
        owner,
        language,
        title: resource.title || this.getResourceTitle(this.resourceId, language),
        description: resource.description || `Translation Questions for ${language}`,
        name: `${this.resourceId}-${language}`,
        version: resource.release?.tag_name || '1.0.0',
        type: ResourceType.QUESTIONS,
        available: true,
        lastUpdated: resource.released ? new Date(resource.released) : new Date(),
        toc: { books: availableBooks },
        isAnchor: false,
        
        // Language metadata from Door43 API
        languageDirection: resource.language_direction as 'rtl' | 'ltr' || 'ltr',
        languageTitle: resource.language_title || language,
        languageIsGL: resource.language_is_gl || false,
        
        // Questions-specific metadata
        resourceId: this.resourceId,
        repoName: resource.name,
        fullName: resource.full_name,
        htmlUrl: resource.html_url,
        cloneUrl: resource.clone_url,
        defaultBranch: resource.default_branch || 'master',
        availableBooks,
        format: 'tsv',
        markdownSupport: false // Questions don't need markdown processing
      };
      
      console.log(`✅ Questions metadata loaded: ${metadata.title} (${availableBooks.length} books)`);
      return metadata;
      
    } catch (error) {
      console.error(`❌ Failed to fetch questions metadata:`, error);
      throw error;
    }
  }

  /**
   * Get content for a specific book
   */
  async getBookContent(server: string, owner: string, language: string, bookCode: string): Promise<ProcessedQuestions> {
    console.log(`📖 Fetching questions for ${bookCode} from ${owner}/${language}`);
    
    try {
      const repoName = `${language}_${this.resourceId}`;
      const fileName = this.getBookFileName(bookCode);
      const fileUrl = `https://${server}/api/v1/repos/${owner}/${repoName}/raw/master/${fileName}`;
      
      console.log(`🔍 Fetching questions file: ${fileUrl}`);
      
      // Fetch the TSV content directly from the raw endpoint
      const contentResponse = await this.fetchWithTimeout(fileUrl, this.config.timeout || 30000);
      if (!contentResponse.ok) {
        throw new Error(`Questions file not found: ${contentResponse.status} ${contentResponse.statusText}`);
      }
      
      const tsvContent = await contentResponse.text();
      console.log(`📄 Downloaded TSV content: ${tsvContent.length} characters`);
      
      // Process the TSV content
      const processedQuestions = await this.processTSVContent(tsvContent, bookCode);
      
      console.log(`✅ Processed ${processedQuestions.questions.length} questions for ${bookCode}`);
      return processedQuestions;
      
    } catch (error) {
      console.error(`❌ Failed to fetch questions for ${bookCode}:`, error);
      throw error;
    }
  }

  /**
   * Get list of available books
   */
  async getAvailableBooks(server: string, owner: string, language: string): Promise<BookInfo[]> {
    console.log(`📚 Getting available Translation Questions books for ${server}/${owner}/${language}`);
    
    try {
      const metadata = await this.getResourceMetadata(server, owner, language);
      const books = Object.values(metadata.toc?.books || {});
      
      console.log(`✅ Found ${books.length} available Translation Questions books`);
      return books;
      
    } catch (error) {
      console.error(`❌ Failed to get available Translation Questions books:`, error);
      throw error;
    }
  }

  /**
   * Check if a specific book is available
   */
  async isBookAvailable(server: string, owner: string, language: string, bookCode: string): Promise<boolean> {
    try {
      const availableBooks = await this.getAvailableBooks(server, owner, language);
      const isAvailable = availableBooks.some(book => book.code.toLowerCase() === bookCode.toLowerCase());
      
      console.log(`🔍 Translation Questions book ${bookCode} availability: ${isAvailable}`);
      return isAvailable;
      
    } catch (error) {
      console.warn(`⚠️ Could not check Translation Questions book availability for ${bookCode}:`, error);
      return false;
    }
  }

  /**
   * Check if resource is available
   */
  async isResourceAvailable(server: string, owner: string, language: string): Promise<boolean> {
    try {
      const metadata = await this.getResourceMetadata(server, owner, language);
      return metadata.available;
    } catch (error) {
      console.warn(`⚠️ Could not check resource availability:`, error);
      return false;
    }
  }

  /**
   * Configure the adapter
   */
  configure(config: AdapterConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get adapter information
   */
  getResourceInfo(): ResourceAdapterInfo {
    return {
      name: 'Door43 Translation Questions Adapter',
      description: 'Fetches Translation Questions from Door43 repositories in TSV format',
      supportedServers: [this.serverId],
      fallbackOptions: this.config.fallbackOptions || [],
      processingCapabilities: this.config.processingCapabilities || []
    };
  }

  /**
   * Get configuration
   */
  getConfig(): AdapterConfig {
    return this.config;
  }



  /**
   * Process TSV content into structured questions
   */
  private async processTSVContent(tsvContent: string, bookCode: string): Promise<ProcessedQuestions> {
    console.log(`📋 Processing TSV content for ${bookCode}...`);
    
    const bookName = this.getBookName(bookCode);
    
    // Use the questions processor to handle TSV parsing and structuring
    const processedQuestions = await questionsProcessor.processQuestions(tsvContent, bookCode, bookName);
    
    console.log(`✅ TSV processing complete: ${processedQuestions.questions.length} questions`);
    return processedQuestions;
  }

  /**
   * Get TSV file name for a book
   */
  private getBookFileName(bookCode: string): string {
    return `tq_${bookCode.toUpperCase()}.tsv`;
  }

  /**
   * Get available books by checking repository structure
   */
  private async getAvailableBooksFromRepo(server: string, owner: string, repoName: string): Promise<BookInfo[]> {
    try {
      const contentsUrl = `https://${server}/api/v1/repos/${owner}/${repoName}/contents`;
      const response = await this.fetchWithTimeout(contentsUrl, 10000);
      
      if (!response.ok) {
        console.warn(`Could not fetch repository contents: ${response.status}`);
        return [];
      }
      
      const contents = await response.json();
      const books: BookInfo[] = [];
      
      for (const item of contents) {
        if (item.type === 'file' && item.name.endsWith('.tsv')) {
          const bookCode = item.name.replace('.tsv', '').replace('tq_', '').toLowerCase();
          const bookName = this.getBookName(bookCode);
          
          books.push({
            code: bookCode,
            name: bookName,
            testament: this.getTestament(bookCode)
          });
        }
      }
      
      console.log(`📚 Found ${books.length} question books in ${repoName}`);
      return books.sort((a, b) => a.code.localeCompare(b.code));
      
    } catch (error) {
      console.warn(`Could not fetch available books: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Get resource title based on resource ID and language
   */
  private getResourceTitle(resourceId: string, language: string): string {
    const titles: Record<string, string> = {
      'tq': 'Translation Questions'
    };
    
    const baseTitle = titles[resourceId] || resourceId.toUpperCase();
    return `${baseTitle} (${language.toUpperCase()})`;
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(url: string, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Get testament for a book code
   */
  private getTestament(bookCode: string): 'OT' | 'NT' {
    const otBooks = [
      'gen', 'exo', 'lev', 'num', 'deu', 'jos', 'jdg', 'rut', '1sa', '2sa',
      '1ki', '2ki', '1ch', '2ch', 'ezr', 'neh', 'est', 'job', 'psa', 'pro',
      'ecc', 'sng', 'isa', 'jer', 'lam', 'ezk', 'dan', 'hos', 'jol', 'amo',
      'oba', 'jon', 'mic', 'nam', 'hab', 'zep', 'hag', 'zec', 'mal'
    ];
    
    return otBooks.includes(bookCode.toLowerCase()) ? 'OT' : 'NT';
  }

  /**
   * Get human-readable book name from book code
   */
  private getBookName(bookCode: string): string {
    const bookNames: Record<string, string> = {
      // Old Testament
      'gen': 'Genesis', 'exo': 'Exodus', 'lev': 'Leviticus', 'num': 'Numbers', 'deu': 'Deuteronomy',
      'jos': 'Joshua', 'jdg': 'Judges', 'rut': 'Ruth', '1sa': '1 Samuel', '2sa': '2 Samuel',
      '1ki': '1 Kings', '2ki': '2 Kings', '1ch': '1 Chronicles', '2ch': '2 Chronicles',
      'ezr': 'Ezra', 'neh': 'Nehemiah', 'est': 'Esther', 'job': 'Job', 'psa': 'Psalms',
      'pro': 'Proverbs', 'ecc': 'Ecclesiastes', 'sng': 'Song of Songs', 'isa': 'Isaiah',
      'jer': 'Jeremiah', 'lam': 'Lamentations', 'ezk': 'Ezekiel', 'dan': 'Daniel',
      'hos': 'Hosea', 'jol': 'Joel', 'amo': 'Amos', 'oba': 'Obadiah', 'jon': 'Jonah',
      'mic': 'Micah', 'nam': 'Nahum', 'hab': 'Habakkuk', 'zep': 'Zephaniah',
      'hag': 'Haggai', 'zec': 'Zechariah', 'mal': 'Malachi',
      
      // New Testament
      'mat': 'Matthew', 'mrk': 'Mark', 'luk': 'Luke', 'jhn': 'John', 'act': 'Acts',
      'rom': 'Romans', '1co': '1 Corinthians', '2co': '2 Corinthians', 'gal': 'Galatians',
      'eph': 'Ephesians', 'php': 'Philippians', 'col': 'Colossians', '1th': '1 Thessalonians',
      '2th': '2 Thessalonians', '1ti': '1 Timothy', '2ti': '2 Timothy', 'tit': 'Titus',
      'phm': 'Philemon', 'heb': 'Hebrews', 'jas': 'James', '1pe': '1 Peter', '2pe': '2 Peter',
      '1jn': '1 John', '2jn': '2 John', '3jn': '3 John', 'jud': 'Jude', 'rev': 'Revelation'
    };
    
    return bookNames[bookCode.toLowerCase()] || bookCode.toUpperCase();
  }
}
