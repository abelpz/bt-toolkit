/**
 * Book Translation Package Service
 * Modular service for fetching complete book translation packages from Door43
 */

import {
  BookTranslationPackageConfig,
  BookPackageRequest,
  BookTranslationPackage,
  OnDemandResourceRequest,
  OnDemandResource,
  DEFAULT_BOOK_PACKAGE_CONFIG,
  ResourceConfig
} from './BookTranslationPackageConfig';

// Re-export types for convenience
export type {
  BookTranslationPackageConfig,
  BookPackageRequest,
  BookTranslationPackage,
  OnDemandResourceRequest,
  OnDemandResource
};

import {
  parseTranslationNotes,
  parseTranslationWordsLinks,
  parseTranslationQuestions,
  parseTranslationWord,
  parseTranslationAcademyArticle,
  parseBibleText,
} from '../translationHelpsParser';

export interface Door43Repository {
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
  default_branch?: string;
  branch_or_tag_name?: string; // From catalog API
}

export interface ManifestProject {
  identifier: string;
  title: string;
  path?: string;
  categories?: string[];
}

export interface ResourceManifest {
  dublin_core: {
    conformsto: string;
    contributor: string[];
    creator: string;
    description: string;
    format: string;
    identifier: string;
    issued: string;
    language: {
      identifier: string;
      title: string;
      direction: string;
    };
    modified: string;
    publisher: string;
    relation: string[];
    rights: string;
    source: {
      identifier: string;
      language: string;
      version: string;
    }[];
    subject: string;
    title: string;
    type: string;
    version: string;
  };
  checking: {
    checking_entity: string[];
    checking_level: string;
  };
  projects: ManifestProject[];
}

export class BookTranslationPackageService {
  private config: BookTranslationPackageConfig;
  private baseUrl: string;
  private catalogUrl: string;
  private userAgent: string;
  private apiToken?: string;
  
  // Caches
  private repositoryCache = new Map<string, Door43Repository>();
  private manifestCache = new Map<string, ResourceManifest>();
  private packageCache = new Map<string, BookTranslationPackage>();
  private onDemandCache = new Map<string, OnDemandResource>();

  constructor(config: Partial<BookTranslationPackageConfig> = {}) {
    this.config = { ...DEFAULT_BOOK_PACKAGE_CONFIG, ...config };
    this.baseUrl = 'https://git.door43.org/api/v1';
    this.catalogUrl = 'https://git.door43.org/api/v1/catalog';
    this.userAgent = 'BookTranslationPackageService/1.0.0';
  }

  /**
   * Set API token for higher rate limits
   */
  setApiToken(token: string): void {
    this.apiToken = token;
  }

  /**
   * Fetch a complete book translation package
   */
  async fetchBookPackage(request: BookPackageRequest): Promise<BookTranslationPackage> {
    const cacheKey = `${request.organization}/${request.language}/${request.book}`;
    
    // Check cache first
    if (this.packageCache.has(cacheKey)) {
      const cached = this.packageCache.get(cacheKey)!;
      // Return cached if less than 1 hour old
      if (Date.now() - cached.fetchedAt.getTime() < 3600000) {
        console.log(`📦 Using cached package for ${cacheKey}`);
        return cached;
      }
    }

    console.log(`📦 Fetching book package: ${cacheKey}`);
    
    const packageResult: BookTranslationPackage = {
      book: request.book,
      language: request.language,
      organization: request.organization,
      fetchedAt: new Date(),
      repositories: {}
    };

    // Determine which resource types to fetch
    const resourceTypesToFetch = request.resourceTypes || 
      Object.keys(this.config.resourceTypes) as (keyof typeof this.config.resourceTypes)[];

    // Fetch book-specific resources in parallel
    const bookSpecificTypes = resourceTypesToFetch.filter(type => 
      this.config.resourceTypes[type].bookSpecific
    ) as (keyof typeof this.config.resourceTypes)[];

    const fetchPromises = bookSpecificTypes.map(async (resourceType) => {
      try {
        const result = await this.fetchBookSpecificResource(
          request.book,
          request.language,
          request.organization,
          resourceType
        );
        
        if (result) {
          (packageResult as any)[resourceType] = result.resource;
          packageResult.repositories[result.repositoryName] = {
            name: result.repositoryName,
            url: result.repository.url,
            manifest: result.manifest
          };
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch ${resourceType} for ${request.book}:`, error);
      }
    });

    await Promise.all(fetchPromises);

    // Cache the result
    this.packageCache.set(cacheKey, packageResult);
    
    console.log(`✅ Book package fetched for ${cacheKey}:`, {
      literalText: !!packageResult.literalText,
      simplifiedText: !!packageResult.simplifiedText,
      translationNotes: !!packageResult.translationNotes,
      translationWordsLinks: !!packageResult.translationWordsLinks,
      translationQuestions: !!packageResult.translationQuestions,
      repositories: Object.keys(packageResult.repositories).length
    });

    return packageResult;
  }

  /**
   * Fetch a book-specific resource (ULT, UST, TN, TWL, TQ)
   */
  private async fetchBookSpecificResource(
    book: string,
    language: string,
    organization: string,
    resourceType: keyof BookTranslationPackageConfig['resourceTypes']
  ): Promise<{
    resource: any;
    repository: Door43Repository;
    repositoryName: string;
    manifest: ResourceManifest;
  } | null> {
    
    const resourceConfig = this.config.resourceTypes[resourceType];
    if (!resourceConfig.bookSpecific) {
      throw new Error(`${resourceType} is not a book-specific resource`);
    }

    // Try primary and backup resource IDs
    const resourceIds = [resourceConfig.primary, ...(resourceConfig.backups || [])];
    
    for (const resourceId of resourceIds) {
      try {
        const repositoryName = `${language}_${resourceId}`;
        
        // Find repository
        console.log(`🔍 Looking for repository: ${repositoryName} (org: ${organization})`);
        const repository = await this.findRepository(repositoryName, organization);
        if (!repository) {
          console.warn(`📂 Repository not found: ${repositoryName}`);
          continue;
        }
        console.log(`✅ Found repository: ${repository.full_name}`);

        // Get manifest
        console.log(`📄 Getting manifest for: ${repositoryName}`);
        const manifest = await this.getRepositoryManifest(repository);
        if (!manifest) {
          console.warn(`📄 Manifest not found for: ${repositoryName}`);
          continue;
        }
        console.log(`✅ Got manifest for: ${repositoryName}`);

        // Find book file using manifest and file patterns
        console.log(`🔍 Looking for book file: ${book} in ${repositoryName}`);
        const bookFile = await this.findBookFile(repository, manifest, book, resourceConfig);
        if (!bookFile) {
          console.warn(`📄 Book file not found for ${book} in ${repositoryName}`);
          continue;
        }
        console.log(`✅ Found book file: ${bookFile.path}`);

        // Fetch and process the file
        const rawContent = await this.fetchRawFile(repository, bookFile.path);
        const processedResource = await this.processResource(
          resourceType,
          rawContent,
          book,
          resourceId.toUpperCase()
        );

        return {
          resource: {
            source: repositoryName,
            content: rawContent,
            processed: processedResource
          },
          repository,
          repositoryName,
          manifest
        };

      } catch (error) {
        console.warn(`⚠️ Failed to fetch ${resourceId} for ${book}:`, error);
        continue;
      }
    }

    return null;
  }

  /**
   * Find repository by name and organization
   */
  private async findRepository(repositoryName: string, organization: string): Promise<Door43Repository | null> {
    const cacheKey = `${organization}/${repositoryName}`;
    
    if (this.repositoryCache.has(cacheKey)) {
      return this.repositoryCache.get(cacheKey)!;
    }

    try {
      // Search in catalog first
      const catalogResults = await this.searchCatalog({
        owner: organization,
        stage: 'prod'
      });

      if (catalogResults && catalogResults.length > 0) {
        const catalogRepo = catalogResults.find(repo => 
          repo.name.toLowerCase() === repositoryName.toLowerCase()
        );

        if (catalogRepo) {
          console.log(`✅ Found repository in catalog: ${catalogRepo.full_name}`);
          console.log(`📋 Branch info - default_branch: ${catalogRepo.default_branch}, branch_or_tag_name: ${catalogRepo.branch_or_tag_name}`);
          
          // Ensure we have a default_branch, use the branch_or_tag_name from catalog
          const repository: Door43Repository = {
            ...catalogRepo,
            default_branch: catalogRepo.default_branch || catalogRepo.branch_or_tag_name || 'master'
          };
          
          this.repositoryCache.set(cacheKey, repository);
          return repository;
        }
      }

      // If not found in catalog, try direct API call
      console.log(`🔍 Trying direct API call for: ${organization}/${repositoryName}`);
      const directUrl = `${this.baseUrl}/repos/${organization}/${repositoryName}`;
      const response = await this.fetchWithRetry(directUrl);
      
      if (response.ok) {
        const repoData = await response.json();
        console.log(`✅ Found repository via direct API: ${repoData.full_name}`);
        
        const repo: Door43Repository = {
          name: repoData.name,
          owner: repoData.owner,
          full_name: repoData.full_name,
          description: repoData.description,
          subject: 'Unknown',
          language: 'unknown',
          stage: 'unknown',
          updated_at: repoData.updated_at,
          url: repoData.html_url,
          git_url: repoData.git_url,
          clone_url: repoData.clone_url,
          default_branch: repoData.default_branch || 'master' // Fallback to 'master'
        };
        
        this.repositoryCache.set(cacheKey, repo);
        return repo;
      } else {
        console.warn(`⚠️ Direct API call failed: ${response.status} ${response.statusText}`);
      }

    } catch (error) {
      console.warn(`⚠️ Failed to find repository ${repositoryName}:`, error);
    }

    return null;
  }

  /**
   * Get repository manifest
   */
  private async getRepositoryManifest(repository: Door43Repository): Promise<ResourceManifest | null> {
    const cacheKey = repository.full_name;
    
    if (this.manifestCache.has(cacheKey)) {
      return this.manifestCache.get(cacheKey)!;
    }

    try {
      // Try manifest.yaml first, then manifest.yml
      const manifestPaths = ['manifest.yaml', 'manifest.yml'];
      
      for (const manifestPath of manifestPaths) {
        try {
          console.log(`🔍 Trying manifest path: ${manifestPath}`);
          const manifestContent = await this.fetchRawFile(repository, manifestPath);
          console.log(`📄 Got manifest content (${manifestContent.length} chars)`);
          
          // Parse YAML (simple parsing for now)
          const manifest = this.parseYaml(manifestContent);
          console.log(`✅ Parsed manifest successfully`);
          
          this.manifestCache.set(cacheKey, manifest);
          return manifest;
        } catch (error) {
          console.warn(`⚠️ Failed to get manifest from ${manifestPath}:`, error);
          continue; // Try next path
        }
      }

    } catch (error) {
      console.warn(`⚠️ Failed to get manifest for ${repository.name}:`, error);
    }

    return null;
  }

  /**
   * Find book file in repository using manifest and file patterns
   */
  private async findBookFile(
    repository: Door43Repository,
    manifest: ResourceManifest,
    book: string,
    resourceConfig: ResourceConfig
  ): Promise<{ path: string; project?: ManifestProject } | null> {
    
    if (!resourceConfig.bookSpecific) {
      return null;
    }

    // First, try to find the book in manifest projects
    const bookProject = manifest.projects?.find(project => {
      const projectId = project.identifier?.toLowerCase();
      const searchId = book.toLowerCase();
      
      return projectId === searchId || 
             projectId === searchId.toLowerCase() ||
             project.title?.toLowerCase().includes(book.toLowerCase());
    });
    
    console.log(`🔍 Looking for book '${book}' in ${manifest.projects?.length || 0} projects`);
    if (bookProject) {
      console.log(`✅ Found book project: ${bookProject.identifier} -> ${bookProject.path}`);
    } else {
      console.log(`❌ Book '${book}' not found in manifest projects`);
      // Log available projects for debugging
      if (manifest.projects) {
        const projectIds = manifest.projects.map(p => p.identifier).slice(0, 10);
        console.log(`📋 Available project IDs (first 10): ${projectIds.join(', ')}`);
      }
    }

    if (bookProject && bookProject.path) {
      return { path: bookProject.path, project: bookProject };
    }

    // If not found in manifest, try file patterns
    const bookNumber = this.config.bookNumbers[book];
    const filePatterns = resourceConfig.filePattern(book, bookNumber);
    
    console.log(`🔍 Trying file patterns for ${book} (number: ${bookNumber}):`, filePatterns);

    for (const pattern of filePatterns) {
      try {
        const testUrl = `https://git.door43.org/${repository.full_name}/raw/branch/${repository.default_branch}/${pattern}`;
        console.log(`🔍 Testing file: ${testUrl}`);
        
        // Check if file exists
        const testResponse = await this.fetchWithRetry(testUrl, { method: 'HEAD' });
        
        if (testResponse.ok) {
          console.log(`✅ Found file: ${pattern}`);
          return { path: pattern };
        } else {
          console.log(`❌ File not found (${testResponse.status}): ${pattern}`);
        }
      } catch (error) {
        console.log(`❌ Error testing file ${pattern}:`, error);
        continue;
      }
    }

    return null;
  }

  /**
   * Fetch raw file content from repository
   */
  private async fetchRawFile(repository: Door43Repository, filePath: string): Promise<string> {
    // Try different refs (branches and tags) using the proper API endpoint
    const refsToTry = [
      repository.branch_or_tag_name, // This is usually the latest tag (like v86)
      repository.default_branch,
      'master',
      'main'
    ].filter(Boolean); // Remove undefined values
    
    for (const ref of refsToTry) {
      // Use the proper API endpoint with ref parameter that works for both branches and tags
      const url = `https://git.door43.org/api/v1/repos/${repository.full_name}/contents/${filePath}?ref=${ref}`;
      console.log(`🔍 Fetching raw file via API: ${url}`);
      
      const response = await this.fetchWithRetry(url);
      if (response.ok) {
        const data = await response.json();
        if (data.content) {
          // Content is base64 encoded
          const content = Buffer.from(data.content, 'base64').toString('utf-8');
          console.log(`✅ Successfully fetched: ${filePath} from ref ${ref}`);
          return content;
        }
      } else {
        console.warn(`⚠️ Failed to fetch from ref ${ref}: ${response.status}`);
      }
    }
    
    throw new Error(`Failed to fetch ${filePath} from any ref`);
  }

  /**
   * Process raw resource content into structured data
   */
  private async processResource(
    resourceType: keyof BookTranslationPackageConfig['resourceTypes'],
    rawContent: string,
    book: string,
    translation: string
  ): Promise<any> {
    
    switch (resourceType) {
      case 'literalText':
      case 'simplifiedText':
        return parseBibleText(rawContent, book, translation as 'ULT' | 'UST');
        
      case 'translationNotes':
        return parseTranslationNotes(rawContent, book);
        
      case 'translationWordsLinks':
        return parseTranslationWordsLinks(rawContent, book);
        
      case 'translationQuestions':
        return parseTranslationQuestions(rawContent, book);
        
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }
  }

  /**
   * Fetch on-demand resource (Translation Academy or Translation Words)
   */
  async fetchOnDemandResource(request: OnDemandResourceRequest): Promise<OnDemandResource | null> {
    const cacheKey = `${request.type}:${request.organization}/${request.language}/${request.identifier}`;
    
    // Check cache
    if (this.onDemandCache.has(cacheKey)) {
      const cached = this.onDemandCache.get(cacheKey)!;
      // Return cached if less than 24 hours old
      if (Date.now() - cached.fetchedAt.getTime() < 86400000) {
        return cached;
      }
    }

    console.log(`🔍 Fetching on-demand resource: ${cacheKey}`);

    try {
      let resource: OnDemandResource | null = null;

      if (request.type === 'translation-academy') {
        resource = await this.fetchTranslationAcademyArticle(request);
      } else if (request.type === 'translation-words') {
        resource = await this.fetchTranslationWordsArticle(request);
      }

      if (resource) {
        this.onDemandCache.set(cacheKey, resource);
      }

      return resource;

    } catch (error) {
      console.error(`❌ Failed to fetch on-demand resource ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * Fetch Translation Academy article
   */
  private async fetchTranslationAcademyArticle(request: OnDemandResourceRequest): Promise<OnDemandResource | null> {
    const repositoryName = `${request.language}_ta`;
    const repository = await this.findRepository(repositoryName, request.organization);
    
    if (!repository) {
      return null;
    }

    // TA articles are typically in process/, translate/, checking/, or intro/ directories
    const possiblePaths = [
      `process/${request.identifier}/01.md`,
      `translate/${request.identifier}/01.md`,
      `checking/${request.identifier}/01.md`,
      `intro/${request.identifier}/01.md`
    ];

    for (const path of possiblePaths) {
      try {
        const content = await this.fetchRawFile(repository, path);
        const processed = parseTranslationAcademyArticle(content, request.identifier);
        
        return {
          type: 'translation-academy',
          identifier: request.identifier,
          source: repositoryName,
          content,
          processed,
          fetchedAt: new Date()
        };
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  /**
   * Fetch Translation Words article
   */
  private async fetchTranslationWordsArticle(request: OnDemandResourceRequest): Promise<OnDemandResource | null> {
    const repositoryName = `${request.language}_tw`;
    const repository = await this.findRepository(repositoryName, request.organization);
    
    if (!repository) {
      return null;
    }

    // Parse word ID to get category and filename
    const [category, filename] = request.identifier.includes('/') 
      ? request.identifier.split('/')
      : ['kt', request.identifier]; // Default to 'kt' category

    const filePath = `bible/${category}/${filename}.md`;
    
    try {
      const content = await this.fetchRawFile(repository, filePath);
      const processed = parseTranslationWord(content, request.identifier, category);
      
      return {
        type: 'translation-words',
        identifier: request.identifier,
        source: repositoryName,
        content,
        processed,
        fetchedAt: new Date()
      };
    } catch (error) {
      console.warn(`⚠️ Failed to fetch TW article ${request.identifier}:`, error);
      return null;
    }
  }

  /**
   * Search catalog API
   */
  private async searchCatalog(params: {
    subject?: string;
    lang?: string;
    owner?: string;
    stage?: string;
  }): Promise<Door43Repository[]> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params.subject) searchParams.append('subject', params.subject);
      if (params.lang) searchParams.append('lang', params.lang);
      if (params.owner) searchParams.append('owner', params.owner);
      if (params.stage) searchParams.append('stage', params.stage);

      const url = `${this.catalogUrl}/search?${searchParams.toString()}`;
      console.log(`🔍 Searching catalog: ${url}`);
      
      const response = await this.fetchWithRetry(url);
      if (!response.ok) {
        console.warn(`⚠️ Catalog search failed: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      console.log(`📊 Catalog search response:`, data);
      
      // Handle different response formats
      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray(data.data)) {
        return data.data;
      } else if (data && Array.isArray(data.results)) {
        return data.results;
      } else {
        console.warn('⚠️ Unexpected catalog response format:', data);
        return [];
      }
    } catch (error) {
      console.warn('⚠️ Catalog search error:', error);
      return [];
    }
  }

  /**
   * Fetch with retry and rate limiting
   */
  private async fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.apiToken) {
      headers.Authorization = `token ${this.apiToken}`;
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        if (response.status === 429) {
          // Rate limited, wait and retry
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(`⚠️ Rate limited, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return response;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`⚠️ Request failed (attempt ${attempt}/${retries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  /**
   * Simple YAML parser (basic implementation for manifest files)
   */
  private parseYaml(yamlContent: string): ResourceManifest {
    try {
      const lines = yamlContent.split('\n');
      const result: any = {};
      let currentSection: string | null = null;
      let currentProject: any = null;
      let inProjects = false;
      let projectIndent = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        // Detect projects section
        if (trimmed === 'projects:') {
          inProjects = true;
          result.projects = [];
          continue;
        }
        
        if (inProjects) {
          const indent = line.length - line.trimStart().length;
          
          // New project (starts with - )
          if (trimmed.startsWith('- ')) {
            if (currentProject) {
              result.projects.push(currentProject);
            }
            currentProject = {};
            projectIndent = indent;
            
            // Handle inline title
            const titleMatch = trimmed.match(/^- title:\s*(.+)$/);
            if (titleMatch) {
              currentProject.title = titleMatch[1];
            }
            continue;
          }
          
          // Project properties
          if (currentProject && indent > projectIndent) {
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex > 0) {
              const key = trimmed.substring(0, colonIndex).trim();
              const value = trimmed.substring(colonIndex + 1).trim();
              
              if (value) {
                // Remove quotes and clean up value
                currentProject[key] = value.replace(/^['"]|['"]$/g, '');
              }
            }
          }
          
          // End of projects section (next top-level section)
          if (indent === 0 && trimmed.endsWith(':') && !trimmed.startsWith('- ')) {
            if (currentProject) {
              result.projects.push(currentProject);
              currentProject = null;
            }
            inProjects = false;
          }
        }
      }
      
      // Add the last project if we were still in projects
      if (currentProject) {
        result.projects.push(currentProject);
      }
      
      console.log(`📊 Parsed manifest with ${result.projects?.length || 0} projects`);
      return result as ResourceManifest;
      
    } catch (error) {
      throw new Error(`Failed to parse YAML: ${error}`);
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.repositoryCache.clear();
    this.manifestCache.clear();
    this.packageCache.clear();
    this.onDemandCache.clear();
    console.log('🧹 All caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    repositories: number;
    manifests: number;
    packages: number;
    onDemand: number;
  } {
    return {
      repositories: this.repositoryCache.size,
      manifests: this.manifestCache.size,
      packages: this.packageCache.size,
      onDemand: this.onDemandCache.size
    };
  }
}
