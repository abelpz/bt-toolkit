/**
 * Door43 Scripture Service
 * Handles scripture resources from Door43 repositories with caching
 */

import { 
  UnifiedStorageLayer,
  StorageKey,
  ContentMetadata,
  VersionMetadata,
  VersionType,
  StorageError,
  StorageErrorCode
} from '../storage'
import { USFMProcessor, ProcessedScripture } from '../../services/usfm-processor'

// Door43 API interfaces
export interface Door43Repository {
  id: number
  name: string
  full_name: string
  description: string
  html_url: string
  clone_url: string
  default_branch: string
  updated_at: string
  size: number
}

export interface Door43FileInfo {
  name: string
  path: string
  sha: string
  size: number
  download_url: string
  type: 'file' | 'dir'
}

export interface Door43Commit {
  sha: string
  commit: {
    author: {
      name: string
      email: string
      date: string
    }
    committer: {
      name: string
      email: string
      date: string
    }
    message: string
  }
}

// Scripture resource interfaces
export interface ScriptureResourceMetadata extends ContentMetadata {
  repoName: string
  fullName: string
  htmlUrl: string
  cloneUrl: string
  defaultBranch: string
  availableBooks: BookInfo[]
  resourceType: 'ult' | 'ust' | 'glt' | 'gst'
  subtype: string
}

export interface BookInfo {
  bookCode: string
  bookName: string
  fileName: string
  size: number
  lastModified: Date
}

export interface ScriptureContent {
  bookCode: string
  bookName: string
  rawUSFM: string
  processedContent: ProcessedScripture
  metadata: ScriptureResourceMetadata
}

// Request interfaces
export interface ScriptureRequest {
  server: string
  owner: string
  language: string
  resourceType: 'ult' | 'ust' | 'glt' | 'gst'
  bookCode: string
}

export interface ResourceMetadataRequest {
  server: string
  owner: string
  language: string
  resourceType: 'ult' | 'ust' | 'glt' | 'gst'
}

export class Door43ScriptureService {
  private storage: UnifiedStorageLayer
  private usfmProcessor: USFMProcessor
  private apiBaseUrl: string

  constructor(storage: UnifiedStorageLayer, apiBaseUrl = 'https://git.door43.org/api/v1') {
    this.storage = storage
    this.usfmProcessor = new USFMProcessor()
    this.apiBaseUrl = apiBaseUrl
  }

  /**
   * Get scripture content for a specific book
   */
  async getScripture(request: ScriptureRequest): Promise<ScriptureContent> {
    console.log(`📖 Getting scripture: ${request.language}_${request.resourceType} ${request.bookCode}`)
    
    // Create storage key for the book
    const bookKey = StorageKey.forBook(
      request.server,
      request.owner,
      request.language,
      request.resourceType,
      request.bookCode
    )
    
    // Try to get from cache first
    const cached = await this.storage.retrieve<ScriptureContent>(bookKey)
    if (cached.found && cached.content && !cached.expired) {
      console.log(`✅ Found cached scripture: ${request.bookCode}`)
      
      // Check if stale and update in background if needed
      if (cached.stale) {
        console.log(`🔄 Content is stale, updating in background...`)
        this.updateScriptureInBackground(request, bookKey).catch(console.error)
      }
      
      return cached.content
    }
    
    console.log(`🌐 Fetching fresh scripture from Door43: ${request.bookCode}`)
    return await this.fetchAndCacheScripture(request, bookKey)
  }

  /**
   * Get resource metadata (repository info and available books)
   */
  async getResourceMetadata(request: ResourceMetadataRequest): Promise<ScriptureResourceMetadata> {
    console.log(`📋 Getting resource metadata: ${request.language}_${request.resourceType}`)
    
    // Create storage key for metadata
    const metadataKey = StorageKey.forMetadata(
      request.server,
      request.owner,
      request.language,
      request.resourceType
    )
    
    // Try to get from cache first
    const cached = await this.storage.retrieve<ScriptureResourceMetadata>(metadataKey)
    if (cached.found && cached.content && !cached.expired) {
      console.log(`✅ Found cached metadata: ${request.language}_${request.resourceType}`)
      
      // Check if stale and update in background if needed
      if (cached.stale) {
        console.log(`🔄 Metadata is stale, updating in background...`)
        this.updateMetadataInBackground(request, metadataKey).catch(console.error)
      }
      
      return cached.content
    }
    
    console.log(`🌐 Fetching fresh metadata from Door43: ${request.language}_${request.resourceType}`)
    return await this.fetchAndCacheMetadata(request, metadataKey)
  }

  /**
   * Check if a book is available in the repository
   */
  async isBookAvailable(request: ScriptureRequest): Promise<boolean> {
    try {
      const metadata = await this.getResourceMetadata(request)
      return metadata.availableBooks.some(book => book.bookCode === request.bookCode)
    } catch (error) {
      console.error(`Failed to check book availability:`, error)
      return false
    }
  }

  /**
   * Get list of available books for a resource
   */
  async getAvailableBooks(request: ResourceMetadataRequest): Promise<BookInfo[]> {
    const metadata = await this.getResourceMetadata(request)
    return metadata.availableBooks
  }

  /**
   * Clear cache for a specific resource or book
   */
  async clearCache(request: Partial<ScriptureRequest>): Promise<void> {
    const pattern = {
      server: request.server,
      owner: request.owner,
      language: request.language,
      resourceType: request.resourceType,
      contentPath: request.bookCode ? `books/${request.bookCode}` : undefined
    }
    
    await this.storage.clear(pattern)
    console.log(`🗑️ Cleared cache for pattern:`, pattern)
  }

  // Private methods
  private async fetchAndCacheScripture(request: ScriptureRequest, storageKey: StorageKey): Promise<ScriptureContent> {
    try {
      // Get repository info
      const repoName = `${request.language}_${request.resourceType}`
      const repository = await this.fetchRepository(request.owner, repoName)
      
      // Get book file info
      const bookFileName = this.getBookFileName(request.bookCode)
      const fileInfo = await this.fetchFileInfo(request.owner, repoName, bookFileName)
      
      // Download USFM content
      const usfmContent = await this.downloadFile(fileInfo.download_url)
      
      // Process USFM
      const bookName = this.getBookName(request.bookCode)
      const processingResult = await this.usfmProcessor.processUSFM(usfmContent, request.bookCode, bookName)
      
      // Create scripture content
      const scriptureContent: ScriptureContent = {
        bookCode: request.bookCode,
        bookName,
        rawUSFM: usfmContent,
        processedContent: processingResult.structuredText,
        metadata: await this.createScriptureMetadata(repository, request, fileInfo)
      }
      
      // Create content metadata for storage
      const contentMetadata: ContentMetadata = {
        id: `${request.language}_${request.resourceType}_${request.bookCode}`,
        title: `${bookName} (${request.resourceType.toUpperCase()})`,
        description: `${bookName} from ${repository.full_name}`,
        contentType: 'scripture',
        format: 'usfm',
        size: usfmContent.length,
        version: {
          type: VersionType.GIT_SHA,
          identifier: fileInfo.sha,
          lastModified: new Date(repository.updated_at),
          checksum: fileInfo.sha
        },
        cachedAt: new Date(),
        dependencies: [],
        relatedContent: [],
        commitSha: fileInfo.sha,
        lastModified: new Date(repository.updated_at)
      }
      
      // Store in cache
      await this.storage.store(storageKey, scriptureContent, contentMetadata)
      
      console.log(`✅ Cached scripture: ${request.bookCode} (${usfmContent.length} chars)`)
      return scriptureContent
      
    } catch (error) {
      throw new StorageError(
        `Failed to fetch scripture ${request.bookCode} from ${request.owner}/${request.language}_${request.resourceType}`,
        StorageErrorCode.NETWORK_ERROR,
        error as Error
      )
    }
  }

  private async fetchAndCacheMetadata(request: ResourceMetadataRequest, storageKey: StorageKey): Promise<ScriptureResourceMetadata> {
    try {
      // Get repository info
      const repoName = `${request.language}_${request.resourceType}`
      const repository = await this.fetchRepository(request.owner, repoName)
      
      // Get list of available books
      const availableBooks = await this.fetchAvailableBooks(request.owner, repoName)
      
      // Create metadata
      const metadata: ScriptureResourceMetadata = {
        id: `${request.language}_${request.resourceType}`,
        title: this.getResourceTitle(request.resourceType, request.language),
        description: repository.description || `${request.resourceType.toUpperCase()} in ${request.language}`,
        contentType: 'scripture-metadata',
        format: 'json',
        size: JSON.stringify(availableBooks).length,
        version: {
          type: VersionType.GIT_SHA,
          identifier: repository.updated_at, // Use updated_at as version for metadata
          lastModified: new Date(repository.updated_at)
        },
        cachedAt: new Date(),
        dependencies: [],
        relatedContent: [],
        
        // Scripture-specific metadata
        repoName: repository.name,
        fullName: repository.full_name,
        htmlUrl: repository.html_url,
        cloneUrl: repository.clone_url,
        defaultBranch: repository.default_branch,
        availableBooks,
        resourceType: request.resourceType,
        subtype: request.resourceType,
        lastModified: new Date(repository.updated_at)
      }
      
      // Store in cache
      await this.storage.store(storageKey, metadata, metadata)
      
      console.log(`✅ Cached metadata: ${request.language}_${request.resourceType} (${availableBooks.length} books)`)
      return metadata
      
    } catch (error) {
      throw new StorageError(
        `Failed to fetch metadata for ${request.owner}/${request.language}_${request.resourceType}`,
        StorageErrorCode.NETWORK_ERROR,
        error as Error
      )
    }
  }

  private async updateScriptureInBackground(request: ScriptureRequest, storageKey: StorageKey): Promise<void> {
    try {
      await this.fetchAndCacheScripture(request, storageKey)
      console.log(`🔄 Background update completed for ${request.bookCode}`)
    } catch (error) {
      console.error(`❌ Background update failed for ${request.bookCode}:`, error)
    }
  }

  private async updateMetadataInBackground(request: ResourceMetadataRequest, storageKey: StorageKey): Promise<void> {
    try {
      await this.fetchAndCacheMetadata(request, storageKey)
      console.log(`🔄 Background metadata update completed for ${request.language}_${request.resourceType}`)
    } catch (error) {
      console.error(`❌ Background metadata update failed for ${request.language}_${request.resourceType}:`, error)
    }
  }

  // Door43 API methods
  private async fetchRepository(owner: string, repoName: string): Promise<Door43Repository> {
    const url = `${this.apiBaseUrl}/repos/${owner}/${repoName}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch repository ${owner}/${repoName}: ${response.status} ${response.statusText}`)
    }
    
    return await response.json()
  }

  private async fetchFileInfo(owner: string, repoName: string, filePath: string): Promise<Door43FileInfo> {
    const url = `${this.apiBaseUrl}/repos/${owner}/${repoName}/contents/${filePath}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file info ${owner}/${repoName}/${filePath}: ${response.status} ${response.statusText}`)
    }
    
    return await response.json()
  }

  private async fetchAvailableBooks(owner: string, repoName: string): Promise<BookInfo[]> {
    // Get contents of the repository root or books directory
    const url = `${this.apiBaseUrl}/repos/${owner}/${repoName}/contents`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch repository contents ${owner}/${repoName}: ${response.status} ${response.statusText}`)
    }
    
    const contents: Door43FileInfo[] = await response.json()
    
    // Filter for USFM files (*.usfm)
    const books: BookInfo[] = []
    for (const item of contents) {
      if (item.type === 'file' && item.name.endsWith('.usfm')) {
        const bookCode = item.name.replace('.usfm', '')
        const bookName = this.getBookName(bookCode)
        
        books.push({
          bookCode,
          bookName,
          fileName: item.name,
          size: item.size,
          lastModified: new Date() // We'd need to fetch commit info for accurate date
        })
      }
    }
    
    return books.sort((a, b) => a.bookCode.localeCompare(b.bookCode))
  }

  private async downloadFile(downloadUrl: string): Promise<string> {
    const response = await fetch(downloadUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`)
    }
    
    return await response.text()
  }

  // Utility methods
  private async createScriptureMetadata(
    repository: Door43Repository,
    request: ScriptureRequest,
    fileInfo: Door43FileInfo
  ): Promise<ScriptureResourceMetadata> {
    return {
      id: `${request.language}_${request.resourceType}`,
      title: this.getResourceTitle(request.resourceType, request.language),
      description: repository.description || `${request.resourceType.toUpperCase()} in ${request.language}`,
      contentType: 'scripture-metadata',
      format: 'json',
      size: fileInfo.size,
      version: {
        type: VersionType.GIT_SHA,
        identifier: fileInfo.sha,
        lastModified: new Date(repository.updated_at),
        checksum: fileInfo.sha
      },
      cachedAt: new Date(),
      dependencies: [],
      relatedContent: [],
      
      // Scripture-specific metadata
      repoName: repository.name,
      fullName: repository.full_name,
      htmlUrl: repository.html_url,
      cloneUrl: repository.clone_url,
      defaultBranch: repository.default_branch,
      availableBooks: [], // This would be populated separately
      resourceType: request.resourceType,
      subtype: request.resourceType,
      lastModified: new Date(repository.updated_at)
    }
  }

  private getBookFileName(bookCode: string): string {
    return `${bookCode}.usfm`
  }

  private getBookName(bookCode: string): string {
    // Simple book code to name mapping - in production, use a proper mapping
    const bookNames: Record<string, string> = {
      'gen': 'Genesis',
      'exo': 'Exodus',
      'lev': 'Leviticus',
      'num': 'Numbers',
      'deu': 'Deuteronomy',
      'jos': 'Joshua',
      'jdg': 'Judges',
      'rut': 'Ruth',
      '1sa': '1 Samuel',
      '2sa': '2 Samuel',
      '1ki': '1 Kings',
      '2ki': '2 Kings',
      '1ch': '1 Chronicles',
      '2ch': '2 Chronicles',
      'ezr': 'Ezra',
      'neh': 'Nehemiah',
      'est': 'Esther',
      'job': 'Job',
      'psa': 'Psalms',
      'pro': 'Proverbs',
      'ecc': 'Ecclesiastes',
      'sng': 'Song of Songs',
      'isa': 'Isaiah',
      'jer': 'Jeremiah',
      'lam': 'Lamentations',
      'ezk': 'Ezekiel',
      'dan': 'Daniel',
      'hos': 'Hosea',
      'jol': 'Joel',
      'amo': 'Amos',
      'oba': 'Obadiah',
      'jon': 'Jonah',
      'mic': 'Micah',
      'nam': 'Nahum',
      'hab': 'Habakkuk',
      'zep': 'Zephaniah',
      'hag': 'Haggai',
      'zec': 'Zechariah',
      'mal': 'Malachi',
      'mat': 'Matthew',
      'mrk': 'Mark',
      'luk': 'Luke',
      'jhn': 'John',
      'act': 'Acts',
      'rom': 'Romans',
      '1co': '1 Corinthians',
      '2co': '2 Corinthians',
      'gal': 'Galatians',
      'eph': 'Ephesians',
      'php': 'Philippians',
      'col': 'Colossians',
      '1th': '1 Thessalonians',
      '2th': '2 Thessalonians',
      '1ti': '1 Timothy',
      '2ti': '2 Timothy',
      'tit': 'Titus',
      'phm': 'Philemon',
      'heb': 'Hebrews',
      'jas': 'James',
      '1pe': '1 Peter',
      '2pe': '2 Peter',
      '1jn': '1 John',
      '2jn': '2 John',
      '3jn': '3 John',
      'jud': 'Jude',
      'rev': 'Revelation'
    }
    
    return bookNames[bookCode.toLowerCase()] || bookCode.toUpperCase()
  }

  private getResourceTitle(resourceType: string, language: string): string {
    const titles: Record<string, string> = {
      'ult': 'Literal Translation',
      'ust': 'Simplified Translation',
      'glt': 'Gateway Language Translation',
      'gst': 'Gateway Simplified Translation'
    }
    
    const title = titles[resourceType] || resourceType.toUpperCase()
    return `${language.toUpperCase()} ${title}`
  }
}
