/**
 * Resource Registry
 * Manages resource metadata, IDs, and lifecycle for normalized cache
 */

import { AsyncResult } from '@bt-toolkit/door43-core';

// ============================================================================
// Resource ID System
// ============================================================================

/**
 * Resource ID format: {server}:{owner}:{repo}:{type}:{path}[:{section}]
 * Example: "door43:unfoldingWord:en_ult:bible-verse:01-GEN.usfm:1:1"
 */
export type ResourceId = string;

/**
 * Resource type classification
 */
export type NormalizedResourceType = 
  | 'bible-verse'           // Individual verse from ULT/UST
  | 'bible-chapter'         // Chapter from ULT/UST  
  | 'translation-note'      // Individual TN entry
  | 'translation-word'      // Individual TW article
  | 'translation-academy'   // Individual TA article
  | 'translation-question'  // Individual TQ entry
  | 'words-link'           // Individual TWL entry
  | 'manifest'             // Repository manifest
  | 'alignment-data';      // Alignment information

/**
 * Repository identifier
 */
export interface RepositoryIdentifier {
  server: string;
  owner: string;
  repoId: string;
  ref: string;
}

/**
 * Resource metadata for registry
 */
export interface ResourceMetadata {
  /** Unique resource identifier */
  id: ResourceId;
  /** Resource type */
  type: NormalizedResourceType;
  /** Human-readable title */
  title: string;
  /** Resource description */
  description?: string;
  /** Source repository information */
  source: ResourceSource;
  /** Content location information */
  location: ResourceLocation;
  /** Cross-reference information */
  references: ResourceReferences;
  /** Cache metadata */
  cache: ResourceCacheMetadata;
}

/**
 * Source repository information
 */
export interface ResourceSource {
  /** Repository identifier */
  repository: RepositoryIdentifier;
  /** Original file path in repository */
  originalPath: string;
  /** Line/section within file (for granular resources) */
  section?: ResourceSection;
  /** Content hash for change detection */
  contentHash: string;
  /** Last known server modification time */
  serverModifiedAt?: Date;
}

/**
 * Section within a file (for granular resources)
 */
export interface ResourceSection {
  /** Line number range */
  lines?: { start: number; end: number };
  /** Field name (for TSV entries) */
  field?: string;
  /** Verse reference (for Bible text) */
  verse?: { book: string; chapter: number; verse: number };
  /** Article section (for TA articles) */
  articleSection?: string;
}

/**
 * Resource location for content addressing
 */
export interface ResourceLocation {
  /** Book (if book-specific) */
  book?: string;
  /** Chapter (if chapter-specific) */
  chapter?: number;
  /** Verse (if verse-specific) */
  verse?: number;
  /** Language */
  language: string;
  /** Additional location metadata */
  metadata: Record<string, any>;
}

/**
 * Cross-reference information
 */
export interface ResourceReferences {
  /** Resources this resource directly references */
  references: ResourceId[];
  /** Resources that reference this resource (backlinks) */
  referencedBy: ResourceId[];
  /** Strong's numbers associated with this resource */
  strongs: string[];
  /** Lemmas associated with this resource */
  lemmas: string[];
  /** RC links (rc://) found in this resource */
  rcLinks: string[];
  /** Support references to TA articles */
  supportReferences: string[];
  /** TW links to Translation Words */
  twLinks: string[];
}

/**
 * Cache-specific metadata
 */
export interface ResourceCacheMetadata {
  /** When resource was first cached */
  cachedAt: Date;
  /** Last accessed timestamp */
  lastAccessedAt: Date;
  /** Access count */
  accessCount: number;
  /** Processing metadata */
  processing: ProcessingInfo;
  /** Modification tracking */
  modification: ModificationInfo;
  /** Size in bytes */
  sizeBytes: number;
}

/**
 * Processing information
 */
export interface ProcessingInfo {
  /** When resource was processed */
  processedAt: Date;
  /** Processing duration */
  processingTimeMs: number;
  /** Parser used */
  parser: string;
  /** Processing options */
  options: Record<string, any>;
  /** Processing issues */
  issues: ProcessingIssue[];
}

/**
 * Processing issue
 */
export interface ProcessingIssue {
  level: 'error' | 'warning' | 'info';
  message: string;
  context?: string;
}

/**
 * Modification tracking
 */
export interface ModificationInfo {
  /** Whether resource has been modified locally */
  isDirty: boolean;
  /** When resource was last modified locally */
  lastModifiedAt?: Date;
  /** What was modified */
  modifications: ResourceModification[];
  /** Conflict resolution status */
  conflictStatus?: 'none' | 'detected' | 'resolved';
}

/**
 * Resource modification record
 */
export interface ResourceModification {
  /** Modification timestamp */
  timestamp: Date;
  /** Type of modification */
  type: 'content' | 'metadata' | 'references';
  /** Description of change */
  description: string;
  /** Old value (for rollback) */
  oldValue?: any;
  /** New value */
  newValue: any;
  /** User/system that made the change */
  modifiedBy: string;
}

// ============================================================================
// Resource Registry Implementation
// ============================================================================

/**
 * Resource registry manages metadata and IDs for all cached resources
 */
export class ResourceRegistry {
  private resources = new Map<ResourceId, ResourceMetadata>();
  private typeIndex = new Map<NormalizedResourceType, Set<ResourceId>>();
  private repositoryIndex = new Map<string, Set<ResourceId>>();
  private locationIndex = new Map<string, Set<ResourceId>>();
  private referenceIndex = new Map<ResourceId, Set<ResourceId>>();
  private backlinksIndex = new Map<ResourceId, Set<ResourceId>>();
  private strongsIndex = new Map<string, Set<ResourceId>>();
  private lemmaIndex = new Map<string, Set<ResourceId>>();

  /**
   * Generate resource ID from components
   */
  generateResourceId(
    repository: RepositoryIdentifier,
    resourceType: NormalizedResourceType,
    resourcePath: string,
    section?: ResourceSection
  ): ResourceId {
    const baseId = `${repository.server}:${repository.owner}:${repository.repoId}:${resourceType}:${resourcePath}`;
    
    if (!section) {
      return baseId;
    }

    // Add section-specific identifier
    if (section.verse) {
      return `${baseId}:${section.verse.chapter}:${section.verse.verse}`;
    }
    
    if (section.field) {
      return `${baseId}:${section.field}`;
    }
    
    if (section.lines) {
      return `${baseId}:${section.lines.start}-${section.lines.end}`;
    }
    
    if (section.articleSection) {
      return `${baseId}:${section.articleSection}`;
    }
    
    return baseId;
  }

  /**
   * Parse resource ID back to components
   */
  parseResourceId(id: ResourceId): {
    server: string;
    owner: string;
    repo: string;
    resourceType: NormalizedResourceType;
    resourcePath: string;
    section?: string;
  } {
    const parts = id.split(':');
    
    if (parts.length < 5) {
      throw new Error(`Invalid resource ID format: ${id}`);
    }

    return {
      server: parts[0],
      owner: parts[1],
      repo: parts[2],
      resourceType: parts[3] as NormalizedResourceType,
      resourcePath: parts[4],
      section: parts.length > 5 ? parts.slice(5).join(':') : undefined
    };
  }

  /**
   * Register a new resource
   */
  async registerResource(metadata: ResourceMetadata): AsyncResult<void> {
    try {
      // Validate resource ID format
      this.parseResourceId(metadata.id);
      
      // Store metadata
      this.resources.set(metadata.id, metadata);
      
      // Update indexes
      this.updateIndexes(metadata);
      
      console.log(`📝 Registered resource: ${metadata.id} (${metadata.type})`);
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register resource'
      };
    }
  }

  /**
   * Get resource metadata
   */
  async getResourceMetadata(id: ResourceId): AsyncResult<ResourceMetadata | null> {
    try {
      const metadata = this.resources.get(id);
      
      if (metadata) {
        // Update access tracking
        metadata.cache.lastAccessedAt = new Date();
        metadata.cache.accessCount++;
      }
      
      return { success: true, data: metadata || null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get resource metadata'
      };
    }
  }

  /**
   * Update resource metadata
   */
  async updateResourceMetadata(id: ResourceId, updates: Partial<ResourceMetadata>): AsyncResult<void> {
    try {
      const existing = this.resources.get(id);
      if (!existing) {
        return {
          success: false,
          error: `Resource not found: ${id}`
        };
      }

      // Merge updates
      const updated = { ...existing, ...updates };
      this.resources.set(id, updated);
      
      // Update indexes if type or references changed
      if (updates.type || updates.references) {
        this.removeFromIndexes(existing);
        this.updateIndexes(updated);
      }
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update resource metadata'
      };
    }
  }

  /**
   * Unregister resource
   */
  async unregisterResource(id: ResourceId): AsyncResult<void> {
    try {
      const metadata = this.resources.get(id);
      if (!metadata) {
        return {
          success: false,
          error: `Resource not found: ${id}`
        };
      }

      // Remove from all indexes
      this.removeFromIndexes(metadata);
      
      // Remove from main registry
      this.resources.delete(id);
      
      console.log(`🗑️ Unregistered resource: ${id}`);
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unregister resource'
      };
    }
  }

  /**
   * Check if resource exists
   */
  async hasResource(id: ResourceId): AsyncResult<boolean> {
    try {
      return { success: true, data: this.resources.has(id) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check resource existence'
      };
    }
  }

  /**
   * List all resources with optional filtering
   */
  async listResources(filter?: {
    type?: NormalizedResourceType;
    repository?: RepositoryIdentifier;
    location?: Partial<ResourceLocation>;
  }): AsyncResult<ResourceMetadata[]> {
    try {
      let resourceIds: Set<ResourceId>;

      if (filter?.type) {
        resourceIds = this.typeIndex.get(filter.type) || new Set();
      } else if (filter?.repository) {
        const repoKey = this.getRepositoryKey(filter.repository);
        resourceIds = this.repositoryIndex.get(repoKey) || new Set();
      } else {
        resourceIds = new Set(this.resources.keys());
      }

      const results: ResourceMetadata[] = [];
      
      for (const id of resourceIds) {
        const metadata = this.resources.get(id);
        if (!metadata) continue;

        // Apply location filter if specified
        if (filter?.location) {
          if (filter.location.book && metadata.location.book !== filter.location.book) continue;
          if (filter.location.chapter && metadata.location.chapter !== filter.location.chapter) continue;
          if (filter.location.verse && metadata.location.verse !== filter.location.verse) continue;
          if (filter.location.language && metadata.location.language !== filter.location.language) continue;
        }

        results.push(metadata);
      }

      return { success: true, data: results };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list resources'
      };
    }
  }

  /**
   * Find resources by Strong's number
   */
  async findByStrongs(strongsNumber: string): AsyncResult<ResourceId[]> {
    try {
      const resourceIds = this.strongsIndex.get(strongsNumber) || new Set();
      return { success: true, data: Array.from(resourceIds) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find resources by Strongs'
      };
    }
  }

  /**
   * Find resources by lemma
   */
  async findByLemma(lemma: string): AsyncResult<ResourceId[]> {
    try {
      const resourceIds = this.lemmaIndex.get(lemma) || new Set();
      return { success: true, data: Array.from(resourceIds) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find resources by lemma'
      };
    }
  }

  /**
   * Get resources that reference a specific resource
   */
  async getBacklinks(resourceId: ResourceId): AsyncResult<ResourceId[]> {
    try {
      const backlinks = this.backlinksIndex.get(resourceId) || new Set();
      return { success: true, data: Array.from(backlinks) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get backlinks'
      };
    }
  }

  /**
   * Get resources referenced by a specific resource
   */
  async getReferences(resourceId: ResourceId): AsyncResult<ResourceId[]> {
    try {
      const references = this.referenceIndex.get(resourceId) || new Set();
      return { success: true, data: Array.from(references) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get references'
      };
    }
  }

  /**
   * Get registry statistics
   */
  async getStatistics(): AsyncResult<{
    totalResources: number;
    resourcesByType: Record<string, number>;
    resourcesByRepository: Record<string, number>;
    averageReferencesPerResource: number;
    mostReferencedResources: Array<{ resourceId: ResourceId; referenceCount: number }>;
  }> {
    try {
      const stats = {
        totalResources: this.resources.size,
        resourcesByType: {} as Record<string, number>,
        resourcesByRepository: {} as Record<string, number>,
        averageReferencesPerResource: 0,
        mostReferencedResources: [] as Array<{ resourceId: ResourceId; referenceCount: number }>
      };

      // Count by type
      for (const [type, resourceIds] of this.typeIndex) {
        stats.resourcesByType[type] = resourceIds.size;
      }

      // Count by repository
      for (const [repo, resourceIds] of this.repositoryIndex) {
        stats.resourcesByRepository[repo] = resourceIds.size;
      }

      // Calculate average references
      let totalReferences = 0;
      const referenceCounts: Array<{ resourceId: ResourceId; referenceCount: number }> = [];
      
      for (const [resourceId, references] of this.referenceIndex) {
        const count = references.size;
        totalReferences += count;
        referenceCounts.push({ resourceId, referenceCount: count });
      }

      stats.averageReferencesPerResource = this.resources.size > 0 
        ? totalReferences / this.resources.size 
        : 0;

      // Get most referenced resources
      stats.mostReferencedResources = referenceCounts
        .sort((a, b) => b.referenceCount - a.referenceCount)
        .slice(0, 10);

      return { success: true, data: stats };
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

  private updateIndexes(metadata: ResourceMetadata): void {
    const { id, type, source, location, references } = metadata;

    // Type index
    if (!this.typeIndex.has(type)) {
      this.typeIndex.set(type, new Set());
    }
    this.typeIndex.get(type)!.add(id);

    // Repository index
    const repoKey = this.getRepositoryKey(source.repository);
    if (!this.repositoryIndex.has(repoKey)) {
      this.repositoryIndex.set(repoKey, new Set());
    }
    this.repositoryIndex.get(repoKey)!.add(id);

    // Location index
    if (location.book) {
      const locationKey = `${location.language}:${location.book}`;
      if (!this.locationIndex.has(locationKey)) {
        this.locationIndex.set(locationKey, new Set());
      }
      this.locationIndex.get(locationKey)!.add(id);
    }

    // Reference indexes
    if (references.references.length > 0) {
      this.referenceIndex.set(id, new Set(references.references));
      
      // Update backlinks
      for (const referencedId of references.references) {
        if (!this.backlinksIndex.has(referencedId)) {
          this.backlinksIndex.set(referencedId, new Set());
        }
        this.backlinksIndex.get(referencedId)!.add(id);
      }
    }

    // Strong's index
    for (const strongs of references.strongs) {
      if (!this.strongsIndex.has(strongs)) {
        this.strongsIndex.set(strongs, new Set());
      }
      this.strongsIndex.get(strongs)!.add(id);
    }

    // Lemma index
    for (const lemma of references.lemmas) {
      if (!this.lemmaIndex.has(lemma)) {
        this.lemmaIndex.set(lemma, new Set());
      }
      this.lemmaIndex.get(lemma)!.add(id);
    }
  }

  private removeFromIndexes(metadata: ResourceMetadata): void {
    const { id, type, source, location, references } = metadata;

    // Type index
    this.typeIndex.get(type)?.delete(id);

    // Repository index
    const repoKey = this.getRepositoryKey(source.repository);
    this.repositoryIndex.get(repoKey)?.delete(id);

    // Location index
    if (location.book) {
      const locationKey = `${location.language}:${location.book}`;
      this.locationIndex.get(locationKey)?.delete(id);
    }

    // Reference indexes
    this.referenceIndex.delete(id);
    
    // Remove backlinks
    for (const referencedId of references.references) {
      this.backlinksIndex.get(referencedId)?.delete(id);
    }

    // Strong's index
    for (const strongs of references.strongs) {
      this.strongsIndex.get(strongs)?.delete(id);
    }

    // Lemma index
    for (const lemma of references.lemmas) {
      this.lemmaIndex.get(lemma)?.delete(id);
    }
  }

  private getRepositoryKey(repository: RepositoryIdentifier): string {
    return `${repository.server}:${repository.owner}:${repository.repoId}:${repository.ref}`;
  }
}

// Global resource registry instance
export const resourceRegistry = new ResourceRegistry();
