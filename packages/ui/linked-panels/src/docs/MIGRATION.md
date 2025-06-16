# Migration Guide

Guide for migrating between versions of the Linked Panels library and upgrading from other panel management solutions.

## Version Migration

### Migrating to v1.0.0 (Current)

This is the initial stable release. If you're migrating from pre-release versions or beta builds, follow the guidelines below.

#### Breaking Changes from Beta

**Package Name Change**
```bash
# Old (beta)
npm uninstall @beta/linked-panels

# New (stable)
npm install linked-panels
```

**Import Path Updates**
```tsx
// Old imports
import { ... } from '@beta/linked-panels';

// New imports  
import { ... } from 'linked-panels';
```

**Storage Adapter Interface Changes**

The `PersistenceStorageAdapter` interface now supports both sync and async operations:

```tsx
// Old interface (sync only)
interface OldStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// New interface (sync and async)
interface PersistenceStorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
  isAvailable(): boolean | Promise<boolean>;
}
```

**Message Lifecycle System**

Messages now use a structured lifecycle system:

```tsx
// Old message format
const oldMessage = {
  type: 'user-action',
  data: { action: 'click' }
};

// New message format (with lifecycle)
const newMessage = {
  type: 'user-action',
  lifecycle: 'event', // 'event', 'state', or 'command'
  data: { action: 'click' }
};
```

## Migration from Other Libraries

### From React Router

If you're migrating from React Router for panel navigation:

```tsx
// React Router approach
function OldApp() {
  return (
    <Router>
      <Routes>
        <Route path="/document/:id" element={<DocumentView />} />
        <Route path="/comments" element={<CommentsView />} />
      </Routes>
    </Router>
  );
}

// Linked Panels approach
function NewApp() {
  const config = {
    resources: [
      { id: 'doc1', component: <DocumentView id="1" />, title: 'Document 1' },
      { id: 'doc2', component: <DocumentView id="2" />, title: 'Document 2' },
      { id: 'comments', component: <CommentsView />, title: 'Comments' },
    ],
    panels: {
      'main': { resourceIds: ['doc1', 'doc2'] },
      'sidebar': { resourceIds: ['comments'] }
    }
  };

  return (
    <LinkedPanelsContainer config={config}>
      <LinkedPanel id="main">
        {({ current, navigate }) => (
          <div>
            {current.resource?.component}
            <button onClick={navigate.next}>Next</button>
          </div>
        )}
      </LinkedPanel>
      <LinkedPanel id="sidebar">
        {({ current }) => current.resource?.component}
      </LinkedPanel>
    </LinkedPanelsContainer>
  );
}
```

### From Redux + React

Migrating state management from Redux:

```tsx
// Redux approach
const documentSlice = createSlice({
  name: 'documents',
  initialState: { currentId: null, documents: [] },
  reducers: {
    setCurrentDocument: (state, action) => {
      state.currentId = action.payload;
    },
    addComment: (state, action) => {
      // Complex state updates
    }
  }
});

// Linked Panels approach (messaging)
function DocumentComponent({ id }) {
  const api = useResourceAPI(id);
  
  const addComment = (comment) => {
    // Send message to comments panel
    api.messaging.send('comments', {
      type: 'comment-added',
      lifecycle: 'event',
      data: { comment, documentId: id }
    });
  };

  return <div>{/* Document content */}</div>;
}
```

### From Custom Panel Libraries

If you have an existing custom panel system:

```tsx
// Custom panel system
class OldPanelManager {
  constructor() {
    this.panels = new Map();
    this.subscribers = new Set();
  }
  
  addPanel(id, component) {
    this.panels.set(id, component);
    this.notifySubscribers();
  }
  
  switchPanel(id, newContent) {
    this.panels.set(id, newContent);
    this.notifySubscribers();
  }
}

// Linked Panels equivalent
const config = {
  resources: [
    { id: 'content1', component: <Content1 />, title: 'Content 1' },
    { id: 'content2', component: <Content2 />, title: 'Content 2' },
  ],
  panels: {
    'dynamic-panel': { resourceIds: ['content1', 'content2'] }
  }
};

// Built-in state management, no custom classes needed
```

## Configuration Migration

### Old Configuration Format

If you were using a different configuration format:

```tsx
// Old flat configuration
const oldConfig = {
  panels: [
    { id: 'panel1', content: <Component1 />, active: true },
    { id: 'panel2', content: <Component2 />, active: false }
  ]
};

// New resource-based configuration
const newConfig = {
  resources: [
    { id: 'comp1', component: <Component1 />, title: 'Component 1' },
    { id: 'comp2', component: <Component2 />, title: 'Component 2' }
  ],
  panels: {
    'panel1': { resourceIds: ['comp1', 'comp2'], initialResourceId: 'comp1' }
  }
};
```

### Storage Migration

Migrating from localStorage to structured persistence:

```tsx
// Old localStorage usage
function OldPersistence() {
  const saveState = () => {
    localStorage.setItem('panelState', JSON.stringify(state));
  };
  
  const loadState = () => {
    const saved = localStorage.getItem('panelState');
    return saved ? JSON.parse(saved) : null;
  };
}

// New structured persistence
const persistenceOptions = {
  storageAdapter: new LocalStorageAdapter(),
  storageKey: 'linked-panels-state',
  autoSave: true,
  messageFilter: (message) => message.content.lifecycle === 'state'
};
```

## API Migration

### Hook Migration

Converting custom hooks to Linked Panels hooks:

```tsx
// Old custom hook
function useOldPanels() {
  const [activePanel, setActivePanel] = useState(null);
  const [panels, setPanels] = useState([]);
  
  const switchTo = (panelId) => {
    setActivePanel(panelId);
    // Manual state management
  };
  
  return { activePanel, panels, switchTo };
}

// New useResourceAPI hook
function useNewPanels(resourceId) {
  const api = useResourceAPI(resourceId);
  
  // Built-in navigation, messaging, and system queries
  return {
    navigate: api.navigation,
    messaging: api.messaging,
    system: api.system
  };
}
```

### Event System Migration

Converting from custom events to messaging:

```tsx
// Old event system
function OldComponent() {
  useEffect(() => {
    const handleCustomEvent = (event) => {
      console.log('Received:', event.detail);
    };
    
    window.addEventListener('customPanelEvent', handleCustomEvent);
    return () => window.removeEventListener('customPanelEvent', handleCustomEvent);
  }, []);
  
  const sendEvent = () => {
    window.dispatchEvent(new CustomEvent('customPanelEvent', {
      detail: { data: 'value' }
    }));
  };
}

// New messaging system
function NewComponent({ id }) {
  const api = useResourceAPI(id);
  const messages = api.messaging.getMessages();
  
  // Process messages
  useEffect(() => {
    const relevantMessages = messages.filter(msg => msg.content.type === 'data-update');
    relevantMessages.forEach(msg => {
      console.log('Received:', msg.content.data);
    });
  }, [messages]);
  
  const sendMessage = () => {
    api.messaging.send('target-resource', {
      type: 'data-update',
      lifecycle: 'event',
      data: { value: 'data' }
    });
  };
}
```

## Data Migration

### Persistence Data Format

If you have existing persisted data, you may need to migrate it:

```tsx
// Migration utility
function migrateOldData() {
  const oldData = localStorage.getItem('old-panel-data');
  if (!oldData) return;
  
  const parsed = JSON.parse(oldData);
  
  // Convert to new format
  const newFormat = {
    panelNavigation: {
      'main-panel': { currentIndex: parsed.activeIndex || 0 }
    },
    resourceMessages: {},
    savedAt: Date.now(),
    version: '1.0.0'
  };
  
  // Save in new format
  const adapter = new LocalStorageAdapter();
  adapter.setItem('linked-panels-state', JSON.stringify(newFormat));
  
  // Clean up old data
  localStorage.removeItem('old-panel-data');
}

// Run migration on app startup
useEffect(() => {
  migrateOldData();
}, []);
```

### Message Format Migration

Converting old message formats:

```tsx
function migrateMessages(oldMessages) {
  return oldMessages.map(oldMsg => ({
    id: generateId(),
    timestamp: oldMsg.timestamp || Date.now(),
    fromResourceId: oldMsg.sender || 'unknown',
    toResourceId: oldMsg.target,
    content: {
      type: oldMsg.type,
      lifecycle: oldMsg.persistent ? 'state' : 'event',
      data: oldMsg.payload || oldMsg.data
    }
  }));
}
```

## Testing Migration

### From Jest to Vitest

The library now uses Vitest instead of Jest:

```tsx
// Old Jest tests
import { jest } from '@jest/globals';

describe('Panel Tests', () => {
  it('should work', () => {
    const mockFn = jest.fn();
    jest.spyOn(console, 'log');
    jest.useFakeTimers();
  });
});

// New Vitest tests
import { vi } from 'vitest';

describe('Panel Tests', () => {
  it('should work', () => {
    const mockFn = vi.fn();
    vi.spyOn(console, 'log');
    vi.useFakeTimers();
  });
});
```

### Test Environment Updates

```tsx
// Old test setup
import '@testing-library/jest-dom/extend-expect';

// New test setup
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Update mocks to use vi instead of jest
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
```

## Performance Migration

### Bundle Size Optimization

The new version supports better tree shaking:

```tsx
// Old imports (imports everything)
import * as LinkedPanels from 'linked-panels';

// New optimized imports
import { LinkedPanelsContainer, LinkedPanel } from 'linked-panels';
import { LocalStorageAdapter } from 'linked-panels/adapters/localStorage';
```

### Lazy Loading Migration

Convert to new lazy loading patterns:

```tsx
// Old dynamic imports
const OldComponent = React.lazy(() => import('./OldComponent'));

// New with proper suspense boundaries
const NewComponent = lazy(() => import('./NewComponent'));

function App() {
  const config = {
    resources: [
      {
        id: 'lazy-comp',
        component: (
          <Suspense fallback={<Loading />}>
            <NewComponent />
          </Suspense>
        ),
        title: 'Lazy Component'
      }
    ],
    panels: {
      'main': { resourceIds: ['lazy-comp'] }
    }
  };
  
  return <LinkedPanelsContainer config={config}>{/* ... */}</LinkedPanelsContainer>;
}
```

## Troubleshooting

### Common Migration Issues

**Issue: Components not rendering**
```tsx
// Problem: Missing LinkedPanelsContainer
function BrokenApp() {
  return <LinkedPanel id="panel">{/* ... */}</LinkedPanel>; // Error!
}

// Solution: Wrap with container
function FixedApp() {
  return (
    <LinkedPanelsContainer config={config}>
      <LinkedPanel id="panel">{/* ... */}</LinkedPanel>
    </LinkedPanelsContainer>
  );
}
```

**Issue: Messages not being received**
```tsx
// Problem: Incorrect lifecycle
api.messaging.send('target', {
  type: 'important-data',
  // Missing lifecycle - defaults to 'event' and gets consumed
  data: { value: 'important' }
});

// Solution: Use 'state' lifecycle for persistent data
api.messaging.send('target', {
  type: 'important-data',
  lifecycle: 'state',
  stateKey: 'important-data',
  data: { value: 'important' }
});
```

**Issue: Storage adapter not working**
```tsx
// Problem: Adapter not available
const adapter = new IndexedDBAdapter();
// Not checking availability

// Solution: Check availability first
const adapter = new IndexedDBAdapter();
const isAvailable = await adapter.isAvailable();
if (!isAvailable) {
  // Fallback to localStorage
  adapter = new LocalStorageAdapter();
}
```

### Getting Help

If you encounter issues during migration:

1. **Check the API Reference** - Ensure you're using the correct API
2. **Review Examples** - Look at the use case documentation
3. **Test in Isolation** - Create minimal reproduction cases
4. **Check Storage** - Verify storage adapters are working
5. **Monitor Console** - Look for helpful error messages

### Migration Checklist

- [ ] Update package name and imports
- [ ] Convert to new configuration format
- [ ] Update message format to include lifecycle
- [ ] Migrate storage adapter interface
- [ ] Update test files to use Vitest
- [ ] Check persistence configuration
- [ ] Verify lazy loading setup
- [ ] Test all panel interactions
- [ ] Validate messaging between resources
- [ ] Confirm storage persistence works

By following this migration guide, you should be able to successfully upgrade to Linked Panels v1.0.0 and take advantage of its improved features and performance. 