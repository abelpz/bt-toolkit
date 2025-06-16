import { MessagingSystem } from '../messaging';
import { BaseMessageContent, ResourceMessage, MessageLifecycle } from '../types';

// Test message types
interface TestEventMessage extends BaseMessageContent {
  type: 'test-event';
  lifecycle: 'event';
  data: string;
}

interface TestStateMessage extends BaseMessageContent {
  type: 'test-state';
  lifecycle: 'state';
  stateKey: string;
  value: number;
}

interface TestCommandMessage extends BaseMessageContent {
  type: 'test-command';
  lifecycle: 'command';
  action: string;
}

describe('MessagingSystem', () => {
  let messaging: MessagingSystem;

  beforeEach(() => {
    messaging = new MessagingSystem();
  });

  describe('Message Sending and Receiving', () => {
    it('should send and receive event messages', () => {
      const eventMessage: TestEventMessage = {
        type: 'test-event',
        lifecycle: 'event',
        data: 'test data',
      };

      messaging.sendMessage(eventMessage, 'resource-2', 'resource-1');

      const messages = messaging.getMessages('resource-1');
      expect(messages).toHaveLength(1);
      expect((messages[0].content as TestEventMessage).data).toBe('test data');
      expect(messages[0].fromResourceId).toBe('resource-2');
      expect(messages[0].toResourceId).toBe('resource-1');
    });

    it('should handle broadcast messages', () => {
      const broadcastMessage: TestEventMessage = {
        type: 'test-event',
        lifecycle: 'event',
        data: 'broadcast data',
      };

      // Send broadcast message (no toResourceId)
      messaging.sendMessage(broadcastMessage, 'broadcaster');

      const resource1Messages = messaging.getMessages('resource-1');
      const resource2Messages = messaging.getMessages('resource-2');

      expect(resource1Messages).toHaveLength(1);
      expect(resource2Messages).toHaveLength(1);
      expect((resource1Messages[0].content as TestEventMessage).data).toBe('broadcast data');
      expect((resource2Messages[0].content as TestEventMessage).data).toBe('broadcast data');
    });

    it('should not deliver messages to wrong resources', () => {
      const eventMessage: TestEventMessage = {
        type: 'test-event',
        lifecycle: 'event',
        data: 'test data',
      };

      messaging.sendMessage(eventMessage, 'resource-2', 'resource-1');

      const resource3Messages = messaging.getMessages('resource-3');
      expect(resource3Messages).toHaveLength(0);
    });
  });

  describe('State Message Handling', () => {
    it('should handle state messages with state keys', () => {
      const stateMessage: TestStateMessage = {
        type: 'test-state',
        lifecycle: 'state',
        stateKey: 'counter',
        value: 42,
      };

      messaging.sendMessage(stateMessage, 'resource-2', 'resource-1');

      const messages = messaging.getMessages('resource-1');
      expect(messages).toHaveLength(1);
      expect((messages[0].content as TestStateMessage).stateKey).toBe('counter');
      expect((messages[0].content as TestStateMessage).value).toBe(42);
    });

    it('should supersede previous state messages with same state key', () => {
      // Send first state message
      const stateMessage1: TestStateMessage = {
        type: 'test-state',
        lifecycle: 'state',
        stateKey: 'counter',
        value: 1,
      };

      messaging.sendMessage(stateMessage1, 'resource-2', 'resource-1');

      // Send second state message with same key
      const stateMessage2: TestStateMessage = {
        type: 'test-state',
        lifecycle: 'state',
        stateKey: 'counter',
        value: 2,
      };

      messaging.sendMessage(stateMessage2, 'resource-2', 'resource-1');

      const messages = messaging.getMessages('resource-1');
      // Should only have the latest state message
      expect(messages).toHaveLength(1);
      expect((messages[0].content as TestStateMessage).value).toBe(2);
    });

    it('should get current state for a specific key', () => {
      const stateMessage: TestStateMessage = {
        type: 'test-state',
        lifecycle: 'state',
        stateKey: 'counter',
        value: 42,
      };

      messaging.sendMessage(stateMessage, 'resource-2', 'resource-1');

      const currentState = messaging.getCurrentState<TestStateMessage>('resource-1', 'counter');
      expect(currentState).not.toBeNull();
      expect(currentState!.content.value).toBe(42);
    });

    it('should clear state for a specific key', () => {
      const stateMessage: TestStateMessage = {
        type: 'test-state',
        lifecycle: 'state',
        stateKey: 'counter',
        value: 42,
      };

      messaging.sendMessage(stateMessage, 'resource-2', 'resource-1');

      let currentState = messaging.getCurrentState<TestStateMessage>('resource-1', 'counter');
      expect(currentState).not.toBeNull();

      messaging.clearState('resource-1', 'counter');

      currentState = messaging.getCurrentState<TestStateMessage>('resource-1', 'counter');
      expect(currentState).toBeNull();
    });
  });

  describe('Message Lifecycle Management', () => {
    it('should handle TTL expiration for messages', async () => {
      const shortTtlMessage: BaseMessageContent = {
        type: 'test-message',
        lifecycle: 'event',
        ttl: 50, // 50ms TTL
      };

      messaging.sendMessage(shortTtlMessage, 'resource-2', 'resource-1');

      // Message should be available immediately
      let messages = messaging.getMessages('resource-1');
      expect(messages).toHaveLength(1);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 100));
      
      messages = messaging.getMessages('resource-1');
      // Message should be expired and not returned
      expect(messages).toHaveLength(0);
    });

    it('should mark event messages as consumed', () => {
      const eventMessage: TestEventMessage = {
        type: 'test-event',
        lifecycle: 'event',
        data: 'test data',
      };

      messaging.sendMessage(eventMessage, 'resource-2', 'resource-1');

      let messages = messaging.getMessages('resource-1');
      expect(messages).toHaveLength(1);

      const messageId = messages[0].id;
      messaging.consumeEvent(messageId);

      // After consuming, the event should not be returned
      messages = messaging.getMessages('resource-1');
      expect(messages).toHaveLength(0);
    });

    it('should mark command messages as consumed', () => {
      const commandMessage: TestCommandMessage = {
        type: 'test-command',
        lifecycle: 'command',
        action: 'test-action',
      };

      messaging.sendMessage(commandMessage, 'resource-2', 'resource-1');

      let messages = messaging.getMessages('resource-1');
      expect(messages).toHaveLength(1);

      const messageId = messages[0].id;
      messaging.consumeCommand(messageId);

      // After consuming, the command should not be returned
      messages = messaging.getMessages('resource-1');
      expect(messages).toHaveLength(0);
    });
  });

  describe('Message Cleanup', () => {
    it('should clear messages for a specific resource', () => {
      const eventMessage: TestEventMessage = {
        type: 'test-event',
        lifecycle: 'event',
        data: 'test data',
      };

      messaging.sendMessage(eventMessage, 'resource-2', 'resource-1');

      let messages = messaging.getMessages('resource-1');
      expect(messages).toHaveLength(1);

      messaging.clearMessages('resource-1');

      messages = messaging.getMessages('resource-1');
      expect(messages).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid message types gracefully when no plugin registry', () => {
      const invalidMessage: BaseMessageContent = {
        type: 'invalid-message-type',
        lifecycle: 'event',
      };

      // Should not throw when no plugin registry is provided
      expect(() => {
        messaging.sendMessage(invalidMessage, 'resource-1', 'resource-2');
      }).not.toThrow();
    });

    it('should handle state messages without stateKey', () => {
      const invalidStateMessage: BaseMessageContent = {
        type: 'test-state',
        lifecycle: 'state',
        // Missing stateKey
      };

      // Should not throw but should warn
      const originalWarn = console.warn;
      const warnCalls: any[] = [];
      console.warn = (...args: any[]) => warnCalls.push(args);
      
      messaging.sendMessage(invalidStateMessage, 'resource-1', 'resource-2');
      
      expect(warnCalls).toHaveLength(1);
      expect(warnCalls[0]).toEqual(['State message missing stateKey:', 'test-state']);
      
      console.warn = originalWarn;
    });
  });

  describe('Message Ordering', () => {
    it('should return messages in reverse chronological order', async () => {
      const message1: TestEventMessage = {
        type: 'test-event',
        lifecycle: 'event',
        data: 'first message',
      };

      const message2: TestEventMessage = {
        type: 'test-event',
        lifecycle: 'event',
        data: 'second message',
      };

      messaging.sendMessage(message1, 'resource-2', 'resource-1');
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      
      messaging.sendMessage(message2, 'resource-2', 'resource-1');
      
      const messages = messaging.getMessages('resource-1');
      expect(messages).toHaveLength(2);
      
      // Should be in reverse chronological order (newest first)
      expect((messages[0].content as TestEventMessage).data).toBe('second message');
      expect((messages[1].content as TestEventMessage).data).toBe('first message');
    });
  });
}); 