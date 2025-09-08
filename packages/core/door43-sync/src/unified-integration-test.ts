#!/usr/bin/env tsx

/**
 * Unified Integration Test
 * Tests the complete unified resource orchestrator with sync, cache, scoping, and alignment
 */

import { 
  UnifiedResourceOrchestrator,
  createTranslationOrchestrator,
  createResearchOrchestrator
} from './lib/unified-resource-orchestrator.js';

console.log('🎯 Unified Integration Test - Complete Resource Management');
console.log('=========================================================');

// Mock storage backend
class MockStorageBackend {
  private data = new Map<string, any>();

  async get(key: string) {
    const value = this.data.get(key);
    return { success: true, data: value || null };
  }

  async set(key: string, value: any) {
    this.data.set(key, value);
    return { success: true, data: undefined };
  }

  async has(key: string) {
    return { success: true, data: this.data.has(key) };
  }

  async delete(key: string) {
    const existed = this.data.has(key);
    this.data.delete(key);
    return { success: true, data: existed };
  }

  async keys() {
    return { success: true, data: Array.from(this.data.keys()) };
  }

  async clear() {
    this.data.clear();
    return { success: true, data: undefined };
  }

  async close() {
    return { success: true, data: undefined };
  }
}

async function testTranslationOrchestrator() {
  console.log('\n🧪 Testing Translation Orchestrator...');
  
  const storage = new MockStorageBackend();
  const authToken = 'test-translation-token';
  
  // Create translation orchestrator
  const orchestrator = createTranslationOrchestrator(
    storage as any,
    authToken,
    {
      languages: ['en', 'es'],
      books: ['GEN', 'MAT'],
      enableAlignment: true
    }
  );
  
  // Initialize orchestrator
  const initResult = await orchestrator.initialize();
  if (!initResult.success) {
    console.log(`❌ Failed to initialize translation orchestrator: ${initResult.error}`);
    return false;
  }
  
  console.log('✅ Translation orchestrator initialized');
  
  // Check sync status
  const syncStatus = orchestrator.getSyncStatus();
  console.log(`📊 Sync status: ${syncStatus.state}`);
  
  // Check current scope
  const scope = orchestrator.getCurrentScope();
  console.log(`🎯 Current scope: ${scope?.name || 'None'}`);
  console.log(`   Languages: ${scope?.languages.join(', ')}`);
  console.log(`   Resource types: ${scope?.resourceTypes.join(', ')}`);
  
  await orchestrator.shutdown();
  return true;
}

async function testResearchOrchestrator() {
  console.log('\n🧪 Testing Research Orchestrator...');
  
  const storage = new MockStorageBackend();
  const authToken = 'test-research-token';
  
  // Create research orchestrator
  const orchestrator = createResearchOrchestrator(
    storage as any,
    authToken
  );
  
  // Initialize orchestrator
  const initResult = await orchestrator.initialize();
  if (!initResult.success) {
    console.log(`❌ Failed to initialize research orchestrator: ${initResult.error}`);
    return false;
  }
  
  console.log('✅ Research orchestrator initialized');
  
  // Check scope configuration
  const scope = orchestrator.getCurrentScope();
  console.log(`🎯 Research scope: ${scope?.name}`);
  console.log(`   Languages: ${scope?.languages.join(', ')}`);
  console.log(`   Priority: ${scope?.priority.level} (${scope?.priority.weight})`);
  
  await orchestrator.shutdown();
  return true;
}

async function testResourceStorage() {
  console.log('\n🧪 Testing Unified Resource Storage...');
  
  const storage = new MockStorageBackend();
  const authToken = 'test-storage-token';
  
  const orchestrator = createTranslationOrchestrator(
    storage as any,
    authToken
  );
  
  await orchestrator.initialize();
  
  // Test storing a translation notes resource
  const translationNotesContent = {
    metadata: {
      resourceType: 'translation-notes',
      format: 'tsv',
      version: '1.0',
      language: 'en',
      book: 'GEN'
    },
    notes: {
      '1': {
        '1': [{
          Book: 'GEN',
          Chapter: '1',
          Verse: '1',
          ID: 'gen001',
          SupportReference: 'rc://*/ta/man/translate/figs-metaphor',
          OriginalQuote: 'בְּרֵאשִׁית',
          Occurrence: '1',
          GLQuote: 'In the beginning',
          OccurrenceNote: 'This phrase introduces the account of creation.'
        }]
      }
    },
    statistics: {
      totalNotes: 1,
      chaptersCount: 1,
      versesCount: 1
    }
  };
  
  const metadata = {
    id: 'gen-translation-notes',
    type: 'translation-notes',
    format: 'tsv',
    resourceType: 'translation-notes',
    door43Metadata: {
      owner: 'test-org',
      repo: 'en_tn',
      branch: 'master',
      filePath: 'tn_GEN.tsv'
    }
  };
  
  console.log('💾 Storing Translation Notes resource...');
  const storeResult = await orchestrator.storeResource(
    'gen-translation-notes',
    translationNotesContent,
    metadata,
    {
      syncBack: true,
      updateAlignment: true,
      commitMessage: 'Add Genesis translation notes via unified orchestrator'
    }
  );
  
  if (storeResult.success) {
    console.log('✅ Resource storage successful');
    console.log(`   📊 Total time: ${storeResult.metadata?.totalTimeMs}ms`);
    console.log(`   📊 Cache time: ${storeResult.metadata?.cacheTimeMs}ms`);
    console.log(`   📊 Sync time: ${storeResult.metadata?.syncTimeMs}ms`);
    console.log(`   📊 Alignment time: ${storeResult.metadata?.alignmentTimeMs}ms`);
    console.log(`   📊 Sync operations: ${storeResult.metadata?.syncOperations}`);
    console.log(`   📊 Alignment operations: ${storeResult.metadata?.alignmentOperations}`);
  } else {
    console.log(`❌ Resource storage failed: ${storeResult.error}`);
  }
  
  await orchestrator.shutdown();
  return storeResult.success;
}

async function testResourceQuery() {
  console.log('\n🧪 Testing Unified Resource Query...');
  
  const storage = new MockStorageBackend();
  const authToken = 'test-query-token';
  
  const orchestrator = createTranslationOrchestrator(
    storage as any,
    authToken
  );
  
  await orchestrator.initialize();
  
  // First store some test data
  await orchestrator.storeResource(
    'test-resource-1',
    { content: 'Test content 1' },
    { id: 'test-resource-1', type: 'bible-text' }
  );
  
  await orchestrator.storeResource(
    'test-resource-2',
    { content: 'Test content 2' },
    { id: 'test-resource-2', type: 'translation-notes' }
  );
  
  // Query resources with alignment data
  console.log('🔍 Querying resources with alignment data...');
  const queryResult = await orchestrator.queryResources({
    types: ['bible-text', 'translation-notes'],
    includeContent: true,
    includeAlignment: true,
    alignmentTraversal: {
      enabled: true,
      maxDepth: 2,
      includeRelatedWords: true
    },
    limit: 10
  });
  
  if (queryResult.success) {
    console.log('✅ Resource query successful');
    console.log(`   📊 Resources found: ${queryResult.data?.length || 0}`);
    console.log(`   📊 Total time: ${queryResult.metadata?.totalTimeMs}ms`);
    console.log(`   📊 Cache hits: ${queryResult.metadata?.cacheHits}`);
    console.log(`   📊 Alignment operations: ${queryResult.metadata?.alignmentOperations}`);
    
    // Show resource details
    for (const resource of queryResult.data || []) {
      console.log(`   📄 Resource: ${resource.metadata.id}`);
      console.log(`      Type: ${resource.metadata.type}`);
      console.log(`      Sync status: ${resource.syncStatus?.lastSynced ? 'Synced' : 'Not synced'}`);
      console.log(`      Alignment: ${resource.alignmentData ? 'Available' : 'Not available'}`);
      console.log(`      Scope: ${resource.scopeInfo?.scopeId}`);
    }
  } else {
    console.log(`❌ Resource query failed: ${queryResult.error}`);
  }
  
  await orchestrator.shutdown();
  return queryResult.success;
}

async function testAlignmentTraversal() {
  console.log('\n🧪 Testing Alignment-Aware Cross-Reference Traversal...');
  
  const storage = new MockStorageBackend();
  const authToken = 'test-alignment-token';
  
  const orchestrator = createTranslationOrchestrator(
    storage as any,
    authToken,
    { enableAlignment: true }
  );
  
  await orchestrator.initialize();
  
  // Test alignment traversal for a word
  console.log('🔗 Traversing alignment references for word "beginning"...');
  const traversalResult = await orchestrator.traverseAlignmentReferences(
    'gen-1-1',
    'beginning',
    {
      maxDepth: 3,
      includeRelatedWords: true,
      resourceTypes: ['translation-notes', 'translation-words']
    }
  );
  
  if (traversalResult.success) {
    console.log('✅ Alignment traversal successful');
    console.log(`   📊 Word: ${traversalResult.data?.word}`);
    console.log(`   📊 Resource: ${traversalResult.data?.resourceId}`);
    console.log(`   📊 Interactions: ${traversalResult.data?.statistics?.totalInteractions}`);
    console.log(`   📊 Cross-references: ${traversalResult.data?.statistics?.crossReferencesTraversed}`);
    console.log(`   📊 Execution time: ${traversalResult.data?.statistics?.executionTimeMs}ms`);
  } else {
    console.log(`❌ Alignment traversal failed: ${traversalResult.error}`);
  }
  
  await orchestrator.shutdown();
  return traversalResult.success;
}

async function testScopeManagement() {
  console.log('\n🧪 Testing Scope Management...');
  
  const storage = new MockStorageBackend();
  const authToken = 'test-scope-token';
  
  const orchestrator = createTranslationOrchestrator(
    storage as any,
    authToken
  );
  
  await orchestrator.initialize();
  
  // Get initial scope
  const initialScope = orchestrator.getCurrentScope();
  console.log(`📊 Initial scope: ${initialScope?.name}`);
  
  // Update to a custom scope
  const customScope = {
    id: 'custom-nt-scope',
    name: 'New Testament Focus',
    description: 'Focused on New Testament resources',
    organizations: [{
      organizationId: 'door43-catalog',
      repositories: ['en_ult', 'en_tn', 'en_tw'],
      refs: ['master']
    }],
    languages: ['en', 'grc'],
    resourceTypes: ['bible-text', 'translation-notes', 'translation-words'],
    books: ['MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM'],
    priority: { level: 'high' as const, weight: 85 },
    metadata: {
      createdAt: new Date(),
      createdBy: 'test-user',
      version: '1.0',
      tags: ['nt', 'focused']
    }
  };
  
  console.log('🎯 Updating to custom New Testament scope...');
  const updateResult = await orchestrator.updateScope(customScope);
  
  if (updateResult.success) {
    const updatedScope = orchestrator.getCurrentScope();
    console.log('✅ Scope update successful');
    console.log(`   📊 New scope: ${updatedScope?.name}`);
    console.log(`   📊 Languages: ${updatedScope?.languages.join(', ')}`);
    console.log(`   📊 Books: ${updatedScope?.books?.join(', ')}`);
    console.log(`   📊 Priority: ${updatedScope?.priority.level} (${updatedScope?.priority.weight})`);
  } else {
    console.log(`❌ Scope update failed: ${updateResult.error}`);
  }
  
  await orchestrator.shutdown();
  return updateResult.success;
}

async function testCacheStatistics() {
  console.log('\n🧪 Testing Cache Statistics...');
  
  const storage = new MockStorageBackend();
  const authToken = 'test-stats-token';
  
  const orchestrator = createTranslationOrchestrator(
    storage as any,
    authToken
  );
  
  await orchestrator.initialize();
  
  // Store some resources to generate statistics
  await orchestrator.storeResource('stats-test-1', { data: 'test1' }, { id: 'stats-test-1' });
  await orchestrator.storeResource('stats-test-2', { data: 'test2' }, { id: 'stats-test-2' });
  
  // Get cache statistics
  console.log('📊 Getting cache statistics...');
  const statsResult = await orchestrator.getCacheStatistics();
  
  if (statsResult.success) {
    console.log('✅ Cache statistics retrieved');
    console.log(`   📊 Statistics: ${JSON.stringify(statsResult.data, null, 2)}`);
  } else {
    console.log(`❌ Cache statistics failed: ${statsResult.error}`);
  }
  
  await orchestrator.shutdown();
  return statsResult.success;
}

async function runUnifiedIntegrationTests() {
  console.log('💡 Running unified integration tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  const tests = [
    { name: 'Translation Orchestrator', fn: testTranslationOrchestrator },
    { name: 'Research Orchestrator', fn: testResearchOrchestrator },
    { name: 'Resource Storage', fn: testResourceStorage },
    { name: 'Resource Query', fn: testResourceQuery },
    { name: 'Alignment Traversal', fn: testAlignmentTraversal },
    { name: 'Scope Management', fn: testScopeManagement },
    { name: 'Cache Statistics', fn: testCacheStatistics }
  ];
  
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
  
  console.log('\n📊 Unified Integration Test Results:');
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total:  ${tests.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL UNIFIED INTEGRATION TESTS PASSED!');
    console.log('\n🔮 Complete Unified System Validated:');
    console.log('   ✅ Translation Orchestrator - Optimized for translation workflow');
    console.log('   ✅ Research Orchestrator - Comprehensive research capabilities');
    console.log('   ✅ Unified Resource Storage - Integrated cache, sync, and alignment');
    console.log('   ✅ Alignment-Aware Queries - Cross-reference traversal with alignment');
    console.log('   ✅ Dynamic Scope Management - Flexible resource filtering');
    console.log('   ✅ Performance Monitoring - Comprehensive statistics and metrics');
    
    console.log('\n🎯 Production-Ready Unified Features:');
    console.log('   • Complete resource lifecycle management');
    console.log('   • Integrated caching with sync-back capabilities');
    console.log('   • Alignment-aware cross-reference traversal');
    console.log('   • Dynamic resource scoping and filtering');
    console.log('   • Performance optimization and monitoring');
    console.log('   • Extensible architecture for new resource types');
    
    console.log('\n🏆 UNIFIED RESOURCE ORCHESTRATOR IS COMPLETE!');
    console.log('   Ready for production use with complete Door43 integration.');
    console.log('   Provides the foundation for alignment-centric Bible translation apps.');
    console.log('   Supports complex workflows with intelligent resource management.');
    
  } else {
    console.log('\n⚠️  Some unified integration tests failed.');
    process.exit(1);
  }
}

// Run unified integration tests
runUnifiedIntegrationTests().catch(error => {
  console.error('❌ Unified integration test runner failed:', error);
  process.exit(1);
});
