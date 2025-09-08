#!/usr/bin/env tsx

/**
 * Simple CLI Tester for Door43 Scoping Library
 * Tests resource scoping and filtering without external dependencies
 */

import { 
  ResourceScopeManager,
  ResourceScope,
  ScopeFactory,
  ScopeBuilder,
  ApplicationProfile
} from './lib/door43-scoping.js';

// Mock storage backend for testing
class MockStorageBackend {
  private data = new Map<string, any>();

  async initialize() {
    return { success: true, data: undefined };
  }

  async set(key: string, value: any) {
    this.data.set(key, value);
    return { success: true, data: undefined };
  }

  async get<T>(key: string) {
    const value = this.data.get(key);
    return { success: true, data: value as T || null };
  }

  async has(key: string) {
    return { success: true, data: this.data.has(key) };
  }

  async delete(key: string) {
    const deleted = this.data.delete(key);
    return { success: true, data: deleted };
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

// ============================================================================
// Test Functions
// ============================================================================

async function testScopeManagerInitialization(): Promise<boolean> {
  console.log('\n🧪 Testing Scope Manager Initialization...');
  
  try {
    const mockStorage = new MockStorageBackend();
    await mockStorage.initialize();
    
    const scopeManager = new ResourceScopeManager(mockStorage as any);
    const initResult = await scopeManager.initialize();
    
    if (!initResult.success) {
      console.error(`❌ Initialization failed: ${initResult.error}`);
      return false;
    }
    
    console.log('✅ Scope manager initialized successfully');
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testScopeCreationFromTemplate(): Promise<boolean> {
  console.log('\n🧪 Testing Scope Creation from Template...');
  
  try {
    // Test Bible reader scope
    console.log('📖 Creating Bible reader scope...');
    const bibleReaderScope = ScopeFactory.createFromTemplate('bible-reader', {
      languages: ['en', 'es'],
      organizations: ['unfoldingWord'],
      books: ['GEN', 'MAT', 'JHN']
    });
    
    if (!bibleReaderScope.id || !bibleReaderScope.name) {
      console.error('❌ Bible reader scope missing required fields');
      return false;
    }
    
    console.log(`📖 Created scope: ${bibleReaderScope.name} (${bibleReaderScope.id})`);
    console.log(`   Languages: ${bibleReaderScope.languages.join(', ')}`);
    console.log(`   Resource types: ${bibleReaderScope.resourceTypes.join(', ')}`);
    
    // Test translator scope
    console.log('🔧 Creating translator scope...');
    const translatorScope = ScopeFactory.createFromTemplate('translator-advanced', {
      languages: ['en'],
      organizations: ['unfoldingWord', 'Door43']
    });
    
    if (!translatorScope.id || !translatorScope.name) {
      console.error('❌ Translator scope missing required fields');
      return false;
    }
    
    console.log(`🔧 Created scope: ${translatorScope.name} (${translatorScope.id})`);
    console.log(`   Organizations: ${translatorScope.organizations.map(o => o.organizationId).join(', ')}`);
    console.log(`   Resource types: ${translatorScope.resourceTypes.join(', ')}`);
    
    console.log('✅ Scope creation from templates working correctly');
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testCustomScopeBuilder(): Promise<boolean> {
  console.log('\n🧪 Testing Custom Scope Builder...');
  
  try {
    const customScope = new ScopeBuilder()
      .withName('Custom Test Scope', 'A scope created for testing purposes')
      .withLanguages(['en', 'fr', 'es'])
      .withOrganizations(['unfoldingWord', 'Door43'])
      .withResourceTypes(['bible-verse', 'translation-note'])
      .withBooks(['GEN', 'EXO', 'MAT', 'MRK'])
      .withTextSearch('love')
      .withMaxCacheSize(100 * 1024 * 1024) // 100MB
      .withSizeLimit(1024 * 1024) // 1MB per resource
      .build();
    
    if (!customScope.id || !customScope.name) {
      console.error('❌ Custom scope missing required fields');
      return false;
    }
    
    console.log(`🏗️ Built custom scope: ${customScope.name} (${customScope.id})`);
    console.log(`   Description: ${customScope.description}`);
    console.log(`   Languages: ${customScope.languages.join(', ')}`);
    console.log(`   Organizations: ${customScope.organizations.map(o => o.organizationId).join(', ')}`);
    console.log(`   Resource types: ${customScope.resourceTypes.join(', ')}`);
    console.log(`   Books: ${customScope.books?.join(', ')}`);
    console.log(`   Filters: ${customScope.filters?.length || 0}`);
    console.log(`   Max cache size: ${customScope.maxCacheSize} bytes`);
    
    if (customScope.filters && customScope.filters.length > 0) {
      console.log('   Filter details:');
      customScope.filters.forEach((filter, index) => {
        console.log(`     ${index + 1}. ${filter.type}: ${filter.description}`);
      });
    }
    
    console.log('✅ Custom scope builder working correctly');
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testScopeRecommendation(): Promise<boolean> {
  console.log('\n🧪 Testing Scope Recommendation...');
  
  try {
    // Test mobile app profile
    console.log('📱 Testing mobile app recommendation...');
    const mobileProfile: ApplicationProfile = {
      type: 'reader',
      platform: 'mobile',
      expectedResourceCount: 500,
      concurrentUsers: 1,
      languages: ['en', 'es'],
      organizations: ['unfoldingWord'],
      offlineSupport: true,
      realTimeCollaboration: false,
      storageConstraints: {
        maxSize: 50 * 1024 * 1024, // 50MB
        preferCompression: true
      }
    };
    
    const mobileRecommendation = ScopeFactory.recommendScope(mobileProfile);
    
    if (!mobileRecommendation.scope || mobileRecommendation.confidence <= 0) {
      console.error('❌ Mobile recommendation failed');
      return false;
    }
    
    console.log(`📱 Recommended scope: ${mobileRecommendation.scope.name}`);
    console.log(`   Confidence: ${(mobileRecommendation.confidence * 100).toFixed(1)}%`);
    console.log(`   Reasoning:`);
    mobileRecommendation.reasoning.forEach(reason => {
      console.log(`     - ${reason}`);
    });
    
    if (mobileRecommendation.suggestions.length > 0) {
      console.log(`   Suggestions:`);
      mobileRecommendation.suggestions.forEach(suggestion => {
        console.log(`     - ${suggestion}`);
      });
    }
    
    // Test server profile
    console.log('🖥️ Testing server app recommendation...');
    const serverProfile: ApplicationProfile = {
      type: 'server',
      platform: 'server',
      expectedResourceCount: 10000,
      concurrentUsers: 100,
      languages: ['en', 'es', 'fr', 'pt'],
      organizations: ['unfoldingWord', 'Door43'],
      offlineSupport: false,
      realTimeCollaboration: true
    };
    
    const serverRecommendation = ScopeFactory.recommendScope(serverProfile);
    
    if (!serverRecommendation.scope || serverRecommendation.confidence <= 0) {
      console.error('❌ Server recommendation failed');
      return false;
    }
    
    console.log(`🖥️ Recommended scope: ${serverRecommendation.scope.name}`);
    console.log(`   Confidence: ${(serverRecommendation.confidence * 100).toFixed(1)}%`);
    
    console.log('✅ Scope recommendation working correctly');
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testScopeManagerOperations(): Promise<boolean> {
  console.log('\n🧪 Testing Scope Manager Operations...');
  
  try {
    const mockStorage = new MockStorageBackend();
    await mockStorage.initialize();
    
    const scopeManager = new ResourceScopeManager(mockStorage as any);
    await scopeManager.initialize();
    
    // Create test scopes
    const testScope1 = ScopeFactory.createFromTemplate('bible-reader', {
      languages: ['en'],
      organizations: ['unfoldingWord']
    });
    
    const testScope2 = ScopeFactory.createFromTemplate('translator-basic', {
      languages: ['es'],
      organizations: ['Door43']
    });
    
    // Test setting active scope (this will fail since scopes aren't registered, but that's expected)
    console.log('🎯 Testing active scope operations...');
    const setActiveResult = await scopeManager.setActiveScope(testScope1.id);
    
    // This should fail since the scope isn't registered
    if (setActiveResult.success) {
      console.error('❌ Expected failure when setting unregistered scope as active');
      return false;
    }
    
    console.log('✅ Correctly rejected setting unregistered scope as active');
    
    // Test getting active scope
    const getActiveResult = await scopeManager.getActiveScope();
    if (!getActiveResult.success) {
      console.error(`❌ Failed to get active scope: ${getActiveResult.error}`);
      return false;
    }
    
    if (getActiveResult.data !== null) {
      console.error('❌ Expected null active scope');
      return false;
    }
    
    console.log('✅ Correctly returned null for no active scope');
    
    // Test resource filtering with no active scope
    const testResourceIds = ['resource1', 'resource2', 'resource3'];
    const filterResult = await scopeManager.filterResourcesByScope(testResourceIds);
    
    if (!filterResult.success) {
      console.error(`❌ Failed to filter resources: ${filterResult.error}`);
      return false;
    }
    
    if (filterResult.data.length !== testResourceIds.length) {
      console.error('❌ Expected all resources to pass when no active scope');
      return false;
    }
    
    console.log('✅ Correctly included all resources when no active scope');
    
    // Test listing scopes
    const listResult = await scopeManager.listScopes();
    if (!listResult.success) {
      console.error(`❌ Failed to list scopes: ${listResult.error}`);
      return false;
    }
    
    console.log(`📋 Listed ${listResult.data.length} scopes`);
    
    console.log('✅ Scope manager operations working correctly');
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testDynamicScopeCreation(): Promise<boolean> {
  console.log('\n🧪 Testing Dynamic Scope Creation...');
  
  try {
    const mockStorage = new MockStorageBackend();
    await mockStorage.initialize();
    
    const scopeManager = new ResourceScopeManager(mockStorage as any);
    await scopeManager.initialize();
    
    // Create dynamic scope
    console.log('⚡ Creating dynamic scope...');
    const dynamicScopeRequest = {
      name: 'Dynamic Test Scope',
      criteria: {
        organizations: ['unfoldingWord'],
        languages: ['en', 'es'],
        resourceTypes: ['bible-verse', 'translation-note'],
        books: ['GEN', 'MAT'],
        textSearch: 'love',
        tags: ['test', 'dynamic']
      },
      options: {
        maxCacheSize: 50 * 1024 * 1024, // 50MB
        temporary: true,
        expiresAt: new Date(Date.now() + 60000) // 1 minute
      }
    };
    
    const createResult = await scopeManager.createDynamicScope(dynamicScopeRequest);
    
    if (!createResult.success) {
      console.error(`❌ Failed to create dynamic scope: ${createResult.error}`);
      return false;
    }
    
    const dynamicScope = createResult.data;
    console.log(`⚡ Created dynamic scope: ${dynamicScope.name} (${dynamicScope.id})`);
    console.log(`   Organizations: ${dynamicScope.organizations.map(o => o.organizationId).join(', ')}`);
    console.log(`   Languages: ${dynamicScope.languages.join(', ')}`);
    console.log(`   Resource types: ${dynamicScope.resourceTypes.join(', ')}`);
    console.log(`   Books: ${dynamicScope.books?.join(', ')}`);
    console.log(`   Filters: ${dynamicScope.filters?.length || 0}`);
    console.log(`   Max cache size: ${dynamicScope.maxCacheSize} bytes`);
    console.log(`   Tags: ${dynamicScope.metadata.tags.join(', ')}`);
    
    // Verify scope was added to manager
    const listResult = await scopeManager.listScopes();
    if (!listResult.success) {
      console.error(`❌ Failed to list scopes: ${listResult.error}`);
      return false;
    }
    
    const foundScope = listResult.data.find(s => s.id === dynamicScope.id);
    if (!foundScope) {
      console.error('❌ Dynamic scope not found in scope manager');
      return false;
    }
    
    console.log('✅ Dynamic scope creation working correctly');
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testScopeOptimization(): Promise<boolean> {
  console.log('\n🧪 Testing Scope Optimization...');
  
  try {
    const mockStorage = new MockStorageBackend();
    await mockStorage.initialize();
    
    const scopeManager = new ResourceScopeManager(mockStorage as any);
    await scopeManager.initialize();
    
    // Create a scope with redundant filters for optimization
    const testScope = new ScopeBuilder()
      .withName('Optimization Test Scope')
      .withLanguages(['en', 'en', 'es']) // Duplicate language
      .withOrganizations(['unfoldingWord', 'unfoldingWord']) // Duplicate org
      .withResourceTypes(['bible-verse', 'translation-note'])
      .withTextSearch('test')
      .withTextSearch('test') // This will create duplicate filters
      .build();
    
    // Add duplicate filters manually
    testScope.filters?.push({
      type: 'include',
      priority: 100,
      criteria: {
        content: {
          textSearch: 'duplicate'
        }
      },
      description: 'Duplicate filter 1'
    });
    
    testScope.filters?.push({
      type: 'include',
      priority: 100,
      criteria: {
        content: {
          textSearch: 'duplicate'
        }
      },
      description: 'Duplicate filter 2'
    });
    
    console.log(`🔧 Original scope has ${testScope.filters?.length || 0} filters`);
    console.log(`   Languages: ${testScope.languages.length}`);
    console.log(`   Organizations: ${testScope.organizations.length}`);
    
    // Create dynamic scope to add to manager
    const createResult = await scopeManager.createDynamicScope({
      name: testScope.name,
      criteria: {
        organizations: testScope.organizations.map(o => o.organizationId),
        languages: testScope.languages,
        resourceTypes: testScope.resourceTypes
      },
      filters: testScope.filters
    });
    
    if (!createResult.success) {
      console.error(`❌ Failed to create scope for optimization: ${createResult.error}`);
      return false;
    }
    
    const createdScope = createResult.data;
    
    // Optimize the scope
    console.log('⚡ Optimizing scope...');
    const optimizeResult = await scopeManager.optimizeScope(createdScope.id);
    
    if (!optimizeResult.success) {
      console.error(`❌ Failed to optimize scope: ${optimizeResult.error}`);
      return false;
    }
    
    const optimization = optimizeResult.data;
    console.log(`⚡ Optimization completed:`);
    console.log(`   Original filters: ${optimization.original.filterCount}`);
    console.log(`   Optimized filters: ${optimization.optimized.filterCount}`);
    console.log(`   Performance improvement: ${optimization.performanceImprovement.toFixed(1)}%`);
    console.log(`   Operations performed:`);
    optimization.operations.forEach(op => {
      console.log(`     - ${op}`);
    });
    
    if (optimization.recommendations.length > 0) {
      console.log(`   Recommendations:`);
      optimization.recommendations.forEach(rec => {
        console.log(`     - ${rec}`);
      });
    }
    
    console.log('✅ Scope optimization working correctly');
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
  console.log('🚀 Starting Door43 Scoping Library Simple Tests');
  console.log('===============================================');
  
  const tests = [
    { name: 'Scope Manager Initialization', fn: testScopeManagerInitialization },
    { name: 'Scope Creation from Template', fn: testScopeCreationFromTemplate },
    { name: 'Custom Scope Builder', fn: testCustomScopeBuilder },
    { name: 'Scope Recommendation', fn: testScopeRecommendation },
    { name: 'Scope Manager Operations', fn: testScopeManagerOperations },
    { name: 'Dynamic Scope Creation', fn: testDynamicScopeCreation },
    { name: 'Scope Optimization', fn: testScopeOptimization }
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
    console.log('\n🎉 All tests passed! The Door43 Scoping system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}
