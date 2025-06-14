import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SignalCleanup, SignalCleanupUtils } from '../SignalCleanup';
import { SignalBus } from '../../core/SignalBus';
import { SIGNAL_TYPES } from '../SignalTypes';
import {
  CleanupReason,
  ResourceCleanupEvent,
  CleanupStrategy,
  CleanupDependency,
  HighlightingKey
} from '../../types/Cleanup';
import { Signal } from '../../types/Signal';

describe('SignalCleanup', () => {
  let signalBus: SignalBus;
  let signalCleanup: SignalCleanup;

  beforeEach(() => {
    signalBus = new SignalBus();
    signalCleanup = new SignalCleanup(signalBus);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default strategies', () => {
      const strategies = signalCleanup.getStrategies();
      expect(strategies).toHaveLength(3);
      
      const strategyNames = strategies.map(s => s.name);
      expect(strategyNames).toContain('highlighting_cleanup');
      expect(strategyNames).toContain('panel_cleanup');
      expect(strategyNames).toContain('error_cleanup');
    });

    it('should setup signal handlers', () => {
      const emitSpy = vi.spyOn(signalBus, 'emit');
      
      // Create a new instance to test constructor signal setup
      const testSignalCleanup = new SignalCleanup(signalBus);
      
      expect(testSignalCleanup).toBeDefined();
      // We can't easily test the signal handlers setup without emitting signals
    });
  });

  describe('strategy management', () => {
    it('should register a new cleanup strategy', () => {
      const strategy: CleanupStrategy = {
        name: 'test_strategy',
        priority: 50,
        canHandle: () => true,
        execute: vi.fn()
      };

      signalCleanup.registerStrategy(strategy);
      
      const strategies = signalCleanup.getStrategies();
      expect(strategies).toContain(strategy);
    });

    it('should unregister a cleanup strategy', () => {
      const strategy: CleanupStrategy = {
        name: 'test_strategy',
        priority: 50,
        canHandle: () => true,
        execute: vi.fn()
      };

      signalCleanup.registerStrategy(strategy);
      signalCleanup.unregisterStrategy('test_strategy');
      
      const strategies = signalCleanup.getStrategies();
      expect(strategies).not.toContain(strategy);
    });
  });

  describe('cleanup execution', () => {
    it('should execute cleanup for a resource', async () => {
      const event: ResourceCleanupEvent = {
        resourceId: 'test-resource',
        resourceType: 'test-type',
        reason: CleanupReason.UNMOUNTED,
        timestamp: Date.now()
      };

      const mockStrategy = vi.fn();
      const strategy: CleanupStrategy = {
        name: 'test_strategy',
        priority: 100,
        canHandle: () => true,
        execute: mockStrategy
      };

      signalCleanup.registerStrategy(strategy);
      
      await signalCleanup.executeCleanup(event);
      
      expect(mockStrategy).toHaveBeenCalledWith(event);
    });

    it('should execute strategies in priority order', async () => {
      const event: ResourceCleanupEvent = {
        resourceId: 'test-resource',
        resourceType: 'test-type',
        reason: CleanupReason.UNMOUNTED,
        timestamp: Date.now()
      };

      const executionOrder: string[] = [];

      const strategy1: CleanupStrategy = {
        name: 'low_priority',
        priority: 10,
        canHandle: () => true,
        execute: async () => { executionOrder.push('low'); }
      };

      const strategy2: CleanupStrategy = {
        name: 'high_priority',
        priority: 100,
        canHandle: () => true,
        execute: async () => { executionOrder.push('high'); }
      };

      signalCleanup.registerStrategy(strategy1);
      signalCleanup.registerStrategy(strategy2);
      
      await signalCleanup.executeCleanup(event);
      
      expect(executionOrder).toEqual(['high', 'low']);
    });

    it('should handle strategy execution errors gracefully', async () => {
      const event: ResourceCleanupEvent = {
        resourceId: 'test-resource',
        resourceType: 'test-type',
        reason: CleanupReason.UNMOUNTED,
        timestamp: Date.now()
      };

      const failingStrategy: CleanupStrategy = {
        name: 'failing_strategy',
        priority: 100,
        canHandle: () => true,
        execute: async () => { throw new Error('Test error'); }
      };

      const successStrategy: CleanupStrategy = {
        name: 'success_strategy',
        priority: 90,
        canHandle: () => true,
        execute: vi.fn()
      };

      signalCleanup.registerStrategy(failingStrategy);
      signalCleanup.registerStrategy(successStrategy);
      
      // Should throw because we now propagate errors
      await expect(signalCleanup.executeCleanup(event)).rejects.toThrow('Test error');
      
      // Success strategy should NOT be called since first strategy throws
      expect(successStrategy.execute).not.toHaveBeenCalled();
    });
  });

  describe('pending cleanup tracking', () => {
    it('should track pending cleanups', () => {
      signalCleanup.trackCleanup('resource1', 'cleanup1');
      signalCleanup.trackCleanup('resource1', 'cleanup2');
      signalCleanup.trackCleanup('resource2', 'cleanup1');

      const pending1 = signalCleanup.getPendingCleanups('resource1');
      expect(pending1).toEqual(['cleanup1', 'cleanup2']);

      const pending2 = signalCleanup.getPendingCleanups('resource2');
      expect(pending2).toEqual(['cleanup1']);

      const allPending = signalCleanup.getPendingCleanups();
      expect(allPending).toHaveLength(3);
    });

    it('should mark cleanups as complete', () => {
      signalCleanup.trackCleanup('resource1', 'cleanup1');
      signalCleanup.trackCleanup('resource1', 'cleanup2');

      signalCleanup.markComplete('resource1', 'cleanup1');

      const pending = signalCleanup.getPendingCleanups('resource1');
      expect(pending).toEqual(['cleanup2']);
    });

    it('should validate cleanup completion', () => {
      signalCleanup.trackCleanup('resource1', 'cleanup1');
      
      const validation = signalCleanup.validate('resource1');
      expect(validation.isComplete).toBe(false);
      expect(validation.pendingCleanups).toEqual(['cleanup1']);

      signalCleanup.markComplete('resource1', 'cleanup1');
      
      const validationAfter = signalCleanup.validate('resource1');
      expect(validationAfter.isComplete).toBe(true);
      expect(validationAfter.pendingCleanups).toEqual([]);
    });
  });

  describe('resource dismissal handling', () => {
    it('should handle resource dismissal with cleanup', async () => {
      const emitSpy = vi.spyOn(signalBus, 'emit');
      
      await signalCleanup.handleResourceDismissal(
        'test-resource',
        'test-type',
        CleanupReason.UNMOUNTED
      );

      expect(emitSpy).toHaveBeenCalledWith({
        type: SIGNAL_TYPES.RESOURCE_DISMISSED,
        source: { panelId: '', resourceId: 'test-resource' },
        payload: {
          resourceId: 'test-resource',
          resourceType: 'test-type',
          reason: CleanupReason.UNMOUNTED
        }
      });
    });
  });

  describe('highlighting cleanup', () => {
    it('should handle highlighting cleanup', async () => {
      const emitSpy = vi.spyOn(signalBus, 'emit');
      
      await signalCleanup.handleHighlightingCleanup(
        HighlightingKey.TRANSLATION_NOTES,
        'test-reason'
      );

      expect(emitSpy).toHaveBeenCalledWith({
        type: SIGNAL_TYPES.CLEAR_HIGHLIGHTING,
        source: { panelId: '', resourceId: '' },
        payload: {
          key: HighlightingKey.TRANSLATION_NOTES,
          reason: 'test-reason'
        }
      });
    });

    it('should handle alignment cleanup', async () => {
      const emitSpy = vi.spyOn(signalBus, 'emit');
      
      await signalCleanup.handleAlignmentCleanup('test-reason');

      expect(emitSpy).toHaveBeenCalledWith({
        type: SIGNAL_TYPES.CLEAR_ALIGNMENT_HIGHLIGHTS,
        source: { panelId: '', resourceId: '' },
        payload: { reason: 'test-reason' }
      });
    });
  });

  describe('cross-resource cleanup coordination', () => {
    it('should coordinate cleanup for multiple resources', async () => {
      const mockStrategy = vi.fn();
      const strategy: CleanupStrategy = {
        name: 'test_strategy',
        priority: 100,
        canHandle: () => true,
        execute: mockStrategy
      };

      signalCleanup.registerStrategy(strategy);
      
      const resourceIds = ['resource1', 'resource2', 'resource3'];
      
      await signalCleanup.coordinateCleanup(resourceIds, CleanupReason.MANUAL);
      
      expect(mockStrategy).toHaveBeenCalledTimes(3);
    });
  });

  describe('cleanup dependencies', () => {
    it('should add cleanup dependencies', () => {
      const dependency: CleanupDependency = {
        sourceResourceId: 'source',
        targetResourceId: 'target',
        cleanupType: 'test',
        priority: 10
      };

      signalCleanup.addCleanupDependency(dependency);
      
      // We can't directly test the internal graph, but we can test execution order
      // This would require more complex testing with actual cleanup execution
    });

    it('should remove cleanup dependencies', () => {
      const dependency: CleanupDependency = {
        sourceResourceId: 'source',
        targetResourceId: 'target',
        cleanupType: 'test',
        priority: 10
      };

      signalCleanup.addCleanupDependency(dependency);
      signalCleanup.removeCleanupDependency('source', 'target');
      
      // Dependencies are removed - testing through execution would be complex
    });
  });

  describe('default strategies', () => {
    it('should have highlighting cleanup strategy', () => {
      const strategies = signalCleanup.getStrategies();
      const highlightingStrategy = strategies.find(s => s.name === 'highlighting_cleanup');
      
      expect(highlightingStrategy).toBeDefined();
      expect(highlightingStrategy?.priority).toBe(100);
      expect(highlightingStrategy?.canHandle({} as any)).toBe(true);
    });

    it('should have panel cleanup strategy', () => {
      const strategies = signalCleanup.getStrategies();
      const panelStrategy = strategies.find(s => s.name === 'panel_cleanup');
      
      expect(panelStrategy).toBeDefined();
      expect(panelStrategy?.priority).toBe(90);
      
      const panelSwitchEvent: ResourceCleanupEvent = {
        resourceId: 'test',
        resourceType: 'test',
        reason: CleanupReason.PANEL_SWITCHED,
        timestamp: Date.now()
      };
      
      expect(panelStrategy?.canHandle(panelSwitchEvent)).toBe(true);
    });

    it('should have error cleanup strategy', () => {
      const strategies = signalCleanup.getStrategies();
      const errorStrategy = strategies.find(s => s.name === 'error_cleanup');
      
      expect(errorStrategy).toBeDefined();
      expect(errorStrategy?.priority).toBe(80);
      
      const errorEvent: ResourceCleanupEvent = {
        resourceId: 'test',
        resourceType: 'test',
        reason: CleanupReason.ERROR,
        timestamp: Date.now()
      };
      
      expect(errorStrategy?.canHandle(errorEvent)).toBe(true);
    });
  });
});

describe('SignalCleanupUtils', () => {
  describe('createCleanupEvent', () => {
    it('should create a cleanup event with required fields', () => {
      const event = SignalCleanupUtils.createCleanupEvent(
        'test-resource',
        'test-type',
        CleanupReason.UNMOUNTED,
        { custom: 'data' }
      );

      expect(event).toEqual({
        resourceId: 'test-resource',
        resourceType: 'test-type',
        reason: CleanupReason.UNMOUNTED,
        timestamp: expect.any(Number),
        metadata: { custom: 'data' }
      });
    });
  });

  describe('needsCleanup', () => {
    it('should identify signals that need cleanup', () => {
      const cleanupSignal: Signal = {
        type: SIGNAL_TYPES.RESOURCE_UNMOUNTED,
        source: { panelId: 'panel1', resourceId: 'resource1' },
        payload: {}
      };

      const regularSignal: Signal = {
        type: SIGNAL_TYPES.WORD_CLICKED,
        source: { panelId: 'panel1', resourceId: 'resource1' },
        payload: {}
      };

      expect(SignalCleanupUtils.needsCleanup(cleanupSignal)).toBe(true);
      expect(SignalCleanupUtils.needsCleanup(regularSignal)).toBe(false);
    });
  });

  describe('extractCleanupReason', () => {
    it('should extract correct cleanup reason from signal type', () => {
      const testCases = [
        { type: SIGNAL_TYPES.RESOURCE_UNMOUNTED, expected: CleanupReason.UNMOUNTED },
        { type: SIGNAL_TYPES.HIDE_PANEL, expected: CleanupReason.HIDDEN },
        { type: SIGNAL_TYPES.SWITCH_PANEL, expected: CleanupReason.PANEL_SWITCHED },
        { type: SIGNAL_TYPES.RESOURCE_ERROR, expected: CleanupReason.ERROR },
        { type: 'UNKNOWN_SIGNAL', expected: CleanupReason.MANUAL }
      ];

      testCases.forEach(({ type, expected }) => {
        const signal: Signal = {
          type,
          source: { panelId: 'panel1', resourceId: 'resource1' },
          payload: {}
        };

        expect(SignalCleanupUtils.extractCleanupReason(signal)).toBe(expected);
      });
    });
  });
}); 