/**
 * Translation Helps Parser Service
 * Parses TSV and Markdown files from Door43 resources
 */

import {
  TranslationNote,
  TranslationNotesData,
  TranslationWordsLink,
  TranslationWordsLinksData,
  TranslationQuestion,
  TranslationQuestionsData,
  TranslationWord,
  TranslationAcademyArticle,
  BibleText,
  AlignmentData,
  RCLink,
  VerseReference,
} from '../types/translationHelps';

/**
 * Parse TSV content into array of objects
 */
export function parseTSV<T>(content: string): T[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split('\t');
  const data: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    data.push(row as T);
  }

  return data;
}

/**
 * Parse Translation Notes TSV file
 */
export function parseTranslationNotes(content: string, book: string): TranslationNotesData {
  const notes = parseTSV<TranslationNote>(content);
  
  // Filter out intro notes for now (they have special handling)
  const verseNotes = notes.filter(note => 
    !note.Reference.includes('intro') && 
    !note.Reference.includes('front:')
  );

  return {
    book,
    notes: verseNotes
  };
}

/**
 * Parse Translation Words Links TSV file
 */
export function parseTranslationWordsLinks(content: string, book: string): TranslationWordsLinksData {
  const links = parseTSV<TranslationWordsLink>(content);
  
  return {
    book,
    links
  };
}

/**
 * Parse Translation Questions TSV file
 */
export function parseTranslationQuestions(content: string, book: string): TranslationQuestionsData {
  const questions = parseTSV<TranslationQuestion>(content);
  
  return {
    book,
    questions
  };
}

/**
 * Parse Translation Words Markdown file
 * TW files are organized in bible/kt/, bible/names/, bible/other/
 */
export function parseTranslationWord(content: string, id: string, filePath: string): TranslationWord {
  // Extract title (first line after #)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : id;
  
  // Extract definition section
  const definitionMatch = content.match(/## Definition\s*\n([\s\S]*?)(?=\n## |$)/);
  const definition = definitionMatch ? definitionMatch[1].trim() : '';
  
  // Extract translation suggestions
  const suggestionsMatch = content.match(/## Translation Suggestions\s*\n([\s\S]*?)(?=\n## |$)/);
  const translationSuggestions = suggestionsMatch ? suggestionsMatch[1].trim() : '';
  
  // Extract Bible references
  const referencesMatch = content.match(/## Bible References\s*\n([\s\S]*?)(?=\n## |$)/);
  const bibleReferences: string[] = [];
  if (referencesMatch) {
    const refLines = referencesMatch[1].split('\n');
    refLines.forEach(line => {
      const refMatch = line.match(/\* \[([^\]]+)\]/);
      if (refMatch) {
        bibleReferences.push(refMatch[1]);
      }
    });
  }
  
  // Determine category based on file path structure
  let category: 'kt' | 'names' | 'other' = 'other';
  if (filePath.includes('bible/kt/')) {
    category = 'kt';
  } else if (filePath.includes('bible/names/')) {
    category = 'names';
  } else if (filePath.includes('bible/other/')) {
    category = 'other';
  }
  
  return {
    id,
    category,
    title,
    definition,
    translationSuggestions,
    bibleReferences,
    content
  };
}

/**
 * Parse Translation Academy article from 01.md content
 * TA articles are split across 3 files: title.md, sub-title.md, 01.md
 */
export function parseTranslationAcademyArticle(
  content: string, 
  id: string, 
  titleContent?: string, 
  subtitleContent?: string
): TranslationAcademyArticle {
  // Use provided title/subtitle or extract from content
  let title = titleContent?.trim() || id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  let subtitle = subtitleContent?.trim() || '';
  
  // If no separate title provided, try to extract from content
  if (!titleContent) {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1];
    }
  }
  
  // Extract description section
  const descriptionMatch = content.match(/### Description\s*\n([\s\S]*?)(?=\n### |$)/);
  const description = descriptionMatch ? descriptionMatch[1].trim() : '';
  
  // Extract examples section
  const examplesMatch = content.match(/### Examples? (?:From the Bible|from Scripture)\s*\n([\s\S]*?)(?=\n### |$)/);
  const examples = examplesMatch ? examplesMatch[1].trim() : '';
  
  // Extract translation strategies
  const strategiesMatch = content.match(/### Translation Strategies?\s*\n([\s\S]*?)(?=\n### |$)/);
  const strategies = strategiesMatch ? strategiesMatch[1].trim() : '';
  
  // Determine category from ID path structure
  let category = 'translate';
  if (id.includes('checking/')) category = 'checking';
  if (id.includes('intro/')) category = 'intro';
  
  return {
    id,
    title,
    category,
    content,
    description,
    examples,
    strategies
  };
}

/**
 * Parse Bible Text USFM file
 */
export function parseBibleText(content: string, book: string, translation: 'ULT' | 'UST'): BibleText {
  // Check if content has alignment data
  const hasAlignment = content.includes('\\zaln-s') && content.includes('\\zaln-e');
  
  return {
    book,
    translation,
    content,
    hasAlignment
  };
}

/**
 * Extract alignment data from USFM content
 */
export function extractAlignmentData(usfmContent: string): AlignmentData[] {
  const alignments: AlignmentData[] = [];
  
  // Match alignment pairs: \zaln-s |attributes\*\w word\w*\zaln-e\*
  const alignmentRegex = /\\zaln-s\s+([^*]+)\*\\w\s+([^|*]+)\|([^*]+)\\w\*\\zaln-e\*/g;
  
  let match;
  while ((match = alignmentRegex.exec(usfmContent)) !== null) {
    const attributes = match[1];
    const gatewayWord = match[2].trim();
    const wordAttributes = match[3];
    
    // Parse attributes
    const strongsMatch = attributes.match(/x-strong="([^"]+)"/);
    const lemmaMatch = attributes.match(/x-lemma="([^"]+)"/);
    const morphMatch = attributes.match(/x-morph="([^"]+)"/);
    const contentMatch = attributes.match(/x-content="([^"]+)"/);
    const occurrenceMatch = attributes.match(/x-occurrence="(\d+)"/);
    const occurrencesMatch = attributes.match(/x-occurrences="(\d+)"/);
    
    alignments.push({
      originalWord: contentMatch ? contentMatch[1] : '',
      gatewayWords: [gatewayWord],
      strongsNumber: strongsMatch ? strongsMatch[1] : undefined,
      lemma: lemmaMatch ? lemmaMatch[1] : undefined,
      morphology: morphMatch ? morphMatch[1] : undefined,
      occurrence: occurrenceMatch ? parseInt(occurrenceMatch[1]) : 1,
      occurrences: occurrencesMatch ? parseInt(occurrencesMatch[1]) : 1
    });
  }
  
  return alignments;
}

/**
 * Parse RC (Resource Container) link
 */
export function parseRCLink(link: string): RCLink | null {
  if (!link.startsWith('rc://')) return null;
  
  const parts = link.replace('rc://', '').split('/');
  if (parts.length < 3) return null;
  
  return {
    language: parts[0] || '*',
    resource: parts[1] || '',
    type: parts[2] || '',
    project: parts[3] || '',
    category: parts[4],
    item: parts[5],
    original: link
  };
}

/**
 * Parse verse reference
 */
export function parseVerseReference(reference: string, book?: string): VerseReference | null {
  // Handle different reference formats:
  // "1:1", "1:1-3", "1:1-2:1", "front:intro", etc.
  
  if (reference.includes('intro') || reference.includes('front:')) {
    return null; // Skip intro references for now
  }
  
  // Simple chapter:verse pattern
  const simpleMatch = reference.match(/^(\d+):(\d+)(?:-(\d+))?$/);
  if (simpleMatch) {
    return {
      book: book || '',
      chapter: parseInt(simpleMatch[1]),
      verse: parseInt(simpleMatch[2]),
      endVerse: simpleMatch[3] ? parseInt(simpleMatch[3]) : undefined,
      original: reference
    };
  }
  
  // Cross-chapter pattern (e.g., "1:17-2:1")
  const crossMatch = reference.match(/^(\d+):(\d+)-(\d+):(\d+)$/);
  if (crossMatch) {
    return {
      book: book || '',
      chapter: parseInt(crossMatch[1]),
      verse: parseInt(crossMatch[2]),
      endVerse: parseInt(crossMatch[4]), // Note: this is simplified, doesn't handle cross-chapter properly
      original: reference
    };
  }
  
  // Chapter only pattern
  const chapterMatch = reference.match(/^(\d+)$/);
  if (chapterMatch) {
    return {
      book: book || '',
      chapter: parseInt(chapterMatch[1]),
      original: reference
    };
  }
  
  return null;
}

/**
 * Get helps for a specific verse reference
 */
export function getHelpsForReference(
  reference: VerseReference,
  notesData?: TranslationNotesData,
  questionsData?: TranslationQuestionsData,
  linksData?: TranslationWordsLinksData
) {
  const helps = {
    notes: [] as TranslationNote[],
    questions: [] as TranslationQuestion[],
    wordLinks: [] as TranslationWordsLink[]
  };
  
  const refString = reference.verse 
    ? `${reference.chapter}:${reference.verse}`
    : `${reference.chapter}`;
  
  // Find matching notes
  if (notesData) {
    helps.notes = notesData.notes.filter(note => {
      const noteRef = parseVerseReference(note.Reference, reference.book);
      return noteRef && 
        noteRef.chapter === reference.chapter && 
        (noteRef.verse === reference.verse || !reference.verse);
    });
  }
  
  // Find matching questions
  if (questionsData) {
    helps.questions = questionsData.questions.filter(question => {
      const qRef = parseVerseReference(question.Reference, reference.book);
      return qRef && 
        qRef.chapter === reference.chapter && 
        (qRef.verse === reference.verse || !reference.verse);
    });
  }
  
  // Find matching word links
  if (linksData) {
    helps.wordLinks = linksData.links.filter(link => {
      const linkRef = parseVerseReference(link.Reference, reference.book);
      return linkRef && 
        linkRef.chapter === reference.chapter && 
        (linkRef.verse === reference.verse || !reference.verse);
    });
  }
  
  return helps;
}

/**
 * Extract book name from filename
 */
export function extractBookFromFilename(filename: string): string {
  // Extract book code from filenames like "tn_JON.tsv", "tq_PHM.tsv"
  const match = filename.match(/[a-z]+_([A-Z0-9]{2,3})\./);
  return match ? match[1] : '';
}

/**
 * Validate TSV structure
 */
export function validateTSVStructure(content: string, expectedHeaders: string[]): boolean {
  const lines = content.trim().split('\n');
  if (lines.length < 1) return false;
  
  const headers = lines[0].split('\t');
  return expectedHeaders.every(expected => headers.includes(expected));
}

// Expected headers for each resource type
export const TRANSLATION_NOTES_HEADERS = ['Reference', 'ID', 'Tags', 'SupportReference', 'Quote', 'Occurrence', 'Note'];
export const TRANSLATION_WORDS_LINKS_HEADERS = ['Reference', 'ID', 'Tags', 'OrigWords', 'Occurrence', 'TWLink'];
export const TRANSLATION_QUESTIONS_HEADERS = ['Reference', 'ID', 'Tags', 'Quote', 'Occurrence', 'Question', 'Response'];
