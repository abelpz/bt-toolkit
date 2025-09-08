/**
 * Navigation Types - Iteration 2
 * Enhanced navigation system with BCV, Sections, and Passage Sets
 */

// Base reference types
export interface VerseReference {
  book: string;
  chapter: number;
  verse: number;
}

export interface RangeReference {
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter?: number;
  endVerse?: number;
}

// Navigation modes
export type NavigationMode = 'bcv' | 'sections' | 'passages';

// BCV Navigation
export interface BCVSelection {
  book?: string;
  chapter?: number;
  verse?: number;
  endChapter?: number;
  endVerse?: number;
}

// Section Navigation
export interface SectionReference {
  book: string;
  sectionId: string;
  title: string;
  range: RangeReference;
}

// Passage Set Navigation
export interface PassageReference {
  setId: string;
  categoryId: string;
  passageId: string;
  ranges: RangeReference[];
}

// Current navigation state
export interface NavigationState {
  mode: NavigationMode;
  currentRange: RangeReference;
  bcvSelection?: BCVSelection;
  sectionReference?: SectionReference;
  passageReference?: PassageReference;
  history: RangeReference[];
}

// Navigation actions
export type NavigationAction = 
  | { type: 'SET_MODE'; mode: NavigationMode }
  | { type: 'SET_BCV'; selection: BCVSelection }
  | { type: 'SET_SECTION'; section: SectionReference }
  | { type: 'SET_PASSAGE'; passage: PassageReference }
  | { type: 'SET_RANGE'; range: RangeReference }
  | { type: 'ADD_TO_HISTORY'; range: RangeReference }
  | { type: 'CLEAR_HISTORY' };

// Helper functions
export const createSingleVerseRange = (book: string, chapter: number, verse: number): RangeReference => ({
  book,
  startChapter: chapter,
  startVerse: verse
});

export const createVerseRange = (
  book: string, 
  startChapter: number, 
  startVerse: number, 
  endChapter?: number, 
  endVerse?: number
): RangeReference => ({
  book,
  startChapter,
  startVerse,
  endChapter,
  endVerse
});

export const formatRangeReference = (range: RangeReference): string => {
  const bookName = range.book.toUpperCase();
  
  if (!range.endChapter || (range.startChapter === range.endChapter && !range.endVerse)) {
    // Single verse
    return `${bookName} ${range.startChapter}:${range.startVerse}`;
  }
  
  if (range.startChapter === range.endChapter) {
    // Same chapter, verse range
    return `${bookName} ${range.startChapter}:${range.startVerse}-${range.endVerse}`;
  }
  
  // Cross-chapter range
  return `${bookName} ${range.startChapter}:${range.startVerse}-${range.endChapter}:${range.endVerse}`;
};

export const isRangeEqual = (range1: RangeReference, range2: RangeReference): boolean => {
  return (
    range1.book === range2.book &&
    range1.startChapter === range2.startChapter &&
    range1.startVerse === range2.startVerse &&
    range1.endChapter === range2.endChapter &&
    range1.endVerse === range2.endVerse
  );
};

export const isVerseInRange = (verse: VerseReference, range: RangeReference): boolean => {
  if (verse.book !== range.book) return false;
  
  const versePosition = verse.chapter * 1000 + verse.verse;
  const startPosition = range.startChapter * 1000 + range.startVerse;
  const endPosition = range.endChapter 
    ? range.endChapter * 1000 + (range.endVerse || 999)
    : startPosition;
  
  return versePosition >= startPosition && versePosition <= endPosition;
};
