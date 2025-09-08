# Extensible Cache Examples: Multi-Platform Adaptation

## Overview

This document demonstrates how our extensible cache system adapts to different platforms, environments, and application requirements while maintaining a consistent API and optimal performance.

## Platform Adaptation Examples

### 📱 Mobile App (React Native)
```typescript
// Mobile-optimized configuration
const mobileConfig: ExtensibleCacheConfig = {
  platform: {
    type: 'mobile',
    storageTypes: ['asyncstorage', 'sqlite', 'memory'],
    maxStorageQuota: 100 * 1024 * 1024, // 100MB
    supportsBackground: true,
    supportsRealTime: true,
    supportsFileSystem: false,
    memoryConstraints: {
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      lowMemoryThreshold: 10 * 1024 * 1024 // 10MB
    }
  },
  storage: {
    primary: {
      type: 'sqlite',
      options: {
        databaseName: 'door43_cache.db',
        version: 1,
        enableWAL: true
      },
      compression: { enabled: true, algorithm: 'gzip' },
      encryption: { enabled: true, algorithm: 'AES-256' }
    },
    layers: [
      {
        name: 'memory',
        storage: { type: 'memory', options: {} },
        ttl: 300000, // 5 minutes
        maxSize: 10 * 1024 * 1024 // 10MB hot cache
      },
      {
        name: 'persistent',
        storage: { type: 'sqlite', options: {} },
        ttl: 86400000, // 24 hours
        maxSize: 90 * 1024 * 1024 // 90MB persistent
      }
    ]
  },
  scoping: {
    defaultScope: {
      id: 'mobile-bible-reader',
      name: 'Mobile Bible Reader',
      organizations: [{ organizationId: 'unfoldingWord', repositories: ['*_ult', '*_ust'] }],
      languages: ['en'], // Single language for mobile
      resourceTypes: ['bible-verse', 'translation-note'],
      maxCacheSize: 50 * 1024 * 1024
    }
  },
  performance: {
    memory: {
      maxCacheSize: 50 * 1024 * 1024,
      evictionStrategy: 'lru',
      gcInterval: 60000 // 1 minute
    },
    concurrency: {
      maxConcurrentReads: 10,
      maxConcurrentWrites: 2,
      queueSize: 100
    },
    batching: {
      enabled: true,
      batchSize: 50,
      batchTimeout: 100
    }
  },
  features: {
    compression: true,
    encryption: true,
    realTimeUpdates: false, // Battery optimization
    crossReferenceIndexing: true,
    collaborativeEditing: false,
    offlineSupport: true,
    analytics: false, // Privacy
    debugging: false
  }
};

// Create mobile cache
const mobileCache = await cacheFactory.createCache(mobileConfig);

// Handle mobile-specific events
const mobileCacheImpl = mobileCache as IMobileCache;
await mobileCacheImpl.onAppBackground(); // Optimize for background
await mobileCacheImpl.optimizeForBattery(); // Reduce power usage
```

### 🌐 Web App (Browser)
```typescript
// Web-optimized configuration
const webConfig: ExtensibleCacheConfig = {
  platform: {
    type: 'web',
    storageTypes: ['indexeddb', 'localstorage', 'memory'],
    maxStorageQuota: 1024 * 1024 * 1024, // 1GB
    supportsBackground: true, // Service Worker
    supportsRealTime: true, // WebSocket
    supportsFileSystem: false,
    maxConcurrentOps: 20
  },
  storage: {
    primary: {
      type: 'indexeddb',
      options: {
        databaseName: 'Door43Cache',
        version: 2,
        objectStores: ['resources', 'metadata', 'crossrefs']
      },
      compression: { enabled: true, algorithm: 'brotli' }
    },
    layers: [
      {
        name: 'memory',
        storage: { type: 'memory', options: {} },
        ttl: 600000, // 10 minutes
        maxSize: 100 * 1024 * 1024 // 100MB
      },
      {
        name: 'indexeddb',
        storage: { type: 'indexeddb', options: {} },
        ttl: 604800000, // 7 days
        maxSize: 900 * 1024 * 1024 // 900MB
      },
      {
        name: 'localstorage-fallback',
        storage: { type: 'localstorage', options: {} },
        ttl: 86400000, // 24 hours
        maxSize: 5 * 1024 * 1024 // 5MB fallback
      }
    ]
  },
  scoping: {
    defaultScope: {
      id: 'web-translation-tool',
      name: 'Web Translation Tool',
      organizations: [{ organizationId: 'unfoldingWord', repositories: ['*'] }],
      languages: ['en', 'es'], // Source and target
      resourceTypes: ['*'], // All resource types
      maxCacheSize: 500 * 1024 * 1024
    }
  },
  performance: {
    memory: {
      maxCacheSize: 200 * 1024 * 1024,
      evictionStrategy: 'lfu', // Frequency-based for web
      gcInterval: 300000 // 5 minutes
    },
    concurrency: {
      maxConcurrentReads: 50,
      maxConcurrentWrites: 10,
      queueSize: 500
    },
    prefetching: {
      enabled: true,
      strategy: 'aggressive',
      maxPrefetchSize: 100 * 1024 * 1024
    }
  },
  features: {
    compression: true,
    encryption: false, // HTTPS handles transport
    realTimeUpdates: true,
    crossReferenceIndexing: true,
    collaborativeEditing: true,
    offlineSupport: true,
    analytics: true,
    debugging: true
  }
};

// Create web cache with Service Worker
const webCache = await cacheFactory.createCache(webConfig);
const webCacheImpl = webCache as IWebCache;

// Enable Service Worker for background sync
await webCacheImpl.enableServiceWorkerSync();

// Request storage quota
const quotaGranted = await webCacheImpl.requestStorageQuota(1024 * 1024 * 1024);
console.log('Storage quota granted:', quotaGranted);
```

### 🖥️ Desktop App (Electron)
```typescript
// Desktop-optimized configuration
const desktopConfig: ExtensibleCacheConfig = {
  platform: {
    type: 'desktop',
    storageTypes: ['filesystem', 'sqlite', 'memory'],
    maxStorageQuota: 10 * 1024 * 1024 * 1024, // 10GB
    supportsBackground: true,
    supportsRealTime: true,
    supportsFileSystem: true,
    maxConcurrentOps: 100
  },
  storage: {
    primary: {
      type: 'filesystem',
      options: {
        basePath: './cache/door43',
        indexFile: 'index.json',
        compression: 'gzip',
        fileStructure: 'hierarchical' // org/repo/type/resource
      },
      performance: {
        batchSize: 100,
        connectionPoolSize: 10,
        timeout: 30000
      }
    },
    secondary: {
      type: 'sqlite',
      options: {
        databasePath: './cache/door43.db',
        enableWAL: true,
        cacheSize: 100000,
        journalMode: 'WAL'
      }
    },
    layers: [
      {
        name: 'memory',
        storage: { type: 'memory', options: {} },
        ttl: 1800000, // 30 minutes
        maxSize: 500 * 1024 * 1024 // 500MB
      },
      {
        name: 'filesystem',
        storage: { type: 'filesystem', options: {} },
        ttl: 0, // Persistent
        maxSize: 9 * 1024 * 1024 * 1024 // 9GB
      }
    ]
  },
  scoping: {
    defaultScope: {
      id: 'desktop-full-suite',
      name: 'Desktop Full Suite',
      organizations: [
        { organizationId: 'unfoldingWord', repositories: ['*'] },
        { organizationId: 'WA', repositories: ['*'] }
      ],
      languages: ['*'], // All languages
      resourceTypes: ['*'], // All types
      maxCacheSize: 5 * 1024 * 1024 * 1024 // 5GB
    }
  },
  performance: {
    memory: {
      maxCacheSize: 1024 * 1024 * 1024, // 1GB
      evictionStrategy: 'priority',
      gcInterval: 600000 // 10 minutes
    },
    concurrency: {
      maxConcurrentReads: 100,
      maxConcurrentWrites: 20,
      queueSize: 1000
    },
    prefetching: {
      enabled: true,
      strategy: 'adaptive',
      maxPrefetchSize: 1024 * 1024 * 1024 // 1GB
    }
  },
  features: {
    compression: true,
    encryption: true,
    realTimeUpdates: true,
    crossReferenceIndexing: true,
    collaborativeEditing: true,
    offlineSupport: true,
    analytics: true,
    debugging: true
  }
};

// Create desktop cache
const desktopCache = await cacheFactory.createCache(desktopConfig);
const desktopCacheImpl = desktopCache as IDesktopCache;

// Enable file system watching for external changes
await desktopCacheImpl.enableFileSystemWatching([
  './external-resources/',
  './user-translations/'
]);

// Handle system shutdown gracefully
process.on('SIGTERM', async () => {
  await desktopCacheImpl.onSystemShutdown();
});
```

### 🖥️ Server API (Node.js)
```typescript
// Server-optimized configuration
const serverConfig: ExtensibleCacheConfig = {
  platform: {
    type: 'server',
    storageTypes: ['redis', 'postgresql', 'memory'],
    maxStorageQuota: 100 * 1024 * 1024 * 1024, // 100GB
    supportsBackground: true,
    supportsRealTime: true,
    supportsFileSystem: true,
    maxConcurrentOps: 1000
  },
  storage: {
    primary: {
      type: 'postgresql',
      connectionString: 'postgresql://user:pass@localhost:5432/door43_cache',
      options: {
        poolSize: 50,
        connectionTimeout: 10000,
        queryTimeout: 30000,
        ssl: true
      },
      performance: {
        batchSize: 1000,
        connectionPoolSize: 50,
        timeout: 30000
      }
    },
    secondary: {
      type: 'redis',
      connectionString: 'redis://localhost:6379',
      options: {
        keyPrefix: 'door43:',
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      }
    },
    layers: [
      {
        name: 'redis-hot',
        storage: { type: 'redis', options: {} },
        ttl: 3600000, // 1 hour
        maxSize: 10 * 1024 * 1024 * 1024 // 10GB hot cache
      },
      {
        name: 'postgresql-persistent',
        storage: { type: 'postgresql', options: {} },
        ttl: 0, // Persistent
        maxSize: 90 * 1024 * 1024 * 1024 // 90GB persistent
      }
    ]
  },
  multiTenant: {
    enabled: true,
    defaultTenant: 'default',
    tenants: [
      {
        tenantId: 'unfoldingword',
        name: 'unfoldingWord',
        scopes: [{
          id: 'uw-full',
          organizations: [{ organizationId: 'unfoldingWord', repositories: ['*'] }],
          languages: ['*'],
          resourceTypes: ['*']
        }],
        limits: {
          maxStorageSize: 50 * 1024 * 1024 * 1024, // 50GB
          maxResources: 1000000,
          maxConcurrentOps: 500,
          rateLimit: { requestsPerSecond: 1000, burstSize: 2000 }
        }
      },
      {
        tenantId: 'wycliffeassociates',
        name: 'Wycliffe Associates',
        scopes: [{
          id: 'wa-full',
          organizations: [{ organizationId: 'WA', repositories: ['*'] }],
          languages: ['*'],
          resourceTypes: ['*']
        }],
        limits: {
          maxStorageSize: 30 * 1024 * 1024 * 1024, // 30GB
          maxResources: 500000,
          maxConcurrentOps: 300,
          rateLimit: { requestsPerSecond: 500, burstSize: 1000 }
        }
      }
    ],
    tenantResolution: 'header' // X-Tenant-ID header
  },
  performance: {
    memory: {
      maxCacheSize: 5 * 1024 * 1024 * 1024, // 5GB
      evictionStrategy: 'lfu',
      gcInterval: 1800000 // 30 minutes
    },
    concurrency: {
      maxConcurrentReads: 1000,
      maxConcurrentWrites: 100,
      queueSize: 10000
    },
    batching: {
      enabled: true,
      batchSize: 1000,
      batchTimeout: 50
    }
  },
  features: {
    compression: true,
    encryption: true,
    realTimeUpdates: true,
    crossReferenceIndexing: true,
    collaborativeEditing: true,
    offlineSupport: false, // Server always online
    analytics: true,
    debugging: true
  }
};

// Create multi-tenant server cache
const serverCache = await cacheFactory.createMultiTenantCache(
  serverConfig.multiTenant!.tenants,
  serverConfig.multiTenant!.defaultTenant
);

// Get tenant-specific cache
const uwCache = await serverCache.getTenantCache('unfoldingword');
const waCache = await serverCache.getTenantCache('wycliffeassociates');

// Enable clustering for high availability
const serverCacheImpl = uwCache as IServerCache;
await serverCacheImpl.enableClustering(['server1:6379', 'server2:6379', 'server3:6379']);
await serverCacheImpl.enableLoadBalancing();

// Health monitoring
const healthStatus = await serverCacheImpl.getHealthStatus();
console.log('Server cache health:', healthStatus);
```

## Resource Scoping Examples

### 📖 Bible Reader App (Minimal Scope)
```typescript
const bibleReaderScope: ResourceScope = {
  id: 'bible-reader-minimal',
  name: 'Bible Reader - Minimal',
  description: 'Only Bible text for reading',
  organizations: [
    { organizationId: 'unfoldingWord', repositories: ['en_ult', 'en_ust'] }
  ],
  languages: ['en'],
  resourceTypes: ['bible-verse'],
  books: ['GEN', 'MAT', 'JHN', 'ROM'], // Popular books only
  maxCacheSize: 10 * 1024 * 1024, // 10MB
  priority: { default: 'high' }
};

// Expected resources: ~4,000 verses = ~8MB
// Cache hit rate: 95%+ for popular passages
// Load time: <1 second
```

### 🔧 Translation Tool (Full Scope)
```typescript
const translationToolScope: ResourceScope = {
  id: 'translation-tool-full',
  name: 'Translation Tool - Full Resources',
  description: 'Complete translation resources',
  organizations: [
    { organizationId: 'unfoldingWord', repositories: ['*'] }
  ],
  languages: ['en', 'es'], // Source and target
  resourceTypes: [
    'bible-verse',
    'translation-note',
    'translation-word',
    'translation-academy',
    'translation-question',
    'words-link'
  ],
  maxCacheSize: 500 * 1024 * 1024, // 500MB
  priority: {
    default: 'normal',
    perType: {
      'bible-verse': 'high',
      'translation-note': 'high',
      'translation-academy': 'normal',
      'translation-word': 'normal'
    }
  }
};

// Expected resources: ~150,000 resources = ~300MB
// Cache hit rate: 85%+ for active translation work
// Cross-reference traversal: <5ms average
```

### 👥 Review Platform (Multi-Organization)
```typescript
const reviewPlatformScope: ResourceScope = {
  id: 'review-platform-multi-org',
  name: 'Review Platform - Multi-Organization',
  description: 'Resources from multiple organizations for review',
  organizations: [
    { organizationId: 'unfoldingWord', repositories: ['*'] },
    { organizationId: 'WA', repositories: ['*'] },
    { organizationId: 'GLO', repositories: ['*'] },
    { organizationId: 'BCS', repositories: ['*'] }
  ],
  languages: ['*'], // All languages for comparison
  resourceTypes: ['*'], // All types for comprehensive review
  filters: [
    {
      type: 'include',
      criteria: {
        dateRange: {
          from: new Date('2023-01-01'), // Recent content only
          to: new Date()
        }
      }
    }
  ],
  maxCacheSize: 2 * 1024 * 1024 * 1024, // 2GB
  priority: {
    default: 'normal',
    perOrganization: {
      'unfoldingWord': 'high', // Primary reference
      'WA': 'normal',
      'GLO': 'normal',
      'BCS': 'low'
    }
  }
};

// Expected resources: ~800,000 resources = ~1.5GB
// Multi-language comparison support
// Real-time collaboration features
```

## Dynamic Scope Switching

### Context-Aware Scope Management
```typescript
class ContextAwareScopeManager {
  private currentContext: 'reading' | 'translating' | 'reviewing' = 'reading';
  
  async switchContext(newContext: typeof this.currentContext) {
    const scopeManager = await this.getScopeManager();
    
    switch (newContext) {
      case 'reading':
        await scopeManager.switchScope(
          this.getCurrentScopeId(),
          'bible-reader-minimal',
          'lazy' // Don't immediately load all resources
        );
        break;
        
      case 'translating':
        await scopeManager.switchScope(
          this.getCurrentScopeId(),
          'translation-tool-full',
          'background' // Load resources in background
        );
        break;
        
      case 'reviewing':
        await scopeManager.switchScope(
          this.getCurrentScopeId(),
          'review-platform-multi-org',
          'immediate' // Load immediately for review work
        );
        break;
    }
    
    this.currentContext = newContext;
  }
  
  async optimizeForCurrentContext() {
    const scopeManager = await this.getScopeManager();
    const currentScope = await scopeManager.getActiveScope();
    
    if (!currentScope) return;
    
    // Optimize based on usage patterns
    const optimization = await scopeManager.optimizeScope(currentScope.id);
    
    console.log('Scope optimization:', {
      context: this.currentContext,
      spaceSaved: optimization.optimizedSize - optimization.originalSize,
      removedResources: optimization.removedResources.length,
      recommendations: optimization.recommendations
    });
  }
}
```

## Platform Migration Example

### Migrating from Mobile to Desktop
```typescript
// Export from mobile cache
const mobileExport = await mobileCache.exportResources(
  await mobileCache.queryResources({ scope: 'mobile-bible-reader' }),
  'backup'
);

// Create desktop cache with expanded scope
const desktopCache = await cacheFactory.createCache(desktopConfig);

// Import mobile data into desktop cache
const importResult = await desktopCache.importRepository(
  { server: 'backup', owner: 'mobile', repoId: 'export', ref: 'latest' },
  {
    scope: 'desktop-full-suite',
    overwrite: false,
    progressCallback: (progress) => console.log(`Migration progress: ${progress}%`)
  }
);

console.log('Migration completed:', {
  imported: importResult.imported.length,
  skipped: importResult.skipped.length,
  failed: importResult.failed.length
});

// Expand scope to include additional resources
await desktopCache.updateConfiguration({
  scoping: {
    defaultScope: {
      ...desktopConfig.scoping.defaultScope,
      languages: ['en', 'es', 'fr'], // Add more languages
      resourceTypes: ['*'] // Add all resource types
    }
  }
});
```

This extensible architecture ensures your cache system can adapt to any platform, scale to any size, and serve any combination of resources while maintaining optimal performance! 🚀
