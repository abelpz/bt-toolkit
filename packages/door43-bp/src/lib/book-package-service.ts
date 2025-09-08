/**
 * Book Translation Package Service
 * Modular service for fetching complete book translation packages from Door43
 */

import {
  BookPackageRequest,
  BookTranslationPackage,
  BookTranslationPackageConfig,
  DEFAULT_BOOK_PACKAGE_CONFIG,
  OnDemandResource,
  OnDemandResourceRequest,
} from './config.js';

import {
  BookPackageServiceOptions,
  CacheStats,
  Door43Repository,
  FetchResult,
  ResourceManifest,
} from './types.js';

export class BookPackageService {
  private config: BookTranslationPackageConfig;
  private baseUrl: string;
  private catalogUrl: string;
  private userAgent: string;
  private timeout: number;
  private maxRetries: number;
  private debug: boolean;
  private fetchFn: typeof fetch;

  // Multi-level caching
  private repositoryCache = new Map<string, Door43Repository>();
  private manifestCache = new Map<string, ResourceManifest>();
  private bookPackageCache = new Map<string, BookTranslationPackage>();
  private onDemandCache = new Map<string, OnDemandResource>();

  constructor(
    config: BookTranslationPackageConfig = DEFAULT_BOOK_PACKAGE_CONFIG,
    options: BookPackageServiceOptions = {}
  ) {
    this.config = config;
    this.baseUrl = options.baseUrl || 'https://git.door43.org';
    this.catalogUrl = `${this.baseUrl}/api/v1/catalog/search`; // Use v1 API as documented
    this.userAgent = 'BookPackageService/1.0.0';
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.debug = options.debug || false;
    this.fetchFn = options.fetchFn || fetch;

    this.log('📦 BookPackageService initialized', {
      baseUrl: this.baseUrl,
      catalogUrl: this.catalogUrl,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      debug: this.debug,
    });
  }

  /**
   * Fetch a complete book translation package
   */
  async fetchBookPackage(
    request: BookPackageRequest
  ): Promise<FetchResult<BookTranslationPackage>> {
    const cacheKey = `${request.organization}/${request.language}/${request.book}`;

    // Check cache first
    if (this.bookPackageCache.has(cacheKey)) {
      this.log(`📦 Using cached package for ${cacheKey}`);
      return {
        success: true,
        data: this.bookPackageCache.get(cacheKey)!,
        source: 'cache',
      };
    }

    try {
      this.log(`🔍 Fetching book package for ${cacheKey}`);

      const bookPackage: BookTranslationPackage = {
        book: request.book,
        language: request.language,
        organization: request.organization,
        fetchedAt: new Date(),
        repositories: {},
      };

      const resourceTypes =
        request.resourceTypes ||
        (Object.keys(
          this.config.resourceTypes
        ) as (keyof BookTranslationPackageConfig['resourceTypes'])[]);

      // Fetch book-specific resources
      for (const resourceType of resourceTypes) {
        const resourceConfig = this.config.resourceTypes[resourceType];

        if (resourceConfig.bookSpecific) {
          const result = await this.fetchBookSpecificResource(
            request.book,
            request.language,
            request.organization,
            resourceType,
            resourceConfig
          );

          if (result.success && result.data) {
            (bookPackage as any)[resourceType] = result.data;
          }
        }
      }

      // Cache the result
      this.bookPackageCache.set(cacheKey, bookPackage);

      this.log(`✅ Book package fetched for ${cacheKey}`, {
        literalText: !!bookPackage.literalText,
        simplifiedText: !!bookPackage.simplifiedText,
        translationNotes: !!bookPackage.translationNotes,
        translationQuestions: !!bookPackage.translationQuestions,
        translationWordsLinks: !!bookPackage.translationWordsLinks,
        repositories: Object.keys(bookPackage.repositories).length,
      });

      return {
        success: true,
        data: bookPackage,
        source: 'api',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.log(
        `❌ Failed to fetch book package for ${cacheKey}: ${errorMessage}`
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Fetch an on-demand resource (Translation Academy or Translation Words)
   */
  async fetchOnDemandResource(
    request: OnDemandResourceRequest
  ): Promise<FetchResult<OnDemandResource>> {
    const cacheKey = `${request.type}/${request.organization}/${request.language}/${request.identifier}`;

    // Check cache first
    if (this.onDemandCache.has(cacheKey)) {
      this.log(`📚 Using cached on-demand resource for ${cacheKey}`);
      return {
        success: true,
        data: this.onDemandCache.get(cacheKey)!,
        source: 'cache',
      };
    }

    try {
      this.log(`🔍 Fetching on-demand resource: ${cacheKey}`);

      const resourceConfig =
        request.type === 'translation-academy'
          ? this.config.resourceTypes.translationAcademy
          : this.config.resourceTypes.translationWords;

      // Find the repository
      const repository = await this.findRepository(
        request.language,
        request.organization,
        resourceConfig.primary
      );

      if (!repository) {
        throw new Error(`Repository not found for ${request.type}`);
      }

      // For now, return a placeholder - this would need specific implementation
      // based on how TA and TW articles are structured in the repositories
      const resource: OnDemandResource = {
        type: request.type,
        identifier: request.identifier,
        source: repository.name,
        content: '', // Would fetch actual content
        fetchedAt: new Date(),
      };

      this.onDemandCache.set(cacheKey, resource);

      return {
        success: true,
        data: resource,
        source: 'api',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.log(
        `❌ Failed to fetch on-demand resource ${cacheKey}: ${errorMessage}`
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return {
      repositories: this.repositoryCache.size,
      manifests: this.manifestCache.size,
      bookPackages: this.bookPackageCache.size,
      onDemandResources: this.onDemandCache.size,
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.repositoryCache.clear();
    this.manifestCache.clear();
    this.bookPackageCache.clear();
    this.onDemandCache.clear();
    this.log('🧹 All caches cleared');
  }

  // Private methods

  private async fetchBookSpecificResource(
    book: string,
    language: string,
    organization: string,
    resourceType: string,
    resourceConfig: any
  ): Promise<FetchResult<any>> {
    try {
      this.log(`🔍 Fetching ${resourceType} for ${book}`);
      this.log(`🔧 Resource config:`, {
        primary: resourceConfig.primary,
        bookSpecific: resourceConfig.bookSpecific,
      });

      // Find repository
      const repository = await this.findRepository(
        language,
        organization,
        resourceConfig.primary
      );

      if (!repository) {
        // Try backup repositories
        for (const backup of resourceConfig.backups || []) {
          const backupRepo = await this.findRepository(
            language,
            organization,
            backup
          );
          if (backupRepo) {
            this.log(`📂 Using backup repository: ${backup}`);
            return await this.fetchResourceFromRepository(
              backupRepo,
              book,
              resourceConfig
            );
          }
        }

        this.log(
          `📂 Repository not found: ${language}_${resourceConfig.primary}`
        );
        return {
          success: false,
          error: `Repository not found: ${language}_${resourceConfig.primary}`,
        };
      }

      return await this.fetchResourceFromRepository(
        repository,
        book,
        resourceConfig
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.log(
        `❌ Error fetching ${resourceType} for ${book}: ${errorMessage}`
      );
      return { success: false, error: errorMessage };
    }
  }

  private async fetchResourceFromRepository(
    repository: Door43Repository,
    book: string,
    resourceConfig: any
  ): Promise<FetchResult<any>> {
    try {
      // Get manifest
      const manifest = await this.getRepositoryManifest(repository);
      if (!manifest) {
        return { success: false, error: 'Failed to get repository manifest' };
      }

      // Find book file
      const bookNumber = this.config.bookNumbers[book];
      const filePatterns = resourceConfig.filePattern(book, bookNumber);
      this.log(`🔍 Looking for ${book} with patterns:`, filePatterns);
      this.log(`📖 Book number for ${book}:`, bookNumber);

      const bookFile = this.findBookFile(manifest, book, filePatterns);
      if (!bookFile) {
        this.log(
          `❌ Book file not found for ${book} with patterns:`,
          filePatterns
        );
        return { success: false, error: `Book file not found for ${book}` };
      }

      this.log(`✅ Found book file:`, bookFile.path);

      // Fetch file content
      const content = await this.fetchRawFile(repository, bookFile.path);

      return {
        success: true,
        data: {
          source: repository.name,
          content: content,
          processed: null, // Would process content based on type
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private async findRepository(
    language: string,
    organization: string,
    resourceId: string
  ): Promise<Door43Repository | null> {
    const repoName = `${language}_${resourceId}`;
    const cacheKey = `${organization}/${repoName}`;

    // Check cache first
    if (this.repositoryCache.has(cacheKey)) {
      this.log(`📂 Using cached repository: ${cacheKey}`);
      return this.repositoryCache.get(cacheKey)!;
    }

    try {
      // Search catalog
      this.log(`🔍 Searching catalog for: ${cacheKey}`);
      const catalogResults = await this.searchCatalog(language, resourceId);

      if (catalogResults && catalogResults.length > 0) {
        const catalogRepo = catalogResults.find(
          (repo) => repo.owner?.login === organization && repo.name === repoName
        );

        if (catalogRepo) {
          const repository: Door43Repository = {
            name: catalogRepo.name,
            owner: catalogRepo.owner,
            full_name: catalogRepo.full_name,
            description: catalogRepo.description || '',
            subject: catalogRepo.subject || '',
            language: catalogRepo.language || language,
            stage: catalogRepo.stage || '',
            updated_at: catalogRepo.updated_at || '',
            url: catalogRepo.url || '',
            git_url: catalogRepo.git_url || '',
            clone_url: catalogRepo.clone_url || '',
            default_branch: catalogRepo.default_branch,
            branch_or_tag_name: catalogRepo.branch_or_tag_name,
          };

          this.repositoryCache.set(cacheKey, repository);
          this.log(`✅ Found repository in catalog: ${cacheKey}`);
          return repository;
        }
      }

      // Try direct API call as fallback
      this.log(`🔍 Trying direct API call for: ${organization}/${repoName}`);
      const directResult = await this.fetchWithRetry(
        `${this.baseUrl}/api/v1/repos/${organization}/${repoName}`
      );

      if (directResult.ok) {
        const repoData = (await directResult.json()) as any;
        const repository: Door43Repository = {
          name: repoData.name,
          owner: repoData.owner,
          full_name: repoData.full_name,
          description: repoData.description || '',
          subject: repoData.subject || '',
          language: repoData.language || language,
          stage: repoData.stage || '',
          updated_at: repoData.updated_at || '',
          url: repoData.html_url || '',
          git_url: repoData.git_url || '',
          clone_url: repoData.clone_url || '',
          default_branch: repoData.default_branch,
        };

        this.repositoryCache.set(cacheKey, repository);
        this.log(`✅ Found repository via direct API: ${cacheKey}`);
        return repository;
      } else {
        this.log(`⚠️ Direct API call failed: ${directResult.status}`);
      }

      this.log(`📂 Repository not found: ${repoName}`);
      return null;
    } catch (error) {
      this.log(`❌ Error finding repository ${cacheKey}: ${error}`);
      return null;
    }
  }

  private async searchCatalog(
    language: string,
    resourceId: string
  ): Promise<any[]> {
    try {
      // Use the correct Door43 API v1 catalog endpoint
      const catalogApiUrl = `${this.baseUrl}/api/v1/catalog/search?lang=${language}&stage=prod`;
      const response = await this.fetchWithRetry(catalogApiUrl);
      if (!response.ok) {
        this.log(`⚠️ Catalog search failed: ${response.status}`);
        return [];
      }

      const data = (await response.json()) as any;

      // Handle different response formats
      let catalogData = data;
      if (data.data) {
        catalogData = Array.isArray(data.data)
          ? data.data
          : data.data.data || data.data.results || [];
      }

      if (!Array.isArray(catalogData)) {
        this.log(`⚠️ Catalog response is not an array:`, typeof catalogData);
        return [];
      }

      // Filter by language and resource
      const results = catalogData.filter(
        (repo: any) =>
          repo.language === language &&
          repo.name &&
          repo.name.includes(resourceId)
      );

      this.log(
        `📊 Catalog search results for ${language}_${resourceId}: ${results.length} found`
      );
      return results;
    } catch (error) {
      this.log(`❌ Catalog search error: ${error}`);
      return [];
    }
  }

  private async getRepositoryManifest(
    repository: Door43Repository
  ): Promise<ResourceManifest | null> {
    const cacheKey = repository.full_name;

    // Check cache first
    if (this.manifestCache.has(cacheKey)) {
      this.log(`📋 Using cached manifest for: ${cacheKey}`);
      return this.manifestCache.get(cacheKey)!;
    }

    try {
      this.log(`📋 Fetching manifest for: ${cacheKey}`);
      const content = await this.fetchRawFile(repository, 'manifest.yaml');
      const manifest = this.parseYaml(content);

      this.manifestCache.set(cacheKey, manifest);
      return manifest;
    } catch (error) {
      this.log(`❌ Failed to get manifest for ${cacheKey}: ${error}`);
      return null;
    }
  }

  private findBookFile(
    manifest: ResourceManifest,
    book: string,
    filePatterns: string[]
  ): { path: string } | null {
    const bookLower = book.toLowerCase();

    this.log(
      `🔍 Searching for book '${book}' (${bookLower}) in ${
        manifest.projects?.length || 0
      } projects`
    );

    // Log first few projects to see what we're working with
    if (manifest.projects && manifest.projects.length > 0) {
      this.log(
        `📋 First 5 projects:`,
        manifest.projects
          .slice(0, 5)
          .map((p) => ({ id: p.identifier, path: p.path }))
      );
    }

    for (const project of manifest.projects || []) {
      if (!project.identifier) {
        continue; // Skip undefined entries
      }

      const projectIdLower = project.identifier.toLowerCase();

      this.log(
        `🔍 Checking project: '${project.identifier}' (${projectIdLower}) vs '${book}' (${bookLower})`
      );

      // Check if project identifier matches book
      if (projectIdLower === bookLower) {
        this.log(
          `📖 Found book project: ${project.identifier} → ${project.path}`
        );
        return { path: project.path || `${project.identifier}.usfm` };
      }
    }

    this.log(`📖 No book file found for ${book} in manifest`);
    this.log(
      `📋 Available project identifiers:`,
      manifest.projects?.slice(0, 10).map((p) => p.identifier) || []
    );
    return null;
  }

  private async fetchRawFile(
    repository: Door43Repository,
    filePath: string
  ): Promise<string> {
    // Try different refs (branches and tags) using the proper API endpoint
    const refsToTry = [
      repository.branch_or_tag_name, // This is usually the latest tag (like v86)
      repository.default_branch,
      'master',
      'main',
    ].filter(Boolean); // Remove undefined values

    for (const ref of refsToTry) {
      // Use the proper API endpoint with ref parameter that works for both branches and tags
      const url = `${this.baseUrl}/api/v1/repos/${repository.full_name}/contents/${filePath}?ref=${ref}`;
      this.log(`🔍 Fetching raw file via API: ${url}`);

      const response = await this.fetchWithRetry(url);
      if (response.ok) {
        const data = (await response.json()) as any;
        if (data.content) {
          // Content is base64 encoded
          const content = Buffer.from(data.content, 'base64').toString('utf-8');
          this.log(`✅ Successfully fetched: ${filePath} from ref ${ref}`);
          return content;
        }
      } else {
        this.log(`⚠️ Failed to fetch from ref ${ref}: ${response.status}`);
      }
    }

    throw new Error(`Failed to fetch ${filePath} from any ref`);
  }

  private parseYaml(yamlContent: string): ResourceManifest {
    try {
      const lines = yamlContent.split('\n');
      const result: any = {};
      let currentProject: any = null;
      let inProjects = false;
      let projectIndent = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) continue;

        if (trimmed === 'projects:') {
          inProjects = true;
          result.projects = [];
          continue;
        }

        if (inProjects) {
          const indent = line.length - line.trimStart().length;

          if (trimmed.startsWith('- ')) {
            if (currentProject) {
              result.projects.push(currentProject);
            }
            currentProject = {};
            projectIndent = indent;

            const titleMatch = trimmed.match(/^- title:\s*(.+)$/);
            if (titleMatch) {
              currentProject.title = titleMatch[1];
            }
            continue;
          }

          if (currentProject && indent > projectIndent) {
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex > 0) {
              const key = trimmed.substring(0, colonIndex).trim();
              const value = trimmed.substring(colonIndex + 1).trim();

              if (value) {
                currentProject[key] = value.replace(/^['"]|['"]$/g, '');
              }
            }
          }

          if (
            indent === 0 &&
            trimmed.endsWith(':') &&
            !trimmed.startsWith('- ')
          ) {
            if (currentProject) {
              result.projects.push(currentProject);
              currentProject = null;
            }
            inProjects = false;
          }
        }
      }

      if (currentProject) {
        result.projects.push(currentProject);
      }

      this.log(
        `📊 Parsed manifest with ${result.projects?.length || 0} projects`
      );
      return result as ResourceManifest;
    } catch (error) {
      throw new Error(`Failed to parse YAML: ${error}`);
    }
  }

  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await this.fetchFn(url, {
          headers: {
            'User-Agent': this.userAgent,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        this.log(
          `⚠️ Attempt ${attempt}/${this.maxRetries} failed for ${url}: ${lastError.message}`
        );

        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  private log(message: string, data?: any): void {
    if (this.debug) {
      if (data) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  }
}
