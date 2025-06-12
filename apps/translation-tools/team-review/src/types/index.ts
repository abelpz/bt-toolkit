// Translation resource types
export interface AlignmentData {
  strong: string;           // Strong's number (e.g., "G2316")
  lemma: string;           // Dictionary form (e.g., "θεός")
  morph: string;           // Morphological parsing
  occurrence: number;      // Which occurrence in verse
  occurrences: number;     // Total occurrences in verse
  content: string;         // Original language text
}

export interface AlignedWord {
  text: string;            // Gateway language word
  occurrence: number;      // Which occurrence of this word
  occurrences: number;     // Total occurrences of this word
  alignment?: AlignmentData; // Connection to original language
}

export interface VerseText {
  reference: string;
  words: AlignedWord[];    // Array of aligned words
  rawText: string;         // Plain text version for display
}

export interface TranslationNote {
  id: string;
  reference: string;
  quote: string;
  occurrence: number;
  note: string;
  supportReference?: string;
}

export interface TranslationWord {
  id: string;
  term: string;
  definition: string;
  examples: string[];
}

export interface TranslationWordLink {
  id: string;
  reference: string;
  originalWords: string;
  occurrence: number;
  twLink: string;
}

export interface ReviewComment {
  id: string;
  resourceType: 'ult' | 'ust' | 'tn' | 'tw';
  reference: string;
  textSelection?: string;
  comment: string;
  author: string;
  timestamp: Date;
  status: 'pending' | 'addressed' | 'resolved';
}

export interface BookResources {
  ult: VerseText[];
  ust: VerseText[];
  tn: TranslationNote[];
  tw: TranslationWord[];
  twl: TranslationWordLink[];
  comments: ReviewComment[];
} 