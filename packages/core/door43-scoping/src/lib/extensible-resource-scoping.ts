/**
 * Extensible Resource Scoping
 * Handles dynamic resource types and interconnected resource relationships
 */

import { ResourceScope, ResourceFilter, FilterCriteria } from './resource-scope-manager.js';

// ============================================================================
// Extensible Resource Types and Relationships
// ============================================================================

/**
 * Dynamic resource type definition
 */
export interface DynamicResourceType {
  /** Resource type identifier */
  type: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description: string;
  /** Resource characteristics */
  characteristics: ResourceCharacteristics;
  /** Relationship patterns */
  relationships: ResourceRelationshipPattern[];
  /** Discovery metadata */
  discovery: ResourceDiscoveryMetadata;
}

/**
 * Resource characteristics for scoping decisions
 */
export interface ResourceCharacteristics {
  /** Is this resource book-specific? */
  bookSpecific: boolean;
  /** Is this resource verse-specific? */
  verseSpecific: boolean;
  /** Is this resource user-generated? */
  userGenerated: boolean;
  /** Is this resource collaborative? */
  collaborative: boolean;
  /** Expected size category */
  sizeCategory: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  /** Update frequency */
  updateFrequency: 'static' | 'occasional' | 'frequent' | 'realtime';
  /** Priority for different use cases */
  useCasePriority: {
    reader: 'low' | 'normal' | 'high' | 'critical';
    translator: 'low' | 'normal' | 'high' | 'critical';
    reviewer: 'low' | 'normal' | 'high' | 'critical';
    server: 'low' | 'normal' | 'high' | 'critical';
  };
}

/**
 * Resource relationship patterns for interconnected filtering
 */
export interface ResourceRelationshipPattern {
  /** Relationship type */
  type: 'references' | 'referenced-by' | 'aligned-to' | 'derived-from' | 'supplements' | 'custom';
  /** Target resource types */
  targetTypes: string[];
  /** Relationship strength (affects filtering decisions) */
  strength: 'weak' | 'medium' | 'strong' | 'critical';
  /** Bidirectional relationship */
  bidirectional: boolean;
  /** Custom relationship logic */
  customLogic?: (sourceResource: any, targetResource: any) => boolean;
}

/**
 * Resource discovery metadata
 */
export interface ResourceDiscoveryMetadata {
  /** When this resource type was first discovered */
  discoveredAt: Date;
  /** How this resource type was discovered */
  discoveryMethod: 'manifest' | 'api' | 'user-defined' | 'inference';
  /** Resource type version */
  version: string;
  /** Compatibility with existing types */
  compatibility: string[];
  /** Migration path from older versions */
  migrationPath?: string[];
}

/**
 * Extended filter criteria for dynamic resources
 */
export interface ExtendedFilterCriteria extends FilterCriteria {
  /** Filter by resource relationships */
  relationships?: {
    /** Must reference these resource types */
    references?: string[];
    /** Must be referenced by these resource types */
    referencedBy?: string[];
    /** Must be aligned to these resource types */
    alignedTo?: string[];
    /** Must derive from these resource types */
    derivedFrom?: string[];
    /** Custom relationship queries */
    customQueries?: Array<{
      relationshipType: string;
      targetTypes: string[];
      condition: 'any' | 'all' | 'none';
    }>;
  };
  
  /** Filter by resource characteristics */
  characteristics?: {
    /** User-generated content only */
    userGenerated?: boolean;
    /** Collaborative resources only */
    collaborative?: boolean;
    /** Size category constraints */
    sizeCategory?: ('tiny' | 'small' | 'medium' | 'large' | 'huge')[];
    /** Update frequency requirements */
    updateFrequency?: ('static' | 'occasional' | 'frequent' | 'realtime')[];
  };
  
  /** Filter by discovery metadata */
  discovery?: {
    /** Discovered after this date */
    discoveredAfter?: Date;
    /** Discovery method */
    discoveryMethod?: ('manifest' | 'api' | 'user-defined' | 'inference')[];
    /** Compatible with these types */
    compatibleWith?: string[];
  };
}

// ============================================================================
// Translation Glossary Example
// ============================================================================

/**
 * Translation Glossary resource type definition
 */
export const TRANSLATION_GLOSSARY_TYPE: DynamicResourceType = {
  type: 'translation-glossary',
  name: 'Translation Glossary',
  description: 'Translator decisions and glossary entries for consistent word choices',
  characteristics: {
    bookSpecific: true,
    verseSpecific: false, // Glossary applies to entire book/project
    userGenerated: true,
    collaborative: true,
    sizeCategory: 'small',
    updateFrequency: 'frequent',
    useCasePriority: {
      reader: 'low',
      translator: 'critical',
      reviewer: 'high',
      server: 'normal'
    }
  },
  relationships: [
    {
      type: 'aligned-to',
      targetTypes: ['bible-verse'],
      strength: 'strong',
      bidirectional: true
    },
    {
      type: 'supplements',
      targetTypes: ['translation-note', 'translation-word'],
      strength: 'medium',
      bidirectional: false
    },
    {
      type: 'references',
      targetTypes: ['translation-academy'],
      strength: 'weak',
      bidirectional: false
    }
  ],
  discovery: {
    discoveredAt: new Date(),
    discoveryMethod: 'user-defined',
    version: '1.0.0',
    compatibility: ['translation-note', 'translation-word', 'bible-verse']
  }
};

// ============================================================================
// Extensible Scope Manager
// ============================================================================

/**
 * Extensible scope manager that handles dynamic resource types
 */
export class ExtensibleScopeManager {
  private resourceTypes = new Map<string, DynamicResourceType>();
  private relationshipGraph = new Map<string, Set<string>>();

  /**
   * Register a new resource type
   */
  registerResourceType(resourceType: DynamicResourceType): void {
    this.resourceTypes.set(resourceType.type, resourceType);
    this.updateRelationshipGraph(resourceType);
    
    console.log(`🔗 Registered new resource type: ${resourceType.name} (${resourceType.type})`);
  }

  /**
   * Discover resource types from manifest or API
   */
  async discoverResourceTypes(source: 'manifest' | 'api' | 'repository'): Promise<DynamicResourceType[]> {
    // In a real implementation, this would scan manifests, API endpoints, or repositories
    const discovered: DynamicResourceType[] = [];
    
    // Mock discovery of Translation Glossary
    if (source === 'repository') {
      discovered.push(TRANSLATION_GLOSSARY_TYPE);
    }
    
    // Register discovered types
    for (const type of discovered) {
      this.registerResourceType(type);
    }
    
    return discovered;
  }

  /**
   * Create scope for specific resource type with relationship awareness
   */
  createResourceTypeScope(
    primaryType: string,
    options: {
      includeRelated?: boolean;
      relationshipDepth?: number;
      relationshipStrength?: ('weak' | 'medium' | 'strong' | 'critical')[];
      useCase?: 'reader' | 'translator' | 'reviewer' | 'server';
    } = {}
  ): ResourceScope {
    const resourceType = this.resourceTypes.get(primaryType);
    if (!resourceType) {
      throw new Error(`Unknown resource type: ${primaryType}`);
    }

    const scope: ResourceScope = {
      id: `scope_${primaryType}_${Date.now()}`,
      name: `${resourceType.name} Scope`,
      description: `Scope optimized for ${resourceType.name} and related resources`,
      organizations: [], // Will be filled based on context
      languages: [], // Will be filled based on context
      resourceTypes: [primaryType],
      filters: [],
      priority: {
        default: resourceType.characteristics.useCasePriority[options.useCase || 'translator']
      },
      metadata: {
        createdAt: new Date(),
        createdBy: 'extensible-scope-manager',
        lastModifiedAt: new Date(),
        lastModifiedBy: 'extensible-scope-manager',
        version: 1,
        tags: [primaryType, 'auto-generated'],
        usage: {
          totalResources: 0,
          resourcesByType: {},
          resourcesByOrganization: {},
          resourcesByLanguage: {},
          estimatedSize: 0,
          usageCount: 0
        }
      }
    };

    // Add related resource types if requested
    if (options.includeRelated) {
      const relatedTypes = this.findRelatedResourceTypes(
        primaryType,
        options.relationshipDepth || 1,
        options.relationshipStrength || ['medium', 'strong', 'critical']
      );
      scope.resourceTypes.push(...relatedTypes);
    }

    // Add filters based on resource characteristics
    scope.filters = this.createFiltersForResourceType(resourceType, options);

    return scope;
  }

  /**
   * Create Translation Glossary scope example
   */
  createTranslationGlossaryScope(options: {
    languages: string[];
    organizations: string[];
    books?: string[];
    includeRelatedResources?: boolean;
  }): ResourceScope {
    // Ensure Translation Glossary type is registered
    if (!this.resourceTypes.has('translation-glossary')) {
      this.registerResourceType(TRANSLATION_GLOSSARY_TYPE);
    }

    const scope = this.createResourceTypeScope('translation-glossary', {
      includeRelated: options.includeRelatedResources,
      useCase: 'translator'
    });

    // Customize for Translation Glossary
    scope.name = 'Translation Glossary Workspace';
    scope.description = 'Comprehensive scope for translation work with glossary management';
    scope.languages = options.languages;
    scope.organizations = options.organizations.map(orgId => ({
      organizationId: orgId,
      repositories: ['*']
    }));
    scope.books = options.books;

    // Add Translation Glossary specific filters
    scope.filters?.push(
      {
        type: 'include',
        priority: 200,
        criteria: {
          characteristics: {
            userGenerated: true,
            collaborative: true
          }
        } as ExtendedFilterCriteria,
        description: 'Prioritize user-generated collaborative content'
      },
      {
        type: 'include',
        priority: 150,
        criteria: {
          relationships: {
            alignedTo: ['bible-verse'],
            references: ['translation-academy']
          }
        } as ExtendedFilterCriteria,
        description: 'Include resources aligned to scripture with academy references'
      }
    );

    return scope;
  }

  /**
   * Find related resource types through relationship graph
   */
  private findRelatedResourceTypes(
    primaryType: string,
    depth: number,
    strengthFilter: string[]
  ): string[] {
    const related = new Set<string>();
    const visited = new Set<string>();
    const queue: Array<{ type: string; currentDepth: number }> = [{ type: primaryType, currentDepth: 0 }];

    while (queue.length > 0) {
      const { type, currentDepth } = queue.shift()!;
      
      if (visited.has(type) || currentDepth >= depth) {
        continue;
      }
      
      visited.add(type);
      const resourceType = this.resourceTypes.get(type);
      
      if (resourceType) {
        for (const relationship of resourceType.relationships) {
          if (strengthFilter.includes(relationship.strength)) {
            for (const targetType of relationship.targetTypes) {
              if (!visited.has(targetType)) {
                related.add(targetType);
                queue.push({ type: targetType, currentDepth: currentDepth + 1 });
              }
            }
          }
        }
      }
    }

    return Array.from(related);
  }

  /**
   * Create filters based on resource type characteristics
   */
  private createFiltersForResourceType(
    resourceType: DynamicResourceType,
    options: any
  ): ResourceFilter[] {
    const filters: ResourceFilter[] = [];

    // Size-based filtering
    if (resourceType.characteristics.sizeCategory === 'large' || resourceType.characteristics.sizeCategory === 'huge') {
      filters.push({
        type: 'include',
        priority: 100,
        criteria: {
          sizeRange: {
            maxBytes: resourceType.characteristics.sizeCategory === 'large' ? 10 * 1024 * 1024 : 50 * 1024 * 1024
          }
        },
        description: `Size limit for ${resourceType.characteristics.sizeCategory} resources`
      });
    }

    // Update frequency filtering
    if (resourceType.characteristics.updateFrequency === 'frequent' || resourceType.characteristics.updateFrequency === 'realtime') {
      filters.push({
        type: 'include',
        priority: 120,
        criteria: {
          dateRange: {
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last week
          }
        },
        description: 'Prioritize recent updates for frequently changing resources'
      });
    }

    return filters;
  }

  /**
   * Update relationship graph when new resource type is registered
   */
  private updateRelationshipGraph(resourceType: DynamicResourceType): void {
    if (!this.relationshipGraph.has(resourceType.type)) {
      this.relationshipGraph.set(resourceType.type, new Set());
    }

    const connections = this.relationshipGraph.get(resourceType.type)!;
    
    for (const relationship of resourceType.relationships) {
      for (const targetType of relationship.targetTypes) {
        connections.add(targetType);
        
        // Add bidirectional relationship if specified
        if (relationship.bidirectional) {
          if (!this.relationshipGraph.has(targetType)) {
            this.relationshipGraph.set(targetType, new Set());
          }
          this.relationshipGraph.get(targetType)!.add(resourceType.type);
        }
      }
    }
  }

  /**
   * Get all registered resource types
   */
  getRegisteredResourceTypes(): DynamicResourceType[] {
    return Array.from(this.resourceTypes.values());
  }

  /**
   * Get relationship graph
   */
  getRelationshipGraph(): Map<string, Set<string>> {
    return new Map(this.relationshipGraph);
  }
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example: Setting up Translation Glossary workflow
 */
export function createTranslationWorkflowScope(options: {
  languages: string[];
  organizations: string[];
  books: string[];
}): ResourceScope {
  const extensibleManager = new ExtensibleScopeManager();
  
  // Register Translation Glossary type
  extensibleManager.registerResourceType(TRANSLATION_GLOSSARY_TYPE);
  
  // Create comprehensive translation scope
  return extensibleManager.createTranslationGlossaryScope({
    ...options,
    includeRelatedResources: true
  });
}

/**
 * Example: Dynamic resource type discovery
 */
export async function discoverAndCreateScope(
  repository: string,
  useCase: 'reader' | 'translator' | 'reviewer' | 'server'
): Promise<ResourceScope[]> {
  const extensibleManager = new ExtensibleScopeManager();
  
  // Discover new resource types
  const discoveredTypes = await extensibleManager.discoverResourceTypes('repository');
  
  // Create scopes for each discovered type
  const scopes: ResourceScope[] = [];
  for (const resourceType of discoveredTypes) {
    const scope = extensibleManager.createResourceTypeScope(resourceType.type, {
      includeRelated: true,
      useCase
    });
    scopes.push(scope);
  }
  
  return scopes;
}
