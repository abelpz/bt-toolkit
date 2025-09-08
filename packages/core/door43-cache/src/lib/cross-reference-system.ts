/**
 * Cross-Reference System
 * Fast bidirectional resource traversal and relationship management
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import { IStorageBackend } from '@bt-toolkit/door43-storage';
import { ResourceId, NormalizedResourceType } from './resource-registry.js';
import { NormalizedContent } from './content-store.js';

// ============================================================================
// Cross-Reference Types
// ============================================================================

/**
 * Cross-reference link between resources
 */
export interface CrossReference {
  /** Source resource ID */
  fromId: ResourceId;
  /** Target resource ID */
  toId: ResourceId;
  /** Reference type */
  type: CrossReferenceType;
  /** Reference strength/confidence */
  strength: number; // 0-1
  /** Context of the reference */
  context?: string;
  /** Bidirectional flag */
  bidirectional: boolean;
  /** When reference was created */
  createdAt: Date;
}

/**
 * Cross-reference types
 */
export type CrossReferenceType =
  | 'support-reference'    // TN → TA
  | 'tw-link'             // TWL → TW
  | 'bible-reference'     // Any → Bible verse
  | 'related-concept'     // Semantic relationship
  | 'same-strongs'        // Same Strong's number
  | 'same-lemma'          // Same lemma
  | 'translation-pair'    // ULT ↔ UST
  | 'alignment-link';     // Alignment relationship

/**
 * Cross-reference index for fast lookups
 */
export interface CrossReferenceIndex {
  /** Outgoing references from each resource */
  outgoing: Map<ResourceId, CrossReference[]>;
  /** Incoming references to each resource */
  incoming: Map<ResourceId, CrossReference[]>;
  /** Strong's number to resource mapping */
  strongsIndex: Map<string, ResourceId[]>;
  /** Lemma to resource mapping */
  lemmaIndex: Map<string, ResourceId[]>;
  /** Support reference to TA article mapping */
  supportRefIndex: Map<string, ResourceId>; // rc:// link to TA resource ID
  /** TW link to TW article mapping */
  twLinkIndex: Map<string, ResourceId>; // rc:// link to TW resource ID
  /** Book to resource files mapping */
  bookIndex: Map<string, ResourceId[]>; // book to resource IDs
}

/**
 * Traversal options
 */
export interface TraversalOptions {
  /** Maximum depth to traverse */
  maxDepth?: number;
  /** Minimum strength threshold */
  minStrength?: number;
  /** Reference types to follow */
  types?: CrossReferenceType[];
  /** Include backlinks in traversal */
  includeBacklinks?: boolean;
  /** Maximum results to return */
  maxResults?: number;
}

/**
 * Traversal result
 */
export interface TraversalResult {
  /** Found resources */
  resources: ResourceId[];
  /** Path to each resource */
  paths: Map<ResourceId, ResourceId[]>;
  /** Relationships found */
  relationships: CrossReference[];
  /** Traversal statistics */
  stats: {
    nodesVisited: number;
    edgesTraversed: number;
    maxDepthReached: number;
    executionTimeMs: number;
  };
}

// ============================================================================
// Cross-Reference System Implementation
// ============================================================================

/**
 * Cross-reference system manages bidirectional resource relationships
 */
export class CrossReferenceSystem {
  private storageBackend: IStorageBackend;
  private index: CrossReferenceIndex;
  private indexLoaded = false;

  constructor(storageBackend: IStorageBackend) {
    this.storageBackend = storageBackend;
    this.index = {
      outgoing: new Map(),
      incoming: new Map(),
      strongsIndex: new Map(),
      lemmaIndex: new Map(),
      supportRefIndex: new Map(),
      twLinkIndex: new Map(),
      bookIndex: new Map()
    };
  }

  /**
   * Initialize cross-reference system
   */
  async initialize(): AsyncResult<void> {
    try {
      // Load existing index from storage
      const indexResult = await this.storageBackend.get<CrossReferenceIndex>('xref:index');
      if (indexResult.success && indexResult.data) {
        this.index = this.deserializeIndex(indexResult.data);
        console.log('📊 Loaded cross-reference index from storage');
      } else {
        console.log('📊 Initializing new cross-reference index');
      }

      this.indexLoaded = true;
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize cross-reference system'
      };
    }
  }

  /**
   * Add cross-reference between resources
   */
  async addCrossReference(reference: CrossReference): AsyncResult<void> {
    try {
      if (!this.indexLoaded) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      const { fromId, toId, bidirectional } = reference;

      // Add to outgoing index
      if (!this.index.outgoing.has(fromId)) {
        this.index.outgoing.set(fromId, []);
      }
      this.index.outgoing.get(fromId)!.push(reference);

      // Add to incoming index
      if (!this.index.incoming.has(toId)) {
        this.index.incoming.set(toId, []);
      }
      this.index.incoming.get(toId)!.push(reference);

      // If bidirectional, add reverse reference
      if (bidirectional) {
        const reverseRef: CrossReference = {
          ...reference,
          fromId: toId,
          toId: fromId
        };

        if (!this.index.outgoing.has(toId)) {
          this.index.outgoing.set(toId, []);
        }
        this.index.outgoing.get(toId)!.push(reverseRef);

        if (!this.index.incoming.has(fromId)) {
          this.index.incoming.set(fromId, []);
        }
        this.index.incoming.get(fromId)!.push(reverseRef);
      }

      // Store individual reference
      const refKey = `xref:${fromId}:${toId}:${reference.type}`;
      await this.storageBackend.set(refKey, reference, { tags: ['cross-reference'] });

      // Update persistent index
      await this.saveIndex();

      console.log(`🔗 Added cross-reference: ${fromId} → ${toId} (${reference.type})`);
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add cross-reference'
      };
    }
  }

  /**
   * Remove cross-reference
   */
  async removeCrossReference(fromId: ResourceId, toId: ResourceId, type: CrossReferenceType): AsyncResult<void> {
    try {
      if (!this.indexLoaded) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      // Remove from outgoing index
      const outgoingRefs = this.index.outgoing.get(fromId);
      if (outgoingRefs) {
        const filtered = outgoingRefs.filter(ref => !(ref.toId === toId && ref.type === type));
        this.index.outgoing.set(fromId, filtered);
      }

      // Remove from incoming index
      const incomingRefs = this.index.incoming.get(toId);
      if (incomingRefs) {
        const filtered = incomingRefs.filter(ref => !(ref.fromId === fromId && ref.type === type));
        this.index.incoming.set(toId, filtered);
      }

      // Remove from storage
      const refKey = `xref:${fromId}:${toId}:${type}`;
      await this.storageBackend.delete(refKey);

      // Update persistent index
      await this.saveIndex();

      console.log(`🔗 Removed cross-reference: ${fromId} → ${toId} (${type})`);
      
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove cross-reference'
      };
    }
  }

  /**
   * Get outgoing references from a resource
   */
  async getOutgoingReferences(resourceId: ResourceId): AsyncResult<CrossReference[]> {
    try {
      if (!this.indexLoaded) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      const references = this.index.outgoing.get(resourceId) || [];
      return { success: true, data: references };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get outgoing references'
      };
    }
  }

  /**
   * Get incoming references to a resource (backlinks)
   */
  async getIncomingReferences(resourceId: ResourceId): AsyncResult<CrossReference[]> {
    try {
      if (!this.indexLoaded) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      const references = this.index.incoming.get(resourceId) || [];
      return { success: true, data: references };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get incoming references'
      };
    }
  }

  /**
   * Find resources by Strong's number
   */
  async findByStrongs(strongsNumber: string): AsyncResult<ResourceId[]> {
    try {
      if (!this.indexLoaded) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      const resourceIds = this.index.strongsIndex.get(strongsNumber) || [];
      return { success: true, data: resourceIds };
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
      if (!this.indexLoaded) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      const resourceIds = this.index.lemmaIndex.get(lemma) || [];
      return { success: true, data: resourceIds };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find resources by lemma'
      };
    }
  }

  /**
   * Resolve support reference to TA article
   */
  async resolveSupportReference(supportRef: string): AsyncResult<ResourceId | null> {
    try {
      if (!this.indexLoaded) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      const resourceId = this.index.supportRefIndex.get(supportRef) || null;
      return { success: true, data: resourceId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resolve support reference'
      };
    }
  }

  /**
   * Resolve TW link to TW article
   */
  async resolveTWLink(twLink: string): AsyncResult<ResourceId | null> {
    try {
      if (!this.indexLoaded) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      const resourceId = this.index.twLinkIndex.get(twLink) || null;
      return { success: true, data: resourceId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resolve TW link'
      };
    }
  }

  /**
   * Get all resources for a book
   */
  async getBookResources(book: string): AsyncResult<ResourceId[]> {
    try {
      if (!this.indexLoaded) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      const resourceIds = this.index.bookIndex.get(book) || [];
      return { success: true, data: resourceIds };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get book resources'
      };
    }
  }

  /**
   * Traverse cross-references to find related resources
   */
  async traverseReferences(
    startId: ResourceId,
    options: TraversalOptions = {}
  ): AsyncResult<TraversalResult> {
    const startTime = Date.now();
    
    try {
      if (!this.indexLoaded) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      const {
        maxDepth = 3,
        minStrength = 0,
        types = [],
        includeBacklinks = true,
        maxResults = 100
      } = options;

      const visited = new Set<ResourceId>();
      const queue: Array<{ id: ResourceId; depth: number; path: ResourceId[] }> = [];
      const results = new Map<ResourceId, ResourceId[]>();
      const relationships: CrossReference[] = [];
      
      let nodesVisited = 0;
      let edgesTraversed = 0;
      let maxDepthReached = 0;

      // Initialize with start resource
      queue.push({ id: startId, depth: 0, path: [startId] });
      visited.add(startId);

      while (queue.length > 0 && results.size < maxResults) {
        const current = queue.shift()!;
        nodesVisited++;
        maxDepthReached = Math.max(maxDepthReached, current.depth);

        if (current.depth >= maxDepth) continue;

        // Get outgoing references
        const outgoingRefs = this.index.outgoing.get(current.id) || [];
        for (const ref of outgoingRefs) {
          edgesTraversed++;
          
          // Apply filters
          if (types.length > 0 && !types.includes(ref.type)) continue;
          if (ref.strength < minStrength) continue;

          if (!visited.has(ref.toId)) {
            visited.add(ref.toId);
            const newPath = [...current.path, ref.toId];
            results.set(ref.toId, newPath);
            relationships.push(ref);
            
            queue.push({ id: ref.toId, depth: current.depth + 1, path: newPath });
          }
        }

        // Get incoming references if enabled
        if (includeBacklinks) {
          const incomingRefs = this.index.incoming.get(current.id) || [];
          for (const ref of incomingRefs) {
            edgesTraversed++;
            
            // Apply filters
            if (types.length > 0 && !types.includes(ref.type)) continue;
            if (ref.strength < minStrength) continue;

            if (!visited.has(ref.fromId)) {
              visited.add(ref.fromId);
              const newPath = [...current.path, ref.fromId];
              results.set(ref.fromId, newPath);
              relationships.push(ref);
              
              queue.push({ id: ref.fromId, depth: current.depth + 1, path: newPath });
            }
          }
        }
      }

      const traversalResult: TraversalResult = {
        resources: Array.from(results.keys()),
        paths: results,
        relationships,
        stats: {
          nodesVisited,
          edgesTraversed,
          maxDepthReached,
          executionTimeMs: Date.now() - startTime
        }
      };

      return { success: true, data: traversalResult };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to traverse references'
      };
    }
  }

  /**
   * Build cross-reference index from content
   */
  async buildIndexFromContent(
    resourceId: ResourceId,
    content: NormalizedContent
  ): AsyncResult<void> {
    try {
      // Extract cross-references based on content type
      const references: CrossReference[] = [];
      
      switch (content.type) {
        case 'bible-verse':
          // Extract Strong's and lemma references
          for (const word of content.words) {
            if (word.strongs) {
              this.addToStrongsIndex(word.strongs, resourceId);
            }
            if (word.lemma) {
              this.addToLemmaIndex(word.lemma, resourceId);
            }
          }
          
          // Add to book index
          this.addToBookIndex(content.reference.book, resourceId);
          break;

        case 'translation-note':
          // Add support reference
          if (content.supportReference) {
            references.push({
              fromId: resourceId,
              toId: content.supportReference.resolved,
              type: 'support-reference',
              strength: 0.8,
              bidirectional: false,
              createdAt: new Date()
            });
            
            this.index.supportRefIndex.set(content.supportReference.raw, content.supportReference.resolved);
          }
          
          // Add related resource references
          for (const relatedId of content.relatedResources) {
            references.push({
              fromId: resourceId,
              toId: relatedId,
              type: 'related-concept',
              strength: 0.6,
              bidirectional: true,
              createdAt: new Date()
            });
          }
          
          // Add to book index
          this.addToBookIndex(content.reference.book, resourceId);
          break;

        case 'words-link':
          // Add TW link
          if (content.twLink) {
            references.push({
              fromId: resourceId,
              toId: content.twLink.resolved,
              type: 'tw-link',
              strength: 0.9,
              bidirectional: false,
              createdAt: new Date()
            });
            
            this.index.twLinkIndex.set(content.twLink.raw, content.twLink.resolved);
          }
          
          // Add to book index
          this.addToBookIndex(content.reference.book, resourceId);
          break;

        case 'translation-word':
          // Add related word references
          for (const relatedId of content.relatedWords) {
            references.push({
              fromId: resourceId,
              toId: relatedId,
              type: 'related-concept',
              strength: 0.7,
              bidirectional: true,
              createdAt: new Date()
            });
          }
          break;

        case 'translation-academy':
          // Add related article references
          for (const relatedId of content.relatedArticles) {
            references.push({
              fromId: resourceId,
              toId: relatedId,
              type: 'related-concept',
              strength: 0.5,
              bidirectional: true,
              createdAt: new Date()
            });
          }
          break;
      }

      // Add all extracted references
      for (const reference of references) {
        await this.addCrossReference(reference);
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to build index from content'
      };
    }
  }

  /**
   * Get cross-reference statistics
   */
  async getStatistics(): AsyncResult<{
    totalReferences: number;
    referencesByType: Record<string, number>;
    averageReferencesPerResource: number;
    strongestConnections: Array<{ fromId: ResourceId; toId: ResourceId; strength: number }>;
    mostReferencedResources: Array<{ resourceId: ResourceId; incomingCount: number }>;
  }> {
    try {
      if (!this.indexLoaded) {
        const initResult = await this.initialize();
        if (!initResult.success) return initResult;
      }

      let totalReferences = 0;
      const referencesByType: Record<string, number> = {};
      const strongestConnections: Array<{ fromId: ResourceId; toId: ResourceId; strength: number }> = [];
      const incomingCounts = new Map<ResourceId, number>();

      // Count references by type and find strongest connections
      for (const [fromId, references] of this.index.outgoing) {
        totalReferences += references.length;
        
        for (const ref of references) {
          // Count by type
          referencesByType[ref.type] = (referencesByType[ref.type] || 0) + 1;
          
          // Track strongest connections
          strongestConnections.push({
            fromId: ref.fromId,
            toId: ref.toId,
            strength: ref.strength
          });
          
          // Count incoming references
          incomingCounts.set(ref.toId, (incomingCounts.get(ref.toId) || 0) + 1);
        }
      }

      // Sort strongest connections
      strongestConnections.sort((a, b) => b.strength - a.strength);
      const topConnections = strongestConnections.slice(0, 10);

      // Sort most referenced resources
      const mostReferenced = Array.from(incomingCounts.entries())
        .map(([resourceId, count]) => ({ resourceId, incomingCount: count }))
        .sort((a, b) => b.incomingCount - a.incomingCount)
        .slice(0, 10);

      const uniqueResources = new Set([
        ...this.index.outgoing.keys(),
        ...this.index.incoming.keys()
      ]).size;

      return {
        success: true,
        data: {
          totalReferences,
          referencesByType,
          averageReferencesPerResource: uniqueResources > 0 ? totalReferences / uniqueResources : 0,
          strongestConnections: topConnections,
          mostReferencedResources: mostReferenced
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

  private addToStrongsIndex(strongs: string, resourceId: ResourceId): void {
    if (!this.index.strongsIndex.has(strongs)) {
      this.index.strongsIndex.set(strongs, []);
    }
    const resources = this.index.strongsIndex.get(strongs)!;
    if (!resources.includes(resourceId)) {
      resources.push(resourceId);
    }
  }

  private addToLemmaIndex(lemma: string, resourceId: ResourceId): void {
    if (!this.index.lemmaIndex.has(lemma)) {
      this.index.lemmaIndex.set(lemma, []);
    }
    const resources = this.index.lemmaIndex.get(lemma)!;
    if (!resources.includes(resourceId)) {
      resources.push(resourceId);
    }
  }

  private addToBookIndex(book: string, resourceId: ResourceId): void {
    if (!this.index.bookIndex.has(book)) {
      this.index.bookIndex.set(book, []);
    }
    const resources = this.index.bookIndex.get(book)!;
    if (!resources.includes(resourceId)) {
      resources.push(resourceId);
    }
  }

  private async saveIndex(): AsyncResult<void> {
    try {
      const serializedIndex = this.serializeIndex(this.index);
      await this.storageBackend.set('xref:index', serializedIndex, { 
        tags: ['index', 'cross-reference'] 
      });
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save index'
      };
    }
  }

  private serializeIndex(index: CrossReferenceIndex): any {
    return {
      outgoing: Array.from(index.outgoing.entries()),
      incoming: Array.from(index.incoming.entries()),
      strongsIndex: Array.from(index.strongsIndex.entries()),
      lemmaIndex: Array.from(index.lemmaIndex.entries()),
      supportRefIndex: Array.from(index.supportRefIndex.entries()),
      twLinkIndex: Array.from(index.twLinkIndex.entries()),
      bookIndex: Array.from(index.bookIndex.entries())
    };
  }

  private deserializeIndex(data: any): CrossReferenceIndex {
    return {
      outgoing: new Map(data.outgoing || []),
      incoming: new Map(data.incoming || []),
      strongsIndex: new Map(data.strongsIndex || []),
      lemmaIndex: new Map(data.lemmaIndex || []),
      supportRefIndex: new Map(data.supportRefIndex || []),
      twLinkIndex: new Map(data.twLinkIndex || []),
      bookIndex: new Map(data.bookIndex || [])
    };
  }
}
