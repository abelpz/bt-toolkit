#!/usr/bin/env npx ts-node

/**
 * Test Original Language Token System
 * 
 * This test verifies that we can create original language tokens from alignment data
 * and use them as the common reference for cross-panel communication.
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

async function testOriginalLanguageTokenSystem() {
  console.log('🧪 Testing Original Language Token System\n');

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

  service.registerPanel({
    resourceId: 'hebrew-bible-global',
    resourceType: 'UHB',
    language: 'hbo',
    chapters: [{ number: 1, verseCount: 1, paragraphCount: 1, verses: [mockHebrewVerse], paragraphs: [] }] as ProcessedChapter[],
    isOriginalLanguage: true
  });

  // Test 1: Click on "gobierno" in ULT
  console.log('📝 Test 1: Click "gobierno" in ULT');
  console.log('Expected: Should create original language token H8199 and find aligned words\n');

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
    console.log('📋 Original Language Token:', message.originalLanguageToken);
    console.log('📋 Aligned Tokens Found:', message.alignedTokens.length);
    
    // Check original language token
    const originalToken: OriginalLanguageToken = message.originalLanguageToken;
    console.log(`   - Original Token ID: ${originalToken.uniqueId}`);
    console.log(`   - Strong's: ${originalToken.strong}`);
    console.log(`   - Content: ${originalToken.content}`);
    console.log(`   - Lemma: ${originalToken.lemma}`);
    
    // Check aligned tokens
    console.log('\n📋 Aligned Tokens:');
    message.alignedTokens.forEach((token: any, index: number) => {
      console.log(`   ${index + 1}. ${token.content} (${token.resourceId}) - ${token.panelType}`);
    });

    // Verify expected tokens are found
    const ultTokens = message.alignedTokens.filter((t: any) => t.resourceId === 'ult-scripture');
    const ustTokens = message.alignedTokens.filter((t: any) => t.resourceId === 'ust-scripture');
    const originalTokens = message.alignedTokens.filter((t: any) => t.panelType === 'ORIGINAL_LANGUAGE');

    console.log(`\n✅ Found ${ultTokens.length} ULT tokens (expected: 1)`);
    console.log(`✅ Found ${ustTokens.length} UST tokens (expected: 1)`);
    console.log(`✅ Found ${originalTokens.length} original language tokens (expected: 1)`);

    if (originalToken.strong === 'H8199' && 
        ultTokens.length >= 1 && 
        ustTokens.length >= 1) {
      console.log('\n🎉 SUCCESS: Original language token system working correctly!');
    } else {
      console.log('\n❌ FAILURE: Expected results not found');
    }
  } else {
    console.log('❌ No messages were broadcasted');
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 Key Benefits of Original Language Token System:');
  console.log('   1. Common reference point for all aligned resources');
  console.log('   2. Enables bidirectional highlighting (Greek/Hebrew ↔ translations)');
  console.log('   3. Supports original language panel highlighting');
  console.log('   4. Unified token-based communication system');
  console.log('='.repeat(60));
}

// Run the test
testOriginalLanguageTokenSystem().catch(console.error);
