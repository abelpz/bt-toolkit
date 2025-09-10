#!/usr/bin/env ts-node

/**
 * Test Enhanced USFM Processor with Word Token Extraction
 * Tests with 3 John from both English ULT and Greek UGNT
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { USFMProcessor } from './src/services/usfm-processor';

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
 * Save test results to JSON file
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
 * Analyze word tokens for inter-panel communication capabilities
 */
function analyzeWordTokens(result: any) {
  const analysis = {
    totalVerses: 0,
    versesWithTokens: 0,
    totalWordTokens: 0,
    highlightableTokens: 0,
    tokensWithAlignment: 0,
    tokensWithOccurrence: 0,
    alignmentTypes: new Set<string>(),
    strongNumbers: new Set<string>(),
    sampleTokens: [] as any[]
  };

  if (result.structuredText?.chapters) {
    for (const chapter of result.structuredText.chapters) {
      for (const verse of chapter.verses) {
        analysis.totalVerses++;
        
        if (verse.wordTokens && verse.wordTokens.length > 0) {
          analysis.versesWithTokens++;
          
          for (const token of verse.wordTokens) {
            analysis.totalWordTokens++;
            
            if (token.isHighlightable) {
              analysis.highlightableTokens++;
            }
            
            if (token.alignment) {
              analysis.tokensWithAlignment++;
              if (token.alignment.strong) {
                analysis.strongNumbers.add(token.alignment.strong);
              }
              if (token.alignment.morph) {
                analysis.alignmentTypes.add(token.alignment.morph);
              }
            }
            
            if (token.occurrence) {
              analysis.tokensWithOccurrence++;
            }
            
            // Collect sample tokens for inspection
            if (analysis.sampleTokens.length < 10 && token.isHighlightable) {
              analysis.sampleTokens.push({
                text: token.text,
                position: token.position,
                alignment: token.alignment,
                occurrence: token.occurrence
              });
            }
          }
        }
      }
    }
  }

  return {
    ...analysis,
    alignmentTypes: Array.from(analysis.alignmentTypes),
    strongNumbers: Array.from(analysis.strongNumbers)
  };
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Testing Enhanced USFM Processor with Word Token Extraction\n');
  
  const processor = new USFMProcessor();
  const results: any = {};

  for (const [source, url] of Object.entries(TEST_SOURCES)) {
    console.log(`📥 Downloading ${source} from: ${url}`);
    
    try {
      // Download USFM content
      const usfmContent = await downloadUSFM(url);
      console.log(`✅ Downloaded ${usfmContent.length} characters`);
      
      // Process USFM
      console.log(`🔄 Processing ${source}...`);
      const startTime = Date.now();
      
      const result = await processor.processUSFM(
        usfmContent,
        '3JN',
        'Third John'
      );
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Processed in ${processingTime}ms`);
      
      // Analyze results
      const analysis = analyzeWordTokens(result);
      
      console.log(`📊 Analysis for ${source}:`);
      console.log(`   - Total verses: ${analysis.totalVerses}`);
      console.log(`   - Verses with tokens: ${analysis.versesWithTokens}`);
      console.log(`   - Total word tokens: ${analysis.totalWordTokens}`);
      console.log(`   - Highlightable tokens: ${analysis.highlightableTokens}`);
      console.log(`   - Tokens with alignment: ${analysis.tokensWithAlignment}`);
      console.log(`   - Tokens with occurrence: ${analysis.tokensWithOccurrence}`);
      console.log(`   - Unique Strong's numbers: ${analysis.strongNumbers.length}`);
      console.log(`   - Processing time: ${processingTime}ms\n`);
      
      // Store results
      results[source] = {
        metadata: result.metadata,
        analysis,
        processingTime,
        sampleVerse: result.structuredText.chapters[0]?.verses[0] || null
      };
      
      // Save detailed results
      saveResults(`${source}-detailed-results.json`, result);
      
    } catch (error) {
      console.error(`❌ Error processing ${source}:`, error);
      results[source] = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Save summary results
  saveResults('test-summary.json', results);
  
  console.log('\n🎯 Test Summary:');
  console.log('================');
  
  for (const [source, result] of Object.entries(results)) {
    const typedResult = result as any;
    if ('error' in typedResult) {
      console.log(`❌ ${source}: ${typedResult.error}`);
    } else {
      console.log(`✅ ${source}: ${typedResult.analysis.highlightableTokens} highlightable tokens, ${typedResult.analysis.tokensWithAlignment} with alignment data`);
    }
  }
  
  console.log('\n🔍 Inter-Panel Communication Readiness:');
  console.log('========================================');
  
  const enResult = results.en_ult as any;
  const grResult = results.el_ugnt as any;
  
  if (!('error' in enResult) && !('error' in grResult)) {
    console.log('✅ Both sources processed successfully');
    console.log(`✅ English ULT: ${enResult.analysis.highlightableTokens} highlightable words`);
    console.log(`✅ Greek UGNT: ${grResult.analysis.highlightableTokens} highlightable words`);
    console.log(`✅ Alignment data available for cross-resource highlighting`);
    console.log(`✅ Word tokens include position data for precise UI highlighting`);
    console.log(`✅ Occurrence data available for TN/TWL/TQ quote matching`);
    console.log(`✅ Strong's numbers available for lexical linking`);
    
    if (enResult.analysis.tokensWithAlignment > 0) {
      console.log('🎯 READY FOR INTER-PANEL COMMUNICATION!');
    } else {
      console.log('⚠️  Limited alignment data - may need additional processing');
    }
  } else {
    console.log('❌ Some sources failed - check error details above');
  }
  
  console.log('\n📁 Check test-output/ directory for detailed results');
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests, analyzeWordTokens };
