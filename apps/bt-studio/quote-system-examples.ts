#!/usr/bin/env ts-node

/**
 * Comprehensive Examples of the Quote Matching System
 * Demonstrates all four quote matching scenarios with improved examples
 */

import { USFMProcessor } from './src/services/usfm-processor';
import { QuoteMatcher, QuoteReference } from './src/services/quote-matcher';

async function demonstrateQuoteSystem() {
  console.log('📚 Quote Matching System - Comprehensive Examples\n');
  console.log('Using Greek UGNT 3 John as reference text\n');

  const processor = new USFMProcessor();
  const quoteMatcher = new QuoteMatcher();

  try {
    // Load Greek UGNT
    const ugntUrl = 'https://git.door43.org/unfoldingWord/el-x-koine_ugnt/raw/branch/master/65-3JN.usfm';
    const response = await fetch(ugntUrl);
    const usfmContent = await response.text();
    
    const result = await processor.processUSFM(usfmContent, '3JN', 'Third John');
    const chapters = result.structuredText.chapters;

    // Show verse context for examples
    console.log('📖 VERSE CONTEXT (for reference):');
    chapters[0]?.verses.slice(0, 4).forEach(verse => {
      const greekText = verse.wordTokens
        ?.filter(t => t.type === 'word')
        .map(t => t.content)
        .join(' ') || verse.text;
      console.log(`${verse.reference}: ${greekText}`);
    });
    console.log('');

    // EXAMPLE 1: Simple Quote Case
    console.log('=' .repeat(60));
    console.log('📝 EXAMPLE 1: SIMPLE QUOTE CASE');
    console.log('=' .repeat(60));
    console.log('Scenario: Translation Notes references "ὁ πρεσβύτερος" (the elder)');
    console.log('Quote: "ὁ πρεσβύτερος"');
    console.log('Occurrence: 1 (first occurrence)');
    console.log('Reference: 3JN 1:1 (single verse)');
    console.log('Expected: Find the first occurrence of "ὁ πρεσβύτερος" in verse 1:1\n');

    const example1 = quoteMatcher.findOriginalTokens(
      chapters,
      'ὁ πρεσβύτερος',
      1,
      { book: '3JN', startChapter: 1, startVerse: 1 }
    );

    if (example1.success) {
      console.log('✅ SUCCESS: Found matching tokens');
      console.log(`   Verse: ${example1.matches[0]?.verseRef}`);
      console.log(`   Tokens: ${example1.totalTokens.map(t => `"${t.content}"`).join(' ')}`);
      console.log(`   Strong's: ${example1.totalTokens.map(t => t.alignment?.strong || 'N/A').join(', ')}`);
    } else {
      console.log(`❌ FAILED: ${example1.error}`);
    }
    console.log('');

    // EXAMPLE 2: Multiple Quotes with Ampersand
    console.log('=' .repeat(60));
    console.log('📝 EXAMPLE 2: MULTIPLE QUOTES WITH AMPERSAND');
    console.log('=' .repeat(60));
    console.log('Scenario: Translation Notes references multiple related words');
    console.log('Quote: "Γαΐῳ & τῷ & ἀγαπητῷ"');
    console.log('Occurrence: 1 (first occurrence of "Γαΐῳ", then first "τῷ" after that, then first "ἀγαπητῷ" after that)');
    console.log('Reference: 3JN 1:1');
    console.log('Expected: Find "Γαΐῳ" (1st), then "τῷ" (next), then "ἀγαπητῷ" (next)\n');

    const example2 = quoteMatcher.findOriginalTokens(
      chapters,
      'Γαΐῳ & τῷ & ἀγαπητῷ',
      1,
      { book: '3JN', startChapter: 1, startVerse: 1 }
    );

    if (example2.success) {
      console.log('✅ SUCCESS: Found all quote matches');
      example2.matches.forEach((match, i) => {
        console.log(`   Quote ${i + 1}: "${match.quote}" in ${match.verseRef}`);
        console.log(`     Tokens: ${match.tokens.map(t => `"${t.content}"`).join(' ')}`);
      });
      console.log(`   Total tokens: ${example2.totalTokens.length}`);
    } else {
      console.log(`❌ FAILED: ${example2.error}`);
    }
    console.log('');

    // EXAMPLE 3: Simple Quote in Reference Range
    console.log('=' .repeat(60));
    console.log('📝 EXAMPLE 3: SIMPLE QUOTE IN REFERENCE RANGE');
    console.log('=' .repeat(60));
    console.log('Scenario: Translation Notes references a word that appears across multiple verses');
    console.log('Quote: "ἀγαπητέ"');
    console.log('Occurrence: 1 (first occurrence in the entire range)');
    console.log('Reference: 3JN 1:1-3 (verse range)');
    console.log('Expected: Find first "ἀγαπητέ" anywhere in verses 1-3\n');

    const example3 = quoteMatcher.findOriginalTokens(
      chapters,
      'ἀγαπητέ',
      1,
      { book: '3JN', startChapter: 1, startVerse: 1, endVerse: 3 }
    );

    if (example3.success) {
      console.log('✅ SUCCESS: Found in range');
      console.log(`   Found in: ${example3.matches[0]?.verseRef}`);
      console.log(`   Token: "${example3.totalTokens[0]?.content}"`);
      console.log(`   Strong's: ${example3.totalTokens[0]?.alignment?.strong || 'N/A'}`);
    } else {
      console.log(`❌ FAILED: ${example3.error}`);
    }
    console.log('');

    // EXAMPLE 4: Multiple Quotes in Reference Range
    console.log('=' .repeat(60));
    console.log('📝 EXAMPLE 4: MULTIPLE QUOTES IN REFERENCE RANGE');
    console.log('=' .repeat(60));
    console.log('Scenario: Complex Translation Notes with multiple related concepts');
    console.log('Quote: "ἐγὼ & ἀγαπῶ & περὶ"');
    console.log('Occurrence: 1 (1st "ἐγὼ" in range, then 1st "ἀγαπῶ" after that, then 1st "περὶ" after that)');
    console.log('Reference: 3JN 1:1-2 (spans verses)');
    console.log('Expected: Sequential matching across verse boundaries\n');

    const example4 = quoteMatcher.findOriginalTokens(
      chapters,
      'ἐγὼ & ἀγαπῶ & περὶ',
      1,
      { book: '3JN', startChapter: 1, startVerse: 1, endVerse: 2 }
    );

    if (example4.success) {
      console.log('✅ SUCCESS: Found sequential matches across verses');
      example4.matches.forEach((match, i) => {
        console.log(`   Quote ${i + 1}: "${match.quote}" in ${match.verseRef}`);
        console.log(`     Tokens: ${match.tokens.map(t => `"${t.content}"`).join(' ')}`);
      });
      console.log(`   Total tokens: ${example4.totalTokens.length}`);
      console.log('   📍 Note: Quotes found in sequence across verse boundary');
    } else {
      console.log(`❌ FAILED: ${example4.error}`);
    }
    console.log('');

    // EXAMPLE 5: Advanced - Higher Occurrence Number
    console.log('=' .repeat(60));
    console.log('📝 EXAMPLE 5: ADVANCED - HIGHER OCCURRENCE NUMBER');
    console.log('=' .repeat(60));
    console.log('Scenario: Translation Notes references the second occurrence of a common word');
    console.log('Quote: "καὶ"');
    console.log('Occurrence: 2 (second occurrence)');
    console.log('Reference: 3JN 1:1-2');
    console.log('Expected: Skip first "καὶ", find second "καὶ"\n');

    const example5 = quoteMatcher.findOriginalTokens(
      chapters,
      'καὶ',
      2,
      { book: '3JN', startChapter: 1, startVerse: 1, endVerse: 2 }
    );

    if (example5.success) {
      console.log('✅ SUCCESS: Found second occurrence');
      console.log(`   Found in: ${example5.matches[0]?.verseRef}`);
      console.log(`   Token: "${example5.totalTokens[0]?.content}"`);
      console.log(`   Position: ${example5.matches[0]?.startPosition}-${example5.matches[0]?.endPosition}`);
    } else {
      console.log(`❌ FAILED: ${example5.error}`);
    }
    console.log('');

    // EXAMPLE 6: Error Case - Quote Not Found
    console.log('=' .repeat(60));
    console.log('📝 EXAMPLE 6: ERROR HANDLING - QUOTE NOT FOUND');
    console.log('=' .repeat(60));
    console.log('Scenario: Translation Notes has incorrect quote');
    console.log('Quote: "nonexistent"');
    console.log('Occurrence: 1');
    console.log('Reference: 3JN 1:1');
    console.log('Expected: Graceful error handling\n');

    const example6 = quoteMatcher.findOriginalTokens(
      chapters,
      'nonexistent',
      1,
      { book: '3JN', startChapter: 1, startVerse: 1 }
    );

    console.log(`Result: ${example6.success ? '✅ SUCCESS' : '❌ FAILED (Expected)'}`);
    console.log(`Error message: "${example6.error}"`);
    console.log('📍 Note: System properly handles invalid quotes with clear error messages');
    console.log('');

    // SUMMARY
    console.log('=' .repeat(60));
    console.log('📊 SYSTEM CAPABILITIES SUMMARY');
    console.log('=' .repeat(60));
    console.log('✅ Simple quote matching in single verses');
    console.log('✅ Multiple quote matching with & separator');
    console.log('✅ Quote matching across verse ranges');
    console.log('✅ Complex multi-quote matching across ranges');
    console.log('✅ Occurrence-based matching (1st, 2nd, 3rd, etc.)');
    console.log('✅ Robust error handling for invalid quotes');
    console.log('✅ Position tracking for precise highlighting');
    console.log('✅ Strong\'s number extraction for alignment');
    console.log('');
    console.log('🚀 READY FOR INTER-PANEL COMMUNICATION!');
    console.log('   This system enables Translation Notes, Translation Questions,');
    console.log('   and other tools to precisely reference and highlight');
    console.log('   specific words in original language texts and their');
    console.log('   corresponding aligned translations.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

demonstrateQuoteSystem().catch(console.error);

