import { textMessagePlugin, TextMessage, ChainedTextMessage, createTextMessage, createChainedTextMessage } from '../text-message';
import { ResourceMessage } from '../../../core/types';

describe('TextMessagePlugin', () => {
  const plugin = textMessagePlugin;

  describe('Plugin Metadata', () => {
    it('should have correct plugin metadata', () => {
      expect(plugin.name).toBe('text-message');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.description).toBe('Built-in plugin for simple text messages with chaining support');
    });
  });

  describe('Message Validation', () => {
    describe('Text Messages', () => {
      it('should validate correct text messages', () => {
        const validMessage: TextMessage = {
          type: 'text',
          message: 'Hello, world!',
        };

        const isValid = plugin.validators?.text?.(validMessage);
        expect(isValid).toBe(true);
      });

      it('should reject messages without message field', () => {
        const invalidMessage = {
          type: 'text',
          // Missing message field
        };

        const isValid = plugin.validators?.text?.(invalidMessage);
        expect(isValid).toBe(false);
      });

      it('should reject messages with non-string message', () => {
        const invalidMessage = {
          type: 'text',
          message: 123, // Should be string
        };

        const isValid = plugin.validators?.text?.(invalidMessage);
        expect(isValid).toBe(false);
      });

      it('should reject messages with wrong type', () => {
        const invalidMessage = {
          type: 'wrong-type',
          message: 'Hello, world!',
        };

        const isValid = plugin.validators?.text?.(invalidMessage);
        expect(isValid).toBe(false);
      });

      it('should reject null or undefined messages', () => {
        expect(plugin.validators?.text?.(null)).toBe(false);
        expect(plugin.validators?.text?.(undefined)).toBe(false);
      });

      it('should accept text messages with optional fields', () => {
        const messageWithOptionalFields: TextMessage = {
          type: 'text',
          message: 'Hello, world!',
          originalSender: 'original-sender',
          lifecycle: 'event',
          stateKey: 'current-text',
          ttl: 5000,
        };

        const isValid = plugin.validators?.text?.(messageWithOptionalFields);
        expect(isValid).toBe(true);
      });
    });

    describe('Chained Text Messages', () => {
      it('should validate correct chained text messages', () => {
        const validMessage: ChainedTextMessage = {
          type: 'chainedText',
          message: 'Hello, world!',
          originalSender: 'original-sender',
          hopCount: 1,
        };

        const isValid = plugin.validators?.chainedText?.(validMessage);
        expect(isValid).toBe(true);
      });

      it('should reject chained messages without required fields', () => {
        const invalidMessage = {
          type: 'chainedText',
          message: 'Hello, world!',
          // Missing originalSender and hopCount
        };

        const isValid = plugin.validators?.chainedText?.(invalidMessage);
        expect(isValid).toBe(false);
      });

      it('should reject chained messages with invalid hopCount', () => {
        const invalidMessage = {
          type: 'chainedText',
          message: 'Hello, world!',
          originalSender: 'original-sender',
          hopCount: 'invalid', // Should be number
        };

        const isValid = plugin.validators?.chainedText?.(invalidMessage);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Message Handling', () => {
    it('should handle text messages', () => {
      const textMessage: TextMessage = {
        type: 'text',
        message: 'Hello, world!',
      };

      const resourceMessage: ResourceMessage<TextMessage> = {
        content: textMessage,
        fromResourceId: 'resource-1',
        toResourceId: 'resource-2',
        id: 'msg-123',
        timestamp: Date.now(),
        consumed: false,
      };

      // Mock console.log to verify the handler is called
      const originalLog = console.log;
      const logCalls: any[] = [];
      console.log = (...args: any[]) => logCalls.push(args);

      plugin.handlers?.text?.(resourceMessage);

      expect(logCalls).toHaveLength(1);
      expect(logCalls[0]).toEqual([
        '📝 Text message from resource-1: "Hello, world!"'
      ]);

      console.log = originalLog;
    });

    it('should handle chained text messages', () => {
      const chainedMessage: ChainedTextMessage = {
        type: 'chainedText',
        message: 'Chained hello!',
        originalSender: 'original-sender',
        hopCount: 2,
      };

      const resourceMessage: ResourceMessage<ChainedTextMessage> = {
        content: chainedMessage,
        fromResourceId: 'resource-1',
        toResourceId: 'resource-2',
        id: 'msg-124',
        timestamp: Date.now(),
        consumed: false,
      };

      const originalLog = console.log;
      const logCalls: any[] = [];
      console.log = (...args: any[]) => logCalls.push(args);

      plugin.handlers?.chainedText?.(resourceMessage);

      expect(logCalls).toHaveLength(1);
      expect(logCalls[0]).toEqual([
        '🔗 Chained text message (hop 2) from resource-1: "Chained hello!" (original: original-sender)'
      ]);

      console.log = originalLog;
    });
  });

  describe('Helper Functions', () => {
    it('should create text messages correctly', () => {
      const message = createTextMessage('Hello, world!');
      
      expect(message).toEqual({
        type: 'text',
        message: 'Hello, world!',
      });
    });

    it('should create text messages with original sender', () => {
      const message = createTextMessage('Hello, world!', 'original-sender');
      
      expect(message).toEqual({
        type: 'text',
        message: 'Hello, world!',
        originalSender: 'original-sender',
      });
    });

    it('should create chained text messages correctly', () => {
      const message = createChainedTextMessage('Chained hello!', 'original-sender', 3);
      
      expect(message).toEqual({
        type: 'chainedText',
        message: 'Chained hello!',
        originalSender: 'original-sender',
        hopCount: 3,
      });
    });
  });

  describe('Plugin Lifecycle', () => {
    it('should have install and uninstall hooks', () => {
      expect(typeof plugin.onInstall).toBe('function');
      expect(typeof plugin.onUninstall).toBe('function');
    });

    it('should log on install', () => {
      const originalLog = console.log;
      const logCalls: any[] = [];
      console.log = (...args: any[]) => logCalls.push(args);

      plugin.onInstall?.();

      expect(logCalls).toHaveLength(1);
      expect(logCalls[0]).toEqual(['📝 Text Message Plugin installed']);

      console.log = originalLog;
    });

    it('should log on uninstall', () => {
      const originalLog = console.log;
      const logCalls: any[] = [];
      console.log = (...args: any[]) => logCalls.push(args);

      plugin.onUninstall?.();

      expect(logCalls).toHaveLength(1);
      expect(logCalls[0]).toEqual(['📝 Text Message Plugin uninstalled']);

      console.log = originalLog;
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text messages', () => {
      const emptyTextMessage: TextMessage = {
        type: 'text',
        message: '',
      };

      const isValid = plugin.validators?.text?.(emptyTextMessage);
      expect(isValid).toBe(true);
    });

    it('should handle very long text messages', () => {
      const longText = 'A'.repeat(10000);
      const longTextMessage: TextMessage = {
        type: 'text',
        message: longText,
      };

      const isValid = plugin.validators?.text?.(longTextMessage);
      expect(isValid).toBe(true);
    });

    it('should handle text with special characters', () => {
      const specialTextMessage: TextMessage = {
        type: 'text',
        message: '🚀 Hello, 世界! Special chars: @#$%^&*()[]{}|\\:";\'<>?,./`~',
      };

      const isValid = plugin.validators?.text?.(specialTextMessage);
      expect(isValid).toBe(true);
    });

    it('should handle text with newlines and whitespace', () => {
      const multilineTextMessage: TextMessage = {
        type: 'text',
        message: 'Line 1\nLine 2\r\nLine 3\t\tTabbed',
      };

      const isValid = plugin.validators?.text?.(multilineTextMessage);
      expect(isValid).toBe(true);
    });

    it('should handle zero hop count in chained messages', () => {
      const zeroHopMessage: ChainedTextMessage = {
        type: 'chainedText',
        message: 'Zero hops',
        originalSender: 'sender',
        hopCount: 0,
      };

      const isValid = plugin.validators?.chainedText?.(zeroHopMessage);
      expect(isValid).toBe(true);
    });
  });
}); 