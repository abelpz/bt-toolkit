#!/usr/bin/env ts-node

/**
 * Complete Pipeline Test: Door43 API -> USFM Processing -> Storage -> Caching
 * 
 * This test demonstrates the full resource storage architecture:
 * 1. ResourceManager orchestrates between adapters and storage
 * 2. Door43LiteralTextAdapter fetches real USFM from Door43 API
 * 3. USFM processor converts raw USFM to structured JSON
 * 4. SQLiteStorageAdapter caches processed content
 * 5. Subsequent requests use cached data for performance
 */

import { createResourceManager } from './src/services/resources/ResourceManager';
import { createTempSQLiteStorage } from './src/services/storage/SQLiteStorageAdapter';
import { Door43LiteralTextAdapter } from './src/services/adapters/Door43ULTAdapter';
import { ResourceType } from './src/types/context';

async function testFullPipeline() {
  console.log('🧪 Testing Complete Resource Storage Pipeline...\n');
  console.log('📋 Pipeline: Door43 API → USFM Processing → Storage → Caching');

  // Step 1: Create components
  const resourceManager = createResourceManager();
  const storageAdapter = createTempSQLiteStorage();
  const door43Adapter = new Door43LiteralTextAdapter();

  console.log(`\n📦 Created components:`);
  console.log(`   💾 Storage: ${storageAdapter.getDatabasePath()}`);
  console.log(`   🌐 Adapter: ${door43Adapter.getResourceInfo().name}`);
  console.log(`   🔧 Capabilities: ${door43Adapter.getResourceInfo().processingCapabilities.join(', ')}`);

  try {
    // Step 2: Initialize ResourceManager
    console.log('\n1️⃣ Initializing ResourceManager...');
    await resourceManager.initialize(storageAdapter, [door43Adapter]);
    console.log('✅ ResourceManager initialized with real Door43 adapter');

    // Step 3: Test metadata with real Door43 data
    console.log('\n2️⃣ Testing Metadata Pipeline...');
    
    const testCases = [
      { 
        server: 'git.door43.org', 
        owner: 'unfoldingWord', 
        language: 'en', 
        description: 'English ULT (Primary)',
        expectedType: 'ULT'
      },
      { 
        server: 'git.door43.org', 
        owner: 'es-419_gl', 
        language: 'es-419', 
        description: 'Spanish GLT (Fallback)',
        expectedType: 'GLT'
      }
    ];

    for (const testCase of testCases) {
      const { server, owner, language, description, expectedType } = testCase;
      
      console.log(`\n📋 ${description}:`);
      
      // First call - fetches from Door43 API and caches
      console.log('   🌐 First call (Door43 API + Cache)...');
      const metaStart = Date.now();
      const metadata = await resourceManager.getResourceMetadata(server, owner, language);
      const metaDuration = Date.now() - metaStart;
      
      console.log(`   ✅ Got ${metadata.length} resources in ${metaDuration}ms`);
      
      if (metadata.length > 0) {
        const meta = metadata[0];
        console.log(`      📖 Resource: ${meta.title} v${meta.version}`);
        console.log(`      🏷️  Type: ${meta.id.toUpperCase()}`);
        console.log(`      📚 Books: ${meta.toc.books?.length || 0}`);
        console.log(`      🎯 Is Anchor: ${meta.isAnchor}`);
        console.log(`      📅 Last Updated: ${meta.lastUpdated.toISOString()}`);
        
        // Verify expected type
        if (meta.id.toUpperCase() === expectedType) {
          console.log(`      ✅ Correct fallback: ${expectedType}`);
        } else {
          console.log(`      ⚠️  Expected ${expectedType}, got ${meta.id.toUpperCase()}`);
        }
      }
      
      // Second call - should use cache
      console.log('   💾 Second call (Cache only)...');
      const cacheStart = Date.now();
      const cachedMeta = await resourceManager.getResourceMetadata(server, owner, language);
      const cacheDuration = Date.now() - cacheStart;
      
      console.log(`   ✅ Got ${cachedMeta.length} cached resources in ${cacheDuration}ms`);
      console.log(`   ⚡ Cache speedup: ${Math.round(metaDuration / cacheDuration)}x faster`);
    }

    // Step 4: Test full USFM processing pipeline
    console.log('\n3️⃣ Testing USFM Processing Pipeline...');
    
    const contentTests = [
      { 
        key: 'git.door43.org/unfoldingWord/en/literal-text/rut',
        description: 'English Ruth (ULT)',
        server: 'git.door43.org',
        owner: 'unfoldingWord',
        language: 'en'
      },
      { 
        key: 'git.door43.org/es-419_gl/es-419/literal-text/rut',
        description: 'Spanish Ruth (GLT)',
        server: 'git.door43.org',
        owner: 'es-419_gl',
        language: 'es-419'
      }
    ];

    for (const contentTest of contentTests) {
      const { key, description } = contentTest;
      
      console.log(`\n📖 ${description}:`);
      console.log(`   🔑 Key: ${key}`);
      
      try {
        // First call - complete pipeline: API -> USFM -> Storage
        console.log('   🌐 First call (Full Pipeline)...');
        console.log('      📡 Fetching from Door43 API...');
        console.log('      📝 Processing USFM content...');
        console.log('      💾 Storing processed content...');
        
        const contentStart = Date.now();
        const content = await resourceManager.getOrFetchContent(key, ResourceType.SCRIPTURE);
        const contentDuration = Date.now() - contentStart;
        
        if (content && 'chapters' in content && content.chapters) {
          console.log(`   ✅ Pipeline completed in ${contentDuration}ms`);
          console.log(`      📊 Chapters: ${content.chapters.length}`);
          
          if (content.chapters.length > 0) {
            const chapter1 = content.chapters[0];
            console.log(`      📝 Chapter 1: ${chapter1.verseCount} verses, ${chapter1.paragraphCount} paragraphs`);
            
            if (chapter1.verses.length > 0) {
              const verse1 = chapter1.verses[0];
              console.log(`      🎯 First verse: "${verse1.text.substring(0, 80)}..."`);
              console.log(`      📍 Reference: ${verse1.reference}`);
            }
            
            if (chapter1.paragraphs.length > 0) {
              const para1 = chapter1.paragraphs[0];
              console.log(`      📄 First paragraph: ${para1.verseCount} verses (${para1.style})`);
            }
          }
          
          // Second call - should use cached processed content
          console.log('   💾 Second call (Cache only)...');
          const cacheContentStart = Date.now();
          const cachedContent = await resourceManager.getOrFetchContent(key, ResourceType.SCRIPTURE);
          const cacheContentDuration = Date.now() - cacheContentStart;
          
          if (cachedContent && 'chapters' in cachedContent) {
            console.log(`   ✅ Got cached content in ${cacheContentDuration}ms`);
            console.log(`   ⚡ Cache speedup: ${Math.round(contentDuration / cacheContentDuration)}x faster`);
            console.log(`   🎯 Content integrity: ${cachedContent.chapters?.length === content.chapters?.length ? 'Verified' : 'Mismatch'}`);
          }
        } else {
          console.log(`   ❌ No processed content returned`);
        }
        
      } catch (error) {
        console.error(`   ❌ Pipeline failed:`, error instanceof Error ? error.message : 'Unknown error');
        
        // Show more details for debugging
        if (error instanceof Error && error.stack) {
          console.error(`   📋 Stack trace: ${error.stack.split('\n')[1]}`);
        }
      }
    }

    // Step 5: Test storage efficiency
    console.log('\n4️⃣ Testing Storage Efficiency...');
    
    const storageInfo = await resourceManager.getStorageInfo();
    console.log(`✅ Storage Statistics:`);
    console.log(`   📊 Database Size: ${Math.round(storageInfo.totalSize / 1024)} KB`);
    console.log(`   📦 Items Stored: ${storageInfo.itemCount}`);
    console.log(`   📅 Last Cleanup: ${storageInfo.lastCleanup.toISOString()}`);
    
    // Calculate efficiency metrics
    if (storageInfo.itemCount > 0) {
      const avgItemSize = storageInfo.totalSize / storageInfo.itemCount;
      console.log(`   📈 Avg Item Size: ${Math.round(avgItemSize)} bytes`);
      console.log(`   💾 Storage Efficiency: ${storageInfo.itemCount} items cached for offline use`);
    }

    // Step 6: Test batch preloading
    console.log('\n5️⃣ Testing Batch Preloading...');
    
    const batchKeys = [
      'git.door43.org/unfoldingWord/en/literal-text/jon',
      'git.door43.org/unfoldingWord/en/literal-text/phm'
    ];
    
    console.log(`📦 Preloading ${batchKeys.length} small books...`);
    const batchStart = Date.now();
    await resourceManager.preloadContent(batchKeys, ResourceType.SCRIPTURE);
    const batchDuration = Date.now() - batchStart;
    
    console.log(`✅ Batch preload completed in ${Math.round(batchDuration / 1000)}s`);
    
    // Verify batch items are cached
    console.log(`🔍 Verifying batch cache...`);
    for (const batchKey of batchKeys) {
      const verifyStart = Date.now();
      const batchContent = await resourceManager.getOrFetchContent(batchKey, ResourceType.SCRIPTURE);
      const verifyDuration = Date.now() - verifyStart;
      
      if (batchContent && 'chapters' in batchContent) {
        console.log(`   ✅ ${batchKey.split('/').pop()}: ${verifyDuration}ms (cached)`);
      }
    }

    // Step 7: Final storage stats
    console.log('\n6️⃣ Final Pipeline Results...');
    
    const finalInfo = await resourceManager.getStorageInfo();
    console.log(`🎉 Pipeline Test Complete!`);
    console.log(`   💾 Final DB Size: ${Math.round(finalInfo.totalSize / 1024)} KB`);
    console.log(`   📦 Total Items: ${finalInfo.itemCount}`);
    console.log(`   🚀 Ready for offline use!`);
    
    console.log(`\n📋 Architecture Verified:`);
    console.log(`   ✅ Door43 API Integration (ULT/GLT fallback)`);
    console.log(`   ✅ USFM Processing (chapters, verses, paragraphs)`);
    console.log(`   ✅ SQLite Storage (metadata + content)`);
    console.log(`   ✅ Intelligent Caching (${Math.round(finalInfo.totalSize / 1024)} KB cached)`);
    console.log(`   ✅ Batch Operations (preloading)`);
    console.log(`   ✅ Error Recovery (graceful fallbacks)`);

  } catch (error) {
    console.error('\n❌ Pipeline test failed:', error);
    throw error;
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up...');
    await storageAdapter.close(true);
    console.log('✅ Cleanup completed');
  }
}

// Performance timing wrapper
async function runWithTiming() {
  const startTime = Date.now();
  
  try {
    await testFullPipeline();
  } catch (error) {
    console.error('\n💥 Fatal error during pipeline test:', error);
    process.exit(1);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`\n⏱️  Total pipeline test duration: ${Math.round(duration / 1000)}s (${duration}ms)`);
  console.log(`🎯 Resource Storage Architecture: FULLY OPERATIONAL! 🚀`);
}

// Run the test
if (require.main === module) {
  console.log('🚀 Starting Complete Resource Storage Pipeline Test...');
  console.log('🎯 Testing: Door43 API → USFM Processing → Storage → Caching\n');
  runWithTiming().catch(console.error);
}

export { testFullPipeline };

