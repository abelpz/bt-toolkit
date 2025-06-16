import { vi } from 'vitest';
import { PluginRegistry, MessageTypePlugin } from '../base';
import { BaseMessageContent, ResourceMessage } from '../../core/types';

// Test message types
interface TestMessage extends BaseMessageContent {
  type: 'test-message';
  data: string;
}

interface AnotherTestMessage extends BaseMessageContent {
  type: 'another-test-message';
  value: number;
}

// Test message registry
type TestMessageRegistry = {
  'test-message': TestMessage;
  'another-test-message': AnotherTestMessage;
};

// Test plugin implementation
const createTestPlugin = (): MessageTypePlugin<TestMessageRegistry> => ({
  name: 'test-plugin',
  version: '1.0.0',
  messageTypes: {} as TestMessageRegistry,
  
  validators: {
    'test-message': (content: any): content is TestMessage => {
      return typeof content === 'object' && 
             content !== null && 
             content.type === 'test-message' && 
             typeof content.data === 'string';
    },
    'another-test-message': (content: any): content is AnotherTestMessage => {
      return typeof content === 'object' && 
             content !== null && 
             content.type === 'another-test-message' && 
             typeof content.value === 'number';
    },
  },
  
  handlers: {
    'test-message': vi.fn(),
    'another-test-message': vi.fn(),
  },

  onInstall: () => {
    // Plugin initialization logic
  },

  onUninstall: () => {
    // Plugin cleanup logic
  },
});

describe('PluginRegistry', () => {
  let registry: PluginRegistry;
  let testPlugin: MessageTypePlugin<TestMessageRegistry>;

  beforeEach(() => {
    registry = new PluginRegistry();
    testPlugin = createTestPlugin();
  });

  describe('Plugin Registration', () => {
    it('should register a plugin successfully', () => {
      registry.register(testPlugin);
      
      expect(registry.getAll()).toContain(testPlugin);
    });

    it('should prevent duplicate plugin registration', () => {
      registry.register(testPlugin);
      
      // Mock console.warn to check for warning
      const originalWarn = console.warn;
      const warnCalls: any[] = [];
      console.warn = (...args: any[]) => warnCalls.push(args);
      
      registry.register(testPlugin);
      
      expect(warnCalls).toHaveLength(1);
      expect(warnCalls[0][0]).toContain('already registered');
      expect(registry.getAll()).toHaveLength(1);
      
      console.warn = originalWarn;
    });

    it('should prevent plugins with same name', () => {
      const duplicatePlugin = createTestPlugin();
      
      registry.register(testPlugin);
      
      const originalWarn = console.warn;
      const warnCalls: any[] = [];
      console.warn = (...args: any[]) => warnCalls.push(args);
      
      registry.register(duplicatePlugin);
      
      expect(warnCalls).toHaveLength(1);
      expect(registry.getAll()).toHaveLength(1);
      
      console.warn = originalWarn;
    });

    it('should unregister a plugin successfully', () => {
      registry.register(testPlugin);
      expect(registry.getAll()).toHaveLength(1);
      
      const success = registry.unregister('test-plugin');
      
      expect(success).toBe(true);
      expect(registry.getAll()).toHaveLength(0);
    });

    it('should handle unregistering non-existent plugin', () => {
      const success = registry.unregister('non-existent-plugin');
      
      expect(success).toBe(false);
    });
  });

  describe('Message Type Management', () => {
    beforeEach(() => {
      registry.register(testPlugin);
    });

    it('should validate registered message types', () => {
      const validMessage: TestMessage = {
        type: 'test-message',
        data: 'test data',
      };

      const isValid = registry.validateMessage('test-message', validMessage);
      expect(isValid).toBe(true);
    });

    it('should reject invalid message content', () => {
      const invalidMessage = {
        type: 'test-message',
        data: 123, // Should be string
      };

      const isValid = registry.validateMessage('test-message', invalidMessage);
      expect(isValid).toBe(false);
    });

    it('should reject unregistered message types', () => {
      const message = {
        type: 'unregistered-message',
        data: 'test data',
      };

      const isValid = registry.validateMessage('unregistered-message', message);
      expect(isValid).toBe(false);
    });

    it('should handle message with wrong type field', () => {
      const messageWithWrongType = {
        type: 'another-test-message',
        data: 'test data', // Should have 'value' field for another-test-message
      };

      const isValid = registry.validateMessage('test-message', messageWithWrongType);
      expect(isValid).toBe(false);
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      registry.register(testPlugin);
    });

    it('should handle messages with registered handlers', () => {
      const testMessage: TestMessage = {
        type: 'test-message',
        data: 'test data',
      };

      const resourceMessage: ResourceMessage<TestMessage> = {
        content: testMessage,
        fromResourceId: 'resource-1',
        toResourceId: 'resource-2',
        id: 'msg-123',
        timestamp: Date.now(),
        consumed: false,
      };

      registry.handleMessage(resourceMessage);

      expect(testPlugin.handlers?.['test-message']).toHaveBeenCalledWith(resourceMessage);
    });

    it('should handle multiple message types', () => {
      const testMessage: TestMessage = {
        type: 'test-message',
        data: 'test data',
      };

      const anotherMessage: AnotherTestMessage = {
        type: 'another-test-message',
        value: 42,
      };

      const resourceMessage1: ResourceMessage<TestMessage> = {
        content: testMessage,
        fromResourceId: 'resource-1',
        toResourceId: 'resource-2',
        id: 'msg-123',
        timestamp: Date.now(),
        consumed: false,
      };

      const resourceMessage2: ResourceMessage<AnotherTestMessage> = {
        content: anotherMessage,
        fromResourceId: 'resource-1',
        toResourceId: 'resource-2',
        id: 'msg-124',
        timestamp: Date.now(),
        consumed: false,
      };

      registry.handleMessage(resourceMessage1);
      registry.handleMessage(resourceMessage2);

      expect(testPlugin.handlers?.['test-message']).toHaveBeenCalledWith(resourceMessage1);
      expect(testPlugin.handlers?.['another-test-message']).toHaveBeenCalledWith(resourceMessage2);
    });

    it('should ignore messages with unregistered types', () => {
      const unregisteredMessage = {
        type: 'unregistered-message',
        data: 'test data',
      };

      const resourceMessage: ResourceMessage<any> = {
        content: unregisteredMessage,
        fromResourceId: 'resource-1',
        toResourceId: 'resource-2',
        id: 'msg-123',
        timestamp: Date.now(),
        consumed: false,
      };

      // Should not throw
      expect(() => {
        registry.handleMessage(resourceMessage);
      }).not.toThrow();

      expect(testPlugin.handlers?.['test-message']).not.toHaveBeenCalled();
    });

    it('should handle plugin handler errors gracefully', () => {
      // Make the handler throw an error
      (testPlugin.handlers?.['test-message'] as any).mockImplementation(() => {
        throw new Error('Handler error');
      });

      const testMessage: TestMessage = {
        type: 'test-message',
        data: 'test data',
      };

      const resourceMessage: ResourceMessage<TestMessage> = {
        content: testMessage,
        fromResourceId: 'resource-1',
        toResourceId: 'resource-2',
        id: 'msg-123',
        timestamp: Date.now(),
        consumed: false,
      };

      // Should not throw
      expect(() => {
        registry.handleMessage(resourceMessage);
      }).not.toThrow();
    });
  });

  describe('Plugin Lifecycle', () => {
    it('should initialize plugins on registration', () => {
      const installSpy = vi.spyOn(testPlugin, 'onInstall');
      
      registry.register(testPlugin);
      
      expect(installSpy).toHaveBeenCalled();
    });

    it('should cleanup plugins on unregistration', () => {
      const cleanupSpy = vi.spyOn(testPlugin, 'onUninstall');
      
      registry.register(testPlugin);
      registry.unregister('test-plugin');
      
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should handle plugin initialization errors', () => {
      const errorPlugin = createTestPlugin();
      errorPlugin.onInstall = vi.fn(() => {
        throw new Error('Initialization error');
      });

      // Should not throw
      expect(() => {
        registry.register(errorPlugin);
      }).not.toThrow();
    });

    it('should handle plugin cleanup errors', () => {
      const errorPlugin = createTestPlugin();
      errorPlugin.onUninstall = vi.fn(() => {
        throw new Error('Cleanup error');
      });

      registry.register(errorPlugin);

      // Should not throw
      expect(() => {
        registry.unregister(errorPlugin.name);
      }).not.toThrow();
    });
  });

  describe('Multiple Plugins', () => {
    it('should handle multiple plugins with different message types', () => {
      const secondPlugin: MessageTypePlugin<{ 'second-message': BaseMessageContent & { type: 'second-message' } }> = {
        name: 'second-plugin',
        version: '1.0.0',
        messageTypes: {} as any,
        validators: {
          'second-message': (content: any): content is BaseMessageContent & { type: 'second-message' } => content.type === 'second-message',
        },
        handlers: {
          'second-message': vi.fn(),
        },
        onInstall: () => {
          // Install logic
        },
        onUninstall: () => {
          // Uninstall logic
        },
      };

      registry.register(testPlugin);
      registry.register(secondPlugin);

      expect(registry.getAll()).toHaveLength(2);
      expect(registry.validateMessage('test-message', { type: 'test-message', data: 'test' })).toBe(true);
      expect(registry.validateMessage('second-message', { type: 'second-message' })).toBe(true);
    });
  });

  describe('Registry State', () => {
    it('should return empty array when no plugins registered', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('should return all registered plugins', () => {
      const anotherPlugin: MessageTypePlugin<{ 'other-message': BaseMessageContent & { type: 'other-message' } }> = {
        name: 'another-plugin',
        version: '1.0.0',
        messageTypes: {} as any,
        validators: {
          'other-message': (content: any): content is BaseMessageContent & { type: 'other-message' } => content.type === 'other-message',
        },
        handlers: {
          'other-message': vi.fn(),
        },
        onInstall: () => {
          // Install logic
        },
        onUninstall: () => {
          // Uninstall logic
        },
      };

      registry.register(testPlugin);
      registry.register(anotherPlugin);

      const plugins = registry.getAll();
      expect(plugins).toHaveLength(2);
      expect(plugins).toContain(testPlugin);
      expect(plugins).toContain(anotherPlugin);
    });

    it('should get plugin by name', () => {
      registry.register(testPlugin);

      const plugin = registry.get('test-plugin');
      expect(plugin).toBe(testPlugin);
    });

    it('should return undefined for non-existent plugin', () => {
      const plugin = registry.get('non-existent');
      expect(plugin).toBeUndefined();
    });
  });
}); 