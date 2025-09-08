/**
 * Normalized Cache Types for Optimal Cross-Reference Access
 * Treats cached resources as a relational knowledge graph
 */

import { BookId, LanguageCode } from './types.js';

/**
 * Repository identifier (local definition to avoid circular dependency)
 */
export interface RepositoryIdentifier {
  server: string;
  owner: string;
  repoId: string;
  ref: string;
}

// ============================================================================
// Resource Identity System
// ============================================================================

/**
 * Unique resource identifier that's independent of storage location
 * Format: {server}:{owner}:{repo}:{resourceType}:{resourcePath}
 * Example: "door43:unfoldingWord:en_ta:article:translate/figs-abstractnouns"
 */
export type ResourceId = string;

/**
 * Resource type classification for optimal indexing
 */
export type NormalizedResourceType = 
  | 'bible-verse'           // Individual verse from ULT/UST
  | 'bible-chapter'         // Chapter from ULT/UST  
  | 'translation-note'      // Individual TN entry
  | 'translation-word'      // Individual TW article
  | 'translation-academy'   // Individual TA article
  | 'translation-question'  // Individual TQ entry
  | 'words-link'           // Individual TWL entry
  | 'manifest'             // Repository manifest
  | 'alignment-data';      // Alignment information

/**
 * Resource metadata for registry
 */
export interface ResourceMetadata {
  /** Unique resource identifier */
  id: ResourceId;
  /** Resource type */
  type: NormalizedResourceType;
  /** Human-readable title */
  title: string;
  /** Resource description */
  description?: string;
  /** Source repository information */
  source: ResourceSource;
  /** Content location information */
  location: ResourceLocation;
  /** Cross-reference information */
  references: ResourceReferences;
  /** Cache metadata */
  cache: ResourceCacheMetadata;
}

/**
 * Source repository information
 */
export interface ResourceSource {
  /** Repository identifier */
  repository: RepositoryIdentifier;
  /** Original file path in repository */
  originalPath: string;
  /** Line/section within file (for granular resources) */
  section?: ResourceSection;
  /** Content hash for change detection */
  contentHash: string;
  /** Last known server modification time */
  serverModifiedAt?: Date;
}

/**
 * Section within a file (for granular resources like individual verses)
 */
export interface ResourceSection {
  /** Line number range */
  lines?: { start: number; end: number };
  /** Field name (for TSV entries) */
  field?: string;
  /** Verse reference (for Bible text) */
  verse?: { book: BookId; chapter: number; verse: number };
  /** Article section (for TA articles) */
  articleSection?: string;
}

/**
 * Resource location for content addressing
 */
export interface ResourceLocation {
  /** Book (if book-specific) */
  book?: BookId;
  /** Chapter (if chapter-specific) */
  chapter?: number;
  /** Verse (if verse-specific) */
  verse?: number;
  /** Language */
  language: LanguageCode;
  /** Additional location metadata */
  metadata: Record<string, any>;
}

/**
 * Cross-reference information
 */
export interface ResourceReferences {
  /** Resources this resource directly references */
  references: ResourceId[];
  /** Resources that reference this resource (backlinks) */
  referencedBy: ResourceId[];
  /** Strong's numbers associated with this resource */
  strongs: string[];
  /** Lemmas associated with this resource */
  lemmas: string[];
  /** RC links (rc://) found in this resource */
  rcLinks: string[];
  /** Support references to TA articles */
  supportReferences: string[];
  /** TW links to Translation Words */
  twLinks: string[];
}

/**
 * Cache-specific metadata
 */
export interface ResourceCacheMetadata {
  /** When resource was first cached */
  cachedAt: Date;
  /** Last accessed timestamp */
  lastAccessedAt: Date;
  /** Access count */
  accessCount: number;
  /** Processing metadata */
  processing: ProcessingInfo;
  /** Modification tracking */
  modification: ModificationInfo;
  /** Size in bytes */
  sizeBytes: number;
}

/**
 * Processing information
 */
export interface ProcessingInfo {
  /** When resource was processed */
  processedAt: Date;
  /** Processing duration */
  processingTimeMs: number;
  /** Parser used */
  parser: string;
  /** Processing options */
  options: Record<string, any>;
  /** Processing issues */
  issues: ProcessingIssue[];
}

/**
 * Processing issue
 */
export interface ProcessingIssue {
  level: 'error' | 'warning' | 'info';
  message: string;
  context?: string;
}

/**
 * Modification tracking
 */
export interface ModificationInfo {
  /** Whether resource has been modified locally */
  isDirty: boolean;
  /** When resource was last modified locally */
  lastModifiedAt?: Date;
  /** What was modified */
  modifications: ResourceModification[];
  /** Conflict resolution status */
  conflictStatus?: 'none' | 'detected' | 'resolved';
}

/**
 * Resource modification record
 */
export interface ResourceModification {
  /** Modification timestamp */
  timestamp: Date;
  /** Type of modification */
  type: 'content' | 'metadata' | 'references';
  /** Description of change */
  description: string;
  /** Old value (for rollback) */
  oldValue?: any;
  /** New value */
  newValue: any;
  /** User/system that made the change */
  modifiedBy: string;
}

// ============================================================================
// Normalized Content Structure
// ============================================================================

/**
 * Normalized resource content (optimized for access and editing)
 */
export interface NormalizedResource {
  /** Resource metadata */
  metadata: ResourceMetadata;
  /** Processed content data */
  content: NormalizedContent;
  /** Cross-reference data */
  crossReferences: CrossReferenceData;
}

/**
 * Content structure optimized for different resource types
 */
export type NormalizedContent = 
  | BibleVerseContent
  | TranslationNoteContent  
  | TranslationWordContent
  | TranslationAcademyContent
  | TranslationQuestionContent
  | WordsLinkContent
  | AlignmentContent;

/**
 * Bible verse content
 */
export interface BibleVerseContent {
  type: 'bible-verse';
  /** Verse reference */
  reference: { book: BookId; chapter: number; verse: number };
  /** Verse text */
  text: string;
  /** USFM markers */
  usfm?: string;
  /** Alignment data */
  alignment?: AlignmentGroup[];
  /** Word-level data */
  words: VerseWord[];
}

/**
 * Word within a verse
 */
export interface VerseWord {
  /** Word text */
  text: string;
  /** Position in verse */
  position: number;
  /** Strong's number */
  strongs?: string;
  /** Lemma */
  lemma?: string;
  /** Morphology */
  morph?: string;
  /** Alignment group ID */
  alignmentId?: string;
}

/**
 * Translation note content
 */
export interface TranslationNoteContent {
  type: 'translation-note';
  /** Note reference */
  reference: { book: BookId; chapter: number; verse: number };
  /** Note ID */
  id: string;
  /** Quoted text */
  quote: string;
  /** Occurrence number */
  occurrence: number;
  /** Note text */
  note: string;
  /** Support reference (resolved) */
  supportReference?: {
    raw: string; // Original rc:// link
    resolved: ResourceId; // Resolved TA article ID
  };
  /** Related resources */
  relatedResources: ResourceId[];
}

/**
 * Translation word content
 */
export interface TranslationWordContent {
  type: 'translation-word';
  /** Word identifier */
  id: string;
  /** Word title */
  title: string;
  /** Word definition */
  definition: string;
  /** Translation suggestions */
  translationSuggestions: string[];
  /** Related words */
  relatedWords: ResourceId[];
  /** Bible references */
  bibleReferences: Array<{
    book: BookId;
    chapter: number;
    verse: number;
    quote?: string;
  }>;
}

/**
 * Translation Academy content
 */
export interface TranslationAcademyContent {
  type: 'translation-academy';
  /** Article identifier */
  id: string;
  /** Article title */
  title: string;
  /** Article content (merged from title.md, subtitle.md, 01.md) */
  content: string;
  /** Article sections */
  sections: TASection[];
  /** Related articles */
  relatedArticles: ResourceId[];
  /** Question for reflection */
  question?: string;
  /** Examples */
  examples: TAExample[];
}

/**
 * TA article section
 */
export interface TASection {
  /** Section title */
  title: string;
  /** Section content */
  content: string;
  /** Section type */
  type: 'introduction' | 'explanation' | 'examples' | 'conclusion';
}

/**
 * TA example
 */
export interface TAExample {
  /** Example text */
  text: string;
  /** Example explanation */
  explanation?: string;
  /** Bible reference */
  reference?: {
    book: BookId;
    chapter: number;
    verse: number;
  };
}

/**
 * Translation question content
 */
export interface TranslationQuestionContent {
  type: 'translation-question';
  /** Question reference */
  reference: { book: BookId; chapter: number; verse: number };
  /** Question ID */
  id: string;
  /** Question text */
  question: string;
  /** Expected answer */
  answer?: string;
  /** Related resources */
  relatedResources: ResourceId[];
}

/**
 * Words link content
 */
export interface WordsLinkContent {
  type: 'words-link';
  /** Link reference */
  reference: { book: BookId; chapter: number; verse: number };
  /** Link ID */
  id: string;
  /** Original text */
  originalWords: string;
  /** Occurrence */
  occurrence: number;
  /** TW link (resolved) */
  twLink?: {
    raw: string; // Original rc:// link
    resolved: ResourceId; // Resolved TW article ID
  };
}

/**
 * Alignment content
 */
export interface AlignmentContent {
  type: 'alignment-data';
  /** Alignment reference */
  reference: { book: BookId; chapter: number; verse: number };
  /** Alignment groups */
  groups: AlignmentGroup[];
}

/**
 * Alignment group
 */
export interface AlignmentGroup {
  /** Group ID */
  id: string;
  /** Source words (original language) */
  sourceWords: string[];
  /** Target words (translation) */
  targetWords: string[];
  /** Strong's numbers */
  strongs: string[];
  /** Lemmas */
  lemmas: string[];
  /** Confidence score */
  confidence?: number;
}

// ============================================================================
// Cross-Reference Data
// ============================================================================

/**
 * Cross-reference data for fast traversal
 */
export interface CrossReferenceData {
  /** Direct references from this resource */
  outgoing: CrossReference[];
  /** References to this resource */
  incoming: CrossReference[];
  /** Semantic relationships */
  semantic: SemanticRelationship[];
}

/**
 * Cross-reference link
 */
export interface CrossReference {
  /** Target resource ID */
  targetId: ResourceId;
  /** Reference type */
  type: CrossReferenceType;
  /** Reference strength/confidence */
  strength: number; // 0-1
  /** Context of the reference */
  context?: string;
  /** Bidirectional flag */
  bidirectional: boolean;
}

/**
 * Cross-reference types
 */
export type CrossReferenceType =
  | 'support-reference'    // TN → TA
  | 'tw-link'             // TWL → TW
  | 'bible-reference'     // Any → Bible verse
  | 'related-concept'     // Semantic relationship
  | 'same-strongs'        // Same Strong's number
  | 'same-lemma'          // Same lemma
  | 'translation-pair';   // ULT ↔ UST

/**
 * Semantic relationship
 */
export interface SemanticRelationship {
  /** Related resource ID */
  relatedId: ResourceId;
  /** Relationship type */
  type: 'synonym' | 'antonym' | 'broader' | 'narrower' | 'related';
  /** Relationship strength */
  strength: number; // 0-1
  /** Relationship source */
  source: 'automatic' | 'manual' | 'imported';
}

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Resource query for flexible access
 */
export interface ResourceQuery {
  /** Resource IDs to fetch */
  ids?: ResourceId[];
  /** Resource type filter */
  type?: NormalizedResourceType;
  /** Location filter */
  location?: Partial<ResourceLocation>;
  /** Source repository filter */
  repository?: RepositoryIdentifier;
  /** Cross-reference filter */
  referencedBy?: ResourceId;
  /** References filter */
  references?: ResourceId;
  /** Strong's number filter */
  strongs?: string;
  /** Lemma filter */
  lemma?: string;
  /** Text search */
  textSearch?: string;
  /** Limit results */
  limit?: number;
  /** Sort order */
  sort?: 'relevance' | 'title' | 'lastAccessed' | 'lastModified';
}

/**
 * Resource query result
 */
export interface ResourceQueryResult {
  /** Matching resources */
  resources: NormalizedResource[];
  /** Total count (if limited) */
  totalCount: number;
  /** Query execution time */
  executionTimeMs: number;
  /** Whether results were cached */
  fromCache: boolean;
}

/**
 * Batch operation for efficiency
 */
export interface BatchOperation {
  /** Operation type */
  type: 'get' | 'set' | 'delete' | 'update';
  /** Resource ID */
  resourceId: ResourceId;
  /** Operation data */
  data?: any;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  /** Operation results */
  results: Array<{
    resourceId: ResourceId;
    success: boolean;
    data?: any;
    error?: string;
  }>;
  /** Total execution time */
  executionTimeMs: number;
}

export * from './normalized-cache-types.js';
