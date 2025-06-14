import { useState, useEffect } from 'react';
import { useResourceAPI } from '../libs/linked-panels';
import { WordAlignmentMessageTypes, createClearFiltersMessage } from '../plugins/word-alignment';

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

export function useGreekWordFiltering({ resourceId }: GreekWordFilteringOptions) {
  const [activeFilter, setActiveFilter] = useState<GreekWordFilter | null>(null);
  const [lastProcessedTimestamp, setLastProcessedTimestamp] = useState<number>(0);
  
  // Use linked-panels API
  const api = useResourceAPI<
    WordAlignmentMessageTypes['filterByGreekWords'] | 
    WordAlignmentMessageTypes['clearFilters']
  >(resourceId);

  // Get messages reactively
  const messages = api.messaging.getMessages();

  // Listen for incoming filter messages
  useEffect(() => {
    if (messages.length === 0) return;
    
    console.log('🔍 Filtering hook received messages:', messages.map(m => ({ type: m.content.type, from: m.fromResourceId, timestamp: m.timestamp })));
    
    // Find the chronologically latest message (highest timestamp) that affects filtering
    const relevantMessages = messages.filter(msg => 
      msg.content.type === 'filterByGreekWords' || 
      msg.content.type === 'clearFilters'
    );
    
    console.log('🔍 Relevant filter messages:', relevantMessages.map(m => ({ type: m.content.type, from: m.fromResourceId, timestamp: m.timestamp })));
    
    // Sort by timestamp to get the most recent message
    const latestMessage = relevantMessages.sort((a, b) => b.timestamp - a.timestamp)[0];
    
    if (!latestMessage) return;
    
    // Only process if this message is newer than the last processed message
    if (latestMessage.timestamp <= lastProcessedTimestamp) {
      console.log('🔍 Skipping already processed message:', { timestamp: latestMessage.timestamp, lastProcessed: lastProcessedTimestamp });
      return;
    }
    
    console.log('🔍 Processing latest filter message:', { type: latestMessage.content.type, from: latestMessage.fromResourceId, timestamp: latestMessage.timestamp });
    
    // Update the last processed timestamp
    setLastProcessedTimestamp(latestMessage.timestamp);
    
    // Process the latest message
    if (latestMessage.content.type === 'clearFilters') {
      // Clear filters unless it's from this same resource
      if (!latestMessage.content.sourceResourceId || latestMessage.content.sourceResourceId !== resourceId) {
        console.log('🔍 Clearing filter due to clearFilters message');
        setActiveFilter(null);
      }
    } else if (latestMessage.content.type === 'filterByGreekWords') {
      // Don't filter if the message came from this same resource
      if (latestMessage.content.sourceResourceId !== resourceId) {
        console.log('🔍 Setting filter due to filterByGreekWords message:', latestMessage.content.greekWords);
        setActiveFilter({
          greekWords: latestMessage.content.greekWords,
          sourceResourceId: latestMessage.content.sourceResourceId,
          alignmentKeys: latestMessage.content.alignmentKeys
        });
      }
    }
  }, [messages, resourceId, lastProcessedTimestamp]);

  const clearFilter = () => {
    setActiveFilter(null);
    
    // Send clear message to other panels
    const clearMessage = createClearFiltersMessage(resourceId);
    api.messaging.sendToAll(clearMessage);
  };

  const hasActiveFilter = activeFilter !== null;
  
  const matchesFilter = (itemGreekWords: string[], itemStrongNumbers?: string[]) => {
    if (!activeFilter) return true; // No filter means show all
    
    // Check if any of the item's Greek words match any of the filter's Greek words
    const filterWords = activeFilter.greekWords.map(w => w.word.toLowerCase());
    const filterStrongs = activeFilter.greekWords.map(w => w.strongNumber);
    
    // Match by Greek word text
    const hasWordMatch = itemGreekWords.some(word => 
      filterWords.includes(word.toLowerCase())
    );
    
    // Match by Strong's number if provided
    const hasStrongMatch = itemStrongNumbers ? 
      itemStrongNumbers.some(strong => filterStrongs.includes(strong)) : 
      false;
    
    return hasWordMatch || hasStrongMatch;
  };

  const matchesAlignmentKeys = (alignmentKeys: string[]) => {
    if (!activeFilter) return true; // No filter means show all
    
    // Check if any of the alignment keys match
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