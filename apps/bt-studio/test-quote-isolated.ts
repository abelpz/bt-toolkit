#!/usr/bin/env ts-node

/**
 * Isolated test for single quote matching
 */

import { QuoteMatcher } from './src/services/quote-matcher';

function testQuoteIsolated() {
  console.log('🔍 Isolated Quote Test\n');

  const quoteMatcher = new QuoteMatcher();

  // Very simple mock data
  const mockChapters = [{
    number: 1,
    verses: [
      {
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
      } as any
    ]
  }] as any[];

  // Test 1: Just "Γαΐῳ"
  console.log('🧪 Test 1: Single word "Γαΐῳ"');
  const result1 = quoteMatcher.findOriginalTokens(
    mockChapters,
    'Γαΐῳ',
    1,
    { book: '3JN', startChapter: 1, startVerse: 1 }
  );
  
  console.log(`Result: ${result1.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (result1.success) {
    console.log(`  Tokens: ${result1.totalTokens.map(t => `"${t.content}"`).join(', ')}`);
  } else {
    console.log(`  Error: ${result1.error}`);
  }
  console.log('');

  // Test 2: Just "ἀγαπητῷ"
  console.log('🧪 Test 2: Single word "ἀγαπητῷ"');
  const result2 = quoteMatcher.findOriginalTokens(
    mockChapters,
    'ἀγαπητῷ',
    1,
    { book: '3JN', startChapter: 1, startVerse: 1 }
  );
  
  console.log(`Result: ${result2.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (result2.success) {
    console.log(`  Tokens: ${result2.totalTokens.map(t => `"${t.content}"`).join(', ')}`);
  } else {
    console.log(`  Error: ${result2.error}`);
  }
  console.log('');

  // Test 3: Multiple words "Γαΐῳ & ἀγαπητῷ"
  console.log('🧪 Test 3: Multiple words "Γαΐῳ & ἀγαπητῷ"');
  const result3 = quoteMatcher.findOriginalTokens(
    mockChapters,
    'Γαΐῳ & ἀγαπητῷ',
    1,
    { book: '3JN', startChapter: 1, startVerse: 1 }
  );
  
  console.log(`Result: ${result3.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (result3.success) {
    console.log(`  Matches: ${result3.matches.length}`);
    result3.matches.forEach((match, i) => {
      console.log(`    ${i + 1}. "${match.quote}" → ${match.tokens.map(t => `"${t.content}"`).join(', ')}`);
    });
  } else {
    console.log(`  Error: ${result3.error}`);
  }
}

testQuoteIsolated();

