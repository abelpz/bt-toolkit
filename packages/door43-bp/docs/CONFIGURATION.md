# Configuration Guide

## Overview

The Door43 Book Package service is highly configurable to support different organizations, languages, and resource types.

## Default Configuration

The library comes with a default configuration optimized for unfoldingWord resources:

```typescript
import { DEFAULT_BOOK_PACKAGE_CONFIG } from '@bt-toolkit/door43-bp';

const service = new BookPackageService(DEFAULT_BOOK_PACKAGE_CONFIG);
```

## Configuration Structure

```typescript
interface BookTranslationPackageConfig {
  resourceTypes: {
    literalText: ResourceTypeConfig;
    simplifiedText: ResourceTypeConfig;
    translationNotes: ResourceTypeConfig;
    translationWordsLinks: ResourceTypeConfig;
    translationQuestions: ResourceTypeConfig;
    translationAcademy: GlobalResourceTypeConfig;
    translationWords: GlobalResourceTypeConfig;
  };
  
  defaults: {
    language: string;
    organization: string;
  };
  
  bookNumbers: Record<string, string>;
}
```

## Resource Type Configuration

### Book-Specific Resources

```typescript
interface ResourceTypeConfig {
  primary: string;           // Primary resource ID (e.g., 'ult')
  backups?: string[];        // Backup resource IDs (e.g., ['glt'])
  bookSpecific: true;
  filePattern: (book: string, bookNumber?: string) => string[];
}
```

**Example:**
```typescript
literalText: {
  primary: 'ult',
  backups: ['glt'],
  bookSpecific: true,
  filePattern: (book: string, bookNumber?: string) => [
    `${bookNumber}-${book}.usfm`,  // e.g., "01-GEN.usfm"
    `${book}.usfm`,                // e.g., "GEN.usfm"
    `${book.toLowerCase()}.usfm`   // e.g., "gen.usfm"
  ]
}
```

### Global Resources

```typescript
interface GlobalResourceTypeConfig {
  primary: string;
  backups?: string[];
  bookSpecific: false;
  onDemandStrategy: 'reference-based' | 'link-based';
}
```

**Example:**
```typescript
translationAcademy: {
  primary: 'ta',
  backups: [],
  bookSpecific: false,
  onDemandStrategy: 'reference-based'  // Fetched when referenced in notes
}
```

## File Patterns

File patterns define how to locate book-specific files within repositories:

### USFM Files (Bible Text)

```typescript
filePattern: (book: string, bookNumber?: string) => [
  `${bookNumber}-${book}.usfm`,    // Standard: "01-GEN.usfm"
  `${book}.usfm`,                  // Alternative: "GEN.usfm"
  `${book.toLowerCase()}.usfm`     // Lowercase: "gen.usfm"
]
```

### TSV Files (Translation Helps)

```typescript
filePattern: (book: string) => [
  `tn_${book}.tsv`,               // Standard: "tn_GEN.tsv"
  `${book.toLowerCase()}.tsv`     // Alternative: "gen.tsv"
]
```

## Book Number Mapping

Maps book IDs to their numeric codes:

```typescript
bookNumbers: {
  // Old Testament
  'GEN': '01', 'EXO': '02', 'LEV': '03', 'NUM': '04', 'DEU': '05',
  'JOS': '06', 'JDG': '07', 'RUT': '08', '1SA': '09', '2SA': '10',
  // ... continues for all 66 books
  
  // New Testament
  'MAT': '40', 'MRK': '41', 'LUK': '42', 'JHN': '43', 'ACT': '44',
  // ... continues through Revelation
  'REV': '66'
}
```

## Custom Configurations

### Spanish Resources

```typescript
const spanishConfig: BookTranslationPackageConfig = {
  resourceTypes: {
    literalText: {
      primary: 'glt',  // Gateway Language Translation
      backups: ['ult'],
      bookSpecific: true,
      filePattern: (book, bookNumber) => [`${bookNumber}-${book}.usfm`]
    },
    simplifiedText: {
      primary: 'gst',  // Gateway Simplified Text
      backups: ['ust'],
      bookSpecific: true,
      filePattern: (book, bookNumber) => [`${bookNumber}-${book}.usfm`]
    },
    // ... other resources
  },
  defaults: {
    language: 'es',
    organization: 'unfoldingWord'
  },
  bookNumbers: DEFAULT_BOOK_PACKAGE_CONFIG.bookNumbers
};
```

### Custom Organization

```typescript
const customOrgConfig: BookTranslationPackageConfig = {
  resourceTypes: {
    // Use same resource types but different defaults
    ...DEFAULT_BOOK_PACKAGE_CONFIG.resourceTypes
  },
  defaults: {
    language: 'fr',
    organization: 'myOrganization'
  },
  bookNumbers: DEFAULT_BOOK_PACKAGE_CONFIG.bookNumbers
};
```

### Minimal Configuration (Text Only)

```typescript
const textOnlyConfig: BookTranslationPackageConfig = {
  resourceTypes: {
    literalText: DEFAULT_BOOK_PACKAGE_CONFIG.resourceTypes.literalText,
    simplifiedText: DEFAULT_BOOK_PACKAGE_CONFIG.resourceTypes.simplifiedText,
    // Omit translation helps
  },
  defaults: {
    language: 'en',
    organization: 'unfoldingWord'
  },
  bookNumbers: DEFAULT_BOOK_PACKAGE_CONFIG.bookNumbers
};
```

## Service Options

Configure service behavior:

```typescript
interface ServiceOptions {
  debug?: boolean;      // Enable debug logging
  timeout?: number;     // Request timeout (default: 30000ms)
  maxRetries?: number;  // Max retry attempts (default: 3)
}

const service = new BookPackageService(config, {
  debug: true,
  timeout: 60000,      // 60 seconds
  maxRetries: 5
});
```

## Repository Discovery

The service automatically discovers repositories using these patterns:

1. **Catalog Search**: `{language}_{resourceId}` (e.g., `en_ult`)
2. **Direct API**: Try direct repository access
3. **Fallback**: Use backup resource IDs if primary fails

### Repository Naming Convention

- **Language Code**: ISO 639-1 or custom (e.g., `en`, `es`, `es-419`)
- **Resource ID**: Standardized identifier (e.g., `ult`, `ust`, `tn`)
- **Format**: `{language}_{resourceId}` (e.g., `en_ult`, `es-419_glt`)

## Validation

The service validates configurations at runtime:

```typescript
// This will throw an error if configuration is invalid
const service = new BookPackageService(invalidConfig);
```

Common validation errors:
- Missing required resource types
- Invalid file patterns
- Missing book number mappings
- Invalid service options

## Best Practices

1. **Use Default Config**: Start with `DEFAULT_BOOK_PACKAGE_CONFIG` and customize as needed
2. **Test Configurations**: Use CLI tools to validate custom configurations
3. **Handle Fallbacks**: Always provide backup resource IDs for critical resources
4. **Cache Appropriately**: Use service-level caching for production applications
5. **Debug Mode**: Enable debug mode during development to understand API calls
