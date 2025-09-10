#!/usr/bin/env ts-node

/**
 * Test Non-Contiguous Alignment Processing
 * Demonstrates how the enhanced USFM processor handles cases where
 * multiple non-adjacent words align to the same Greek/Hebrew source
 */

import * as fs from 'fs';
import * as path from 'path';

// @ts-ignore - usfm-js doesn't have type declarations
import * as usfm from 'usfm-js';

/**
 * Test non-contiguous alignment processing
 */
function testNonContiguousAlignments() {
  console.log('🔍 Testing Non-Contiguous Alignment Processing\n');
  
  // Read the test USFM file
  const usfmPath = path.join(__dirname, 'test-non-contiguous-alignment.usfm');
  const usfmContent = fs.readFileSync(usfmPath, 'utf8');
  
  console.log('📄 Sample USFM with Non-Contiguous Alignments:');
  console.log('='.repeat(60));
  
  // Show key examples from the USFM
  const lines = usfmContent.split('\n');
  lines.forEach((line, i) => {
    if (line.startsWith('\\v ')) {
      console.log(`Line ${i + 1}: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
    }
  });
  
  console.log('\n🔄 Processing USFM...');
  
  // Convert to JSON and analyze
  const usfmJson = usfm.toJSON(usfmContent);
  
  const analysis = {
    nonContiguousAlignments: [] as any[],
    multiWordAlignments: [] as any[],
    splitAlignments: [] as any[]
  };
  
  // Process each verse to find non-contiguous patterns
  for (const [chapterNum, chapterData] of Object.entries(usfmJson.chapters || {})) {
    for (const [verseNum, verseData] of Object.entries(chapterData as any)) {
      const verse = verseData as any;
      if (verseNum === 'front' || !verse.verseObjects) continue;
      
      const verseRef = `TST ${chapterNum}:${verseNum}`;
      console.log(`\n📖 Analyzing ${verseRef}:`);
      
      // Track alignments by source word
      const alignmentGroups = new Map<string, any[]>();
      
      // Process verse objects to group by alignment
      const processObjects = (objects: any[], depth = 0) => {
        const indent = '  '.repeat(depth);
        
        for (const obj of objects) {
          if (obj.type === 'milestone' && obj.tag === 'zaln') {
            const sourceWord = obj['x-content'] || obj.content || 'unknown';
            const strong = obj['x-strong'] || obj.strong || 'unknown';
            const key = `${strong}:${sourceWord}`;
            
            if (!alignmentGroups.has(key)) {
              alignmentGroups.set(key, []);
            }
            
            console.log(`${indent}🔗 Alignment: ${strong} "${sourceWord}"`);
            
            if (obj.children) {
              const targetWords: string[] = [];
              
              // Extract target words from children
              const extractWords = (children: any[]) => {
                for (const child of children) {
                  if (child.type === 'word' && child.tag === 'w') {
                    targetWords.push(child.text);
                    console.log(`${indent}  ➤ Target word: "${child.text}" (occ: ${child['x-occurrence'] || child.occurrence || '?'})`);
                  } else if (child.type === 'text') {
                    // Skip text nodes (punctuation, spaces)
                  } else if (child.children) {
                    extractWords(child.children);
                  }
                }
              };
              
              extractWords(obj.children);
              
              alignmentGroups.get(key)!.push({
                verseRef,
                sourceWord,
                strong,
                targetWords,
                position: alignmentGroups.get(key)!.length
              });
            }
          } else if (obj.children) {
            processObjects(obj.children, depth + 1);
          }
        }
      };
      
      processObjects(verse.verseObjects);
      
      // Analyze alignment patterns
      for (const [key, alignments] of alignmentGroups) {
        if (alignments.length > 1) {
          console.log(`\n  🎯 NON-CONTIGUOUS ALIGNMENT DETECTED:`);
          console.log(`     Source: ${key}`);
          console.log(`     Appears ${alignments.length} times in verse`);
          
          alignments.forEach((alignment, i) => {
            console.log(`     Instance ${i + 1}: [${alignment.targetWords.join(', ')}]`);
          });
          
          analysis.nonContiguousAlignments.push({
            verseRef,
            sourceKey: key,
            instances: alignments.length,
            allTargetWords: alignments.flatMap(a => a.targetWords)
          });
        }
        
        // Check for multi-word alignments (single source -> multiple target words)
        const singleAlignment = alignments[0];
        if (singleAlignment && singleAlignment.targetWords.length > 1) {
          console.log(`\n  🔀 MULTI-WORD ALIGNMENT:`);
          console.log(`     Source: "${singleAlignment.sourceWord}" (${singleAlignment.strong})`);
          console.log(`     Target: [${singleAlignment.targetWords.join(', ')}]`);
          
          analysis.multiWordAlignments.push({
            verseRef,
            sourceWord: singleAlignment.sourceWord,
            strong: singleAlignment.strong,
            targetWords: singleAlignment.targetWords
          });
        }
      }
    }
  }
  
  // Summary
  console.log('\n📊 ANALYSIS SUMMARY:');
  console.log('='.repeat(40));
  console.log(`Non-contiguous alignments: ${analysis.nonContiguousAlignments.length}`);
  console.log(`Multi-word alignments: ${analysis.multiWordAlignments.length}`);
  
  if (analysis.nonContiguousAlignments.length > 0) {
    console.log('\n🎯 NON-CONTIGUOUS EXAMPLES:');
    analysis.nonContiguousAlignments.forEach((item, i) => {
      console.log(`${i + 1}. ${item.verseRef}: "${item.sourceKey}" → [${item.allTargetWords.join(', ')}] (${item.instances} instances)`);
    });
  }
  
  if (analysis.multiWordAlignments.length > 0) {
    console.log('\n🔀 MULTI-WORD EXAMPLES:');
    analysis.multiWordAlignments.forEach((item, i) => {
      console.log(`${i + 1}. ${item.verseRef}: "${item.sourceWord}" (${item.strong}) → [${item.targetWords.join(', ')}]`);
    });
  }
  
  // Save results
  const outputDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(outputDir, 'non-contiguous-analysis.json'),
    JSON.stringify(analysis, null, 2)
  );
  
  console.log('\n✅ Analysis complete! Results saved to test-output/non-contiguous-analysis.json');
  
  return analysis;
}

/**
 * Demonstrate how this affects inter-panel communication
 */
function demonstrateInterPanelImpact(analysis: any) {
  console.log('\n🔗 INTER-PANEL COMMUNICATION IMPLICATIONS:');
  console.log('='.repeat(50));
  
  console.log('\n1. 🎯 HIGHLIGHTING CHALLENGES:');
  console.log('   - Single Greek word maps to multiple English words');
  console.log('   - Need to highlight ALL instances when user hovers one');
  console.log('   - Must track word groups, not just individual words');
  
  console.log('\n2. 🔀 ALIGNMENT RESOLUTION:');
  console.log('   - Same Strong\'s number appears multiple times in verse');
  console.log('   - Need occurrence tracking to distinguish instances');
  console.log('   - Alignment keys must include position/occurrence data');
  
  console.log('\n3. 📝 TRANSLATION NOTES IMPACT:');
  console.log('   - TN quotes may reference any instance of the word');
  console.log('   - Need to match quote + occurrence to specific instance');
  console.log('   - Multiple highlight targets for single TN entry');
  
  console.log('\n4. 💡 SOLUTION APPROACH:');
  console.log('   ✓ Group tokens by Strong\'s number + lemma');
  console.log('   ✓ Track occurrence within verse for each group');
  console.log('   ✓ Highlight all instances in group when one is selected');
  console.log('   ✓ Use compound alignment keys for messaging');
  
  // Example message format
  const exampleMessage = {
    type: 'word_highlight',
    sourceWord: {
      strong: 'G37560',
      lemma: 'ὅς',
      text: 'ὃς'
    },
    targetInstances: [
      { text: 'he', position: { start: 4, end: 6 }, occurrence: 1 },
      { text: 'who', position: { start: 15, end: 18 }, occurrence: 1 },
      { text: 'he', position: { start: 23, end: 25 }, occurrence: 2 }
    ],
    verseRef: 'TST 1:1'
  };
  
  console.log('\n📨 EXAMPLE MESSAGE FORMAT:');
  console.log(JSON.stringify(exampleMessage, null, 2));
}

// Run the test
if (require.main === module) {
  const analysis = testNonContiguousAlignments();
  demonstrateInterPanelImpact(analysis);
}

export { testNonContiguousAlignments };

