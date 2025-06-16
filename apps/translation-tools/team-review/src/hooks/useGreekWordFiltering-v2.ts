import { useState, useEffect } from 'react';
import { useResourceAPI } from '../libs/linked-panels';
// import { WordAlignmentMessageTypes } from '../plugins/word-alignment';

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

// type FilterMessage = WordAlignmentMessageTypes['filterByGreekWords'] | WordAlignmentMessageTypes['clearFilters'];

/**
 * Simplified version using useResourceAPI.
 * Handles message processing with proper deduplication.
 */
export function useGreekWordFilteringV2({ resourceId }: GreekWordFilteringOptions) {
  const [activeFilter, setActiveFilter] = useState<GreekWordFilter | null>(null);
  const api = useResourceAPI(resourceId);
  const messages = api.messaging.getMessages();

  useEffect(() => {
    // Process messages in chronological order
    const relevantMessages = messages
      .filter(msg => ['filterByGreekWords', 'clearFilters'].includes(msg.content.type))
      .sort((a, b) => a.timestamp - b.timestamp);

    let currentFilter: GreekWordFilter | null = null;

    for (const message of relevantMessages) {
      if (message.content.type === 'clearFilters') {
        // Clear filters unless it's from this same resource
        if (!message.content.sourceResourceId || message.content.sourceResourceId !== resourceId) {
          currentFilter = null;
        }
      } else if (message.content.type === 'filterByGreekWords') {
        // Don't filter if the message came from this same resource
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

  const clearFilter = () => {
    setActiveFilter(null);
    
    // Send clear message to other panels
    api.messaging.sendToAll({
      type: 'clearFilters',
      sourceResourceId: resourceId
    });
  };

  const hasActiveFilter = activeFilter !== null;
  
  const matchesFilter = (itemGreekWords: string[], itemStrongNumbers?: string[]) => {
    if (!activeFilter) return true;
    
    const filterWords = activeFilter.greekWords.map(w => w.word.toLowerCase());
    const filterStrongs = activeFilter.greekWords.map(w => w.strongNumber);
    
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