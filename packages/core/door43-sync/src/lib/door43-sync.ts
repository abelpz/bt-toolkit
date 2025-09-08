/**
 * Door43 Sync Library
 * Main entry point for synchronization services
 */

// Export core services
export { ChangeDetectionService } from './change-detection-service.js';
export { VersionManagementService } from './version-management-service.js';
export { RealTimeUpdatesService } from './real-time-updates-service.js';

// Export main orchestrator
export { 
  Door43SyncOrchestrator,
  createSyncOrchestrator,
  createOfflineSyncOrchestrator,
  createCollaborativeSyncOrchestrator,
  createBidirectionalSyncOrchestrator
} from './sync-orchestrator.js';

// Export bidirectional sync services
export { 
  BidirectionalSyncService,
  createBidirectionalSyncService
} from './bidirectional-sync-service.js';

// Export Door43 API service
export { 
  Door43ApiService,
  createDoor43ApiService,
  createTestDoor43ApiService
} from './door43-api-service.js';

// Export format adapters
export * from './adapters/index.js';

// Export unified orchestrator (commented out until dependencies are built)
// export { 
//   UnifiedResourceOrchestrator,
//   createTranslationOrchestrator,
//   createResearchOrchestrator
// } from './unified-resource-orchestrator.js';

// Export types
export type {
  SyncConfiguration,
  SyncStatus,
  SyncResult,
  SyncEvent,
  SyncEventType,
  SyncEventListener
} from './sync-orchestrator.js';

export type {
  ResourceVersion,
  ChangeOperation,
  ConflictInfo,
  ConflictResolutionStrategy,
  ChangeType
} from './change-detection-service.js';

export type {
  VersionNode,
  ConflictResolution,
  MergeStrategy
} from './version-management-service.js';

export type {
  RealTimeUpdateEvent,
  UpdateTransport,
  UpdateEventType
} from './real-time-updates-service.js';
