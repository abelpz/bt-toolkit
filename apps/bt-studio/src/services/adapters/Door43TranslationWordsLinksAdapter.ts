/**
 * Door43 Translation Words Links Adapter
 * 
 * Handles fetching and processing Translation Words Links (TWL) resources from Door43.
 * Translation Words Links contain cross-reference links between specific word occurrences 
 * in Bible texts and Translation Words definitions, enabling precise word-level navigation.
 */

import { 
  BookOrganizedAdapter, 
  ResourceType, 
  ResourceMetadata,
  BookInfo,
  ResourceAdapterInfo,
  AdapterConfig
} from '../../types/context';
import { ResourceError } from '../../types/context';

interface Door43CatalogResponse {
  ok: boolean;
  data: Array<{
    name: string;
    title: string;
    repo?: {
      description: string;
      updated_at: string;
    };
    release?: {
      tag_name: string;
    };
    released?: string;
    language_direction?: string;
    language_title?: string;
    language_is_gl?: boolean;
    metadata_version?: string;
    subject?: string;
    metadata?: {
      dublin_core?: {
        version: string;
        modified: string;
        title: string;
        description: string;
      };
    };
  }>;
}

export interface TranslationWordsLink {
  reference: string;      // Verse reference (e.g., "1:1")
  id: string;            // Unique link identifier
  tags: string;          // Word categories (kt, names, other)
  origWords: string;     // Original language words
  occurrence: string;    // Which occurrence in verse
  twLink: string;        // Link to Translation Words (rc://*/tw/dict/bible/kt/god)
}

export interface ProcessedWordsLinks {
  bookCode: string;
  bookName: string;
  links: TranslationWordsLink[];
  linksByChapter: Record<string, TranslationWordsLink[]>;
  metadata: {
    bookCode: string;
    bookName: string;
    processingDate: string;
    totalLinks: number;
    chaptersWithLinks: number[];
    statistics: {
      totalLinks: number;
      linksPerChapter: Record<string, number>;
      linksByCategory: Record<string, number>;
    };
  };
}

export interface TranslationWordsLinksMetadata extends ResourceMetadata {
  type: ResourceType.WORDS_LINKS;
  availableBooks: BookInfo[];
  format: 'tsv';
  resourceId: string;
  repoName: string;
  fullName: string;
  htmlUrl: string;
  cloneUrl: string;
  defaultBranch: string;
}

export interface Door43WordsLinksConfig {
  resourceId: string;              // 'twl' for Translation Words Links
  serverId?: string;              // Default: 'git.door43.org'
  timeout?: number;               // Request timeout (default: 30000)
  retryAttempts?: number;         // Retry attempts (default: 3)
  retryDelay?: number;            // Retry delay (default: 1000)
  validateContent?: boolean;      // Validate content (default: true)
}

export class Door43TranslationWordsLinksAdapter implements BookOrganizedAdapter {
  resourceType = ResourceType.WORDS_LINKS;
  organizationType = 'book' as const;
  serverId: string;
  resourceId: string;
  
  private config: AdapterConfig;
  private linksConfig: Door43WordsLinksConfig;

  constructor(config: Door43WordsLinksConfig) {
    this.linksConfig = {
      serverId: 'git.door43.org',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      validateContent: true,
      ...config
    };

    this.serverId = this.linksConfig.serverId!;
    this.resourceId = this.linksConfig.resourceId;
    
    console.log(`🔧 Door43TranslationWordsLinksAdapter initialized with resourceId: ${this.resourceId}`);

    this.config = {
      timeout: this.linksConfig.timeout!,
      retryAttempts: this.linksConfig.retryAttempts!,
      retryDelay: this.linksConfig.retryDelay!,
      fallbackOptions: [this.resourceId],
      processingCapabilities: ['tsv', 'cross-references', 'word-links']
    };
  }

  /**
   * Get resource metadata including list of available books
   */
  async getResourceMetadata(server: string, owner: string, language: string): Promise<TranslationWordsLinksMetadata> {
    try {
      console.log(`🔍 Door43TranslationWordsLinksAdapter - Fetching metadata for ${server}/${owner}/${language}/${this.resourceId}`);

      // Get repository information from Door43 catalog API using specific repo search
      const repoName = `${language}_${this.resourceId}`; // e.g., "en_twl"
      const catalogUrl = `https://git.door43.org/api/v1/catalog/search?repo=${repoName}&owner=${owner}&stage=prod`;
      console.log(`📡 Door43TranslationWordsLinksAdapter - Catalog URL: ${catalogUrl}`);

      const catalogResponse = await this.fetchWithTimeout(catalogUrl, 10000);
      if (!catalogResponse.ok) {
        throw new Error(`Failed to fetch catalog: ${catalogResponse.status} ${catalogResponse.statusText}`);
      }

      const catalogData: Door43CatalogResponse = await catalogResponse.json();
      console.log(`📋 Door43TranslationWordsLinksAdapter - Catalog response:`, catalogData);

      // Handle Door43 Catalog API response format
      if (!catalogData.ok || !catalogData.data || !Array.isArray(catalogData.data) || catalogData.data.length === 0) {
        throw new Error(`No Translation Words Links resource (${this.resourceId}) found for ${owner}/${language}. Tried repo name: ${repoName}`);
      }

      const linksResource = catalogData.data[0]; // Should be exactly one match

      console.log(`✅ Door43TranslationWordsLinksAdapter - Found links resource:`, linksResource);

      // Get available books by checking the repository structure
      const availableBooks = await this.fetchAvailableBooks(server, owner, repoName);

      const metadata: TranslationWordsLinksMetadata = {
        id: this.resourceId,
        resourceKey: `${server}/${owner}/${language}/${this.resourceId}`,
        server,
        owner,
        language,
        type: ResourceType.WORDS_LINKS,
        title: linksResource.metadata?.dublin_core?.title || linksResource.title || 'Translation Words Links',
        description: linksResource.metadata?.dublin_core?.description || linksResource.repo?.description || 'Cross-reference links between Bible words and Translation Words definitions',
        name: this.resourceId,
        version: linksResource.metadata?.dublin_core?.version || linksResource.release?.tag_name || '1.0',
        lastUpdated: new Date(linksResource.metadata?.dublin_core?.modified || linksResource.released || linksResource.repo?.updated_at || Date.now()),
        available: true,
        toc: {
          books: availableBooks
        },
        isAnchor: false,
        
        // Language metadata from Door43 API
        languageDirection: linksResource.language_direction as 'rtl' | 'ltr' || 'ltr',
        languageTitle: linksResource.language_title || language,
        languageIsGL: linksResource.language_is_gl || false,
        
        // Translation Words Links specific
        availableBooks,
        format: 'tsv',
        resourceId: this.resourceId,
        repoName: linksResource.name,
        fullName: linksResource.full_name || `${owner}/${repoName}`,
        htmlUrl: linksResource.html_url || `https://${server}/${owner}/${repoName}`,
        cloneUrl: linksResource.clone_url || `https://${server}/${owner}/${repoName}.git`,
        defaultBranch: linksResource.default_branch || 'master'
      };

      console.log(`✅ Door43TranslationWordsLinksAdapter - Metadata loaded:`, metadata);
      return metadata;

    } catch (error) {
      console.error(`❌ Door43TranslationWordsLinksAdapter - Failed to fetch links metadata:`, error);
      throw new ResourceError(
        `Failed to fetch Translation Words Links metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'METADATA_FETCH_FAILED'
      );
    }
  }

  /**
   * Get content for a specific book
   */
  async getBookContent(server: string, owner: string, language: string, bookCode: string): Promise<ProcessedWordsLinks> {
    try {
      console.log(`🔍 Door43TranslationWordsLinksAdapter - Fetching links for ${bookCode} from ${owner}/${language}`);

      const repoName = `${language}_${this.resourceId}`;
      const fileName = this.getBookFileName(bookCode);
      const fileUrl = `https://${server}/api/v1/repos/${owner}/${repoName}/raw/master/${fileName}`;
      
      console.log(`📡 Door43TranslationWordsLinksAdapter - Fetching: ${fileUrl}`);
      
      // Fetch the TSV content directly from the raw endpoint
      const contentResponse = await this.fetchWithTimeout(fileUrl, this.config.timeout);
      if (!contentResponse.ok) {
        throw new Error(`Translation Words Links file not found: ${contentResponse.status} ${contentResponse.statusText}`);
      }
      
      const tsvContent = await contentResponse.text();
      console.log(`📄 Downloaded TSV content: ${tsvContent.length} characters`);
      
      // Process the TSV content
      const processedLinks = await this.processTSVContent(tsvContent, bookCode);
      
      console.log(`✅ Processed ${processedLinks.links.length} word links for ${bookCode}`);
      return processedLinks;

    } catch (error) {
      console.error(`❌ Door43TranslationWordsLinksAdapter - Failed to fetch links for ${bookCode}:`, error);
      throw new ResourceError(
        `Failed to fetch Translation Words Links: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONTENT_FETCH_FAILED'
      );
    }
  }

  /**
   * Get list of available books
   */
  getAvailableBooks(server: string, owner: string, language: string): BookInfo[] {
    // Return common Bible books as fallback
    // The actual implementation is in the private async method used during metadata fetching
    return this.getCommonBibleBooks();
  }

  /**
   * Check if a specific book is available
   */
  async isBookAvailable(server: string, owner: string, language: string, bookCode: string): Promise<boolean> {
    try {
      const repoName = `${language}_${this.resourceId}`;
      const fileName = this.getBookFileName(bookCode);
      const fileUrl = `https://${server}/api/v1/repos/${owner}/${repoName}/raw/master/${fileName}`;
      const response = await fetch(fileUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if the resource is available
   */
  async isResourceAvailable(server: string, owner: string, language: string): Promise<boolean> {
    try {
      const repoName = `${language}_${this.resourceId}`; // e.g., "en_twl"
      const catalogUrl = `https://git.door43.org/api/v1/catalog/search?repo=${repoName}&owner=${owner}&stage=prod`;
      const response = await fetch(catalogUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get resource adapter information
   */
  getResourceInfo(): ResourceAdapterInfo {
    return {
      name: `Door43 Translation Words Links (${this.resourceId})`,
      description: 'Cross-reference links between Bible words and Translation Words definitions from Door43',
      supportedServers: ['git.door43.org'],
      fallbackOptions: [],
      processingCapabilities: ['tsv', 'cross-references', 'word-links']
    };
  }

  /**
   * Configure the adapter
   */
  configure(config: AdapterConfig): void {
    console.log(`🔧 Door43TranslationWordsLinksAdapter - Configure called with:`, config);
  }

  /**
   * Process TSV content into structured word links data
   */
  private async processTSVContent(tsvContent: string, bookCode: string): Promise<ProcessedWordsLinks> {
    console.log(`📋 Processing TSV content for ${bookCode}...`);
    
    const bookName = this.getBookName(bookCode);
    const lines = tsvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('Empty TSV content');
    }

    // Parse header row
    const headerLine = lines[0];
    const headers = headerLine.split('\t').map(h => h.trim());
    
    // Validate expected headers
    const expectedHeaders = ['Reference', 'ID', 'Tags', 'OrigWords', 'Occurrence', 'TWLink'];
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      console.warn(`Missing expected headers: ${missingHeaders.join(', ')}`);
    }

    // Parse data rows
    const links: TranslationWordsLink[] = [];
    const linksByChapter: Record<string, TranslationWordsLink[]> = {};
    const linksByCategory: Record<string, number> = {};

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split('\t');
      if (columns.length < expectedHeaders.length) {
        console.warn(`Skipping malformed line ${i + 1}: insufficient columns`);
        continue;
      }

      const link: TranslationWordsLink = {
        reference: columns[headers.indexOf('Reference')] || '',
        id: columns[headers.indexOf('ID')] || '',
        tags: columns[headers.indexOf('Tags')] || '',
        origWords: columns[headers.indexOf('OrigWords')] || '',
        occurrence: columns[headers.indexOf('Occurrence')] || '1',
        twLink: columns[headers.indexOf('TWLink')] || ''
      };

      links.push(link);

      // Group by chapter
      const chapterMatch = link.reference.match(/^(\d+):/);
      if (chapterMatch) {
        const chapter = chapterMatch[1];
        if (!linksByChapter[chapter]) {
          linksByChapter[chapter] = [];
        }
        linksByChapter[chapter].push(link);
      }

      // Count by category
      if (link.tags) {
        linksByCategory[link.tags] = (linksByCategory[link.tags] || 0) + 1;
      }
    }

    const chaptersWithLinks = Object.keys(linksByChapter).map(Number).sort((a, b) => a - b);
    const linksPerChapter: Record<string, number> = {};
    Object.keys(linksByChapter).forEach(chapter => {
      linksPerChapter[chapter] = linksByChapter[chapter].length;
    });

    const processedLinks: ProcessedWordsLinks = {
      bookCode,
      bookName,
      links,
      linksByChapter,
      metadata: {
        bookCode,
        bookName,
        processingDate: new Date().toISOString(),
        totalLinks: links.length,
        chaptersWithLinks,
        statistics: {
          totalLinks: links.length,
          linksPerChapter,
          linksByCategory
        }
      }
    };

    console.log(`✅ TSV processing complete: ${links.length} word links`);
    return processedLinks;
  }

  /**
   * Fetch available books by exploring the repository structure
   */
  private async fetchAvailableBooks(server: string, owner: string, repoName: string): Promise<BookInfo[]> {
    try {
      const contentsUrl = `https://${server}/api/v1/repos/${owner}/${repoName}/contents`;
      const response = await this.fetchWithTimeout(contentsUrl, 10000);
      
      if (!response.ok) {
        console.warn(`Could not fetch repository contents: ${response.status}`);
        return this.getCommonBibleBooks();
      }
      
      const contents = await response.json();
      const books: BookInfo[] = [];
      
      for (const item of contents) {
        if (item.type === 'file' && item.name.startsWith('twl_') && item.name.endsWith('.tsv')) {
          const bookCode = item.name.replace('twl_', '').replace('.tsv', '').toLowerCase();
          const bookName = this.getBookName(bookCode);
          
          books.push({
            bookCode,
            bookName,
            fileName: item.name,
            size: item.size || 0,
            lastModified: new Date() // TSV files don't have detailed timestamps in this API
          });
        }
      }
      
      console.log(`📚 Found ${books.length} word links books in ${repoName}`);
      return books.sort((a, b) => a.bookCode.localeCompare(b.bookCode));
      
    } catch (error) {
      console.warn(`Could not fetch available books: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.getCommonBibleBooks();
    }
  }

  /**
   * Get common Bible books as fallback
   */
  private getCommonBibleBooks(): BookInfo[] {
    const books = [
      'gen', 'exo', 'lev', 'num', 'deu', 'jos', 'jdg', 'rut', '1sa', '2sa',
      '1ki', '2ki', '1ch', '2ch', 'ezr', 'neh', 'est', 'job', 'psa', 'pro',
      'ecc', 'sng', 'isa', 'jer', 'lam', 'ezk', 'dan', 'hos', 'jol', 'amo',
      'oba', 'jon', 'mic', 'nam', 'hab', 'zep', 'hag', 'zec', 'mal',
      'mat', 'mrk', 'luk', 'jhn', 'act', 'rom', '1co', '2co', 'gal', 'eph',
      'php', 'col', '1th', '2th', '1ti', '2ti', 'tit', 'phm', 'heb', 'jas',
      '1pe', '2pe', '1jn', '2jn', '3jn', 'jud', 'rev'
    ];

    return books.map(bookCode => ({
      bookCode,
      bookName: this.getBookName(bookCode),
      fileName: this.getBookFileName(bookCode),
      size: 0,
      lastModified: new Date()
    }));
  }

  /**
   * Get book file name for Translation Words Links
   */
  private getBookFileName(bookCode: string): string {
    return `twl_${bookCode.toUpperCase()}.tsv`;
  }

  /**
   * Get human-readable book name
   */
  private getBookName(bookCode: string): string {
    const bookNames: Record<string, string> = {
      'gen': 'Genesis', 'exo': 'Exodus', 'lev': 'Leviticus', 'num': 'Numbers', 'deu': 'Deuteronomy',
      'jos': 'Joshua', 'jdg': 'Judges', 'rut': 'Ruth', '1sa': '1 Samuel', '2sa': '2 Samuel',
      '1ki': '1 Kings', '2ki': '2 Kings', '1ch': '1 Chronicles', '2ch': '2 Chronicles',
      'ezr': 'Ezra', 'neh': 'Nehemiah', 'est': 'Esther', 'job': 'Job', 'psa': 'Psalms',
      'pro': 'Proverbs', 'ecc': 'Ecclesiastes', 'sng': 'Song of Songs', 'isa': 'Isaiah',
      'jer': 'Jeremiah', 'lam': 'Lamentations', 'ezk': 'Ezekiel', 'dan': 'Daniel',
      'hos': 'Hosea', 'jol': 'Joel', 'amo': 'Amos', 'oba': 'Obadiah', 'jon': 'Jonah',
      'mic': 'Micah', 'nam': 'Nahum', 'hab': 'Habakkuk', 'zep': 'Zephaniah', 'hag': 'Haggai',
      'zec': 'Zechariah', 'mal': 'Malachi',
      'mat': 'Matthew', 'mrk': 'Mark', 'luk': 'Luke', 'jhn': 'John', 'act': 'Acts',
      'rom': 'Romans', '1co': '1 Corinthians', '2co': '2 Corinthians', 'gal': 'Galatians',
      'eph': 'Ephesians', 'php': 'Philippians', 'col': 'Colossians', '1th': '1 Thessalonians',
      '2th': '2 Thessalonians', '1ti': '1 Timothy', '2ti': '2 Timothy', 'tit': 'Titus',
      'phm': 'Philemon', 'heb': 'Hebrews', 'jas': 'James', '1pe': '1 Peter', '2pe': '2 Peter',
      '1jn': '1 John', '2jn': '2 John', '3jn': '3 John', 'jud': 'Jude', 'rev': 'Revelation'
    };
    
    return bookNames[bookCode.toLowerCase()] || bookCode.toUpperCase();
  }

  /**
   * Fetch with timeout utility
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
}
