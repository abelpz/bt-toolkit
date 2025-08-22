/**
 * TypeScript interfaces for USFM processing
 */

// Raw USFM-JS types
export interface USFMHeader {
  tag?: string;
  content?: string;
  type?: string;
  text?: string;
}

export interface USFMWordObject {
  text: string;
  tag: 'w';
  type: 'word';
  occurrence: string;
  occurrences: string;
}

export interface USFMTextObject {
  type: 'text';
  text: string;
}

export interface USFMAlignmentObject {
  tag: 'zaln';
  type: 'milestone';
  strong: string;
  lemma: string;
  morph: string;
  occurrence: string;
  occurrences: string;
  content: string;
  children: (USFMWordObject | USFMTextObject)[];
  endTag: string;
}

export interface USFMParagraphObject {
  tag: 'p' | 'q' | 'q1' | 'q2' | 'm' | 'mi' | 'pc' | 'pr' | 'cls';
  type: 'paragraph' | 'quote';
  nextChar?: string;
}

export type USFMVerseObject = USFMAlignmentObject | USFMTextObject | USFMWordObject | USFMParagraphObject;

export interface USFMVerse {
  verseObjects: USFMVerseObject[];
}

export interface USFMChapter {
  [verseNumber: string]: USFMVerse;
}

export interface USFMChapters {
  [chapterNumber: string]: USFMChapter;
}

export interface USFMDocument {
  headers: USFMHeader[];
  chapters: USFMChapters;
}

// Processed types
export interface ProcessedVerse {
  number: number;
  text: string;
  reference: string; // e.g., "JON 1:1"
  paragraphId?: string;
  hasSectionMarker?: boolean;
  sectionMarkers?: number;
}

export interface ProcessedParagraph {
  id: string;
  type: 'paragraph' | 'quote';
  style: 'p' | 'q' | 'q1' | 'q2' | 'm' | 'mi' | 'pc' | 'pr' | 'cls';
  indentLevel: number;
  startVerse: number;
  endVerse: number;
  verseCount: number;
  verseNumbers: number[];
  combinedText: string;
  verses: ProcessedVerse[];
}

export interface ProcessedChapter {
  number: number;
  verseCount: number;
  paragraphCount: number;
  verses: ProcessedVerse[];
  paragraphs: ProcessedParagraph[];
}

export interface TranslationSection {
  id: string;
  startReference: string;
  startChapter: number;
  startVerse: number;
  endReference: string | null;
  endChapter: number | null;
  endVerse: number | null;
  title: string;
  description?: string;
}

export interface WordAlignment {
  verseRef: string;
  sourceWords: string[];
  targetWords: string[];
  alignmentData: {
    strong: string;
    lemma: string;
    morph: string;
    occurrence: string;
    occurrences: string;
  }[];
}

export interface ProcessingMetadata {
  bookCode: string;
  bookName: string;
  processingDate: string;
  processingDuration: number;
  version: string;
  hasAlignments: boolean;
  hasSections: boolean;
  totalChapters: number;
  totalVerses: number;
  totalParagraphs: number;
  statistics: {
    totalChapters: number;
    totalVerses: number;
    totalParagraphs: number;
    totalSections: number;
    totalAlignments: number;
  };
}

export interface ProcessedScripture {
  book: string;
  bookCode: string;
  metadata: ProcessingMetadata;
  chapters: ProcessedChapter[];
  sections?: TranslationSection[];
}

export interface ProcessingResult {
  structuredText: ProcessedScripture;
  sections: TranslationSection[];
  alignments: WordAlignment[];
  metadata: ProcessingMetadata;
}

// Utility types
export interface ScriptureReference {
  book: string;
  bookCode: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  displayReference: string;
}

export interface SectionReference {
  sectionId: string;
  section: TranslationSection;
  displayReference: string;
}

export type NavigationTarget = ScriptureReference | SectionReference;

export interface VerseWithSection extends ProcessedVerse {
  sectionId?: string;
  isFirstInSection?: boolean;
  isLastInSection?: boolean;
}
