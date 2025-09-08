/**
 * Cache Service Hook
 * Manages the Door43 cache system for the web app
 */

import { useState, useEffect, useRef } from 'react';

// Mock cache service for Iteration 1 (will be replaced with real service)
interface MockCacheService {
  initialize(): Promise<void>;
  getResource(resourceId: string): Promise<{ success: boolean; data?: any; error?: string }>;
  setResource(resourceId: string, data: any): Promise<void>;
  getMetrics(): Promise<{
    hitRate: number;
    missRate: number;
    cacheSize: number;
    totalRequests: number;
  }>;
  clear(): Promise<void>;
}

class MockCacheServiceImpl implements MockCacheService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private metrics = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };

  async initialize(): Promise<void> {
    console.log('🔧 Mock cache service initializing...');
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('✅ Mock cache service initialized');
  }

  async getResource(resourceId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    this.metrics.totalRequests++;
    
    const cached = this.cache.get(resourceId);
    if (cached) {
      this.metrics.hits++;
      console.log(`📦 Cache HIT for ${resourceId}`);
      return { success: true, data: cached.data };
    } else {
      this.metrics.misses++;
      console.log(`🌐 Cache MISS for ${resourceId}`);
      return { success: false, error: 'Not in cache' };
    }
  }

  async setResource(resourceId: string, data: any): Promise<void> {
    this.cache.set(resourceId, {
      data,
      timestamp: Date.now()
    });
    console.log(`💾 Cached resource: ${resourceId}`);
  }

  async getMetrics() {
    const total = this.metrics.totalRequests;
    return {
      hitRate: total > 0 ? this.metrics.hits / total : 0,
      missRate: total > 0 ? this.metrics.misses / total : 0,
      cacheSize: this.cache.size,
      totalRequests: total
    };
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.metrics = { hits: 0, misses: 0, totalRequests: 0 };
    console.log('🗑️ Cache cleared');
  }
}

export const useCacheService = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheServiceRef = useRef<MockCacheService | null>(null);

  useEffect(() => {
    const initializeCacheService = async () => {
      try {
        console.log('🚀 Initializing cache service...');
        
        // Create mock cache service
        const cacheService = new MockCacheServiceImpl();
        await cacheService.initialize();
        
        cacheServiceRef.current = cacheService;
        setIsReady(true);
        setError(null);
        
        // Expose to window for debugging
        if (typeof window !== 'undefined') {
          (window as any).cacheService = cacheService;
          (window as any).inspectCache = () => cacheService.getMetrics();
          (window as any).clearCache = () => cacheService.clear();
        }
        
        console.log('✅ Cache service ready');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Cache service initialization failed';
        console.error('❌ Cache service error:', errorMessage);
        setError(errorMessage);
        setIsReady(false);
      }
    };

    initializeCacheService();
  }, []);

  return {
    cacheService: cacheServiceRef.current,
    isReady,
    error
  };
};
