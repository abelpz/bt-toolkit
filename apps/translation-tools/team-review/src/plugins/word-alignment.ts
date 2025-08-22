import { createPlugin } from 'linked-panels';
import { BaseMessageContent, ResourceMessage } from 'linked-panels';

// Updated word alignment message types with lifecycle properties
export interface WordAlignmentMessageTypes {
  highlightAlignment: {
    type: 'highlightAlignment';
    lifecycle: 'state';           // ← Add lifecycle management
    stateKey: 'highlight';        // ← Add state key
    alignmentKey: string | null; // null to clear highlights
    greekWord: string;
    strongNumber: string;
    lemma: string;
    sourceResourceId: string; // Which resource initiated the highlight
  } & BaseMessageContent;
  
  highlightNoteQuote: {
    type: 'highlightNoteQuote';
    lifecycle: 'state';           // ← Add lifecycle management
    stateKey: 'highlight';        // ← Same state key as highlightAlignment
    quote: string; // The quote text from the translation note
    occurrence: number; // Which occurrence of this quote (1-based)
    sourceResourceId: string; // Which resource initiated the highlight
    noteId?: string; // Optional note identifier for tracking
  } & BaseMessageContent;
  
  clearHighlights: {
    type: 'clearHighlights';
    lifecycle: 'command';         // ← Add lifecycle management
    sourceResourceId?: string; // Optional: only clear highlights from specific source
  } & BaseMessageContent;
  
  filterByGreekWords: {
    type: 'filterByGreekWords';
    lifecycle: 'state';           // ← Add lifecycle management
    stateKey: 'filter';           // ← Add state key
    greekWords: Array<{
      word: string;
      strongNumber: string;
      lemma: string;
    }>;
    sourceResourceId: string; // Which resource initiated the filter
    alignmentKeys: string[]; // The alignment keys for cross-referencing
  } & BaseMessageContent;
  
  clearFilters: {
    type: 'clearFilters';
    lifecycle: 'command';         // ← Add lifecycle management
    sourceResourceId?: string; // Optional: only clear filters from specific source
  } & BaseMessageContent;
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

function isFilterByGreekWordsMessage(content: unknown): content is WordAlignmentMessageTypes['filterByGreekWords'] {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    content.type === 'filterByGreekWords' &&
    'greekWords' in content &&
    Array.isArray((content as any).greekWords) &&
    (content as any).greekWords.every((word: any) => 
      typeof word === 'object' &&
      word !== null &&
      'word' in word &&
      typeof word.word === 'string' &&
      'strongNumber' in word &&
      typeof word.strongNumber === 'string' &&
      'lemma' in word &&
      typeof word.lemma === 'string'
    ) &&
    'sourceResourceId' in content &&
    typeof (content as any).sourceResourceId === 'string' &&
    'alignmentKeys' in content &&
    Array.isArray((content as any).alignmentKeys) &&
    (content as any).alignmentKeys.every((key: any) => typeof key === 'string')
  );
}

function isClearFiltersMessage(content: unknown): content is WordAlignmentMessageTypes['clearFilters'] {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    content.type === 'clearFilters' &&
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

function handleFilterByGreekWords(message: ResourceMessage<WordAlignmentMessageTypes['filterByGreekWords']>) {
  const wordList = message.content.greekWords.map(w => `"${w.word}" (${w.strongNumber})`).join(', ');
  console.log(
    `🔍 Filter by Greek words from ${message.fromResourceId}: ${wordList}`
  );
}

function handleClearFilters(message: ResourceMessage<WordAlignmentMessageTypes['clearFilters']>) {
  console.log(
    `🧹 Clear filters from ${message.fromResourceId}${
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
    filterByGreekWords: isFilterByGreekWordsMessage,
    clearFilters: isClearFiltersMessage,
  },
  
  handlers: {
    highlightAlignment: handleHighlightAlignment,
    highlightNoteQuote: handleHighlightNoteQuote,
    clearHighlights: handleClearHighlights,
    filterByGreekWords: handleFilterByGreekWords,
    clearFilters: handleClearFilters,
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
    lifecycle: 'state',           // ← Add lifecycle
    stateKey: 'highlight',        // ← Add state key
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
    lifecycle: 'state',           // ← Add lifecycle
    stateKey: 'highlight',        // ← Add state key
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
    lifecycle: 'command',         // ← Add lifecycle
    sourceResourceId,
  };
}

export function createFilterByGreekWordsMessage(
  greekWords: Array<{
    word: string;
    strongNumber: string;
    lemma: string;
  }>,
  sourceResourceId: string,
  alignmentKeys: string[]
): WordAlignmentMessageTypes['filterByGreekWords'] {
  return {
    type: 'filterByGreekWords',
    lifecycle: 'state',           // ← Add lifecycle
    stateKey: 'filter',           // ← Add state key
    greekWords,
    sourceResourceId,
    alignmentKeys,
  };
}

export function createClearFiltersMessage(
  sourceResourceId?: string
): WordAlignmentMessageTypes['clearFilters'] {
  return {
    type: 'clearFilters',
    lifecycle: 'command',         // ← Add lifecycle
    sourceResourceId,
  };
} 