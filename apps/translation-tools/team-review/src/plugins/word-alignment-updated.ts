import { BaseMessageContent } from linked-panels/core/types';

// Updated word alignment message types with lifecycle properties
export interface WordAlignmentMessageTypes {
  highlightAlignment: {
    type: 'highlightAlignment';
    lifecycle: 'state';           // ← Add this
    stateKey: 'highlight';        // ← Add this
    alignmentKey: string | null;
    greekWord: string;
    strongNumber: string;
    lemma: string;
    sourceResourceId: string;
  } & BaseMessageContent;
  
  highlightNoteQuote: {
    type: 'highlightNoteQuote';
    lifecycle: 'state';           // ← Add this
    stateKey: 'highlight';        // ← Same state key as highlightAlignment
    quote: string;
    occurrence: number;
    sourceResourceId: string;
    noteId?: string;
  } & BaseMessageContent;
  
  clearHighlights: {
    type: 'clearHighlights';
    lifecycle: 'command';         // ← Add this
    sourceResourceId?: string;
  } & BaseMessageContent;
  
  filterByGreekWords: {
    type: 'filterByGreekWords';
    lifecycle: 'state';           // ← Add this
    stateKey: 'filter';           // ← Add this
    greekWords: Array<{
      word: string;
      strongNumber: string;
      lemma: string;
    }>;
    sourceResourceId: string;
    alignmentKeys: string[];
  } & BaseMessageContent;
  
  clearFilters: {
    type: 'clearFilters';
    lifecycle: 'command';         // ← Add this
    sourceResourceId?: string;
  } & BaseMessageContent;
}

// Helper functions - just need to add lifecycle properties to return types
export function createHighlightAlignmentMessage(
  alignmentKey: string | null,
  greekWord: string,
  strongNumber: string,
  lemma: string,
  sourceResourceId: string
): WordAlignmentMessageTypes['highlightAlignment'] {
  return {
    type: 'highlightAlignment',
    lifecycle: 'state',           // ← Add this
    stateKey: 'highlight',        // ← Add this
    alignmentKey,
    greekWord,
    strongNumber,
    lemma,
    sourceResourceId
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
    lifecycle: 'state',           // ← Add this
    stateKey: 'filter',           // ← Add this
    greekWords,
    sourceResourceId,
    alignmentKeys
  };
}

export function createClearFiltersMessage(
  sourceResourceId?: string
): WordAlignmentMessageTypes['clearFilters'] {
  return {
    type: 'clearFilters',
    lifecycle: 'command',         // ← Add this
    sourceResourceId
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
    lifecycle: 'state',           // ← Add this
    stateKey: 'highlight',        // ← Add this
    quote,
    occurrence,
    sourceResourceId,
    noteId
  };
}

export function createClearHighlightsMessage(
  sourceResourceId?: string
): WordAlignmentMessageTypes['clearHighlights'] {
  return {
    type: 'clearHighlights',
    lifecycle: 'command',         // ← Add this
    sourceResourceId
  };
}

// The rest of the plugin (validators, handlers, etc.) can stay the same
// The lifecycle-aware messaging system will handle the complexity automatically 