#!/usr/bin/env node
/**
 * CLI Tester for Door43 Alignment Service
 * Tests alignment indexing and word interaction logic
 */

import { AlignmentService, WordInteractionService } from './index.js';
import { USFMParser } from '@bt-toolkit/door43-parsers';
import {
  ProcessedScripture,
  AlignmentGroup,

  TranslationNote,
  TranslationWordsLink,
  TranslationQuestion,
  IResourceService,
  AsyncResult,
  BookId
} from '@bt-toolkit/door43-core';

// ============================================================================
// Mock Resource Service for Testing
// ============================================================================

class MockResourceService implements IResourceService {
  private mockNotes: TranslationNote[] = [
    {
      Reference: '1:1',
      reference: { book: 'JON', chapter: 1, verse: 1 },
      chapter: 1,
      verse: 1,
      ID: 'jon01-01-001',
      Tags: 'key-term',
      SupportReference: 'rc://*/ta/man/translate/figs-abstractnouns',
      Quote: 'Yahweh',
      Occurrence: 1,
      GLQuote: 'Yahweh',
      OccurrenceNote: '',
      Note: 'This is the name of God that he revealed to his people in the Old Testament.'
    },
    {
      Reference: '1:1',
      reference: { book: 'JON', chapter: 1, verse: 1 },
      chapter: 1,
      verse: 1,
      ID: 'jon01-01-002',
      Tags: 'key-term',
      SupportReference: '',
      Quote: 'Jonah',
      Occurrence: 1,
      GLQuote: 'Jonah',
      OccurrenceNote: '',
      Note: 'This is the name of a man.'
    }
  ];

  private mockWordsLinks: TranslationWordsLink[] = [
    {
      Reference: '1:1',
      reference: { book: 'JON', chapter: 1, verse: 1 },
      chapter: 1,
      verse: 1,
      ID: 'jon01-01-twl001',
      Tags: 'key-term',
      OrigWords: 'H3068',
      Occurrence: 1,
      GLWords: 'Yahweh',
      TWLink: 'rc://*/tw/dict/bible/kt/yahweh'
    }
  ];

  private mockQuestions: TranslationQuestion[] = [
    {
      Reference: '1:1',
      reference: { book: 'JON', chapter: 1, verse: 1 },
      chapter: 1,
      verse: 1,
      ID: 'jon01-01-q001',
      Tags: 'comprehension',
      Question: 'To whom did the word of Yahweh come?',
      Response: 'The word of Yahweh came to Jonah son of Amittai.'
    }
  ];

  async initialize(): Promise<void> {}
  isInitialized(): boolean { return true; }
  
  async getAvailableBooks(): AsyncResult<BookId[]> {
    return { success: true, data: ['JON'] };
  }
  
  async getBibleText(): AsyncResult<any> {
    return { success: true, data: null };
  }
  
  async getTranslationNotes(book: BookId): AsyncResult<TranslationNote[] | null> {
    return { success: true, data: this.mockNotes };
  }
  
  async getTranslationWordsLinks(book: BookId): AsyncResult<TranslationWordsLink[] | null> {
    return { success: true, data: this.mockWordsLinks };
  }
  
  async getTranslationQuestions(book: BookId): AsyncResult<TranslationQuestion[] | null> {
    return { success: true, data: this.mockQuestions };
  }
  
  async getTranslationWord(): AsyncResult<any> {
    return { success: true, data: null };
  }
  
  async getTranslationAcademyArticle(): AsyncResult<any> {
    return { success: true, data: null };
  }
  
  async getBookTranslationPackage(): AsyncResult<any> {
    return { success: true, data: null };
  }
  
  async searchHelps(): AsyncResult<any[]> {
    return { success: true, data: [] };
  }
  
  clearCache(): void {}
}

// ============================================================================
// Sample Data for Testing
// ============================================================================

const SAMPLE_USFM_WITH_ALIGNMENT = `\\id JON unfoldingWord Literal Text
\\h Jonah
\\c 1
\\v 1 \\zaln-s |x-strong="H1961" x-lemma="הָיָה" x-morph="He,Vqw3ms" x-occurrence="1" x-occurrences="1"\\*\\w Now|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H1697" x-lemma="דָּבָר" x-morph="He,Ncmsc" x-occurrence="1" x-occurrences="1"\\*\\w the|x-occurrence="1" x-occurrences="3"\\w* \\w word|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H3068" x-lemma="יְהֹוָה" x-morph="He,Np" x-occurrence="1" x-occurrences="1"\\*\\w of|x-occurrence="1" x-occurrences="2"\\w* \\w Yahweh|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H1961" x-lemma="הָיָה" x-morph="He,Vqw3ms" x-occurrence="1" x-occurrences="1"\\*\\w came|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* \\zaln-s |x-strong="H413" x-lemma="אֵל" x-morph="He,R" x-occurrence="1" x-occurrences="1"\\*\\w to|x-occurrence="1" x-occurrences="2"\\w*\\zaln-e\\* \\zaln-s |x-strong="H3124" x-lemma="יוֹנָה" x-morph="He,Np" x-occurrence="1" x-occurrences="1"\\*\\w Jonah|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\*`;

function createTestScriptureWithAlignment(): ProcessedScripture {
  // Create a scripture with proper alignment data
  const alignmentGroup1: AlignmentGroup = {
    alignment: {
      strong: 'H3068',
      lemma: 'יְהֹוָה',
      morph: 'He,Np',
      occurrence: 1,
      occurrences: 1,
      originalWord: 'יְהֹוָה',
      gatewayWords: ['Yahweh']
    },
    words: ['Yahweh'],
    startIndex: 15,
    endIndex: 21
  };

  const alignmentGroup2: AlignmentGroup = {
    alignment: {
      strong: 'H3124',
      lemma: 'יוֹנָה',
      morph: 'He,Np',
      occurrence: 1,
      occurrences: 1,
      originalWord: 'יוֹנָה',
      gatewayWords: ['Jonah']
    },
    words: ['Jonah'],
    startIndex: 30,
    endIndex: 35
  };

  return {
    book: 'JON',
    bookName: 'Jonah',
    language: 'en',
    resourceType: 'literal',
    chapters: [
      {
        number: 1,
        verses: [
          {
            number: 1,
            text: 'Now the word of Yahweh came to Jonah',
            alignments: [alignmentGroup1, alignmentGroup2],
            usfm: SAMPLE_USFM_WITH_ALIGNMENT
          }
        ]
      }
    ],
    content: 'Now the word of Yahweh came to Jonah',
    metadata: {
      source: 'test-data',
      processedAt: new Date(),
      version: '1.0.0'
    }
  };
}

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

function testAlignmentIndexBuilding(): TestResult {
  const startTime = Date.now();
  
  try {
    const alignmentService = new AlignmentService();
    const testScripture = createTestScriptureWithAlignment();
    
    // Build alignment index
    const result = alignmentService.buildAlignmentIndex(testScripture);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to build alignment index');
    }
    
    // Get alignment stats
    const statsResult = alignmentService.getAlignmentStats();
    
    if (!statsResult.success || !statsResult.data) {
      throw new Error('Failed to get alignment stats');
    }
    
    const stats = statsResult.data;
    
    // Validate stats
    if (stats.totalWords === 0 || stats.uniqueStrongs === 0) {
      throw new Error('No alignment data was indexed');
    }
    
    return {
      name: 'Alignment Index Building',
      success: true,
      duration: Date.now() - startTime,
      details: {
        totalWords: stats.totalWords,
        totalAlignments: stats.totalAlignments,
        uniqueStrongs: stats.uniqueStrongs,
        uniqueLemmas: stats.uniqueLemmas,
        booksIndexed: stats.booksIndexed,
        isReady: alignmentService.isReady()
      }
    };
    
  } catch (error) {
    return {
      name: 'Alignment Index Building',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function testAlignmentLookup(): TestResult {
  const startTime = Date.now();
  
  try {
    const alignmentService = new AlignmentService();
    const testScripture = createTestScriptureWithAlignment();
    
    // Build index first
    const buildResult = alignmentService.buildAlignmentIndex(testScripture);
    if (!buildResult.success) {
      throw new Error('Failed to build alignment index');
    }
    
    // Test word lookup
    const lookupResult = alignmentService.getAlignmentData(
      { book: 'JON', chapter: 1, verse: 1 },
      15 // Index of "Yahweh"
    );
    
    if (!lookupResult.success || !lookupResult.data) {
      throw new Error('Failed to lookup alignment data');
    }
    
    const alignmentRef = lookupResult.data;
    
    // Validate alignment reference
    if (alignmentRef.wordText !== 'Yahweh' || 
        alignmentRef.alignment.strong !== 'H3068') {
      throw new Error('Incorrect alignment data returned');
    }
    
    // Test Strong's lookup
    const strongsResult = alignmentService.findWordsByStrongs('H3068');
    
    if (!strongsResult.success || !strongsResult.data || strongsResult.data.length === 0) {
      throw new Error('Failed to find words by Strong\'s number');
    }
    
    return {
      name: 'Alignment Lookup',
      success: true,
      duration: Date.now() - startTime,
      details: {
        wordText: alignmentRef.wordText,
        strongsNumber: alignmentRef.alignment.strong,
        lemma: alignmentRef.alignment.lemma,
        occurrence: alignmentRef.alignment.occurrence,
        strongsMatches: strongsResult.data.length
      }
    };
    
  } catch (error) {
    return {
      name: 'Alignment Lookup',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testWordInteraction(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const alignmentService = new AlignmentService();
    const mockResourceService = new MockResourceService();
    const wordInteractionService = new WordInteractionService(mockResourceService, alignmentService);
    
    const testScripture = createTestScriptureWithAlignment();
    
    // Build alignment index
    const buildResult = alignmentService.buildAlignmentIndex(testScripture);
    if (!buildResult.success) {
      throw new Error('Failed to build alignment index');
    }
    
    // Test word tap interaction
    const interactionResult = await wordInteractionService.handleWordTap(
      'JON', // book
      1,     // chapter
      1,     // verse
      15,    // wordIndex (Yahweh)
      'Yahweh' // wordText
    );
    
    if (!interactionResult.success || !interactionResult.data) {
      throw new Error(interactionResult.error || 'Word interaction failed');
    }
    
    const wordResult = interactionResult.data;
    
    // Validate word interaction result
    if (!wordResult.alignmentReference || 
        wordResult.crossReferences.length === 0) {
      throw new Error('No cross-references found');
    }
    
    // Check for expected cross-references
            const hasTranslationNote = wordResult.crossReferences.some((ref: any) => ref.type === 'translation-note');
            const hasTranslationWord = wordResult.crossReferences.some((ref: any) => ref.type === 'translation-word');
            const hasTranslationQuestion = wordResult.crossReferences.some((ref: any) => ref.type === 'translation-question');
    
    return {
      name: 'Word Interaction',
      success: true,
      duration: Date.now() - startTime,
      details: {
        wordText: wordResult.alignmentReference.wordText,
        strongsNumber: wordResult.alignmentReference.alignment.strong,
        totalCrossReferences: wordResult.crossReferences.length,
        hasTranslationNote,
        hasTranslationWord,
        hasTranslationQuestion,
        processingTimeMs: wordResult.metadata.processingTimeMs,
        crossReferenceTypes: wordResult.crossReferences.map((ref: any) => ref.type)
      }
    };
    
  } catch (error) {
    return {
      name: 'Word Interaction',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testUSFMParserIntegration(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const usfmParser = new USFMParser();
    const alignmentService = new AlignmentService();
    
    // Parse USFM with alignment data
    const parseResult = usfmParser.parseUSFM(SAMPLE_USFM_WITH_ALIGNMENT, {
      includeAlignment: true,
      book: 'JON',
      language: 'en',
      resourceType: 'literal'
    });
    
    if (!parseResult.success || !parseResult.data) {
      throw new Error(parseResult.error || 'USFM parsing failed');
    }
    
    const scripture = parseResult.data;
    
    // Check if alignments were parsed
    const firstVerse = scripture.chapters[0]?.verses[0];
    if (!firstVerse || !firstVerse.alignments || firstVerse.alignments.length === 0) {
      throw new Error('No alignment data found in parsed USFM');
    }
    
    // Build alignment index from parsed scripture
    const indexResult = alignmentService.buildAlignmentIndex(scripture);
    
    if (!indexResult.success) {
      throw new Error(indexResult.error || 'Failed to build alignment index from parsed USFM');
    }
    
    // Test lookup
    const lookupResult = alignmentService.getAlignmentData(
      { book: 'JON', chapter: 1, verse: 1 },
      0 // First word
    );
    
    const hasLookupData = lookupResult.success && !!lookupResult.data;
    
    return {
      name: 'USFM Parser Integration',
      success: true,
      duration: Date.now() - startTime,
      details: {
        scriptureBook: scripture.book,
        chaptersFound: scripture.chapters.length,
        versesFound: scripture.chapters[0]?.verses.length || 0,
        alignmentsFound: firstVerse.alignments.length,
        hasLookupData,
        firstAlignmentStrong: firstVerse.alignments[0]?.alignment.strong,
        firstAlignmentWords: firstVerse.alignments[0]?.words
      }
    };
    
  } catch (error) {
    return {
      name: 'USFM Parser Integration',
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
  console.log('🧪 Running Door43 Alignment Service Tests\n');
  
  const tests = [
    testAlignmentIndexBuilding,
    testAlignmentLookup,
    testWordInteraction,
    testUSFMParserIntegration
  ];
  
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  for (const test of tests) {
    console.log(`Running ${test.name}...`);
    const result = await test();
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
    console.log('\n✅ All alignment service tests passed!');
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
  testAlignmentIndexBuilding,
  testAlignmentLookup,
  testWordInteraction,
  testUSFMParserIntegration
};
