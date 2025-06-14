# Resource Management Guide

This guide covers resource management in the panel system, including resource types, lifecycle, factories, and best practices for handling Bible translation resources.

## Overview

Resources are data entities that can be displayed and manipulated within panels. They represent various types of content such as Bible verses, chapters, translations, notes, and other translation-related data.

```typescript
interface ResourceAPI {
  id: string;                    // Unique resource identifier
  type: string;                  // Resource type (verse, chapter, note, etc.)
  data?: any;                   // Resource-specific data
  metadata?: ResourceMetadata;   // Additional metadata
  
  // Lifecycle methods
  mount?(container: HTMLElement): Promise<void>;
  unmount?(): Promise<void>;
  
  // State management
  getState?(): any;
  setState?(state: any): Promise<void>;
}
```

## Resource Types

### Bible Verse Resources

Represents individual Bible verses with translation data.

```typescript
interface VerseResource extends ResourceAPI {
  type: 'verse';
  data: {
    book: string;                // Book name (e.g., "Genesis")
    chapter: number;             // Chapter number
    verse: number;               // Verse number
    sourceText: string;          // Original text
    translation?: string;        // Current translation
    notes?: string[];           // Translation notes
    references?: string[];      // Cross-references
  };
  metadata: {
    language: string;           // Target language
    translator?: string;        // Translator ID
    lastModified: number;       // Last modification timestamp
    status: 'draft' | 'review' | 'approved';
  };
}
```

**Usage:**
```typescript
const verseResource: VerseResource = {
  id: 'genesis-1-1',
  type: 'verse',
  data: {
    book: 'Genesis',
    chapter: 1,
    verse: 1,
    sourceText: 'In the beginning God created the heavens and the earth.',
    translation: 'Au commencement, Dieu créa les cieux et la terre.',
    notes: ['Key theological concept: creation ex nihilo'],
    references: ['john-1-1', 'hebrews-11-3']
  },
  metadata: {
    language: 'fr',
    translator: 'translator-123',
    lastModified: Date.now(),
    status: 'review'
  }
};
```

### Chapter Resources

Represents entire Bible chapters with multiple verses.

```typescript
interface ChapterResource extends ResourceAPI {
  type: 'chapter';
  data: {
    book: string;
    chapter: number;
    verses: VerseResource[];     // All verses in the chapter
    summary?: string;           // Chapter summary
    outline?: string[];         // Chapter outline
  };
  metadata: {
    verseCount: number;
    completionPercentage: number; // Translation completion %
    lastModified: number;
  };
}
```

### Translation Note Resources

Represents translation notes and commentary.

```typescript
interface NoteResource extends ResourceAPI {
  type: 'note';
  data: {
    title: string;
    content: string;
    attachedTo: string;         // Resource ID this note is attached to
    category: 'translation' | 'cultural' | 'theological' | 'linguistic';
    tags: string[];
  };
  metadata: {
    author: string;
    created: number;
    lastModified: number;
    visibility: 'private' | 'team' | 'public';
  };
}
```

### Reference Resources

Represents cross-references and parallel passages.

```typescript
interface ReferenceResource extends ResourceAPI {
  type: 'reference';
  data: {
    sourceVerse: string;        // Source verse ID
    targetVerses: string[];     // Related verse IDs
    relationship: 'parallel' | 'quotation' | 'allusion' | 'theme';
    description?: string;
  };
}
```

## Resource Lifecycle

### 1. Creation

Resources can be created through factories or directly:

```typescript
// Using factory
const resourceFactory = new ResourceFactory();
const verseResource = await resourceFactory.createResource('verse', {
  book: 'Genesis',
  chapter: 1,
  verse: 1,
  sourceText: 'In the beginning...'
});

// Direct creation
const noteResource: NoteResource = {
  id: 'note-' + Date.now(),
  type: 'note',
  data: {
    title: 'Translation Note',
    content: 'Important cultural context...',
    attachedTo: 'genesis-1-1',
    category: 'cultural',
    tags: ['context', 'culture']
  },
  metadata: {
    author: 'translator-123',
    created: Date.now(),
    lastModified: Date.now(),
    visibility: 'team'
  }
};
```

### 2. Mounting

When a resource is added to a panel, it can be mounted to the DOM:

```typescript
class VerseResourceRenderer {
  async mount(resource: VerseResource, container: HTMLElement): Promise<void> {
    const verseElement = document.createElement('div');
    verseElement.className = 'verse-resource';
    
    // Create verse display
    const verseNumber = document.createElement('span');
    verseNumber.className = 'verse-number';
    verseNumber.textContent = resource.data.verse.toString();
    
    const verseText = document.createElement('div');
    verseText.className = 'verse-text';
    verseText.textContent = resource.data.translation || resource.data.sourceText;
    
    // Add translation editor if in edit mode
    if (this.isEditMode) {
      const editor = this.createTranslationEditor(resource);
      verseElement.appendChild(editor);
    }
    
    verseElement.appendChild(verseNumber);
    verseElement.appendChild(verseText);
    container.appendChild(verseElement);
    
    // Set up event handlers
    this.setupEventHandlers(verseElement, resource);
  }
  
  async unmount(): Promise<void> {
    // Clean up event handlers
    this.cleanupEventHandlers();
    
    // Save any pending changes
    await this.savePendingChanges();
    
    // Remove from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
```

### 3. State Management

Resources can maintain and persist their state:

```typescript
class StatefulResource implements ResourceAPI {
  private state: any = {};
  
  async getState(): Promise<any> {
    return { ...this.state };
  }
  
  async setState(newState: any): Promise<void> {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };
    
    // Emit state change signal
    await this.emitStateChange(oldState, this.state);
    
    // Persist state if needed
    await this.persistState();
  }
  
  private async persistState(): Promise<void> {
    // Save to local storage, database, etc.
    localStorage.setItem(`resource-state-${this.id}`, JSON.stringify(this.state));
  }
}
```

## Resource Factories

Resource factories provide a centralized way to create and configure resources:

```typescript
class ResourceFactory {
  private resourceTypes = new Map<string, ResourceConstructor>();
  
  registerResourceType(type: string, constructor: ResourceConstructor): void {
    this.resourceTypes.set(type, constructor);
  }
  
  async createResource(type: string, data: any, metadata?: any): Promise<ResourceAPI> {
    const Constructor = this.resourceTypes.get(type);
    if (!Constructor) {
      throw new Error(`Unknown resource type: ${type}`);
    }
    
    const resource = new Constructor({
      id: this.generateId(type),
      type,
      data,
      metadata: {
        created: Date.now(),
        lastModified: Date.now(),
        ...metadata
      }
    });
    
    // Initialize resource
    await this.initializeResource(resource);
    
    return resource;
  }
  
  private generateId(type: string): string {
    return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async initializeResource(resource: ResourceAPI): Promise<void> {
    // Load any required data
    await this.loadResourceData(resource);
    
    // Set up resource-specific configuration
    await this.configureResource(resource);
    
    // Emit creation signal
    await this.emitResourceCreated(resource);
  }
}

// Register resource types
const factory = new ResourceFactory();
factory.registerResourceType('verse', VerseResource);
factory.registerResourceType('chapter', ChapterResource);
factory.registerResourceType('note', NoteResource);
factory.registerResourceType('reference', ReferenceResource);
```

## Resource Management in Panels

### Adding Resources to Panels

```typescript
class TranslationPanel extends BasePanel {
  async addResource(resource: ResourceAPI): Promise<void> {
    // Validate resource compatibility
    if (!this.isResourceCompatible(resource)) {
      throw new Error(`Resource type '${resource.type}' not compatible with panel type '${this.type}'`);
    }
    
    // Add to internal collection
    this.resources.set(resource.id, resource);
    
    // Mount resource if panel is active
    if (this.isActive && resource.mount) {
      await resource.mount(this.getResourceContainer());
    }
    
    // Set up resource event handlers
    this.setupResourceHandlers(resource);
    
    // Emit resource added signal
    await this.emitSignal('RESOURCE_ADDED', {
      resourceId: resource.id,
      resourceType: resource.type,
      panelId: this.id,
      resource
    });
    
    // Call hook for subclasses
    await this.onResourceAdded(resource);
  }
  
  private isResourceCompatible(resource: ResourceAPI): boolean {
    // Define compatibility rules
    const compatibilityMap = {
      'translation': ['verse', 'chapter', 'note'],
      'source': ['verse', 'chapter', 'reference'],
      'notes': ['note', 'reference'],
      'review': ['verse', 'note']
    };
    
    const compatibleTypes = compatibilityMap[this.type] || [];
    return compatibleTypes.includes(resource.type);
  }
}
```

### Resource Coordination

Resources can be coordinated across multiple panels:

```typescript
class ResourceCoordinator {
  private coordinations = new Map<string, ResourceCoordination>();
  
  addCoordination(coordination: ResourceCoordination): void {
    this.coordinations.set(coordination.id, coordination);
    
    // Set up signal handlers for coordination
    this.setupCoordinationHandlers(coordination);
  }
  
  private setupCoordinationHandlers(coordination: ResourceCoordination): void {
    // Listen for resource selection changes
    signalBus.onGlobal('RESOURCE_SELECTED', async (signal) => {
      if (coordination.panels.includes(signal.source.panelId)) {
        await this.executeCoordination(coordination, signal);
      }
    });
  }
  
  private async executeCoordination(
    coordination: ResourceCoordination, 
    triggerSignal: Signal
  ): Promise<void> {
    const { resourceId } = triggerSignal.payload;
    
    // Find related resources
    const relatedResources = await this.findRelatedResources(
      resourceId, 
      coordination.type
    );
    
    // Update coordinated panels
    for (const panelId of coordination.panels) {
      if (panelId !== triggerSignal.source.panelId) {
        const panel = panelManager.getPanel(panelId);
        if (panel && relatedResources.length > 0) {
          await panel.setActiveResource(relatedResources[0].id);
        }
      }
    }
  }
}
```

## Resource Persistence

### Local Storage

```typescript
class LocalResourceStorage {
  private storageKey = 'panel-system-resources';
  
  async saveResource(resource: ResourceAPI): Promise<void> {
    const stored = this.getStoredResources();
    stored[resource.id] = {
      ...resource,
      metadata: {
        ...resource.metadata,
        lastSaved: Date.now()
      }
    };
    
    localStorage.setItem(this.storageKey, JSON.stringify(stored));
  }
  
  async loadResource(resourceId: string): Promise<ResourceAPI | undefined> {
    const stored = this.getStoredResources();
    return stored[resourceId];
  }
  
  async loadResourcesByType(type: string): Promise<ResourceAPI[]> {
    const stored = this.getStoredResources();
    return Object.values(stored).filter(resource => resource.type === type);
  }
  
  private getStoredResources(): Record<string, ResourceAPI> {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : {};
  }
}
```

### Database Storage

```typescript
class DatabaseResourceStorage {
  constructor(private db: Database) {}
  
  async saveResource(resource: ResourceAPI): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO resources (id, type, data, metadata)
      VALUES (?, ?, ?, ?)
    `;
    
    await this.db.execute(query, [
      resource.id,
      resource.type,
      JSON.stringify(resource.data),
      JSON.stringify(resource.metadata)
    ]);
  }
  
  async loadResource(resourceId: string): Promise<ResourceAPI | undefined> {
    const query = 'SELECT * FROM resources WHERE id = ?';
    const result = await this.db.query(query, [resourceId]);
    
    if (result.length === 0) return undefined;
    
    const row = result[0];
    return {
      id: row.id,
      type: row.type,
      data: JSON.parse(row.data),
      metadata: JSON.parse(row.metadata)
    };
  }
  
  async searchResources(criteria: SearchCriteria): Promise<ResourceAPI[]> {
    let query = 'SELECT * FROM resources WHERE 1=1';
    const params: any[] = [];
    
    if (criteria.type) {
      query += ' AND type = ?';
      params.push(criteria.type);
    }
    
    if (criteria.textSearch) {
      query += ' AND (data LIKE ? OR metadata LIKE ?)';
      params.push(`%${criteria.textSearch}%`, `%${criteria.textSearch}%`);
    }
    
    const results = await this.db.query(query, params);
    return results.map(row => ({
      id: row.id,
      type: row.type,
      data: JSON.parse(row.data),
      metadata: JSON.parse(row.metadata)
    }));
  }
}
```

## Resource Search and Filtering

```typescript
class ResourceSearchEngine {
  private resources = new Map<string, ResourceAPI>();
  private searchIndex = new Map<string, Set<string>>();
  
  indexResource(resource: ResourceAPI): void {
    this.resources.set(resource.id, resource);
    
    // Index searchable text
    const searchableText = this.extractSearchableText(resource);
    const words = searchableText.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, new Set());
      }
      this.searchIndex.get(word)!.add(resource.id);
    });
  }
  
  search(query: string): ResourceAPI[] {
    const words = query.toLowerCase().split(/\s+/);
    let matchingIds: Set<string> | undefined;
    
    // Find intersection of all word matches
    words.forEach(word => {
      const wordMatches = this.searchIndex.get(word) || new Set();
      if (matchingIds === undefined) {
        matchingIds = new Set(wordMatches);
      } else {
        matchingIds = new Set([...matchingIds].filter(id => wordMatches.has(id)));
      }
    });
    
    // Return matching resources
    return Array.from(matchingIds || [])
      .map(id => this.resources.get(id))
      .filter(resource => resource !== undefined) as ResourceAPI[];
  }
  
  filterByType(type: string): ResourceAPI[] {
    return Array.from(this.resources.values())
      .filter(resource => resource.type === type);
  }
  
  filterByMetadata(key: string, value: any): ResourceAPI[] {
    return Array.from(this.resources.values())
      .filter(resource => resource.metadata?.[key] === value);
  }
  
  private extractSearchableText(resource: ResourceAPI): string {
    const parts: string[] = [];
    
    // Add resource ID and type
    parts.push(resource.id, resource.type);
    
    // Add data fields
    if (resource.data) {
      this.extractTextFromObject(resource.data, parts);
    }
    
    // Add metadata fields
    if (resource.metadata) {
      this.extractTextFromObject(resource.metadata, parts);
    }
    
    return parts.join(' ');
  }
  
  private extractTextFromObject(obj: any, parts: string[]): void {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        parts.push(value);
      } else if (typeof value === 'number') {
        parts.push(value.toString());
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'string') parts.push(item);
        });
      }
    }
  }
}
```

## Best Practices

### 1. Resource Design

```typescript
// Good - focused, single responsibility
interface VerseResource {
  type: 'verse';
  data: {
    book: string;
    chapter: number;
    verse: number;
    text: string;
  };
}

// Avoid - too many responsibilities
interface MegaResource {
  type: 'everything';
  data: {
    verses: any[];
    notes: any[];
    references: any[];
    translations: any[];
    // ... too much
  };
}
```

### 2. Resource Validation

```typescript
class ResourceValidator {
  static validateVerse(resource: VerseResource): ValidationResult {
    const errors: string[] = [];
    
    if (!resource.data.book) {
      errors.push('Book name is required');
    }
    
    if (!resource.data.chapter || resource.data.chapter < 1) {
      errors.push('Valid chapter number is required');
    }
    
    if (!resource.data.verse || resource.data.verse < 1) {
      errors.push('Valid verse number is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

### 3. Resource Cleanup

Always clean up resources properly to prevent memory leaks:

```typescript
class ResourceManager {
  async removeResource(resourceId: string): Promise<void> {
    const resource = this.resources.get(resourceId);
    if (resource && resource.unmount) {
      await resource.unmount();
    }
    this.resources.delete(resourceId);
  }
}
``` 