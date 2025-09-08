/**
 * Storage System Library
 * Unified, extensible storage system for Bible Translation Toolkit
 */

// Core interfaces and types
export * from './interfaces'
export { StorageKey } from './storage-key'
export { UnifiedStorage } from './unified-storage'

// Adapters
export { WebIndexedDBAdapter } from './adapters/web-indexeddb-adapter'
export { MemoryAdapter } from './adapters/memory-adapter'

// Factory function for easy setup
import { UnifiedStorage } from './unified-storage'
import { WebIndexedDBAdapter } from './adapters/web-indexeddb-adapter'
import { MemoryAdapter } from './adapters/memory-adapter'
import { ContentType } from './interfaces'

export interface StorageConfig {
  platform: 'web' | 'node' | 'react-native' | 'memory'
  indexedDBConfig?: {
    databaseName?: string
    version?: number
  }
}

export async function createStorage(config: StorageConfig = { platform: 'web' }): Promise<UnifiedStorage> {
  const storage = new UnifiedStorage()
  
  switch (config.platform) {
    case 'web':
      // Register IndexedDB adapter for text/JSON content
      const indexedDBAdapter = new WebIndexedDBAdapter(config.indexedDBConfig)
      storage.registerAdapter(ContentType.TEXT, indexedDBAdapter)
      storage.registerAdapter(ContentType.JSON, indexedDBAdapter)
      
      // For now, also use IndexedDB for binary content
      // In production, we'd add Cache API adapter here
      storage.registerAdapter(ContentType.BINARY, indexedDBAdapter)
      storage.registerAdapter(ContentType.MEDIA, indexedDBAdapter)
      break
      
    case 'memory':
      // Use memory adapter for all content types (testing/development)
      const memoryAdapter = new MemoryAdapter()
      storage.registerAdapter(ContentType.TEXT, memoryAdapter)
      storage.registerAdapter(ContentType.JSON, memoryAdapter)
      storage.registerAdapter(ContentType.BINARY, memoryAdapter)
      storage.registerAdapter(ContentType.MEDIA, memoryAdapter)
      break
      
    case 'node':
      // TODO: Implement Node.js file system adapter
      throw new Error('Node.js storage adapter not implemented yet')
      
    case 'react-native':
      // TODO: Implement React Native adapters
      throw new Error('React Native storage adapters not implemented yet')
      
    default:
      throw new Error(`Unsupported platform: ${config.platform}`)
  }
  
  await storage.initialize()
  return storage
}

// Utility functions
export function createStorageKey(
  server: string,
  owner: string,
  language: string,
  resourceType: string,
  contentPath: string
): StorageKey {
  return new StorageKey(server, owner, language, resourceType, contentPath)
}

export function createBookKey(
  server: string,
  owner: string,
  language: string,
  resourceType: string,
  bookCode: string
): StorageKey {
  return StorageKey.forBook(server, owner, language, resourceType, bookCode)
}

export function createMetadataKey(
  server: string,
  owner: string,
  language: string,
  resourceType: string
): StorageKey {
  return StorageKey.forMetadata(server, owner, language, resourceType)
}
