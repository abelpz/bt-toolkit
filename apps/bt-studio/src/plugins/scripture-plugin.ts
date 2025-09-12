/**
 * Scripture Plugin for linked-panels
 * Registers scripture-related message types for validation and handling
 */

import { createPlugin } from 'linked-panels';
import { ScriptureTokensBroadcast, ScriptureMessageTypes } from '../types/scripture-messages';

/**
 * Validator for scripture tokens broadcast messages
 */
function isScriptureTokensBroadcast(content: unknown): content is ScriptureTokensBroadcast {
  if (!content || typeof content !== 'object') {
    return false;
  }

  const msg = content as any;
  
  return (
    msg.type === 'scripture-tokens-broadcast' &&
    msg.lifecycle === 'state' &&
    msg.stateKey === 'current-scripture-tokens' &&
    typeof msg.sourceResourceId === 'string' &&
    msg.reference &&
    typeof msg.reference.book === 'string' &&
    typeof msg.reference.chapter === 'number' &&
    typeof msg.reference.verse === 'number' &&
    Array.isArray(msg.tokens) &&
    msg.resourceMetadata &&
    typeof msg.resourceMetadata.id === 'string' &&
    typeof msg.timestamp === 'number'
  );
}

/**
 * Handler for scripture tokens broadcast messages
 */
function handleScriptureTokensBroadcast(message: any) {
  const broadcast = message.content as ScriptureTokensBroadcast;
  console.log(`🎯 Scripture Plugin: Received token broadcast from ${broadcast.sourceResourceId}`, {
    tokenCount: broadcast.tokens.length,
    reference: `${broadcast.reference.book} ${broadcast.reference.chapter}:${broadcast.reference.verse}`,
    timestamp: new Date(broadcast.timestamp).toLocaleTimeString()
  });
}

/**
 * Scripture plugin for linked-panels
 */
export const scripturePlugin = createPlugin<ScriptureMessageTypes>({
  name: 'scripture-plugin',
  version: '1.0.0',
  description: 'Plugin for scripture token broadcasting and cross-panel communication',
  
  messageTypes: {
    'scripture-tokens-broadcast': {} as ScriptureTokensBroadcast
  },
  
  validators: {
    'scripture-tokens-broadcast': isScriptureTokensBroadcast
  },
  
  handlers: {
    'scripture-tokens-broadcast': handleScriptureTokensBroadcast
  },
  
  onInstall: () => {
    console.log('📖 Scripture Plugin installed - ready for token broadcasting');
  },
  
  onUninstall: () => {
    console.log('📖 Scripture Plugin uninstalled');
  }
});
