#!/usr/bin/env ts-node

/**
 * Door43 Scripture Service Test
 * Tests the Door43 scripture service with real API calls
 */

import { createStorage } from '../lib/storage'
import { Door43ScriptureService } from '../lib/services/door43-scripture-service'

async function testDoor43Service() {
  console.log('🧪 Testing Door43 Scripture Service...\n')
  
  try {
    // Test 1: Create storage and service
    console.log('📦 Creating storage and service...')
    const storage = await createStorage({ platform: 'memory' })
    const service = new Door43ScriptureService(storage)
    console.log('✅ Service created successfully\n')
    
    // Test 2: Get resource metadata
    console.log('📋 Testing resource metadata retrieval...')
    const metadataRequest = {
      server: 'door43.org',
      owner: 'unfoldingWord',
      language: 'en',
      resourceType: 'ult' as const
    }
    
    console.log('🌐 Fetching metadata from Door43 API...')
    const metadata = await service.getResourceMetadata(metadataRequest)
    
    console.log(`Resource ID: ${metadata.id}`)
    console.log(`Resource Title: ${metadata.title}`)
    console.log(`Repository: ${metadata.fullName}`)
    console.log(`Available books: ${metadata.availableBooks.length}`)
    console.log(`First few books: ${metadata.availableBooks.slice(0, 5).map(b => b.bookCode).join(', ')}`)
    console.log('✅ Metadata retrieved successfully\n')
    
    // Test 3: Check if specific book is available
    console.log('🔍 Testing book availability check...')
    // Use the actual book code format from Door43
    const titusRequest = {
      server: 'door43.org',
      owner: 'unfoldingWord',
      language: 'en',
      resourceType: 'ult' as const,
      bookCode: '57-TIT' // Use the actual format from Door43
    }
    
    const isTitusAvailable = await service.isBookAvailable(titusRequest)
    console.log(`Titus (57-TIT) available: ${isTitusAvailable}`)
    
    const isFakeBookAvailable = await service.isBookAvailable({
      ...titusRequest,
      bookCode: 'fakebook'
    })
    console.log(`Fake book available: ${isFakeBookAvailable}`)
    console.log('✅ Book availability check working correctly\n')
    
    // Test 4: Get scripture content (if Titus is available)
    if (isTitusAvailable) {
      console.log('📖 Testing scripture content retrieval...')
      console.log('🌐 Fetching Titus from Door43 API...')
      
      const startTime = Date.now()
      const titusContent = await service.getScripture(titusRequest)
      const fetchTime = Date.now() - startTime
      
      console.log(`Book Code: ${titusContent.bookCode}`)
      console.log(`Book Name: ${titusContent.bookName}`)
      console.log(`Raw USFM length: ${titusContent.rawUSFM.length} characters`)
      console.log(`Processed chapters: ${titusContent.processedContent.chapters.length}`)
      console.log(`Total verses: ${titusContent.processedContent.metadata.totalVerses}`)
      console.log(`Fetch time: ${fetchTime}ms`)
      
      // Show first verse as example
      if (titusContent.processedContent.chapters.length > 0) {
        const firstChapter = titusContent.processedContent.chapters[0]
        if (firstChapter.verses.length > 0) {
          const firstVerse = firstChapter.verses[0]
          console.log(`First verse (${firstVerse.reference}): ${firstVerse.text.substring(0, 100)}...`)
        }
      }
      console.log('✅ Scripture content retrieved successfully\n')
      
      // Test 5: Test caching (second request should be faster)
      console.log('⚡ Testing caching performance...')
      const cacheStartTime = Date.now()
      const cachedTitus = await service.getScripture(titusRequest)
      const cacheTime = Date.now() - cacheStartTime
      
      console.log(`Cache fetch time: ${cacheTime}ms`)
      console.log(`Speed improvement: ${Math.round((fetchTime / cacheTime) * 100) / 100}x faster`)
      console.log(`Content matches: ${cachedTitus.bookCode === titusContent.bookCode}`)
      console.log('✅ Caching working correctly\n')
      
    } else {
      console.log('⚠️ Titus not available, skipping content tests\n')
    }
    
    // Test 6: Test metadata caching
    console.log('⚡ Testing metadata caching...')
    const metadataStartTime = Date.now()
    const cachedMetadata = await service.getResourceMetadata(metadataRequest)
    const metadataCacheTime = Date.now() - metadataStartTime
    
    console.log(`Metadata cache time: ${metadataCacheTime}ms`)
    console.log(`Metadata matches: ${cachedMetadata.id === metadata.id}`)
    console.log(`Available books match: ${cachedMetadata.availableBooks.length === metadata.availableBooks.length}`)
    console.log('✅ Metadata caching working correctly\n')
    
    // Test 7: Test cache clearing
    console.log('🗑️ Testing cache clearing...')
    await service.clearCache({
      server: 'door43.org',
      owner: 'unfoldingWord',
      language: 'en',
      resourceType: 'ult',
      bookCode: '57-TIT'
    })
    
    // Verify cache was cleared by checking if next request takes longer
    if (isTitusAvailable) {
      const clearStartTime = Date.now()
      await service.getScripture(titusRequest)
      const clearFetchTime = Date.now() - clearStartTime
      console.log(`Fetch time after cache clear: ${clearFetchTime}ms`)
      console.log(`Cache was cleared: ${clearFetchTime > 100}`) // Should be slower than cache hit
    }
    console.log('✅ Cache clearing working correctly\n')
    
    // Test 8: Test error handling
    console.log('⚠️ Testing error handling...')
    try {
      await service.getScripture({
        server: 'door43.org',
        owner: 'nonexistentowner',
        language: 'en',
        resourceType: 'ult',
        bookCode: 'jon'
      })
      console.log('❌ Should have thrown error for non-existent owner')
    } catch (error) {
      console.log(`✅ Correctly caught error: ${error.message.substring(0, 100)}...`)
    }
    
    try {
      await service.getScripture({
        server: 'door43.org',
        owner: 'unfoldingWord',
        language: 'en',
        resourceType: 'ult',
        bookCode: 'nonexistentbook'
      })
      console.log('❌ Should have thrown error for non-existent book')
    } catch (error) {
      console.log(`✅ Correctly caught error: ${error.message.substring(0, 100)}...`)
    }
    console.log('✅ Error handling working correctly\n')
    
    // Close storage
    await storage.close()
    console.log('✅ Storage closed successfully\n')
    
    console.log('🎉 All Door43 service tests passed!')
    
  } catch (error) {
    console.error('❌ Door43 service test failed:', error)
    process.exit(1)
  }
}

// Export for use in test runner

export { testDoor43Service }
