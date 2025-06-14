import { describe, it, expect } from 'vitest';
import {
  PanelId,
  ResourceId,
  SignalType,
  SignalSource,
  SignalTarget,
  Signal,
  SignalHandler,
  SignalUnsubscribe,
  SignalRoute,
  SignalFilter,
  SignalMiddleware,
  SignalValidationRule,
  SignalValidationResult,
  SignalBusConfig,
  SignalMetrics,
  SignalHistoryEntry
} from '../Signal';

describe('Signal Types', () => {
  describe('Basic Type Definitions', () => {
    it('should define PanelId as string', () => {
      const panelId: PanelId = 'test-panel';
      expect(typeof panelId).toBe('string');
    });

    it('should define ResourceId as string', () => {
      const resourceId: ResourceId = 'test-resource';
      expect(typeof resourceId).toBe('string');
    });

    it('should define SignalType as string', () => {
      const signalType: SignalType = 'test-signal';
      expect(typeof signalType).toBe('string');
    });
  });

  describe('SignalSource Interface', () => {
    it('should require both panelId and resourceId', () => {
      const source: SignalSource = {
        panelId: 'panel1',
        resourceId: 'resource1'
      };

      expect(source.panelId).toBe('panel1');
      expect(source.resourceId).toBe('resource1');
    });

    it('should validate SignalSource structure', () => {
      const source: SignalSource = {
        panelId: 'test-panel',
        resourceId: 'test-resource'
      };

      // TypeScript compilation ensures the interface is correctly implemented
      expect(source).toHaveProperty('panelId');
      expect(source).toHaveProperty('resourceId');
    });
  });

  describe('SignalTarget Interface', () => {
    it('should allow optional panelId and resourceId', () => {
      const target1: SignalTarget = {};
      const target2: SignalTarget = { panelId: 'panel1' };
      const target3: SignalTarget = { resourceId: 'resource1' };
      const target4: SignalTarget = { panelId: 'panel1', resourceId: 'resource1' };

      expect(target1).toEqual({});
      expect(target2.panelId).toBe('panel1');
      expect(target3.resourceId).toBe('resource1');
      expect(target4.panelId).toBe('panel1');
      expect(target4.resourceId).toBe('resource1');
    });
  });

  describe('Signal Interface', () => {
    it('should create a valid signal with required fields', () => {
      const signal: Signal = {
        type: 'test-signal',
        source: { panelId: 'panel1', resourceId: 'resource1' },
        payload: { data: 'test' }
      };

      expect(signal.type).toBe('test-signal');
      expect(signal.source.panelId).toBe('panel1');
      expect(signal.source.resourceId).toBe('resource1');
      expect(signal.payload).toEqual({ data: 'test' });
    });

    it('should allow optional fields', () => {
      const signal: Signal = {
        type: 'test-signal',
        source: { panelId: 'panel1', resourceId: 'resource1' },
        payload: { data: 'test' },
        target: { panelId: 'target-panel' },
        metadata: { custom: 'metadata' },
        timestamp: Date.now(),
        id: 'signal-id'
      };

      expect(signal.target?.panelId).toBe('target-panel');
      expect(signal.metadata?.custom).toBe('metadata');
      expect(signal.timestamp).toBeTypeOf('number');
      expect(signal.id).toBe('signal-id');
    });

    it('should support typed payloads', () => {
      interface TestPayload {
        message: string;
        count: number;
      }

      const signal: Signal<TestPayload> = {
        type: 'test-signal',
        source: { panelId: 'panel1', resourceId: 'resource1' },
        payload: { message: 'hello', count: 42 }
      };

      expect(signal.payload.message).toBe('hello');
      expect(signal.payload.count).toBe(42);
    });
  });

  describe('SignalHandler Type', () => {
    it('should accept sync handler function', () => {
      const handler: SignalHandler = (signal: Signal) => {
        // Sync handler
        expect(signal).toBeDefined();
      };

      const testSignal: Signal = {
        type: 'test',
        source: { panelId: 'panel1', resourceId: 'resource1' },
        payload: {}
      };

      const result = handler(testSignal);
      expect(result).toBeUndefined();
    });

    it('should accept async handler function', async () => {
      const handler: SignalHandler = async (signal: Signal) => {
        // Async handler
        await Promise.resolve();
        expect(signal).toBeDefined();
      };

      const testSignal: Signal = {
        type: 'test',
        source: { panelId: 'panel1', resourceId: 'resource1' },
        payload: {}
      };

      const result = handler(testSignal);
      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should accept typed handler function', () => {
      interface TestPayload {
        value: string;
      }

      const handler: SignalHandler<TestPayload> = (signal: Signal<TestPayload>) => {
        expect(signal.payload.value).toBeTypeOf('string');
      };

      const testSignal: Signal<TestPayload> = {
        type: 'test',
        source: { panelId: 'panel1', resourceId: 'resource1' },
        payload: { value: 'test' }
      };

      handler(testSignal);
    });
  });

  describe('SignalUnsubscribe Type', () => {
    it('should be a function that returns void', () => {
      const unsubscribe: SignalUnsubscribe = () => {
        // Cleanup logic
      };

      const result = unsubscribe();
      expect(result).toBeUndefined();
    });
  });

  describe('SignalRoute Interface', () => {
    it('should create valid signal route', () => {
      const route: SignalRoute = {
        type: 'test-signal',
        source: { panelId: 'panel1' },
        target: { resourceId: 'resource1' },
        priority: 10
      };

      expect(route.type).toBe('test-signal');
      expect(route.source?.panelId).toBe('panel1');
      expect(route.target?.resourceId).toBe('resource1');
      expect(route.priority).toBe(10);
    });

    it('should allow minimal route definition', () => {
      const route: SignalRoute = {
        type: 'test-signal'
      };

      expect(route.type).toBe('test-signal');
      expect(route.source).toBeUndefined();
      expect(route.target).toBeUndefined();
      expect(route.priority).toBeUndefined();
    });
  });

  describe('SignalFilter Interface', () => {
    it('should create valid signal filter', () => {
      const filter: SignalFilter = {
        types: ['type1', 'type2'],
        sources: [{ panelId: 'panel1' }],
        targets: [{ resourceId: 'resource1' }],
        predicate: (signal: Signal) => signal.type === 'test'
      };

      expect(filter.types).toEqual(['type1', 'type2']);
      expect(filter.sources?.[0].panelId).toBe('panel1');
      expect(filter.targets?.[0].resourceId).toBe('resource1');
      expect(filter.predicate).toBeTypeOf('function');
    });

    it('should allow empty filter', () => {
      const filter: SignalFilter = {};

      expect(filter.types).toBeUndefined();
      expect(filter.sources).toBeUndefined();
      expect(filter.targets).toBeUndefined();
      expect(filter.predicate).toBeUndefined();
    });
  });

  describe('SignalMiddleware Type', () => {
    it('should accept sync middleware function', () => {
      const middleware: SignalMiddleware = (signal: Signal, next: () => void) => {
        // Process signal
        expect(signal).toBeDefined();
        next();
      };

      const testSignal: Signal = {
        type: 'test',
        source: { panelId: 'panel1', resourceId: 'resource1' },
        payload: {}
      };

      const nextFn = () => {
        // Mock next function for testing
      };
      const result = middleware(testSignal, nextFn);
      expect(result).toBeUndefined();
    });

    it('should accept async middleware function', async () => {
      const middleware: SignalMiddleware = async (signal: Signal, next: () => Promise<void> | void) => {
        // Async process signal
        await Promise.resolve();
        const result = next();
        if (result instanceof Promise) {
          await result;
        }
      };

      const testSignal: Signal = {
        type: 'test',
        source: { panelId: 'panel1', resourceId: 'resource1' },
        payload: {}
      };

      const nextFn = async () => {
        // Mock async next function for testing
        await Promise.resolve();
      };
      const result = middleware(testSignal, nextFn);
      expect(result).toBeInstanceOf(Promise);
      await result;
    });
  });

  describe('SignalValidationRule Interface', () => {
    it('should create valid validation rule', () => {
      const rule: SignalValidationRule = {
        type: 'test-signal',
        validator: (payload: any) => typeof payload === 'object',
        errorMessage: 'Payload must be an object'
      };

      expect(rule.type).toBe('test-signal');
      expect(rule.validator({})).toBe(true);
      expect(rule.validator('string')).toBe(false);
      expect(rule.errorMessage).toBe('Payload must be an object');
    });

    it('should allow rule without error message', () => {
      const rule: SignalValidationRule = {
        type: 'test-signal',
        validator: (payload: any) => true
      };

      expect(rule.type).toBe('test-signal');
      expect(rule.validator({})).toBe(true);
      expect(rule.errorMessage).toBeUndefined();
    });
  });

  describe('SignalValidationResult Interface', () => {
    it('should create valid validation result', () => {
      const validResult: SignalValidationResult = {
        isValid: true,
        errors: []
      };

      const invalidResult: SignalValidationResult = {
        isValid: false,
        errors: ['Error 1', 'Error 2']
      };

      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toEqual([]);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toEqual(['Error 1', 'Error 2']);
    });
  });

  describe('SignalBusConfig Interface', () => {
    it('should create valid config with all options', () => {
      const config: SignalBusConfig = {
        enableLogging: true,
        enableMetrics: true,
        maxHistorySize: 100,
        middleware: [],
        validationRules: []
      };

      expect(config.enableLogging).toBe(true);
      expect(config.enableMetrics).toBe(true);
      expect(config.maxHistorySize).toBe(100);
      expect(Array.isArray(config.middleware)).toBe(true);
      expect(Array.isArray(config.validationRules)).toBe(true);
    });

    it('should allow empty config', () => {
      const config: SignalBusConfig = {};

      expect(config.enableLogging).toBeUndefined();
      expect(config.enableMetrics).toBeUndefined();
      expect(config.maxHistorySize).toBeUndefined();
      expect(config.middleware).toBeUndefined();
      expect(config.validationRules).toBeUndefined();
    });
  });

  describe('SignalMetrics Interface', () => {
    it('should create valid metrics', () => {
      const metrics: SignalMetrics = {
        totalSignals: 100,
        signalsByType: {
          'type1': 50,
          'type2': 30,
          'type3': 20
        },
        averageProcessingTime: 15.5,
        errorCount: 3
      };

      expect(metrics.totalSignals).toBe(100);
      expect(metrics.signalsByType['type1']).toBe(50);
      expect(metrics.averageProcessingTime).toBe(15.5);
      expect(metrics.errorCount).toBe(3);
    });
  });

  describe('SignalHistoryEntry Interface', () => {
    it('should create valid history entry', () => {
      const signal: Signal = {
        type: 'test',
        source: { panelId: 'panel1', resourceId: 'resource1' },
        payload: { data: 'test' }
      };

      const entry: SignalHistoryEntry = {
        signal,
        timestamp: Date.now(),
        processingTime: 10.5,
        success: true
      };

      expect(entry.signal).toBe(signal);
      expect(entry.timestamp).toBeTypeOf('number');
      expect(entry.processingTime).toBe(10.5);
      expect(entry.success).toBe(true);
      expect(entry.error).toBeUndefined();
    });

    it('should allow error in history entry', () => {
      const signal: Signal = {
        type: 'test',
        source: { panelId: 'panel1', resourceId: 'resource1' },
        payload: {}
      };

      const entry: SignalHistoryEntry = {
        signal,
        timestamp: Date.now(),
        processingTime: 5.0,
        success: false,
        error: 'Processing failed'
      };

      expect(entry.success).toBe(false);
      expect(entry.error).toBe('Processing failed');
    });
  });

  describe('Type Safety and Compatibility', () => {
    it('should maintain type safety across different payload types', () => {
      interface StringPayload {
        message: string;
      }

      interface NumberPayload {
        value: number;
      }

      const stringSignal: Signal<StringPayload> = {
        type: 'string-signal',
        source: { panelId: 'panel1', resourceId: 'resource1' },
        payload: { message: 'hello' }
      };

      const numberSignal: Signal<NumberPayload> = {
        type: 'number-signal',
        source: { panelId: 'panel1', resourceId: 'resource1' },
        payload: { value: 42 }
      };

      expect(stringSignal.payload.message).toBe('hello');
      expect(numberSignal.payload.value).toBe(42);
    });

    it('should allow signal type hierarchies', () => {
      // Base signal handler
      const baseHandler: SignalHandler = (signal: Signal) => {
        expect(signal.type).toBeTypeOf('string');
      };

      // Specific typed handler
      const typedHandler: SignalHandler<{ data: string }> = (signal) => {
        expect(signal.payload.data).toBeTypeOf('string');
      };

      const testSignal: Signal<{ data: string }> = {
        type: 'test',
        source: { panelId: 'panel1', resourceId: 'resource1' },
        payload: { data: 'test' }
      };

      // Both handlers should accept the signal
      baseHandler(testSignal);
      typedHandler(testSignal);
    });
  });
}); 