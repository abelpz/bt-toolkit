# ResourceRegistry API

The ResourceRegistry is the central coordinator for resource management within the Panel System, handling resource lifecycle, dependencies, and cleanup coordination.

## 🎯 Overview

The ResourceRegistry provides:
- **Resource Lifecycle Management**: Mount, unmount, and state tracking
- **Dependency Coordination**: Manage resource dependencies and relationships
- **Cleanup Coordination**: Coordinate cleanup across related resources
- **Performance Metrics**: Track resource usage and performance
- **Signal Integration**: Emit and handle resource-related signals

## 🏗️ Core Concepts

### Resource Lifecycle

```typescript
enum ResourceLifecyclePhase {
  CREATED = 'created',
  MOUNTING = 'mounting',
  MOUNTED = 'mounted',
  UNMOUNTING = 'unmounting',
  UNMOUNTED = 'unmounted',
  ERROR = 'error'
}
```

### Resource State

```typescript
interface ResourceState {
  phase: ResourceLifecyclePhase;
  isActive: boolean;
  lastActivity: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}
```

## 🚀 Basic Usage

### 1. Creating a ResourceRegistry

```typescript
import { ResourceRegistry } from './core/ResourceRegistry';
import { SignalBus } from './core/SignalBus';

const signalBus = new SignalBus();
const resourceRegistry = new ResourceRegistry(signalBus);
```

### 2. Registering Resources

```typescript
// Register a resource
const resource = {
  id: 'verse-genesis-1-1',
  type: 'verse',
  data: {
    book: 'Genesis',
    chapter: 1,
    verse: 1,
    text: 'In the beginning God created the heavens and the earth.'
  }
};

await resourceRegistry.registerResource(resource);
```

### 3. Resource Lifecycle Operations

```typescript
// Mount a resource
await resourceRegistry.mountResource('verse-genesis-1-1');

// Check resource state
const state = resourceRegistry.getResourceState('verse-genesis-1-1');
console.log(`Resource phase: ${state.phase}`);

// Unmount a resource
await resourceRegistry.unmountResource('verse-genesis-1-1');
```

## 🔧 Advanced Features

### Resource Dependencies

```typescript
// Register resource with dependencies
const commentResource = {
  id: 'comment-1',
  type: 'comment',
  dependencies: ['verse-genesis-1-1'], // Depends on verse resource
  data: {
    text: 'This verse establishes the foundation of creation.',
    verseId: 'verse-genesis-1-1'
  }
};

await resourceRegistry.registerResource(commentResource);

// Dependencies are automatically managed
await resourceRegistry.mountResource('comment-1'); // Will mount verse first
```

### Resource Validation

```typescript
// Add validation rules
resourceRegistry.addValidationRule('verse', (resource) => {
  if (!resource.data.book || !resource.data.chapter || !resource.data.verse) {
    return { isValid: false, errors: ['Missing required verse reference'] };
  }
  return { isValid: true, errors: [] };
});

// Validation is automatically applied during registration
try {
  await resourceRegistry.registerResource(invalidVerseResource);
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

### Resource Metadata

```typescript
// Add metadata to resources
await resourceRegistry.setResourceMetadata('verse-genesis-1-1', {
  language: 'en',
  translation: 'ESV',
  lastModified: Date.now(),
  tags: ['creation', 'beginning']
});

// Query resources by metadata
const creationVerses = resourceRegistry.findResourcesByMetadata({
  tags: ['creation']
});
```

## 📊 Resource Queries

### Finding Resources

```typescript
// Find by ID
const resource = resourceRegistry.getResource('verse-genesis-1-1');

// Find by type
const allVerses = resourceRegistry.getResourcesByType('verse');

// Find by state
const mountedResources = resourceRegistry.getResourcesByState(
  ResourceLifecyclePhase.MOUNTED
);

// Find active resources
const activeResources = resourceRegistry.getActiveResources();
```

### Complex Queries

```typescript
// Find resources with criteria
const results = resourceRegistry.findResources({
  type: 'verse',
  state: ResourceLifecyclePhase.MOUNTED,
  metadata: {
    book: 'Genesis',
    chapter: 1
  }
});

// Find resources by dependency
const dependentResources = resourceRegistry.findResourcesByDependency(
  'verse-genesis-1-1'
);
```

## 🔄 Lifecycle Management

### Mounting Resources

```typescript
// Mount single resource
await resourceRegistry.mountResource('verse-genesis-1-1');

// Mount multiple resources
await resourceRegistry.mountResources([
  'verse-genesis-1-1',
  'verse-genesis-1-2',
  'comment-1'
]);

// Mount with options
await resourceRegistry.mountResource('verse-genesis-1-1', {
  force: true,           // Force remount if already mounted
  includeDependencies: true, // Mount dependencies first
  timeout: 5000         // Timeout in milliseconds
});
```

### Unmounting Resources

```typescript
// Unmount single resource
await resourceRegistry.unmountResource('verse-genesis-1-1');

// Unmount with cleanup
await resourceRegistry.unmountResource('verse-genesis-1-1', {
  cleanup: true,         // Run cleanup procedures
  force: true,          // Force unmount even if dependencies exist
  timeout: 3000         // Timeout for cleanup
});

// Unmount all resources of a type
await resourceRegistry.unmountResourcesByType('comment');
```

### Batch Operations

```typescript
// Batch mount/unmount
const operations = [
  { action: 'mount', resourceId: 'verse-genesis-1-1' },
  { action: 'mount', resourceId: 'verse-genesis-1-2' },
  { action: 'unmount', resourceId: 'old-comment-1' }
];

await resourceRegistry.executeBatch(operations);
```

## 🧹 Cleanup Coordination

### Automatic Cleanup

```typescript
// Register cleanup handler
resourceRegistry.onResourceCleanup('verse', async (resource) => {
  // Custom cleanup logic for verse resources
  console.log(`Cleaning up verse: ${resource.id}`);
  
  // Clean up related data
  await cleanupVerseData(resource.id);
  
  // Notify other systems
  await notifyVerseCleanup(resource.id);
});

// Cleanup is automatically triggered during unmount
await resourceRegistry.unmountResource('verse-genesis-1-1'); // Triggers cleanup
```

### Manual Cleanup

```typescript
// Force cleanup of specific resource
await resourceRegistry.cleanupResource('verse-genesis-1-1');

// Cleanup all unmounted resources
await resourceRegistry.cleanupUnmountedResources();

// Cleanup resources older than threshold
await resourceRegistry.cleanupOldResources(24 * 60 * 60 * 1000); // 24 hours
```

### Cleanup Strategies

```typescript
// Configure cleanup strategies
resourceRegistry.setCleanupStrategy('verse', {
  maxAge: 30 * 60 * 1000,        // 30 minutes
  maxInactive: 10 * 60 * 1000,   // 10 minutes inactive
  priority: 'low',               // Cleanup priority
  batchSize: 10                  // Cleanup batch size
});

// Custom cleanup strategy
resourceRegistry.setCleanupStrategy('comment', {
  custom: async (resources) => {
    // Custom cleanup logic
    for (const resource of resources) {
      if (shouldCleanup(resource)) {
        await resourceRegistry.cleanupResource(resource.id);
      }
    }
  }
});
```

## 📈 Performance Metrics

### Resource Metrics

```typescript
// Get overall metrics
const metrics = resourceRegistry.getMetrics();
console.log(`Total resources: ${metrics.totalResources}`);
console.log(`Mounted resources: ${metrics.mountedResources}`);
console.log(`Average mount time: ${metrics.averageMountTime}ms`);

// Get resource-specific metrics
const verseMetrics = resourceRegistry.getResourceMetrics('verse-genesis-1-1');
console.log(`Mount count: ${verseMetrics.mountCount}`);
console.log(`Last mount time: ${verseMetrics.lastMountTime}ms`);
```

### Performance Monitoring

```typescript
// Monitor resource performance
resourceRegistry.onPerformanceEvent((event) => {
  if (event.type === 'slow_mount' && event.duration > 1000) {
    console.warn(`Slow resource mount: ${event.resourceId} took ${event.duration}ms`);
  }
});

// Set performance thresholds
resourceRegistry.setPerformanceThresholds({
  mountTimeout: 5000,      // 5 seconds
  slowMountThreshold: 1000, // 1 second
  memoryThreshold: 100 * 1024 * 1024 // 100MB
});
```

## 🔔 Signal Integration

### Resource Signals

```typescript
// Listen for resource lifecycle signals
resourceRegistry.onResourceMounted((resource) => {
  console.log(`Resource mounted: ${resource.id}`);
});

resourceRegistry.onResourceUnmounted((resource) => {
  console.log(`Resource unmounted: ${resource.id}`);
});

resourceRegistry.onResourceError((resource, error) => {
  console.error(`Resource error: ${resource.id}`, error);
});
```

### Custom Signals

```typescript
// Emit custom resource signals
await resourceRegistry.emitResourceSignal('verse-genesis-1-1', {
  type: 'VERSE_HIGHLIGHTED',
  payload: { highlightColor: 'yellow' }
});

// Listen for custom signals
resourceRegistry.onResourceSignal('VERSE_HIGHLIGHTED', (signal) => {
  console.log(`Verse highlighted: ${signal.source.resourceId}`);
});
```

## 🧪 Testing

### Mock ResourceRegistry

```typescript
import { ResourceRegistry } from './core/ResourceRegistry';

describe('Resource Management', () => {
  let resourceRegistry: ResourceRegistry;
  let mockSignalBus: vi.Mocked<SignalBus>;

  beforeEach(() => {
    mockSignalBus = createMockSignalBus();
    resourceRegistry = new ResourceRegistry(mockSignalBus);
  });

  it('should register and mount resource', async () => {
    const resource = createTestResource('test-1');
    
    await resourceRegistry.registerResource(resource);
    await resourceRegistry.mountResource('test-1');
    
    const state = resourceRegistry.getResourceState('test-1');
    expect(state.phase).toBe(ResourceLifecyclePhase.MOUNTED);
  });

  it('should handle resource dependencies', async () => {
    const parentResource = createTestResource('parent');
    const childResource = createTestResource('child', ['parent']);
    
    await resourceRegistry.registerResource(parentResource);
    await resourceRegistry.registerResource(childResource);
    
    await resourceRegistry.mountResource('child');
    
    // Parent should be mounted automatically
    const parentState = resourceRegistry.getResourceState('parent');
    expect(parentState.phase).toBe(ResourceLifecyclePhase.MOUNTED);
  });
});
```

### Integration Testing

```typescript
describe('ResourceRegistry Integration', () => {
  it('should coordinate with signal bus', async () => {
    const signalBus = new SignalBus();
    const resourceRegistry = new ResourceRegistry(signalBus);
    
    const signalSpy = vi.spyOn(signalBus, 'emit');
    
    const resource = createTestResource('test-1');
    await resourceRegistry.registerResource(resource);
    await resourceRegistry.mountResource('test-1');
    
    expect(signalSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESOURCE_MOUNTED',
        payload: expect.objectContaining({
          resourceId: 'test-1'
        })
      })
    );
  });
});
```

## 🔧 Best Practices

### 1. Resource Design
- Keep resources focused and single-purpose
- Use clear, descriptive resource IDs
- Include necessary metadata for querying
- Implement proper validation rules

### 2. Dependency Management
- Minimize resource dependencies
- Use weak references where possible
- Document dependency relationships
- Handle circular dependencies gracefully

### 3. Performance
- Monitor resource mount/unmount times
- Implement appropriate cleanup strategies
- Use batch operations for multiple resources
- Cache frequently accessed resources

### 4. Error Handling
- Implement proper error recovery
- Log resource lifecycle events
- Handle timeout scenarios
- Provide meaningful error messages

## 🐛 Troubleshooting

### Common Issues

**Resource Not Found**
```typescript
// Check if resource is registered
if (!resourceRegistry.hasResource('my-resource')) {
  console.error('Resource not registered');
}

// Check resource state
const state = resourceRegistry.getResourceState('my-resource');
console.log('Resource state:', state);
```

**Mount Failures**
```typescript
// Check dependencies
const deps = resourceRegistry.getResourceDependencies('my-resource');
for (const dep of deps) {
  const depState = resourceRegistry.getResourceState(dep);
  if (depState.phase !== ResourceLifecyclePhase.MOUNTED) {
    console.error(`Dependency not mounted: ${dep}`);
  }
}
```

**Memory Leaks**
```typescript
// Monitor resource cleanup
resourceRegistry.onCleanupEvent((event) => {
  console.log(`Cleanup event: ${event.type} for ${event.resourceId}`);
});

// Force cleanup if needed
await resourceRegistry.cleanupUnmountedResources();
```

**Performance Issues**
```typescript
// Check performance metrics
const metrics = resourceRegistry.getMetrics();
if (metrics.averageMountTime > 1000) {
  console.warn('Slow resource mounting detected');
}

// Optimize resource loading
resourceRegistry.setPerformanceThresholds({
  mountTimeout: 3000,
  slowMountThreshold: 500
});
```

## 📚 Related Documentation

- [Resource Management Guide](./Resources.md)
- [CleanupManager API](./CleanupManager.md)
- [SignalBus API](./SignalBus.md)
- [Performance Guide](./Performance.md) 