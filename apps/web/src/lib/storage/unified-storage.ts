/**
 * Unified Storage Layer
 * High-level storage interface that uses appropriate adapters
 */

import { 
  UnifiedStorageLayer,
  StorageAdapter,
  StorageKey as IStorageKey,
  StorageResult,
  StorageItem,
  StoragePattern,
  ContentMetadata,
  ContentType,
  ContentTypeStrategy,
  StoragePlatform,
  StorageError,
  StorageErrorCode,
  VersionMetadata,
  VersionType
} from './interfaces'
import { StorageKey } from './storage-key'

export class UnifiedStorage implements UnifiedStorageLayer {
  private adapters = new Map<ContentType, StorageAdapter>()
  private contentStrategies = new Map<ContentType, ContentTypeStrategy>()
  private initialized = false

  constructor() {
    this.setupDefaultStrategies()
  }

  // Adapter Management
  registerAdapter(contentType: ContentType, adapter: StorageAdapter): void {
    this.adapters.set(contentType, adapter)
  }

  registerContentStrategy(strategy: ContentTypeStrategy): void {
    this.contentStrategies.set(strategy.contentType, strategy)
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    // Initialize all registered adapters
    const initPromises: Promise<void>[] = []
    for (const adapter of this.adapters.values()) {
      initPromises.push(adapter.initialize())
    }

    await Promise.all(initPromises)
    this.initialized = true
  }

  // Core Storage Operations
  async store<T>(key: IStorageKey, content: T, metadata: ContentMetadata): Promise<void> {
    await this.ensureInitialized()
    
    const adapter = this.getAdapterForContent(metadata.contentType)
    const keyString = key.toString()
    
    try {
      await adapter.store(keyString, content, metadata)
    } catch (error) {
      throw new StorageError(
        `Failed to store content for key ${keyString}`,
        StorageErrorCode.ADAPTER_ERROR,
        error as Error
      )
    }
  }

  async retrieve<T>(key: IStorageKey): Promise<StorageResult<T>> {
    await this.ensureInitialized()
    
    const keyString = key.toString()
    
    // Try each adapter until we find the content
    for (const adapter of this.adapters.values()) {
      try {
        const result = await adapter.retrieve(keyString)
        if (result) {
          const metadata = result.metadata as ContentMetadata
          
          return {
            content: result.data,
            metadata,
            found: true,
            expired: this.isExpired(metadata),
            stale: this.isStale(metadata)
          }
        }
      } catch (error) {
        // Continue to next adapter
        console.warn(`Adapter ${adapter.platform} failed to retrieve ${keyString}:`, error)
      }
    }
    
    return {
      content: null,
      metadata: null,
      found: false,
      expired: false,
      stale: false
    }
  }

  async exists(key: IStorageKey): Promise<boolean> {
    await this.ensureInitialized()
    
    const keyString = key.toString()
    
    // Check all adapters
    for (const adapter of this.adapters.values()) {
      try {
        if (await adapter.exists(keyString)) {
          return true
        }
      } catch (error) {
        // Continue to next adapter
        console.warn(`Adapter ${adapter.platform} failed to check existence for ${keyString}:`, error)
      }
    }
    
    return false
  }

  async remove(key: IStorageKey): Promise<void> {
    await this.ensureInitialized()
    
    const keyString = key.toString()
    const errors: Error[] = []
    
    // Remove from all adapters
    for (const adapter of this.adapters.values()) {
      try {
        await adapter.remove(keyString)
      } catch (error) {
        errors.push(error as Error)
      }
    }
    
    // If all adapters failed, throw the first error
    if (errors.length === this.adapters.size && errors.length > 0) {
      throw new StorageError(
        `Failed to remove content for key ${keyString}`,
        StorageErrorCode.ADAPTER_ERROR,
        errors[0]
      )
    }
  }

  // Metadata Operations
  async getMetadata(key: IStorageKey): Promise<ContentMetadata | null> {
    const result = await this.retrieve(key)
    return result.metadata
  }

  async setMetadata(key: IStorageKey, metadata: ContentMetadata): Promise<void> {
    await this.ensureInitialized()
    
    const keyString = key.toString()
    const adapter = this.getAdapterForContent(metadata.contentType)
    
    try {
      // Get existing content
      const existing = await adapter.retrieve(keyString)
      if (existing) {
        // Update with new metadata
        await adapter.store(keyString, existing.data, metadata)
      } else {
        throw new StorageError(
          `Cannot set metadata for non-existent key ${keyString}`,
          StorageErrorCode.NOT_FOUND
        )
      }
    } catch (error) {
      throw new StorageError(
        `Failed to set metadata for key ${keyString}`,
        StorageErrorCode.ADAPTER_ERROR,
        error as Error
      )
    }
  }

  // Batch Operations
  async storeBatch<T>(items: StorageItem<T>[]): Promise<void> {
    await this.ensureInitialized()
    
    // Group items by content type
    const itemsByContentType = new Map<ContentType, Array<{
      key: string
      data: T
      metadata: ContentMetadata
    }>>()
    
    for (const item of items) {
      const contentType = item.metadata.contentType as ContentType
      if (!itemsByContentType.has(contentType)) {
        itemsByContentType.set(contentType, [])
      }
      
      itemsByContentType.get(contentType)!.push({
        key: item.key.toString(),
        data: item.content,
        metadata: item.metadata
      })
    }
    
    // Store each group with appropriate adapter
    const storePromises: Promise<void>[] = []
    for (const [contentType, groupItems] of itemsByContentType) {
      const adapter = this.getAdapterForContent(contentType)
      storePromises.push(adapter.storeBatch(groupItems))
    }
    
    await Promise.all(storePromises)
  }

  async retrieveBatch<T>(keys: IStorageKey[]): Promise<StorageResult<T>[]> {
    await this.ensureInitialized()
    
    const results: StorageResult<T>[] = []
    
    for (const key of keys) {
      const result = await this.retrieve<T>(key)
      results.push(result)
    }
    
    return results
  }

  // Cache Management
  async clear(pattern?: StoragePattern): Promise<void> {
    await this.ensureInitialized()
    
    const clearPromises: Promise<void>[] = []
    
    for (const adapter of this.adapters.values()) {
      const keyPattern = pattern ? this.patternToString(pattern) : undefined
      clearPromises.push(adapter.clear(keyPattern))
    }
    
    await Promise.all(clearPromises)
  }

  async getSize(pattern?: StoragePattern): Promise<number> {
    await this.ensureInitialized()
    
    let totalSize = 0
    const keyPattern = pattern ? this.patternToString(pattern) : undefined
    
    for (const adapter of this.adapters.values()) {
      try {
        const size = await adapter.getSize(keyPattern)
        totalSize += size
      } catch (error) {
        console.warn(`Failed to get size from adapter ${adapter.platform}:`, error)
      }
    }
    
    return totalSize
  }

  async cleanup(maxAge?: number, maxSize?: number): Promise<void> {
    await this.ensureInitialized()
    
    // Get all items across all adapters
    const allItems = await this.getAllByPattern({})
    
    // Sort by cachedAt (oldest first)
    allItems.sort((a, b) => 
      new Date(a.metadata.cachedAt).getTime() - new Date(b.metadata.cachedAt).getTime()
    )
    
    const now = new Date()
    const itemsToRemove: IStorageKey[] = []
    
    // Remove expired items
    if (maxAge) {
      const maxAgeMs = maxAge * 1000
      for (const item of allItems) {
        const age = now.getTime() - new Date(item.metadata.cachedAt).getTime()
        if (age > maxAgeMs) {
          itemsToRemove.push(item.key)
        }
      }
    }
    
    // Remove oldest items if over size limit
    if (maxSize && allItems.length > maxSize) {
      const excessItems = allItems.slice(0, allItems.length - maxSize)
      for (const item of excessItems) {
        if (!itemsToRemove.includes(item.key)) {
          itemsToRemove.push(item.key)
        }
      }
    }
    
    // Remove items
    const removePromises = itemsToRemove.map(key => this.remove(key))
    await Promise.all(removePromises)
  }

  async getAllByPattern<T>(pattern: StoragePattern): Promise<StorageItem<T>[]> {
    await this.ensureInitialized()
    
    const allItems: StorageItem<T>[] = []
    const keyPattern = this.patternToString(pattern)
    
    for (const adapter of this.adapters.values()) {
      try {
        const keys = await adapter.getAllKeys(keyPattern)
        
        for (const keyString of keys) {
          try {
            const key = StorageKey.fromString(keyString)
            if (key.matchesPattern(pattern)) {
              const result = await adapter.retrieve(keyString)
              if (result) {
                allItems.push({
                  key,
                  content: result.data,
                  metadata: result.metadata as ContentMetadata
                })
              }
            }
          } catch (error) {
            console.warn(`Failed to process key ${keyString}:`, error)
          }
        }
      } catch (error) {
        console.warn(`Failed to get keys from adapter ${adapter.platform}:`, error)
      }
    }
    
    return allItems
  }

  // Lifecycle
  async close(): Promise<void> {
    const closePromises: Promise<void>[] = []
    for (const adapter of this.adapters.values()) {
      closePromises.push(adapter.close())
    }
    
    await Promise.all(closePromises)
    this.initialized = false
  }

  // Private Methods
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  private getAdapterForContent(contentType: string): StorageAdapter {
    const type = contentType as ContentType
    const adapter = this.adapters.get(type)
    
    if (!adapter) {
      // Fallback to first available adapter
      const fallbackAdapter = this.adapters.values().next().value
      if (!fallbackAdapter) {
        throw new StorageError(
          `No storage adapter available for content type ${contentType}`,
          StorageErrorCode.ADAPTER_ERROR
        )
      }
      return fallbackAdapter
    }
    
    return adapter
  }

  private setupDefaultStrategies(): void {
    this.contentStrategies.set(ContentType.TEXT, {
      contentType: ContentType.TEXT,
      preferredAdapter: [StoragePlatform.WEB_INDEXEDDB, StoragePlatform.MEMORY],
      maxSize: 10 * 1024 * 1024, // 10MB
      compression: true
    })
    
    this.contentStrategies.set(ContentType.JSON, {
      contentType: ContentType.JSON,
      preferredAdapter: [StoragePlatform.WEB_INDEXEDDB, StoragePlatform.MEMORY],
      maxSize: 50 * 1024 * 1024, // 50MB
      compression: true
    })
    
    this.contentStrategies.set(ContentType.BINARY, {
      contentType: ContentType.BINARY,
      preferredAdapter: [StoragePlatform.WEB_CACHE_API, StoragePlatform.MEMORY],
      maxSize: 100 * 1024 * 1024, // 100MB
      compression: false
    })
    
    this.contentStrategies.set(ContentType.MEDIA, {
      contentType: ContentType.MEDIA,
      preferredAdapter: [StoragePlatform.WEB_CACHE_API, StoragePlatform.MEMORY],
      maxSize: 500 * 1024 * 1024, // 500MB
      compression: false
    })
  }

  private isExpired(metadata: ContentMetadata): boolean {
    // Simple expiration check - can be enhanced with configurable TTL
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
    const age = new Date().getTime() - new Date(metadata.cachedAt).getTime()
    return age > maxAge
  }

  private isStale(metadata: ContentMetadata): boolean {
    // Check if content might be stale based on version metadata
    if (!metadata.version) return false
    
    // For now, consider content stale if it's older than 1 day
    // In practice, this would check against server versions
    const staleThreshold = 24 * 60 * 60 * 1000 // 1 day
    const age = new Date().getTime() - new Date(metadata.cachedAt).getTime()
    return age > staleThreshold
  }

  private patternToString(pattern: StoragePattern): string {
    const parts: string[] = []
    
    parts.push(pattern.server || '*')
    parts.push(pattern.owner || '*')
    parts.push(pattern.language || '*')
    parts.push(pattern.resourceType || '*')
    parts.push(pattern.contentPath || '*')
    
    return parts.join('/')
  }
}
