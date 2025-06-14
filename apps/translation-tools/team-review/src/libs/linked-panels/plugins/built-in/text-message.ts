import { createPlugin } from '../base';
import { ResourceMessage } from '../../core/types';

// Text message types
export interface TextMessageTypes {
  text: {
    type: 'text';
    message: string;
    originalSender?: string; // For chain completion tracking
  };
  
  chainedText: {
    type: 'chainedText';
    message: string;
    originalSender: string;
    hopCount: number;
  };
}

// Validation functions
function isTextMessage(content: unknown): content is TextMessageTypes['text'] {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    content.type === 'text' &&
    'message' in content &&
    typeof (content as any).message === 'string'
  );
}

function isChainedTextMessage(content: unknown): content is TextMessageTypes['chainedText'] {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    content.type === 'chainedText' &&
    'message' in content &&
    typeof (content as any).message === 'string' &&
    'originalSender' in content &&
    typeof (content as any).originalSender === 'string' &&
    'hopCount' in content &&
    typeof (content as any).hopCount === 'number'
  );
}

// Message handlers
function handleTextMessage(message: ResourceMessage<TextMessageTypes['text']>) {
  console.log(`📝 Text message from ${message.fromResourceId}: "${message.content.message}"`);
}

function handleChainedTextMessage(message: ResourceMessage<TextMessageTypes['chainedText']>) {
  console.log(
    `🔗 Chained text message (hop ${message.content.hopCount}) from ${message.fromResourceId}: "${message.content.message}" (original: ${message.content.originalSender})`
  );
}

// Create the plugin
export const textMessagePlugin = createPlugin<TextMessageTypes>({
  name: 'text-message',
  version: '1.0.0',
  description: 'Built-in plugin for simple text messages with chaining support',
  
  messageTypes: {} as TextMessageTypes, // Type-only, no runtime value needed
  
  validators: {
    text: isTextMessage,
    chainedText: isChainedTextMessage,
  },
  
  handlers: {
    text: handleTextMessage,
    chainedText: handleChainedTextMessage,
  },
  
  onInstall: () => {
    console.log('📝 Text Message Plugin installed');
  },
  
  onUninstall: () => {
    console.log('📝 Text Message Plugin uninstalled');
  },
});

// Helper functions for creating messages
export function createTextMessage(message: string, originalSender?: string): TextMessageTypes['text'] {
  return {
    type: 'text',
    message,
    originalSender,
  };
}

export function createChainedTextMessage(
  message: string,
  originalSender: string,
  hopCount: number
): TextMessageTypes['chainedText'] {
  return {
    type: 'chainedText',
    message,
    originalSender,
    hopCount,
  };
} 