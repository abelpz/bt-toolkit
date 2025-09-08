/**
 * IndexedDB Storage Adapter for Web Platform
 * Handles text-based content with structured storage
 */

import { 
  StorageAdapter, 
  StoragePlatform, 
  StorageCapabilities, 
  StorageError, 
  StorageErrorCode 
} from '../interfaces'

export interface IndexedDBConfig {
  databaseName: string
  version: number
  objectStores: {
    name: string
    keyPath?: string
    indexes?: Array<{
      name: string
      keyPath: string | string[]
      options?: IDBIndexParameters
    }>
  }[]
}

export class WebIndexedDBAdapter implements StorageAdapter {
  readonly platform = StoragePlatform.WEB_INDEXEDDB
  readonly capabilities: StorageCapabilities = {
    supportsTransactions: true,
    supportsIndexes: true,
    supportsBinaryData: true,
    supportsLargeFiles: false, // Better to use Cache API for large files
    maxItemSize: 50 * 1024 * 1024, // 50MB per item
    persistent: true
  }

  private db: IDBDatabase | null = null
  private config: IndexedDBConfig

  constructor(config?: Partial<IndexedDBConfig>) {
    this.config = {
      databaseName: 'BibleTranslationToolkit',
      version: 1,
      objectStores: [
        {
          name: 'content',
          keyPath: 'key',
          indexes: [
            { name: 'server', keyPath: 'server' },
            { name: 'owner', keyPath: 'owner' },
            { name: 'language', keyPath: 'language' },
            { name: 'resourceType', keyPath: 'resourceType' },
            { name: 'contentType', keyPath: 'contentType' },
            { name: 'cachedAt', keyPath: 'cachedAt' },
            { name: 'lastModified', keyPath: 'lastModified' }
          ]
        },
        {
          name: 'metadata',
          keyPath: 'key',
          indexes: [
            { name: 'resourceType', keyPath: 'resourceType' },
            { name: 'cachedAt', keyPath: 'cachedAt' }
          ]
        }
      ],
      ...config
    }
  }

  async initialize(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.databaseName, this.config.version)
      
      request.onerror = () => {
        reject(new StorageError(
          `Failed to open IndexedDB: ${request.error?.message}`,
          StorageErrorCode.ADAPTER_ERROR,
          request.error || undefined
        ))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create object stores
        for (const storeConfig of this.config.objectStores) {
          let store: IDBObjectStore
          
          if (db.objectStoreNames.contains(storeConfig.name)) {
            // Store exists, we might need to handle migrations here
            continue
          }
          
          store = db.createObjectStore(storeConfig.name, {
            keyPath: storeConfig.keyPath
          })
          
          // Create indexes
          if (storeConfig.indexes) {
            for (const indexConfig of storeConfig.indexes) {
              store.createIndex(indexConfig.name, indexConfig.keyPath, indexConfig.options)
            }
          }
        }
      }
    })
  }

  async store(key: string, data: any, metadata?: any): Promise<void> {
    await this.ensureInitialized()
    
    const transaction = this.db!.transaction(['content', 'metadata'], 'readwrite')
    const contentStore = transaction.objectStore('content')
    const metadataStore = transaction.objectStore('metadata')
    
    try {
      // Parse key to extract components for indexing
      const keyComponents = this.parseKey(key)
      
      // Store content
      const contentItem = {
        key,
        data: this.serializeData(data),
        ...keyComponents,
        storedAt: new Date().toISOString()
      }
      
      await this.promisifyRequest(contentStore.put(contentItem))
      
      // Store metadata if provided
      if (metadata) {
        const metadataItem = {
          key,
          metadata: this.serializeData(metadata),
          ...keyComponents,
          storedAt: new Date().toISOString()
        }
        
        await this.promisifyRequest(metadataStore.put(metadataItem))
      }
      
    } catch (error) {
      throw new StorageError(
        `Failed to store data for key ${key}`,
        StorageErrorCode.ADAPTER_ERROR,
        error as Error
      )
    }
  }

  async retrieve(key: string): Promise<{ data: any; metadata?: any } | null> {
    await this.ensureInitialized()
    
    const transaction = this.db!.transaction(['content', 'metadata'], 'readonly')
    const contentStore = transaction.objectStore('content')
    const metadataStore = transaction.objectStore('metadata')
    
    try {
      // Get content
      const contentResult = await this.promisifyRequest(contentStore.get(key))
      if (!contentResult) {
        return null
      }
      
      // Get metadata
      const metadataResult = await this.promisifyRequest(metadataStore.get(key))
      
      return {
        data: this.deserializeData(contentResult.data),
        metadata: metadataResult ? this.deserializeData(metadataResult.metadata) : undefined
      }
      
    } catch (error) {
      throw new StorageError(
        `Failed to retrieve data for key ${key}`,
        StorageErrorCode.ADAPTER_ERROR,
        error as Error
      )
    }
  }

  async exists(key: string): Promise<boolean> {
    await this.ensureInitialized()
    
    const transaction = this.db!.transaction(['content'], 'readonly')
    const store = transaction.objectStore('content')
    
    try {
      const result = await this.promisifyRequest(store.count(key))
      return result > 0
    } catch (error) {
      throw new StorageError(
        `Failed to check existence for key ${key}`,
        StorageErrorCode.ADAPTER_ERROR,
        error as Error
      )
    }
  }

  async remove(key: string): Promise<void> {
    await this.ensureInitialized()
    
    const transaction = this.db!.transaction(['content', 'metadata'], 'readwrite')
    const contentStore = transaction.objectStore('content')
    const metadataStore = transaction.objectStore('metadata')
    
    try {
      await this.promisifyRequest(contentStore.delete(key))
      await this.promisifyRequest(metadataStore.delete(key))
    } catch (error) {
      throw new StorageError(
        `Failed to remove data for key ${key}`,
        StorageErrorCode.ADAPTER_ERROR,
        error as Error
      )
    }
  }

  async storeBatch(items: Array<{ key: string; data: any; metadata?: any }>): Promise<void> {
    await this.ensureInitialized()
    
    const transaction = this.db!.transaction(['content', 'metadata'], 'readwrite')
    const contentStore = transaction.objectStore('content')
    const metadataStore = transaction.objectStore('metadata')
    
    try {
      const promises: Promise<any>[] = []
      
      for (const item of items) {
        const keyComponents = this.parseKey(item.key)
        
        // Store content
        const contentItem = {
          key: item.key,
          data: this.serializeData(item.data),
          ...keyComponents,
          storedAt: new Date().toISOString()
        }
        
        promises.push(this.promisifyRequest(contentStore.put(contentItem)))
        
        // Store metadata if provided
        if (item.metadata) {
          const metadataItem = {
            key: item.key,
            metadata: this.serializeData(item.metadata),
            ...keyComponents,
            storedAt: new Date().toISOString()
          }
          
          promises.push(this.promisifyRequest(metadataStore.put(metadataItem)))
        }
      }
      
      await Promise.all(promises)
      
    } catch (error) {
      throw new StorageError(
        `Failed to store batch data`,
        StorageErrorCode.ADAPTER_ERROR,
        error as Error
      )
    }
  }

  async retrieveBatch(keys: string[]): Promise<Array<{ key: string; data: any; metadata?: any } | null>> {
    await this.ensureInitialized()
    
    const transaction = this.db!.transaction(['content', 'metadata'], 'readonly')
    const contentStore = transaction.objectStore('content')
    const metadataStore = transaction.objectStore('metadata')
    
    try {
      const results: Array<{ key: string; data: any; metadata?: any } | null> = []
      
      for (const key of keys) {
        const contentResult = await this.promisifyRequest(contentStore.get(key))
        
        if (!contentResult) {
          results.push(null)
          continue
        }
        
        const metadataResult = await this.promisifyRequest(metadataStore.get(key))
        
        results.push({
          key,
          data: this.deserializeData(contentResult.data),
          metadata: metadataResult ? this.deserializeData(metadataResult.metadata) : undefined
        })
      }
      
      return results
      
    } catch (error) {
      throw new StorageError(
        `Failed to retrieve batch data`,
        StorageErrorCode.ADAPTER_ERROR,
        error as Error
      )
    }
  }

  async clear(keyPattern?: string): Promise<void> {
    await this.ensureInitialized()
    
    if (!keyPattern) {
      // Clear all data
      const transaction = this.db!.transaction(['content', 'metadata'], 'readwrite')
      await this.promisifyRequest(transaction.objectStore('content').clear())
      await this.promisifyRequest(transaction.objectStore('metadata').clear())
      return
    }
    
    // Clear by pattern
    const keys = await this.getAllKeys(keyPattern)
    const transaction = this.db!.transaction(['content', 'metadata'], 'readwrite')
    const contentStore = transaction.objectStore('content')
    const metadataStore = transaction.objectStore('metadata')
    
    const promises: Promise<any>[] = []
    for (const key of keys) {
      promises.push(this.promisifyRequest(contentStore.delete(key)))
      promises.push(this.promisifyRequest(metadataStore.delete(key)))
    }
    
    await Promise.all(promises)
  }

  async getSize(keyPattern?: string): Promise<number> {
    await this.ensureInitialized()
    
    const transaction = this.db!.transaction(['content'], 'readonly')
    const store = transaction.objectStore('content')
    
    if (!keyPattern) {
      return await this.promisifyRequest(store.count())
    }
    
    // Count by pattern
    const keys = await this.getAllKeys(keyPattern)
    return keys.length
  }

  async getAllKeys(pattern?: string): Promise<string[]> {
    await this.ensureInitialized()
    
    const transaction = this.db!.transaction(['content'], 'readonly')
    const store = transaction.objectStore('content')
    
    const keys: string[] = []
    
    return new Promise((resolve, reject) => {
      const request = store.openCursor()
      
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          const key = cursor.value.key
          
          if (!pattern || this.matchesPattern(key, pattern)) {
            keys.push(key)
          }
          
          cursor.continue()
        } else {
          resolve(keys)
        }
      }
      
      request.onerror = () => {
        reject(new StorageError(
          'Failed to get all keys',
          StorageErrorCode.ADAPTER_ERROR,
          request.error || undefined
        ))
      }
    })
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize()
    }
  }

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  private parseKey(key: string): {
    server: string
    owner: string
    language: string
    resourceType: string
    contentPath: string
  } {
    const parts = key.split('/')
    if (parts.length < 5) {
      throw new StorageError(
        `Invalid key format: ${key}`,
        StorageErrorCode.INVALID_KEY
      )
    }
    
    return {
      server: parts[0],
      owner: parts[1],
      language: parts[2],
      resourceType: parts[3],
      contentPath: parts.slice(4).join('/')
    }
  }

  private serializeData(data: any): string {
    try {
      return JSON.stringify(data)
    } catch (error) {
      throw new StorageError(
        'Failed to serialize data',
        StorageErrorCode.SERIALIZATION_ERROR,
        error as Error
      )
    }
  }

  private deserializeData(serializedData: string): any {
    try {
      return JSON.parse(serializedData)
    } catch (error) {
      throw new StorageError(
        'Failed to deserialize data',
        StorageErrorCode.SERIALIZATION_ERROR,
        error as Error
      )
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    if (pattern === '*') return true
    if (!pattern.includes('*')) return key === pattern
    
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex chars
      .replace(/\\\*/g, '.*') // Convert * to .*
    
    return new RegExp(`^${regexPattern}$`).test(key)
  }
}
