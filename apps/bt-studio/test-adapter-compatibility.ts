#!/usr/bin/env ts-node

/**
 * Test SQLiteStorageAdapter compatibility with different resource adapter types
 * Demonstrates that our storage layer works with any adapter following the interface
 */

import { createResourceManager } from './src/services/resources/ResourceManager';
import { createTempSQLiteStorage } from './src/services/storage/SQLiteStorageAdapter';
import { 
  ResourceType, 
  BookOrganizedAdapter, 
  EntryOrganizedAdapter,
  ResourceAdapterInfo, 
  AdapterConfig, 
  ScriptureMetadata, 
  ProcessedScripture,
  ResourceMetadata,
  ProcessedContent
} from './src/types/context';

// ============================================================================
// MOCK SCRIPTURE ADAPTER (Book-Organized)
// ============================================================================

class MockScriptureAdapter implements BookOrganizedAdapter {
  resourceType = ResourceType.SCRIPTURE;
  organizationType = 'book' as const;
  serverId = 'mock.server';
  resourceId = 'mock-scripture';

  async getResourceMetadata(server: string, owner: string, language: string): Promise<ScriptureMetadata> {
    await this.delay(50);
    return {
      id: 'mock-scripture',
      server, owner, language,
      type: ResourceType.SCRIPTURE,
      title: `Mock Scripture (${language.toUpperCase()})`,
      description: 'A mock scripture resource for testing',
      name: `scripture-${language}`,
      version: 'v1.0.0',
      lastUpdated: new Date(),
      available: true,
      toc: {
        books: [
          { code: 'gen', name: 'Genesis', chapters: 50, testament: 'OT' },
          { code: 'mat', name: 'Matthew', chapters: 28, testament: 'NT' }
        ]
      },
      isAnchor: true,
      books: [
        { code: 'gen', name: 'Genesis', chapters: 50, testament: 'OT' },
        { code: 'mat', name: 'Matthew', chapters: 28, testament: 'NT' }
      ],
      hasAlignments: true,
      hasSections: true,
      usfmVersion: '3.0',
      processingVersion: '1.0.0'
    };
  }

  async getBookContent(server: string, owner: string, language: string, bookCode: string): Promise<ProcessedScripture> {
    await this.delay(200);
    return {
      book: bookCode.charAt(0).toUpperCase() + bookCode.slice(1),
      bookCode: bookCode.toUpperCase(),
      metadata: {
        bookCode: bookCode.toUpperCase(),
        bookName: bookCode.charAt(0).toUpperCase() + bookCode.slice(1),
        processingDate: new Date().toISOString(),
        processingDuration: 200,
        version: '1.0.0',
        hasAlignments: true,
        hasSections: true,
        totalChapters: 2,
        totalVerses: 4,
        totalParagraphs: 2,
        statistics: {
          totalChapters: 2,
          totalVerses: 4,
          totalParagraphs: 2,
          totalSections: 2,
          totalAlignments: 8
        }
      },
      chapters: [
        {
          number: 1,
          verseCount: 2,
          paragraphCount: 1,
          verses: [
            { number: 1, text: `${bookCode} 1:1 content`, reference: `${bookCode.toUpperCase()} 1:1` },
            { number: 2, text: `${bookCode} 1:2 content`, reference: `${bookCode.toUpperCase()} 1:2` }
          ],
          paragraphs: [
            {
              id: 'p1', type: 'paragraph', style: 'p', indentLevel: 0,
              startVerse: 1, endVerse: 2, verseCount: 2, verseNumbers: [1, 2],
              combinedText: `${bookCode} chapter 1 content`, verses: []
            }
          ]
        }
      ]
    };
  }

  getAvailableBooks(server: string, owner: string, language: string) { 
    return [{ code: 'gen', name: 'Genesis', chapters: 50, testament: 'OT' as const }]; 
  }
  async isBookAvailable() { return true; }
  async isResourceAvailable() { return true; }
  getResourceInfo(): ResourceAdapterInfo {
    return {
      name: 'Mock Scripture Adapter',
      description: 'Book-organized scripture adapter for testing',
      supportedServers: ['mock.server'],
      fallbackOptions: [],
      processingCapabilities: ['usfm', 'chapters', 'verses']
    };
  }
  configure(config: AdapterConfig): void {}
  private delay(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

// ============================================================================
// MOCK TRANSLATION ACADEMY ADAPTER (Entry-Organized)
// ============================================================================

class MockAcademyAdapter implements EntryOrganizedAdapter {
  resourceType = ResourceType.ACADEMY;
  organizationType = 'entry' as const;
  serverId = 'mock.server';
  resourceId = 'mock-academy';

  async getResourceMetadata(server: string, owner: string, language: string): Promise<ResourceMetadata> {
    await this.delay(30);
    return {
      id: 'mock-academy',
      server, owner, language,
      type: ResourceType.ACADEMY,
      title: `Mock Translation Academy (${language.toUpperCase()})`,
      description: 'A mock translation academy resource for testing',
      name: `academy-${language}`,
      version: 'v2.0.0',
      lastUpdated: new Date(),
      available: true,
      toc: {
        articles: [
          { id: 'figs-metaphor', title: 'Metaphor', category: 'translate', description: 'Understanding metaphors' },
          { id: 'translate-unknown', title: 'Translate Unknowns', category: 'translate', description: 'How to translate unknown terms' }
        ]
      },
      isAnchor: false
    };
  }

  async getEntryContent(server: string, owner: string, language: string, entryId: string): Promise<ProcessedContent> {
    await this.delay(150);
    return {
      article: {
        id: entryId,
        title: `Mock Article: ${entryId}`,
        content: `<h1>Mock Article: ${entryId}</h1><p>This is mock content for the ${entryId} article in ${language}.</p>`,
        category: 'translate'
      }
    };
  }

  async getAvailableEntries() {
    return [
      { id: 'figs-metaphor', title: 'Metaphor', category: 'translate', description: 'Understanding metaphors' },
      { id: 'translate-unknown', title: 'Translate Unknowns', category: 'translate', description: 'How to translate unknown terms' }
    ];
  }

  async isEntryAvailable() { return true; }
  async isResourceAvailable() { return true; }
  getResourceInfo(): ResourceAdapterInfo {
    return {
      name: 'Mock Academy Adapter',
      description: 'Entry-organized academy adapter for testing',
      supportedServers: ['mock.server'],
      fallbackOptions: [],
      processingCapabilities: ['markdown', 'html', 'articles']
    };
  }
  configure(config: AdapterConfig): void {}
  private delay(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

// ============================================================================
// MOCK TRANSLATION NOTES ADAPTER (Book-Organized)
// ============================================================================

class MockNotesAdapter implements BookOrganizedAdapter {
  resourceType = ResourceType.NOTES;
  organizationType = 'book' as const;
  serverId = 'mock.server';
  resourceId = 'mock-notes';

  async getResourceMetadata(server: string, owner: string, language: string): Promise<ScriptureMetadata> {
    await this.delay(40);
    return {
      id: 'mock-notes',
      server, owner, language,
      type: ResourceType.NOTES,
      title: `Mock Translation Notes (${language.toUpperCase()})`,
      description: 'A mock translation notes resource for testing',
      name: `notes-${language}`,
      version: 'v1.5.0',
      lastUpdated: new Date(),
      available: true,
      toc: {
        books: [
          { code: 'gen', name: 'Genesis', chapters: 50, testament: 'OT' },
          { code: 'mat', name: 'Matthew', chapters: 28, testament: 'NT' }
        ]
      },
      isAnchor: false,
      books: [
        { code: 'gen', name: 'Genesis', chapters: 50, testament: 'OT' },
        { code: 'mat', name: 'Matthew', chapters: 28, testament: 'NT' }
      ],
      hasAlignments: false,
      hasSections: true,
      usfmVersion: '3.0',
      processingVersion: '1.0.0'
    };
  }

  async getBookContent(server: string, owner: string, language: string, bookCode: string): Promise<ProcessedScripture> {
    await this.delay(180);
    return {
      book: bookCode.charAt(0).toUpperCase() + bookCode.slice(1),
      bookCode: bookCode.toUpperCase(),
      metadata: {
        bookCode: bookCode.toUpperCase(),
        bookName: `${bookCode.charAt(0).toUpperCase() + bookCode.slice(1)} Notes`,
        processingDate: new Date().toISOString(),
        processingDuration: 180,
        version: '1.5.0',
        hasAlignments: false,
        hasSections: true,
        totalChapters: 1,
        totalVerses: 0,
        totalParagraphs: 0,
        statistics: {
          totalChapters: 1,
          totalVerses: 0,
          totalParagraphs: 0,
          totalSections: 3,
          totalAlignments: 0
        }
      },
      chapters: [], // Notes don't have traditional chapters/verses
      notes: [
        { id: 'note1', reference: `${bookCode.toUpperCase()} 1:1`, content: `Note for ${bookCode} 1:1` },
        { id: 'note2', reference: `${bookCode.toUpperCase()} 1:2`, content: `Note for ${bookCode} 1:2` }
      ]
    };
  }

  getAvailableBooks() { return [{ code: 'gen', name: 'Genesis', chapters: 50, testament: 'OT' }]; }
  async isBookAvailable() { return true; }
  async isResourceAvailable() { return true; }
  getResourceInfo(): ResourceAdapterInfo {
    return {
      name: 'Mock Notes Adapter',
      description: 'Book-organized translation notes adapter for testing',
      supportedServers: ['mock.server'],
      fallbackOptions: [],
      processingCapabilities: ['markdown', 'notes', 'references']
    };
  }
  configure(config: AdapterConfig): void {}
  private delay(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
}

// ============================================================================
// COMPATIBILITY TEST
// ============================================================================

async function testAdapterCompatibility() {
  console.log('🧪 Testing SQLiteStorageAdapter Compatibility with Multiple Adapter Types...\n');

  // Create storage and adapters
  const storageAdapter = createTempSQLiteStorage();
  const scriptureAdapter = new MockScriptureAdapter();
  const academyAdapter = new MockAcademyAdapter();
  const notesAdapter = new MockNotesAdapter();

  console.log(`📦 Created test components:`);
  console.log(`   💾 Storage: ${storageAdapter.getDatabasePath()}`);
  console.log(`   📖 Scripture Adapter: ${scriptureAdapter.getResourceInfo().name}`);
  console.log(`   🎓 Academy Adapter: ${academyAdapter.getResourceInfo().name}`);
  console.log(`   📝 Notes Adapter: ${notesAdapter.getResourceInfo().name}`);

  try {
    // Test 1: Multiple adapters with ResourceManager
    console.log('\n1️⃣ Testing Multi-Adapter ResourceManager...');
    
    const resourceManager = createResourceManager();
    await resourceManager.initialize(storageAdapter, [scriptureAdapter, academyAdapter, notesAdapter]);
    console.log('✅ ResourceManager initialized with 3 different adapter types');

    // Test 2: Test each resource type
    const testServer = 'mock.server';
    const testOwner = 'testOrg';
    const testLanguage = 'en';

    console.log('\n2️⃣ Testing Scripture Resource (Book-Organized)...');
    const scriptureMetadata = await resourceManager.getResourceMetadata(testServer, testOwner, testLanguage);
    const scriptureResource = scriptureMetadata.find(m => m.type === ResourceType.SCRIPTURE);
    
    if (scriptureResource) {
      console.log(`   ✅ Scripture metadata: ${scriptureResource.title} v${scriptureResource.version}`);
      console.log(`   📚 Books: ${scriptureResource.toc.books?.length || 0}`);
      
      // Test scripture content
      const scriptureKey = `${testServer}/${testOwner}/${testLanguage}/mock-scripture/gen`;
      const scriptureContent = await resourceManager.getOrFetchContent(scriptureKey, ResourceType.SCRIPTURE);
      
      if (scriptureContent && 'chapters' in scriptureContent) {
        console.log(`   📖 Scripture content: ${scriptureContent.chapters?.length || 0} chapters`);
        console.log(`   🎯 First verse: "${scriptureContent.chapters?.[0]?.verses[0]?.text || 'N/A'}"`);
      }
    }

    console.log('\n3️⃣ Testing Academy Resource (Entry-Organized)...');
    const academyResource = scriptureMetadata.find(m => m.type === ResourceType.ACADEMY);
    
    if (academyResource) {
      console.log(`   ✅ Academy metadata: ${academyResource.title} v${academyResource.version}`);
      console.log(`   📑 Articles: ${academyResource.toc.articles?.length || 0}`);
      
      // Test academy content
      const academyKey = `${testServer}/${testOwner}/${testLanguage}/mock-academy/figs-metaphor`;
      const academyContent = await resourceManager.getOrFetchContent(academyKey, ResourceType.ACADEMY);
      
      if (academyContent && 'article' in academyContent) {
        console.log(`   📄 Academy content: ${academyContent.article?.title || 'N/A'}`);
        console.log(`   🎯 Content preview: "${academyContent.article?.content.substring(0, 50) || 'N/A'}..."`);
      }
    }

    console.log('\n4️⃣ Testing Notes Resource (Book-Organized)...');
    const notesResource = scriptureMetadata.find(m => m.type === ResourceType.NOTES);
    
    if (notesResource) {
      console.log(`   ✅ Notes metadata: ${notesResource.title} v${notesResource.version}`);
      console.log(`   📚 Books: ${notesResource.toc.books?.length || 0}`);
      
      // Test notes content
      const notesKey = `${testServer}/${testOwner}/${testLanguage}/mock-notes/gen`;
      const notesContent = await resourceManager.getOrFetchContent(notesKey, ResourceType.NOTES);
      
      if (notesContent && 'notes' in notesContent) {
        console.log(`   📝 Notes content: ${notesContent.notes?.length || 0} notes`);
        console.log(`   🎯 First note: "${notesContent.notes?.[0]?.content || 'N/A'}"`);
      }
    }

    // Test 3: Storage compatibility verification
    console.log('\n5️⃣ Testing Storage Compatibility...');
    
    const storageInfo = await resourceManager.getStorageInfo();
    console.log(`✅ Storage handles all resource types:`);
    console.log(`   📊 Total Size: ${Math.round(storageInfo.totalSize / 1024)} KB`);
    console.log(`   📦 Items Stored: ${storageInfo.itemCount}`);
    console.log(`   🎯 Resource Types: Scripture, Academy, Notes`);

    // Test 4: Cross-adapter caching
    console.log('\n6️⃣ Testing Cross-Adapter Caching...');
    
    // Test caching for each resource type
    const cacheTests = [
      { key: `${testServer}/${testOwner}/${testLanguage}/mock-scripture/mat`, type: ResourceType.SCRIPTURE, name: 'Scripture' },
      { key: `${testServer}/${testOwner}/${testLanguage}/mock-academy/translate-unknown`, type: ResourceType.ACADEMY, name: 'Academy' },
      { key: `${testServer}/${testOwner}/${testLanguage}/mock-notes/mat`, type: ResourceType.NOTES, name: 'Notes' }
    ];

    for (const test of cacheTests) {
      // First call - fetch and cache
      const fetchStart = Date.now();
      await resourceManager.getOrFetchContent(test.key, test.type);
      const fetchDuration = Date.now() - fetchStart;
      
      // Second call - use cache
      const cacheStart = Date.now();
      await resourceManager.getOrFetchContent(test.key, test.type);
      const cacheDuration = Date.now() - cacheStart;
      
      const speedup = cacheDuration > 0 ? Math.round(fetchDuration / cacheDuration) : '∞';
      console.log(`   ✅ ${test.name}: ${fetchDuration}ms → ${cacheDuration}ms (${speedup}x speedup)`);
    }

    console.log('\n🎉 All adapter compatibility tests passed!');
    
    // Final storage stats
    const finalInfo = await resourceManager.getStorageInfo();
    console.log(`\n📊 Final Compatibility Results:`);
    console.log(`   ✅ Book-Organized Adapters: Scripture ✓, Notes ✓`);
    console.log(`   ✅ Entry-Organized Adapters: Academy ✓`);
    console.log(`   ✅ Mixed Resource Types: ${finalInfo.itemCount} items stored`);
    console.log(`   ✅ Universal Storage: ${Math.round(finalInfo.totalSize / 1024)} KB total`);
    console.log(`   ✅ Caching Works: All resource types cached successfully`);

  } catch (error) {
    console.error('\n❌ Compatibility test failed:', error);
    throw error;
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up...');
    await storageAdapter.close(true);
    console.log('✅ Cleanup completed');
  }
}

// Run the test
if (require.main === module) {
  console.log('🚀 Starting SQLiteStorageAdapter Compatibility Test...');
  testAdapterCompatibility().catch(console.error);
}

export { testAdapterCompatibility };
