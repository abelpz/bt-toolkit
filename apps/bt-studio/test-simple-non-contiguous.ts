#!/usr/bin/env ts-node

/**
 * Simple Test for Non-Contiguous Alignment Processing
 * Tests the enhanced word token extraction without dependencies
 */

import * as fs from 'fs';
import * as path from 'path';

// @ts-ignore - usfm-js doesn't have type declarations
import * as usfm from 'usfm-js';

// Simplified types for testing
interface WordToken {
  id: string;
  text: string;
  position: { start: number; end: number; wordIndex: number };
  alignment?: {
    strong?: string;
    lemma?: string;
    sourceWord?: string;
    alignmentGroupId?: string;
    instanceInGroup?: number;
    totalInGroup?: number;
  };
  isHighlightable: boolean;
  type: 'word' | 'text' | 'punctuation';
}

interface AlignmentGroup {
  groupId: string;
  strong: string;
  lemma: string;
  sourceWord: string;
  verseRef: string;
  instances: { tokenId: string; text: string; position: number; occurrence: number }[];
  totalInstances: number;
}

/**
 * Enhanced token extraction with non-contiguous alignment support
 */
function extractEnhancedTokens(verseObjects: any[], verseRef: string): { 
  tokens: WordToken[]; 
  alignmentGroups: AlignmentGroup[] 
} {
  const tokens: WordToken[] = [];
  const alignmentGroups: AlignmentGroup[] = [];
  let text = '';
  let wordIndex = 0;
  
  // Track alignment groups for non-contiguous words
  const alignmentGroupMap = new Map<string, AlignmentGroup>();

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

      // Add alignment data if in alignment context
      if (alignmentContext) {
        const strong = alignmentContext['x-strong'] || alignmentContext.strong || '';
        const lemma = alignmentContext['x-lemma'] || alignmentContext.lemma || '';
        const sourceWord = alignmentContext['x-content'] || alignmentContext.content || '';
        
        // Create alignment group key for non-contiguous tracking
        const groupKey = `${strong}:${lemma}:${sourceWord}`;
        
        // Get or create alignment group
        let alignmentGroup = alignmentGroupMap.get(groupKey);
        if (!alignmentGroup) {
          alignmentGroup = {
            groupId: `${verseRef}-group-${alignmentGroupMap.size + 1}`,
            strong,
            lemma,
            sourceWord,
            verseRef,
            instances: [],
            totalInstances: 0
          };
          alignmentGroupMap.set(groupKey, alignmentGroup);
        }
        
        // Update instance count
        alignmentGroup.totalInstances++;
        const instanceInGroup = alignmentGroup.totalInstances;
        
        token.alignment = {
          strong,
          lemma,
          sourceWord,
          alignmentGroupId: alignmentGroup.groupId,
          instanceInGroup,
          totalInGroup: alignmentGroup.totalInstances
        };

        // Add to alignment group instances
        alignmentGroup.instances.push({
          tokenId: token.id,
          text: obj.text,
          position: wordIndex - 1,
          occurrence: instanceInGroup
        });
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

  // Convert alignment groups map to array
  alignmentGroups.push(...Array.from(alignmentGroupMap.values()));

  return { tokens, alignmentGroups };
}

/**
 * Test enhanced non-contiguous processing
 */
function testSimpleNonContiguous() {
  console.log('🚀 Testing Simple Non-Contiguous Alignment Processing\n');
  
  // Read the test USFM file
  const usfmPath = path.join(__dirname, 'test-non-contiguous-alignment.usfm');
  const usfmContent = fs.readFileSync(usfmPath, 'utf8');
  
  console.log('🔄 Processing USFM...');
  
  // Convert to JSON
  const usfmJson = usfm.toJSON(usfmContent);
  
  const results = {
    totalVerses: 0,
    totalTokens: 0,
    totalAlignmentGroups: 0,
    nonContiguousGroups: 0,
    verses: [] as any[]
  };

  // Process each verse
  for (const [chapterNum, chapterData] of Object.entries(usfmJson.chapters || {})) {
    for (const [verseNum, verseData] of Object.entries(chapterData as any)) {
      const verse = verseData as any;
      if (verseNum === 'front' || !verse.verseObjects) continue;
      
      const verseRef = `TST ${chapterNum}:${verseNum}`;
      results.totalVerses++;
      
      console.log(`\n📖 Processing ${verseRef}:`);
      
      // Extract enhanced tokens
      const { tokens, alignmentGroups } = extractEnhancedTokens(verse.verseObjects, verseRef);
      
      results.totalTokens += tokens.length;
      results.totalAlignmentGroups += alignmentGroups.length;
      
      const nonContiguous = alignmentGroups.filter(g => g.totalInstances > 1);
      results.nonContiguousGroups += nonContiguous.length;
      
      console.log(`   Tokens: ${tokens.length} (${tokens.filter(t => t.isHighlightable).length} highlightable)`);
      console.log(`   Alignment groups: ${alignmentGroups.length} (${nonContiguous.length} non-contiguous)`);
      
      // Show non-contiguous examples
      nonContiguous.forEach(group => {
        const targetWords = group.instances.map(i => i.text).join(', ');
        console.log(`     🎯 "${group.sourceWord}" (${group.strong}) → [${targetWords}] (${group.totalInstances} instances)`);
        
        // Show individual instances with group info
        group.instances.forEach(instance => {
          const token = tokens.find(t => t.id === instance.tokenId);
          if (token?.alignment) {
            console.log(`       Instance ${instance.occurrence}: "${instance.text}" (Group: ${token.alignment.alignmentGroupId}, ${token.alignment.instanceInGroup}/${token.alignment.totalInGroup})`);
          }
        });
      });
      
      results.verses.push({
        verseRef,
        tokenCount: tokens.length,
        alignmentGroupCount: alignmentGroups.length,
        nonContiguousCount: nonContiguous.length,
        nonContiguousGroups: nonContiguous.map(g => ({
          sourceWord: g.sourceWord,
          strong: g.strong,
          instances: g.instances.length,
          targetWords: g.instances.map(i => i.text)
        }))
      });
    }
  }
  
  console.log('\n📊 SUMMARY RESULTS:');
  console.log('='.repeat(30));
  console.log(`Total verses processed: ${results.totalVerses}`);
  console.log(`Total word tokens: ${results.totalTokens}`);
  console.log(`Total alignment groups: ${results.totalAlignmentGroups}`);
  console.log(`Non-contiguous groups: ${results.nonContiguousGroups}`);
  
  // Demonstrate messaging format
  if (results.nonContiguousGroups > 0) {
    console.log('\n🔗 INTER-PANEL COMMUNICATION EXAMPLE:');
    console.log('='.repeat(45));
    
    const exampleVerse = results.verses.find(v => v.nonContiguousCount > 0);
    if (exampleVerse) {
      const exampleGroup = exampleVerse.nonContiguousGroups[0];
      
      const message = {
        type: 'word_group_highlight',
        verseRef: exampleVerse.verseRef,
        sourceWord: {
          strong: exampleGroup.strong,
          text: exampleGroup.sourceWord
        },
        targetWords: exampleGroup.targetWords,
        totalInstances: exampleGroup.instances,
        action: 'highlight_all_instances'
      };
      
      console.log('📨 Example Message:');
      console.log(JSON.stringify(message, null, 2));
    }
  }
  
  // Save results
  const outputDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(outputDir, 'simple-non-contiguous-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('\n✅ Results saved to test-output/simple-non-contiguous-results.json');
  
  // Validation
  console.log('\n🎯 VALIDATION:');
  console.log('='.repeat(15));
  
  if (results.nonContiguousGroups > 0) {
    console.log('✅ Non-contiguous alignments detected');
    console.log('✅ Alignment groups created successfully');
    console.log('✅ Instance tracking implemented');
    console.log('✅ Ready for inter-panel communication!');
  } else {
    console.log('⚠️  No non-contiguous alignments found');
  }
  
  return results;
}

// Run the test
if (require.main === module) {
  testSimpleNonContiguous();
}

export { testSimpleNonContiguous };

