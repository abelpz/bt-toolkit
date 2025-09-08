/**
 * Resource Scope Manager
 * Handles flexible resource filtering and scoping for the extensible cache system
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import type { IStorageBackend } from '@bt-toolkit/door43-storage';

// ============================================================================
// Resource Scoping Types
// ============================================================================

/**
 * Resource scope definition
 */
export interface ResourceScope {
  /** Scope identifier */
  id: string;
  /** Scope name */
  name: string;
  /** Scope description */
  description: string;
  /** Organizations to include */
  organizations: OrganizationScope[];
  /** Languages to include */
  languages: string[];
  /** Resource types to include */
  resourceTypes: string[];
  /** Books to include (for Bible resources) */
  books?: string[];
  /** Custom filters */
  filters?: ResourceFilter[];
  /** Maximum cache size for this scope */
  maxCacheSize?: number;
  /** Priority settings */
  priority: ScopePriority;
  /** Scope metadata */
  metadata: ScopeMetadata;
}

/**
 * Organization scope configuration
 */
export interface OrganizationScope {
  /** Organization identifier */
  organizationId: string;
  /** Repositories to include */
  repositories: string[];
  /** Exclude specific repositories */
  excludeRepositories?: string[];
  /** Include only specific branches/tags */
  refs?: string[];
  /** Organization-specific filters */
  filters?: ResourceFilter[];
}

/**
 * Resource filter definition
 */
export interface ResourceFilter {
  /** Filter type */
  type: 'include' | 'exclude';
  /** Filter criteria */
  criteria: FilterCriteria;
  /** Filter priority (higher numbers processed first) */
  priority: number;
  /** Filter description */
  description?: string;
}

/**
 * Filter criteria options
 */
export interface FilterCriteria {
  /** Resource ID pattern (supports wildcards) */
  resourceIdPattern?: string;
  /** Metadata filters */
  metadata?: Record<string, any>;
  /** Content filters */
  content?: ContentFilter;
  /** Date filters */
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  /** Size filters */
  sizeRange?: {
    minBytes?: number;
    maxBytes?: number;
  };
  /** Custom predicate function */
  customPredicate?: (resource: any) => boolean;
}

/**
 * Content-based filtering
 */
export interface ContentFilter {
  /** Text search in content */
  textSearch?: string;
  /** Regular expression pattern */
  regexPattern?: string;
  /** Content type filters */
  contentTypes?: string[];
  /** Language detection */
  detectedLanguage?: string;
}

/**
 * Scope priority configuration
 */
export interface ScopePriority {
  /** Default priority for resources in this scope */
  default: 'low' | 'normal' | 'high' | 'critical';
  /** Per-resource-type priorities */
  perType?: Record<string, 'low' | 'normal' | 'high' | 'critical'>;
  /** Per-organization priorities */
  perOrganization?: Record<string, 'low' | 'normal' | 'high' | 'critical'>;
  /** Per-book priorities (for Bible resources) */
  perBook?: Record<string, 'low' | 'normal' | 'high' | 'critical'>;
}

/**
 * Scope metadata
 */
export interface ScopeMetadata {
  /** When scope was created */
  createdAt: Date;
  /** Who created the scope */
  createdBy: string;
  /** Last modified timestamp */
  lastModifiedAt: Date;
  /** Who last modified the scope */
  lastModifiedBy: string;
  /** Scope version */
  version: number;
  /** Scope tags */
  tags: string[];
  /** Usage statistics */
  usage: ScopeUsageStats;
}

/**
 * Scope usage statistics
 */
export interface ScopeUsageStats {
  /** Total resources in scope */
  totalResources: number;
  /** Resources by type */
  resourcesByType: Record<string, number>;
  /** Resources by organization */
  resourcesByOrganization: Record<string, number>;
  /** Resources by language */
  resourcesByLanguage: Record<string, number>;
  /** Estimated size in bytes */
  estimatedSize: number;
  /** Last usage timestamp */
  lastUsedAt?: Date;
  /** Usage count */
  usageCount: number;
}

/**
 * Scope evaluation result
 */
export interface ScopeEvaluationResult {
  /** Whether resource matches scope */
  matches: boolean;
  /** Matching filters */
  matchingFilters: ResourceFilter[];
  /** Excluding filters */
  excludingFilters: ResourceFilter[];
  /** Final priority assigned */
  priority: 'low' | 'normal' | 'high' | 'critical';
  /** Evaluation metadata */
  metadata: {
    evaluatedAt: Date;
    evaluationTimeMs: number;
    filtersEvaluated: number;
  };
}

/**
 * Dynamic scope creation criteria
 */
export interface DynamicScopeRequest {
  /** Scope name */
  name: string;
  /** Base criteria */
  criteria: {
    organizations?: string[];
    languages?: string[];
    resourceTypes?: string[];
    books?: string[];
    dateRange?: { from: Date; to: Date };
    textSearch?: string;
    tags?: string[];
  };
  /** Additional filters */
  filters?: ResourceFilter[];
  /** Scope options */
  options?: {
    maxCacheSize?: number;
    priority?: ScopePriority;
    temporary?: boolean;
    expiresAt?: Date;
  };
}

/**
 * Scope optimization result
 */
export interface ScopeOptimizationResult {
  /** Original scope statistics */
  original: {
    resourceCount: number;
    estimatedSize: number;
    filterCount: number;
  };
  /** Optimized scope statistics */
  optimized: {
    resourceCount: number;
    estimatedSize: number;
    filterCount: number;
  };
  /** Optimization operations performed */
  operations: string[];
  /** Resources removed */
  removedResources: string[];
  /** Filters optimized */
  optimizedFilters: ResourceFilter[];
  /** Performance improvement estimate */
  performanceImprovement: number; // percentage
  /** Recommendations */
  recommendations: string[];
}

/**
 * Scope migration request
 */
export interface ScopeMigrationRequest {
  /** Source scope ID */
  fromScopeId: string;
  /** Target scope ID */
  toScopeId: string;
  /** Migration strategy */
  strategy: 'immediate' | 'lazy' | 'background';
  /** Migration options */
  options?: {
    preserveCache?: boolean;
    batchSize?: number;
    maxConcurrency?: number;
    progressCallback?: (progress: ScopeMigrationProgress) => void;
  };
}

/**
 * Scope migration progress
 */
export interface ScopeMigrationProgress {
  /** Migration phase */
  phase: 'analyzing' | 'preparing' | 'migrating' | 'cleaning' | 'completed';
  /** Progress percentage (0-100) */
  progress: number;
  /** Resources to add */
  resourcesToAdd: number;
  /** Resources to remove */
  resourcesToRemove: number;
  /** Resources processed */
  resourcesProcessed: number;
  /** Estimated time remaining (ms) */
  estimatedTimeRemaining?: number;
  /** Current operation */
  currentOperation: string;
}

// ============================================================================
// Resource Scope Manager Implementation
// ============================================================================

/**
 * Resource scope manager handles flexible resource filtering and scoping
 */
export class ResourceScopeManager {
  private storageBackend: IStorageBackend;
  private scopes = new Map<string, ResourceScope>();
  private activeScope: string | null = null;
  private scopeCache = new Map<string, Map<string, ScopeEvaluationResult>>();
  // private optimizationTimer?: NodeJS.Timeout; // For future use

  constructor(storageBackend: IStorageBackend) {
    this.storageBackend = storageBackend;
  }

  /**
   * Initialize scope manager
   */
  async initialize(scopes: ResourceScope[] = []): AsyncResult<void> {
    try {
      // Load existing scopes
      const scopesResult = await this.storageBackend.get<any>('scope-manager:scopes');
      if (scopesResult.success && scopesResult.data) {
        this.scopes = this.deserializeScopes(scopesResult.data);
      }

      // Load active scope
      const activeScopeResult = await this.storageBackend.get<string>('scope-manager:active-scope');
      if (activeScopeResult.success && activeScopeResult.data) {
        this.activeScope = activeScopeResult.data;
      }

      // Add provided scopes
      for (const scope of scopes) {
        this.scopes.set(scope.id, scope);
      }

      // Persist initial state
      await this.persistScopes();

      console.log(`🎯 Resource scope manager initialized with ${this.scopes.size} scopes`);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize scope manager'
      };
    }
  }

  /**
   * Set active scope
   */
  async setActiveScope(scopeId: string): AsyncResult<void> {
    try {
      if (!this.scopes.has(scopeId)) {
        return {
          success: false,
          error: `Scope not found: ${scopeId}`
        };
      }

      this.activeScope = scopeId;
      
      // Update usage statistics
      const scope = this.scopes.get(scopeId)!;
      scope.metadata.usage.lastUsedAt = new Date();
      scope.metadata.usage.usageCount++;

      // Persist changes
      await this.persistActiveScope();
      await this.persistScopes();

      console.log(`🎯 Active scope set to: ${scopeId}`);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set active scope'
      };
    }
  }

  /**
   * Get active scope
   */
  async getActiveScope(): AsyncResult<ResourceScope | null> {
    try {
      if (!this.activeScope) {
        return { success: true, data: null };
      }

      const scope = this.scopes.get(this.activeScope) || null;
      return { success: true, data: scope };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active scope'
      };
    }
  }

  /**
   * Check if resource is in scope
   */
  async isResourceInScope(resourceId: string, scopeId?: string): AsyncResult<boolean> {
    try {
      const targetScopeId = scopeId || this.activeScope;
      if (!targetScopeId) {
        return { success: true, data: true }; // No scope = include all
      }

      const evaluationResult = await this.evaluateResourceScope(resourceId, targetScopeId);
      if (!evaluationResult.success) {
        return { success: false, error: evaluationResult.error || 'Evaluation failed' };
      }

      if (!evaluationResult.data) {
        return { success: false, error: 'Evaluation returned no data' };
      }

      return { success: true, data: evaluationResult.data.matches };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check resource scope'
      };
    }
  }

  /**
   * Filter resources by scope
   */
  async filterResourcesByScope(
    resourceIds: string[],
    scopeId?: string
  ): AsyncResult<string[]> {
    try {
      const targetScopeId = scopeId || this.activeScope;
      if (!targetScopeId) {
        return { success: true, data: resourceIds }; // No scope = include all
      }

      const filteredResources: string[] = [];

      for (const resourceId of resourceIds) {
        const inScopeResult = await this.isResourceInScope(resourceId, targetScopeId);
        if (inScopeResult.success && inScopeResult.data) {
          filteredResources.push(resourceId);
        }
      }

      return { success: true, data: filteredResources };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to filter resources by scope'
      };
    }
  }

  /**
   * Get scope statistics
   */
  async getScopeStatistics(scopeId: string): AsyncResult<ScopeUsageStats> {
    try {
      const scope = this.scopes.get(scopeId);
      if (!scope) {
        return {
          success: false,
          error: `Scope not found: ${scopeId}`
        };
      }

      // Update statistics by analyzing current resources
      await this.updateScopeStatistics(scope);

      return { success: true, data: scope.metadata.usage };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scope statistics'
      };
    }
  }

  /**
   * Create dynamic scope
   */
  async createDynamicScope(request: DynamicScopeRequest): AsyncResult<ResourceScope> {
    try {
      const scopeId = this.generateScopeId(request.name);
      
      const scope: ResourceScope = {
        id: scopeId,
        name: request.name,
        description: `Dynamic scope created from criteria`,
        organizations: request.criteria.organizations?.map(orgId => ({
          organizationId: orgId,
          repositories: ['*'] // Include all repositories by default
        })) || [],
        languages: request.criteria.languages || [],
        resourceTypes: request.criteria.resourceTypes || [],
        books: request.criteria.books,
        filters: this.buildFiltersFromCriteria(request.criteria, request.filters),
        maxCacheSize: request.options?.maxCacheSize,
        priority: request.options?.priority || {
          default: 'normal'
        },
        metadata: {
          createdAt: new Date(),
          createdBy: 'dynamic-scope-creator',
          lastModifiedAt: new Date(),
          lastModifiedBy: 'dynamic-scope-creator',
          version: 1,
          tags: request.criteria.tags || [],
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

      // Add to scopes
      this.scopes.set(scopeId, scope);

      // Set expiration if temporary
      if (request.options?.temporary && request.options?.expiresAt) {
        setTimeout(() => {
          this.scopes.delete(scopeId);
          this.persistScopes();
        }, request.options.expiresAt.getTime() - Date.now());
      }

      // Persist changes
      await this.persistScopes();

      console.log(`🎯 Created dynamic scope: ${scopeId}`);

      return { success: true, data: scope };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create dynamic scope'
      };
    }
  }

  /**
   * Optimize scope for performance
   */
  async optimizeScope(scopeId: string): AsyncResult<ScopeOptimizationResult> {
    try {
      const scope = this.scopes.get(scopeId);
      if (!scope) {
        return {
          success: false,
          error: `Scope not found: ${scopeId}`
        };
      }

      const originalStats = {
        resourceCount: scope.metadata.usage.totalResources,
        estimatedSize: scope.metadata.usage.estimatedSize,
        filterCount: scope.filters?.length || 0
      };

      const operations: string[] = [];
      const removedResources: string[] = [];
      const optimizedFilters: ResourceFilter[] = [];
      const recommendations: string[] = [];

      // Optimize filters
      if (scope.filters) {
        const { optimized, removed } = this.optimizeFilters(scope.filters);
        scope.filters = optimized;
        optimizedFilters.push(...removed);
        operations.push(`Optimized ${removed.length} redundant filters`);
      }

      // Remove duplicate organizations
      const uniqueOrgs = this.deduplicateOrganizations(scope.organizations);
      if (uniqueOrgs.length < scope.organizations.length) {
        const removed = scope.organizations.length - uniqueOrgs.length;
        scope.organizations = uniqueOrgs;
        operations.push(`Removed ${removed} duplicate organizations`);
      }

      // Optimize language list
      scope.languages = [...new Set(scope.languages)];

      // Optimize resource types
      scope.resourceTypes = [...new Set(scope.resourceTypes)];

      // Update scope version
      scope.metadata.version++;
      scope.metadata.lastModifiedAt = new Date();
      scope.metadata.lastModifiedBy = 'scope-optimizer';

      // Recalculate statistics
      await this.updateScopeStatistics(scope);

      const optimizedStats = {
        resourceCount: scope.metadata.usage.totalResources,
        estimatedSize: scope.metadata.usage.estimatedSize,
        filterCount: scope.filters?.length || 0
      };

      // Calculate performance improvement
      const performanceImprovement = originalStats.filterCount > 0 
        ? ((originalStats.filterCount - optimizedStats.filterCount) / originalStats.filterCount) * 100
        : 0;

      // Generate recommendations
      if (scope.filters && scope.filters.length > 10) {
        recommendations.push('Consider consolidating filters for better performance');
      }
      if (scope.organizations.length > 5) {
        recommendations.push('Consider using fewer organizations for simpler scope management');
      }

      // Persist optimized scope
      await this.persistScopes();

      const result: ScopeOptimizationResult = {
        original: originalStats,
        optimized: optimizedStats,
        operations,
        removedResources,
        optimizedFilters,
        performanceImprovement,
        recommendations
      };

      console.log(`🎯 Optimized scope ${scopeId}: ${performanceImprovement.toFixed(1)}% improvement`);

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to optimize scope'
      };
    }
  }

  /**
   * Switch scope with migration
   */
  async switchScope(request: ScopeMigrationRequest): AsyncResult<{
    migrationId: string;
    resourcesToAdd: string[];
    resourcesToRemove: string[];
    estimatedTime: number;
  }> {
    try {
      const fromScope = this.scopes.get(request.fromScopeId);
      const toScope = this.scopes.get(request.toScopeId);

      if (!fromScope || !toScope) {
        return {
          success: false,
          error: 'Source or target scope not found'
        };
      }

      const migrationId = this.generateMigrationId();

      // Analyze scope differences
      const analysis = await this.analyzeScopeDifferences(fromScope, toScope);

      // Estimate migration time
      const estimatedTime = this.estimateMigrationTime(analysis, request.strategy);

      // Start migration based on strategy
      switch (request.strategy) {
        case 'immediate':
          await this.performImmediateMigration(request, analysis);
          break;
        
        case 'lazy':
          await this.setupLazyMigration(request, analysis);
          break;
        
        case 'background':
          this.startBackgroundMigration(request, analysis);
          break;
      }

      const result = {
        migrationId,
        resourcesToAdd: analysis.resourcesToAdd,
        resourcesToRemove: analysis.resourcesToRemove,
        estimatedTime
      };

      console.log(`🎯 Started scope migration ${migrationId}: ${request.fromScopeId} → ${request.toScopeId}`);

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to switch scope'
      };
    }
  }

  /**
   * List all scopes
   */
  async listScopes(): AsyncResult<ResourceScope[]> {
    try {
      const scopes = Array.from(this.scopes.values());
      return { success: true, data: scopes };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list scopes'
      };
    }
  }

  /**
   * Delete scope
   */
  async deleteScope(scopeId: string): AsyncResult<void> {
    try {
      if (!this.scopes.has(scopeId)) {
        return {
          success: false,
          error: `Scope not found: ${scopeId}`
        };
      }

      // Don't delete active scope
      if (this.activeScope === scopeId) {
        this.activeScope = null;
        await this.persistActiveScope();
      }

      // Remove from scopes
      this.scopes.delete(scopeId);

      // Clear cache for this scope
      this.scopeCache.delete(scopeId);

      // Persist changes
      await this.persistScopes();

      console.log(`🎯 Deleted scope: ${scopeId}`);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete scope'
      };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async evaluateResourceScope(resourceId: string, scopeId: string): AsyncResult<ScopeEvaluationResult> {
    try {
      // Check cache first
      const cached = this.scopeCache.get(scopeId)?.get(resourceId);
      if (cached) {
        return { success: true, data: cached };
      }

      const scope = this.scopes.get(scopeId);
      if (!scope) {
        return {
          success: false,
          error: `Scope not found: ${scopeId}`
        };
      }

      const startTime = Date.now();
      const matchingFilters: ResourceFilter[] = [];
      const excludingFilters: ResourceFilter[] = [];
      let matches = true;
      let priority = scope.priority.default;

      // Evaluate filters
      if (scope.filters) {
        const sortedFilters = scope.filters.sort((a, b) => b.priority - a.priority);
        
        for (const filter of sortedFilters) {
          const filterMatches = await this.evaluateFilter(resourceId, filter);
          
          if (filterMatches) {
            if (filter.type === 'include') {
              matchingFilters.push(filter);
            } else {
              excludingFilters.push(filter);
              matches = false;
              break; // Exclude filters are definitive
            }
          }
        }
      }

      // Determine final priority
      priority = this.determinePriority(resourceId, scope, priority);

      const result: ScopeEvaluationResult = {
        matches,
        matchingFilters,
        excludingFilters,
        priority,
        metadata: {
          evaluatedAt: new Date(),
          evaluationTimeMs: Date.now() - startTime,
          filtersEvaluated: scope.filters?.length || 0
        }
      };

      // Cache result
      if (!this.scopeCache.has(scopeId)) {
        this.scopeCache.set(scopeId, new Map());
      }
      this.scopeCache.get(scopeId)!.set(resourceId, result);

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to evaluate resource scope'
      };
    }
  }

  private async evaluateFilter(resourceId: string, filter: ResourceFilter): Promise<boolean> {
    const { criteria } = filter;

    // Resource ID pattern matching
    if (criteria.resourceIdPattern) {
      const pattern = criteria.resourceIdPattern.replace(/\*/g, '.*');
      const regex = new RegExp(pattern);
      if (!regex.test(resourceId)) {
        return false;
      }
    }

    // Custom predicate
    if (criteria.customPredicate) {
      try {
        // In a real implementation, we'd get the resource data
        const resourceData = { id: resourceId }; // Mock data
        return criteria.customPredicate(resourceData);
      } catch (error) {
        console.warn(`Custom predicate failed for ${resourceId}:`, error);
        return false;
      }
    }

    // Date range filtering
    if (criteria.dateRange) {
      // In a real implementation, we'd get the resource's date
      const resourceDate = new Date(); // Mock current date
      if (criteria.dateRange.from && resourceDate < criteria.dateRange.from) {
        return false;
      }
      if (criteria.dateRange.to && resourceDate > criteria.dateRange.to) {
        return false;
      }
    }

    return true;
  }

  private determinePriority(
    resourceId: string,
    scope: ResourceScope,
    defaultPriority: string
  ): 'low' | 'normal' | 'high' | 'critical' {
    // Extract resource type from ID (simplified)
    const resourceType = resourceId.split(':')[2] || 'unknown';
    
    // Check per-type priority
    if (scope.priority.perType?.[resourceType]) {
      return scope.priority.perType[resourceType];
    }

    // Extract organization from ID (simplified)
    const organization = resourceId.split(':')[1] || 'unknown';
    
    // Check per-organization priority
    if (scope.priority.perOrganization?.[organization]) {
      return scope.priority.perOrganization[organization];
    }

    return defaultPriority as 'low' | 'normal' | 'high' | 'critical';
  }

  private buildFiltersFromCriteria(
    criteria: DynamicScopeRequest['criteria'],
    additionalFilters?: ResourceFilter[]
  ): ResourceFilter[] {
    const filters: ResourceFilter[] = [];

    // Text search filter
    if (criteria.textSearch) {
      filters.push({
        type: 'include',
        priority: 100,
        criteria: {
          content: {
            textSearch: criteria.textSearch
          }
        },
        description: `Text search: ${criteria.textSearch}`
      });
    }

    // Date range filter
    if (criteria.dateRange) {
      filters.push({
        type: 'include',
        priority: 90,
        criteria: {
          dateRange: criteria.dateRange
        },
        description: `Date range filter`
      });
    }

    // Add additional filters
    if (additionalFilters) {
      filters.push(...additionalFilters);
    }

    return filters;
  }

  private optimizeFilters(filters: ResourceFilter[]): { optimized: ResourceFilter[]; removed: ResourceFilter[] } {
    const optimized: ResourceFilter[] = [];
    const removed: ResourceFilter[] = [];
    const seen = new Set<string>();

    for (const filter of filters) {
      const key = JSON.stringify(filter.criteria);
      if (seen.has(key)) {
        removed.push(filter);
      } else {
        seen.add(key);
        optimized.push(filter);
      }
    }

    return { optimized, removed };
  }

  private deduplicateOrganizations(organizations: OrganizationScope[]): OrganizationScope[] {
    const seen = new Set<string>();
    return organizations.filter(org => {
      if (seen.has(org.organizationId)) {
        return false;
      }
      seen.add(org.organizationId);
      return true;
    });
  }

  private async updateScopeStatistics(scope: ResourceScope): Promise<void> {
    // In a real implementation, this would analyze actual resources
    // For now, we'll update with mock data
    scope.metadata.usage = {
      totalResources: Math.floor(Math.random() * 1000),
      resourcesByType: {
        'bible-verse': Math.floor(Math.random() * 500),
        'translation-note': Math.floor(Math.random() * 300),
        'translation-word': Math.floor(Math.random() * 200)
      },
      resourcesByOrganization: {
        'unfoldingWord': Math.floor(Math.random() * 600),
        'Door43': Math.floor(Math.random() * 400)
      },
      resourcesByLanguage: {
        'en': Math.floor(Math.random() * 800),
        'es': Math.floor(Math.random() * 200)
      },
      estimatedSize: Math.floor(Math.random() * 10000000), // bytes
      lastUsedAt: scope.metadata.usage.lastUsedAt,
      usageCount: scope.metadata.usage.usageCount
    };
  }

  private async analyzeScopeDifferences(fromScope: ResourceScope, toScope: ResourceScope): Promise<{
    resourcesToAdd: string[];
    resourcesToRemove: string[];
    commonResources: string[];
  }> {
    // Mock analysis - in real implementation would compare actual resources
    return {
      resourcesToAdd: ['resource1', 'resource2'],
      resourcesToRemove: ['resource3', 'resource4'],
      commonResources: ['resource5', 'resource6']
    };
  }

  private estimateMigrationTime(analysis: any, strategy: string): number {
    const baseTime = (analysis.resourcesToAdd.length + analysis.resourcesToRemove.length) * 100; // ms per resource
    const strategyMultiplier = strategy === 'immediate' ? 1 : strategy === 'lazy' ? 0.1 : 0.5;
    return baseTime * strategyMultiplier;
  }

  private async performImmediateMigration(request: ScopeMigrationRequest, analysis: any): Promise<void> {
    // Mock immediate migration
    console.log(`🎯 Performing immediate migration: ${request.fromScopeId} → ${request.toScopeId}`);
    await this.setActiveScope(request.toScopeId);
  }

  private async setupLazyMigration(request: ScopeMigrationRequest, analysis: any): Promise<void> {
    // Mock lazy migration setup
    console.log(`🎯 Setting up lazy migration: ${request.fromScopeId} → ${request.toScopeId}`);
  }

  private startBackgroundMigration(request: ScopeMigrationRequest, analysis: any): void {
    // Mock background migration
    console.log(`🎯 Starting background migration: ${request.fromScopeId} → ${request.toScopeId}`);
    
    setTimeout(async () => {
      await this.setActiveScope(request.toScopeId);
      console.log(`🎯 Background migration completed: ${request.fromScopeId} → ${request.toScopeId}`);
    }, 5000);
  }

  private generateScopeId(name: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `scope_${cleanName}_${timestamp}_${random}`;
  }

  private generateMigrationId(): string {
    return `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async persistScopes(): Promise<void> {
    try {
      const scopesData = this.serializeScopes(this.scopes);
      await this.storageBackend.set('scope-manager:scopes', scopesData, {
        tags: ['scope-manager', 'scopes']
      });
    } catch (error) {
      console.error('❌ Failed to persist scopes:', error);
    }
  }

  private async persistActiveScope(): Promise<void> {
    try {
      await this.storageBackend.set('scope-manager:active-scope', this.activeScope, {
        tags: ['scope-manager', 'active-scope']
      });
    } catch (error) {
      console.error('❌ Failed to persist active scope:', error);
    }
  }

  private serializeScopes(scopes: Map<string, ResourceScope>): any {
    const result: any = {};
    for (const [id, scope] of scopes) {
      result[id] = {
        ...scope,
        filters: scope.filters?.map(filter => ({
          ...filter,
          criteria: {
            ...filter.criteria,
            customPredicate: undefined // Don't serialize functions
          }
        }))
      };
    }
    return result;
  }

  private deserializeScopes(data: any): Map<string, ResourceScope> {
    const result = new Map<string, ResourceScope>();
    for (const [id, scopeData] of Object.entries(data)) {
      result.set(id, scopeData as ResourceScope);
    }
    return result;
  }
}
