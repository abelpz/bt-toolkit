/**
 * TypeScript interfaces for Translation Helps resources
 * Based on unfoldingWord Resource Container specification
 */

// Base interfaces for all resources
export interface ResourceManifest {
  dublin_core: {
    identifier: string;
    language: {
      identifier: string;
      direction: 'ltr' | 'rtl';
    };
    subject: string;
    type: 'bundle' | 'help' | 'dict' | 'man';
    version: string;
    relation?: string[];
  };
  projects?: Array<{
    identifier: string;
    title: string;
    path: string;
    sort: number;
    versification?: string;
    categories?: string[];
  }>;
}

// Translation Notes (TN) interfaces
export interface TranslationNote {
  Reference: string;      // "1:1" or "1:1-2"
  ID: string;            // "abc1"
  Tags: string;          // "grammar", "culture", "translate"
  SupportReference: string; // "rc://*/ta/man/translate/figs-metaphor"
  Quote: string;         // "In the beginning"
  Occurrence: string;    // "1"
  Note: string;          // Translation guidance (markdown)
}

export interface TranslationNotesData {
  book: string;          // "JON", "PHM"
  notes: TranslationNote[];
}

// Translation Words Links (TWL) interfaces
export interface TranslationWordsLink {
  Reference: string;     // "1:1"
  ID: string;           // "xyz1"
  Tags: string;         // "kt", "names", "other"
  OrigWords: string;    // "בְּרֵאשִׁית" (original Hebrew/Greek)
  Occurrence: string;   // "1"
  TWLink: string;       // "rc://*/tw/dict/bible/kt/god"
}

export interface TranslationWordsLinksData {
  book: string;         // "JON", "PHM"
  links: TranslationWordsLink[];
}

// Translation Questions (TQ) interfaces
export interface TranslationQuestion {
  Reference: string;    // "1:1-2"
  ID: string;          // "xyz1"
  Tags: string;        // Question categories
  Quote: string;       // Text being referenced (optional)
  Occurrence: string;  // Occurrence number
  Question: string;    // The quality assurance question
  Response: string;    // Expected answer
}

export interface TranslationQuestionsData {
  book: string;        // "JON", "PHM"
  questions: TranslationQuestion[];
}

// Translation Words (TW) interfaces
export interface TranslationWord {
  id: string;          // "god", "love", "jonah"
  category: 'kt' | 'names' | 'other'; // Key terms, names, other
  title: string;       // "God", "Love", "Jonah"
  definition: string;  // Main definition section
  translationSuggestions: string; // Translation guidance
  bibleReferences: string[]; // Cross-references
  content: string;     // Full markdown content
}

// Translation Academy (TA) interfaces
export interface TranslationAcademyArticle {
  id: string;          // "figs-metaphor", "translate-names"
  title: string;       // "Metaphor", "How to Translate Names"
  category: string;    // "translate", "checking", "intro"
  content: string;     // Full markdown content
  description?: string; // Article description
  examples?: string;   // Examples section
  strategies?: string; // Translation strategies
}

// Bible Text interfaces
export interface BibleText {
  book: string;        // "JON", "PHM"
  translation: 'ULT' | 'UST'; // Translation type
  content: string;     // Full USFM content
  hasAlignment: boolean; // Whether it contains word alignment data
}

export interface AlignmentData {
  originalWord: string;    // Hebrew/Greek word
  gatewayWords: string[];  // English words aligned to it
  strongsNumber?: string;  // Strong's concordance number
  lemma?: string;         // Dictionary form
  morphology?: string;    // Grammatical parsing
  occurrence: number;     // Which occurrence in verse
  occurrences: number;    // Total occurrences in verse
}

// RC Link parsing
export interface RCLink {
  language: string;    // 'en' or '*'
  resource: string;    // 'tw', 'tn', 'ta', 'tq'
  type: string;        // 'dict', 'help', 'man'
  project: string;     // 'bible', 'gen', 'translate'
  category?: string;   // 'kt', '01', 'figs-metaphor'
  item?: string;       // 'god', '02'
  original: string;    // Original RC link
}

// Verse reference parsing
export interface VerseReference {
  book: string;        // "JON", "PHM"
  chapter: number;     // 1, 2, 3
  verse?: number;      // 1, 2, 3 (optional for chapter references)
  endVerse?: number;   // For ranges like "1:1-3"
  original: string;    // Original reference string
}

// Combined translation helps for a specific passage
export interface PassageHelps {
  reference: VerseReference;
  notes: TranslationNote[];
  questions: TranslationQuestion[];
  wordLinks: TranslationWordsLink[];
  words: TranslationWord[];
  academyArticles: TranslationAcademyArticle[];
  bibleTexts: BibleText[];
}

// Resource loading state
export interface ResourceLoadingState {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface TranslationHelpsState {
  translationNotes: {
    data: Map<string, TranslationNotesData>;
    loading: ResourceLoadingState;
  };
  translationWords: {
    data: Map<string, TranslationWord>;
    loading: ResourceLoadingState;
  };
  translationWordsLinks: {
    data: Map<string, TranslationWordsLinksData>;
    loading: ResourceLoadingState;
  };
  translationQuestions: {
    data: Map<string, TranslationQuestionsData>;
    loading: ResourceLoadingState;
  };
}

// Search and filtering
export interface HelpsSearchOptions {
  book?: string;
  chapter?: number;
  verse?: number;
  tags?: string[];
  searchText?: string;
}

export interface HelpsSearchResult {
  type: 'note' | 'question' | 'word' | 'link';
  reference: VerseReference;
  content: TranslationNote | TranslationQuestion | TranslationWord | TranslationWordsLink;
  relevanceScore: number;
}
