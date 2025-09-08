/**
 * Door43 Cache Library
 * Main entry point for the normalized cache system
 */

export { ResourceRegistry, ResourceId, ResourceMetadata, NormalizedResourceType } from './resource-registry.js';
export { ContentStore, NormalizedContent, ContentEntry } from './content-store.js';
export { CrossReferenceSystem, CrossReference, TraversalOptions, TraversalResult } from './cross-reference-system.js';
export { NormalizedCacheEngine, CacheEngineConfig, EnrichedResource, ResourceQueryOptions } from './normalized-cache-engine.js';

/**
 * Create a new normalized cache engine with the given configuration
 */
export function createCacheEngine(config: CacheEngineConfig): NormalizedCacheEngine {
  return new NormalizedCacheEngine(config);
}
