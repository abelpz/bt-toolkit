#!/usr/bin/env ts-node

/**
 * Test the actual USFMRenderer whitespace rendering
 */

import { USFMProcessor } from './src/services/usfm-processor';

async function testRendererWhitespace() {
  console.log('🧪 Testing USFMRenderer Whitespace Handling\n');

  const processor = new USFMProcessor();
  
  // Simple test USFM with clear spacing
  const testUSFM = `\\id TST Test
\\c 1
\\p
\\v 1 \\zaln-s |x-strong="G25320" x-lemma="καί" x-morph="Gr,CC,,,,,,,," x-occurrence="1" x-occurrences="1" x-content="καὶ"\\*\\w And|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="G37560" x-lemma="ὅς" x-morph="Gr,RR,,,,NMS," x-occurrence="1" x-occurrences="1" x-content="ὃς"\\*\\w he|x-occurrence="1" x-occurrences="2"\\w*\\zaln-e\\* \\zaln-s |x-strong="G15100" x-lemma="εἰμί" x-morph="Gr,V,IPA3,,S," x-occurrence="1" x-occurrences="1" x-content="ἐστιν"\\*\\w is|x-occurrence="1" x-occurrences="2"\\w*\\zaln-e\\*.`;

  try {
    const result = await processor.processUSFM(testUSFM, 'TST');
    
    console.log('📖 Processed Result:');
    console.log('Chapters:', result.scripture.chapters.length);
    
    const verse = result.scripture.chapters[0]?.verses[0];
    if (!verse) {
      console.log('❌ No verse found');
      return;
    }
    
    console.log('\n🔍 Verse Analysis:');
    console.log('Text:', JSON.stringify(verse.text));
    console.log('Text length:', verse.text.length);
    console.log('Word tokens:', verse.wordTokens?.length || 0);
    
    if (verse.wordTokens) {
      console.log('\n📍 Token Positions:');
      verse.wordTokens.forEach((token: any, i: number) => {
        const expectedText = verse.text.slice(token.position.start, token.position.end);
        console.log(`${i + 1}. "${token.content}" at ${token.position.start}-${token.position.end}`);
        console.log(`   Expected: ${JSON.stringify(expectedText)}`);
        console.log(`   Match: ${expectedText === token.content ? '✅' : '❌'}`);
      });
      
      console.log('\n🎨 Rendering Simulation:');
      let currentPos = 0;
      const elements: string[] = [];
      
      const sortedTokens = [...verse.wordTokens].sort((a, b) => a.position.start - b.position.start);
      
      sortedTokens.forEach((token, index) => {
        // Add whitespace before token
        if (currentPos < token.position.start) {
          const betweenText = verse.text.slice(currentPos, token.position.start);
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
      if (currentPos < verse.text.length) {
        const remainingText = verse.text.slice(currentPos);
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
          reconstructed += verse.text.slice(currentPos, token.position.start);
        }
        // Add token content
        reconstructed += token.content;
        currentPos = token.position.end;
      });
      
      // Add remaining
      if (currentPos < verse.text.length) {
        reconstructed += verse.text.slice(currentPos);
      }
      
      console.log('\n✅ Reconstruction Test:');
      console.log('Original: ', JSON.stringify(verse.text));
      console.log('Reconstructed:', JSON.stringify(reconstructed));
      console.log('Match:', verse.text === reconstructed ? '✅' : '❌');
      
      if (verse.text !== reconstructed) {
        console.log('\n🚨 MISMATCH DETECTED!');
        console.log('Length diff:', verse.text.length - reconstructed.length);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testRendererWhitespace().catch(console.error);
