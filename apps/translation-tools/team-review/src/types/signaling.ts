export type PanelId = string;
export type ResourceId = string;
export type SignalType = string;

// Base signal interface
export interface Signal<TPayload = any> {
  id: string;
  type: SignalType;
  source: {
    panelId: PanelId;
    resourceId: ResourceId;
  };
  target?: {
    panelId?: PanelId;
    resourceId?: ResourceId;
  };
  payload: TPayload;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Signal handler function type
export type SignalHandler<TPayload = any> = (signal: Signal<TPayload>) => void | Promise<void>;

// Resource API interface that each resource must implement
export interface ResourceAPI {
  id: ResourceId;
  panelId: PanelId;
  
  // Signal handling
  onSignal: (signal: Signal) => void | Promise<void>;
  
  // Resource lifecycle
  mount: () => void;
  unmount: () => void;
  
  // Resource state
  getState: () => any;
  setState: (state: any) => void;
}

// Panel API interface
export interface PanelAPI {
  id: PanelId;
  resources: Map<ResourceId, ResourceAPI>;
  
  // Resource management
  addResource: (resource: ResourceAPI) => void;
  removeResource: (resourceId: ResourceId) => void;
  getResource: (resourceId: ResourceId) => ResourceAPI | undefined;
  
  // Signal handling for the panel
  onSignal: (signal: Signal) => void | Promise<void>;
}

// Common signal types
export const SIGNAL_TYPES = {
  // Navigation signals
  NAVIGATE_TO_VERSE: 'navigate_to_verse',
  NAVIGATE_TO_CHAPTER: 'navigate_to_chapter',
  
  // Content signals
  HIGHLIGHT_TEXT: 'highlight_text',
  CLEAR_HIGHLIGHTS: 'clear_highlights',
  SHOW_NOTES: 'show_notes',
  HIDE_NOTES: 'hide_notes',
  
  // UI signals
  FOCUS_RESOURCE: 'focus_resource',
  SHOW_PANEL: 'show_panel',
  HIDE_PANEL: 'hide_panel',
  
  // Data signals
  DATA_UPDATED: 'data_updated',
  SELECTION_CHANGED: 'selection_changed',
  
  // Custom signals (extensible)
  CUSTOM: 'custom'
} as const;

// Signal payloads for common signal types
export interface NavigateToVersePayload {
  book: string;
  chapter: number;
  verse: number;
}

export interface HighlightTextPayload {
  text: string;
  startOffset: number;
  endOffset: number;
  highlightId: string;
  color?: string;
}

export interface FocusResourcePayload {
  resourceId: ResourceId;
  panelId?: PanelId;
  scrollTo?: boolean;
  highlight?: boolean;
}

export interface ShowNotesPayload {
  verseRef: string;
  noteType?: string;
  noteId?: string;
}

export interface DataUpdatedPayload {
  dataType: string;
  resourceId: ResourceId;
  data: any;
}

export interface SelectionChangedPayload {
  selectedText: string;
  verseRef: string;
  resourceId: ResourceId;
} 