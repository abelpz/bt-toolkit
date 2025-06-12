import React, { useState } from 'react';
import { VerseText, AlignedWord } from '../types';

interface VerseDisplayProps {
  verse: VerseText;
  title: string;
  onWordClick?: (word: AlignedWord, index: number) => void;
  highlightedStrongs?: string[];
  className?: string;
}

export const VerseDisplay: React.FC<VerseDisplayProps> = ({
  verse,
  title,
  onWordClick,
  highlightedStrongs = [],
  className = ''
}) => {
  const [hoveredWord, setHoveredWord] = useState<number | null>(null);

  const isWordHighlighted = (word: AlignedWord): boolean => {
    return word.alignment ? highlightedStrongs.includes(word.alignment.strong) : false;
  };

  const getWordClassName = (word: AlignedWord, index: number): string => {
    const baseClasses = 'inline-block px-1.5 py-1 rounded-md transition-all duration-300 ease-out';
    const isHighlighted = isWordHighlighted(word);
    const isHovered = hoveredWord === index;
    const hasAlignment = !!word.alignment;
    
    if (isHighlighted) {
      return `${baseClasses} bg-slate-900 text-white shadow-sm transform scale-105`;
    }
    
    if (isHovered && hasAlignment) {
      return `${baseClasses} bg-slate-100 text-slate-900 shadow-sm`;
    }
    
    if (hasAlignment) {
      return `${baseClasses} hover:bg-slate-50 cursor-pointer text-slate-700 hover:shadow-sm`;
    }
    
    return `${baseClasses} text-slate-600`;
  };

  const handleWordClick = (word: AlignedWord, index: number) => {
    if (word.alignment && onWordClick) {
      onWordClick(word, index);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-light text-slate-800 tracking-wide">
          {title}
        </h3>
        <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-full">
          {verse.reference}
        </span>
      </div>
      
      <div className="text-lg leading-relaxed font-light text-slate-700">
        {verse.words.map((word, index) => (
          <span
            key={index}
            className={getWordClassName(word, index)}
            onClick={() => handleWordClick(word, index)}
            onMouseEnter={() => setHoveredWord(index)}
            onMouseLeave={() => setHoveredWord(null)}
            onTouchStart={() => setHoveredWord(index)}
            onTouchEnd={() => setTimeout(() => setHoveredWord(null), 2000)}
            title={word.alignment ? 
              `${word.alignment.lemma} (${word.alignment.strong}) - ${word.alignment.morph}` : 
              undefined
            }
          >
            {word.text}
            {index < verse.words.length - 1 && !word.text.match(/[.,;:!?]$/) && ' '}
          </span>
        ))}
      </div>
      
      {hoveredWord !== null && verse.words[hoveredWord]?.alignment && (
        <div className="mt-6 p-4 bg-slate-50/50 rounded-xl border border-slate-200/50">
          <div className="flex items-center mb-3">
            <div className="w-2 h-2 rounded-full bg-slate-400 mr-3"></div>
            <div className="font-medium text-slate-700 text-sm">Alignment Details</div>
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex">
              <span className="font-medium text-slate-500 w-20">Greek</span>
              <span className="font-mono">{verse.words[hoveredWord].alignment!.content}</span>
              <span className="ml-2 text-slate-400">({verse.words[hoveredWord].alignment!.lemma})</span>
            </div>
            <div className="flex">
              <span className="font-medium text-slate-500 w-20">Strong's</span>
              <span className="font-mono">{verse.words[hoveredWord].alignment!.strong}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-slate-500 w-20">Morph</span>
              <span className="font-mono text-xs">{verse.words[hoveredWord].alignment!.morph}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 