#!/usr/bin/env npx ts-node

/**
 * Test Original Language Word Click
 * 
 * This test simulates clicking on an original language word to verify
 * that the resourceId is properly passed and cross-panel communication works.
 */

import { CrossPanelCommunicationService } from './src/services/cross-panel-communication';
import type { ProcessedVerse, ProcessedChapter } from './src/services/usfm-processor';

// Mock Hebrew word token (like what would be clicked)
const mockHebrewVerse: ProcessedVerse = {
  number: 1,
  reference: 'rut 1:1',
  text: 'וַיְהִי בִּימֵי שְׁפֹט הַשֹּׁפְטִים',
  wordTokens: [
    {
      uniqueId: 'rut 1:1:שְׁפֹט:1',
      content: 'שְׁפֹט',
      occurrence: 1,
      totalOccurrences: 1,
      verseRef: 'rut 1:1',
      position: { start: 12, end: 16, wordIndex: 3 },
      alignment: {
        sourceWordId: 'rut 1:1:שְׁפֹט:1',
        sourceContent: 'שְׁפֹט',
        sourceOccurrence: 1,
        strong: 'H8199',
        lemma: 'שָׁפַט',
        morph: 'Vqc'
      },
      isHighlightable: true,
      type: 'word' as const
    }
  ]
};

async function testOriginalLanguageWordClick() {
  console.log('🧪 Testing Original Language Word Click\n');

  const service = new CrossPanelCommunicationService();

  // Register Hebrew panel with proper resourceId
  service.registerPanel({
    resourceId: 'hebrew-bible-global',
    resourceType: 'UHB',
    language: 'hbo',
    chapters: [{ number: 1, verseCount: 1, paragraphCount: 1, verses: [mockHebrewVerse], paragraphs: [] }] as ProcessedChapter[],
    isOriginalLanguage: true
  });

  // Test: Click on Hebrew word "שְׁפֹט"
  console.log('📝 Test: Click Hebrew word "שְׁפֹט"');
  console.log('Expected: Should create original language token and broadcast message\n');

  const clickedToken = mockHebrewVerse.wordTokens![0];
  
  // Capture messages
  const messages: any[] = [];
  service.addMessageHandler((message) => {
    messages.push(message);
  });

  // Simulate click with proper resourceId (this should now work)
  await service.handleWordClick(clickedToken, 'hebrew-bible-global', mockHebrewVerse);

  // Verify results
  if (messages.length > 0) {
    const message = messages[0];
    console.log('✅ Message broadcasted successfully');
    console.log('📋 Original Language Token:', message.originalLanguageToken);
    console.log('📋 Source Resource ID:', message.sourceResourceId);
    
    // Verify the original language token
    const originalToken = message.originalLanguageToken;
    if (originalToken.uniqueId === 'rut 1:1:שְׁפֹט:1' && 
        originalToken.strong === 'H8199' &&
        message.sourceResourceId === 'hebrew-bible-global') {
      console.log('\n✅ SUCCESS: Original language word click working correctly!');
      console.log('   - Original token ID:', originalToken.uniqueId);
      console.log('   - Strong\'s number:', originalToken.strong);
      console.log('   - Source resource:', message.sourceResourceId);
    } else {
      console.log('\n❌ FAILURE: Unexpected token or resource ID');
    }
  } else {
    console.log('❌ No messages were broadcasted - this indicates the resourceId is still undefined');
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 Fix Applied:');
  console.log('   • OriginalScriptureViewer now passes resourceId to USFMRenderer');
  console.log('   • Hebrew: resourceId = "hebrew-bible-global"');
  console.log('   • Greek: resourceId = "greek-nt-global"');
  console.log('   • Cross-panel communication should now work for original language clicks');
  console.log('='.repeat(60));
}

// Run the test
testOriginalLanguageWordClick().catch(console.error);

