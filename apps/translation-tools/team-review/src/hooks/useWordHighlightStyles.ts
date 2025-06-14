interface WordHighlightState {
  isLocallyHighlighted: boolean;
  isExternallyHighlighted: boolean;
  isHighlighted: boolean;
  hasAlignment: boolean;
}

interface WordHighlightStylesOptions {
  colorScheme: 'blue' | 'emerald';
}

export function useWordHighlightStyles({ colorScheme }: WordHighlightStylesOptions) {
  const getWordClassName = (highlightState: WordHighlightState): string => {
    const { isHighlighted, isExternallyHighlighted, hasAlignment } = highlightState;
    
    const baseClasses = 'cursor-pointer transition-all duration-200 rounded-md px-1 py-0.5 inline-block';
    
    if (isHighlighted) {
      if (isExternallyHighlighted) {
        // External highlights are always purple
        return `${baseClasses} bg-purple-200/80 shadow-md ring-2 ring-purple-300/50`;
      } else {
        // Local highlights use the color scheme
        const localHighlightClasses = colorScheme === 'blue' 
          ? 'bg-blue-200/80 shadow-md ring-2 ring-blue-300/50'
          : 'bg-emerald-200/80 shadow-md ring-2 ring-emerald-300/50';
        return `${baseClasses} ${localHighlightClasses}`;
      }
    } else if (hasAlignment) {
      // Hover styles for words with alignment
      const hoverClasses = colorScheme === 'blue'
        ? 'hover:bg-blue-100/70 hover:shadow-sm'
        : 'hover:bg-emerald-100/70 hover:shadow-sm border-b-2 border-emerald-300/60 border-dotted';
      return `${baseClasses} ${hoverClasses}`;
    } else {
      // Default hover for words without alignment
      return `${baseClasses} hover:bg-gray-100/50`;
    }
  };

  return { getWordClassName };
} 