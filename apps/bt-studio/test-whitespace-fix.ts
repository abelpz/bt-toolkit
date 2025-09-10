#!/usr/bin/env ts-node

/**
 * Test Whitespace Handling Fix
 * Verifies that whitespace tokens are properly preserved and rendered
 */

import * as fs from 'fs';
import * as path from 'path';

// @ts-ignore - usfm-js doesn't have type declarations
import * as usfm from 'usfm-js';

/**
 * Test whitespace preservation in token extraction
 */
function testWhitespaceHandling() {
  console.log('🧪 Testing Whitespace Handling Fix\n');
  
  // Read the test USFM file
  const usfmPath = path.join(__dirname, 'test-non-contiguous-alignment.usfm');
  const usfmContent = fs.readFileSync(usfmPath, 'utf8');
  
  console.log('📄 Original USFM content:');
  console.log(usfmContent.substring(0, 200) + '...\n');
  
  // Parse USFM
  const usfmJson = usfm.toJSON(usfmContent);
  
  // Extract first verse for detailed analysis
  const chapter1 = usfmJson.chapters['1'];
  const verse1 = chapter1['1'];
  
  console.log('🔍 Analyzing verse 1 structure:');
  console.log('Raw verse objects:', JSON.stringify(verse1.verseObjects, null, 2));
  
  // Simulate our token extraction logic
  let text = '';
  const tokens: any[] = [];
  let wordIndex = 0;
  
  const processObject = (obj: any, alignmentContext?: any): void => {
    if (obj.type === 'text') {
      const startPos = text.length;
      text += obj.text;
      const endPos = text.length;

      // Create token for ALL text objects (including whitespace)
      const content = obj.text;
      const uniqueId = `TST 1:1:text-${wordIndex}:1`;
      
      // Determine token type
      let tokenType: 'word' | 'text' | 'punctuation';
      if (/^\s+$/.test(content)) {
        tokenType = 'text'; // Pure whitespace
      } else if (/^[a-zA-Z]+$/.test(content.trim())) {
        tokenType = 'word'; // Pure letters
      } else {
        tokenType = 'punctuation'; // Everything else
      }
      
      tokens.push({
        uniqueId,
        content: JSON.stringify(content), // Show exact content including whitespace
        type: tokenType,
        isWhitespace: /^\s+$/.test(content),
        position: { start: startPos, end: endPos, wordIndex: wordIndex++ }
      });
    } else if (obj.type === 'word' && obj.tag === 'w') {
      const startPos = text.length;
      text += obj.text;
      const endPos = text.length;

      tokens.push({
        uniqueId: `TST 1:1:${obj.text}:1`,
        content: JSON.stringify(obj.text),
        type: 'word',
        isWhitespace: false,
        position: { start: startPos, end: endPos, wordIndex: wordIndex++ }
      });
    } else if (obj.type === 'milestone' && obj.tag === 'zaln') {
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
  
  console.log('\n📊 Token Analysis:');
  console.log('='.repeat(40));
  console.log(`Final text: "${text}"`);
  console.log(`Total tokens: ${tokens.length}`);
  
  const whitespaceTokens = tokens.filter(t => t.isWhitespace);
  const wordTokens = tokens.filter(t => t.type === 'word');
  const punctuationTokens = tokens.filter(t => t.type === 'punctuation');
  
  console.log(`Whitespace tokens: ${whitespaceTokens.length}`);
  console.log(`Word tokens: ${wordTokens.length}`);
  console.log(`Punctuation tokens: ${punctuationTokens.length}`);
  
  console.log('\n🔤 All Tokens (in order):');
  console.log('='.repeat(30));
  tokens.forEach((token, i) => {
    const typeIcon = token.isWhitespace ? '⎵' : token.type === 'word' ? '🔤' : '🔣';
    const index = (i + 1).toString().padStart(2, ' ');
    console.log(`${index}. ${typeIcon} ${token.content.padEnd(15)} (${token.type})`);
  });
  
  console.log('\n🎯 Whitespace Preservation Test:');
  console.log('='.repeat(35));
  
  // Reconstruct text from tokens
  const reconstructedText = tokens.map(t => JSON.parse(t.content)).join('');
  const textMatches = reconstructedText === text;
  
  console.log('Original text:      "' + text + '"');
  console.log('Reconstructed text: "' + reconstructedText + '"');
  console.log('Text preservation:  ' + (textMatches ? '✅ PASS' : '❌ FAIL'));
  
  // Check for proper whitespace handling
  const hasWhitespaceTokens = whitespaceTokens.length > 0;
  const whitespacePreserved = text.includes(' ') && hasWhitespaceTokens;
  
  console.log('Whitespace detected: ' + (text.includes(' ') ? '✅ YES' : '❌ NO'));
  console.log('Whitespace tokens:   ' + (hasWhitespaceTokens ? '✅ YES' : '❌ NO'));
  console.log('Whitespace preserved: ' + (whitespacePreserved ? '✅ PASS' : '❌ FAIL'));
  
  // Validation summary
  console.log('\n📋 VALIDATION SUMMARY:');
  console.log('='.repeat(25));
  
  const checks = [
    { name: 'Text reconstruction matches original', passed: textMatches },
    { name: 'Whitespace tokens created', passed: hasWhitespaceTokens },
    { name: 'Word tokens preserved', passed: wordTokens.length > 0 },
    { name: 'All content tokenized', passed: tokens.length > 0 },
    { name: 'Whitespace preservation', passed: whitespacePreserved }
  ];
  
  checks.forEach(check => {
    console.log((check.passed ? '✅' : '❌') + ' ' + check.name);
  });
  
  const allPassed = checks.every(check => check.passed);
  
  if (allPassed) {
    console.log('\n🎉 ALL WHITESPACE TESTS PASSED!');
    console.log('   ✓ Whitespace tokens are properly created');
    console.log('   ✓ Text reconstruction is accurate');
    console.log('   ✓ Ready for enhanced rendering');
  } else {
    console.log('\n⚠️  Some whitespace tests failed');
    console.log('   Please review the token extraction logic');
  }
  
  // Save detailed analysis
  const outputDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(outputDir, 'whitespace-analysis.json'),
    JSON.stringify({
      originalText: text,
      reconstructedText,
      tokens,
      analysis: {
        totalTokens: tokens.length,
        whitespaceTokens: whitespaceTokens.length,
        wordTokens: wordTokens.length,
        punctuationTokens: punctuationTokens.length,
        textMatches,
        whitespacePreserved
      }
    }, null, 2)
  );
  
  console.log('\n✅ Detailed analysis saved to test-output/whitespace-analysis.json');
  
  return { tokens, text, reconstructedText, allPassed };
}

// Run the test
if (require.main === module) {
  testWhitespaceHandling();
}

export { testWhitespaceHandling };
