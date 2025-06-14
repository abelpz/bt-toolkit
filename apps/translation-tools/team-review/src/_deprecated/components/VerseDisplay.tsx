import React, { useState, useEffect } from 'react';
import { useBaseResource } from './base/BaseResource';
import { useGlobalSignalListener } from '../hooks/useSignaling';
import { SignalBus } from '../services/SignalBus';
import { 
  SIGNAL_TYPES, 
  HighlightQuotePayload,
  HighlightAlignmentPayload,
  SetHighlightingPayload,
  ClearHighlightingPayload,
  ResourceDismissedPayload,
  HighlightingKey,
  PanelId,
  ResourceId 
} from '../types/signaling';
import { VerseText, AlignedWord } from '../types';

interface VerseDisplayProps {
  verse: VerseText;
  title: string;
  onWordClick?: (word: AlignedWord, index: number) => void;
  highlightedStrongs?: string[];
  className?: string;
  panelId?: PanelId;
  resourceId?: ResourceId;
}

export const VerseDisplay: React.FC<VerseDisplayProps> = ({
  verse,
  title,
  onWordClick,
  highlightedStrongs = [],
  className = '',
  panelId = 'default-panel',
  resourceId = 'verse-display'
}) => {
  const [hoveredAlignment, setHoveredAlignment] = useState<string | null>(null);
  
  // New key-based highlighting system
  const [activeHighlighting, setActiveHighlighting] = useState<Map<HighlightingKey, any>>(new Map());
  
  const { state, emitSignal } = useBaseResource(panelId, resourceId);

  // Handle new highlighting system
  useGlobalSignalListener(
    SIGNAL_TYPES.SET_HIGHLIGHTING,
    async (signal) => {
      const payload = signal.payload as SetHighlightingPayload;
      console.log('VerseDisplay received SET_HIGHLIGHTING signal:', payload);
      
      setActiveHighlighting(prev => {
        const newMap = new Map(prev);
        newMap.set(payload.key, payload.data);
        return newMap;
      });
      
      // Handle temporary highlighting
      if (payload.data.temporary) {
        const duration = payload.data.duration || 5000;
        setTimeout(() => {
          setActiveHighlighting(prev => {
            const newMap = new Map(prev);
            newMap.delete(payload.key);
            return newMap;
          });
        }, duration);
      }
    },
    [resourceId]
  );

  useGlobalSignalListener(
    SIGNAL_TYPES.CLEAR_HIGHLIGHTING,
    async (signal) => {
      const payload = signal.payload as ClearHighlightingPayload;
      console.log('VerseDisplay received CLEAR_HIGHLIGHTING signal:', payload);
      
      setActiveHighlighting(prev => {
        const newMap = new Map(prev);
        newMap.delete(payload.key);
        return newMap;
      });
    },
    [resourceId]
  );

  // Handle resource dismissed events to clear highlighting
  useGlobalSignalListener(
    SIGNAL_TYPES.RESOURCE_DISMISSED,
    async (signal) => {
      const payload = signal.payload as ResourceDismissedPayload;
      console.log('VerseDisplay received RESOURCE_DISMISSED signal:', payload);
      
      // Clear highlighting based on resource type
      if (payload.resourceId.includes('translation-notes')) {
        setActiveHighlighting(prev => {
          const newMap = new Map(prev);
          newMap.delete('translation_notes');
          return newMap;
        });
        
        // Also emit clear signal for other components
        emitSignal(SIGNAL_TYPES.CLEAR_HIGHLIGHTING, {
          key: 'translation_notes',
          reason: 'resource_dismissed'
        });
      }
    },
    [emitSignal]
  );

  // Handle word clicks
  const handleWordClick = (word: AlignedWord, index: number) => {
    if (word.alignment) {
      // Clear other highlighting types
      setActiveHighlighting(prev => {
        const newMap = new Map(prev);
        newMap.delete('translation_notes');
        return newMap;
      });
      
      // Set word click highlighting
      const alignmentKey = `${word.alignment.strong}_${word.alignment.occurrence}`;
      emitSignal(SIGNAL_TYPES.SET_HIGHLIGHTING, {
        key: 'word_click',
        data: {
          alignmentKey,
          color: 'bg-blue-200',
          temporary: false
        }
      });
      
      // Call the original onWordClick handler for alignment panel functionality
      if (onWordClick) {
        onWordClick(word, index);
      }
    }
  };

  // Helper functions for highlighting checks
  const isWordHighlighted = (word: AlignedWord): boolean => {
    return word.alignment ? highlightedStrongs.includes(word.alignment.strong) : false;
  };

  const isWordHovered = (word: AlignedWord): boolean => {
    if (!word.alignment || !hoveredAlignment) return false;
    const alignmentKey = `${word.alignment.strong}_${word.alignment.occurrence}`;
    return alignmentKey === hoveredAlignment;
  };

  const isWordQuoteHighlighted = (word: AlignedWord): boolean => {
    const translationNotesData = activeHighlighting.get('translation_notes');
    if (!translationNotesData || !word.alignment) return false;
    
    const wordContent = word.alignment.content;
    const quoteContent = translationNotesData.quote;
    const wordOccurrence = word.alignment.occurrence;
    const quoteOccurrence = translationNotesData.occurrence;
    
    if (!quoteContent) return false;
    
    // Split quote into words and check if current word is included
    const quoteWords = quoteContent.split(/\s+/);
    const isPartOfQuote = quoteWords.includes(wordContent);
    const occurrenceMatches = wordOccurrence === quoteOccurrence;
    
    return isPartOfQuote && occurrenceMatches;
  };

  const isWordClickHighlighted = (word: AlignedWord): boolean => {
    const wordClickData = activeHighlighting.get('word_click');
    if (!wordClickData || !word.alignment) return false;
    
    const alignmentKey = `${word.alignment.strong}_${word.alignment.occurrence}`;
    return alignmentKey === wordClickData.alignmentKey;
  };

  const getWordClassName = (word: AlignedWord): string => {
    const baseClasses = 'inline-block px-1 mx-0.5 py-1 rounded-md transition-all duration-300 ease-out cursor-pointer';
    const isHighlighted = isWordHighlighted(word);
    const isHovered = isWordHovered(word);
    const isQuoteHighlighted = isWordQuoteHighlighted(word);
    const isClickHighlighted = isWordClickHighlighted(word);
    const hasAlignment = !!word.alignment;
    
    // Word click highlighting takes highest priority
    if (isClickHighlighted) {
      return `${baseClasses} bg-blue-200 text-blue-900 shadow-sm ring-2 ring-blue-300`;
    }
    
    // Quote highlighting takes second priority
    if (isQuoteHighlighted) {
      return `${baseClasses} bg-yellow-200 text-yellow-900 shadow-sm ring-2 ring-yellow-300`;
    }
    
    // Legacy Strong's highlighting
    if (isHighlighted) {
      return `${baseClasses} bg-slate-900 text-white shadow-sm transform scale-105`;
    }
    
    // Hover highlighting
    if (isHovered) {
      return `${baseClasses} bg-blue-100 text-blue-900 shadow-sm`;
    }
    
    // Default alignment styling
    if (hasAlignment) {
      return `${baseClasses} hover:bg-slate-100 text-slate-700 hover:shadow-sm`;
    }
    
    return `${baseClasses} text-slate-600`;
  };

  const handleWordHover = (word: AlignedWord, isEntering: boolean) => {
    if (word.alignment && isEntering) {
      const alignmentKey = `${word.alignment.strong}_${word.alignment.occurrence}`;
      setHoveredAlignment(alignmentKey);
    } else if (!isEntering) {
      setHoveredAlignment(null);
    }
  };

  // Merge punctuation with adjacent words
  const mergeWordsWithPunctuation = (words: AlignedWord[]): AlignedWord[] => {
    const merged: AlignedWord[] = [];
    
    for (let i = 0; i < words.length; i++) {
      const currentWord = words[i];
      const nextWord = words[i + 1];
      
      // Check if current word is punctuation
      const isPunctuation = /^[.,;:!?"""''()[\]{}—–-]+$/.test(currentWord.text.trim());
      
      if (isPunctuation && merged.length > 0) {
        // Merge punctuation with previous word
        const lastMerged = merged[merged.length - 1];
        merged[merged.length - 1] = {
          ...lastMerged,
          text: lastMerged.text + currentWord.text
        };
      } else if (nextWord && /^[.,;:!?"""''()[\]{}—–-]+$/.test(nextWord.text.trim())) {
        // Merge next punctuation with current word
        merged.push({
          ...currentWord,
          text: currentWord.text + nextWord.text
        });
        i++; // Skip the next word since we merged it
      } else {
        // Regular word, add as is
        merged.push(currentWord);
      }
    }
    
    return merged;
  };

  const mergedWords = mergeWordsWithPunctuation(verse.words);

  if (!state.isVisible) {
    return null;
  }

  return (
    <div 
      id={`resource-${resourceId}`}
      className={className}
      data-resource-id={resourceId}
      data-panel-id={panelId}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-full">
          {verse.reference}
        </span>
      </div>
      
      <div className="text-base leading-relaxed font-normal text-slate-700">
        {mergedWords.map((word, index) => (
          <span
            key={index}
            className={getWordClassName(word)}
            onClick={() => handleWordClick(word, index)}
            onMouseEnter={() => handleWordHover(word, true)}
            onMouseLeave={() => handleWordHover(word, false)}
          >
            {word.text}
            {index < mergedWords.length - 1 && ' '}
          </span>
        ))}
      </div>
    </div>
  );
}; 