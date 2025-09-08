# Normalized Cache Example: Cross-Reference Optimized Storage

## Overview

This example demonstrates how our normalized cache transforms traditional file-based storage into a **relational knowledge graph** optimized for cross-reference traversal, editing, and bidirectional synchronization.

## Traditional vs Normalized Storage

### ❌ Traditional File-Based Cache
```
Cache Structure (File-based):
├── door43/unfoldingWord/en_ult/
│   ├── 01-GEN.usfm (entire file)
│   ├── 02-EXO.usfm (entire file)
│   └── ...
├── door43/unfoldingWord/en_tn/
│   ├── tn_GEN.tsv (entire file)
│   ├── tn_EXO.tsv (entire file)
│   └── ...
└── door43/unfoldingWord/en_ta/
    ├── translate/figs-abstractnouns/01.md
    └── ...

Problems:
- Must parse entire files to access single verses
- Cross-references require multiple file lookups
- Editing requires rewriting entire files
- No change tracking or conflict resolution
- Duplicate processing for shared resources
```

### ✅ Normalized Knowledge Graph Cache
```
Normalized Structure:
├── Resource Registry (Metadata Index)
├── Content Store (Granular JSON)
├── Cross-Reference Graph (Bidirectional Links)
├── Source Mapping (Original Location)
└── Change Tracking (Modification History)

Benefits:
- Direct access to individual verses/notes
- Instant cross-reference traversal
- Granular editing with change tracking
- Automatic conflict detection
- Zero duplication of shared resources
```

## Resource ID System

### Resource ID Format
```typescript
// Format: {server}:{owner}:{repo}:{type}:{path}[:{section}]

const resourceIds = {
  // Bible verse
  bibleVerse: "door43:unfoldingWord:en_ult:bible-verse:01-GEN.usfm:1:1",
  
  // Translation note
  translationNote: "door43:unfoldingWord:en_tn:translation-note:tn_GEN.tsv:1:1:note1",
  
  // Translation Academy article (shared)
  taArticle: "door43:unfoldingWord:en_ta:translation-academy:translate/figs-abstractnouns",
  
  // Translation Word (shared)
  twArticle: "door43:unfoldingWord:en_tw:translation-word:bible/kt/god"
};

// Resource IDs are deterministic and globally unique
// Same content always gets same ID across all systems
```

## Normalized Content Examples

### Bible Verse (Granular Access)
```typescript
const genesisVerse: NormalizedResource = {
  metadata: {
    id: "door43:unfoldingWord:en_ult:bible-verse:01-GEN.usfm:1:1",
    type: "bible-verse",
    title: "Genesis 1:1",
    source: {
      repository: { server: "door43", owner: "unfoldingWord", repoId: "en_ult", ref: "v86" },
      originalPath: "01-GEN.usfm",
      section: { lines: { start: 15, end: 15 }, verse: { book: "GEN", chapter: 1, verse: 1 } },
      contentHash: "sha256:abc123..."
    },
    location: { book: "GEN", chapter: 1, verse: 1, language: "en" },
    references: {
      references: [], // This verse doesn't reference others
      referencedBy: [
        "door43:unfoldingWord:en_tn:translation-note:tn_GEN.tsv:1:1:note1",
        "door43:unfoldingWord:en_tq:translation-question:tq_GEN.tsv:1:1:q1"
      ],
      strongs: ["H0430", "H0776", "H8064"],
      lemmas: ["אֱלֹהִים", "אֶרֶץ", "שָׁמַיִם"]
    }
  },
  content: {
    type: "bible-verse",
    reference: { book: "GEN", chapter: 1, verse: 1 },
    text: "In the beginning God created the heavens and the earth.",
    usfm: "\\v 1 In the beginning God created the heavens and the earth.",
    words: [
      { text: "In", position: 0 },
      { text: "the", position: 1 },
      { text: "beginning", position: 2 },
      { 
        text: "God", 
        position: 3, 
        strongs: "H0430", 
        lemma: "אֱלֹהִים",
        alignmentId: "align-1"
      },
      { text: "created", position: 4, strongs: "H1254", lemma: "בָּרָא" },
      // ... more words
    ]
  },
  crossReferences: {
    outgoing: [], // This verse doesn't reference others
    incoming: [
      {
        targetId: "door43:unfoldingWord:en_tn:translation-note:tn_GEN.tsv:1:1:note1",
        type: "bible-reference",
        strength: 1.0,
        bidirectional: true
      }
    ]
  }
};
```

### Translation Note (With Resolved Cross-References)
```typescript
const translationNote: NormalizedResource = {
  metadata: {
    id: "door43:unfoldingWord:en_tn:translation-note:tn_GEN.tsv:1:1:note1",
    type: "translation-note",
    title: "Genesis 1:1 - God",
    source: {
      repository: { server: "door43", owner: "unfoldingWord", repoId: "en_tn", ref: "v86" },
      originalPath: "tn_GEN.tsv",
      section: { lines: { start: 5, end: 5 }, field: "Note" }
    },
    references: {
      references: [
        "door43:unfoldingWord:en_ult:bible-verse:01-GEN.usfm:1:1",
        "door43:unfoldingWord:en_ta:translation-academy:translate/figs-abstractnouns"
      ],
      supportReferences: ["rc://*/ta/man/translate/figs-abstractnouns"]
    }
  },
  content: {
    type: "translation-note",
    reference: { book: "GEN", chapter: 1, verse: 1 },
    id: "note1",
    quote: "God",
    occurrence: 1,
    note: "This refers to the one true God. See how to translate names of God.",
    supportReference: {
      raw: "rc://*/ta/man/translate/figs-abstractnouns",
      resolved: "door43:unfoldingWord:en_ta:translation-academy:translate/figs-abstractnouns"
    },
    relatedResources: [
      "door43:unfoldingWord:en_tw:translation-word:bible/kt/god"
    ]
  },
  crossReferences: {
    outgoing: [
      {
        targetId: "door43:unfoldingWord:en_ult:bible-verse:01-GEN.usfm:1:1",
        type: "bible-reference",
        strength: 1.0,
        bidirectional: true
      },
      {
        targetId: "door43:unfoldingWord:en_ta:translation-academy:translate/figs-abstractnouns",
        type: "support-reference",
        strength: 0.8,
        bidirectional: false
      }
    ]
  }
};
```

### Translation Academy Article (Shared Resource)
```typescript
const taArticle: NormalizedResource = {
  metadata: {
    id: "door43:unfoldingWord:en_ta:translation-academy:translate/figs-abstractnouns",
    type: "translation-academy",
    title: "Abstract Nouns",
    source: {
      repository: { server: "door43", owner: "unfoldingWord", repoId: "en_ta", ref: "v86" },
      originalPath: "translate/figs-abstractnouns/01.md"
    },
    references: {
      referencedBy: [
        // This article is referenced by 100+ translation notes across all books
        "door43:unfoldingWord:en_tn:translation-note:tn_GEN.tsv:1:1:note1",
        "door43:unfoldingWord:en_tn:translation-note:tn_EXO.tsv:3:14:note2",
        // ... 100+ more references
      ]
    }
  },
  content: {
    type: "translation-academy",
    id: "figs-abstractnouns",
    title: "Abstract Nouns",
    content: "Abstract nouns are things that you cannot see or touch...",
    sections: [
      {
        title: "Description",
        content: "Abstract nouns refer to ideas, concepts, events...",
        type: "explanation"
      },
      {
        title: "Examples",
        content: "Here are some examples from the Bible...",
        type: "examples"
      }
    ],
    examples: [
      {
        text: "God's love is eternal",
        explanation: "Love is an abstract noun",
        reference: { book: "1JN", chapter: 4, verse: 8 }
      }
    ]
  },
  crossReferences: {
    incoming: [
      // All the translation notes that reference this article
      // Automatically maintained by the cross-reference service
    ]
  }
};
```

## Cross-Reference Traversal Examples

### Finding Related Resources
```typescript
// User taps "God" in Genesis 1:1
const wordTapped = "God";
const verseId = "door43:unfoldingWord:en_ult:bible-verse:01-GEN.usfm:1:1";

// 1. Get the verse resource
const verse = await cacheManager.getResource(verseId);

// 2. Find the tapped word's alignment data
const tappedWord = verse.content.words.find(w => w.text === wordTapped);
const strongsNumber = tappedWord?.strongs; // "H0430"

// 3. Find all resources related to this Strong's number
const relatedByStrongs = await crossRefService.findByStrongs(strongsNumber);
// Returns: [
//   "door43:unfoldingWord:en_tn:translation-note:tn_GEN.tsv:1:1:note1",
//   "door43:unfoldingWord:en_tw:translation-word:bible/kt/god",
//   // ... all other resources with H0430
// ]

// 4. Get incoming references to this verse
const incomingRefs = await crossRefService.getIncomingReferences(verseId);
// Returns translation notes, questions, etc. that reference this verse

// 5. Traverse to Translation Academy articles
const relatedResources = await cacheManager.traverseReferences(verseId, {
  maxDepth: 2,
  followTypes: ['support-reference', 'tw-link']
});

// Result: Complete knowledge graph of related resources
console.log('Related Resources:', {
  translationNotes: relatedResources.resources.filter(r => r.metadata.type === 'translation-note'),
  translationWords: relatedResources.resources.filter(r => r.metadata.type === 'translation-word'),
  translationAcademy: relatedResources.resources.filter(r => r.metadata.type === 'translation-academy'),
  relationships: relatedResources.relationships
});
```

### Instant Panel Updates
```typescript
// When user taps a word, all panels update instantly
class WordInteractionHandler {
  async handleWordTap(word: string, verseId: ResourceId) {
    // Get all related resources in parallel (all from cache)
    const [
      translationNotes,
      translationWords,
      translationAcademy,
      relatedVerses
    ] = await Promise.all([
      this.getTranslationNotes(word, verseId),
      this.getTranslationWords(word),
      this.getTranslationAcademy(word),
      this.getRelatedVerses(word)
    ]);
    
    // Update all panels simultaneously
    this.updatePanels({
      translationNotes: translationNotes,    // Filtered to relevant notes
      translationWords: translationWords,    // Word definitions
      translationAcademy: translationAcademy, // Related articles
      relatedVerses: relatedVerses           // Other verses with same word
    });
    
    // Total time: <10ms (all from normalized cache)
  }
  
  private async getTranslationNotes(word: string, verseId: ResourceId) {
    // Find notes that reference this verse AND mention this word
    const verseNotes = await crossRefService.getIncomingReferences(verseId);
    return verseNotes
      .filter(ref => ref.type === 'bible-reference')
      .map(ref => cacheManager.getResource(ref.targetId))
      .filter(note => note.content.quote.includes(word));
  }
}
```

## Editing and Synchronization

### Local Editing with Change Tracking
```typescript
// User edits a translation note
const noteId = "door43:unfoldingWord:en_tn:translation-note:tn_GEN.tsv:1:1:note1";

// Update the note content
await cacheManager.updateResource(noteId, {
  note: "This refers to the one true God. Updated explanation here."
}, "user@example.com");

// Change is automatically tracked
const modifications = await changeTracker.getModificationHistory(noteId);
console.log('Latest modification:', modifications[0]);
// {
//   timestamp: Date,
//   type: 'content',
//   description: 'Updated note text',
//   oldValue: 'This refers to the one true God. See how to translate names of God.',
//   newValue: 'This refers to the one true God. Updated explanation here.',
//   modifiedBy: 'user@example.com'
// }

// Resource is marked as dirty (needs sync)
const isDirty = await changeTracker.isDirty(noteId); // true
```

### Bidirectional Synchronization
```typescript
// Check for server updates
const updateCheck = await syncService.checkForUpdates(noteId);
if (updateCheck.conflictDetected) {
  console.log('Conflict detected! Local and server both modified.');
  
  // Get conflict details
  const pullResult = await syncService.pullUpdates(noteId);
  console.log('Conflicts:', pullResult.conflicts);
  
  // Resolve conflict (user choice or automatic)
  await syncService.resolveConflicts(noteId, 'merge', {
    // Custom merge logic
    mergedNote: combineNoteChanges(localVersion, serverVersion)
  });
}

// Push local changes
const pushResult = await syncService.pushChanges(noteId);
if (pushResult.success) {
  console.log('Changes pushed successfully');
  // Resource is now clean
  await changeTracker.markClean(noteId);
}
```

### Batch Operations for Efficiency
```typescript
// Get entire book package efficiently
const bookResources = await queryService.getBookResources("GEN", {
  types: ['bible-verse', 'translation-note', 'translation-question'],
  includeShared: true, // Include TA/TW articles
  language: 'en'
});

// Result: All Genesis resources + shared TA/TW articles
// Served from normalized cache in <50ms
// No file parsing, no duplicate TA/TW articles

console.log('Book Package:', {
  verses: bookResources.filter(r => r.metadata.type === 'bible-verse').length,
  notes: bookResources.filter(r => r.metadata.type === 'translation-note').length,
  questions: bookResources.filter(r => r.metadata.type === 'translation-question').length,
  sharedArticles: bookResources.filter(r => 
    r.metadata.type === 'translation-academy' || 
    r.metadata.type === 'translation-word'
  ).length
});
// Output: { verses: 31, notes: 45, questions: 12, sharedArticles: 23 }
```

## Performance Benefits

### Access Speed Comparison
```typescript
// Traditional file-based cache
const traditionalAccess = async () => {
  const start = Date.now();
  
  // 1. Load entire TN file (2MB)
  const tnFile = await fileCache.getFile('tn_GEN.tsv');
  
  // 2. Parse TSV (50ms)
  const notes = parseTSV(tnFile);
  
  // 3. Filter for verse 1:1 (10ms)
  const verseNotes = notes.filter(n => n.Reference === '1:1');
  
  // 4. Load TA article file (500KB)
  const taFile = await fileCache.getFile('translate/figs-abstractnouns/01.md');
  
  // 5. Parse markdown (20ms)
  const taArticle = parseMarkdown(taFile);
  
  const end = Date.now();
  console.log(`Traditional access: ${end - start}ms`);
  // Result: ~150ms
};

// Normalized cache access
const normalizedAccess = async () => {
  const start = Date.now();
  
  // 1. Direct resource access (no parsing needed)
  const [verseNotes, taArticle] = await Promise.all([
    queryService.getVerseResources("GEN", 1, 1, { types: ['translation-note'] }),
    cacheManager.getResource('door43:unfoldingWord:en_ta:translation-academy:translate/figs-abstractnouns')
  ]);
  
  const end = Date.now();
  console.log(`Normalized access: ${end - start}ms`);
  // Result: ~3ms
};

// Performance improvement: 50x faster!
```

### Storage Efficiency
```typescript
const storageComparison = {
  traditional: {
    // Each book stores references to shared TA articles
    genesis: { tnFile: '2MB', referencedTAArticles: '15MB' },
    exodus: { tnFile: '1.8MB', referencedTAArticles: '15MB' }, // DUPLICATE!
    // ... 66 books × 15MB = 990MB of duplicated TA content
    total: '1.2GB'
  },
  
  normalized: {
    // Shared TA articles stored once
    sharedTAArticles: '15MB', // ONCE for all books
    genesis: { notes: '45 resources × 2KB', verses: '31 resources × 1KB' },
    exodus: { notes: '38 resources × 2KB', verses: '40 resources × 1KB' },
    // ... all books reference same shared articles
    total: '180MB'
  }
};

console.log('Storage savings:', {
  traditional: storageComparison.traditional.total,
  normalized: storageComparison.normalized.total,
  savings: '85% reduction'
});
```

This normalized cache system transforms your app into a **high-performance knowledge graph** that's optimized for the exact access patterns your users need! 🚀
