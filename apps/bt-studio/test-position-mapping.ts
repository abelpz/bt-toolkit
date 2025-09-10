#!/usr/bin/env ts-node

/**
 * Test position mapping in token extraction
 */

import { QuoteMatcher } from './src/services/quote-matcher';

function testPositionMapping() {
  console.log('🔍 Testing Position Mapping in Token Extraction\n');

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

  // Generate the searchable text
  const verseText = verse.wordTokens
    .filter((token: any) => token.type === 'word')
    .map((token: any) => (quoteMatcher as any).normalizeText(token.content))
    .join(' ');
  
  console.log(`Generated verse text: "${verseText}"`);
  console.log('Character positions:');
  for (let i = 0; i < verseText.length; i++) {
    console.log(`  ${i}: "${verseText[i]}"`);
  }
  console.log('');

  // Test finding "ἀγαπητῷ"
  const quote = 'ἀγαπητῷ';
  const normalizedQuote = (quoteMatcher as any).normalizeText(quote);
  console.log(`Looking for: "${quote}" → "${normalizedQuote}"`);
  
  const index = verseText.indexOf(normalizedQuote);
  console.log(`Found at position: ${index}`);
  
  if (index !== -1) {
    const startPos = index;
    const endPos = index + normalizedQuote.length;
    console.log(`Match range: ${startPos}-${endPos}`);
    console.log(`Matched text: "${verseText.slice(startPos, endPos)}"`);
    console.log('');

    // Now test the extractTokensForMatch method
    console.log('🔍 Testing extractTokensForMatch:');
    const extractedTokens = (quoteMatcher as any).extractTokensForMatch(verse, startPos, endPos);
    console.log(`Extracted ${extractedTokens.length} tokens:`);
    extractedTokens.forEach((token: any, i: number) => {
      console.log(`  ${i + 1}. "${token.content}"`);
    });
    
    // Let's manually trace through the extraction logic
    console.log('\n🔍 Manual trace of extraction logic:');
    const wordTokens = verse.wordTokens.filter((token: any) => token.type === 'word');
    let currentPos = 0;
    
    wordTokens.forEach((token: any, i: number) => {
      const tokenText = (quoteMatcher as any).normalizeText(token.content);
      const tokenStart = currentPos;
      const tokenEnd = currentPos + tokenText.length;
      
      console.log(`  Token ${i + 1}: "${token.content}" → "${tokenText}"`);
      console.log(`    Position in generated text: ${tokenStart}-${tokenEnd}`);
      console.log(`    Match range: ${startPos}-${endPos}`);
      console.log(`    Overlaps: ${tokenEnd > startPos && tokenStart < endPos ? '✅' : '❌'}`);
      
      currentPos = tokenEnd + 1; // +1 for space
      console.log(`    Next position: ${currentPos}`);
      console.log('');
    });
  }
}

testPositionMapping();

