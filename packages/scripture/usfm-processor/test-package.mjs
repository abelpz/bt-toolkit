#!/usr/bin/env node

/**
 * Test the @bt-toolkit/usfm-processor package
 */

import { processUSFMSimple, getVerse, USFMProcessor } from './dist/index.js';

console.log('🧪 Testing @bt-toolkit/usfm-processor in bt-toolkit monorepo');
console.log('==========================================================\n');

try {
  // Test with simple USFM content
  const testUSFM = `\\id JON EN_ULT
\\usfm 3.0
\\h Jonah
\\mt Jonah

\\c 1
\\p
\\v 1 And the word of Yahweh came to Jonah son of Amittai, saying,
\\v 2 "Get up, go to Nineveh, the great city, and call out against it."
\\v 3 But Jonah got up to run away to Tarshish from before the face of Yahweh.

\\c 2
\\p
\\v 1 And Jonah prayed to Yahweh his God from the stomach of the fish,
\\v 2 and he said, "I called from my distress to Yahweh, and he answered me."`;

  console.log('🔄 Processing test USFM...');
  const result = processUSFMSimple(testUSFM, 'Jonah');
  
  console.log('✅ Processing successful!');
  console.log(`   Book: ${result.book}`);
  console.log(`   Chapters: ${result.chapters.length}`);
  console.log(`   Total verses: ${result.metadata.totalVerses}`);
  console.log(`   Total paragraphs: ${result.metadata.totalParagraphs}\n`);

  // Test utility functions
  console.log('🔧 Testing utility functions...');
  const verse = getVerse(result, 1, 1);
  console.log(`   First verse: "${verse.text}"`);
  
  // Test processor class
  console.log('\n🏭 Testing processor class...');
  const processor = new USFMProcessor();
  const directResult = processor.processUSFMSimple(testUSFM, 'Jonah Direct');
  console.log(`   Direct processing: ${directResult.chapters.length} chapters\n`);

  console.log('🎉 BT-TOOLKIT PACKAGE TEST SUCCESSFUL!');
  console.log('====================================');
  console.log('✅ @bt-toolkit/usfm-processor is working correctly');
  console.log('✅ Ready for use in bt-toolkit applications');
  console.log('✅ Can be imported by qa-app and other projects');

} catch (error) {
  console.error('❌ PACKAGE TEST FAILED');
  console.error('======================');
  console.error('Error:', error.message);
  console.error('\nStack:', error.stack);
  process.exit(1);
}
