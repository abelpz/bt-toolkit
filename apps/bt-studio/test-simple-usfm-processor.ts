#!/usr/bin/env ts-node

/**
 * Simple Test for Enhanced USFM Processor with Word Token Extraction
 * Tests with 3 John from both English ULT and Greek UGNT
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// @ts-ignore - usfm-js doesn't have type declarations
import * as usfm from 'usfm-js';

// Simplified USFM Types for testing
interface WordToken {
  id: string;
  text: string;
  position: {
    start: number;
    end: number;
    wordIndex: number;
  };
  occurrence?: {
    occurrence: string;
    occurrences: string;
  };
  alignment?: {
    strong?: string;
    lemma?: string;
    morph?: string;
    alignmentId: string;
    sourceWord?: string;
  };
  isHighlightable: boolean;
  type: 'word' | 'text' | 'punctuation';
}

// Test URLs
const TEST_SOURCES = {
  en_ult: 'https://git.door43.org/unfoldingWord/en_ult/raw/branch/master/65-3JN.usfm',
  el_ugnt: 'https://git.door43.org/unfoldingWord/el-x-koine_ugnt/raw/branch/master/65-3JN.usfm'
};

/**
 * Download USFM file from URL
 */
async function downloadUSFM(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve(data);
      });
      
      response.on('error', (error) => {
        reject(error);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Simple USFM processor focused on word token extraction
 */
function processUSFMForTokens(usfmContent: string, bookCode: string): any {
  console.log(`🔄 Processing ${bookCode}...`);
  
  // Convert USFM to JSON
  const usfmJson = usfm.toJSON(usfmContent);
  console.log(`📊 Converted to JSON: ${Object.keys(usfmJson.chapters || {}).length} chapters`);
  
  const results = {
    bookCode,
    totalVerses: 0,
    versesWithTokens: 0,
    totalWordTokens: 0,
    highlightableTokens: 0,
    tokensWithAlignment: 0,
    strongNumbers: new Set<string>(),
    sampleTokens: [] as any[],
    verses: [] as any[]
  };

  // Process each chapter
  for (const [chapterNum, chapterData] of Object.entries(usfmJson.chapters || {})) {
    console.log(`📖 Processing chapter ${chapterNum}`);
    
    // Process each verse
    for (const [verseNum, verseData] of Object.entries(chapterData as any)) {
      const verse = verseData as any;
      if (verseNum === 'front' || !verse.verseObjects) continue;
      
      results.totalVerses++;
      const tokens = extractTokensFromVerse(verse.verseObjects, `${bookCode} ${chapterNum}:${verseNum}`);
      
      if (tokens.length > 0) {
        results.versesWithTokens++;
        results.totalWordTokens += tokens.length;
        
        for (const token of tokens) {
          if (token.isHighlightable) {
            results.highlightableTokens++;
          }
          if (token.alignment) {
            results.tokensWithAlignment++;
            if (token.alignment.strong) {
              results.strongNumbers.add(token.alignment.strong);
            }
          }
          
          // Collect sample tokens
          if (results.sampleTokens.length < 5 && token.isHighlightable) {
            results.sampleTokens.push({
              text: token.text,
              alignment: token.alignment,
              occurrence: token.occurrence
            });
          }
        }
        
        results.verses.push({
          reference: `${bookCode} ${chapterNum}:${verseNum}`,
          tokenCount: tokens.length,
          highlightableCount: tokens.filter(t => t.isHighlightable).length,
          sampleTokens: tokens.slice(0, 3).map(t => ({ text: t.text, type: t.type, isHighlightable: t.isHighlightable }))
        });
      }
    }
  }

  return {
    ...results,
    strongNumbers: Array.from(results.strongNumbers)
  };
}

/**
 * Extract word tokens from verse objects
 */
function extractTokensFromVerse(verseObjects: any[], verseRef: string): WordToken[] {
  const tokens: WordToken[] = [];
  let text = '';
  let wordIndex = 0;

  const processObject = (obj: any, alignmentContext?: any): void => {
    if (obj.type === 'text') {
      const startPos = text.length;
      text += obj.text;
      const endPos = text.length;

      if (obj.text.trim()) {
        tokens.push({
          id: `${verseRef}-token-${wordIndex++}`,
          text: obj.text,
          position: { start: startPos, end: endPos, wordIndex: wordIndex - 1 },
          isHighlightable: false,
          type: /^[a-zA-Z]+$/.test(obj.text.trim()) ? 'word' : 'punctuation'
        });
      }
    } else if (obj.type === 'word' && obj.tag === 'w') {
      const startPos = text.length;
      text += obj.text;
      const endPos = text.length;

      const token: WordToken = {
        id: `${verseRef}-word-${wordIndex++}`,
        text: obj.text,
        position: { start: startPos, end: endPos, wordIndex: wordIndex - 1 },
        isHighlightable: true,
        type: 'word'
      };

      // Add occurrence data
      if (obj.occurrence || obj['x-occurrence']) {
        token.occurrence = {
          occurrence: obj.occurrence || obj['x-occurrence'] || '1',
          occurrences: obj.occurrences || obj['x-occurrences'] || '1'
        };
      }

      // Add alignment data if in alignment context
      if (alignmentContext) {
        token.alignment = {
          strong: alignmentContext.strong || alignmentContext['x-strong'],
          lemma: alignmentContext.lemma || alignmentContext['x-lemma'],
          morph: alignmentContext.morph || alignmentContext['x-morph'],
          alignmentId: `${verseRef}-align-${wordIndex}`,
          sourceWord: alignmentContext.content || alignmentContext['x-content']
        };
      }

      tokens.push(token);
    } else if (obj.type === 'milestone' && obj.tag === 'zaln') {
      // Process alignment and its children
      if (obj.children) {
        for (const child of obj.children) {
          processObject(child, obj);
        }
      }
    }
  };

  // Process all verse objects
  for (const verseObj of verseObjects) {
    processObject(verseObj);
  }

  return tokens;
}

/**
 * Save results to JSON file
 */
function saveResults(filename: string, data: any): void {
  const outputDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ Results saved to: ${filepath}`);
}

/**
 * Main test function
 */
async function runSimpleTest() {
  console.log('🚀 Testing Enhanced USFM Processor - Word Token Extraction\n');
  
  const results: any = {};

  for (const [source, url] of Object.entries(TEST_SOURCES)) {
    console.log(`📥 Downloading ${source} from: ${url}`);
    
    try {
      // Download USFM content
      const usfmContent = await downloadUSFM(url);
      console.log(`✅ Downloaded ${usfmContent.length} characters`);
      
      // Show sample of raw USFM
      const sampleLines = usfmContent.split('\n').slice(0, 5);
      console.log('📄 Sample USFM content:');
      sampleLines.forEach(line => console.log(`   ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`));
      
      // Process USFM
      const startTime = Date.now();
      const result = processUSFMForTokens(usfmContent, '3JN');
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Processed in ${processingTime}ms`);
      console.log(`📊 Results for ${source}:`);
      console.log(`   - Total verses: ${result.totalVerses}`);
      console.log(`   - Verses with tokens: ${result.versesWithTokens}`);
      console.log(`   - Total word tokens: ${result.totalWordTokens}`);
      console.log(`   - Highlightable tokens: ${result.highlightableTokens}`);
      console.log(`   - Tokens with alignment: ${result.tokensWithAlignment}`);
      console.log(`   - Unique Strong's numbers: ${result.strongNumbers.length}`);
      
      if (result.sampleTokens.length > 0) {
        console.log(`   - Sample tokens:`);
        result.sampleTokens.forEach((token: any, i: number) => {
          console.log(`     ${i + 1}. "${token.text}" ${token.alignment ? `(${token.alignment.strong})` : ''}`);
        });
      }
      
      console.log('');
      
      results[source] = { ...result, processingTime };
      saveResults(`${source}-simple-results.json`, result);
      
    } catch (error) {
      console.error(`❌ Error processing ${source}:`, error);
      results[source] = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Save summary
  saveResults('simple-test-summary.json', results);
  
  console.log('🎯 Inter-Panel Communication Assessment:');
  console.log('========================================');
  
  const enResult = results.en_ult;
  const grResult = results.el_ugnt;
  
  if (enResult && !enResult.error && grResult && !grResult.error) {
    console.log('✅ Both sources processed successfully');
    console.log(`✅ English ULT: ${enResult.highlightableTokens} highlightable words`);
    console.log(`✅ Greek UGNT: ${grResult.highlightableTokens} highlightable words`);
    console.log(`✅ Total Strong's numbers: ${enResult.strongNumbers.length + grResult.strongNumbers.length}`);
    
    if (enResult.tokensWithAlignment > 0 || grResult.tokensWithAlignment > 0) {
      console.log('🎯 READY FOR INTER-PANEL COMMUNICATION!');
      console.log('   ✓ Word-level tokenization complete');
      console.log('   ✓ Position data available for highlighting');
      console.log('   ✓ Alignment data extracted');
      console.log('   ✓ Occurrence data preserved for quote matching');
    } else {
      console.log('⚠️  Limited alignment data found');
    }
  } else {
    console.log('❌ Processing failed - check errors above');
  }
  
  console.log('\n📁 Check test-output/ directory for detailed results');
}

// Run the simple test
if (require.main === module) {
  runSimpleTest().catch(console.error);
}

export { runSimpleTest };
