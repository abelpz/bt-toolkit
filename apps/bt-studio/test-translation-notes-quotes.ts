#!/usr/bin/env ts-node

/**
 * Test Quote Matching System with real Translation Notes data
 * Based on actual quotes from unfoldingWord Translation Notes for 3 John
 */

import { QuoteMatcher } from './src/services/quote-matcher';

function testTranslationNotesQuotes() {
  console.log('📝 Testing Quote Matching with Real Translation Notes Data\n');
  console.log('Source: https://git.door43.org/unfoldingWord/en_tn/raw/branch/master/tn_3JN.tsv\n');

  const quoteMatcher = new QuoteMatcher();

  // Create mock Greek UGNT data based on the actual 3 John text
  const mockGreekChapters = [{
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
      } as any
    ]
  }] as any[];

  // Real Translation Notes test cases from the TSV data
  const translationNotesTests = [
    {
      id: 'w99t',
      reference: '1:1',
      quote: 'ὁ πρεσβύτερος',
      occurrence: 1,
      description: 'Translation note about "The elder" - John identifying himself',
      note: 'John assumes that Gaius will know who he is when he calls himself **The elder.**'
    },
    {
      id: 'lls6',
      reference: '1:1',
      quote: 'Γαΐῳ',
      occurrence: 1,
      description: 'Translation note about the name "Gaius"',
      note: '**Gaius** is the name of a man, a fellow believer to whom John is writing this letter.'
    },
    {
      id: 'kpbl',
      reference: '1:1',
      quote: 'ὃν ἐγὼ ἀγαπῶ ἐν ἀληθείᾳ',
      occurrence: 1,
      description: 'Translation note about "whom I love in truth"',
      note: 'If your language does not use an abstract noun for the idea of **truth**, you could express the same idea in another way.'
    }
  ];

  console.log('📋 Testing Real Translation Notes Quotes:\n');

  let successCount = 0;
  const totalTests = translationNotesTests.length;

  translationNotesTests.forEach((test, index) => {
    console.log(`🧪 TEST ${index + 1}: Translation Note ${test.id}`);
    console.log(`Reference: 3JN ${test.reference}`);
    console.log(`Quote: "${test.quote}"`);
    console.log(`Occurrence: ${test.occurrence}`);
    console.log(`Description: ${test.description}`);
    console.log(`Note: ${test.note.substring(0, 80)}${test.note.length > 80 ? '...' : ''}`);
    
    const result = quoteMatcher.findOriginalTokens(
      mockGreekChapters,
      test.quote,
      test.occurrence,
      { book: '3JN', startChapter: 1, startVerse: 1 }
    );
    
    console.log(`Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (result.success) {
      successCount++;
      console.log(`  Found ${result.totalTokens.length} tokens:`);
      result.totalTokens.forEach((token, i) => {
        console.log(`    ${i + 1}. "${token.content}" (Strong's: ${token.alignment?.strong || 'N/A'})`);
      });
      
      if (result.matches.length > 1) {
        console.log(`  Quote breakdown:`);
        result.matches.forEach((match, i) => {
          console.log(`    Match ${i + 1}: "${match.quote}" → ${match.tokens.map(t => `"${t.content}"`).join(', ')}`);
        });
      }
    } else {
      console.log(`  Error: ${result.error}`);
    }
    console.log('');
  });

  // Additional test: Complex multi-word quote from Translation Notes
  console.log('🧪 BONUS TEST: Complex Multi-Word Quote');
  console.log('Testing the full phrase from note kpbl: "ὃν ἐγὼ ἀγαπῶ ἐν ἀληθείᾳ"');
  
  const complexResult = quoteMatcher.findOriginalTokens(
    mockGreekChapters,
    'ὃν ἐγὼ ἀγαπῶ ἐν ἀληθείᾳ',
    1,
    { book: '3JN', startChapter: 1, startVerse: 1 }
  );
  
  console.log(`Result: ${complexResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (complexResult.success) {
    console.log(`  Found ${complexResult.totalTokens.length} tokens for the complete phrase:`);
    complexResult.totalTokens.forEach((token, i) => {
      console.log(`    ${i + 1}. "${token.content}" (Strong's: ${token.alignment?.strong || 'N/A'})`);
    });
    console.log(`  📍 This demonstrates how Translation Notes can reference complete phrases`);
    console.log(`     and our system will find all the constituent Greek words for highlighting.`);
  }
  console.log('');

  // Summary
  console.log('📊 TRANSLATION NOTES INTEGRATION SUMMARY:');
  console.log(`✅ Successful tests: ${successCount}/${totalTests}`);
  console.log(`🎯 Translation Notes Integration: ${successCount === totalTests ? 'WORKING!' : 'NEEDS FIXES'}`);
  
  if (successCount === totalTests) {
    console.log('\n🚀 TRANSLATION NOTES INTEGRATION READY!');
    console.log('   ✓ Can find quotes referenced in Translation Notes');
    console.log('   ✓ Handles single words (names, key terms)');
    console.log('   ✓ Handles multi-word phrases');
    console.log('   ✓ Provides Strong\'s numbers for alignment');
    console.log('   ✓ Ready for inter-panel highlighting system');
    console.log('\n🎯 NEXT: Implement alignment matching to connect with target language translations');
  }
}

testTranslationNotesQuotes();

