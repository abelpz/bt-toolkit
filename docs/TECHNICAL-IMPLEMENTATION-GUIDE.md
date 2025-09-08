# Technical Implementation Guide: Door43 Foundations

## Overview
This document provides step-by-step technical implementation details for the Door43 Foundations architecture. Use this alongside the PRD for concrete implementation guidance.

## Step-by-Step Implementation

### Phase 1: Core Foundation Setup

#### Step 1.1: Complete Core Library Structure
```bash
# Already created:
# - packages/core/door43-core (types and interfaces)
# - packages/core/door43-alignment (alignment service)
# - packages/services/door43-resources (resource management)
# - packages/tools/door43-cli (CLI tools)

# Still needed:
nx g @nx/js:library door43-parsers --directory=packages/core/door43-parsers
nx g @nx/js:library door43-storage --directory=packages/platform/door43-storage
```

#### Step 1.2: Implement Service Factory Pattern
**File**: `packages/core/door43-core/src/lib/service-factory.ts`

```typescript
// Natural Language Algorithm:
// 1. Accept platform target and runtime mode
// 2. Create appropriate storage backend for platform
// 3. Create appropriate cache service with storage
// 4. Create parser service (platform agnostic)
// 5. Create API client with platform-specific fetch
// 6. Create resource service with all dependencies
// 7. Return configured service instances

export class ServiceFactory implements IServiceFactory {
  createResourceService(mode: RuntimeMode, platform: PlatformTarget): IResourceService {
    // Logic: Choose OnlineResourceService or OfflineResourceService based on mode
    // Inject platform-specific cache and storage services
  }
  
  createCacheService(backend: StorageBackend, strategy: CacheStrategy): ICacheService {
    // Logic: Choose IndexedDBCache, AsyncStorageCache, FileSystemCache, or MemoryCache
    // Based on platform capabilities and backend preference
  }
}
```

#### Step 1.3: Implement Core Parsers
**File**: `packages/core/door43-parsers/src/lib/usfm-parser.ts`

```typescript
// Natural Language Algorithm for USFM Parsing:
// 1. Split content into lines
// 2. Initialize chapter and verse tracking
// 3. For each line:
//    - If line starts with \c, create new chapter
//    - If line starts with \v, create new verse
//    - If line contains \zaln-s, start alignment group
//    - If line contains \zaln-e, end alignment group
//    - Extract Strong's numbers from \w markers
//    - Extract lemma and morph from alignment attributes
// 4. Build ProcessedScripture object with alignment data
// 5. Return structured result

export class USFMParser implements IParserService {
  parseUSFM(content: string, includeAlignment?: boolean): Result<ProcessedScripture> {
    // Implementation follows the algorithm above
  }
}
```

### Phase 2: Resource Service Implementation

#### Step 2.1: Online Resource Service
**File**: `packages/services/door43-resources/src/lib/online-resource-service.ts`

```typescript
// Natural Language Algorithm for Online Resource Loading:
// 1. Accept book, language, organization parameters
// 2. Search Door43 catalog for matching repositories
// 3. For each resource type (ult, ust, tn, twl, tq):
//    a. Try primary resource ID pattern: {lang}_{resourceId}
//    b. If not found, try fallback IDs
//    c. Fetch manifest.yaml from repository
//    d. Parse manifest to find book-specific files
//    e. Fetch raw file content using API
//    f. Parse content using appropriate parser
//    g. Store in cache for future use
// 4. Combine all resources into BookTranslationPackage
// 5. Return package with processed resources

export class OnlineResourceService implements IResourceService {
  async getBibleText(book: BookId, textType: 'literal' | 'simplified'): AsyncResult<ProcessedScripture | null> {
    const resourceId = textType === 'literal' ? 'ult' : 'ust';
    // Follow algorithm above
  }
}
```

#### Step 2.2: Cache Service Implementation
**File**: `packages/platform/door43-storage/src/lib/indexeddb-cache.ts`

```typescript
// Natural Language Algorithm for IndexedDB Cache:
// 1. Initialize IndexedDB database with object stores
// 2. For set operations:
//    a. Serialize data to JSON
//    b. Add timestamp and TTL
//    c. Store in appropriate object store
//    d. Handle quota exceeded errors
// 3. For get operations:
//    a. Query object store by key
//    b. Check TTL expiration
//    c. Deserialize and return data
//    d. Update access timestamp
// 4. For cleanup:
//    a. Remove expired entries
//    b. Implement LRU eviction when quota reached

export class IndexedDBCache implements ICacheService {
  async set<T>(key: string, data: T, ttl?: number): AsyncResult<void> {
    // Follow algorithm above
  }
}
```

### Phase 3: Alignment System Implementation

#### Step 3.1: Complete Alignment Service
**File**: `packages/core/door43-alignment/src/lib/word-interaction-service.ts`

```typescript
// Natural Language Algorithm for Word Interaction:
// 1. Receive word tap event with position data
// 2. Get alignment data for word at position:
//    a. Find scripture verse containing the word
//    b. Locate alignment group for word index
//    c. Extract Strong's number, lemma, occurrence data
// 3. Create alignment reference object
// 4. Query related resources:
//    a. Find translation notes matching word occurrence
//    b. Find translation words links for original words
//    c. Find translation questions for verse context
//    d. Follow support references to get TA articles
// 5. Score and filter results by relevance
// 6. Return structured interaction result

export class WordInteractionService implements IWordInteractionService {
  async handleWordTap(book: BookId, chapter: number, verse: number, wordIndex: number, wordText: string): AsyncResult<WordInteractionResult> {
    // Follow algorithm above
  }
}
```

#### Step 3.2: Cross-Reference Engine
**File**: `packages/core/door43-alignment/src/lib/cross-reference-engine.ts`

```typescript
// Natural Language Algorithm for Cross-Reference Finding:
// 1. Accept alignment reference as input
// 2. Build search patterns:
//    a. Exact word match with occurrence
//    b. Same Strong's number across book
//    c. Same lemma variations
//    d. Verse context references
// 3. Query each resource type:
//    a. Translation Notes: Match quote and occurrence
//    b. Translation Words Links: Match original words
//    c. Translation Questions: Match verse reference
//    d. Translation Academy: Follow support references
// 4. Rank results by relevance:
//    a. Exact word + occurrence = highest
//    b. Same Strong's number = high
//    c. Verse context = medium
//    d. General topic = low
// 5. Return sorted cross-references

export class CrossReferenceEngine {
  findCrossReferences(reference: AlignmentReference): AsyncResult<CrossReference[]> {
    // Follow algorithm above
  }
}
```

### Phase 4: Platform-Specific Implementations

#### Step 4.1: React Native Storage Backend
**File**: `packages/platform/door43-storage/src/lib/asyncstorage-cache.ts`

```typescript
// Natural Language Algorithm for AsyncStorage Cache:
// 1. Use AsyncStorage for persistent key-value storage
// 2. Implement multi-get and multi-set for efficiency
// 3. Handle JSON serialization/deserialization
// 4. Implement cache size management:
//    a. Track total storage usage
//    b. Implement LRU eviction
//    c. Respect AsyncStorage quotas
// 5. Handle React Native-specific considerations:
//    a. Async operations only
//    b. String-only values
//    c. No batch operations (simulate with Promise.all)

export class AsyncStorageCache implements ICacheService {
  async set<T>(key: string, data: T, ttl?: number): AsyncResult<void> {
    // Follow algorithm above
  }
}
```

#### Step 4.2: Node.js CLI Implementation
**File**: `packages/tools/door43-cli/src/lib/cli-commands.ts`

```typescript
// Natural Language Algorithm for CLI Testing:
// 1. Define command structure:
//    a. test-fetch: Test resource fetching for specific book/language
//    b. test-alignment: Validate alignment data integrity
//    c. benchmark: Performance testing across operations
//    d. validate: Validate resource data against schemas
// 2. For each command:
//    a. Parse command line arguments
//    b. Initialize appropriate services
//    c. Execute test operations
//    d. Report results with detailed logging
//    e. Exit with appropriate status codes
// 3. Provide progress indicators for long operations
// 4. Support output formats: JSON, table, verbose

export class CLICommands {
  async testFetch(book: BookId, language: LanguageCode): Promise<CLIResult> {
    // Follow algorithm above
  }
  
  async benchmarkPerformance(): Promise<BenchmarkResults> {
    // Follow algorithm above
  }
}
```

### Phase 5: Integration with Foundations App

#### Step 5.1: Service Integration
**File**: `bt-toolkit/apps/mobile/foundations-bt/src/services/door43-service-provider.tsx`

```typescript
// Natural Language Algorithm for Service Provider:
// 1. Create React context for service injection
// 2. Initialize services based on platform (React Native)
// 3. Provide runtime mode switching (online/offline)
// 4. Handle service lifecycle:
//    a. Initialize on app start
//    b. Switch modes based on connectivity
//    c. Handle background/foreground transitions
//    d. Clean up on app termination
// 5. Provide hooks for service access

export const Door43ServiceProvider = ({ children }) => {
  // Follow algorithm above
}

export const useDoor43Services = () => {
  // Return all service instances
}
```

#### Step 5.2: Word Interaction UI
**File**: `bt-toolkit/apps/mobile/foundations-bt/src/components/interactive-scripture.tsx`

```typescript
// Natural Language Algorithm for Interactive Scripture:
// 1. Render scripture text with touchable words
// 2. Handle word tap events:
//    a. Calculate word index from touch position
//    b. Extract word text and context
//    c. Call word interaction service
//    d. Update panel filters with results
// 3. Provide visual feedback:
//    a. Highlight tapped word
//    b. Show loading state during processing
//    c. Indicate related content availability
// 4. Handle alignment data:
//    a. Display Strong's numbers on long press
//    b. Show morphological information
//    c. Highlight same-word occurrences

export const InteractiveScripture = ({ scripture, onWordTap }) => {
  // Follow algorithm above
}
```

## Key Configuration Files

### Nx Workspace Configuration
**File**: `nx.json`
```json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "test": {
      "cache": true
    }
  },
  "tags": {
    "scope:shared": "Core libraries used across platforms",
    "scope:platform": "Platform-specific implementations", 
    "scope:tools": "CLI and testing tools",
    "layer:core": "Fundamental abstractions",
    "layer:service": "Business logic services",
    "layer:platform": "Platform integrations",
    "domain:door43": "Door43 ecosystem code"
  }
}
```

### TypeScript Configuration
**File**: `packages/core/door43-core/tsconfig.json`
```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Testing Implementation

### Unit Test Strategy
```typescript
// Test each service method independently
describe('AlignmentService', () => {
  beforeEach(() => {
    // Initialize with mock data
  });
  
  it('should find related resources for word tap', async () => {
    // Test word interaction algorithm
  });
  
  it('should handle missing alignment data gracefully', async () => {
    // Test error handling
  });
});
```

### Integration Test Strategy
```typescript
// Test service combinations
describe('Resource Loading Integration', () => {
  it('should load complete book package', async () => {
    // Test end-to-end book loading
  });
  
  it('should handle offline mode fallback', async () => {
    // Test mode switching
  });
});
```

### CLI Test Commands
```bash
# Resource fetching test
npx tsx packages/tools/door43-cli/src/lib/cli-tester.ts test-fetch --book=GEN --lang=en --owner=unfoldingWord

# Alignment validation test
npx tsx packages/tools/door43-cli/src/lib/cli-tester.ts test-alignment --book=JON --validate-links

# Performance benchmark
npx tsx packages/tools/door43-cli/src/lib/cli-tester.ts benchmark --iterations=10
```

## Critical Implementation Notes

### 1. Alignment Data Processing
- USFM alignment markers follow specific patterns: `\zaln-s |x-strong="H0430" x-lemma="אֱלֹהִים" x-morph="He,Ncmpa" x-occurrence="1" x-occurrences="1"\*`
- Gateway language words are wrapped in `\w` markers within alignment spans
- Occurrence numbers are 1-based and essential for proper word matching

### 2. Door43 API Patterns
- Always use `/api/v1/` endpoints, not `/api/v3/`
- Use `ref` parameter for both branches and tags
- Decode base64 content from repository contents API
- Handle rate limiting with exponential backoff

### 3. Cache Key Patterns
```typescript
// Resource cache keys
const cacheKey = `resource:${book}:${resourceType}:${lang}:${org}:${version}`;

// Alignment cache keys  
const alignmentKey = `alignment:${book}:${chapter}:${verse}:${wordIndex}`;

// Cross-reference cache keys
const crossRefKey = `crossref:${strongsNumber}:${book}:${chapter}:${verse}`;
```

### 4. Error Recovery Patterns
```typescript
// Network retry with backoff
const maxRetries = 3;
const backoffMs = [1000, 2000, 4000];

// Cache fallback
try {
  return await fetchFromAPI();
} catch (error) {
  return await fetchFromCache() || throwError();
}

// Graceful degradation
const partialResults = await Promise.allSettled(resourceRequests);
return combineSuccessfulResults(partialResults);
```

## Performance Optimization

### 1. Lazy Loading Patterns
- Load book packages on demand
- Cache frequently accessed resources
- Preload adjacent chapters/verses
- Defer TA/TW article loading until requested

### 2. Memory Management
- Use WeakMap for temporary references
- Implement cache size limits
- Clean up unused alignment indexes
- Dispose of large objects explicitly

### 3. Network Optimization
- Batch API requests when possible
- Use compression for large responses
- Implement request deduplication
- Cache manifest files aggressively

---

**Last Updated**: January 2025
**Next Review**: After Phase 1 completion
**Status**: Active Implementation Guide
