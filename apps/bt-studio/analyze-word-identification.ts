#!/usr/bin/env ts-node

/**
 * Analyze Word Identification System in USFM Alignment
 * Demonstrates how words are uniquely identified by content + occurrence + verse reference
 */

import * as fs from 'fs';
import * as path from 'path';

// @ts-ignore - usfm-js doesn't have type declarations
import * as usfm from 'usfm-js';

// Word identification interfaces
interface WordId {
  content: string;           // The actual word text
  occurrence: number;        // Which occurrence in the verse (1-based)
  verseRef: string;          // Chapter:verse reference
  uniqueId: string;          // Computed unique identifier
}

interface AlignmentReference {
  sourceWordId: WordId;      // Original language word ID
  targetWordId: WordId;      // Target language word ID
  strong: string;            // Strong's number
  lemma: string;             // Greek/Hebrew lemma
}

/**
 * Create unique word ID from content, occurrence, and verse reference
 */
function createWordId(content: string, occurrence: number, verseRef: string): WordId {
  const uniqueId = `${verseRef}:${content}:${occurrence}`;
  return {
    content,
    occurrence,
    verseRef,
    uniqueId
  };
}

/**
 * Extract word identification data from USFM
 */
function analyzeWordIdentification(usfmContent: string) {
  console.log('🔍 Analyzing Word Identification System\n');
  
  const usfmJson = usfm.toJSON(usfmContent);
  const wordRegistry = new Map<string, WordId>();
  const alignmentReferences: AlignmentReference[] = [];
  
  // Process each verse
  for (const [chapterNum, chapterData] of Object.entries(usfmJson.chapters || {})) {
    for (const [verseNum, verseData] of Object.entries(chapterData as any)) {
      const verse = verseData as any;
      if (verseNum === 'front' || !verse.verseObjects) continue;
      
      const verseRef = `TST ${chapterNum}:${verseNum}`;
      console.log(`📖 Processing ${verseRef}:`);
      
      // Track word occurrences in this verse
      const wordOccurrences = new Map<string, number>();
      
      const processObjects = (objects: any[], alignmentContext?: any) => {
        for (const obj of objects) {
          if (obj.type === 'word' && obj.tag === 'w') {
            const content = obj.text;
            const declaredOccurrence = parseInt(obj['x-occurrence'] || obj.occurrence || '1');
            
            // Calculate actual occurrence (for validation)
            const currentCount = wordOccurrences.get(content) || 0;
            wordOccurrences.set(content, currentCount + 1);
            const actualOccurrence = currentCount + 1;
            
            // Create word ID
            const targetWordId = createWordId(content, declaredOccurrence, verseRef);
            wordRegistry.set(targetWordId.uniqueId, targetWordId);
            
            console.log(`   🎯 Target Word: "${content}"`);
            console.log(`      Declared occurrence: ${declaredOccurrence}`);
            console.log(`      Actual occurrence: ${actualOccurrence}`);
            console.log(`      Unique ID: ${targetWordId.uniqueId}`);
            
            // Validate occurrence consistency
            if (declaredOccurrence !== actualOccurrence) {
              console.log(`      ⚠️  MISMATCH: Declared ${declaredOccurrence} vs Actual ${actualOccurrence}`);
            }
            
            // If we're in an alignment context, create source word ID and alignment reference
            if (alignmentContext) {
              const sourceContent = alignmentContext['x-content'] || alignmentContext.content || '';
              const sourceOccurrence = parseInt(alignmentContext['x-occurrence'] || alignmentContext.occurrence || '1');
              const strong = alignmentContext['x-strong'] || alignmentContext.strong || '';
              const lemma = alignmentContext['x-lemma'] || alignmentContext.lemma || '';
              
              const sourceWordId = createWordId(sourceContent, sourceOccurrence, verseRef);
              
              console.log(`      🔗 Aligned to: "${sourceContent}" (occurrence ${sourceOccurrence})`);
              console.log(`         Source ID: ${sourceWordId.uniqueId}`);
              console.log(`         Strong's: ${strong}`);
              
              // Create alignment reference
              const alignmentRef: AlignmentReference = {
                sourceWordId,
                targetWordId,
                strong,
                lemma
              };
              alignmentReferences.push(alignmentRef);
            }
            
            console.log('');
            
          } else if (obj.type === 'milestone' && obj.tag === 'zaln') {
            // Process alignment and its children
            if (obj.children) {
              processObjects(obj.children, obj);
            }
          } else if (obj.children) {
            processObjects(obj.children, alignmentContext);
          }
        }
      };
      
      processObjects(verse.verseObjects);
      console.log('');
    }
  }
  
  return { wordRegistry, alignmentReferences };
}

/**
 * Demonstrate word identification patterns
 */
function demonstrateIdentificationPatterns(wordRegistry: Map<string, WordId>, alignmentReferences: AlignmentReference[]) {
  console.log('📊 WORD IDENTIFICATION ANALYSIS:');
  console.log('='.repeat(50));
  
  // Group words by content to show occurrence patterns
  const wordsByContent = new Map<string, WordId[]>();
  for (const wordId of wordRegistry.values()) {
    const content = wordId.content;
    if (!wordsByContent.has(content)) {
      wordsByContent.set(content, []);
    }
    wordsByContent.get(content)!.push(wordId);
  }
  
  console.log('\n🔤 WORDS WITH MULTIPLE OCCURRENCES:');
  for (const [content, words] of wordsByContent) {
    if (words.length > 1) {
      console.log(`\n"${content}" appears ${words.length} times:`);
      words.forEach(word => {
        console.log(`   ${word.uniqueId}`);
      });
    }
  }
  
  console.log('\n🔗 ALIGNMENT REFERENCE EXAMPLES:');
  alignmentReferences.slice(0, 5).forEach((ref, i) => {
    console.log(`\n${i + 1}. Alignment Reference:`);
    console.log(`   Source: ${ref.sourceWordId.uniqueId}`);
    console.log(`   Target: ${ref.targetWordId.uniqueId}`);
    console.log(`   Strong's: ${ref.strong}`);
    console.log(`   Lemma: ${ref.lemma}`);
  });
  
  // Demonstrate non-contiguous alignment identification
  console.log('\n🎯 NON-CONTIGUOUS ALIGNMENT IDENTIFICATION:');
  
  // Group alignments by source word (same Strong's + lemma + content)
  const alignmentGroups = new Map<string, AlignmentReference[]>();
  
  for (const ref of alignmentReferences) {
    const groupKey = `${ref.strong}:${ref.lemma}:${ref.sourceWordId.content}`;
    if (!alignmentGroups.has(groupKey)) {
      alignmentGroups.set(groupKey, []);
    }
    alignmentGroups.get(groupKey)!.push(ref);
  }
  
  // Show non-contiguous groups
  for (const [groupKey, refs] of alignmentGroups) {
    if (refs.length > 1) {
      console.log(`\nNon-contiguous group: ${groupKey}`);
      console.log(`Source word appears ${refs.length} times in alignment:`);
      refs.forEach((ref, i) => {
        console.log(`   ${i + 1}. ${ref.sourceWordId.uniqueId} → ${ref.targetWordId.uniqueId}`);
      });
      
      // Show how to identify all related words
      const targetWords = refs.map(ref => ref.targetWordId.content);
      console.log(`   Target words to highlight together: [${targetWords.join(', ')}]`);
    }
  }
}

/**
 * Generate inter-panel communication message format
 */
function generateMessageFormat(alignmentReferences: AlignmentReference[]) {
  console.log('\n📨 INTER-PANEL COMMUNICATION MESSAGE FORMAT:');
  console.log('='.repeat(55));
  
  // Find a non-contiguous alignment example
  const alignmentGroups = new Map<string, AlignmentReference[]>();
  
  for (const ref of alignmentReferences) {
    const groupKey = `${ref.strong}:${ref.lemma}:${ref.sourceWordId.content}`;
    if (!alignmentGroups.has(groupKey)) {
      alignmentGroups.set(groupKey, []);
    }
    alignmentGroups.get(groupKey)!.push(ref);
  }
  
  const nonContiguousGroup = Array.from(alignmentGroups.values()).find(refs => refs.length > 1);
  
  if (nonContiguousGroup) {
    const message = {
      type: 'word_alignment_highlight',
      sourceWord: {
        id: nonContiguousGroup[0].sourceWordId.uniqueId,
        content: nonContiguousGroup[0].sourceWordId.content,
        strong: nonContiguousGroup[0].strong,
        lemma: nonContiguousGroup[0].lemma
      },
      targetWords: nonContiguousGroup.map(ref => ({
        id: ref.targetWordId.uniqueId,
        content: ref.targetWordId.content,
        occurrence: ref.targetWordId.occurrence,
        verseRef: ref.targetWordId.verseRef
      })),
      alignmentType: 'non_contiguous',
      action: 'highlight_all_related'
    };
    
    console.log('\nExample message for highlighting non-contiguous words:');
    console.log(JSON.stringify(message, null, 2));
  }
  
  console.log('\n🎯 KEY INSIGHTS:');
  console.log('================');
  console.log('✅ Each word has unique ID: verseRef:content:occurrence');
  console.log('✅ Alignment references connect source and target word IDs');
  console.log('✅ Non-contiguous words share same source word properties');
  console.log('✅ Inter-panel messages can reference exact word instances');
  console.log('✅ TN/TWL/TQ can match quotes using word IDs');
}

/**
 * Main analysis function
 */
function runWordIdentificationAnalysis() {
  console.log('🚀 Word Identification System Analysis\n');
  
  // Read the test USFM file
  const usfmPath = path.join(__dirname, 'test-non-contiguous-alignment.usfm');
  const usfmContent = fs.readFileSync(usfmPath, 'utf8');
  
  // Analyze word identification
  const { wordRegistry, alignmentReferences } = analyzeWordIdentification(usfmContent);
  
  // Demonstrate patterns
  demonstrateIdentificationPatterns(wordRegistry, alignmentReferences);
  
  // Generate message format
  generateMessageFormat(alignmentReferences);
  
  // Save results
  const outputDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const results = {
    wordRegistry: Array.from(wordRegistry.values()),
    alignmentReferences,
    totalWords: wordRegistry.size,
    totalAlignments: alignmentReferences.length
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'word-identification-analysis.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('\n✅ Analysis complete! Results saved to test-output/word-identification-analysis.json');
}

// Run the analysis
if (require.main === module) {
  runWordIdentificationAnalysis();
}

export { runWordIdentificationAnalysis };

