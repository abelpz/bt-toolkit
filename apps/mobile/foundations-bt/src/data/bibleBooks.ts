/**
 * Bible Books Data
 * Hardcoded list of Bible books for navigation (similar to QA app)
 */

export interface BibleBook {
  id: string;
  name: string;
  testament: 'OT' | 'NT';
  chapters: number;
  order: number;
}

export const BIBLE_BOOKS: BibleBook[] = [
  // Old Testament
  { id: 'GEN', name: 'Genesis', testament: 'OT', chapters: 50, order: 1 },
  { id: 'EXO', name: 'Exodus', testament: 'OT', chapters: 40, order: 2 },
  { id: 'LEV', name: 'Leviticus', testament: 'OT', chapters: 27, order: 3 },
  { id: 'NUM', name: 'Numbers', testament: 'OT', chapters: 36, order: 4 },
  { id: 'DEU', name: 'Deuteronomy', testament: 'OT', chapters: 34, order: 5 },
  { id: 'JOS', name: 'Joshua', testament: 'OT', chapters: 24, order: 6 },
  { id: 'JDG', name: 'Judges', testament: 'OT', chapters: 21, order: 7 },
  { id: 'RUT', name: 'Ruth', testament: 'OT', chapters: 4, order: 8 },
  { id: '1SA', name: '1 Samuel', testament: 'OT', chapters: 31, order: 9 },
  { id: '2SA', name: '2 Samuel', testament: 'OT', chapters: 24, order: 10 },
  { id: '1KI', name: '1 Kings', testament: 'OT', chapters: 22, order: 11 },
  { id: '2KI', name: '2 Kings', testament: 'OT', chapters: 25, order: 12 },
  { id: '1CH', name: '1 Chronicles', testament: 'OT', chapters: 29, order: 13 },
  { id: '2CH', name: '2 Chronicles', testament: 'OT', chapters: 36, order: 14 },
  { id: 'EZR', name: 'Ezra', testament: 'OT', chapters: 10, order: 15 },
  { id: 'NEH', name: 'Nehemiah', testament: 'OT', chapters: 13, order: 16 },
  { id: 'EST', name: 'Esther', testament: 'OT', chapters: 10, order: 17 },
  { id: 'JOB', name: 'Job', testament: 'OT', chapters: 42, order: 18 },
  { id: 'PSA', name: 'Psalms', testament: 'OT', chapters: 150, order: 19 },
  { id: 'PRO', name: 'Proverbs', testament: 'OT', chapters: 31, order: 20 },
  { id: 'ECC', name: 'Ecclesiastes', testament: 'OT', chapters: 12, order: 21 },
  { id: 'SNG', name: 'Song of Songs', testament: 'OT', chapters: 8, order: 22 },
  { id: 'ISA', name: 'Isaiah', testament: 'OT', chapters: 66, order: 23 },
  { id: 'JER', name: 'Jeremiah', testament: 'OT', chapters: 52, order: 24 },
  { id: 'LAM', name: 'Lamentations', testament: 'OT', chapters: 5, order: 25 },
  { id: 'EZK', name: 'Ezekiel', testament: 'OT', chapters: 48, order: 26 },
  { id: 'DAN', name: 'Daniel', testament: 'OT', chapters: 12, order: 27 },
  { id: 'HOS', name: 'Hosea', testament: 'OT', chapters: 14, order: 28 },
  { id: 'JOL', name: 'Joel', testament: 'OT', chapters: 3, order: 29 },
  { id: 'AMO', name: 'Amos', testament: 'OT', chapters: 9, order: 30 },
  { id: 'OBA', name: 'Obadiah', testament: 'OT', chapters: 1, order: 31 },
  { id: 'JON', name: 'Jonah', testament: 'OT', chapters: 4, order: 32 },
  { id: 'MIC', name: 'Micah', testament: 'OT', chapters: 7, order: 33 },
  { id: 'NAM', name: 'Nahum', testament: 'OT', chapters: 3, order: 34 },
  { id: 'HAB', name: 'Habakkuk', testament: 'OT', chapters: 3, order: 35 },
  { id: 'ZEP', name: 'Zephaniah', testament: 'OT', chapters: 3, order: 36 },
  { id: 'HAG', name: 'Haggai', testament: 'OT', chapters: 2, order: 37 },
  { id: 'ZEC', name: 'Zechariah', testament: 'OT', chapters: 14, order: 38 },
  { id: 'MAL', name: 'Malachi', testament: 'OT', chapters: 4, order: 39 },

  // New Testament
  { id: 'MAT', name: 'Matthew', testament: 'NT', chapters: 28, order: 40 },
  { id: 'MRK', name: 'Mark', testament: 'NT', chapters: 16, order: 41 },
  { id: 'LUK', name: 'Luke', testament: 'NT', chapters: 24, order: 42 },
  { id: 'JHN', name: 'John', testament: 'NT', chapters: 21, order: 43 },
  { id: 'ACT', name: 'Acts', testament: 'NT', chapters: 28, order: 44 },
  { id: 'ROM', name: 'Romans', testament: 'NT', chapters: 16, order: 45 },
  { id: '1CO', name: '1 Corinthians', testament: 'NT', chapters: 16, order: 46 },
  { id: '2CO', name: '2 Corinthians', testament: 'NT', chapters: 13, order: 47 },
  { id: 'GAL', name: 'Galatians', testament: 'NT', chapters: 6, order: 48 },
  { id: 'EPH', name: 'Ephesians', testament: 'NT', chapters: 6, order: 49 },
  { id: 'PHP', name: 'Philippians', testament: 'NT', chapters: 4, order: 50 },
  { id: 'COL', name: 'Colossians', testament: 'NT', chapters: 4, order: 51 },
  { id: '1TH', name: '1 Thessalonians', testament: 'NT', chapters: 5, order: 52 },
  { id: '2TH', name: '2 Thessalonians', testament: 'NT', chapters: 3, order: 53 },
  { id: '1TI', name: '1 Timothy', testament: 'NT', chapters: 6, order: 54 },
  { id: '2TI', name: '2 Timothy', testament: 'NT', chapters: 4, order: 55 },
  { id: 'TIT', name: 'Titus', testament: 'NT', chapters: 3, order: 56 },
  { id: 'PHM', name: 'Philemon', testament: 'NT', chapters: 1, order: 57 },
  { id: 'HEB', name: 'Hebrews', testament: 'NT', chapters: 13, order: 58 },
  { id: 'JAS', name: 'James', testament: 'NT', chapters: 5, order: 59 },
  { id: '1PE', name: '1 Peter', testament: 'NT', chapters: 5, order: 60 },
  { id: '2PE', name: '2 Peter', testament: 'NT', chapters: 3, order: 61 },
  { id: '1JN', name: '1 John', testament: 'NT', chapters: 5, order: 62 },
  { id: '2JN', name: '2 John', testament: 'NT', chapters: 1, order: 63 },
  { id: '3JN', name: '3 John', testament: 'NT', chapters: 1, order: 64 },
  { id: 'JUD', name: 'Jude', testament: 'NT', chapters: 1, order: 65 },
  { id: 'REV', name: 'Revelation', testament: 'NT', chapters: 22, order: 66 },
];

// Helper functions
export const getBibleBookById = (id: string): BibleBook | undefined => {
  return BIBLE_BOOKS.find(book => book.id === id);
};

export const getBibleBookByName = (name: string): BibleBook | undefined => {
  return BIBLE_BOOKS.find(book => 
    book.name.toLowerCase() === name.toLowerCase() ||
    book.id.toLowerCase() === name.toLowerCase()
  );
};

export const getOldTestamentBooks = (): BibleBook[] => {
  return BIBLE_BOOKS.filter(book => book.testament === 'OT');
};

export const getNewTestamentBooks = (): BibleBook[] => {
  return BIBLE_BOOKS.filter(book => book.testament === 'NT');
};

export const getAllBookIds = (): string[] => {
  return BIBLE_BOOKS.map(book => book.id);
};

export const getAllBookNames = (): string[] => {
  return BIBLE_BOOKS.map(book => book.name);
};

// For compatibility with existing code
export const availableBooksFromBibleData = getAllBookIds();
