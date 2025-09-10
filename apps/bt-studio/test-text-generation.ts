#!/usr/bin/env ts-node

/**
 * Test text generation for quote matching
 */

import { QuoteMatcher } from './src/services/quote-matcher';

function testTextGeneration() {
  console.log('🔍 Testing Text Generation for Quote Matching\n');

  const quoteMatcher = new QuoteMatcher();

  // Mock verse data
  const verse = {
    reference: '3JN 1:1',
    number: 1,
    text: 'Γαΐῳ τῷ ἀγαπητῷ',
    wordTokens: [
      {
        uniqueId: '3JN 1:1:Γαΐῳ:1',
        content: 'Γαΐῳ',
        occurrence: 1,
        totalOccurrences: 1,
        verseRef: '3JN 1:1',
        position: { start: 0, end: 5, wordIndex: 0 },
        alignment: { strong: 'G1050', lemma: 'Γάϊος', sourceContent: 'Γαΐῳ', sourceOccurrence: 1 },
        isHighlightable: true,
        type: 'word' as const
      },
      {
        uniqueId: '3JN 1:1:τῷ:1',
        content: 'τῷ',
        occurrence: 1,
        totalOccurrences: 1,
        verseRef: '3JN 1:1',
        position: { start: 6, end: 8, wordIndex: 1 },
        alignment: { strong: 'G3588', lemma: 'ὁ', sourceContent: 'τῷ', sourceOccurrence: 1 },
        isHighlightable: true,
        type: 'word' as const
      },
      {
        uniqueId: '3JN 1:1:ἀγαπητῷ:1',
        content: 'ἀγαπητῷ',
        occurrence: 1,
        totalOccurrences: 1,
        verseRef: '3JN 1:1',
        position: { start: 9, end: 16, wordIndex: 2 },
        alignment: { strong: 'G0027', lemma: 'ἀγαπητός', sourceContent: 'ἀγαπητῷ', sourceOccurrence: 1 },
        isHighlightable: true,
        type: 'word' as const
      }
    ]
  } as any;

  // Test how the verse text is generated
  console.log('📋 Verse Text Generation:');
  console.log(`Original text: "${verse.text}"`);
  
  const verseText = verse.wordTokens
    .filter((token: any) => token.type === 'word')
    .map((token: any) => (quoteMatcher as any).normalizeText(token.content))
    .join(' ');
  
  console.log(`Generated text: "${verseText}"`);
  console.log('Individual tokens:');
  verse.wordTokens.forEach((token: any, i: number) => {
    const normalized = (quoteMatcher as any).normalizeText(token.content);
    console.log(`  ${i + 1}. "${token.content}" → "${normalized}"`);
  });
  console.log('');

  // Test quote normalization
  console.log('🔍 Quote Normalization:');
  const testQuotes = ['Γαΐῳ', 'ἀγαπητῷ', 'τῷ'];
  
  testQuotes.forEach(quote => {
    const normalized = (quoteMatcher as any).normalizeText(quote);
    console.log(`  "${quote}" → "${normalized}"`);
    
    // Check if it exists in the generated text
    const found = verseText.includes(normalized);
    console.log(`    Found in verse text: ${found ? '✅' : '❌'}`);
    
    if (found) {
      const index = verseText.indexOf(normalized);
      console.log(`    Position: ${index}`);
    }
  });
}

testTextGeneration();

