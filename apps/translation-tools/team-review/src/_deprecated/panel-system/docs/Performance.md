# Performance Optimization Guide

This guide covers performance optimization strategies for the panel system, focusing on memory management, signal efficiency, and rendering optimization.

## Overview

The panel system is designed for high performance, but proper usage patterns and optimization techniques can significantly improve responsiveness and memory usage, especially when handling large Bible texts and multiple panels.

## Memory Management

### 1. Proper Cleanup

Always clean up resources to prevent memory leaks:

```typescript
class OptimizedPanel extends BasePanel {
  private cleanupTasks: Array<() => void> = [];
  
  async onDestroy(): Promise<void> {
    // Run all cleanup tasks
    this.cleanupTasks.forEach(cleanup => cleanup());
    this.cleanupTasks = [];
    
    // Call parent cleanup
    await super.onDestroy();
  }
  
  private addCleanupTask(task: () => void): void {
    this.cleanupTasks.push(task);
  }
}
```

### 2. Signal Handler Cleanup

```typescript
class SignalAwarePanel extends BasePanel {
  private signalCleanups: Array<() => void> = [];
  
  protected setupSignalHandlers(): void {
    // Store cleanup functions
    this.signalCleanups.push(
      this.onSignal('RESOURCE_UPDATED', this.handleResourceUpdate),
      this.onSignal('NAVIGATION_CHANGED', this.handleNavigation)
    );
  }
  
  async onDestroy(): Promise<void> {
    // Clean up signal handlers
    this.signalCleanups.forEach(cleanup => cleanup());
    this.signalCleanups = [];
    
    await super.onDestroy();
  }
}
```

## Signal Optimization

### 1. Use Specific Signal Handlers

```typescript
// Efficient - only receives relevant signals
signalBus.onPanel('translation-panel', 'RESOURCE_UPDATED', handler);

// Less efficient - receives all signals, filters manually
signalBus.onGlobal('RESOURCE_UPDATED', (signal) => {
  if (signal.source.panelId === 'translation-panel') {
    handler(signal);
  }
});
```

### 2. Debounce Rapid Signals

```typescript
class DebouncedPanel extends BasePanel {
  private updateDebouncer = new Map<string, NodeJS.Timeout>();
  
  protected handleResourceUpdate = (signal: Signal): void => {
    const resourceId = signal.payload.resourceId;
    
    // Clear existing debounce timer
    const existingTimer = this.updateDebouncer.get(resourceId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new debounce timer
    const timer = setTimeout(() => {
      this.processResourceUpdate(signal);
      this.updateDebouncer.delete(resourceId);
    }, 100); // 100ms debounce
    
    this.updateDebouncer.set(resourceId, timer);
  };
}
```

### 3. Batch Signal Processing

```typescript
class BatchProcessor {
  private batchQueue: Signal[] = [];
  private batchTimer?: NodeJS.Timeout;
  
  addToBatch(signal: Signal): void {
    this.batchQueue.push(signal);
    
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, 50); // Process batch every 50ms
    }
  }
  
  private processBatch(): void {
    const batch = [...this.batchQueue];
    this.batchQueue = [];
    this.batchTimer = undefined;
    
    // Process all signals in batch
    this.processBatchedSignals(batch);
  }
}
```

## Rendering Optimization

### 1. Virtual Scrolling for Large Lists

```typescript
class VirtualScrollPanel extends BasePanel {
  private virtualScroller: VirtualScroller;
  
  async displayLargeVerseList(verses: VerseResource[]): Promise<void> {
    this.virtualScroller = new VirtualScroller({
      itemHeight: 50,
      containerHeight: 400,
      items: verses,
      renderItem: this.renderVerseItem
    });
    
    const container = this.getResourceContainer();
    container.appendChild(this.virtualScroller.getElement());
  }
  
  private renderVerseItem = (verse: VerseResource, index: number): HTMLElement => {
    const element = document.createElement('div');
    element.className = 'verse-item';
    element.textContent = `${verse.data.book} ${verse.data.chapter}:${verse.data.verse}`;
    return element;
  };
}

class VirtualScroller {
  private container: HTMLElement;
  private viewport: HTMLElement;
  private items: any[];
  private itemHeight: number;
  private visibleStart = 0;
  private visibleEnd = 0;
  
  constructor(options: VirtualScrollerOptions) {
    this.items = options.items;
    this.itemHeight = options.itemHeight;
    this.createElements(options);
    this.updateVisibleItems();
  }
  
  private createElements(options: VirtualScrollerOptions): void {
    this.container = document.createElement('div');
    this.container.style.height = `${options.containerHeight}px`;
    this.container.style.overflow = 'auto';
    
    this.viewport = document.createElement('div');
    this.viewport.style.height = `${this.items.length * this.itemHeight}px`;
    this.viewport.style.position = 'relative';
    
    this.container.appendChild(this.viewport);
    
    // Handle scroll events
    this.container.addEventListener('scroll', () => {
      this.updateVisibleItems();
    });
  }
  
  private updateVisibleItems(): void {
    const scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;
    
    this.visibleStart = Math.floor(scrollTop / this.itemHeight);
    this.visibleEnd = Math.min(
      this.items.length,
      Math.ceil((scrollTop + containerHeight) / this.itemHeight)
    );
    
    this.renderVisibleItems();
  }
  
  private renderVisibleItems(): void {
    // Clear existing items
    this.viewport.innerHTML = '';
    
    // Render only visible items
    for (let i = this.visibleStart; i < this.visibleEnd; i++) {
      const item = this.items[i];
      const element = this.renderItem(item, i);
      element.style.position = 'absolute';
      element.style.top = `${i * this.itemHeight}px`;
      element.style.height = `${this.itemHeight}px`;
      this.viewport.appendChild(element);
    }
  }
}
```

### 2. Lazy Loading Resources

```typescript
class LazyLoadingPanel extends BasePanel {
  private loadedResources = new Set<string>();
  private intersectionObserver: IntersectionObserver;
  
  async onActivate(): Promise<void> {
    this.setupIntersectionObserver();
  }
  
  private setupIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const resourceId = entry.target.getAttribute('data-resource-id');
            if (resourceId && !this.loadedResources.has(resourceId)) {
              this.loadResource(resourceId);
            }
          }
        });
      },
      { threshold: 0.1 }
    );
  }
  
  private async loadResource(resourceId: string): Promise<void> {
    if (this.loadedResources.has(resourceId)) return;
    
    this.loadedResources.add(resourceId);
    
    try {
      const resource = await this.resourceService.loadResource(resourceId);
      await this.displayResource(resource);
    } catch (error) {
      console.error('Failed to load resource:', error);
      this.loadedResources.delete(resourceId);
    }
  }
  
  private createResourcePlaceholder(resourceId: string): HTMLElement {
    const placeholder = document.createElement('div');
    placeholder.className = 'resource-placeholder';
    placeholder.setAttribute('data-resource-id', resourceId);
    placeholder.textContent = 'Loading...';
    
    // Observe for intersection
    this.intersectionObserver.observe(placeholder);
    
    return placeholder;
  }
}
```

## Resource Optimization

### 1. Resource Pooling

```typescript
class ResourcePool {
  private pools = new Map<string, ResourceAPI[]>();
  private maxPoolSize = 50;
  
  getResource(type: string): ResourceAPI | undefined {
    const pool = this.pools.get(type);
    return pool?.pop();
  }
  
  returnResource(resource: ResourceAPI): void {
    const pool = this.pools.get(resource.type) || [];
    
    if (pool.length < this.maxPoolSize) {
      // Reset resource state
      this.resetResource(resource);
      
      // Return to pool
      pool.push(resource);
      this.pools.set(resource.type, pool);
    }
  }
  
  private resetResource(resource: ResourceAPI): void {
    // Clear any UI state
    if (resource.unmount) {
      resource.unmount();
    }
    
    // Reset data to defaults
    if (resource.setState) {
      resource.setState({});
    }
  }
}
```

### 2. Caching Strategies

```typescript
class CachedResourceManager {
  private cache = new Map<string, ResourceAPI>();
  private cacheTimestamps = new Map<string, number>();
  private maxCacheAge = 5 * 60 * 1000; // 5 minutes
  
  async getResource(resourceId: string): Promise<ResourceAPI> {
    // Check cache first
    const cached = this.getCachedResource(resourceId);
    if (cached) {
      return cached;
    }
    
    // Load from source
    const resource = await this.loadResourceFromSource(resourceId);
    
    // Cache the resource
    this.cacheResource(resource);
    
    return resource;
  }
  
  private getCachedResource(resourceId: string): ResourceAPI | undefined {
    const resource = this.cache.get(resourceId);
    const timestamp = this.cacheTimestamps.get(resourceId);
    
    if (resource && timestamp) {
      const age = Date.now() - timestamp;
      if (age < this.maxCacheAge) {
        return resource;
      } else {
        // Remove expired cache entry
        this.cache.delete(resourceId);
        this.cacheTimestamps.delete(resourceId);
      }
    }
    
    return undefined;
  }
  
  private cacheResource(resource: ResourceAPI): void {
    this.cache.set(resource.id, resource);
    this.cacheTimestamps.set(resource.id, Date.now());
    
    // Implement LRU eviction if cache gets too large
    if (this.cache.size > 1000) {
      this.evictOldestEntries();
    }
  }
}
```

## Performance Monitoring

### 1. Performance Metrics

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  
  startTiming(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(operation, duration);
    };
  }
  
  recordMetric(operation: string, value: number): void {
    const values = this.metrics.get(operation) || [];
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
    
    this.metrics.set(operation, values);
  }
  
  getAverageTime(operation: string): number {
    const values = this.metrics.get(operation) || [];
    if (values.length === 0) return 0;
    
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }
  
  getMetricsSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    for (const [operation, values] of this.metrics) {
      summary[operation] = {
        count: values.length,
        average: this.getAverageTime(operation),
        min: Math.min(...values),
        max: Math.max(...values)
      };
    }
    
    return summary;
  }
}

// Usage in panels
class MonitoredPanel extends BasePanel {
  private monitor = new PerformanceMonitor();
  
  async onResourceAdded(resource: ResourceAPI): Promise<void> {
    const endTiming = this.monitor.startTiming('resource-add');
    
    try {
      await this.processResource(resource);
    } finally {
      endTiming();
    }
  }
}
```

### 2. Memory Usage Tracking

```typescript
class MemoryTracker {
  private snapshots: Array<{ timestamp: number; usage: any }> = [];
  
  takeSnapshot(): void {
    if ('memory' in performance) {
      const usage = (performance as any).memory;
      this.snapshots.push({
        timestamp: Date.now(),
        usage: {
          usedJSHeapSize: usage.usedJSHeapSize,
          totalJSHeapSize: usage.totalJSHeapSize,
          jsHeapSizeLimit: usage.jsHeapSizeLimit
        }
      });
      
      // Keep only last 50 snapshots
      if (this.snapshots.length > 50) {
        this.snapshots.shift();
      }
    }
  }
  
  getMemoryTrend(): Array<{ timestamp: number; usage: number }> {
    return this.snapshots.map(snapshot => ({
      timestamp: snapshot.timestamp,
      usage: snapshot.usage.usedJSHeapSize
    }));
  }
  
  detectMemoryLeaks(): boolean {
    if (this.snapshots.length < 10) return false;
    
    const recent = this.snapshots.slice(-10);
    const trend = this.calculateTrend(recent.map(s => s.usage.usedJSHeapSize));
    
    // If memory usage is consistently increasing, might be a leak
    return trend > 1000000; // 1MB increase trend
  }
  
  private calculateTrend(values: number[]): number {
    // Simple linear regression to calculate trend
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }
}
```

## Best Practices Summary

### 1. Signal Management
- Use specific signal handlers instead of global ones
- Debounce rapid signal emissions
- Batch process related signals
- Always clean up signal handlers

### 2. Resource Management
- Implement resource pooling for frequently created resources
- Use lazy loading for large datasets
- Cache resources with appropriate TTL
- Clean up resources properly

### 3. Rendering
- Use virtual scrolling for large lists
- Implement intersection observer for lazy loading
- Minimize DOM manipulations
- Use document fragments for batch DOM updates

### 4. Memory Management
- Always clean up event listeners and timers
- Use weak references where appropriate
- Monitor memory usage in development
- Implement proper resource disposal

### 5. Performance Monitoring
- Track key performance metrics
- Monitor memory usage trends
- Set up alerts for performance degradation
- Profile regularly during development 