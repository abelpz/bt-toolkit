/**
 * Content Store
 * Manages processed JSON content for normalized cache resources
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import { IStorageBackend } from '@bt-toolkit/door43-storage';
import { ResourceId, ResourceMetadata } from './resource-registry.js';

// ============================================================================
// Content Types
// ============================================================================

/**
 * Normalized content structure optimized for different resource types
 */
export type NormalizedContent = 
  | BibleVerseContent
  | TranslationNoteContent  
  | TranslationWordContent
  | TranslationAcademyContent
  | TranslationQuestionContent
  | WordsLinkContent
  | AlignmentContent;

/**
 * Bible verse content
 */
export interface BibleVerseContent {
  type: 'bible-verse';
  /** Verse reference */
  reference: { book: string; chapter: number; verse: number };
  /** Verse text */
  text: string;
  /** USFM markers */
  usfm?: string;
  /** Alignment data */
  alignment?: AlignmentGroup[];
  /** Word-level data */
  words: VerseWord[];
}

/**
 * Word within a verse
 */
export interface VerseWord {
  /** Word text */
  text: string;
  /** Position in verse */
  position: number;
  /** Strong's number */
  strongs?: string;
  /** Lemma */
  lemma?: string;
  /** Morphology */
  morph?: string;
  /** Alignment group ID */
  alignmentId?: string;
}

/**
 * Translation note content
 */
export interface TranslationNoteContent {
  type: 'translation-note';
  /** Note reference */
  reference: { book: string; chapter: number; verse: number };
  /** Note ID */
  id: string;
  /** Quoted text */
  quote: string;
  /** Occurrence number */
  occurrence: number;
  /** Note text */
  note: string;
  /** Support reference (resolved) */
  supportReference?: {
    raw: string; // Original rc:// link
    resolved: ResourceId; // Resolved TA article ID
  };
  /** Related resources */
  relatedResources: ResourceId[];
}

/**
 * Translation word content
 */
export interface TranslationWordContent {
  type: 'translation-word';
  /** Word identifier */
  id: string;
  /** Word title */
  title: string;
  /** Word definition */
  definition: string;
  /** Translation suggestions */
  translationSuggestions: string[];
  /** Related words */
  relatedWords: ResourceId[];
  /** Bible references */
  bibleReferences: Array<{
    book: string;
    chapter: number;
    verse: number;
    quote?: string;
  }>;
}

/**
 * Translation Academy content
 */
export interface TranslationAcademyContent {
  type: 'translation-academy';
  /** Article identifier */
  id: string;
  /** Article title */
  title: string;
  /** Article content (merged from title.md, subtitle.md, 01.md) */
  content: string;
  /** Article sections */
  sections: TASection[];
  /** Related articles */
  relatedArticles: ResourceId[];
  /** Question for reflection */
  question?: string;
  /** Examples */
  examples: TAExample[];
}

/**
 * TA article section
 */
export interface TASection {
  /** Section title */
  title: string;
  /** Section content */
  content: string;
  /** Section type */
  type: 'introduction' | 'explanation' | 'examples' | 'conclusion';
}

/**
 * TA example
 */
export interface TAExample {
  /** Example text */
  text: string;
  /** Example explanation */
  explanation?: string;
  /** Bible reference */
  reference?: {
    book: string;
    chapter: number;
    verse: number;
  };
}

/**
 * Translation question content
 */
export interface TranslationQuestionContent {
  type: 'translation-question';
  /** Question reference */
  reference: { book: string; chapter: number; verse: number };
  /** Question ID */
  id: string;
  /** Question text */
  question: string;
  /** Expected answer */
  answer?: string;
  /** Related resources */
  relatedResources: ResourceId[];
}

/**
 * Words link content
 */
export interface WordsLinkContent {
  type: 'words-link';
  /** Link reference */
  reference: { book: string; chapter: number; verse: number };
  /** Link ID */
  id: string;
  /** Original text */
  originalWords: string;
  /** Occurrence */
  occurrence: number;
  /** TW link (resolved) */
  twLink?: {
    raw: string; // Original rc:// link
    resolved: ResourceId; // Resolved TW article ID
  };
}

/**
 * Alignment content
 */
export interface AlignmentContent {
  type: 'alignment-data';
  /** Alignment reference */
  reference: { book: string; chapter: number; verse: number };
  /** Alignment groups */
  groups: AlignmentGroup[];
}

/**
 * Alignment group
 */
export interface AlignmentGroup {
  /** Group ID */
  id: string;
  /** Source words (original language) */
  sourceWords: string[];
  /** Target words (translation) */
  targetWords: string[];
  /** Strong's numbers */
  strongs: string[];
  /** Lemmas */
  lemmas: string[];
  /** Confidence score */
  confidence?: number;
}

/**
 * Content entry with metadata
 */
export interface ContentEntry {
  /** Resource ID */
  resourceId: ResourceId;
  /** Processed content */
  content: NormalizedContent;
  /** Content metadata */
  metadata: ContentMetadata;
}

/**
 * Content metadata
 */
export interface ContentMetadata {
  /** Content size in bytes */
  sizeBytes: number;
  /** Content hash for integrity checking */
  contentHash: string;
  /** When content was stored */
  storedAt: Date;
  /** Last accessed timestamp */
  lastAccessedAt: Date;
  /** Access count */
  accessCount: number;
  /** Compression used */
  compressed: boolean;
  /** Encryption used */
  encrypted: boolean;
}

// ============================================================================
// Content Store Implementation
// ============================================================================

/**
 * Content store manages processed JSON content using pluggable storage backend
 */
export class ContentStore {
  private storageBackend: IStorageBackend;
  private compressionEnabled: boolean;
  private encryptionEnabled: boolean;

  constructor(
    storageBackend: IStorageBackend,
    options: {
      compression?: boolean;
      encryption?: boolean;
    } = {}
  ) {
    this.storageBackend = storageBackend;
    this.compressionEnabled = options.compression || false;
    this.encryptionEnabled = options.encryption || false;
  }

  /**
   * Store normalized content
   */
  async storeContent(resourceId: ResourceId, content: NormalizedContent): AsyncResult<void> {
    try {
      const contentKey = this.getContentKey(resourceId);
      const metadataKey = this.getMetadataKey(resourceId);
      
      // Create content entry
      const contentEntry: ContentEntry = {
        resourceId,
        content,
        metadata: {
          sizeBytes: JSON.stringify(content).length,
          contentHash: this.calculateHash(content),
          storedAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 0,
          compressed: this.compressionEnabled,
          encrypted: this.encryptionEnabled
        }
      };

      // Store content and metadata
      const storeContentResult = await this.storageBackend.set(
        contentKey, 
        content, 
        {
          compress: this.compressionEnabled,
          encrypt: this.encryptionEnabled,
          tags: ['content', content.type]
        }
      );

      if (!storeContentResult.success) {
        return {
          success: false,
          error: `Failed to store content: ${storeContentResult.error}`
        };
      }

      const storeMetadataResult = await this.storageBackend.set(
        metadataKey,
        contentEntry.metadata,
        { tags: ['metadata'] }
      );

      if (!storeMetadataResult.success) {
        return {
          success: false,
          error: `Failed to store metadata: ${storeMetadataResult.error}`
        };
      }

      console.log(`💾 Stored content: ${resourceId} (${content.type})`);
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to store content'
      };
    }
  }

  /**
   * Get normalized content
   */
  async getContent<T extends NormalizedContent = NormalizedContent>(
    resourceId: ResourceId
  ): AsyncResult<T | null> {
    try {
      const contentKey = this.getContentKey(resourceId);
      const metadataKey = this.getMetadataKey(resourceId);
      
      // Get content
      const contentResult = await this.storageBackend.get<T>(contentKey);
      if (!contentResult.success) {
        return {
          success: false,
          error: `Failed to get content: ${contentResult.error}`
        };
      }

      if (!contentResult.data) {
        return { success: true, data: null };
      }

      // Update access metadata
      const metadataResult = await this.storageBackend.get<ContentMetadata>(metadataKey);
      if (metadataResult.success && metadataResult.data) {
        const metadata = metadataResult.data;
        metadata.lastAccessedAt = new Date();
        metadata.accessCount++;
        
        await this.storageBackend.set(metadataKey, metadata, { tags: ['metadata'] });
      }

      return { success: true, data: contentResult.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get content'
      };
    }
  }

  /**
   * Update content (with change tracking)
   */
  async updateContent(
    resourceId: ResourceId, 
    updates: Partial<NormalizedContent>,
    modifiedBy: string
  ): AsyncResult<void> {
    try {
      // Get existing content
      const existingResult = await this.getContent(resourceId);
      if (!existingResult.success) {
        return existingResult;
      }

      if (!existingResult.data) {
        return {
          success: false,
          error: `Content not found: ${resourceId}`
        };
      }

      // Merge updates
      const updatedContent = { ...existingResult.data, ...updates };
      
      // Store updated content
      const storeResult = await this.storeContent(resourceId, updatedContent);
      if (!storeResult.success) {
        return storeResult;
      }

      console.log(`📝 Updated content: ${resourceId} by ${modifiedBy}`);
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update content'
      };
    }
  }

  /**
   * Delete content
   */
  async deleteContent(resourceId: ResourceId): AsyncResult<void> {
    try {
      const contentKey = this.getContentKey(resourceId);
      const metadataKey = this.getMetadataKey(resourceId);
      
      // Delete content and metadata
      const deleteContentResult = await this.storageBackend.delete(contentKey);
      const deleteMetadataResult = await this.storageBackend.delete(metadataKey);

      if (!deleteContentResult.success || !deleteMetadataResult.success) {
        return {
          success: false,
          error: `Failed to delete content: ${deleteContentResult.error || deleteMetadataResult.error}`
        };
      }

      console.log(`🗑️ Deleted content: ${resourceId}`);
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete content'
      };
    }
  }

  /**
   * Check if content exists
   */
  async hasContent(resourceId: ResourceId): AsyncResult<boolean> {
    try {
      const contentKey = this.getContentKey(resourceId);
      return await this.storageBackend.has(contentKey);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check content existence'
      };
    }
  }

  /**
   * Get content metadata
   */
  async getContentMetadata(resourceId: ResourceId): AsyncResult<ContentMetadata | null> {
    try {
      const metadataKey = this.getMetadataKey(resourceId);
      return await this.storageBackend.get<ContentMetadata>(metadataKey);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get content metadata'
      };
    }
  }

  /**
   * Batch content operations
   */
  async batchOperations(operations: Array<{
    type: 'store' | 'get' | 'delete';
    resourceId: ResourceId;
    content?: NormalizedContent;
  }>): AsyncResult<Array<{
    resourceId: ResourceId;
    success: boolean;
    result?: any;
    error?: string;
  }>> {
    try {
      const results = [];
      
      for (const operation of operations) {
        try {
          let result: any;
          let success = true;

          switch (operation.type) {
            case 'store':
              if (!operation.content) {
                throw new Error('Content required for store operation');
              }
              const storeResult = await this.storeContent(operation.resourceId, operation.content);
              success = storeResult.success;
              if (!success) throw new Error(storeResult.error);
              break;

            case 'get':
              const getResult = await this.getContent(operation.resourceId);
              success = getResult.success;
              result = getResult.data;
              if (!success) throw new Error(getResult.error);
              break;

            case 'delete':
              const deleteResult = await this.deleteContent(operation.resourceId);
              success = deleteResult.success;
              if (!success) throw new Error(deleteResult.error);
              break;

            default:
              throw new Error(`Unknown operation type: ${operation.type}`);
          }

          results.push({
            resourceId: operation.resourceId,
            success,
            result
          });
        } catch (error) {
          results.push({
            resourceId: operation.resourceId,
            success: false,
            error: error instanceof Error ? error.message : 'Operation failed'
          });
        }
      }

      return { success: true, data: results };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch operations failed'
      };
    }
  }

  /**
   * Get content size
   */
  async getContentSize(resourceId: ResourceId): AsyncResult<number> {
    try {
      const metadataResult = await this.getContentMetadata(resourceId);
      if (!metadataResult.success) {
        return metadataResult;
      }

      return { 
        success: true, 
        data: metadataResult.data?.sizeBytes || 0 
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get content size'
      };
    }
  }

  /**
   * Optimize storage
   */
  async optimizeStorage(): AsyncResult<{ 
    freedBytes: number; 
    optimizedResources: number 
  }> {
    try {
      // Delegate to storage backend optimization
      const optimizeResult = await this.storageBackend.optimize();
      if (!optimizeResult.success) {
        return {
          success: false,
          error: `Storage optimization failed: ${optimizeResult.error}`
        };
      }

      return {
        success: true,
        data: {
          freedBytes: optimizeResult.data?.spaceFreed || 0,
          optimizedResources: 0 // Would track specific resource optimizations
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to optimize storage'
      };
    }
  }

  /**
   * Get storage statistics
   */
  async getStatistics(): AsyncResult<{
    totalContent: number;
    totalSize: number;
    contentByType: Record<string, number>;
    averageSize: number;
    compressionRatio: number;
  }> {
    try {
      // This would require scanning all content keys
      // For now, return basic stats from storage backend
      const storageInfo = await this.storageBackend.getStorageInfo();
      if (!storageInfo.success) {
        return {
          success: false,
          error: `Failed to get storage info: ${storageInfo.error}`
        };
      }

      return {
        success: true,
        data: {
          totalContent: 0, // Would count content keys
          totalSize: storageInfo.data?.usedSpace || 0,
          contentByType: {},
          averageSize: 0,
          compressionRatio: this.compressionEnabled ? 0.7 : 1.0 // Estimated
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get statistics'
      };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getContentKey(resourceId: ResourceId): string {
    return `content:${resourceId}`;
  }

  private getMetadataKey(resourceId: ResourceId): string {
    return `metadata:${resourceId}`;
  }

  private calculateHash(content: NormalizedContent): string {
    // Simple hash calculation - in production would use crypto
    const str = JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash).toString(16)}`;
  }
}
