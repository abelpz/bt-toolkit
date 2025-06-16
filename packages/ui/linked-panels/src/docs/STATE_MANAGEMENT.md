# State Management

The Linked Panels library uses a reactive state management system built on Zustand with Immer for immutable updates and efficient re-rendering.

## Architecture Overview

The state management system consists of:
- **Zustand store**: Central state container with reactive subscriptions
- **Immer integration**: Immutable state updates with mutable-style syntax
- **Selective re-rendering**: Components only re-render when their specific data changes
- **Type safety**: Full TypeScript support throughout the state system

## Store Structure

The main store contains:

```tsx
interface LinkedPanelsStore {
  // Resource management
  resources: Map<string, Resource>;
  
  // Panel configuration and navigation
  panelConfig: PanelConfig;
  panelNavigation: PanelNavigation;
  
  // Inter-resource messaging
  resourceMessages: ResourceMessages;
  messagingSystem: MessagingSystem;
  
  // Actions (methods to update state)
  setConfig: (config: LinkedPanelsConfig) => void;
  setCurrentResource: (panelId: string, index: number) => void;
  // ... other actions
}
```

## Reactive Updates

### Component Subscriptions

Components subscribe to specific parts of the state using selectors:

```tsx
function MyPanel({ panelId }) {
  // Only re-render when this panel's navigation changes
  const currentIndex = useLinkedPanelsStore(
    state => state.panelNavigation[panelId]?.currentIndex ?? 0
  );
  
  // Only re-render when resources change
  const resources = useLinkedPanelsStore(state => state.resources);
  
  return <div>{/* Panel content */}</div>;
}
```

### Selective Re-rendering

The system uses Zustand's selector pattern to prevent unnecessary re-renders:

```tsx
// ❌ Bad: Re-renders whenever any state changes
const entireState = useLinkedPanelsStore();

// ✅ Good: Only re-renders when specific data changes
const currentResource = useLinkedPanelsStore(state => {
  const panelConfig = state.panelConfig[panelId];
  const currentIndex = state.panelNavigation[panelId]?.currentIndex ?? 0;
  const resourceId = panelConfig?.resourceIds[currentIndex];
  return resourceId ? state.resources.get(resourceId) : null;
});
```

## State Updates

### Immutable Updates with Immer

All state updates use Immer for immutable operations:

```tsx
// Inside store actions
setCurrentResource: (panelId: string, index: number) => {
  set(produce((state) => {
    // Mutable-style syntax that produces immutable result
    if (!state.panelNavigation[panelId]) {
      state.panelNavigation[panelId] = { currentIndex: 0 };
    }
    state.panelNavigation[panelId].currentIndex = index;
  }));
}
```

### Action Methods

The store provides typed action methods for all state changes:

```tsx
const store = useLinkedPanelsStore();

// Navigation actions
store.setCurrentResource('main-panel', 2);
store.nextResource('sidebar-panel');
store.previousResource('main-panel');

// Resource management
store.setPanelResourceById('main-panel', 'resource-123');

// Messaging actions
store.sendMessage('from-resource', 'to-resource', messageContent);
store.clearMessages('resource-id');
```

## State Persistence

### Automatic Persistence

Configure automatic state saving:

```tsx
const persistenceOptions = {
  storageAdapter: new LocalStorageAdapter(),
  autoSave: true,
  autoSaveDebounce: 1000, // Save after 1 second of inactivity
  persistMessages: true,
  persistNavigation: true
};

<LinkedPanelsContainer 
  config={config} 
  persistence={persistenceOptions}
>
  {children}
</LinkedPanelsContainer>
```

### Manual Persistence

Control when state is saved:

```tsx
const store = useLinkedPanelsStore();

// Save current state
await store.saveState();

// Load saved state
const savedState = await store.loadState();

// Clear saved state
await store.clearPersistedState();

// Get storage information
const info = await store.getStorageInfo();
console.log('Has saved state:', info.hasStoredState);
```

### Filtered Persistence

Control what gets persisted:

```tsx
const persistenceOptions = {
  storageAdapter: new LocalStorageAdapter(),
  messageFilter: (message) => {
    // Only persist state messages, not events
    return message.content.lifecycle === 'state';
  },
  stateTTL: 7 * 24 * 60 * 60 * 1000 // 7 days
};
```

## State Queries

### System Information

Query the current state:

```tsx
const store = useLinkedPanelsStore();

// Get all resources
const allResources = store.getAllResourceIds();

// Get all panels
const allPanels = store.getAllPanels();

// Get resources in a specific panel
const panelResources = store.getResourcesInPanel('main-panel');

// Get currently visible resources
const visibleResources = store.getVisibleResourcesPerPanel();

// Get resource metadata
const resourceInfo = store.getResourceInfo('resource-id');
```

### Navigation State

Access navigation information:

```tsx
const store = useLinkedPanelsStore();

// Get current navigation state
const navigation = store.panelNavigation;

// Check which resource is visible in a panel
const visibleResources = store.getVisibleResourcesPerPanel();
const mainPanelResource = visibleResources['main-panel'];

// Get panel for a specific resource
const panel = store.getResourcePanel('resource-id');
```

## Performance Optimization

### Stable Selectors

Use stable selectors to prevent unnecessary re-renders:

```tsx
// ❌ Bad: Creates new object every time
const panelData = useLinkedPanelsStore(state => ({
  resources: state.resources,
  navigation: state.panelNavigation
}));

// ✅ Good: Use stable selectors
const resources = useLinkedPanelsStore(state => state.resources);
const navigation = useLinkedPanelsStore(state => state.panelNavigation);
```

### Memoized Computations

Memoize expensive computations:

```tsx
const panelResources = useMemo(() => {
  if (!panelConfig) return [];
  return panelConfig.resourceIds
    .map(id => resources.get(id))
    .filter(Boolean);
}, [resources, panelConfig]);
```

### Batch Updates

The store automatically batches updates for optimal performance:

```tsx
// These will be batched into a single re-render
store.setCurrentResource('panel1', 1);
store.setCurrentResource('panel2', 2);
store.sendMessage('resource1', 'resource2', message);
```

## Advanced Patterns

### Custom State Hooks

Create custom hooks for complex state logic:

```tsx
function usePanelState(panelId: string) {
  const panelConfig = useLinkedPanelsStore(
    state => state.panelConfig[panelId]
  );
  const navigation = useLinkedPanelsStore(
    state => state.panelNavigation[panelId]
  );
  const resources = useLinkedPanelsStore(state => state.resources);
  
  const panelResources = useMemo(() => {
    if (!panelConfig) return [];
    return panelConfig.resourceIds
      .map(id => resources.get(id))
      .filter(Boolean);
  }, [resources, panelConfig]);
  
  const currentResource = panelResources[navigation?.currentIndex ?? 0] || null;
  
  return {
    panelConfig,
    navigation,
    panelResources,
    currentResource,
    canGoNext: (navigation?.currentIndex ?? 0) < panelResources.length - 1,
    canGoPrevious: (navigation?.currentIndex ?? 0) > 0
  };
}
```

### State Synchronization

Synchronize state with external systems:

```tsx
function useExternalSync() {
  const store = useLinkedPanelsStore();
  
  useEffect(() => {
    // Sync with external API
    const sync = async () => {
      const externalState = await api.getState();
      store.setConfig(externalState.config);
    };
    
    sync();
    
    // Set up real-time updates
    const unsubscribe = api.onStateChange(sync);
    return unsubscribe;
  }, [store]);
}
```

### State Middleware

Add custom middleware for logging, analytics, etc.:

```tsx
const storeWithMiddleware = subscribeWithSelector(
  devtools(
    createLinkedPanelsStore(options),
    { name: 'LinkedPanels' }
  )
);

// Add logging middleware
storeWithMiddleware.subscribe(
  (state) => state.panelNavigation,
  (navigation) => {
    console.log('Navigation changed:', navigation);
    analytics.track('panel_navigation', navigation);
  }
);
```

## Testing State Management

### Mock Store

Create a mock store for testing:

```tsx
function createMockStore(initialState = {}) {
  return createLinkedPanelsStore({
    ...defaultOptions,
    initialState
  });
}

// In tests
const mockStore = createMockStore({
  panelNavigation: {
    'test-panel': { currentIndex: 1 }
  }
});
```

### State Assertions

Test state changes:

```tsx
it('should update navigation when setting current resource', () => {
  const store = createMockStore();
  
  store.getState().setCurrentResource('panel1', 2);
  
  expect(store.getState().panelNavigation.panel1.currentIndex).toBe(2);
});
```

## Best Practices

1. **Use selectors**: Always use specific selectors to prevent unnecessary re-renders
2. **Memoize computations**: Use `useMemo` for expensive derived state
3. **Batch updates**: The store handles batching automatically
4. **Type safety**: Use TypeScript for all state interactions
5. **Test state logic**: Write tests for complex state computations
6. **Monitor performance**: Use React DevTools to identify re-render issues
7. **Persist strategically**: Only persist necessary state to avoid bloat 