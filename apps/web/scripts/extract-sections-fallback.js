#!/usr/bin/env node

/**
 * Extract translator sections from all books in unfoldingWord en_ult repository
 * and create a fallback JSON file for use when USFM files don't contain sections.
 */

import axios from 'axios';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { USFMProcessor } from '../src/services/usfm-processor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Door43 API configuration
const DOOR43_API_BASE = 'https://git.door43.org/unfoldingWord/en_ult/raw/branch/master';

// JavaScript version - no type definitions needed

// Hardcoded book projects from the en_ult manifest (excluding front matter)
const BOOK_PROJECTS = [
  { identifier: 'gen', title: 'Genesis', sort: 1, path: '01-GEN.usfm' },
  { identifier: 'exo', title: 'Exodus', sort: 2, path: '02-EXO.usfm' },
  { identifier: 'lev', title: 'Leviticus', sort: 3, path: '03-LEV.usfm' },
  { identifier: 'num', title: 'Numbers', sort: 4, path: '04-NUM.usfm' },
  { identifier: 'deu', title: 'Deuteronomy', sort: 5, path: '05-DEU.usfm' },
  { identifier: 'jos', title: 'Joshua', sort: 6, path: '06-JOS.usfm' },
  { identifier: 'jdg', title: 'Judges', sort: 7, path: '07-JDG.usfm' },
  { identifier: 'rut', title: 'Ruth', sort: 8, path: '08-RUT.usfm' },
  { identifier: '1sa', title: '1 Samuel', sort: 9, path: '09-1SA.usfm' },
  { identifier: '2sa', title: '2 Samuel', sort: 10, path: '10-2SA.usfm' },
  { identifier: '1ki', title: '1 Kings', sort: 11, path: '11-1KI.usfm' },
  { identifier: '2ki', title: '2 Kings', sort: 12, path: '12-2KI.usfm' },
  { identifier: '1ch', title: '1 Chronicles', sort: 13, path: '13-1CH.usfm' },
  { identifier: '2ch', title: '2 Chronicles', sort: 14, path: '14-2CH.usfm' },
  { identifier: 'ezr', title: 'Ezra', sort: 15, path: '15-EZR.usfm' },
  { identifier: 'neh', title: 'Nehemiah', sort: 16, path: '16-NEH.usfm' },
  { identifier: 'est', title: 'Esther', sort: 17, path: '17-EST.usfm' },
  { identifier: 'job', title: 'Job', sort: 18, path: '18-JOB.usfm' },
  { identifier: 'psa', title: 'Psalms', sort: 19, path: '19-PSA.usfm' },
  { identifier: 'pro', title: 'Proverbs', sort: 20, path: '20-PRO.usfm' },
  { identifier: 'ecc', title: 'Ecclesiastes', sort: 21, path: '21-ECC.usfm' },
  { identifier: 'sng', title: 'Song of Solomon', sort: 22, path: '22-SNG.usfm' },
  { identifier: 'isa', title: 'Isaiah', sort: 23, path: '23-ISA.usfm' },
  { identifier: 'jer', title: 'Jeremiah', sort: 24, path: '24-JER.usfm' },
  { identifier: 'lam', title: 'Lamentations', sort: 25, path: '25-LAM.usfm' },
  { identifier: 'ezk', title: 'Ezekiel', sort: 26, path: '26-EZK.usfm' },
  { identifier: 'dan', title: 'Daniel', sort: 27, path: '27-DAN.usfm' },
  { identifier: 'hos', title: 'Hosea', sort: 28, path: '28-HOS.usfm' },
  { identifier: 'jol', title: 'Joel', sort: 29, path: '29-JOL.usfm' },
  { identifier: 'amo', title: 'Amos', sort: 30, path: '30-AMO.usfm' },
  { identifier: 'oba', title: 'Obadiah', sort: 31, path: '31-OBA.usfm' },
  { identifier: 'jon', title: 'Jonah', sort: 32, path: '32-JON.usfm' },
  { identifier: 'mic', title: 'Micah', sort: 33, path: '33-MIC.usfm' },
  { identifier: 'nam', title: 'Nahum', sort: 34, path: '34-NAM.usfm' },
  { identifier: 'hab', title: 'Habakkuk', sort: 35, path: '35-HAB.usfm' },
  { identifier: 'zep', title: 'Zephaniah', sort: 36, path: '36-ZEP.usfm' },
  { identifier: 'hag', title: 'Haggai', sort: 37, path: '37-HAG.usfm' },
  { identifier: 'zec', title: 'Zechariah', sort: 38, path: '38-ZEC.usfm' },
  { identifier: 'mal', title: 'Malachi', sort: 39, path: '39-MAL.usfm' },
  { identifier: 'mat', title: 'Matthew', sort: 40, path: '41-MAT.usfm' },
  { identifier: 'mrk', title: 'Mark', sort: 41, path: '42-MRK.usfm' },
  { identifier: 'luk', title: 'Luke', sort: 42, path: '43-LUK.usfm' },
  { identifier: 'jhn', title: 'John', sort: 43, path: '44-JHN.usfm' },
  { identifier: 'act', title: 'Acts', sort: 44, path: '45-ACT.usfm' },
  { identifier: 'rom', title: 'Romans', sort: 45, path: '46-ROM.usfm' },
  { identifier: '1co', title: '1 Corinthians', sort: 46, path: '47-1CO.usfm' },
  { identifier: '2co', title: '2 Corinthians', sort: 47, path: '48-2CO.usfm' },
  { identifier: 'gal', title: 'Galatians', sort: 48, path: '49-GAL.usfm' },
  { identifier: 'eph', title: 'Ephesians', sort: 49, path: '50-EPH.usfm' },
  { identifier: 'php', title: 'Philippians', sort: 50, path: '51-PHP.usfm' },
  { identifier: 'col', title: 'Colossians', sort: 51, path: '52-COL.usfm' },
  { identifier: '1th', title: '1 Thessalonians', sort: 52, path: '53-1TH.usfm' },
  { identifier: '2th', title: '2 Thessalonians', sort: 53, path: '54-2TH.usfm' },
  { identifier: '1ti', title: '1 Timothy', sort: 54, path: '55-1TI.usfm' },
  { identifier: '2ti', title: '2 Timothy', sort: 55, path: '56-2TI.usfm' },
  { identifier: 'tit', title: 'Titus', sort: 56, path: '57-TIT.usfm' },
  { identifier: 'phm', title: 'Philemon', sort: 57, path: '58-PHM.usfm' },
  { identifier: 'heb', title: 'Hebrews', sort: 58, path: '59-HEB.usfm' },
  { identifier: 'jas', title: 'James', sort: 59, path: '60-JAS.usfm' },
  { identifier: '1pe', title: '1 Peter', sort: 60, path: '61-1PE.usfm' },
  { identifier: '2pe', title: '2 Peter', sort: 61, path: '62-2PE.usfm' },
  { identifier: '1jn', title: '1 John', sort: 62, path: '63-1JN.usfm' },
  { identifier: '2jn', title: '2 John', sort: 63, path: '64-2JN.usfm' },
  { identifier: '3jn', title: '3 John', sort: 64, path: '65-3JN.usfm' },
  { identifier: 'jud', title: 'Jude', sort: 65, path: '66-JUD.usfm' },
  { identifier: 'rev', title: 'Revelation', sort: 66, path: '67-REV.usfm' }
];

class SectionExtractor {
  constructor() {
    this.processor = new USFMProcessor();
    this.results = {
      metadata: {
        extractedAt: new Date().toISOString(),
        source: {
          owner: 'unfoldingWord',
          repository: 'en_ult',
          apiBase: DOOR43_API_BASE
        },
        totalBooks: BOOK_PROJECTS.length,
        booksWithSections: 0,
        totalSections: 0
      },
      books: {}
    };
  }

  /**
   * Fetch USFM content for a specific book project
   */
  async fetchBookUSFM(project) {
    try {
      const url = `${DOOR43_API_BASE}/${project.path}`;
      
      console.log(`📖 Fetching ${project.identifier.toUpperCase()} (${project.title}) from ${project.path}...`);
      
      const response = await axios.get(url, {
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'BT-Toolkit Section Extractor'
        }
      });

      return response.data;
    } catch (error) {
      console.error(`❌ Failed to fetch ${project.identifier}: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract sections from USFM content
   */
  async extractSectionsFromUSFM(project, usfmContent) {
    try {
      const result = await this.processor.processUSFM(usfmContent, project.identifier.toUpperCase());
      
      if (result.translatorSections && result.translatorSections.length > 0) {
        console.log(`✅ Found ${result.translatorSections.length} sections in ${project.identifier.toUpperCase()}`);
        this.results.metadata.booksWithSections++;
        this.results.metadata.totalSections += result.translatorSections.length;
        
        return {
          bookCode: project.identifier.toUpperCase(),
          bookName: project.title,
          sectionsCount: result.translatorSections.length,
          sections: result.translatorSections,
          extractedAt: new Date().toISOString()
        };
      } else {
        console.log(`⚠️  No sections found in ${project.identifier.toUpperCase()}`);
        return {
          bookCode: project.identifier.toUpperCase(),
          bookName: project.title,
          sectionsCount: 0,
          sections: [],
          extractedAt: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error(`❌ Failed to process ${project.identifier}: ${error.message}`);
      return {
        bookCode: project.identifier.toUpperCase(),
        bookName: project.title,
        sectionsCount: 0,
        sections: [],
        error: error.message,
        extractedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Process all books and extract sections
   */
  async extractAllSections() {
    // Test with just the first 3 books
    const testBooks = BOOK_PROJECTS.slice(0, 3);
    console.log(`🚀 Starting section extraction for ${testBooks.length} books from unfoldingWord/en_ult (testing)...\n`);

    for (let i = 0; i < testBooks.length; i++) {
      const project = testBooks[i];
      const progress = `[${i + 1}/${testBooks.length}]`;
      
      console.log(`${progress} Processing ${project.identifier.toUpperCase()} (${project.title})...`);
      
      // Fetch USFM content
      const usfmContent = await this.fetchBookUSFM(project);
      if (!usfmContent) {
        this.results.books[project.identifier.toUpperCase()] = {
          bookCode: project.identifier.toUpperCase(),
          bookName: project.title,
          sectionsCount: 0,
          sections: [],
          error: 'Failed to fetch USFM content',
          extractedAt: new Date().toISOString()
        };
        continue;
      }

      // Extract sections
      const bookResult = await this.extractSectionsFromUSFM(project, usfmContent);
      this.results.books[project.identifier.toUpperCase()] = bookResult;

      // Add a small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\n✅ Extraction complete!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total books processed: ${testBooks.length}`);
    console.log(`   - Books with sections: ${this.results.metadata.booksWithSections}`);
    console.log(`   - Total sections found: ${this.results.metadata.totalSections}`);
  }

  /**
   * Save results to JSON file
   */
  saveResults() {
    const outputDir = join(__dirname, '..', 'src', 'data');
    const outputFile = join(outputDir, 'translator-sections-fallback.json');

    // Ensure output directory exists
    mkdirSync(outputDir, { recursive: true });

    // Write JSON file
    writeFileSync(outputFile, JSON.stringify(this.results, null, 2), 'utf8');
    
    console.log(`\n💾 Results saved to: ${outputFile}`);
    console.log(`📁 File size: ${(JSON.stringify(this.results).length / 1024).toFixed(1)} KB`);
  }

  /**
   * Generate summary report
   */
  generateSummary() {
    const booksWithSections = Object.values(this.results.books)
      .filter(book => book.sectionsCount > 0)
      .sort((a, b) => b.sectionsCount - a.sectionsCount);

    console.log(`\n📋 Books with translator sections:`);
    booksWithSections.forEach(book => {
      console.log(`   ${book.bookCode.padEnd(4)} ${book.bookName.padEnd(20)} ${book.sectionsCount} sections`);
    });

    const booksWithoutSections = Object.values(this.results.books)
      .filter(book => book.sectionsCount === 0)
      .map(book => book.bookCode);

    if (booksWithoutSections.length > 0) {
      console.log(`\n⚠️  Books without sections: ${booksWithoutSections.join(', ')}`);
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting extraction script...');
  const extractor = new SectionExtractor();
  
  try {
    await extractor.extractAllSections();
    extractor.saveResults();
    extractor.generateSummary();
    
    console.log(`\n🎉 Section extraction completed successfully!`);
    process.exit(0);
  } catch (error) {
    console.error(`\n💥 Fatal error during extraction:`, error);
    process.exit(1);
  }
}

// Run the script
console.log('Script loaded, checking execution condition...');
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);

// Always run for now during testing
main();

export { SectionExtractor };