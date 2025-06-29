import React from 'react';
import { VerseText } from '../../types';
import { mergeWordsWithPunctuation } from './utils';
import { useWordAlignmentHighlighting } from '../../hooks/useWordAlignmentHighlighting';
import { useWordHighlightStyles } from '../../hooks/useWordHighlightStyles';

interface USTCardProps {
  verse: VerseText;
  resourceId?: string; // Optional resource ID for linked-panels integration
}



export const USTCard: React.FC<USTCardProps> = ({ verse, resourceId = 'ust-card' }) => {
  const mergedWords = mergeWordsWithPunctuation(verse.words);
  
  // Use custom hooks for highlighting logic
  const { handleWordHover, handleWordClick, getWordHighlightState } = useWordAlignmentHighlighting({
    resourceId,
    mergedWords,
    enableFiltering: true, // Enable filtering for scripture cards
  });
  
  const { getWordClassName } = useWordHighlightStyles({ colorScheme: 'emerald' });

  return (
    <div className="bg-gradient-to-br from-white to-emerald-50/30 border border-emerald-100/50 overflow-hidden h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="text-base leading-relaxed text-gray-800 break-words">

            {mergedWords.map((word, index) => {
              const alignmentKey = word.alignment ? `${word.alignment.content}-${word.alignment.strong}` : null;
              
              const highlightState = getWordHighlightState(alignmentKey);
              
              return (
                <span
                  key={word.originalIndex}
                  className={getWordClassName(highlightState)}
                  data-word-index={word.originalIndex}
                  data-word-text={word.text}
                  data-word-occurrence={word.occurrence}
                  data-word-occurrences={word.occurrences}
                  data-strong-number={word.alignment?.strong || ''}
                  data-greek-word={word.alignment?.content || ''}
                  data-lemma={word.alignment?.lemma || ''}
                  onMouseEnter={() => handleWordHover(
                    alignmentKey, 
                    word.alignment ? {
                      greekWord: word.alignment.content,
                      strongNumber: word.alignment.strong,
                      lemma: word.alignment.lemma
                    } : undefined
                  )}
                  onMouseLeave={() => handleWordHover(null)}
                  onClick={() => handleWordClick(
                    alignmentKey, 
                    word.alignment ? {
                      greekWord: word.alignment.content,
                      strongNumber: word.alignment.strong,
                      lemma: word.alignment.lemma
                    } : undefined
                  )}
                  title={
                    word.alignment
                      ? `${word.alignment.content} (${word.alignment.lemma}) - ${word.alignment.strong}`
                      : 'No alignment data'
                  }
                >
                  {word.displayText}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      
    </div>
  );
}; 