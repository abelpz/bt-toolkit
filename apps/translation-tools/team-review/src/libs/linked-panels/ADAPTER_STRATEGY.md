# Storage Adapter Strategy

## Philosophy

The Linked Panels library follows a **progressive complexity** approach for storage adapters:

1. **Core adapters** for immediate productivity (80% use cases)
2. **Extended adapters** for specific environments (15% use cases)  
3. **Custom adapters** for unique requirements (5% use cases)

## Core Adapters (Always Included)

These adapters are included in the main package because they:
- Cover the vast majority of use cases
- Have no external dependencies
- Are lightweight and well-tested
- Provide clear examples of the adapter interface

### LocalStorageAdapter
```typescript
import { LocalStorageAdapter } from '@bt-toolkit/ui-linked-panels';

// Default for web applications
// ~5-10MB storage limit
// Persists across browser sessions
const adapter = new LocalStorageAdapter();
```

### SessionStorageAdapter  
```typescript
import { SessionStorageAdapter } from '@bt-toolkit/ui-linked-panels';

// For temporary/session-only storage
// Cleared when tab closes
// Same API as localStorage
const adapter = new SessionStorageAdapter();
```

### MemoryStorageAdapter
```typescript
import { MemoryStorageAdapter } from '@bt-toolkit/ui-linked-panels';

// For testing and development
// No persistence (lost on refresh)
// Always available
const adapter = new MemoryStorageAdapter();
```

## Extended Adapters (Separate Packages)

These adapters handle specific environments or have external dependencies:

### @bt-toolkit/linked-panels-indexeddb
```typescript
import { IndexedDBAdapter } from '@bt-toolkit/linked-panels-indexeddb';

// For large data storage in browsers
// Asynchronous operations
// More robust than localStorage
const adapter = new IndexedDBAdapter({
  dbName: 'MyApp',
  storeName: 'panels'
});
```

### @bt-toolkit/linked-panels-http
```typescript
import { HTTPStorageAdapter } from '@bt-toolkit/linked-panels-http';

// For server-side/collaborative storage
// Requires backend API
// Network-dependent
const adapter = new HTTPStorageAdapter({
  baseUrl: 'https://api.example.com',
  headers: { 'Authorization': 'Bearer token' }
});
```

### @bt-toolkit/linked-panels-react-native
```typescript
import { AsyncStorageAdapter } from '@bt-toolkit/linked-panels-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// For React Native applications
// Uses platform-specific storage
const adapter = new AsyncStorageAdapter(AsyncStorage);
```

## Custom Adapters (User-Implemented)

For unique requirements, users implement the simple `PersistenceStorageAdapter` interface:

```typescript
import { PersistenceStorageAdapter } from '@bt-toolkit/ui-linked-panels';

class MyCustomAdapter implements PersistenceStorageAdapter {
  async isAvailable(): Promise<boolean> {
    // Check if your storage is accessible
    return true;
  }

  async getItem(key: string): Promise<string | null> {
    // Retrieve data from your storage
    return await myStorage.get(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    // Save data to your storage
    await myStorage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    // Remove data from your storage
    await myStorage.delete(key);
  }
}
```

### Example Custom Adapters

#### Firebase Firestore
```typescript
class FirestoreAdapter implements PersistenceStorageAdapter {
  constructor(private firestore: Firestore, private collection: string) {}

  async getItem(key: string): Promise<string | null> {
    const doc = await this.firestore.collection(this.collection).doc(key).get();
    return doc.exists ? doc.data()?.state || null : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.firestore.collection(this.collection).doc(key).set({ state: value });
  }

  // ... other methods
}
```

#### SQLite Database
```typescript
class SQLiteAdapter implements PersistenceStorageAdapter {
  constructor(private db: Database) {}

  async getItem(key: string): Promise<string | null> {
    const result = await this.db.get('SELECT value FROM storage WHERE key = ?', [key]);
    return result?.value || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.db.run('INSERT OR REPLACE INTO storage (key, value) VALUES (?, ?)', [key, value]);
  }

  // ... other methods
}
```

#### Redis Cache
```typescript
class RedisAdapter implements PersistenceStorageAdapter {
  constructor(private redis: Redis) {}

  async getItem(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.redis.set(key, value);
  }

  // ... other methods
}
```

## Default Strategy

The library automatically chooses the best available core adapter:

```typescript
export function createDefaultStorageAdapter(): PersistenceStorageAdapter {
  // Try localStorage first (most common)
  if (new LocalStorageAdapter().isAvailable()) {
    return new LocalStorageAdapter();
  }
  
  // Fall back to sessionStorage
  if (new SessionStorageAdapter().isAvailable()) {
    return new SessionStorageAdapter();
  }
  
  // Final fallback to memory (always available)
  return new MemoryStorageAdapter();
}
```

## Usage Guidelines

### For Library Users

#### Quick Start (Core Adapters)
```typescript
import { LinkedPanelsContainer, LocalStorageAdapter } from '@bt-toolkit/ui-linked-panels';

// Most common case - just works
<LinkedPanelsContainer 
  config={config}
  persistence={{ storageAdapter: new LocalStorageAdapter() }}
>
```

#### Extended Environments
```typescript
// Install additional package for specialized storage
npm install @bt-toolkit/linked-panels-indexeddb

import { IndexedDBAdapter } from '@bt-toolkit/linked-panels-indexeddb';
```

#### Custom Requirements
```typescript
// Implement your own adapter for unique needs
class MyAdapter implements PersistenceStorageAdapter {
  // ... your implementation
}
```

### For Library Maintainers

#### Core Adapter Criteria
Only include adapters that are:
- ✅ Used by >50% of users
- ✅ Have no external dependencies  
- ✅ Are <5KB when minified
- ✅ Work in all target environments

#### Extended Adapter Criteria
Create separate packages for adapters that:
- 🔧 Serve specific environments (React Native, Node.js)
- 📦 Have external dependencies
- 🎯 Serve <50% but >10% of users
- 🔄 Have different release cycles

#### Custom Adapter Support
- 📝 Provide clear documentation and examples
- 🛠️ Keep the interface simple and stable
- 🧪 Provide testing utilities
- 💡 Share community adapters in documentation

## Benefits of This Strategy

### For Users
- **Quick Start**: Core adapters work out of the box
- **No Bloat**: Only include what you need
- **Future Proof**: Can always implement custom adapters
- **Progressive**: Start simple, add complexity as needed

### For Maintainers  
- **Focused Core**: Keep main package lean and focused
- **Modular Growth**: Add new adapters without bloating core
- **Community**: Enable community-contributed adapters
- **Maintenance**: Separate release cycles for specialized features

This strategy balances immediate productivity with maximum flexibility while keeping the core library lean and maintainable. 