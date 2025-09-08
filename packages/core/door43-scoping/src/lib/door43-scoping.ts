/**
 * Door43 Scoping Library
 * Main entry point for resource scoping and filtering system
 */

export { ResourceScopeManager } from './resource-scope-manager.js';
import { ResourceScopeManager } from './resource-scope-manager.js';

export type {
  ResourceScope,
  OrganizationScope,
  ResourceFilter,
  FilterCriteria,
  ContentFilter,
  ScopePriority,
  ScopeMetadata,
  ScopeUsageStats,
  ScopeEvaluationResult,
  DynamicScopeRequest,
  ScopeOptimizationResult,
  ScopeMigrationRequest,
  ScopeMigrationProgress
} from './resource-scope-manager.js';
import type { ResourceScope } from './resource-scope-manager.js';

export { ScopeFactory, ScopeBuilder } from './scope-factory.js';
import { ScopeFactory } from './scope-factory.js';

export type {
  ScopeTemplate,
  ApplicationProfile,
  ScopeRecommendation
} from './scope-factory.js';
import type { ScopeTemplate, ApplicationProfile, ScopeRecommendation, ScopeBuilder } from './scope-factory.js';

export { 
  ExtensibleScopeManager,
  createTranslationWorkflowScope,
  discoverAndCreateScope,
  TRANSLATION_GLOSSARY_TYPE
} from './extensible-resource-scoping.js';

export type {
  DynamicResourceType,
  ResourceCharacteristics,
  ResourceRelationshipPattern,
  ResourceDiscoveryMetadata,
  ExtendedFilterCriteria
} from './extensible-resource-scoping.js';

/**
 * Create a resource scope manager with storage backend
 */
export function createScopeManager(storageBackend: any) {
  return new ResourceScopeManager(storageBackend);
}

/**
 * Create a scope from template with customizations
 */
export function createScope(
  template: ScopeTemplate,
  customizations?: {
    languages?: string[];
    organizations?: string[];
    books?: string[];
    maxCacheSize?: number;
  }
): ResourceScope {
  return ScopeFactory.createFromTemplate(template, customizations);
}

/**
 * Get scope recommendation for application profile
 */
export function recommendScope(profile: ApplicationProfile): ScopeRecommendation {
  return ScopeFactory.recommendScope(profile);
}

/**
 * Create custom scope with builder pattern
 */
export function buildCustomScope(): ScopeBuilder {
  return ScopeFactory.createCustomScope();
}
