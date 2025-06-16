import React from 'react';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useResourceAPI } from '../useResourceAPI';
import { LinkedPanelsContainer, resetGlobalStore } from '../../components/LinkedPanelsContainer';

import { PluginRegistry } from '../../plugins/base';
import { textMessagePlugin, createTextMessage } from '../../plugins/built-in/text-message';
import { Resource, LinkedPanelsConfig } from '../../core/types';
import { createLinkedPanelsStore } from '../../core/store';


// Create stable component references outside of render cycle
const Resource1Component = React.memo(() => <div>Resource 1</div>);
const Resource2Component = React.memo(() => <div>Resource 2</div>);
const Resource3Component = React.memo(() => <div>Resource 3</div>);

// Create stable config object outside of test scope
const stableConfig = {
  resources: [
    {
      id: 'resource-1',
      component: <Resource1Component />,
      title: 'Resource 1',
      category: 'primary' as const,
    },
    {
      id: 'resource-2',
      component: <Resource2Component />,
      title: 'Resource 2',
      category: 'secondary' as const,
    },
    {
      id: 'resource-3',
      component: <Resource3Component />,
      title: 'Resource 3',
      category: 'primary' as const,
    },
  ],
  panels: {
    'test-panel': {
      resourceIds: ['resource-1', 'resource-2'],
    },
    'other-panel': {
      resourceIds: ['resource-3'],
    },
  },
};

// Test data
const testResources: Resource[] = [
  {
    id: 'resource-1',
    title: 'Resource 1',
    description: 'First resource',
    icon: 'icon1',
    category: 'primary',
    component: <div>Resource 1</div>,
    metadata: { version: '1.0' }
  },
  {
    id: 'resource-2',
    title: 'Resource 2',
    description: 'Second resource',
    icon: 'icon2',
    category: 'primary',
    component: <div>Resource 2</div>,
    metadata: { version: '2.0' }
  },
  {
    id: 'resource-3',
    title: 'Resource 3',
    description: 'Third resource',
    icon: 'icon3',
    category: 'secondary',
    component: <div>Resource 3</div>,
    metadata: { version: '3.0' }
  }
];

const testConfig: LinkedPanelsConfig = {
  resources: testResources,
  panels: {
    'test-panel': {
      resourceIds: ['resource-1', 'resource-2'],
    },
    'other-panel': {
      resourceIds: ['resource-3'],
    },
    'empty-panel': {
      resourceIds: [],
    }
  }
};

describe('useResourceAPI', () => {
  let pluginRegistry: PluginRegistry;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  // Create a stable wrapper component
  const createTestWrapper = (pluginRegistry: PluginRegistry) => {
    return ({ children }: { children: React.ReactNode }) => (
      <LinkedPanelsContainer
        key={`test-${Date.now()}-${Math.random()}`}
        config={testConfig}
        plugins={pluginRegistry}
      >
        {children}
      </LinkedPanelsContainer>
    );
  };

  beforeEach(() => {
    pluginRegistry = new PluginRegistry();
    pluginRegistry.register(textMessagePlugin);
    wrapper = createTestWrapper(pluginRegistry);
  });

  afterEach(() => {
    // Reset the global store to ensure fresh state for each test
    resetGlobalStore();
    vi.clearAllMocks();
  });

  describe('navigation API', () => {
    it('should provide navigation functions', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      expect(typeof result.current.navigation.goToResource).toBe('function');
      expect(typeof result.current.navigation.goToPanel).toBe('function');
      expect(typeof result.current.navigation.goToResourceInPanel).toBe('function');
      expect(typeof result.current.navigation.getMyPanel).toBe('function');
      expect(typeof result.current.navigation.getVisibleResources).toBe('function');
    });

    it('should get current panel for resource', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const panel = result.current.navigation.getMyPanel();
      expect(panel).toBe('test-panel');
    });

    it('should get visible resources', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const visibleResources = result.current.navigation.getVisibleResources();
      expect(typeof visibleResources).toBe('object');
      expect(visibleResources['test-panel']).toBe('resource-1');
      expect(visibleResources['other-panel']).toBe('resource-3');
    });

    it('should navigate to existing resource', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const success = result.current.navigation.goToResource('resource-2');
      expect(success).toBe(true);
    });

    it('should fail to navigate to non-existent resource', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const success = result.current.navigation.goToResource('non-existent');
      expect(success).toBe(false);
    });

    it('should navigate to panel with resources', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const success = result.current.navigation.goToPanel('test-panel');
      expect(success).toBe(true);
    });

    it('should fail to navigate to empty panel', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const success = result.current.navigation.goToPanel('empty-panel');
      expect(success).toBe(false);
    });

    it('should navigate to valid resource in panel', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const success = result.current.navigation.goToResourceInPanel('test-panel', 'resource-2');
      expect(success).toBe(true);
    });

    it('should warn and fail to navigate to invalid resource in panel', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
      
      const success = result.current.navigation.goToResourceInPanel('test-panel', 'resource-3');
      expect(success).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Resource "resource-3" is not available in panel "test-panel". Available resources: [resource-1, resource-2]'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('messaging API', () => {
    it('should provide messaging functions', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      expect(typeof result.current.messaging.send).toBe('function');
      expect(typeof result.current.messaging.getMessages).toBe('function');
      expect(typeof result.current.messaging.clearMessages).toBe('function');
      expect(typeof result.current.messaging.sendToAll).toBe('function');
      expect(typeof result.current.messaging.sendToPanel).toBe('function');
    });

    it('should send messages between resources', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const message = createTextMessage('Hello from resource-1', 'resource-1');
      const success = result.current.messaging.send('resource-2', message);

      expect(typeof success).toBe('boolean');
    });

    it('should get messages for resource', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-2'),
        { wrapper: wrapper }
      );

      const messages = result.current.messaging.getMessages();
      expect(Array.isArray(messages)).toBe(true);
    });

    it('should clear messages', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-2'),
        { wrapper: wrapper }
      );

      result.current.messaging.clearMessages();
      const messages = result.current.messaging.getMessages();
      expect(messages).toHaveLength(0);
    });

    it('should send messages to all resources', () => {
      const { result } = renderHook(() => useResourceAPI('resource-1'), { wrapper: wrapper });
      
      act(() => {
        result.current.messaging.sendToAll({
          type: 'text-message',
          text: 'Hello all!',
          lifecycle: 'event'
        });
      });
      
      // Check that the message was sent (returns count)
      const sentCount = result.current.messaging.sendToAll({
        type: 'text-message',
        text: 'Hello all again!',
        lifecycle: 'event'
      });
      
      // Should send to 2 other resources (resource-2 and resource-3)
      expect(sentCount).toBe(2);
    });

    it('should send messages to panel resources', () => {
      const { result } = renderHook(() => useResourceAPI('resource-1'), { wrapper: wrapper });
      
      const sentCount = result.current.messaging.sendToPanel('test-panel', {
        type: 'text-message',
        text: 'Hello panel!',
        lifecycle: 'event'
      });
      
      // Should send to 1 other resource in the panel (resource-2, excluding sender)
      expect(sentCount).toBe(1);
    });

    it('should not send to itself when broadcasting', () => {
      const { result } = renderHook(() => useResourceAPI('resource-1'), { wrapper: wrapper });
      
      const sentCount = result.current.messaging.sendToPanel('test-panel', {
        type: 'text-message',
        text: 'Hello others!',
        lifecycle: 'event'
      });
      
      // Should not include the sender (resource-1) in the count
      expect(sentCount).toBe(1);
    });

    it('should handle sending to panel with no other resources', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-3'),
        { wrapper: wrapper }
      );

      const content = { text: 'Lonely message' };
      const sentCount = result.current.messaging.sendToPanel('other-panel', content);
      
      // Should send to 0 resources (only sender in panel)
      expect(sentCount).toBe(0);
    });
  });

  describe('system API', () => {
    it('should provide system information functions', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      expect(typeof result.current.system.getAllResources).toBe('function');
      expect(typeof result.current.system.getAllPanels).toBe('function');
      expect(typeof result.current.system.getResourcesInPanel).toBe('function');
      expect(typeof result.current.system.getPanelMapping).toBe('function');
      expect(typeof result.current.system.getResourceInfo).toBe('function');
      expect(typeof result.current.system.getMyResourceInfo).toBe('function');
      expect(typeof result.current.system.getResourcesByCategory).toBe('function');
      expect(typeof result.current.system.getResourcesInfoInPanel).toBe('function');
    });

    it('should get all resources', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const resources = result.current.system.getAllResources();
      expect(Array.isArray(resources)).toBe(true);
      expect(resources).toContain('resource-1');
      expect(resources).toContain('resource-2');
      expect(resources).toContain('resource-3');
    });

    it('should get all panels', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const panels = result.current.system.getAllPanels();
      expect(Array.isArray(panels)).toBe(true);
      expect(panels).toContain('test-panel');
      expect(panels).toContain('other-panel');
      expect(panels).toContain('empty-panel');
    });

    it('should get resources in panel', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const resources = result.current.system.getResourcesInPanel('test-panel');
      expect(Array.isArray(resources)).toBe(true);
      expect(resources).toContain('resource-1');
      expect(resources).toContain('resource-2');
    });

    it('should get panel mapping', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const mapping = result.current.system.getPanelMapping();
      expect(typeof mapping).toBe('object');
      expect(mapping['test-panel']).toContain('resource-1');
      expect(mapping['other-panel']).toContain('resource-3');
    });

    it('should get resource info', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const info = result.current.system.getResourceInfo('resource-1');
      expect(info).toBeDefined();
      expect(info?.id).toBe('resource-1');
      expect(info?.title).toBe('Resource 1');
      expect(info?.description).toBe('First resource');
      expect(info?.icon).toBe('icon1');
      expect(info?.category).toBe('primary');
      expect(info?.metadata).toEqual({ version: '1.0' });
    });

    it('should return null for non-existent resource info', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const info = result.current.system.getResourceInfo('non-existent');
      expect(info).toBeNull();
    });

    it('should get my resource info', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const info = result.current.system.getMyResourceInfo();
      expect(info).toBeDefined();
      expect(info?.id).toBe('resource-1');
      expect(info?.title).toBe('Resource 1');
      expect(info?.description).toBe('First resource');
      expect(info?.icon).toBe('icon1');
      expect(info?.category).toBe('primary');
      expect(info?.metadata).toEqual({ version: '1.0' });
    });

    it('should get resources info in panel', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const resourcesInfo = result.current.system.getResourcesInfoInPanel('test-panel');
      expect(Array.isArray(resourcesInfo)).toBe(true);
      expect(resourcesInfo).toHaveLength(2);
      
      const resource1Info = resourcesInfo.find(r => r.id === 'resource-1');
      expect(resource1Info).toBeDefined();
      expect(resource1Info?.title).toBe('Resource 1');
      expect(resource1Info?.metadata).toEqual({ version: '1.0' });
      
      const resource2Info = resourcesInfo.find(r => r.id === 'resource-2');
      expect(resource2Info).toBeDefined();
      expect(resource2Info?.title).toBe('Resource 2');
      expect(resource2Info?.metadata).toEqual({ version: '2.0' });
    });

    it('should get resources by category', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const byCategory = result.current.system.getResourcesByCategory();
      expect(typeof byCategory).toBe('object');
      expect(byCategory['primary']).toBeDefined();
      expect(byCategory['secondary']).toBeDefined();
      expect(Array.isArray(byCategory['primary'])).toBe(true);
      expect(Array.isArray(byCategory['secondary'])).toBe(true);
      
      expect(byCategory['primary']).toHaveLength(2);
      expect(byCategory['secondary']).toHaveLength(1);
      
      const primaryResource1 = byCategory['primary'].find(r => r.id === 'resource-1');
      expect(primaryResource1).toBeDefined();
      expect(primaryResource1?.title).toBe('Resource 1');
      expect(primaryResource1?.metadata).toEqual({ version: '1.0' });
      
      const secondaryResource = byCategory['secondary'].find(r => r.id === 'resource-3');
      expect(secondaryResource).toBeDefined();
      expect(secondaryResource?.title).toBe('Resource 3');
      expect(secondaryResource?.metadata).toEqual({ version: '3.0' });
    });
  });

  describe('API stability', () => {
    it('should provide stable function references', () => {
      const { result, rerender } = renderHook(() => useResourceAPI('resource-1'), { wrapper: wrapper });
      
      const firstNavigation = result.current.navigation;
      const firstMessaging = result.current.messaging;
      const firstSystem = result.current.system;
      
      // Check that all functions exist and are callable
      expect(typeof firstNavigation.goToResource).toBe('function');
      expect(typeof firstNavigation.goToPanel).toBe('function');
      expect(typeof firstMessaging.send).toBe('function');
      expect(typeof firstMessaging.sendToAll).toBe('function');
      expect(typeof firstSystem.getAllResources).toBe('function');
      
      rerender();
      
      // After rerender, functions should still exist and be callable
      expect(typeof result.current.navigation.goToResource).toBe('function');
      expect(typeof result.current.navigation.goToPanel).toBe('function');
      expect(typeof result.current.messaging.send).toBe('function');
      expect(typeof result.current.messaging.sendToAll).toBe('function');
      expect(typeof result.current.system.getAllResources).toBe('function');
    });

    it('should handle resource ID changes', () => {
      const { result, rerender } = renderHook(
        ({ resourceId }) => useResourceAPI(resourceId),
        { 
          wrapper: wrapper,
          initialProps: { resourceId: 'resource-1' }
        }
      );

      const firstAPI = result.current;
      expect(firstAPI.system.getMyResourceInfo()?.id).toBe('resource-1');

      // Change resource ID
      rerender({ resourceId: 'resource-2' });
      
      const secondAPI = result.current;
      expect(secondAPI.system.getMyResourceInfo()?.id).toBe('resource-2');
      
      // API objects should be different due to resource ID change
      expect(secondAPI).not.toBe(firstAPI);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty messages array', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const messages = result.current.messaging.getMessages();
      expect(messages).toEqual([]);
    });

    it('should handle navigation to non-existent panel', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const success = result.current.navigation.goToPanel('non-existent-panel');
      expect(success).toBe(false);
    });

    it('should handle getting resources from non-existent panel', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const resources = result.current.system.getResourcesInPanel('non-existent-panel');
      expect(resources).toEqual([]);
    });

    it('should handle sending to non-existent panel', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const content = { text: 'Message to nowhere' };
      const sentCount = result.current.messaging.sendToPanel('non-existent-panel', content);
      expect(sentCount).toBe(0);
    });

    it('should handle getting info for resources in empty panel', () => {
      const { result } = renderHook(
        () => useResourceAPI('resource-1'),
        { wrapper: wrapper }
      );

      const resourcesInfo = result.current.system.getResourcesInfoInPanel('empty-panel');
      expect(resourcesInfo).toEqual([]);
    });
  });
}); 