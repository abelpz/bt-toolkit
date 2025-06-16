# Performance Optimization

Best practices and techniques for optimizing Linked Panels applications for large-scale deployments and complex panel systems.

## Overview

The Linked Panels library is designed for performance, but complex applications with many panels, resources, and messages require careful optimization. This guide covers strategies for:

- **Selective re-rendering** to minimize unnecessary updates
- **Efficient state subscriptions** using Zustand selectors
- **Memory management** for large datasets and message histories
- **Bundle optimization** for faster loading
- **Lazy loading** for better initial performance

## State Management Performance

### Use Selective Selectors

Always use specific selectors to prevent unnecessary re-renders:

```tsx
// ❌ Bad: Re-renders on any state change
function MyPanel({ panelId }) {
  const state = useLinkedPanelsStore(); // Gets entire state
  const currentIndex = state.panelNavigation[panelId]?.currentIndex ?? 0;
  
  return <div>{/* Panel content */}</div>;
}

// ✅ Good: Only re-renders when specific data changes
function MyPanel({ panelId }) {
  const currentIndex = useLinkedPanelsStore(
    state => state.panelNavigation[panelId]?.currentIndex ?? 0
  );
  
  return <div>{/* Panel content */}</div>;
}
```

### Memoize Expensive Computations

Use `useMemo` for derived state and expensive operations:

```tsx
function ResourcePanel({ panelId }) {
  const resources = useLinkedPanelsStore(state => state.resources);
  const panelConfig = useLinkedPanelsStore(state => state.panelConfig[panelId]);
  
  // ❌ Bad: Recalculates on every render
  const panelResources = panelConfig?.resourceIds
    .map(id => resources.get(id))
    .filter(Boolean) || [];
  
  // ✅ Good: Only recalculates when dependencies change
  const panelResources = useMemo(() => {
    if (!panelConfig) return [];
    return panelConfig.resourceIds
      .map(id => resources.get(id))
      .filter(Boolean);
  }, [resources, panelConfig]);
  
  return <div>{/* Panel content */}</div>;
}
```

### Stable Function References

Prevent unnecessary re-renders by using stable function references:

```tsx
function ResourceComponent({ id }) {
  const api = useResourceAPI(id);
  
  // ❌ Bad: Creates new function on every render
  const handleClick = () => {
    api.messaging.send('target', { type: 'click', data: {} });
  };
  
  // ✅ Good: Stable function reference
  const handleClick = useCallback(() => {
    api.messaging.send('target', { type: 'click', data: {} });
  }, [api]);
  
  return <button onClick={handleClick}>Click Me</button>;
}
```

## Messaging Performance

### Message Filtering and Cleanup

Implement efficient message filtering to prevent memory leaks:

```tsx
function MessageProcessor({ id }) {
  const api = useResourceAPI(id);
  const messages = api.messaging.getMessages();
  
  // ✅ Good: Filter messages efficiently
  const recentMessages = useMemo(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return messages.filter(msg => msg.timestamp > oneHourAgo);
  }, [messages]);
  
  // Clean up old messages periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      api.messaging.clearMessages();
    }, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(cleanup);
  }, [api]);
  
  return <div>{/* Component content */}</div>;
}
```

### Batch Message Processing

Process multiple messages efficiently:

```tsx
function BatchMessageProcessor({ id }) {
  const api = useResourceAPI(id);
  const messages = api.messaging.getMessages();
  
  const processedData = useMemo(() => {
    // Batch process messages by type
    const messagesByType = messages.reduce((acc, msg) => {
      const type = msg.content.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(msg);
      return acc;
    }, {});
    
    // Process each type efficiently
    return Object.entries(messagesByType).reduce((result, [type, msgs]) => {
      result[type] = processMessageType(type, msgs);
      return result;
    }, {});
  }, [messages]);
  
  return <div>{/* Use processed data */}</div>;
}
```

### Debounce High-Frequency Messages

Debounce rapid message sending to prevent performance issues:

```tsx
function HighFrequencyComponent({ id }) {
  const api = useResourceAPI(id);
  
  // Debounce cursor position updates
  const debouncedSendCursor = useMemo(() => 
    debounce((position) => {
      api.messaging.sendToAll({
        type: 'cursor-position',
        lifecycle: 'state',
        stateKey: 'cursor',
        data: { position, userId: currentUser.id }
      });
    }, 100), // 100ms debounce
    [api]
  );
  
  const handleMouseMove = (e) => {
    const position = { x: e.clientX, y: e.clientY };
    debouncedSendCursor(position);
  };
  
  return <div onMouseMove={handleMouseMove}>{/* Content */}</div>;
}
```

## Component Optimization

### Lazy Loading Resources

Implement lazy loading for large resource sets:

```tsx
// Lazy load heavy components
const HeavyDocumentViewer = lazy(() => import('./HeavyDocumentViewer'));
const ComplexChart = lazy(() => import('./ComplexChart'));

function OptimizedApp() {
  const config = {
    resources: [
      {
        id: 'document-1',
        component: (
          <Suspense fallback={<DocumentSkeleton />}>
            <HeavyDocumentViewer id="1" />
          </Suspense>
        ),
        title: 'Document 1'
      },
      {
        id: 'chart-1',
        component: (
          <Suspense fallback={<ChartSkeleton />}>
            <ComplexChart id="1" />
          </Suspense>
        ),
        title: 'Analytics Chart'
      }
    ],
    panels: {
      'main': { resourceIds: ['document-1', 'chart-1'] }
    }
  };
  
  return <LinkedPanelsContainer config={config}>{/* Panels */}</LinkedPanelsContainer>;
}
```

### Virtual Scrolling for Large Lists

Implement virtual scrolling for large datasets:

```tsx
import { FixedSizeList as List } from 'react-window';

function VirtualizedResourceList({ items, onItemSelect }) {
  const Row = ({ index, style }) => (
    <div style={style} onClick={() => onItemSelect(items[index])}>
      <ResourceListItem item={items[index]} />
    </div>
  );
  
  return (
    <List
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

### Optimize Panel Transitions

Use CSS transforms for smooth panel transitions:

```css
.panel-container {
  transition: transform 0.2s ease-in-out;
  will-change: transform;
}

.panel-entering {
  transform: translateX(100%);
}

.panel-entered {
  transform: translateX(0);
}

.panel-exiting {
  transform: translateX(-100%);
}
```

## Memory Management

### Message History Limits

Implement automatic message cleanup:

```tsx
const persistenceOptions = {
  storageAdapter: new LocalStorageAdapter(),
  messageFilter: (message) => {
    // Only persist recent and important messages
    const ageInMs = Date.now() - message.timestamp;
    const oneHour = 60 * 60 * 1000;
    
    return (
      message.content.lifecycle === 'state' || // Always keep state
      (ageInMs < oneHour && message.content.important) // Recent important events
    );
  }
};
```

### Resource Cleanup

Clean up resources when they're no longer needed:

```tsx
function ResourceManager() {
  const [activeResources, setActiveResources] = useState(new Set());
  
  useEffect(() => {
    // Clean up inactive resources periodically
    const cleanup = setInterval(() => {
      setActiveResources(prev => {
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        
        return new Set([...prev].filter(resourceId => {
          const lastAccess = getLastAccessTime(resourceId);
          return lastAccess > fiveMinutesAgo;
        }));
      });
    }, 60000); // Every minute
    
    return () => clearInterval(cleanup);
  }, []);
  
  return null;
}
```

## Bundle Optimization

### Tree Shaking

Import only what you need:

```tsx
// ❌ Bad: Imports entire library
import * as LinkedPanels from 'linked-panels';

// ✅ Good: Import only what you need
import { 
  LinkedPanelsContainer, 
  LinkedPanel, 
  useResourceAPI 
} from 'linked-panels';

// ✅ Good: Import adapters separately
import { LocalStorageAdapter } from 'linked-panels/adapters/localStorage';
```

### Dynamic Imports for Storage Adapters

Load storage adapters only when needed:

```tsx
async function createStorageAdapter(type) {
  switch (type) {
    case 'indexeddb':
      const { IndexedDBAdapter } = await import('linked-panels/adapters/indexeddb');
      return new IndexedDBAdapter();
    
    case 'http':
      const { HTTPStorageAdapter } = await import('linked-panels/adapters/http');
      return new HTTPStorageAdapter({ baseUrl: API_URL });
    
    default:
      const { LocalStorageAdapter } = await import('linked-panels/adapters/localStorage');
      return new LocalStorageAdapter();
  }
}
```

### Code Splitting by Feature

Split your application by feature areas:

```tsx
// Split panels by functionality
const DocumentPanels = lazy(() => import('./panels/DocumentPanels'));
const AnalyticsPanels = lazy(() => import('./panels/AnalyticsPanels'));
const CollaborationPanels = lazy(() => import('./panels/CollaborationPanels'));

function App({ featureFlags }) {
  return (
    <LinkedPanelsContainer config={config}>
      <Suspense fallback={<LoadingSpinner />}>
        {featureFlags.documents && <DocumentPanels />}
        {featureFlags.analytics && <AnalyticsPanels />}
        {featureFlags.collaboration && <CollaborationPanels />}
      </Suspense>
    </LinkedPanelsContainer>
  );
}
```

## Monitoring and Debugging

### Performance Monitoring

Monitor performance metrics:

```tsx
function PerformanceMonitor() {
  const store = useLinkedPanelsStore();
  
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (duration > 100) {
        console.warn(`Slow component render: ${duration}ms`);
      }
    };
  });
  
  // Monitor message queue size
  useEffect(() => {
    const checkMessageQueue = () => {
      const messages = store.resourceMessages;
      const totalMessages = Object.values(messages).flat().length;
      
      if (totalMessages > 1000) {
        console.warn(`Large message queue: ${totalMessages} messages`);
      }
    };
    
    const interval = setInterval(checkMessageQueue, 30000);
    return () => clearInterval(interval);
  }, [store]);
  
  return null;
}
```

### React DevTools Profiler

Use React DevTools Profiler to identify performance bottlenecks:

```tsx
import { Profiler } from 'react';

function ProfiledPanel({ id, children }) {
  const onRender = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    if (actualDuration > 16) { // > 1 frame at 60fps
      console.log('Slow render:', {
        id,
        phase,
        actualDuration,
        baseDuration
      });
    }
  };
  
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}
```

## Best Practices Summary

### State Management
1. **Use specific selectors** - Never select entire state
2. **Memoize computations** - Use useMemo for expensive operations
3. **Stable references** - Use useCallback for event handlers
4. **Batch updates** - Group related state changes

### Messaging
1. **Filter messages** - Only keep what you need
2. **Clean up regularly** - Remove old messages
3. **Debounce high-frequency** - Prevent message flooding
4. **Process in batches** - Handle multiple messages efficiently

### Components
1. **Lazy load** - Split code by routes/features
2. **Virtual scrolling** - Handle large datasets
3. **Optimize transitions** - Use CSS transforms
4. **Profile regularly** - Monitor performance metrics

### Bundle
1. **Tree shake** - Import only what you need
2. **Dynamic imports** - Load features on demand
3. **Code split** - Separate by functionality
4. **Monitor size** - Keep bundles small

### Memory
1. **Limit history** - Cap message retention
2. **Clean up resources** - Remove unused data
3. **Monitor usage** - Track memory consumption
4. **Implement TTL** - Expire old data automatically

By following these performance optimization strategies, you can build Linked Panels applications that scale to handle hundreds of panels, thousands of messages, and complex user interactions while maintaining smooth 60fps performance. 