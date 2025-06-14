import { ResourceId, PanelId, SignalHandler } from './Signal';
import { ResourceAPI } from './Resource';

// Panel lifecycle phases
export enum PanelLifecyclePhase {
  CREATED = 'created',
  INITIALIZING = 'initializing',
  READY = 'ready',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DESTROYING = 'destroying',
  DESTROYED = 'destroyed',
  ERROR = 'error',
}

// Panel visibility states
export enum PanelVisibility {
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
  MINIMIZED = 'minimized',
  MAXIMIZED = 'maximized',
}

// Panel layout types
export enum PanelLayout {
  SINGLE = 'single',
  SPLIT_VERTICAL = 'split_vertical',
  SPLIT_HORIZONTAL = 'split_horizontal',
  TABBED = 'tabbed',
  FLOATING = 'floating',
}

// Panel configuration
export interface PanelConfig {
  id: PanelId;
  type: string;
  title: string;
  layout: PanelLayout;
  visibility: PanelVisibility;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  zIndex?: number;
  resizable?: boolean;
  draggable?: boolean;
  closable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  metadata?: Record<string, any>;
}

// Panel state
export interface PanelState {
  phase: PanelLifecyclePhase;
  visibility: PanelVisibility;
  isActive: boolean;
  isFocused: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  resourceCount: number;
  activeResourceId?: ResourceId;
  lastActivity: number;
  customState?: Record<string, any>;
}

// Panel metrics and analytics
export interface PanelMetrics {
  createdAt: number;
  lastActivated: number;
  totalActivations: number;
  totalTimeActive: number;
  resourcesLoaded: number;
  resourcesUnloaded: number;
  signalsEmitted: number;
  signalsReceived: number;
  errors: number;
}

// Panel events
export interface PanelLifecycleEvent {
  panelId: PanelId;
  phase: PanelLifecyclePhase;
  previousPhase?: PanelLifecyclePhase;
  timestamp: number;
  metadata?: Record<string, any>;
  error?: Error;
}

export interface PanelVisibilityEvent {
  panelId: PanelId;
  visibility: PanelVisibility;
  previousVisibility?: PanelVisibility;
  timestamp: number;
  reason?: string;
}

export interface PanelFocusEvent {
  panelId: PanelId;
  isFocused: boolean;
  previousFocus?: PanelId;
  timestamp: number;
  source?: 'user' | 'system' | 'navigation';
}

// Panel coordination
export interface PanelCoordination {
  id: string;
  panels: PanelId[];
  type: 'sync' | 'async' | 'broadcast';
  description?: string;
  handler: (event: any, panels: PanelAPI[]) => Promise<void>;
}

// Panel API interface
export interface PanelAPI {
  // Basic properties
  id: PanelId;
  type: string;
  config: PanelConfig;

  // Lifecycle management
  initialize(): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  destroy(): Promise<void>;

  // State management
  getState(): PanelState;
  setState(state: Partial<PanelState>): void;
  getMetrics(): PanelMetrics;

  // Visibility management
  show(): Promise<void>;
  hide(): Promise<void>;
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  setVisibility(visibility: PanelVisibility): Promise<void>;

  // Focus management
  focus(): Promise<void>;
  blur(): Promise<void>;
  isFocused(): boolean;

  // Resource management
  addResource(resource: ResourceAPI): Promise<void>;
  removeResource(resourceId: ResourceId): Promise<void>;
  getResource(resourceId: ResourceId): ResourceAPI | undefined;
  getResources(): ResourceAPI[];
  getActiveResource(): ResourceAPI | undefined;
  setActiveResource(resourceId: ResourceId): Promise<void>;

  // Signal handling
  onSignal(signalType: string, handler: SignalHandler): () => void;
  emitSignal<TPayload = any>(
    signalType: string,
    payload: TPayload,
    target?: { panelId?: PanelId; resourceId?: ResourceId }
  ): Promise<void>;

  // Configuration
  updateConfig(config: Partial<PanelConfig>): Promise<void>;
  getConfig(): PanelConfig;

  // Event handling
  onLifecycleEvent(handler: (event: PanelLifecycleEvent) => void): () => void;
  onVisibilityEvent(handler: (event: PanelVisibilityEvent) => void): () => void;
  onFocusEvent(handler: (event: PanelFocusEvent) => void): () => void;

  // Coordination
  addCoordination(coordination: PanelCoordination): void;
  removeCoordination(coordinationId: string): void;
  getCoordinations(): PanelCoordination[];

  // Layout and positioning
  setPosition(x: number, y: number): Promise<void>;
  setSize(width: number, height: number): Promise<void>;
  setBounds(x: number, y: number, width: number, height: number): Promise<void>;

  // Rendering (platform-specific)
  render(): any;
  refresh(): Promise<void>;
}

// Panel factory interface
export interface PanelFactory {
  type: string;
  create(config: PanelConfig): Promise<PanelAPI>;
  canCreate(config: PanelConfig): boolean;
  getDefaultConfig(): Partial<PanelConfig>;
  validateConfig(config: PanelConfig): { isValid: boolean; errors: string[] };
}

// Panel registry interface
export interface PanelRegistry {
  // Factory management
  registerFactory(factory: PanelFactory): void;
  unregisterFactory(type: string): void;
  getFactory(type: string): PanelFactory | undefined;
  getFactories(): PanelFactory[];

  // Panel management
  createPanel(config: PanelConfig): Promise<PanelAPI>;
  registerPanel(panel: PanelAPI): void;
  unregisterPanel(panelId: PanelId): void;
  getPanel(panelId: PanelId): PanelAPI | undefined;
  getPanels(): PanelAPI[];
  getPanelsByType(type: string): PanelAPI[];

  // Lifecycle coordination
  initializeAll(): Promise<void>;
  destroyAll(): Promise<void>;
  activatePanel(panelId: PanelId): Promise<void>;
  deactivatePanel(panelId: PanelId): Promise<void>;

  // Events
  onPanelCreated(handler: (panel: PanelAPI) => void): () => void;
  onPanelDestroyed(handler: (panelId: PanelId) => void): () => void;
  onPanelStateChanged(handler: (panelId: PanelId, state: PanelState) => void): () => void;
}

// Panel manager interface
export interface PanelManager {
  // Registry access
  getRegistry(): PanelRegistry;

  // Panel lifecycle
  createPanel(config: PanelConfig): Promise<PanelAPI>;
  destroyPanel(panelId: PanelId): Promise<void>;
  
  // Panel coordination
  switchToPanel(panelId: PanelId): Promise<void>;
  showPanel(panelId: PanelId): Promise<void>;
  hidePanel(panelId: PanelId): Promise<void>;
  focusPanel(panelId: PanelId): Promise<void>;

  // Layout management
  setLayout(layout: PanelLayout): Promise<void>;
  getLayout(): PanelLayout;
  optimizeLayout(): Promise<void>;

  // Resource coordination
  moveResource(resourceId: ResourceId, fromPanelId: PanelId, toPanelId: PanelId): Promise<void>;
  duplicateResource(resourceId: ResourceId, targetPanelId: PanelId): Promise<ResourceAPI>;

  // State management
  saveState(): Promise<any>;
  loadState(state: any): Promise<void>;
  resetState(): Promise<void>;

  // Events and coordination
  addGlobalCoordination(coordination: PanelCoordination): void;
  removeGlobalCoordination(coordinationId: string): void;

  // Cleanup
  cleanup(): Promise<void>;
}

// Panel layout constraints
export interface PanelLayoutConstraints {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number;
  snapToGrid?: boolean;
  gridSize?: number;
  allowOverlap?: boolean;
  stickToEdges?: boolean;
}

// Panel theme and styling
export interface PanelTheme {
  backgroundColor?: string;
  borderColor?: string;
  titleBarColor?: string;
  textColor?: string;
  accentColor?: string;
  shadowColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  customStyles?: Record<string, any>;
}

export default PanelAPI; 