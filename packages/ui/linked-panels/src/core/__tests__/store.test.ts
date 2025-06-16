import React from 'react';
import { createLinkedPanelsStore } from '../store';
import { BaseMessageContent, LinkedPanelsConfig } from '../types';

// Test message types
interface TestMessage extends BaseMessageContent {
  type: 'test-message';
  data: string;
}

describe('LinkedPanelsStore', () => {
  let store: ReturnType<typeof createLinkedPanelsStore>;

  beforeEach(() => {
    // Create a fresh store for each test
    store = createLinkedPanelsStore();
  });

  describe('Configuration Management', () => {
    it('should initialize with empty configuration', () => {
      const state = store.getState();
      
      expect(state.resources.size).toBe(0);
      expect(Object.keys(state.panelConfig)).toHaveLength(0);
    });

    it('should set configuration', () => {
      const TestComponent1 = () => React.createElement('div', null, 'Resource 1');
      const TestComponent2 = () => React.createElement('div', null, 'Resource 2');
      
      const config: LinkedPanelsConfig = {
        resources: [
          {
            id: 'resource-1',
            component: React.createElement(TestComponent1),
            title: 'Resource 1',
          },
          {
            id: 'resource-2',
            component: React.createElement(TestComponent2),
            title: 'Resource 2',
          },
        ],
        panels: {
          'panel-1': {
            resourceIds: ['resource-1', 'resource-2'],
          },
          'panel-2': {
            resourceIds: ['resource-2'],
          },
        },
      };

      store.getState().setConfig(config);

      const state = store.getState();
      expect(state.resources.size).toBe(2);
      expect(state.resources.has('resource-1')).toBe(true);
      expect(state.resources.has('resource-2')).toBe(true);
      expect(state.panelConfig['panel-1'].resourceIds).toEqual(['resource-1', 'resource-2']);
    });
  });

  describe('Panel Management', () => {
    beforeEach(() => {
      const TestComponent = () => React.createElement('div', null, 'Test Resource');
      const config: LinkedPanelsConfig = {
        resources: [
          {
            id: 'resource-1',
            component: React.createElement(TestComponent),
            title: 'Resource 1',
          },
          {
            id: 'resource-2',
            component: React.createElement(TestComponent),
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
    });

    it('should set current resource by index', () => {
      store.getState().setCurrentResource('panel-1', 1);

      const state = store.getState();
      expect(state.panelNavigation['panel-1'].currentIndex).toBe(1);
    });

    it('should navigate to next resource', () => {
      store.getState().setCurrentResource('panel-1', 0);
      store.getState().nextResource('panel-1');

      const state = store.getState();
      expect(state.panelNavigation['panel-1'].currentIndex).toBe(1);
    });

    it('should navigate to previous resource', () => {
      store.getState().setCurrentResource('panel-1', 1);
      store.getState().previousResource('panel-1');

      const state = store.getState();
      expect(state.panelNavigation['panel-1'].currentIndex).toBe(0);
    });

    it('should set panel resource by id', () => {
      const success = store.getState().setPanelResourceById('panel-1', 'resource-2');

      expect(success).toBe(true);
      const state = store.getState();
      expect(state.panelNavigation['panel-1'].currentIndex).toBe(1);
    });

    it('should handle invalid resource id gracefully', () => {
      const success = store.getState().setPanelResourceById('panel-1', 'invalid-resource');

      expect(success).toBe(false);
    });

    it('should handle invalid panel id gracefully', () => {
      const success = store.getState().setPanelResourceById('invalid-panel', 'resource-1');

      expect(success).toBe(false);
    });
  });

  describe('Message Management', () => {
    beforeEach(() => {
      const TestComponent = () => React.createElement('div', null, 'Test Resource');
      const config: LinkedPanelsConfig = {
        resources: [
          {
            id: 'resource-1',
            component: React.createElement(TestComponent),
            title: 'Resource 1',
          },
          {
            id: 'resource-2',
            component: React.createElement(TestComponent),
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
    });

    it('should send messages between resources', () => {
      const testMessage: TestMessage = {
        type: 'test-message',
        data: 'test data',
      };

      const success = store.getState().sendMessage('resource-1', 'resource-2', testMessage);

      expect(success).toBe(true);
      const messages = store.getState().getMessages('resource-2');
      expect(messages).toHaveLength(1);
      expect((messages[0].content as TestMessage).data).toBe('test data');
    });

    it('should get messages for a resource', () => {
      const testMessage: TestMessage = {
        type: 'test-message',
        data: 'test data',
      };

      store.getState().sendMessage('resource-1', 'resource-2', testMessage);

      const messages = store.getState().getMessages('resource-2');
      expect(messages).toHaveLength(1);
      expect(messages[0].fromResourceId).toBe('resource-1');
      expect(messages[0].toResourceId).toBe('resource-2');
    });

    it('should clear messages for a resource', () => {
      const testMessage: TestMessage = {
        type: 'test-message',
        data: 'test data',
      };

      store.getState().sendMessage('resource-1', 'resource-2', testMessage);

      let messages = store.getState().getMessages('resource-2');
      expect(messages).toHaveLength(1);

      store.getState().clearMessages('resource-2');

      messages = store.getState().getMessages('resource-2');
      expect(messages).toHaveLength(0);
    });

    it('should handle invalid sender resource', () => {
      const testMessage: TestMessage = {
        type: 'test-message',
        data: 'test data',
      };

      const success = store.getState().sendMessage('invalid-resource', 'resource-2', testMessage);

      expect(success).toBe(false);
    });

    it('should handle invalid receiver resource', () => {
      const testMessage: TestMessage = {
        type: 'test-message',
        data: 'test data',
      };

      const success = store.getState().sendMessage('resource-1', 'invalid-resource', testMessage);

      expect(success).toBe(false);
    });
  });

  describe('Resource Utilities', () => {
    beforeEach(() => {
      const TestComponent = () => React.createElement('div', null, 'Test Resource');
      const config: LinkedPanelsConfig = {
        resources: [
          {
            id: 'resource-1',
            component: React.createElement(TestComponent),
            title: 'Resource 1',
            category: 'primary',
          },
          {
            id: 'resource-2',
            component: React.createElement(TestComponent),
            title: 'Resource 2',
            category: 'secondary',
          },
        ],
        panels: {
          'panel-1': {
            resourceIds: ['resource-1', 'resource-2'],
          },
        },
      };

      store.getState().setConfig(config);
    });

    it('should get all resource ids', () => {
      const resourceIds = store.getState().getAllResourceIds();
      expect(resourceIds).toHaveLength(2);
      expect(resourceIds).toContain('resource-1');
      expect(resourceIds).toContain('resource-2');
    });

    it('should get resource panel', () => {
      const panelId = store.getState().getResourcePanel('resource-1');
      expect(panelId).toBe('panel-1');
    });

    it('should return null for resource not in any panel', () => {
      // Add a resource not in any panel by creating a new config
      const TestComponent = () => React.createElement('div', null, 'Orphan Resource');
      const newConfig: LinkedPanelsConfig = {
        resources: [
          {
            id: 'primary-1',
            component: React.createElement(TestComponent),
            title: 'Primary Resource 1',
            category: 'primary',
          },
          {
            id: 'primary-2',
            component: React.createElement(TestComponent),
            title: 'Primary Resource 2',
            category: 'secondary',
          },
          {
            id: 'orphan-resource',
            component: React.createElement(TestComponent),
            title: 'Orphan Resource',
          },
        ],
        panels: {
          'panel-1': {
            resourceIds: ['primary-1', 'primary-2'],
          },
        },
      };
      
      store.getState().setConfig(newConfig);

      const panelId = store.getState().getResourcePanel('orphan-resource');
      expect(panelId).toBeNull();
    });

    it('should get visible resources per panel', () => {
      store.getState().setCurrentResource('panel-1', 1);

      const visibleResources = store.getState().getVisibleResourcesPerPanel();
      expect(visibleResources['panel-1']).toBe('resource-2');
    });

    it('should get all panels', () => {
      const panels = store.getState().getAllPanels();
      expect(panels).toEqual(['panel-1']);
    });

    it('should get resources in panel', () => {
      const resources = store.getState().getResourcesInPanel('panel-1');
      expect(resources).toEqual(['resource-1', 'resource-2']);
    });

    it('should get panel resource mapping', () => {
      const mapping = store.getState().getPanelResourceMapping();
      expect(mapping).toEqual({
        'panel-1': ['resource-1', 'resource-2'],
      });
    });

    it('should get resource info', () => {
      const resourceInfo = store.getState().getResourceInfo('resource-1');
      expect(resourceInfo).toEqual({
        id: 'resource-1',
        title: 'Resource 1',
        description: '',
        icon: '',
        category: 'primary',
        metadata: undefined,
      });
    });

    it('should return null for invalid resource info', () => {
      const resourceInfo = store.getState().getResourceInfo('invalid-resource');
      expect(resourceInfo).toBeNull();
    });

    it('should get resources info in panel', () => {
      const resourcesInfo = store.getState().getResourcesInfoInPanel('panel-1');
      expect(resourcesInfo).toHaveLength(2);
      expect(resourcesInfo[0].id).toBe('resource-1');
      expect(resourcesInfo[1].id).toBe('resource-2');
    });

    it('should get resources by category', () => {
      const resourcesByCategory = store.getState().getResourcesByCategory();
      expect(resourcesByCategory['primary']).toHaveLength(1);
      expect(resourcesByCategory['secondary']).toHaveLength(1);
      expect(resourcesByCategory['primary'][0].id).toBe('resource-1');
      expect(resourcesByCategory['secondary'][0].id).toBe('resource-2');
    });
  });
}); 