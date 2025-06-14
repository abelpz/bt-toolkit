import { PanelId, ResourceId, SignalSource } from './Signal';

/**
 * Navigation entry representing a single navigation action
 */
export interface NavigationEntry {
  id: string;
  resourceId?: ResourceId;
  panelId?: PanelId;
  timestamp: number;
  type: 'resource' | 'panel';
  metadata?: {
    trigger?: 'programmatic' | 'user' | 'external' | 'history_back' | 'history_forward';
    source?: SignalSource;
    [key: string]: any;
  };
}

/**
 * Navigation history state
 */
export interface NavigationHistory {
  entries: NavigationEntry[];
  currentIndex: number;
  canGoBack: boolean;
  canGoForward: boolean;
}

/**
 * Navigation options for controlling navigation behavior
 */
export interface NavigationOptions {
  trigger?: 'programmatic' | 'user' | 'external' | 'history_back' | 'history_forward';
  source?: SignalSource;
  metadata?: Record<string, any>;
  fromHistory?: boolean;
}

/**
 * Navigation controller interface
 */
export interface NavigationControllerAPI {
  // Navigation methods
  navigateToResource(resourceId: ResourceId, panelId?: PanelId, options?: NavigationOptions): Promise<void>;
  navigateToPanel(panelId: PanelId, options?: NavigationOptions): Promise<void>;

  // History navigation
  goBack(steps?: number): Promise<boolean>;
  goForward(steps?: number): Promise<boolean>;
  canGoBack(steps?: number): boolean;
  canGoForward(steps?: number): boolean;

  // History access
  getCurrentEntry(): NavigationEntry | undefined;
  getHistory(): NavigationHistory;
  getHistoryEntries(): NavigationEntry[];
  getCurrentPosition(): number;
  getHistorySize(): number;
  clearHistory(): void;

  // History management
  setMaxHistorySize(size: number): void;
  findEntries(criteria: NavigationSearchCriteria): NavigationEntry[];
  getRecentEntries(count?: number): NavigationEntry[];

  // Event handling
  onNavigation(handler: (entry: NavigationEntry) => void): () => void;
  onHistoryChanged(handler: (history: NavigationHistory) => void): () => void;

  // Cleanup
  cleanup(): void;
}

/**
 * Navigation search criteria
 */
export interface NavigationSearchCriteria {
  resourceId?: ResourceId;
  panelId?: PanelId;
  type?: 'resource' | 'panel';
  since?: number;
  until?: number;
}

/**
 * Navigation event types
 */
export interface NavigationEvent {
  type: 'navigate' | 'history_changed';
  entry?: NavigationEntry;
  history?: NavigationHistory;
  timestamp: number;
}

/**
 * Navigation configuration
 */
export interface NavigationConfig {
  maxHistorySize?: number;
  enableHistoryPersistence?: boolean;
  historyStorageKey?: string;
  trackExternalNavigation?: boolean;
} 