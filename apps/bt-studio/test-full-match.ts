#!/usr/bin/env ts-node

/**
 * Test the full quote matching process
 */

import { QuoteMatcher } from './src/services/quote-matcher';

function testFullMatch() {
  console.log('🔍 Testing Full Quote Matching Process\n');

  const quoteMatcher = new QuoteMatcher();

  // Mock chapters data
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

  // Test the findSingleQuoteMatch method directly
  console.log('🧪 Testing findSingleQuoteMatch directly:');
  
  const verses = mockChapters[0].verses;
  const quote = 'ἀγαπητῷ';
  const occurrence = 1;
  const startVerseIndex = 0;
  
  console.log(`Quote: "${quote}"`);
  console.log(`Occurrence: ${occurrence}`);
  console.log(`Start verse index: ${startVerseIndex}`);
  console.log(`Verses to search: ${verses.length}`);
  console.log('');

  // Manually trace through findSingleQuoteMatch logic
  const normalizedQuote = (quoteMatcher as any).normalizeText(quote);
  console.log(`Normalized quote: "${normalizedQuote}"`);
  
  let foundOccurrences = 0;
  
  for (let i = startVerseIndex; i < verses.length; i++) {
    const verse = verses[i];
    console.log(`\nProcessing verse ${i + 1}: ${verse.reference}`);
    
    if (!verse.wordTokens || verse.wordTokens.length === 0) {
      console.log('  No word tokens, skipping');
      continue;
    }
    
    // Create searchable text from tokens
    const verseText = verse.wordTokens
      .filter((token: any) => token.type === 'word')
      .map((token: any) => (quoteMatcher as any).normalizeText(token.content))
      .join(' ');
    
    console.log(`  Verse text: "${verseText}"`);
    
    // Find all occurrences of the quote in this verse
    const matches = (quoteMatcher as any).findQuoteOccurrencesInText(verseText, normalizedQuote);
    console.log(`  Found ${matches.length} matches in this verse`);
    
    matches.forEach((match: any, j: number) => {
      console.log(`    Match ${j + 1}: position ${match.start}-${match.end}`);
    });
    
    for (const match of matches) {
      foundOccurrences++;
      console.log(`  Total occurrences so far: ${foundOccurrences}`);
      
      if (foundOccurrences === occurrence) {
        console.log(`  ✅ Found target occurrence ${occurrence}!`);
        
        // Extract tokens for this match
        const tokens = (quoteMatcher as any).extractTokensForMatch(verse, match.start, match.end);
        console.log(`  Extracted ${tokens.length} tokens: ${tokens.map((t: any) => `"${t.content}"`).join(', ')}`);
        
        const result = {
          quote,
          occurrence,
          tokens,
          verseRef: verse.reference,
          startPosition: match.start,
          endPosition: match.end
        };
        
        console.log('  Match result:', result);
        return;
      }
    }
  }
  
  console.log(`❌ Quote "${quote}" (occurrence ${occurrence}) not found`);
}

testFullMatch();

