# State Persistence & Initial Resource Display Guide

This guide explains how to use the advanced state persistence and initial resource display features of the Linked Panels Library.

## Table of Contents

1. [State Persistence](#state-persistence)
2. [Storage Adapters](#storage-adapters)
3. [Initial Resource Display](#initial-resource-display)
4. [Complete Examples](#complete-examples)
5. [Best Practices](#best-practices)

## State Persistence

The library provides robust state persistence capabilities that automatically save and restore panel navigation states and messages using **pluggable storage adapters**. You can choose from built-in adapters or create your own custom storage backend.

### Basic Setup

```tsx
import { 
  LinkedPanelsContainer, 
  StatePersistenceOptions,
  LocalStorageAdapter
} from 'linked-panels';

const persistenceOptions: StatePersistenceOptions = {
  storageKey: 'my-app-panels-state',     // Storage key
  storageAdapter: new LocalStorageAdapter(), // Choose your storage
  persistMessages: true,                  // Save messages
  persistNavigation: true,                // Save panel positions
  autoSave: true,                        // Auto-save on changes
  autoSaveDebounce: 1000,                // Debounce auto-save (ms)
  stateTTL: 7 * 24 * 60 * 60 * 1000,    // 7 days expiration
};

<LinkedPanelsContainer 
  config={config} 
  persistence={persistenceOptions}
>
  {/* Your panels here */}
</LinkedPanelsContainer>
```

### Persistence Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `storageKey` | string | `'linked-panels-state'` | Storage key for state storage |
| `storageAdapter` | PersistenceStorageAdapter | `createDefaultStorageAdapter()` | Storage backend to use |
| `persistMessages` | boolean | `true` | Whether to save/restore messages |
| `persistNavigation` | boolean | `true` | Whether to save/restore panel positions |
| `autoSave` | boolean | `true` | Auto-save state on changes |
| `autoSaveDebounce` | number | `1000` | Debounce time for auto-save (ms) |
| `stateTTL` | number | `7 days` | Time-to-live for stored state (ms) |
| `messageFilter` | function | Built-in filter | Custom filter for which messages to persist |

## Storage Adapters

The library includes several built-in storage adapters and supports custom implementations.

### Built-in Storage Adapters

#### LocalStorageAdapter (Default)
```tsx
import { LocalStorageAdapter } from 'linked-panels';

const adapter = new LocalStorageAdapter();
// Data persists across browser sessions
// Limited to ~5-10MB depending on browser
```

#### SessionStorageAdapter
```tsx
import { SessionStorageAdapter } from 'linked-panels';

const adapter = new SessionStorageAdapter();
// Data only persists for current tab/session
// Cleared when tab is closed
```

#### MemoryStorageAdapter
```tsx
import { MemoryStorageAdapter } from 'linked-panels';

const adapter = new MemoryStorageAdapter();
// Data is lost on page refresh
// Useful for testing or when persistence is not needed
```

#### IndexedDBAdapter
```tsx
import { IndexedDBAdapter } from 'linked-panels';

const adapter = new IndexedDBAdapter({
  dbName: 'MyAppDB',
  storeName: 'panelStates',
  version: 1
});
// More robust browser storage
// Can handle larger amounts of data
// Asynchronous operations
```

#### HTTPStorageAdapter
```tsx
import { HTTPStorageAdapter } from 'linked-panels';

const adapter = new HTTPStorageAdapter({
  baseUrl: 'https://api.example.com',
  headers: {
    'Authorization': 'Bearer your-token-here'
  },
  timeout: 10000
});
// Server-side storage via HTTP API
// Requires backend endpoints: GET/PUT/DELETE /state/:key
```

#### AsyncStorageAdapter (React Native)
```tsx
import { AsyncStorageAdapter } from 'linked-panels';
import AsyncStorage from '@react-native-async-storage/async-storage';

const adapter = new AsyncStorageAdapter(AsyncStorage);
// Perfect for React Native applications
// Uses platform-specific storage
```

### Custom Storage Adapter

Create your own storage adapter by implementing the `PersistenceStorageAdapter` interface:

```tsx
import { PersistenceStorageAdapter } from 'linked-panels';

class MyCustomAdapter implements PersistenceStorageAdapter {
  async isAvailable(): Promise<boolean> {
    // Check if your storage backend is available
    return true;
  }

  async getItem(key: string): Promise<string | null> {
    // Retrieve data from your storage
    return await myStorage.get(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    // Save data to your storage
    await myStorage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    // Remove data from your storage
    await myStorage.delete(key);
  }
}

// Use your custom adapter
const persistenceOptions = {
  storageAdapter: new MyCustomAdapter(),
  // ... other options
};
```

### Fallback Storage Strategy

You can create a fallback adapter that tries multiple storage backends:

```tsx
class FallbackStorageAdapter implements PersistenceStorageAdapter {
  private adapters: PersistenceStorageAdapter[];
  private activeAdapter: PersistenceStorageAdapter | null = null;

  constructor(adapters: PersistenceStorageAdapter[]) {
    this.adapters = adapters;
  }

  async isAvailable(): Promise<boolean> {
    for (const adapter of this.adapters) {
      if (await adapter.isAvailable()) {
        this.activeAdapter = adapter;
        return true;
      }
    }
    return false;
  }

  // ... implement other methods to delegate to activeAdapter
}

// Use fallback strategy
const adapter = new FallbackStorageAdapter([
  new IndexedDBAdapter(),
  new LocalStorageAdapter(),
  new SessionStorageAdapter(),
  new MemoryStorageAdapter()
]);
```

### Custom Message Filtering

Control which messages get persisted with a custom filter:

```tsx
const persistenceOptions: StatePersistenceOptions = {
  messageFilter: (message) => {
    const lifecycle = message.content?.lifecycle || 'event';
    
    // Always persist state messages
    if (lifecycle === 'state') return true;
    
    // Only persist recent important events
    const ageInMs = Date.now() - message.timestamp;
    const oneHour = 60 * 60 * 1000;
    
    return lifecycle === 'event' && 
           ageInMs < oneHour && 
           message.content.important === true;
  }
};
```

### Manual State Control

Use the store's persistence methods directly:

```tsx
function MyComponent() {
  const api = useResourceAPI('my-resource');
  
  const saveState = () => {
    // Get current store and save state manually
    const store = getLinkedPanelsStore();
    const success = store.getState().saveState();
    console.log('Save successful:', success);
  };
  
  const loadState = () => {
    const store = getLinkedPanelsStore();
    const state = store.getState().loadState();
    console.log('Loaded state:', state);
  };
  
  const clearState = () => {
    const store = getLinkedPanelsStore();
    store.getState().clearPersistedState();
  };
  
  const getStorageInfo = () => {
    const store = getLinkedPanelsStore();
    const info = store.getState().getStorageInfo();
    console.log('Storage info:', info);
  };
}
```

### Utility Functions

Use standalone utility functions for simple cases:

```tsx
import { 
  saveLinkedPanelsState, 
  loadLinkedPanelsState, 
  clearLinkedPanelsState 
} from 'linked-panels';

// Save state manually
const success = saveLinkedPanelsState(
  panelNavigation, 
  resourceMessages, 
  { storageKey: 'my-key' }
);

// Load state manually
const state = loadLinkedPanelsState({ storageKey: 'my-key' });

// Clear state manually
clearLinkedPanelsState({ storageKey: 'my-key' });
```

## Initial Resource Display

Configure which resources are displayed initially in each panel without changing the resource order.

### Method 1: Initial Resource ID

Specify which resource to show initially by ID:

```tsx
const config: LinkedPanelsConfig = {
  resources: [
    { id: 'chapter-1', component: <Chapter1 />, title: 'Chapter 1' },
    { id: 'chapter-2', component: <Chapter2 />, title: 'Chapter 2' },
    { id: 'chapter-3', component: <Chapter3 />, title: 'Chapter 3' },
  ],
  panels: {
    'main-panel': {
      resourceIds: ['chapter-1', 'chapter-2', 'chapter-3'],
      initialResourceId: 'chapter-2' // Shows Chapter 2 initially
    }
  }
};
```

### Method 2: Initial Index

Specify which resource to show initially by index (0-based):

```tsx
const config: LinkedPanelsConfig = {
  resources: [
    { id: 'page-1', component: <Page1 />, title: 'Page 1' },
    { id: 'page-2', component: <Page2 />, title: 'Page 2' },
    { id: 'page-3', component: <Page3 />, title: 'Page 3' },
  ],
  panels: {
    'reader-panel': {
      resourceIds: ['page-1', 'page-2', 'page-3'],
      initialIndex: 2 // Shows Page 3 initially (index 2)
    }
  }
};
```

### Method 3: Global Initial State

Override panel-specific settings with global initial state:

```tsx
const config: LinkedPanelsConfig = {
  resources: [...],
  panels: {
    'panel-1': { 
      resourceIds: ['res-1', 'res-2', 'res-3'],
      initialResourceId: 'res-2' // This will be overridden
    },
    'panel-2': { 
      resourceIds: ['res-4', 'res-5', 'res-6'],
      initialIndex: 1 // This will be used
    }
  },
  // Global initial state takes precedence
  initialState: {
    panelNavigation: {
      'panel-1': { currentIndex: 0 }, // Override to show first resource
      // panel-2 will use its initialIndex: 1
    },
    resourceMessages: {
      // Restore previous messages if needed
      'res-1': [/* previous messages */]
    }
  }
};
```

### Priority Order

The library follows this priority order for initial resource display:

1. **Global `initialState.panelNavigation`** (highest priority)
2. **Persisted state from localStorage** (if persistence enabled)
3. **Panel-specific `initialIndex`**
4. **Panel-specific `initialResourceId`**
5. **Default to index 0** (lowest priority)

## Complete Examples

### Bible Translation Use Case

```tsx
function BibleTranslationApp() {
  // Persistence configuration for translation work
  const persistenceOptions: StatePersistenceOptions = {
    storageKey: 'bible-translation-state',
    persistMessages: true,
    persistNavigation: true,
    autoSave: true,
    stateTTL: 30 * 24 * 60 * 60 * 1000, // 30 days for translation work
    
    // Only persist important translation messages
    messageFilter: (message) => {
      const lifecycle = message.content?.lifecycle || 'event';
      return lifecycle === 'state' || 
             (message.content as any).category === 'translation';
    }
  };

  const config: LinkedPanelsConfig = {
    resources: [
      { id: 'john-3-16', component: <ScriptureView verse="John 3:16" />, title: 'John 3:16' },
      { id: 'john-3-17', component: <ScriptureView verse="John 3:17" />, title: 'John 3:17' },
      { id: 'john-3-18', component: <ScriptureView verse="John 3:18" />, title: 'John 3:18' },
      { id: 'notes-3-16', component: <NotesView verse="John 3:16" />, title: 'Notes 3:16' },
      { id: 'notes-3-17', component: <NotesView verse="John 3:17" />, title: 'Notes 3:17' },
      { id: 'notes-3-18', component: <NotesView verse="John 3:18" />, title: 'Notes 3:18' },
    ],
    panels: {
      'scripture-panel': {
        resourceIds: ['john-3-16', 'john-3-17', 'john-3-18'],
        initialResourceId: 'john-3-16' // Start with first verse
      },
      'notes-panel': {
        resourceIds: ['notes-3-16', 'notes-3-17', 'notes-3-18'],
        initialResourceId: 'notes-3-16' // Start with corresponding notes
      }
    }
  };

  return (
    <LinkedPanelsContainer 
      config={config} 
      persistence={persistenceOptions}
    >
      <div className="translation-workspace">
        <LinkedPanel id="scripture-panel">
          {({ current, navigate }) => (
            <ScripturePanel 
              current={current} 
              navigate={navigate} 
            />
          )}
        </LinkedPanel>
        
        <LinkedPanel id="notes-panel">
          {({ current, navigate }) => (
            <NotesPanel 
              current={current} 
              navigate={navigate} 
            />
          )}
        </LinkedPanel>
      </div>
    </LinkedPanelsContainer>
  );
}
```

### Document Review Use Case

```tsx
function DocumentReviewApp() {
  const [userSession, setUserSession] = useState(null);
  
  // Load user's previous session on mount
  useEffect(() => {
    const savedSession = loadLinkedPanelsState({ 
      storageKey: `doc-review-${userId}` 
    });
    setUserSession(savedSession);
  }, [userId]);

  const config: LinkedPanelsConfig = {
    resources: generateDocumentResources(), // Your document list
    panels: {
      'document-panel': {
        resourceIds: documentIds,
        // Resume from last viewed document or start with first
        initialResourceId: userSession?.lastViewedDocument || documentIds[0]
      },
      'comments-panel': {
        resourceIds: commentIds,
        initialIndex: 0
      }
    },
    // Restore previous state if available
    initialState: userSession ? {
      panelNavigation: userSession.panelNavigation,
      resourceMessages: userSession.resourceMessages
    } : undefined
  };

  const persistenceOptions: StatePersistenceOptions = {
    storageKey: `doc-review-${userId}`,
    autoSave: true,
    autoSaveDebounce: 2000, // Longer debounce for document review
  };

  return (
    <LinkedPanelsContainer 
      config={config} 
      persistence={persistenceOptions}
    >
      {/* Your review interface */}
    </LinkedPanelsContainer>
  );
}
```

## Best Practices

### 1. Choose Appropriate Storage Keys

Use unique, descriptive storage keys to avoid conflicts:

```tsx
// Good
storageKey: 'bible-translation-john-chapter-3'
storageKey: `user-${userId}-document-review`
storageKey: 'team-review-session-2024'

// Avoid
storageKey: 'state'
storageKey: 'data'
```

### 2. Set Reasonable TTL

Choose TTL based on your use case:

```tsx
// Short-term sessions (1 day)
stateTTL: 24 * 60 * 60 * 1000

// Work sessions (1 week)
stateTTL: 7 * 24 * 60 * 60 * 1000

// Long-term projects (30 days)
stateTTL: 30 * 24 * 60 * 60 * 1000
```

### 3. Filter Messages Intelligently

Only persist messages that matter:

```tsx
messageFilter: (message) => {
  const { lifecycle, category, important } = message.content;
  
  // Always persist state
  if (lifecycle === 'state') return true;
  
  // Persist important events only
  if (lifecycle === 'event' && important) return true;
  
  // Persist work-related messages
  if (category === 'translation' || category === 'review') return true;
  
  return false;
}
```

### 4. Handle Storage Errors Gracefully

The library handles storage errors gracefully, but you can add additional error handling:

```tsx
function MyComponent() {
  const api = useResourceAPI('my-resource');
  
  const handleSave = async () => {
    try {
      const store = getLinkedPanelsStore();
      const success = store.getState().saveState();
      
      if (!success) {
        // Handle save failure (show user message, etc.)
        console.warn('Failed to save state');
      }
    } catch (error) {
      console.error('Storage error:', error);
    }
  };
}
```

### 5. Test State Restoration

Always test that your state restoration works correctly:

```tsx
// In your tests or dev environment
const testStateRestoration = () => {
  // Save current state
  const store = getLinkedPanelsStore();
  store.getState().saveState();
  
  // Simulate page reload
  window.location.reload();
  
  // Verify state was restored correctly
  // (This would be in your component's useEffect)
};
```

### 6. Consider User Privacy

Be mindful of what data you persist:

```tsx
const persistenceOptions: StatePersistenceOptions = {
  messageFilter: (message) => {
    // Don't persist sensitive user data
    if (message.content.sensitive) return false;
    
    // Only persist UI state, not personal content
    return message.content.category === 'ui-state';
  }
};
```

This comprehensive system gives you full control over state persistence and initial resource display while maintaining the flexibility and power of the Linked Panels Library. 