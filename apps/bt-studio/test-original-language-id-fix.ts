#!/usr/bin/env npx ts-node

/**
 * Test Original Language Token ID Fix
 * 
 * This test verifies that original language tokens use content-based IDs
 * that match the format used by original language panels.
 */

import { CrossPanelCommunicationService } from './src/services/cross-panel-communication';

async function testOriginalLanguageIdFix() {
  console.log('🧪 Testing Original Language Token ID Fix\n');

  const service = new CrossPanelCommunicationService();

  // Test the createOriginalLanguageToken method directly
  const mockAlignment = {
    sourceWordId: 'rut 1:5:מוּת:1',
    sourceContent: 'מוּת',
    sourceOccurrence: 1,
    strong: 'c:H4191',
    lemma: 'מוּת',
    morph: 'He,C:Vqw3mp'
  };

  // Access the private method for testing (TypeScript hack)
  const createToken = (service as any).createOriginalLanguageToken;
  const originalToken = createToken.call(service, mockAlignment, 'rut 1:5');

  console.log('📋 Test Results:');
  console.log('Input sourceWordId:', mockAlignment.sourceWordId);
  console.log('Input Strong\'s:', mockAlignment.strong);
  console.log('');
  console.log('Generated Original Language Token:');
  console.log('  uniqueId:', originalToken?.uniqueId);
  console.log('  content:', originalToken?.content);
  console.log('  strong:', originalToken?.strong);
  console.log('');

  // Verify the format matches original language panel tokens
  const expectedFormat = 'rut 1:5:מוּת:1';
  const actualFormat = originalToken?.uniqueId;

  if (actualFormat === expectedFormat) {
    console.log('✅ SUCCESS: Original language token ID format is correct!');
    console.log(`   Expected: ${expectedFormat}`);
    console.log(`   Actual:   ${actualFormat}`);
  } else {
    console.log('❌ FAILURE: Original language token ID format is incorrect!');
    console.log(`   Expected: ${expectedFormat}`);
    console.log(`   Actual:   ${actualFormat}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 This format should now match original language panel tokens like:');
  console.log('   rut 1:4:הָֽאַחַת֙:1');
  console.log('   rut 1:5:מוּת:1');
  console.log('='.repeat(60));
}

// Run the test
testOriginalLanguageIdFix().catch(console.error);

