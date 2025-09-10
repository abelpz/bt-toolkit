#!/usr/bin/env ts-node

/**
 * Simple test for the Quote Matching System without circular dependencies
 */

// @ts-ignore
import usfmjs from 'usfm-js';
import { QuoteMatcher } from './src/services/quote-matcher';

async function testQuoteMatchingSimple() {
  console.log('🎯 Testing Quote Matching System (Simple)\n');

  const quoteMatcher = new QuoteMatcher();

  try {
    // Download Greek UGNT 3 John
    console.log('📥 Downloading Greek UGNT 3 John...');
    const ugntUrl = 'https://git.door43.org/unfoldingWord/el-x-koine_ugnt/raw/branch/master/65-3JN.usfm';
    const response = await fetch(ugntUrl);
    const usfmContent = await response.text();
    console.log(`✅ Downloaded ${usfmContent.length} characters\n`);

    // Parse USFM directly with usfm-js
    console.log('🔄 Parsing USFM...');
    const parsedUSFM = usfmjs.toJSON(usfmContent);
    console.log(`📖 Parsed: ${parsedUSFM.chapters.length} chapters\n`);

    // Create mock processed chapters for testing
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
            }
          ]
        } as any,
        {
          reference: '3JN 1:2',
          number: 2,
          text: 'ἀγαπητέ περὶ πάντων εὔχομαί σε εὐοδοῦσθαι',
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
            }
          ]
        } as any
      ]
    }] as any[];

    // Test 1: Simple Quote
    console.log('🧪 TEST 1: Simple Quote');
    console.log('Quote: "ὁ πρεσβύτερος", Occurrence: 1, Reference: 3JN 1:1');
    
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
        console.log(`    ${i + 1}. "${token.content}" (${token.alignment?.strong || 'N/A'})`);
      });
    } else {
      console.log(`  Error: ${test1.error}`);
    }
    console.log('');

    // Test 2: Multiple Quotes
    console.log('🧪 TEST 2: Multiple Quotes');
    console.log('Quote: "Γαΐῳ & ἀγαπητῷ", Occurrence: 1, Reference: 3JN 1:1');
    
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
        console.log(`    Match ${i + 1}: "${match.quote}"`);
        console.log(`      Tokens: ${match.tokens.map(t => `"${t.content}"`).join(', ')}`);
      });
    } else {
      console.log(`  Error: ${test2.error}`);
    }
    console.log('');

    // Test 3: Range Quote
    console.log('🧪 TEST 3: Range Quote');
    console.log('Quote: "ἀγαπητέ", Occurrence: 1, Reference: 3JN 1:1-2');
    
    const test3 = quoteMatcher.findOriginalTokens(
      mockChapters,
      'ἀγαπητέ',
      1,
      { book: '3JN', startChapter: 1, startVerse: 1, endVerse: 2 }
    );
    
    console.log(`Result: ${test3.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (test3.success) {
      console.log(`  Found in: ${test3.matches[0]?.verseRef}`);
      console.log(`  Token: "${test3.totalTokens[0]?.content}"`);
    } else {
      console.log(`  Error: ${test3.error}`);
    }
    console.log('');

    // Summary
    const tests = [test1, test2, test3];
    const successCount = tests.filter(t => t.success).length;
    
    console.log('📊 SUMMARY:');
    console.log(`✅ Successful tests: ${successCount}/${tests.length}`);
    console.log(`🎯 Quote Matching System: ${successCount === tests.length ? 'WORKING!' : 'NEEDS FIXES'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testQuoteMatchingSimple().catch(console.error);

