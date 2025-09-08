# Resource Interaction Example: Complete Implementation

## Scenario: User taps "Yahweh" in Jonah 1:1

### 1. Initial State
```typescript
// Book package loaded for Jonah
const bookPackage = {
  book: 'JON',
  literalText: { /* ULT with alignment data */ },
  simplifiedText: { /* UST */ },
  translationNotes: [
    {
      Reference: '1:1',
      Quote: 'Yahweh',
      Occurrence: 1,
      Note: 'This is the name of God...',
      SupportReference: 'rc://*/ta/man/translate/figs-abstractnouns'
    }
  ],
  translationWordsLinks: [
    {
      Reference: '1:1', 
      OrigWords: 'H3068',
      GLWords: 'Yahweh',
      TWLink: 'rc://*/tw/dict/bible/kt/yahweh'
    }
  ],
  translationQuestions: [
    {
      Reference: '1:1',
      Question: 'To whom did the word of Yahweh come?',
      Response: 'The word came to Jonah son of Amittai.'
    }
  ]
};

// Alignment index built
alignmentService.buildAlignmentIndex(bookPackage.literalText);
```

### 2. Word Tap Event
```typescript
// User taps "Yahweh" at position 15 in verse text
const wordTapResult = await wordInteractionService.handleWordTap(
  'JON',    // book
  1,        // chapter  
  1,        // verse
  15,       // word index in verse
  'Yahweh'  // word text
);

// Result contains:
{
  alignmentReference: {
    reference: { book: 'JON', chapter: 1, verse: 1 },
    wordIndex: 15,
    wordText: 'Yahweh',
    alignment: {
      strong: 'H3068',
      lemma: 'יְהֹוָה', 
      occurrence: 1,
      occurrences: 1
    }
  },
  crossReferences: [
    {
      type: 'translation-note',
      relevance: 0.9,  // High relevance - exact quote match
      matchReason: 'exact-word',
      data: { /* Translation Note about Yahweh */ }
    },
    {
      type: 'translation-word', 
      relevance: 0.8,  // High relevance - Strong's match
      matchReason: 'strong-number',
      data: { /* Translation Words Link */ }
    },
    {
      type: 'translation-question',
      relevance: 0.3,  // Lower relevance - verse context
      matchReason: 'verse-context', 
      data: { /* Translation Question */ }
    }
  ]
}
```

### 3. Panel Updates (Linked Panels Integration)
```typescript
// Each panel receives filtered content
const panelUpdates = {
  
  // Bible Text Panel - Highlight the word
  bibleTextPanel: {
    action: 'highlight',
    wordIndex: 15,
    wordText: 'Yahweh',
    alignmentData: wordTapResult.alignmentReference.alignment
  },
  
  // Translation Notes Panel - Show relevant notes
  translationNotesPanel: {
    action: 'filter',
    filteredNotes: wordTapResult.crossReferences
      .filter(ref => ref.type === 'translation-note')
      .map(ref => ref.data),
    highlightTerms: ['Yahweh', 'H3068']
  },
  
  // Translation Words Panel - Navigate to word
  translationWordsPanel: {
    action: 'navigate',
    wordId: 'yahweh',
    context: 'From Jonah 1:1 - Yahweh',
    relatedStrongs: ['H3068']
  },
  
  // Translation Questions Panel - Show related questions  
  translationQuestionsPanel: {
    action: 'filter',
    filteredQuestions: wordTapResult.crossReferences
      .filter(ref => ref.type === 'translation-question')
      .map(ref => ref.data),
    context: 'Questions about Jonah 1:1'
  }
};

// All panels update simultaneously via linked-panels messaging
linkedPanelsContainer.broadcastMessage({
  type: 'word-interaction',
  source: 'bible-text',
  data: panelUpdates
});
```

### 4. On-Demand Resource Loading
```typescript
// User clicks Translation Academy link
const supportRef = 'rc://*/ta/man/translate/figs-abstractnouns';
const taPath = parseSupportReference(supportRef); // '/translate/figs-abstractnouns'

// Fetch TA article on-demand
const taArticle = await resourceService.getTranslationAcademyArticle(taPath);

// Display in overlay or new panel
overlayPanel.show({
  title: 'Translation Academy: Abstract Nouns',
  content: taArticle.content,
  context: 'Referenced from Jonah 1:1 note about "Yahweh"',
  backAction: () => returnToWordContext('Yahweh', 'JON', 1, 1)
});
```

### 5. Performance Characteristics
```
Word Tap Response Time: < 100ms
- Alignment lookup: ~1ms
- Cross-reference search: ~2ms  
- Panel filtering: ~5ms
- UI updates: ~10ms

Memory Usage:
- Book package (Jonah): ~2MB processed
- Alignment index: ~50KB
- Cross-reference cache: ~100KB

Network Requests:
- Initial book load: 5 requests (ULT, UST, TN, TWL, TQ)
- On-demand TA/TW: 1 request per article
- Cached after first access
```

## Key Benefits of This Architecture

### 1. **Instant Cross-Resource Navigation**
- No loading delays when tapping words
- All related content appears simultaneously
- Context preserved across resource types

### 2. **Intelligent Content Filtering** 
- Relevance scoring prioritizes exact matches
- Progressive disclosure (most relevant first)
- Maintains user focus on selected concept

### 3. **Scalable Performance**
- Alignment indexing enables fast lookups
- Caching prevents redundant API calls
- On-demand loading for less common resources

### 4. **Rich Contextual Information**
- Word etymology (Strong's numbers, lemmas)
- Cross-references between resources
- Translation methodology guidance

### 5. **Seamless User Experience**
- Single tap reveals comprehensive information
- Visual connections between related content
- Breadcrumb navigation maintains context

This creates a **translation workbench** where every word becomes a gateway to comprehensive biblical scholarship, all interconnected through the alignment layer.
