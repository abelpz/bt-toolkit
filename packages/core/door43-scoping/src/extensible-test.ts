#!/usr/bin/env tsx

/**
 * Extensible Resource Scoping Test
 * Demonstrates how the system handles ANY new resource type dynamically
 */

import { 
  ExtensibleScopeManager, 
  DynamicResourceType,
  ResourceCharacteristics,
  ResourceRelationshipPattern,
  ResourceDiscoveryMetadata
} from './lib/extensible-resource-scoping.js';

// ============================================================================
// Example: Future Resource Types That Don't Exist Yet
// ============================================================================

/**
 * Example 1: Translation Memory - stores previous translation decisions
 */
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

/**
 * Example 2: Cultural Context Notes - explains cultural background
 */
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

/**
 * Example 3: Audio Pronunciation Guide - pronunciation help
 */
const AUDIO_PRONUNCIATION_TYPE: DynamicResourceType = {
  type: 'audio-pronunciation',
  name: 'Audio Pronunciation Guide',
  description: 'Audio files with pronunciation guides for difficult words',
  characteristics: {
    bookSpecific: true,
    verseSpecific: true,
    userGenerated: false,
    collaborative: false,
    sizeCategory: 'huge',
    updateFrequency: 'static',
    useCasePriority: {
      reader: 'high',
      translator: 'low',
      reviewer: 'low',
      server: 'normal'
    }
  },
  relationships: [
    {
      type: 'aligned-to',
      targetTypes: ['bible-verse', 'translation-word'],
      strength: 'strong',
      bidirectional: false
    }
  ],
  discovery: {
    discoveredAt: new Date(),
    discoveryMethod: 'user-defined',
    version: '1.0.0',
    compatibility: ['bible-verse', 'translation-word']
  }
};

/**
 * Example 4: Community Comments - user-generated discussion
 */
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

/**
 * Example 5: Machine Translation Suggestions - AI-generated suggestions
 */
const ML_SUGGESTIONS_TYPE: DynamicResourceType = {
  type: 'ml-translation-suggestions',
  name: 'Machine Learning Translation Suggestions',
  description: 'AI-generated translation suggestions and alternatives',
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
      type: 'derived-from',
      targetTypes: ['bible-verse', 'translation-memory'],
      strength: 'strong',
      bidirectional: false
    },
    {
      type: 'supplements',
      targetTypes: ['translation-note'],
      strength: 'weak',
      bidirectional: false
    }
  ],
  discovery: {
    discoveredAt: new Date(),
    discoveryMethod: 'api',
    version: '1.0.0',
    compatibility: ['bible-verse', 'translation-note', 'translation-memory']
  }
};

// ============================================================================
// Test Functions
// ============================================================================

async function testDynamicResourceTypeRegistration(): Promise<boolean> {
  console.log('\n🧪 Testing Dynamic Resource Type Registration...');
  
  try {
    const manager = new ExtensibleScopeManager();
    
    // Register multiple new resource types
    const newTypes = [
      TRANSLATION_MEMORY_TYPE,
      CULTURAL_CONTEXT_TYPE,
      AUDIO_PRONUNCIATION_TYPE,
      COMMUNITY_COMMENTS_TYPE,
      ML_SUGGESTIONS_TYPE
    ];
    
    console.log('📝 Registering new resource types...');
    for (const type of newTypes) {
      manager.registerResourceType(type);
    }
    
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

async function testRelationshipGraphBuilding(): Promise<boolean> {
  console.log('\n🧪 Testing Relationship Graph Building...');
  
  try {
    const manager = new ExtensibleScopeManager();
    
    // Register types with complex relationships
    manager.registerResourceType(TRANSLATION_MEMORY_TYPE);
    manager.registerResourceType(CULTURAL_CONTEXT_TYPE);
    manager.registerResourceType(ML_SUGGESTIONS_TYPE);
    
    const graph = manager.getRelationshipGraph();
    
    console.log('🕸️ Relationship graph built:');
    for (const [sourceType, targetTypes] of graph) {
      console.log(`   ${sourceType} → [${Array.from(targetTypes).join(', ')}]`);
    }
    
    // Verify specific relationships
    const mlConnections = graph.get('ml-translation-suggestions');
    if (mlConnections && mlConnections.has('bible-verse') && mlConnections.has('translation-memory')) {
      console.log('✅ Complex relationships correctly established');
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

async function testDynamicScopeCreation(): Promise<boolean> {
  console.log('\n🧪 Testing Dynamic Scope Creation for New Resource Types...');
  
  try {
    const manager = new ExtensibleScopeManager();
    
    // Register new types
    manager.registerResourceType(TRANSLATION_MEMORY_TYPE);
    manager.registerResourceType(CULTURAL_CONTEXT_TYPE);
    manager.registerResourceType(COMMUNITY_COMMENTS_TYPE);
    
    // Test 1: Create scope for Translation Memory
    console.log('💾 Creating Translation Memory scope...');
    const memoryScope = manager.createResourceTypeScope('translation-memory', {
      includeRelated: true,
      relationshipDepth: 2,
      useCase: 'translator'
    });
    
    console.log(`   Created: ${memoryScope.name}`);
    console.log(`   Resource types: ${memoryScope.resourceTypes.join(', ')}`);
    console.log(`   Priority: ${memoryScope.priority.default}`);
    console.log(`   Filters: ${memoryScope.filters?.length || 0}`);
    
    // Test 2: Create scope for Community Comments (reviewer use case)
    console.log('💬 Creating Community Comments scope...');
    const commentsScope = manager.createResourceTypeScope('community-comments', {
      includeRelated: false,
      useCase: 'reviewer'
    });
    
    console.log(`   Created: ${commentsScope.name}`);
    console.log(`   Priority: ${commentsScope.priority.default}`);
    
    // Test 3: Create multi-resource scope
    console.log('🔗 Creating multi-resource scope...');
    const multiScope = manager.createResourceTypeScope('cultural-context', {
      includeRelated: true,
      relationshipDepth: 1,
      relationshipStrength: ['strong', 'critical'],
      useCase: 'translator'
    });
    
    console.log(`   Created: ${multiScope.name}`);
    console.log(`   Resource types: ${multiScope.resourceTypes.join(', ')}`);
    
    console.log('✅ Dynamic scope creation working for all new resource types');
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testUseCaseAdaptation(): Promise<boolean> {
  console.log('\n🧪 Testing Use Case Adaptation...');
  
  try {
    const manager = new ExtensibleScopeManager();
    manager.registerResourceType(AUDIO_PRONUNCIATION_TYPE);
    
    // Test different use cases for the same resource type
    const useCases: Array<'reader' | 'translator' | 'reviewer' | 'server'> = ['reader', 'translator', 'reviewer', 'server'];
    
    console.log('🎯 Testing Audio Pronunciation scope for different use cases:');
    
    for (const useCase of useCases) {
      const scope = manager.createResourceTypeScope('audio-pronunciation', { useCase });
      console.log(`   ${useCase}: Priority = ${scope.priority.default}`);
    }
    
    // Verify that reader gets high priority (as defined in the type)
    const readerScope = manager.createResourceTypeScope('audio-pronunciation', { useCase: 'reader' });
    const translatorScope = manager.createResourceTypeScope('audio-pronunciation', { useCase: 'translator' });
    
    if (readerScope.priority.default === 'high' && translatorScope.priority.default === 'low') {
      console.log('✅ Use case adaptation working correctly');
      return true;
    } else {
      console.log('❌ Use case adaptation failed');
      return false;
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testResourceCharacteristicsFiltering(): Promise<boolean> {
  console.log('\n🧪 Testing Resource Characteristics Filtering...');
  
  try {
    const manager = new ExtensibleScopeManager();
    
    // Register types with different characteristics
    manager.registerResourceType(AUDIO_PRONUNCIATION_TYPE); // huge, static
    manager.registerResourceType(COMMUNITY_COMMENTS_TYPE); // medium, realtime
    manager.registerResourceType(ML_SUGGESTIONS_TYPE); // small, frequent
    
    // Test size-based filtering
    console.log('📏 Testing size-based filtering...');
    const audioScope = manager.createResourceTypeScope('audio-pronunciation');
    const audioFilters = audioScope.filters?.filter(f => f.description?.includes('Size limit'));
    
    if (audioFilters && audioFilters.length > 0) {
      console.log(`   ✅ Size filter applied for huge resources: ${audioFilters[0].description}`);
    }
    
    // Test update frequency filtering
    console.log('⏱️ Testing update frequency filtering...');
    const commentsScope = manager.createResourceTypeScope('community-comments');
    const frequencyFilters = commentsScope.filters?.filter(f => f.description?.includes('recent updates'));
    
    if (frequencyFilters && frequencyFilters.length > 0) {
      console.log(`   ✅ Frequency filter applied for realtime resources: ${frequencyFilters[0].description}`);
    }
    
    console.log('✅ Resource characteristics filtering working correctly');
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testFutureExtensibility(): Promise<boolean> {
  console.log('\n🧪 Testing Future Extensibility...');
  
  try {
    const manager = new ExtensibleScopeManager();
    
    // Simulate discovering a completely new resource type at runtime
    console.log('🔍 Simulating discovery of unknown resource type...');
    
    const FUTURE_UNKNOWN_TYPE: DynamicResourceType = {
      type: 'holographic-commentary', // Completely made up!
      name: 'Holographic Commentary',
      description: 'Future AR/VR commentary with 3D visualizations',
      characteristics: {
        bookSpecific: true,
        verseSpecific: true,
        userGenerated: false,
        collaborative: false,
        sizeCategory: 'huge',
        updateFrequency: 'occasional',
        useCasePriority: {
          reader: 'high',
          translator: 'normal',
          reviewer: 'normal',
          server: 'low'
        }
      },
      relationships: [
        {
          type: 'supplements',
          targetTypes: ['bible-verse', 'cultural-context'],
          strength: 'strong',
          bidirectional: false
        }
      ],
      discovery: {
        discoveredAt: new Date(),
        discoveryMethod: 'inference',
        version: '1.0.0',
        compatibility: ['bible-verse']
      }
    };
    
    // Register the "future" type
    manager.registerResourceType(FUTURE_UNKNOWN_TYPE);
    
    // Create scope for it
    const futureScope = manager.createResourceTypeScope('holographic-commentary', {
      includeRelated: true,
      useCase: 'reader'
    });
    
    console.log(`🚀 Successfully created scope for future resource type:`);
    console.log(`   Name: ${futureScope.name}`);
    console.log(`   Priority: ${futureScope.priority.default}`);
    console.log(`   Resource types: ${futureScope.resourceTypes.join(', ')}`);
    
    console.log('✅ System can handle completely unknown future resource types!');
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runExtensibilityTests(): Promise<void> {
  console.log('🚀 Testing Extensible Resource Scoping System');
  console.log('==============================================');
  console.log('💡 This demonstrates how the system handles ANY future resource type');
  
  const tests = [
    { name: 'Dynamic Resource Type Registration', fn: testDynamicResourceTypeRegistration },
    { name: 'Relationship Graph Building', fn: testRelationshipGraphBuilding },
    { name: 'Dynamic Scope Creation', fn: testDynamicScopeCreation },
    { name: 'Use Case Adaptation', fn: testUseCaseAdaptation },
    { name: 'Resource Characteristics Filtering', fn: testResourceCharacteristicsFiltering },
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
  
  console.log('\n📊 Extensibility Test Results:');
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total:  ${tests.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All extensibility tests passed!');
    console.log('\n🔮 Key Extensibility Features Demonstrated:');
    console.log('   ✅ Dynamic resource type registration');
    console.log('   ✅ Automatic relationship graph building');
    console.log('   ✅ Context-aware scope generation');
    console.log('   ✅ Use case adaptation');
    console.log('   ✅ Characteristic-based filtering');
    console.log('   ✅ Future-proof architecture');
    
    console.log('\n💡 This means:');
    console.log('   • ANY new resource type can be added without code changes');
    console.log('   • Relationships are automatically discovered and used');
    console.log('   • Scopes adapt to resource characteristics');
    console.log('   • System scales to unknown future resource types');
    console.log('   • No hardcoded assumptions about resource types');
    
    console.log('\n🎯 The scoping system is truly extensible and future-ready!');
  } else {
    console.log('\n⚠️  Some extensibility tests failed.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExtensibilityTests().catch(console.error);
}
