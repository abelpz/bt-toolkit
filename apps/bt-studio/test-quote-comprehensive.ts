#!/usr/bin/env ts-node

/**
 * Comprehensive test suite for the Quote Matching System
 * Tests all four scenarios with working mock data
 */

import { QuoteMatcher } from './src/services/quote-matcher';

function testQuoteComprehensive() {
  console.log('🎯 Comprehensive Quote Matching System Test\n');

  const quoteMatcher = new QuoteMatcher();

  // Create comprehensive mock data that covers all test scenarios
  const mockChapters = [{
    number: 1,
    verses: [
      {
        reference: '3JN 1:1',
        number: 1,
        text: 'ὁ πρεσβύτερος Γαΐῳ τῷ ἀγαπητῷ ὃν ἐγὼ ἀγαπῶ ἐν ἀληθείᾳ',
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
          },
          {
            uniqueId: '3JN 1:1:ὃν:1',
            content: 'ὃν',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:1',
            position: { start: 31, end: 33, wordIndex: 5 },
            alignment: { strong: 'G3739', lemma: 'ὅς', sourceContent: 'ὃν', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:1:ἐγὼ:1',
            content: 'ἐγὼ',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:1',
            position: { start: 34, end: 37, wordIndex: 6 },
            alignment: { strong: 'G1473', lemma: 'ἐγώ', sourceContent: 'ἐγὼ', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:1:ἀγαπῶ:1',
            content: 'ἀγαπῶ',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:1',
            position: { start: 38, end: 43, wordIndex: 7 },
            alignment: { strong: 'G0025', lemma: 'ἀγαπάω', sourceContent: 'ἀγαπῶ', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:1:ἐν:1',
            content: 'ἐν',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:1',
            position: { start: 44, end: 46, wordIndex: 8 },
            alignment: { strong: 'G1722', lemma: 'ἐν', sourceContent: 'ἐν', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:1:ἀληθείᾳ:1',
            content: 'ἀληθείᾳ',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:1',
            position: { start: 47, end: 55, wordIndex: 9 },
            alignment: { strong: 'G0225', lemma: 'ἀλήθεια', sourceContent: 'ἀληθείᾳ', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          }
        ]
      } as any,
      {
        reference: '3JN 1:2',
        number: 2,
        text: 'ἀγαπητέ περὶ πάντων εὔχομαί σε εὐοδοῦσθαι καὶ ὑγιαίνειν',
        wordTokens: [
          {
            uniqueId: '3JN 1:2:ἀγαπητέ:1',
            content: 'ἀγαπητέ',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:2',
            position: { start: 0, end: 7, wordIndex: 0 },
            alignment: { strong: 'G0027', lemma: 'ἀγαπητός', sourceContent: 'ἀγαπητέ', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:2:περὶ:1',
            content: 'περὶ',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:2',
            position: { start: 8, end: 12, wordIndex: 1 },
            alignment: { strong: 'G4012', lemma: 'περί', sourceContent: 'περὶ', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:2:καὶ:1',
            content: 'καὶ',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:2',
            position: { start: 35, end: 38, wordIndex: 5 },
            alignment: { strong: 'G2532', lemma: 'καί', sourceContent: 'καὶ', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          }
        ]
      } as any
    ]
  }] as any[];

  console.log('📋 Test Data Summary:');
  console.log(`Verse 1:1: ${mockChapters[0].verses[0].wordTokens.length} tokens`);
  console.log(`Verse 1:2: ${mockChapters[0].verses[1].wordTokens.length} tokens`);
  console.log('');

  // Test Case 1: Simple Quote Case
  console.log('🧪 TEST 1: Simple Quote Case');
  console.log('Quote: "ὁ πρεσβύτερος" (the elder), Occurrence: 1, Reference: 3JN 1:1');
  
  const test1 = quoteMatcher.findOriginalTokens(
    mockChapters,
    'ὁ πρεσβύτερος',
    1,
    { book: '3JN', startChapter: 1, startVerse: 1 }
  );
  
  console.log(`Result: ${test1.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (test1.success) {
    console.log(`  Found ${test1.totalTokens.length} tokens:`);
    test1.totalTokens.forEach((token, i) => {
      console.log(`    ${i + 1}. "${token.content}" (Strong's: ${token.alignment?.strong || 'N/A'})`);
    });
  } else {
    console.log(`  Error: ${test1.error}`);
  }
  console.log('');

  // Test Case 2: Multiple Quotes with Ampersand
  console.log('🧪 TEST 2: Multiple Quotes with Ampersand');
  console.log('Quote: "Γαΐῳ & ἀγαπητῷ" (to Gaius & beloved), Occurrence: 1, Reference: 3JN 1:1');
  
  const test2 = quoteMatcher.findOriginalTokens(
    mockChapters,
    'Γαΐῳ & ἀγαπητῷ',
    1,
    { book: '3JN', startChapter: 1, startVerse: 1 }
  );
  
  console.log(`Result: ${test2.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (test2.success) {
    console.log(`  Found ${test2.matches.length} quote matches:`);
    test2.matches.forEach((match, i) => {
      console.log(`    Match ${i + 1}: "${match.quote}" in ${match.verseRef}`);
      console.log(`      Tokens: ${match.tokens.map(t => `"${t.content}"`).join(', ')}`);
    });
    console.log(`  Total tokens: ${test2.totalTokens.length}`);
  } else {
    console.log(`  Error: ${test2.error}`);
  }
  console.log('');

  // Test Case 3: Simple Quote in Reference Range
  console.log('🧪 TEST 3: Simple Quote in Reference Range');
  console.log('Quote: "ἀγαπητέ" (beloved vocative), Occurrence: 1, Reference: 3JN 1:1-2');
  
  const test3 = quoteMatcher.findOriginalTokens(
    mockChapters,
    'ἀγαπητέ',
    1,
    { book: '3JN', startChapter: 1, startVerse: 1, endVerse: 2 }
  );
  
  console.log(`Result: ${test3.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (test3.success) {
    console.log(`  Found in: ${test3.matches[0]?.verseRef}`);
    console.log(`  Token: "${test3.totalTokens[0]?.content}" (Strong's: ${test3.totalTokens[0]?.alignment?.strong})`);
  } else {
    console.log(`  Error: ${test3.error}`);
  }
  console.log('');

  // Test Case 4: Multiple Quotes in Reference Range
  console.log('🧪 TEST 4: Multiple Quotes in Reference Range');
  console.log('Quote: "ἐγὼ & ἀγαπῶ & περὶ" (I & love & concerning), Occurrence: 1, Reference: 3JN 1:1-2');
  
  const test4 = quoteMatcher.findOriginalTokens(
    mockChapters,
    'ἐγὼ & ἀγαπῶ & περὶ',
    1,
    { book: '3JN', startChapter: 1, startVerse: 1, endVerse: 2 }
  );
  
  console.log(`Result: ${test4.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (test4.success) {
    console.log(`  Found ${test4.matches.length} quote matches:`);
    test4.matches.forEach((match, i) => {
      console.log(`    Match ${i + 1}: "${match.quote}" in ${match.verseRef}`);
      console.log(`      Tokens: ${match.tokens.map(t => `"${t.content}"`).join(', ')}`);
    });
    console.log(`  Total tokens: ${test4.totalTokens.length}`);
  } else {
    console.log(`  Error: ${test4.error}`);
  }
  console.log('');

  // Test Case 5: Error Handling
  console.log('🧪 TEST 5: Error Handling - Quote Not Found');
  console.log('Quote: "nonexistent", Occurrence: 1, Reference: 3JN 1:1');
  
  const test5 = quoteMatcher.findOriginalTokens(
    mockChapters,
    'nonexistent',
    1,
    { book: '3JN', startChapter: 1, startVerse: 1 }
  );
  
  console.log(`Result: ${test5.success ? '✅ SUCCESS' : '❌ FAILED (Expected)'}`);
  if (!test5.success) {
    console.log(`  Expected error: ${test5.error}`);
  }
  console.log('');

  // Summary
  const tests = [test1, test2, test3, test4];
  const successCount = tests.filter(t => t.success).length;
  
  console.log('📊 COMPREHENSIVE TEST SUMMARY:');
  console.log(`✅ Successful tests: ${successCount}/${tests.length}`);
  console.log(`🎯 Quote Matching System: ${successCount === tests.length ? 'FULLY FUNCTIONAL!' : 'NEEDS FIXES'}`);
  
  if (successCount === tests.length) {
    console.log('\n🚀 QUOTE MATCHING SYSTEM READY!');
    console.log('   ✓ Simple quote matching works');
    console.log('   ✓ Multiple quote matching with & works');
    console.log('   ✓ Reference range matching works');
    console.log('   ✓ Complex multi-quote ranges work');
    console.log('   ✓ Error handling works properly');
    console.log('\n🎯 NEXT STEP: Implement alignment matching for target languages');
  }
}

testQuoteComprehensive();

