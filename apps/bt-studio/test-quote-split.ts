#!/usr/bin/env ts-node

/**
 * Test quote splitting logic
 */

function testQuoteSplit() {
  console.log('🔍 Testing Quote Splitting Logic\n');

  const testQuotes = [
    'Γαΐῳ',
    'Γαΐῳ & ἀγαπητῷ',
    'ἐγὼ & ἀγαπῶ & περὶ',
    'single word'
  ];

  testQuotes.forEach(quote => {
    const quotes = quote.split('&').map(q => q.trim());
    console.log(`"${quote}" → [${quotes.map(q => `"${q}"`).join(', ')}] (${quotes.length} parts)`);
  });
}

testQuoteSplit();

