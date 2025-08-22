import { useState, useEffect } from 'react';
import { useResourceAPI } from 'linked-panels';
// import { WordAlignmentMessageTypesV2 } from '../plugins/word-alignment-v2';

interface GreekWordFilteringOptions {
  resourceId: string;
}

interface GreekWordFilter {
  greekWords: Array<{
    word: string;
    strongNumber: string;
    lemma: string;
  }>;
  sourceResourceId: string;
  alignmentKeys: string[];
}

/**
 * Version 3: Using useResourceAPI with state management.
 * Handles lifecycle-aware message processing.
 */
export function useGreekWordFilteringV3({ resourceId }: GreekWordFilteringOptions) {
  const [activeFilter, setActiveFilter] = useState<GreekWordFilter | null>(null);
  const api = useResourceAPI(resourceId);
  const messages = api.messaging.getMessages();

  useEffect(() => {
    // Process messages with lifecycle awareness
    const relevantMessages = messages
      .filter(msg => 
        msg.content.type === 'filterByGreekWords' || 
        msg.content.type === 'clearFilters'
      )
      .sort((a, b) => a.timestamp - b.timestamp);

    let currentFilter: GreekWordFilter | null = null;

    for (const message of relevantMessages) {
      if (message.content.type === 'clearFilters') {
        if (!message.content.sourceResourceId || message.content.sourceResourceId !== resourceId) {
          currentFilter = null;
        }
      } else if (message.content.type === 'filterByGreekWords') {
        if (message.content.sourceResourceId !== resourceId) {
          currentFilter = {
            greekWords: message.content.greekWords,
            sourceResourceId: message.content.sourceResourceId,
            alignmentKeys: message.content.alignmentKeys
          };
        }
      }
    }

    setActiveFilter(currentFilter);
  }, [messages, resourceId]);

  const hasActiveFilter = activeFilter !== null;

  const clearFilter = () => {
    setActiveFilter(null);
    api.messaging.sendToAll({
      type: 'clearFilters',
      sourceResourceId: resourceId
    });
  };
  
  const matchesFilter = (itemGreekWords: string[], itemStrongNumbers?: string[]) => {
    if (!activeFilter) return true;
    
    const filterWords = activeFilter.greekWords.map((w: any) => w.word.toLowerCase());
    const filterStrongs = activeFilter.greekWords.map((w: any) => w.strongNumber);
    
    const hasWordMatch = itemGreekWords.some(word => 
      filterWords.includes(word.toLowerCase())
    );
    
    const hasStrongMatch = itemStrongNumbers ? 
      itemStrongNumbers.some(strong => filterStrongs.includes(strong)) : 
      false;
    
    return hasWordMatch || hasStrongMatch;
  };

  const matchesAlignmentKeys = (alignmentKeys: string[]) => {
    if (!activeFilter) return true;
    return alignmentKeys.some(key => activeFilter.alignmentKeys.includes(key));
  };

  return {
    activeFilter,
    hasActiveFilter,
    clearFilter,
    matchesFilter,
    matchesAlignmentKeys
  };
}

/*
BENEFITS OF THIS APPROACH:

1. **No Reprocessing**: STATE messages automatically supersede previous ones
2. **Automatic Cleanup**: EVENT messages are consumed once and discarded
3. **Command Semantics**: COMMAND messages are executed once, no duplicates
4. **Memory Efficient**: Old messages are automatically cleaned up
5. **Clear Intent**: Message types clearly express their intended lifecycle
6. **Type Safety**: Full TypeScript support with proper message typing

EXAMPLE MESSAGE FLOWS:

Highlighting (STATE):
- User hovers word → sends highlightAlignment STATE message
- All panels receive current highlight state
- New hover → previous highlight state is superseded
- No reprocessing of old highlights!

Filtering (STATE + COMMAND):
- User clicks word → sends filterByGreekWords STATE message  
- All panels receive current filter state
- User clicks clear → sends clearFilters COMMAND message
- Command is consumed once by all panels
- Filter state is cleared, no reprocessing!

Events (EVENT):
- User clicks word → sends wordClicked EVENT message
- Analytics panel consumes event once
- Event is discarded after consumption
- No memory buildup from old click events!
*/ 