/**
 * Core Types for Door43 Ecosystem
 * Fundamental data structures used across all Door43 libraries
 */

// ============================================================================
// Basic Identifiers and References
// ============================================================================

export type BookId = string; // 3-letter book codes: 'GEN', 'JON', 'MAT', etc.
export type LanguageCode = string; // ISO language codes: 'en', 'es-419', etc.
export type OrganizationId = string; // Door43 organization: 'unfoldingWord', etc.
export type ResourceId = string; // Resource identifiers: 'ult', 'ust', 'tn', etc.

export interface VerseReference {
  book: BookId;
  chapter: number;
  verse: number;
}

export interface VerseRange {
  start: VerseReference;
  end?: VerseReference; // Optional for single verse
}

// ============================================================================
// Alignment Data Structures
// ============================================================================

export interface AlignmentData {
  /** Strong's number (e.g., "H0430", "G2316") */
  strong?: string;
  /** Lemma form of the word */
  lemma?: string;
  /** Morphological information */
  morph?: string;
  /** Occurrence number in this verse (1-based) */
  occurrence: number;
  /** Total occurrences of this word in this verse */
  occurrences: number;
  /** Original language word */
  originalWord?: string;
  /** Gateway language word(s) */
  gatewayWords: string[];
}

export interface AlignmentGroup {
  /** Alignment data for this group */
  alignment: AlignmentData;
  /** Gateway language words in this group */
  words: string[];
  /** Start index in the verse text */
  startIndex: number;
  /** End index in the verse text */
  endIndex: number;
}

export interface AlignmentReference {
  /** Scripture reference */
  reference: VerseReference;
  /** Word index within the verse */
  wordIndex: number;
  /** The actual word text */
  wordText: string;
  /** Alignment data for this word */
  alignment: AlignmentData;
}

// ============================================================================
// Scripture Data Structures
// ============================================================================

export interface ProcessedVerse {
  /** Verse number */
  number: number;
  /** Verse text content */
  text: string;
  /** Alignment groups for word-level mapping */
  alignments: AlignmentGroup[];
  /** Raw USFM content for this verse */
  usfm?: string;
}

export interface ProcessedChapter {
  /** Chapter number */
  number: number;
  /** Chapter title/heading */
  title?: string;
  /** Verses in this chapter */
  verses: ProcessedVerse[];
}

export interface ProcessedScripture {
  /** Book identifier */
  book: BookId;
  /** Book name */
  bookName: string;
  /** Language code */
  language: LanguageCode;
  /** Resource type */
  resourceType: 'literal' | 'simplified';
  /** Chapters in this book */
  chapters: ProcessedChapter[];
  /** Full content as string */
  content: string;
  /** Processing metadata */
  metadata: {
    source: string;
    processedAt: Date;
    version?: string;
  };
}

// ============================================================================
// Translation Helps Data Structures
// ============================================================================

export interface TranslationNote {
  /** Reference (e.g., "1:1", "1:1-2") */
  Reference: string;
  /** Verse reference object */
  reference: VerseReference;
  /** Chapter number */
  chapter: number;
  /** Verse number */
  verse: number;
  /** Unique identifier */
  ID: string;
  /** Tags for categorization */
  Tags: string;
  /** Support reference (rc:// link) */
  SupportReference: string;
  /** Quote from the text */
  Quote: string;
  /** Occurrence number */
  Occurrence: number;
  /** Gateway language quote */
  GLQuote: string;
  /** Occurrence note */
  OccurrenceNote: string;
  /** Translation note content */
  Note: string;
}

export interface TranslationWordsLink {
  /** Reference (e.g., "1:1") */
  Reference: string;
  /** Verse reference object */
  reference: VerseReference;
  /** Chapter number */
  chapter: number;
  /** Verse number */
  verse: number;
  /** Unique identifier */
  ID: string;
  /** Tags for categorization */
  Tags: string;
  /** Original language words */
  OrigWords: string;
  /** Occurrence number */
  Occurrence: number;
  /** Gateway language words */
  GLWords: string;
  /** Translation Words link */
  TWLink: string;
}

export interface TranslationQuestion {
  /** Reference (e.g., "1:1-2") */
  Reference: string;
  /** Verse reference object */
  reference: VerseReference;
  /** Chapter number */
  chapter: number;
  /** Verse number */
  verse: number;
  /** Unique identifier */
  ID: string;
  /** Tags for categorization */
  Tags: string;
  /** Question text */
  Question: string;
  /** Response/answer text */
  Response: string;
}

export interface TranslationWord {
  /** Word identifier */
  id: string;
  /** Word term */
  term: string;
  /** Definition */
  definition: string;
  /** Translation suggestions */
  translationSuggestions: string[];
  /** Related terms */
  relatedTerms: string[];
  /** Examples */
  examples: string[];
  /** Metadata */
  metadata: {
    source: string;
    processedAt: Date;
  };
}

export interface TranslationAcademyArticle {
  /** Article identifier */
  id: string;
  /** Article title */
  title: string;
  /** Article subtitle */
  subtitle?: string;
  /** Article content (processed from multiple files) */
  content: string;
  /** Article category */
  category: string;
  /** Article slug */
  slug: string;
  /** Related articles */
  relatedArticles: string[];
  /** Metadata */
  metadata: {
    source: string;
    processedAt: Date;
  };
}

// ============================================================================
// Resource Container Structures
// ============================================================================

export interface ResourceManifest {
  /** Projects in this resource */
  projects: Array<{
    /** Project identifier (usually book ID) */
    identifier: string;
    /** Project title */
    title?: string;
    /** File path */
    path: string;
    /** Project categories */
    categories?: string[];
  }>;
  /** Resource metadata */
  metadata?: {
    version?: string;
    stage?: string;
    subject?: string;
    language?: LanguageCode;
  };
}

export interface Door43Repository {
  /** Repository name */
  name: string;
  /** Repository owner */
  owner: {
    login: string;
    [key: string]: any;
  };
  /** Full name (owner/repo) */
  full_name: string;
  /** Description */
  description: string;
  /** Subject */
  subject: string;
  /** Language */
  language: LanguageCode;
  /** Stage (prod, preprod, draft) */
  stage: string;
  /** Last updated */
  updated_at: string;
  /** Repository URL */
  url: string;
  /** Git URL */
  git_url: string;
  /** Clone URL */
  clone_url: string;
  /** Default branch */
  default_branch?: string;
  /** Branch or tag name */
  branch_or_tag_name?: string;
}

// ============================================================================
// Book Package Structures
// ============================================================================

export interface BookResource<T = any> {
  /** Source repository/file */
  source: string;
  /** Raw content */
  content: string;
  /** Processed data */
  processed: T;
  /** Fetch metadata */
  metadata?: {
    fetchedAt: Date;
    version?: string;
    ref?: string;
  };
}

export interface BookTranslationPackage {
  /** Book identifier */
  book: BookId;
  /** Language code */
  language: LanguageCode;
  /** Organization */
  organization: OrganizationId;
  /** When this package was fetched */
  fetchedAt: Date;
  /** Source repositories used */
  repositories: Record<string, Door43Repository>;
  
  // Book-specific resources
  /** Literal text (ULT/GLT) */
  literalText?: BookResource<ProcessedScripture>;
  /** Simplified text (UST/GST) */
  simplifiedText?: BookResource<ProcessedScripture>;
  /** Translation notes */
  translationNotes?: BookResource<TranslationNote[]>;
  /** Translation words links */
  translationWordsLinks?: BookResource<TranslationWordsLink[]>;
  /** Translation questions */
  translationQuestions?: BookResource<TranslationQuestion[]>;
}

export interface OnDemandResource<T = any> {
  /** Resource type */
  type: 'translation-words' | 'translation-academy';
  /** Resource identifier */
  identifier: string;
  /** Source repository/file */
  source: string;
  /** Raw content */
  content: string;
  /** Processed data */
  processed?: T;
  /** Fetch timestamp */
  fetchedAt: Date;
}

// ============================================================================
// Cross-Reference Structures
// ============================================================================

export interface CrossReference {
  /** Type of cross-reference */
  type: 'translation-note' | 'translation-word' | 'translation-question' | 'translation-academy';
  /** Resource identifier */
  resourceId: string;
  /** Reference information */
  reference: VerseReference;
  /** Relevance score (0-1) */
  relevance: number;
  /** Match reason */
  matchReason: 'exact-word' | 'strong-number' | 'lemma' | 'verse-context';
  /** Resource data */
  data: TranslationNote | TranslationWordsLink | TranslationQuestion | TranslationAcademyArticle;
}

export interface WordInteractionResult {
  /** The alignment reference that was queried */
  alignmentReference: AlignmentReference;
  /** Cross-references found */
  crossReferences: CrossReference[];
  /** Processing metadata */
  metadata: {
    processedAt: Date;
    processingTimeMs: number;
    totalResults: number;
  };
}

// ============================================================================
// Service Result Types
// ============================================================================

export interface ServiceResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result data (if successful) */
  data?: T;
  /** Error message (if failed) */
  error?: string;
  /** Additional metadata */
  metadata?: {
    source?: 'cache' | 'api' | 'local';
    timestamp?: Date;
    [key: string]: any;
  };
}

export type AsyncResult<T> = Promise<ServiceResult<T>>;

// ============================================================================
// Configuration Types
// ============================================================================

export type RuntimeMode = 'online' | 'offline';
export type PlatformTarget = 'web' | 'react-native' | 'node' | 'mcp';
export type StorageBackend = 'indexeddb' | 'asyncstorage' | 'filesystem' | 'memory';
export type CacheStrategy = 'lru' | 'ttl' | 'manual';

export interface PlatformConfig {
  target: PlatformTarget;
  storageBackend: StorageBackend;
  cacheStrategy: CacheStrategy;
  maxCacheSize?: number;
  defaultTTL?: number;
}

export interface Door43Config {
  baseUrl?: string;
  language: LanguageCode;
  organization: OrganizationId;
  apiToken?: string;
  userAgent?: string;
  timeout?: number;
  maxRetries?: number;
}

// ============================================================================
// Bible Book Metadata
// ============================================================================

export interface BibleBook {
  /** 3-letter book ID */
  id: BookId;
  /** Full book name */
  name: string;
  /** Number of chapters */
  chapters: number;
  /** Testament */
  testament: 'OT' | 'NT';
  /** Canonical order */
  order: number;
  /** Alternative names */
  alternativeNames?: string[];
  /** Book number (for file naming) */
  bookNumber?: number;
}
