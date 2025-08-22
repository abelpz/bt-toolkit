/**
 * Scripture utility functions for working with processed USFM data
 */

import { ProcessedScripture, ProcessedVerse, ScriptureReference } from '../types/usfm.js';

/**
 * Get a specific verse by reference
 */
export function getVerse(
  scripture: ProcessedScripture, 
  chapterNum: number, 
  verseNum: number
): ProcessedVerse | null {
  const chapter = scripture.chapters.find(ch => ch.number === chapterNum);
  if (!chapter) return null;
  return chapter.verses.find(v => v.number === verseNum) || null;
}

/**
 * Get verses in a range
 */
export function getVerseRange(
  scripture: ProcessedScripture, 
  chapterNum: number, 
  verseRange: string
): ProcessedVerse[] {
  const chapter = scripture.chapters.find(ch => ch.number === chapterNum);
  if (!chapter) return [];
  
  if (verseRange.includes('-')) {
    const [start, end] = verseRange.split('-').map(n => parseInt(n.trim()));
    return chapter.verses.filter(v => v.number >= start && v.number <= end);
  } else {
    const verseNum = parseInt(verseRange.trim());
    const verse = chapter.verses.find(v => v.number === verseNum);
    return verse ? [verse] : [];
  }
}

/**
 * Format verses for display
 */
export function formatVerses(verses: ProcessedVerse[], showNumbers: boolean = true): string {
  if (!Array.isArray(verses)) return '';
  
  return verses.map(verse => {
    return showNumbers ? `${verse.number} ${verse.text}` : verse.text;
  }).join(' ');
}

/**
 * Parse a scripture reference string
 */
export function parseScriptureReference(reference: string): ScriptureReference | null {
  // Handle formats like "JON 1:1", "Jonah 1:1-3", "JON 2:5-7"
  const match = reference.match(/^(\w+)\s+(\d+):(\d+)(?:-(\d+))?$/);
  
  if (!match) return null;
  
  const [, book, chapterStr, verseStartStr, verseEndStr] = match;
  const chapter = parseInt(chapterStr);
  const verseStart = parseInt(verseStartStr);
  const verseEnd = verseEndStr ? parseInt(verseEndStr) : undefined;
  
  return {
    book: book.toUpperCase(),
    bookCode: book.toUpperCase(),
    chapter,
    verseStart,
    verseEnd,
    displayReference: reference
  };
}

/**
 * Get verses by scripture reference string
 */
export function getVersesByReference(
  scripture: ProcessedScripture, 
  reference: string
): ProcessedVerse[] {
  const parsed = parseScriptureReference(reference);
  if (!parsed) return [];
  
  if (parsed.verseEnd) {
    return getVerseRange(scripture, parsed.chapter, `${parsed.verseStart}-${parsed.verseEnd}`);
  } else {
    const verse = getVerse(scripture, parsed.chapter, parsed.verseStart);
    return verse ? [verse] : [];
  }
}

/**
 * Search for text within scripture
 */
export function searchScripture(
  scripture: ProcessedScripture, 
  searchTerm: string, 
  caseSensitive: boolean = false
): ProcessedVerse[] {
  const results: ProcessedVerse[] = [];
  const term = caseSensitive ? searchTerm : searchTerm.toLowerCase();
  
  for (const chapter of scripture.chapters) {
    for (const verse of chapter.verses) {
      const text = caseSensitive ? verse.text : verse.text.toLowerCase();
      if (text.includes(term)) {
        results.push(verse);
      }
    }
  }
  
  return results;
}

/**
 * Get chapter summary
 */
export function getChapterSummary(scripture: ProcessedScripture, chapterNum: number) {
  const chapter = scripture.chapters.find(ch => ch.number === chapterNum);
  if (!chapter) return null;
  
  return {
    number: chapter.number,
    verseCount: chapter.verseCount,
    paragraphCount: chapter.paragraphCount,
    firstVerse: chapter.verses[0]?.text.substring(0, 100) + '...',
    lastVerse: chapter.verses[chapter.verses.length - 1]?.text.substring(0, 100) + '...'
  };
}

/**
 * Get book statistics
 */
export function getBookStatistics(scripture: ProcessedScripture) {
  const totalWords = scripture.chapters.reduce((total, chapter) => {
    return total + chapter.verses.reduce((chapterTotal, verse) => {
      return chapterTotal + verse.text.split(/\s+/).length;
    }, 0);
  }, 0);
  
  const averageVerseLength = scripture.metadata.totalVerses > 0 
    ? Math.round(totalWords / scripture.metadata.totalVerses)
    : 0;
  
  return {
    ...scripture.metadata.statistics,
    totalWords,
    averageVerseLength,
    averageVersesPerChapter: Math.round(scripture.metadata.totalVerses / scripture.metadata.totalChapters)
  };
}
