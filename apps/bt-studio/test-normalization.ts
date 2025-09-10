#!/usr/bin/env ts-node

/**
 * Test Text Normalization
 * Verifies that HTML entities and Unicode normalization work correctly
 */

/**
 * Test normalization function (copied from USFMProcessor)
 */
function normalizeTextContent(text: string): string {
  if (!text) return text;
  
  // Decode HTML entities
  const htmlEntities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&nbsp;': ' ',
    '&NoBreak;': '', // Remove NoBreak entities
    '&#8203;': '', // Remove zero-width space
    '&#8204;': '', // Remove zero-width non-joiner
    '&#8205;': '', // Remove zero-width joiner
    '&#8206;': '', // Remove left-to-right mark
    '&#8207;': '', // Remove right-to-left mark
  };
  
  let normalized = text;
  
  // Replace HTML entities
  for (const [entity, replacement] of Object.entries(htmlEntities)) {
    normalized = normalized.replace(new RegExp(entity, 'g'), replacement);
  }
  
  // Normalize Unicode (NFD -> NFC)
  normalized = normalized.normalize('NFC');
  
  // Remove any remaining control characters and invisible characters
  normalized = normalized.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\u205F-\u206F\uFEFF]/g, '');
  
  // Trim whitespace
  normalized = normalized.trim();
  
  return normalized;
}

/**
 * Test normalization with various inputs
 */
function testNormalization() {
  console.log('🧪 Testing Text Normalization\n');
  
  const testCases = [
    {
      name: 'NoBreak entity removal',
      input: 'word&NoBreak;text',
      expected: 'wordtext'
    },
    {
      name: 'Hebrew with NoBreak',
      input: 'דוד&NoBreak;המלך',
      expected: 'דודהמלך'
    },
    {
      name: 'Multiple HTML entities',
      input: '&lt;word&gt;&nbsp;&amp;&NoBreak;test',
      expected: '<word> &test'
    },
    {
      name: 'Zero-width characters',
      input: 'word&#8203;test&#8204;more',
      expected: 'wordtestmore'
    },
    {
      name: 'Unicode normalization',
      input: 'café', // This might be NFD (decomposed)
      expected: 'café' // Should be NFC (composed)
    },
    {
      name: 'Hebrew text',
      input: 'שלום',
      expected: 'שלום'
    },
    {
      name: 'Arabic text',
      input: 'السلام',
      expected: 'السلام'
    },
    {
      name: 'Mixed content with entities',
      input: 'Hello&NoBreak;&nbsp;World&amp;Test',
      expected: 'Hello World&Test'
    },
    {
      name: 'Control characters',
      input: 'word\u0001test\u007Fmore',
      expected: 'wordtestmore'
    },
    {
      name: 'Whitespace trimming',
      input: '  word  ',
      expected: 'word'
    }
  ];
  
  console.log('📊 NORMALIZATION TEST RESULTS:');
  console.log('='.repeat(50));
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  testCases.forEach((testCase, index) => {
    const result = normalizeTextContent(testCase.input);
    const passed = result === testCase.expected;
    
    console.log(`\n${index + 1}. ${testCase.name}`);
    console.log(`   Input:    "${testCase.input}"`);
    console.log(`   Expected: "${testCase.expected}"`);
    console.log(`   Result:   "${result}"`);
    console.log(`   Status:   ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) {
      passedTests++;
    } else {
      // Show character codes for debugging
      console.log(`   Input codes:    [${Array.from(testCase.input).map(c => c.charCodeAt(0)).join(', ')}]`);
      console.log(`   Expected codes: [${Array.from(testCase.expected).map(c => c.charCodeAt(0)).join(', ')}]`);
      console.log(`   Result codes:   [${Array.from(result).map(c => c.charCodeAt(0)).join(', ')}]`);
    }
  });
  
  console.log('\n📈 SUMMARY:');
  console.log('='.repeat(15));
  console.log(`Passed: ${passedTests}/${totalTests}`);
  console.log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  // Test Unicode range detection
  console.log('\n🔤 UNICODE RANGE TESTS:');
  console.log('='.repeat(25));
  
  const unicodeTests = [
    { text: 'hello', expected: true, description: 'English letters' },
    { text: 'שלום', expected: true, description: 'Hebrew letters' },
    { text: 'السلام', expected: true, description: 'Arabic letters' },
    { text: 'hello123', expected: false, description: 'Mixed letters and numbers' },
    { text: 'hello!', expected: false, description: 'Letters with punctuation' },
    { text: '123', expected: false, description: 'Numbers only' },
    { text: '!@#', expected: false, description: 'Punctuation only' }
  ];
  
  const letterRegex = /^[a-zA-Z\u0590-\u05FF\u0600-\u06FF\u0700-\u074F]+$/;
  
  unicodeTests.forEach((test, index) => {
    const normalizedText = normalizeTextContent(test.text);
    const isLettersOnly = letterRegex.test(normalizedText);
    const passed = isLettersOnly === test.expected;
    
    console.log(`${index + 1}. ${test.description}: "${test.text}" → ${isLettersOnly ? 'LETTERS' : 'NOT LETTERS'} ${passed ? '✅' : '❌'}`);
  });
  
  // Test token ID generation
  console.log('\n🆔 TOKEN ID GENERATION:');
  console.log('='.repeat(25));
  
  const tokenIdTests = [
    'word',
    'word&NoBreak;test',
    'שלום&NoBreak;עולם',
    'hello&nbsp;world',
    'test&#8203;invisible'
  ];
  
  tokenIdTests.forEach((text, index) => {
    const normalized = normalizeTextContent(text);
    const tokenId = `TST 1:1:${normalized}:1`;
    
    console.log(`${index + 1}. "${text}"`);
    console.log(`   Normalized: "${normalized}"`);
    console.log(`   Token ID: "${tokenId}"`);
    console.log(`   Clean: ${!tokenId.includes('&') && !tokenId.includes('\u200B') ? '✅' : '❌'}`);
  });
  
  const allPassed = passedTests === totalTests;
  
  if (allPassed) {
    console.log('\n🎉 ALL NORMALIZATION TESTS PASSED!');
    console.log('   ✓ HTML entities properly decoded');
    console.log('   ✓ NoBreak entities removed');
    console.log('   ✓ Unicode normalization working');
    console.log('   ✓ Control characters removed');
    console.log('   ✓ Ready for clean token IDs');
  } else {
    console.log('\n⚠️  Some normalization tests failed');
    console.log('   Please review the normalization logic');
  }
  
  return { passedTests, totalTests, allPassed };
}

// Run the test
if (require.main === module) {
  testNormalization();
}

export { testNormalization, normalizeTextContent };

