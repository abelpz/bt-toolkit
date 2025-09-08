# SHA-Based Automatic Storage Updates

## Overview

Our resource storage architecture implements **SHA-based change detection** to enable efficient automatic updates. This system minimizes unnecessary downloads by comparing SHA hashes from Door43's Git API with locally cached content.

## How It Works

### 1. **SHA Collection During Metadata Fetch**

When fetching resource metadata, adapters collect SHA information from Door43's catalog API:

```typescript
// Door43 Catalog API Response (example)
{
  "data": [{
    "repo": { "name": "en_ult" },
    "release": {
      "tag_name": "v1.2.0",
      "commit_sha": "abc123def456789"  // Repository-level SHA
    },
    "files": [
      { 
        "path": "GEN.usfm", 
        "sha": "gen123456",           // File-level SHA
        "size": 150000,
        "last_modified": "2024-01-15T10:30:00Z"
      }
    ]
  }]
}
```

### 2. **SHA Storage in Metadata**

Resource metadata is enhanced to store SHA information:

```typescript
export interface ResourceMetadata {
  // ... existing fields ...
  commitSha?: string;           // Git commit SHA for entire resource
  fileHashes?: Record<string, string>; // File-level SHA hashes (bookCode -> SHA)
}
```

### 3. **SHA Storage in Content**

Individual content items store their source SHA:

```typescript
export interface ResourceContent {
  // ... existing fields ...
  sourceSha?: string;           // SHA of the source file (from Door43)
  sourceCommit?: string;        // Git commit SHA when content was fetched
}
```

### 4. **Change Detection Logic**

The ResourceManager implements intelligent caching with SHA comparison:

```typescript
// Enhanced caching logic in ResourceManager.getOrFetchContent()
if (cachedContent && !this.isExpired(cachedContent)) {
  // SHA-aware change detection optimization
  const resourceAdapter = this.resourceAdapters.get(resourceType);
  if (resourceAdapter?.hasContentChanged && resourceAdapter.getCurrentSha) {
    const { server, owner, language, contentId } = this.parseKey(key);
    
    const hasChanged = await resourceAdapter.hasContentChanged(
      server, owner, language, contentId, cachedContent.sourceSha
    );
    
    if (!hasChanged) {
      console.log(`✅ Using cached content (SHA unchanged)`);
      return cachedContent.content;
    } else {
      console.log(`🔄 Content changed (SHA mismatch), fetching update`);
    }
  }
}
```

## Adapter Implementation

### Required Methods

Adapters that support SHA-based change detection implement these optional methods:

```typescript
export interface BaseResourceAdapter {
  // ... existing methods ...
  
  // SHA-based change detection (optional)
  hasContentChanged?(
    server: string, 
    owner: string, 
    language: string, 
    contentId: string, 
    cachedSha?: string
  ): Promise<boolean>;
  
  getCurrentSha?(
    server: string, 
    owner: string, 
    language: string, 
    contentId: string
  ): string | undefined;
}
```

### Example Implementation

```typescript
class Door43SHAAdapter implements BookOrganizedAdapter {
  private shaCache = new Map<string, Door43ResourceInfo>();

  async getResourceMetadata(server: string, owner: string, language: string): Promise<ScriptureMetadata> {
    // Fetch catalog data with SHA information
    const catalogResponse = await fetch(`https://${server}/api/v1/catalog/search?repo=${language}_ult`);
    const catalogData = await catalogResponse.json();
    
    // Store SHA information for each book
    catalogData.data[0].files.forEach(file => {
      const bookCode = file.path.replace('.usfm', '').toLowerCase();
      const key = `${server}/${owner}/${language}/${bookCode}`;
      this.shaCache.set(key, {
        sha: file.sha,
        commit: catalogData.data[0].release.commit_sha,
        lastModified: file.last_modified,
        size: file.size,
        url: `https://${server}/${owner}/${language}_ult/raw/branch/master/${file.path}`
      });
    });

    return {
      // ... metadata ...
      commitSha: catalogData.data[0].release.commit_sha,
      fileHashes: Object.fromEntries(
        catalogData.data[0].files.map(file => [
          file.path.replace('.usfm', '').toLowerCase(),
          file.sha
        ])
      )
    };
  }

  async hasContentChanged(server: string, owner: string, language: string, bookCode: string, cachedSha?: string): Promise<boolean> {
    const key = `${server}/${owner}/${language}/${bookCode}`;
    const currentShaInfo = this.shaCache.get(key);
    
    if (!currentShaInfo || !cachedSha) {
      return true; // No cached SHA or no current SHA info means we should fetch
    }
    
    return currentShaInfo.sha !== cachedSha;
  }

  getCurrentSha(server: string, owner: string, language: string, bookCode: string): string | undefined {
    const key = `${server}/${owner}/${language}/${bookCode}`;
    return this.shaCache.get(key)?.sha;
  }
}
```

## Performance Benefits

### Bandwidth Optimization
- **Skip Unchanged Files**: Only download content when SHA differs
- **Batch Detection**: Check multiple files simultaneously
- **Intelligent Caching**: Extend cache lifetime for unchanged content

### Speed Improvements
- **Instant Cache Hits**: Sub-millisecond response for unchanged content
- **Reduced API Calls**: Skip content downloads entirely when possible
- **Parallel Processing**: Check multiple SHAs concurrently

### Example Performance Gains

```
📈 Performance Benefits (from test):
   ⚡ 1/3 books can skip download (SHA unchanged)
   💾 Estimated bandwidth saved: ~100KB per unchanged book
   ⏱️ Estimated time saved: ~200ms per unchanged book
```

## Storage Implementation

### Database Schema Enhancement

The SQLite storage adapter includes SHA fields:

```sql
CREATE TABLE resource_content (
  -- ... existing fields ...
  sourceSha TEXT,      -- SHA of the source file (from Door43)
  sourceCommit TEXT,   -- Git commit SHA when content was fetched
  -- ... other fields ...
);
```

### Content Saving with SHA

```typescript
const contentToSave: ResourceContent = {
  // ... existing fields ...
  sourceSha: currentSha,
  sourceCommit: (processedContent as any).metadata?.sourceCommit
};
```

## Integration with Door43 API

### Catalog API Usage

```typescript
// Targeted search for specific resource
const catalogUrl = `https://${server}/api/v1/catalog/search?repo=${language}_${resourceType}&owner=${owner}&stage=prod`;

// Response includes SHA information
{
  "data": [{
    "release": { "commit_sha": "abc123..." },
    "files": [
      { "path": "GEN.usfm", "sha": "file123..." }
    ]
  }]
}
```

### Raw Content Access

```typescript
// Fetch content only when SHA indicates change
const contentUrl = `https://${server}/${owner}/${language}_ult/raw/branch/master/${bookCode.toUpperCase()}.usfm`;
```

## Error Handling

### Graceful Degradation

```typescript
try {
  const hasChanged = await resourceAdapter.hasContentChanged(server, owner, language, contentId, cachedContent.sourceSha);
  
  if (!hasChanged) {
    return cachedContent.content; // Use cache
  }
} catch (error) {
  console.warn(`⚠️ SHA check failed, using cached content:`, error);
  return cachedContent.content; // Fallback to cache
}
```

### Fallback Strategies

1. **SHA Check Failure**: Use cached content if SHA comparison fails
2. **Missing SHA**: Treat as changed and fetch fresh content
3. **Network Issues**: Rely on existing cache expiration logic

## Testing

### Comprehensive Test Coverage

The `test-sha-change-detection.ts` demonstrates:

1. **Initial Fetch**: SHA collection and storage
2. **Unchanged Detection**: Skip download when SHA matches
3. **Change Detection**: Fetch update when SHA differs
4. **Batch Processing**: Check multiple files efficiently
5. **Performance Measurement**: Quantify bandwidth and time savings

### Test Results

```
✅ SHA-Aware Adapter: Fully functional
✅ Change Detection: Working for individual and batch operations  
✅ Automatic Updates: Triggered only when SHA changes
✅ Performance: Optimized with skip-unchanged logic
```

## Future Enhancements

### Potential Improvements

1. **Webhook Integration**: Real-time notifications from Door43 when content changes
2. **Differential Updates**: Download only changed sections within files
3. **Predictive Caching**: Pre-fetch likely-to-be-requested content based on SHA analysis
4. **Cross-Resource Dependencies**: Update dependent resources when anchor resources change

### Monitoring and Analytics

1. **Cache Hit Rates**: Track percentage of requests served from cache
2. **Bandwidth Savings**: Measure data transfer reduction
3. **Update Frequency**: Analyze how often content actually changes
4. **Performance Metrics**: Monitor response times and user experience improvements

## Conclusion

SHA-based automatic storage updates provide a robust, efficient system for keeping local content synchronized with Door43 resources while minimizing bandwidth usage and maximizing performance. The architecture gracefully handles errors and provides significant performance benefits for users working with large biblical resources.

