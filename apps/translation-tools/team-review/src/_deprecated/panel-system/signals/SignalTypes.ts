// Core signal types
export const SIGNAL_TYPES = {
  // Resource lifecycle signals
  RESOURCE_MOUNTED: 'resource_mounted',
  RESOURCE_UNMOUNTED: 'resource_unmounted',
  RESOURCE_DISMISSED: 'resource_dismissed',
  RESOURCE_ERROR: 'resource_error',
  RESOURCE_STATE_CHANGED: 'resource_state_changed',
  RESOURCE_NAVIGATED: 'resource_navigated',

  // Panel management signals
  SHOW_PANEL: 'show_panel',
  HIDE_PANEL: 'hide_panel',
  SWITCH_PANEL: 'switch_panel',
  FOCUS_PANEL: 'focus_panel',
  PANEL_VISIBILITY_CHANGED: 'panel_visibility_changed',

  // Resource focus and navigation
  FOCUS_RESOURCE: 'focus_resource',
  NAVIGATE_TO_RESOURCE: 'navigate_to_resource',
  SHOW_RESOURCE: 'show_resource',
  HIDE_RESOURCE: 'hide_resource',

  // Highlighting system signals
  SET_HIGHLIGHTING: 'set_highlighting',
  CLEAR_HIGHLIGHTING: 'clear_highlighting',
  HIGHLIGHT_ALIGNMENT: 'highlight_alignment',
  CLEAR_ALIGNMENT_HIGHLIGHTS: 'clear_alignment_highlights',

  // User interaction signals
  WORD_CLICKED: 'word_clicked',
  QUOTE_HOVERED: 'quote_hovered',
  RESOURCE_CLICKED: 'resource_clicked',

  // Navigation signals
  NAVIGATE_TO_NOTE: 'navigate_to_note',
  NAVIGATE_BACK: 'navigate_back',
  NAVIGATE_FORWARD: 'navigate_forward',
  RESOURCE_SELECTED: 'resource_selected',
  SHOW_NOTE: 'show_note',
  SHOW_ALIGNMENT: 'show_alignment',

  // System signals
  SYSTEM_READY: 'system_ready',
  SYSTEM_ERROR: 'system_error',
  SYSTEM_SHUTDOWN: 'system_shutdown',

  // Custom signals (extensible)
  CUSTOM: 'custom',
} as const;

export type SignalTypeConstant =
  (typeof SIGNAL_TYPES)[keyof typeof SIGNAL_TYPES];

// Signal payload interfaces
export interface ResourceMountedPayload {
  resourceId: string;
  resourceType: string;
  panelId: string;
}

export interface ResourceUnmountedPayload {
  resourceId: string;
  resourceType: string;
  panelId: string;
  reason?: string;
}

export interface ResourceDismissedPayload {
  resourceId: string;
  resourceType: string;
  reason: 'unmounted' | 'hidden' | 'panel_switched' | 'error';
  cleanupData?: any;
}

export interface ShowPanelPayload {
  panelId: string;
  resourceId?: string;
  focus?: boolean;
}

export interface HidePanelPayload {
  panelId: string;
  reason?: string;
}

export interface SwitchPanelPayload {
  fromPanelId: string;
  toPanelId: string;
  resourceId?: string;
}

export interface FocusResourcePayload {
  resourceId: string;
  panelId?: string;
  highlight?: boolean;
  scrollTo?: boolean;
}

export interface NavigateToResourcePayload {
  resourceId: string;
  panelId?: string;
  data?: any;
}

export interface SetHighlightingPayload {
  key: string;
  data: {
    quote?: string;
    occurrence?: number;
    color?: string;
    temporary?: boolean;
    alignmentKey?: string;
    alignmentIds?: string[];
    customData?: any;
  };
}

export interface ClearHighlightingPayload {
  key: string;
  reason?: string;
}

export interface HighlightAlignmentPayload {
  alignmentIds?: string[];
  alignmentKey?: string;
  temporary?: boolean;
  color?: string;
}

export interface WordClickedPayload {
  word: string;
  index: number;
  alignment?: {
    strong: string;
    occurrence: number;
    lemma?: string;
    morphology?: string;
  };
  position?: {
    x: number;
    y: number;
  };
}

export interface QuoteHoveredPayload {
  quote: string;
  isHovering: boolean;
  occurrence?: number;
}

export interface NavigateToNotePayload {
  noteId: string;
  panelId?: string;
}

export interface ShowNotePayload {
  noteId: string;
  panelId?: string;
  highlight?: boolean;
}

export interface ShowAlignmentPayload {
  alignmentKey: string;
  panelId?: string;
  sourceWord?: string;
}

export interface SystemReadyPayload {
  timestamp: number;
  version?: string;
  config?: any;
}

export interface SystemErrorPayload {
  error: string;
  code?: string;
  details?: any;
}

export interface CustomSignalPayload {
  type: string;
  data: any;
}

// Signal priority levels
export enum SignalPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

// Signal categories for filtering and routing
export enum SignalCategory {
  LIFECYCLE = 'lifecycle',
  NAVIGATION = 'navigation',
  INTERACTION = 'interaction',
  HIGHLIGHTING = 'highlighting',
  SYSTEM = 'system',
  CUSTOM = 'custom',
}

// Signal routing configuration
export interface SignalTypeConfig {
  type: SignalTypeConstant;
  category: SignalCategory;
  priority: SignalPriority;
  requiresTarget?: boolean;
  validatePayload?: (payload: any) => boolean;
  description?: string;
}

// Default signal configurations
export const SIGNAL_CONFIGS: Record<SignalTypeConstant, SignalTypeConfig> = {
  [SIGNAL_TYPES.RESOURCE_MOUNTED]: {
    type: SIGNAL_TYPES.RESOURCE_MOUNTED,
    category: SignalCategory.LIFECYCLE,
    priority: SignalPriority.NORMAL,
    description: 'Emitted when a resource is successfully mounted',
  },
  [SIGNAL_TYPES.RESOURCE_UNMOUNTED]: {
    type: SIGNAL_TYPES.RESOURCE_UNMOUNTED,
    category: SignalCategory.LIFECYCLE,
    priority: SignalPriority.NORMAL,
    description: 'Emitted when a resource is unmounted',
  },
  [SIGNAL_TYPES.RESOURCE_DISMISSED]: {
    type: SIGNAL_TYPES.RESOURCE_DISMISSED,
    category: SignalCategory.LIFECYCLE,
    priority: SignalPriority.HIGH,
    description:
      'Emitted when a resource becomes unavailable and needs cleanup',
  },
  [SIGNAL_TYPES.RESOURCE_ERROR]: {
    type: SIGNAL_TYPES.RESOURCE_ERROR,
    category: SignalCategory.SYSTEM,
    priority: SignalPriority.CRITICAL,
    description: 'Emitted when a resource encounters an error',
  },
  [SIGNAL_TYPES.RESOURCE_STATE_CHANGED]: {
    type: SIGNAL_TYPES.RESOURCE_STATE_CHANGED,
    category: SignalCategory.LIFECYCLE,
    priority: SignalPriority.NORMAL,
    description: 'Emitted when a resource state changes',
  },
  [SIGNAL_TYPES.RESOURCE_NAVIGATED]: {
    type: SIGNAL_TYPES.RESOURCE_NAVIGATED,
    category: SignalCategory.NAVIGATION,
    priority: SignalPriority.NORMAL,
    description: 'Emitted when a resource navigation occurs',
  },
  [SIGNAL_TYPES.SHOW_PANEL]: {
    type: SIGNAL_TYPES.SHOW_PANEL,
    category: SignalCategory.NAVIGATION,
    priority: SignalPriority.NORMAL,
    requiresTarget: true,
    description: 'Show a specific panel',
  },
  [SIGNAL_TYPES.HIDE_PANEL]: {
    type: SIGNAL_TYPES.HIDE_PANEL,
    category: SignalCategory.NAVIGATION,
    priority: SignalPriority.NORMAL,
    requiresTarget: true,
    description: 'Hide a specific panel',
  },
  [SIGNAL_TYPES.SWITCH_PANEL]: {
    type: SIGNAL_TYPES.SWITCH_PANEL,
    category: SignalCategory.NAVIGATION,
    priority: SignalPriority.HIGH,
    description: 'Switch from one panel to another',
  },
  [SIGNAL_TYPES.FOCUS_PANEL]: {
    type: SIGNAL_TYPES.FOCUS_PANEL,
    category: SignalCategory.NAVIGATION,
    priority: SignalPriority.NORMAL,
    requiresTarget: true,
    description: 'Focus on a specific panel',
  },
  [SIGNAL_TYPES.PANEL_VISIBILITY_CHANGED]: {
    type: SIGNAL_TYPES.PANEL_VISIBILITY_CHANGED,
    category: SignalCategory.NAVIGATION,
    priority: SignalPriority.NORMAL,
    description: 'Emitted when panel visibility changes',
  },
  [SIGNAL_TYPES.FOCUS_RESOURCE]: {
    type: SIGNAL_TYPES.FOCUS_RESOURCE,
    category: SignalCategory.NAVIGATION,
    priority: SignalPriority.NORMAL,
    requiresTarget: true,
    description: 'Focus on a specific resource',
  },
  [SIGNAL_TYPES.NAVIGATE_TO_RESOURCE]: {
    type: SIGNAL_TYPES.NAVIGATE_TO_RESOURCE,
    category: SignalCategory.NAVIGATION,
    priority: SignalPriority.HIGH,
    description: 'Navigate to a specific resource',
  },
  [SIGNAL_TYPES.SHOW_RESOURCE]: {
    type: SIGNAL_TYPES.SHOW_RESOURCE,
    category: SignalCategory.NAVIGATION,
    priority: SignalPriority.NORMAL,
    requiresTarget: true,
    description: 'Show a specific resource',
  },
  [SIGNAL_TYPES.HIDE_RESOURCE]: {
    type: SIGNAL_TYPES.HIDE_RESOURCE,
    category: SignalCategory.NAVIGATION,
    priority: SignalPriority.NORMAL,
    requiresTarget: true,
    description: 'Hide a specific resource',
  },
  [SIGNAL_TYPES.SET_HIGHLIGHTING]: {
    type: SIGNAL_TYPES.SET_HIGHLIGHTING,
    category: SignalCategory.HIGHLIGHTING,
    priority: SignalPriority.NORMAL,
    description: 'Set highlighting for specific content',
  },
  [SIGNAL_TYPES.CLEAR_HIGHLIGHTING]: {
    type: SIGNAL_TYPES.CLEAR_HIGHLIGHTING,
    category: SignalCategory.HIGHLIGHTING,
    priority: SignalPriority.NORMAL,
    description: 'Clear highlighting for specific content',
  },
  [SIGNAL_TYPES.HIGHLIGHT_ALIGNMENT]: {
    type: SIGNAL_TYPES.HIGHLIGHT_ALIGNMENT,
    category: SignalCategory.HIGHLIGHTING,
    priority: SignalPriority.NORMAL,
    description: 'Highlight alignment data',
  },
  [SIGNAL_TYPES.CLEAR_ALIGNMENT_HIGHLIGHTS]: {
    type: SIGNAL_TYPES.CLEAR_ALIGNMENT_HIGHLIGHTS,
    category: SignalCategory.HIGHLIGHTING,
    priority: SignalPriority.NORMAL,
    description: 'Clear alignment highlighting',
  },
  [SIGNAL_TYPES.WORD_CLICKED]: {
    type: SIGNAL_TYPES.WORD_CLICKED,
    category: SignalCategory.INTERACTION,
    priority: SignalPriority.HIGH,
    description: 'User clicked on a word',
  },
  [SIGNAL_TYPES.QUOTE_HOVERED]: {
    type: SIGNAL_TYPES.QUOTE_HOVERED,
    category: SignalCategory.INTERACTION,
    priority: SignalPriority.LOW,
    description: 'User hovered over a quote',
  },
  [SIGNAL_TYPES.RESOURCE_CLICKED]: {
    type: SIGNAL_TYPES.RESOURCE_CLICKED,
    category: SignalCategory.INTERACTION,
    priority: SignalPriority.NORMAL,
    description: 'User clicked on a resource',
  },
  [SIGNAL_TYPES.NAVIGATE_TO_NOTE]: {
    type: SIGNAL_TYPES.NAVIGATE_TO_NOTE,
    category: SignalCategory.NAVIGATION,
    priority: SignalPriority.HIGH,
    description: 'Navigate to a specific note',
  },
  [SIGNAL_TYPES.NAVIGATE_BACK]: {
    type: SIGNAL_TYPES.NAVIGATE_BACK,
    category: SignalCategory.NAVIGATION,
    priority: SignalPriority.NORMAL,
    description: 'Navigate back in history',
  },
  [SIGNAL_TYPES.NAVIGATE_FORWARD]: {
    type: SIGNAL_TYPES.NAVIGATE_FORWARD,
    category: SignalCategory.NAVIGATION,
    priority: SignalPriority.NORMAL,
    description: 'Navigate forward in history',
  },
  [SIGNAL_TYPES.RESOURCE_SELECTED]: {
    type: SIGNAL_TYPES.RESOURCE_SELECTED,
    category: SignalCategory.NAVIGATION,
    priority: SignalPriority.NORMAL,
    description: 'Resource was selected by user',
  },
  [SIGNAL_TYPES.SHOW_NOTE]: {
    type: SIGNAL_TYPES.SHOW_NOTE,
    category: SignalCategory.NAVIGATION,
    priority: SignalPriority.NORMAL,
    description: 'Show a specific note',
  },
  [SIGNAL_TYPES.SHOW_ALIGNMENT]: {
    type: SIGNAL_TYPES.SHOW_ALIGNMENT,
    category: SignalCategory.NAVIGATION,
    priority: SignalPriority.NORMAL,
    description: 'Show alignment data',
  },
  [SIGNAL_TYPES.SYSTEM_READY]: {
    type: SIGNAL_TYPES.SYSTEM_READY,
    category: SignalCategory.SYSTEM,
    priority: SignalPriority.HIGH,
    description: 'System is ready and initialized',
  },
  [SIGNAL_TYPES.SYSTEM_ERROR]: {
    type: SIGNAL_TYPES.SYSTEM_ERROR,
    category: SignalCategory.SYSTEM,
    priority: SignalPriority.CRITICAL,
    description: 'System encountered an error',
  },
  [SIGNAL_TYPES.SYSTEM_SHUTDOWN]: {
    type: SIGNAL_TYPES.SYSTEM_SHUTDOWN,
    category: SignalCategory.SYSTEM,
    priority: SignalPriority.CRITICAL,
    description: 'System is shutting down',
  },
  [SIGNAL_TYPES.CUSTOM]: {
    type: SIGNAL_TYPES.CUSTOM,
    category: SignalCategory.CUSTOM,
    priority: SignalPriority.NORMAL,
    description: 'Custom signal type',
  },
};
