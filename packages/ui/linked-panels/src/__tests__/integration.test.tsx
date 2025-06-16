import React from 'react';
import { createLinkedPanelsStore } from '../core/store';
import { PluginRegistry } from '../plugins/base';
import { textMessagePlugin, createTextMessage, createChainedTextMessage } from '../plugins/built-in/text-message';
import { LinkedPanelsConfig, BaseMessageContent } from '../core/types';

// Custom test message for integration testing
interface CustomTestMessage extends BaseMessageContent {
  type: 'custom-test';
  payload: string;
  priority: number;
}

describe('LinkedPanels Integration Tests', () => {
  let store: ReturnType<typeof createLinkedPanelsStore>;
  let pluginRegistry: PluginRegistry;

  beforeEach(() => {
    pluginRegistry = new PluginRegistry();
    store = createLinkedPanelsStore({}, pluginRegistry);
  });

  describe('Complete System Integration', () => {
    it('should work end-to-end with plugins and messaging', () => {
      // Register the text message plugin
      pluginRegistry.register(textMessagePlugin);

      // Set up configuration
      const TestComponent1 = () => <div>Bible Text</div>;
      const TestComponent2 = () => <div>Translation Notes</div>;
      
      const config: LinkedPanelsConfig = {
        resources: [
          {
            id: 'bible-text',
            component: <TestComponent1 />,
            title: 'Bible Text',
            category: 'primary',
          },
          {
            id: 'translation-notes',
            component: <TestComponent2 />,
            title: 'Translation Notes',
            category: 'secondary',
          },
        ],
        panels: {
          'left-panel': {
            resourceIds: ['bible-text', 'translation-notes'],
          },
          'right-panel': {
            resourceIds: ['translation-notes'],
          },
        },
      };

      store.getState().setConfig(config);

      // Set active resources
      store.getState().setPanelResourceById('left-panel', 'bible-text');
      store.getState().setPanelResourceById('right-panel', 'translation-notes');

      // Send a text message between resources
      const textMessage = createTextMessage('Hello from Bible text!');
      const success = store.getState().sendMessage('bible-text', 'translation-notes', textMessage);

      expect(success).toBe(true);

      // Verify message was received
      const messages = store.getState().getMessages('translation-notes');
      expect(messages).toHaveLength(1);
      expect(messages[0].content.type).toBe('text');
      expect((messages[0].content as any).message).toBe('Hello from Bible text!');

      // Verify store state
      const state = store.getState();
      expect(state.resources.size).toBe(2);
      expect(state.getVisibleResourcesPerPanel()['left-panel']).toBe('bible-text');
      expect(state.getVisibleResourcesPerPanel()['right-panel']).toBe('translation-notes');
    });

    it('should handle plugin validation and rejection', () => {
      pluginRegistry.register(textMessagePlugin);

      const TestComponent = () => <div>Test Resource</div>;
      const config: LinkedPanelsConfig = {
        resources: [
          {
            id: 'resource-1',
            component: <TestComponent />,
            title: 'Resource 1',
          },
          {
            id: 'resource-2',
            component: <TestComponent />,
            title: 'Resource 2',
          },
        ],
        panels: {
          'panel-1': {
            resourceIds: ['resource-1', 'resource-2'],
          },
        },
      };

      store.getState().setConfig(config);

      // Try to send an invalid message (should be rejected by plugin validation)
      const invalidMessage = {
        type: 'text',
        // Missing required 'message' field
      };

      expect(() => {
        store.getState().sendMessage('resource-1', 'resource-2', invalidMessage as any);
      }).toThrow();

      // Verify no message was stored
      const messages = store.getState().getMessages('resource-2');
      expect(messages).toHaveLength(0);
    });

    it('should handle message lifecycle correctly', () => {
      pluginRegistry.register(textMessagePlugin);

      const TestComponent = () => <div>Test Resource</div>;
      const config: LinkedPanelsConfig = {
        resources: [
          {
            id: 'resource-1',
            component: <TestComponent />,
            title: 'Resource 1',
          },
          {
            id: 'resource-2',
            component: <TestComponent />,
            title: 'Resource 2',
          },
        ],
        panels: {
          'panel-1': {
            resourceIds: ['resource-1', 'resource-2'],
          },
        },
      };

      store.getState().setConfig(config);

      // Send a state message
      const stateMessage = createTextMessage('Current state');
      stateMessage.lifecycle = 'state';
      stateMessage.stateKey = 'current-text';

      store.getState().sendMessage('resource-1', 'resource-2', stateMessage);

      // Send another state message with same key (should supersede)
      const newStateMessage = createTextMessage('Updated state');
      newStateMessage.lifecycle = 'state';
      newStateMessage.stateKey = 'current-text';

      store.getState().sendMessage('resource-1', 'resource-2', newStateMessage);

      // Should only have the latest state message
      const messages = store.getState().getMessages('resource-2');
      expect(messages).toHaveLength(1);
      expect((messages[0].content as any).message).toBe('Updated state');
    });

    it('should handle chained messages correctly', () => {
      pluginRegistry.register(textMessagePlugin);

      const TestComponent = () => <div>Test Resource</div>;
      const config: LinkedPanelsConfig = {
        resources: [
          {
            id: 'resource-1',
            component: <TestComponent />,
            title: 'Resource 1',
          },
          {
            id: 'resource-2',
            component: <TestComponent />,
            title: 'Resource 2',
          },
          {
            id: 'resource-3',
            component: <TestComponent />,
            title: 'Resource 3',
          },
        ],
        panels: {
          'panel-1': {
            resourceIds: ['resource-1', 'resource-2', 'resource-3'],
          },
        },
      };

      store.getState().setConfig(config);

      // Send a chained message
      const chainedMessage = createChainedTextMessage('Chained message', 'resource-1', 1);
      store.getState().sendMessage('resource-1', 'resource-2', chainedMessage);

      // Forward the chain
      const forwardedMessage = createChainedTextMessage('Chained message', 'resource-1', 2);
      store.getState().sendMessage('resource-2', 'resource-3', forwardedMessage);

      // Verify messages
      const messages2 = store.getState().getMessages('resource-2');
      const messages3 = store.getState().getMessages('resource-3');

      expect(messages2).toHaveLength(1);
      expect(messages3).toHaveLength(1);
      expect((messages2[0].content as any).hopCount).toBe(1);
      expect((messages3[0].content as any).hopCount).toBe(2);
    });
  });

  describe('Panel Navigation Integration', () => {
    beforeEach(() => {
      const TestComponent = () => <div>Test Resource</div>;
      const config: LinkedPanelsConfig = {
        resources: [
          {
            id: 'bible-text',
            component: <TestComponent />,
            title: 'Bible Text',
          },
          {
            id: 'translation-notes',
            component: <TestComponent />,
            title: 'Translation Notes',
          },
          {
            id: 'translation-words',
            component: <TestComponent />,
            title: 'Translation Words',
          },
        ],
        panels: {
          'main-panel': {
            resourceIds: ['bible-text', 'translation-notes', 'translation-words'],
          },
        },
      };

      store.getState().setConfig(config);
    });

    it('should navigate through resources correctly', () => {
      // Initially at index 0
      expect(store.getState().panelNavigation['main-panel'].currentIndex).toBe(0);

      // Navigate to next resource
      store.getState().nextResource('main-panel');
      expect(store.getState().panelNavigation['main-panel'].currentIndex).toBe(1);

      // Navigate to next resource again
      store.getState().nextResource('main-panel');
      expect(store.getState().panelNavigation['main-panel'].currentIndex).toBe(2);

      // Try to navigate beyond last resource (should stay at last)
      store.getState().nextResource('main-panel');
      expect(store.getState().panelNavigation['main-panel'].currentIndex).toBe(2);

      // Navigate back
      store.getState().previousResource('main-panel');
      expect(store.getState().panelNavigation['main-panel'].currentIndex).toBe(1);

      // Set specific resource by ID
      const success = store.getState().setPanelResourceById('main-panel', 'bible-text');
      expect(success).toBe(true);
      expect(store.getState().panelNavigation['main-panel'].currentIndex).toBe(0);
    });

    it('should get correct visible resources', () => {
      const state = store.getState();

      // Set different resources for different positions
      state.setCurrentResource('main-panel', 1);

      const visibleResources = state.getVisibleResourcesPerPanel();
      expect(visibleResources['main-panel']).toBe('translation-notes');

      // Change to different resource
      state.setCurrentResource('main-panel', 2);
      const updatedVisibleResources = state.getVisibleResourcesPerPanel();
      expect(updatedVisibleResources['main-panel']).toBe('translation-words');
    });
  });

  describe('Resource Management Integration', () => {
    beforeEach(() => {
      const TestComponent = () => <div>Test Resource</div>;
      const config: LinkedPanelsConfig = {
        resources: [
          {
            id: 'primary-1',
            component: <TestComponent />,
            title: 'Primary Resource 1',
            category: 'primary',
            description: 'First primary resource',
          },
          {
            id: 'primary-2',
            component: <TestComponent />,
            title: 'Primary Resource 2',
            category: 'primary',
            description: 'Second primary resource',
          },
          {
            id: 'secondary-1',
            component: <TestComponent />,
            title: 'Secondary Resource 1',
            category: 'secondary',
            description: 'First secondary resource',
          },
        ],
        panels: {
          'left-panel': {
            resourceIds: ['primary-1', 'secondary-1'],
          },
          'right-panel': {
            resourceIds: ['primary-2', 'secondary-1'],
          },
        },
      };

      store.getState().setConfig(config);
    });

    it('should categorize resources correctly', () => {
      const resourcesByCategory = store.getState().getResourcesByCategory();

      expect(resourcesByCategory['primary']).toHaveLength(2);
      expect(resourcesByCategory['secondary']).toHaveLength(1);

      expect(resourcesByCategory['primary'][0].id).toBe('primary-1');
      expect(resourcesByCategory['primary'][1].id).toBe('primary-2');
      expect(resourcesByCategory['secondary'][0].id).toBe('secondary-1');
    });

    it('should get panel resource mappings correctly', () => {
      const mapping = store.getState().getPanelResourceMapping();

      expect(mapping['left-panel']).toEqual(['primary-1', 'secondary-1']);
      expect(mapping['right-panel']).toEqual(['primary-2', 'secondary-1']);
    });

    it('should find resource panels correctly', () => {
      const state = store.getState();

      expect(state.getResourcePanel('primary-1')).toBe('left-panel');
      expect(state.getResourcePanel('primary-2')).toBe('right-panel');
      expect(state.getResourcePanel('secondary-1')).toBe('left-panel'); // Returns first panel found
    });

    it('should get resource info correctly', () => {
      const resourceInfo = store.getState().getResourceInfo('primary-1');

      expect(resourceInfo).toEqual({
        id: 'primary-1',
        title: 'Primary Resource 1',
        description: 'First primary resource',
        icon: '',
        category: 'primary',
        metadata: undefined,
      });
    });

    it('should get resources info in panel correctly', () => {
      const leftPanelResources = store.getState().getResourcesInfoInPanel('left-panel');

      expect(leftPanelResources).toHaveLength(2);
      expect(leftPanelResources[0].id).toBe('primary-1');
      expect(leftPanelResources[1].id).toBe('secondary-1');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle missing resources gracefully', () => {
      const TestComponent = () => <div>Test Resource</div>;
      const config: LinkedPanelsConfig = {
        resources: [
          {
            id: 'existing-resource',
            component: <TestComponent />,
            title: 'Existing Resource',
          },
        ],
        panels: {
          'test-panel': {
            resourceIds: ['existing-resource'],
          },
        },
      };

      store.getState().setConfig(config);

      // Try to send message from non-existent resource
      const textMessage = createTextMessage('Test message');
      const success = store.getState().sendMessage('non-existent', 'existing-resource', textMessage);

      expect(success).toBe(false);
    });

    it('should handle invalid panel operations gracefully', () => {
      const state = store.getState();

      // Try operations on non-existent panel
      expect(state.setPanelResourceById('non-existent-panel', 'any-resource')).toBe(false);
      expect(state.getResourcesInPanel('non-existent-panel')).toEqual([]);
      expect(state.getResourcesInfoInPanel('non-existent-panel')).toEqual([]);

      // Try to navigate non-existent panel (should not throw)
      expect(() => {
        state.nextResource('non-existent-panel');
        state.previousResource('non-existent-panel');
        state.setCurrentResource('non-existent-panel', 0);
      }).not.toThrow();
    });

    it('should handle plugin errors gracefully', () => {
      // Register plugin that will cause validation errors
      pluginRegistry.register(textMessagePlugin);

      const TestComponent = () => <div>Test Resource</div>;
      const config: LinkedPanelsConfig = {
        resources: [
          {
            id: 'resource-1',
            component: <TestComponent />,
            title: 'Resource 1',
          },
          {
            id: 'resource-2',
            component: <TestComponent />,
            title: 'Resource 2',
          },
        ],
        panels: {
          'test-panel': {
            resourceIds: ['resource-1', 'resource-2'],
          },
        },
      };

      store.getState().setConfig(config);

      // This should work fine with valid message
      const validMessage = createTextMessage('Valid message');
      const success = store.getState().sendMessage('resource-1', 'resource-2', validMessage);
      expect(success).toBe(true);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large numbers of messages efficiently', () => {
      pluginRegistry.register(textMessagePlugin);

      const TestComponent = () => <div>Test Resource</div>;
      const config: LinkedPanelsConfig = {
        resources: [
          {
            id: 'sender',
            component: <TestComponent />,
            title: 'Sender',
          },
          {
            id: 'receiver',
            component: <TestComponent />,
            title: 'Receiver',
          },
        ],
        panels: {
          'test-panel': {
            resourceIds: ['sender', 'receiver'],
          },
        },
      };

      store.getState().setConfig(config);

      // Send many messages
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        const message = createTextMessage(`Message ${i}`);
        store.getState().sendMessage('sender', 'receiver', message);
      }
      const endTime = Date.now();

      // Should complete quickly (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);

      // Verify all messages were received
      const messages = store.getState().getMessages('receiver');
      expect(messages).toHaveLength(100);
    });

    it('should handle TTL expiration correctly', async () => {
      pluginRegistry.register(textMessagePlugin);

      const TestComponent = () => <div>Test Resource</div>;
      const config: LinkedPanelsConfig = {
        resources: [
          {
            id: 'sender',
            component: <TestComponent />,
            title: 'Sender',
          },
          {
            id: 'receiver',
            component: <TestComponent />,
            title: 'Receiver',
          },
        ],
        panels: {
          'test-panel': {
            resourceIds: ['sender', 'receiver'],
          },
        },
      };

      store.getState().setConfig(config);

      // Send a message with short TTL
      const shortTTLMessage = createTextMessage('Short TTL message');
      shortTTLMessage.ttl = 50; // 50ms TTL
      store.getState().sendMessage('sender', 'receiver', shortTTLMessage);

      // Initially should have the message
      let messages = store.getState().getMessages('receiver');
      expect(messages).toHaveLength(1);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      // Message should be expired/filtered out
      messages = store.getState().getMessages('receiver');
      expect(messages).toHaveLength(0);
    });
  });
}); 