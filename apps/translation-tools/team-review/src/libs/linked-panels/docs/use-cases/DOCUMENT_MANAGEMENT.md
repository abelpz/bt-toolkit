# Document Management Systems with Linked Panels

This guide demonstrates how to build sophisticated document management systems using the Linked Panels library. We'll cover everything from basic document viewers to collaborative editing platforms.

## Overview

Document management systems are perfect for Linked Panels because they typically require:
- Multiple synchronized views of the same document
- Side-by-side comparison of different versions
- Collaborative editing with real-time updates
- Annotation and comment systems
- Version history and change tracking
- Multi-format document support

## Basic Document Viewer

Let's start with a simple document viewer that can display different document types:

### Document Types and Models

```tsx
// types/document.ts
export interface BaseDocument {
  id: string;
  title: string;
  type: 'text' | 'markdown' | 'pdf' | 'image';
  content: string;
  lastModified: Date;
  author: string;
  version: number;
  tags: string[];
  metadata: Record<string, any>;
}

export interface TextDocument extends BaseDocument {
  type: 'text';
  wordCount: number;
  language: string;
}

export interface MarkdownDocument extends BaseDocument {
  type: 'markdown';
  tableOfContents: { title: string; level: number; anchor: string }[];
  renderMode: 'source' | 'preview' | 'split';
}

export interface PDFDocument extends BaseDocument {
  type: 'pdf';
  pageCount: number;
  currentPage: number;
  annotations: Annotation[];
}

export interface Annotation {
  id: string;
  type: 'highlight' | 'comment' | 'note';
  page: number;
  position: { x: number; y: number; width: number; height: number };
  content: string;
  author: string;
  timestamp: Date;
}

export type Document = TextDocument | MarkdownDocument | PDFDocument;
```

### Document Viewer Components

```tsx
// components/TextDocumentViewer.tsx
import React, { useState } from 'react';
import { useResourceAPI } from '@bt-toolkit/ui-linked-panels';
import { TextDocument } from '../types/document';

interface TextDocumentViewerProps {
  document: TextDocument;
  readonly?: boolean;
}

export function TextDocumentViewer({ document, readonly = false }: TextDocumentViewerProps) {
  const api = useResourceAPI(`doc-${document.id}`);
  const [content, setContent] = useState(document.content);
  const [isEditing, setIsEditing] = useState(false);
  
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    
    // Notify other panels about content changes
    api.messaging.send('*', {
      type: 'document-content-changed',
      lifecycle: 'state',
      data: {
        documentId: document.id,
        content: newContent,
        wordCount: newContent.split(/\s+/).length,
        timestamp: Date.now()
      }
    });
  };
  
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      const selectedText = selection.toString();
      const range = selection.getRangeAt(0);
      
      api.messaging.send('*', {
        type: 'text-selected',
        lifecycle: 'event',
        data: {
          documentId: document.id,
          selectedText,
          startOffset: range.startOffset,
          endOffset: range.endOffset,
          timestamp: Date.now()
        }
      });
    }
  };
  
  return (
    <div className="text-document-viewer">
      <header className="document-header">
        <h2>{document.title}</h2>
        <div className="document-meta">
          <span>Words: {content.split(/\s+/).length}</span>
          <span>Language: {document.language}</span>
          <span>Version: {document.version}</span>
        </div>
        {!readonly && (
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={isEditing ? 'editing' : ''}
          >
            {isEditing ? 'Save' : 'Edit'}
          </button>
        )}
      </header>
      
      <main className="document-content">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="document-editor"
            placeholder="Start typing..."
          />
        ) : (
          <div 
            className="document-text"
            onMouseUp={handleTextSelection}
          >
            {content.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        )}
      </main>
      
      <footer className="document-footer">
        <small>
          Last modified: {document.lastModified.toLocaleString()} by {document.author}
        </small>
      </footer>
    </div>
  );
}
```

```tsx
// components/MarkdownDocumentViewer.tsx
import React, { useState, useMemo } from 'react';
import { useResourceAPI } from '@bt-toolkit/ui-linked-panels';
import { MarkdownDocument } from '../types/document';

interface MarkdownDocumentViewerProps {
  document: MarkdownDocument;
}

export function MarkdownDocumentViewer({ document }: MarkdownDocumentViewerProps) {
  const api = useResourceAPI(`doc-${document.id}`);
  const [renderMode, setRenderMode] = useState<'source' | 'preview' | 'split'>(document.renderMode);
  
  // Generate table of contents
  const tableOfContents = useMemo(() => {
    const lines = document.content.split('\n');
    const toc: { title: string; level: number; anchor: string }[] = [];
    
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const title = match[2];
        const anchor = `heading-${index}`;
        toc.push({ title, level, anchor });
      }
    });
    
    return toc;
  }, [document.content]);
  
  const handleModeChange = (mode: 'source' | 'preview' | 'split') => {
    setRenderMode(mode);
    
    api.messaging.send('*', {
      type: 'markdown-mode-changed',
      lifecycle: 'state',
      data: {
        documentId: document.id,
        renderMode: mode,
        timestamp: Date.now()
      }
    });
  };
  
  const renderMarkdown = (content: string) => {
    // Simple markdown rendering (you'd use a proper library like marked or remark)
    return content
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  };
  
  return (
    <div className="markdown-document-viewer">
      <header className="document-header">
        <h2>{document.title}</h2>
        <div className="render-mode-selector">
          <button 
            onClick={() => handleModeChange('source')}
            className={renderMode === 'source' ? 'active' : ''}
          >
            Source
          </button>
          <button 
            onClick={() => handleModeChange('preview')}
            className={renderMode === 'preview' ? 'active' : ''}
          >
            Preview
          </button>
          <button 
            onClick={() => handleModeChange('split')}
            className={renderMode === 'split' ? 'active' : ''}
          >
            Split
          </button>
        </div>
      </header>
      
      <div className={`document-content mode-${renderMode}`}>
        {(renderMode === 'source' || renderMode === 'split') && (
          <div className="source-view">
            <textarea
              value={document.content}
              onChange={(e) => {
                // Handle content changes
                api.messaging.send('*', {
                  type: 'document-content-changed',
                  lifecycle: 'state',
                  data: {
                    documentId: document.id,
                    content: e.target.value,
                    timestamp: Date.now()
                  }
                });
              }}
              className="markdown-editor"
            />
          </div>
        )}
        
        {(renderMode === 'preview' || renderMode === 'split') && (
          <div className="preview-view">
            <div 
              className="rendered-markdown"
              dangerouslySetInnerHTML={{ 
                __html: renderMarkdown(document.content) 
              }}
            />
          </div>
        )}
      </div>
      
      {tableOfContents.length > 0 && (
        <aside className="table-of-contents">
          <h3>Table of Contents</h3>
          <ul>
            {tableOfContents.map((item, index) => (
              <li key={index} className={`toc-level-${item.level}`}>
                <a href={`#${item.anchor}`}>{item.title}</a>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
```

### Annotation System

```tsx
// components/AnnotationPanel.tsx
import React, { useState, useEffect } from 'react';
import { useResourceAPI } from '@bt-toolkit/ui-linked-panels';
import { Annotation } from '../types/document';

interface AnnotationPanelProps {
  documentId: string;
  annotations: Annotation[];
}

export function AnnotationPanel({ documentId, annotations }: AnnotationPanelProps) {
  const api = useResourceAPI('annotations');
  const [selectedText, setSelectedText] = useState<string>('');
  const [newAnnotation, setNewAnnotation] = useState<string>('');
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);
  
  // Listen for text selection events
  useEffect(() => {
    const messages = api.messaging.getMessagesByType('text-selected');
    const latestSelection = messages[messages.length - 1];
    
    if (latestSelection && latestSelection.content.data.documentId === documentId) {
      setSelectedText(latestSelection.content.data.selectedText);
    }
  }, [api.messaging.getMessages(), documentId]);
  
  const handleCreateAnnotation = () => {
    if (!selectedText || !newAnnotation) return;
    
    const annotation: Annotation = {
      id: `ann-${Date.now()}`,
      type: 'comment',
      page: 1, // For text documents, we'll use page 1
      position: { x: 0, y: 0, width: 0, height: 0 }, // Would be calculated based on selection
      content: newAnnotation,
      author: 'Current User', // Would come from auth context
      timestamp: new Date()
    };
    
    api.messaging.send('*', {
      type: 'annotation-created',
      lifecycle: 'state',
      data: {
        documentId,
        annotation,
        selectedText,
        timestamp: Date.now()
      }
    });
    
    setNewAnnotation('');
    setSelectedText('');
  };
  
  const handleAnnotationClick = (annotation: Annotation) => {
    setActiveAnnotation(annotation.id);
    
    api.messaging.send('*', {
      type: 'annotation-focused',
      lifecycle: 'event',
      data: {
        documentId,
        annotationId: annotation.id,
        timestamp: Date.now()
      }
    });
  };
  
  return (
    <div className="annotation-panel">
      <header>
        <h3>Annotations</h3>
        <span className="annotation-count">{annotations.length}</span>
      </header>
      
      {selectedText && (
        <div className="new-annotation">
          <div className="selected-text">
            <strong>Selected Text:</strong>
            <blockquote>"{selectedText}"</blockquote>
          </div>
          <textarea
            value={newAnnotation}
            onChange={(e) => setNewAnnotation(e.target.value)}
            placeholder="Add your annotation..."
            rows={3}
          />
          <button onClick={handleCreateAnnotation} disabled={!newAnnotation}>
            Add Annotation
          </button>
        </div>
      )}
      
      <div className="annotations-list">
        {annotations.map((annotation) => (
          <div 
            key={annotation.id}
            className={`annotation ${activeAnnotation === annotation.id ? 'active' : ''}`}
            onClick={() => handleAnnotationClick(annotation)}
          >
            <header className="annotation-header">
              <span className="annotation-type">{annotation.type}</span>
              <span className="annotation-author">{annotation.author}</span>
              <time className="annotation-time">
                {annotation.timestamp.toLocaleDateString()}
              </time>
            </header>
            <div className="annotation-content">
              {annotation.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Document Comparison

```tsx
// components/DocumentComparison.tsx
import React, { useMemo } from 'react';
import { useResourceAPI } from '@bt-toolkit/ui-linked-panels';
import { Document } from '../types/document';

interface DocumentComparisonProps {
  documents: Document[];
}

interface DocumentDiff {
  added: string[];
  removed: string[];
  modified: string[];
}

export function DocumentComparison({ documents }: DocumentComparisonProps) {
  const api = useResourceAPI('comparison');
  
  const comparison = useMemo(() => {
    if (documents.length !== 2) return null;
    
    const [doc1, doc2] = documents;
    const lines1 = doc1.content.split('\n');
    const lines2 = doc2.content.split('\n');
    
    // Simple diff algorithm (you'd use a proper library like diff or jsdiff)
    const diff: DocumentDiff = {
      added: [],
      removed: [],
      modified: []
    };
    
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      
      if (line1 && !line2) {
        diff.removed.push(line1);
      } else if (!line1 && line2) {
        diff.added.push(line2);
      } else if (line1 !== line2) {
        diff.modified.push(`${line1} → ${line2}`);
      }
    }
    
    return diff;
  }, [documents]);
  
  const handleSyncScroll = (scrollTop: number) => {
    api.messaging.send('*', {
      type: 'comparison-scroll',
      lifecycle: 'event',
      data: {
        scrollTop,
        timestamp: Date.now()
      }
    });
  };
  
  if (documents.length !== 2) {
    return (
      <div className="document-comparison">
        <div className="comparison-placeholder">
          Select two documents to compare
        </div>
      </div>
    );
  }
  
  const [doc1, doc2] = documents;
  
  return (
    <div className="document-comparison">
      <header className="comparison-header">
        <h3>Document Comparison</h3>
        <div className="document-info">
          <div className="doc-info">
            <strong>{doc1.title}</strong>
            <span>v{doc1.version}</span>
          </div>
          <div className="vs">vs</div>
          <div className="doc-info">
            <strong>{doc2.title}</strong>
            <span>v{doc2.version}</span>
          </div>
        </div>
      </header>
      
      <div className="comparison-content">
        <div className="comparison-side-by-side">
          <div 
            className="document-side"
            onScroll={(e) => handleSyncScroll(e.currentTarget.scrollTop)}
          >
            <h4>{doc1.title}</h4>
            <pre className="document-content">{doc1.content}</pre>
          </div>
          
          <div 
            className="document-side"
            onScroll={(e) => handleSyncScroll(e.currentTarget.scrollTop)}
          >
            <h4>{doc2.title}</h4>
            <pre className="document-content">{doc2.content}</pre>
          </div>
        </div>
        
        {comparison && (
          <div className="diff-summary">
            <h4>Changes Summary</h4>
            <div className="diff-stats">
              <span className="added">+{comparison.added.length} lines</span>
              <span className="removed">-{comparison.removed.length} lines</span>
              <span className="modified">~{comparison.modified.length} lines</span>
            </div>
            
            {comparison.added.length > 0 && (
              <div className="diff-section">
                <h5>Added Lines</h5>
                <ul>
                  {comparison.added.map((line, index) => (
                    <li key={index} className="added-line">{line}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {comparison.removed.length > 0 && (
              <div className="diff-section">
                <h5>Removed Lines</h5>
                <ul>
                  {comparison.removed.map((line, index) => (
                    <li key={index} className="removed-line">{line}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {comparison.modified.length > 0 && (
              <div className="diff-section">
                <h5>Modified Lines</h5>
                <ul>
                  {comparison.modified.map((line, index) => (
                    <li key={index} className="modified-line">{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Complete Document Management System

```tsx
// DocumentManagementSystem.tsx
import React, { useState, useMemo } from 'react';
import {
  LinkedPanelsContainer,
  LinkedPanel,
  createDefaultPluginRegistry,
  IndexedDBAdapter
} from '@bt-toolkit/ui-linked-panels';
import { TextDocumentViewer } from './components/TextDocumentViewer';
import { MarkdownDocumentViewer } from './components/MarkdownDocumentViewer';
import { AnnotationPanel } from './components/AnnotationPanel';
import { DocumentComparison } from './components/DocumentComparison';
import { Document, Annotation } from './types/document';

export function DocumentManagementSystem() {
  const [documents] = useState<Document[]>([
    {
      id: 'doc1',
      title: 'Project Specification',
      type: 'text',
      content: 'This is a project specification document...',
      lastModified: new Date(),
      author: 'John Doe',
      version: 1,
      tags: ['specification', 'project'],
      metadata: {},
      wordCount: 250,
      language: 'en'
    },
    {
      id: 'doc2',
      title: 'User Guide',
      type: 'markdown',
      content: '# User Guide\n\n## Getting Started\n\nThis guide will help you...',
      lastModified: new Date(),
      author: 'Jane Smith',
      version: 2,
      tags: ['documentation', 'guide'],
      metadata: {},
      tableOfContents: [],
      renderMode: 'split'
    }
  ]);
  
  const [annotations] = useState<Annotation[]>([
    {
      id: 'ann1',
      type: 'comment',
      page: 1,
      position: { x: 0, y: 0, width: 0, height: 0 },
      content: 'This section needs more detail',
      author: 'Reviewer',
      timestamp: new Date()
    }
  ]);
  
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  
  const config = useMemo(() => ({
    resources: [
      // Document resources
      ...documents.map(doc => ({
        id: `doc-${doc.id}`,
        component: doc.type === 'text' ? 
          <TextDocumentViewer document={doc as any} /> :
          <MarkdownDocumentViewer document={doc as any} />,
        title: doc.title,
        category: 'documents',
        metadata: { type: doc.type, version: doc.version }
      })),
      // Annotation panel
      {
        id: 'annotations',
        component: <AnnotationPanel documentId="doc1" annotations={annotations} />,
        title: 'Annotations',
        category: 'tools'
      },
      // Document comparison
      {
        id: 'comparison',
        component: <DocumentComparison documents={documents.filter(d => selectedDocuments.includes(d.id))} />,
        title: 'Document Comparison',
        category: 'tools'
      }
    ],
    panels: {
      'main-panel': {
        resourceIds: documents.map(d => `doc-${d.id}`),
        initialResourceId: 'doc-doc1'
      },
      'sidebar-panel': {
        resourceIds: ['annotations', 'comparison'],
        initialResourceId: 'annotations'
      }
    }
  }), [documents, annotations, selectedDocuments]);
  
  const persistenceOptions = {
    storageAdapter: new IndexedDBAdapter({
      dbName: 'DocumentManagementSystem',
      storeName: 'documents'
    }),
    storageKey: 'dms-state',
    autoSave: true,
    debounceMs: 500,
    stateTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    includeMessages: true,
    messageFilter: (message: any) => {
      // Only persist state messages, not events
      return message.content.lifecycle === 'state';
    }
  };
  
  const plugins = createDefaultPluginRegistry();
  
  return (
    <div className="document-management-system">
      <header className="app-header">
        <h1>Document Management System</h1>
        <nav className="document-nav">
          <button onClick={() => setSelectedDocuments([])}>
            Clear Selection
          </button>
          <div className="document-selector">
            {documents.map(doc => (
              <label key={doc.id}>
                <input
                  type="checkbox"
                  checked={selectedDocuments.includes(doc.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDocuments([...selectedDocuments, doc.id]);
                    } else {
                      setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id));
                    }
                  }}
                />
                {doc.title}
              </label>
            ))}
          </div>
        </nav>
      </header>
      
      <LinkedPanelsContainer 
        config={config}
        plugins={plugins}
        persistence={persistenceOptions}
      >
        <div className="app-layout">
          <LinkedPanel id="main-panel" className="main-panel">
            {({ current, navigate, loading, error }) => (
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
                        {resource.title} {resource.metadata?.type && `(${resource.metadata.type})`}
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
                  {loading && <div className="loading">Loading document...</div>}
                  {error && <div className="error">Error: {error}</div>}
                  {current.resource?.component}
                </main>
              </div>
            )}
          </LinkedPanel>
          
          <LinkedPanel id="sidebar-panel" className="sidebar-panel">
            {({ current, navigate }) => (
              <div className="sidebar-container">
                <nav className="sidebar-nav">
                  <button 
                    onClick={() => navigate.toResource('annotations')}
                    className={current.resource?.id === 'annotations' ? 'active' : ''}
                  >
                    Annotations
                  </button>
                  <button 
                    onClick={() => navigate.toResource('comparison')}
                    className={current.resource?.id === 'comparison' ? 'active' : ''}
                  >
                    Compare
                  </button>
                </nav>
                
                <div className="sidebar-content">
                  {current.resource?.component}
                </div>
              </div>
            )}
          </LinkedPanel>
        </div>
      </LinkedPanelsContainer>
    </div>
  );
}
```

### Custom Message Types for Document Management

```tsx
// plugins/documentManagementPlugin.ts
import { createPlugin } from '@bt-toolkit/ui-linked-panels';

export interface DocumentContentChangedMessage {
  type: 'document-content-changed';
  lifecycle: 'state';
  data: {
    documentId: string;
    content: string;
    wordCount?: number;
    timestamp: number;
  };
}

export interface TextSelectedMessage {
  type: 'text-selected';
  lifecycle: 'event';
  data: {
    documentId: string;
    selectedText: string;
    startOffset: number;
    endOffset: number;
    timestamp: number;
  };
}

export interface AnnotationCreatedMessage {
  type: 'annotation-created';
  lifecycle: 'state';
  data: {
    documentId: string;
    annotation: Annotation;
    selectedText: string;
    timestamp: number;
  };
}

export const documentManagementPlugin = createPlugin({
  name: 'document-management',
  version: '1.0.0',
  
  messageTypes: {
    'document-content-changed': DocumentContentChangedMessage,
    'text-selected': TextSelectedMessage,
    'annotation-created': AnnotationCreatedMessage,
    'annotation-focused': 'annotation-focused',
    'comparison-scroll': 'comparison-scroll',
    'markdown-mode-changed': 'markdown-mode-changed'
  },
  
  validators: {
    'document-content-changed': (content): content is DocumentContentChangedMessage => {
      return typeof content.data.documentId === 'string' && 
             typeof content.data.content === 'string';
    },
    'text-selected': (content): content is TextSelectedMessage => {
      return typeof content.data.documentId === 'string' && 
             typeof content.data.selectedText === 'string';
    },
    'annotation-created': (content): content is AnnotationCreatedMessage => {
      return typeof content.data.documentId === 'string' && 
             typeof content.data.annotation === 'object';
    }
  },
  
  handlers: {
    'document-content-changed': (message) => {
      console.log('Document content changed:', message.content.data);
      // Could trigger auto-save, update word count, etc.
    },
    'text-selected': (message) => {
      console.log('Text selected:', message.content.data.selectedText);
      // Could trigger context menu, annotation creation, etc.
    },
    'annotation-created': (message) => {
      console.log('Annotation created:', message.content.data.annotation);
      // Could trigger notifications, save to database, etc.
    }
  }
});
```

## Advanced Features

### Real-time Collaboration

```tsx
// hooks/useCollaborativeEditing.ts
import { useEffect, useRef } from 'react';
import { useResourceAPI } from '@bt-toolkit/ui-linked-panels';
import { WebSocketConnection } from '../services/websocket';

export function useCollaborativeEditing(documentId: string) {
  const api = useResourceAPI(`doc-${documentId}`);
  const ws = useRef<WebSocketConnection | null>(null);
  
  useEffect(() => {
    // Initialize WebSocket connection
    ws.current = new WebSocketConnection(`ws://localhost:8080/documents/${documentId}`);
    
    // Listen for remote changes
    ws.current.onMessage((message) => {
      if (message.type === 'document-changed') {
        api.messaging.send('*', {
          type: 'document-content-changed',
          lifecycle: 'state',
          data: {
            documentId,
            content: message.content,
            timestamp: Date.now(),
            author: message.author
          }
        });
      }
    });
    
    // Listen for local changes and broadcast
    const messages = api.messaging.getMessagesByType('document-content-changed');
    const latestMessage = messages[messages.length - 1];
    
    if (latestMessage && latestMessage.content.data.documentId === documentId) {
      ws.current.send({
        type: 'document-changed',
        content: latestMessage.content.data.content,
        timestamp: latestMessage.content.data.timestamp
      });
    }
    
    return () => {
      ws.current?.close();
    };
  }, [documentId, api]);
  
  return {
    isConnected: ws.current?.isConnected || false,
    connectionStatus: ws.current?.status || 'disconnected'
  };
}
```

### Version History

```tsx
// components/VersionHistory.tsx
import React, { useState } from 'react';
import { useResourceAPI } from '@bt-toolkit/ui-linked-panels';

interface DocumentVersion {
  id: string;
  version: number;
  content: string;
  author: string;
  timestamp: Date;
  changesSummary: string;
}

interface VersionHistoryProps {
  documentId: string;
  versions: DocumentVersion[];
}

export function VersionHistory({ documentId, versions }: VersionHistoryProps) {
  const api = useResourceAPI('version-history');
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  
  const handleVersionSelect = (versionId: string) => {
    setSelectedVersion(versionId);
    const version = versions.find(v => v.id === versionId);
    
    if (version) {
      api.messaging.send('*', {
        type: 'version-selected',
        lifecycle: 'event',
        data: {
          documentId,
          version,
          timestamp: Date.now()
        }
      });
    }
  };
  
  const handleRestoreVersion = (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    
    if (version) {
      api.messaging.send('*', {
        type: 'document-content-changed',
        lifecycle: 'state',
        data: {
          documentId,
          content: version.content,
          timestamp: Date.now(),
          restoredFromVersion: version.version
        }
      });
    }
  };
  
  return (
    <div className="version-history">
      <header>
        <h3>Version History</h3>
      </header>
      
      <div className="versions-list">
        {versions.map((version) => (
          <div 
            key={version.id}
            className={`version-item ${selectedVersion === version.id ? 'selected' : ''}`}
            onClick={() => handleVersionSelect(version.id)}
          >
            <div className="version-header">
              <span className="version-number">v{version.version}</span>
              <span className="version-author">{version.author}</span>
              <time className="version-time">
                {version.timestamp.toLocaleDateString()}
              </time>
            </div>
            <div className="version-summary">
              {version.changesSummary}
            </div>
            <div className="version-actions">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestoreVersion(version.id);
                }}
                className="restore-button"
              >
                Restore
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

This comprehensive guide demonstrates how to build sophisticated document management systems using the Linked Panels library. The system supports multiple document types, real-time collaboration, version control, annotations, and document comparison - all with synchronized panels and persistent state.

## Key Benefits

1. **Synchronized Views**: All panels stay in sync automatically
2. **Flexible Architecture**: Easy to add new document types and tools
3. **Persistent State**: User's work is automatically saved and restored
4. **Type Safety**: Full TypeScript support throughout
5. **Extensible**: Plugin system for custom message types
6. **Collaborative**: Built-in support for real-time collaboration
7. **Performance**: Optimized for large documents and many concurrent users

The Linked Panels library makes it easy to build professional-grade document management systems with complex requirements and sophisticated user interfaces. 