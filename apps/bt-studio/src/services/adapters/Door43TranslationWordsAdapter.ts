/**
 * Door43 Translation Words Adapter
 * 
 * Handles fetching and processing Translation Words (TW) resources from Door43.
 * Translation Words contain biblical term definitions organized in nested Markdown files
 * in a directory structure like: bible/kt/{term.md}, bible/names/{term.md}, bible/other/{term.md}
 */

import { 
  EntryOrganizedAdapter, 
  ResourceType, 
  ProcessedContent, 
  ResourceMetadata,
  EntryInfo,
  TranslationWord,
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

interface TranslationWordsMetadata extends ResourceMetadata {
  type: ResourceType.WORDS;
  entries: EntryInfo[];
}

export class Door43TranslationWordsAdapter implements EntryOrganizedAdapter {
  resourceType = ResourceType.WORDS;
  organizationType = 'entry' as const;
  serverId: string;
  resourceId: string;

  constructor(serverId = 'git.door43.org', resourceId = 'tw') {
    this.serverId = serverId;
    this.resourceId = resourceId;
  }

  /**
   * Get resource metadata including list of available translation words
   */
  async getResourceMetadata(server: string, owner: string, language: string): Promise<TranslationWordsMetadata> {
    try {
      console.log(`🔍 Door43TranslationWordsAdapter - Fetching metadata for ${server}/${owner}/${language}/${this.resourceId}`);

      // Get repository information from Door43 catalog API using specific repo search
      const repoName = `${language}_${this.resourceId}`; // e.g., "en_tw"
      const catalogUrl = `https://git.door43.org/api/v1/catalog/search?repo=${repoName}&owner=${owner}&stage=prod`;
      console.log(`📡 Door43TranslationWordsAdapter - Catalog URL: ${catalogUrl}`);

      const catalogResponse = await fetch(catalogUrl);
      if (!catalogResponse.ok) {
        throw new Error(`Failed to fetch catalog: ${catalogResponse.status} ${catalogResponse.statusText}`);
      }

      const catalogData: Door43CatalogResponse = await catalogResponse.json();
      console.log(`📋 Door43TranslationWordsAdapter - Catalog response:`, catalogData);

      // Handle Door43 Catalog API response format
      if (!catalogData.ok || !catalogData.data || !Array.isArray(catalogData.data) || catalogData.data.length === 0) {
        throw new Error(`No Translation Words resource (${this.resourceId}) found for ${owner}/${language}. Tried repo name: ${repoName}`);
      }

      const wordsResource = catalogData.data[0]; // Should be exactly one match

      console.log(`✅ Door43TranslationWordsAdapter - Found words resource:`, wordsResource);

      // Get the list of available translation words by exploring the repository structure
      const entries = await this.getAvailableTranslationWords(server, owner, language);

      const metadata: TranslationWordsMetadata = {
        id: this.resourceId,
        resourceKey: `${server}/${owner}/${language}/${this.resourceId}`,
        server,
        owner,
        language,
        type: ResourceType.WORDS,
        title: wordsResource.metadata?.dublin_core?.title || wordsResource.title || 'Translation Words',
        description: wordsResource.metadata?.dublin_core?.description || wordsResource.repo?.description || 'Biblical term definitions and explanations',
        name: this.resourceId,
        version: wordsResource.metadata?.dublin_core?.version || wordsResource.release?.tag_name || '1.0',
        lastUpdated: new Date(wordsResource.metadata?.dublin_core?.modified || wordsResource.released || wordsResource.repo?.updated_at || Date.now()),
        available: true,
        toc: {
          entries: entries
        },
        isAnchor: false,
        
        // Language metadata from Door43 API
        languageDirection: wordsResource.language_direction as 'rtl' | 'ltr' || 'ltr',
        languageTitle: wordsResource.language_title || language,
        languageIsGL: wordsResource.language_is_gl || false,
        
        // Translation Words specific
        entries: entries
      };

      console.log(`✅ Door43TranslationWordsAdapter - Metadata loaded:`, metadata);
      return metadata;

    } catch (error) {
      console.error(`❌ Door43TranslationWordsAdapter - Failed to fetch words metadata:`, error);
      throw new ResourceError(
        `Failed to fetch Translation Words metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'METADATA_FETCH_FAILED'
      );
    }
  }

  /**
   * Get content for a specific translation word entry
   */
  async getEntryContent(server: string, owner: string, language: string, entryId: string): Promise<ProcessedContent> {
    try {
      console.log(`🔍 Door43TranslationWordsAdapter - Fetching word content for ${entryId}`);

      // Parse entryId format: "bible/kt/god" or "bible/names/abraham" or "bible/other/bread"
      const [bibleDir, category, termId] = entryId.split('/');
      if (bibleDir !== 'bible' || !category || !termId) {
        throw new Error(`Invalid entry ID format: ${entryId}. Expected format: bible/category/term-id`);
      }

      // Fetch the markdown file for this translation word
      const fileUrl = `https://${server}/${owner}/${language}_${this.resourceId}/raw/master/${entryId}.md`;
      console.log(`📡 Door43TranslationWordsAdapter - Fetching: ${fileUrl}`);
      
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch translation word file for ${entryId}: ${response.status} ${response.statusText}`);
      }

      const markdownContent = await response.text();

      // Extract title from the markdown content (first # heading)
      const titleMatch = markdownContent.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : termId;

      // Extract definition from the markdown content (content under ## Definition)
      const definitionMatch = markdownContent.match(/##\s+Definition\s*\n\n([\s\S]*?)(?=\n##|\n$)/);
      const definition = definitionMatch ? definitionMatch[1].trim() : '';

      const translationWord: TranslationWord = {
        id: entryId,
        term: title,
        definition: definition || markdownContent // Fallback to full content if no definition section
      };

      console.log(`✅ Door43TranslationWordsAdapter - Word content loaded for ${entryId}:`, translationWord);

      const processedContent = {
        type: ResourceType.WORDS,
        language,
        owner,
        server,
        resourceId: this.resourceId,
        entryId: entryId,
        content: { word: translationWord },
        lastFetched: new Date(),
        size: markdownContent.length
      };

      console.log(`📦 Door43TranslationWordsAdapter - Returning ProcessedContent:`, processedContent);

      return processedContent.content;

    } catch (error) {
      console.error(`❌ Door43TranslationWordsAdapter - Failed to fetch word content for ${entryId}:`, error);
      throw new ResourceError(
        `Failed to fetch Translation Word: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONTENT_FETCH_FAILED'
      );
    }
  }

  /**
   * Get list of available translation words
   */
  async getAvailableEntries(server: string, owner: string, language: string): Promise<EntryInfo[]> {
    const words = await this.getAvailableTranslationWords(server, owner, language);
    
    return words.map(word => ({
      id: word.id,
      title: word.title,
      category: word.category,
      description: word.description
    }));
  }

  /**
   * Check if a specific translation word is available
   */
  async isEntryAvailable(server: string, owner: string, language: string, entryId: string): Promise<boolean> {
    try {
      // Check if the markdown file exists
      const fileUrl = `https://${server}/${owner}/${language}_${this.resourceId}/raw/master/${entryId}.md`;
      const response = await fetch(fileUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get available translation words by exploring the repository structure
   */
  private async getAvailableTranslationWords(server: string, owner: string, language: string): Promise<EntryInfo[]> {
    try {
      // For now, return a static list of common Translation Words
      // In a full implementation, this would explore the repository structure via Git API
      const commonWords: EntryInfo[] = [
        // Key Terms (bible/kt/)
        {
          id: 'bible/kt/god',
          title: 'God',
          category: 'keyTerm',
          description: 'The eternal being who created and rules over the universe'
        },
        {
          id: 'bible/kt/jesus',
          title: 'Jesus',
          category: 'keyTerm',
          description: 'The Son of God who became human to save people from sin'
        },
        {
          id: 'bible/kt/salvation',
          title: 'Salvation',
          category: 'keyTerm',
          description: 'Being saved or rescued from sin and its consequences'
        },
        {
          id: 'bible/kt/covenant',
          title: 'Covenant',
          category: 'keyTerm',
          description: 'A formal agreement or contract between two parties'
        },
        {
          id: 'bible/kt/faith',
          title: 'Faith',
          category: 'keyTerm',
          description: 'Trust or confidence in someone or something'
        },
        
        // Names (bible/names/)
        {
          id: 'bible/names/abraham',
          title: 'Abraham',
          category: 'properName',
          description: 'The man God chose to be the ancestor of his chosen people'
        },
        {
          id: 'bible/names/moses',
          title: 'Moses',
          category: 'properName',
          description: 'The prophet who led the Israelites out of Egypt'
        },
        {
          id: 'bible/names/david',
          title: 'David',
          category: 'properName',
          description: 'The king of Israel who was chosen by God'
        },
        {
          id: 'bible/names/jerusalem',
          title: 'Jerusalem',
          category: 'properName',
          description: 'The most important city in Israel'
        },
        
        // Other Terms (bible/other/)
        {
          id: 'bible/other/bread',
          title: 'Bread',
          category: 'generalTerm',
          description: 'A food made from flour mixed with water and baked'
        },
        {
          id: 'bible/other/shepherd',
          title: 'Shepherd',
          category: 'generalTerm',
          description: 'A person who takes care of sheep'
        },
        {
          id: 'bible/other/temple',
          title: 'Temple',
          category: 'generalTerm',
          description: 'A building where people worship God'
        },
        {
          id: 'bible/other/priest',
          title: 'Priest',
          category: 'generalTerm',
          description: 'A person who performs religious ceremonies'
        }
      ];

      console.log(`📋 Door43TranslationWordsAdapter - Using common words list:`, commonWords);
      return commonWords;

    } catch (error) {
      console.warn(`⚠️ Door43TranslationWordsAdapter - Failed to get words list, using fallback:`, error);
      return [];
    }
  }

  /**
   * Check if content has changed (SHA-based change detection)
   */
  async hasContentChanged?(server: string, owner: string, language: string, entryId: string, cachedSha?: string): Promise<boolean> {
    // For Translation Words, we don't have SHA information readily available
    // Since these are relatively stable content, we can assume they don't change frequently
    // Return false to indicate content hasn't changed, allowing cache usage
    console.log(`🔍 Door43TranslationWordsAdapter - hasContentChanged check for ${entryId}, cachedSha: ${cachedSha}`);
    console.log(`📋 Door43TranslationWordsAdapter - Returning false (content assumed unchanged) to use cache`);
    return false;
  }

  /**
   * Get current SHA for content (for change detection)
   */
  getCurrentSha?(server: string, owner: string, language: string, entryId: string): string | undefined {
    // We don't have SHA information for translation words
    // Return undefined to skip SHA-based change detection
    return undefined;
  }

  /**
   * Check if the resource is available
   */
  async isResourceAvailable(server: string, owner: string, language: string): Promise<boolean> {
    try {
      const repoName = `${language}_${this.resourceId}`; // e.g., "en_tw"
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
      name: `Door43 Translation Words (${this.resourceId})`,
      description: 'Biblical term definitions and explanations from Door43',
      supportedServers: ['git.door43.org'],
      fallbackOptions: [],
      processingCapabilities: ['metadata', 'content', 'entries', 'markdown']
    };
  }

  /**
   * Configure the adapter
   */
  configure(config: AdapterConfig): void {
    // For now, no configuration needed
    // In a full implementation, this could configure categories, caching, etc.
    console.log(`🔧 Door43TranslationWordsAdapter - Configure called with:`, config);
  }
}
