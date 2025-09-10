#!/usr/bin/env ts-node

/**
 * Debug test for the Quote Matching System
 */

import { QuoteMatcher } from './src/services/quote-matcher';

function testQuoteDebug() {
  console.log('🔍 Debugging Quote Matching System\n');

  const quoteMatcher = new QuoteMatcher();

  // Test the normalizeText method directly
  console.log('Testing normalizeText method:');
  
  // Access the private method via any cast for testing
  const matcher = quoteMatcher as any;
  
  const testTexts = [
    'ὁ πρεσβύτερος',
    'Γαΐῳ',
    'ἀγαπητῷ',
    'Hello World',
    'test123'
  ];
  
  testTexts.forEach(text => {
    try {
      const normalized = matcher.normalizeText(text);
      console.log(`  "${text}" → "${normalized}"`);
    } catch (error) {
      console.log(`  "${text}" → ERROR: ${error}`);
    }
  });
  
  console.log('\nTesting quote occurrence finding:');
  
  const testText = 'ho presbuteros gaio to agapeto';
  const testQuote = 'ho presbuteros';
  
  try {
    const occurrences = matcher.findQuoteOccurrencesInText(testText, testQuote);
    console.log(`  Text: "${testText}"`);
    console.log(`  Quote: "${testQuote}"`);
    console.log(`  Occurrences: ${occurrences.length}`);
    occurrences.forEach((occ: any, i: number) => {
      console.log(`    ${i + 1}. Position ${occ.start}-${occ.end}`);
    });
  } catch (error) {
    console.log(`  ERROR: ${error}`);
  }
}

testQuoteDebug();
