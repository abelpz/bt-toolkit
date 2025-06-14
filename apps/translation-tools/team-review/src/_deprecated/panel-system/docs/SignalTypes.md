# Signal Types Reference

This document provides a comprehensive reference of all signal types available in the panel system, their payloads, and usage patterns.

## Overview

Signals are the primary communication mechanism in the panel system. Each signal has a specific type, source, and optional payload that carries relevant data.

```typescript
interface Signal {
  type: string;                    // Signal type identifier
  source: SignalSource;           // Where the signal originated
  payload?: any;                  // Signal-specific data
  metadata?: SignalMetadata;      // Additional metadata
}
```

## Navigation Signals

### `NAVIGATE_TO_RESOURCE`

Navigate to a specific resource, optionally in a specific panel.

**Payload:**
```typescript
{
  resourceId: string;              // Target resource ID
  panelId?: string;               // Optional target panel ID
  scrollTo?: boolean;             // Whether to scroll to resource
  highlight?: boolean;            // Whether to highlight resource
  context?: {                     // Navigation context
    trigger: 'user' | 'system' | 'coordination';
    previousResourceId?: string;
    metadata?: any;
  };
}
```

**Usage:**
```typescript
await signalBus.emit({
  type: 'NAVIGATE_TO_RESOURCE',
  source: { panelId: 'source-panel', resourceId: 'genesis-1-1' },
  payload: {
    resourceId: 'genesis-1-2',
    panelId: 'translation-panel',
    scrollTo: true,
    highlight: true
  }
});
```

### `NAVIGATE_BACK`

Navigate back in the navigation history.

**Payload:**
```typescript
{
  steps?: number;                 // Number of steps to go back (default: 1)
}
```

**Usage:**
```typescript
await signalBus.emit({
  type: 'NAVIGATE_BACK',
  source: { panelId: 'navigation-panel' },
  payload: { steps: 1 }
});
```

### `NAVIGATE_FORWARD`

Navigate forward in the navigation history.

**Payload:**
```typescript
{
  steps?: number;                 // Number of steps to go forward (default: 1)
}
```

## Panel Management Signals

### `SHOW_PANEL`

Show (make visible) a specific panel.

**Payload:**
```typescript
{
  panelId: string;               // Panel ID to show
  focus?: boolean;               // Whether to focus after showing
  bringToFront?: boolean;        // Whether to bring to front (floating layout)
}
```

**Usage:**
```typescript
await signalBus.emit({
  type: 'SHOW_PANEL',
  source: { panelId: 'panel-manager' },
  payload: {
    panelId: 'translation-panel',
    focus: true,
    bringToFront: true
  }
});
```

### `HIDE_PANEL`

Hide a specific panel.

**Payload:**
```typescript
{
  panelId: string;               // Panel ID to hide
  switchToAlternative?: boolean; // Whether to switch to another panel
}
```

### `FOCUS_PANEL`

Focus a specific panel for keyboard input.

**Payload:**
```typescript
{
  panelId: string;               // Panel ID to focus
  focus: boolean;                // True to focus, false to blur
}
```

### `SWITCH_PANEL`

Switch the active panel.

**Payload:**
```typescript
{
  panelId: string;               // Panel ID to switch to
  previousPanelId?: string;      // Previously active panel ID
}
```

### `PANEL_CREATED`

Emitted when a new panel is created.

**Payload:**
```typescript
{
  panelId: string;               // ID of created panel
  panelType: string;             // Type of created panel
  config: PanelConfig;           // Panel configuration
}
```

### `PANEL_DESTROYED`

Emitted when a panel is destroyed.

**Payload:**
```typescript
{
  panelId: string;               // ID of destroyed panel
  panelType: string;             // Type of destroyed panel
}
```

## Resource Management Signals

### `RESOURCE_ADDED`

Emitted when a resource is added to a panel.

**Payload:**
```typescript
{
  resourceId: string;            // ID of added resource
  resourceType: string;          // Type of added resource
  panelId: string;              // Panel that received the resource
  resource: ResourceAPI;         // The resource object
}
```

### `RESOURCE_REMOVED`

Emitted when a resource is removed from a panel.

**Payload:**
```typescript
{
  resourceId: string;            // ID of removed resource
  resourceType: string;          // Type of removed resource
  panelId: string;              // Panel that lost the resource
}
```

### `RESOURCE_UPDATED`

Emitted when a resource's data is updated.

**Payload:**
```typescript
{
  resourceId: string;            // ID of updated resource
  resourceType: string;          // Type of updated resource
  panelId?: string;             // Panel containing the resource (if specific)
  changes: {                     // What changed
    [key: string]: {
      oldValue: any;
      newValue: any;
    };
  };
  resource: ResourceAPI;         // Updated resource object
}
```

### `RESOURCE_SELECTED`

Emitted when a resource becomes the active/selected resource in a panel.

**Payload:**
```typescript
{
  resourceId: string;            // ID of selected resource
  resourceType: string;          // Type of selected resource
  panelId: string;              // Panel where selection occurred
  previousResourceId?: string;   // Previously selected resource
}
```

### `RESOURCE_LOADED`

Emitted when a resource finishes loading its data.

**Payload:**
```typescript
{
  resourceId: string;            // ID of loaded resource
  resourceType: string;          // Type of loaded resource
  panelId: string;              // Panel containing the resource
  loadTime: number;             // Time taken to load (ms)
  success: boolean;             // Whether loading was successful
  error?: string;               // Error message if loading failed
}
```

## Layout Management Signals

### `LAYOUT_CHANGED`

Emitted when the panel layout changes.

**Payload:**
```typescript
{
  newLayout: PanelLayout;        // New layout mode
  previousLayout: PanelLayout;   // Previous layout mode
  affectedPanels: string[];      // Panel IDs affected by the change
}
```

**Usage:**
```typescript
signalBus.onGlobal('LAYOUT_CHANGED', async (signal) => {
  console.log('Layout changed from', signal.payload.previousLayout, 
              'to', signal.payload.newLayout);
  
  // Update UI based on new layout
  await updateLayoutUI(signal.payload.newLayout);
});
```

### `PANEL_RESIZED`

Emitted when a panel is resized.

**Payload:**
```typescript
{
  panelId: string;               // ID of resized panel
  newSize: {                     // New panel dimensions
    width: number;
    height: number;
  };
  previousSize: {                // Previous panel dimensions
    width: number;
    height: number;
  };
}
```

### `PANEL_MOVED`

Emitted when a panel is moved (floating layout).

**Payload:**
```typescript
{
  panelId: string;               // ID of moved panel
  newPosition: {                 // New panel position
    x: number;
    y: number;
  };
  previousPosition: {            // Previous panel position
    x: number;
    y: number;
  };
}
```

## Coordination Signals

### `COORDINATION_TRIGGERED`

Emitted when a panel coordination is triggered.

**Payload:**
```typescript
{
  coordinationId: string;        // ID of triggered coordination
  coordinationType: string;      // Type of coordination
  triggerPanel: string;          // Panel that triggered the coordination
  affectedPanels: string[];      // Panels affected by the coordination
  eventData: any;               // Data that triggered the coordination
}
```

### `SYNC_REQUEST`

Request synchronization between panels.

**Payload:**
```typescript
{
  syncType: string;              // Type of synchronization
  sourcePanelId: string;         // Panel requesting sync
  targetPanelIds: string[];      // Panels to sync with
  syncData: any;                // Data to synchronize
}
```

## State Management Signals

### `STATE_SAVED`

Emitted when panel system state is saved.

**Payload:**
```typescript
{
  timestamp: number;             // When state was saved
  stateSize: number;            // Size of saved state (bytes)
  panelCount: number;           // Number of panels in saved state
  success: boolean;             // Whether save was successful
}
```

### `STATE_LOADED`

Emitted when panel system state is loaded.

**Payload:**
```typescript
{
  timestamp: number;             // When state was loaded
  stateAge: number;             // Age of loaded state (ms)
  panelCount: number;           // Number of panels restored
  success: boolean;             // Whether load was successful
  errors?: string[];            // Any errors during loading
}
```

### `STATE_RESET`

Emitted when panel system state is reset.

**Payload:**
```typescript
{
  timestamp: number;             // When reset occurred
  previousPanelCount: number;    // Number of panels before reset
}
```

## Error and Status Signals

### `ERROR`

Emitted when an error occurs in the panel system.

**Payload:**
```typescript
{
  errorType: string;             // Type of error
  errorMessage: string;          // Human-readable error message
  errorCode?: string;           // Error code (if applicable)
  panelId?: string;             // Panel where error occurred (if applicable)
  resourceId?: string;          // Resource related to error (if applicable)
  stack?: string;               // Error stack trace
  recoverable: boolean;         // Whether error is recoverable
}
```

**Usage:**
```typescript
signalBus.onGlobal('ERROR', async (signal) => {
  const { errorType, errorMessage, recoverable } = signal.payload;
  
  console.error(`Panel System Error [${errorType}]:`, errorMessage);
  
  if (recoverable) {
    // Attempt recovery
    await attemptErrorRecovery(signal.payload);
  } else {
    // Show critical error to user
    showCriticalError(errorMessage);
  }
});
```

### `WARNING`

Emitted for non-critical issues.

**Payload:**
```typescript
{
  warningType: string;           // Type of warning
  warningMessage: string;        // Human-readable warning message
  panelId?: string;             // Panel related to warning
  resourceId?: string;          // Resource related to warning
}
```

### `STATUS_UPDATE`

General status updates from panels or resources.

**Payload:**
```typescript
{
  statusType: string;            // Type of status update
  status: string;               // Status message
  panelId?: string;             // Panel reporting status
  resourceId?: string;          // Resource reporting status
  progress?: number;            // Progress percentage (0-100)
  metadata?: any;               // Additional status data
}
```

## Custom Application Signals

### `CUSTOM`

Generic signal type for application-specific events.

**Payload:**
```typescript
{
  customType: string;            // Application-specific type
  data: any;                    // Application-specific data
}
```

**Usage:**
```typescript
// Emit custom signal
await signalBus.emit({
  type: 'CUSTOM',
  source: { panelId: 'translation-panel' },
  payload: {
    customType: 'TRANSLATION_SAVED',
    data: {
      verseId: 'genesis-1-1',
      translation: 'In the beginning...',
      timestamp: Date.now()
    }
  }
});

// Listen for custom signals
signalBus.onGlobal('CUSTOM', async (signal) => {
  if (signal.payload.customType === 'TRANSLATION_SAVED') {
    await handleTranslationSaved(signal.payload.data);
  }
});
```

## Bible Translation Specific Signals

### `VERSE_SELECTED`

Emitted when a Bible verse is selected.

**Payload:**
```typescript
{
  verseId: string;               // Verse identifier (e.g., "genesis-1-1")
  book: string;                 // Book name
  chapter: number;              // Chapter number
  verse: number;                // Verse number
  text?: string;                // Verse text (if available)
  translation?: string;         // Translation identifier
}
```

### `CHAPTER_CHANGED`

Emitted when navigation moves to a different chapter.

**Payload:**
```typescript
{
  book: string;                 // Book name
  chapter: number;              // New chapter number
  previousChapter?: number;     // Previous chapter number
  verseCount: number;           // Number of verses in chapter
}
```

### `TRANSLATION_UPDATED`

Emitted when a translation is modified.

**Payload:**
```typescript
{
  verseId: string;              // Verse being translated
  translation: string;          // New translation text
  previousTranslation?: string; // Previous translation
  language: string;             // Target language
  translator?: string;          // Translator identifier
  timestamp: number;            // When translation was updated
}
```

## Signal Usage Patterns

### 1. Signal Chaining

```typescript
// Chain related signals
signalBus.onGlobal('VERSE_SELECTED', async (signal) => {
  // Load verse data
  const verseData = await loadVerseData(signal.payload.verseId);
  
  // Emit follow-up signal
  await signalBus.emit({
    type: 'RESOURCE_LOADED',
    source: signal.source,
    payload: {
      resourceId: signal.payload.verseId,
      resourceType: 'verse',
      panelId: signal.source.panelId,
      loadTime: Date.now() - startTime,
      success: true
    }
  });
});
```

### 2. Signal Filtering

```typescript
// Filter signals by panel
signalBus.onPanel('translation-panel', 'RESOURCE_UPDATED', async (signal) => {
  // Only handle updates for translation panel
  await handleTranslationPanelUpdate(signal.payload);
});

// Filter signals by resource type
signalBus.onGlobal('RESOURCE_ADDED', async (signal) => {
  if (signal.payload.resourceType === 'verse') {
    await handleVerseAdded(signal.payload);
  }
});
```

### 3. Signal Batching

```typescript
// Batch multiple related signals
const batchedUpdates = [];

signalBus.onGlobal('RESOURCE_UPDATED', async (signal) => {
  batchedUpdates.push(signal.payload);
  
  // Process batch every 100ms
  if (batchedUpdates.length === 1) {
    setTimeout(async () => {
      await processBatchedUpdates(batchedUpdates);
      batchedUpdates.length = 0;
    }, 100);
  }
});
```

## Best Practices

### 1. Use Descriptive Signal Types

```typescript
// Good - descriptive and specific
'VERSE_TRANSLATION_SAVED'
'CHAPTER_NAVIGATION_COMPLETED'
'PANEL_COORDINATION_TRIGGERED'

// Avoid - too generic
'UPDATE'
'CHANGE'
'EVENT'
```

### 2. Include Sufficient Context

```typescript
// Good - includes context and metadata
{
  type: 'RESOURCE_UPDATED',
  source: { panelId: 'translation-panel', resourceId: 'genesis-1-1' },
  payload: {
    resourceId: 'genesis-1-1',
    resourceType: 'verse',
    changes: { translation: { oldValue: 'old', newValue: 'new' } },
    timestamp: Date.now(),
    userId: 'translator-123'
  }
}
```

### 3. Handle Signal Errors

```typescript
signalBus.onGlobal('NAVIGATE_TO_RESOURCE', async (signal) => {
  try {
    await navigateToResource(signal.payload.resourceId);
  } catch (error) {
    // Emit error signal
    await signalBus.emit({
      type: 'ERROR',
      source: signal.source,
      payload: {
        errorType: 'NAVIGATION_FAILED',
        errorMessage: `Failed to navigate to ${signal.payload.resourceId}`,
        recoverable: true,
        originalSignal: signal
      }
    });
  }
});
```

### 4. Use Signal Metadata

```typescript
await signalBus.emit({
  type: 'VERSE_SELECTED',
  source: { panelId: 'source-panel' },
  payload: { verseId: 'genesis-1-1' },
  metadata: {
    timestamp: Date.now(),
    priority: 'high',
    userInitiated: true,
    sessionId: 'session-123'
  }
});
``` 