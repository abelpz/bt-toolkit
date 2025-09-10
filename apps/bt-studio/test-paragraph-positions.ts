#!/usr/bin/env ts-node

/**
 * Test paragraph-level position adjustments for multi-verse content
 */

import { USFMProcessor } from './src/services/usfm-processor';

async function testParagraphPositions() {
  console.log('🧪 Testing Paragraph Position Adjustments\n');

  const processor = new USFMProcessor();
  
  // Multi-verse USFM that will be combined into one paragraph
  const testUSFM = `\\id TST Test
\\c 1
\\p
\\v 1 \\zaln-s |x-strong="G25320" x-lemma="καί" x-morph="Gr,CC,,,,,,,," x-occurrence="1" x-occurrences="1" x-content="καὶ"\\*\\w First|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="G37560" x-lemma="ὅς" x-morph="Gr,RR,,,,NMS," x-occurrence="1" x-occurrences="1" x-content="ὃς"\\*\\w verse|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*.
\\v 2 \\zaln-s |x-strong="G15100" x-lemma="εἰμί" x-morph="Gr,V,IPA3,,S," x-occurrence="1" x-occurrences="1" x-content="ἐστιν"\\*\\w Second|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="G37560" x-lemma="ὅς" x-morph="Gr,RR,,,,NMS," x-occurrence="1" x-occurrences="1" x-content="ὃς"\\*\\w verse|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*.`;

  try {
    const result = await processor.processUSFM(testUSFM, 'TST', 'Test');
    
    console.log('📖 Processed Result:');
    const chapter = result.structuredText.chapters[0];
    if (!chapter) {
      console.log('❌ No chapter found');
      return;
    }
    
    console.log('Paragraphs:', chapter.paragraphs.length);
    
    const paragraph = chapter.paragraphs[0];
    if (!paragraph) {
      console.log('❌ No paragraph found');
      return;
    }
    
    console.log('\n🔍 Paragraph Analysis:');
    console.log('Combined text:', JSON.stringify(paragraph.combinedText));
    console.log('Text length:', paragraph.combinedText.length);
    console.log('Verses in paragraph:', paragraph.verses.length);
    console.log('Tokenized content:', paragraph.tokenizedContent.length);
    
    // Check individual verses
    console.log('\n📝 Individual Verses:');
    paragraph.verses.forEach((verse: any, i: number) => {
      console.log(`Verse ${verse.number}:`);
      console.log(`  Text: ${JSON.stringify(verse.text)}`);
      console.log(`  Length: ${verse.text.length}`);
      console.log(`  Tokens: ${verse.wordTokens?.length || 0}`);
    });
    
    // Check paragraph tokens
    console.log('\n🎯 Paragraph Token Positions:');
    paragraph.tokenizedContent.forEach((token: any, i: number) => {
      const expectedText = paragraph.combinedText.slice(token.position.start, token.position.end);
      console.log(`${i + 1}. "${token.content}" at ${token.position.start}-${token.position.end}`);
      console.log(`   Expected: ${JSON.stringify(expectedText)}`);
      console.log(`   Match: ${expectedText === token.content ? '✅' : '❌'}`);
      if (expectedText !== token.content) {
        console.log(`   ⚠️  Mismatch! Got: ${JSON.stringify(expectedText)}`);
      }
    });
    
    // Simulate rendering
    console.log('\n🎨 Rendering Simulation:');
    let currentPos = 0;
    const elements: string[] = [];
    
    const sortedTokens = [...paragraph.tokenizedContent].sort((a, b) => a.position.start - b.position.start);
    
    sortedTokens.forEach((token, index) => {
      // Add whitespace before token
      if (currentPos < token.position.start) {
        const betweenText = paragraph.combinedText.slice(currentPos, token.position.start);
        if (betweenText) {
          elements.push(`WHITESPACE(${JSON.stringify(betweenText)})`);
          console.log(`   Adding whitespace: ${JSON.stringify(betweenText)}`);
        }
      }
      
      // Add token
      elements.push(`TOKEN(${token.content})`);
      console.log(`   Adding token: ${token.content}`);
      
      currentPos = token.position.end;
    });
    
    // Add remaining text
    if (currentPos < paragraph.combinedText.length) {
      const remainingText = paragraph.combinedText.slice(currentPos);
      if (remainingText) {
        elements.push(`REMAINING(${JSON.stringify(remainingText)})`);
        console.log(`   Adding remaining: ${JSON.stringify(remainingText)}`);
      }
    }
    
    console.log('\n🔧 Rendered Elements:');
    elements.forEach((el, i) => {
      console.log(`${i + 1}. ${el}`);
    });
    
    // Reconstruct text
    let reconstructed = '';
    currentPos = 0;
    
    sortedTokens.forEach((token) => {
      // Add whitespace
      if (currentPos < token.position.start) {
        reconstructed += paragraph.combinedText.slice(currentPos, token.position.start);
      }
      // Add token content
      reconstructed += token.content;
      currentPos = token.position.end;
    });
    
    // Add remaining
    if (currentPos < paragraph.combinedText.length) {
      reconstructed += paragraph.combinedText.slice(currentPos);
    }
    
    console.log('\n✅ Reconstruction Test:');
    console.log('Original: ', JSON.stringify(paragraph.combinedText));
    console.log('Reconstructed:', JSON.stringify(reconstructed));
    console.log('Match:', paragraph.combinedText === reconstructed ? '✅' : '❌');
    
    if (paragraph.combinedText !== reconstructed) {
      console.log('\n🚨 MISMATCH DETECTED!');
      console.log('Length diff:', paragraph.combinedText.length - reconstructed.length);
      
      // Character by character comparison
      const minLength = Math.min(paragraph.combinedText.length, reconstructed.length);
      for (let i = 0; i < minLength; i++) {
        if (paragraph.combinedText[i] !== reconstructed[i]) {
          console.log(`First difference at position ${i}:`);
          console.log(`  Original: ${JSON.stringify(paragraph.combinedText[i])} (${paragraph.combinedText.charCodeAt(i)})`);
          console.log(`  Reconstructed: ${JSON.stringify(reconstructed[i])} (${reconstructed.charCodeAt(i)})`);
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testParagraphPositions().catch(console.error);
