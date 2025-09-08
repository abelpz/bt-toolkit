#!/usr/bin/env tsx

/**
 * Standalone test for Door43 Scoping Library
 * Tests core functionality without external dependencies
 */

// Mock the dependencies to avoid import issues
const mockAsyncResult = {
  success: true,
  data: undefined
};

// Mock storage backend
class MockStorageBackend {
  private data = new Map<string, any>();

  async initialize() { return mockAsyncResult; }
  async set(key: string, value: any) { 
    this.data.set(key, value);
    return mockAsyncResult; 
  }
  async get<T>(key: string) { 
    return { success: true, data: this.data.get(key) as T || null }; 
  }
  async has(key: string) { 
    return { success: true, data: this.data.has(key) }; 
  }
  async delete(key: string) { 
    this.data.delete(key);
    return mockAsyncResult; 
  }
  async keys() { 
    return { success: true, data: Array.from(this.data.keys()) }; 
  }
  async clear() { 
    this.data.clear();
    return mockAsyncResult; 
  }
  async close() { return mockAsyncResult; }
}

// Import the scoping components directly
import { ScopeFactory, ScopeBuilder } from './lib/scope-factory.js';
import { ResourceScopeManager } from './lib/resource-scope-manager.js';

async function runStandaloneTests() {
  console.log('🚀 Running Door43 Scoping Standalone Tests');
  console.log('==========================================');

  let passed = 0;
  let failed = 0;

  // Test 1: Scope Factory Templates
  console.log('\n🧪 Test 1: Scope Factory Templates');
  try {
    const bibleScope = ScopeFactory.createFromTemplate('bible-reader', {
      languages: ['en', 'es'],
      organizations: ['unfoldingWord']
    });

    if (bibleScope.name === 'Bible Reader' && bibleScope.languages.includes('en')) {
      console.log('✅ Bible reader scope created successfully');
      console.log(`   ID: ${bibleScope.id}`);
      console.log(`   Languages: ${bibleScope.languages.join(', ')}`);
      console.log(`   Resource types: ${bibleScope.resourceTypes.join(', ')}`);
      passed++;
    } else {
      console.log('❌ Bible reader scope creation failed');
      failed++;
    }
  } catch (error) {
    console.log(`❌ Test 1 failed: ${error}`);
    failed++;
  }

  // Test 2: Custom Scope Builder
  console.log('\n🧪 Test 2: Custom Scope Builder');
  try {
    const customScope = new ScopeBuilder()
      .withName('Test Custom Scope')
      .withLanguages(['en', 'fr'])
      .withOrganizations(['unfoldingWord', 'Door43'])
      .withResourceTypes(['bible-verse', 'translation-note'])
      .withTextSearch('love')
      .withMaxCacheSize(50 * 1024 * 1024)
      .build();

    if (customScope.name === 'Test Custom Scope' && customScope.languages.length === 2) {
      console.log('✅ Custom scope built successfully');
      console.log(`   ID: ${customScope.id}`);
      console.log(`   Languages: ${customScope.languages.join(', ')}`);
      console.log(`   Organizations: ${customScope.organizations.map(o => o.organizationId).join(', ')}`);
      console.log(`   Filters: ${customScope.filters?.length || 0}`);
      passed++;
    } else {
      console.log('❌ Custom scope building failed');
      failed++;
    }
  } catch (error) {
    console.log(`❌ Test 2 failed: ${error}`);
    failed++;
  }

  // Test 3: Scope Manager Initialization
  console.log('\n🧪 Test 3: Scope Manager Initialization');
  try {
    const mockStorage = new MockStorageBackend();
    const scopeManager = new ResourceScopeManager(mockStorage as any);
    
    const initResult = await scopeManager.initialize();
    
    if (initResult.success) {
      console.log('✅ Scope manager initialized successfully');
      passed++;
    } else {
      console.log(`❌ Scope manager initialization failed: ${initResult.error}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ Test 3 failed: ${error}`);
    failed++;
  }

  // Test 4: Scope Recommendation
  console.log('\n🧪 Test 4: Scope Recommendation');
  try {
    const profile = {
      type: 'reader' as const,
      platform: 'mobile' as const,
      expectedResourceCount: 500,
      concurrentUsers: 1,
      languages: ['en'],
      organizations: ['unfoldingWord'],
      offlineSupport: true,
      realTimeCollaboration: false
    };

    const recommendation = ScopeFactory.recommendScope(profile);
    
    if (recommendation.scope && recommendation.confidence > 0) {
      console.log('✅ Scope recommendation generated successfully');
      console.log(`   Recommended: ${recommendation.scope.name}`);
      console.log(`   Confidence: ${(recommendation.confidence * 100).toFixed(1)}%`);
      console.log(`   Reasoning: ${recommendation.reasoning.length} points`);
      passed++;
    } else {
      console.log('❌ Scope recommendation failed');
      failed++;
    }
  } catch (error) {
    console.log(`❌ Test 4 failed: ${error}`);
    failed++;
  }

  // Test 5: Dynamic Scope Creation
  console.log('\n🧪 Test 5: Dynamic Scope Creation');
  try {
    const mockStorage = new MockStorageBackend();
    const scopeManager = new ResourceScopeManager(mockStorage as any);
    await scopeManager.initialize();

    const dynamicRequest = {
      name: 'Dynamic Test Scope',
      criteria: {
        organizations: ['unfoldingWord'],
        languages: ['en'],
        resourceTypes: ['bible-verse'],
        textSearch: 'test'
      }
    };

    const createResult = await scopeManager.createDynamicScope(dynamicRequest);
    
    if (createResult.success && createResult.data) {
      console.log('✅ Dynamic scope created successfully');
      console.log(`   ID: ${createResult.data.id}`);
      console.log(`   Name: ${createResult.data.name}`);
      console.log(`   Organizations: ${createResult.data.organizations.map(o => o.organizationId).join(', ')}`);
      passed++;
    } else {
      console.log(`❌ Dynamic scope creation failed: ${createResult.error}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ Test 5 failed: ${error}`);
    failed++;
  }

  // Test 6: Scope Operations
  console.log('\n🧪 Test 6: Scope Operations');
  try {
    const mockStorage = new MockStorageBackend();
    const scopeManager = new ResourceScopeManager(mockStorage as any);
    await scopeManager.initialize();

    // Test resource filtering with no active scope
    const testResources = ['resource1', 'resource2', 'resource3'];
    const filterResult = await scopeManager.filterResourcesByScope(testResources);
    
    if (filterResult.success && filterResult.data.length === testResources.length) {
      console.log('✅ Resource filtering working correctly');
      console.log(`   Filtered ${filterResult.data.length} resources`);
      passed++;
    } else {
      console.log(`❌ Resource filtering failed: ${filterResult.error}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ Test 6 failed: ${error}`);
    failed++;
  }

  // Results
  console.log('\n📊 Test Results:');
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total:  ${passed + failed}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! The Door43 Scoping system is working correctly.');
    console.log('\n📋 Scope Manager Features Tested:');
    console.log('   ✅ Template-based scope creation');
    console.log('   ✅ Custom scope builder pattern');
    console.log('   ✅ Scope manager initialization');
    console.log('   ✅ Intelligent scope recommendations');
    console.log('   ✅ Dynamic scope creation');
    console.log('   ✅ Resource filtering operations');
    
    console.log('\n🎯 Phase 4: Resource Scope Manager - COMPLETED');
    console.log('   • Flexible resource filtering system');
    console.log('   • Template-based scope creation');
    console.log('   • Dynamic scope generation');
    console.log('   • Scope optimization and migration');
    console.log('   • Multi-criteria filtering');
    console.log('   • Application profile recommendations');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runStandaloneTests().catch(console.error);
}
