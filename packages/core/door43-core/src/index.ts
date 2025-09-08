// Core types and interfaces
export * from './lib/types.js';
export * from './lib/interfaces.js';

// Cache system types (avoiding duplicates)
export type {
  RepositoryIdentifier,
  RepositoryContainer,
  RepositoryMetadata,
  ProcessedManifest,
  ProcessedProject,
  ProcessedFile,
  ProcessingMetadata,
  CacheConfiguration,
  CacheMetadata,
  CacheKey,
  CacheEntry,
  CacheStats,
  BulkDownloadRequest,
  BulkDownloadResult,
  OnDemandRequest,
  OnDemandResult,
  CrossReferenceIndex,
  CrossReferenceEntry
} from './lib/cache-types.js';

export type {
  IRepositoryCacheService,
  IResourceCacheService,
  IBulkDownloadService,
  IOnDemandBuildService,
  ICrossReferenceCacheService,
  ICacheManager,
  ICacheEventEmitter,
  ICacheStrategyFactory
} from './lib/cache-interfaces.js';

// Normalized cache types
export type {
  NormalizedResourceType,
  ResourceMetadata as NormalizedResourceMetadata,
  ResourceSource,
  ResourceSection,
  ResourceLocation,
  ResourceReferences,
  ResourceCacheMetadata,
  ModificationInfo,
  ResourceModification,
  NormalizedResource,
  NormalizedContent,
  BibleVerseContent,
  TranslationNoteContent,
  TranslationWordContent,
  TranslationAcademyContent,
  TranslationQuestionContent,
  WordsLinkContent,
  AlignmentContent,
  CrossReferenceData,
  ResourceQuery,
  ResourceQueryResult,
  BatchOperation,
  BatchOperationResult
} from './lib/normalized-cache-types.js';

export type {
  IResourceRegistryService,
  INormalizedContentService,
  ICrossReferenceService,
  IResourceQueryService,
  ISynchronizationService,
  IChangeTrackingService,
  INormalizedCacheManager,
  INormalizedCacheFactory
} from './lib/normalized-cache-interfaces.js';

// Sync types
export type {
  ResourceSyncState,
  ResourceVersion,
  SyncMetadata,
  SyncError,
  ConflictInfo,
  ConflictResolution,
  ChangeDetectionConfig,
  ChangeDetectionResult,
  ResourceChange,
  SyncStrategyConfig,
  SyncStrategy,
  SyncFrequency,
  ConflictResolutionPolicy,
  RetryPolicy,
  BandwidthOptimization,
  RealTimeUpdateEvent,
  UserInfo,
  RealTimeConnectionStatus,
  ActiveEditor,
  EditorCapabilities,
  CollaborativeSession,
  SyncOperationRequest,
  SyncOperationResult,
  BatchSyncRequest,
  SyncProgress
} from './lib/sync-types.js';

export type {
  IChangeDetectionService,
  IVersionManagementService,
  ISyncStateService,
  IConflictResolutionService,
  IRealTimeUpdatesService,
  ICollaborativeEditingService,
  ISynchronizationOrchestrator,
  IDoor43SyncService,
  ISyncManager
} from './lib/sync-interfaces.js';

// Extensible cache types
export type {
  PlatformType,
  PlatformCapabilities,
  StorageType,
  StorageConfig,
  StorageOptions,
  StorageInfo,
  BatchStorageOperation,
  BatchStorageResult,
  StorageChangeEvent,
  StorageOptimizationResult,
  ResourceScope,
  OrganizationScope,
  ResourceFilter,
  ScopePriority,
  TenantConfig,
  TenantIsolation,
  TenantLimits,
  TenantPermissions,
  ExtensibleCacheConfig,
  StorageBackendConfig,
  ScopingConfig,
  MultiTenantConfig,
  PerformanceConfig,
  FeatureFlags,
  ApplicationProfile
} from './lib/extensible-cache-types.js';

export type {
  IPlatformDetectionService,
  IStorageBackendFactory,
  IResourceScopeManager,
  IMultiTenantCacheManager,
  IExtensibleCache,
  IExtensibleCacheFactory,
  IWebCache,
  IMobileCache,
  IDesktopCache,
  IServerCache,
  ICacheAdapter
} from './lib/extensible-cache-interfaces.js';
