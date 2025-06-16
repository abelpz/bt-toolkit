# CleanupManager API

The CleanupManager is responsible for coordinating cleanup operations across the Panel System, preventing memory leaks and ensuring proper resource disposal.

## 🎯 Overview

The CleanupManager provides:
- **Cleanup Coordination**: Coordinate cleanup across multiple components
- **Memory Leak Prevention**: Track and prevent memory leaks
- **Performance Optimization**: Optimize cleanup operations for performance
- **Signal Integration**: Handle cleanup-related signals
- **Metrics Tracking**: Monitor cleanup performance and effectiveness

## 🏗️ Core Concepts

### Cleanup Strategies

```typescript
enum CleanupStrategy {
  IMMEDIATE = 'immediate',     // Clean up immediately
  DEFERRED = 'deferred',      // Clean up after delay
  BATCH = 'batch',            // Clean up in batches
  CONDITIONAL = 'conditional'  // Clean up based on conditions
}
```

### Cleanup Events

```typescript
interface CleanupEvent {
  type: 'resource_dismissed' | 'highlighting_cleared' | 'custom';
  resourceId: string;
  panelId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}
```

## 🚀 Basic Usage

### 1. Creating a CleanupManager

```typescript
import { CleanupManager } from './utils/CleanupManager';
import { SignalBus } from './core/SignalBus';

const signalBus = new SignalBus();
const cleanupManager = new CleanupManager(signalBus);
```

### 2. Registering Cleanup Handlers

```typescript
// Register cleanup handler for specific resource type
cleanupManager.registerCleanupHandler('verse', async (resourceId, context) => {
  console.log(`Cleaning up verse: ${resourceId}`);
  
  // Clean up verse-specific data
  await cleanupVerseHighlighting(resourceId);
  await cleanupVerseComments(resourceId);
  await cleanupVerseBookmarks(resourceId);
});

// Register cleanup handler for panels
cleanupManager.registerCleanupHandler('panel', async (panelId, context) => {
  console.log(`Cleaning up panel: ${panelId}`);
  
  // Clean up panel-specific resources
  await cleanupPanelState(panelId);
  await cleanupPanelSubscriptions(panelId);
});
```

### 3. Triggering Cleanup

```typescript
// Clean up specific resource
await cleanupManager.cleanup('verse-genesis-1-1', 'verse');

// Clean up with context
await cleanupManager.cleanup('verse-genesis-1-1', 'verse', {
  reason: 'user_dismissed',
  panelId: 'main-panel',
  force: true
});
```

## 🔧 Advanced Features

### Cleanup Coordination

```typescript
// Coordinate cleanup across multiple resources
const cleanupGroup = cleanupManager.createCleanupGroup('verse-study-session');

// Add resources to group
cleanupGroup.addResource('verse-genesis-1-1', 'verse');
cleanupGroup.addResource('comment-1', 'comment');
cleanupGroup.addResource('note-1', 'note');

// Clean up entire group
await cleanupGroup.cleanup();

// Clean up group with dependencies
await cleanupGroup.cleanup({
  includeDependencies: true,
  strategy: CleanupStrategy.BATCH
});
```

### Cleanup Dependencies

```typescript
// Define cleanup dependencies
cleanupManager.addCleanupDependency('comment', 'verse', {
  type: 'before', // Clean up comments before verses
  required: true  // Dependency is required
});

cleanupManager.addCleanupDependency('note', 'comment', {
  type: 'after',  // Clean up notes after comments
  required: false // Dependency is optional
});

// Dependencies are automatically handled during cleanup
await cleanupManager.cleanup('verse-genesis-1-1', 'verse');
// Will clean up comments first, then verse, then notes
```

### Conditional Cleanup

```typescript
// Register conditional cleanup
cleanupManager.registerConditionalCleanup('verse', {
  condition: (resourceId, context) => {
    // Only clean up if resource is inactive for more than 5 minutes
    const lastActivity = getResourceLastActivity(resourceId);
    return Date.now() - lastActivity > 5 * 60 * 1000;
  },
  handler: async (resourceId, context) => {
    await cleanupInactiveVerse(resourceId);
  }
});

// Trigger conditional cleanup check
await cleanupManager.checkConditionalCleanup();
```

## 📊 Cleanup Strategies

### Immediate Cleanup

```typescript
// Configure immediate cleanup for critical resources
cleanupManager.setCleanupStrategy('user-session', {
  strategy: CleanupStrategy.IMMEDIATE,
  timeout: 1000, // 1 second timeout
  retries: 3     // Retry up to 3 times
});

await cleanupManager.cleanup('session-123', 'user-session');
// Cleans up immediately
```

### Deferred Cleanup

```typescript
// Configure deferred cleanup for non-critical resources
cleanupManager.setCleanupStrategy('cache', {
  strategy: CleanupStrategy.DEFERRED,
  delay: 30000,  // 30 second delay
  maxDelay: 300000 // Maximum 5 minute delay
});

await cleanupManager.cleanup('cache-item-1', 'cache');
// Cleanup is scheduled for later
```

### Batch Cleanup

```typescript
// Configure batch cleanup for efficiency
cleanupManager.setCleanupStrategy('temporary-file', {
  strategy: CleanupStrategy.BATCH,
  batchSize: 10,     // Process 10 items at once
  batchDelay: 5000,  // 5 second delay between batches
  maxBatchTime: 30000 // Maximum 30 seconds per batch
});

// Add items to batch
await cleanupManager.cleanup('temp-1', 'temporary-file');
await cleanupManager.cleanup('temp-2', 'temporary-file');
await cleanupManager.cleanup('temp-3', 'temporary-file');
// Items are batched and processed together
```

### Conditional Cleanup

```typescript
// Configure conditional cleanup
cleanupManager.setCleanupStrategy('analytics-data', {
  strategy: CleanupStrategy.CONDITIONAL,
  conditions: [
    {
      name: 'age',
      check: (resourceId) => getResourceAge(resourceId) > 24 * 60 * 60 * 1000 // 24 hours
    },
    {
      name: 'size',
      check: (resourceId) => getResourceSize(resourceId) > 10 * 1024 * 1024 // 10MB
    }
  ],
  requireAll: false // Clean up if any condition is met
});
```

## 🔄 Lifecycle Integration

### Signal-Based Cleanup

```typescript
// Cleanup triggered by signals
cleanupManager.onSignal('RESOURCE_DISMISSED', async (signal) => {
  const { resourceId, panelId } = signal.payload;
  
  await cleanupManager.cleanup(resourceId, 'resource', {
    reason: 'dismissed',
    panelId,
    cascade: true // Clean up related resources
  });
});

cleanupManager.onSignal('PANEL_CLOSED', async (signal) => {
  const { panelId } = signal.payload;
  
  // Clean up all resources in the panel
  await cleanupManager.cleanupByPanel(panelId);
});
```

### Automatic Cleanup

```typescript
// Configure automatic cleanup intervals
cleanupManager.setAutoCleanup({
  enabled: true,
  interval: 60000,        // Check every minute
  maxAge: 30 * 60 * 1000, // Clean up items older than 30 minutes
  maxInactive: 10 * 60 * 1000, // Clean up inactive items after 10 minutes
  types: ['cache', 'temporary-file', 'analytics-data']
});

// Start automatic cleanup
cleanupManager.startAutoCleanup();

// Stop automatic cleanup
cleanupManager.stopAutoCleanup();
```

## 📈 Performance Monitoring

### Cleanup Metrics

```typescript
// Get cleanup metrics
const metrics = cleanupManager.getMetrics();
console.log(`Total cleanups: ${metrics.totalCleanups}`);
console.log(`Average cleanup time: ${metrics.averageCleanupTime}ms`);
console.log(`Failed cleanups: ${metrics.failedCleanups}`);
console.log(`Memory freed: ${metrics.memoryFreed} bytes`);

// Get type-specific metrics
const verseMetrics = cleanupManager.getTypeMetrics('verse');
console.log(`Verse cleanups: ${verseMetrics.count}`);
console.log(`Average verse cleanup time: ${verseMetrics.averageTime}ms`);
```

### Performance Optimization

```typescript
// Set performance thresholds
cleanupManager.setPerformanceThresholds({
  maxCleanupTime: 5000,      // 5 seconds
  maxBatchSize: 50,          // 50 items per batch
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  warningThreshold: 1000     // Warn if cleanup takes > 1 second
});

// Monitor performance
cleanupManager.onPerformanceWarning((warning) => {
  console.warn(`Cleanup performance warning: ${warning.message}`);
  console.warn(`Resource: ${warning.resourceId}, Time: ${warning.duration}ms`);
});
```

## 🧹 Memory Management

### Memory Leak Detection

```typescript
// Enable memory leak detection
cleanupManager.enableMemoryLeakDetection({
  checkInterval: 30000,      // Check every 30 seconds
  memoryThreshold: 50 * 1024 * 1024, // 50MB threshold
  growthThreshold: 10 * 1024 * 1024, // 10MB growth threshold
  alertCallback: (leak) => {
    console.error('Memory leak detected:', leak);
    // Send alert to monitoring system
  }
});

// Manual memory check
const memoryInfo = cleanupManager.checkMemoryUsage();
if (memoryInfo.isLeaking) {
  console.warn('Potential memory leak detected');
  await cleanupManager.forceCleanup();
}
```

### Garbage Collection Integration

```typescript
// Trigger garbage collection after cleanup
cleanupManager.setGarbageCollectionStrategy({
  enabled: true,
  threshold: 100,           // Trigger GC after 100 cleanups
  memoryThreshold: 50 * 1024 * 1024, // Or after 50MB freed
  forceGC: true            // Force GC even if not needed
});

// Manual garbage collection
await cleanupManager.triggerGarbageCollection();
```

## 🔔 Event Handling

### Cleanup Events

```typescript
// Listen for cleanup events
cleanupManager.onCleanupStart((event) => {
  console.log(`Cleanup started: ${event.resourceId} (${event.type})`);
});

cleanupManager.onCleanupComplete((event) => {
  console.log(`Cleanup completed: ${event.resourceId} in ${event.duration}ms`);
});

cleanupManager.onCleanupError((event) => {
  console.error(`Cleanup failed: ${event.resourceId}`, event.error);
});
```

### Custom Events

```typescript
// Emit custom cleanup events
await cleanupManager.emitCleanupEvent({
  type: 'custom_cleanup',
  resourceId: 'my-resource',
  metadata: {
    reason: 'user_action',
    customData: 'value'
  }
});

// Listen for custom events
cleanupManager.onCustomCleanupEvent('custom_cleanup', (event) => {
  console.log('Custom cleanup event:', event);
});
```

## 🧪 Testing

### Mock CleanupManager

```typescript
import { CleanupManager } from './utils/CleanupManager';

describe('Cleanup Operations', () => {
  let cleanupManager: CleanupManager;
  let mockSignalBus: vi.Mocked<SignalBus>;

  beforeEach(() => {
    mockSignalBus = createMockSignalBus();
    cleanupManager = new CleanupManager(mockSignalBus);
  });

  it('should register and execute cleanup handler', async () => {
    const cleanupHandler = vi.fn();
    cleanupManager.registerCleanupHandler('test', cleanupHandler);

    await cleanupManager.cleanup('test-resource', 'test');

    expect(cleanupHandler).toHaveBeenCalledWith('test-resource', expect.any(Object));
  });

  it('should handle cleanup dependencies', async () => {
    const parentHandler = vi.fn();
    const childHandler = vi.fn();

    cleanupManager.registerCleanupHandler('parent', parentHandler);
    cleanupManager.registerCleanupHandler('child', childHandler);
    cleanupManager.addCleanupDependency('child', 'parent', { type: 'before' });

    await cleanupManager.cleanup('test-resource', 'child');

    expect(parentHandler).toHaveBeenCalledBefore(childHandler);
  });
});
```

### Integration Testing

```typescript
describe('CleanupManager Integration', () => {
  it('should coordinate with signal bus', async () => {
    const signalBus = new SignalBus();
    const cleanupManager = new CleanupManager(signalBus);

    const signalSpy = vi.spyOn(signalBus, 'emit');

    cleanupManager.registerCleanupHandler('test', async () => {
      // Cleanup logic
    });

    await cleanupManager.cleanup('test-resource', 'test');

    expect(signalSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CLEANUP_COMPLETED'
      })
    );
  });
});
```

## 🔧 Best Practices

### 1. Cleanup Handler Design
- Keep cleanup handlers focused and efficient
- Handle errors gracefully in cleanup handlers
- Use appropriate cleanup strategies for different resource types
- Document cleanup dependencies clearly

### 2. Performance Optimization
- Use batch cleanup for multiple similar resources
- Implement conditional cleanup for non-critical resources
- Monitor cleanup performance and optimize slow handlers
- Use deferred cleanup for non-urgent operations

### 3. Memory Management
- Enable memory leak detection in development
- Set appropriate memory thresholds
- Use automatic cleanup for temporary resources
- Monitor memory usage trends

### 4. Error Handling
- Implement retry logic for failed cleanups
- Log cleanup errors for debugging
- Provide fallback cleanup strategies
- Handle partial cleanup failures gracefully

## 🐛 Troubleshooting

### Common Issues

**Cleanup Handler Not Called**
```typescript
// Check if handler is registered
const handlers = cleanupManager.getCleanupHandlers('my-type');
if (handlers.length === 0) {
  console.error('No cleanup handlers registered for type: my-type');
}
```

**Slow Cleanup Performance**
```typescript
// Check cleanup metrics
const metrics = cleanupManager.getTypeMetrics('slow-type');
if (metrics.averageTime > 1000) {
  console.warn(`Slow cleanup detected for type: slow-type (${metrics.averageTime}ms)`);
}

// Optimize cleanup strategy
cleanupManager.setCleanupStrategy('slow-type', {
  strategy: CleanupStrategy.BATCH,
  batchSize: 5
});
```

**Memory Leaks**
```typescript
// Check for memory leaks
const memoryInfo = cleanupManager.checkMemoryUsage();
if (memoryInfo.isLeaking) {
  console.error('Memory leak detected:', memoryInfo);
  
  // Force cleanup
  await cleanupManager.forceCleanup();
  
  // Check specific resource types
  const typeMetrics = cleanupManager.getAllTypeMetrics();
  for (const [type, metrics] of Object.entries(typeMetrics)) {
    if (metrics.memoryUsage > threshold) {
      console.warn(`High memory usage for type: ${type}`);
    }
  }
}
```

**Cleanup Dependencies**
```typescript
// Check dependency graph
const dependencies = cleanupManager.getCleanupDependencies();
console.log('Cleanup dependencies:', dependencies);

// Validate dependency graph
const validation = cleanupManager.validateDependencyGraph();
if (!validation.isValid) {
  console.error('Invalid dependency graph:', validation.errors);
}
```

## 📚 Related Documentation

- [ResourceRegistry API](./ResourceRegistry.md)
- [SignalBus API](./SignalBus.md)
- [Performance Guide](./Performance.md)
- [Memory Management Best Practices](./MemoryManagement.md) 