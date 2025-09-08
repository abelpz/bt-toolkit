# API Reference

> 📚 **For detailed processed resource interfaces**, see [Processed Interfaces Documentation](./PROCESSED-INTERFACES.md)

## BookPackageService

The main service class for fetching book packages.

### Constructor

```typescript
constructor(config: BookTranslationPackageConfig, options?: ServiceOptions)
```

**Parameters:**
- `config`: Configuration object defining resource types and defaults
- `options`: Optional service configuration
  - `debug?: boolean` - Enable debug logging
  - `timeout?: number` - Request timeout in milliseconds (default: 30000)
  - `maxRetries?: number` - Maximum retry attempts (default: 3)

### Methods

#### fetchBookPackage()

```typescript
async fetchBookPackage(request: BookPackageRequest): Promise<FetchResult<BookTranslationPackage>>
```

Fetches a complete book translation package with all specified resources.

**Parameters:**
- `request.book: string` - Bible book ID (e.g., 'GEN', 'MAT')
- `request.language: string` - Language code (e.g., 'en', 'es')
- `request.organization: string` - Organization name (e.g., 'unfoldingWord')
- `request.resourceTypes?: string[]` - Optional array of resource types to fetch

**Returns:** `FetchResult<BookTranslationPackage>`

#### fetchOnDemandResource()

```typescript
async fetchOnDemandResource(request: OnDemandResourceRequest): Promise<FetchResult<OnDemandResource>>
```

Fetches Translation Academy articles or Translation Words on demand.

**Parameters:**
- `request.type: 'translation-academy' | 'translation-words'`
- `request.identifier: string` - Article ID or word identifier
- `request.language: string` - Language code
- `request.organization: string` - Organization name

#### Cache Management

```typescript
clearCache(): void
getCacheStats(): CacheStats
```

## Types

### BookPackageRequest

```typescript
interface BookPackageRequest {
  book: string;
  language: string;
  organization: string;
  resourceTypes?: (keyof BookTranslationPackageConfig['resourceTypes'])[];
}
```

### BookTranslationPackage

```typescript
interface BookTranslationPackage {
  book: string;
  language: string;
  organization: string;
  
  // Book-specific resources
  literalText?: {
    source: string; // Repository name
    content: string; // Raw USFM content
    processed?: ProcessedScripture; // Parsed USFM structure
  };
  
  simplifiedText?: {
    source: string;
    content: string;
    processed?: ProcessedScripture; // Parsed USFM structure
  };
  
  translationNotes?: {
    source: string;
    content: string; // Raw TSV content
    processed?: ProcessedTranslationNote[]; // Parsed notes array
  };
  
  translationWordsLinks?: {
    source: string;
    content: string; // Raw TSV content
    processed?: ProcessedTranslationWordsLink[]; // Parsed links array
  };
  
  translationQuestions?: {
    source: string;
    content: string; // Raw TSV content
    processed?: ProcessedTranslationQuestion[]; // Parsed questions array
  };
  
  // Metadata
  fetchedAt: Date;
  repositories: Record<string, {
    name: string;
    url: string;
    manifest?: any;
  }>;
}
```

### FetchResult

```typescript
type FetchResult<T> = {
  success: true;
  data: T;
  source: 'cache' | 'api';
} | {
  success: false;
  error: string;
  details?: any;
}
```
