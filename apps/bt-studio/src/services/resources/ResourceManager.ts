/**
 * Resource Manager Implementation
 * 
 * The orchestration layer that coordinates between Storage and Resource Adapters.
 * Implements intelligent caching, fallback logic, and error recovery.
 */

import { 
  ResourceManager, 
  StorageAdapter, 
  ResourceAdapter, 
  ResourceMetadata, 
  ResourceContent, 
  ProcessedContent, 
  ResourceType, 
  BookOrganizedAdapter, 
  EntryOrganizedAdapter,
  ResourceError,
  StorageInfo,
  AdapterConfig
} from '../../types/context';

export class ResourceManagerImpl implements ResourceManager {
  private storageAdapter: StorageAdapter | null = null;
  private resourceAdapters: ResourceAdapter[] = [];
  private metadataToAdapter: Map<string, ResourceAdapter> = new Map(); // resourceId -> adapter
  private isInitialized = false;
  
  // Configuration
  private config = {
    defaultTimeout: 30000,
    maxRetryAttempts: 3,
    retryDelay: 1000,
    cacheExpiryHours: 24,
    enableContentValidation: true
  };

  /**
   * Initialize the Resource Manager with storage and resource adapters
   */
  async initialize(storageAdapter: StorageAdapter, resourceAdapters: ResourceAdapter[]): Promise<void> {
    console.log(`🚀 Initializing ResourceManager with ${resourceAdapters.length} adapters`);
    
    this.storageAdapter = storageAdapter;
    
    // Initialize storage if needed
    if ('initialize' in storageAdapter && typeof storageAdapter.initialize === 'function') {
      await storageAdapter.initialize();
    }
    
    // Register resource adapters
    this.resourceAdapters = resourceAdapters;
    for (const adapter of resourceAdapters) {
      console.log(`📦 Registered ${adapter.resourceType} adapter: ${adapter.resourceId}`);
    }
    
    this.isInitialized = true;
    console.log(`✅ ResourceManager initialized successfully`);
  }

  /**
   * Get resource metadata (checks storage first, then fetches from adapters)
   */
  async getResourceMetadata(server: string, owner: string, language: string): Promise<ResourceMetadata[]> {
    this.ensureInitialized();
    
    console.log(`📋 Getting resource metadata for ${server}/${owner}/${language}`);
    
    try {
      // Step 1: Check storage for cached metadata
      console.log(`🔍 Checking storage for cached metadata: ${server}/${owner}/${language}`);
      const cachedMetadata = await this.storageAdapter!.getResourceMetadata(server, owner, language);
      console.log(`📋 Storage returned ${cachedMetadata.length} cached metadata records`);
      
      if (cachedMetadata.length > 0) {
        console.log(`✅ Found ${cachedMetadata.length} cached metadata records`);
        
        // Check if we have metadata for all registered adapters
        const adapterResourceTypes = this.resourceAdapters.map(adapter => adapter.resourceType);
        const cachedResourceTypes = cachedMetadata.map(meta => meta.type);
        const missingTypes = adapterResourceTypes.filter(type => !cachedResourceTypes.includes(type));
        
        if (missingTypes.length > 0) {
          console.log(`🔄 Missing metadata for adapter types: ${missingTypes.join(', ')}, fetching all metadata`);
        } else {
          // Check if cached metadata has valid types
          const hasInvalidTypes = cachedMetadata.some(meta => !meta.type || !Object.values(ResourceType).includes(meta.type));
          if (hasInvalidTypes) {
            console.log(`🔄 Cached metadata has invalid types, forcing refresh`);
            console.log(`   Invalid metadata types: ${cachedMetadata.map(m => `${m.id}(${m.type})`).join(', ')}`);
          } else {
            // Check if metadata is still fresh (within 24 hours)
            const isMetadataFresh = cachedMetadata.every(meta => {
              const ageHours = (Date.now() - meta.lastUpdated.getTime()) / (1000 * 60 * 60);
              return ageHours < this.config.cacheExpiryHours;
            });
            
            if (isMetadataFresh) {
              console.log(`📊 Using fresh cached metadata`);
              
              // Populate metadataToAdapter mapping for cached metadata
              for (const metadata of cachedMetadata) {
                const compatibleAdapter = this.resourceAdapters.find(adapter => 
                  adapter.resourceType === metadata.type && adapter.resourceId === metadata.id
                );
                if (compatibleAdapter) {
                  this.metadataToAdapter.set(metadata.id, compatibleAdapter);
                  console.log(`🔗 Mapped cached metadata id '${metadata.id}' to adapter with resourceId '${compatibleAdapter.resourceId}'`);
                }
              }
              
              return cachedMetadata;
            } else {
              console.log(`⏰ Cached metadata is stale, fetching fresh data`);
            }
          }
        }
      }
      
      // Step 2: Fetch fresh metadata from all available adapters
      const freshMetadata: ResourceMetadata[] = [];
      
      for (const adapter of this.resourceAdapters) {
        try {
          console.log(`🔍 Fetching metadata from ${adapter.resourceType} adapter`);
          
          const adapterMetadata = await this.fetchWithRetry(
            () => adapter.getResourceMetadata(server, owner, language),
            `${adapter.resourceType} metadata`
          );
          
          // Convert to full ResourceMetadata format
          const fullMetadata: ResourceMetadata = {
            id: adapterMetadata.id, // Use the actual resource ID from the adapter (ult, glt, ulb)
            server,
            owner,
            language,
            type: adapter.resourceType,
            title: adapterMetadata.title,
            description: adapterMetadata.description || '',
            name: `${adapter.resourceType}-${language}`,
            version: adapterMetadata.version,
            lastUpdated: new Date(),
            available: adapterMetadata.available,
            toc: adapterMetadata.toc || {},
            isAnchor: adapter.resourceType === ResourceType.SCRIPTURE && adapter.resourceId === 'literal-text'
          };
          
          // Store the adapter reference for content fetching
          this.metadataToAdapter.set(fullMetadata.id, adapter);
          console.log(`🔗 Mapped metadata id '${fullMetadata.id}' to adapter with resourceId '${adapter.resourceId}'`);
          
          freshMetadata.push(fullMetadata);
          console.log(`✅ Got metadata for ${adapter.resourceType}: ${fullMetadata.title} (id: ${fullMetadata.id}, type: ${fullMetadata.type})`);
          
        } catch (error) {
          console.warn(`⚠️ Failed to fetch metadata from ${adapter.resourceType} adapter:`, error);
          // Continue with other adapters
        }
      }
      
      // Step 3: Save fresh metadata to storage
      if (freshMetadata.length > 0) {
        console.log(`💾 Saving ${freshMetadata.length} fresh metadata records to storage`);
        await this.storageAdapter!.saveResourceMetadata(freshMetadata);
        console.log(`✅ Successfully saved ${freshMetadata.length} metadata records to storage`);
        
        // Debug: Verify the save worked
        const verifyMetadata = await this.storageAdapter!.getResourceMetadata(server, owner, language);
        console.log(`🔍 Verification: Storage now contains ${verifyMetadata.length} metadata records`);
      }
      
      // Step 4: Return fresh metadata, or fall back to cached if available
      return freshMetadata.length > 0 ? freshMetadata : cachedMetadata;
      
    } catch (error) {
      console.error(`❌ Failed to get resource metadata:`, error);
      throw new ResourceError(`Failed to get resource metadata: ${error instanceof Error ? error.message : 'Unknown error'}`, 'METADATA_FETCH_FAILED');
    }
  }

  /**
   * Get or fetch metadata for a specific adapter using its configured parameters
   */
  async getOrFetchMetadataForAdapter(
    adapter: ResourceAdapter, 
    server: string, 
    owner: string, 
    language: string
  ): Promise<ResourceMetadata | null> {
    this.ensureInitialized();

    console.log(`📋 Getting metadata for adapter ${adapter.resourceId} with ${server}/${owner}/${language}`);

    try {
      // Step 1: Check storage for cached metadata
      const cachedMetadata = await this.storageAdapter!.getResourceMetadata(server, owner, language);
      console.log(`🔍 Found ${cachedMetadata.length} cached metadata records for ${server}/${owner}/${language}`);
      
      // Find metadata for this specific adapter
      // First check if we already have a mapping for this specific adapter instance
      console.log(`🔍 Checking for existing mappings for adapter ${adapter.resourceId}. Current mappings:`, 
        Array.from(this.metadataToAdapter.entries()).map(([id, adp]) => `${id} -> ${adp.resourceId}`));
      
      const existingMappingId = Array.from(this.metadataToAdapter.entries())
        .find(([_, mappedAdapter]) => mappedAdapter === adapter)?.[0];
      
      let cachedAdapterMetadata = null;
      if (existingMappingId) {
        // Use the existing mapping for this specific adapter
        cachedAdapterMetadata = cachedMetadata.find(meta => meta.id === existingMappingId);
        console.log(`🔍 Found existing mapping for adapter ${adapter.resourceId} -> metadata ID ${existingMappingId}`);
      } else {
        // Look for metadata that matches this adapter's preferred resource IDs
        // For scripture adapters, check their resourceIds array (e.g., ['ult', 'glt', 'ulb'] or ['ust', 'gst'])
        if (adapter.resourceType === 'scripture' && 'resourceIds' in adapter) {
          const resourceIds = (adapter as any).resourceIds as string[];
          const availableMetadataIds = cachedMetadata.filter(meta => meta.type === 'scripture').map(meta => meta.id);
          console.log(`🔍 Looking for scripture metadata matching adapter ${adapter.resourceId} with resourceIds: ${resourceIds.join(', ')}`);
          console.log(`🔍 Available scripture metadata IDs: ${availableMetadataIds.join(', ')}`);
          
          // Find metadata that matches any of this adapter's resource IDs, in priority order
          for (const resourceId of resourceIds) {
            cachedAdapterMetadata = cachedMetadata.find(meta => 
              meta.type === adapter.resourceType && meta.id === resourceId
            );
            if (cachedAdapterMetadata) {
              console.log(`🔍 Found matching metadata ID ${cachedAdapterMetadata.id} for adapter ${adapter.resourceId} (priority: ${resourceIds.indexOf(resourceId) + 1}/${resourceIds.length})`);
              break;
            }
          }
          
          if (!cachedAdapterMetadata) {
            console.log(`🔍 No matching metadata found for adapter ${adapter.resourceId} with resourceIds: ${resourceIds.join(', ')}`);
            console.log(`📡 Will fetch fresh metadata for adapter ${adapter.resourceId}`);
          }
        } else {
          // For non-scripture adapters, look for exact match first, then any of the same type
          cachedAdapterMetadata = cachedMetadata.find(meta => 
            meta.id === adapter.resourceId && meta.type === adapter.resourceType
          ) || cachedMetadata.find(meta => meta.type === adapter.resourceType);
          
          console.log(`🔍 Looking for ${adapter.resourceType} metadata for adapter ${adapter.resourceId}`);
        }
      }

      if (cachedAdapterMetadata) {
        // Check if metadata is fresh
        const ageHours = (Date.now() - cachedAdapterMetadata.lastUpdated.getTime()) / (1000 * 60 * 60);
        const isFresh = ageHours < this.config.cacheExpiryHours;
        
        if (isFresh) {
          console.log(`✅ Using fresh cached metadata for ${adapter.resourceId}`);
          // Map the metadata to adapter
          this.metadataToAdapter.set(cachedAdapterMetadata.id, adapter);
          return cachedAdapterMetadata;
        } else {
          console.log(`⏰ Cached metadata for ${adapter.resourceId} is stale, fetching fresh`);
        }
      }

      // Step 2: Fetch fresh metadata from the specific adapter
      console.log(`📡 Fetching fresh metadata from adapter: ${adapter.resourceId}`);
      const freshAdapterMetadata = await this.fetchWithRetry(
        () => adapter.getResourceMetadata(server, owner, language),
        `${adapter.resourceType} metadata`
      );
      
      // Convert to full ResourceMetadata format
      const fullMetadata: ResourceMetadata = {
        id: freshAdapterMetadata.id, // Use the actual resource ID from the adapter (ult, glt, ulb)
        server,
        owner,
        language,
        type: adapter.resourceType,
        title: freshAdapterMetadata.title,
        description: freshAdapterMetadata.description || '',
        name: `${adapter.resourceType}-${language}`,
        version: freshAdapterMetadata.version,
        lastUpdated: new Date(),
        available: freshAdapterMetadata.available,
        toc: freshAdapterMetadata.toc || {},
        isAnchor: false // Will be set by ResourceConfigProcessor if needed
      };
      
      console.log(`✅ Got fresh metadata for ${adapter.resourceId}`);
      
      // Map the metadata to adapter
      this.metadataToAdapter.set(fullMetadata.id, adapter);
      
      // Save to storage
      await this.storageAdapter!.saveResourceMetadata([fullMetadata]);
      console.log(`💾 Saved fresh metadata for ${adapter.resourceId}`);
      
      return fullMetadata;
    } catch (error) {
      console.error(`❌ Failed to get metadata for adapter ${adapter.resourceId}:`, error);
      return null;
    }
  }

  /**
   * Register metadata-to-adapter mapping for resources processed externally
   * This is used when ResourceConfigProcessor fetches metadata directly from adapters
   */
  registerMetadataMapping(metadata: ResourceMetadata, adapter: ResourceAdapter): void {
    this.metadataToAdapter.set(metadata.id, adapter);
    console.log(`🔗 Registered metadata mapping: '${metadata.id}' -> adapter '${adapter.resourceId}'`);
  }

  /**
   * Get or fetch content (main orchestration method)
   * Implements the core caching strategy: Storage -> Adapter -> Save
   */
  async getOrFetchContent(key: string, resourceType: ResourceType): Promise<ProcessedContent | null> {
    this.ensureInitialized();
    
    console.log(`📖 Getting content for key: ${key}`);
    
    try {
      // Step 1: Check if content exists in storage
      console.log(`🔍 Checking cache for key: ${key}`);
      const cachedContent = await this.storageAdapter!.getResourceContent(key);
      console.log(`📋 Cache result:`, cachedContent ? `Found (${cachedContent.size} bytes, fetched: ${cachedContent.lastFetched})` : 'Not found');
      
      if (cachedContent && !this.isExpired(cachedContent)) {
        // Step 1.5: SHA-aware change detection optimization
        const resourceAdapter = this.resourceAdapters.find(adapter => adapter.resourceType === resourceType);
        if (resourceAdapter?.hasContentChanged && resourceAdapter.getCurrentSha) {
          const { server, owner, language, contentId } = this.parseKey(key);
          
          try {
            const hasChanged = await resourceAdapter.hasContentChanged(server, owner, language, contentId, cachedContent.sourceSha);
            
            if (!hasChanged) {
              console.log(`✅ Using cached content (${cachedContent.size} bytes, SHA unchanged)`);
              return cachedContent.content;
            } else {
              console.log(`🔄 Content changed (SHA mismatch), fetching update`);
            }
          } catch (error) {
            console.warn(`⚠️ SHA check failed, using cached content:`, error);
            return cachedContent.content;
          }
        } else {
          console.log(`✅ Using cached content (${cachedContent.size} bytes)`);
          return cachedContent.content;
        }
      }
      
      if (cachedContent) {
        console.log(`⏰ Cached content expired, fetching fresh data`);
      } else {
        console.log(`🔍 Content not in cache, fetching from adapter`);
      }
      
      // Step 2: Use appropriate resource adapter to fetch from external source
      const parsedKey = this.parseKey(key);
      console.log(`🔑 Parsed key:`, parsedKey);
      
      // Find the adapter that produced this resource's metadata
      let resourceAdapter = this.metadataToAdapter.get(parsedKey.resourceId);
      console.log(`🔍 Looking for adapter for resourceId '${parsedKey.resourceId}' in metadataToAdapter map (size: ${this.metadataToAdapter.size})`);
      
      // Fallback to finding by resource type if no specific mapping exists
      if (!resourceAdapter) {
        console.log(`⚠️ No specific adapter found for '${parsedKey.resourceId}', searching for compatible adapter`);
        
        // First try to find an adapter whose resourceId matches the parsed resourceId
        resourceAdapter = this.resourceAdapters.find(adapter => 
          adapter.resourceType === resourceType && adapter.resourceId === parsedKey.resourceId
        );
        
        // If still not found, try to find an adapter whose resourcePriority includes the resourceId
        if (!resourceAdapter) {
          resourceAdapter = this.resourceAdapters.find(adapter => 
            adapter.resourceType === resourceType && 
            (adapter as any).resourcePriority?.includes(parsedKey.resourceId)
          );
        }
        
        // NO FINAL FALLBACK - each adapter should only handle its own resource types
        if (resourceAdapter) {
          console.log(`✅ Found compatible adapter: ${resourceAdapter.resourceId} (priority: ${(resourceAdapter as any)?.resourcePriority || 'unknown'})`);
        } else {
          console.log(`❌ No compatible adapter found for resourceId '${parsedKey.resourceId}' with resourceType '${resourceType}'`);
        }
      } else {
        console.log(`✅ Found specific adapter for '${parsedKey.resourceId}': ${resourceAdapter.resourceId}`);
      }
      
      if (!resourceAdapter) {
        const availableAdapters = this.resourceAdapters
          .filter(adapter => adapter.resourceType === resourceType)
          .map(adapter => `${adapter.resourceId} (${(adapter as any)?.resourcePriority?.join(', ') || 'unknown'})`)
          .join(', ');
        
        throw new ResourceError(
          `No compatible adapter found for resourceId '${parsedKey.resourceId}' with resourceType '${resourceType}'. ` +
          `Available adapters: ${availableAdapters}`, 
          'ADAPTER_NOT_FOUND'
        );
      }
      
      // Step 3: Fetch and process content with retry logic
      const processedContent = await this.fetchContentWithRetry(resourceAdapter, key);
      
      // Step 4: Validate content if enabled
      if (this.config.enableContentValidation) {
        this.validateContent(processedContent, key);
      }
      
      // Step 5: Save to storage for offline use (with SHA information)
      const { server, owner, language, resourceId, contentId } = parsedKey;
      const currentSha = resourceAdapter.getCurrentSha?.(server, owner, language, contentId);
      
      // Use the resourceId from the parsed key since we already have the correct adapter
      const actualResourceId = resourceId;
      
      const contentToSave: ResourceContent = {
        key,
        resourceKey: `${server}/${owner}/${language}/${actualResourceId}`,
        resourceId: actualResourceId, // Use the actual resource ID from metadata (ult, glt, ulb)
        server,
        owner,
        language,
        type: resourceType,
        bookCode: resourceAdapter.organizationType === 'book' ? contentId : undefined,
        articleId: resourceAdapter.organizationType === 'entry' ? contentId : undefined,
        content: processedContent,
        lastFetched: new Date(),
        cachedUntil: this.calculateCacheExpiry(),
        checksum: this.calculateChecksum(processedContent),
        size: this.calculateContentSize(processedContent),
        // SHA-based change detection
        sourceSha: currentSha,
        sourceCommit: (processedContent as { metadata?: { sourceCommit?: string } }).metadata?.sourceCommit
      };
      
      await this.storageAdapter!.saveResourceContent(contentToSave);
      console.log(`💾 Saved content to storage (${contentToSave.size} bytes) with key: ${key}`);
      console.log(`📋 Content saved details:`, {
        key: contentToSave.key,
        resourceKey: contentToSave.resourceKey,
        resourceId: contentToSave.resourceId,
        type: contentToSave.type,
        articleId: contentToSave.articleId,
        size: contentToSave.size
      });
      
      return processedContent;
      
    } catch (error) {
      // Fallback to cached content if available, even if expired
      const cachedContent = await this.storageAdapter!.getResourceContent(key);
      if (cachedContent) {
        console.warn(`⚠️ Using expired cache for ${key} due to error:`, error);
        return cachedContent.content;
      }
      
      console.error(`❌ Failed to get content for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Preload multiple content items (batch operation)
   */
  async preloadContent(keys: string[], resourceType: ResourceType): Promise<void> {
    console.log(`📦 Preloading ${keys.length} content items`);
    
    const promises = keys.map(key => 
      this.getOrFetchContent(key, resourceType).catch(error => {
        console.warn(`⚠️ Failed to preload ${key}:`, error);
        return null;
      })
    );
    
    await Promise.all(promises);
    console.log(`✅ Preloading completed`);
  }

  /**
   * Clear expired content from storage
   */
  async clearExpiredContent(): Promise<void> {
    this.ensureInitialized();
    await this.storageAdapter!.clearExpiredContent();
    console.log(`🧹 Cleared expired content`);
  }

  /**
   * Invalidate specific content from cache
   */
  async invalidateCache(key: string): Promise<void> {
    this.ensureInitialized();
    
    // For now, we'll implement this by deleting the content
    // In a full implementation, we could mark it as invalid
    const transaction = await this.storageAdapter!.beginTransaction();
    await transaction.delete(key);
    await transaction.commit();
    
    console.log(`🗑️ Invalidated cache for ${key}`);
  }

  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<StorageInfo> {
    this.ensureInitialized();
    return await this.storageAdapter!.getStorageInfo();
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.storageAdapter) {
      throw new ResourceError('ResourceManager not initialized', 'NOT_INITIALIZED');
    }
  }

  private async fetchContentWithRetry(adapter: ResourceAdapter, key: string): Promise<ProcessedContent> {
    const config = this.getAdapterConfig(adapter);
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
      try {
        const { server, owner, language, contentId } = this.parseKey(key);
        
        console.log(`🔄 Attempt ${attempt}/${config.retryAttempts} for ${key}`);
        
        // Use appropriate method based on organization type
        if (adapter.organizationType === 'book') {
          const bookAdapter = adapter as BookOrganizedAdapter;
          return await this.timeoutPromise(
            bookAdapter.getBookContent(server, owner, language, contentId),
            config.timeout || this.config.defaultTimeout
          );
        } else {
          const entryAdapter = adapter as EntryOrganizedAdapter;
          return await this.timeoutPromise(
            entryAdapter.getEntryContent(server, owner, language, contentId),
            config.timeout || this.config.defaultTimeout
          );
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Attempt ${attempt} failed:`, error);
        
        if (attempt < config.retryAttempts) {
          const delay = config.retryDelay * attempt; // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }
    
    throw new ResourceError(`Failed to fetch ${key} after ${config.retryAttempts} attempts: ${lastError!.message}`, 'FETCH_FAILED');
  }

  private async fetchWithRetry<T>(operation: () => Promise<T>, description: string): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxRetryAttempts; attempt++) {
      try {
        return await this.timeoutPromise(operation(), this.config.defaultTimeout);
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ ${description} attempt ${attempt} failed:`, error);
        
        if (attempt < this.config.maxRetryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }
    
    throw new ResourceError(`Failed ${description} after ${this.config.maxRetryAttempts} attempts: ${lastError!.message}`, 'FETCH_FAILED');
  }

  private parseKey(key: string): { server: string; owner: string; language: string; resourceId: string; contentId: string } {
    // Parse key format: {server}/{owner}/{language}/{resourceId}/{content_id}
    const parts = key.split('/');
    if (parts.length < 5) {
      throw new ResourceError(`Invalid key format: ${key}`, 'INVALID_KEY');
    }
    
    const server = parts[0];
    const owner = parts[1];
    const language = parts[2];
    const resourceId = parts[3];
    
    // For academy resources (ta), the contentId includes the category and article
    // e.g., git.door43.org/unfoldingWord/en/ta/translate/figs-abstractnouns
    // contentId should be "translate/figs-abstractnouns"
    let contentId: string;
    if (resourceId === 'ta' && parts.length >= 6) {
      // Academy resource: join remaining parts as category/article-id
      contentId = parts.slice(4).join('/');
    } else {
      // Book-based resource: just the book code
      contentId = parts[4];
    }
    
    return {
      server,
      owner,
      language,
      resourceId,
      contentId
    };
  }

  private getAdapterConfig(adapter: ResourceAdapter): AdapterConfig & { retryAttempts: number; timeout: number; retryDelay: number } {
    // Get adapter's configuration or use defaults
    return {
      timeout: this.config.defaultTimeout,
      retryAttempts: this.config.maxRetryAttempts,
      retryDelay: this.config.retryDelay,
      fallbackOptions: [],
      processingCapabilities: []
    };
  }

  private isExpired(content: ResourceContent): boolean {
    if (!content.cachedUntil) return false;
    return Date.now() > content.cachedUntil.getTime();
  }

  private calculateCacheExpiry(): Date {
    return new Date(Date.now() + (this.config.cacheExpiryHours * 60 * 60 * 1000));
  }

  private calculateChecksum(content: ProcessedContent): string {
    // Simple checksum based on content size and structure
    const contentStr = JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < contentStr.length; i++) {
      const char = contentStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private calculateContentSize(content: ProcessedContent): number {
    return JSON.stringify(content).length;
  }

  private validateContent(content: ProcessedContent, key: string): void {
    if (!content) {
      throw new ResourceError(`Content is null or undefined for ${key}`, 'INVALID_CONTENT');
    }
    
    // Basic validation - ensure content has expected structure
    if (typeof content !== 'object') {
      throw new ResourceError(`Content is not an object for ${key}`, 'INVALID_CONTENT');
    }
    
    console.log(`✅ Content validation passed for ${key}`);
  }

  private async timeoutPromise<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export factory function for easy instantiation
export const createResourceManager = (): ResourceManager => {
  return new ResourceManagerImpl();
};
