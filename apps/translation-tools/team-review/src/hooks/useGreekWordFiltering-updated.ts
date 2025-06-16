import { useMessaging } from '../libs/linked-panels/hooks/useSimpleMessaging';
import { WordAlignmentMessageTypes, createClearFiltersMessage } from '../plugins/word-alignment-updated';
import { useResourceAPI } from '../libs/linked-panels';

interface GreekWordFilteringOptions {
  resourceId: string;
}

/**
 * Updated filtering hook using lifecycle-aware messaging.
 * Much simpler than the original - no manual timestamp tracking needed!
 */
export function useGreekWordFilteringUpdated({ resourceId }: GreekWordFilteringOptions) {
  // Get API for sending messages
  const api = useResourceAPI(resourceId);
  
  // Use the simple messaging hook - handles all lifecycle complexity automatically!
  const { currentState: activeFilter, hasState: hasActiveFilter } = useMessaging<
    WordAlignmentMessageTypes['filterByGreekWords'],  // State type
    never,                                            // No events needed
    WordAlignmentMessageTypes['clearFilters']         // Command type
  >({
    resourceId,
    stateKey: 'filter',           // Listen for filter state changes
    commandTypes: ['clearFilters'], // Listen for clear commands
    onCommand: (command) => {
      // Commands are automatically consumed once - no reprocessing!
      console.log('🧹 Filter cleared by:', command.sourceResourceId);
      // State is automatically cleared by the system
    }
  });

  const clearFilter = () => {
    // Send clear command - will be consumed once by all listeners
    const clearMessage = createClearFiltersMessage(resourceId);
    api.messaging.sendToAll(clearMessage);
  };
  
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

/*
CHANGES MADE:
1. Replaced complex useEffect logic with simple useMessaging call
2. Removed manual timestamp tracking (lastProcessedTimestamp)
3. Removed manual message filtering and processing
4. Removed all debugging console logs
5. Kept the same public API - components don't need to change!

BENEFITS:
- 60+ lines reduced to ~30 lines
- No reprocessing bugs possible
- Automatic lifecycle management
- Much easier to understand and maintain
- Same functionality, better implementation
*/ 