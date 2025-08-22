# @bt-toolkit/usfm-processor

A comprehensive TypeScript library for processing USFM (Unified Standard Format Markers) files into structured data for Bible translation applications.

## Features

✅ **USFM to JSON conversion** using the `usfm-js` library  
✅ **Text extraction and cleaning** from complex USFM alignment data  
✅ **Paragraph-aware processing** with proper grouping  
✅ **Translation section detection** based on `\ts\*` markers  
✅ **Word alignment processing** for original language study  
✅ **Comprehensive TypeScript types** for type safety  
✅ **Utility functions** for scripture manipulation  
✅ **Cross-platform support** (Node.js, React Native, Browser)  

## Installation

```bash
# Using pnpm (recommended for bt-toolkit projects)
pnpm add @bt-toolkit/usfm-processor

# Using npm
npm install @bt-toolkit/usfm-processor

# Using yarn
yarn add @bt-toolkit/usfm-processor
```

## Quick Start

### Basic Usage

```typescript
import { processUSFM, getVerse, formatVerses } from '@bt-toolkit/usfm-processor';

// Process USFM content
const result = await processUSFM(usfmContent, 'JON', 'Jonah');

// Access the structured data
const scripture = result.structuredText;
console.log(`Processed ${scripture.metadata.totalChapters} chapters`);
console.log(`Found ${scripture.metadata.totalVerses} verses`);

// Get a specific verse
const verse = getVerse(scripture, 1, 1);
console.log(verse?.text); // "And the word of Yahweh came to Jonah..."

// Get a verse range
const verses = getVerseRange(scripture, 1, '1-3');
const formattedText = formatVerses(verses, true);
console.log(formattedText);
```

### Simple Processing

For basic use cases where you only need structured text:

```typescript
import { processUSFMSimple } from '@bt-toolkit/usfm-processor';

const scripture = processUSFMSimple(usfmContent, 'Jonah');

scripture.chapters.forEach(chapter => {
  console.log(`Chapter ${chapter.number}: ${chapter.verseCount} verses`);
  
  chapter.verses.forEach(verse => {
    console.log(`  ${verse.number}: ${verse.text}`);
  });
});
```

### Using the Processor Class

```typescript
import { USFMProcessor } from '@bt-toolkit/usfm-processor';

const processor = new USFMProcessor();

// Full processing with all features
const fullResult = await processor.processUSFM(usfmContent, 'JON', 'Jonah');

// Simple processing
const simpleResult = processor.processUSFMSimple(usfmContent, 'Jonah');
```

## API Reference

### Main Functions

#### `processUSFM(usfmContent, bookCode, bookName)`
Processes USFM content with full features including sections and alignments.

#### `processUSFMSimple(usfmContent, bookName?)`
Simple processing that returns just structured text.

### Utility Functions

#### `getVerse(scripture, chapterNum, verseNum)`
Get a specific verse by chapter and verse number.

#### `getVerseRange(scripture, chapterNum, verseRange)`
Get verses in a range (e.g., "1-3" or "5").

#### `formatVerses(verses, showNumbers?)`
Format verses for display with optional verse numbers.

#### `searchScripture(scripture, searchTerm, caseSensitive?)`
Search for text within scripture.

#### `getBookStatistics(scripture)`
Get comprehensive statistics about the processed scripture.

## Integration with bt-toolkit

This package is designed to work seamlessly with other bt-toolkit packages:

### With scripture-utils

```typescript
import { parseReference } from '@bt-toolkit/scripture-utils';
import { processUSFM, getVersesByReference } from '@bt-toolkit/usfm-processor';

const reference = parseReference('JON 1:1-3');
const verses = getVersesByReference(scripture, reference);
```

### With linked-panels

```typescript
import { createPlugin } from 'linked-panels';
import { USFMProcessor } from '@bt-toolkit/usfm-processor';

const scripturePlugin = createPlugin({
  name: 'scripture-viewer',
  processor: new USFMProcessor()
});
```

## Performance

The processor is highly optimized:

- **Processing time**: ~56ms for Jonah (48 verses, 165KB USFM)
- **Memory efficient**: Processes large books without issues
- **Alignment extraction**: Handles 700+ word alignments efficiently
- **Paragraph detection**: Groups verses into logical paragraphs

## Platform Support

### Node.js
```typescript
import { processUSFM } from '@bt-toolkit/usfm-processor';
// Works out of the box
```

### React Native
```typescript
import { processUSFM, getVerse } from '@bt-toolkit/usfm-processor';

function BibleComponent({ usfmContent }) {
  const [scripture, setScripture] = useState(null);
  
  useEffect(() => {
    processUSFM(usfmContent, 'JON', 'Jonah').then(result => {
      setScripture(result.structuredText);
    });
  }, [usfmContent]);
  
  // Render scripture...
}
```

### Browser/Web
```typescript
// Works in modern browsers with ES2022 support
import { processUSFMSimple } from '@bt-toolkit/usfm-processor';
```

## Development

### Building

```bash
pnpm run build
```

### Testing

```bash
pnpm run test
pnpm run test:watch
pnpm run test:coverage
```

### Linting

```bash
pnpm run lint
pnpm run lint:fix
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Related Packages

- [@bt-toolkit/scripture-utils](../scripture-utils) - Core scripture utilities
- [linked-panels](../ui/linked-panels) - Panel system for Bible applications
- [usfm-js](https://github.com/unfoldingWord/usfm-js) - Core USFM parsing library
