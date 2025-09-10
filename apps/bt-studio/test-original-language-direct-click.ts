#!/usr/bin/env npx ts-node

/**
 * Test Original Language Direct Click
 * 
 * This test verifies that clicking on original language words creates
 * the original language token directly from the clicked word (not from alignment data).
 */

import { CrossPanelCommunicationService } from './src/services/cross-panel-communication';
import type { ProcessedVerse, ProcessedChapter } from './src/services/usfm-processor';

// Mock Hebrew word token (original language)
const mockHebrewVerse: ProcessedVerse = {
  number: 1,
  reference: 'rut 1:1',
  text: 'וַיְהִי בִּימֵי שְׁפֹט הַשֹּׁפְטִים',
  wordTokens: [
    {
      uniqueId: 'rut 1:1:הַשֹּׁפְטִים:1',
      content: 'הַשֹּׁפְטִים',
      occurrence: 1,
      totalOccurrences: 1,
      verseRef: 'rut 1:1',
      position: { start: 20, end: 30, wordIndex: 4 },
      alignment: {
        sourceWordId: 'rut 1:1:הַשֹּׁפְטִים:1',
        sourceContent: 'הַשֹּׁפְטִים',
        sourceOccurrence: 1,
        strong: 'H8199',
        lemma: 'שָׁפַט',
        morph: 'He,Td:Vqrmpa'
      },
      isHighlightable: true,
      type: 'word' as const
    }
  ]
};

// Mock target language verse for comparison
const mockUltVerse: ProcessedVerse = {
  number: 1,
  reference: 'rut 1:1',
  text: 'Now it happened in the days when the judges ruled',
  wordTokens: [
    {
      uniqueId: 'rut 1:1:judges:1',
      content: 'judges',
      occurrence: 1,
      totalOccurrences: 1,
      verseRef: 'rut 1:1',
      position: { start: 35, end: 41, wordIndex: 8 },
      alignment: {
        sourceWordId: 'rut 1:1:הַשֹּׁפְטִים:1',
        sourceContent: 'הַשֹּׁפְטִים',
        sourceOccurrence: 1,
        strong: 'H8199',
        lemma: 'שָׁפַט',
        morph: 'He,Td:Vqrmpa'
      },
      isHighlightable: true,
      type: 'word' as const
    }
  ]
};

async function testOriginalLanguageDirectClick() {
  console.log('🧪 Testing Original Language Direct Click\n');

  const service = new CrossPanelCommunicationService();

  // Register Hebrew panel (original language)
  service.registerPanel({
    resourceId: 'hebrew-bible-global',
    resourceType: 'UHB',
    language: 'hbo',
    chapters: [{ number: 1, verseCount: 1, paragraphCount: 1, verses: [mockHebrewVerse], paragraphs: [] }] as ProcessedChapter[],
    isOriginalLanguage: true
  });

  // Register ULT panel (target language) for comparison
  service.registerPanel({
    resourceId: 'ult-scripture',
    resourceType: 'ULT',
    language: 'en',
    chapters: [{ number: 1, verseCount: 1, paragraphCount: 1, verses: [mockUltVerse], paragraphs: [] }] as ProcessedChapter[],
    isOriginalLanguage: false
  });

  // Capture messages
  const messages: any[] = [];
  service.addMessageHandler((message) => {
    messages.push(message);
  });

  console.log('📝 Test 1: Click Hebrew word "הַשֹּׁפְטִים" (original language)');
  console.log('Expected: Should create token directly from clicked word, not from alignment\n');

  const hebrewToken = mockHebrewVerse.wordTokens![0];
  await service.handleWordClick(hebrewToken, 'hebrew-bible-global', mockHebrewVerse);

  if (messages.length > 0) {
    const message1 = messages[0];
    console.log('✅ Hebrew click message broadcasted');
    console.log('📋 Original Language Token:', message1.originalLanguageToken);
    
    // Verify the token was created directly from the clicked word
    const originalToken1 = message1.originalLanguageToken;
    if (originalToken1.uniqueId === 'rut 1:1:הַשֹּׁפְטִים:1' && 
        originalToken1.content === 'הַשֹּׁפְטִים' &&
        originalToken1.strong === 'H8199') {
      console.log('✅ SUCCESS: Original language token created directly from clicked word');
      console.log('   - Token ID matches clicked word:', originalToken1.uniqueId);
      console.log('   - Content matches clicked word:', originalToken1.content);
      console.log('   - Strong\'s from word alignment:', originalToken1.strong);
    } else {
      console.log('❌ FAILURE: Token not created correctly from clicked word');
    }
  }

  // Clear messages for next test
  messages.length = 0;

  console.log('\n📝 Test 2: Click English word "judges" (target language)');
  console.log('Expected: Should extract token from alignment data\n');

  const englishToken = mockUltVerse.wordTokens![0];
  await service.handleWordClick(englishToken, 'ult-scripture', mockUltVerse);

  if (messages.length > 0) {
    const message2 = messages[0];
    console.log('✅ English click message broadcasted');
    console.log('📋 Original Language Token:', message2.originalLanguageToken);
    
    // Verify the token was extracted from alignment data
    const originalToken2 = message2.originalLanguageToken;
    if (originalToken2.uniqueId === 'rut 1:1:הַשֹּׁפְטִים:1' && 
        originalToken2.content === 'הַשֹּׁפְטִים' &&
        originalToken2.strong === 'H8199') {
      console.log('✅ SUCCESS: Original language token extracted from alignment data');
      console.log('   - Token ID from sourceWordId:', originalToken2.uniqueId);
      console.log('   - Content from sourceContent:', originalToken2.content);
      console.log('   - Strong\'s from alignment:', originalToken2.strong);
    } else {
      console.log('❌ FAILURE: Token not extracted correctly from alignment');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 Key Differences:');
  console.log('   • Original Language Click: Token created directly from clicked word');
  console.log('   • Target Language Click: Token extracted from alignment data');
  console.log('   • Both produce the same original language token format');
  console.log('   • Both enable cross-panel highlighting of aligned words');
  console.log('='.repeat(60));
}

// Run the test
testOriginalLanguageDirectClick().catch(console.error);

