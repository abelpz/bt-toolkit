import { useMessaging } from 'linked-panels';
import { WordAlignmentMessageTypes } from '../plugins/word-alignment';
import { useResourceAPI } from 'linked-panels';

interface GreekWordFilteringOptions {
  resourceId: string;
}



export function useGreekWordFiltering({ resourceId }: GreekWordFilteringOptions) {
  // Get API for sending messages
  const api = useResourceAPI(resourceId);
  
  // Remove debugging logs

  // Use the simple messaging hook - handles all lifecycle complexity automatically!
  const { currentState: activeFilter, hasState: hasActiveFilter } = useMessaging<
    WordAlignmentMessageTypes['filterByGreekWords'],  // State type
    never,                                            // No events needed
    never                                             // No commands needed
  >({
    resourceId,
    stateKey: 'filter'            // Listen for filter state changes
  });

  const clearFilter = () => {
    console.log('🧹 [clearFilter] Button clicked, clearing filter...');
    console.log('🧹 [clearFilter] Current activeFilter before clear:', activeFilter);
    console.log('🧹 [clearFilter] Current hasActiveFilter before clear:', hasActiveFilter);
    
    // Send a clear filter state message - this will supersede any existing filter state
    const clearFilterMessage: WordAlignmentMessageTypes['filterByGreekWords'] = {
      type: 'filterByGreekWords',
      lifecycle: 'state',
      stateKey: 'filter',
      greekWords: [],
      sourceResourceId: 'cleared', // Special marker to indicate this is a clear operation
      alignmentKeys: []
    };
    console.log('🧹 [clearFilter] Sending clear filter state:', clearFilterMessage);
    const myResourceId = api.system.getMyResourceInfo()?.id;
    if (myResourceId) {
      api.messaging.send(myResourceId, clearFilterMessage);
    }
  };
  
  const matchesFilter = (itemGreekWords: string[], itemStrongNumbers?: string[]) => {
    // No filter, empty filter, or cleared filter means show all
    if (!activeFilter || 
        !activeFilter.greekWords || 
        activeFilter.greekWords.length === 0 ||
        activeFilter.sourceResourceId === 'cleared') {
      return true;
    }
    
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
    // No filter, empty filter, or cleared filter means show all
    if (!activeFilter || 
        !activeFilter.greekWords || 
        activeFilter.greekWords.length === 0 ||
        activeFilter.sourceResourceId === 'cleared') {
      return true;
    }
    
    // Check if any of the alignment keys match
    return alignmentKeys.some(key => activeFilter.alignmentKeys.includes(key));
  };

  return {
    activeFilter,
    hasActiveFilter: hasActiveFilter && 
                    activeFilter?.greekWords && 
                    (activeFilter.greekWords?.length ?? 0) > 0 && 
                    activeFilter?.sourceResourceId !== 'cleared',
    clearFilter,
    matchesFilter,
    matchesAlignmentKeys
  };
} 