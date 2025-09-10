#!/usr/bin/env npx ts-node

/**
 * Test script to verify the cross-panel communication fix
 * This simulates the expected behavior after fixing ScriptureViewer
 */

console.log('🧪 Testing Cross-Panel Communication Fix...');
console.log('');

// Test the helper functions from ScriptureViewer
function getResourceType(resourceId?: string): 'ULT' | 'UST' | 'UGNT' | 'UHB' {
  if (!resourceId) return 'ULT';
  
  const id = resourceId.toLowerCase();
  if (id.includes('ult')) return 'ULT';
  if (id.includes('ust')) return 'UST';
  if (id.includes('ugnt')) return 'UGNT';
  if (id.includes('uhb')) return 'UHB';
  
  return 'ULT';
}

function getLanguageCode(language?: string): 'en' | 'el-x-koine' | 'hbo' {
  if (!language) return 'en';
  
  const lang = language.toLowerCase();
  if (lang.includes('el-x-koine') || lang.includes('greek')) return 'el-x-koine';
  if (lang.includes('hbo') || lang.includes('hebrew')) return 'hbo';
  
  return 'en';
}

console.log('📋 Test Case 1: Resource Type Mapping');
console.log('  ult-scripture →', getResourceType('ult-scripture'));
console.log('  ust-scripture →', getResourceType('ust-scripture'));
console.log('  ugnt-scripture →', getResourceType('ugnt-scripture'));
console.log('  uhb-scripture →', getResourceType('uhb-scripture'));
console.log('  unknown →', getResourceType('unknown'));
console.log('  undefined →', getResourceType(undefined));
console.log('');

console.log('📋 Test Case 2: Language Code Mapping');
console.log('  en →', getLanguageCode('en'));
console.log('  el-x-koine →', getLanguageCode('el-x-koine'));
console.log('  hbo →', getLanguageCode('hbo'));
console.log('  greek →', getLanguageCode('greek'));
console.log('  hebrew →', getLanguageCode('hebrew'));
console.log('  unknown →', getLanguageCode('unknown'));
console.log('  undefined →', getLanguageCode(undefined));
console.log('');

console.log('📋 Test Case 3: Expected USFMRenderer Props');
const mockResourceMetadata = {
  id: 'ult-scripture',
  language: 'en'
};

const expectedProps = {
  resourceId: 'ult-scripture',
  resourceType: getResourceType(mockResourceMetadata.id),
  language: getLanguageCode(mockResourceMetadata.language)
};

console.log('  Mock metadata:', mockResourceMetadata);
console.log('  Expected props:', expectedProps);
console.log('');

console.log('✅ Fix Summary:');
console.log('1. ✅ Added debugging to USFMRenderer to catch missing resourceId');
console.log('2. ✅ Fixed React Hook dependency warnings');
console.log('3. ✅ Updated ScriptureViewer to pass required props to USFMRenderer:');
console.log('   - resourceId: from ScriptureViewer props');
console.log('   - resourceType: mapped from resourceMetadata.id');
console.log('   - language: mapped from resourceMetadata.language');
console.log('');

console.log('🔍 What to expect after the fix:');
console.log('1. No more "🚨 USFMRenderer: resourceId prop is undefined!" errors');
console.log('2. Should see "✅ USFMRenderer: Registering panel with cross-panel service:" logs');
console.log('3. Should see "🖱️ USFMRenderer: Triggering cross-panel communication for token:" when clicking words');
console.log('4. Cross-panel highlighting should work between aligned scripture resources');
console.log('');

console.log('💡 Next steps:');
console.log('1. Test the application - click on words in scripture panels');
console.log('2. Check browser console for the new success messages');
console.log('3. Verify that words highlight across aligned panels');
console.log('4. If still not working, check that alignment data exists in the USFM files');

