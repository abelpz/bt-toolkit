# Book Translation Package System

A modular, reusable system for fetching complete Bible translation packages from Door43, designed with dependency injection for easy switching between online and offline modes.

## Overview

The Book Translation Package system provides:

- **📦 Complete Book Packages**: Fetch all resources for a book in one operation
- **🔧 Configurable Resource Types**: Define primary and backup resource IDs
- **⚡ On-Demand Loading**: Load Translation Academy and Translation Words articles only when needed
- **🏗️ Modular Architecture**: Reusable across different applications
- **💾 Intelligent Caching**: Repository, manifest, and package-level caching
- **🔄 Dependency Injection**: Easy switching between online/offline modes

## Architecture

```
Door43ApiService (IResourceService)
    ↓
BookTranslationPackageService
    ↓
BookTranslationPackageConfig
```

### Key Components

1. **`BookTranslationPackageConfig`**: Defines resource types and file patterns
2. **`BookTranslationPackageService`**: Core service for fetching packages
3. **`Door43ApiService`**: Implements `IResourceService` interface using packages

## Configuration

### Default Configuration

```typescript
const DEFAULT_CONFIG = {
  resourceTypes: {
    literalText: {
      primary: 'ult',
      backups: ['glt'],
      bookSpecific: true,
      filePattern: (book, bookNumber) => [
        `${bookNumber}-${book}.usfm`,
        `${book}.usfm`,
        `${book.toLowerCase()}.usfm`
      ]
    },
    simplifiedText: {
      primary: 'ust',
      backups: ['gst'],
      bookSpecific: true,
      filePattern: (book) => [`tn_${book}.tsv`]
    },
    // ... other resource types
  }
};
```

### Custom Configuration

```typescript
const customConfig: BookTranslationPackageConfig = {
  resourceTypes: {
    literalText: {
      primary: 'glt',  // Use GLT as primary instead of ULT
      backups: ['ult'],
      bookSpecific: true,
      filePattern: (book, bookNumber) => [`${bookNumber}-${book}.usfm`]
    }
  },
  defaults: {
    language: 'es-419',
    organization: 'es-419_gl'
  }
};
```

## Usage Examples

### Basic Usage (via Door43ApiService)

```typescript
import { Door43ApiService } from './Door43ApiService';

// Initialize service
const service = new Door43ApiService({
  language: 'es-419',
  organization: 'es-419_gl'
});

await service.initialize();

// Get Bible text (automatically uses Book Translation Package)
const ultText = await service.getBibleText('JON', 'ult');
const ustText = await service.getBibleText('JON', 'ust');

// Get translation helps
const notes = await service.getTranslationNotes('JON');
const questions = await service.getTranslationQuestions('JON');
const wordLinks = await service.getTranslationWordsLinks('JON');

// Get passage helps (combines all helps for a verse)
const passageHelps = await service.getPassageHelps({
  book: 'JON',
  chapter: 1,
  verse: 1,
  original: 'JON 1:1'
});

// On-demand resources
const taArticle = await service.getTranslationAcademyArticle('figs-metaphor');
const twArticle = await service.getTranslationWord('kt/god');
```

### Advanced Usage (Direct Package Service)

```typescript
import { BookTranslationPackageService } from './BookTranslationPackageService';

const packageService = new BookTranslationPackageService({
  defaults: {
    language: 'es-419',
    organization: 'es-419_gl'
  }
});

// Get complete book package
const bookPackage = await packageService.fetchBookPackage({
  book: 'JON',
  language: 'es-419',
  organization: 'es-419_gl',
  resourceTypes: ['literalText', 'simplifiedText', 'translationNotes']
});

console.log('Book Package:', {
  literalText: bookPackage.literalText?.source,     // "es-419_glt"
  simplifiedText: bookPackage.simplifiedText?.source, // "es-419_gst"
  translationNotes: bookPackage.translationNotes?.source, // "es-419_tn"
  repositories: Object.keys(bookPackage.repositories)
});

// Access processed data
const processedNotes = bookPackage.translationNotes?.processed;
const rawUsfm = bookPackage.literalText?.content;
```

### On-Demand Resource Loading

```typescript
// Load Translation Academy article (referenced in TN support reference)
const taRequest: OnDemandResourceRequest = {
  type: 'translation-academy',
  identifier: 'figs-metaphor',
  language: 'es-419',
  organization: 'es-419_gl'
};

const taArticle = await packageService.fetchOnDemandResource(taRequest);

// Load Translation Words article (referenced in TWL link)
const twRequest: OnDemandResourceRequest = {
  type: 'translation-words',
  identifier: 'kt/god',
  language: 'es-419',
  organization: 'es-419_gl'
};

const twArticle = await packageService.fetchOnDemandResource(twRequest);
```

## Repository Discovery Process

For a book package request like:
```typescript
{
  book: 'JON',
  language: 'es-419',
  organization: 'es-419_gl'
}
```

The system will:

1. **Search for repositories**: `es-419_glt`, `es-419_gst`, `es-419_tn`, etc.
2. **Get manifests**: Parse `manifest.yaml` to find book-specific files
3. **Find book files**: Use file patterns to locate `35-JON.usfm`, `tn_JON.tsv`, etc.
4. **Fetch and process**: Download raw content and parse into structured data
5. **Cache results**: Cache at repository, manifest, and package levels

## File Pattern Examples

### Bible Text Files (ULT/UST)
- `35-JON.usfm` (with book number)
- `JON.usfm` (book code only)
- `jon.usfm` (lowercase)

### Translation Helps Files
- `tn_JON.tsv` (Translation Notes)
- `twl_JON.tsv` (Translation Words Links)
- `tq_JON.tsv` (Translation Questions)

### On-Demand Files
- `process/figs-metaphor/01.md` (Translation Academy)
- `bible/kt/god.md` (Translation Words)

## Caching Strategy

### Multi-Level Caching
1. **Repository Cache**: Avoid repeated repository discovery
2. **Manifest Cache**: Cache parsed manifest files
3. **Package Cache**: Cache complete book packages (1 hour TTL)
4. **On-Demand Cache**: Cache TA/TW articles (24 hour TTL)

### Cache Management
```typescript
// Clear all caches
service.clearCache();

// Get cache statistics
const stats = service.getCacheStats();
console.log('Cache Stats:', {
  packages: stats.packages,
  repositories: stats.packageService.repositories,
  manifests: stats.packageService.manifests,
  onDemand: stats.packageService.onDemand
});
```

## Error Handling

### Graceful Fallbacks
- **Primary → Backup Resources**: If `ult` fails, try `glt`
- **Multiple File Patterns**: Try different filename conventions
- **Network Resilience**: Exponential backoff for rate limiting
- **Partial Packages**: Return available resources even if some fail

### Error Examples
```typescript
try {
  const bookPackage = await service.getBookTranslationPackage('JON');
} catch (error) {
  console.error('Package fetch failed:', error);
  // Service automatically tries backups and returns partial results
}
```

## Integration with Dependency Injection

### Service Factory Integration
```typescript
// In ResourceServiceFactory
const door43Service = new Door43ApiService({
  language: 'es-419',
  organization: 'es-419_gl'
});

// Service automatically uses Book Translation Package system
const bibleText = await door43Service.getBibleText('JON', 'ult');
```

### React Context Usage
```typescript
// In React components
const { resourceService } = useResourceService();

// Works seamlessly with existing interface
const notes = await resourceService.getTranslationNotes('JON');
```

## Performance Considerations

### Parallel Loading
```typescript
// Book-specific resources are fetched in parallel
const bookPackage = await packageService.fetchBookPackage({
  book: 'JON',
  resourceTypes: ['literalText', 'simplifiedText', 'translationNotes', 'translationQuestions']
});
// All 4 resources fetched simultaneously
```

### Selective Loading
```typescript
// Only fetch what you need
const bookPackage = await packageService.fetchBookPackage({
  book: 'JON',
  resourceTypes: ['translationNotes'] // Only TN, not ULT/UST
});
```

### Caching Benefits
- **First request**: ~2-5 seconds (network + parsing)
- **Cached requests**: ~10-50ms (memory lookup)
- **Partial cache hits**: Mixed performance based on what's cached

## Future Enhancements

### Planned Features
- **Offline Package Storage**: Save processed packages locally
- **Background Sync**: Update packages in background
- **Compression**: Compress cached packages
- **Incremental Updates**: Only fetch changed files
- **Multi-Language Support**: Handle multiple languages simultaneously

### Extensibility
The system is designed to be easily extended:
- **New Resource Types**: Add to configuration
- **Custom File Patterns**: Define new patterns
- **Different APIs**: Implement different backends
- **Custom Processing**: Add new parsers

## Migration Guide

### From Old Door43ApiService
```typescript
// Old way
const notes = await oldService.getTranslationNotes('JON');

// New way (same interface!)
const notes = await newService.getTranslationNotes('JON');
// Now uses Book Translation Package system automatically
```

### Benefits of Migration
- **Better Performance**: Parallel fetching and intelligent caching
- **More Reliable**: Fallback mechanisms and error handling
- **More Flexible**: Configurable resource types and patterns
- **Future-Ready**: Designed for offline storage and sync
