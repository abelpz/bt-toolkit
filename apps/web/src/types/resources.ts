/**
 * Resource Types for Bible Translation Toolkit
 * Based on ARCHITECTURE.md Core Data Model & Interfaces
 */

// Base Resource Interface
export interface BaseResource {
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

export enum ResourceType {
  SCRIPTURE = "scripture",
  NOTES = "notes", 
  WORDS = "words",
  ACADEMY = "academy",
  AUDIO = "audio",
  VIDEO = "video",
  IMAGES = "images"
}

export enum NavigationMode {
  REACTIVE = "reactive",      // Reacts to book/reference changes (Scripture, Notes)
  INDEPENDENT = "independent", // Ignores navigation, has own state (Academy browser)
  HYBRID = "hybrid"          // Can switch between reactive and independent (Words)
}

// Resource Links
export interface ResourceLinks {
  // Static relationships (defined in metadata)
  related: string[]           // ["en_ust", "en_tn"] - related resources
  fallback?: string          // "en_glt" - fallback resource
  sourceTexts?: string[]     // ["en_ult", "en_ust"] - for notes/words
  
  // Dynamic cross-references (content-based)
  crossReferences: CrossReferenceMap
}

export interface CrossReferenceMap {
  // Outgoing links from this resource
  outgoing: {
    [contentId: string]: CrossReference[]
  }
  
  // Incoming links to this resource  
  incoming: {
    [contentId: string]: CrossReference[]
  }
}

export interface CrossReference {
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

export enum CrossReferenceType {
  EXPLANATION = "explanation",    // TN → TA (explains concept)
  DEFINITION = "definition",      // TN → TW (defines word)
  EXAMPLE = "example",           // TA → Scripture (shows example)
  RELATED = "related",           // General relationship
  ALIGNMENT = "alignment"        // Word alignment between resources
}

// Content Structure
export interface ContentStructure {
  type: "book-based" | "reference-based" | "hierarchical" | "word-based"
  [key: string]: any // Flexible structure for different resource types
}

// Scripture Resources (ULT, UST, GLT, GST)
export interface ScriptureContent extends BaseResource {
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
export interface NotesContent extends BaseResource {
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
export interface AcademyContent extends BaseResource {
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
export interface WordsContent extends BaseResource {
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

// Supporting types
export interface USFMMarker {
  tag: string
  content?: string
  attributes?: Record<string, string>
}

export interface AlignmentData {
  sourceWords: string[]
  targetWords: string[]
  strong: string
  lemma: string
  morph: string
  occurrence: string
  occurrences: string
}

export interface ScriptureReference {
  book: string
  chapter: number
  verse: number
  endChapter?: number
  endVerse?: number
}

// Resource Component Props
export interface ResourceComponentProps {
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

// Navigation State
export interface NavigationState {
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

export interface ResourceNavigationState {
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

export interface ModalContent {
  resourceId: string         // "en_ta"
  contentId: string         // "translate/figs-metaphor"
  triggerSource: {
    resourceId: string       // "en_tn"
    contentId: string        // "jon_1:4_note1"
  }
}
