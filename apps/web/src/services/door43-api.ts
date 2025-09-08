/**
 * Door43 API Service for Translation Studio Web
 * Fetches real resources from Door43 API v1 and processes with USFM processor
 */

import { usfmProcessor, type ProcessingResult, type ProcessedScripture } from './usfm-processor';
import { offlineCache, type Door43ResourceContext } from './offline-cache';

// Door43 API v1 base URL
const DOOR43_API_BASE = 'https://git.door43.org/api/v1';

// Note: Resource patterns defined inline in functions for now

export interface Door43Resource {
  id: string;
  name: string;
  type: string;
  format: string;
  language: string;
  version: string;
  content?: string;
  metadata?: {
    title?: string;
    description?: string;
    subject?: string;
    contributor?: string[];
    creator?: string;
    publisher?: string;
    issued?: string;
    modified?: string;
    rights?: string;
    identifier?: string;
    
    // Additional Door43 API fields
    fullName?: string;
    website?: string;
    htmlUrl?: string;
    size?: number;
    topics?: string[];
    resourceType?: string;
    abbreviation?: string;
    flavorType?: string;
    checkingLevel?: number;
  };
}

export interface ScriptureVerse {
  chapter: number;
  verse: number;
  text: string;
}

export interface TranslationNote {
  reference: string;
  id: string;
  tags: string;
  supportReference: string;
  quote: string;
  occurrence: string;
  note: string;
}

/**
 * Extract resource type from repository name (e.g., "en_ult" -> "ult", "es-419_glt" -> "glt")
 */
function extractResourceType(resourceId: string): string {
  const parts = resourceId.split('_');
  return parts[parts.length - 1] || 'unknown';
}

/**
 * Extract language from repository name (e.g., "en_ult" -> "en", "es-419_glt" -> "es-419")
 */
function extractLanguageFromRepo(resourceId: string): string {
  const parts = resourceId.split('_');
  return parts.slice(0, -1).join('_') || 'unknown';
}

/**
 * Get resource category based on type
 */
function getResourceCategory(resourceType: string): string {
  const categories: { [key: string]: string } = {
    'ult': 'bible',
    'ust': 'bible', 
    'glt': 'bible',
    'gst': 'bible',
    'ulb': 'bible',
    'udb': 'bible',
    'tn': 'help',
    'tw': 'dict',
    'ta': 'man'
  };
  return categories[resourceType] || 'other';
}

/**
 * Get resource format based on type
 */
function getResourceFormat(resourceType: string): string {
  const formats: { [key: string]: string } = {
    'ult': 'text/usfm',
    'ust': 'text/usfm',
    'glt': 'text/usfm', 
    'gst': 'text/usfm',
    'ulb': 'text/usfm',
    'udb': 'text/usfm',
    'tn': 'text/tsv',
    'tw': 'text/markdown',
    'ta': 'text/markdown'
  };
  return formats[resourceType] || 'text/plain';
}

/**
 * Fetch resource metadata from Door43 API with proper caching
 */
export async function fetchResourceMetadata(org: string, resourceId: string): Promise<Door43Resource | null> {
  console.log(`🔍 Fetching metadata for ${org}/${resourceId}...`);
  
  // Check cache first if online (for offline, we'll always use cache)
  if (offlineCache.isOnline()) {
    // Check if we have valid cached metadata (24 hour TTL)
    const isValid = await offlineCache.isRepoMetadataCacheValid(org, resourceId, 24);
    if (isValid) {
      const cached = await offlineCache.getCachedRepoMetadata(org, resourceId);
      if (cached) {
        console.log(`📦 Using cached metadata for ${org}/${resourceId}`);
        return cached;
      }
    }
  } else {
    // If offline, try to get cached data
    const cached = await offlineCache.getCachedRepoMetadata(org, resourceId);
    if (cached) {
      console.log(`📱 Offline mode: Using cached metadata for ${org}/${resourceId}`);
      return cached;
    } else {
      console.warn(`📱 Offline mode: No cached metadata found for ${org}/${resourceId}`);
      return null;
    }
  }

  try {
    const response = await fetch(`${DOOR43_API_BASE}/repos/${org}/${resourceId}`);
    if (!response.ok) {
      console.warn(`❌ Failed to fetch metadata for ${org}/${resourceId}: ${response.status}`);
      
      // Fallback to cached data if available
      const cached = await offlineCache.getCachedRepoMetadata(org, resourceId);
      if (cached) {
        console.log(`🔄 Network failed, falling back to cached metadata for ${org}/${resourceId}`);
        return cached;
      }
      return null;
    }
    
    const repoData = await response.json();
    
    // Extract resource type and language from repository name
    const resourceType = extractResourceType(resourceId);
    const language = extractLanguageFromRepo(resourceId);
    
    const metadata: Door43Resource = {
      id: resourceId,
      name: repoData.name || resourceId,
      type: getResourceCategory(resourceType),
      format: getResourceFormat(resourceType),
      language: repoData.language || language,
      version: 'latest',
      metadata: {
        // Use API's title field for UI display, fallback to description or name
        title: repoData.title || repoData.description || repoData.name || resourceId,
        description: repoData.description || `${resourceType.toUpperCase()} resource`,
        modified: repoData.updated_at,
        identifier: `${org}/${resourceId}`,
        
        // Additional API metadata for potential future use
        fullName: repoData.full_name,
        website: repoData.website,
        htmlUrl: repoData.html_url,
        size: repoData.size,
        topics: repoData.topics || [],
        resourceType: resourceType,
        abbreviation: repoData.abbreviation,
        flavorType: repoData.flavor_type,
        checkingLevel: repoData.checking_level
      }
    };
    
    // Cache the result for offline use
    try {
      await offlineCache.cacheRepoMetadata(org, resourceId, metadata);
    } catch (cacheError) {
      console.warn(`⚠️ Failed to cache metadata for ${org}/${resourceId}:`, cacheError);
      // Don't fail the request if caching fails
    }
    
    console.log(`✅ Fetched fresh metadata for ${org}/${resourceId}`);
    return metadata;
    
  } catch (error) {
    console.error(`❌ Error fetching metadata for ${org}/${resourceId}:`, error);
    
    // Fallback to cached data if available
    const cached = await offlineCache.getCachedRepoMetadata(org, resourceId);
    if (cached) {
      console.log(`🔄 Network failed, falling back to cached metadata for ${org}/${resourceId}`);
      return cached;
    }
    
    return null;
  }
}

/**
 * Get file metadata including SHA hash from Door43 API
 */
async function getFileMetadata(org: string, repo: string, filePath: string): Promise<{
  sha: string;
  size: number;
  lastModified: string;
} | null> {
  try {
    const response = await fetch(`${DOOR43_API_BASE}/repos/${org}/${repo}/contents/${filePath}`);
    if (!response.ok) {
      console.warn(`Failed to fetch file metadata ${filePath} from ${org}/${repo}: ${response.status}`);
      return null;
    }
    
    const fileData = await response.json();
    
    return {
      sha: fileData.sha,
      size: fileData.size,
      lastModified: fileData.last_modified || new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching file metadata ${filePath} from ${org}/${repo}:`, error);
    return null;
  }
}

/**
 * Fetch raw file content from Door43 repository
 */
async function fetchFileContent(org: string, repo: string, filePath: string): Promise<string | null> {
  try {
    const response = await fetch(`${DOOR43_API_BASE}/repos/${org}/${repo}/raw/master/${filePath}`);
    if (!response.ok) {
      console.warn(`Failed to fetch file ${filePath} from ${org}/${repo}: ${response.status}`);
      return null;
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error fetching file ${filePath} from ${org}/${repo}:`, error);
    return null;
  }
}

/**
 * Fetch file content with metadata (including SHA for cache validation)
 */
async function fetchFileWithMetadata(org: string, repo: string, filePath: string): Promise<{
  content: string;
  metadata: {
    sha: string;
    size: number;
    lastModified: string;
  };
} | null> {
  try {
    // Get both metadata and content
    const [metadata, content] = await Promise.all([
      getFileMetadata(org, repo, filePath),
      fetchFileContent(org, repo, filePath)
    ]);
    
    if (!metadata || !content) {
      return null;
    }
    
    return {
      content,
      metadata
    };
  } catch (error) {
    console.error(`Error fetching file with metadata ${filePath} from ${org}/${repo}:`, error);
    return null;
  }
}

// Old parsing functions removed - now using USFM processor

/**
 * Normalize translation note references
 * Converts intro/front references to proper chapter:verse format
 * Examples:
 * - front:intro -> 1:1
 * - 1:intro -> 1:1  
 * - 2:intro -> 2:1
 * - front:1 -> 1:1
 */
function normalizeReference(reference: string): { chapter: number; verse: number; normalized: string } | null {
  if (!reference || !reference.includes(':')) return null;
  
  const [chapterStr, verseStr] = reference.split(':');
  
  let chapter: number;
  let verse: number;
  
  // Handle front matter
  if (chapterStr === 'front') {
    chapter = 1;
    // front:intro -> 1:1, front:1 -> 1:1, etc.
    verse = verseStr === 'intro' ? 1 : (parseInt(verseStr) || 1);
  } else {
    // Handle regular chapter references
    chapter = parseInt(chapterStr);
    if (isNaN(chapter)) return null;
    
    // Handle intro verses: 1:intro -> 1:1, 2:intro -> 2:1
    if (verseStr === 'intro') {
      verse = 1;
    } else {
      verse = parseInt(verseStr);
      if (isNaN(verse)) return null;
    }
  }
  
  return {
    chapter,
    verse,
    normalized: `${chapter}:${verse}`
  };
}

/**
 * Parse TSV content to extract translation notes for a specific chapter
 */
function parseTSVNotes(tsvContent: string, targetChapter: number): TranslationNote[] {
  const notes: TranslationNote[] = [];
  const lines = tsvContent.split('\n');
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split('\t');
    if (columns.length < 6) continue; // Need at least 6 columns
    
    // TSV format: Reference, ID, Tags, SupportReference, Quote, Occurrence, Note
    const [reference, id, tags, supportReference, quote, occurrence, note] = columns;
    
    // Normalize reference (converts front:intro -> 1:1, 1:intro -> 1:1, etc.)
    const normalizedRef = normalizeReference(reference);
    if (!normalizedRef) continue;
    
    const { chapter, verse, normalized } = normalizedRef;
    
    // Filter by target chapter
    if (chapter !== targetChapter) continue;
    
    notes.push({
      reference: normalized,
      id: id || `${chapter}-${verse}-${i}`,
      tags: tags || '',
      supportReference: supportReference || '',
      quote: quote || '',
      occurrence: occurrence || '1',
      note: note || ''
    });
  }
  
  return notes;
}

/**
 * Parse TSV content to extract translation notes for all chapters
 */
function parseTSVNotesAllChapters(tsvContent: string): TranslationNote[] {
  const notes: TranslationNote[] = [];
  const lines = tsvContent.split('\n');
  
  console.log(`📋 Parsing TSV with ${lines.length} lines...`);
  
  // Skip header line (first line)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split('\t');
    if (columns.length < 6) continue; // Need at least 6 columns
    
    // TSV format: Reference, ID, Tags, SupportReference, Quote, Occurrence, Note
    const [reference, id, tags, supportReference, quote, occurrence, note] = columns;
    
    // Normalize reference (converts front:intro -> 1:1, 1:intro -> 1:1, etc.)
    const normalizedRef = normalizeReference(reference);
    if (!normalizedRef) continue;
    
    const { chapter, verse, normalized } = normalizedRef;
    
    notes.push({
      reference: normalized,
      id: id || `${chapter}-${verse}-${i}`,
      tags: tags || '',
      supportReference: supportReference || '',
      quote: quote || '',
      occurrence: occurrence || '1',
      note: note || ''
    });
  }
  
  console.log(`✅ Parsed ${notes.length} translation notes (including normalized intro/front references)`);
  return notes;
}

/**
 * Get the actual USFM filename for a book from the repository manifest
 */
async function getActualBookFilename(bookCode: string, organization = 'unfoldingWord', repositoryId = 'en_ult'): Promise<string | null> {
  try {
    // Fetch the manifest.yaml file directly
    const response = await fetch(
      `https://git.door43.org/${organization}/${repositoryId}/raw/branch/master/manifest.yaml`
    );

    if (!response.ok) {
      console.warn(`Failed to fetch manifest: ${response.status}`);
      return null;
    }

    const manifestText = await response.text();
    
    // Parse YAML manually to find the book project
    // Look for the book identifier and extract its path
    const lines = manifestText.split('\n');
    let foundBook = false;
    let bookPath = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for identifier line that matches our book code
      if (line.includes(`identifier: ${bookCode.toLowerCase()}`)) {
        foundBook = true;
        continue;
      }
      
      // If we found the book, look for the path in the next few lines
      if (foundBook && line.includes('path: ')) {
        const pathMatch = line.match(/path:\s*\.\/(.+\.usfm)/);
        if (pathMatch) {
          bookPath = pathMatch[1];
          break;
        }
      }
      
      // Reset if we hit another book entry
      if (foundBook && line.includes('- title:') && !line.includes('title:')) {
        foundBook = false;
      }
    }
    
    if (bookPath) {
      console.log(`📄 Found actual filename for ${bookCode} from manifest: ${bookPath}`);
      return bookPath;
    }
    
    console.warn(`📄 No path found in manifest for book code: ${bookCode}`);
    return null;
    
  } catch (error) {
    console.error(`Error fetching manifest:`, error);
    return null;
  }
}

/**
 * Fetch ULT scripture for a specific book and process with USFM processor
 * Includes offline cache support
 */
export async function fetchScripture(
  bookName: string, 
  chapter?: number,
  context: Door43ResourceContext = {
    organization: 'unfoldingWord',
    language: 'en',
    resourceType: 'ult'
  }
): Promise<{
  resource: Door43Resource;
  processedScripture: ProcessedScripture;
  processingResult: ProcessingResult;
  fromCache?: boolean;
} | null> {
  console.log(`🔍 Fetching ${context.organization}/${context.language}/${context.resourceType} scripture for ${bookName}${chapter ? ` chapter ${chapter}` : ' (full book)'}...`);
  
  // Try to get cached data for potential fallback use
  let cachedData = await offlineCache.getCachedScripture(context, bookName);
  
  // If offline, return cached data immediately (no SHA validation needed)
  if (!offlineCache.isOnline()) {
    if (cachedData) {
      console.log(`📱 Offline mode: Using cached scripture for ${bookName}`);
      return {
        ...cachedData,
        fromCache: true
      };
    } else {
      console.warn(`📱 Offline mode: No cached scripture found for ${bookName}`);
      throw new Error(`No cached scripture available for ${bookName} in offline mode`);
    }
  }
  
  // When online, validate cache using SHA hash
  try {
    // Get the actual filename from the repository manifest
    const actualFileName = await getActualBookFilename(bookName);
    let fileName: string;
    
    if (actualFileName) {
      fileName = actualFileName;
      console.log(`✅ Using actual filename for ${bookName}: ${fileName}`);
    } else {
      // Fallback to the old method if we can't get the actual filename
      const bookNumber = getBookNumber(bookName);
      fileName = `${bookNumber.toString().padStart(2, '0')}-${bookName.toUpperCase()}.usfm`;
      console.warn(`⚠️ Using fallback filename for ${bookName}: ${fileName}`);
    }
    
    // Get current file SHA to validate cache
    const fileMetadata = await getFileMetadata(context.organization, `${context.language}_${context.resourceType}`, fileName);
    if (fileMetadata) {
      const isCacheValid = await offlineCache.isCacheValid(context, bookName, fileMetadata.sha);
      
      if (isCacheValid) {
        if (cachedData) {
          console.log(`📦 Using valid cached scripture for ${bookName} (SHA: ${fileMetadata.sha.substring(0, 8)})`);
          return {
            ...cachedData,
            fromCache: true
          };
        }
      } else {
        console.log(`🔄 Cache invalid for ${bookName}, will fetch new version (SHA: ${fileMetadata.sha.substring(0, 8)})`);
      }
    } else {
      console.warn(`⚠️ Could not get file metadata for ${bookName}, proceeding with fetch`);
    }
  } catch (error) {
    console.warn(`⚠️ Error validating cache for ${bookName}:`, error);
  }
  
  try {
    // Fetch metadata
    const repositoryId = `${context.language}_${context.resourceType}`;
    const metadata = await fetchResourceMetadata(context.organization, repositoryId);
    if (!metadata) {
      throw new Error(`Failed to fetch ${repositoryId} metadata`);
    }
    
    // We already have the filename from the cache validation above, but need to get it again
    const actualFileName = await getActualBookFilename(bookName, context.organization, repositoryId);
    let fileName: string;
    
    if (actualFileName) {
      fileName = actualFileName;
    } else {
      // Fallback to the old method if we can't get the actual filename
      const bookNumber = getBookNumber(bookName);
      fileName = `${bookNumber.toString().padStart(2, '0')}-${bookName.toUpperCase()}.usfm`;
      console.warn(`⚠️ Using fallback filename for ${bookName}: ${fileName}`);
    }
    
    // Fetch file content and metadata together
    const fileWithMetadata = await fetchFileWithMetadata(context.organization, repositoryId, fileName);
    
    if (!fileWithMetadata) {
      throw new Error(`Failed to fetch USFM content for ${bookName}`);
    }
    
    const { content: usfmContent, metadata: fileMetadata } = fileWithMetadata;
    
    // Process USFM with our processor
    const processingResult = await usfmProcessor.processUSFM(
      usfmContent, 
      bookName.toUpperCase(), 
      getBookDisplayName(bookName)
    );
    
    console.log(`✅ Processed ${bookName} with USFM processor`);
    console.log(`   Chapters: ${processingResult.metadata.statistics.totalChapters}`);
    console.log(`   Verses: ${processingResult.metadata.statistics.totalVerses}`);
    console.log(`   Paragraphs: ${processingResult.metadata.statistics.totalParagraphs}`);
    console.log(`   Sections: ${processingResult.metadata.statistics.totalSections}`);
    console.log(`   Alignments: ${processingResult.metadata.statistics.totalAlignments}`);
    
    const result = {
      resource: {
        ...metadata,
        content: usfmContent
      },
      processedScripture: processingResult.structuredText,
      processingResult,
      fromCache: false
    };
    
    // Cache the result for offline use with SHA metadata
    try {
      await offlineCache.cacheScripture(
        context,
        bookName,
        result.resource,
        result.processedScripture,
        result.processingResult,
        fileMetadata
      );
      console.log(`💾 Cached scripture for ${bookName} (SHA: ${fileMetadata.sha.substring(0, 8)})`);
    } catch (cacheError) {
      console.warn(`⚠️ Failed to cache scripture for ${bookName}:`, cacheError);
      // Don't fail the request if caching fails
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Error fetching scripture for ${bookName}:`, error);
    
    // Fallback to cached data if available
    if (cachedData) {
      console.log(`🔄 Network failed, falling back to cached scripture for ${bookName}`);
      return {
        ...cachedData,
        fromCache: true
      };
    }
    
    // Re-throw error if no cache available
    throw error;
  }
}

/**
 * Fetch Translation Notes for a specific book (all chapters or specific chapter)
 * Includes offline cache support
 */
export async function fetchTranslationNotes(
  bookName: string, 
  chapter?: number,
  context: Door43ResourceContext = {
    organization: 'unfoldingWord',
    language: 'en',
    resourceType: 'tn'
  }
): Promise<{
  resource: Door43Resource;
  notes: TranslationNote[];
  fromCache?: boolean;
} | null> {
  console.log(`🔍 Fetching ${context.organization}/${context.language}/${context.resourceType} Translation Notes for ${bookName}${chapter ? ` chapter ${chapter}` : ' (full book)'}...`);
  
  // Try to get cached data for potential fallback use
  let cachedData = await offlineCache.getCachedTranslationNotes(context, bookName, chapter);
  
  // If offline, return cached data immediately
  if (!offlineCache.isOnline()) {
    if (cachedData) {
      console.log(`📱 Offline mode: Using cached translation notes for ${bookName}${chapter ? ` chapter ${chapter}` : ''}`);
      return {
        ...cachedData,
        fromCache: true
      };
    } else {
      console.warn(`📱 Offline mode: No cached translation notes found for ${bookName}${chapter ? ` chapter ${chapter}` : ''}`);
      throw new Error(`No cached translation notes available for ${bookName}${chapter ? ` chapter ${chapter}` : ''} in offline mode`);
    }
  }

  // When online, validate cache using SHA hash
  try {
    // Get current file SHA to validate cache
    const fileName = `tn_${bookName.toUpperCase()}.tsv`;
    const fileMetadata = await getFileMetadata(context.organization, `${context.language}_${context.resourceType}`, fileName);
    if (fileMetadata) {
      const isCacheValid = await offlineCache.isCacheValid(context, bookName, fileMetadata.sha);
      
      if (isCacheValid) {
        if (cachedData) {
          console.log(`📦 Using valid cached translation notes for ${bookName}${chapter ? ` chapter ${chapter}` : ''} (SHA: ${fileMetadata.sha.substring(0, 8)})`);
          return {
            ...cachedData,
            fromCache: true
          };
        }
      } else {
        console.log(`🔄 Cache invalid for ${bookName} translation notes, will fetch new version (SHA: ${fileMetadata.sha.substring(0, 8)})`);
      }
    }

    // Fetch metadata
    const repositoryId = `${context.language}_${context.resourceType}`;
    const metadata = await fetchResourceMetadata(context.organization, repositoryId);
    if (!metadata) {
      throw new Error(`Failed to fetch ${repositoryId} metadata`);
    }
    
    // Fetch TSV content (reuse fileName from above)
    const tsvContent = await fetchFileContent(context.organization, repositoryId, fileName);
    
    if (!tsvContent) {
      throw new Error(`Failed to fetch TSV content for ${bookName}`);
    }
    
    // Parse notes for the specified chapter or all chapters
    const notes = chapter ? parseTSVNotes(tsvContent, chapter) : parseTSVNotesAllChapters(tsvContent);
    
    console.log(`✅ Fetched ${notes.length} translation notes for ${bookName}${chapter ? ` chapter ${chapter}` : ' (all chapters)'}`);
    
    const result = {
      resource: {
        ...metadata,
        content: tsvContent
      },
      notes,
      fromCache: false
    };
    
    // Cache the result for offline use
    try {
      await offlineCache.cacheTranslationNotes(
        context,
        bookName,
        result.resource,
        result.notes,
        chapter
      );
    } catch (cacheError) {
      console.warn(`⚠️ Failed to cache translation notes for ${bookName}:`, cacheError);
      // Don't fail the request if caching fails
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Error fetching translation notes for ${bookName}${chapter ? ` chapter ${chapter}` : ''}:`, error);
    
    // Fallback to cached data if available
    if (cachedData) {
      console.log(`🔄 Network failed, falling back to cached translation notes for ${bookName}${chapter ? ` chapter ${chapter}` : ''}`);
      return {
        ...cachedData,
        fromCache: true
      };
    }
    
    // Re-throw error if no cache available
    throw error;
  }
}

/**
 * Get book display name
 */
function getBookDisplayName(bookCode: string): string {
  const bookNames: { [key: string]: string } = {
    'jon': 'Jonah',
    'gen': 'Genesis',
    'exo': 'Exodus',
    'mat': 'Matthew',
    'mrk': 'Mark',
    'luk': 'Luke',
    'jhn': 'John'
    // Add more as needed
  };
  
  return bookNames[bookCode.toLowerCase()] || bookCode.toUpperCase();
}

/**
 * Get book number for USFM file naming
 */
function getBookNumber(bookName: string): number {
  const bookNumbers: { [key: string]: number } = {
    'gen': 1, 'exo': 2, 'lev': 3, 'num': 4, 'deu': 5, 'jos': 6, 'jdg': 7, 'rut': 8,
    '1sa': 9, '2sa': 10, '1ki': 11, '2ki': 12, '1ch': 13, '2ch': 14, 'ezr': 15, 'neh': 16,
    'est': 17, 'job': 18, 'psa': 19, 'pro': 20, 'ecc': 21, 'sng': 22, 'isa': 23, 'jer': 24,
    'lam': 25, 'ezk': 26, 'dan': 27, 'hos': 28, 'jol': 29, 'amo': 30, 'oba': 31, 'jon': 32,
    'mic': 33, 'nam': 34, 'hab': 35, 'zep': 36, 'hag': 37, 'zec': 38, 'mal': 39,
    'mat': 40, 'mrk': 41, 'luk': 42, 'jhn': 43, 'act': 44, 'rom': 45, '1co': 46, '2co': 47,
    'gal': 48, 'eph': 49, 'php': 50, 'col': 51, '1th': 52, '2th': 53, '1ti': 54, '2ti': 55,
    'tit': 56, 'phm': 57, 'heb': 58, 'jas': 59, '1pe': 60, '2pe': 61, '1jn': 62, '2jn': 63,
    '3jn': 64, 'jud': 65, 'rev': 66
  };
  
  return bookNumbers[bookName.toLowerCase()] || 32; // Default to Jonah
}

/**
 * Simple cache implementation for API responses
 */
class SimpleCache {
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
  
  set(key: string, data: unknown, ttlMinutes = 30): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }
  
  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  has(key: string): boolean {
    return this.get(key) !== null;
  }
  
  clear(): void {
    this.cache.clear();
  }
}

export const apiCache = new SimpleCache();
