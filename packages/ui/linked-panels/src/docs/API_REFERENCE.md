# API Reference

Complete API documentation for the Linked Panels library.

## Table of Contents

- [Core Components](#core-components)
- [Hooks](#hooks)
- [Types](#types)
- [Storage Adapters](#storage-adapters)
- [Plugin System](#plugin-system)
- [Utilities](#utilities)

## Core Components

### LinkedPanelsContainer

The root container component that manages the global state and provides context to all panels.

```tsx
interface LinkedPanelsContainerProps {
  config: LinkedPanelsConfig;
  plugins?: PluginRegistry;
  persistence?: StatePersistenceOptions;
  children: React.ReactNode;
}
```

#### Props

- **config** (`LinkedPanelsConfig`): Configuration for resources and panels
- **plugins** (`PluginRegistry`, optional): Plugin registry for custom message types
- **persistence** (`StatePersistenceOptions`, optional): State persistence configuration
- **children** (`React.ReactNode`): Child components (typically LinkedPanel components)

#### Example

```tsx
<LinkedPanelsContainer 
  config={config}
  plugins={plugins}
  persistence={{ storageAdapter: new LocalStorageAdapter() }}
>
  {children}
</LinkedPanelsContainer>
```

### LinkedPanel

A panel component that displays resources and provides navigation controls.

```tsx
interface LinkedPanelProps {
  id: string;
  className?: string;
  children: (panelState: PanelRenderProps) => React.ReactNode;
}
```

#### Props

- **id** (`string`): Unique identifier for the panel
- **className** (`string`, optional): CSS class name for styling
- **children** (`function`): Render function that receives panel state and navigation

#### Render Props

The children function receives a `PanelRenderProps` object:

```tsx
interface PanelRenderProps {
  current: {
    resource: Resource | null;
    index: number;
    panel: {
      id: string;
      canGoPrevious: boolean;
      canGoNext: boolean;
      totalResources: number;
      resources: Resource[];
    };
  };
  navigate: {
    next: () => void;
    previous: () => void;
    toIndex: (index: number) => void;
    toResource: (resourceId: string) => void;
  };
  loading: boolean;
  error: string | null;
}
```

#### Example

```tsx
<LinkedPanel id="main-panel">
  {({ current, navigate, loading, error }) => (
    <div>
      <nav>
        <button onClick={navigate.previous} disabled={!current.panel.canGoPrevious}>
          Previous
        </button>
        <span>{current.index + 1} of {current.panel.totalResources}</span>
        <button onClick={navigate.next} disabled={!current.panel.canGoNext}>
          Next
        </button>
      </nav>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {current.resource?.component}
    </div>
  )}
</LinkedPanel>
```

## Hooks

### useResourceAPI

Hook for accessing resource-specific APIs within resource components.

```tsx
function useResourceAPI<T extends BaseMessageContent = BaseMessageContent>(
  resourceId: string
): ResourceAPI<T>
```

#### Parameters

- **resourceId** (`string`): The ID of the current resource

#### Returns

```tsx
interface ResourceAPI<T extends BaseMessageContent> {
  messaging: {
    send: (targetResourceId: string, message: T) => void;
    getMessages: () => Message<T>[];
    getMessagesByType: (type: string) => Message<T>[];
    getMessagesByLifecycle: (lifecycle: MessageLifecycle) => Message<T>[];
    clearMessages: () => void;
    clearMessagesByType: (type: string) => void;
  };
  panel: {
    navigate: (direction: 'next' | 'previous') => void;
    goToResource: (resourceId: string) => void;
    goToIndex: (index: number) => void;
    getCurrentIndex: () => number;
    getTotalResources: () => number;
  };
  store: {
    getState: () => LinkedPanelsState;
    subscribe: (callback: (state: LinkedPanelsState) => void) => () => void;
  };
}
```

#### Example

```tsx
function MyResource({ id }: { id: string }) {
  const api = useResourceAPI(id);
  
  const handleClick = () => {
    api.messaging.send('other-resource', {
      type: 'button-clicked',
      lifecycle: 'event',
      data: { timestamp: Date.now() }
    });
  };
  
  const messages = api.messaging.getMessages();
  
  return (
    <div>
      <button onClick={handleClick}>Send Message</button>
      <div>Messages received: {messages.length}</div>
    </div>
  );
}
```

### useLinkedPanelsStore

Hook for accessing the global linked panels store.

```tsx
function useLinkedPanelsStore(): {
  state: LinkedPanelsState;
  actions: LinkedPanelsActions;
}
```

#### Returns

- **state** (`LinkedPanelsState`): Current global state
- **actions** (`LinkedPanelsActions`): State manipulation functions

#### Example

```tsx
function DebugPanel() {
  const { state, actions } = useLinkedPanelsStore();
  
  return (
    <div>
      <h3>Debug Info</h3>
      <pre>{JSON.stringify(state, null, 2)}</pre>
      <button onClick={() => actions.clearAllMessages()}>
        Clear All Messages
      </button>
    </div>
  );
}
```

## Types

### Core Configuration Types

#### LinkedPanelsConfig

```tsx
interface LinkedPanelsConfig {
  resources: Resource[];
  panels: Record<string, PanelConfig>;
  initialState?: LinkedPanelsPersistedState;
}
```

#### Resource

```tsx
interface Resource {
  id: string;
  component: React.ReactNode;
  title?: string;
  description?: string;
  category?: string;
  visible?: boolean;
  metadata?: Record<string, any>;
}
```

#### PanelConfig

```tsx
interface PanelConfig {
  resourceIds: string[];
  initialResourceId?: string;
  initialIndex?: number;
  allowEmpty?: boolean;
  cycleNavigation?: boolean;
}
```

### Message Types

#### BaseMessageContent

```tsx
interface BaseMessageContent {
  type: string;
  lifecycle: MessageLifecycle;
  data?: any;
}
```

#### Message

```tsx
interface Message<T extends BaseMessageContent = BaseMessageContent> {
  id: string;
  sourceResourceId: string;
  targetResourceId: string;
  content: T;
  timestamp: number;
  delivered: boolean;
}
```

#### MessageLifecycle

```tsx
type MessageLifecycle = 'event' | 'state' | 'command';
```

### State Types

#### LinkedPanelsState

```tsx
interface LinkedPanelsState {
  resources: Record<string, Resource>;
  panels: Record<string, PanelState>;
  messages: Message[];
  currentResourceIds: Record<string, string>;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
}
```

#### PanelState

```tsx
interface PanelState {
  id: string;
  resourceIds: string[];
  currentResourceId: string | null;
  currentIndex: number;
  totalResources: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  loading: boolean;
  error: string | null;
}
```

### Persistence Types

#### StatePersistenceOptions

```tsx
interface StatePersistenceOptions {
  storageAdapter: PersistenceStorageAdapter;
  storageKey?: string;
  autoSave?: boolean;
  debounceMs?: number;
  stateTTL?: number;
  includeMessages?: boolean;
  messageFilter?: (message: Message) => boolean;
  onSave?: (state: LinkedPanelsPersistedState) => void;
  onLoad?: (state: LinkedPanelsPersistedState) => void;
  onError?: (error: Error, operation: 'save' | 'load') => void;
}
```

#### LinkedPanelsPersistedState

```tsx
interface LinkedPanelsPersistedState {
  panels: Record<string, {
    currentResourceId: string | null;
    currentIndex: number;
  }>;
  messages: Message[];
  metadata: {
    version: string;
    timestamp: number;
    ttl?: number;
  };
}
```

## Storage Adapters

### PersistenceStorageAdapter

Base interface for all storage adapters.

```tsx
interface PersistenceStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  isAvailable(): Promise<boolean>;
}
```

### Built-in Adapters

#### LocalStorageAdapter

```tsx
class LocalStorageAdapter implements PersistenceStorageAdapter {
  constructor(options?: {
    fallbackToMemory?: boolean;
  });
}
```

#### SessionStorageAdapter

```tsx
class SessionStorageAdapter implements PersistenceStorageAdapter {
  constructor(options?: {
    fallbackToMemory?: boolean;
  });
}
```

#### MemoryStorageAdapter

```tsx
class MemoryStorageAdapter implements PersistenceStorageAdapter {
  constructor();
  
  // Additional methods for testing
  clear(): void;
  size(): number;
  keys(): string[];
}
```

#### IndexedDBAdapter

```tsx
class IndexedDBAdapter implements PersistenceStorageAdapter {
  constructor(options?: {
    dbName?: string;
    dbVersion?: number;
    storeName?: string;
    keyPath?: string;
  });
}
```

#### HTTPStorageAdapter

```tsx
class HTTPStorageAdapter implements PersistenceStorageAdapter {
  constructor(options: {
    baseUrl: string;
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
  });
}
```

#### AsyncStorageAdapter

```tsx
class AsyncStorageAdapter implements PersistenceStorageAdapter {
  constructor(asyncStorage: any); // React Native AsyncStorage
}
```

## Plugin System

### Plugin

```tsx
interface Plugin {
  name: string;
  version: string;
  messageTypes: Record<string, any>;
  validators: Record<string, MessageValidator>;
  handlers: Record<string, MessageHandler>;
  dependencies?: string[];
}
```

### PluginRegistry

```tsx
interface PluginRegistry {
  register(plugin: Plugin): void;
  unregister(pluginName: string): void;
  get(pluginName: string): Plugin | null;
  getAll(): Plugin[];
  validate(message: BaseMessageContent): boolean;
  handle(message: Message): void;
  getMessageTypes(): Record<string, any>;
}
```

### Creating Plugins

```tsx
function createPlugin(config: {
  name: string;
  version: string;
  messageTypes: Record<string, any>;
  validators: Record<string, MessageValidator>;
  handlers: Record<string, MessageHandler>;
  dependencies?: string[];
}): Plugin
```

#### Example

```tsx
const customPlugin = createPlugin({
  name: 'custom-plugin',
  version: '1.0.0',
  messageTypes: {
    'custom-message': CustomMessageContent
  },
  validators: {
    'custom-message': (content): content is CustomMessageContent => {
      return typeof content.customField === 'string';
    }
  },
  handlers: {
    'custom-message': (message) => {
      console.log('Custom message received:', message);
    }
  }
});
```

## Utilities

### createDefaultPluginRegistry

Creates a plugin registry with default message types.

```tsx
function createDefaultPluginRegistry(): PluginRegistry
```

### createTestEnvironment

Creates a test environment for unit testing.

```tsx
function createTestEnvironment(options: {
  config: LinkedPanelsConfig;
  plugins?: PluginRegistry;
  storageAdapter?: PersistenceStorageAdapter;
}): {
  container: React.ComponentType;
  store: LinkedPanelsStore;
  cleanup: () => void;
}
```

### Message Utilities

#### createMessage

```tsx
function createMessage<T extends BaseMessageContent>(
  sourceResourceId: string,
  targetResourceId: string,
  content: T
): Message<T>
```

#### isMessageExpired

```tsx
function isMessageExpired(
  message: Message,
  ttl: number
): boolean
```

#### filterMessagesByLifecycle

```tsx
function filterMessagesByLifecycle(
  messages: Message[],
  lifecycle: MessageLifecycle
): Message[]
```

#### filterMessagesByType

```tsx
function filterMessagesByType(
  messages: Message[],
  type: string
): Message[]
```

### State Utilities

#### createInitialState

```tsx
function createInitialState(
  config: LinkedPanelsConfig
): LinkedPanelsState
```

#### mergePersistedState

```tsx
function mergePersistedState(
  currentState: LinkedPanelsState,
  persistedState: LinkedPanelsPersistedState
): LinkedPanelsState
```

#### isStateValid

```tsx
function isStateValid(
  state: LinkedPanelsPersistedState,
  config: LinkedPanelsConfig
): boolean
```

## Error Handling

### Error Types

```tsx
class LinkedPanelsError extends Error {
  constructor(message: string, cause?: Error);
}

class PersistenceError extends LinkedPanelsError {
  constructor(message: string, operation: 'save' | 'load', cause?: Error);
}

class MessageValidationError extends LinkedPanelsError {
  constructor(message: string, messageType: string, cause?: Error);
}

class PluginError extends LinkedPanelsError {
  constructor(message: string, pluginName: string, cause?: Error);
}
```

### Error Boundaries

```tsx
interface LinkedPanelsErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

function LinkedPanelsErrorBoundary(props: LinkedPanelsErrorBoundaryProps): React.ReactElement
```

## TypeScript Support

### Generic Types

Most functions support generic types for better type safety:

```tsx
// Typed resource API
const api = useResourceAPI<MyMessageContent>('my-resource');

// Typed message handling
const handleMessage = (message: Message<MyMessageContent>) => {
  // message.content is typed as MyMessageContent
};

// Typed plugin creation
const plugin = createPlugin<MyMessageContent>({
  // Configuration with typed message content
});
```

### Utility Types

```tsx
// Extract message content type from a message
type MessageContent<T> = T extends Message<infer U> ? U : never;

// Extract resource type from a config
type ConfigResource<T> = T extends LinkedPanelsConfig ? T['resources'][number] : never;

// Extract panel type from a config
type ConfigPanel<T> = T extends LinkedPanelsConfig ? T['panels'][keyof T['panels']] : never;
```

## Performance Considerations

### Optimization Patterns

```tsx
// Memoize resource components
const MyResource = React.memo(({ data }: { data: any }) => {
  // Component implementation
});

// Use selective subscriptions
const api = useResourceAPI('my-resource');
const specificMessages = useMemo(
  () => api.messaging.getMessagesByType('specific-type'),
  [api.messaging.getMessages().length]
);

// Implement cleanup in useEffect
useEffect(() => {
  const cleanup = api.store.subscribe(state => {
    // Handle state changes
  });
  return cleanup;
}, [api.store]);
```

### Bundle Size Optimization

```tsx
// Lazy load storage adapters
const IndexedDBAdapter = lazy(() => import('linked-panels/adapters/indexeddb'));

// Conditional plugin loading
const plugins = createDefaultPluginRegistry();
if (typeof window !== 'undefined') {
  const { browserPlugin } = await import('./browser-plugin');
  plugins.register(browserPlugin);
}
```

This completes the comprehensive API reference for the Linked Panels library. All types, components, and utilities are documented with examples and usage patterns. 