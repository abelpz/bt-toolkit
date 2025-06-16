import React from 'react';
import { 
  BaseMessageContent, 
  ResourceMessage, 
  MessageLifecycle,
  Resource,
  LinkedPanelsConfig 
} from '../types';

describe('Core Types', () => {
  describe('BaseMessageContent', () => {
    it('should allow valid message content with required type field', () => {
      const validMessage: BaseMessageContent = {
        type: 'test-message',
      };
      
      expect(validMessage.type).toBe('test-message');
    });

    it('should allow optional lifecycle properties', () => {
      const messageWithLifecycle: BaseMessageContent = {
        type: 'test-message',
        lifecycle: MessageLifecycle.STATE,
        stateKey: 'currentState',
        ttl: 5000,
      };
      
      expect(messageWithLifecycle.lifecycle).toBe('state');
      expect(messageWithLifecycle.stateKey).toBe('currentState');
      expect(messageWithLifecycle.ttl).toBe(5000);
    });

    it('should allow string literal lifecycle values', () => {
      const messageWithStringLifecycle: BaseMessageContent = {
        type: 'test-message',
        lifecycle: 'event',
      };
      
      expect(messageWithStringLifecycle.lifecycle).toBe('event');
    });
  });

  describe('ResourceMessage', () => {
    it('should create a valid resource message', () => {
      const content: BaseMessageContent = {
        type: 'test-message',
        lifecycle: 'event',
      };

      const message: ResourceMessage<typeof content> = {
        content,
        fromResourceId: 'resource-1',
        toResourceId: 'resource-2',
        id: 'msg-123',
        timestamp: Date.now(),
        consumed: false,
      };

      expect(message.content.type).toBe('test-message');
      expect(message.fromResourceId).toBe('resource-1');
      expect(message.toResourceId).toBe('resource-2');
      expect(message.id).toBe('msg-123');
      expect(typeof message.timestamp).toBe('number');
      expect(message.consumed).toBe(false);
    });

    it('should allow broadcast messages without toResourceId', () => {
      const content: BaseMessageContent = {
        type: 'broadcast-message',
      };

      const message: ResourceMessage<typeof content> = {
        content,
        fromResourceId: 'resource-1',
        id: 'msg-123',
        timestamp: Date.now(),
      };

      expect(message.toResourceId).toBeUndefined();
    });
  });

  describe('MessageLifecycle enum', () => {
    it('should have correct enum values', () => {
      expect(MessageLifecycle.STATE).toBe('state');
      expect(MessageLifecycle.EVENT).toBe('event');
      expect(MessageLifecycle.COMMAND).toBe('command');
    });
  });

  describe('Resource interface', () => {
    it('should create a valid resource with required fields', () => {
      const TestComponent = () => <div>Test Component</div>;
      const resource: Resource = {
        id: 'resource-1',
        component: <TestComponent />,
      };

      expect(resource.id).toBe('resource-1');
      expect(resource.component).toBeDefined();
    });

    it('should allow optional metadata fields', () => {
      const TestComponent = () => <div>Test Component</div>;
      const resource: Resource = {
        id: 'resource-1',
        component: <TestComponent />,
        title: 'Test Resource',
        description: 'A test resource',
        icon: '📝',
        category: 'test',
        metadata: { custom: 'data' },
      };

      expect(resource.title).toBe('Test Resource');
      expect(resource.description).toBe('A test resource');
      expect(resource.icon).toBe('📝');
      expect(resource.category).toBe('test');
      expect(resource.metadata?.custom).toBe('data');
    });
  });

  describe('LinkedPanelsConfig', () => {
    it('should create a valid configuration', () => {
      const TestComponent1 = () => <div>Resource 1</div>;
      const TestComponent2 = () => <div>Resource 2</div>;
      
      const config: LinkedPanelsConfig = {
        resources: [
          {
            id: 'resource-1',
            component: <TestComponent1 />,
            title: 'Resource 1',
          },
          {
            id: 'resource-2',
            component: <TestComponent2 />,
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

      expect(config.resources).toHaveLength(2);
      expect(config.panels['panel-1'].resourceIds).toEqual(['resource-1', 'resource-2']);
      expect(config.panels['panel-2'].resourceIds).toEqual(['resource-2']);
    });
  });
}); 