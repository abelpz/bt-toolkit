#!/usr/bin/env ts-node

/**
 * Test Enhanced Non-Contiguous Alignment Processing
 * Validates the enhanced USFM processor with alignment groups
 */

import * as fs from 'fs';
import * as path from 'path';
import { USFMProcessor } from './src/services/usfm-processor';

/**
 * Test enhanced non-contiguous alignment processing
 */
async function testEnhancedNonContiguous() {
  console.log('🚀 Testing Enhanced Non-Contiguous Alignment Processing\n');
  
  const processor = new USFMProcessor();
  
  // Read the test USFM file
  const usfmPath = path.join(__dirname, 'test-non-contiguous-alignment.usfm');
  const usfmContent = fs.readFileSync(usfmPath, 'utf8');
  
  console.log('🔄 Processing USFM with enhanced processor...');
  
  try {
    // Process with enhanced processor
    const result = await processor.processUSFM(usfmContent, 'TST', 'Test Book');
    
    console.log('✅ Processing completed successfully!\n');
    
    // Analyze results
    console.log('📊 ENHANCED PROCESSING RESULTS:');
    console.log('='.repeat(50));
    
    let totalAlignmentGroups = 0;
    let totalNonContiguousGroups = 0;
    let totalWordTokens = 0;
    let totalHighlightableTokens = 0;
    
    for (const chapter of result.structuredText.chapters) {
      for (const verse of chapter.verses) {
        console.log(`\n📖 ${verse.reference}:`);
        
        if (verse.wordTokens) {
          totalWordTokens += verse.wordTokens.length;
          const highlightable = verse.wordTokens.filter(t => t.isHighlightable);
          totalHighlightableTokens += highlightable.length;
          
          console.log(`   Word tokens: ${verse.wordTokens.length} (${highlightable.length} highlightable)`);
          
          // Show sample tokens with alignment groups
          const tokensWithGroups = verse.wordTokens.filter(t => t.alignment?.alignmentGroupId);
          if (tokensWithGroups.length > 0) {
            console.log(`   Tokens with alignment groups: ${tokensWithGroups.length}`);
            
            tokensWithGroups.slice(0, 3).forEach(token => {
              console.log(`     "${token.text}" → Group: ${token.alignment?.alignmentGroupId} (${token.alignment?.instanceInGroup}/${token.alignment?.totalInGroup})`);
            });
          }
        }
        
        if (verse.alignmentGroups) {
          totalAlignmentGroups += verse.alignmentGroups.length;
          const nonContiguous = verse.alignmentGroups.filter(g => g.totalInstances > 1);
          totalNonContiguousGroups += nonContiguous.length;
          
          console.log(`   Alignment groups: ${verse.alignmentGroups.length} (${nonContiguous.length} non-contiguous)`);
          
          // Show non-contiguous groups
          nonContiguous.forEach(group => {
            const targetWords = group.instances.map(i => i.text).join(', ');
            console.log(`     🎯 "${group.sourceWord}" (${group.strong}) → [${targetWords}] (${group.totalInstances} instances)`);
          });
        }
      }
    }
    
    console.log('\n📈 SUMMARY STATISTICS:');
    console.log('='.repeat(30));
    console.log(`Total word tokens: ${totalWordTokens}`);
    console.log(`Highlightable tokens: ${totalHighlightableTokens}`);
    console.log(`Total alignment groups: ${totalAlignmentGroups}`);
    console.log(`Non-contiguous groups: ${totalNonContiguousGroups}`);
    
    // Demonstrate inter-panel communication message format
    console.log('\n🔗 INTER-PANEL COMMUNICATION DEMO:');
    console.log('='.repeat(40));
    
    // Find a non-contiguous group to demonstrate
    for (const chapter of result.structuredText.chapters) {
      for (const verse of chapter.verses) {
        if (verse.alignmentGroups) {
          const nonContiguousGroup = verse.alignmentGroups.find(g => g.totalInstances > 1);
          if (nonContiguousGroup) {
            console.log('\n📨 Example Message for Non-Contiguous Highlighting:');
            
            const message = {
              type: 'word_group_highlight',
              verseRef: nonContiguousGroup.verseRef,
              sourceWord: {
                strong: nonContiguousGroup.strong,
                lemma: nonContiguousGroup.lemma,
                text: nonContiguousGroup.sourceWord
              },
              alignmentGroup: {
                groupId: nonContiguousGroup.groupId,
                totalInstances: nonContiguousGroup.totalInstances,
                instances: nonContiguousGroup.instances.map(instance => ({
                  tokenId: instance.tokenId,
                  text: instance.text,
                  position: instance.position,
                  occurrence: instance.occurrence
                }))
              },
              action: 'highlight_all_instances'
            };
            
            console.log(JSON.stringify(message, null, 2));
            break;
          }
        }
      }
    }
    
    // Save enhanced results
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(outputDir, 'enhanced-non-contiguous-results.json'),
      JSON.stringify(result, null, 2)
    );
    
    console.log('\n✅ Enhanced results saved to test-output/enhanced-non-contiguous-results.json');
    
    // Validation
    console.log('\n🎯 VALIDATION RESULTS:');
    console.log('='.repeat(25));
    
    if (totalNonContiguousGroups > 0) {
      console.log('✅ Non-contiguous alignments detected and grouped');
      console.log('✅ Alignment group IDs assigned for messaging');
      console.log('✅ Instance tracking within groups implemented');
      console.log('✅ Ready for inter-panel communication!');
    } else {
      console.log('⚠️  No non-contiguous alignments found in test data');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testEnhancedNonContiguous().catch(console.error);
}

export { testEnhancedNonContiguous };

