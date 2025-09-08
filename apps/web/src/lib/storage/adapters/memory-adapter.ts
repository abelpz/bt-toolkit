/**
 * Memory Storage Adapter
 * In-memory storage for testing and development
 */

import { 
  StorageAdapter, 
  StoragePlatform, 
  StorageCapabilities, 
  StorageError, 
  StorageErrorCode 
} from '../interfaces'

interface MemoryItem {
  key: string
  data: any
  metadata?: any
  storedAt: Date
}

export class MemoryAdapter implements StorageAdapter {
  readonly platform = StoragePlatform.MEMORY
  readonly capabilities: StorageCapabilities = {
    supportsTransactions: false,
    supportsIndexes: false,
    supportsBinaryData: true,
    supportsLargeFiles: true,
    persistent: false
  }

  private storage = new Map<string, MemoryItem>()
  private initialized = false

  async initialize(): Promise<void> {
    this.initialized = true
  }

  async store(key: string, data: any, metadata?: any): Promise<void> {
    this.ensureInitialized()
    
    try {
      // Deep clone to prevent external mutations
      const clonedData = this.deepClone(data)
      const clonedMetadata = metadata ? this.deepClone(metadata) : undefined
      
      this.storage.set(key, {
        key,
        data: clonedData,
        metadata: clonedMetadata,
        storedAt: new Date()
      })
    } catch (error) {
      throw new StorageError(
        `Failed to store data for key ${key}`,
        StorageErrorCode.ADAPTER_ERROR,
        error as Error
      )
    }
  }

  async retrieve(key: string): Promise<{ data: any; metadata?: any } | null> {
    this.ensureInitialized()
    
    const item = this.storage.get(key)
    if (!item) {
      return null
    }
    
    try {
      // Deep clone to prevent external mutations
      return {
        data: this.deepClone(item.data),
        metadata: item.metadata ? this.deepClone(item.metadata) : undefined
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
    this.ensureInitialized()
    return this.storage.has(key)
  }

  async remove(key: string): Promise<void> {
    this.ensureInitialized()
    this.storage.delete(key)
  }

  async storeBatch(items: Array<{ key: string; data: any; metadata?: any }>): Promise<void> {
    this.ensureInitialized()
    
    try {
      for (const item of items) {
        const clonedData = this.deepClone(item.data)
        const clonedMetadata = item.metadata ? this.deepClone(item.metadata) : undefined
        
        this.storage.set(item.key, {
          key: item.key,
          data: clonedData,
          metadata: clonedMetadata,
          storedAt: new Date()
        })
      }
    } catch (error) {
      throw new StorageError(
        'Failed to store batch data',
        StorageErrorCode.ADAPTER_ERROR,
        error as Error
      )
    }
  }

  async retrieveBatch(keys: string[]): Promise<Array<{ key: string; data: any; metadata?: any } | null>> {
    this.ensureInitialized()
    
    try {
      return keys.map(key => {
        const item = this.storage.get(key)
        if (!item) {
          return null
        }
        
        return {
          key,
          data: this.deepClone(item.data),
          metadata: item.metadata ? this.deepClone(item.metadata) : undefined
        }
      })
    } catch (error) {
      throw new StorageError(
        'Failed to retrieve batch data',
        StorageErrorCode.ADAPTER_ERROR,
        error as Error
      )
    }
  }

  async clear(keyPattern?: string): Promise<void> {
    this.ensureInitialized()
    
    if (!keyPattern) {
      this.storage.clear()
      return
    }
    
    // Clear by pattern
    const keysToDelete: string[] = []
    for (const key of this.storage.keys()) {
      if (this.matchesPattern(key, keyPattern)) {
        keysToDelete.push(key)
      }
    }
    
    for (const key of keysToDelete) {
      this.storage.delete(key)
    }
  }

  async getSize(keyPattern?: string): Promise<number> {
    this.ensureInitialized()
    
    if (!keyPattern) {
      return this.storage.size
    }
    
    let count = 0
    for (const key of this.storage.keys()) {
      if (this.matchesPattern(key, keyPattern)) {
        count++
      }
    }
    
    return count
  }

  async getAllKeys(pattern?: string): Promise<string[]> {
    this.ensureInitialized()
    
    const keys: string[] = []
    for (const key of this.storage.keys()) {
      if (!pattern || this.matchesPattern(key, pattern)) {
        keys.push(key)
      }
    }
    
    return keys
  }

  async close(): Promise<void> {
    this.storage.clear()
    this.initialized = false
  }

  // Utility methods for testing
  getStorageSize(): number {
    return this.storage.size
  }

  getAllItems(): MemoryItem[] {
    return Array.from(this.storage.values())
  }

  getItem(key: string): MemoryItem | undefined {
    return this.storage.get(key)
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new StorageError(
        'Storage adapter not initialized',
        StorageErrorCode.ADAPTER_ERROR
      )
    }
  }

  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime())
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item))
    }
    
    if (typeof obj === 'object') {
      const cloned: any = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key])
        }
      }
      return cloned
    }
    
    return obj
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
