# Linked Panels Library

A powerful, performant React library for managing interconnected panels with cross-panel navigation, messaging, and resource management. Built with Zustand for optimal performance and minimal re-renders.

## 🎯 Overview

The Linked Panels library enables complex multi-panel applications where:
- **Resources** (UI components) can be displayed across multiple panels
- **Cross-panel navigation** allows resources to control other panels
- **Inter-resource messaging** enables sophisticated communication workflows
- **Message chains** can flow between resources across different panels
- **Performance optimized** with selective subscriptions and memoization

Perfect for Bible translation tools, document review systems, or any application requiring coordinated multi-panel workflows.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Panel A       │    │   Panel B       │
│ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Resource 1  │◄┼────┼►│ Resource 3  │ │
│ │ Resource 2  │ │    │ │ Resource 1  │ │
│ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
              Zustand Store
        (Messages, Navigation, Config)
```

### Core Concepts

- **Resource**: A UI component that can be displayed in panels
- **Panel**: A container that displays one resource at a time
- **Configuration**: Defines which resources are available in which panels
- **Navigation**: Controls which resource is currently visible in each panel
- **Messaging**: Enables communication between resources across panels

## 📦 Installation & Setup

```typescript
import {
  LinkedPanelsContainer,
  LinkedPanel,
  useResourceAPI,
  LinkedPanelsConfig
} from './libs/linked-panels';
```

## 🚀 Quick Start

### 1. Define Your Configuration

```typescript
const config: LinkedPanelsConfig = {
  resources: [
    {
      id: 'resource1',
      component: <MyResourceComponent id="resource1" />
    },
    {
      id: 'resource2', 
      component: <MyResourceComponent id="resource2" />
    },
    {
      id: 'resource3',
      component: <MyResourceComponent id="resource3" />
    }
  ],
  panels: {
    left: {
      resourceIds: ['resource1', 'resource2'] // resource1 and resource2 available in left panel
    },
    right: {
      resourceIds: ['resource2', 'resource3'] // resource2 and resource3 available in right panel
    }
  }
};
```

### 2. Set Up Your App Structure

```typescript
function App() {
  return (
    <LinkedPanelsContainer config={config}>
      <div className="flex h-screen">
        {/* Left Panel */}
        <div className="w-1/2">
          <LinkedPanel id="left">
            {(props) => (
              <PanelUI 
                title="Left Panel"
                showButtons={true}
                panelProps={props}
              />
            )}
          </LinkedPanel>
        </div>
        
        {/* Right Panel */}
        <div className="w-1/2">
          <LinkedPanel id="right">
            {(props) => (
              <PanelUI 
                title="Right Panel" 
                showButtons={true}
                panelProps={props}
              />
            )}
          </LinkedPanel>
        </div>
      </div>
    </LinkedPanelsContainer>
  );
}
```

### 3. Create Resource Components

```typescript
function MyResourceComponent({ id }: { id: string }) {
  const api = useResourceAPI(id);
  
  return (
    <div>
      <h3>Resource: {id}</h3>
      <p>Panel: {api.system.getMyPanel()}</p>
      <p>Visible: {api.system.amIVisible() ? 'Yes' : 'No'}</p>
      
      <button onClick={() => {
        // Send message to another resource
        api.messaging.sendTo('resource2', {
          text: 'Hello from ' + id,
          timestamp: Date.now()
        });
      }}>
        Send Message
      </button>
    </div>
  );
}
```

## 📚 API Reference

### Components

#### `LinkedPanelsContainer`

The root container that provides the Zustand store context.

```typescript
interface LinkedPanelsContainerProps {
  config: LinkedPanelsConfig;
  children: ReactNode;
}
```

#### `LinkedPanel`

A headless component that manages panel state and provides render props.

```typescript
interface LinkedPanelProps {
  id: string;
  children: (props: LinkedPanelRenderProps) => ReactNode;
}
```

**Render Props:**
```typescript
interface LinkedPanelRenderProps {
  // Current state
  currentResource: Resource | null;
  resources: Resource[];
  currentIndex: number;
  totalResources: number;
  
  // Navigation
  canGoNext: boolean;
  canGoPrevious: boolean;
  goToResource: (index: number) => void;
  nextResource: () => void;
  previousResource: () => void;
  
  // Cross-panel actions
  setPanelResource: (panelId: string, resourceIndex: number) => void;
  setPanelResourceById: (panelId: string, resourceId: string) => boolean;
  
  // Messaging
  sendMessage: (fromResourceId: string, toResourceId: string, content: any, chainId?: string) => boolean;
  getMessages: (resourceId: string) => ResourceMessage[];
  clearMessages: (resourceId: string) => void;
  
  // System information
  getAllResourceIds: () => string[];
  getResourcePanel: (resourceId: string) => string | null;
  getVisibleResourcesPerPanel: () => { [panelId: string]: string };
  getAllPanels: () => string[];
  getResourcesInPanel: (panelId: string) => string[];
  getPanelResourceMapping: () => { [panelId: string]: string[] };
}
```

### Hooks

#### `useResourceAPI(resourceId: string)`

The main hook for resource components to interact with the panel system.

```typescript
const api = useResourceAPI('resource1');

// Navigation
api.navigation.showResourceInPanel('resource2', 'right');
api.navigation.nextInPanel('left');

// Messaging  
api.messaging.sendTo('resource2', { text: 'Hello!' });
api.messaging.broadcast({ text: 'Hello everyone!' });
const messages = api.messaging.getMyMessages(); // Reactive!

// System info
const myPanel = api.system.getMyPanel();
const isVisible = api.system.amIVisible();
```

**API Structure:**
```typescript
{
  navigation: {
    showResourceInPanel: (targetResourceId: string, panelId: string) => boolean;
    nextInPanel: (panelId: string) => void;
    previousInPanel: (panelId: string) => void;
    goToIndexInPanel: (panelId: string, index: number) => void;
  },
  
  messaging: {
    sendTo: (targetResourceId: string, content: any, chainId?: string) => boolean;
    sendToPanel: (panelId: string, content: any) => boolean[];
    broadcast: (content: any) => boolean[];
    getMyMessages: () => ResourceMessage[]; // Reactive subscription
    clearMyMessages: () => void;
  },
  
  system: {
    getAllResources: () => string[];
    getAllPanels: () => string[];
    getPanelMapping: () => { [panelId: string]: string[] };
    getResourcesInPanel: (panelId: string) => string[];
    getMyPanel: () => string | null;
    getResourcePanel: (resourceId: string) => string | null;
    getVisibleResources: () => { [panelId: string]: string };
    amIVisible: () => boolean;
  }
}
```

### Types

#### `LinkedPanelsConfig`

```typescript
interface LinkedPanelsConfig {
  resources: Resource[];
  panels: PanelConfig;
}

interface Resource {
  id: string;
  component: ReactNode;
}

interface PanelConfig {
  [panelId: string]: {
    resourceIds: string[];
  };
}
```

#### `ResourceMessage`

```typescript
interface ResourceMessage {
  id: string;
  fromResourceId: string;
  toResourceId: string;
  content: any; // Can be any object shape
  timestamp: number;
  chainId?: string; // For message chains
}
```

## 🔄 Messaging System

### Message Types

The messaging system supports flexible content types:

```typescript
// Simple text message
api.messaging.sendTo('resource2', 'Hello!');

// Structured message
api.messaging.sendTo('resource2', {
  text: 'Hello from resource1',
  originalSender: 'resource1@left',
  timestamp: Date.now(),
  type: 'greeting',
  data: { userId: 123 }
});

// Chain message (for forwarding workflows)
api.messaging.sendTo('resource2', content, 'chain_123');
```

### Message Chains

Messages can be chained across resources for complex workflows:

```typescript
// Start a chain
const chainId = `chain_${Date.now()}`;
api.messaging.sendTo('resource2', {
  text: 'Start workflow',
  originalSender: `${resourceId}@${api.system.getMyPanel()}`,
  type: 'workflow'
}, chainId);

// Chain automatically continues when resource2 forwards the message
// Chain completes when message returns to original sender
```

### Reactive Message Handling

Messages are automatically reactive - no polling needed:

```typescript
function MyResource({ id }) {
  const api = useResourceAPI(id);
  
  // This automatically updates when new messages arrive!
  const messages = api.messaging.getMyMessages();
  
  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          <strong>From:</strong> {msg.fromResourceId}<br/>
          <strong>Content:</strong> {typeof msg.content === 'object' ? msg.content.text : msg.content}
        </div>
      ))}
    </div>
  );
}
```

## 🎛️ Navigation Control

### Panel Navigation

```typescript
// Navigate within current panel
api.navigation.nextInPanel('left');
api.navigation.previousInPanel('right');
api.navigation.goToIndexInPanel('left', 2);

// Show specific resource in specific panel
const success = api.navigation.showResourceInPanel('resource3', 'right');
if (success) {
  console.log('Resource3 is now visible in right panel');
}
```

### Cross-Panel Coordination

```typescript
// Get system state
const visibleResources = api.system.getVisibleResources();
// Returns: { left: 'resource1', right: 'resource3' }

const panelMapping = api.system.getPanelMapping();
// Returns: { left: ['resource1', 'resource2'], right: ['resource2', 'resource3'] }

// Check resource visibility
if (api.system.amIVisible()) {
  console.log('I am currently visible');
}
```

## ⚡ Performance Features

### Optimized Re-renders

The library is highly optimized to minimize re-renders:

```typescript
// ✅ Only subscribes to messages for this specific resource
const messages = api.messaging.getMyMessages();

// ✅ Panel only re-renders when its specific state changes
const panelState = useLinkedPanelsStore(state => ({
  resources: state.resources,
  panelConfig: state.panelConfig[panelId],
  currentIndex: state.panelNavigation[panelId]?.currentIndex ?? 0
}));

// ✅ Functions are memoized and stable
const actions = React.useMemo(() => ({ /* ... */ }), []);
```

### Selective Subscriptions

- **Resource components** only subscribe to their own messages
- **Panel components** only subscribe to their panel's state
- **Navigation changes** in one panel don't affect other panels
- **Message updates** only trigger re-renders in receiving resources

## 🛠️ Best Practices

### 1. Resource Component Structure

```typescript
function MyResource({ id, component }) {
  const api = useResourceAPI(id);
  
  // Use the reactive message subscription
  const messages = api.messaging.getMyMessages();
  
  // Memoize expensive calculations
  const processedMessages = React.useMemo(() => {
    return messages.filter(msg => msg.type === 'important');
  }, [messages]);
  
  return (
    <div>
      {component}
      {/* Your resource UI */}
    </div>
  );
}
```

### 2. Message Content Structure

```typescript
// ✅ Good: Structured message content
const messageContent = {
  text: 'User-readable message',
  originalSender: `${resourceId}@${panelId}`,
  timestamp: Date.now(),
  type: 'workflow' | 'notification' | 'data',
  data: { /* additional data */ }
};

// ❌ Avoid: Plain strings for complex workflows
api.messaging.sendTo('resource2', 'some message');
```

### 3. Error Handling

```typescript
// Check if navigation succeeded
const success = api.navigation.showResourceInPanel('resource2', 'right');
if (!success) {
  console.warn('Resource2 not available in right panel');
}

// Validate message sending
const sent = api.messaging.sendTo('resource2', content);
if (!sent) {
  console.warn('Failed to send message to resource2');
}
```

### 4. Lifecycle Management

```typescript
function MyResource({ id }) {
  const api = useResourceAPI(id);
  
  React.useEffect(() => {
    // Component automatically sends mount/unmount messages
    // No manual lifecycle management needed
    
    return () => {
      // Cleanup if needed
      api.messaging.clearMyMessages();
    };
  }, [api]);
}
```

## 🔧 Advanced Usage

### Custom Panel UI

```typescript
function CustomPanelUI({ panelProps, title }) {
  const { currentResource, canGoNext, canGoPrevious, nextResource, previousResource } = panelProps;
  
  return (
    <div className="panel">
      <header>
        <h2>{title}</h2>
        <div className="nav-controls">
          <button onClick={previousResource} disabled={!canGoPrevious}>←</button>
          <span>{panelProps.currentIndex + 1} / {panelProps.totalResources}</span>
          <button onClick={nextResource} disabled={!canGoNext}>→</button>
        </div>
      </header>
      
      <main>
        {currentResource ? currentResource.component : 'No resource selected'}
      </main>
    </div>
  );
}
```

### Message Chain Handling

```typescript
function ChainAwareResource({ id }) {
  const api = useResourceAPI(id);
  const messages = api.messaging.getMyMessages();
  
  React.useEffect(() => {
    const chainMessages = messages.filter(msg => msg.chainId);
    
    chainMessages.forEach(msg => {
      // Check if chain should end (returned to original sender)
      if (msg.content?.originalSender === `${id}@${api.system.getMyPanel()}`) {
        console.log('Chain completed!');
        return;
      }
      
      // Forward to next resource in different panel
      const target = findTargetInDifferentPanel();
      if (target) {
        api.messaging.sendTo(target.resourceId, msg.content, msg.chainId);
      }
    });
  }, [messages, api, id]);
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Resource not appearing in panel**
   ```typescript
   // Check if resource is configured for that panel
   const panelResources = api.system.getResourcesInPanel('panelId');
   console.log('Available resources:', panelResources);
   ```

2. **Messages not updating**
   ```typescript
   // Ensure you're using the reactive subscription
   const messages = api.messaging.getMyMessages(); // ✅ Reactive
   // Not: api.messaging.getMyMessages() in useEffect // ❌ Not reactive
   ```

3. **Performance issues**
   ```typescript
   // Use memoization for expensive operations
   const processedData = React.useMemo(() => {
     return expensiveCalculation(messages);
   }, [messages]);
   ```

### Debug Helpers

```typescript
// Log current system state
console.log('System state:', {
  myPanel: api.system.getMyPanel(),
  visible: api.system.amIVisible(),
  allPanels: api.system.getAllPanels(),
  visibleResources: api.system.getVisibleResources()
});
```

## 📄 License

This library is part of the Bible Translation Toolkit project.

---

**Built with ❤️ for Bible Translation workflows** 