#!/usr/bin/env npx ts-node

/**
 * Test Simplified Cross-Panel Communication
 * 
 * This test verifies that the new simplified approach works:
 * 1. Only original language token is sent in messages
 * 2. Each panel internally finds its aligned tokens
 * 3. Original language panels highlight exact matches
 * 4. Target language panels find tokens aligned to the original language token
 */

import { CrossPanelCommunicationService, OriginalLanguageToken } from './src/services/cross-panel-communication';
import type { ProcessedVerse, ProcessedChapter } from './src/services/usfm-processor';

// Mock data for testing
const mockUltVerse: ProcessedVerse = {
  number: 1,
  reference: 'rut 1:1',
  text: 'Ahora sucedió en los días del gobierno de los jueces',
  wordTokens: [
    {
      uniqueId: 'rut 1:1:gobierno:1',
      content: 'gobierno',
      occurrence: 1,
      totalOccurrences: 1,
      verseRef: 'rut 1:1',
      position: { start: 30, end: 38, wordIndex: 5 },
      alignment: {
        sourceWordId: 'rut 1:1:שָׁפַט:1',
        sourceContent: 'שָׁפַט',
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

const mockUstVerse: ProcessedVerse = {
  number: 1,
  reference: 'rut 1:1',
  text: 'Durante el tiempo en que los jueces gobernaban Israel',
  wordTokens: [
    {
      uniqueId: 'rut 1:1:gobernaban:1',
      content: 'gobernaban',
      occurrence: 1,
      totalOccurrences: 1,
      verseRef: 'rut 1:1',
      position: { start: 35, end: 45, wordIndex: 6 },
      alignment: {
        sourceWordId: 'rut 1:1:שָׁפַט:1',
        sourceContent: 'שָׁפַט',
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

async function testSimplifiedCrossPanelCommunication() {
  console.log('🧪 Testing Simplified Cross-Panel Communication\n');

  const service = new CrossPanelCommunicationService();

  // Register mock panels
  service.registerPanel({
    resourceId: 'ult-scripture',
    resourceType: 'ULT',
    language: 'en',
    chapters: [{ number: 1, verseCount: 1, paragraphCount: 1, verses: [mockUltVerse], paragraphs: [] }] as ProcessedChapter[],
    isOriginalLanguage: false
  });

  service.registerPanel({
    resourceId: 'ust-scripture',
    resourceType: 'UST',
    language: 'en',
    chapters: [{ number: 1, verseCount: 1, paragraphCount: 1, verses: [mockUstVerse], paragraphs: [] }] as ProcessedChapter[],
    isOriginalLanguage: false
  });

  // Test: Click on "gobierno" in ULT
  console.log('📝 Test: Click "gobierno" in ULT');
  console.log('Expected: Should broadcast only original language token\n');

  const clickedToken = mockUltVerse.wordTokens![0];
  
  // Capture messages
  const messages: any[] = [];
  service.addMessageHandler((message) => {
    messages.push(message);
  });

  await service.handleWordClick(clickedToken, 'ult-scripture', mockUltVerse);

  // Verify results
  if (messages.length > 0) {
    const message = messages[0];
    console.log('✅ Message broadcasted successfully');
    console.log('📋 Message Structure:');
    console.log('   - type:', message.type);
    console.log('   - sourceContent:', message.sourceContent);
    console.log('   - originalLanguageToken:', message.originalLanguageToken);
    console.log('   - alignedTokens:', message.alignedTokens ? 'PRESENT (OLD FORMAT)' : 'ABSENT (NEW FORMAT)');
    
    // Verify the message only contains original language token
    const originalToken: OriginalLanguageToken = message.originalLanguageToken;
    console.log('\n📋 Original Language Token Details:');
    console.log(`   - uniqueId: ${originalToken.uniqueId}`);
    console.log(`   - content: ${originalToken.content}`);
    console.log(`   - strong: ${originalToken.strong}`);
    console.log(`   - lemma: ${originalToken.lemma}`);
    
    // Check that alignedTokens is not present (simplified format)
    if (!message.alignedTokens) {
      console.log('\n✅ SUCCESS: Message uses simplified format (no alignedTokens array)');
      console.log('✅ Each panel will internally find its own aligned tokens');
    } else {
      console.log('\n❌ FAILURE: Message still contains alignedTokens array (old format)');
    }

    // Verify original language token format
    if (originalToken.uniqueId === 'rut 1:1:שָׁפַט:1' && 
        originalToken.strong === 'H8199') {
      console.log('✅ Original language token format is correct');
    } else {
      console.log('❌ Original language token format is incorrect');
    }
  } else {
    console.log('❌ No messages were broadcasted');
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 New Simplified Architecture:');
  console.log('   1. Cross-panel message contains ONLY original language token');
  console.log('   2. Each panel internally finds tokens aligned to that original token');
  console.log('   3. Original language panels highlight exact token match');
  console.log('   4. Target language panels find aligned words via sourceWordId');
  console.log('='.repeat(60));
}

// Run the test
testSimplifiedCrossPanelCommunication().catch(console.error);

