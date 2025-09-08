# Book Package Structure

This document provides a comprehensive overview of what a Door43 Book Package contains, including detailed explanations of each resource type, file formats, and data structures.

## 📦 Overview

A **Book Package** is a complete collection of all translation resources for a specific Bible book. It consolidates multiple resource types from different Door43 repositories into a single, cohesive data structure.

## 🏗️ Package Architecture

```
Book Package
├── 📖 Bible Text Resources (USFM)
│   ├── Literal Text (ULT/GLT)
│   └── Simplified Text (UST/GST)
├── 📝 Translation Helps (TSV)
│   ├── Translation Notes (TN)
│   ├── Translation Words Links (TWL)
│   └── Translation Questions (TQ)
├── 🔗 On-Demand Resources
│   ├── Translation Academy (TA)
│   └── Translation Words (TW)
└── 📊 Metadata
    ├── Repository Information
    ├── Fetch Timestamps
    └── Source Attribution
```

## 📖 Bible Text Resources

### Literal Text (ULT/GLT)

**Purpose**: Word-for-word Bible translations that prioritize accuracy to the original languages.

**Format**: USFM (Unified Standard Format Markers)

**File Pattern**: `01-GEN.usfm`, `02-EXO.usfm`, etc.

**Content Structure**:
```usfm
\id GEN EN_ULT en_English_ltr
\usfm 3.0
\ide UTF-8
\h Genesis
\toc1 The Book of Genesis
\toc2 Genesis
\toc3 Gen
\mt Genesis

\c 1
\p
\v 1 In the beginning, God created the heavens and the earth.
\v 2 The earth was without form and empty...
```

**Data Structure**:
```typescript
literalText: {
  source: 'en_ult',                    // Repository name
  content: string,                     // Raw USFM content (4-6MB typical)
  processed?: ProcessedScripture       // Parsed structure (optional)
}
```

> 📚 **See [Processed Interfaces](./PROCESSED-INTERFACES.md#processedscripture)** for the complete `ProcessedScripture` interface definition.

### Simplified Text (UST/GST)

**Purpose**: Thought-for-thought Bible translations that prioritize clarity and readability.

**Format**: USFM (Unified Standard Format Markers)

**File Pattern**: `01-GEN.usfm`, `02-EXO.usfm`, etc.

**Content Structure**:
```usfm
\id GEN EN_UST en_English_ltr
\usfm 3.0
\ide UTF-8
\h Genesis
\toc1 The Book of Genesis
\toc2 Genesis
\toc3 Gen
\mt1 Genesis

\c 1
\s1 The Beginning
\p
\v 1 In the beginning, God created everything in the heavens and on the earth.
\v 2 The earth had no form and was empty...
```

**Key Differences from ULT**:
- More natural language flow
- Cultural adaptations for clarity
- Explanatory additions in brackets
- Simplified sentence structures

## 📝 Translation Helps Resources

### Translation Notes (TN)

**Purpose**: Verse-by-verse explanations, cultural context, and translation guidance.

**Format**: TSV (Tab-Separated Values)

**File Pattern**: `tn_GEN.tsv`, `tn_EXO.tsv`, etc.

**TSV Structure**:
```tsv
Book	Chapter	Verse	ID	SupportReference	OrigQuote	Occurrence	GLQuote	OccurrenceNote
GEN	1	1	abc1	rc://*/ta/man/translate/figs-merism	בְּרֵאשִׁ֖ית	1	In the beginning	This refers to the start of everything
GEN	1	1	def2	rc://*/ta/man/translate/translate-names	אֱלֹהִ֑ים	1	God	This is the name of the supreme deity
```

**Data Structure**:
```typescript
translationNotes: {
  source: 'en_tn',
  content: string,                     // Raw TSV content
  processed?: ProcessedTranslationNote[] // Array of parsed notes
}
```

> 📚 **See [Processed Interfaces](./PROCESSED-INTERFACES.md#processedtranslationnote)** for the complete `ProcessedTranslationNote` interface definition.

**Note Types**:
- **Translation Issues**: Grammar, syntax, cultural concepts
- **Key Terms**: Important theological or cultural words
- **Figures of Speech**: Metaphors, idioms, literary devices
- **Historical Context**: Cultural and historical background
- **Cross-References**: Links to related passages

### Translation Words Links (TWL)

**Purpose**: Connects specific words in the text to Translation Words articles.

**Format**: TSV (Tab-Separated Values)

**File Pattern**: `twl_GEN.tsv`, `twl_EXO.tsv`, etc.

**TSV Structure**:
```tsv
Reference	ID	Tags	OrigWords	Occurrence	TWLink
GEN 1:1	abc1	keyterm	אֱלֹהִ֑ים	1	rc://*/tw/dict/bible/kt/god
GEN 1:1	def2	keyterm	בָּרָ֣א	1	rc://*/tw/dict/bible/kt/create
GEN 1:2	ghi3	keyterm	רוּחַ	1	rc://*/tw/dict/bible/kt/spirit
```

**Data Structure**:
```typescript
translationWordsLinks: {
  source: 'en_twl',
  content: string,                     // Raw TSV content
  processed?: ProcessedTranslationWordsLink[] // Array of parsed links
}
```

> 📚 **See [Processed Interfaces](./PROCESSED-INTERFACES.md#processedtranslationwordslink)** for the complete `ProcessedTranslationWordsLink` interface definition.

### Translation Questions (TQ)

**Purpose**: Comprehension and discussion questions for each passage.

**Format**: TSV (Tab-Separated Values)

**File Pattern**: `tq_GEN.tsv`, `tq_EXO.tsv`, etc.

**TSV Structure**:
```tsv
Reference	ID	Tags	Quote	Occurrence	Question	Response
GEN 1:1-2	abc1		In the beginning God created	1	What did God create in the beginning?	In the beginning, God created the heavens and the earth.
GEN 1:3-5	def2		God said, "Let there be light"	1	What was the first thing God created?	The first thing God created was light.
```

**Data Structure**:
```typescript
translationQuestions: {
  source: 'en_tq',
  content: string,                     // Raw TSV content
  processed?: ProcessedTranslationQuestion[] // Array of parsed questions
}
```

> 📚 **See [Processed Interfaces](./PROCESSED-INTERFACES.md#processedtranslationquestion)** for the complete `ProcessedTranslationQuestion` interface definition.

## 🔗 On-Demand Resources

### Translation Academy (TA)

**Purpose**: Articles explaining translation principles and techniques.

**Format**: Markdown files organized by category

**Fetch Strategy**: Referenced in Translation Notes `SupportReference` field

**Content Structure**:
```markdown
# Figures of Speech - Merism

## Description
A merism is a figure of speech in which a person refers to something by speaking of two extreme parts of it.

## Examples
- "from the rising of the sun to its setting" (Psalm 113:3) - means "everywhere"
- "young and old" - means "everyone"

## Translation Strategies
1. If the merism would be natural and give the right meaning in your language, consider using it.
2. If the merism would not be natural or would give the wrong meaning, identify what the merism refers to and translate that.
```

**Data Structure**:
```typescript
// Fetched on-demand when referenced
const taArticle = {
  type: 'translation-academy',
  identifier: 'figs-merism',
  source: 'en_ta',
  content: string,                     // Raw Markdown content
  processed?: ProcessedTranslationAcademy // Parsed article structure
}
```

> 📚 **See [Processed Interfaces](./PROCESSED-INTERFACES.md#processedtranslationacademy)** for the complete `ProcessedTranslationAcademy` interface definition.

### Translation Words (TW)

**Purpose**: Definitions and explanations of key biblical terms.

**Format**: Markdown files organized by category (kt, names, other)

**Fetch Strategy**: Referenced in Translation Words Links `TWLink` field

**Content Structure**:
```markdown
# God

## Definition
The term "God" refers to the eternal being who created and rules over the universe.

## Translation Suggestions
- In many languages, the term for "God" is capitalized to distinguish it from "god" or "gods"
- Some languages have different terms for the true God versus false gods

## Bible References
- Genesis 1:1
- John 1:1
- Romans 1:20
```

**Data Structure**:
```typescript
// Fetched on-demand when referenced
const twArticle = {
  type: 'translation-words',
  identifier: 'kt/god',
  source: 'en_tw',
  content: string,                     // Raw Markdown content
  processed?: ProcessedTranslationWords // Parsed word definition structure
}
```

> 📚 **See [Processed Interfaces](./PROCESSED-INTERFACES.md#processedtranslationwords)** for the complete `ProcessedTranslationWords` interface definition.

## 📊 Package Metadata

### Repository Information

```typescript
repositories: {
  'en_ult': {
    name: 'en_ult',
    url: 'https://git.door43.org/unfoldingWord/en_ult',
    manifest: {
      projects: [...],
      dublin_core: {...}
    }
  },
  'en_ust': {
    name: 'en_ust', 
    url: 'https://git.door43.org/unfoldingWord/en_ust',
    manifest: {...}
  }
  // ... other repositories
}
```

### Fetch Information

```typescript
{
  book: 'GEN',
  language: 'en',
  organization: 'unfoldingWord',
  fetchedAt: new Date('2025-01-22T14:44:27.824Z'),
  // ... resource data
}
```

## 📏 Typical Package Sizes

| Resource Type | File Size | Content Volume |
|---------------|-----------|----------------|
| **ULT** | 3-6 MB | ~150,000 words |
| **UST** | 4-7 MB | ~200,000 words |
| **Translation Notes** | 500KB-2MB | 200-800 notes |
| **Translation Words Links** | 50-200KB | 100-500 links |
| **Translation Questions** | 20-100KB | 20-80 questions |
| **Total Package** | 8-15 MB | Complete book resources |

## 🔄 Processing Pipeline

1. **Repository Discovery**: Find repositories via Door43 catalog API
2. **Manifest Parsing**: Extract project information from `manifest.yaml`
3. **File Location**: Match book patterns to find specific files
4. **Content Fetching**: Download raw content via Door43 API
5. **Format Processing**: Parse USFM, TSV, and Markdown content
6. **Package Assembly**: Combine all resources into unified structure
7. **Caching**: Store processed package for future requests

## 🎯 Use Cases

### Bible Reading Apps
- Display ULT/UST side-by-side
- Show contextual notes for difficult passages
- Provide study questions for group discussion

### Translation Tools
- Compare literal vs simplified renderings
- Access translation principles from TA
- Understand key terms through TW articles

### Educational Platforms
- Create interactive Bible study materials
- Generate comprehension assessments
- Provide cultural and historical context

## 🔧 Customization

Book packages can be customized by:
- **Resource Selection**: Choose specific resource types
- **Language/Organization**: Target different translation projects
- **Processing Options**: Control how content is parsed and structured
- **Caching Strategy**: Configure cache behavior for performance

This comprehensive structure makes Door43 Book Packages a powerful foundation for any Bible translation or study application.
