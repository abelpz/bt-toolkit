/**
 * Unified Resource Service
 * Mobile-optimized service integrating sync, cache, and alignment for foundations-bt
 */

// Mock imports for development - replace with actual imports when packages are built
// import { 
//   Door43SyncOrchestrator,
//   createBidirectionalSyncOrchestrator,
//   createSyncOrchestrator
// } from '@bt-toolkit/door43-sync';

// Temporary mock types for development
type Door43SyncOrchestrator = any;
const createBidirectionalSyncOrchestrator = (...args: any[]): any => {
  console.log('Mock createBidirectionalSyncOrchestrator called with:', args);
  return {
    // Initialization methods
    initialize: async () => {
      console.log('📱 Mock sync orchestrator initialized');
      return { success: true };
    },
    isInitialized: () => true,
    
    // Resource methods
    getResourcesForReference: async () => {
      console.log('📚 Mock getResourcesForReference called');
      return [];
    },
    getWordInteractions: async () => {
      console.log('🔤 Mock getWordInteractions called');
      return null;
    },
    
    // Sync status methods
    getSyncStatus: () => ({ 
      state: 'idle' as const, 
      connected: true, 
      pendingChanges: 0,
      lastSync: new Date()
    }),
    getSyncStatistics: async () => ({ 
      cachedResources: 0, 
      totalCacheSize: 0,
      syncOperations: 0
    }),
    
    // Configuration methods
    setOfflineMode: (offline: boolean) => {
      console.log(`📴 Mock setOfflineMode: ${offline}`);
    },
    getCurrentScope: () => ({ 
      languages: ['en'], 
      books: ['JON', 'PHM'], 
      resourceTypes: ['bible-text', 'translation-notes'] 
    }),
    
    // Event methods
    addEventListener: () => {},
    removeEventListener: () => {},
    
    // Cleanup
    destroy: async () => {
      console.log('🧹 Mock sync orchestrator destroyed');
    }
  };
};
const createSyncOrchestrator = createBidirectionalSyncOrchestrator;
import { createMobileStorageBackend } from './mobile-storage-backend';

// Types for mobile app
export interface ScriptureReference {
  book: string;
  chapter: number;
  verse?: number;
}

export interface TranslationResource {
  id: string;
  type: 'bible-text' | 'translation-notes' | 'translation-words' | 'translation-questions' | 'translation-academy';
  language: string;
  book?: string;
  chapter?: number;
  verse?: number;
  content: any;
  metadata: {
    title?: string;
    description?: string;
    lastModified: Date;
    source: 'local' | 'door43' | 'cache';
    syncStatus?: 'synced' | 'pending' | 'conflict' | 'error';
  };
}

export interface AlignmentInteraction {
  word: string;
  originalText?: string;
  translationNotes: TranslationResource[];
  translationWords: TranslationResource[];
  relatedVerses: ScriptureReference[];
  crossReferences: {
    resourceId: string;
    type: string;
    relationship: string;
    confidence: number;
  }[];
}

export interface ResourceScope {
  languages: string[];
  books: string[];
  resourceTypes: string[];
  organization?: string;
  offline?: boolean;
}

/**
 * Unified Resource Service for Mobile
 * Provides alignment-centric resource management with Door43 sync
 */
export class UnifiedResourceService {
  private syncOrchestrator: Door43SyncOrchestrator;
  private storageBackend: any;
  private initialized = false;
  private currentScope: ResourceScope;
  private resourceCache = new Map<string, TranslationResource>();
  
  constructor(private config: {
    door43AuthToken?: string;
    offlineMode?: boolean;
    scope?: ResourceScope;
    cacheSize?: number;
  } = {}) {
    // Initialize mobile storage backend
    this.storageBackend = createMobileStorageBackend({
      maxCacheSize: config.cacheSize || 100 * 1024 * 1024, // 100MB
      persistLargeItems: true
    });
    
    // Initialize sync orchestrator
    if (config.door43AuthToken && !config.offlineMode) {
      this.syncOrchestrator = createBidirectionalSyncOrchestrator(
        this.storageBackend,
        config.door43AuthToken,
        {
          patchThreshold: 512 * 1024, // 512KB for mobile
          autoSyncBack: false // Manual sync for mobile
        }
      );
    } else {
      this.syncOrchestrator = createSyncOrchestrator(this.storageBackend, {
        behavior: {
          offlineMode: true,
          syncOnStartup: false,
          syncInterval: 0,
          batchUpdates: true
        }
      });
    }
    
    // Set default scope
    this.currentScope = config.scope || {
      languages: ['en'],
      books: ['GEN', 'MAT', 'JON'], // Default books
      resourceTypes: ['bible-text', 'translation-notes', 'translation-words'],
      offline: config.offlineMode || false
    };
    
    console.log('📱 Unified Resource Service created for mobile');
  }
  
  /**
   * Initialize the service
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    if (this.initialized) {
      return { success: true };
    }
    
    try {
      console.log('📱 Initializing Unified Resource Service...');
      
      // Initialize sync orchestrator
      const syncResult = await this.syncOrchestrator.initialize();
      if (!syncResult.success) {
        throw new Error(`Sync initialization failed: ${syncResult.error}`);
      }
      
      // Load cached resources
      await this.loadCachedResources();
      
      this.initialized = true;
      
      console.log('📱 Unified Resource Service initialized');
      console.log(`   📊 Scope: ${this.currentScope.languages.join(', ')} | ${this.currentScope.books.join(', ')}`);
      console.log(`   📦 Cached resources: ${this.resourceCache.size}`);
      console.log(`   🔄 Sync: ${this.syncOrchestrator.getSyncStatus().state}`);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  }
  
  /**
   * Get resources for a specific scripture reference (alignment-centric)
   */
  async getResourcesForReference(
    reference: ScriptureReference,
    options?: {
      includeAlignment?: boolean;
      resourceTypes?: string[];
      maxResults?: number;
    }
  ): Promise<{
    success: boolean;
    data?: TranslationResource[];
    alignmentData?: AlignmentInteraction[];
    error?: string;
  }> {
    if (!this.initialized) {
      return { success: false, error: 'Service not initialized' };
    }
    
    try {
      const startTime = Date.now();
      
      // Apply scope filtering
      const targetTypes = options?.resourceTypes || this.currentScope.resourceTypes;
      const maxResults = options?.maxResults || 50;
      
      // Find matching resources
      const matchingResources: TranslationResource[] = [];
      
      for (const [id, resource] of this.resourceCache) {
        // Check scope filters
        if (!this.currentScope.languages.includes(resource.language)) continue;
        if (!targetTypes.includes(resource.type)) continue;
        if (resource.book && !this.currentScope.books.includes(resource.book)) continue;
        
        // Check reference match
        if (this.matchesReference(resource, reference)) {
          matchingResources.push(resource);
          
          if (matchingResources.length >= maxResults) break;
        }
      }
      
      // Sort by relevance (exact verse match first, then chapter, then book)
      matchingResources.sort((a, b) => {
        const aScore = this.calculateRelevanceScore(a, reference);
        const bScore = this.calculateRelevanceScore(b, reference);
        return bScore - aScore;
      });
      
      let alignmentData: AlignmentInteraction[] = [];
      
      // Generate alignment data if requested
      if (options?.includeAlignment) {
        alignmentData = await this.generateAlignmentData(reference, matchingResources);
      }
      
      const executionTime = Date.now() - startTime;
      
      console.log(`📱 Found ${matchingResources.length} resources for ${reference.book} ${reference.chapter}:${reference.verse || 'all'} in ${executionTime}ms`);
      
      return {
        success: true,
        data: matchingResources,
        alignmentData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resource query failed'
      };
    }
  }
  
  /**
   * Get word interactions for alignment-centric navigation
   */
  async getWordInteractions(
    reference: ScriptureReference,
    word: string,
    options?: {
      includeOriginalText?: boolean;
      maxDepth?: number;
      includeRelated?: boolean;
    }
  ): Promise<{
    success: boolean;
    data?: AlignmentInteraction;
    error?: string;
  }> {
    if (!this.initialized) {
      return { success: false, error: 'Service not initialized' };
    }
    
    try {
      console.log(`📱 Getting word interactions for "${word}" at ${reference.book} ${reference.chapter}:${reference.verse}`);
      
      // Find translation notes related to this word
      const translationNotes = await this.findResourcesByWord(word, 'translation-notes', reference);
      
      // Find translation words (definitions)
      const translationWords = await this.findResourcesByWord(word, 'translation-words', reference);
      
      // Find related verses (mock implementation)
      const relatedVerses = await this.findRelatedVerses(word, reference);
      
      // Generate cross-references
      const crossReferences = await this.generateCrossReferences(word, reference);
      
      const interaction: AlignmentInteraction = {
        word,
        originalText: options?.includeOriginalText ? await this.getOriginalText(word, reference) : undefined,
        translationNotes,
        translationWords,
        relatedVerses,
        crossReferences
      };
      
      return {
        success: true,
        data: interaction
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Word interaction query failed'
      };
    }
  }
  
  /**
   * Store or update a resource with sync
   */
  async storeResource(
    resource: Omit<TranslationResource, 'metadata'> & { 
      metadata?: Partial<TranslationResource['metadata']> 
    },
    options?: {
      syncToServer?: boolean;
      updateAlignment?: boolean;
    }
  ): Promise<{
    success: boolean;
    resourceId?: string;
    syncStatus?: string;
    error?: string;
  }> {
    if (!this.initialized) {
      return { success: false, error: 'Service not initialized' };
    }
    
    try {
      // Create full resource with metadata
      const fullResource: TranslationResource = {
        ...resource,
        metadata: {
          title: resource.metadata?.title,
          description: resource.metadata?.description,
          lastModified: new Date(),
          source: 'local' as const,
          syncStatus: 'pending' as const,
          ...resource.metadata
        }
      };
      
      // Store in cache
      this.resourceCache.set(resource.id, fullResource);
      
      // Persist to storage
      await this.storageBackend.set(`resource:${resource.id}`, fullResource);
      
      let syncStatus = 'cached';
      
      // Sync to server if requested and available
      if (options?.syncToServer && this.syncOrchestrator.getBidirectionalSyncService()) {
        try {
          const syncResult = await this.syncOrchestrator.syncBackToSource(
            resource.id,
            JSON.stringify(resource.content),
            this.getResourceFormat(resource.type),
            resource.type,
            this.generateDoor43Metadata(resource),
            `Update ${resource.type} via mobile app`
          );
          
          if (syncResult.success) {
            syncStatus = 'synced';
            fullResource.metadata.syncStatus = 'synced';
            this.resourceCache.set(resource.id, fullResource);
          } else {
            syncStatus = 'sync-failed';
            fullResource.metadata.syncStatus = 'error';
          }
        } catch (syncError) {
          console.warn('📱 Sync failed:', syncError);
          syncStatus = 'sync-failed';
        }
      }
      
      console.log(`📱 Stored resource ${resource.id} (${syncStatus})`);
      
      return {
        success: true,
        resourceId: resource.id,
        syncStatus
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resource storage failed'
      };
    }
  }
  
  /**
   * Update resource scope
   */
  async updateScope(newScope: Partial<ResourceScope>): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      this.currentScope = { ...this.currentScope, ...newScope };
      
      // Persist scope to storage
      await this.storageBackend.set('app:scope', this.currentScope);
      
      console.log(`📱 Updated scope: ${this.currentScope.languages.join(', ')} | ${this.currentScope.books.join(', ')}`);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scope update failed'
      };
    }
  }
  
  /**
   * Get current scope
   */
  getCurrentScope(): ResourceScope {
    return { ...this.currentScope };
  }
  
  /**
   * Get sync status
   */
  getSyncStatus() {
    return this.syncOrchestrator.getSyncStatus();
  }
  
  /**
   * Get service statistics
   */
  async getStatistics(): Promise<{
    cachedResources: number;
    totalCacheSize: number;
    syncStatus: string;
    scope: ResourceScope;
    storageStats?: any;
  }> {
    const storageStats = await this.storageBackend.getStatistics();
    
    return {
      cachedResources: this.resourceCache.size,
      totalCacheSize: storageStats.success ? storageStats.data.totalEstimatedSize : 0,
      syncStatus: this.syncOrchestrator.getSyncStatus().state,
      scope: this.currentScope,
      storageStats: storageStats.success ? storageStats.data : undefined
    };
  }
  
  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    if (this.initialized) {
      await this.syncOrchestrator.shutdown();
      await this.storageBackend.close();
      this.resourceCache.clear();
      this.initialized = false;
      console.log('📱 Unified Resource Service shut down');
    }
  }
  
  // Private helper methods
  
  private async loadCachedResources(): Promise<void> {
    try {
      const keys = await this.storageBackend.keys();
      if (!keys.success) return;
      
      const resourceKeys = keys.data.filter((key: string) => key.startsWith('resource:'));
      
      for (const key of resourceKeys) {
        const result = await this.storageBackend.get(key);
        if (result.success && result.data) {
          const resource = result.data as TranslationResource;
          this.resourceCache.set(resource.id, resource);
        }
      }
      
      // Load scope if exists
      const scopeResult = await this.storageBackend.get('app:scope');
      if (scopeResult.success && scopeResult.data) {
        this.currentScope = { ...this.currentScope, ...scopeResult.data };
      }
    } catch (error) {
      console.warn('📱 Failed to load cached resources:', error);
    }
  }
  
  private matchesReference(resource: TranslationResource, reference: ScriptureReference): boolean {
    // Book must match if specified
    if (resource.book && resource.book !== reference.book) return false;
    
    // Chapter must match if specified
    if (resource.chapter && resource.chapter !== reference.chapter) return false;
    
    // Verse must match if both are specified
    if (resource.verse && reference.verse && resource.verse !== reference.verse) return false;
    
    return true;
  }
  
  private calculateRelevanceScore(resource: TranslationResource, reference: ScriptureReference): number {
    let score = 0;
    
    // Exact verse match
    if (resource.verse === reference.verse) score += 100;
    
    // Chapter match
    if (resource.chapter === reference.chapter) score += 50;
    
    // Book match
    if (resource.book === reference.book) score += 25;
    
    // Resource type priority
    switch (resource.type) {
      case 'bible-text': score += 20; break;
      case 'translation-notes': score += 15; break;
      case 'translation-words': score += 10; break;
      case 'translation-questions': score += 5; break;
    }
    
    return score;
  }
  
  private async generateAlignmentData(
    reference: ScriptureReference, 
    resources: TranslationResource[]
  ): Promise<AlignmentInteraction[]> {
    // Mock alignment data generation
    const alignmentData: AlignmentInteraction[] = [];
    
    // Extract words from bible text resources
    const bibleTexts = resources.filter(r => r.type === 'bible-text');
    
    for (const bibleText of bibleTexts) {
      if (bibleText.content && bibleText.content.text) {
        const words = bibleText.content.text.split(/\s+/);
        
        for (const word of words.slice(0, 5)) { // Limit to first 5 words
          const interaction = await this.getWordInteractions(reference, word);
          if (interaction.success && interaction.data) {
            alignmentData.push(interaction.data);
          }
        }
      }
    }
    
    return alignmentData;
  }
  
  private async findResourcesByWord(
    word: string, 
    resourceType: string, 
    reference: ScriptureReference
  ): Promise<TranslationResource[]> {
    const results: TranslationResource[] = [];
    
    for (const [id, resource] of this.resourceCache) {
      if (resource.type !== resourceType) continue;
      if (!this.matchesReference(resource, reference)) continue;
      
      // Simple word search in content
      const contentStr = JSON.stringify(resource.content).toLowerCase();
      if (contentStr.includes(word.toLowerCase())) {
        results.push(resource);
      }
    }
    
    return results;
  }
  
  private async findRelatedVerses(word: string, reference: ScriptureReference): Promise<ScriptureReference[]> {
    // Mock implementation - in real app, this would use alignment data
    return [
      { book: reference.book, chapter: reference.chapter, verse: (reference.verse || 1) + 1 },
      { book: reference.book, chapter: reference.chapter + 1, verse: 1 }
    ];
  }
  
  private async generateCrossReferences(word: string, reference: ScriptureReference): Promise<any[]> {
    // Mock cross-references
    return [
      {
        resourceId: `${reference.book}-tn-${word}`,
        type: 'translation-notes',
        relationship: 'explains',
        confidence: 0.9
      }
    ];
  }
  
  private async getOriginalText(word: string, reference: ScriptureReference): Promise<string | undefined> {
    // Mock original text lookup
    return `Hebrew/Greek for "${word}"`;
  }
  
  private getResourceFormat(type: string): string {
    switch (type) {
      case 'bible-text': return 'usfm';
      case 'translation-notes': return 'tsv';
      case 'translation-words': return 'tsv';
      case 'translation-questions': return 'tsv';
      case 'translation-academy': return 'md';
      default: return 'json';
    }
  }
  
  private generateDoor43Metadata(resource: TranslationResource): any {
    return {
      owner: 'mobile-app',
      repo: `${resource.language}_${resource.type.replace('-', '_')}`,
      branch: 'master',
      resourceType: this.getResourceFormat(resource.type),
      filePath: `${resource.book || 'content'}.${this.getResourceFormat(resource.type)}`,
      resourceId: resource.id
    };
  }
}

/**
 * Create unified resource service for mobile app
 */
export function createUnifiedResourceService(config?: {
  door43AuthToken?: string;
  offlineMode?: boolean;
  scope?: ResourceScope;
  cacheSize?: number;
}): UnifiedResourceService {
  return new UnifiedResourceService(config);
}
