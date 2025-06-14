import { describe, it, expect } from 'vitest';
import { SIGNAL_TYPES } from '../signals/SignalTypes';
import { CleanupReason, HighlightingKey } from '../types/Cleanup';
import { ResourceLifecyclePhase } from '../types/Resource';
import type { Signal, PanelId, ResourceId } from '../types/Signal';

import type { ResourceState } from '../types/ResourceState';

describe('Panel System Types', () => {
  describe('Signal Types', () => {
    it('should create valid signals', () => {
      const signal: Signal = {
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: {
          panelId: 'test-panel',
          resourceId: 'test-resource'
        },
        payload: {
          resourceId: 'test-resource',
          resourceType: 'test-type',
          panelId: 'test-panel'
        }
      };

      expect(signal.type).toBe('resource_mounted');
      expect(signal.source.panelId).toBe('test-panel');
      expect(signal.source.resourceId).toBe('test-resource');
    });

    it('should support typed payloads', () => {
      interface TestPayload {
        message: string;
        count: number;
      }

      const signal: Signal<TestPayload> = {
        type: 'test-signal',
        source: {
          panelId: 'panel-1',
          resourceId: 'resource-1'
        },
        payload: {
          message: 'hello',
          count: 42
        }
      };

      expect(signal.payload.message).toBe('hello');
      expect(signal.payload.count).toBe(42);
    });
  });

  describe('Cleanup Types', () => {
    it('should define cleanup reasons', () => {
      expect(CleanupReason.UNMOUNTED).toBe('unmounted');
      expect(CleanupReason.HIDDEN).toBe('hidden');
      expect(CleanupReason.PANEL_SWITCHED).toBe('panel_switched');
      expect(CleanupReason.ERROR).toBe('error');
      expect(CleanupReason.MANUAL).toBe('manual');
    });

    it('should define highlighting keys', () => {
      expect(HighlightingKey.TRANSLATION_NOTES).toBe('translation_notes');
      expect(HighlightingKey.WORD_CLICK).toBe('word_click');
      expect(HighlightingKey.ALIGNMENT).toBe('alignment');
      expect(HighlightingKey.CUSTOM).toBe('custom');
    });
  });

  describe('Resource Types', () => {
    it('should define resource state', () => {
      const state: ResourceState = {
        isVisible: true,
        isFocused: false,
        isHighlighted: false,
        isLoading: false,
        hasError: false
      };

      expect(state.isVisible).toBe(true);
      expect(state.isFocused).toBe(false);
      expect(state.isHighlighted).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.hasError).toBe(false);
    });

    it('should define lifecycle phases', () => {
      expect(ResourceLifecyclePhase.CREATED).toBe('created');
      expect(ResourceLifecyclePhase.MOUNTING).toBe('mounting');
      expect(ResourceLifecyclePhase.MOUNTED).toBe('mounted');
      expect(ResourceLifecyclePhase.UPDATING).toBe('updating');
      expect(ResourceLifecyclePhase.UNMOUNTING).toBe('unmounting');
      expect(ResourceLifecyclePhase.UNMOUNTED).toBe('unmounted');
      expect(ResourceLifecyclePhase.ERROR).toBe('error');
    });
  });

  describe('Signal Constants', () => {
    it('should have all required signal types', () => {
      expect(SIGNAL_TYPES.RESOURCE_MOUNTED).toBe('resource_mounted');
      expect(SIGNAL_TYPES.RESOURCE_DISMISSED).toBe('resource_dismissed');
      expect(SIGNAL_TYPES.SET_HIGHLIGHTING).toBe('set_highlighting');
      expect(SIGNAL_TYPES.CLEAR_HIGHLIGHTING).toBe('clear_highlighting');
      expect(SIGNAL_TYPES.WORD_CLICKED).toBe('word_clicked');
      expect(SIGNAL_TYPES.SHOW_PANEL).toBe('show_panel');
      expect(SIGNAL_TYPES.HIDE_PANEL).toBe('hide_panel');
    });

    it('should have unique signal type values', () => {
      const values = Object.values(SIGNAL_TYPES);
      const uniqueValues = new Set(values);
      expect(values.length).toBe(uniqueValues.size);
    });
  });

  describe('Type Safety', () => {
    it('should enforce string types for IDs', () => {
      const panelId: PanelId = 'test-panel';
      const resourceId: ResourceId = 'test-resource';

      expect(typeof panelId).toBe('string');
      expect(typeof resourceId).toBe('string');
    });

    it('should create signals with proper typing', () => {
      const signal: Signal = {
        type: SIGNAL_TYPES.RESOURCE_MOUNTED,
        source: {
          panelId: 'panel-1',
          resourceId: 'resource-1'
        },
        payload: {
          resourceId: 'resource-1',
          resourceType: 'test-type',
          panelId: 'panel-1'
        },
        timestamp: Date.now(),
        id: 'signal-123'
      };

      expect(signal).toBeDefined();
      expect(signal.type).toBe('resource_mounted');
      expect(typeof signal.timestamp).toBe('number');
      expect(signal.id).toBe('signal-123');
    });
  });
}); 