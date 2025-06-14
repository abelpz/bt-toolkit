import { ResourceId } from './Signal';

// Cleanup reasons
export enum CleanupReason {
  UNMOUNTED = 'unmounted',
  HIDDEN = 'hidden',
  PANEL_SWITCHED = 'panel_switched',
  ERROR = 'error',
  MANUAL = 'manual',
}

// Resource cleanup types
export interface ResourceCleanupEvent {
  resourceId: ResourceId;
  resourceType: string;
  reason: CleanupReason;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ResourceDismissedPayload {
  resourceId: ResourceId;
  resourceType: string;
  reason: CleanupReason;
  cleanupData?: any;
}

// Highlighting cleanup types
export enum HighlightingKey {
  TRANSLATION_NOTES = 'translation_notes',
  WORD_CLICK = 'word_click',
  ALIGNMENT = 'alignment',
  CUSTOM = 'custom',
}

export interface HighlightData {
  quote?: string;
  occurrence?: number;
  color?: string;
  temporary?: boolean;
  alignmentKey?: string;
  alignmentIds?: string[];
  customData?: any;
}

export interface SetHighlightingPayload {
  key: HighlightingKey | string;
  data: HighlightData;
}

export interface ClearHighlightingPayload {
  key: HighlightingKey | string;
  reason?: string;
}

// Cleanup strategy types
export interface CleanupStrategy {
  name: string;
  priority: number;
  execute: (event: ResourceCleanupEvent) => Promise<void>;
  canHandle: (event: ResourceCleanupEvent) => boolean;
}

export interface CleanupCoordinator {
  registerStrategy: (strategy: CleanupStrategy) => void;
  unregisterStrategy: (name: string) => void;
  executeCleanup: (event: ResourceCleanupEvent) => Promise<void>;
  getStrategies: () => CleanupStrategy[];
}

// Cleanup validation
export interface CleanupValidationResult {
  isComplete: boolean;
  pendingCleanups: string[];
  errors: string[];
}

export interface CleanupTracker {
  trackCleanup: (resourceId: ResourceId, cleanupType: string) => void;
  markComplete: (resourceId: ResourceId, cleanupType: string) => void;
  getPendingCleanups: (resourceId?: ResourceId) => string[];
  validate: (resourceId?: ResourceId) => CleanupValidationResult;
}

// Cross-resource cleanup coordination
export interface CleanupDependency {
  sourceResourceId: ResourceId;
  targetResourceId: ResourceId;
  cleanupType: string;
  priority: number;
}

export interface CleanupGraph {
  addDependency: (dependency: CleanupDependency) => void;
  removeDependency: (sourceId: ResourceId, targetId: ResourceId) => void;
  getCleanupOrder: (resourceId: ResourceId) => ResourceId[];
  hasCycles: () => boolean;
}
