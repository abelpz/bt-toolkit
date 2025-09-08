/**
 * Test script for USFM processor nested alignment handling
 * Tests the specific case of nested \zaln-s and \zaln-e markers
 */

import { USFMProcessor } from './src/services/usfm-processor';

// Test USFM content with nested alignment markers
const testUSFM = `\\id JON unfoldingWord Literal Text
\\h Jonah
\\toc1 The Book of Jonah
\\toc2 Jonah
\\toc3 Jon
\\mt Jonah

\\c 1
\\p
\\v 1 \\zaln-s |x-strong="G25320" x-lemma="καί" x-morph="Gr,CC,,,,,,,," x-occurrence="1" x-occurrences="1" x-content="καὶ"\\*\\w Now|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*
\\w revealed|x-occurrence="1" x-occurrences="1"\\w*
\\zaln-s |x-strong="G08460" x-lemma="αὐτός" x-morph="Gr,RP,,,3GMS," x-occurrence="1" x-occurrences="1" x-content="αὐτοῦ"\\*\\w his|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*
\\zaln-s |x-strong="G35880" x-lemma="ὁ" x-morph="Gr,EA,,,,AMS," x-occurrence="1" x-occurrences="1" x-content="τὸν"\\*\\zaln-s |x-strong="G30560" x-lemma="λόγος" x-morph="Gr,N,,,,,AMS," x-occurrence="1" x-occurrences="1" x-content="λόγον"\\*\\w word|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*\\zaln-e\\*
to Jonah.`;

async function testNestedAlignment() {
  console.log('🧪 Testing USFM Processor with Nested Alignment Markers');
  console.log('=' .repeat(60));
  
  console.log('\n📝 Input USFM:');
  console.log(testUSFM);
  
  try {
    const processor = new USFMProcessor();
    const result = await processor.processUSFM(testUSFM, 'jon');
    
    console.log('\n✅ Processing completed successfully');
    console.log('=' .repeat(60));
    
    // Examine the processed scripture structure
    console.log('\n📊 Processed Scripture Structure:');
    console.log('Chapters:', result.structuredText.chapters.length);
    
    if (result.structuredText.chapters.length > 0) {
      const chapter1 = result.structuredText.chapters[0];
      console.log('Chapter 1 verses:', chapter1.verses.length);
      
      if (chapter1.verses.length > 0) {
        const verse1 = chapter1.verses[0];
        console.log('\n📖 Verse 1 Content:');
        console.log('- Number:', verse1.number);
        console.log('- Text:', verse1.text);
        console.log('- Words count:', verse1.words?.length || 0);
        
        // Examine word-level data
        if (verse1.words && verse1.words.length > 0) {
          console.log('\n🔤 Word Analysis:');
          verse1.words.forEach((word, index) => {
            console.log(`  ${index + 1}. "${word.text}" (${word.type})`);
            if (word.alignments && word.alignments.length > 0) {
              word.alignments.forEach((alignment, alignIndex) => {
                console.log(`     Alignment ${alignIndex + 1}: ${alignment.strong} (${alignment.lemma})`);
              });
            }
          });
        }
        
        // Check for any parsing issues
        console.log('\n🔍 Text Extraction Check:');
        const extractedText = verse1.text;
        const expectedWords = ['Now', 'revealed', 'his', 'word'];
        
        console.log('Expected words:', expectedWords);
        console.log('Extracted text:', extractedText);
        
        expectedWords.forEach(word => {
          if (extractedText.includes(word)) {
            console.log(`✅ Found: "${word}"`);
          } else {
            console.log(`❌ Missing: "${word}"`);
          }
        });
      }
    }
    
    // Examine alignment data
    console.log('\n🔗 Alignment Data:');
    if (result.alignments && result.alignments.length > 0) {
      console.log('Total alignments:', result.alignments.length);
      result.alignments.forEach((alignment, index) => {
        console.log(`  ${index + 1}. ${alignment.targetWords.join(' ')} → ${alignment.sourceWords.join(' ')} (${alignment.alignmentData[0]?.strong || 'N/A'})`);
        if (alignment.alignmentData[0]) {
          console.log(`      Strong: ${alignment.alignmentData[0].strong}, Lemma: ${alignment.alignmentData[0].lemma}`);
        }
      });
    } else {
      console.log('No alignments found');
    }
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testNestedAlignment().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('🚨 Test failed:', error);
  process.exit(1);
});
