import { useMessaging } from linked-panels/hooks/useSimpleMessaging';
import { WordAlignmentMessages } from '../plugins/word-alignment-simple';

interface GreekWordFilteringOptions {
  resourceId: string;
}

/**
 * INCREDIBLY SIMPLE! No manual lifecycle management needed.
 * The library handles everything automatically based on message properties.
 */
export function useGreekWordFilteringSimple({ resourceId }: GreekWordFilteringOptions) {
  // This ONE hook call handles everything automatically!
  const { currentState: activeFilter, hasState: hasActiveFilter } = useMessaging<
    WordAlignmentMessages['filterByGreekWords'],  // State type
    never,                                        // No events needed
    WordAlignmentMessages['clearFilters']         // Command type
  >({
    resourceId,
    stateKey: 'filter',           // Listen for filter state
    commandTypes: ['clearFilters'], // Listen for clear commands
    onCommand: (command) => {
      // Commands are automatically consumed once - no reprocessing!
      console.log('🧹 Filter cleared by:', command.sourceResourceId);
      // State is automatically cleared by the system
    }
  });

  // That's it! No manual message processing, no timestamp tracking, no reprocessing bugs!
  
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
    matchesFilter,
    matchesAlignmentKeys
  };
}

/*
COMPARISON:

OLD WAY (60+ lines):
- Manual timestamp tracking
- Manual message filtering  
- Manual reprocessing prevention
- Complex useEffect logic
- Easy to introduce bugs

NEW WAY (30 lines):
- Just specify stateKey and commandTypes
- Library handles everything automatically
- Impossible to have reprocessing bugs
- Clean, declarative code
- Type-safe throughout

DEVELOPER EXPERIENCE:
1. Add `lifecycle` and `stateKey`/`ttl` to message definitions
2. Use `useMessaging` hook with simple configuration
3. Everything else is handled automatically!

The library prevents entire classes of bugs while making the code much simpler.
*/ 