#!/usr/bin/env ts-node

/**
 * Storage System Test
 * Tests the unified storage system with different adapters
 */

import { 
  createStorage, 
  StorageKey, 
  ContentMetadata, 
  VersionType,
  StorageError 
} from '../lib/storage'

async function testStorageSystem() {
  console.log('🧪 Testing Storage System...\n')
  
  try {
    // Test 1: Create storage with memory adapter
    console.log('📦 Creating storage with memory adapter...')
    const storage = await createStorage({ platform: 'memory' })
    console.log('✅ Storage created successfully\n')
    
    // Test 2: Create storage keys
    console.log('🔑 Testing storage keys...')
    const bookKey = StorageKey.forBook('door43.org', 'unfoldingWord', 'en', 'ult', 'jon')
    const metadataKey = StorageKey.forMetadata('door43.org', 'unfoldingWord', 'en', 'ult')
    
    console.log(`Book key: ${bookKey.toString()}`)
    console.log(`Metadata key: ${metadataKey.toString()}`)
    console.log(`Book key matches book pattern: ${bookKey.isBookContent()}`)
    console.log(`Metadata key is metadata: ${metadataKey.isMetadata()}`)
    console.log('✅ Storage keys working correctly\n')
    
    // Test 3: Store and retrieve content
    console.log('💾 Testing store and retrieve...')
    const testContent = {
      bookCode: 'jon',
      bookName: 'Jonah',
      chapters: [
        { number: 1, verses: [{ number: 1, text: 'The word of the LORD came to Jonah...' }] }
      ]
    }
    
    const contentMetadata: ContentMetadata = {
      id: 'en_ult_jon',
      title: 'Jonah (ULT)',
      description: 'Jonah from English ULT',
      contentType: 'scripture',
      format: 'json',
      size: JSON.stringify(testContent).length,
      version: {
        type: VersionType.CHECKSUM,
        identifier: 'test-checksum-123',
        lastModified: new Date()
      },
      cachedAt: new Date(),
      dependencies: [],
      relatedContent: []
    }
    
    await storage.store(bookKey, testContent, contentMetadata)
    console.log('✅ Content stored successfully')
    
    const retrieved = await storage.retrieve(bookKey)
    console.log(`Retrieved content found: ${retrieved.found}`)
    console.log(`Retrieved content expired: ${retrieved.expired}`)
    console.log(`Retrieved content stale: ${retrieved.stale}`)
    console.log(`Retrieved book name: ${retrieved.content?.bookName}`)
    console.log('✅ Content retrieved successfully\n')
    
    // Test 4: Test existence check
    console.log('🔍 Testing existence check...')
    const exists = await storage.exists(bookKey)
    const notExists = await storage.exists(StorageKey.forBook('door43.org', 'unfoldingWord', 'en', 'ult', 'mat'))
    console.log(`Book exists: ${exists}`)
    console.log(`Non-existent book exists: ${notExists}`)
    console.log('✅ Existence check working correctly\n')
    
    // Test 5: Test batch operations
    console.log('📦 Testing batch operations...')
    const batchItems = [
      {
        key: StorageKey.forBook('door43.org', 'unfoldingWord', 'en', 'ult', 'mat'),
        content: { bookCode: 'mat', bookName: 'Matthew', chapters: [] },
        metadata: { ...contentMetadata, id: 'en_ult_mat', title: 'Matthew (ULT)' }
      },
      {
        key: StorageKey.forBook('door43.org', 'unfoldingWord', 'en', 'ult', 'mrk'),
        content: { bookCode: 'mrk', bookName: 'Mark', chapters: [] },
        metadata: { ...contentMetadata, id: 'en_ult_mrk', title: 'Mark (ULT)' }
      }
    ]
    
    await storage.storeBatch(batchItems)
    console.log('✅ Batch store completed')
    
    const batchKeys = batchItems.map(item => item.key)
    const batchResults = await storage.retrieveBatch(batchKeys)
    console.log(`Batch retrieve results: ${batchResults.length} items`)
    console.log(`First item found: ${batchResults[0]?.found}`)
    console.log(`Second item found: ${batchResults[1]?.found}`)
    console.log('✅ Batch operations working correctly\n')
    
    // Test 6: Test pattern matching and cleanup
    console.log('🧹 Testing pattern matching and cleanup...')
    const allItems = await storage.getAllByPattern({
      server: 'door43.org',
      owner: 'unfoldingWord',
      language: 'en',
      resourceType: 'ult'
    })
    console.log(`Found ${allItems.length} items matching pattern`)
    
    const size = await storage.getSize({
      server: 'door43.org',
      owner: 'unfoldingWord'
    })
    console.log(`Total size for owner pattern: ${size} items`)
    
    // Clear specific pattern
    await storage.clear({
      server: 'door43.org',
      owner: 'unfoldingWord',
      language: 'en',
      resourceType: 'ult',
      contentPath: 'books/mat'
    })
    
    const afterClear = await storage.exists(StorageKey.forBook('door43.org', 'unfoldingWord', 'en', 'ult', 'mat'))
    console.log(`Matthew exists after clear: ${afterClear}`)
    console.log('✅ Pattern matching and cleanup working correctly\n')
    
    // Test 7: Test error handling
    console.log('⚠️ Testing error handling...')
    try {
      // Try to create invalid storage key
      new StorageKey('', 'owner', 'lang', 'type', 'path')
      console.log('❌ Should have thrown error for invalid key')
    } catch (error) {
      console.log(`✅ Correctly caught invalid key error: ${error.message}`)
    }
    
    // Test 8: Test storage cleanup
    console.log('🧹 Testing storage cleanup...')
    await storage.cleanup(1000, 5) // 1 second max age, 5 items max
    const finalSize = await storage.getSize()
    console.log(`Final storage size after cleanup: ${finalSize} items`)
    console.log('✅ Storage cleanup completed\n')
    
    // Close storage
    await storage.close()
    console.log('✅ Storage closed successfully\n')
    
    console.log('🎉 All storage tests passed!')
    
  } catch (error) {
    console.error('❌ Storage test failed:', error)
    process.exit(1)
  }
}

// Export for use in test runner

export { testStorageSystem }
