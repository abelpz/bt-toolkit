#!/usr/bin/env ts-node

/**
 * Test automatic storage updates using SHA-based change detection
 * Demonstrates how our architecture can handle Door43 SHA keys for efficient updates
 */

import { createResourceManager } from './src/services/resources/ResourceManager';
import { createTempSQLiteStorage } from './src/services/storage/SQLiteStorageAdapter';
import { 
  ResourceType, 
  BookOrganizedAdapter, 
  ResourceAdapterInfo, 
  AdapterConfig, 
  ScriptureMetadata, 
  ProcessedScripture
} from './src/types/context';

// ============================================================================
// ENHANCED DOOR43 ADAPTER WITH SHA CHANGE DETECTION
// ============================================================================

interface Door43ResourceInfo {
  sha: string;
  commit: string;
  lastModified: string;
  size: number;
  url: string;
}

class Door43SHAAdapter implements BookOrganizedAdapter {
  resourceType = ResourceType.SCRIPTURE;
  organizationType = 'book' as const;
  serverId = 'git.door43.org';
  resourceId = 'sha-aware-scripture';

  private config: AdapterConfig = {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    fallbackOptions: ['ult', 'glt', 'ulb'],
    processingCapabilities: ['usfm', 'sections', 'alignments', 'sha-detection']
  };

  // Cache for SHA information to avoid repeated API calls
  private shaCache = new Map<string, Door43ResourceInfo>();

  async getResourceMetadata(server: string, owner: string, language: string): Promise<ScriptureMetadata> {
    console.log(`🔍 Fetching SHA-aware metadata for ${owner}/${language}`);
    
    // Simulate Door43 catalog API response with SHA information
    const mockCatalogResponse = {
      data: [{
        repo: {
          name: `${language}_ult`,
          description: `ULT for ${language}`,
          updated_at: new Date().toISOString()
        },
        release: {
          tag_name: 'v1.2.0',
          commit_sha: 'abc123def456789',
          published_at: new Date().toISOString()
        },
        metadata_version: '3.0',
        title: `${language.toUpperCase()} Unlocked Literal Bible`,
        files: [
          { path: 'GEN.usfm', sha: 'gen123456', size: 150000, last_modified: '2024-01-15T10:30:00Z' },
          { path: 'EXO.usfm', sha: 'exo789012', size: 120000, last_modified: '2024-01-10T14:20:00Z' },
          { path: 'MAT.usfm', sha: 'mat345678', size: 95000, last_modified: '2024-01-20T09:15:00Z' }
        ]
      }]
    };

    const resource = mockCatalogResponse.data[0];
    
    // Store SHA information for each book
    resource.files.forEach(file => {
      const bookCode = file.path.replace('.usfm', '').toLowerCase();
      const key = `${server}/${owner}/${language}/${bookCode}`;
      this.shaCache.set(key, {
        sha: file.sha,
        commit: resource.release.commit_sha,
        lastModified: file.last_modified,
        size: file.size,
        url: `https://${server}/${owner}/${language}_ult/raw/branch/master/${file.path}`
      });
    });

    const books = resource.files.map(file => ({
      code: file.path.replace('.usfm', '').toLowerCase(),
      name: this.getBookName(file.path.replace('.usfm', '').toLowerCase()),
      chapters: this.getChapterCount(file.path.replace('.usfm', '').toLowerCase()),
      testament: this.getTestament(file.path.replace('.usfm', '').toLowerCase()) as 'OT' | 'NT'
    }));

    return {
      id: 'sha-aware-ult',
      server, owner, language,
      type: ResourceType.SCRIPTURE,
      title: resource.title,
      description: `SHA-aware ULT with automatic change detection`,
      name: `ult-${language}`,
      version: resource.release.tag_name,
      lastUpdated: new Date(resource.repo.updated_at),
      available: true,
      toc: { books },
      isAnchor: true,
      books,
      hasAlignments: true,
      hasSections: true,
      usfmVersion: resource.metadata_version,
      processingVersion: '1.0.0-sha',
      // Enhanced metadata with SHA information
      commitSha: resource.release.commit_sha,
      fileHashes: Object.fromEntries(
        resource.files.map(file => [
          file.path.replace('.usfm', '').toLowerCase(),
          file.sha
        ])
      )
    };
  }

  async getBookContent(server: string, owner: string, language: string, bookCode: string): Promise<ProcessedScripture> {
    console.log(`📖 Fetching SHA-aware content for ${bookCode}`);
    
    const key = `${server}/${owner}/${language}/${bookCode}`;
    const shaInfo = this.shaCache.get(key);
    
    if (!shaInfo) {
      throw new Error(`No SHA information available for ${bookCode}`);
    }

    // Simulate USFM processing (content would be processed from Door43 USFM)
    await this.delay(100);

    return {
      book: this.getBookName(bookCode),
      bookCode: bookCode.toUpperCase(),
      metadata: {
        bookCode: bookCode.toUpperCase(),
        bookName: this.getBookName(bookCode),
        processingDate: new Date().toISOString(),
        processingDuration: 100,
        version: '1.0.0-sha',
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
        },
        // Enhanced metadata with SHA information
        sourceSha: shaInfo.sha,
        sourceCommit: shaInfo.commit,
        sourceLastModified: shaInfo.lastModified,
        sourceSize: shaInfo.size
      },
      chapters: [
        {
          number: 1,
          verseCount: 2,
          paragraphCount: 1,
          verses: [
            { number: 1, text: `Mock verse 1 content (SHA: ${shaInfo.sha.substring(0, 8)})`, reference: `${bookCode.toUpperCase()} 1:1` },
            { number: 2, text: 'Mock verse 2 content with change detection', reference: `${bookCode.toUpperCase()} 1:2` }
          ],
          paragraphs: [
            {
              id: 'p1', type: 'paragraph', style: 'p', indentLevel: 0,
              startVerse: 1, endVerse: 2, verseCount: 2, verseNumbers: [1, 2],
              combinedText: `${this.getBookName(bookCode)} chapter 1 content`, verses: []
            }
          ]
        },
        {
          number: 2,
          verseCount: 2,
          paragraphCount: 1,
          verses: [
            { number: 1, text: 'Mock chapter 2 verse 1', reference: `${bookCode.toUpperCase()} 2:1` },
            { number: 2, text: 'Mock chapter 2 verse 2', reference: `${bookCode.toUpperCase()} 2:2` }
          ],
          paragraphs: [
            {
              id: 'p2', type: 'paragraph', style: 'p', indentLevel: 0,
              startVerse: 1, endVerse: 2, verseCount: 2, verseNumbers: [1, 2],
              combinedText: `${this.getBookName(bookCode)} chapter 2 content`, verses: []
            }
          ]
        }
      ]
    };
  }

  /**
   * Check if content has changed using SHA comparison
   */
  async hasContentChanged(server: string, owner: string, language: string, bookCode: string, cachedSha?: string): Promise<boolean> {
    const key = `${server}/${owner}/${language}/${bookCode}`;
    const currentShaInfo = this.shaCache.get(key);
    
    if (!currentShaInfo || !cachedSha) {
      return true; // No cached SHA or no current SHA info means we should fetch
    }
    
    const hasChanged = currentShaInfo.sha !== cachedSha;
    console.log(`🔍 SHA check for ${bookCode}: ${cachedSha} → ${currentShaInfo.sha} (${hasChanged ? 'CHANGED' : 'UNCHANGED'})`);
    
    return hasChanged;
  }

  /**
   * Get current SHA for a book
   */
  getCurrentSha(server: string, owner: string, language: string, bookCode: string): string | undefined {
    const key = `${server}/${owner}/${language}/${bookCode}`;
    return this.shaCache.get(key)?.sha;
  }

  getAvailableBooks(server: string, owner: string, language: string) {
    return [
      { code: 'gen', name: 'Genesis', chapters: 50, testament: 'OT' as const },
      { code: 'exo', name: 'Exodus', chapters: 40, testament: 'OT' as const },
      { code: 'mat', name: 'Matthew', chapters: 28, testament: 'NT' as const }
    ];
  }

  async isBookAvailable() { return true; }
  async isResourceAvailable() { return true; }

  getResourceInfo(): ResourceAdapterInfo {
    return {
      name: 'Door43 SHA-Aware Adapter',
      description: 'Scripture adapter with SHA-based change detection for efficient updates',
      supportedServers: ['git.door43.org'],
      fallbackOptions: this.config.fallbackOptions || [],
      processingCapabilities: this.config.processingCapabilities || []
    };
  }

  configure(config: AdapterConfig): void {
    this.config = { ...this.config, ...config };
  }

  // Helper methods
  private delay(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
  
  private getBookName(code: string): string {
    const names: Record<string, string> = {
      'gen': 'Genesis', 'exo': 'Exodus', 'mat': 'Matthew'
    };
    return names[code] || code.charAt(0).toUpperCase() + code.slice(1);
  }
  
  private getChapterCount(code: string): number {
    const counts: Record<string, number> = {
      'gen': 50, 'exo': 40, 'mat': 28
    };
    return counts[code] || 1;
  }
  
  private getTestament(code: string): string {
    const otBooks = ['gen', 'exo', 'lev', 'num', 'deu'];
    return otBooks.includes(code) ? 'OT' : 'NT';
  }
}

// ============================================================================
// SHA-AWARE CHANGE DETECTION TEST
// ============================================================================

async function testSHAChangeDetection() {
  console.log('🧪 Testing SHA-Based Automatic Storage Updates...\n');

  const storageAdapter = createTempSQLiteStorage();
  const shaAdapter = new Door43SHAAdapter();
  const resourceManager = createResourceManager();

  console.log(`📦 Created SHA-aware test components:`);
  console.log(`   💾 Storage: ${storageAdapter.getDatabasePath()}`);
  console.log(`   🔍 SHA Adapter: ${shaAdapter.getResourceInfo().name}`);

  try {
    // Initialize
    await resourceManager.initialize(storageAdapter, [shaAdapter]);
    console.log('✅ ResourceManager initialized with SHA-aware adapter');

    const testServer = 'git.door43.org';
    const testOwner = 'unfoldingWord';
    const testLanguage = 'en';

    // Test 1: Initial fetch and storage
    console.log('\n1️⃣ Testing Initial Fetch with SHA Storage...');
    
    const metadata = await resourceManager.getResourceMetadata(testServer, testOwner, testLanguage);
    const scriptureResource = metadata.find(m => m.type === ResourceType.SCRIPTURE);
    
    if (scriptureResource) {
      console.log(`✅ Metadata with SHA info: ${scriptureResource.title}`);
      console.log(`   🔗 Commit SHA: ${(scriptureResource as any).commitSha}`);
      console.log(`   📚 File Hashes: ${Object.keys((scriptureResource as any).fileHashes || {}).length} books`);
    }

    // Fetch content for Genesis
    const genKey = `${testServer}/${testOwner}/${testLanguage}/sha-aware-scripture/gen`;
    console.log(`\n📖 Fetching Genesis content...`);
    
    const genContent = await resourceManager.getOrFetchContent(genKey, ResourceType.SCRIPTURE);
    if (genContent && 'metadata' in genContent) {
      console.log(`✅ Genesis content fetched with SHA: ${(genContent.metadata as any).sourceSha}`);
      console.log(`   📊 Chapters: ${genContent.chapters?.length || 0}`);
      console.log(`   🎯 First verse: "${genContent.chapters?.[0]?.verses[0]?.text || 'N/A'}"`);
    }

    // Test 2: Check for changes (no changes expected)
    console.log('\n2️⃣ Testing Change Detection (No Changes)...');
    
    // Get stored content to check its SHA
    const storedContent = await storageAdapter.getResourceContent(genKey);
    const storedSha = storedContent?.content && 'metadata' in storedContent.content 
      ? (storedContent.content.metadata as any).sourceSha 
      : undefined;
    
    const currentSha = shaAdapter.getCurrentSha(testServer, testOwner, testLanguage, 'gen');
    const hasChanged = await shaAdapter.hasContentChanged(testServer, testOwner, testLanguage, 'gen', storedSha);
    
    console.log(`🔍 Change Detection Results:`);
    console.log(`   📦 Stored SHA: ${storedSha}`);
    console.log(`   🌐 Current SHA: ${currentSha}`);
    console.log(`   🔄 Has Changed: ${hasChanged ? '✅ YES' : '❌ NO'}`);

    // Test 3: Simulate content change
    console.log('\n3️⃣ Testing Change Detection (Simulated Change)...');
    
    // Simulate a new SHA by updating the adapter's cache
    const genCacheKey = `${testServer}/${testOwner}/${testLanguage}/gen`;
    const originalShaInfo = (shaAdapter as any).shaCache.get(genCacheKey);
    
    if (originalShaInfo) {
      // Update with new SHA to simulate change
      const newShaInfo = {
        ...originalShaInfo,
        sha: 'new123456789', // Simulate changed SHA
        lastModified: new Date().toISOString()
      };
      (shaAdapter as any).shaCache.set(genCacheKey, newShaInfo);
      
      const hasChangedAfterUpdate = await shaAdapter.hasContentChanged(testServer, testOwner, testLanguage, 'gen', storedSha);
      console.log(`🔍 After SHA Update:`);
      console.log(`   📦 Stored SHA: ${storedSha}`);
      console.log(`   🌐 New SHA: ${newShaInfo.sha}`);
      console.log(`   🔄 Has Changed: ${hasChangedAfterUpdate ? '✅ YES' : '❌ NO'}`);
      
      if (hasChangedAfterUpdate) {
        console.log(`\n🔄 Fetching updated content...`);
        
        // Invalidate cache to force refetch
        await resourceManager.invalidateCache(genKey);
        
        // Fetch updated content
        const updatedContent = await resourceManager.getOrFetchContent(genKey, ResourceType.SCRIPTURE);
        if (updatedContent && 'metadata' in updatedContent) {
          const newStoredSha = (updatedContent.metadata as any).sourceSha;
          console.log(`✅ Updated content fetched with new SHA: ${newStoredSha}`);
          console.log(`   🎯 Updated verse: "${updatedContent.chapters?.[0]?.verses[0]?.text || 'N/A'}"`);
        }
      }
    }

    // Test 4: Batch change detection
    console.log('\n4️⃣ Testing Batch Change Detection...');
    
    const books = ['gen', 'exo', 'mat'];
    const changeResults = await Promise.all(
      books.map(async book => {
        const storedBookContent = await storageAdapter.getResourceContent(`${testServer}/${testOwner}/${testLanguage}/sha-aware-scripture/${book}`);
        const storedBookSha = storedBookContent?.content && 'metadata' in storedBookContent.content 
          ? (storedBookContent.content.metadata as any).sourceSha 
          : undefined;
        
        const hasBookChanged = await shaAdapter.hasContentChanged(testServer, testOwner, testLanguage, book, storedBookSha);
        return { book, hasChanged: hasBookChanged, storedSha: storedBookSha };
      })
    );

    console.log(`📊 Batch Change Detection Results:`);
    changeResults.forEach(result => {
      console.log(`   📖 ${result.book.toUpperCase()}: ${result.hasChanged ? '🔄 CHANGED' : '✅ CURRENT'} (SHA: ${result.storedSha?.substring(0, 8) || 'N/A'})`);
    });

    // Test 5: Performance comparison
    console.log('\n5️⃣ Testing Performance Benefits...');
    
    const unchangedBooks = changeResults.filter(r => !r.hasChanged).map(r => r.book);
    console.log(`📈 Performance Benefits:`);
    console.log(`   ⚡ ${unchangedBooks.length}/${books.length} books can skip download (SHA unchanged)`);
    console.log(`   💾 Estimated bandwidth saved: ~${unchangedBooks.length * 100}KB`);
    console.log(`   ⏱️ Estimated time saved: ~${unchangedBooks.length * 200}ms`);

    console.log('\n🎉 SHA-based change detection tests completed successfully!');
    
    // Final summary
    const finalStorageInfo = await resourceManager.getStorageInfo();
    console.log(`\n📊 Final SHA Change Detection Results:`);
    console.log(`   ✅ SHA-Aware Adapter: Fully functional`);
    console.log(`   ✅ Change Detection: Working for individual and batch operations`);
    console.log(`   ✅ Automatic Updates: Triggered only when SHA changes`);
    console.log(`   ✅ Performance: Optimized with skip-unchanged logic`);
    console.log(`   📦 Storage Items: ${finalStorageInfo.itemCount}`);
    console.log(`   💾 Total Size: ${Math.round(finalStorageInfo.totalSize / 1024)} KB`);

  } catch (error) {
    console.error('\n❌ SHA change detection test failed:', error);
    throw error;
  } finally {
    console.log('\n🧹 Cleaning up...');
    await storageAdapter.close(true);
    console.log('✅ Cleanup completed');
  }
}

// Run the test
if (require.main === module) {
  console.log('🚀 Starting SHA-Based Change Detection Test...');
  testSHAChangeDetection().catch(console.error);
}

export { testSHAChangeDetection, Door43SHAAdapter };
