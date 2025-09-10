#!/usr/bin/env npx ts-node

/**
 * Test script for target-to-target alignment (ULT ↔ UST) communication
 */

console.log('🔄 Testing Target-to-Target Alignment (ULT ↔ UST)...');
console.log('');

console.log('💡 New Approach:');
console.log('- ULT and UST both have alignment data pointing to original language words');
console.log('- If two words align to the same original word → they should highlight each other');
console.log('- No need for original language panels to be loaded');
console.log('- Direct target-to-target matching based on shared alignment data');
console.log('');

console.log('🔍 Alignment Matching Strategy:');
console.log('1. Primary: sourceWordId (most specific)');
console.log('   - If both tokens have sourceWordId and they match → highlight');
console.log('');
console.log('2. Secondary: Strong\'s number + lemma');
console.log('   - If both have same Strong\'s number → highlight');
console.log('   - If both also have lemmas, they must match too');
console.log('');
console.log('3. Tertiary: lemma only (less reliable)');
console.log('   - If only lemmas are available and they match → highlight');
console.log('');

console.log('🧪 Expected Debug Output:');
console.log('```');
console.log('🖱️ Word clicked: "gobierno" in ult-scripture');
console.log('🔍 Token details: {hasAlignment: true, alignment: {...}}');
console.log('🔍 Finding target tokens aligned to same source as: gobierno');
console.log('🔍 Source alignment data: {strong: "G1234", lemma: "κυβερνάω", sourceWordId: "..."}');
console.log('🔍 Searching panel: ust-scripture');
console.log('✅ Found matching token: "gobernaban" in ust-scripture');
console.log('🔍 Found 1 matching target tokens');
console.log('📡 Broadcasting highlight message with 1 aligned tokens');
console.log('```');
console.log('');

console.log('🎯 Testing Steps:');
console.log('1. Refresh the application');
console.log('2. Click on a word in the ULT panel (left panel)');
console.log('3. Look for the new debug messages in console');
console.log('4. Verify that corresponding word highlights in UST panel (right panel)');
console.log('5. Try clicking words in UST panel and verify ULT highlights');
console.log('');

console.log('✅ Success Indicators:');
console.log('- "🔍 Found X matching target tokens" (where X > 0)');
console.log('- "✅ Found matching token: [word] in [panel]"');
console.log('- Visual highlighting appears in the other panel');
console.log('- Blue highlight with ring around aligned words');
console.log('');

console.log('❌ Troubleshooting:');
console.log('- If "🔍 Found 0 matching target tokens" → alignment data format issue');
console.log('- If no debug messages → click handler not working');
console.log('- If no visual highlighting → CSS or message handling issue');
console.log('');

console.log('🔧 Alignment Data Format Expected:');
console.log('{');
console.log('  strong: "H1234" | "G5678",     // Strong\'s number');
console.log('  lemma: "דָּבָר" | "λόγος",        // Original language lemma');
console.log('  sourceWordId: "gen 1:1:word:1", // Unique source word ID');
console.log('  // ... other alignment properties');
console.log('}');

