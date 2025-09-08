# Storage Adapters Comparison: SQLite vs IndexedDB

## Overview

Our resource storage architecture supports two storage adapters that implement the same `StorageAdapter` interface but target different environments:

- **SQLiteStorageAdapter**: File-based storage for Node.js (testing, server-side)
- **IndexedDBStorageAdapter**: Browser-native storage for web applications (production)

## Architecture Alignment

Both adapters implement identical interfaces and provide the same functionality, ensuring seamless switching between environments.

### Common Interface

```typescript
interface StorageAdapter {
  // Metadata operations
  getResourceMetadata(server: string, owner: string, language: string): Promise<ResourceMetadata[]>;
  saveResourceMetadata(metadata: ResourceMetadata[]): Promise<void>;
  
  // Content operations
  getResourceContent(key: string): Promise<ResourceContent | null>;
  saveResourceContent(content: ResourceContent): Promise<void>;
  getMultipleContent(keys: string[]): Promise<ResourceContent[]>;
  saveMultipleContent(contents: ResourceContent[]): Promise<void>;
  
  // Transaction support
  beginTransaction(): Promise<StorageTransaction>;
  
  // Cache management
  clearExpiredContent(): Promise<void>;
  clearAllContent(): Promise<void>;
  
  // Storage monitoring
  getStorageInfo(): Promise<StorageInfo>;
  checkQuota(): Promise<QuotaInfo>;
}
```

## Feature Comparison

| Feature | SQLiteStorageAdapter | IndexedDBStorageAdapter | Notes |
|---------|---------------------|------------------------|-------|
| **Environment** | Node.js | Browser | |
| **Storage Type** | File-based (.db) | Browser IndexedDB | |
| **Transactions** | ✅ Native SQLite | ✅ IndexedDB transactions | |
| **Indexes** | ✅ SQL indexes | ✅ IndexedDB indexes | |
| **Batch Operations** | ✅ SQL transactions | ✅ IndexedDB transactions | |
| **SHA Detection** | ✅ Full support | ✅ Full support | |
| **Quota Management** | ✅ File size based | ✅ Storage API based | |
| **Offline Support** | ✅ File persistence | ✅ Browser persistence | |
| **Testing** | ✅ ts-node compatible | ✅ Browser test suite | |
| **Cleanup** | ✅ Temp file deletion | ✅ Database deletion | |

## Data Schema Comparison

### SQLite Schema

```sql
-- Resource Metadata Table
CREATE TABLE resource_metadata (
  id TEXT PRIMARY KEY,
  server TEXT NOT NULL,
  owner TEXT NOT NULL,
  language TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  lastUpdated INTEGER NOT NULL,
  available INTEGER NOT NULL,
  toc TEXT, -- JSON string
  isAnchor INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Resource Content Table
CREATE TABLE resource_content (
  key TEXT PRIMARY KEY,
  resourceId TEXT NOT NULL,
  server TEXT NOT NULL,
  owner TEXT NOT NULL,
  language TEXT NOT NULL,
  type TEXT NOT NULL,
  bookCode TEXT,
  articleId TEXT,
  content TEXT NOT NULL, -- JSON string
  lastFetched INTEGER NOT NULL,
  cachedUntil INTEGER,
  checksum TEXT,
  size INTEGER NOT NULL,
  sourceSha TEXT, -- SHA of source file
  sourceCommit TEXT, -- Git commit SHA
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes
CREATE INDEX idx_metadata_server_owner_lang ON resource_metadata(server, owner, language);
CREATE INDEX idx_content_resource_type ON resource_content(resourceId, type);
CREATE INDEX idx_content_book ON resource_content(bookCode) WHERE bookCode IS NOT NULL;
CREATE INDEX idx_content_cached_until ON resource_content(cachedUntil) WHERE cachedUntil IS NOT NULL;
```

### IndexedDB Schema

```javascript
// Resource Metadata Object Store
const metadataStore = db.createObjectStore('resource_metadata', { keyPath: 'id' });
metadataStore.createIndex('server_owner_language', ['server', 'owner', 'language'], { unique: false });
metadataStore.createIndex('type', 'type', { unique: false });
metadataStore.createIndex('name', 'name', { unique: false });

// Resource Content Object Store
const contentStore = db.createObjectStore('resource_content', { keyPath: 'key' });
contentStore.createIndex('resourceId_type', ['resourceId', 'type'], { unique: false });
contentStore.createIndex('bookCode', 'bookCode', { unique: false });
contentStore.createIndex('cachedUntil', 'cachedUntil', { unique: false });
contentStore.createIndex('server_owner_language', ['server', 'owner', 'language'], { unique: false });
contentStore.createIndex('sourceSha', 'sourceSha', { unique: false });
```

## Implementation Differences

### 1. **Database Connection**

**SQLite:**
```typescript
constructor(dbPath?: string) {
  this.dbPath = dbPath || path.join(os.tmpdir(), `bt-studio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.db`);
}

async initialize(): Promise<void> {
  this.db = new Database(this.dbPath);
  this.db.pragma('journal_mode = WAL');
  this.createTables();
}
```

**IndexedDB:**
```typescript
constructor(dbName: string = 'bt-studio-resources') {
  this.dbName = dbName;
  this.dbVersion = 1;
}

async initialize(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(this.dbName, this.dbVersion);
    request.onsuccess = () => {
      this.db = request.result;
      resolve();
    };
    request.onupgradeneeded = (event) => {
      this.createObjectStores(event.target.result);
    };
  });
}
```

### 2. **Query Patterns**

**SQLite (SQL-based):**
```typescript
async getResourceMetadata(server: string, owner: string, language: string): Promise<ResourceMetadata[]> {
  const stmt = this.db.prepare(`
    SELECT * FROM resource_metadata 
    WHERE server = ? AND owner = ? AND language = ?
    ORDER BY name
  `);
  const rows = stmt.all(server, owner, language);
  return rows.map(this.convertRowToMetadata);
}
```

**IndexedDB (Promise-based):**
```typescript
async getResourceMetadata(server: string, owner: string, language: string): Promise<ResourceMetadata[]> {
  return new Promise((resolve, reject) => {
    const transaction = this.db.transaction(['resource_metadata'], 'readonly');
    const store = transaction.objectStore('resource_metadata');
    const index = store.index('server_owner_language');
    const request = index.getAll([server, owner, language]);
    
    request.onsuccess = () => {
      const results = request.result.map(this.convertRowToMetadata);
      resolve(results);
    };
  });
}
```

### 3. **Transaction Handling**

**SQLite (Synchronous):**
```typescript
async saveMultipleContent(contents: ResourceContent[]): Promise<void> {
  const stmt = this.db.prepare(`INSERT OR REPLACE INTO resource_content (...) VALUES (...)`);
  
  const transaction = this.db.transaction((contentList: ResourceContent[]) => {
    for (const content of contentList) {
      stmt.run(...content);
    }
  });
  
  transaction(contents);
}
```

**IndexedDB (Asynchronous):**
```typescript
async saveMultipleContent(contents: ResourceContent[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = this.db.transaction(['resource_content'], 'readwrite');
    const store = transaction.objectStore('resource_content');
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    
    for (const content of contents) {
      store.put(content);
    }
  });
}
```

## Performance Characteristics

### SQLite Advantages
- **Synchronous Operations**: Faster for batch operations
- **SQL Queries**: Complex queries with joins, aggregations
- **File-based**: Easy backup, migration, inspection
- **Mature Ecosystem**: Extensive tooling and optimization

### IndexedDB Advantages
- **Browser Native**: No additional dependencies
- **Asynchronous**: Non-blocking operations
- **Storage Quota**: Integrated with browser storage management
- **Security**: Sandboxed per origin
- **Offline First**: Built for web app offline scenarios

## Usage Patterns

### Development & Testing
```typescript
// Use SQLite for Node.js testing
import { createTempSQLiteStorage } from './src/services/storage/SQLiteStorageAdapter';

const storage = createTempSQLiteStorage();
await storage.initialize();
// ... run tests ...
await storage.close(true); // Delete temp file
```

### Production Web App
```typescript
// Use IndexedDB for browser deployment
import { createIndexedDBStorage } from './src/services/storage/IndexedDBStorageAdapter';

const storage = createIndexedDBStorage('bt-studio-production');
await storage.initialize();
// ... application logic ...
```

### Unified Resource Manager
```typescript
// ResourceManager works with either adapter
const storageAdapter = isNode() 
  ? createTempSQLiteStorage() 
  : createIndexedDBStorage();

const resourceManager = createResourceManager();
await resourceManager.initialize(storageAdapter, adapters);
```

## SHA-Based Change Detection

Both adapters fully support SHA-based change detection with identical interfaces:

### Storage Schema
```typescript
interface ResourceContent {
  // ... other fields ...
  sourceSha?: string;           // SHA of the source file (from Door43)
  sourceCommit?: string;        // Git commit SHA when content was fetched
}
```

### Usage Pattern
```typescript
// Works identically with both adapters
const cachedContent = await storageAdapter.getResourceContent(key);
const hasChanged = await adapter.hasContentChanged(server, owner, language, contentId, cachedContent?.sourceSha);

if (!hasChanged) {
  return cachedContent.content; // Use cache
} else {
  // Fetch fresh content
}
```

## Testing Strategy

### SQLite Testing
- **Environment**: Node.js with ts-node
- **Isolation**: Temporary database files
- **Cleanup**: Automatic temp file deletion
- **Speed**: Fast synchronous operations

### IndexedDB Testing
- **Environment**: Browser with HTML test suite
- **Isolation**: Temporary database names
- **Cleanup**: Database deletion API
- **Realism**: Actual browser storage behavior

### Cross-Adapter Testing
Both adapters pass identical test suites, ensuring:
- **Interface Compliance**: Same methods, same behavior
- **Data Integrity**: Consistent storage and retrieval
- **Performance**: Acceptable response times
- **Error Handling**: Graceful failure modes

## Migration Strategy

### Development to Production
1. **Develop with SQLite**: Fast iteration, easy debugging
2. **Test with IndexedDB**: Browser compatibility verification
3. **Deploy with IndexedDB**: Production web application

### Data Migration (if needed)
```typescript
async function migrateData(sqliteAdapter: SQLiteStorageAdapter, indexedDBAdapter: IndexedDBStorageAdapter) {
  // Export from SQLite
  const metadata = await sqliteAdapter.getResourceMetadata(server, owner, language);
  const storageInfo = await sqliteAdapter.getStorageInfo();
  
  // Import to IndexedDB
  await indexedDBAdapter.saveResourceMetadata(metadata);
  // ... migrate content as needed ...
}
```

## Conclusion

Our dual storage adapter architecture provides:

1. **Development Flexibility**: SQLite for fast Node.js testing
2. **Production Readiness**: IndexedDB for browser deployment
3. **Consistent Interface**: Same API regardless of storage backend
4. **Feature Parity**: SHA detection, transactions, quota management
5. **Performance Optimization**: Each adapter optimized for its environment
6. **Testing Coverage**: Comprehensive test suites for both adapters

This approach ensures that our resource storage system works seamlessly across development and production environments while maintaining high performance and reliability.

