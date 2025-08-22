import { createPlugin } from 'linked-panels';
import { MessageLifecycle } from 'linked-panels';

// Message type configuration interface
interface MessageTypeConfig {
  lifecycle: MessageLifecycle;
  stateKey?: string; // Required for STATE messages
  ttl?: number; // Optional TTL in milliseconds
}

// Plugin message type definitions with lifecycle configuration
interface PluginMessageTypes {
  [messageType: string]: {
    content: any;
    config: MessageTypeConfig;
  };
}

// Word alignment message types with lifecycle configuration
export interface WordAlignmentMessageTypesV2 extends PluginMessageTypes {
  highlightAlignment: {
    content: {
      type: 'highlightAlignment';
      alignmentKey: string | null; // null to clear highlights
      greekWord: string;
      strongNumber: string;
      lemma: string;
      sourceResourceId: string;
    };
    config: MessageTypeConfig;
  };
  
  highlightNoteQuote: {
    content: {
      type: 'highlightNoteQuote';
      quote: string;
      occurrence: number;
      sourceResourceId: string;
      noteId?: string;
    };
    config: MessageTypeConfig;
  };
  
  clearHighlights: {
    content: {
      type: 'clearHighlights';
      sourceResourceId?: string;
    };
    config: MessageTypeConfig;
  };
  
  filterByGreekWords: {
    content: {
      type: 'filterByGreekWords';
      greekWords: Array<{
        word: string;
        strongNumber: string;
        lemma: string;
      }>;
      sourceResourceId: string;
      alignmentKeys: string[];
    };
    config: MessageTypeConfig;
  };
  
  clearFilters: {
    content: {
      type: 'clearFilters';
      sourceResourceId?: string;
    };
    config: MessageTypeConfig;
  };
  
  // New event-based messages
  wordClicked: {
    content: {
      type: 'wordClicked';
      alignmentKey: string;
      greekWord: string;
      strongNumber: string;
      lemma: string;
      sourceResourceId: string;
    };
    config: MessageTypeConfig;
  };
  
  wordHovered: {
    content: {
      type: 'wordHovered';
      alignmentKey: string | null; // null when hover ends
      greekWord?: string;
      strongNumber?: string;
      lemma?: string;
      sourceResourceId: string;
    };
    config: MessageTypeConfig;
  };
}

// Message type configurations
const messageConfigs: Record<keyof WordAlignmentMessageTypesV2, MessageTypeConfig> = {
  // STATE messages - persist until superseded
  highlightAlignment: {
    lifecycle: MessageLifecycle.STATE,
    stateKey: 'currentHighlight' // All highlight messages share the same state
  },
  
  highlightNoteQuote: {
    lifecycle: MessageLifecycle.STATE,
    stateKey: 'currentHighlight' // Same state key as highlightAlignment
  },
  
  filterByGreekWords: {
    lifecycle: MessageLifecycle.STATE,
    stateKey: 'currentFilter'
  },
  
  // COMMAND messages - consumed once
  clearHighlights: {
    lifecycle: MessageLifecycle.COMMAND
  },
  
  clearFilters: {
    lifecycle: MessageLifecycle.COMMAND
  },
  
  // EVENT messages - consumed once, then discarded
  wordClicked: {
    lifecycle: MessageLifecycle.EVENT,
    ttl: 5000 // Events expire after 5 seconds if not consumed
  },
  
  wordHovered: {
    lifecycle: MessageLifecycle.EVENT,
    ttl: 1000 // Hover events expire quickly
  }
};

// Helper functions to create messages with proper configuration
export function createHighlightAlignmentMessageV2(
  alignmentKey: string | null,
  greekWord: string,
  strongNumber: string,
  lemma: string,
  sourceResourceId: string
): WordAlignmentMessageTypesV2['highlightAlignment']['content'] {
  return {
    type: 'highlightAlignment',
    alignmentKey,
    greekWord,
    strongNumber,
    lemma,
    sourceResourceId
  };
}

export function createFilterByGreekWordsMessageV2(
  greekWords: Array<{
    word: string;
    strongNumber: string;
    lemma: string;
  }>,
  sourceResourceId: string,
  alignmentKeys: string[]
): WordAlignmentMessageTypesV2['filterByGreekWords']['content'] {
  return {
    type: 'filterByGreekWords',
    greekWords,
    sourceResourceId,
    alignmentKeys
  };
}

export function createWordClickedEventV2(
  alignmentKey: string,
  greekWord: string,
  strongNumber: string,
  lemma: string,
  sourceResourceId: string
): WordAlignmentMessageTypesV2['wordClicked']['content'] {
  return {
    type: 'wordClicked',
    alignmentKey,
    greekWord,
    strongNumber,
    lemma,
    sourceResourceId
  };
}

export function createWordHoveredEventV2(
  alignmentKey: string | null,
  sourceResourceId: string,
  greekWord?: string,
  strongNumber?: string,
  lemma?: string
): WordAlignmentMessageTypesV2['wordHovered']['content'] {
  return {
    type: 'wordHovered',
    alignmentKey,
    sourceResourceId,
    greekWord,
    strongNumber,
    lemma
  };
}

// Create the plugin with lifecycle-aware message handling
export const wordAlignmentPluginV2 = createPlugin({
  name: 'word-alignment-v2',
  version: '2.0.0',
  description: 'Plugin for word alignment with lifecycle-aware message handling',
  
  messageTypes: messageConfigs,
  
  // Plugin would need to be updated to handle the new message system
  // This is just a conceptual example
  onInstall: () => {
    console.log('🎯 Word Alignment Plugin V2 installed with lifecycle management');
  }
}); 