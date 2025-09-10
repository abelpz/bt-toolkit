#!/usr/bin/env npx ts-node

/**
 * Test script to debug alignment data in Spanish scripture resources
 */

console.log('🔍 Debugging Alignment Data in Spanish Scripture...');
console.log('');

console.log('📋 Expected Behavior:');
console.log('1. Spanish GLT/GST resources should have alignment data in their USFM \\w markers');
console.log('2. Each word token should have alignment info pointing to original language');
console.log('3. Cross-panel communication should work between aligned resources');
console.log('');

console.log('🚨 Current Issue:');
console.log('- Spanish tokens have no alignment data (clickedToken.alignment is undefined)');
console.log('- This prevents cross-panel highlighting from working');
console.log('');

console.log('🔍 Possible Causes:');
console.log('1. Spanish USFM files don\'t contain \\zaln alignment markers');
console.log('2. USFM processor isn\'t extracting alignment data correctly');
console.log('3. Alignment data is present but not being linked to word tokens');
console.log('');

console.log('💡 Next Steps:');
console.log('1. Check if Spanish USFM files contain \\zaln markers');
console.log('2. Verify USFM processor is extracting alignment data');
console.log('3. Check if alignment data is being associated with word tokens');
console.log('4. If no alignment data exists, implement basic word matching as fallback');
console.log('');

console.log('🧪 Test with browser console:');
console.log('1. Click a word in either Spanish panel');
console.log('2. Look for these debug messages:');
console.log('   - "🔍 Token details:" - shows if alignment exists');
console.log('   - "🔍 Panel analysis:" - shows panel type and alignment status');
console.log('   - "⚠️ Token has no alignment data" - confirms the issue');
console.log('');

console.log('🎯 Expected Debug Output:');
console.log('```');
console.log('🖱️ Word clicked: "gobierno" in ult-scripture');
console.log('🔍 Token details: {');
console.log('  uniqueId: "rut 1:1:gobierno:1",');
console.log('  hasAlignment: false,  // ← This is the problem!');
console.log('  alignment: undefined, // ← No alignment data');
console.log('  verseRef: "rut 1:1",');
console.log('  isHighlightable: true');
console.log('}');
console.log('🔍 Panel analysis: isOriginalLanguage=false, hasAlignment=false');
console.log('⚠️ Token has no alignment data or is not from a recognized language type');
console.log('🔍 Found 0 aligned tokens');
console.log('```');
console.log('');

console.log('✅ Solution Options:');
console.log('1. **Add Original Language Panels**: Include UGNT/UHB panels for alignment');
console.log('2. **Check USFM Source**: Verify Spanish USFM contains alignment markers');
console.log('3. **Implement Fallback**: Basic word matching between Spanish translations');
console.log('4. **Fix USFM Processing**: Ensure alignment data is extracted correctly');

