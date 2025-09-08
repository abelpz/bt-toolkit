# Examples

This document provides practical examples of using the Door43 Book Package service, including real-world scenarios and detailed explanations of the data you'll receive.

## 📦 Understanding Book Package Contents

Before diving into code examples, it's helpful to understand what you get in a book package:

- **📖 Bible Text**: 4-6MB of USFM content per translation (ULT/UST)
- **📝 Translation Notes**: 200-800 contextual explanations per book
- **🔗 Word Links**: 100-500 connections to key term definitions
- **❓ Questions**: 20-80 comprehension questions per book
- **📊 Metadata**: Repository info, timestamps, source attribution

> 💡 **Tip**: A complete Genesis package contains ~10MB of translation resources!

## Basic Usage

```typescript
import { BookPackageService, DEFAULT_BOOK_PACKAGE_CONFIG } from '@bt-toolkit/door43-bp';

const service = new BookPackageService(DEFAULT_BOOK_PACKAGE_CONFIG, { debug: true });

// Fetch Genesis package
const genesis = await service.fetchBookPackage({
  book: 'GEN',
  language: 'en',
  organization: 'unfoldingWord'
});

if (genesis.success) {
  const pkg = genesis.data;
  
  // Check what's available
  console.log('📖 ULT available:', !!pkg.literalText);
  console.log('📝 UST available:', !!pkg.simplifiedText);
  console.log('📝 Notes available:', !!pkg.translationNotes);
  console.log('🔗 Word Links available:', !!pkg.translationWordsLinks);
  console.log('❓ Questions available:', !!pkg.translationQuestions);
  
  // Show content sizes
  if (pkg.literalText) {
    console.log('📊 ULT size:', (pkg.literalText.content.length / 1024 / 1024).toFixed(1) + 'MB');
  }
  
  if (pkg.translationNotes?.processed) {
    console.log('📝 Total notes:', pkg.translationNotes.processed.length);
  }
}
```

## Fetching Specific Resources

```typescript
// Only fetch Bible text (ULT and UST)
const textOnly = await service.fetchBookPackage({
  book: 'JON',
  language: 'en',
  organization: 'unfoldingWord',
  resourceTypes: ['literalText', 'simplifiedText']
});
```

## On-Demand Resources

```typescript
// Fetch a Translation Academy article
const taArticle = await service.fetchOnDemandResource({
  type: 'translation-academy',
  identifier: 'figs-metaphor',
  language: 'en',
  organization: 'unfoldingWord'
});

// Fetch a Translation Word
const twArticle = await service.fetchOnDemandResource({
  type: 'translation-words',
  identifier: 'kt/god',
  language: 'en',
  organization: 'unfoldingWord'
});
```

## React Integration

```typescript
import React, { useEffect, useState } from 'react';
import { BookPackageService, BookTranslationPackage, DEFAULT_BOOK_PACKAGE_CONFIG } from '@bt-toolkit/door43-bp';

function BibleReader({ book }: { book: string }) {
  const [package, setPackage] = useState<BookTranslationPackage | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchBook = async () => {
      setLoading(true);
      const service = new BookPackageService(DEFAULT_BOOK_PACKAGE_CONFIG);
      
      const result = await service.fetchBookPackage({
        book,
        language: 'en',
        organization: 'unfoldingWord'
      });
      
      if (result.success) {
        setPackage(result.data);
      }
      setLoading(false);
    };
    
    fetchBook();
  }, [book]);
  
  if (loading) return <div>Loading...</div>;
  if (!package) return <div>No data available</div>;
  
  return (
    <div>
      <h1>{book}</h1>
      {package.literalText && (
        <section>
          <h2>ULT</h2>
          <pre>{package.literalText.content.substring(0, 500)}...</pre>
        </section>
      )}
      {package.simplifiedText && (
        <section>
          <h2>UST</h2>
          <pre>{package.simplifiedText.content.substring(0, 500)}...</pre>
        </section>
      )}
    </div>
  );
}
```

## Error Handling

```typescript
const result = await service.fetchBookPackage({
  book: 'INVALID',
  language: 'en',
  organization: 'unfoldingWord'
});

if (!result.success) {
  console.error('Failed to fetch package:', result.error);
  
  // Handle specific error types
  if (result.error.includes('not found')) {
    console.log('Book or resources not available');
  }
}
```

## Custom Configuration

```typescript
import { BookTranslationPackageConfig } from '@bt-toolkit/door43-bp';

const customConfig: BookTranslationPackageConfig = {
  resourceTypes: {
    literalText: {
      primary: 'ult',
      backups: ['glt'],
      bookSpecific: true,
      filePattern: (book, bookNumber) => [`${bookNumber}-${book}.usfm`]
    },
    simplifiedText: {
      primary: 'ust',
      backups: ['gst'],
      bookSpecific: true,
      filePattern: (book, bookNumber) => [`${bookNumber}-${book}.usfm`]
    },
    // ... other resource types
  },
  defaults: {
    language: 'es',
    organization: 'unfoldingWord'
  },
  bookNumbers: {
    'GEN': '01',
    'EXO': '02',
    // ... all 66 books
  }
};

const service = new BookPackageService(customConfig);
```

## Working with Resource Content

### Processing Bible Text (USFM)

```typescript
const result = await service.fetchBookPackage({
  book: 'JON',
  language: 'en',
  organization: 'unfoldingWord',
  resourceTypes: ['literalText', 'simplifiedText']
});

if (result.success && result.data.literalText) {
  const usfmContent = result.data.literalText.content;
  
  // USFM content looks like this:
  // \id JON EN_ULT en_English_ltr
  // \usfm 3.0
  // \h Jonah
  // \c 1
  // \v 1 Now the word of Yahweh came to Jonah...
  
  // Extract verses from a chapter
  const chapter1Verses = usfmContent
    .split('\\c 1')[1]?.split('\\c 2')[0] // Get chapter 1 content
    .split('\\v ')
    .slice(1) // Remove empty first element
    .map(verse => {
      const [number, ...textParts] = verse.split(' ');
      return {
        verse: parseInt(number),
        text: textParts.join(' ').replace(/\\[a-z]+\*?/g, '').trim()
      };
    });
    
  console.log('📖 Jonah 1 verses:', chapter1Verses);
}
```

### Processing Translation Notes (TSV)

```typescript
const result = await service.fetchBookPackage({
  book: 'GEN',
  language: 'en', 
  organization: 'unfoldingWord',
  resourceTypes: ['translationNotes']
});

if (result.success && result.data.translationNotes?.processed) {
  const notes = result.data.translationNotes.processed;
  
  // Find notes for Genesis 1:1
  const gen1_1Notes = notes.filter(note => 
    note.chapter === 1 && note.verse === 1
  );
  
  console.log('📝 Notes for Genesis 1:1:');
  gen1_1Notes.forEach(note => {
    console.log(`  • ${note.glQuote}: ${note.occurrenceNote}`);
    if (note.supportReference) {
      console.log(`    📚 See: ${note.supportReference}`);
    }
  });
  
  // Group notes by chapter
  const notesByChapter = notes.reduce((acc, note) => {
    if (!acc[note.chapter]) acc[note.chapter] = [];
    acc[note.chapter].push(note);
    return acc;
  }, {});
  
  console.log('📊 Notes distribution:', 
    Object.entries(notesByChapter).map(([ch, notes]) => 
      `Chapter ${ch}: ${notes.length} notes`
    )
  );
}
```

### Processing Translation Questions

```typescript
const result = await service.fetchBookPackage({
  book: 'MAT',
  language: 'en',
  organization: 'unfoldingWord', 
  resourceTypes: ['translationQuestions']
});

if (result.success && result.data.translationQuestions?.processed) {
  const questions = result.data.translationQuestions.processed;
  
  // Find questions for Matthew 5 (Sermon on the Mount)
  const matt5Questions = questions.filter(q => 
    q.reference.includes('MAT 5')
  );
  
  console.log('❓ Questions for Matthew 5:');
  matt5Questions.forEach(q => {
    console.log(`\n📍 ${q.reference}`);
    console.log(`❓ ${q.question}`);
    console.log(`✅ ${q.response}`);
  });
}
```

### Working with Translation Words Links

```typescript
const result = await service.fetchBookPackage({
  book: 'JHN',
  language: 'en',
  organization: 'unfoldingWord',
  resourceTypes: ['translationWordsLinks']
});

if (result.success && result.data.translationWordsLinks?.processed) {
  const links = result.data.translationWordsLinks.processed;
  
  // Find all key terms in John 1
  const john1Terms = links.filter(link => 
    link.reference.startsWith('JHN 1:')
  );
  
  // Group by term type
  const termsByType = john1Terms.reduce((acc, link) => {
    const termType = link.twLink.includes('/kt/') ? 'Key Terms' : 
                    link.twLink.includes('/names/') ? 'Names' : 'Other';
    if (!acc[termType]) acc[termType] = [];
    acc[termType].push(link);
    return acc;
  }, {});
  
  console.log('🔗 Key terms in John 1:');
  Object.entries(termsByType).forEach(([type, terms]) => {
    console.log(`\n📂 ${type}:`);
    terms.forEach(term => {
      console.log(`  • ${term.originalWords} → ${term.twLink.split('/').pop()}`);
    });
  });
}
```

## Cache Management

```typescript
// Clear all caches
service.clearCache();

// Get cache statistics
const stats = service.getCacheStats();
console.log('Cached packages:', stats.bookPackages);
console.log('Cached repositories:', stats.repositories);
```

## CLI Usage

```bash
# Test fetching a book package
npx tsx src/lib/cli-tester.ts test --book GEN

# With debug output
npx tsx src/lib/cli-tester.ts test --book GEN --debug

# Test specific language/organization
npx tsx src/lib/cli-tester.ts test --book MAT --lang es --org unfoldingWord
```
