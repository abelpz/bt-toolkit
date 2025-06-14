import { ResourceId, PanelId, SignalHandler } from './Signal';
import { ResourceCleanupEvent } from './Cleanup';

// Resource state types
export interface ResourceState {
  isVisible: boolean;
  isFocused: boolean;
  isHighlighted: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  customState?: Record<string, any>;
}

// Resource lifecycle phases
export enum ResourceLifecyclePhase {
  CREATED = 'created',
  MOUNTING = 'mounting',
  MOUNTED = 'mounted',
  UPDATING = 'updating',
  UNMOUNTING = 'unmounting',
  UNMOUNTED = 'unmounted',
  ERROR = 'error',
}

// Alias for backward compatibility
export const LifecyclePhase = ResourceLifecyclePhase;

// Resource lifecycle events
export interface ResourceLifecycleEvent {
  resourceId: ResourceId;
  phase: ResourceLifecyclePhase;
  timestamp: number;
  metadata?: Record<string, any>;
  error?: Error;
}

// Resource configuration
export interface ResourceConfig {
  id: ResourceId;
  type: string;
  panelId: PanelId;
  props?: Record<string, any>;
  dependencies?: ResourceId[];
  cleanupStrategies?: string[];
  metadata?: Record<string, any>;
}

// Resource API interface
export interface ResourceAPI {
  id: ResourceId;
  type: string;
  panelId: PanelId;

  // Lifecycle methods
  mount: () => Promise<void> | void;
  unmount: () => Promise<void> | void;

  // State management
  getState: () => ResourceState;
  setState: (state: Partial<ResourceState>) => void;

  // Signal handling
  onSignal: SignalHandler;
  emitSignal: <TPayload = any>(
    type: string,
    payload: TPayload,
    target?: { panelId?: PanelId; resourceId?: ResourceId }
  ) => Promise<void>;

  // Navigation
  navigateToResource?: (
    resourceId: ResourceId,
    panelId?: PanelId
  ) => Promise<void>;

  // Cleanup
  onCleanup?: (event: ResourceCleanupEvent) => Promise<void>;

  // Configuration
  getConfig: () => ResourceConfig;
  updateConfig: (config: Partial<ResourceConfig>) => void;
}

// Resource factory types
export interface ResourceFactory<TProps = any> {
  type: string;
  create: (config: ResourceConfig, props?: TProps) => Promise<ResourceAPI>;
  canCreate: (config: ResourceConfig) => boolean;
  getDefaultConfig: () => Partial<ResourceConfig>;
}

export interface ResourceFactoryRegistry {
  register: <TProps = any>(factory: ResourceFactory<TProps>) => void;
  unregister: (type: string) => void;
  get: (type: string) => ResourceFactory | undefined;
  getAll: () => ResourceFactory[];
  canCreate: (type: string) => boolean;
}

// Resource dependency management
export interface ResourceDependency {
  resourceId: ResourceId;
  dependsOn: ResourceId[];
  dependents: ResourceId[];
  optional: boolean;
}

export interface ResourceDependencyGraph {
  addResource: (resourceId: ResourceId) => void;
  removeResource: (resourceId: ResourceId) => void;
  addDependency: (
    resourceId: ResourceId,
    dependsOn: ResourceId,
    optional?: boolean
  ) => void;
  removeDependency: (resourceId: ResourceId, dependsOn: ResourceId) => void;
  getDependencies: (resourceId: ResourceId) => ResourceId[];
  getDependents: (resourceId: ResourceId) => ResourceId[];
  getLoadOrder: () => ResourceId[];
  getUnloadOrder: () => ResourceId[];
  hasCycles: () => boolean;
  validate: () => { isValid: boolean; errors: string[] };
}

// Resource registry
export interface ResourceRegistry {
  register: (resource: ResourceAPI) => void;
  unregister: (resourceId: ResourceId) => void;
  get: (resourceId: ResourceId) => ResourceAPI | undefined;
  getByType: (type: string) => ResourceAPI[];
  getByPanel: (panelId: PanelId) => ResourceAPI[];
  getAll: () => ResourceAPI[];
  exists: (resourceId: ResourceId) => boolean;

  // Lifecycle management
  mount: (resourceId: ResourceId) => Promise<void>;
  unmount: (resourceId: ResourceId) => Promise<void>;
  mountAll: (panelId?: PanelId) => Promise<void>;
  unmountAll: (panelId?: PanelId) => Promise<void>;

  // State management
  getState: (resourceId: ResourceId) => ResourceState | undefined;
  setState: (resourceId: ResourceId, state: Partial<ResourceState>) => void;

  // Events
  onLifecycleEvent: (
    handler: (event: ResourceLifecycleEvent) => void
  ) => () => void;
  onCleanupEvent: (
    handler: (event: ResourceCleanupEvent) => void
  ) => () => void;
}

// Resource validation
export interface ResourceValidationRule {
  name: string;
  validate: (
    resource: ResourceAPI
  ) => Promise<{ isValid: boolean; errors: string[] }>;
}

export interface ResourceValidator {
  addRule: (rule: ResourceValidationRule) => void;
  removeRule: (name: string) => void;
  validate: (
    resource: ResourceAPI
  ) => Promise<{ isValid: boolean; errors: string[] }>;
  validateAll: () => Promise<{
    isValid: boolean;
    results: Record<ResourceId, { isValid: boolean; errors: string[] }>;
  }>;
}

// Resource metadata
export interface ResourceMetadata {
  createdAt: number;
  lastUpdated: number;
  version: string;
  tags: string[];
  custom: Record<string, any>;
}

// Resource navigation data
export interface ResourceNavigationData {
  type: string; // navigation type (e.g., 'verse', 'chapter', 'bookmark')
  target: string; // navigation target (e.g., 'JHN 3:16', 'chapter-5')
  data?: Record<string, any>; // additional navigation data
  timestamp?: number;
}
