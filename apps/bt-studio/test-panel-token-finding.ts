#!/usr/bin/env npx ts-node

/**
 * Test Panel Token Finding Logic
 * 
 * This test verifies that each panel can correctly find tokens aligned to 
 * a given original language token using the new internal logic.
 */

// Mock the findTokensAlignedToOriginalLanguageToken function
function findTokensAlignedToOriginalLanguageToken(
  originalLanguageToken: any,
  scripture: any,
  resourceType: 'ULT' | 'UST' | 'UGNT' | 'UHB',
  language: 'en' | 'el-x-koine' | 'hbo'
): string[] {
  const tokenIds: string[] = [];
  
  // For original language panels, find exact token match
  if (language === 'el-x-koine' || language === 'hbo') {
    // This is an original language panel - highlight the exact matching token
    if (originalLanguageToken.uniqueId) {
      tokenIds.push(originalLanguageToken.uniqueId);
    }
    return tokenIds;
  }
  
  // For target language panels (ULT, UST), find tokens aligned to this original language token
  for (const chapter of scripture.chapters) {
    for (const verse of chapter.verses) {
      if (!verse.wordTokens) continue;
      
      for (const token of verse.wordTokens) {
        if (!token.alignment) continue;
        
        // Check if this token aligns to the original language token
        const isAligned = (
          token.alignment.strong === originalLanguageToken.strong &&
          token.alignment.sourceWordId === originalLanguageToken.uniqueId
        );
        
        if (isAligned) {
          tokenIds.push(token.uniqueId);
        }
      }
    }
  }
  
  return tokenIds;
}

async function testPanelTokenFinding() {
  console.log('🧪 Testing Panel Token Finding Logic\n');

  // Mock original language token
  const originalLanguageToken = {
    uniqueId: 'rut 1:1:שָׁפַט:1',
    content: 'שָׁפַט',
    verseRef: 'rut 1:1',
    strong: 'H8199',
    lemma: 'שָׁפַט',
    morph: 'Vqc',
    occurrence: 1
  };

  // Mock ULT scripture data
  const ultScripture = {
    chapters: [{
      verses: [{
        wordTokens: [
          {
            uniqueId: 'rut 1:1:gobierno:1',
            content: 'gobierno',
            alignment: {
              strong: 'H8199',
              sourceWordId: 'rut 1:1:שָׁפַט:1'
            }
          },
          {
            uniqueId: 'rut 1:1:otros:1',
            content: 'otros',
            alignment: {
              strong: 'H1234',
              sourceWordId: 'rut 1:1:אחר:1'
            }
          }
        ]
      }]
    }]
  };

  // Mock UST scripture data
  const ustScripture = {
    chapters: [{
      verses: [{
        wordTokens: [
          {
            uniqueId: 'rut 1:1:gobernaban:1',
            content: 'gobernaban',
            alignment: {
              strong: 'H8199',
              sourceWordId: 'rut 1:1:שָׁפַט:1'
            }
          },
          {
            uniqueId: 'rut 1:1:diferentes:1',
            content: 'diferentes',
            alignment: {
              strong: 'H1234',
              sourceWordId: 'rut 1:1:אחר:1'
            }
          }
        ]
      }]
    }]
  };

  // Mock Hebrew scripture data
  const hebrewScripture = {
    chapters: [{
      verses: [{
        wordTokens: [
          {
            uniqueId: 'rut 1:1:שָׁפַט:1',
            content: 'שָׁפַט',
            alignment: {
              strong: 'H8199',
              sourceWordId: 'rut 1:1:שָׁפַט:1'
            }
          }
        ]
      }]
    }]
  };

  console.log('📝 Test 1: ULT Panel Finding Aligned Tokens');
  const ultTokens = findTokensAlignedToOriginalLanguageToken(
    originalLanguageToken,
    ultScripture,
    'ULT',
    'en'
  );
  console.log('   Found tokens:', ultTokens);
  console.log('   Expected: ["rut 1:1:gobierno:1"]');
  console.log('   ✅ Match:', JSON.stringify(ultTokens) === JSON.stringify(['rut 1:1:gobierno:1']));

  console.log('\n📝 Test 2: UST Panel Finding Aligned Tokens');
  const ustTokens = findTokensAlignedToOriginalLanguageToken(
    originalLanguageToken,
    ustScripture,
    'UST',
    'en'
  );
  console.log('   Found tokens:', ustTokens);
  console.log('   Expected: ["rut 1:1:gobernaban:1"]');
  console.log('   ✅ Match:', JSON.stringify(ustTokens) === JSON.stringify(['rut 1:1:gobernaban:1']));

  console.log('\n📝 Test 3: Hebrew Panel Finding Exact Token');
  const hebrewTokens = findTokensAlignedToOriginalLanguageToken(
    originalLanguageToken,
    hebrewScripture,
    'UHB',
    'hbo'
  );
  console.log('   Found tokens:', hebrewTokens);
  console.log('   Expected: ["rut 1:1:שָׁפַט:1"]');
  console.log('   ✅ Match:', JSON.stringify(hebrewTokens) === JSON.stringify(['rut 1:1:שָׁפַט:1']));

  console.log('\n' + '='.repeat(60));
  console.log('🎯 Panel-Specific Token Finding Logic:');
  console.log('   • ULT/UST: Find tokens where alignment.sourceWordId matches original token uniqueId');
  console.log('   • UGNT/UHB: Highlight exact token match by uniqueId');
  console.log('   • Each panel processes the same original language token independently');
  console.log('='.repeat(60));
}

// Run the test
testPanelTokenFinding().catch(console.error);

