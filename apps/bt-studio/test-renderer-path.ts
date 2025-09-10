#!/usr/bin/env ts-node

/**
 * Test which renderer path is being taken
 */

// Simulate the renderer logic
function testRendererPath() {
  console.log('🧪 Testing Renderer Path Selection\n');
  
  // Simulate verse data with wordTokens
  const verseWithTokens = {
    text: "And he is who he is.",
    wordTokens: [
      { uniqueId: "TST 1:1:And:1", content: "And", position: { start: 0, end: 3 }, isHighlightable: true },
      { uniqueId: "TST 1:1:he:1", content: "he", position: { start: 4, end: 6 }, isHighlightable: true },
      { uniqueId: "TST 1:1:is:1", content: "is", position: { start: 7, end: 9 }, isHighlightable: true },
      { uniqueId: "TST 1:1:who:1", content: "who", position: { start: 10, end: 13 }, isHighlightable: true },
      { uniqueId: "TST 1:1:he:2", content: "he", position: { start: 14, end: 16 }, isHighlightable: true },
      { uniqueId: "TST 1:1:is:2", content: "is", position: { start: 17, end: 19 }, isHighlightable: true }
    ]
  };
  
  // Simulate verse data without wordTokens
  const verseWithoutTokens: { text: string; wordTokens?: any[] } = {
    text: "And he is who he is.",
    wordTokens: undefined
  };
  
  // Test condition from USFMRenderer
  console.log('📊 RENDERER PATH TESTS:');
  console.log('='.repeat(30));
  
  // Test 1: Verse with tokens
  const hasTokens1 = verseWithTokens.wordTokens && verseWithTokens.wordTokens.length > 0;
  console.log(`1. Verse with tokens: ${hasTokens1 ? '✅ Enhanced path' : '❌ Legacy path'}`);
  console.log(`   wordTokens exists: ${!!verseWithTokens.wordTokens}`);
  console.log(`   wordTokens length: ${verseWithTokens.wordTokens?.length || 0}`);
  
  // Test 2: Verse without tokens
  const hasTokens2 = verseWithoutTokens.wordTokens && verseWithoutTokens.wordTokens.length > 0;
  console.log(`\n2. Verse without tokens: ${hasTokens2 ? '✅ Enhanced path' : '❌ Legacy path'}`);
  console.log(`   wordTokens exists: ${!!verseWithoutTokens.wordTokens}`);
  console.log(`   wordTokens length: ${verseWithoutTokens.wordTokens?.length || 0}`);
  
  // Test 3: Empty tokens array
  const verseWithEmptyTokens = {
    text: "And he is who he is.",
    wordTokens: []
  };
  
  const hasTokens3 = verseWithEmptyTokens.wordTokens && verseWithEmptyTokens.wordTokens.length > 0;
  console.log(`\n3. Verse with empty tokens: ${hasTokens3 ? '✅ Enhanced path' : '❌ Legacy path'}`);
  console.log(`   wordTokens exists: ${!!verseWithEmptyTokens.wordTokens}`);
  console.log(`   wordTokens length: ${verseWithEmptyTokens.wordTokens?.length || 0}`);
  
  // Simulate the rendering logic
  console.log('\n🎨 RENDERING SIMULATION:');
  console.log('='.repeat(25));
  
  if (hasTokens1) {
    console.log('Enhanced rendering path:');
    
    const elements: string[] = [];
    let currentPos = 0;
    
    const sortedTokens = [...verseWithTokens.wordTokens].sort((a, b) => a.position.start - b.position.start);
    
    sortedTokens.forEach((token, index) => {
      // Add whitespace before token
      if (currentPos < token.position.start) {
        const betweenText = verseWithTokens.text.slice(currentPos, token.position.start);
        if (betweenText) {
          elements.push(`WHITESPACE("${betweenText}")`);
        }
      }
      
      // Add token
      elements.push(`TOKEN("${token.content}")`);
      currentPos = token.position.end;
    });
    
    // Add remaining text
    if (currentPos < verseWithTokens.text.length) {
      const remainingText = verseWithTokens.text.slice(currentPos);
      if (remainingText) {
        elements.push(`REMAINING("${remainingText}")`);
      }
    }
    
    console.log('Elements:');
    elements.forEach((el, i) => console.log(`  ${i + 1}. ${el}`));
  } else {
    console.log('Legacy rendering path:');
    const words = verseWithoutTokens.text.split(/(\s+)/);
    console.log('Words:', words.map(w => `"${w}"`));
  }
  
  // Check for potential issues
  console.log('\n🔍 POTENTIAL ISSUES:');
  console.log('='.repeat(20));
  
  const issues = [];
  
  if (!verseWithTokens.wordTokens) {
    issues.push('wordTokens is undefined');
  } else if (verseWithTokens.wordTokens.length === 0) {
    issues.push('wordTokens array is empty');
  }
  
  // Check token positions
  if (verseWithTokens.wordTokens) {
    const sortedTokens = [...verseWithTokens.wordTokens].sort((a, b) => a.position.start - b.position.start);
    for (let i = 0; i < sortedTokens.length - 1; i++) {
      const current = sortedTokens[i];
      const next = sortedTokens[i + 1];
      
      if (current.position.end === next.position.start) {
        issues.push(`No gap between "${current.content}" and "${next.content}"`);
      }
    }
  }
  
  if (issues.length === 0) {
    console.log('✅ No issues detected');
  } else {
    issues.forEach(issue => console.log(`❌ ${issue}`));
  }
  
  let elements: string[] = [];
  return { hasTokens1, elements: hasTokens1 ? elements : undefined };
}

if (require.main === module) {
  testRendererPath();
}

export { testRendererPath };
