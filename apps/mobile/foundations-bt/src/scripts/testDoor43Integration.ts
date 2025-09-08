/**
 * Door43 Integration Test Script
 * Quick validation script for testing Door43 API without UI
 */

import { Door43ApiService } from '../services/door43/Door43ApiService';
import { SampleResourcesService } from '../services/sampleResourcesService';

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

class Door43IntegrationTester {
  private results: TestResult[] = [];

  async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    console.log(`🧪 Running test: ${name}`);
    const startTime = Date.now();
    
    try {
      const data = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        success: true,
        duration,
        data
      });
      
      console.log(`✅ ${name} - Passed (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.results.push({
        name,
        success: false,
        duration,
        error: errorMessage
      });
      
      console.log(`❌ ${name} - Failed (${duration}ms): ${errorMessage}`);
    }
  }

  async testDoor43Service(): Promise<void> {
    console.log('\n🌐 Testing Door43 API Service');
    console.log('================================');
    
    const service = new Door43ApiService({
      language: 'en',
      organization: 'unfoldingWord'
    });

    // Test 1: Service Initialization
    await this.runTest('Service Initialization', async () => {
      await service.initialize();
      return { initialized: service.isInitialized() };
    });

    // Test 2: Get Available Books
    await this.runTest('Get Available Books', async () => {
      const books = await service.getAvailableBooks();
      if (!books || books.length === 0) {
        throw new Error('No books returned');
      }
      return { count: books.length, books: books.slice(0, 5) };
    });

    // Test 3: Get ULT Bible Text
    await this.runTest('Get ULT Bible Text', async () => {
      const books = await service.getAvailableBooks();
      const testBook = books.includes('JON') ? 'JON' : books[0];
      const bibleText = await service.getBibleText(testBook, 'ult');
      
      if (!bibleText) {
        throw new Error(`No ULT text found for ${testBook}`);
      }
      
      return {
        book: bibleText.book,
        translation: bibleText.translation,
        contentLength: bibleText.content.length,
        preview: bibleText.content.substring(0, 100) + '...'
      };
    });

    // Test 4: Get UST Bible Text
    await this.runTest('Get UST Bible Text', async () => {
      const books = await service.getAvailableBooks();
      const testBook = books.includes('JON') ? 'JON' : books[0];
      const bibleText = await service.getBibleText(testBook, 'ust');
      
      if (!bibleText) {
        throw new Error(`No UST text found for ${testBook}`);
      }
      
      return {
        book: bibleText.book,
        translation: bibleText.translation,
        contentLength: bibleText.content.length
      };
    });

    // Test 5: Get Translation Notes
    await this.runTest('Get Translation Notes', async () => {
      const books = await service.getAvailableBooks();
      const testBook = books.includes('JON') ? 'JON' : books[0];
      const notes = await service.getTranslationNotes(testBook);
      
      if (!notes) {
        throw new Error(`No translation notes found for ${testBook}`);
      }
      
      return {
        book: notes.book,
        notesCount: notes.notes.length,
        sampleNote: notes.notes[0] ? {
          reference: notes.notes[0].Reference,
          quote: notes.notes[0].Quote
        } : null
      };
    });

    // Test 6: Get Passage Helps
    await this.runTest('Get Passage Helps', async () => {
      const books = await service.getAvailableBooks();
      const testBook = books.includes('JON') ? 'JON' : books[0];
      const passageHelps = await service.getPassageHelps({
        book: testBook,
        chapter: 1,
        verse: 1,
        original: `${testBook} 1:1`
      });
      
      return {
        reference: passageHelps.reference,
        notesCount: passageHelps.notes.length,
        questionsCount: passageHelps.questions.length,
        wordLinksCount: passageHelps.wordLinks.length
      };
    });
  }

  async testSampleService(): Promise<void> {
    console.log('\n📱 Testing Sample Resource Service');
    console.log('==================================');
    
    const service = new SampleResourcesService();

    // Test 1: Service Initialization
    await this.runTest('Sample Service Initialization', async () => {
      await service.initialize();
      return { initialized: service.isInitialized() };
    });

    // Test 2: Get Available Books
    await this.runTest('Sample Get Available Books', async () => {
      const books = await service.getAvailableBooks();
      return { count: books.length, books };
    });

    // Test 3: Get Bible Text
    await this.runTest('Sample Get Bible Text', async () => {
      const bibleText = await service.getBibleText('JON', 'ult');
      if (!bibleText) {
        throw new Error('No sample bible text found');
      }
      return {
        book: bibleText.book,
        translation: bibleText.translation,
        contentLength: bibleText.content.length
      };
    });

    // Test 4: Get Passage Helps
    await this.runTest('Sample Get Passage Helps', async () => {
      const passageHelps = await service.getPassageHelps({
        book: 'JON',
        chapter: 1,
        verse: 1,
        original: 'JON 1:1'
      });
      
      return {
        notesCount: passageHelps.notes.length,
        questionsCount: passageHelps.questions.length,
        wordLinksCount: passageHelps.wordLinks.length
      };
    });
  }

  async testServiceComparison(): Promise<void> {
    console.log('\n🔄 Testing Service Comparison');
    console.log('=============================');

    const door43Service = new Door43ApiService();
    const sampleService = new SampleResourcesService();

    await Promise.all([
      door43Service.initialize(),
      sampleService.initialize()
    ]);

    // Compare available books
    await this.runTest('Compare Available Books', async () => {
      const [door43Books, sampleBooks] = await Promise.all([
        door43Service.getAvailableBooks(),
        sampleService.getAvailableBooks()
      ]);

      return {
        door43Count: door43Books.length,
        sampleCount: sampleBooks.length,
        commonBooks: door43Books.filter(book => sampleBooks.includes(book)),
        door43Only: door43Books.filter(book => !sampleBooks.includes(book)).slice(0, 5),
        sampleOnly: sampleBooks.filter(book => !door43Books.includes(book))
      };
    });

    // Compare performance for same operation
    await this.runTest('Performance Comparison', async () => {
      const testBook = 'JON';
      
      const door43Start = Date.now();
      const door43Text = await door43Service.getBibleText(testBook, 'ult');
      const door43Duration = Date.now() - door43Start;
      
      const sampleStart = Date.now();
      const sampleText = await sampleService.getBibleText(testBook, 'ult');
      const sampleDuration = Date.now() - sampleStart;
      
      return {
        door43Duration,
        sampleDuration,
        speedRatio: door43Duration / sampleDuration,
        door43HasData: !!door43Text,
        sampleHasData: !!sampleText
      };
    });
  }

  printSummary(): void {
    console.log('\n📊 Test Summary');
    console.log('===============');
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = totalDuration / totalTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Average Duration: ${avgDuration.toFixed(1)}ms`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }

    console.log('\n🏆 Fastest Tests:');
    this.results
      .filter(r => r.success)
      .sort((a, b) => a.duration - b.duration)
      .slice(0, 3)
      .forEach(r => console.log(`  - ${r.name}: ${r.duration}ms`));

    console.log('\n🐌 Slowest Tests:');
    this.results
      .filter(r => r.success)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 3)
      .forEach(r => console.log(`  - ${r.name}: ${r.duration}ms`));
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Door43 Integration Tests');
    console.log('====================================');
    
    try {
      await this.testSampleService();
      await this.testDoor43Service();
      await this.testServiceComparison();
    } catch (error) {
      console.error('💥 Test suite failed:', error);
    } finally {
      this.printSummary();
    }
  }
}

// Export for use in other files
export { Door43IntegrationTester };

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new Door43IntegrationTester();
  tester.runAllTests().catch(console.error);
}
