/**
 * Simple Test for Extensible Resource Scoping
 * Tests core functionality without external dependencies
 */

import { 
  ExtensibleScopeManager, 
  DynamicResourceType,
  TRANSLATION_GLOSSARY_TYPE
} from './lib/extensible-resource-scoping.js';

// ============================================================================
// Simple Test Resource Types
// ============================================================================

const SIMPLE_RESOURCE_TYPE: DynamicResourceType = {
  type: 'test-resource',
  name: 'Test Resource',
  description: 'A simple test resource for validation',
  characteristics: {
    bookSpecific: true,
    verseSpecific: false,
    userGenerated: true,
    collaborative: false,
    sizeCategory: 'small',
    updateFrequency: 'occasional',
    useCasePriority: {
      reader: 'normal',
      translator: 'high',
      reviewer: 'normal',
      server: 'low'
    }
  },
  relationships: [
    {
      type: 'references',
      targetTypes: ['bible-verse'],
      strength: 'medium',
      bidirectional: false
    }
  ],
  discovery: {
    discoveredAt: new Date(),
    discoveryMethod: 'user-defined',
    version: '1.0.0',
    compatibility: ['bible-verse']
  }
};

// ============================================================================
// Simple Tests
// ============================================================================

function testBasicFunctionality(): boolean {
  console.log('🧪 Testing Basic Functionality...');
  
  try {
    const manager = new ExtensibleScopeManager();
    
    // Register a resource type
    manager.registerResourceType(SIMPLE_RESOURCE_TYPE);
    
    // Get registered types
    const registered = manager.getRegisteredResourceTypes();
    
    if (registered.length === 1 && registered[0].type === 'test-resource') {
      console.log('✅ Basic resource registration works');
      return true;
    } else {
      console.log('❌ Basic resource registration failed');
      return false;
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

function testRelationshipGraph(): boolean {
  console.log('🧪 Testing Relationship Graph...');
  
  try {
    const manager = new ExtensibleScopeManager();
    manager.registerResourceType(SIMPLE_RESOURCE_TYPE);
    
    const graph = manager.getRelationshipGraph();
    
    if (graph.has('test-resource')) {
      const connections = graph.get('test-resource');
      if (connections && connections.has('bible-verse')) {
        console.log('✅ Relationship graph works');
        return true;
      }
    }
    
    console.log('❌ Relationship graph failed');
    return false;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

function testScopeCreation(): boolean {
  console.log('🧪 Testing Scope Creation...');
  
  try {
    const manager = new ExtensibleScopeManager();
    manager.registerResourceType(SIMPLE_RESOURCE_TYPE);
    
    const scope = manager.createResourceTypeScope('test-resource', {
      useCase: 'translator'
    });
    
    if (scope.name.includes('Test Resource') && 
        scope.priority.default === 'high' &&
        scope.resourceTypes.includes('test-resource')) {
      console.log('✅ Scope creation works');
      return true;
    } else {
      console.log('❌ Scope creation failed');
      return false;
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

function testTranslationGlossary(): boolean {
  console.log('🧪 Testing Translation Glossary...');
  
  try {
    const manager = new ExtensibleScopeManager();
    
    // The TRANSLATION_GLOSSARY_TYPE should be available
    if (TRANSLATION_GLOSSARY_TYPE.type === 'translation-glossary' &&
        TRANSLATION_GLOSSARY_TYPE.name === 'Translation Glossary') {
      console.log('✅ Translation Glossary type is defined correctly');
      
      // Register and test
      manager.registerResourceType(TRANSLATION_GLOSSARY_TYPE);
      const scope = manager.createResourceTypeScope('translation-glossary', {
        useCase: 'translator'
      });
      
      if (scope.priority.default === 'critical') {
        console.log('✅ Translation Glossary scope works');
        return true;
      }
    }
    
    console.log('❌ Translation Glossary test failed');
    return false;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

function runSimpleTests(): void {
  console.log('🚀 Running Simple Extensible Resource Scoping Tests');
  console.log('==================================================');
  
  const tests = [
    { name: 'Basic Functionality', fn: testBasicFunctionality },
    { name: 'Relationship Graph', fn: testRelationshipGraph },
    { name: 'Scope Creation', fn: testScopeCreation },
    { name: 'Translation Glossary', fn: testTranslationGlossary }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = test.fn();
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
  
  console.log('\n📊 Simple Test Results:');
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total:  ${tests.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All simple tests passed!');
    console.log('\n✨ Core extensible scoping functionality is working:');
    console.log('   • Dynamic resource type registration');
    console.log('   • Relationship graph building');
    console.log('   • Context-aware scope creation');
    console.log('   • Translation Glossary integration');
    console.log('\n🎯 The extensible scoping system is functional!');
  } else {
    console.log('\n⚠️  Some simple tests failed.');
    process.exit(1);
  }
}

// Run tests
runSimpleTests();
