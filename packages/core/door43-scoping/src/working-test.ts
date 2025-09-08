#!/usr/bin/env tsx

/**
 * Working Extensible Resource Scoping Test
 * Tests the actual implementation with real functionality
 */

import { 
  ExtensibleScopeManager, 
  DynamicResourceType,
  TRANSLATION_GLOSSARY_TYPE,
  createTranslationWorkflowScope
} from './lib/extensible-resource-scoping.js';

// ============================================================================
// Example Future Resource Types
// ============================================================================

const TRANSLATION_MEMORY_TYPE: DynamicResourceType = {
  type: 'translation-memory',
  name: 'Translation Memory',
  description: 'Database of previous translation decisions and patterns',
  characteristics: {
    bookSpecific: false,
    verseSpecific: true,
    userGenerated: true,
    collaborative: true,
    sizeCategory: 'large',
    updateFrequency: 'frequent',
    useCasePriority: {
      reader: 'low',
      translator: 'critical',
      reviewer: 'high',
      server: 'high'
    }
  },
  relationships: [
    {
      type: 'aligned-to',
      targetTypes: ['bible-verse'],
      strength: 'critical',
      bidirectional: true
    },
    {
      type: 'supplements',
      targetTypes: ['translation-glossary', 'translation-note'],
      strength: 'strong',
      bidirectional: false
    }
  ],
  discovery: {
    discoveredAt: new Date(),
    discoveryMethod: 'api',
    version: '1.0.0',
    compatibility: ['bible-verse', 'translation-note']
  }
};

const CULTURAL_CONTEXT_TYPE: DynamicResourceType = {
  type: 'cultural-context',
  name: 'Cultural Context Notes',
  description: 'Explanations of cultural, historical, and geographical context',
  characteristics: {
    bookSpecific: true,
    verseSpecific: true,
    userGenerated: false,
    collaborative: false,
    sizeCategory: 'medium',
    updateFrequency: 'occasional',
    useCasePriority: {
      reader: 'normal',
      translator: 'high',
      reviewer: 'high',
      server: 'normal'
    }
  },
  relationships: [
    {
      type: 'references',
      targetTypes: ['translation-academy', 'bible-verse'],
      strength: 'strong',
      bidirectional: false
    },
    {
      type: 'supplements',
      targetTypes: ['translation-note'],
      strength: 'medium',
      bidirectional: false
    }
  ],
  discovery: {
    discoveredAt: new Date(),
    discoveryMethod: 'manifest',
    version: '1.0.0',
    compatibility: ['translation-note', 'translation-academy']
  }
};

const COMMUNITY_COMMENTS_TYPE: DynamicResourceType = {
  type: 'community-comments',
  name: 'Community Comments',
  description: 'Community discussions and comments on verses and translations',
  characteristics: {
    bookSpecific: true,
    verseSpecific: true,
    userGenerated: true,
    collaborative: true,
    sizeCategory: 'medium',
    updateFrequency: 'realtime',
    useCasePriority: {
      reader: 'normal',
      translator: 'normal',
      reviewer: 'critical',
      server: 'high'
    }
  },
  relationships: [
    {
      type: 'references',
      targetTypes: ['bible-verse', 'translation-note', 'cultural-context'],
      strength: 'medium',
      bidirectional: false
    }
  ],
  discovery: {
    discoveredAt: new Date(),
    discoveryMethod: 'inference',
    version: '1.0.0',
    compatibility: ['bible-verse', 'translation-note']
  }
};

// ============================================================================
// Test Functions
// ============================================================================

async function testBasicExtensibleManager(): Promise<boolean> {
  console.log('\n🧪 Testing Basic Extensible Manager...');
  
  try {
    const manager = new ExtensibleScopeManager();
    
    // Register some resource types
    manager.registerResourceType(TRANSLATION_GLOSSARY_TYPE);
    manager.registerResourceType(TRANSLATION_MEMORY_TYPE);
    manager.registerResourceType(CULTURAL_CONTEXT_TYPE);
    
    const registered = manager.getRegisteredResourceTypes();
    console.log(`✅ Successfully registered ${registered.length} resource types:`);
    
    for (const type of registered) {
      console.log(`   • ${type.name} (${type.type})`);
      console.log(`     - Size: ${type.characteristics.sizeCategory}`);
      console.log(`     - Update frequency: ${type.characteristics.updateFrequency}`);
      console.log(`     - Relationships: ${type.relationships.length}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testRelationshipGraph(): Promise<boolean> {
  console.log('\n🧪 Testing Relationship Graph...');
  
  try {
    const manager = new ExtensibleScopeManager();
    
    // Register types with relationships
    manager.registerResourceType(TRANSLATION_MEMORY_TYPE);
    manager.registerResourceType(CULTURAL_CONTEXT_TYPE);
    
    const graph = manager.getRelationshipGraph();
    
    console.log('🕸️ Relationship graph built:');
    for (const [sourceType, targetTypes] of graph) {
      console.log(`   ${sourceType} → [${Array.from(targetTypes).join(', ')}]`);
    }
    
    // Verify specific relationships exist
    const memoryConnections = graph.get('translation-memory');
    if (memoryConnections && memoryConnections.has('bible-verse')) {
      console.log('✅ Translation Memory correctly connected to Bible verses');
      return true;
    } else {
      console.log('❌ Relationship graph incomplete');
      return false;
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testScopeCreation(): Promise<boolean> {
  console.log('\n🧪 Testing Scope Creation...');
  
  try {
    const manager = new ExtensibleScopeManager();
    
    // Register Translation Glossary
    manager.registerResourceType(TRANSLATION_GLOSSARY_TYPE);
    
    // Create scope for Translation Glossary
    console.log('📝 Creating Translation Glossary scope...');
    const glossaryScope = manager.createResourceTypeScope('translation-glossary', {
      includeRelated: true,
      relationshipDepth: 2,
      useCase: 'translator'
    });
    
    console.log(`   Created: ${glossaryScope.name}`);
    console.log(`   ID: ${glossaryScope.id}`);
    console.log(`   Resource types: ${glossaryScope.resourceTypes.join(', ')}`);
    console.log(`   Priority: ${glossaryScope.priority.default}`);
    console.log(`   Filters: ${glossaryScope.filters?.length || 0}`);
    
    // Verify scope properties
    if (glossaryScope.name.includes('Translation Glossary') && 
        glossaryScope.priority.default === 'critical' &&
        glossaryScope.resourceTypes.includes('translation-glossary')) {
      console.log('✅ Translation Glossary scope created correctly');
      return true;
    } else {
      console.log('❌ Scope creation failed validation');
      return false;
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testTranslationWorkflowScope(): Promise<boolean> {
  console.log('\n🧪 Testing Translation Workflow Scope...');
  
  try {
    // Use the helper function
    const workflowScope = createTranslationWorkflowScope({
      languages: ['en', 'es'],
      organizations: ['unfoldingWord', 'Door43'],
      books: ['GEN', 'EXO', 'MAT']
    });
    
    console.log(`📚 Created workflow scope: ${workflowScope.name}`);
    console.log(`   Languages: ${workflowScope.languages.join(', ')}`);
    console.log(`   Organizations: ${workflowScope.organizations.map(o => o.organizationId).join(', ')}`);
    console.log(`   Books: ${workflowScope.books?.join(', ') || 'All'}`);
    console.log(`   Resource types: ${workflowScope.resourceTypes.join(', ')}`);
    console.log(`   Filters: ${workflowScope.filters?.length || 0}`);
    
    // Verify workflow scope properties
    if (workflowScope.name === 'Translation Glossary Workspace' &&
        workflowScope.languages.includes('en') &&
        workflowScope.languages.includes('es') &&
        workflowScope.resourceTypes.includes('translation-glossary')) {
      console.log('✅ Translation workflow scope created correctly');
      return true;
    } else {
      console.log('❌ Workflow scope creation failed validation');
      return false;
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testUseCaseAdaptation(): Promise<boolean> {
  console.log('\n🧪 Testing Use Case Adaptation...');
  
  try {
    const manager = new ExtensibleScopeManager();
    manager.registerResourceType(COMMUNITY_COMMENTS_TYPE);
    
    // Test different use cases
    const useCases: Array<'reader' | 'translator' | 'reviewer' | 'server'> = 
      ['reader', 'translator', 'reviewer', 'server'];
    
    console.log('🎯 Testing Community Comments scope for different use cases:');
    
    for (const useCase of useCases) {
      const scope = manager.createResourceTypeScope('community-comments', { useCase });
      console.log(`   ${useCase}: Priority = ${scope.priority.default}`);
    }
    
    // Verify reviewer gets critical priority (as defined in the type)
    const reviewerScope = manager.createResourceTypeScope('community-comments', { useCase: 'reviewer' });
    const readerScope = manager.createResourceTypeScope('community-comments', { useCase: 'reader' });
    
    if (reviewerScope.priority.default === 'critical' && readerScope.priority.default === 'normal') {
      console.log('✅ Use case adaptation working correctly');
      return true;
    } else {
      console.log('❌ Use case adaptation failed');
      console.log(`   Expected: reviewer=critical, reader=normal`);
      console.log(`   Got: reviewer=${reviewerScope.priority.default}, reader=${readerScope.priority.default}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testResourceDiscovery(): Promise<boolean> {
  console.log('\n🧪 Testing Resource Discovery...');
  
  try {
    const manager = new ExtensibleScopeManager();
    
    // Test discovery (mock implementation)
    console.log('🔍 Discovering resource types from repository...');
    const discovered = await manager.discoverResourceTypes('repository');
    
    console.log(`   Discovered ${discovered.length} resource types:`);
    for (const type of discovered) {
      console.log(`   • ${type.name} (${type.type})`);
      console.log(`     - Discovery method: ${type.discovery.discoveryMethod}`);
      console.log(`     - Version: ${type.discovery.version}`);
    }
    
    // Verify discovery worked
    if (discovered.length > 0 && discovered[0].type === 'translation-glossary') {
      console.log('✅ Resource discovery working correctly');
      return true;
    } else {
      console.log('❌ Resource discovery failed');
      return false;
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testFutureExtensibility(): Promise<boolean> {
  console.log('\n🧪 Testing Future Extensibility...');
  
  try {
    const manager = new ExtensibleScopeManager();
    
    // Create a completely hypothetical future resource type
    const FUTURE_TYPE: DynamicResourceType = {
      type: 'ai-translation-coach',
      name: 'AI Translation Coach',
      description: 'AI-powered translation coaching and suggestions',
      characteristics: {
        bookSpecific: true,
        verseSpecific: true,
        userGenerated: false,
        collaborative: false,
        sizeCategory: 'small',
        updateFrequency: 'frequent',
        useCasePriority: {
          reader: 'low',
          translator: 'high',
          reviewer: 'normal',
          server: 'normal'
        }
      },
      relationships: [
        {
          type: 'supplements',
          targetTypes: ['bible-verse', 'translation-note'],
          strength: 'strong',
          bidirectional: false
        }
      ],
      discovery: {
        discoveredAt: new Date(),
        discoveryMethod: 'user-defined',
        version: '1.0.0',
        compatibility: ['bible-verse', 'translation-note']
      }
    };
    
    // Register the future type
    console.log('🚀 Registering hypothetical future resource type...');
    manager.registerResourceType(FUTURE_TYPE);
    
    // Create scope for it
    const futureScope = manager.createResourceTypeScope('ai-translation-coach', {
      includeRelated: true,
      useCase: 'translator'
    });
    
    console.log(`   Successfully created scope for: ${futureScope.name}`);
    console.log(`   Priority: ${futureScope.priority.default}`);
    console.log(`   Resource types: ${futureScope.resourceTypes.join(', ')}`);
    
    if (futureScope.name.includes('AI Translation Coach') && 
        futureScope.priority.default === 'high') {
      console.log('✅ System can handle completely unknown future resource types!');
      return true;
    } else {
      console.log('❌ Future extensibility test failed');
      return false;
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runWorkingTests(): Promise<void> {
  console.log('🚀 Testing Working Extensible Resource Scoping System');
  console.log('====================================================');
  console.log('💡 This tests the actual implementation with real functionality');
  
  const tests = [
    { name: 'Basic Extensible Manager', fn: testBasicExtensibleManager },
    { name: 'Relationship Graph', fn: testRelationshipGraph },
    { name: 'Scope Creation', fn: testScopeCreation },
    { name: 'Translation Workflow Scope', fn: testTranslationWorkflowScope },
    { name: 'Use Case Adaptation', fn: testUseCaseAdaptation },
    { name: 'Resource Discovery', fn: testResourceDiscovery },
    { name: 'Future Extensibility', fn: testFutureExtensibility }
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
  
  console.log('\n📊 Working Test Results:');
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total:  ${tests.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All working tests passed!');
    console.log('\n🔮 Key Features Demonstrated:');
    console.log('   ✅ Dynamic resource type registration');
    console.log('   ✅ Relationship graph building and traversal');
    console.log('   ✅ Context-aware scope generation');
    console.log('   ✅ Use case priority adaptation');
    console.log('   ✅ Resource discovery simulation');
    console.log('   ✅ Future resource type handling');
    console.log('   ✅ Translation workflow integration');
    
    console.log('\n💡 This proves the system is:');
    console.log('   • Truly extensible for any resource type');
    console.log('   • Relationship-aware for intelligent filtering');
    console.log('   • Context-adaptive for different use cases');
    console.log('   • Ready for unknown future resources');
    console.log('   • Integrated with translation workflows');
    
    console.log('\n🎯 The extensible scoping system is working and ready!');
  } else {
    console.log('\n⚠️  Some working tests failed.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runWorkingTests().catch(console.error);
}
