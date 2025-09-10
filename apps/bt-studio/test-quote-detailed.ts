#!/usr/bin/env ts-node

/**
 * Detailed test for debugging quote matching issues
 */

import { QuoteMatcher } from './src/services/quote-matcher';

function testQuoteDetailed() {
  console.log('🔍 Detailed Quote Matching Test\n');

  const quoteMatcher = new QuoteMatcher();

  // Create simple mock data for debugging
  const mockChapters = [{
    number: 1,
    verses: [
      {
        reference: '3JN 1:1',
        number: 1,
        text: 'ὁ πρεσβύτερος Γαΐῳ τῷ ἀγαπητῷ',
        wordTokens: [
          {
            uniqueId: '3JN 1:1:ὁ:1',
            content: 'ὁ',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:1',
            position: { start: 0, end: 1, wordIndex: 0 },
            alignment: { strong: 'G3588', lemma: 'ὁ', sourceContent: 'ὁ', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:1:πρεσβύτερος:1',
            content: 'πρεσβύτερος',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:1',
            position: { start: 2, end: 13, wordIndex: 1 },
            alignment: { strong: 'G4245', lemma: 'πρεσβύτερος', sourceContent: 'πρεσβύτερος', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:1:Γαΐῳ:1',
            content: 'Γαΐῳ',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:1',
            position: { start: 14, end: 19, wordIndex: 2 },
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
            position: { start: 20, end: 22, wordIndex: 3 },
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
            position: { start: 23, end: 30, wordIndex: 4 },
            alignment: { strong: 'G0027', lemma: 'ἀγαπητός', sourceContent: 'ἀγαπητῷ', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          }
        ]
      } as any
    ]
  }] as any[];

  // Test what the verse text looks like when processed
  const verse = mockChapters[0].verses[0];
  const verseText = verse.wordTokens
    .filter((token: any) => token.type === 'word')
    .map((token: any) => (quoteMatcher as any).normalizeText(token.content))
    .join(' ');
  
  console.log('📋 Verse Analysis:');
  console.log(`  Original text: "${verse.text}"`);
  console.log(`  Processed text: "${verseText}"`);
  console.log(`  Tokens: ${verse.wordTokens.map((t: any) => `"${t.content}"`).join(', ')}`);
  console.log('');

  // Test individual quotes
  console.log('🧪 Individual Quote Tests:');
  
  const testQuotes = ['Γαΐῳ', 'ἀγαπητῷ'];
  
  testQuotes.forEach(quote => {
    console.log(`\nTesting quote: "${quote}"`);
    const normalizedQuote = (quoteMatcher as any).normalizeText(quote);
    console.log(`  Normalized: "${normalizedQuote}"`);
    
    const result = quoteMatcher.findOriginalTokens(
      mockChapters,
      quote,
      1,
      { book: '3JN', startChapter: 1, startVerse: 1 }
    );
    
    console.log(`  Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (result.success) {
      console.log(`    Tokens: ${result.totalTokens.map(t => `"${t.content}"`).join(', ')}`);
    } else {
      console.log(`    Error: ${result.error}`);
    }
  });

  // Test multiple quotes
  console.log('\n🧪 Multiple Quote Test:');
  console.log('Testing: "Γαΐῳ & ἀγαπητῷ"');
  
  const multiResult = quoteMatcher.findOriginalTokens(
    mockChapters,
    'Γαΐῳ & ἀγαπητῷ',
    1,
    { book: '3JN', startChapter: 1, startVerse: 1 }
  );
  
  console.log(`Result: ${multiResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (multiResult.success) {
    console.log(`  Found ${multiResult.matches.length} matches:`);
    multiResult.matches.forEach((match, i) => {
      console.log(`    ${i + 1}. "${match.quote}" → ${match.tokens.map(t => `"${t.content}"`).join(', ')}`);
    });
  } else {
    console.log(`  Error: ${multiResult.error}`);
  }
}

testQuoteDetailed();

