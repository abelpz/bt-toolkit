# Bible Translation Libraries Guide

This guide provides specific information for creating and organizing Bible translation libraries within the BT-Toolkit monorepo.

## Library Categories

### 1. Scripture Utilities (`@bt-toolkit/scripture-utils`)
**Purpose**: Core utilities for working with scripture references and metadata

**Key Features**:
- Verse reference parsing and validation
- Book name normalization (multiple languages)
- Chapter/verse counting utilities
- Reference range operations
- Canonical ordering

**Example Usage**:
```bash
npm run create:lib --name=scripture-utils
```

**Common Exports**:
```typescript
// Reference parsing
export function parseReference(ref: string): VerseRef | null;
export function formatReference(ref: VerseRef, format: RefFormat): string;

// Book utilities
export function getBookName(book: string, language: string): string;
export function normalizeBookName(name: string): string;

// Validation
export function isValidReference(ref: string): boolean;
export function getChapterCount(book: string): number;
export function getVerseCount(book: string, chapter: number): number;
```

### 2. Text Processing (`@bt-toolkit/text-processing`)
**Purpose**: Text analysis and processing for translation work

**Key Features**:
- Tokenization and sentence segmentation
- Text normalization (Unicode, case, etc.)
- Language detection
- Text similarity measures
- Character encoding handling

**Example Usage**:
```bash
npm run create:lib --name=text-processing
```

**Common Exports**:
```typescript
// Text processing
export function tokenize(text: string, language?: string): Token[];
export function normalizeText(text: string, options: NormalizeOptions): string;
export function detectLanguage(text: string): string | null;

// Analysis
export function calculateSimilarity(text1: string, text2: string): number;
export function extractKeywords(text: string): string[];
```

### 3. File Format Handlers (`@bt-toolkit/file-formats`)
**Purpose**: Parsers and writers for Bible translation file formats

**Key Features**:
- USFM parser and writer
- USX parser and writer
- OSIS support
- Plain text import/export
- Metadata extraction

**Example Usage**:
```bash
npm run create:lib --name=file-formats
```

**Common Exports**:
```typescript
// USFM
export function parseUSFM(content: string): USFMDocument;
export function writeUSFM(doc: USFMDocument): string;

// USX
export function parseUSX(xml: string): USXDocument;
export function writeUSX(doc: USXDocument): string;

// Generic
export interface FormatHandler {
  parse(content: string): Document;
  write(doc: Document): string;
}
```

### 4. Translation Memory (`@bt-toolkit/translation-memory`)
**Purpose**: Translation memory management and matching

**Key Features**:
- Segment storage and retrieval
- Fuzzy matching algorithms
- Translation unit management
- Concordance search
- Quality scoring

**Example Usage**:
```bash
npm run create:lib --name=translation-memory
```

### 5. Quality Checks (`@bt-toolkit/quality-checks`)
**Purpose**: Automated quality checking for translations

**Key Features**:
- Consistency checks
- Reference validation
- Formatting validation
- Terminology compliance
- Completeness checking

**Example Usage**:
```bash
npm run create:lib --name=quality-checks
```

### 6. Bible Metadata (`@bt-toolkit/bible-metadata`)
**Purpose**: Comprehensive Bible structure and metadata

**Key Features**:
- Book order and categorization
- Canon definitions
- Versification schemes
- Historical and cultural context
- Cross-references

**Example Usage**:
```bash
npm run create:lib --name=bible-metadata
```

## UI Component Libraries

### 1. Scripture Editor (`@bt-toolkit/scripture-editor`)
**Purpose**: Rich text editor specifically for scripture translation

**Key Features**:
- USFM marker support
- Real-time preview
- Verse-by-verse editing
- Footnote management
- Cross-reference handling

**Example Usage**:
```bash
npm run create:lib:react --name=scripture-editor
```

### 2. Reference Picker (`@bt-toolkit/reference-picker`)
**Purpose**: UI component for selecting scripture references

**Key Features**:
- Book/chapter/verse selection
- Range selection
- Multiple reference support
- Validation and autocomplete
- Keyboard navigation

**Example Usage**:
```bash
npm run create:lib:react --name=reference-picker
```

## Development Best Practices

### Library Structure
```
packages/library-name/
├── src/
│   ├── lib/           # Core library code
│   ├── types/         # TypeScript definitions
│   ├── utils/         # Utility functions
│   └── index.ts       # Main export file
├── docs/              # Documentation
├── examples/          # Usage examples
└── README.md
```

### Testing Strategy
- Unit tests for all public APIs
- Integration tests for complex workflows
- Performance tests for large data operations
- Example-based testing for edge cases

### Documentation Requirements
- API documentation with examples
- Migration guides for breaking changes
- Performance characteristics
- Browser/Node.js compatibility notes

### Versioning Guidelines
- Semantic versioning (semver)
- Maintain backward compatibility
- Document breaking changes
- Provide migration paths

## Common Patterns

### Configuration Objects
```typescript
export interface LibraryConfig {
  language?: string;
  versification?: string;
  encoding?: string;
  strictMode?: boolean;
}
```

### Error Handling
```typescript
export class BibleTranslationError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'BibleTranslationError';
  }
}
```

### Event System
```typescript
export interface TranslationEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface EventEmitter {
  on(event: string, listener: (data: any) => void): void;
  emit(event: string, data: any): void;
}
```

## Integration Examples

### Cross-Library Usage
```typescript
// In a translation app
import { parseReference } from '@bt-toolkit/scripture-utils';
import { parseUSFM } from '@bt-toolkit/file-formats';
import { checkQuality } from '@bt-toolkit/quality-checks';

const ref = parseReference('John 3:16');
const doc = parseUSFM(usfmContent);
const issues = checkQuality(doc, { reference: ref });
```

### Plugin Architecture
```typescript
// Enable extensibility
export interface Plugin {
  name: string;
  version: string;
  install(api: PluginAPI): void;
}

export function createPlugin(config: PluginConfig): Plugin;
```

## Performance Considerations

### Large Data Handling
- Stream processing for large files
- Lazy loading for metadata
- Efficient search algorithms
- Memory-conscious data structures

### Optimization Strategies
- Bundle size optimization
- Tree-shaking support
- Async/await patterns
- Caching strategies

## Deployment and Publishing

### Pre-publish Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Version bumped appropriately
- [ ] Changelog updated
- [ ] Examples working
- [ ] Bundle size acceptable

### Publishing Process
```bash
# Test locally first
npm run local-registry
npm run publish:local --name=library-name

# Publish to npm
npm run publish:npm --name=library-name
```

## Resources

### Biblical Text Standards
- [USFM Documentation](https://ubsicap.github.io/usfm/)
- [USX Documentation](https://ubsicap.github.io/usx/)
- [Bible Versification](https://github.com/sillsdev/versification)

### Translation Standards
- [TMX Format](https://www.gala-global.org/tmx-14b)
- [XLIFF Format](http://docs.oasis-open.org/xliff/xliff-core/v2.1/xliff-core-v2.1.html)

### Development Tools
- [Paratext](https://paratext.org/)
- [Translation Core](https://www.translationcore.org/)
- [Checking Tools](https://software.sil.org/checking/) 