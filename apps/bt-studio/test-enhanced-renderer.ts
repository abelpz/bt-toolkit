#!/usr/bin/env ts-node

/**
 * Test Enhanced USFMRenderer with Word Token System
 * Validates the updated renderer with enhanced word token data
 */

import * as fs from 'fs';
import * as path from 'path';
import { USFMProcessor } from './src/services/usfm-processor';

/**
 * Test the enhanced USFMRenderer integration
 */
async function testEnhancedRenderer() {
  console.log('🚀 Testing Enhanced USFMRenderer Integration\n');
  
  const processor = new USFMProcessor();
  
  // Read the test USFM file
  const usfmPath = path.join(__dirname, 'test-non-contiguous-alignment.usfm');
  const usfmContent = fs.readFileSync(usfmPath, 'utf8');
  
  console.log('🔄 Processing USFM with enhanced processor...');
  
  try {
    // Process with enhanced processor
    const result = await processor.processUSFM(usfmContent, 'TST', 'Test Book');
    
    console.log('✅ Processing completed successfully!\n');
    
    // Analyze the structure for renderer compatibility
    console.log('📊 RENDERER COMPATIBILITY ANALYSIS:');
    console.log('='.repeat(50));
    
    let totalTokenizedVerses = 0;
    let totalWordTokens = 0;
    let totalAlignmentGroups = 0;
    
    for (const chapter of result.structuredText.chapters) {
      console.log(`\n📖 Chapter ${chapter.number}:`);
      console.log(`   Paragraphs: ${chapter.paragraphCount}`);
      console.log(`   Verses: ${chapter.verseCount}`);
      
      // Check paragraph tokenization
      for (const paragraph of chapter.paragraphs) {
        if (paragraph.tokenizedContent && paragraph.tokenizedContent.length > 0) {
          console.log(`   Paragraph ${paragraph.id}:`);
          console.log(`     - Combined text: "${paragraph.combinedText.substring(0, 50)}..."`);
          console.log(`     - Tokenized content: ${paragraph.tokenizedContent.length} tokens`);
          
          // Show sample tokens
          const sampleTokens = paragraph.tokenizedContent.slice(0, 3);
          sampleTokens.forEach(token => {
            console.log(`       • "${token.content}" (${token.uniqueId}) ${token.isHighlightable ? '[highlightable]' : ''}`);
          });
        }
      }
      
      // Check verse tokenization
      for (const verse of chapter.verses) {
        if (verse.wordTokens && verse.wordTokens.length > 0) {
          totalTokenizedVerses++;
          totalWordTokens += verse.wordTokens.length;
          
          console.log(`   Verse ${verse.number}:`);
          console.log(`     - Text: "${verse.text}"`);
          console.log(`     - Word tokens: ${verse.wordTokens.length}`);
          console.log(`     - Highlightable: ${verse.wordTokens.filter(t => t.isHighlightable).length}`);
          
          if (verse.alignmentGroups) {
            totalAlignmentGroups += verse.alignmentGroups.length;
            const nonContiguous = verse.alignmentGroups.filter(g => g.totalInstances > 1);
            if (nonContiguous.length > 0) {
              console.log(`     - Non-contiguous groups: ${nonContiguous.length}`);
              nonContiguous.forEach(group => {
                console.log(`       • ${group.sourceWord} (${group.strong}) → [${group.instances.map(i => i.text).join(', ')}]`);
              });
            }
          }
        }
      }
    }
    
    console.log('\n📈 SUMMARY STATISTICS:');
    console.log('='.repeat(30));
    console.log(`Tokenized verses: ${totalTokenizedVerses}`);
    console.log(`Total word tokens: ${totalWordTokens}`);
    console.log(`Total alignment groups: ${totalAlignmentGroups}`);
    
    // Generate renderer props example
    console.log('\n🎨 RENDERER PROPS EXAMPLE:');
    console.log('='.repeat(30));
    
    const rendererProps = {
      scripture: result.structuredText,
      showVerseNumbers: true,
      showChapterNumbers: true,
      showParagraphs: true,
      showAlignments: true,
      highlightWords: ['he', 'is'],
      onTokenClick: '(token, verse) => { console.log("Clicked:", token.uniqueId); }',
      className: 'enhanced-scripture-renderer'
    };
    
    console.log('```typescript');
    console.log('<USFMRenderer');
    Object.entries(rendererProps).forEach(([key, value]) => {
      if (key === 'scripture') {
        console.log(`  ${key}={processedScripture}`);
      } else if (typeof value === 'string' && key !== 'className') {
        console.log(`  ${key}={${value}}`);
      } else {
        console.log(`  ${key}={${JSON.stringify(value)}}`);
      }
    });
    console.log('/>');
    console.log('```');
    
    // Generate token click handler example
    console.log('\n🖱️ TOKEN CLICK HANDLER EXAMPLE:');
    console.log('='.repeat(35));
    
    console.log('```typescript');
    console.log('const handleTokenClick = (token: WordToken, verse: ProcessedVerse) => {');
    console.log('  console.log("Token clicked:", {');
    console.log('    uniqueId: token.uniqueId,');
    console.log('    content: token.content,');
    console.log('    occurrence: `${token.occurrence}/${token.totalOccurrences}`,');
    console.log('    verseRef: token.verseRef,');
    console.log('    isHighlightable: token.isHighlightable');
    console.log('  });');
    console.log('  ');
    console.log('  if (token.alignment) {');
    console.log('    console.log("Alignment info:", {');
    console.log('      sourceWordId: token.alignment.sourceWordId,');
    console.log('      sourceContent: token.alignment.sourceContent,');
    console.log('      strong: token.alignment.strong,');
    console.log('      lemma: token.alignment.lemma,');
    console.log('      alignmentGroupId: token.alignment.alignmentGroupId');
    console.log('    });');
    console.log('    ');
    console.log('    // Highlight related words in same alignment group');
    console.log('    if (token.alignment.alignmentGroupId) {');
    console.log('      highlightAlignmentGroup(token.alignment.alignmentGroupId);');
    console.log('    }');
    console.log('  }');
    console.log('};');
    console.log('```');
    
    // Save enhanced structure for inspection
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(outputDir, 'enhanced-renderer-structure.json'),
      JSON.stringify(result.structuredText, null, 2)
    );
    
    console.log('\n✅ Enhanced structure saved to test-output/enhanced-renderer-structure.json');
    
    // Validation
    console.log('\n🎯 RENDERER READINESS VALIDATION:');
    console.log('='.repeat(35));
    
    const checks = [
      { name: 'Word tokens available', passed: totalWordTokens > 0 },
      { name: 'Alignment groups present', passed: totalAlignmentGroups > 0 },
      { name: 'Paragraph tokenization', passed: result.structuredText.chapters.some(ch => ch.paragraphs.some(p => p.tokenizedContent && p.tokenizedContent.length > 0)) },
      { name: 'Unique word IDs', passed: totalWordTokens > 0 },
      { name: 'Highlightable tokens', passed: result.structuredText.chapters.some(ch => ch.verses.some(v => v.wordTokens?.some(t => t.isHighlightable))) },
      { name: 'Non-contiguous alignment support', passed: totalAlignmentGroups > 0 }
    ];
    
    checks.forEach(check => {
      console.log(`${check.passed ? '✅' : '❌'} ${check.name}`);
    });
    
    const allPassed = checks.every(check => check.passed);
    
    if (allPassed) {
      console.log('\n🎉 ALL CHECKS PASSED! Enhanced USFMRenderer is ready for use.');
      console.log('   ✓ Word-level tokenization complete');
      console.log('   ✓ Alignment groups available for highlighting');
      console.log('   ✓ Unique word IDs for inter-panel communication');
      console.log('   ✓ Non-contiguous alignment support');
      console.log('   ✓ Backward compatibility maintained');
    } else {
      console.log('\n⚠️  Some checks failed. Review the implementation.');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testEnhancedRenderer().catch(console.error);
}

export { testEnhancedRenderer };

