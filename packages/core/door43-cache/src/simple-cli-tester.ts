#!/usr/bin/env tsx

/**
 * Simple CLI Tester for Door43 Cache Library
 * Tests core functionality without external dependencies
 */

import { 
  ResourceRegistry, 
  ResourceId, 
  ResourceMetadata, 
  NormalizedResourceType 
} from './lib/resource-registry.js';

// ============================================================================
// Test Data
// ============================================================================

function createTestResourceMetadata(): ResourceMetadata {
  const resourceId: ResourceId = 'door43:unfoldingWord:en_ult:bible-verse:01-GEN.usfm:1:1';
  
  return {
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
}

// ============================================================================
// Test Functions
// ============================================================================

async function testResourceIdGeneration(): Promise<boolean> {
  console.log('\n🧪 Testing Resource ID Generation...');
  
  try {
    const registry = new ResourceRegistry();
    
    // Test basic ID generation
    const repository = {
      server: 'door43',
      owner: 'unfoldingWord',
      repoId: 'en_ult',
      ref: 'master'
    };
    
    const basicId = registry.generateResourceId(
      repository,
      'bible-verse',
      '01-GEN.usfm'
    );
    
    console.log(`📝 Basic ID: ${basicId}`);
    
    // Test ID with verse section
    const verseId = registry.generateResourceId(
      repository,
      'bible-verse',
      '01-GEN.usfm',
      { verse: { book: 'GEN', chapter: 1, verse: 1 } }
    );
    
    console.log(`📝 Verse ID: ${verseId}`);
    
    // Test ID parsing
    const parsed = registry.parseResourceId(verseId);
    console.log(`📝 Parsed ID:`, parsed);
    
    if (parsed.server !== 'door43' || parsed.owner !== 'unfoldingWord') {
      console.error('❌ ID parsing failed');
      return false;
    }
    
    console.log('✅ Resource ID generation working correctly');
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testResourceRegistration(): Promise<boolean> {
  console.log('\n🧪 Testing Resource Registration...');
  
  try {
    const registry = new ResourceRegistry();
    const metadata = createTestResourceMetadata();
    
    // Register resource
    console.log('📝 Registering resource...');
    const registerResult = await registry.registerResource(metadata);
    if (!registerResult.success) {
      console.error(`❌ Registration failed: ${registerResult.error}`);
      return false;
    }
    
    // Check if resource exists
    const hasResult = await registry.hasResource(metadata.id);
    if (!hasResult.success || !hasResult.data) {
      console.error(`❌ Resource not found after registration`);
      return false;
    }
    
    // Get resource metadata
    const getResult = await registry.getResourceMetadata(metadata.id);
    if (!getResult.success || !getResult.data) {
      console.error(`❌ Failed to get resource metadata: ${getResult.error}`);
      return false;
    }
    
    console.log(`📝 Retrieved resource: ${getResult.data.title}`);
    
    console.log('✅ Resource registration working correctly');
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testResourceListing(): Promise<boolean> {
  console.log('\n🧪 Testing Resource Listing...');
  
  try {
    const registry = new ResourceRegistry();
    
    // Register multiple resources
    const metadata1 = createTestResourceMetadata();
    const metadata2 = {
      ...createTestResourceMetadata(),
      id: 'door43:unfoldingWord:en_ult:bible-verse:01-GEN.usfm:1:2' as ResourceId,
      location: { ...metadata1.location, verse: 2 }
    };
    
    await registry.registerResource(metadata1);
    await registry.registerResource(metadata2);
    
    // List all resources
    console.log('📝 Listing all resources...');
    const listAllResult = await registry.listResources();
    if (!listAllResult.success) {
      console.error(`❌ Failed to list resources: ${listAllResult.error}`);
      return false;
    }
    
    console.log(`📊 Found ${listAllResult.data.length} total resources`);
    
    // List by type
    console.log('📝 Listing by type...');
    const listByTypeResult = await registry.listResources({ type: 'bible-verse' });
    if (!listByTypeResult.success) {
      console.error(`❌ Failed to list by type: ${listByTypeResult.error}`);
      return false;
    }
    
    console.log(`📊 Found ${listByTypeResult.data.length} Bible verses`);
    
    // List by location
    console.log('📝 Listing by location...');
    const listByLocationResult = await registry.listResources({ 
      location: { book: 'GEN', chapter: 1 } 
    });
    if (!listByLocationResult.success) {
      console.error(`❌ Failed to list by location: ${listByLocationResult.error}`);
      return false;
    }
    
    console.log(`📊 Found ${listByLocationResult.data.length} resources in Genesis 1`);
    
    console.log('✅ Resource listing working correctly');
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testStrongsAndLemmaSearch(): Promise<boolean> {
  console.log('\n🧪 Testing Strong\'s and Lemma Search...');
  
  try {
    const registry = new ResourceRegistry();
    const metadata = createTestResourceMetadata();
    
    // Register resource with Strong's numbers and lemmas
    await registry.registerResource(metadata);
    
    // Search by Strong's number
    console.log('🔍 Searching by Strong\'s number...');
    const strongsResult = await registry.findByStrongs('H430');
    if (!strongsResult.success) {
      console.error(`❌ Failed to search by Strong's: ${strongsResult.error}`);
      return false;
    }
    
    console.log(`📊 Found ${strongsResult.data.length} resources with H430`);
    
    // Search by lemma
    console.log('🔍 Searching by lemma...');
    const lemmaResult = await registry.findByLemma('אֱלֹהִים');
    if (!lemmaResult.success) {
      console.error(`❌ Failed to search by lemma: ${lemmaResult.error}`);
      return false;
    }
    
    console.log(`📊 Found ${lemmaResult.data.length} resources with אֱלֹהִים`);
    
    console.log('✅ Strong\'s and lemma search working correctly');
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testResourceStatistics(): Promise<boolean> {
  console.log('\n🧪 Testing Resource Statistics...');
  
  try {
    const registry = new ResourceRegistry();
    
    // Register multiple resources of different types
    const bibleMetadata = createTestResourceMetadata();
    const noteMetadata = {
      ...createTestResourceMetadata(),
      id: 'door43:unfoldingWord:en_tn:translation-note:01-GEN.tsv:1:1:note1' as ResourceId,
      type: 'translation-note' as NormalizedResourceType,
      title: 'Translation Note for Genesis 1:1'
    };
    
    await registry.registerResource(bibleMetadata);
    await registry.registerResource(noteMetadata);
    
    // Get statistics
    console.log('📊 Getting registry statistics...');
    const statsResult = await registry.getStatistics();
    if (!statsResult.success) {
      console.error(`❌ Failed to get statistics: ${statsResult.error}`);
      return false;
    }
    
    const stats = statsResult.data;
    console.log('📈 Registry Statistics:');
    console.log(`   Total Resources: ${stats.totalResources}`);
    console.log(`   Resources by Type:`, stats.resourcesByType);
    console.log(`   Resources by Repository:`, stats.resourcesByRepository);
    console.log(`   Average References per Resource: ${stats.averageReferencesPerResource}`);
    
    if (stats.totalResources !== 2) {
      console.error(`❌ Expected 2 resources, got ${stats.totalResources}`);
      return false;
    }
    
    console.log('✅ Resource statistics working correctly');
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testResourceUpdates(): Promise<boolean> {
  console.log('\n🧪 Testing Resource Updates...');
  
  try {
    const registry = new ResourceRegistry();
    const metadata = createTestResourceMetadata();
    
    // Register resource
    await registry.registerResource(metadata);
    
    // Update resource
    console.log('📝 Updating resource...');
    const updates = {
      title: 'Updated Genesis 1:1',
      description: 'Updated description'
    };
    
    const updateResult = await registry.updateResourceMetadata(metadata.id, updates);
    if (!updateResult.success) {
      console.error(`❌ Failed to update resource: ${updateResult.error}`);
      return false;
    }
    
    // Verify update
    const getResult = await registry.getResourceMetadata(metadata.id);
    if (!getResult.success || !getResult.data) {
      console.error(`❌ Failed to get updated resource`);
      return false;
    }
    
    if (getResult.data.title !== updates.title) {
      console.error(`❌ Title not updated correctly`);
      return false;
    }
    
    console.log(`📝 Resource updated: ${getResult.data.title}`);
    
    console.log('✅ Resource updates working correctly');
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
  console.log('🚀 Starting Door43 Cache Library Simple Tests');
  console.log('=============================================');
  
  const tests = [
    { name: 'Resource ID Generation', fn: testResourceIdGeneration },
    { name: 'Resource Registration', fn: testResourceRegistration },
    { name: 'Resource Listing', fn: testResourceListing },
    { name: 'Strong\'s and Lemma Search', fn: testStrongsAndLemmaSearch },
    { name: 'Resource Statistics', fn: testResourceStatistics },
    { name: 'Resource Updates', fn: testResourceUpdates }
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
    console.log('\n🎉 All tests passed! The Door43 Cache core components are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}
