# Translation Studio Web - Architecture Map

## Overview

A layered web application for viewing and comparing biblical resources from Door43 repositories.

## Core Principles

1. **Clear Layer Separation** - Each layer has a single responsibility
2. **Data Flow Down** - Configuration and navigation flow down through layers
3. **Smart Resource Management** - Context → Cache → API priority
4. **Library Integration** - Use our internal libraries (door43-api, offline-cache, linked-panels)
5. **Central Scripture Foundation** - ULT/GLT provides navigation structure (books, chapters, verses)
6. **UI Framework Agnostic** - Business logic separated from UI framework for React/React Native/other portability
7. **Modular Resource System** - Each resource type is a self-contained, reusable module with standardized cache hierarchy

## Layer Architecture

**Note**: Each layer represents a logical grouping of components, not necessarily a single component. This allows for extensibility and separation of concerns within each layer.

```
┌─────────────────────────────────────────────────────────────┐
│ UI Framework Layer (Platform-Specific)                     │
│ React Web: App.tsx, BrowserRouter, DOM components          │
│ React Native: App.tsx, NavigationContainer, Native views   │
│ - Platform-specific routing and navigation                  │
│ - Platform-specific UI components and styling              │
│ - Platform-specific error boundaries and lifecycle         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│ Business Logic Layer (Framework-Agnostic)                  │
│ Core: WorkspaceLogic, NavigationLogic, ResourceLogic       │
│ - Pure business logic with no UI dependencies              │
│ - State management and data transformations                │
│ - Cross-platform business rules and workflows              │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer (UI Framework Adapters)                 │
│ React: WorkspaceProvider.tsx, ConfigPanel.tsx              │
│ React Native: WorkspaceProvider.tsx, ConfigScreen.tsx      │
│ - Framework-specific context providers                     │
│ - UI framework adapters for business logic                 │
│ - Platform-specific component implementations              │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│ Panels Layer (LinkedPanels Integration)                    │
│ React: PanelsConfig.tsx, NavigationBar.tsx                 │
│ React Native: PanelsConfig.tsx, NavigationHeader.tsx       │
│ - LinkedPanelsContainer with resource definitions           │
│ - Panel-to-panel communication via signals API             │
│ - Navigation State (book/chapter/verse)                     │
│ - URL/Deep-link Synchronization                            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│ Resource Layer (Extensible)                                 │
│ React: ResourceFactory.tsx, ScriptureResource.tsx          │
│ React Native: ResourceFactory.tsx, ScriptureScreen.tsx     │
│ - Resource-specific fetching logic (shared)                │
│ - Platform-agnostic caching (Context → Storage → API)      │
│ - Platform-specific rendering components                   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│ Services Layer (Platform-Agnostic)                         │
│ Shared: StorageAdapter, BibleService, AudioService         │
│ - Pure TypeScript/JavaScript business logic                │
│ - Platform-agnostic data fetching and processing           │
│ - Storage abstraction with platform-specific adapters     │
└─────────────────────────────────────────────────────────────┘
```

## Application Flow

### 1. Reactive State Flow (Continuous)

```
URL Change → React Effects → State Updates → Component Re-renders → UI Updates
```

**React Pattern**: The app continuously reacts to URL changes through React hooks and effects.

**Workspace-Level Reactions** (Owner/Language changes):

- **Trigger**: URL owner or language parameter changes
- **Effect**: Reset workspace context, clear previous repositories
- **Action**: Initialize new resource modules for new workspace
- **Result**: New navigation metadata, available books list

**Navigation-Level Reactions** (Book changes):

- **Trigger**: URL book parameter changes  
- **Effect**: Keep workspace context, check if book is loaded
- **Action**: Load book from resource module if not cached
- **Result**: Updated navigation state, new book content available

**Reference-Level Reactions** (Reference changes):

- **Trigger**: URL reference parameter changes
- **Effect**: Keep all contexts unchanged
- **Action**: Parse new reference string, update navigation range
- **Result**: Resources filter content to new range, instant UI update

### 2. State Change Hierarchy

```
Workspace Changes → Navigation Changes → Resource Changes → UI Updates
```

**Change Scope Hierarchy**:

**Level 1 - Workspace Scope** (Most Expensive):

- **Changes**: Owner or language in URL
- **Impact**: Full workspace reset, new repository initialization
- **Performance**: Network requests, cache operations, full re-render

**Level 2 - Navigation Scope** (Moderate Cost):

- **Changes**: Book code in URL  
- **Impact**: Book loading if not cached, navigation metadata update
- **Performance**: Possible network request, selective re-render

**Level 3 - Reference Scope** (Cheapest):

- **Changes**: Reference parameter in URL
- **Impact**: Content filtering only, no state changes
- **Performance**: No network requests, instant filtering

## Context Architecture

The application uses **layered contexts** to handle different scopes of state changes efficiently:

### WorkspaceContext (Owner/Language Scope)

**Resets when**: Owner or language changes  
**Contains**:

- Current owner/language configuration
- **Resource Metadata** (lightweight, loaded immediately):
  - `resourceMetadata` - UI information for dropdowns, tabs, navigation:
    ```
    resourceMetadata: {
      "en_ult": { title: "English ULT", description: "Literal Translation", type: "scripture", subtype: "ult" },
      "en_glt": { title: "Gateway Language", description: "Clear Translation", type: "scripture", subtype: "glt" },
      "en_ust": { title: "English UST", description: "Simplified Translation", type: "scripture", subtype: "ust" },
      "en_tn": { title: "Translation Notes", description: "Explanatory notes", type: "tn", subtype: null },
      "en_tw": { title: "Translation Words", description: "Key terms", type: "tw", subtype: null },
      "en_ta": { title: "Translation Academy", description: "Translation help", type: "ta", subtype: null }
    }
    ```
- **Resource Component Registry** (maps types to components):
  - `componentRegistry` - Defines which component renders each resource type:
    ```
    componentRegistry: {
      "scripture": ScriptureResourceComponent,  // Handles ult, glt, ust subtypes
      "tn": NotesResourceComponent,            // Translation Notes
      "tw": WordsResourceComponent,            // Translation Words  
      "ta": AcademyResourceComponent,          // Translation Academy
      "audio": AudioResourceComponent,         // Audio resources
      "video": VideoResourceComponent          // Video resources
    }
    ```
- **Processed Book Content** (heavy, loaded on-demand):
  - `processedBooks` - Full book data loaded when resource component mounts:
    ```
    processedBooks: {
      "en_ult": { jon: ProcessedBook, tit: ProcessedBook },
      "en_glt": { jon: ProcessedBook },
      "en_ust": { jon: ProcessedBook },
      "en_tn": { jon: ProcessedNotes },
      "en_tw": { jon: ProcessedWords }
    }
    ```
- **Resource Cross-References** - Links between resources for navigation:
    ```
    resourceLinks: {
      "en_ult": { related: ["en_ust", "en_tn"], fallback: "en_glt" },
      "en_ust": { related: ["en_ult", "en_tn"], fallback: "en_gst" },
      "en_tn": { sourceTexts: ["en_ult", "en_ust"] }
    }
    ```
- **Loading States** per resource ID and book

### NavigationContext (Book/Reference Scope)  

**Updates when**: Book or reference changes  
**Contains**:

- Current book code
- Current reference range (chapter:verse-chapter:verse)
- Parsed navigation state
- Book validation status across all resource services
- Cross-resource navigation synchronization

### ResourceContext (Panel/Resource Scope)

**Updates when**: Panel resources change or navigation filters  
**Contains**:

- **Individual Resource Data** (each resource manages its own):
  - Each resource component has access only to its own processed book data
  - Scripture component → its own scripture data
  - Notes component → its own notes data  
  - Words component → its own words data
  - Audio component → its own audio data
- **Resource States**:
  - Loading states per resource type
  - Error states per resource type
  - Cache freshness indicators
- **Inter-Panel Communication** (via LinkedPanels):
  - Message sending/receiving capabilities per resource
  - Cross-resource alignment data and relationships
  - Shared interaction state (highlights, selections, focus)

## Services vs Context Separation

**Services**: Live **outside** contexts as **stateless utilities**
- Injected as dependencies or imported as modules
- Handle data fetching, processing, and caching operations
- **Pure functions**: Input parameters → Output data
- No internal state, no React context dependencies

**Contexts**: Hold **state/data** produced by services
- Store the **results** of service operations
- Manage **React state** and **component re-renders**
- Handle **state updates** and **change notifications**
- Provide data to components via React context

**Two-Phase Resource Loading Pattern**:

**Phase 1 - Metadata Loading (Immediate)**:
```
Workspace Initializes → Load Resource Metadata → Populate UI (Dropdowns, Tabs, Navigation)
```

**Phase 2 - Content Loading (On-Demand)**:
```
ResourceComponent Mounts → Check Book Content → If Missing: Call Service → Store Full Book → Filter & Render
```

**Detailed Loading Strategy**:

**Phase 1 - UI Preparation**:
1. **Workspace loads**: Calls services for metadata only (title, description, name)
2. **Fast response**: Metadata is lightweight, quick to fetch/cache
3. **UI ready**: Dropdowns, tabs, navigation populated immediately
4. **No book content**: Heavy book data not loaded yet

**Phase 2 - Content On-Demand**:
1. **Resource component mounts**: User selects resource in panel
2. **Check context**: Is full book content already loaded?
3. **If missing**: Call service to get complete book data
4. **Service optimization**: Cache hit vs network fetch decision
5. **Store full book**: Complete processed book stored in context
6. **Component receives full book**: Resource component gets complete book data
7. **Internal filtering**: Component filters content internally based on navigation range
8. **Independent reactivity**: Each resource decides how to react to navigation changes

## Resource Component Interface

**What Resource Components Receive**:

1. **Their Own Processed Book Data** (accessed by resource ID):
   - Resource ID matches WorkspaceContext key (e.g., "en_ult", "en_tn")
   - Only the data belonging to that specific resource ID
   - Complete book content for their resource (not pre-filtered)
   - Example: `processedBooks["en_ult"][currentBook]`

2. **Resource Cross-Reference Information**:
   - Links to related resources for navigation (e.g., "en_ult" → ["en_ust", "en_tn"])
   - Fallback resource IDs for unavailable content
   - Source text relationships for notes and words

3. **Shared Reference Range** (from NavigationContext):
   - `chapter` - Starting chapter number
   - `verse` - Starting verse number  
   - `endChapter` - Ending chapter (for ranges)
   - `endVerse` - Ending verse (for ranges)
   - Note: Book code not needed since processed data is already book-specific

**What Resource Components Do**:

- **Internal Filtering**: Use reference range to filter book data
- **Custom Logic**: Each resource type implements its own filtering strategy
- **Reactive Rendering**: Re-filter when reference range changes
- **Independent Behavior**: Decide whether to react to navigation or not
- **Inter-Panel Communication**: Send and receive messages to coordinate with other resources
- **Alignment Processing**: Handle word/content alignment data for cross-panel highlighting
- **Interactive Coordination**: Respond to user interactions from other panels

**Example Component Logic**:
```
ScriptureComponent (resourceId: "en_ult"):
  - Receives: processedBooks["en_ult"][currentBook] + reference range (1:4-2:6)
  - Cross-refs: resourceLinks["en_ult"].related = ["en_ust", "en_tn"]
  - Filters: Extract chapters 1-2, verses 4-6 and 1-6 respectively
  - Renders: Only the verses within the range
  - Navigation: Can navigate to "en_ust" or "en_tn" via LinkedPanels

NotesComponent (resourceId: "en_tn"):
  - Receives: processedBooks["en_tn"][currentBook] + reference range (1:4-2:6)
  - Cross-refs: resourceLinks["en_tn"].sourceTexts = ["en_ult", "en_ust"]  
  - Filters: Find notes with references matching the range
  - Renders: Only notes for verses 1:4, 1:5, 1:6, 2:1, 2:2, 2:3, 2:4, 2:5, 2:6
  - Navigation: Can navigate to source texts via LinkedPanels

WordsComponent (resourceId: "en_tw"):
  - Receives: processedBooks["en_tw"][currentBook] + reference range (1:4-2:6)
  - Cross-refs: resourceLinks["en_tw"].sourceTexts = ["en_ult", "en_ust"]
  - Filters: May ignore range completely
  - Renders: All words for the book (not range-specific)
  - Navigation: Can navigate to source texts where words appear
```

**Data Isolation**:
- Scripture component cannot access notes data
- Notes component cannot access scripture data  
- Each resource is completely isolated and self-contained
- Only the reference range is shared across all resources

**Cross-Panel Coordination**:
- Resources communicate via LinkedPanels messaging system
- Alignment data enables content relationships between resources
- Interactive state (highlights, selections) shared across panels
- Message-based coordination maintains resource isolation while enabling collaboration

## Resource Component Factory System

### Component Type Mapping

The application uses a **factory pattern** to dynamically create the appropriate component for each resource:

**Resource Type Classification:**
- **Primary Type** - Main category (e.g., "scripture", "tn", "tw", "ta")
- **Subtype** - Variant within type (e.g., "ult", "glt", "ust" for scripture)
- **Component Mapping** - Type → Component class relationship

**Factory Resolution Logic:**
```
ResourceId → ResourceMetadata → Type → ComponentRegistry → Component
```

**Example Mapping:**
- `"en_ult"` → `type: "scripture"` → `ScriptureResourceComponent`
- `"en_tn"` → `type: "tn"` → `NotesResourceComponent`  
- `"en_tw"` → `type: "tw"` → `WordsResourceComponent`
- `"en_ta"` → `type: "ta"` → `AcademyResourceComponent`

**Component Specialization:**
- **ScriptureResourceComponent** - Handles all scripture subtypes (ult, glt, ust, gst)
- **NotesResourceComponent** - Specialized for translation notes format and cross-references
- **WordsResourceComponent** - Optimized for word definitions and concordance features
- **AcademyResourceComponent** - Designed for article-based content with navigation
- **UnknownResourceComponent** - Fallback for unrecognized resource types

**Dynamic Resource Creation:**
- LinkedPanels receives resource list with IDs: `["en_ult", "en_tn", "en_tw"]`
- ResourceFactory maps each ID to appropriate component via type lookup
- Components are instantiated with their specific resource ID and data access
- Same component class can handle multiple resource instances (e.g., "en_ult" and "es_ult")

**Performance Benefits**:
- **No Unnecessary Fetching**: Resources only load when actually needed
- **Book-Level Storage**: Full book stored once locally, filtered multiple times
- **Service-Level Optimization**: Services decide local storage vs network fetch intelligently
- **Instant Navigation**: Reference changes trigger internal filtering within components
- **Responsive UI**: Large book files don't block initial panel loading

**Example Scenarios**:

**Scenario 1 - App Initialization**:
- Workspace loads → services return metadata for ULT, GLT, TN, TW
- UI immediately shows: "English ULT", "Translation Notes" in dropdowns
- No book content loaded yet → fast initial load

**Scenario 2 - User Selects Resource**:
- User clicks "ULT" in panel dropdown
- ULT component mounts → checks context for Jonah book content
- Not found → calls scripture resource module → gets full Jonah book (from IndexedDB or network)
- Component receives full Jonah book → filters internally to current reference (1:4-6) → renders

**Scenario 3 - Navigation Change**:
- User navigates from Jonah 1:4-6 to Jonah 2:1-3
- ULT component has full Jonah book → filters internally to new range → instant render
- TN component (if mounted) has full Jonah notes → filters internally → instant render
- Each resource reacts independently to navigation

**Scenario 4 - Same Book, Different Panel**:
- User opens second panel, selects ULT for Jonah
- Component mounts → finds Jonah book already in context → instant render
- No service calls, no IndexedDB access, no network requests

**Scenario 5 - Resource-Specific Reactivity**:
- User navigates to different verse range
- Scripture resources: Receive full book → filter internally → show verses in range
- Translation Notes: Receive full notes → filter internally → show notes for verses in range  
- Audio resources: Receive full audio → calculate time segments internally → play range
- Translation Words: Receive full words → may not filter at all (shows all words)

**Scenario 6 - Cross-Panel Word Alignment**:
- User hovers word in ULT scripture panel (resourceId: "en_ult")
- ULT component sends alignment message via LinkedPanels to "en_ust" and "en_tn"
- UST component (resourceId: "en_ust") receives message → highlights corresponding aligned word
- Notes component (resourceId: "en_tn") receives message → highlights related translation note
- All highlighting coordinated in real-time using consistent resource IDs

**Scenario 7 - Cross-Reference Navigation**:
- User clicks cross-reference link in "en_ult" scripture
- ULT component checks resourceLinks["en_ult"].related = ["en_ust", "en_tn"]
- Sends navigation command to LinkedPanels: navigate panel to "en_tn" resource
- Notes panel switches to show "en_tn" resource for the referenced verse
- Resource IDs ensure consistent navigation across WorkspaceContext and LinkedPanels

## Purpose of Resource Services

**Core Responsibility**: Each service handles the **complete lifecycle** of a specific resource type from Door43 repositories.

**What Services Do**:
1. **Data Fetching**: Download resources from Door43 API (git.door43.org)
2. **Data Processing**: Transform raw data into structured, usable formats
3. **Storage Management**: Store processed data with hierarchical organization in IndexedDB
4. **Navigation Filtering**: Filter content based on current book/chapter/verse range
5. **Platform Abstraction**: Work consistently across browser, mobile, desktop

**Why Separate Services**:
- **Different Data Formats**: Scripture (USFM), Notes (TSV), Words (Markdown), Audio (MP3)
- **Different Processing**: Each format requires specific parsing and structuring
- **Different Storage Strategies**: Some resources are book-based, others are reference-based
- **Independent Updates**: Services can be updated without affecting others
- **Specialized Logic**: Each resource type has unique validation and filtering rules

**Service Interface Pattern**:
- `getRepository(owner, language, resourceType)` - Get resource repository
- `getResource(bookCode, navigationRange)` - Get filtered resource content
- Hierarchical storage: `server → owner → language → resource → content`
- Navigation reactivity: Filter content by reference range

**Benefits of This Architecture**:

- **Extensible**: Easy to add new resource services
- **Consistent**: All resources follow same patterns
- **Efficient**: Only relevant contexts reset/update
- **Synchronized**: All resources react to same navigation changes
- **Isolated**: Different resource types don't interfere with each other

### 3. Data Flow Hierarchy

```
Configuration Flow:    Workspace → Panels → Resources
Navigation Flow:       Panels → Resources (filter content)
Resource Flow:         Context → IndexedDB → API → Display
```

### 4. Resource Loading Flow

```
Text Resources: Context → IndexedDB → API → Process → Store in IndexedDB → Display
Media Resources: Context → IndexedDB Metadata → Cache API → API → Store in Cache → Update Metadata → Display
```

**Priority Order:**

1. **Context**: Already loaded resources in workspace (volatile memory)
2. **IndexedDB**: Text resources and media metadata
3. **Cache API**: Large media files (audio, video, images)
4. **API**: Fresh fetch from Door43 repositories (network)
5. **Process**: Filter content by navigation range
6. **Display**: Render in appropriate panel

## Navigation System

### URL Structure

```
/{owner}/{language}/{bookCode}?ref={reference}
```

**Reference Format Examples:**

- `/unfoldingWord/en/tit` → Titus 1:1 (default)
- `/unfoldingWord/en/tit?ref=2` → Titus chapter 2 (whole chapter)
- `/unfoldingWord/en/tit?ref=2:5` → Titus 2:5 (single verse)
- `/unfoldingWord/en/mat?ref=5:3-7` → Matthew 5:3-7 (verse range in same chapter)
- `/unfoldingWord/en/jon?ref=1:4-2:6` → Jonah 1:4 to 2:6 (cross-chapter range)

**Reference String Patterns:**

- `1` → Chapter 1 (whole chapter)
- `1:1` → Chapter 1, verse 1
- `1:1-3` → Chapter 1, verses 1-3
- `1:1-2:4` → Chapter 1 verse 1 to chapter 2 verse 4

**Defaults:**

- Owner: `unfoldingWord`
- Language: `en`
- Book: `tit` (Titus)
- Reference: `1:1` (chapter 1, verse 1)

### Central Scripture System

**Purpose:** Provides foundational navigation structure (books, chapters, verses)

**Central Scripture Priority** (for navigation foundation):

1. **ULT** (Literal Translation) - Primary choice
2. **GLT** (Gateway Language) - Fallback if ULT unavailable

**Navigation Metadata:**

- Available books list
- Chapter/verse structure for each book
- Foundation for all resource alignment

## Panel Communication System

### LinkedPanels Integration

The application uses the `linked-panels` library for **inter-panel communication** and **synchronized interactions**:

**Core Communication Patterns:**

- **Navigation Synchronization** - Coordinate navigation state across panels
- **Content Alignment** - Highlight related content between different resources
- **State Broadcasting** - Share application state changes across all panels
- **Interactive Coordination** - Real-time user interaction feedback between panels

**Message Lifecycle Management:**

- **State Messages** - Persistent data that supersedes previous values (current highlights, navigation state)
- **Event Messages** - Temporary notifications with TTL (user interactions, content updates)
- **Command Messages** - One-time actions consumed after processing (navigation commands, UI actions)

**Cross-Panel Coordination Examples:**

- **Word Alignment Highlighting** - Hover word in ULT → highlight corresponding word in UST and related notes
- **Navigation Synchronization** - Navigate to verse in one panel → all panels update to same reference
- **Content Relationships** - Select translation note → highlight referenced scripture text across panels
- **Interactive Feedback** - User actions in one resource trigger visual feedback in related resources
- **Resource Navigation** - Click cross-reference in scripture → navigate notes panel to related translation note
- **Contextual Switching** - Select difficult word → automatically switch words panel to show definition
- **Workflow Navigation** - Complete review step → auto-navigate next panel to next workflow resource

**Communication Flow:**

```
User Interaction → Resource Component → Message Broadcast → Related Resources React → UI Updates
```

## Resource Types

### Central Scripture (Navigation Foundation)

- **ULT** (ult) - Literal translation ⭐ *Primary*
- **GLT** (glt) - Gateway Language translation ⭐ *Fallback*

### Scripture Resources (Independent)

- **UST** (ust) - Simplified translation
  - **GST** (gst) - Gateway Simplified Translation ⭐ *Fallback for UST*

### Study Resources

- **TN** (tn) - Translation Notes
- **TW** (tw) - Translation Words
- **TA** (ta) - Translation Academy

### Future Resources

- **Audio** (audio) - Scripture recordings
- **Video** (video) - Sign language/teaching
- **Images** (images) - Biblical illustrations
- **Commentary** (commentary) - Theological notes

## Navigation Reactivity

All resources filter content based on current navigation range.

### Navigation Range Types

- **Single verse**: `Jonah 1:4`
- **Verse range**: `Jonah 1:4-6` (within chapter)
- **Cross-chapter**: `Jonah 1:4 to 2:6`
- **Whole chapter**: `Jonah 2` (all verses)

### Resource Filtering

- **Scripture**: Shows only verses in range
- **Notes**: Shows notes for verses in range
- **Audio**: Plays audio segment for range
- **Future resources**: Apply range-specific logic

## Core Data Model & Interfaces

### Base Resource Interface

```typescript
interface BaseResource {
  // Resource identification
  id: string                    // "en_ult", "en_tn", "en_ta"
  type: ResourceType           // "scripture", "notes", "academy", "words", "audio", "video"
  subtype?: string             // "ult", "glt", "ust" for scripture
  
  // Metadata
  title: string                // "English ULT", "Translation Notes"
  description: string          // Human-readable description
  language: string             // "en", "es-419"
  owner: string               // "unfoldingWord", "es-419_gl"
  server: string              // "door43.org"
  
  // Navigation behavior
  navigationMode: NavigationMode  // "reactive", "independent", "hybrid"
  
  // Cross-resource relationships
  links: ResourceLinks
  
  // Content structure
  contentStructure: ContentStructure
  
  // Cache metadata
  lastUpdated: Date
  version: string
}

enum ResourceType {
  SCRIPTURE = "scripture",
  NOTES = "notes", 
  WORDS = "words",
  ACADEMY = "academy",
  AUDIO = "audio",
  VIDEO = "video",
  IMAGES = "images"
}

enum NavigationMode {
  REACTIVE = "reactive",      // Reacts to book/reference changes (Scripture, Notes)
  INDEPENDENT = "independent", // Ignores navigation, has own state (Academy browser)
  HYBRID = "hybrid"          // Can switch between reactive and independent (Words)
}
```

### Resource Content Structures

```typescript
// Scripture Resources (ULT, UST, GLT, GST)
interface ScriptureContent extends BaseResource {
  type: ResourceType.SCRIPTURE
  navigationMode: NavigationMode.REACTIVE
  contentStructure: {
    type: "book-based"
    books: {
      [bookCode: string]: {
        chapters: {
          [chapterNum: string]: {
            verses: {
              [verseNum: string]: {
                content: string
                markers?: USFMMarker[]
                alignments?: AlignmentData[]
              }
            }
          }
        }
      }
    }
  }
}

// Translation Notes
interface NotesContent extends BaseResource {
  type: ResourceType.NOTES
  navigationMode: NavigationMode.REACTIVE
  contentStructure: {
    type: "reference-based"
    books: {
      [bookCode: string]: {
        notes: {
          [reference: string]: {  // "1:4", "2:6-8"
            id: string
            content: string
            title?: string
            links: CrossReference[]  // Links to TA articles, TW entries
          }
        }
      }
    }
  }
}

// Translation Academy (Independent Navigation)
interface AcademyContent extends BaseResource {
  type: ResourceType.ACADEMY
  navigationMode: NavigationMode.INDEPENDENT
  contentStructure: {
    type: "hierarchical"
    categories: {
      [categoryId: string]: {
        title: string
        description: string
        articles: {
          [articleId: string]: {
            id: string
            title: string
            content: string
            tags: string[]
            relatedArticles: string[]  // Other TA article IDs
            examples?: ScriptureReference[]  // Optional scripture examples
          }
        }
      }
    }
  }
}

// Translation Words (Hybrid Navigation)
interface WordsContent extends BaseResource {
  type: ResourceType.WORDS
  navigationMode: NavigationMode.HYBRID
  contentStructure: {
    type: "word-based"
    words: {
      [wordId: string]: {
        id: string
        term: string
        definition: string
        occurrences: ScriptureReference[]  // Where this word appears
        relatedWords: string[]  // Other TW word IDs
        taLinks: string[]      // Links to TA articles
      }
    }
  }
}
```

### Cross-Resource Linking System

```typescript
interface ResourceLinks {
  // Static relationships (defined in metadata)
  related: string[]           // ["en_ust", "en_tn"] - related resources
  fallback?: string          // "en_glt" - fallback resource
  sourceTexts?: string[]     // ["en_ult", "en_ust"] - for notes/words
  
  // Dynamic cross-references (content-based)
  crossReferences: CrossReferenceMap
}

interface CrossReferenceMap {
  // Outgoing links from this resource
  outgoing: {
    [contentId: string]: CrossReference[]
  }
  
  // Incoming links to this resource  
  incoming: {
    [contentId: string]: CrossReference[]
  }
}

interface CrossReference {
  // Source information
  sourceResource: string      // "en_tn"
  sourceContent: string       // "jon_1:4_note1"
  
  // Target information
  targetResource: string      // "en_ta"
  targetContent: string       // "translate/figs-metaphor"
  
  // Link metadata
  linkType: CrossReferenceType
  displayText?: string        // "Learn about metaphors"
  context?: string           // Additional context for the link
}

enum CrossReferenceType {
  EXPLANATION = "explanation",    // TN → TA (explains concept)
  DEFINITION = "definition",      // TN → TW (defines word)
  EXAMPLE = "example",           // TA → Scripture (shows example)
  RELATED = "related",           // General relationship
  ALIGNMENT = "alignment"        // Word alignment between resources
}
```

### Navigation State & Resource Reactivity

```typescript
interface NavigationState {
  // Current navigation context
  book: string                // "jon"
  chapter: number            // 1
  verse: number              // 4
  endChapter?: number        // 2 (for ranges)
  endVerse?: number          // 6 (for ranges)
  
  // Resource-specific navigation states
  resourceStates: {
    [resourceId: string]: ResourceNavigationState
  }
}

interface ResourceNavigationState {
  // For reactive resources (Scripture, Notes)
  currentReference?: ScriptureReference
  
  // For independent resources (Academy)
  currentCategory?: string    // "translate"
  currentArticle?: string     // "figs-metaphor"
  
  // For hybrid resources (Words)
  mode: NavigationMode       // "reactive" or "independent"
  currentWord?: string       // When in independent mode
  
  // Modal/popup state
  modalContent?: ModalContent
}

interface ModalContent {
  resourceId: string         // "en_ta"
  contentId: string         // "translate/figs-metaphor"
  triggerSource: {
    resourceId: string       // "en_tn"
    contentId: string        // "jon_1:4_note1"
  }
}
```

### Resource Component Interface (Updated)

```typescript
interface ResourceComponentProps {
  // Resource identification
  resourceId: string         // "en_ult", "en_tn", "en_ta"
  
  // Resource data (full content)
  resourceData: BaseResource
  
  // Navigation context (shared)
  navigationState: NavigationState
  
  // Cross-resource communication
  onCrossReference: (crossRef: CrossReference) => void
  onNavigationChange: (newState: ResourceNavigationState) => void
  
  // Modal management
  onShowModal: (content: ModalContent) => void
  onHideModal: () => void
  
  // Panel context
  panelId: string           // For LinkedPanels messaging
}

// Resource component behavior based on navigation mode
interface ResourceBehavior {
  // Reactive resources (Scripture, Notes)
  reactive: {
    // Automatically filter content based on navigation range
    filterContent: (content: any, reference: ScriptureReference) => any
    
    // React to navigation changes
    onNavigationChange: (newReference: ScriptureReference) => void
  }
  
  // Independent resources (Academy)
  independent: {
    // Maintain own navigation state
    currentState: ResourceNavigationState
    
    // Navigate within resource
    navigateTo: (contentId: string) => void
    
    // Ignore external navigation changes
    ignoreNavigation: true
  }
  
  // Hybrid resources (Words)
  hybrid: {
    // Switch between modes
    setMode: (mode: NavigationMode) => void
    
    // Conditional behavior based on current mode
    getCurrentBehavior: () => ResourceBehavior["reactive"] | ResourceBehavior["independent"]
  }
}
```

### Example Usage Scenarios

```typescript
// Scenario 1: Translation Note links to Academy Article
const translationNote = {
  id: "jon_1:4_note1",
  content: "This is a metaphor. See how metaphors work.",
  links: [{
    targetResource: "en_ta",
    targetContent: "translate/figs-metaphor",
    linkType: CrossReferenceType.EXPLANATION,
    displayText: "Learn about metaphors"
  }]
}

// User clicks link → triggers modal
onCrossReference({
  sourceResource: "en_tn",
  sourceContent: "jon_1:4_note1", 
  targetResource: "en_ta",
  targetContent: "translate/figs-metaphor",
  linkType: CrossReferenceType.EXPLANATION
})

// Scenario 2: Independent Academy Resource
const academyResource = {
  navigationMode: NavigationMode.INDEPENDENT,
  currentState: {
    currentCategory: "translate",
    currentArticle: "figs-metaphor"
  }
  // This resource ignores book/verse navigation
  // User can browse all articles independently
}

// Scenario 3: Hybrid Words Resource
const wordsResource = {
  navigationMode: NavigationMode.HYBRID,
  currentState: {
    mode: NavigationMode.REACTIVE  // Currently showing words for current verse
  }
}

// User switches to independent mode
wordsResource.setMode(NavigationMode.INDEPENDENT)
// Now shows all words, user can browse independently
```

## Lazy Loading & On-Demand Resource System

### Universal Resource Resolver Interface

```typescript
interface ResourceResolver {
  // Universal content resolution
  resolveContent<T>(request: ContentRequest): Promise<ContentResponse<T>>
  
  // Resource-level metadata (dual extraction)
  resolveResourceMetadata(request: ResourceMetadataRequest): Promise<ResourceMetadata>
  
  // Content-level metadata (fast)
  resolveContentMetadata(request: MetadataRequest): Promise<ContentMetadata>
  
  // Version-based freshness checking (extensible)
  checkContentFreshness(request: ContentRequest, currentVersion: VersionMetadata): Promise<FreshnessResult>
  
  // Batch resolution for performance
  resolveBatch<T>(requests: ContentRequest[]): Promise<ContentResponse<T>[]>
  
  // Check availability without fetching
  isAvailable(request: ContentRequest): Promise<boolean>
  
  // Preload content for performance
  preload(requests: ContentRequest[]): Promise<void>
}

interface FreshnessResult {
  isFresh: boolean         // True if content is up-to-date
  currentVersion: string   // Latest version identifier from server
  needsUpdate: boolean     // True if local content should be updated
  lastModified?: Date      // Server's last modified date
  versionMetadata?: VersionMetadata // Server-specific version info
}

interface VersionMetadata {
  type: VersionType        // How versioning works on this server
  identifier: string       // Version identifier (SHA, timestamp, version number, etc.)
  etag?: string           // HTTP ETag for efficient checking
  lastModified?: Date     // Last modified timestamp
  checksum?: string       // Content checksum (if available)
  revision?: number       // Revision number (for version-based systems)
  serverSpecific?: any    // Server-specific version data
}

enum VersionType {
  GIT_SHA = "git-sha",           // Git-based servers (Door43, GitHub, GitLab)
  TIMESTAMP = "timestamp",        // Timestamp-based versioning
  VERSION_NUMBER = "version",     // Semantic versioning (1.0.0, 1.0.1)
  ETAG = "etag",                 // HTTP ETag-based
  CHECKSUM = "checksum",         // Content checksum (MD5, SHA256)
  REVISION = "revision",         // Revision numbers (1, 2, 3...)
  CUSTOM = "custom"              // Server-specific versioning
}

interface ResourceMetadataRequest {
  server: string           // "door43.org"
  owner: string           // "unfoldingWord"
  language: string        // "en"
  resourceType: string    // "ult", "tn", "ta"
  
  // Options
  includeBooks?: boolean  // Extract book list from manifest
  includeCategories?: boolean // Extract categories (for TA)
  includeWordList?: boolean   // Extract word list (for TW)
}

interface ContentRequest {
  // Resource identification
  server: string              // "door43.org"
  owner: string              // "unfoldingWord"
  language: string           // "en"
  resourceType: string       // "ta", "tn", "tw", "ult"
  
  // Content path (resource-specific)
  contentPath: string        // "translate/figs-metaphor", "books/jon", "words/love"
  
  // Request options
  priority: RequestPriority  // "high", "normal", "low"
  cacheStrategy: CacheStrategy // "cache-first", "network-first", "cache-only"
}

interface ContentResponse<T> {
  // Content data
  content: T
  metadata: ContentMetadata
  
  // Response info
  source: ContentSource      // "cache", "network", "fallback"
  loadTime: number
  cached: boolean
}

interface ContentMetadata {
  // Basic info
  id: string
  title: string
  description?: string
  
  // Content info
  contentType: string        // "article", "book", "note", "word-definition"
  format: string            // "markdown", "usfm", "json", "tsv"
  size: number              // Content size in bytes
  
  // Extensible versioning system
  version: VersionMetadata   // Server-agnostic version information
  cachedAt: Date            // When content was cached locally
  
  // Relationships
  dependencies: string[]     // Other content this depends on
  relatedContent: string[]   // Related content suggestions
}

// Extended metadata for resource-level information
interface ResourceMetadata extends ContentMetadata {
  // Door43 Repository Info (from API)
  repoName: string          // Unique repository name
  fullName: string          // "unfoldingWord/en_ult"
  htmlUrl: string           // Repository URL
  cloneUrl: string          // Git clone URL
  defaultBranch: string     // "master" or "main"
  
  // Resource Container/Scripture Burrito Info (from manifest)
  specification: ResourceSpecification
  manifestData: ManifestData
  
  // Resource-specific content
  availableBooks?: BookMetadata[]     // For scripture resources
  categories?: CategoryMetadata[]     // For academy resources
  wordList?: WordMetadata[]          // For words resources
}

interface ResourceSpecification {
  type: "resource-container" | "scripture-burrito" | "tool-generated"
  version: string           // "0.2", "1.0", etc.
  manifestFile: string      // "manifest.yaml", "metadata.json", etc.
}

interface ManifestData {
  // Common fields across all specifications
  dublin_core: DublinCore
  checking: CheckingInfo
  projects: ProjectInfo[]
  
  // Resource Container specific
  resource?: ResourceContainerInfo
  
  // Scripture Burrito specific
  meta?: ScriptureBurritoMeta
  
  // Tool-generated specific
  toolInfo?: ToolInfo
}

interface DublinCore {
  conformsTo: string        // "rc0.2", "sb1.0"
  contributor: string[]     // ["unfoldingWord"]
  creator: string           // "unfoldingWord"
  description: string       // Resource description
  format: string           // "text/usfm", "text/markdown"
  identifier: string        // "ult", "tn", "ta"
  issued: string           // "2023-01-01"
  language: LanguageInfo
  modified: string         // "2023-06-15"
  publisher: string        // "unfoldingWord"
  relation: string[]       // Related resources
  rights: string           // "CC BY-SA 4.0"
  source: SourceInfo[]
  subject: string          // "Bible"
  title: string            // "English ULT"
  type: string             // "bundle"
  version: string          // "1.0.0"
}

interface LanguageInfo {
  identifier: string       // "en"
  title: string           // "English"
  direction: "ltr" | "rtl"
}

interface BookMetadata {
  identifier: string       // "jon", "tit", "mat"
  title: string           // "Jonah", "Titus", "Matthew"
  sort: number            // Book order
  categories: string[]    // ["bible-ot"], ["bible-nt"]
  versification?: string  // "ufw" (for scripture)
  chapters?: number       // Number of chapters (for scripture)
}

interface CategoryMetadata {
  identifier: string      // "translate", "checking"
  title: string          // "Translation Principles"
  description: string    // Category description
  sort: number           // Display order
  articles: ArticleMetadata[]
}

interface ArticleMetadata {
  identifier: string     // "figs-metaphor"
  title: string         // "Figures of Speech - Metaphor"
  sort: number          // Article order within category
  dependencies: string[] // Related articles
}

interface WordMetadata {
  identifier: string     // "love", "grace"
  title: string         // Display term
  definition: string    // Brief definition
  occurrences: number   // How many times it appears
}

enum RequestPriority {
  HIGH = "high",      // User-initiated, show immediately
  NORMAL = "normal",  // Background loading
  LOW = "low"        // Prefetch, low priority
}

enum CacheStrategy {
  CACHE_FIRST = "cache-first",     // Try cache first, fallback to network
  NETWORK_FIRST = "network-first", // Try network first, fallback to cache
  CACHE_ONLY = "cache-only",       // Only use cache, fail if not available
  STALE_WHILE_REVALIDATE = "stale-while-revalidate" // Return stale content, update in background
}

enum ContentSource {
  CACHE = "cache",
  NETWORK = "network", 
  FALLBACK = "fallback"
}
```

### Dual Data Extraction System

```typescript
// Abstract base class for server-specific resource extraction
abstract class BaseResourceExtractor {
  constructor(
    protected serverAdapter: ServerAdapter,
    protected manifestParser: ManifestParser
  ) {}
  
  abstract extractResourceMetadata(request: ResourceMetadataRequest): Promise<ResourceMetadata>
  abstract checkResourceFreshness(request: ResourceMetadataRequest, currentVersion: VersionMetadata): Promise<FreshnessResult>
  abstract checkContentFreshness(request: ContentRequest, currentVersion: VersionMetadata): Promise<FreshnessResult>
}

// Door43 (Git-based) implementation
class Door43ResourceExtractor extends BaseResourceExtractor {
  async extractResourceMetadata(request: ResourceMetadataRequest): Promise<ResourceMetadata> {
    // Phase 1: Extract repository info from Door43 API
    const repoInfo = await this.extractRepositoryInfo(request)
    
    // Phase 2: Extract manifest/metadata from repository content with version info
    const manifestInfo = await this.extractManifestInfo(request, repoInfo)
    
    // Phase 3: Combine and structure metadata
    return this.combineMetadata(repoInfo, manifestInfo, request)
  }
  
  async checkResourceFreshness(
    request: ResourceMetadataRequest, 
    currentVersion: VersionMetadata
  ): Promise<FreshnessResult> {
    const repoName = `${request.language}_${request.resourceType}`
    
    // Get latest commit info for the repository
    const latestCommit = await this.serverAdapter.getLatestVersion(request.owner, repoName)
    
    return {
      isFresh: this.compareVersions(currentVersion, latestCommit),
      currentVersion: latestCommit.identifier,
      needsUpdate: !this.compareVersions(currentVersion, latestCommit),
      lastModified: latestCommit.lastModified,
      versionMetadata: latestCommit
    }
  }
  
  async checkContentFreshness(
    request: ContentRequest,
    currentVersion: VersionMetadata
  ): Promise<FreshnessResult> {
    const repoName = `${request.language}_${request.resourceType}`
    
    // Get file-specific version from repository
    const fileVersion = await this.serverAdapter.getFileVersion(
      request.owner,
      repoName,
      request.contentPath
    )
    
    return {
      isFresh: this.compareVersions(currentVersion, fileVersion),
      currentVersion: fileVersion.identifier,
      needsUpdate: !this.compareVersions(currentVersion, fileVersion),
      lastModified: fileVersion.lastModified,
      versionMetadata: fileVersion
    }
  }
  
  private compareVersions(current: VersionMetadata, latest: VersionMetadata): boolean {
    // Git SHA comparison
    if (current.type === VersionType.GIT_SHA && latest.type === VersionType.GIT_SHA) {
      return current.identifier === latest.identifier
    }
    
    // Fallback to timestamp comparison
    if (current.lastModified && latest.lastModified) {
      return current.lastModified >= latest.lastModified
    }
    
    return false
  }
}

// REST API (non-git) implementation
class RestApiResourceExtractor extends BaseResourceExtractor {
  async extractResourceMetadata(request: ResourceMetadataRequest): Promise<ResourceMetadata> {
    // REST API specific extraction logic
    const apiResponse = await this.serverAdapter.getResourceInfo(request)
    
    return {
      ...apiResponse.metadata,
      version: {
        type: VersionType.VERSION_NUMBER,
        identifier: apiResponse.version,
        lastModified: new Date(apiResponse.lastModified),
        revision: apiResponse.revision
      }
    }
  }
  
  async checkResourceFreshness(
    request: ResourceMetadataRequest,
    currentVersion: VersionMetadata
  ): Promise<FreshnessResult> {
    const latestVersion = await this.serverAdapter.getLatestVersion(
      request.owner,
      `${request.language}_${request.resourceType}`
    )
    
    return {
      isFresh: this.compareVersions(currentVersion, latestVersion),
      currentVersion: latestVersion.identifier,
      needsUpdate: !this.compareVersions(currentVersion, latestVersion),
      versionMetadata: latestVersion
    }
  }
  
  async checkContentFreshness(
    request: ContentRequest,
    currentVersion: VersionMetadata
  ): Promise<FreshnessResult> {
    const fileVersion = await this.serverAdapter.getFileVersion(
      request.owner,
      `${request.language}_${request.resourceType}`,
      request.contentPath
    )
    
          return {
      isFresh: this.compareVersions(currentVersion, fileVersion),
      currentVersion: fileVersion.identifier,
      needsUpdate: !this.compareVersions(currentVersion, fileVersion),
      versionMetadata: fileVersion
    }
  }
  
  private compareVersions(current: VersionMetadata, latest: VersionMetadata): boolean {
    // Version number comparison (semantic versioning)
    if (current.type === VersionType.VERSION_NUMBER && latest.type === VersionType.VERSION_NUMBER) {
      return this.compareSemanticVersions(current.identifier, latest.identifier) >= 0
    }
    
    // Revision number comparison
    if (current.type === VersionType.REVISION && latest.type === VersionType.REVISION) {
      return (current.revision || 0) >= (latest.revision || 0)
    }
    
    // Timestamp comparison
    if (current.lastModified && latest.lastModified) {
      return current.lastModified >= latest.lastModified
    }
    
    return false
  }
  
  private compareSemanticVersions(current: string, latest: string): number {
    const currentParts = current.split('.').map(Number)
    const latestParts = latest.split('.').map(Number)
    
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const currentPart = currentParts[i] || 0
      const latestPart = latestParts[i] || 0
      
      if (currentPart > latestPart) return 1
      if (currentPart < latestPart) return -1
    }
    
    return 0
  }
}
  
  private async extractRepositoryInfo(request: ResourceMetadataRequest): Promise<RepositoryInfo> {
    const repoName = `${request.language}_${request.resourceType}`
    const response = await this.apiClient.getRepository(request.owner, repoName)
    
    return {
      repoName: response.name,
      fullName: response.full_name,
      description: response.description,
      htmlUrl: response.html_url,
      cloneUrl: response.clone_url,
      defaultBranch: response.default_branch,
      updatedAt: new Date(response.updated_at),
      size: response.size
    }
  }
  
  private async extractManifestInfo(
    request: ResourceMetadataRequest, 
    repoInfo: RepositoryInfo
  ): Promise<ManifestInfo> {
    // Detect resource specification type
    const specification = await this.detectSpecification(request, repoInfo)
    
    // Download and parse manifest file with SHA
    const manifestResponse = await this.apiClient.getFileContentWithSha(
      request.owner,
      repoInfo.repoName,
      specification.manifestFile,
      repoInfo.defaultBranch
    )
    
    // Parse according to specification
    const manifestData = await this.manifestParser.parse(
      manifestResponse.content,
      specification.type
    )
    
    return {
      specification,
      manifestData,
      manifestSha: manifestResponse.sha,
      extractedAt: new Date()
    }
  }
  
  private async detectSpecification(
    request: ResourceMetadataRequest,
    repoInfo: RepositoryInfo
  ): Promise<ResourceSpecification> {
    // Try to detect manifest files in order of preference
    const manifestFiles = [
      { file: "manifest.yaml", type: "resource-container" as const },
      { file: "metadata.json", type: "scripture-burrito" as const },
      { file: "tc-manifest.json", type: "tool-generated" as const }
    ]
    
    for (const manifest of manifestFiles) {
      try {
        await this.apiClient.getFileContent(
          request.owner,
          repoInfo.repoName,
          manifest.file,
          repoInfo.defaultBranch
        )
        
        return {
          type: manifest.type,
          version: await this.detectVersion(manifest.type),
          manifestFile: manifest.file
        }
      } catch (error) {
        // File doesn't exist, try next
        continue
      }
    }
    
    throw new Error(`No supported manifest found in ${repoInfo.fullName}`)
  }
  
  private combineMetadata(
    repoInfo: RepositoryInfo,
    manifestInfo: ManifestInfo,
    request: ResourceMetadataRequest
  ): ResourceMetadata {
    const dublinCore = manifestInfo.manifestData.dublin_core
    
    const baseMetadata: ResourceMetadata = {
      // From ContentMetadata
      id: `${request.language}_${request.resourceType}`,
      title: dublinCore.title,
      description: dublinCore.description,
      contentType: this.mapResourceTypeToContentType(request.resourceType),
      format: dublinCore.format,
      size: repoInfo.size,
      lastModified: repoInfo.updatedAt,
      cachedAt: new Date(),
      dependencies: dublinCore.relation || [],
      relatedContent: [],
      
      // From ResourceMetadata
      repoName: repoInfo.repoName,
      fullName: repoInfo.fullName,
      htmlUrl: repoInfo.htmlUrl,
      cloneUrl: repoInfo.cloneUrl,
      defaultBranch: repoInfo.defaultBranch,
      specification: manifestInfo.specification,
      manifestData: manifestInfo.manifestData
    }
    
    // Add resource-specific metadata
    if (request.includeBooks && this.isScriptureResource(request.resourceType)) {
      baseMetadata.availableBooks = this.extractBookMetadata(manifestInfo.manifestData)
    }
    
    if (request.includeCategories && request.resourceType === 'ta') {
      baseMetadata.categories = this.extractCategoryMetadata(manifestInfo.manifestData)
    }
    
    if (request.includeWordList && request.resourceType === 'tw') {
      baseMetadata.wordList = this.extractWordMetadata(manifestInfo.manifestData)
    }
    
    return baseMetadata
  }
  
  private extractBookMetadata(manifestData: ManifestData): BookMetadata[] {
    return manifestData.projects.map(project => ({
      identifier: project.identifier,
      title: project.title,
      sort: project.sort,
      categories: project.categories || [],
      versification: project.versification,
      chapters: project.chapters
    }))
  }
  
  private extractCategoryMetadata(manifestData: ManifestData): CategoryMetadata[] {
    // Parse TA-specific structure from manifest
    const categories: CategoryMetadata[] = []
    
    // Group projects by category
    const categoryMap = new Map<string, ProjectInfo[]>()
    manifestData.projects.forEach(project => {
      const category = project.categories?.[0] || 'uncategorized'
      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category)!.push(project)
    })
    
    // Convert to CategoryMetadata
    categoryMap.forEach((projects, categoryId) => {
      categories.push({
        identifier: categoryId,
        title: this.formatCategoryTitle(categoryId),
        description: `Articles about ${categoryId}`,
        sort: this.getCategorySort(categoryId),
        articles: projects.map(project => ({
          identifier: project.identifier,
          title: project.title,
          sort: project.sort,
          dependencies: project.dependencies || []
        }))
      })
    })
    
    return categories.sort((a, b) => a.sort - b.sort)
  }
  
  private extractWordMetadata(manifestData: ManifestData): WordMetadata[] {
    return manifestData.projects.map(project => ({
      identifier: project.identifier,
      title: project.title,
      definition: project.description || '',
      occurrences: project.occurrences || 0
    }))
  }
  
  private isScriptureResource(resourceType: string): boolean {
    return ['ult', 'ust', 'glt', 'gst'].includes(resourceType)
  }
  
  private mapResourceTypeToContentType(resourceType: string): string {
    const mapping: Record<string, string> = {
      'ult': 'scripture',
      'ust': 'scripture', 
      'glt': 'scripture',
      'gst': 'scripture',
      'tn': 'notes',
      'tw': 'words',
      'ta': 'academy',
      'tq': 'questions'
    }
    return mapping[resourceType] || 'unknown'
  }
}

interface RepositoryInfo {
  repoName: string
  fullName: string
  description: string
  htmlUrl: string
  cloneUrl: string
  defaultBranch: string
  updatedAt: Date
  size: number
}

interface ManifestInfo {
  specification: ResourceSpecification
  manifestData: ManifestData
  manifestSha: string      // SHA of the manifest file
  extractedAt: Date
}

interface ProjectInfo {
  identifier: string
  title: string
  sort: number
  categories?: string[]
  versification?: string
  chapters?: number
  description?: string
  dependencies?: string[]
  occurrences?: number
}
```

### Unified Storage Layer

```typescript
interface UnifiedStorageLayer {
  // Content operations
  store(key: StorageKey, content: any, metadata: ContentMetadata): Promise<void>
  retrieve<T>(key: StorageKey): Promise<StorageResult<T>>
  exists(key: StorageKey): Promise<boolean>
  remove(key: StorageKey): Promise<void>
  
  // Metadata operations
  getMetadata(key: StorageKey): Promise<ContentMetadata | null>
  setMetadata(key: StorageKey, metadata: ContentMetadata): Promise<void>
  
  // Batch operations
  storeBatch(items: StorageItem[]): Promise<void>
  retrieveBatch<T>(keys: StorageKey[]): Promise<StorageResult<T>[]>
  
  // Cache management
  clear(pattern?: StoragePattern): Promise<void>
  getSize(pattern?: StoragePattern): Promise<number>
  cleanup(maxAge?: number, maxSize?: number): Promise<void>
}

interface StorageKey {
  // Hierarchical key structure
  server: string
  owner: string
  language: string
  resourceType: string
  contentPath: string
  
  // Computed key for storage
  toString(): string  // "door43.org/unfoldingWord/en/ta/translate/figs-metaphor"
}

interface StorageResult<T> {
  content: T | null
  metadata: ContentMetadata | null
  found: boolean
  expired: boolean
  stale: boolean           // Content exists but may be outdated (SHA mismatch)
}

interface StorageItem {
  key: StorageKey
  content: any
  metadata: ContentMetadata
}

interface StoragePattern {
  server?: string
  owner?: string
  language?: string
  resourceType?: string
  contentPath?: string  // Supports wildcards: "translate/*", "books/jon*"
}
```

### Resource-Specific Content Adapters

```typescript
// Base adapter that all resource types extend
abstract class BaseContentAdapter<T> {
  constructor(
    protected resolver: ResourceResolver,
    protected storage: UnifiedStorageLayer
  ) {}
  
  // Abstract methods each resource type implements
  abstract parseRawContent(raw: any): T
  abstract validateContent(content: T): boolean
  abstract extractMetadata(content: T): Partial<ContentMetadata>
  
  // Common functionality all resources share
  async getContent(request: ContentRequest): Promise<T> {
    const storageKey = new StorageKey(request)
    
    // 1. Check cache first
    const cached = await this.storage.retrieve<T>(storageKey)
    
    if (cached.found && !cached.expired) {
      // 2. Check if content is fresh using version metadata
      if (cached.metadata?.version && request.cacheStrategy !== CacheStrategy.CACHE_ONLY) {
        const freshnessCheck = await this.resolver.checkContentFreshness(
          request, 
          cached.metadata.version
        )
        
        if (!freshnessCheck.isFresh) {
          // Content is stale, handle based on strategy
          if (request.cacheStrategy === CacheStrategy.STALE_WHILE_REVALIDATE) {
            // Return stale content immediately, update in background
            this.updateContentInBackground(request, storageKey)
            return cached.content!
          } else {
            // Force refresh
            return await this.fetchAndStoreContent(request, storageKey)
          }
        }
      }
      
      return cached.content!
    }
    
    // 3. Content not cached or expired, fetch fresh
    return await this.fetchAndStoreContent(request, storageKey)
  }
  
  private async fetchAndStoreContent(request: ContentRequest, storageKey: StorageKey): Promise<T> {
    // Fetch from network
    const response = await this.resolver.resolveContent<any>(request)
    
    // Parse using resource-specific logic
    const parsed = this.parseRawContent(response.content)
    
    // Validate
    if (!this.validateContent(parsed)) {
      throw new Error(`Invalid content for ${request.contentPath}`)
    }
    
    // Create version metadata based on server type
    const versionMetadata = await this.createVersionMetadata(response)
    
    // Store in cache with version info
    const metadata: ContentMetadata = {
      ...response.metadata,
      ...this.extractMetadata(parsed),
      version: versionMetadata,
      cachedAt: new Date()
    }
    
    await this.storage.store(storageKey, parsed, metadata)
    
    return parsed
  }
  
  private async updateContentInBackground(request: ContentRequest, storageKey: StorageKey): Promise<void> {
    try {
      await this.fetchAndStoreContent(request, storageKey)
    } catch (error) {
      console.warn(`Background update failed for ${request.contentPath}:`, error)
    }
  }
  
  private async createVersionMetadata(response: ContentResponse<any>): Promise<VersionMetadata> {
    // Determine version type based on server and response
    const serverType = this.detectServerType(response.metadata)
    
    switch (serverType) {
      case VersionType.GIT_SHA:
        return {
          type: VersionType.GIT_SHA,
          identifier: response.metadata.commitSha || await this.calculateContentHash(response.content),
          lastModified: response.metadata.lastModified,
          etag: response.metadata.etag,
          checksum: await this.calculateContentHash(response.content)
        }
      
      case VersionType.VERSION_NUMBER:
        return {
          type: VersionType.VERSION_NUMBER,
          identifier: response.metadata.version || '1.0.0',
          lastModified: response.metadata.lastModified,
          revision: response.metadata.revision
        }
      
      case VersionType.TIMESTAMP:
  return {
          type: VersionType.TIMESTAMP,
          identifier: response.metadata.lastModified?.toISOString() || new Date().toISOString(),
          lastModified: response.metadata.lastModified,
          checksum: await this.calculateContentHash(response.content)
        }
      
      case VersionType.ETAG:
        return {
          type: VersionType.ETAG,
          identifier: response.metadata.etag || await this.calculateContentHash(response.content),
          lastModified: response.metadata.lastModified,
          etag: response.metadata.etag
        }
      
      default:
        // Fallback to content checksum
        return {
          type: VersionType.CHECKSUM,
          identifier: await this.calculateContentHash(response.content),
          lastModified: response.metadata.lastModified || new Date(),
          checksum: await this.calculateContentHash(response.content)
        }
    }
  }
  
  private detectServerType(metadata: ContentMetadata): VersionType {
    // Detect server type based on available metadata
    if (metadata.commitSha) return VersionType.GIT_SHA
    if (metadata.version) return VersionType.VERSION_NUMBER
    if (metadata.etag) return VersionType.ETAG
    return VersionType.CHECKSUM // Fallback
  }
  
  private async calculateContentHash(content: any): Promise<string> {
    // Calculate SHA-256 hash of content
    const encoder = new TextEncoder()
    const data = encoder.encode(typeof content === 'string' ? content : JSON.stringify(content))
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
  
  async getMetadata(request: ContentRequest): Promise<ContentMetadata> {
    // Try cache first
    const key = new StorageKey(request)
    const cached = await this.storage.getMetadata(key)
    if (cached) return cached
    
    // Fetch metadata only (lightweight)
    return await this.resolver.resolveMetadata({
      server: request.server,
      owner: request.owner,
      language: request.language,
      resourceType: request.resourceType,
      contentPath: request.contentPath
    })
  }
}

// Translation Academy specific adapter
class AcademyContentAdapter extends BaseContentAdapter<AcademyArticle> {
  parseRawContent(raw: any): AcademyArticle {
  return {
      id: raw.id,
      title: raw.title,
      content: this.parseMarkdown(raw.content),
      category: this.extractCategory(raw.path),
      tags: raw.tags || [],
      relatedArticles: raw.related || [],
      examples: this.extractScriptureExamples(raw.content)
    }
  }
  
  validateContent(content: AcademyArticle): boolean {
    return !!(content.id && content.title && content.content)
  }
  
  extractMetadata(content: AcademyArticle): Partial<ContentMetadata> {
    return {
      title: content.title,
      contentType: "article",
      format: "markdown",
      dependencies: content.relatedArticles,
      relatedContent: content.examples?.map(ex => `${ex.book}:${ex.chapter}:${ex.verse}`) || []
    }
  }
  
  // Academy-specific methods
  private parseMarkdown(content: string): string {
    // Convert markdown to structured content
    return content // Simplified
  }
  
  private extractCategory(path: string): string {
    return path.split('/')[0] // "translate/figs-metaphor" → "translate"
  }
  
  private extractScriptureExamples(content: string): ScriptureReference[] {
    // Parse content for scripture references
    return [] // Simplified
  }
}

// Translation Notes specific adapter
class NotesContentAdapter extends BaseContentAdapter<TranslationNote[]> {
  parseRawContent(raw: any): TranslationNote[] {
    // Parse TSV format into structured notes
    return raw.map((row: any) => ({
      id: row.ID,
      reference: row.Reference,
      content: row.Note,
      title: row.GLQuote,
      links: this.extractCrossReferences(row.Note)
    }))
  }
  
  validateContent(content: TranslationNote[]): boolean {
    return Array.isArray(content) && content.every(note => note.id && note.content)
  }
  
  extractMetadata(content: TranslationNote[]): Partial<ContentMetadata> {
    return {
      contentType: "notes",
      format: "tsv",
      size: content.length,
      dependencies: this.extractAllLinks(content)
    }
  }
  
  private extractCrossReferences(noteContent: string): CrossReference[] {
    // Extract TA and TW links from note content
    return [] // Simplified
  }
  
  private extractAllLinks(notes: TranslationNote[]): string[] {
    return notes.flatMap(note => 
      note.links.map(link => `${link.targetResource}/${link.targetContent}`)
    )
  }
}
```

### Usage Examples

```typescript
// Example 1: Resource Metadata Loading with SHA Checking (Workspace Initialization)
class WorkspaceInitializer {
  constructor(
    private resourceExtractor: Door43ResourceExtractor,
    private storage: UnifiedStorageLayer
  ) {}
  
  async initializeWorkspace(owner: string, language: string): Promise<ResourceMetadata[]> {
    const resourceTypes = ['ult', 'ust', 'tn', 'tw', 'ta'] // Available resource types
    const resourceMetadata: ResourceMetadata[] = []
    
    for (const resourceType of resourceTypes) {
      try {
        // Check if metadata is cached
        const cacheKey = new StorageKey({
          server: "door43.org",
          owner,
          language,
          resourceType,
          contentPath: "_metadata"
        })
        
        let metadata = await this.storage.retrieve<ResourceMetadata>(cacheKey)
        
        if (metadata.found && !metadata.expired && metadata.metadata?.version) {
          // Check if cached metadata is fresh using version metadata
          const freshnessCheck = await this.resourceExtractor.checkResourceFreshness({
            server: "door43.org",
            owner,
            language,
            resourceType
          }, metadata.metadata.version)
          
          if (freshnessCheck.isFresh) {
            // Metadata is fresh, use cached version
            resourceMetadata.push(metadata.content!)
            continue
          }
        }
        
        // Metadata not cached, expired, or stale - extract fresh
        const extractedMetadata = await this.resourceExtractor.extractResourceMetadata({
          server: "door43.org",
          owner,
          language,
          resourceType,
          includeBooks: this.isScriptureResource(resourceType),
          includeCategories: resourceType === 'ta',
          includeWordList: resourceType === 'tw'
        })
        
        // Store in cache with SHA
        await this.storage.store(cacheKey, extractedMetadata, extractedMetadata)
        resourceMetadata.push(extractedMetadata)
        
      } catch (error) {
        console.warn(`Failed to load metadata for ${language}_${resourceType}:`, error)
        // Continue with other resources
      }
    }
    
    return resourceMetadata
  }
  
  private isScriptureResource(resourceType: string): boolean {
    return ['ult', 'ust', 'glt', 'gst'].includes(resourceType)
  }
}

// Example 2: Translation Note requests Academy Article
class NotesResourceComponent {
  constructor(
    private academyAdapter: AcademyContentAdapter,
    private notesAdapter: NotesContentAdapter
  ) {}
  
  async handleCrossReference(crossRef: CrossReference) {
    // User clicks link in translation note
    const request: ContentRequest = {
      server: "door43.org",
      owner: "unfoldingWord", 
      language: "en",
      resourceType: "ta",
      contentPath: crossRef.targetContent, // "translate/figs-metaphor"
      priority: RequestPriority.HIGH,
      cacheStrategy: CacheStrategy.CACHE_FIRST
    }
    
    // This will:
    // 1. Check cache for the article
    // 2. If not found, fetch from server
    // 3. Parse markdown content
    // 4. Store in cache
    // 5. Return parsed article
    const article = await this.academyAdapter.getContent(request)
    
    // Show in modal
    this.showModal({
      resourceId: "en_ta",
      contentId: crossRef.targetContent,
      content: article,
      triggerSource: {
        resourceId: crossRef.sourceResource,
        contentId: crossRef.sourceContent
      }
    })
  }
}

// Example 3: Independent Academy Browser (using metadata)
class AcademyResourceComponent {
  constructor(
    private academyAdapter: AcademyContentAdapter,
    private resourceMetadata: ResourceMetadata
  ) {}
  
  async componentDidMount() {
    // Use pre-loaded metadata to show categories immediately
    if (this.resourceMetadata.categories) {
      this.setState({ 
        categories: this.resourceMetadata.categories,
        loading: false 
      })
    }
  }
  
  async loadCategory(categoryId: string) {
    const category = this.resourceMetadata.categories?.find(c => c.identifier === categoryId)
    if (!category) return
    
    // Show articles list immediately from metadata
    this.setState({ 
      currentCategory: category,
      articles: category.articles,
      loading: false 
    })
    
    // Preload high-priority articles in background
    const highPriorityRequests = category.articles.slice(0, 5).map(article => ({
      server: "door43.org",
      owner: "unfoldingWord",
      language: "en", 
      resourceType: "ta",
      contentPath: `${categoryId}/${article.identifier}`,
      priority: RequestPriority.NORMAL,
      cacheStrategy: CacheStrategy.CACHE_FIRST
    }))
    
    // Preload in background
    Promise.all(
      highPriorityRequests.map(req => this.academyAdapter.getContent(req))
    ).catch(console.warn) // Don't block UI if preloading fails
  }
  
  async loadArticle(categoryId: string, articleId: string) {
    // Load specific article on-demand
    const request: ContentRequest = {
      server: "door43.org",
      owner: "unfoldingWord",
      language: "en",
      resourceType: "ta", 
      contentPath: `${categoryId}/${articleId}`,
      priority: RequestPriority.HIGH,
      cacheStrategy: CacheStrategy.CACHE_FIRST
    }
    
    const article = await this.academyAdapter.getContent(request)
    this.setState({ currentArticle: article })
  }
}

// Example 4: Scripture Resource with Book List
class ScriptureResourceComponent {
  constructor(
    private scriptureAdapter: ScriptureContentAdapter,
    private resourceMetadata: ResourceMetadata
  ) {}
  
  async componentDidMount() {
    // Show available books immediately from metadata
    if (this.resourceMetadata.availableBooks) {
      this.setState({
        availableBooks: this.resourceMetadata.availableBooks,
        loading: false
      })
    }
  }
  
  async loadBook(bookId: string) {
    // Verify book is available
    const bookMetadata = this.resourceMetadata.availableBooks?.find(
      book => book.identifier === bookId
    )
    
    if (!bookMetadata) {
      throw new Error(`Book ${bookId} not available in ${this.resourceMetadata.title}`)
    }
    
    // Load book content on-demand
    const request: ContentRequest = {
      server: "door43.org",
      owner: "unfoldingWord",
      language: "en",
      resourceType: "ult",
      contentPath: `books/${bookId}`,
      priority: RequestPriority.HIGH,
      cacheStrategy: CacheStrategy.CACHE_FIRST
    }
    
    const bookContent = await this.scriptureAdapter.getContent(request)
    this.setState({ 
      currentBook: bookContent,
      bookMetadata: bookMetadata
    })
  }
}

// Example 5: Batch Loading for Performance
class ResourcePreloader {
  constructor(private resolver: ResourceResolver) {}
  
  async preloadRelatedContent(mainContent: any) {
    // Extract all cross-references from main content
    const crossRefs = this.extractAllCrossReferences(mainContent)
    
    // Create batch request
    const requests: ContentRequest[] = crossRefs.map(ref => ({
      server: "door43.org",
      owner: "unfoldingWord",
      language: "en",
      resourceType: ref.targetResource,
      contentPath: ref.targetContent,
      priority: RequestPriority.LOW,
      cacheStrategy: CacheStrategy.CACHE_FIRST
    }))
    
    // Batch load in background
    await this.resolver.resolveBatch(requests)
  }
}
// Example 6: SHA-based Content Validation
class ContentValidator {
  constructor(
    private storage: UnifiedStorageLayer,
    private resolver: ResourceResolver
  ) {}
  
  async validateAllContent(owner: string, language: string): Promise<ValidationReport> {
    const report: ValidationReport = {
      totalItems: 0,
      freshItems: 0,
      staleItems: 0,
      updatedItems: 0,
      errors: []
    }
    
    // Get all cached content
    const pattern: StoragePattern = {
      server: "door43.org",
      owner,
      language
    }
    
    const cachedItems = await this.storage.getAllByPattern(pattern)
    report.totalItems = cachedItems.length
    
    for (const item of cachedItems) {
      try {
        if (item.metadata?.version) {
          // Check freshness using version metadata
          const freshnessCheck = await this.resolver.checkContentFreshness(
            this.storageKeyToContentRequest(item.key),
            item.metadata.version
          )
          
          if (freshnessCheck.isFresh) {
            report.freshItems++
          } else {
            report.staleItems++
            
            // Optionally update stale content
            if (this.shouldAutoUpdate(item.key)) {
              await this.updateStaleContent(item.key)
              report.updatedItems++
            }
          }
        }
      } catch (error) {
        report.errors.push({
          key: item.key.toString(),
          error: error.message
        })
      }
    }
    
    return report
  }
  
  private shouldAutoUpdate(key: StorageKey): boolean {
    // Auto-update critical content like manifests and scripture
    return key.contentPath.includes('_metadata') || 
           key.resourceType === 'ult' || 
           key.resourceType === 'glt'
  }
  
  private async updateStaleContent(key: StorageKey): Promise<void> {
    const request = this.storageKeyToContentRequest(key)
    // Force fresh fetch
    request.cacheStrategy = CacheStrategy.NETWORK_FIRST
    await this.resolver.resolveContent(request)
  }
  
  private storageKeyToContentRequest(key: StorageKey): ContentRequest {
    return {
      server: key.server,
      owner: key.owner,
      language: key.language,
      resourceType: key.resourceType,
      contentPath: key.contentPath,
      priority: RequestPriority.NORMAL,
      cacheStrategy: CacheStrategy.CACHE_FIRST
    }
  }
}

interface ValidationReport {
  totalItems: number
  freshItems: number
  staleItems: number
  updatedItems: number
  errors: Array<{
    key: string
    error: string
  }>
}
// Server Adapter Interface (Extensible)
interface ServerAdapter {
  // Server identification
  serverType: VersionType
  baseUrl: string
  
  // Version checking methods
  getLatestVersion(owner: string, repo: string): Promise<VersionMetadata>
  getFileVersion(owner: string, repo: string, filePath: string): Promise<VersionMetadata>
  
  // Content retrieval
  getResourceInfo(request: ResourceMetadataRequest): Promise<any>
  getFileContent(owner: string, repo: string, filePath: string): Promise<any>
  
  // Server-specific methods
  authenticate?(credentials: any): Promise<void>
  listRepositories?(owner: string): Promise<string[]>
}

// Door43 Git Adapter
class Door43GitAdapter implements ServerAdapter {
  serverType = VersionType.GIT_SHA
  baseUrl = "https://git.door43.org"
  
  async getLatestVersion(owner: string, repo: string): Promise<VersionMetadata> {
    const commit = await this.apiClient.getLatestCommit(owner, repo)
    return {
      type: VersionType.GIT_SHA,
      identifier: commit.sha,
      lastModified: new Date(commit.commit.committer.date),
      etag: commit.sha
    }
  }
  
  async getFileVersion(owner: string, repo: string, filePath: string): Promise<VersionMetadata> {
    const fileInfo = await this.apiClient.getFileInfo(owner, repo, filePath)
    return {
      type: VersionType.GIT_SHA,
      identifier: fileInfo.sha,
      lastModified: new Date(fileInfo.lastModified),
      etag: fileInfo.sha,
      checksum: fileInfo.sha
    }
  }
}

// REST API Adapter (for non-git servers)
class RestApiAdapter implements ServerAdapter {
  serverType = VersionType.VERSION_NUMBER
  baseUrl: string
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }
  
  async getLatestVersion(owner: string, repo: string): Promise<VersionMetadata> {
    const response = await fetch(`${this.baseUrl}/api/v1/${owner}/${repo}/version`)
    const data = await response.json()
    
      return {
      type: VersionType.VERSION_NUMBER,
      identifier: data.version,
      lastModified: new Date(data.lastModified),
      revision: data.revision
    }
  }
  
  async getFileVersion(owner: string, repo: string, filePath: string): Promise<VersionMetadata> {
    const response = await fetch(`${this.baseUrl}/api/v1/${owner}/${repo}/files/${filePath}/version`)
    const data = await response.json()
    
    return {
      type: VersionType.VERSION_NUMBER,
      identifier: data.version,
      lastModified: new Date(data.lastModified),
      etag: data.etag
    }
  }
}

// CDN/Static Server Adapter (timestamp-based)
class CdnAdapter implements ServerAdapter {
  serverType = VersionType.TIMESTAMP
  baseUrl: string
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }
  
  async getLatestVersion(owner: string, repo: string): Promise<VersionMetadata> {
    // Use HEAD request to get last-modified header
    const response = await fetch(`${this.baseUrl}/${owner}/${repo}/manifest.json`, { method: 'HEAD' })
    const lastModified = response.headers.get('last-modified')
    
    return {
      type: VersionType.TIMESTAMP,
      identifier: lastModified || new Date().toISOString(),
      lastModified: lastModified ? new Date(lastModified) : new Date(),
      etag: response.headers.get('etag') || undefined
    }
  }
  
  async getFileVersion(owner: string, repo: string, filePath: string): Promise<VersionMetadata> {
    const response = await fetch(`${this.baseUrl}/${owner}/${repo}/${filePath}`, { method: 'HEAD' })
    const lastModified = response.headers.get('last-modified')
    
    return {
      type: VersionType.TIMESTAMP,
      identifier: lastModified || new Date().toISOString(),
      lastModified: lastModified ? new Date(lastModified) : new Date(),
      etag: response.headers.get('etag') || undefined
    }
  }
}

// Server Factory for creating appropriate adapters
class ServerAdapterFactory {
  static create(serverUrl: string): ServerAdapter {
    if (serverUrl.includes('git.door43.org')) {
      return new Door43GitAdapter()
    } else if (serverUrl.includes('/api/')) {
      return new RestApiAdapter(serverUrl)
    } else {
      return new CdnAdapter(serverUrl)
    }
  }
}
```

## Library Integration

### door43-api

- `fetchScripture(bookName, chapter?, context)` - Get scripture content
- `fetchTranslationNotes(bookName, chapter, context)` - Get translation notes
- Context: `{ organization, language, resourceType }`

### offline-cache

- `getStoredScripture(context, bookName)` - Check IndexedDB storage
- `isStorageValid(storageKey, 'scripture')` - Validate stored data in IndexedDB

### linked-panels

- **Resources**: Define available resources (ULT, UST, TN, etc.)
- **Panels**: Configure panel layout and resource assignments
- **Messaging**: Handle inter-panel communication with lifecycle management
- **State Persistence**: Maintain panel states and message history across sessions
- **Alignment Coordination**: Enable cross-resource content relationships and interactions

### Modular Resource System

Each resource is a **self-contained module** that can be used independently or combined with others:

**Resource Module Structure:**
```
@bt-toolkit/resource-{type}/
├── src/
│   ├── ResourceModule.ts      # Main module interface
│   ├── ResourceService.ts     # Data fetching and processing
│   ├── ResourceCache.ts       # Standardized cache management
│   ├── ResourceTypes.ts       # Type definitions
│   └── ResourceUtils.ts       # Utility functions
├── adapters/
│   ├── WebAdapter.ts         # Web-specific implementations
│   ├── MobileAdapter.ts      # Mobile-specific implementations
│   └── DesktopAdapter.ts     # Desktop-specific implementations
└── package.json              # Independent npm package
```

**Available Resource Modules:**
- **@bt-toolkit/resource-scripture**: Scripture resources (ULT, GLT, UST, GST)
- **@bt-toolkit/resource-notes**: Translation Notes (TN)
- **@bt-toolkit/resource-words**: Translation Words (TW)
- **@bt-toolkit/resource-academy**: Translation Academy (TA)
- **@bt-toolkit/resource-audio**: Audio resources
- **@bt-toolkit/resource-video**: Video resources
- **@bt-toolkit/resource-images**: Image resources

**Module Benefits:**
- **Independent Packages** - Each resource can be installed separately
- **Reusable Across Apps** - Use scripture module in different Bible apps
- **Standardized Interface** - All modules follow same patterns
- **Platform Agnostic** - Each module works across web/mobile/desktop
- **Extensible** - Easy to create new resource modules

## Unified Storage Adapter System

### Storage Adapter Pattern

**Single Interface** → **Multiple Storage Backends**
- Services use one consistent storage interface
- Adapter automatically routes to appropriate storage backend
- Platform-agnostic implementation with web-specific optimizations

### Storage Strategy by Content Type

**Text-Based Resources** → **IndexedDB** (via Storage Adapter)
- Scripture, Translation Notes, Translation Words, Translation Academy
- Fast, structured storage for frequent access

**Media Resources** → **Cache API + IndexedDB Metadata** (via Storage Adapter)
- Audio files, Video files, Images
- Cache API for large binary data, IndexedDB for metadata and references

### Storage Adapter Interface

**Unified API for All Resource Services:**
```
StorageAdapter {
  // Text resources
  storeTextResource(resourceId, bookCode, data)
  getTextResource(resourceId, bookCode)
  
  // Media resources  
  storeMediaResource(resourceId, bookCode, segment, binaryData)
  getMediaResource(resourceId, bookCode, segment)
  getMediaMetadata(resourceId, bookCode, segment)
  
  // Common operations
  hasResource(resourceId, bookCode)
  deleteResource(resourceId, bookCode)
  clearCache(resourceId?)
}
```

**Adapter Implementation Benefits:**
- **Service Simplicity** - Services don't need to know about storage complexity
- **Automatic Routing** - Adapter determines IndexedDB vs Cache API based on content type
- **Platform Flexibility** - Easy to swap storage backends for mobile/desktop
- **Consistent Interface** - All services use identical storage methods
- **Error Handling** - Centralized storage error management and fallbacks

### Platform-Specific Storage Implementations

**Web Browser (Current):**
- Text: IndexedDB
- Media: Cache API + IndexedDB metadata
- Implementation: `WebStorageAdapter`

**React Native Mobile:**
- Text: SQLite or AsyncStorage
- Media: File System + SQLite metadata
- Implementation: `MobileStorageAdapter`

**Desktop (Electron/Tauri):**
- Text: SQLite or File System
- Media: File System + Database metadata
- Implementation: `DesktopStorageAdapter`

**Standardized Cache Hierarchy:**
```
server/owner/language/resource/content
├── door43.org/unfoldingWord/en/ult/
│   ├── books/
│   │   ├── jon.json         # Processed Jonah book
│   │   └── tit.json         # Processed Titus book
│   └── metadata.json        # Resource metadata
├── door43.org/unfoldingWord/en/tn/
│   ├── books/
│   │   ├── jon.json         # Translation notes for Jonah
│   │   └── tit.json         # Translation notes for Titus
│   └── metadata.json
└── door43.org/unfoldingWord/en/ta/
    ├── categories/
    │   ├── translate/
    │   │   ├── figs-metaphor.json
    │   │   └── figs-simile.json
    │   └── checking/
    │       └── accuracy.json
    └── metadata.json
```

**Resource Module Interface (Standardized):**
```typescript
interface ResourceModule {
  // Module identification
  readonly type: string           // "scripture", "notes", "audio", etc.
  readonly version: string        // Module version
  readonly supportedFormats: string[]  // ["usfm", "json"], ["tsv"], etc.
  
  // Cache management (standardized hierarchy)
  cache: ResourceCache
  
  // Data operations
  fetchResource(server: string, owner: string, language: string, resourceId: string): Promise<ResourceData>
  processContent(rawData: any, contentType: string): Promise<ProcessedContent>
  getContent(server: string, owner: string, language: string, resourceId: string, contentPath: string): Promise<any>
  
  // Platform adapters
  createAdapter(platform: 'web' | 'mobile' | 'desktop'): ResourceAdapter
}

interface ResourceCache {
  // Standardized cache operations following hierarchy
  store(server: string, owner: string, language: string, resourceId: string, contentPath: string, data: any): Promise<void>
  retrieve(server: string, owner: string, language: string, resourceId: string, contentPath: string): Promise<any>
  exists(server: string, owner: string, language: string, resourceId: string, contentPath?: string): Promise<boolean>
  clear(server?: string, owner?: string, language?: string, resourceId?: string): Promise<void>
  
  // Cache metadata
  getMetadata(server: string, owner: string, language: string, resourceId: string): Promise<ResourceMetadata>
  setMetadata(server: string, owner: string, language: string, resourceId: string, metadata: ResourceMetadata): Promise<void>
}
```

### IndexedDB Schema

**Database Name**: `BibleTranslationApp`  
**Version**: `1`

**Object Stores:**
- **`resourceMetadata`** - Resource information and cross-references
  - Key: `resourceId` (e.g., "en_ult", "en_tn", "en_audio")
  - Value: `{ title, description, type, subtype, links, lastUpdated }`

- **`processedBooks`** - Full processed book content (text resources only)
  - Key: `${resourceId}_${bookCode}` (e.g., "en_ult_jon", "en_tn_tit")
  - Value: `{ bookData, processedAt, contentHash }`

- **`alignmentData`** - Word alignment mappings between resources
  - Key: `${bookCode}_alignment` (e.g., "jon_alignment")
  - Value: `{ alignments: AlignmentMapping[], version }`

- **`mediaMetadata`** - Media file references and metadata
  - Key: `${resourceId}_${bookCode}_${segment}` (e.g., "en_audio_jon_ch1")
  - Value: `{ cacheKey, duration, fileSize, format, segments, lastAccessed }`

- **`userPreferences`** - Application settings and panel configurations
  - Key: `preference_${key}` (e.g., "preference_panelLayout")
  - Value: `{ setting, updatedAt }`

### Cache API for Media Storage

**Cache Name**: `bible-media-v1`

**Stored Content:**
- **Audio Files**: MP3, OGG, WebM audio tracks
- **Video Files**: MP4, WebM video content  
- **Images**: PNG, JPG, WebP illustrations

**Cache Keys:**
- `audio/${resourceId}/${bookCode}/${segment}` (e.g., "audio/en_audio/jon/ch1")
- `video/${resourceId}/${bookCode}/${segment}` (e.g., "video/en_video/jon/ch1")
- `image/${resourceId}/${reference}` (e.g., "image/en_images/jon_1_1")

### Hybrid Storage Benefits

**Text Resources (IndexedDB):**
- **Fast Queries** - Structured data retrieval with indexes
- **Transactional** - ACID properties ensure data integrity
- **Efficient Size** - Perfect for text content (ULT Jonah ~50KB, TN Jonah ~200KB)

**Media Resources (Cache API + IndexedDB):**
- **Large File Support** - Handle audio/video files up to several GB
- **Browser Optimized** - Cache API designed specifically for large binary data
- **Streaming Support** - Efficient playback without full download
- **Cross-Browser Compatibility** - Better support than IndexedDB Blobs

**Combined Benefits:**
- **Optimal Performance** - Right storage method for each content type
- **Offline Capability** - Full app functionality without network
- **Quota Management** - Browser handles storage limits intelligently
- **Service Worker Integration** - Cache API works seamlessly with service workers

### Media Resource Loading Flow

```
Audio/Video Request → Check IndexedDB Metadata → Check Cache API → Fetch from Network → Store in Cache → Update Metadata
```

**Example Media Loading (via Storage Adapter):**
1. Audio Resource Module calls `storageAdapter.getMediaResource("en_audio", "jon", "ch1")`
2. Adapter checks `mediaMetadata["en_audio_jon_ch1"]` in IndexedDB
3. If exists, adapter gets `cacheKey` and checks Cache API
4. If cached, adapter returns media URL from Cache API
5. If not cached, adapter fetches from network, stores in Cache API, updates metadata
6. Audio Resource Module receives media URL and passes to AudioResourceComponent

**Example Text Loading (via Storage Adapter):**
1. Scripture Resource Module calls `storageAdapter.getTextResource("en_ult", "jon")`
2. Adapter checks `processedBooks["en_ult_jon"]` in IndexedDB
3. If exists, adapter returns processed book data directly
4. If not cached, adapter fetches from network, processes, stores in IndexedDB
5. Scripture Resource Module receives processed book data and passes to ScriptureResourceComponent

### Storage Size Estimates

**Text Resources (IndexedDB):**
- Scripture book: ~50KB (ULT) to ~100KB (UST)
- Translation Notes book: ~200KB to ~500KB
- Translation Words book: ~100KB to ~300KB
- **Total per language**: ~1-2MB for complete Bible text resources

**Media Resources (Cache API):**
- Audio chapter: ~5-15MB (depending on quality/length)
- Video chapter: ~50-200MB (depending on resolution/length)
- Images: ~100KB-2MB per illustration
- **Total per language**: ~500MB-5GB for complete multimedia Bible

## File Structure (Multi-Platform)

### Modular Package Structure
```
packages/
├── core/                      # Core application logic
│   ├── business-logic/
│   │   ├── WorkspaceLogic.ts       # Pure business logic - workspace management
│   │   ├── NavigationLogic.ts      # Pure business logic - navigation and routing
│   │   ├── ResourceLogic.ts        # Pure business logic - resource management
│   │   └── PanelLogic.ts          # Pure business logic - panel coordination
│   ├── interfaces/
│   │   ├── ResourceModule.ts       # Standard resource module interface
│   │   ├── ResourceCache.ts        # Standard cache interface
│   │   └── StorageAdapter.ts       # Storage adapter interface
│   ├── types/
│   │   ├── Resource.ts            # Shared - Resource type definitions
│   │   ├── Navigation.ts          # Shared - Navigation type definitions
│   │   └── Storage.ts             # Shared - Storage interface types
│   └── utils/
│       ├── reference-parser.ts    # Shared - Bible reference parsing
│       ├── content-filter.ts      # Shared - Content filtering logic
│       └── cache-hierarchy.ts     # Standardized cache path utilities
├── resource-scripture/        # Scripture resource module
│   ├── src/
│   │   ├── ScriptureModule.ts      # Scripture-specific implementation
│   │   ├── ScriptureService.ts     # USFM processing, book parsing
│   │   ├── ScriptureCache.ts       # Book-based cache management
│   │   └── ScriptureTypes.ts       # Scripture-specific types
│   ├── adapters/
│   │   ├── WebScriptureAdapter.ts  # Web-specific scripture handling
│   │   └── MobileScriptureAdapter.ts # Mobile-specific scripture handling
│   └── package.json               # Independent npm package
├── resource-notes/            # Translation Notes module
│   ├── src/
│   │   ├── NotesModule.ts         # Notes-specific implementation
│   │   ├── NotesService.ts        # TSV processing, note parsing
│   │   ├── NotesCache.ts          # Reference-based cache management
│   │   └── NotesTypes.ts          # Notes-specific types
│   ├── adapters/
│   │   ├── WebNotesAdapter.ts     # Web-specific notes handling
│   │   └── MobileNotesAdapter.ts  # Mobile-specific notes handling
│   └── package.json
├── resource-words/            # Translation Words module
│   ├── src/
│   │   ├── WordsModule.ts         # Words-specific implementation
│   │   ├── WordsService.ts        # Markdown processing, word definitions
│   │   ├── WordsCache.ts          # Word-based cache management
│   │   └── WordsTypes.ts          # Words-specific types
│   ├── adapters/
│   │   ├── WebWordsAdapter.ts     # Web-specific words handling
│   │   └── MobileWordsAdapter.ts  # Mobile-specific words handling
│   └── package.json
├── resource-academy/          # Translation Academy module
│   ├── src/
│   │   ├── AcademyModule.ts       # Academy-specific implementation
│   │   ├── AcademyService.ts      # Markdown processing, article parsing
│   │   ├── AcademyCache.ts        # Category/article cache management
│   │   └── AcademyTypes.ts        # Academy-specific types
│   ├── adapters/
│   │   ├── WebAcademyAdapter.ts   # Web-specific academy handling
│   │   └── MobileAcademyAdapter.ts # Mobile-specific academy handling
│   └── package.json
├── resource-audio/            # Audio resource module
│   ├── src/
│   │   ├── AudioModule.ts         # Audio-specific implementation
│   │   ├── AudioService.ts        # Audio processing, segment management
│   │   ├── AudioCache.ts          # Media cache with metadata
│   │   └── AudioTypes.ts          # Audio-specific types
│   ├── adapters/
│   │   ├── WebAudioAdapter.ts     # Web HTML5 audio handling
│   │   └── MobileAudioAdapter.ts  # Native audio handling
│   └── package.json
└── resource-video/            # Video resource module
    ├── src/
    │   ├── VideoModule.ts         # Video-specific implementation
    │   ├── VideoService.ts        # Video processing, segment management
    │   ├── VideoCache.ts          # Media cache with metadata
    │   └── VideoTypes.ts          # Video-specific types
    ├── adapters/
    │   ├── WebVideoAdapter.ts     # Web HTML5 video handling
    │   └── MobileVideoAdapter.ts  # Native video handling
    └── package.json
```

### Web App (React)
```
apps/web/src/
├── app/
│   ├── App.tsx                # React - Main app component
│   └── ErrorBoundary.tsx      # React - Global error handling
├── adapters/
│   ├── WebStorageAdapter.ts   # Web - IndexedDB + Cache API implementation
│   └── WebNavigationAdapter.ts # Web - Browser routing integration
├── components/
│   ├── workspace/
│   │   ├── WorkspaceProvider.tsx   # React - Context provider
│   │   └── ConfigPanel.tsx         # React - Configuration UI
│   ├── panels/
│   │   ├── PanelsContainer.tsx     # React - Main container
│   │   └── NavigationBar.tsx       # React - Navigation controls
│   └── resources/
│       ├── ResourceFactory.tsx           # React - Factory with component mapping
│       ├── ScriptureResourceComponent.tsx # React - Scripture with DOM rendering
│       ├── NotesResourceComponent.tsx     # React - Translation Notes
│       ├── AudioResourceComponent.tsx     # React - Audio with HTML5 player
│       └── VideoResourceComponent.tsx     # React - Video with HTML5 player
├── hooks/
│   ├── useWorkspace.ts        # React - Workspace hook
│   ├── useNavigation.ts       # React - Navigation hook
│   └── useResource.ts         # React - Resource hook
└── styles/
    └── tailwind.config.js     # Web - Tailwind CSS configuration
```

### Mobile App (React Native)
```
apps/mobile/src/
├── app/
│   ├── App.tsx                # React Native - Main app component
│   └── ErrorBoundary.tsx      # React Native - Global error handling
├── adapters/
│   ├── MobileStorageAdapter.ts # Mobile - SQLite + File System implementation
│   └── MobileNavigationAdapter.ts # Mobile - React Navigation integration
├── components/
│   ├── workspace/
│   │   ├── WorkspaceProvider.tsx   # React Native - Context provider
│   │   └── ConfigScreen.tsx        # React Native - Configuration screen
│   ├── panels/
│   │   ├── PanelsContainer.tsx     # React Native - Main container
│   │   └── NavigationHeader.tsx    # React Native - Navigation header
│   └── resources/
│       ├── ResourceFactory.tsx           # React Native - Factory with screen mapping
│       ├── ScriptureResourceScreen.tsx   # React Native - Scripture with native rendering
│       ├── NotesResourceScreen.tsx       # React Native - Translation Notes
│       ├── AudioResourceScreen.tsx       # React Native - Audio with native player
│       └── VideoResourceScreen.tsx       # React Native - Video with native player
├── hooks/
│   ├── useWorkspace.ts        # React Native - Workspace hook (same interface)
│   ├── useNavigation.ts       # React Native - Navigation hook (same interface)
│   └── useResource.ts         # React Native - Resource hook (same interface)
└── styles/
    └── nativewind.config.js   # Mobile - NativeWind configuration
```

## Implementation Roadmap

### Phase 1: Core Foundation & Module System

1. **Core Interfaces** - ResourceModule, ResourceCache, StorageAdapter interfaces
2. **Business Logic Layer** - Pure TypeScript logic for workspace, navigation, resources
3. **Cache Hierarchy System** - Standardized server/owner/language/resource/content structure
4. **Type Definitions** - Shared types for resources, navigation, storage
5. **Core Utilities** - Reference parsing, content filtering, cache path utilities

### Phase 2: Resource Module Development

1. **Scripture Module** - @bt-toolkit/resource-scripture with USFM processing
2. **Notes Module** - @bt-toolkit/resource-notes with TSV processing
3. **Words Module** - @bt-toolkit/resource-words with Markdown processing
4. **Academy Module** - @bt-toolkit/resource-academy with Markdown processing
5. **Audio Module** - @bt-toolkit/resource-audio with media cache management
6. **Module Registry** - Dynamic module loading and registration system

### Phase 3: Web Platform Implementation

1. **WebStorageAdapter** - IndexedDB + Cache API implementation with standardized hierarchy
2. **Module Integration** - Load and register resource modules in web app
3. **React Components** - Web-specific UI components using modular resources
4. **Web Routing** - Browser routing integration with navigation logic
5. **Tailwind Styling** - Web-specific styling system

### Phase 4: Mobile Platform Implementation

1. **MobileStorageAdapter** - SQLite + File System implementation with standardized hierarchy
2. **Module Integration** - Load and register same resource modules in mobile app
3. **React Native Components** - Mobile-specific UI components using same modular resources
4. **Mobile Navigation** - React Navigation integration
5. **NativeWind Styling** - Mobile-specific styling system

### Phase 5: Navigation System

1. **NavigationBar** - Book/chapter/verse selectors
2. **Navigation validation** - Ensure valid references
3. **URL synchronization** - Update URL on navigation changes
4. **Navigation persistence** - Remember user's position

### Phase 6: Panel Integration

1. **LinkedPanels integration** - Multi-panel layout with messaging
2. **Inter-Panel Communication** - Message-based coordination system
3. **ResourceFactory** - Dynamic resource creation with type-to-component mapping
4. **Component Registry** - Configurable mapping of resource types to components
5. **Panel persistence** - Remember configurations and interaction state

### Phase 7: Resource Loading & Coordination

1. **ResourceLayer** - Fetching and caching with alignment data
2. **Navigation reactivity** - Filter content by range
3. **Resource components** - ULT, UST, Translation Notes with cross-panel coordination
4. **Optimistic loading** - Show cached while updating
5. **Alignment system** - Word/content relationships for highlighting
6. **Interactive coordination** - Real-time cross-panel user feedback

### Phase 8: Polish

1. **Loading states** - User feedback
2. **Accessibility** - Keyboard navigation
3. **Performance** - Code splitting and lazy loading
4. **Testing** - Unit and integration tests

---

## Summary

This architecture provides a clear **map** and **flow** for the Translation Studio Web application:

**🗺️ Layer Map**: App → Workspace → Panels → Resources  
**🔄 Data Flow**: Configuration flows down, navigation triggers filtering, resources cache intelligently  
**📚 Central Scripture**: ULT/GLT provides navigation foundation for all resources  
**🔗 Panel Communication**: LinkedPanels messaging enables synchronized multi-panel experience  
**⚡ Interactive Coordination**: Real-time cross-panel highlighting and content relationships  

The design prioritizes **modularity** (self-contained, reusable resource modules), **extensibility** (easy to add new resource types), **performance** (smart hierarchical caching), **user experience** (responsive navigation and panel synchronization), **interactive coordination** (seamless cross-panel content relationships and real-time user feedback), **platform portability** (shared business logic across React Web, React Native, and future UI frameworks), and **reusability** (resource modules can be used in other Bible translation applications).
