/**
 * Scope Factory
 * Creates predefined and custom resource scopes for different use cases
 */

import { 
  ResourceScope, 
  ResourceFilter, 
  ScopePriority,
  ScopeMetadata
} from './resource-scope-manager.js';

// ============================================================================
// Scope Templates and Presets
// ============================================================================

/**
 * Predefined scope templates
 */
export type ScopeTemplate = 
  | 'bible-reader'           // For Bible reading applications
  | 'translator-basic'       // Basic translation tools
  | 'translator-advanced'    // Advanced translation with all resources
  | 'reviewer'              // For translation reviewers
  | 'offline-minimal'       // Minimal offline package
  | 'offline-complete'      // Complete offline package
  | 'server-cache'          // Server-side caching
  | 'mobile-optimized'      // Mobile app optimized
  | 'web-progressive'       // Progressive web app
  | 'cli-tools'             // Command-line tools
  | 'mcp-server';           // MCP server tools

/**
 * Application profile for scope recommendations
 */
export interface ApplicationProfile {
  /** Application type */
  type: 'reader' | 'editor' | 'reviewer' | 'server' | 'cli' | 'mcp';
  /** Platform */
  platform: 'web' | 'mobile' | 'desktop' | 'server';
  /** Expected resource count */
  expectedResourceCount: number;
  /** Concurrent users */
  concurrentUsers: number;
  /** Primary languages */
  languages: string[];
  /** Primary organizations */
  organizations: string[];
  /** Offline support required */
  offlineSupport: boolean;
  /** Real-time collaboration */
  realTimeCollaboration: boolean;
  /** Storage constraints */
  storageConstraints?: {
    maxSize: number;
    preferCompression: boolean;
  };
}

/**
 * Scope recommendation result
 */
export interface ScopeRecommendation {
  /** Recommended scope */
  scope: ResourceScope;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reasoning */
  reasoning: string[];
  /** Alternative scopes */
  alternatives: Array<{
    scope: ResourceScope;
    confidence: number;
    reason: string;
  }>;
  /** Customization suggestions */
  suggestions: string[];
}

// ============================================================================
// Scope Factory Implementation
// ============================================================================

/**
 * Factory for creating resource scopes
 */
export class ScopeFactory {
  
  /**
   * Create scope from template
   */
  static createFromTemplate(
    template: ScopeTemplate,
    customizations?: {
      languages?: string[];
      organizations?: string[];
      books?: string[];
      maxCacheSize?: number;
    }
  ): ResourceScope {
    const baseScope = this.getTemplateScope(template);
    
    if (customizations) {
      if (customizations.languages) {
        baseScope.languages = customizations.languages;
      }
      if (customizations.organizations) {
        baseScope.organizations = customizations.organizations.map(orgId => ({
          organizationId: orgId,
          repositories: ['*']
        }));
      }
      if (customizations.books) {
        baseScope.books = customizations.books;
      }
      if (customizations.maxCacheSize) {
        baseScope.maxCacheSize = customizations.maxCacheSize;
      }
    }

    // Update metadata
    baseScope.metadata.createdAt = new Date();
    baseScope.metadata.lastModifiedAt = new Date();
    baseScope.metadata.version = 1;

    return baseScope;
  }

  /**
   * Create scope for Bible reading applications
   */
  static createBibleReaderScope(options: {
    languages: string[];
    organizations?: string[];
    books?: string[];
    includeNotes?: boolean;
    includeQuestions?: boolean;
  }): ResourceScope {
    const resourceTypes = ['bible-verse'];
    
    if (options.includeNotes) {
      resourceTypes.push('translation-note');
    }
    if (options.includeQuestions) {
      resourceTypes.push('translation-question');
    }

    return {
      id: this.generateScopeId('bible-reader'),
      name: 'Bible Reader',
      description: 'Optimized for Bible reading applications',
      organizations: (options.organizations || ['unfoldingWord']).map(orgId => ({
        organizationId: orgId,
        repositories: ['*'],
        refs: ['master', 'main']
      })),
      languages: options.languages,
      resourceTypes,
      books: options.books,
      priority: {
        default: 'normal',
        perType: {
          'bible-verse': 'high',
          'translation-note': 'normal',
          'translation-question': 'low'
        }
      },
      metadata: this.createDefaultMetadata('bible-reader')
    };
  }

  /**
   * Create scope for translation tools
   */
  static createTranslatorScope(options: {
    level: 'basic' | 'advanced';
    languages: string[];
    organizations?: string[];
    books?: string[];
    includeAcademy?: boolean;
    includeWords?: boolean;
  }): ResourceScope {
    const resourceTypes = ['bible-verse', 'translation-note'];
    
    if (options.level === 'advanced' || options.includeAcademy) {
      resourceTypes.push('translation-academy');
    }
    if (options.level === 'advanced' || options.includeWords) {
      resourceTypes.push('translation-word', 'words-link');
    }
    if (options.level === 'advanced') {
      resourceTypes.push('translation-question');
    }

    const filters: ResourceFilter[] = [];
    
    // Prioritize recent content
    filters.push({
      type: 'include',
      priority: 100,
      criteria: {
        dateRange: {
          from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
        }
      },
      description: 'Prioritize recent content'
    });

    return {
      id: this.generateScopeId(`translator-${options.level}`),
      name: `Translator (${options.level})`,
      description: `Optimized for ${options.level} translation work`,
      organizations: (options.organizations || ['unfoldingWord']).map(orgId => ({
        organizationId: orgId,
        repositories: ['*'],
        refs: ['master', 'main']
      })),
      languages: options.languages,
      resourceTypes,
      books: options.books,
      filters,
      maxCacheSize: options.level === 'advanced' ? 500 * 1024 * 1024 : 100 * 1024 * 1024, // 500MB or 100MB
      priority: {
        default: 'high',
        perType: {
          'bible-verse': 'critical',
          'translation-note': 'high',
          'translation-academy': 'normal',
          'translation-word': 'normal',
          'words-link': 'normal',
          'translation-question': 'low'
        }
      },
      metadata: this.createDefaultMetadata(`translator-${options.level}`)
    };
  }

  /**
   * Create scope for offline usage
   */
  static createOfflineScope(options: {
    level: 'minimal' | 'complete';
    languages: string[];
    organizations?: string[];
    books?: string[];
    maxSize?: number;
  }): ResourceScope {
    const resourceTypes = options.level === 'minimal' 
      ? ['bible-verse', 'translation-note']
      : ['bible-verse', 'translation-note', 'translation-question', 'translation-academy', 'translation-word', 'words-link'];

    const filters: ResourceFilter[] = [];

    // Size constraints for offline
    if (options.maxSize) {
      filters.push({
        type: 'exclude',
        priority: 200,
        criteria: {
          sizeRange: {
            maxBytes: options.maxSize / 10 // Each resource should be max 10% of total
          }
        },
        description: 'Exclude oversized resources for offline'
      });
    }

    // Prioritize essential books for minimal offline
    if (options.level === 'minimal') {
      const essentialBooks = ['MAT', 'MRK', 'LUK', 'JHN', 'GEN', 'PSA'];
      if (!options.books) {
        filters.push({
          type: 'include',
          priority: 150,
          criteria: {
            resourceIdPattern: `*:*:*:${essentialBooks.join('|')}:*`
          },
          description: 'Prioritize essential books for minimal offline'
        });
      }
    }

    return {
      id: this.generateScopeId(`offline-${options.level}`),
      name: `Offline (${options.level})`,
      description: `Optimized for ${options.level} offline usage`,
      organizations: (options.organizations || ['unfoldingWord']).map(orgId => ({
        organizationId: orgId,
        repositories: ['*'],
        refs: ['master', 'main']
      })),
      languages: options.languages,
      resourceTypes,
      books: options.books,
      filters,
      maxCacheSize: options.maxSize || (options.level === 'minimal' ? 50 * 1024 * 1024 : 1024 * 1024 * 1024), // 50MB or 1GB
      priority: {
        default: 'high',
        perType: {
          'bible-verse': 'critical',
          'translation-note': 'high',
          'translation-question': 'normal',
          'translation-academy': 'low',
          'translation-word': 'low',
          'words-link': 'low'
        }
      },
      metadata: this.createDefaultMetadata(`offline-${options.level}`)
    };
  }

  /**
   * Create scope for mobile applications
   */
  static createMobileOptimizedScope(options: {
    languages: string[];
    organizations?: string[];
    lowMemoryMode?: boolean;
    batteryOptimized?: boolean;
  }): ResourceScope {
    const resourceTypes = options.lowMemoryMode 
      ? ['bible-verse', 'translation-note']
      : ['bible-verse', 'translation-note', 'translation-question', 'words-link'];

    const filters: ResourceFilter[] = [];

    // Battery optimization - prefer smaller resources
    if (options.batteryOptimized) {
      filters.push({
        type: 'include',
        priority: 100,
        criteria: {
          sizeRange: {
            maxBytes: 1024 * 1024 // 1MB max per resource
          }
        },
        description: 'Prefer smaller resources for battery optimization'
      });
    }

    // Low memory mode - exclude large resources
    if (options.lowMemoryMode) {
      filters.push({
        type: 'exclude',
        priority: 200,
        criteria: {
          sizeRange: {
            minBytes: 500 * 1024 // Exclude resources > 500KB
          }
        },
        description: 'Exclude large resources in low memory mode'
      });
    }

    return {
      id: this.generateScopeId('mobile-optimized'),
      name: 'Mobile Optimized',
      description: 'Optimized for mobile applications',
      organizations: (options.organizations || ['unfoldingWord']).map(orgId => ({
        organizationId: orgId,
        repositories: ['*'],
        refs: ['master', 'main']
      })),
      languages: options.languages,
      resourceTypes,
      filters,
      maxCacheSize: options.lowMemoryMode ? 20 * 1024 * 1024 : 100 * 1024 * 1024, // 20MB or 100MB
      priority: {
        default: 'normal',
        perType: {
          'bible-verse': 'high',
          'translation-note': 'normal',
          'translation-question': 'low',
          'words-link': 'low'
        }
      },
      metadata: this.createDefaultMetadata('mobile-optimized')
    };
  }

  /**
   * Recommend scope based on application profile
   */
  static recommendScope(profile: ApplicationProfile): ScopeRecommendation {
    const recommendations: Array<{ scope: ResourceScope; confidence: number; reason: string }> = [];

    // Bible reader applications
    if (profile.type === 'reader') {
      const scope = this.createBibleReaderScope({
        languages: profile.languages,
        organizations: profile.organizations,
        includeNotes: profile.expectedResourceCount > 1000,
        includeQuestions: false
      });
      recommendations.push({
        scope,
        confidence: 0.9,
        reason: 'Optimized for Bible reading with minimal resources'
      });
    }

    // Translation editor applications
    if (profile.type === 'editor') {
      const level = profile.expectedResourceCount > 5000 ? 'advanced' : 'basic';
      const scope = this.createTranslatorScope({
        level,
        languages: profile.languages,
        organizations: profile.organizations,
        includeAcademy: level === 'advanced',
        includeWords: level === 'advanced'
      });
      recommendations.push({
        scope,
        confidence: 0.95,
        reason: `${level} translation tools with comprehensive resources`
      });
    }

    // Mobile applications
    if (profile.platform === 'mobile') {
      const scope = this.createMobileOptimizedScope({
        languages: profile.languages,
        organizations: profile.organizations,
        lowMemoryMode: profile.storageConstraints?.maxSize ? profile.storageConstraints.maxSize < 50 * 1024 * 1024 : false,
        batteryOptimized: true
      });
      recommendations.push({
        scope,
        confidence: 0.85,
        reason: 'Mobile-optimized with battery and memory considerations'
      });
    }

    // Offline applications
    if (profile.offlineSupport) {
      const level = profile.storageConstraints?.maxSize && profile.storageConstraints.maxSize < 100 * 1024 * 1024 ? 'minimal' : 'complete';
      const scope = this.createOfflineScope({
        level,
        languages: profile.languages,
        organizations: profile.organizations,
        maxSize: profile.storageConstraints?.maxSize
      });
      recommendations.push({
        scope,
        confidence: 0.8,
        reason: `${level} offline package for disconnected usage`
      });
    }

    // Server applications
    if (profile.type === 'server') {
      const scope = this.createFromTemplate('server-cache', {
        languages: profile.languages,
        organizations: profile.organizations
      });
      recommendations.push({
        scope,
        confidence: 0.75,
        reason: 'Server-optimized caching with high throughput'
      });
    }

    // Sort by confidence
    recommendations.sort((a, b) => b.confidence - a.confidence);

    const best = recommendations[0];
    const alternatives = recommendations.slice(1, 3);

    const reasoning = [
      `Application type: ${profile.type}`,
      `Platform: ${profile.platform}`,
      `Expected resources: ${profile.expectedResourceCount}`,
      `Languages: ${profile.languages.join(', ')}`,
      `Offline support: ${profile.offlineSupport ? 'Yes' : 'No'}`
    ];

    const suggestions = [];
    if (profile.storageConstraints?.maxSize && profile.storageConstraints.maxSize < 100 * 1024 * 1024) {
      suggestions.push('Consider enabling compression for better storage efficiency');
    }
    if (profile.concurrentUsers > 10) {
      suggestions.push('Consider implementing resource prioritization for high concurrency');
    }
    if (profile.realTimeCollaboration) {
      suggestions.push('Enable real-time synchronization features');
    }

    return {
      scope: best.scope,
      confidence: best.confidence,
      reasoning,
      alternatives,
      suggestions
    };
  }

  /**
   * Create custom scope with builder pattern
   */
  static createCustomScope(): ScopeBuilder {
    return new ScopeBuilder();
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private static getTemplateScope(template: ScopeTemplate): ResourceScope {
    switch (template) {
      case 'bible-reader':
        return this.createBibleReaderScope({
          languages: ['en'],
          includeNotes: false,
          includeQuestions: false
        });

      case 'translator-basic':
        return this.createTranslatorScope({
          level: 'basic',
          languages: ['en']
        });

      case 'translator-advanced':
        return this.createTranslatorScope({
          level: 'advanced',
          languages: ['en'],
          includeAcademy: true,
          includeWords: true
        });

      case 'offline-minimal':
        return this.createOfflineScope({
          level: 'minimal',
          languages: ['en']
        });

      case 'offline-complete':
        return this.createOfflineScope({
          level: 'complete',
          languages: ['en']
        });

      case 'mobile-optimized':
        return this.createMobileOptimizedScope({
          languages: ['en'],
          lowMemoryMode: true,
          batteryOptimized: true
        });

      default:
        return this.createBibleReaderScope({
          languages: ['en'],
          includeNotes: false,
          includeQuestions: false
        });
    }
  }

  private static generateScopeId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }

  static createDefaultMetadata(createdBy: string): ScopeMetadata {
    return {
      createdAt: new Date(),
      createdBy,
      lastModifiedAt: new Date(),
      lastModifiedBy: createdBy,
      version: 1,
      tags: [],
      usage: {
        totalResources: 0,
        resourcesByType: {},
        resourcesByOrganization: {},
        resourcesByLanguage: {},
        estimatedSize: 0,
        usageCount: 0
      }
    };
  }
}

// ============================================================================
// Scope Builder for Custom Scopes
// ============================================================================

/**
 * Builder pattern for creating custom scopes
 */
export class ScopeBuilder {
  private scope: Partial<ResourceScope> = {
    organizations: [],
    languages: [],
    resourceTypes: [],
    filters: [],
    priority: { default: 'normal' }
  };

  /**
   * Set scope name and description
   */
  withName(name: string, description?: string): ScopeBuilder {
    this.scope.name = name;
    this.scope.description = description || name;
    return this;
  }

  /**
   * Add organizations
   */
  withOrganizations(organizations: string[]): ScopeBuilder {
    this.scope.organizations = organizations.map(orgId => ({
      organizationId: orgId,
      repositories: ['*']
    }));
    return this;
  }

  /**
   * Add languages
   */
  withLanguages(languages: string[]): ScopeBuilder {
    this.scope.languages = languages;
    return this;
  }

  /**
   * Add resource types
   */
  withResourceTypes(resourceTypes: string[]): ScopeBuilder {
    this.scope.resourceTypes = resourceTypes;
    return this;
  }

  /**
   * Add books
   */
  withBooks(books: string[]): ScopeBuilder {
    this.scope.books = books;
    return this;
  }

  /**
   * Add filter
   */
  withFilter(filter: ResourceFilter): ScopeBuilder {
    if (!this.scope.filters) {
      this.scope.filters = [];
    }
    this.scope.filters.push(filter);
    return this;
  }

  /**
   * Set cache size limit
   */
  withMaxCacheSize(maxSize: number): ScopeBuilder {
    this.scope.maxCacheSize = maxSize;
    return this;
  }

  /**
   * Set priority configuration
   */
  withPriority(priority: ScopePriority): ScopeBuilder {
    this.scope.priority = priority;
    return this;
  }

  /**
   * Add text search filter
   */
  withTextSearch(searchText: string): ScopeBuilder {
    return this.withFilter({
      type: 'include',
      priority: 100,
      criteria: {
        content: {
          textSearch: searchText
        }
      },
      description: `Text search: ${searchText}`
    });
  }

  /**
   * Add date range filter
   */
  withDateRange(from?: Date, to?: Date): ScopeBuilder {
    return this.withFilter({
      type: 'include',
      priority: 90,
      criteria: {
        dateRange: { from, to }
      },
      description: 'Date range filter'
    });
  }

  /**
   * Add size constraint
   */
  withSizeLimit(maxBytes: number): ScopeBuilder {
    return this.withFilter({
      type: 'exclude',
      priority: 200,
      criteria: {
        sizeRange: {
          maxBytes
        }
      },
      description: `Size limit: ${maxBytes} bytes`
    });
  }

  /**
   * Build the scope
   */
  build(): ResourceScope {
    if (!this.scope.name) {
      throw new Error('Scope name is required');
    }

    const scope: ResourceScope = {
      id: `scope_${this.scope.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}_${Date.now()}`,
      name: this.scope.name,
      description: this.scope.description || this.scope.name,
      organizations: this.scope.organizations || [],
      languages: this.scope.languages || [],
      resourceTypes: this.scope.resourceTypes || [],
      books: this.scope.books,
      filters: this.scope.filters,
      maxCacheSize: this.scope.maxCacheSize,
      priority: this.scope.priority || { default: 'normal' },
      metadata: ScopeFactory.createDefaultMetadata('scope-builder')
    };

    return scope;
  }
}
