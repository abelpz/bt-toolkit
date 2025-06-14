import React from 'react';
import { VerseDisplay } from './VerseDisplay';
import { TranslationNotes } from './TranslationNotes';
import { ReviewComments } from './ReviewComments';
import { AlignmentDataResource } from './AlignmentDataResource';
import { PanelType } from './PanelSelector';
import { VerseText, TranslationNote, ReviewComment, AlignedWord } from '../types';

interface MobilePanelProps {
  panelType: PanelType;
  ultVerse?: VerseText;
  ustVerse?: VerseText;
  notes: TranslationNote[];
  comments: ReviewComment[];
  onWordClick?: (word: AlignedWord, index: number) => void;
  onQuoteHover?: (quote: string, isHovering: boolean) => void;
  onAddComment?: (comment: any) => void;
  highlightedStrongs?: string[];
  className?: string;
  style?: React.CSSProperties;
  panelPosition?: 'top' | 'bottom';
}

export const MobilePanel: React.FC<MobilePanelProps> = ({
  panelType,
  ultVerse,
  ustVerse,
  notes,
  comments,
  onWordClick,
  onQuoteHover,
  onAddComment,
  highlightedStrongs = [],
  className = '',
  style,
  panelPosition = 'top'
}) => {
  const renderPanelContent = () => {
    switch (panelType) {
      case 'ult':
        return ultVerse ? (
          <VerseDisplay
            verse={ultVerse}
            title="Unfoldingword Literal Text (ULT)"
            onWordClick={onWordClick}
            highlightedStrongs={highlightedStrongs}
            panelId={`${panelPosition}-panel`}
            resourceId={`ult-${panelPosition}`}
            className="border-0 shadow-none bg-transparent p-0"
          />
        ) : (
          <div className="p-4 text-center text-gray-500">
            <span className="text-2xl">📖</span>
            <p className="mt-2">ULT verse not available</p>
          </div>
        );

      case 'ust':
        return ustVerse ? (
          <VerseDisplay
            verse={ustVerse}
            title="Unfoldingword Simplified Text (UST)"
            onWordClick={onWordClick}
            highlightedStrongs={highlightedStrongs}
            panelId={`${panelPosition}-panel`}
            resourceId={`ust-${panelPosition}`}
            className="border-0 shadow-none bg-transparent p-0"
          />
        ) : (
          <div className="p-4 text-center text-gray-500">
            <span className="text-2xl">📝</span>
            <p className="mt-2">UST verse not available</p>
          </div>
        );

      case 'tn':
        return (
          <TranslationNotes
            notes={notes}
            onQuoteHover={onQuoteHover}
            panelId={`${panelPosition}-panel`}
            resourceId={`translation-notes-${panelPosition}`}
            className="border-0 shadow-none bg-transparent p-0"
          />
        );

      case 'alignment':
        return (
          <AlignmentDataResource
            panelId={`${panelPosition}-panel`}
            resourceId={`alignment-resource-${panelPosition}`}
            verseRef="1:1"
            ultVerse={ultVerse}
            ustVerse={ustVerse}
            className="border-0 shadow-none bg-transparent"
          />
        );

      default:
        return (
          <div className="p-4 text-center text-gray-500">
            <span className="text-2xl">❓</span>
            <p className="mt-2">Unknown panel type</p>
          </div>
        );
    }
  };

  return (
    <div className={`bg-white flex flex-col ${className}`} style={{ height: '100%', ...style }}>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent p-1">
        {renderPanelContent()}
      </div>
    </div>
  );
}; 