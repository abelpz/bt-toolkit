/**
 * Script to clear the cache and force reprocessing
 * Run this in the browser console or as a standalone script
 */

// For browser console (paste this in):
const clearCacheInBrowser = `
// Clear IndexedDB cache
const deleteDB = indexedDB.deleteDatabase('BT_Toolkit_Cache');
deleteDB.onsuccess = () => {
  console.log('✅ Cache cleared successfully');
  console.log('🔄 Please refresh the page to reload with fixed USFM processor');
};
deleteDB.onerror = () => {
  console.error('❌ Failed to clear cache');
};
`;

console.log('🧹 Cache Clearing Script');
console.log('=' .repeat(40));
console.log('\n📋 Copy and paste this into your browser console:');
console.log('\n' + clearCacheInBrowser);
console.log('\n📝 Instructions:');
console.log('1. Open browser Developer Tools (F12)');
console.log('2. Go to Console tab');
console.log('3. Paste the code above');
console.log('4. Press Enter');
console.log('5. Refresh the page');
console.log('6. Navigate to Titus to see the fixed text');

// For Node.js testing
import { offlineCache } from './src/services/offline-cache';

async function clearCacheForTesting() {
  try {
    console.log('\n🧹 Clearing cache for testing...');
    
    // Clear Titus specifically
    await offlineCache.removeCachedScripture(
      {
        organization: 'unfoldingWord',
        language: 'en', 
        resourceType: 'ult'
      },
      'tit'
    );
    
    console.log('✅ Titus cache cleared');
    console.log('🔄 Next scripture load will use fixed USFM processor');
    
  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
  }
}

// Run if this is executed directly
if (require.main === module) {
  clearCacheForTesting();
}
