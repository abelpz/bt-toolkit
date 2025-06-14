import { createPlugin } from '../libs/linked-panels/plugins/base';
import { ResourceMessage } from '../libs/linked-panels/core/types';

// Word alignment message types
export interface WordAlignmentMessageTypes {
  highlightAlignment: {
    type: 'highlightAlignment';
    alignmentKey: string | null; // null to clear highlights
    greekWord: string;
    strongNumber: string;
    lemma: string;
    sourceResourceId: string; // Which resource initiated the highlight
  };
  
  highlightNoteQuote: {
    type: 'highlightNoteQuote';
    quote: string; // The quote text from the translation note
    occurrence: number; // Which occurrence of this quote (1-based)
    sourceResourceId: string; // Which resource initiated the highlight
    noteId?: string; // Optional note identifier for tracking
  };
  
  clearHighlights: {
    type: 'clearHighlights';
    sourceResourceId?: string; // Optional: only clear highlights from specific source
  };
}

// Validation functions
function isHighlightAlignmentMessage(content: unknown): content is WordAlignmentMessageTypes['highlightAlignment'] {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    content.type === 'highlightAlignment' &&
    'alignmentKey' in content &&
    (typeof (content as any).alignmentKey === 'string' || (content as any).alignmentKey === null) &&
    'greekWord' in content &&
    typeof (content as any).greekWord === 'string' &&
    'strongNumber' in content &&
    typeof (content as any).strongNumber === 'string' &&
    'lemma' in content &&
    typeof (content as any).lemma === 'string' &&
    'sourceResourceId' in content &&
    typeof (content as any).sourceResourceId === 'string'
  );
}

function isHighlightNoteQuoteMessage(content: unknown): content is WordAlignmentMessageTypes['highlightNoteQuote'] {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    content.type === 'highlightNoteQuote' &&
    'quote' in content &&
    typeof (content as any).quote === 'string' &&
    'occurrence' in content &&
    typeof (content as any).occurrence === 'number' &&
    (content as any).occurrence > 0 &&
    'sourceResourceId' in content &&
    typeof (content as any).sourceResourceId === 'string' &&
    (!('noteId' in content) || typeof (content as any).noteId === 'string')
  );
}

function isClearHighlightsMessage(content: unknown): content is WordAlignmentMessageTypes['clearHighlights'] {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    content.type === 'clearHighlights' &&
    (!('sourceResourceId' in content) || typeof (content as any).sourceResourceId === 'string')
  );
}

// Message handlers
function handleHighlightAlignment(message: ResourceMessage<WordAlignmentMessageTypes['highlightAlignment']>) {
  console.log(
    `🎯 Word alignment highlight from ${message.fromResourceId}: ${
      message.content.alignmentKey 
        ? `"${message.content.greekWord}" (${message.content.strongNumber})`
        : 'CLEAR'
    }`
  );
}

function handleHighlightNoteQuote(message: ResourceMessage<WordAlignmentMessageTypes['highlightNoteQuote']>) {
  console.log(
    `📝 Note quote highlight from ${message.fromResourceId}: "${message.content.quote}" (occurrence: ${message.content.occurrence})${
      message.content.noteId ? ` (note: ${message.content.noteId})` : ''
    }`
  );
}

function handleClearHighlights(message: ResourceMessage<WordAlignmentMessageTypes['clearHighlights']>) {
  console.log(
    `🧹 Clear word alignment highlights from ${message.fromResourceId}${
      message.content.sourceResourceId ? ` (source: ${message.content.sourceResourceId})` : ''
    }`
  );
}

// Create the plugin
export const wordAlignmentPlugin = createPlugin<WordAlignmentMessageTypes>({
  name: 'word-alignment',
  version: '1.0.0',
  description: 'Plugin for highlighting word alignments across translation panels',
  
  messageTypes: {} as WordAlignmentMessageTypes,
  
  validators: {
    highlightAlignment: isHighlightAlignmentMessage,
    highlightNoteQuote: isHighlightNoteQuoteMessage,
    clearHighlights: isClearHighlightsMessage,
  },
  
  handlers: {
    highlightAlignment: handleHighlightAlignment,
    highlightNoteQuote: handleHighlightNoteQuote,
    clearHighlights: handleClearHighlights,
  },
  
  onInstall: () => {
    console.log('🎯 Word Alignment Plugin installed');
  },
  
  onUninstall: () => {
    console.log('🎯 Word Alignment Plugin uninstalled');
  },
});

// Helper functions for creating messages
export function createHighlightAlignmentMessage(
  alignmentKey: string | null,
  greekWord: string,
  strongNumber: string,
  lemma: string,
  sourceResourceId: string
): WordAlignmentMessageTypes['highlightAlignment'] {
  return {
    type: 'highlightAlignment',
    alignmentKey,
    greekWord,
    strongNumber,
    lemma,
    sourceResourceId,
  };
}

export function createHighlightNoteQuoteMessage(
  quote: string,
  occurrence: number,
  sourceResourceId: string,
  noteId?: string
): WordAlignmentMessageTypes['highlightNoteQuote'] {
  return {
    type: 'highlightNoteQuote',
    quote,
    occurrence,
    sourceResourceId,
    noteId,
  };
}

export function createClearHighlightsMessage(
  sourceResourceId?: string
): WordAlignmentMessageTypes['clearHighlights'] {
  return {
    type: 'clearHighlights',
    sourceResourceId,
  };
} 