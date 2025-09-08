#!/usr/bin/env node
/**
 * CLI Tester for Door43 Parsers
 * Tests USFM, TSV, and YAML parsers with real sample data
 */

import { USFMParser } from './lib/usfm-parser.js';
import { TSVParser } from './lib/tsv-parser.js';
import { YAMLParser } from './lib/yaml-parser.js';

// ============================================================================
// Sample Data for Testing
// ============================================================================

const SAMPLE_USFM = `\\id JON unfoldingWord Literal Text
\\h Jonah
\\toc1 The Book of Jonah
\\toc2 Jonah
\\toc3 Jon
\\mt1 Jonah

\\s5
\\c 1
\\p
\\v 1 \\zaln-s |x-strong="H1961" x-lemma="הָיָה" x-morph="He,Vqw3ms" x-occurrence="1" x-occurrences="1"\\*\\w Now|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H1697" x-lemma="דָּבָר" x-morph="He,Ncmsc" x-occurrence="1" x-occurrences="1"\\*\\w the|x-occurrence="1" x-occurrences="3"\\w* \\w word|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H3068" x-lemma="יְהֹוָה" x-morph="He,Np" x-occurrence="1" x-occurrences="1"\\*\\w of|x-occurrence="1" x-occurrences="2"\\w* \\w Yahweh|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H1961" x-lemma="הָיָה" x-morph="He,Vqw3ms" x-occurrence="1" x-occurrences="1"\\*\\w came|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H413" x-lemma="אֵל" x-morph="He,R" x-occurrence="1" x-occurrences="1"\\*\\w to|x-occurrence="1" x-occurrences="2"\\w*\\zaln-e\\* \\zaln-s |x-strong="H3124" x-lemma="יוֹנָה" x-morph="He,Np" x-occurrence="1" x-occurrences="1"\\*\\w Jonah|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H1121" x-lemma="בֵּן" x-morph="He,Ncmsc" x-occurrence="1" x-occurrences="1"\\*\\w son|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H573" x-lemma="אֲמִתַּי" x-morph="He,Np" x-occurrence="1" x-occurrences="1"\\*\\w of|x-occurrence="2" x-occurrences="2"\\w* \\w Amittai|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*, \\zaln-s |x-strong="H559" x-lemma="אָמַר" x-morph="He,Vqc" x-occurrence="1" x-occurrences="1"\\*\\w saying|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*,

\\v 2 \\zaln-s |x-strong="H6965" x-lemma="קוּם" x-morph="He,Vqv2ms" x-occurrence="1" x-occurrences="1"\\*\\w "Get|x-occurrence="1" x-occurrences="1"\\w* \\w up|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H1980" x-lemma="הָלַךְ" x-morph="He,Vqv2ms" x-occurrence="1" x-occurrences="1"\\*\\w and|x-occurrence="1" x-occurrences="2"\\w* \\w go|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H413" x-lemma="אֵל" x-morph="He,R" x-occurrence="1" x-occurrences="1"\\*\\w to|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H5210" x-lemma="נִינְוֵה" x-morph="He,Np" x-occurrence="1" x-occurrences="1"\\*\\w Nineveh|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*, \\zaln-s |x-strong="H5892" x-lemma="עִיר" x-morph="He,Ncfsa" x-occurrence="1" x-occurrences="1"\\*\\w the|x-occurrence="1" x-occurrences="2"\\w* \\w great|x-occurrence="1" x-occurrences="1"\\w* \\w city|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*, \\zaln-s |x-strong="H7121" x-lemma="קָרָא" x-morph="He,Vqv2ms" x-occurrence="1" x-occurrences="1"\\*\\w and|x-occurrence="2" x-occurrences="2"\\w* \\w call|x-occurrence="1" x-occurrences="1"\\w* \\w out|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H5921" x-lemma="עַל" x-morph="He,R:Sp3fs" x-occurrence="1" x-occurrences="1"\\*\\w against|x-occurrence="1" x-occurrences="1"\\w* \\w it|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*, \\zaln-s |x-strong="H3588" x-lemma="כִּי" x-morph="He,C" x-occurrence="1" x-occurrences="1"\\*\\w because|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H7451" x-lemma="רַע" x-morph="He,Ncfsc:Sp3mp" x-occurrence="1" x-occurrences="1"\\*\\w their|x-occurrence="1" x-occurrences="1"\\w* \\w wickedness|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H5927" x-lemma="עָלָה" x-morph="He,Vqp3fs" x-occurrence="1" x-occurrences="1"\\*\\w has|x-occurrence="1" x-occurrences="1"\\w* \\w risen|x-occurrence="1" x-occurrences="1"\\w* \\w up|x-occurrence="2" x-occurrences="2"\\w*\\zaln-e\\* \\zaln-s |x-strong="H6440" x-lemma="פָּנִים" x-morph="He,Ncbpc:Sp1cs" x-occurrence="1" x-occurrences="1"\\*\\w before|x-occurrence="1" x-occurrences="1"\\w* \\w me|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*."`;

const SAMPLE_TSV = `Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tGLQuote\tOccurrenceNote\tNote
1:1\tjon01-01-001\tkey-term\trc://*/ta/man/translate/figs-abstractnouns\tYahweh\t1\tYahweh\t\tThis is the name of God that he revealed to his people in the Old Testament.
1:1\tjon01-01-002\tkey-term\t\tJonah\t1\tJonah\t\tThis is the name of a man. See how you translated this in Genesis 25:1.
1:2\tjon01-02-001\tkey-term\t\tNineveh\t1\tNineveh\t\tThis is the name of a city.
1:2\tjon01-02-002\tkey-term\trc://*/ta/man/translate/figs-metaphor\tgreat city\t1\tgreat city\t\tThis means the city was large and important.`;

const SAMPLE_YAML = `dublin_core:
  conformsto: 'rc0.2'
  contributor:
    - 'unfoldingWord'
  creator: 'unfoldingWord'
  description: 'An open-licensed update of the ASV, intended to provide a 'form-centric' understanding of the Bible.'
  format: 'text/usfm'
  identifier: 'ult'
  issued: '2023-04-26'
  language:
    direction: 'ltr'
    identifier: 'en'
    title: 'English'
  modified: '2023-04-26'
  publisher: 'unfoldingWord'
  relation:
    - 'en/tw'
    - 'en/tq'
    - 'en/tn'
  rights: 'CC BY-SA 4.0'
  source:
    - identifier: 'asv'
      language: 'en'
      version: '1901'
  subject: 'Bible'
  title: 'unfoldingWord Literal Text'
  type: 'bundle'
  version: '86'

checking:
  checking_entity:
    - 'unfoldingWord'
  checking_level: '3'

projects:
  - title: 'Genesis'
    versification: 'ufw'
    identifier: 'gen'
    sort: 1
    path: './01-GEN.usfm'
    categories:
      - 'bible-ot'
  - title: 'Exodus'
    versification: 'ufw'
    identifier: 'exo'
    sort: 2
    path: './02-EXO.usfm'
    categories:
      - 'bible-ot'
  - title: 'Jonah'
    versification: 'ufw'
    identifier: 'jon'
    sort: 32
    path: './32-JON.usfm'
    categories:
      - 'bible-ot'`;

// ============================================================================
// Test Functions
// ============================================================================

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

interface TestResults {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
}

function testUSFMParser(): TestResult {
  const startTime = Date.now();
  
  try {
    const parser = new USFMParser();
    const result = parser.parseUSFM(SAMPLE_USFM, {
      includeAlignment: true,
      book: 'JON',
      language: 'en',
      resourceType: 'literal'
    });
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to parse USFM');
    }
    
    const scripture = result.data;
    
    // Validate structure
    if (!scripture.chapters || scripture.chapters.length === 0) {
      throw new Error('No chapters found');
    }
    
    if (!scripture.chapters[0].verses || scripture.chapters[0].verses.length === 0) {
      throw new Error('No verses found');
    }
    
    // Check alignment data
    const firstVerse = scripture.chapters[0].verses[0];
    const hasAlignments = firstVerse.alignments && firstVerse.alignments.length > 0;
    
    return {
      name: 'USFM Parser',
      success: true,
      duration: Date.now() - startTime,
      details: {
        book: scripture.book,
        bookName: scripture.bookName,
        language: scripture.language,
        resourceType: scripture.resourceType,
        chaptersFound: scripture.chapters.length,
        versesInChapter1: scripture.chapters[0].verses.length,
        hasAlignments,
        alignmentsInVerse1: firstVerse.alignments?.length || 0,
        contentLength: scripture.content.length,
        processingTimeMs: result.metadata?.processingTimeMs
      }
    };
    
  } catch (error) {
    return {
      name: 'USFM Parser',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function testTSVParser(): TestResult {
  const startTime = Date.now();
  
  try {
    const parser = new TSVParser();
    const result = parser.parseTranslationNotes(SAMPLE_TSV);
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to parse TSV');
    }
    
    const notes = result.data;
    
    // Validate structure
    if (!Array.isArray(notes) || notes.length === 0) {
      throw new Error('No notes found');
    }
    
    // Check first note structure
    const firstNote = notes[0];
    const hasRequiredFields = firstNote.Reference && firstNote.ID && firstNote.Note;
    
    return {
      name: 'TSV Parser',
      success: true,
      duration: Date.now() - startTime,
      details: {
        notesFound: notes.length,
        hasRequiredFields,
        firstNoteReference: firstNote.Reference,
        firstNoteID: firstNote.ID,
        firstNoteQuote: firstNote.Quote,
        firstNoteNote: firstNote.Note.substring(0, 50) + '...',
        processingTimeMs: result.metadata?.processingTimeMs
      }
    };
    
  } catch (error) {
    return {
      name: 'TSV Parser',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function testYAMLParser(): TestResult {
  const startTime = Date.now();
  
  try {
    const parser = new YAMLParser();
    const result = parser.parseManifest(SAMPLE_YAML);
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to parse YAML');
    }
    
    const manifest = result.data;
    
    // Validate structure
    if (!manifest.projects || !Array.isArray(manifest.projects)) {
      throw new Error('No projects array found');
    }
    
    if (!manifest.dublin_core) {
      throw new Error('No dublin_core section found');
    }
    
    // Check project structure
    const firstProject = manifest.projects[0];
    const hasRequiredProjectFields = firstProject.identifier && firstProject.path;
    
    return {
      name: 'YAML Parser',
      success: true,
      duration: Date.now() - startTime,
      details: {
        projectsFound: manifest.projects.length,
        hasRequiredProjectFields,
        dublinCoreTitle: manifest.dublin_core.title,
        dublinCoreIdentifier: manifest.dublin_core.identifier,
        dublinCoreVersion: manifest.dublin_core.version,
        firstProjectIdentifier: firstProject.identifier,
        firstProjectPath: firstProject.path,
        processingTimeMs: result.metadata?.processingTimeMs
      }
    };
    
  } catch (error) {
    return {
      name: 'YAML Parser',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function testParserIntegration(): TestResult {
  const startTime = Date.now();
  
  try {
    // Test that all parsers can work together
    const usfmParser = new USFMParser();
    const tsvParser = new TSVParser();
    const yamlParser = new YAMLParser();
    
    // Parse all formats
    const usfmResult = usfmParser.parseUSFM(SAMPLE_USFM, { includeAlignment: true });
    const tsvResult = tsvParser.parseTranslationNotes(SAMPLE_TSV);
    const yamlResult = yamlParser.parseManifest(SAMPLE_YAML);
    
    // Check all succeeded
    if (!usfmResult.success || !tsvResult.success || !yamlResult.success) {
      throw new Error('One or more parsers failed');
    }
    
    // Cross-reference data
    const scripture = usfmResult.data!;
    const notes = tsvResult.data!;
    const manifest = yamlResult.data!;
    
    // Find matching book in manifest
    const jonProject = manifest.projects.find((p: any) => p.identifier === 'jon');
    
    // Find notes for first verse
    const verse1Notes = notes.filter((note: any) => note.Reference === '1:1');
    
    return {
      name: 'Parser Integration',
      success: true,
      duration: Date.now() - startTime,
      details: {
        allParsersSucceeded: true,
        scriptureBook: scripture.book,
        manifestHasJonah: !!jonProject,
        jonahProjectPath: jonProject?.path,
        verse1NotesCount: verse1Notes.length,
        crossReferenceWorking: scripture.book === 'JON' && !!jonProject && verse1Notes.length > 0
      }
    };
    
  } catch (error) {
    return {
      name: 'Parser Integration',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests(): Promise<TestResults> {
  console.log('🧪 Running Door43 Parsers Tests\n');
  
  const tests = [
    testUSFMParser,
    testTSVParser,
    testYAMLParser,
    testParserIntegration
  ];
  
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  for (const test of tests) {
    console.log(`Running ${test.name}...`);
    const result = test();
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.name} passed (${result.duration}ms)`);
      if (result.details) {
        console.log(`   Details:`, result.details);
      }
    } else {
      console.log(`❌ ${result.name} failed (${result.duration}ms)`);
      console.log(`   Error: ${result.error}`);
    }
    console.log();
  }
  
  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  const testResults: TestResults = {
    total: results.length,
    passed,
    failed,
    duration: totalDuration,
    results
  };
  
  console.log('📊 Test Results Summary:');
  console.log(`   Total: ${testResults.total}`);
  console.log(`   Passed: ${testResults.passed}`);
  console.log(`   Failed: ${testResults.failed}`);
  console.log(`   Duration: ${testResults.duration}ms`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Some tests failed. Check the output above for details.');
    process.exit(1);
  } else {
    console.log('\n✅ All parser tests passed!');
    process.exit(0);
  }
  
  return testResults;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

// Check if this file is being run directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}` || 
    import.meta.url.endsWith(process.argv[1]) || 
    process.argv[1].endsWith('cli-tester.ts')) {
  runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export {
  runAllTests,
  testUSFMParser,
  testTSVParser,
  testYAMLParser,
  testParserIntegration
};
