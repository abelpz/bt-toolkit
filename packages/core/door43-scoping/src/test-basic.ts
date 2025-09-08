#!/usr/bin/env tsx

/**
 * Basic test for Door43 Scoping Library
 */

import { ScopeFactory } from './lib/scope-factory.js';

console.log('🧪 Testing basic scope creation...');

try {
  const scope = ScopeFactory.createFromTemplate('bible-reader', {
    languages: ['en'],
    organizations: ['unfoldingWord']
  });
  
  console.log(`✅ Created scope: ${scope.name} (${scope.id})`);
  console.log(`   Languages: ${scope.languages.join(', ')}`);
  console.log(`   Resource types: ${scope.resourceTypes.join(', ')}`);
  console.log('🎉 Basic test passed!');
} catch (error) {
  console.error('❌ Basic test failed:', error);
  process.exit(1);
}
