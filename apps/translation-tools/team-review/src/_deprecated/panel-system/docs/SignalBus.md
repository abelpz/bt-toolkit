# SignalBus API

The SignalBus is the central event system that enables communication between all components in the panel system. It provides a type-safe, async-first approach to event handling with comprehensive history tracking and cleanup capabilities.

## Overview

```typescript
import { SignalBus } from '../core/SignalBus';

// Get singleton instance
const signalBus = SignalBus.getInstance();

// Or create a new instance
const signalBus = new SignalBus();
```

## Core Methods

### `emit(signal: Signal): Promise<void>`

Emits a signal to all registered listeners.

```typescript
await signalBus.emit({
  type: 'NAVIGATE_TO_RESOURCE',
  source: { 
    panelId: 'translation-panel', 
    resourceId: 'genesis-1-1' 
  },
  payload: { 
    resourceId: 'genesis-1-2',
    scrollTo: true 
  },
  metadata: {
    timestamp: Date.now(),
    priority: 'high'
  }
});
```

**Parameters:**
- `signal`: Complete signal object with type, source, payload, and metadata

**Returns:** Promise that resolves when all listeners have processed the signal

### `onGlobal(type: string, handler: SignalHandler): CleanupFunction`

Registers a global signal listener for a specific signal type.

```typescript
const cleanup = signalBus.onGlobal('NAVIGATE_TO_RESOURCE', async (signal) => {
  console.log('Navigation requested:', signal.payload.resourceId);
  // Handle navigation logic
});

// Clean up when done
cleanup();
```

**Parameters:**
- `type`: Signal type to listen for
- `handler`: Async function to handle the signal

**Returns:** Cleanup function to remove the listener

### `onPanel(panelId: string, type: string, handler: SignalHandler): CleanupFunction`

Registers a panel-specific signal listener.

```typescript
const cleanup = signalBus.onPanel('translation-panel', 'RESOURCE_UPDATED', async (signal) => {
  // Only receives signals targeted at 'translation-panel'
  await updatePanelContent(signal.payload);
});
```

**Parameters:**
- `panelId`: Panel ID to filter signals for
- `type`: Signal type to listen for
- `handler`: Async function to handle the signal

**Returns:** Cleanup function to remove the listener

### `onResource(resourceId: string, type: string, handler: SignalHandler): CleanupFunction`

Registers a resource-specific signal listener.

```typescript
const cleanup = signalBus.onResource('genesis-1-1', 'VERSE_SELECTED', async (signal) => {
  // Only receives signals related to 'genesis-1-1'
  await highlightVerse(signal.payload);
});
```

**Parameters:**
- `resourceId`: Resource ID to filter signals for
- `type`: Signal type to listen for
- `handler`: Async function to handle the signal

**Returns:** Cleanup function to remove the listener

## History and Querying

### `getHistory(filter?: SignalFilter): Signal[]`

Retrieves signal history with optional filtering.

```typescript
// Get all signals
const allSignals = signalBus.getHistory();

// Get signals by type
const navSignals = signalBus.getHistory({ type: 'NAVIGATE_TO_RESOURCE' });

// Get signals by panel
const panelSignals = signalBus.getHistory({ panelId: 'translation-panel' });

// Get recent signals
const recentSignals = signalBus.getHistory({ 
  since: Date.now() - 60000 // Last minute
});
```

**Parameters:**
- `filter` (optional): Filter criteria for signals

**Returns:** Array of matching signals

### `clearHistory(): void`

Clears the signal history.

```typescript
signalBus.clearHistory();
```

## Utility Methods

### `hasListeners(type: string): boolean`

Checks if there are any listeners for a signal type.

```typescript
if (signalBus.hasListeners('NAVIGATE_TO_RESOURCE')) {
  await signalBus.emit(navigationSignal);
}
```

### `getListenerCount(type?: string): number`

Gets the number of listeners, optionally for a specific type.

```typescript
const totalListeners = signalBus.getListenerCount();
const navListeners = signalBus.getListenerCount('NAVIGATE_TO_RESOURCE');
```

### `cleanup(): void`

Removes all listeners and clears history.

```typescript
signalBus.cleanup();
```

## Signal Structure

### Signal Interface

```typescript
interface Signal {
  type: string;                    // Signal type identifier
  source: SignalSource;           // Where the signal originated
  payload?: any;                  // Signal data
  metadata?: SignalMetadata;      // Additional metadata
}
```

### SignalSource Interface

```typescript
interface SignalSource {
  panelId: string;               // Source panel ID
  resourceId?: string;           // Source resource ID (optional)
}
```

### SignalMetadata Interface

```typescript
interface SignalMetadata {
  timestamp?: number;            // When signal was created
  priority?: 'low' | 'normal' | 'high';
  [key: string]: any;           // Additional metadata
}
```

## Signal Types

### Navigation Signals
- `NAVIGATE_TO_RESOURCE` - Navigate to a specific resource
- `NAVIGATE_BACK` - Navigate back in history
- `NAVIGATE_FORWARD` - Navigate forward in history

### Panel Signals
- `SHOW_PANEL` - Show a panel
- `HIDE_PANEL` - Hide a panel
- `FOCUS_PANEL` - Focus a panel
- `SWITCH_PANEL` - Switch active panel

### Resource Signals
- `RESOURCE_ADDED` - Resource was added to panel
- `RESOURCE_REMOVED` - Resource was removed from panel
- `RESOURCE_UPDATED` - Resource data was updated
- `RESOURCE_SELECTED` - Resource was selected

### Custom Signals
- `CUSTOM` - Generic custom signal type

## Best Practices

### 1. Signal Naming

Use descriptive, action-based names in UPPER_SNAKE_CASE:

```typescript
// Good
'NAVIGATE_TO_RESOURCE'
'VERSE_SELECTION_CHANGED'
'TRANSLATION_SAVED'

// Avoid
'nav'
'change'
'update'
```

### 2. Payload Structure

Keep payloads simple and focused:

```typescript
// Good
{
  resourceId: 'genesis-1-1',
  action: 'select',
  metadata: { source: 'user-click' }
}

// Avoid complex nested objects
{
  data: {
    resource: {
      details: {
        // deeply nested structure
      }
    }
  }
}
```

### 3. Error Handling

Always handle errors in signal handlers:

```typescript
signalBus.onGlobal('NAVIGATE_TO_RESOURCE', async (signal) => {
  try {
    await navigateToResource(signal.payload.resourceId);
  } catch (error) {
    console.error('Navigation failed:', error);
    // Handle error appropriately
  }
});
```

### 4. Cleanup

Always clean up listeners to prevent memory leaks:

```typescript
class MyComponent {
  private cleanupFunctions: Array<() => void> = [];

  constructor(private signalBus: SignalBus) {
    // Register listeners and store cleanup functions
    this.cleanupFunctions.push(
      signalBus.onGlobal('NAVIGATE_TO_RESOURCE', this.handleNavigation)
    );
  }

  destroy() {
    // Clean up all listeners
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];
  }
}
```

## Performance Considerations

### Signal Filtering

Use specific listeners instead of global ones when possible:

```typescript
// More efficient - only receives relevant signals
signalBus.onPanel('my-panel', 'RESOURCE_UPDATED', handler);

// Less efficient - receives all signals, filters manually
signalBus.onGlobal('RESOURCE_UPDATED', (signal) => {
  if (signal.source.panelId === 'my-panel') {
    handler(signal);
  }
});
```

### Batch Operations

For multiple related signals, consider batching:

```typescript
// Instead of multiple individual signals
await signalBus.emit({ type: 'RESOURCE_ADDED', ... });
await signalBus.emit({ type: 'RESOURCE_SELECTED', ... });

// Consider a single batch signal
await signalBus.emit({ 
  type: 'RESOURCES_BATCH_UPDATE',
  payload: {
    operations: [
      { type: 'add', resourceId: 'verse-1' },
      { type: 'select', resourceId: 'verse-1' }
    ]
  }
});
```

## Debugging

### Enable Logging

```typescript
// Log all signals (development only)
signalBus.onGlobal('*', (signal) => {
  console.log('Signal:', signal.type, signal);
});
```

### History Analysis

```typescript
// Analyze signal patterns
const history = signalBus.getHistory();
const signalCounts = history.reduce((counts, signal) => {
  counts[signal.type] = (counts[signal.type] || 0) + 1;
  return counts;
}, {});
console.log('Signal frequency:', signalCounts);
``` 