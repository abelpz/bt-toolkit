#!/usr/bin/env node

/**
 * Demo script for @qa-app/usfm-processor
 * 
 * This demonstrates the usage of the TypeScript USFM processor package
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  USFMProcessor, 
  processUSFM, 
  processUSFMSimple, 
  getVerse, 
  getVerseRange, 
  formatVerses,
  searchScripture,
  getBookStatistics
} from '../index.js';

async function runDemo() {
  console.log('🚀 @qa-app/usfm-processor Demo');
  console.log('==============================\n');

  try {
    // Try to find a USFM file to test with
    const possiblePaths = [
      '../../tests/fixtures/JON.usfm',
      '../../../tests/fixtures/JON.usfm',
      '../../../../tests/fixtures/JON.usfm'
    ];

    let usfmContent: string | null = null;
    let usfmPath: string | null = null;

    for (const testPath of possiblePaths) {
      try {
        const fullPath = path.resolve(__dirname, testPath);
        if (fs.existsSync(fullPath)) {
          usfmContent = fs.readFileSync(fullPath, 'utf8');
          usfmPath = fullPath;
          break;
        }
      } catch (e) {
        // Continue to next path
      }
    }

    if (!usfmContent) {
      console.log('⚠️  No USFM test file found. Creating a minimal example...\n');
      
      // Create a minimal USFM example for demonstration
      usfmContent = `\\id JON EN_ULT
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
      
      console.log('📝 Using minimal USFM example for demo\n');
    } else {
      console.log(`📖 Loading USFM file: ${usfmPath}`);
      console.log(`✅ Loaded ${usfmContent.length} characters\n`);
    }

    // 1. Simple processing
    console.log('🔄 Simple processing...');
    const simpleResult = processUSFMSimple(usfmContent, 'Jonah');
    console.log(`✅ Simple result: ${simpleResult.chapters.length} chapters, ${simpleResult.metadata.totalVerses} verses\n`);

    // 2. Full processing
    console.log('🔄 Full processing...');
    const fullResult = await processUSFM(usfmContent, 'JON', 'Jonah');
    console.log('✅ Full processing complete!');
    console.log(`   Processing time: ${fullResult.metadata.processingDuration}ms`);
    console.log(`   Chapters: ${fullResult.metadata.statistics.totalChapters}`);
    console.log(`   Verses: ${fullResult.metadata.statistics.totalVerses}`);
    console.log(`   Paragraphs: ${fullResult.metadata.statistics.totalParagraphs}`);
    console.log(`   Sections: ${fullResult.metadata.statistics.totalSections}`);
    console.log(`   Alignments: ${fullResult.metadata.statistics.totalAlignments}\n`);

    // 3. Working with the data
    console.log('📚 Working with processed data...');
    const scripture = fullResult.structuredText;

    // Get specific verse
    const verse1_1 = getVerse(scripture, 1, 1);
    if (verse1_1) {
      console.log(`Verse JON 1:1: "${verse1_1.text}"`);
    }

    // Get verse range
    const verses1_1to2 = getVerseRange(scripture, 1, '1-2');
    console.log(`\nVerses JON 1:1-2:`);
    verses1_1to2.forEach(v => {
      console.log(`  ${v.number}: ${v.text}`);
    });

    // Format verses
    const formattedText = formatVerses(verses1_1to2, true);
    console.log(`\nFormatted: ${formattedText.substring(0, 100)}...\n`);

    // 4. Search functionality
    console.log('🔍 Search functionality...');
    const searchResults = searchScripture(scripture, 'Yahweh');
    console.log(`Found ${searchResults.length} verses containing "Yahweh"`);
    if (searchResults.length > 0) {
      console.log(`First result: ${searchResults[0].reference} - ${searchResults[0].text.substring(0, 80)}...\n`);
    }

    // 5. Statistics
    console.log('📊 Book statistics:');
    const stats = getBookStatistics(scripture);
    console.log(`   Total words: ${stats.totalWords}`);
    console.log(`   Average verse length: ${stats.averageVerseLength} words`);
    console.log(`   Average verses per chapter: ${stats.averageVersesPerChapter}\n`);

    // 6. Paragraph structure
    if (scripture.chapters.length > 0) {
      console.log('📝 Paragraph structure (first chapter):');
      const firstChapter = scripture.chapters[0];
      firstChapter.paragraphs.forEach(para => {
        console.log(`   ${para.id}: ${para.type} (${para.style}) - verses ${para.startVerse}-${para.endVerse}`);
      });
    }

    // 7. Using the processor class directly
    console.log('\n🔧 Using USFMProcessor class directly...');
    const processor = new USFMProcessor();
    const directResult = processor.processUSFMSimple(usfmContent, 'Jonah Direct');
    console.log(`Direct processing result: ${directResult.book} - ${directResult.chapters.length} chapters\n`);

    console.log('🎉 Demo completed successfully!');
    console.log('\n💡 Usage examples:');
    console.log('   import { processUSFM, getVerse } from "@qa-app/usfm-processor";');
    console.log('   const result = await processUSFM(usfmContent, "JON", "Jonah");');
    console.log('   const verse = getVerse(result.structuredText, 1, 1);');

  } catch (error) {
    console.error('❌ Demo error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo };
