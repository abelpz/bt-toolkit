/**
 * Test Titus processing to debug missing words
 */

import { USFMProcessor } from './src/services/usfm-processor';

// Test USFM content that might be causing the issue
const testTitusUSFM = `\\id TIT unfoldingWord Literal Text
\\h Titus
\\c 1
\\p
\\v 3 \\zaln-s |x-strong="G11610" x-lemma="δέ" x-morph="Gr,CC,,,,,,,," x-occurrence="1" x-occurrences="1" x-content="δὲ"\\*\\w But|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*
\\zaln-s |x-strong="G25400" x-lemma="καιρός" x-morph="Gr,N,,,,,DMP," x-occurrence="1" x-occurrences="1" x-content="καιροῖς"\\*\\w at|x-occurrence="1" x-occurrences="1"\\w* \\w the|x-occurrence="1" x-occurrences="2"\\w* \\w right|x-occurrence="1" x-occurrences="1"\\w* \\w time|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*,
\\zaln-s |x-strong="G53190" x-lemma="φανερόω" x-morph="Gr,V,IAA3,,S," x-occurrence="1" x-occurrences="1" x-content="ἐφανέρωσεν"\\*\\w he|x-occurrence="1" x-occurrences="1"\\w* \\w revealed|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*
\\zaln-s |x-strong="G08460" x-lemma="αὐτός" x-morph="Gr,RP,,,3GMS," x-occurrence="1" x-occurrences="1" x-content="αὐτοῦ"\\*\\w his|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*
\\zaln-s |x-strong="G35880" x-lemma="ὁ" x-morph="Gr,EA,,,,AMS," x-occurrence="1" x-occurrences="1" x-content="τὸν"\\*\\zaln-s |x-strong="G30560" x-lemma="λόγος" x-morph="Gr,N,,,,,AMS," x-occurrence="1" x-occurrences="1" x-content="λόγον"\\*\\w word|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*\\zaln-e\\*
\\zaln-s |x-strong="G17220" x-lemma="ἐν" x-morph="Gr,P,,,,,D,,," x-occurrence="1" x-occurrences="1" x-content="ἐν"\\*\\w by|x-occurrence="1" x-occurrences="2"\\w*\\zaln-e\\*
\\zaln-s |x-strong="G27820" x-lemma="κήρυγμα" x-morph="Gr,N,,,,,DNS," x-occurrence="1" x-occurrences="1" x-content="κηρύγματι"\\*\\w the|x-occurrence="2" x-occurrences="2"\\w* \\w proclamation|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*,`;

async function testTitusProcessing() {
  console.log('🧪 Testing Titus 1:3 Processing');
  console.log('=' .repeat(50));
  
  console.log('\n📝 Input USFM (Titus 1:3):');
  console.log(testTitusUSFM);
  
  try {
    const processor = new USFMProcessor();
    const result = await processor.processUSFM(testTitusUSFM, 'tit');
    
    console.log('\n✅ Processing completed successfully');
    
    if (result.structuredText.chapters.length > 0) {
      const chapter1 = result.structuredText.chapters[0];
      console.log('\nChapter 1 verses:', chapter1.verses.length);
      
      if (chapter1.verses.length > 0) {
        console.log('Available verses:', chapter1.verses.map(v => `${v.number} (${typeof v.number})`));
        const verse3 = chapter1.verses.find(v => v.number === '3' || v.number === 3);
        if (verse3) {
          console.log('\n📖 Verse 3 Content:');
          console.log('- Text:', verse3.text);
          
          // Check for the specific missing word issue
          console.log('\n🔍 Word Analysis:');
          const expectedWords = ['But', 'at', 'the', 'right', 'time', 'he', 'revealed', 'his', 'word', 'by', 'the', 'proclamation'];
          
          console.log('Expected words:', expectedWords);
          console.log('Extracted text:', verse3.text);
          
          expectedWords.forEach(word => {
            if (verse3.text.toLowerCase().includes(word.toLowerCase())) {
              console.log(`✅ Found: "${word}"`);
            } else {
              console.log(`❌ Missing: "${word}"`);
            }
          });
          
          // Check if "word" specifically is missing
          if (!verse3.text.toLowerCase().includes('word')) {
            console.log('\n🚨 ISSUE CONFIRMED: "word" is missing from the text!');
          } else {
            console.log('\n✅ "word" is present in the text');
          }
        } else {
          console.log('❌ Verse 3 not found');
        }
      }
    }
    
    // Check alignments
    console.log('\n🔗 Alignment Data:');
    if (result.alignments && result.alignments.length > 0) {
      console.log('Total alignments:', result.alignments.length);
      result.alignments.forEach((alignment, index) => {
        console.log(`  ${index + 1}. ${alignment.targetWords.join(' ')} → ${alignment.sourceWords.join(' ')} (${alignment.alignmentData[0]?.strong || 'N/A'})`);
      });
      
      // Check if "word" alignment exists
      const wordAlignment = result.alignments.find(a => 
        a.targetWords.some(w => w.toLowerCase().includes('word'))
      );
      
      if (wordAlignment) {
        console.log('\n✅ "word" alignment found:', wordAlignment);
      } else {
        console.log('\n❌ "word" alignment missing');
      }
    } else {
      console.log('No alignments found');
    }
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
  }
}

testTitusProcessing().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('🚨 Test failed:', error);
});
