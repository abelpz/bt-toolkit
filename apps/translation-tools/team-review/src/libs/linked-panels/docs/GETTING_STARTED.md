# Getting Started with Linked Panels

Welcome to Linked Panels! This guide will walk you through everything you need to know to get started building powerful, synchronized panel systems.

## What You'll Learn

- How to set up your first panel system
- Understanding resources and panels
- Basic inter-panel communication
- State persistence basics
- Common patterns and best practices

## Prerequisites

- React 18+ (Hooks and Concurrent Features)
- TypeScript 4.7+ (for type safety)
- Node.js 16+ (for development)

## Installation

```bash
# Using npm
npm install @bt-toolkit/ui-linked-panels

# Using yarn
yarn add @bt-toolkit/ui-linked-panels

# Using pnpm
pnpm add @bt-toolkit/ui-linked-panels
```

## Your First Panel System

Let's build a simple document viewer with synchronized panels:

### Step 1: Define Your Data

```tsx
// types.ts
export interface Document {
  id: string;
  title: string;
  content: string;
  lastModified: Date;
}

export interface Comment {
  id: string;
  documentId: string;
  author: string;
  text: string;
  timestamp: Date;
}
```

### Step 2: Create Resource Components

```tsx
// components/DocumentViewer.tsx
import React from 'react';
import { useResourceAPI } from '@bt-toolkit/ui-linked-panels';
import { Document } from '../types';

interface DocumentViewerProps {
  document: Document;
}

export function DocumentViewer({ document }: DocumentViewerProps) {
  const api = useResourceAPI(`doc-${document.id}`);
  
  const handleTextSelection = (selectedText: string) => {
    // Notify other panels about text selection
    api.messaging.send('comments', {
      type: 'text-selected',
      lifecycle: 'event',
      data: { text: selectedText, documentId: document.id }
    });
  };
  
  return (
    <div className="document-viewer">
      <h2>{document.title}</h2>
      <div 
        className="document-content"
        onMouseUp={() => {
          const selection = window.getSelection()?.toString();
          if (selection) {
            handleTextSelection(selection);
          }
        }}
      >
        {document.content}
      </div>
      <footer>
        <small>Last modified: {document.lastModified.toLocaleDateString()}</small>
      </footer>
    </div>
  );
}
```

```tsx
// components/CommentsPanel.tsx
import React, { useState } from 'react';
import { useResourceAPI } from '@bt-toolkit/ui-linked-panels';
import { Comment } from '../types';

interface CommentsPanelProps {
  comments: Comment[];
  documentId: string;
}

export function CommentsPanel({ comments, documentId }: CommentsPanelProps) {
  const api = useResourceAPI('comments');
  const [selectedText, setSelectedText] = useState<string>('');
  
  // Listen for text selection messages
  const messages = api.messaging.getMessages();
  
  React.useEffect(() => {
    const textSelectionMessages = messages.filter(
      msg => msg.content.type === 'text-selected'
    );
    
    if (textSelectionMessages.length > 0) {
      const latest = textSelectionMessages[textSelectionMessages.length - 1];
      setSelectedText(latest.content.data.text);
    }
  }, [messages]);
  
  const filteredComments = comments.filter(c => c.documentId === documentId);
  
  return (
    <div className="comments-panel">
      <h3>Comments</h3>
      
      {selectedText && (
        <div className="selected-text-preview">
          <h4>Selected Text:</h4>
          <blockquote>"{selectedText}"</blockquote>
        </div>
      )}
      
      <div className="comments-list">
        {filteredComments.map(comment => (
          <div key={comment.id} className="comment">
            <header>
              <strong>{comment.author}</strong>
              <time>{comment.timestamp.toLocaleDateString()}</time>
            </header>
            <p>{comment.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 3: Set Up the Panel System

```tsx
// App.tsx
import React from 'react';
import {
  LinkedPanelsContainer,
  LinkedPanel,
  createDefaultPluginRegistry,
  LocalStorageAdapter
} from '@bt-toolkit/ui-linked-panels';
import { DocumentViewer } from './components/DocumentViewer';
import { CommentsPanel } from './components/CommentsPanel';
import { Document, Comment } from './types';

// Sample data
const sampleDocuments: Document[] = [
  {
    id: '1',
    title: 'Project Proposal',
    content: 'This is the project proposal content...',
    lastModified: new Date('2024-01-15')
  },
  {
    id: '2',
    title: 'User Manual',
    content: 'This is the user manual content...',
    lastModified: new Date('2024-01-20')
  }
];

const sampleComments: Comment[] = [
  {
    id: '1',
    documentId: '1',
    author: 'Alice',
    text: 'Great proposal! I have some suggestions.',
    timestamp: new Date('2024-01-16')
  },
  {
    id: '2',
    documentId: '1',
    author: 'Bob',
    text: 'The timeline looks realistic.',
    timestamp: new Date('2024-01-17')
  }
];

export function App() {
  // Configure the panel system
  const config = {
    resources: [
      // Document resources
      ...sampleDocuments.map(doc => ({
        id: `doc-${doc.id}`,
        component: <DocumentViewer document={doc} />,
        title: doc.title,
        category: 'documents'
      })),
      // Comments resource
      {
        id: 'comments',
        component: <CommentsPanel comments={sampleComments} documentId="1" />,
        title: 'Comments',
        category: 'tools'
      }
    ],
    panels: {
      'main-panel': {
        resourceIds: ['doc-1', 'doc-2'],
        initialResourceId: 'doc-1'
      },
      'sidebar-panel': {
        resourceIds: ['comments'],
        initialResourceId: 'comments'
      }
    }
  };
  
  // Configure persistence
  const persistenceOptions = {
    storageAdapter: new LocalStorageAdapter(),
    storageKey: 'document-viewer-state',
    autoSave: true,
    debounceMs: 300
  };
  
  const plugins = createDefaultPluginRegistry();
  
  return (
    <div className="app">
      <header className="app-header">
        <h1>Document Viewer</h1>
      </header>
      
      <LinkedPanelsContainer 
        config={config}
        plugins={plugins}
        persistence={persistenceOptions}
      >
        <div className="app-content">
          <LinkedPanel id="main-panel" className="main-panel">
            {({ current, navigate }) => (
              <div className="panel-container">
                <nav className="panel-nav">
                  <button 
                    onClick={navigate.previous}
                    disabled={!current.panel.canGoPrevious}
                  >
                    ← Previous
                  </button>
                  
                  <select 
                    value={current.resource?.id || ''}
                    onChange={(e) => navigate.toResource(e.target.value)}
                  >
                    {current.panel.resources.map(resource => (
                      <option key={resource.id} value={resource.id}>
                        {resource.title}
                      </option>
                    ))}
                  </select>
                  
                  <button 
                    onClick={navigate.next}
                    disabled={!current.panel.canGoNext}
                  >
                    Next →
                  </button>
                </nav>
                
                <main className="panel-content">
                  {current.resource?.component}
                </main>
              </div>
            )}
          </LinkedPanel>
          
          <LinkedPanel id="sidebar-panel" className="sidebar-panel">
            {({ current }) => (
              <div className="sidebar-container">
                {current.resource?.component}
              </div>
            )}
          </LinkedPanel>
        </div>
      </LinkedPanelsContainer>
    </div>
  );
}
```

### Step 4: Add Some Styling

```css
/* App.css */
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: #f5f5f5;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
}

.app-content {
  flex: 1;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
  padding: 1rem;
}

.main-panel {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.sidebar-panel {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.panel-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #eee;
  background: #f9f9f9;
}

.panel-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.sidebar-container {
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
}

.document-viewer {
  max-width: none;
}

.document-content {
  line-height: 1.6;
  margin: 1rem 0;
  user-select: text;
}

.selected-text-preview {
  background: #f0f8ff;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.selected-text-preview blockquote {
  margin: 0.5rem 0;
  font-style: italic;
  color: #666;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.comment {
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 1rem;
}

.comment header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.comment time {
  font-size: 0.875rem;
  color: #666;
}
```

## Understanding the Code

### Resources
Resources are the building blocks of your panel system. Each resource:
- Has a unique ID
- Contains a React component
- Can have metadata (title, category, etc.)
- Can communicate with other resources

### Panels
Panels are containers that display resources:
- Can contain multiple resources
- Allow navigation between resources
- Can be synchronized with other panels
- Provide navigation controls and current state

### Messaging
Resources communicate through a type-safe messaging system:
- **Events**: One-time notifications (user actions, data changes)
- **State**: Persistent shared state
- **Commands**: Action requests between resources

### Persistence
State is automatically saved and restored:
- Panel positions and current resources
- Message history (filtered by lifecycle)
- Custom application state

## Next Steps

Now that you have a basic panel system running, you can:

1. **Add More Resources**: Create additional document types or tools
2. **Implement Persistence**: Try different storage adapters (IndexedDB, server-side)
3. **Add Custom Messages**: Define your own message types for specific workflows
4. **Optimize Performance**: Implement lazy loading and code splitting
5. **Add Testing**: Write tests for your panel interactions

## Common Patterns

### Resource Communication
```tsx
// In any resource component
const api = useResourceAPI('my-resource');

// Send a message
api.messaging.send('target-resource', {
  type: 'my-message',
  lifecycle: 'event',
  data: { key: 'value' }
});

// Listen for messages
const messages = api.messaging.getMessages();
const relevantMessages = messages.filter(msg => msg.content.type === 'my-message');
```

### Conditional Resource Display
```tsx
const config = {
  resources: [
    {
      id: 'admin-panel',
      component: <AdminPanel />,
      title: 'Admin',
      // Only show for admin users
      visible: user.role === 'admin'
    }
  ]
};
```

### Dynamic Resource Creation
```tsx
const [documents, setDocuments] = useState([]);

const config = useMemo(() => ({
  resources: [
    ...documents.map(doc => ({
      id: `doc-${doc.id}`,
      component: <DocumentViewer document={doc} />,
      title: doc.title
    })),
    {
      id: 'document-list',
      component: <DocumentList onDocumentSelect={handleDocumentSelect} />,
      title: 'Documents'
    }
  ],
  panels: {
    'main': { resourceIds: documents.map(d => `doc-${d.id}`) },
    'sidebar': { resourceIds: ['document-list'] }
  }
}), [documents]);
```

## Troubleshooting

### Common Issues

**Resources not displaying:**
- Check that resource IDs are unique
- Verify resourceIds in panel configuration match resource IDs
- Ensure components are properly imported

**Messages not being received:**
- Verify sender and receiver resource IDs are correct
- Check message type and lifecycle
- Ensure useResourceAPI is called with correct resource ID

**State not persisting:**
- Verify storage adapter is properly configured
- Check browser storage limits
- Ensure storageKey is unique to your application

**Performance issues:**
- Implement React.memo for resource components
- Use lazy loading for large resources
- Consider message cleanup strategies

### Debugging Tips

1. **Use React DevTools**: Inspect panel state and message flow
2. **Enable Debug Logging**: Add console.log in message handlers
3. **Check Storage**: Inspect localStorage/sessionStorage in browser DevTools
4. **Test Isolation**: Create minimal reproductions of issues

## What's Next?

- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Messaging System](./MESSAGING_SYSTEM.md) - Advanced communication patterns
- [State Persistence](../STATE_PERSISTENCE_GUIDE.md) - Detailed persistence options
- [Plugin System](./PLUGIN_SYSTEM.md) - Creating custom message types

Happy coding! 🚀 