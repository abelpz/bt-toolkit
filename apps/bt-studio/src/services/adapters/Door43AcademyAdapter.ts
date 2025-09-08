/**
 * Door43 Translation Academy Adapter
 * 
 * Handles fetching and processing Translation Academy (TA) resources from Door43.
 * Translation Academy contains training materials organized as nested Markdown articles
 * in a directory structure like: translate/figs-metaphor/{title.md, sub-title.md, 01.md}
 */

import { 
  EntryOrganizedAdapter, 
  ResourceType, 
  ProcessedContent, 
  ResourceMetadata,
  EntryInfo,
  AcademyArticle,
  ArticleInfo,
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

interface AcademyMetadata extends ResourceMetadata {
  type: ResourceType.ACADEMY;
  articles: ArticleInfo[];
}

export class Door43AcademyAdapter implements EntryOrganizedAdapter {
  resourceType = ResourceType.ACADEMY;
  organizationType = 'entry' as const;
  serverId: string;
  resourceId: string;

  constructor(serverId = 'git.door43.org', resourceId = 'ta') {
    this.serverId = serverId;
    this.resourceId = resourceId;
  }

  /**
   * Get resource metadata including list of available articles
   */
  async getResourceMetadata(server: string, owner: string, language: string): Promise<AcademyMetadata> {
    try {
      console.log(`🔍 Door43AcademyAdapter - Fetching metadata for ${server}/${owner}/${language}/${this.resourceId}`);

      // Get repository information from Door43 catalog API using specific repo search
      const repoName = `${language}_${this.resourceId}`; // e.g., "en_ta"
      const catalogUrl = `https://git.door43.org/api/v1/catalog/search?repo=${repoName}&owner=${owner}&stage=prod`;
      console.log(`📡 Door43AcademyAdapter - Catalog URL: ${catalogUrl}`);

      const catalogResponse = await fetch(catalogUrl);
      if (!catalogResponse.ok) {
        throw new Error(`Failed to fetch catalog: ${catalogResponse.status} ${catalogResponse.statusText}`);
      }

      const catalogData: Door43CatalogResponse = await catalogResponse.json();
      console.log(`📋 Door43AcademyAdapter - Catalog response:`, catalogData);

      // Handle Door43 Catalog API response format
      if (!catalogData.ok || !catalogData.data || !Array.isArray(catalogData.data) || catalogData.data.length === 0) {
        throw new Error(`No Translation Academy resource (${this.resourceId}) found for ${owner}/${language}. Tried repo name: ${repoName}`);
      }

      const academyResource = catalogData.data[0]; // Should be exactly one match

      console.log(`✅ Door43AcademyAdapter - Found academy resource:`, academyResource);

      // Get the list of available articles by exploring the repository structure
      const articles = await this.getAvailableArticles(server, owner, language);

      const metadata: AcademyMetadata = {
        id: this.resourceId,
        resourceKey: `${server}/${owner}/${language}/${this.resourceId}`,
        server,
        owner,
        language,
        type: ResourceType.ACADEMY,
        title: academyResource.metadata?.dublin_core?.title || academyResource.title || 'Translation Academy',
        description: academyResource.metadata?.dublin_core?.description || academyResource.repo?.description || 'Translation methodology and training materials',
        name: this.resourceId,
        version: academyResource.metadata?.dublin_core?.version || academyResource.release?.tag_name || '1.0',
        lastUpdated: new Date(academyResource.metadata?.dublin_core?.modified || academyResource.released || academyResource.repo?.updated_at || Date.now()),
        available: true,
        toc: {
          articles: articles
        },
        isAnchor: false,
        
        // Language metadata from Door43 API
        languageDirection: academyResource.language_direction as 'rtl' | 'ltr' || 'ltr',
        languageTitle: academyResource.language_title || language,
        languageIsGL: academyResource.language_is_gl || false,
        
        // Academy-specific
        articles: articles
      };

      console.log(`✅ Door43AcademyAdapter - Metadata loaded:`, metadata);
      return metadata;

    } catch (error) {
      console.error(`❌ Door43AcademyAdapter - Failed to fetch academy metadata:`, error);
      throw new ResourceError(
        `Failed to fetch Translation Academy metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'METADATA_FETCH_FAILED'
      );
    }
  }

  /**
   * Get content for a specific academy article
   */
  async getEntryContent(server: string, owner: string, language: string, entryId: string): Promise<ProcessedContent> {
    try {
      console.log(`🔍 Door43AcademyAdapter - Fetching article content for ${entryId}`);

      // Parse entryId format: "translate/figs-metaphor" 
      const [category, articleId] = entryId.split('/');
      if (!category || !articleId) {
        throw new Error(`Invalid entry ID format: ${entryId}. Expected format: category/article-id`);
      }

      // Fetch the three files that make up a Translation Academy article
      const baseUrl = `https://${server}/${owner}/${language}_${this.resourceId}/raw/master/${category}/${articleId}`;
      
      const [titleResponse, subtitleResponse, contentResponse] = await Promise.all([
        fetch(`${baseUrl}/title.md`),
        fetch(`${baseUrl}/sub-title.md`),
        fetch(`${baseUrl}/01.md`)
      ]);

      if (!titleResponse.ok || !subtitleResponse.ok || !contentResponse.ok) {
        throw new Error(`Failed to fetch article files for ${entryId}`);
      }

      const [title, subtitle, content] = await Promise.all([
        titleResponse.text(),
        subtitleResponse.text(),
        contentResponse.text()
      ]);

      // Combine the three files into a single article
      const combinedContent = `# ${title.trim()}\n## ${subtitle.trim()}\n\n${content}`;

      const article: AcademyArticle = {
        id: entryId,
        title: title.trim(),
        content: combinedContent,
        category: category
      };

      console.log(`✅ Door43AcademyAdapter - Article content loaded for ${entryId}:`, article);

      const processedContent = {
        type: ResourceType.ACADEMY,
        language,
        owner,
        server,
        resourceId: this.resourceId,
        articleId: entryId,
        content: { article: article },
        lastFetched: new Date(),
        size: combinedContent.length
      };

      console.log(`📦 Door43AcademyAdapter - Returning ProcessedContent:`, processedContent);

      return processedContent.content;

    } catch (error) {
      console.error(`❌ Door43AcademyAdapter - Failed to fetch article content for ${entryId}:`, error);
      throw new ResourceError(
        `Failed to fetch Translation Academy article: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONTENT_FETCH_FAILED'
      );
    }
  }

  /**
   * Get list of available academy articles
   */
  async getAvailableEntries(server: string, owner: string, language: string): Promise<EntryInfo[]> {
    const articles = await this.getAvailableArticles(server, owner, language);
    
    return articles.map(article => ({
      id: article.id,
      title: article.title,
      category: article.category,
      description: article.description
    }));
  }

  /**
   * Check if a specific article is available
   */
  async isEntryAvailable(server: string, owner: string, language: string, entryId: string): Promise<boolean> {
    try {
      const [category, articleId] = entryId.split('/');
      if (!category || !articleId) {
        return false;
      }

      // Check if the title.md file exists (simplest check)
      const titleUrl = `https://${server}/${owner}/${language}_${this.resourceId}/raw/master/${category}/${articleId}/title.md`;
      const response = await fetch(titleUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get available articles by exploring the repository structure
   */
  private async getAvailableArticles(server: string, owner: string, language: string): Promise<ArticleInfo[]> {
    try {
      // For now, return a static list of common Translation Academy articles
      // In a full implementation, this would explore the repository structure via Git API
      const commonArticles: ArticleInfo[] = [
        {
          id: 'translate/figs-metaphor',
          title: 'Metaphor',
          category: 'translate',
          description: 'What is metaphor and how do I translate it?'
        },
        {
          id: 'translate/figs-simile',
          title: 'Simile',
          category: 'translate',
          description: 'What is simile and how do I translate it?'
        },
        {
          id: 'translate/translate-names',
          title: 'How to Translate Names',
          category: 'translate',
          description: 'How do I translate names?'
        },
        {
          id: 'translate/translate-unknown',
          title: 'Translate the Unknown',
          category: 'translate',
          description: 'How do I translate ideas that my readers have never heard of?'
        },
        {
          id: 'checking/acceptable',
          title: 'Acceptable Style',
          category: 'checking',
          description: 'What is acceptable style?'
        },
        {
          id: 'checking/good',
          title: 'A Good Translation',
          category: 'checking',
          description: 'What is a good translation?'
        },
        {
          id: 'intro/translation-guidelines',
          title: 'Translation Guidelines',
          category: 'intro',
          description: 'What are the translation guidelines?'
        }
      ];

      console.log(`📋 Door43AcademyAdapter - Using common articles list:`, commonArticles);
      return commonArticles;

    } catch (error) {
      console.warn(`⚠️ Door43AcademyAdapter - Failed to get articles list, using fallback:`, error);
      return [];
    }
  }

  /**
   * Check if content has changed (SHA-based change detection)
   */
  async hasContentChanged?(server: string, owner: string, language: string, entryId: string, cachedSha?: string): Promise<boolean> {
    // For Translation Academy articles, we don't have SHA information readily available
    // Since these are relatively stable content, we can assume they don't change frequently
    // Return false to indicate content hasn't changed, allowing cache usage
    console.log(`🔍 Door43AcademyAdapter - hasContentChanged check for ${entryId}, cachedSha: ${cachedSha}`);
    console.log(`📋 Door43AcademyAdapter - Returning false (content assumed unchanged) to use cache`);
    return false;
  }

  /**
   * Get current SHA for content (for change detection)
   */
  getCurrentSha?(server: string, owner: string, language: string, entryId: string): string | undefined {
    // We don't have SHA information for academy articles
    // Return undefined to skip SHA-based change detection
    return undefined;
  }

  /**
   * Check if the resource is available
   */
  async isResourceAvailable(server: string, owner: string, language: string): Promise<boolean> {
    try {
      const repoName = `${language}_${this.resourceId}`; // e.g., "en_ta"
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
      name: `Door43 Translation Academy (${this.resourceId})`,
      description: 'Translation Academy training materials and methodology from Door43',
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
    console.log(`🔧 Door43AcademyAdapter - Configure called with:`, config);
  }
}
