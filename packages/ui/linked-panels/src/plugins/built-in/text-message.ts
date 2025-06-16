import { createPlugin } from '../base';
import { ResourceMessage, BaseMessageContent } from '../../core/types';

// Text message content types that extend BaseMessageContent
export interface TextMessage extends BaseMessageContent {
  type: 'text';
  message: string;
  originalSender?: string; // For chain completion tracking
}

export interface ChainedTextMessage extends BaseMessageContent {
  type: 'chainedText';
  message: string;
  originalSender: string;
  hopCount: number;
}

// Text message registry - maps message type names to their content types
export interface TextMessageTypes {
  text: TextMessage;
  chainedText: ChainedTextMessage;
}

// Validation functions
function isTextMessage(content: unknown): content is TextMessage {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    content.type === 'text' &&
    'message' in content &&
    typeof (content as any).message === 'string'
  );
}

function isChainedTextMessage(content: unknown): content is ChainedTextMessage {
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
function handleTextMessage(message: ResourceMessage<TextMessage>) {
  console.log(`📝 Text message from ${message.fromResourceId}: "${message.content.message}"`);
}

function handleChainedTextMessage(message: ResourceMessage<ChainedTextMessage>) {
  console.log(
    `🔗 Chained text message (hop ${message.content.hopCount}) from ${message.fromResourceId}: "${message.content.message}" (original: ${message.content.originalSender})`
  );
}

// Create the plugin
export const textMessagePlugin = createPlugin<TextMessageTypes>({
  name: 'text-message',
  version: '1.0.0',
  description: 'Built-in plugin for simple text messages with chaining support',
  
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
export function createTextMessage(message: string, originalSender?: string): TextMessage {
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
): ChainedTextMessage {
  return {
    type: 'chainedText',
    message,
    originalSender,
    hopCount,
  };
} 