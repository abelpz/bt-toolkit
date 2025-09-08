#!/usr/bin/env tsx

/**
 * CLI Tester for Door43 Cache Library
 * Tests the normalized cache engine with all its components
 */

import { MemoryBackend } from '@bt-toolkit/door43-storage';
import { 
  createCacheEngine, 
  CacheEngineConfig, 
  ResourceMetadata, 
  NormalizedContent,
  ResourceId,
  NormalizedResourceType
} from './lib/door43-cache.js';

// ============================================================================
// Test Data
// ============================================================================

function createTestBibleVerse(): { metadata: ResourceMetadata; content: NormalizedContent } {
  const resourceId: ResourceId = 'door43:unfoldingWord:en_ult:bible-verse:01-GEN.usfm:1:1';
  
  const metadata: ResourceMetadata = {
    id: resourceId,
    type: 'bible-verse' as NormalizedResourceType,
    title: 'Genesis 1:1',
    description: 'In the beginning God created the heavens and the earth.',
    source: {
      repository: {
        server: 'door43',
        owner: 'unfoldingWord',
        repoId: 'en_ult',
        ref: 'master'
      },
      originalPath: '01-GEN.usfm',
      section: {
        verse: { book: 'GEN', chapter: 1, verse: 1 }
      },
      contentHash: 'hash123',
      serverModifiedAt: new Date()
    },
    location: {
      book: 'GEN',
      chapter: 1,
      verse: 1,
      language: 'en',
      metadata: {}
    },
    references: {
      references: [],
      referencedBy: [],
      strongs: ['H430', 'H1254'],
      lemmas: ['אֱלֹהִים', 'בָּרָא'],
      rcLinks: [],
      supportReferences: [],
      twLinks: []
    },
    cache: {
      cachedAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0,
      processing: {
        processedAt: new Date(),
        processingTimeMs: 50,
        parser: 'usfm-parser',
        options: {},
        issues: []
      },
      modification: {
        isDirty: false,
        modifications: []
      },
      sizeBytes: 0
    }
  };

  const content: NormalizedContent = {
    type: 'bible-verse',
    reference: { book: 'GEN', chapter: 1, verse: 1 },
    text: 'In the beginning God created the heavens and the earth.',
    words: [
      { text: 'In', position: 0 },
      { text: 'the', position: 1 },
      { text: 'beginning', position: 2 },
      { text: 'God', position: 3, strongs: 'H430', lemma: 'אֱלֹהִים' },
      { text: 'created', position: 4, strongs: 'H1254', lemma: 'בָּרָא' },
      { text: 'the', position: 5 },
      { text: 'heavens', position: 6 },
      { text: 'and', position: 7 },
      { text: 'the', position: 8 },
      { text: 'earth', position: 9 }
    ]
  };

  return { metadata, content };
}

function createTestTranslationNote(): { metadata: ResourceMetadata; content: NormalizedContent } {
  const resourceId: ResourceId = 'door43:unfoldingWord:en_tn:translation-note:01-GEN.tsv:1:1:note1';
  
  const metadata: ResourceMetadata = {
    id: resourceId,
    type: 'translation-note' as NormalizedResourceType,
    title: 'Translation Note for Genesis 1:1',
    description: 'Note about "In the beginning"',
    source: {
      repository: {
        server: 'door43',
        owner: 'unfoldingWord',
        repoId: 'en_tn',
        ref: 'master'
      },
      originalPath: '01-GEN.tsv',
      section: {
        verse: { book: 'GEN', chapter: 1, verse: 1 },
        field: 'note1'
      },
      contentHash: 'hash456',
      serverModifiedAt: new Date()
    },
    location: {
      book: 'GEN',
      chapter: 1,
      verse: 1,
      language: 'en',
      metadata: {}
    },
    references: {
      references: ['door43:unfoldingWord:en_ta:translation-academy:translate/figs-abstractnouns'],
      referencedBy: [],
      strongs: [],
      lemmas: [],
      rcLinks: ['rc://*/ta/man/translate/figs-abstractnouns'],
      supportReferences: ['rc://*/ta/man/translate/figs-abstractnouns'],
      twLinks: []
    },
    cache: {
      cachedAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0,
      processing: {
        processedAt: new Date(),
        processingTimeMs: 30,
        parser: 'tsv-parser',
        options: {},
        issues: []
      },
      modification: {
        isDirty: false,
        modifications: []
      },
      sizeBytes: 0
    }
  };

  const content: NormalizedContent = {
    type: 'translation-note',
    reference: { book: 'GEN', chapter: 1, verse: 1 },
    id: 'note1',
    quote: 'In the beginning',
    occurrence: 1,
    note: 'This phrase indicates the start of time and creation.',
    supportReference: {
      raw: 'rc://*/ta/man/translate/figs-abstractnouns',
      resolved: 'door43:unfoldingWord:en_ta:translation-academy:translate/figs-abstractnouns'
    },
    relatedResources: []
  };

  return { metadata, content };
}

function createTestTranslationAcademy(): { metadata: ResourceMetadata; content: NormalizedContent } {
  const resourceId: ResourceId = 'door43:unfoldingWord:en_ta:translation-academy:translate/figs-abstractnouns';
  
  const metadata: ResourceMetadata = {
    id: resourceId,
    type: 'translation-academy' as NormalizedResourceType,
    title: 'Abstract Nouns',
    description: 'How to translate abstract nouns',
    source: {
      repository: {
        server: 'door43',
        owner: 'unfoldingWord',
        repoId: 'en_ta',
        ref: 'master'
      },
      originalPath: 'translate/figs-abstractnouns',
      contentHash: 'hash789',
      serverModifiedAt: new Date()
    },
    location: {
      language: 'en',
      metadata: { category: 'translate', subcategory: 'figs' }
    },
    references: {
      references: [],
      referencedBy: ['door43:unfoldingWord:en_tn:translation-note:01-GEN.tsv:1:1:note1'],
      strongs: [],
      lemmas: [],
      rcLinks: [],
      supportReferences: [],
      twLinks: []
    },
    cache: {
      cachedAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0,
      processing: {
        processedAt: new Date(),
        processingTimeMs: 100,
        parser: 'markdown-parser',
        options: {},
        issues: []
      },
      modification: {
        isDirty: false,
        modifications: []
      },
      sizeBytes: 0
    }
  };

  const content: NormalizedContent = {
    type: 'translation-academy',
    id: 'figs-abstractnouns',
    title: 'Abstract Nouns',
    content: 'Abstract nouns are nouns that refer to attitudes, qualities, events, situations, or even relationships between those ideas. These are things that cannot be seen or touched in a physical sense, such as happiness, weight, unity, friendship, health, and reason.',
    sections: [
      {
        title: 'Description',
        content: 'Abstract nouns are nouns that refer to ideas or concepts that cannot be seen or touched.',
        type: 'explanation'
      },
      {
        title: 'Examples',
        content: 'Some examples include: happiness, weight, unity, friendship, health, reason.',
        type: 'examples'
      }
    ],
    relatedArticles: [],
    examples: [
      {
        text: 'The weight of the stone was too much.',
        explanation: 'Weight is an abstract noun referring to how heavy something is.'
      }
    ]
  };

  return { metadata, content };
}

// ============================================================================
// Test Functions
// ============================================================================

async function testCacheEngineInitialization(): Promise<boolean> {
  console.log('\n🧪 Testing Cache Engine Initialization...');
  
  try {
    // Create memory storage backend
    const storageBackend = new MemoryBackend();
    await storageBackend.initialize({});
    
    // Create cache engine config
    const config: CacheEngineConfig = {
      storageBackend,
      compression: false,
      encryption: false,
      crossReference: {
        autoBuild: true,
        maxTraversalDepth: 3
      }
    };
    
    // Create and initialize cache engine
    const cacheEngine = createCacheEngine(config);
    const initResult = await cacheEngine.initialize();
    
    if (!initResult.success) {
      console.error(`❌ Initialization failed: ${initResult.error}`);
      return false;
    }
    
    console.log('✅ Cache engine initialized successfully');
    
    // Shutdown
    await cacheEngine.shutdown();
    
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testResourceStorage(): Promise<boolean> {
  console.log('\n🧪 Testing Resource Storage...');
  
  try {
    // Setup
    const storageBackend = new MemoryBackend();
    await storageBackend.initialize({});
    
    const config: CacheEngineConfig = {
      storageBackend,
      crossReference: { autoBuild: true }
    };
    
    const cacheEngine = createCacheEngine(config);
    await cacheEngine.initialize();
    
    // Test data
    const { metadata: bibleMetadata, content: bibleContent } = createTestBibleVerse();
    const { metadata: noteMetadata, content: noteContent } = createTestTranslationNote();
    const { metadata: taMetadata, content: taContent } = createTestTranslationAcademy();
    
    // Store resources
    console.log('📝 Storing Bible verse...');
    const storeBibleResult = await cacheEngine.storeResource(bibleMetadata, bibleContent);
    if (!storeBibleResult.success) {
      console.error(`❌ Failed to store Bible verse: ${storeBibleResult.error}`);
      return false;
    }
    
    console.log('📝 Storing Translation Academy article...');
    const storeTAResult = await cacheEngine.storeResource(taMetadata, taContent);
    if (!storeTAResult.success) {
      console.error(`❌ Failed to store TA article: ${storeTAResult.error}`);
      return false;
    }
    
    console.log('📝 Storing Translation Note...');
    const storeNoteResult = await cacheEngine.storeResource(noteMetadata, noteContent);
    if (!storeNoteResult.success) {
      console.error(`❌ Failed to store Translation Note: ${storeNoteResult.error}`);
      return false;
    }
    
    console.log('✅ All resources stored successfully');
    
    // Cleanup
    await cacheEngine.shutdown();
    
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testResourceRetrieval(): Promise<boolean> {
  console.log('\n🧪 Testing Resource Retrieval...');
  
  try {
    // Setup and store test data
    const storageBackend = new MemoryBackend();
    await storageBackend.initialize({});
    
    const config: CacheEngineConfig = {
      storageBackend,
      crossReference: { autoBuild: true }
    };
    
    const cacheEngine = createCacheEngine(config);
    await cacheEngine.initialize();
    
    const { metadata, content } = createTestBibleVerse();
    await cacheEngine.storeResource(metadata, content);
    
    // Test retrieval
    console.log('🔍 Retrieving resource without content...');
    const getResult1 = await cacheEngine.getResource(metadata.id, { includeContent: false });
    if (!getResult1.success || !getResult1.data) {
      console.error(`❌ Failed to retrieve resource: ${getResult1.error}`);
      return false;
    }
    
    if (getResult1.data.content) {
      console.error('❌ Content should not be included');
      return false;
    }
    
    console.log('🔍 Retrieving resource with content...');
    const getResult2 = await cacheEngine.getResource(metadata.id, { includeContent: true });
    if (!getResult2.success || !getResult2.data || !getResult2.data.content) {
      console.error(`❌ Failed to retrieve resource with content: ${getResult2.error}`);
      return false;
    }
    
    console.log('✅ Resource retrieval working correctly');
    
    // Cleanup
    await cacheEngine.shutdown();
    
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testCrossReferences(): Promise<boolean> {
  console.log('\n🧪 Testing Cross-References...');
  
  try {
    // Setup
    const storageBackend = new MemoryBackend();
    await storageBackend.initialize({});
    
    const config: CacheEngineConfig = {
      storageBackend,
      crossReference: { autoBuild: true }
    };
    
    const cacheEngine = createCacheEngine(config);
    await cacheEngine.initialize();
    
    // Store interconnected resources
    const { metadata: bibleMetadata, content: bibleContent } = createTestBibleVerse();
    const { metadata: noteMetadata, content: noteContent } = createTestTranslationNote();
    const { metadata: taMetadata, content: taContent } = createTestTranslationAcademy();
    
    await cacheEngine.storeResource(taMetadata, taContent);
    await cacheEngine.storeResource(bibleMetadata, bibleContent);
    await cacheEngine.storeResource(noteMetadata, noteContent);
    
    // Test cross-reference retrieval
    console.log('🔗 Testing cross-reference retrieval...');
    const xrefResult = await cacheEngine.getResource(noteMetadata.id, { 
      includeCrossReferences: true 
    });
    
    if (!xrefResult.success || !xrefResult.data) {
      console.error(`❌ Failed to get cross-references: ${xrefResult.error}`);
      return false;
    }
    
    console.log(`📊 Found ${xrefResult.data.outgoingReferences?.length || 0} outgoing references`);
    console.log(`📊 Found ${xrefResult.data.incomingReferences?.length || 0} incoming references`);
    
    // Test related resource finding
    console.log('🔍 Finding related resources...');
    const relatedResult = await cacheEngine.findRelatedResources(noteMetadata.id, {
      maxDepth: 2,
      includeBacklinks: true
    });
    
    if (!relatedResult.success) {
      console.error(`❌ Failed to find related resources: ${relatedResult.error}`);
      return false;
    }
    
    console.log(`📊 Found ${relatedResult.data.length} related resources`);
    
    console.log('✅ Cross-references working correctly');
    
    // Cleanup
    await cacheEngine.shutdown();
    
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testResourceQueries(): Promise<boolean> {
  console.log('\n🧪 Testing Resource Queries...');
  
  try {
    // Setup
    const storageBackend = new MemoryBackend();
    await storageBackend.initialize({});
    
    const config: CacheEngineConfig = {
      storageBackend,
      crossReference: { autoBuild: true }
    };
    
    const cacheEngine = createCacheEngine(config);
    await cacheEngine.initialize();
    
    // Store test resources
    const { metadata: bibleMetadata, content: bibleContent } = createTestBibleVerse();
    const { metadata: noteMetadata, content: noteContent } = createTestTranslationNote();
    
    await cacheEngine.storeResource(bibleMetadata, bibleContent);
    await cacheEngine.storeResource(noteMetadata, noteContent);
    
    // Test queries
    console.log('🔍 Querying all resources...');
    const allResult = await cacheEngine.queryResources({
      includeContent: true,
      limit: 10
    });
    
    if (!allResult.success) {
      console.error(`❌ Failed to query all resources: ${allResult.error}`);
      return false;
    }
    
    console.log(`📊 Found ${allResult.data.length} total resources`);
    
    console.log('🔍 Querying by book...');
    const bookResult = await cacheEngine.queryResources({
      book: 'GEN',
      includeContent: false
    });
    
    if (!bookResult.success) {
      console.error(`❌ Failed to query by book: ${bookResult.error}`);
      return false;
    }
    
    console.log(`📊 Found ${bookResult.data.length} resources in Genesis`);
    
    console.log('🔍 Querying by type...');
    const typeResult = await cacheEngine.queryResources({
      types: ['bible-verse'],
      includeContent: true
    });
    
    if (!typeResult.success) {
      console.error(`❌ Failed to query by type: ${typeResult.error}`);
      return false;
    }
    
    console.log(`📊 Found ${typeResult.data.length} Bible verses`);
    
    console.log('✅ Resource queries working correctly');
    
    // Cleanup
    await cacheEngine.shutdown();
    
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testCacheStatistics(): Promise<boolean> {
  console.log('\n🧪 Testing Cache Statistics...');
  
  try {
    // Setup
    const storageBackend = new MemoryBackend();
    await storageBackend.initialize({});
    
    const config: CacheEngineConfig = {
      storageBackend,
      crossReference: { autoBuild: true }
    };
    
    const cacheEngine = createCacheEngine(config);
    await cacheEngine.initialize();
    
    // Store test resources
    const { metadata: bibleMetadata, content: bibleContent } = createTestBibleVerse();
    const { metadata: noteMetadata, content: noteContent } = createTestTranslationNote();
    const { metadata: taMetadata, content: taContent } = createTestTranslationAcademy();
    
    await cacheEngine.storeResource(bibleMetadata, bibleContent);
    await cacheEngine.storeResource(noteMetadata, noteContent);
    await cacheEngine.storeResource(taMetadata, taContent);
    
    // Perform some queries to generate statistics
    await cacheEngine.getResource(bibleMetadata.id, { includeContent: true });
    await cacheEngine.queryResources({ book: 'GEN' });
    
    // Get statistics
    console.log('📊 Getting cache statistics...');
    const statsResult = await cacheEngine.getStatistics();
    
    if (!statsResult.success) {
      console.error(`❌ Failed to get statistics: ${statsResult.error}`);
      return false;
    }
    
    const stats = statsResult.data;
    
    console.log('📈 Cache Statistics:');
    console.log(`   Total Resources: ${stats.registry.totalResources}`);
    console.log(`   Resources by Type:`, stats.registry.resourcesByType);
    console.log(`   Total Queries: ${stats.performance.totalQueries}`);
    console.log(`   Cache Hit Rate: ${(stats.performance.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`   Average Query Time: ${stats.performance.averageQueryTime.toFixed(2)}ms`);
    console.log(`   Total Cross-References: ${stats.crossReferences.totalReferences}`);
    
    console.log('✅ Cache statistics working correctly');
    
    // Cleanup
    await cacheEngine.shutdown();
    
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Door43 Cache Library Tests');
  console.log('=====================================');
  
  const tests = [
    { name: 'Cache Engine Initialization', fn: testCacheEngineInitialization },
    { name: 'Resource Storage', fn: testResourceStorage },
    { name: 'Resource Retrieval', fn: testResourceRetrieval },
    { name: 'Cross-References', fn: testCrossReferences },
    { name: 'Resource Queries', fn: testResourceQueries },
    { name: 'Cache Statistics', fn: testCacheStatistics }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
        console.log(`✅ ${test.name} - PASSED`);
      } else {
        failed++;
        console.log(`❌ ${test.name} - FAILED`);
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${test.name} - ERROR: ${error}`);
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total:  ${tests.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! The Door43 Cache Library is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}
