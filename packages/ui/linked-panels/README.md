# Linked Panels Library

> A powerful React library for building interconnected panel systems with advanced state management, inter-panel communication, and flexible persistence.

[![npm version](https://badge.fury.io/js/linked-panels.svg)](https://badge.fury.io/js/linked-panels)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 What is Linked Panels?

Linked Panels is a sophisticated React library designed for applications that need **synchronized, communicating panels** with **persistent state management**. Think of it as a powerful foundation for building complex multi-view interfaces where panels need to stay in sync, communicate with each other, and remember their state across sessions.

### ✨ Key Features

- 🔗 **Panel Synchronization** - Keep multiple panels synchronized with automatic state management
- 💬 **Inter-Panel Messaging** - Type-safe communication between panels with lifecycle management
- 💾 **Pluggable Persistence** - Save and restore state using any storage backend
- 🧩 **Plugin Architecture** - Extensible messaging system with custom message types
- ⚡ **Performance Optimized** - Selective re-rendering and efficient state subscriptions
- 🎯 **TypeScript First** - Complete type safety throughout the entire system
- 📱 **Cross-Platform** - Works in web, React Native, and desktop applications

## 🎯 Perfect For

- **Document Management Systems** - Synchronized document viewers with annotation panels
- **Educational Platforms** - Multi-language learning interfaces with linked content
- **Data Analysis Tools** - Coordinated charts, tables, and visualization panels
- **Content Management** - Editorial workflows with synchronized content and metadata
- **Collaborative Applications** - Real-time synchronized workspaces
- **Multi-Step Workflows** - Complex forms and wizards with persistent state
- **Translation Tools** - Synchronized source and target text with supporting resources
- **Medical Applications** - Patient data with multiple synchronized views

## 🚀 Quick Start

### Installation

```bash
npm install linked-panels
```

### Basic Example

```tsx
import React from 'react';
import {
  LinkedPanelsContainer,
  LinkedPanel,
  createDefaultPluginRegistry,
  LocalStorageAdapter
} from 'linked-panels';

function App() {
  // Define your resources
  const config = {
    resources: [
      { id: 'doc1', component: <DocumentView id="1" />, title: 'Document 1' },
      { id: 'doc2', component: <DocumentView id="2" />, title: 'Document 2' },
      { id: 'notes1', component: <NotesView id="1" />, title: 'Notes 1' },
      { id: 'notes2', component: <NotesView id="2" />, title: 'Notes 2' },
    ],
    panels: {
      'main-panel': { 
        resourceIds: ['doc1', 'doc2'],
        initialResourceId: 'doc1' // Start with doc1
      },
      'sidebar-panel': { 
        resourceIds: ['notes1', 'notes2'],
        initialResourceId: 'notes1' // Start with notes1
      }
    }
  };

  // Configure persistence
  const persistenceOptions = {
    storageAdapter: new LocalStorageAdapter(),
    storageKey: 'my-app-state',
    autoSave: true
  };

  const plugins = createDefaultPluginRegistry();

  return (
    <LinkedPanelsContainer 
      config={config} 
      plugins={plugins}
      persistence={persistenceOptions}
    >
      <div className="app-layout">
        <LinkedPanel id="main-panel">
          {({ current, navigate }) => (
            <div className="main-panel">
              <header>
                <h2>{current.resource?.title}</h2>
                <nav>
                  <button 
                    onClick={navigate.previous}
                    disabled={!current.panel.canGoPrevious}
                  >
                    Previous
                  </button>
                  <span>{current.index + 1} of {current.panel.totalResources}</span>
                  <button 
                    onClick={navigate.next}
                    disabled={!current.panel.canGoNext}
                  >
                    Next
                  </button>
                </nav>
              </header>
              <main>
                {current.resource?.component}
              </main>
            </div>
          )}
        </LinkedPanel>

        <LinkedPanel id="sidebar-panel">
          {({ current, navigate }) => (
            <div className="sidebar-panel">
              <h3>{current.resource?.title}</h3>
              {current.resource?.component}
            </div>
          )}
        </LinkedPanel>
      </div>
    </LinkedPanelsContainer>
  );
}
```

## 🔥 Core Concepts

### Resources
Resources are the content units that can be displayed in panels. Each resource has an ID, a React component, and optional metadata.

```tsx
const resources = [
  { 
    id: 'dashboard', 
    component: <Dashboard />, 
    title: 'Dashboard',
    description: 'Main application dashboard',
    category: 'overview'
  },
  { 
    id: 'analytics', 
    component: <Analytics />, 
    title: 'Analytics',
    description: 'Data analytics and reports',
    category: 'data'
  }
];
```

### Panels
Panels are containers that display resources and can navigate between them. Panels can be synchronized and communicate with each other.

```tsx
const panels = {
  'main-view': { 
    resourceIds: ['dashboard', 'analytics'],
    initialResourceId: 'dashboard'
  },
  'detail-view': { 
    resourceIds: ['details1', 'details2'],
    initialIndex: 0
  }
};
```

### Messaging
Resources can send type-safe messages to each other with automatic lifecycle management.

```tsx
function MyResource({ id }) {
  const api = useResourceAPI(id);
  
  // Send a message
  const notifyUpdate = () => {
    api.messaging.send('other-resource', {
      type: 'data-updated',
      lifecycle: 'event',
      data: { timestamp: Date.now() }
    });
  };
  
  // Receive messages
  const messages = api.messaging.getMessages();
  
  return <div>...</div>;
}
```

## 📚 Documentation

### Core Documentation
- [**Getting Started**](./docs/GETTING_STARTED.md) - Complete setup and first steps
- [**API Reference**](./docs/API_REFERENCE.md) - Comprehensive API documentation
- [**State Management**](./docs/STATE_MANAGEMENT.md) - Understanding the reactive state system

### Features
- [**State Persistence**](./STATE_PERSISTENCE_GUIDE.md) - Save and restore panel states
- [**Messaging System**](./docs/MESSAGING_SYSTEM.md) - Inter-panel communication
- [**Plugin System**](./docs/PLUGIN_SYSTEM.md) - Extend with custom message types
- [**Storage Adapters**](./ADAPTER_STRATEGY.md) - Pluggable persistence backends

### Use Cases & Examples
- [**Document Management**](./docs/use-cases/DOCUMENT_MANAGEMENT.md) - Building document editors
- [**Data Dashboards**](./docs/use-cases/DATA_DASHBOARDS.md) - Synchronized analytics interfaces
- [**Educational Platforms**](./docs/use-cases/EDUCATIONAL_PLATFORMS.md) - Multi-language learning tools
- [**Collaborative Workflows**](./docs/use-cases/COLLABORATIVE_WORKFLOWS.md) - Team-based applications

### Advanced Topics
- [**Performance Optimization**](./docs/PERFORMANCE.md) - Best practices for large applications
- [**Testing**](./docs/TESTING.md) - Testing strategies and utilities
- [**Migration Guide**](./docs/MIGRATION.md) - Upgrading between versions

## 🎨 Real-World Examples

### Document Editor with Synchronized Panels
```tsx
function DocumentEditor() {
  const config = {
    resources: [
      { id: 'editor', component: <TextEditor />, title: 'Editor' },
      { id: 'preview', component: <Preview />, title: 'Preview' },
      { id: 'outline', component: <DocumentOutline />, title: 'Outline' },
      { id: 'comments', component: <Comments />, title: 'Comments' }
    ],
    panels: {
      'main': { resourceIds: ['editor', 'preview'] },
      'sidebar': { resourceIds: ['outline', 'comments'] }
    }
  };

  return (
    <LinkedPanelsContainer config={config}>
      {/* Panel implementation */}
    </LinkedPanelsContainer>
  );
}
```

### Analytics Dashboard with Cross-Panel Filtering
```tsx
function AnalyticsDashboard() {
  const config = {
    resources: [
      { id: 'overview', component: <OverviewChart />, category: 'charts' },
      { id: 'details', component: <DetailedMetrics />, category: 'data' },
      { id: 'filters', component: <FilterPanel />, category: 'controls' }
    ],
    panels: {
      'charts': { resourceIds: ['overview', 'details'] },
      'controls': { resourceIds: ['filters'] }
    }
  };

  // Panels automatically sync when filters change
  return <LinkedPanelsContainer config={config}>{/* ... */}</LinkedPanelsContainer>;
}
```

### E-Learning Platform with Progress Tracking
```tsx
function LearningPlatform() {
  const persistenceOptions = {
    storageAdapter: new IndexedDBAdapter(),
    storageKey: 'learning-progress',
    stateTTL: 30 * 24 * 60 * 60 * 1000 // 30 days
  };

  const config = {
    resources: [
      { id: 'lesson1', component: <Lesson content="..." />, title: 'Introduction' },
      { id: 'lesson2', component: <Lesson content="..." />, title: 'Basics' },
      { id: 'exercise1', component: <Exercise />, title: 'Practice 1' }
    ],
    panels: {
      'content': { 
        resourceIds: ['lesson1', 'lesson2', 'exercise1'],
        initialResourceId: 'lesson1' // Resume from saved progress
      }
    }
  };

  return (
    <LinkedPanelsContainer 
      config={config} 
      persistence={persistenceOptions}
    >
      {/* Learning interface */}
    </LinkedPanelsContainer>
  );
}
```

## 🔧 Storage Adapters

Choose the right storage backend for your needs:

```tsx
// Browser localStorage (default)
const browserStorage = {
  storageAdapter: new LocalStorageAdapter()
};

// IndexedDB for large datasets
const robustStorage = {
  storageAdapter: new IndexedDBAdapter({
    dbName: 'MyApp',
    storeName: 'panels'
  })
};

// Server-side storage for collaboration
const collaborativeStorage = {
  storageAdapter: new HTTPStorageAdapter({
    baseUrl: 'https://api.myapp.com',
    headers: { 'Authorization': 'Bearer token' }
  })
};

// React Native mobile storage
const mobileStorage = {
  storageAdapter: new AsyncStorageAdapter(AsyncStorage)
};

// Custom storage backend
class DatabaseAdapter implements PersistenceStorageAdapter {
  // Your custom implementation
}
```

## 🧩 Plugin System

Extend the messaging system with custom message types:

```tsx
const customPlugin = createPlugin({
  name: 'my-plugin',
  version: '1.0.0',
  
  messageTypes: {
    'user-action': UserActionMessage,
    'data-sync': DataSyncMessage
  },
  
  validators: {
    'user-action': (content): content is UserActionMessage => {
      return typeof content.action === 'string';
    }
  },
  
  handlers: {
    'user-action': (message) => {
      console.log('User action:', message.content.action);
    }
  }
});

const registry = createDefaultPluginRegistry();
registry.register(customPlugin);
```

## 🎯 TypeScript Support

Full TypeScript support with complete type safety:

```tsx
// Type your message content
interface MyMessageContent extends BaseMessageContent {
  type: 'my-message';
  data: {
    userId: string;
    action: string;
  };
}

// Type-safe resource API
const api = useResourceAPI<MyMessageContent>('my-resource');

// Send type-safe messages
api.messaging.send('target-resource', {
  type: 'my-message',
  lifecycle: 'event',
  data: {
    userId: 'user123',
    action: 'click'
  }
});
```

## 🚀 Performance

Optimized for large-scale applications:

- **Selective Re-rendering**: Only affected components update
- **Efficient Subscriptions**: Zustand-powered state management
- **Memory Management**: Automatic cleanup of old messages
- **Bundle Splitting**: Modular architecture for optimal loading

## 🧪 Testing

Built-in testing utilities:

```tsx
import { MemoryStorageAdapter, createTestEnvironment } from 'linked-panels';

describe('My Panel System', () => {
  it('should sync panels correctly', () => {
    const testEnv = createTestEnvironment({
      storageAdapter: new MemoryStorageAdapter(),
      config: testConfig
    });
    
    // Test your panel interactions
  });
});
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/bt-toolkit/linked-panels.git
cd linked-panels
npm install
npm run dev
```

## 📄 License

MIT License - see the [LICENSE](./LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](./docs/)
- 💬 [Discussions](https://github.com/bt-toolkit/linked-panels/discussions)
- 🐛 [Issues](https://github.com/bt-toolkit/linked-panels/issues)
- 📧 [Email Support](mailto:support@bt-toolkit.org)

---

**Built with ❤️ for developers who need powerful, synchronized panel systems.**
