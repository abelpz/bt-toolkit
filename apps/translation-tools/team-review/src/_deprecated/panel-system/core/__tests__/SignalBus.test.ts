import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SignalBus } from '../SignalBus';
import { SIGNAL_TYPES } from '../../signals/SignalTypes';
import type { Signal, SignalHandler, SignalMiddleware } from '../../types/Signal';

describe('SignalBus', () => {
  let signalBus: SignalBus;

  beforeEach(() => {
    // Reset singleton before each test
    SignalBus.resetInstance();
    signalBus = SignalBus.getInstance({
      enableLogging: false,
      enableMetrics: true,
      maxHistorySize: 10
    });
  });

  afterEach(() => {
    SignalBus.resetInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SignalBus.getInstance();
      const instance2 = SignalBus.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance correctly', () => {
      const instance1 = SignalBus.getInstance();
      SignalBus.resetInstance();
      const instance2 = SignalBus.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Signal Emission and Handling', () => {
    it('should emit and handle global signals', async () => {
      const handler = vi.fn();
      const unsubscribe = signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, handler);

      await signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { resourceId: 'resource-1', resourceType: 'test', panelId: 'panel-1' }
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SIGNAL_TYPES.RESOURCE_MOUNTED,
          source: { panelId: 'panel-1', resourceId: 'resource-1' },
          payload: { resourceId: 'resource-1', resourceType: 'test', panelId: 'panel-1' },
          id: expect.any(String),
          timestamp: expect.any(Number)
        })
      );

      unsubscribe();
    });

    it('should handle panel-specific signals', async () => {
      const handler = vi.fn();
      const unsubscribe = signalBus.onPanel('panel-1', SIGNAL_TYPES.SHOW_PANEL, handler);

      // Signal targeted to panel-1 should be handled
      await signalBus.emit({
        type: SIGNAL_TYPES.SHOW_PANEL,
        source: { panelId: 'source-panel', resourceId: 'source-resource' },
        target: { panelId: 'panel-1' },
        payload: { panelId: 'panel-1' }
      });

      expect(handler).toHaveBeenCalledTimes(1);

      // Signal targeted to different panel should not be handled
      await signalBus.emit({
        type: SIGNAL_TYPES.SHOW_PANEL,
        source: { panelId: 'source-panel', resourceId: 'source-resource' },
        target: { panelId: 'panel-2' },
        payload: { panelId: 'panel-2' }
      });

      expect(handler).toHaveBeenCalledTimes(1); // Still only called once

      unsubscribe();
    });

    it('should unsubscribe handlers correctly', async () => {
      const handler = vi.fn();
      const unsubscribe = signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, handler);

      await signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { resourceId: 'resource-1', resourceType: 'test', panelId: 'panel-1' }
      });

      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      await signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { resourceId: 'resource-1', resourceType: 'test', panelId: 'panel-1' }
      });

      expect(handler).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('Metrics and History', () => {
    it('should track signal metrics', async () => {
      const handler = vi.fn();
      signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, handler);

      await signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { resourceId: 'resource-1', resourceType: 'test', panelId: 'panel-1' }
      });

      await signalBus.emit({
        type: SIGNAL_TYPES.WORD_CLICKED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { word: 'test', index: 0 }
      });

      const metrics = signalBus.getMetrics();
      expect(metrics.totalSignals).toBe(2);
      expect(metrics.signalsByType[SIGNAL_TYPES.RESOURCE_MOUNTED]).toBe(1);
      expect(metrics.signalsByType[SIGNAL_TYPES.WORD_CLICKED]).toBe(1);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.errorCount).toBe(0);
    });

    it('should track signal history', async () => {
      const handler = vi.fn();
      signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, handler);

      await signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { resourceId: 'resource-1', resourceType: 'test', panelId: 'panel-1' }
      });

      const history = signalBus.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        signal: expect.objectContaining({
          type: SIGNAL_TYPES.RESOURCE_MOUNTED
        }),
        success: true,
        processingTime: expect.any(Number),
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Resource-Specific Signals', () => {
    it('should handle resource-specific signals', async () => {
      const handler = vi.fn();
      const unsubscribe = signalBus.onResource('resource-1', SIGNAL_TYPES.FOCUS_RESOURCE, handler);

      // Signal targeted to resource-1 should be handled
      await signalBus.emit({
        type: SIGNAL_TYPES.FOCUS_RESOURCE,
        source: { panelId: 'source-panel', resourceId: 'source-resource' },
        target: { resourceId: 'resource-1' },
        payload: { resourceId: 'resource-1' }
      });

      expect(handler).toHaveBeenCalledTimes(1);

      // Signal targeted to different resource should not be handled
      await signalBus.emit({
        type: SIGNAL_TYPES.FOCUS_RESOURCE,
        source: { panelId: 'source-panel', resourceId: 'source-resource' },
        target: { resourceId: 'resource-2' },
        payload: { resourceId: 'resource-2' }
      });

      expect(handler).toHaveBeenCalledTimes(1); // Still only called once

      unsubscribe();
    });
  });

  describe('Middleware', () => {
    it('should process signals through middleware', async () => {
      const middleware1: SignalMiddleware = vi.fn(async (signal, next) => {
        signal.metadata = { ...signal.metadata, middleware1: true };
        await next();
      });

      const middleware2: SignalMiddleware = vi.fn(async (signal, next) => {
        signal.metadata = { ...signal.metadata, middleware2: true };
        await next();
      });

      signalBus.addMiddleware(middleware1);
      signalBus.addMiddleware(middleware2);

      const handler = vi.fn();
      signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, handler);

      await signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { test: 'data' }
      });

      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            middleware1: true,
            middleware2: true
          })
        })
      );
    });

    it('should remove middleware', async () => {
      const middleware: SignalMiddleware = vi.fn(async (signal, next) => {
        signal.metadata = { ...signal.metadata, processed: true };
        await next();
      });

      signalBus.addMiddleware(middleware);
      signalBus.removeMiddleware(middleware);

      const handler = vi.fn();
      signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, handler);

      await signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { test: 'data' }
      });

      expect(middleware).not.toHaveBeenCalled();
    });

         it('should handle middleware errors gracefully', async () => {
       const failingMiddleware: SignalMiddleware = async (signal, next) => {
         // Intentionally throw error for testing
         throw new Error('Middleware error');
       };

      signalBus.addMiddleware(failingMiddleware);

      const handler = vi.fn();
      signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, handler);

      await expect(signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { test: 'data' }
      })).rejects.toThrow('Middleware error');

      const metrics = signalBus.getMetrics();
      expect(metrics.errorCount).toBe(1);
    });
  });

  describe('Validation Rules', () => {
    it('should validate signals using validation rules', async () => {
      signalBus.addValidationRule({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        validator: (payload) => payload && typeof payload.resourceId === 'string',
        errorMessage: 'ResourceId must be a string'
      });

      const handler = vi.fn();
      signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, handler);

      // Valid signal should pass
      await signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { resourceId: 'resource-1' }
      });

      expect(handler).toHaveBeenCalledTimes(1);

      // Invalid signal should fail
      await expect(signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { resourceId: 123 } // Invalid type
      })).rejects.toThrow('Signal validation failed');

      const metrics = signalBus.getMetrics();
      expect(metrics.errorCount).toBe(1);
    });

    it('should remove validation rules', async () => {
      signalBus.addValidationRule({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        validator: () => false, // Always fail
        errorMessage: 'Always fails'
      });

      signalBus.removeValidationRule(SIGNAL_TYPES.RESOURCE_MOUNTED);

      const handler = vi.fn();
      signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, handler);

      // Should pass now that validation rule is removed
      await signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { resourceId: 'resource-1' }
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle handler errors gracefully', async () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();

      signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, errorHandler);
      signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, normalHandler);

      // Should not throw despite handler error
      await signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { resourceId: 'resource-1' }
      });

      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();

      const metrics = signalBus.getMetrics();
      expect(metrics.totalSignals).toBe(1);
    });

    it('should handle async handler errors', async () => {
      const asyncErrorHandler = vi.fn(async () => {
        throw new Error('Async handler error');
      });

      signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, asyncErrorHandler);

      await signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { resourceId: 'resource-1' }
      });

      expect(asyncErrorHandler).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should work with logging enabled', async () => {
             const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
         // Mock implementation to suppress console output during testing
       });
      
      SignalBus.resetInstance();
      const loggingBus = SignalBus.getInstance({ enableLogging: true });

      const handler = vi.fn();
      loggingBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, handler);

      await loggingBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { resourceId: 'resource-1' }
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SignalBus] Emitting signal:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should limit history size', async () => {
      SignalBus.resetInstance();
      const limitedBus = SignalBus.getInstance({ maxHistorySize: 2 });

      const handler = vi.fn();
      limitedBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, handler);

      // Emit 3 signals
      for (let i = 0; i < 3; i++) {
        await limitedBus.emit({
          type: SIGNAL_TYPES.RESOURCE_MOUNTED,
          source: { panelId: 'panel-1', resourceId: `resource-${i}` },
          payload: { resourceId: `resource-${i}` }
        });
      }

      const history = limitedBus.getHistory();
      expect(history).toHaveLength(2); // Should be limited to 2
    });

    it('should work with metrics disabled', async () => {
      SignalBus.resetInstance();
      const noMetricsBus = SignalBus.getInstance({ enableMetrics: false });

      const handler = vi.fn();
      noMetricsBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, handler);

      await noMetricsBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { resourceId: 'resource-1' }
      });

      const metrics = noMetricsBus.getMetrics();
      expect(metrics.totalSignals).toBe(0); // Metrics disabled
    });
  });

  describe('Debug Information', () => {
    it('should provide debug information', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, handler1);
      signalBus.onPanel('panel-1', SIGNAL_TYPES.SHOW_PANEL, handler2);
      signalBus.onResource('resource-1', SIGNAL_TYPES.FOCUS_RESOURCE, handler2);

      const debugInfo = signalBus.getDebugInfo();
      
             expect(debugInfo).toMatchObject({
         globalHandlers: expect.any(Number),
         panelHandlers: expect.any(Number),
         resourceHandlers: expect.any(Number),
         middleware: expect.any(Number),
         validationRules: expect.any(Number)
       });

       expect(debugInfo.globalHandlers).toBeGreaterThan(0);
       expect(debugInfo.panelHandlers).toBeGreaterThan(0);
       expect(debugInfo.resourceHandlers).toBeGreaterThan(0);
    });
  });

  describe('History Management', () => {
    it('should clear history', async () => {
      const handler = vi.fn();
      signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_MOUNTED, handler);

      await signalBus.emit({
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: { panelId: 'panel-1', resourceId: 'resource-1' },
        payload: { resourceId: 'resource-1' }
      });

      expect(signalBus.getHistory()).toHaveLength(1);

      signalBus.clearHistory();

      expect(signalBus.getHistory()).toHaveLength(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup panel handlers', async () => {
      const handler = vi.fn();
      signalBus.onPanel('panel-1', SIGNAL_TYPES.SHOW_PANEL, handler);

      signalBus.cleanupPanel('panel-1');

      await signalBus.emit({
        type: SIGNAL_TYPES.SHOW_PANEL,
        source: { panelId: 'source-panel', resourceId: 'source-resource' },
        target: { panelId: 'panel-1' },
        payload: { panelId: 'panel-1' }
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should cleanup resource handlers', async () => {
      const handler = vi.fn();
      signalBus.onResource('resource-1', SIGNAL_TYPES.FOCUS_RESOURCE, handler);

      signalBus.cleanupResource('resource-1');

      await signalBus.emit({
        type: SIGNAL_TYPES.FOCUS_RESOURCE,
        source: { panelId: 'source-panel', resourceId: 'source-resource' },
        target: { resourceId: 'resource-1' },
        payload: { resourceId: 'resource-1' }
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Signal Routing Edge Cases', () => {
         it('should handle signals without targets', async () => {
       const globalHandler = vi.fn();
       const panelHandler = vi.fn();
       const resourceHandler = vi.fn();

       signalBus.onGlobal(SIGNAL_TYPES.SYSTEM_READY, globalHandler);
       signalBus.onPanel('panel-1', SIGNAL_TYPES.SYSTEM_READY, panelHandler);
       signalBus.onResource('resource-1', SIGNAL_TYPES.SYSTEM_READY, resourceHandler);

       await signalBus.emit({
         type: SIGNAL_TYPES.SYSTEM_READY,
         source: { panelId: 'source-panel', resourceId: 'source-resource' },
         payload: { timestamp: Date.now() }
         // No target - should go to global handlers at minimum
       });

       // Global handlers should always be called
       expect(globalHandler).toHaveBeenCalled();
       
       // Panel and resource handlers behavior depends on implementation
       // At minimum, global handlers should work
       expect(globalHandler).toHaveBeenCalledWith(
         expect.objectContaining({
           type: SIGNAL_TYPES.SYSTEM_READY,
           payload: expect.objectContaining({
             timestamp: expect.any(Number)
           })
         })
       );
     });

    it('should handle empty handler cleanup', () => {
      // Test cleanup when no handlers exist
      expect(() => signalBus.cleanupPanel('non-existent-panel')).not.toThrow();
      expect(() => signalBus.cleanupResource('non-existent-resource')).not.toThrow();
    });
  });
}); 