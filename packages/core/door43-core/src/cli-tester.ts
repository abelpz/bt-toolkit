#!/usr/bin/env node
/**
 * CLI Tester for Door43 Core Types and Interfaces
 * Tests type definitions and validates data structures
 */

import {
  BookId,
  LanguageCode,
  VerseReference,
  AlignmentData,
  AlignmentGroup,
  ProcessedScripture,
  TranslationNote,
  BookTranslationPackage,
  ServiceResult,
  BibleBook,
  Door43Config,
  PlatformConfig
} from './lib/types.js';

import {
  IResourceService,
  ICacheService,
  IParserService,
  CLITestResult,
  CLITestResults
} from './lib/interfaces.js';

// ============================================================================
// Test Data Creation Functions
// ============================================================================

function createTestVerseReference(): VerseReference {
  return {
    book: 'GEN' as BookId,
    chapter: 1,
    verse: 1
  };
}

function createTestAlignmentData(): AlignmentData {
  return {
    strong: 'H0430',
    lemma: 'אֱלֹהִים',
    morph: 'He,Ncmpa',
    occurrence: 1,
    occurrences: 1,
    originalWord: 'אֱלֹהִים',
    gatewayWords: ['God']
  };
}

function createTestAlignmentGroup(): AlignmentGroup {
  return {
    alignment: createTestAlignmentData(),
    words: ['God'],
    startIndex: 0,
    endIndex: 3
  };
}

function createTestProcessedScripture(): ProcessedScripture {
  return {
    book: 'GEN' as BookId,
    bookName: 'Genesis',
    language: 'en' as LanguageCode,
    resourceType: 'literal',
    chapters: [
      {
        number: 1,
        title: 'The Creation of the World',
        verses: [
          {
            number: 1,
            text: 'In the beginning God created the heavens and the earth.',
            alignments: [createTestAlignmentGroup()],
            usfm: '\\v 1 In the beginning \\zaln-s |x-strong="H0430"\\*\\w God|x-occurrence="1" x-occurrences="1"\\w*\\zaln-e\\* created the heavens and the earth.'
          }
        ]
      }
    ],
    content: 'In the beginning God created the heavens and the earth.',
    metadata: {
      source: 'test-data',
      processedAt: new Date(),
      version: '1.0.0'
    }
  };
}

function createTestTranslationNote(): TranslationNote {
  return {
    Reference: '1:1',
    reference: createTestVerseReference(),
    chapter: 1,
    verse: 1,
    ID: 'gen01-01-001',
    Tags: 'key-term',
    SupportReference: 'rc://*/ta/man/translate/figs-abstractnouns',
    Quote: 'God',
    Occurrence: 1,
    GLQuote: 'God',
    OccurrenceNote: '',
    Note: 'This refers to the one true God who created and rules over everything.'
  };
}

function createTestBookTranslationPackage(): BookTranslationPackage {
  return {
    book: 'GEN' as BookId,
    language: 'en' as LanguageCode,
    organization: 'unfoldingWord',
    fetchedAt: new Date(),
    repositories: {},
    literalText: {
      source: 'en_ult',
      content: 'USFM content here...',
      processed: createTestProcessedScripture()
    },
    translationNotes: {
      source: 'en_tn',
      content: 'TSV content here...',
      processed: [createTestTranslationNote()]
    }
  };
}

function createTestBibleBook(): BibleBook {
  return {
    id: 'GEN' as BookId,
    name: 'Genesis',
    chapters: 50,
    testament: 'OT',
    order: 1,
    alternativeNames: ['Gen'],
    bookNumber: 1
  };
}

function createTestDoor43Config(): Door43Config {
  return {
    baseUrl: 'https://git.door43.org',
    language: 'en' as LanguageCode,
    organization: 'unfoldingWord',
    userAgent: 'Door43-Core-Tester/1.0.0',
    timeout: 30000,
    maxRetries: 3
  };
}

function createTestPlatformConfig(): PlatformConfig {
  return {
    target: 'node',
    storageBackend: 'filesystem',
    cacheStrategy: 'lru',
    maxCacheSize: 100,
    defaultTTL: 3600000 // 1 hour
  };
}

// ============================================================================
// Type Validation Functions
// ============================================================================

function validateVerseReference(ref: VerseReference): boolean {
  return (
    typeof ref.book === 'string' &&
    ref.book.length === 3 &&
    typeof ref.chapter === 'number' &&
    ref.chapter > 0 &&
    typeof ref.verse === 'number' &&
    ref.verse > 0
  );
}

function validateAlignmentData(alignment: AlignmentData): boolean {
  return (
    typeof alignment.occurrence === 'number' &&
    alignment.occurrence > 0 &&
    typeof alignment.occurrences === 'number' &&
    alignment.occurrences > 0 &&
    Array.isArray(alignment.gatewayWords) &&
    alignment.gatewayWords.length > 0
  );
}

function validateProcessedScripture(scripture: ProcessedScripture): boolean {
  return (
    typeof scripture.book === 'string' &&
    typeof scripture.bookName === 'string' &&
    typeof scripture.language === 'string' &&
    (scripture.resourceType === 'literal' || scripture.resourceType === 'simplified') &&
    Array.isArray(scripture.chapters) &&
    scripture.chapters.length > 0 &&
    typeof scripture.content === 'string' &&
    scripture.metadata &&
    scripture.metadata.processedAt instanceof Date
  );
}

function validateTranslationNote(note: TranslationNote): boolean {
  return (
    typeof note.Reference === 'string' &&
    validateVerseReference(note.reference) &&
    typeof note.chapter === 'number' &&
    typeof note.verse === 'number' &&
    typeof note.ID === 'string' &&
    typeof note.Note === 'string'
  );
}

function validateBookTranslationPackage(pkg: BookTranslationPackage): boolean {
  return (
    typeof pkg.book === 'string' &&
    typeof pkg.language === 'string' &&
    typeof pkg.organization === 'string' &&
    pkg.fetchedAt instanceof Date &&
    typeof pkg.repositories === 'object'
  );
}

function validateServiceResult<T>(result: ServiceResult<T>): boolean {
  return (
    typeof result.success === 'boolean' &&
    (result.success ? result.data !== undefined : typeof result.error === 'string')
  );
}

// ============================================================================
// Test Functions
// ============================================================================

function testTypeCreation(): CLITestResult {
  const startTime = Date.now();
  
  try {
    // Test creating all major types
    const verseRef = createTestVerseReference();
    const alignmentData = createTestAlignmentData();
    const alignmentGroup = createTestAlignmentGroup();
    const scripture = createTestProcessedScripture();
    const note = createTestTranslationNote();
    const bookPackage = createTestBookTranslationPackage();
    const bibleBook = createTestBibleBook();
    const door43Config = createTestDoor43Config();
    const platformConfig = createTestPlatformConfig();
    
    // Verify all objects were created
    if (!verseRef || !alignmentData || !alignmentGroup || !scripture || 
        !note || !bookPackage || !bibleBook || !door43Config || !platformConfig) {
      throw new Error('Failed to create one or more test objects');
    }
    
    return {
      name: 'Type Creation',
      success: true,
      duration: Date.now() - startTime,
      details: {
        typesCreated: 9,
        verseReference: !!verseRef,
        alignmentData: !!alignmentData,
        alignmentGroup: !!alignmentGroup,
        processedScripture: !!scripture,
        translationNote: !!note,
        bookTranslationPackage: !!bookPackage,
        bibleBook: !!bibleBook,
        door43Config: !!door43Config,
        platformConfig: !!platformConfig
      }
    };
  } catch (error) {
    return {
      name: 'Type Creation',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function testTypeValidation(): CLITestResult {
  const startTime = Date.now();
  
  try {
    // Create test objects
    const verseRef = createTestVerseReference();
    const alignmentData = createTestAlignmentData();
    const scripture = createTestProcessedScripture();
    const note = createTestTranslationNote();
    const bookPackage = createTestBookTranslationPackage();
    
    // Validate all objects
    const validations = {
      verseReference: validateVerseReference(verseRef),
      alignmentData: validateAlignmentData(alignmentData),
      processedScripture: validateProcessedScripture(scripture),
      translationNote: validateTranslationNote(note),
      bookTranslationPackage: validateBookTranslationPackage(bookPackage)
    };
    
    const allValid = Object.values(validations).every(v => v === true);
    
    if (!allValid) {
      const failedValidations = Object.entries(validations)
        .filter(([_, valid]) => !valid)
        .map(([name, _]) => name);
      throw new Error(`Validation failed for: ${failedValidations.join(', ')}`);
    }
    
    return {
      name: 'Type Validation',
      success: true,
      duration: Date.now() - startTime,
      details: {
        validationsRun: Object.keys(validations).length,
        results: validations
      }
    };
  } catch (error) {
    return {
      name: 'Type Validation',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function testServiceResultTypes(): CLITestResult {
  const startTime = Date.now();
  
  try {
    // Test successful result
    const successResult: ServiceResult<string> = {
      success: true,
      data: 'test data',
      metadata: {
        source: 'cache',
        timestamp: new Date()
      }
    };
    
    // Test error result
    const errorResult: ServiceResult<string> = {
      success: false,
      error: 'Test error message'
    };
    
    // Validate both results
    const successValid = validateServiceResult(successResult);
    const errorValid = validateServiceResult(errorResult);
    
    if (!successValid || !errorValid) {
      throw new Error('ServiceResult validation failed');
    }
    
    return {
      name: 'Service Result Types',
      success: true,
      duration: Date.now() - startTime,
      details: {
        successResult: successValid,
        errorResult: errorValid,
        successHasData: successResult.success && !!successResult.data,
        errorHasMessage: !errorResult.success && !!errorResult.error
      }
    };
  } catch (error) {
    return {
      name: 'Service Result Types',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function testInterfaceConformance(): CLITestResult {
  const startTime = Date.now();
  
  try {
    // Test that we can create objects that conform to interfaces
    // This is mainly a TypeScript compile-time check, but we can verify structure
    
    // Mock implementations to test interface conformance
    const mockResourceService: Partial<IResourceService> = {
      initialize: async () => {},
      isInitialized: () => true,
      getAvailableBooks: async () => ({ success: true, data: ['GEN', 'EXO'] }),
      clearCache: () => {}
    };
    
    const mockCacheService: Partial<ICacheService> = {
      set: async () => ({ success: true }),
      get: async () => ({ success: true, data: null }),
      has: async () => ({ success: true, data: false }),
      clear: async () => ({ success: true })
    };
    
    const mockParserService: Partial<IParserService> = {
      parseUSFM: () => ({ success: true, data: createTestProcessedScripture() }),
      parseTSV: <T>() => ({ success: true, data: [] as T[] }),
      parseYAML: <T>() => ({ success: true, data: {} as T })
    };
    
    // Verify mock objects have expected methods
    const resourceServiceValid = typeof mockResourceService.initialize === 'function' &&
                                 typeof mockResourceService.isInitialized === 'function';
    
    const cacheServiceValid = typeof mockCacheService.set === 'function' &&
                             typeof mockCacheService.get === 'function';
    
    const parserServiceValid = typeof mockParserService.parseUSFM === 'function' &&
                              typeof mockParserService.parseTSV === 'function';
    
    if (!resourceServiceValid || !cacheServiceValid || !parserServiceValid) {
      throw new Error('Interface conformance test failed');
    }
    
    return {
      name: 'Interface Conformance',
      success: true,
      duration: Date.now() - startTime,
      details: {
        resourceService: resourceServiceValid,
        cacheService: cacheServiceValid,
        parserService: parserServiceValid
      }
    };
  } catch (error) {
    return {
      name: 'Interface Conformance',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests(): Promise<CLITestResults> {
  console.log('🧪 Running Door43 Core Types and Interfaces Tests\n');
  
  const tests = [
    testTypeCreation,
    testTypeValidation,
    testServiceResultTypes,
    testInterfaceConformance
  ];
  
  const results: CLITestResult[] = [];
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
  
  const testResults: CLITestResults = {
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
    console.log('\n✅ All tests passed!');
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
  testTypeCreation,
  testTypeValidation,
  testServiceResultTypes,
  testInterfaceConformance
};
