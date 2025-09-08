# Processed Resource Interfaces

This document defines the TypeScript interfaces for all processed resources returned by the Door43 Book Package service.

## Overview

When you fetch a book package, each resource includes both `content` (raw data) and optional `processed` (parsed data). The processed data provides structured, type-safe access to the resource content.

## 📖 Bible Text Resources (USFM)

### ProcessedScripture

Used for both `literalText` and `simplifiedText` processed data.

```typescript
interface ProcessedScripture {
  /** Book identifier (e.g., 'GEN', 'MAT') */
  id: string;
  
  /** Book metadata from USFM headers */
  metadata: {
    /** USFM version */
    usfm?: string;
    /** Character encoding */
    ide?: string;
    /** Running header text */
    h?: string;
    /** Table of contents entries */
    toc1?: string; // Long form
    toc2?: string; // Short form  
    toc3?: string; // Abbreviation
    /** Main title */
    mt?: string;
    /** Additional metadata */
    [key: string]: string | undefined;
  };
  
  /** Array of chapters */
  chapters: ProcessedChapter[];
}

interface ProcessedChapter {
  /** Chapter number */
  number: number;
  
  /** Chapter title/heading (if present) */
  title?: string;
  
  /** Section headings within the chapter */
  sections?: ProcessedSection[];
  
  /** Array of verses */
  verses: ProcessedVerse[];
}

interface ProcessedSection {
  /** Section heading text */
  title: string;
  
  /** Starting verse number for this section */
  startVerse: number;
  
  /** Section level (s1, s2, s3, etc.) */
  level: number;
}

interface ProcessedVerse {
  /** Verse number */
  number: number;
  
  /** Verse text (cleaned of USFM markers) */
  text: string;
  
  /** Original text with USFM markers preserved */
  originalText: string;
  
  /** Footnotes associated with this verse */
  footnotes?: ProcessedFootnote[];
  
  /** Cross-references associated with this verse */
  crossReferences?: ProcessedCrossReference[];
  
  /** Word-level alignment data (ULT only) */
  alignments?: ProcessedAlignment[];
}

interface ProcessedFootnote {
  /** Footnote marker (*, †, etc.) */
  marker: string;
  
  /** Footnote text */
  text: string;
  
  /** Position in verse where footnote appears */
  position: number;
}

interface ProcessedCrossReference {
  /** Cross-reference marker */
  marker: string;
  
  /** Referenced passages */
  references: string[];
  
  /** Position in verse where cross-reference appears */
  position: number;
}

interface ProcessedAlignment {
  /** Original language word(s) */
  original: string;
  
  /** Gateway language translation */
  translation: string;
  
  /** Strong's number(s) */
  strongs?: string[];
  
  /** Morphological data */
  morph?: string;
  
  /** Word position in verse */
  position: number;
}
```

## 📝 Translation Notes (TSV)

### ProcessedTranslationNote

```typescript
interface ProcessedTranslationNote {
  /** Book identifier */
  book: string;
  
  /** Chapter number */
  chapter: number;
  
  /** Verse number */
  verse: number;
  
  /** Unique note identifier */
  id: string;
  
  /** Reference to Translation Academy article */
  supportReference?: string;
  
  /** Original language quote */
  originalQuote?: string;
  
  /** Occurrence number of the quote */
  occurrence: number;
  
  /** Gateway language quote */
  glQuote: string;
  
  /** The actual note content */
  occurrenceNote: string;
  
  /** Parsed support reference (if available) */
  parsedSupportReference?: {
    type: 'translation-academy' | 'translation-words' | 'other';
    identifier: string;
    /** TA path for fetching (e.g., '/translate/figs-abstractnouns') */
    taPath?: string;
    /** Category within TA (e.g., 'translate', 'checking', 'process') */
    category?: string;
    /** Article slug (e.g., 'figs-abstractnouns') */
    slug?: string;
    title?: string;
  };
  
  /** Note category (inferred from support reference) */
  category?: 'grammar' | 'culture' | 'figures' | 'translate' | 'names' | 'other';
}
```

## 🔗 Translation Words Links (TSV)

### ProcessedTranslationWordsLink

```typescript
interface ProcessedTranslationWordsLink {
  /** Scripture reference (e.g., 'GEN 1:1') */
  reference: string;
  
  /** Parsed reference components */
  parsedReference: {
    book: string;
    chapter: number;
    verse: number;
    startVerse?: number;
    endVerse?: number;
  };
  
  /** Unique link identifier */
  id: string;
  
  /** Tags (usually 'keyterm') */
  tags: string;
  
  /** Original language word(s) */
  originalWords: string;
  
  /** Occurrence number */
  occurrence: number;
  
  /** Translation Words link */
  twLink: string;
  
  /** Parsed TW link components */
  parsedTwLink: {
    type: 'kt' | 'names' | 'other';
    identifier: string;
    category: string; // e.g., 'bible/kt/god'
  };
  
  /** Link category */
  category: 'key-terms' | 'names' | 'other';
}
```

## ❓ Translation Questions (TSV)

### ProcessedTranslationQuestion

```typescript
interface ProcessedTranslationQuestion {
  /** Scripture reference (e.g., 'GEN 1:1-2') */
  reference: string;
  
  /** Parsed reference components */
  parsedReference: {
    book: string;
    chapter: number;
    startVerse: number;
    endVerse?: number;
  };
  
  /** Unique question identifier */
  id: string;
  
  /** Tags (usually empty) */
  tags: string;
  
  /** Quote from the passage */
  quote: string;
  
  /** Occurrence number of the quote */
  occurrence: number;
  
  /** The question text */
  question: string;
  
  /** The expected response/answer */
  response: string;
  
  /** Question type (inferred) */
  type: 'comprehension' | 'application' | 'interpretation' | 'factual';
  
  /** Difficulty level (inferred) */
  difficulty?: 'basic' | 'intermediate' | 'advanced';
}
```

## 🔗 On-Demand Resources

### ProcessedTranslationAcademy

```typescript
interface ProcessedTranslationAcademy {
  /** Article identifier/slug (e.g., 'figs-abstractnouns') */
  identifier: string;
  
  /** TA path used for fetching (e.g., '/translate/figs-abstractnouns') */
  taPath: string;
  
  /** Article category (e.g., 'translate', 'checking', 'process') */
  category: string;
  
  /** Article title (from title.md) */
  title: string;
  
  /** Article subtitle/summary (from subtitle.md) */
  subtitle?: string;
  
  /** Main article content (from 01.md) */
  content: string;
  
  /** Parsed content sections */
  sections: ProcessedTASection[];
  
  /** Source files that were merged */
  sourceFiles: {
    title: string;    // Content from title.md
    subtitle?: string; // Content from subtitle.md  
    content: string;   // Content from 01.md
  };
  
  /** Related articles referenced in content */
  relatedArticles?: string[];
  
  /** Bible references mentioned in content */
  bibleReferences?: string[];
}

interface ProcessedTASection {
  /** Section heading */
  heading: string;
  
  /** Section content (parsed Markdown) */
  content: string;
  
  /** Section type */
  type: 'description' | 'examples' | 'strategies' | 'reason' | 'translation';
  
  /** Examples within this section */
  examples?: ProcessedExample[];
  
  /** Translation strategies */
  strategies?: string[];
}

interface ProcessedExample {
  /** Example text */
  text: string;
  
  /** Scripture reference (if applicable) */
  reference?: string;
  
  /** Explanation of the example */
  explanation?: string;
}
```

### ProcessedTranslationWords

```typescript
interface ProcessedTranslationWords {
  /** Word identifier (e.g., 'kt/god') */
  identifier: string;
  
  /** Word/term title */
  title: string;
  
  /** Word category */
  category: 'kt' | 'names' | 'other';
  
  /** Main definition */
  definition: string;
  
  /** Additional facts about the term */
  facts?: string[];
  
  /** Translation suggestions */
  translationSuggestions?: string[];
  
  /** Bible references */
  bibleReferences?: ProcessedBibleReference[];
  
  /** Related terms */
  relatedTerms?: string[];
  
  /** Word etymology (for names) */
  etymology?: string;
}

interface ProcessedBibleReference {
  /** Reference text (e.g., 'Genesis 1:1') */
  reference: string;
  
  /** Parsed reference */
  parsed: {
    book: string;
    chapter: number;
    verse?: number;
    endVerse?: number;
  };
  
  /** Context or explanation for this reference */
  context?: string;
}
```

## 🔗 Support Reference Parsing

Translation Notes often include `supportReference` fields that point to Translation Academy articles. The processed interface intelligently parses these references to make TA article fetching straightforward.

### Support Reference Format

**Raw Support Reference**:
```
rc://*/ta/man/translate/figs-abstractnouns
```

**Parsed Support Reference**:
```typescript
{
  type: 'translation-academy',
  identifier: 'rc://*/ta/man/translate/figs-abstractnouns',
  taPath: '/translate/figs-abstractnouns',
  category: 'translate',
  slug: 'figs-abstractnouns'
}
```

### Translation Academy File Structure

Each TA article consists of three files that are merged during processing:

```
/translate/figs-abstractnouns/
├── title.md      # Article title
├── subtitle.md   # Article subtitle/summary (optional)
└── 01.md         # Main article content
```

### Parsing Logic

```typescript
function parseSupportReference(supportRef: string) {
  // Parse: rc://*/ta/man/translate/figs-abstractnouns
  const match = supportRef.match(/rc:\/\/\*\/ta\/man\/(.+)\/(.+)/);
  
  if (match) {
    const [, category, slug] = match;
    return {
      type: 'translation-academy' as const,
      identifier: supportRef,
      taPath: `/${category}/${slug}`,
      category,
      slug
    };
  }
  
  return {
    type: 'other' as const,
    identifier: supportRef
  };
}
```

### TA Article Fetching Process

1. **Parse Support Reference**: Extract TA path from support reference
2. **Fetch Three Files**: Get `title.md`, `subtitle.md`, and `01.md`
3. **Merge Content**: Combine files into single processed article
4. **Parse Sections**: Extract headings, examples, strategies
5. **Cache Result**: Store processed article for future use

### Example Implementation

```typescript
async function fetchTranslationAcademyArticle(taPath: string): Promise<ProcessedTranslationAcademy> {
  // taPath: '/translate/figs-abstractnouns'
  const [, category, slug] = taPath.split('/');
  
  // Fetch the three component files
  const [titleContent, subtitleContent, mainContent] = await Promise.all([
    fetchTAFile(`${taPath}/title.md`),
    fetchTAFile(`${taPath}/subtitle.md`).catch(() => null), // Optional
    fetchTAFile(`${taPath}/01.md`)
  ]);
  
  // Process and merge content
  return {
    identifier: slug,
    taPath,
    category,
    title: titleContent.trim(),
    subtitle: subtitleContent?.trim(),
    content: mainContent,
    sections: parseMarkdownSections(mainContent),
    sourceFiles: {
      title: titleContent,
      subtitle: subtitleContent,
      content: mainContent
    },
    relatedArticles: extractRelatedArticles(mainContent),
    bibleReferences: extractBibleReferences(mainContent)
  };
}
```

## 🔧 Usage Examples

### Working with Processed Scripture

```typescript
const result = await service.fetchBookPackage({
  book: 'GEN',
  resourceTypes: ['literalText']
});

if (result.success && result.data.literalText?.processed) {
  const scripture = result.data.literalText.processed as ProcessedScripture;
  
  // Access Genesis 1:1
  const chapter1 = scripture.chapters.find(ch => ch.number === 1);
  const verse1 = chapter1?.verses.find(v => v.number === 1);
  
  console.log('Genesis 1:1:', verse1?.text);
  console.log('Footnotes:', verse1?.footnotes?.length || 0);
  console.log('Alignments:', verse1?.alignments?.length || 0);
}
```

### Working with Processed Notes

```typescript
const result = await service.fetchBookPackage({
  book: 'GEN',
  resourceTypes: ['translationNotes']
});

if (result.success && result.data.translationNotes?.processed) {
  const notes = result.data.translationNotes.processed as ProcessedTranslationNote[];
  
  // Find notes for Genesis 1:1
  const gen1_1Notes = notes.filter(note => 
    note.chapter === 1 && note.verse === 1
  );
  
  // Work with parsed support references
  gen1_1Notes.forEach(note => {
    if (note.parsedSupportReference?.type === 'translation-academy') {
      console.log('TA Article needed:', {
        taPath: note.parsedSupportReference.taPath,
        category: note.parsedSupportReference.category,
        slug: note.parsedSupportReference.slug
      });
      
      // Fetch the TA article using the parsed path
      const taArticle = await service.fetchOnDemandResource({
        type: 'translation-academy',
        identifier: note.parsedSupportReference.taPath, // e.g., '/translate/figs-abstractnouns'
        language: 'en',
        organization: 'unfoldingWord'
      });
    }
  });
  
  // Group by category
  const notesByCategory = gen1_1Notes.reduce((acc, note) => {
    const category = note.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(note);
    return acc;
  }, {} as Record<string, ProcessedTranslationNote[]>);
  
  console.log('Notes by category:', notesByCategory);
}
```

### Working with Processed Questions

```typescript
const result = await service.fetchBookPackage({
  book: 'MAT',
  resourceTypes: ['translationQuestions']
});

if (result.success && result.data.translationQuestions?.processed) {
  const questions = result.data.translationQuestions.processed as ProcessedTranslationQuestion[];
  
  // Find questions for Matthew 5
  const matt5Questions = questions.filter(q => 
    q.parsedReference.chapter === 5
  );
  
  // Group by difficulty
  const questionsByDifficulty = matt5Questions.reduce((acc, q) => {
    const difficulty = q.difficulty || 'basic';
    if (!acc[difficulty]) acc[difficulty] = [];
    acc[difficulty].push(q);
    return acc;
  }, {} as Record<string, ProcessedTranslationQuestion[]>);
  
  console.log('Questions by difficulty:', questionsByDifficulty);
}
```

## 🎯 Type Guards

For runtime type checking, you can create type guards:

```typescript
function isProcessedScripture(obj: any): obj is ProcessedScripture {
  return obj && 
    typeof obj.id === 'string' && 
    Array.isArray(obj.chapters) &&
    obj.chapters.every((ch: any) => 
      typeof ch.number === 'number' && Array.isArray(ch.verses)
    );
}

function isProcessedTranslationNote(obj: any): obj is ProcessedTranslationNote {
  return obj &&
    typeof obj.book === 'string' &&
    typeof obj.chapter === 'number' &&
    typeof obj.verse === 'number' &&
    typeof obj.occurrenceNote === 'string';
}
```

## 📝 Implementation Notes

1. **Optional Processing**: The `processed` field is optional. Raw content is always available in the `content` field.

2. **Lazy Processing**: Processing can be done on-demand to save memory and improve performance.

3. **Extensible**: These interfaces can be extended with additional fields as needed.

4. **Validation**: Consider using libraries like Zod or Joi for runtime validation of processed data.

5. **Caching**: Processed data should be cached alongside raw content for performance.

These interfaces provide type-safe access to all processed resource data, making it easier to build robust Bible translation and study applications.
