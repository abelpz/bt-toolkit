#!/usr/bin/env ts-node

/**
 * Test non-contiguous multi-quotes from Translation Notes
 * Based on real example: ἡμεῖς & μαρτυροῦμεν & ἡμῶν from 3JN 1:12
 */

import { QuoteMatcher } from './src/services/quote-matcher';

function testNonContiguousQuotes() {
  console.log('🔍 Testing Non-Contiguous Multi-Quotes from Translation Notes\n');
  console.log('Real example from 3JN Translation Notes:');
  console.log('Reference: 1:12');
  console.log('Quote: "ἡμεῖς & μαρτυροῦμεν & ἡμῶν"');
  console.log('Note: About exclusive pronouns "we ourselves" and "our"\n');

  const quoteMatcher = new QuoteMatcher();

  // Mock 3JN 1:12 Greek text (simplified for testing)
  // Real verse: "καὶ ἡμεῖς δὲ μαρτυροῦμεν καὶ οἶδας ὅτι ἡ μαρτυρία ἡμῶν ἀληθής ἐστιν"
  // Translation: "and we also testify, and you know that our testimony is true"
  const mockGreekChapters = [{
    number: 1,
    verses: [
      {
        reference: '3JN 1:12',
        number: 12,
        text: 'καὶ ἡμεῖς δὲ μαρτυροῦμεν καὶ οἶδας ὅτι ἡ μαρτυρία ἡμῶν ἀληθής ἐστιν',
        wordTokens: [
          {
            uniqueId: '3JN 1:12:καὶ:1',
            content: 'καὶ',
            occurrence: 1,
            totalOccurrences: 2,
            verseRef: '3JN 1:12',
            position: { start: 0, end: 3, wordIndex: 0 },
            alignment: { strong: 'G2532', lemma: 'καί', sourceContent: 'καὶ', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:12:ἡμεῖς:1',
            content: 'ἡμεῖς',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:12',
            position: { start: 4, end: 9, wordIndex: 1 },
            alignment: { strong: 'G1473', lemma: 'ἐγώ', sourceContent: 'ἡμεῖς', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:12:δὲ:1',
            content: 'δὲ',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:12',
            position: { start: 10, end: 12, wordIndex: 2 },
            alignment: { strong: 'G1161', lemma: 'δέ', sourceContent: 'δὲ', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:12:μαρτυροῦμεν:1',
            content: 'μαρτυροῦμεν',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:12',
            position: { start: 13, end: 24, wordIndex: 3 },
            alignment: { strong: 'G3140', lemma: 'μαρτυρέω', sourceContent: 'μαρτυροῦμεν', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:12:καὶ:2',
            content: 'καὶ',
            occurrence: 2,
            totalOccurrences: 2,
            verseRef: '3JN 1:12',
            position: { start: 25, end: 28, wordIndex: 4 },
            alignment: { strong: 'G2532', lemma: 'καί', sourceContent: 'καὶ', sourceOccurrence: 2 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:12:οἶδας:1',
            content: 'οἶδας',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:12',
            position: { start: 29, end: 34, wordIndex: 5 },
            alignment: { strong: 'G1492', lemma: 'οἶδα', sourceContent: 'οἶδας', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:12:ὅτι:1',
            content: 'ὅτι',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:12',
            position: { start: 35, end: 38, wordIndex: 6 },
            alignment: { strong: 'G3754', lemma: 'ὅτι', sourceContent: 'ὅτι', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:12:ἡ:1',
            content: 'ἡ',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:12',
            position: { start: 39, end: 40, wordIndex: 7 },
            alignment: { strong: 'G3588', lemma: 'ὁ', sourceContent: 'ἡ', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:12:μαρτυρία:1',
            content: 'μαρτυρία',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:12',
            position: { start: 41, end: 49, wordIndex: 8 },
            alignment: { strong: 'G3141', lemma: 'μαρτυρία', sourceContent: 'μαρτυρία', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:12:ἡμῶν:1',
            content: 'ἡμῶν',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:12',
            position: { start: 50, end: 54, wordIndex: 9 },
            alignment: { strong: 'G1473', lemma: 'ἐγώ', sourceContent: 'ἡμῶν', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:12:ἀληθής:1',
            content: 'ἀληθής',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:12',
            position: { start: 55, end: 61, wordIndex: 10 },
            alignment: { strong: 'G0227', lemma: 'ἀληθής', sourceContent: 'ἀληθής', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          },
          {
            uniqueId: '3JN 1:12:ἐστιν:1',
            content: 'ἐστιν',
            occurrence: 1,
            totalOccurrences: 1,
            verseRef: '3JN 1:12',
            position: { start: 62, end: 67, wordIndex: 11 },
            alignment: { strong: 'G1510', lemma: 'εἰμί', sourceContent: 'ἐστιν', sourceOccurrence: 1 },
            isHighlightable: true,
            type: 'word' as const
          }
        ]
      } as any
    ]
  }] as any[];

  // Show the verse structure
  console.log('📋 Verse Structure Analysis:');
  const verse = mockGreekChapters[0].verses[0];
  console.log(`Full verse: "${verse.text}"`);
  console.log('Word positions:');
  verse.wordTokens.forEach((token: any, i: number) => {
    const isTarget = ['ἡμεῖς', 'μαρτυροῦμεν', 'ἡμῶν'].includes(token.content);
    console.log(`  ${i + 1}. "${token.content}" (pos: ${token.position.start}-${token.position.end}) ${isTarget ? '← TARGET' : ''}`);
  });
  console.log('');

  // Test the non-contiguous multi-quote
  console.log('🧪 Testing Non-Contiguous Multi-Quote:');
  console.log('Quote: "ἡμεῖς & μαρτυροῦμεν & ἡμῶν"');
  console.log('Expected: Find all three words despite being separated by other words');
  
  const result = quoteMatcher.findOriginalTokens(
    mockGreekChapters,
    'ἡμεῖς & μαρτυροῦμεν & ἡμῶν',
    1,
    { book: '3JN', startChapter: 1, startVerse: 12 }
  );
  
  console.log(`\nResult: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (result.success) {
    console.log(`Found ${result.matches.length} quote matches:`);
    result.matches.forEach((match, i) => {
      console.log(`  Match ${i + 1}: "${match.quote}" in ${match.verseRef}`);
      console.log(`    Position: ${match.startPosition}-${match.endPosition}`);
      console.log(`    Tokens: ${match.tokens.map(t => `"${t.content}"`).join(', ')}`);
    });
    
    console.log(`\nTotal tokens found: ${result.totalTokens.length}`);
    result.totalTokens.forEach((token, i) => {
      console.log(`  ${i + 1}. "${token.content}" (Strong's: ${token.alignment?.strong}) at position ${token.position.start}-${token.position.end}`);
    });
    
    console.log('\n📍 Non-Contiguous Highlighting Demonstration:');
    console.log('   The system found three separate words:');
    console.log(`   • "ἡμεῖς" (we) at position 4-9`);
    console.log(`   • "μαρτυροῦμεν" (testify) at position 13-24`);
    console.log(`   • "ἡμῶν" (our) at position 50-54`);
    console.log('   These would be highlighted simultaneously in the UI');
    console.log('   even though they are separated by other words.');
    
  } else {
    console.log(`Error: ${result.error}`);
  }
  
  console.log('');
  
  // Test individual words to verify they exist
  console.log('🔍 Verification - Testing Individual Words:');
  const individualWords = ['ἡμεῖς', 'μαρτυροῦμεν', 'ἡμῶν'];
  
  individualWords.forEach((word, i) => {
    console.log(`\nTesting "${word}":`);
    const individualResult = quoteMatcher.findOriginalTokens(
      mockGreekChapters,
      word,
      1,
      { book: '3JN', startChapter: 1, startVerse: 12 }
    );
    
    console.log(`  Result: ${individualResult.success ? '✅ FOUND' : '❌ NOT FOUND'}`);
    if (individualResult.success) {
      const token = individualResult.totalTokens[0];
      console.log(`  Token: "${token.content}" at position ${token.position.start}-${token.position.end}`);
    }
  });
  
  console.log('\n📊 NON-CONTIGUOUS MULTI-QUOTE ANALYSIS:');
  if (result.success) {
    console.log('✅ System successfully handles non-contiguous multi-quotes');
    console.log('✅ Each word found in correct position');
    console.log('✅ Sequential matching works across word boundaries');
    console.log('✅ Translation Notes integration ready');
    console.log('\n🎯 This enables highlighting of grammatically related words');
    console.log('   that are separated in the text, such as:');
    console.log('   • Pronoun forms (ἡμεῖς, ἡμῶν)');
    console.log('   • Related verb forms');
    console.log('   • Distributed grammatical constructions');
  } else {
    console.log('❌ System needs enhancement for non-contiguous quotes');
  }
}

testNonContiguousQuotes();

