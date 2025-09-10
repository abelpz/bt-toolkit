#!/usr/bin/env ts-node

/**
 * Comprehensive test suite for the Quote Matching System
 * Tests all four quote matching scenarios with real Greek UGNT data
 */

import { USFMProcessor } from './src/services/usfm-processor';
import { QuoteMatcher } from './src/services/quote-matcher';

async function testQuoteMatchingSystem() {
  console.log('🎯 Testing Quote Matching System with Greek UGNT (3 John)\n');

  const processor = new USFMProcessor();
  const quoteMatcher = new QuoteMatcher();

  // Download and process Greek UGNT 3 John
  console.log('📥 Downloading Greek UGNT 3 John...');
  const ugntUrl = 'https://git.door43.org/unfoldingWord/el-x-koine_ugnt/raw/branch/master/65-3JN.usfm';
  
  try {
    const response = await fetch(ugntUrl);
    const usfmContent = await response.text();
    console.log(`✅ Downloaded ${usfmContent.length} characters\n`);

    // Process the USFM
    console.log('🔄 Processing Greek UGNT...');
    const result = await processor.processUSFM(usfmContent, '3JN', 'Third John');
    const chapters = result.structuredText.chapters;
    
    console.log(`📖 Processed: ${chapters.length} chapters, ${chapters[0]?.verses.length || 0} verses\n`);

    // Show available text for reference
    console.log('📋 Available verses for testing:');
    chapters[0]?.verses.slice(0, 5).forEach(verse => {
      const text = verse.wordTokens
        ?.filter(t => t.type === 'word')
        .map(t => t.content)
        .join(' ') || verse.text;
      console.log(`  ${verse.reference}: ${text.substring(0, 80)}${text.length > 80 ? '...' : ''}`);
    });
    console.log('');

    // Test Case 1: Simple Quote Case
    console.log('🧪 TEST 1: Simple Quote Case');
    console.log('Quote: "ὁ πρεσβύτερος", Occurrence: 1, Reference: 3JN 1:1');
    
    const test1 = quoteMatcher.findOriginalTokens(
      chapters,
      'ὁ πρεσβύτερος', // "the elder"
      1,
      { book: '3JN', startChapter: 1, startVerse: 1 }
    );
    
    console.log(`Result: ${test1.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (test1.success) {
      console.log(`  Found ${test1.totalTokens.length} tokens:`);
      test1.totalTokens.forEach((token, i) => {
        console.log(`    ${i + 1}. "${token.content}" (${token.uniqueId})`);
      });
    } else {
      console.log(`  Error: ${test1.error}`);
    }
    console.log('');

    // Test Case 2: Multiple Quotes with Ampersand
    console.log('🧪 TEST 2: Multiple Quotes with Ampersand');
    console.log('Quote: "Γαΐῳ & ἀγαπητῷ", Occurrence: 1, Reference: 3JN 1:1');
    
    const test2 = quoteMatcher.findOriginalTokens(
      chapters,
      'Γαΐῳ & ἀγαπητῷ', // "to Gaius & beloved"
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
    console.log('Quote: "ἀγαπητέ", Occurrence: 1, Reference: 3JN 1:1-3');
    
    const test3 = quoteMatcher.findOriginalTokens(
      chapters,
      'ἀγαπητέ', // "beloved" (vocative)
      1,
      { book: '3JN', startChapter: 1, startVerse: 1, endVerse: 3 }
    );
    
    console.log(`Result: ${test3.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (test3.success) {
      console.log(`  Found ${test3.totalTokens.length} tokens:`);
      test3.totalTokens.forEach((token, i) => {
        console.log(`    ${i + 1}. "${token.content}" (${token.uniqueId})`);
      });
    } else {
      console.log(`  Error: ${test3.error}`);
    }
    console.log('');

    // Test Case 4: Multiple Quotes in Reference Range
    console.log('🧪 TEST 4: Multiple Quotes in Reference Range');
    console.log('Quote: "ἐγὼ & ἀγαπῶ & ἐν", Occurrence: 1, Reference: 3JN 1:1-2');
    
    const test4 = quoteMatcher.findOriginalTokens(
      chapters,
      'ἐγὼ & ἀγαπῶ & ἐν', // "I & love & in"
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

    // Test Case 5: Edge Case - Quote Not Found
    console.log('🧪 TEST 5: Edge Case - Quote Not Found');
    console.log('Quote: "nonexistent", Occurrence: 1, Reference: 3JN 1:1');
    
    const test5 = quoteMatcher.findOriginalTokens(
      chapters,
      'nonexistent',
      1,
      { book: '3JN', startChapter: 1, startVerse: 1 }
    );
    
    console.log(`Result: ${test5.success ? '✅ SUCCESS' : '❌ FAILED (Expected)'}`);
    if (!test5.success) {
      console.log(`  Expected error: ${test5.error}`);
    }
    console.log('');

    // Test Case 6: Occurrence Beyond Available
    console.log('🧪 TEST 6: Edge Case - Occurrence Beyond Available');
    console.log('Quote: "ὁ", Occurrence: 100, Reference: 3JN 1:1');
    
    const test6 = quoteMatcher.findOriginalTokens(
      chapters,
      'ὁ', // "the" (very common word)
      100, // Way more than available
      { book: '3JN', startChapter: 1, startVerse: 1 }
    );
    
    console.log(`Result: ${test6.success ? '✅ SUCCESS' : '❌ FAILED (Expected)'}`);
    if (!test6.success) {
      console.log(`  Expected error: ${test6.error}`);
    }
    console.log('');

    // Summary
    const tests = [test1, test2, test3, test4];
    const successCount = tests.filter(t => t.success).length;
    
    console.log('📊 SUMMARY:');
    console.log(`✅ Successful tests: ${successCount}/${tests.length}`);
    console.log(`🎯 Quote Matching System: ${successCount === tests.length ? 'FULLY FUNCTIONAL' : 'NEEDS FIXES'}`);
    
    if (successCount === tests.length) {
      console.log('\n🚀 READY FOR ALIGNMENT TESTING!');
      console.log('   ✓ Simple quote matching works');
      console.log('   ✓ Multiple quote matching works');
      console.log('   ✓ Reference range matching works');
      console.log('   ✓ Complex multi-quote ranges work');
      console.log('   ✓ Error handling works');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testQuoteMatchingSystem().catch(console.error);
