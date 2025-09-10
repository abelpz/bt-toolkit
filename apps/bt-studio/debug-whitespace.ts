#!/usr/bin/env ts-node

/**
 * Debug Whitespace Rendering Issue
 */

import * as fs from 'fs';
import * as path from 'path';

// @ts-ignore
import * as usfm from 'usfm-js';

function debugWhitespace() {
  console.log('🔍 Debugging Whitespace Rendering Issue\n');
  
  // Read the test USFM file
  const usfmPath = path.join(__dirname, 'test-non-contiguous-alignment.usfm');
  const usfmContent = fs.readFileSync(usfmPath, 'utf8');
  
  console.log('📄 USFM Content:');
  console.log(usfmContent.substring(0, 300) + '...\n');
  
  // Parse USFM
  const usfmJson = usfm.toJSON(usfmContent);
  const chapter1 = usfmJson.chapters['1'];
  const verse1 = chapter1['1'];
  
  console.log('🔍 Raw Verse Objects:');
  verse1.verseObjects.forEach((obj: any, i: number) => {
    console.log(`${i + 1}. Type: ${obj.type}, Tag: ${obj.tag || 'N/A'}`);
    if (obj.type === 'text') {
      console.log(`   Text: ${JSON.stringify(obj.text)} (length: ${obj.text.length})`);
      const chars = obj.text.split('').map((c: string) => c.charCodeAt(0));
      console.log(`   Chars: [${chars.join(', ')}]`);
    } else if (obj.type === 'word') {
      console.log(`   Word: ${JSON.stringify(obj.text)}`);
    } else if (obj.type === 'milestone' && obj.children) {
      console.log(`   Children: ${obj.children.length}`);
      obj.children.forEach((child: any, j: number) => {
        if (child.type === 'text') {
          console.log(`     ${j + 1}. Text: ${JSON.stringify(child.text)}`);
        } else if (child.type === 'word') {
          console.log(`     ${j + 1}. Word: ${JSON.stringify(child.text)}`);
        }
      });
    }
  });
  
  // Simulate token extraction
  let text = '';
  const tokens: any[] = [];
  let wordIndex = 0;
  
  const processObject = (obj: any, alignmentContext?: any): void => {
    if (obj.type === 'text') {
      const startPos = text.length;
      text += obj.text;
      const endPos = text.length;
      
      console.log(`\n📝 Processing text: ${JSON.stringify(obj.text)}`);
      console.log(`   Position: ${startPos} -> ${endPos}`);
      console.log(`   Current text: ${JSON.stringify(text)}`);

      // Only create tokens for non-whitespace text objects
      if (obj.text.trim()) {
        const content = obj.text;
        const uniqueId = `TST 1:1:${content}:1`;
        
        tokens.push({
          uniqueId,
          content,
          type: 'punctuation',
          position: { start: startPos, end: endPos, wordIndex: wordIndex++ },
          isHighlightable: false
        });
        
        console.log(`   ✅ Created token: ${uniqueId}`);
      } else {
        console.log(`   ⏭️  Skipped whitespace (preserved in text)`);
      }
    } else if (obj.type === 'word' && obj.tag === 'w') {
      const startPos = text.length;
      text += obj.text;
      const endPos = text.length;
      
      console.log(`\n🔤 Processing word: ${JSON.stringify(obj.text)}`);
      console.log(`   Position: ${startPos} -> ${endPos}`);
      console.log(`   Current text: ${JSON.stringify(text)}`);

      const content = obj.text;
      const occurrence = parseInt(obj.occurrence || '1');
      const uniqueId = `TST 1:1:${content}:${occurrence}`;

      tokens.push({
        uniqueId,
        content,
        occurrence,
        type: 'word',
        position: { start: startPos, end: endPos, wordIndex: wordIndex++ },
        isHighlightable: true,
        alignment: alignmentContext ? {
          sourceContent: alignmentContext.content || '',
          strong: alignmentContext.strong || ''
        } : undefined
      });
      
      console.log(`   ✅ Created word token: ${uniqueId}`);
    } else if (obj.type === 'milestone' && obj.tag === 'zaln') {
      console.log(`\n🔗 Processing alignment: ${obj.content || 'N/A'}`);
      if (obj.children) {
        for (const child of obj.children) {
          processObject(child, obj);
        }
      }
    }
  };

  for (const verseObj of verse1.verseObjects) {
    processObject(verseObj);
  }
  
  console.log('\n📊 FINAL ANALYSIS:');
  console.log('='.repeat(30));
  console.log(`Final text: ${JSON.stringify(text)}`);
  console.log(`Text length: ${text.length}`);
  console.log(`Total tokens: ${tokens.length}`);
  
  // Check token positions
  console.log('\n🎯 TOKEN POSITIONS:');
  tokens.forEach((token, i) => {
    const actualText = text.slice(token.position.start, token.position.end);
    const matches = actualText === token.content;
    
    console.log(`${i + 1}. ${token.content} (${token.position.start}-${token.position.end})`);
    console.log(`   Expected: ${JSON.stringify(token.content)}`);
    console.log(`   Actual:   ${JSON.stringify(actualText)}`);
    console.log(`   Match:    ${matches ? '✅' : '❌'}`);
  });
  
  // Simulate rendering
  console.log('\n🎨 RENDERING SIMULATION:');
  console.log('='.repeat(25));
  
  let renderedElements: string[] = [];
  let currentPos = 0;
  
  const sortedTokens = [...tokens].sort((a, b) => a.position.start - b.position.start);
  
  sortedTokens.forEach((token, index) => {
    // Add whitespace before token
    if (currentPos < token.position.start) {
      const betweenText = text.slice(currentPos, token.position.start);
      if (betweenText) {
        renderedElements.push(`WHITESPACE(${JSON.stringify(betweenText)})`);
        console.log(`Adding whitespace: ${JSON.stringify(betweenText)}`);
      }
    }
    
    // Add token
    renderedElements.push(`TOKEN(${token.content})`);
    console.log(`Adding token: ${token.content}`);
    
    currentPos = token.position.end;
  });
  
  // Add remaining text
  if (currentPos < text.length) {
    const remainingText = text.slice(currentPos);
    if (remainingText) {
      renderedElements.push(`REMAINING(${JSON.stringify(remainingText)})`);
      console.log(`Adding remaining: ${JSON.stringify(remainingText)}`);
    }
  }
  
  console.log('\nRendered elements:');
  renderedElements.forEach((element, i) => {
    console.log(`${i + 1}. ${element}`);
  });
  
  // Check for missing spaces
  const hasSpaces = text.includes(' ');
  const hasWhitespaceElements = renderedElements.some(el => el.startsWith('WHITESPACE'));
  
  console.log('\n🚨 ISSUE DIAGNOSIS:');
  console.log('='.repeat(20));
  console.log(`Text contains spaces: ${hasSpaces ? '✅' : '❌'}`);
  console.log(`Whitespace elements created: ${hasWhitespaceElements ? '✅' : '❌'}`);
  
  if (hasSpaces && !hasWhitespaceElements) {
    console.log('🔴 PROBLEM: Text has spaces but no whitespace elements created!');
    console.log('This suggests tokens are adjacent with no gaps between them.');
  } else if (!hasSpaces) {
    console.log('🔴 PROBLEM: Original text has no spaces!');
  } else {
    console.log('✅ Whitespace handling appears correct');
  }
  
  return { text, tokens, renderedElements };
}

if (require.main === module) {
  debugWhitespace();
}

export { debugWhitespace };
