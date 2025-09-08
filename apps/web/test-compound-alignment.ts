/**
 * Test compound alignment extraction for nested USFM structures
 */

import { USFMProcessor } from './src/services/usfm-processor';

// Test the specific nested alignment structure from your example
const testUSFM = `\\id TIT unfoldingWord Literal Text
\\h Titus
\\c 1
\\p
\\v 3 \\zaln-s |x-strong="G35880" x-lemma="ὁ" x-morph="Gr,EA,,,,AMS," x-occurrence="1" x-occurrences="1" x-content="τὸν"\\*\\zaln-s |x-strong="G30560" x-lemma="λόγος" x-morph="Gr,N,,,,,AMS," x-occurrence="1" x-occurrences="1" x-content="λόγον"\\*\\w word|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*\\zaln-e\\*`;

async function testCompoundAlignment() {
  console.log('🧪 Testing Compound Alignment Extraction');
  console.log('=' .repeat(50));
  
  console.log('\n📝 Input USFM (Nested Alignment):');
  console.log(testUSFM);
  
  try {
    const processor = new USFMProcessor();
    const result = await processor.processUSFM(testUSFM, 'tit');
    
    console.log('\n✅ Processing completed successfully');
    
    // Check alignments
    console.log('\n🔗 Alignment Analysis:');
    if (result.alignments && result.alignments.length > 0) {
      console.log('Total alignments:', result.alignments.length);
      
      result.alignments.forEach((alignment, index) => {
        console.log(`\n  Alignment ${index + 1}:`);
        console.log(`    Target Words: [${alignment.targetWords.join(', ')}]`);
        console.log(`    Source Words: [${alignment.sourceWords.join(', ')}]`);
        console.log(`    Alignment Data (${alignment.alignmentData.length} entries):`);
        
        alignment.alignmentData.forEach((data, dataIndex) => {
          console.log(`      ${dataIndex + 1}. ${data.strong} (${data.lemma}) - "${data.morph}"`);
        });
        
        // Check if this is the "word" alignment
        if (alignment.targetWords.includes('word')) {
          console.log(`\n    🎯 WORD ALIGNMENT FOUND:`);
          console.log(`    - Should have 2 Greek words: ὁ (G35880) + λόγος (G30560)`);
          console.log(`    - Actually has ${alignment.alignmentData.length} alignment(s):`);
          
          const hasArticle = alignment.alignmentData.some(d => d.strong === 'G35880');
          const hasNoun = alignment.alignmentData.some(d => d.strong === 'G30560');
          
          console.log(`    - ὁ (G35880): ${hasArticle ? '✅ Found' : '❌ Missing'}`);
          console.log(`    - λόγος (G30560): ${hasNoun ? '✅ Found' : '❌ Missing'}`);
          
          if (hasArticle && hasNoun) {
            console.log(`    🎉 SUCCESS: Compound alignment correctly includes both Greek words!`);
          } else {
            console.log(`    ❌ ISSUE: Missing alignment data for nested structure`);
          }
        }
      });
    } else {
      console.log('❌ No alignments found');
    }
    
    // Check verse text
    if (result.structuredText.chapters.length > 0) {
      const chapter1 = result.structuredText.chapters[0];
      if (chapter1.verses.length > 0) {
        const verse = chapter1.verses[0];
        console.log(`\n📖 Verse Text: "${verse.text}"`);
        
        if (verse.text.includes('word')) {
          console.log('✅ "word" is present in the text');
        } else {
          console.log('❌ "word" is missing from the text');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

testCompoundAlignment().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('🚨 Test failed:', error);
});
