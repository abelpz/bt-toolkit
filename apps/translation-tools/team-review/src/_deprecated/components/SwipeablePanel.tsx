import React, { useRef, useEffect, useState } from 'react';
import { MobilePanel } from './MobilePanel';
import { PanelType } from './PanelSelector';
import { VerseText, TranslationNote, ReviewComment, AlignedWord } from '../types';

interface SwipeablePanelProps {
  currentPanel: PanelType;
  onPanelChange: (panel: PanelType) => void;
  availableResources: PanelType[];
  ultVerse?: VerseText;
  ustVerse?: VerseText;
  notes: TranslationNote[];
  comments: ReviewComment[];
  onWordClick?: (word: AlignedWord, index: number, sourcePanelPosition?: 'top' | 'bottom') => void;
  onQuoteHover?: (quote: string, isHovering: boolean) => void;
  onAddComment?: (comment: any) => void;
  highlightedStrongs?: string[];
  className?: string;
  panelPosition?: 'top' | 'bottom';
}

// panelOrder is now determined by availableResources prop

export const SwipeablePanel: React.FC<SwipeablePanelProps> = ({
  currentPanel,
  onPanelChange,
  availableResources,
  ultVerse,
  ustVerse,
  notes,
  comments,
  onWordClick,
  onQuoteHover,
  onAddComment,
  highlightedStrongs = [],
  className = '',
  panelPosition = 'top'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const currentIndex = availableResources.indexOf(currentPanel);

  // Scroll to current panel when it changes
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const targetScrollLeft = currentIndex * container.clientWidth;
      container.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
    }
  }, [currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.touches[0].clientX;
    const walk = (startX - x) * 1; // Scroll speed multiplier
    containerRef.current.scrollLeft = scrollLeft + walk;
  };

  const handleTouchEnd = () => {
    if (!containerRef.current || !isDragging) return;
    setIsDragging(false);
    
    // Snap to nearest panel
    const container = containerRef.current;
    const panelWidth = container.clientWidth;
    const currentScroll = container.scrollLeft;
    const targetIndex = Math.round(currentScroll / panelWidth);
    const clampedIndex = Math.max(0, Math.min(targetIndex, availableResources.length - 1));
    
    if (clampedIndex !== currentIndex) {
      onPanelChange(availableResources[clampedIndex]);
    } else {
      // Snap back to current panel if not enough swipe
      container.scrollTo({
        left: currentIndex * panelWidth,
        behavior: 'smooth'
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.clientX);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.clientX;
    const walk = (startX - x) * 1;
    containerRef.current.scrollLeft = scrollLeft + walk;
  };

  const handleMouseUp = () => {
    if (!containerRef.current || !isDragging) return;
    setIsDragging(false);
    
    // Snap to nearest panel
    const container = containerRef.current;
    const panelWidth = container.clientWidth;
    const currentScroll = container.scrollLeft;
    const targetIndex = Math.round(currentScroll / panelWidth);
    const clampedIndex = Math.max(0, Math.min(targetIndex, availableResources.length - 1));
    
    if (clampedIndex !== currentIndex) {
      onPanelChange(availableResources[clampedIndex]);
    } else {
      container.scrollTo({
        left: currentIndex * panelWidth,
        behavior: 'smooth'
      });
    }
  };

  // Create a wrapper function to pass panel position to onWordClick
  const handleWordClick = (word: AlignedWord, index: number) => {
    if (onWordClick) {
      onWordClick(word, index, panelPosition);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`flex overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory ${className}`}
      style={{ 
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
        height: '100%',
        maxHeight: '100%'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {availableResources.map((panelType: PanelType) => (
        <div
          key={panelType}
          className="flex-shrink-0 snap-start"
          style={{ 
            minWidth: '100%', 
            width: '100%',
            height: '100%',
            maxHeight: '100%'
          }}
        >
          <MobilePanel
            panelType={panelType}
            ultVerse={ultVerse}
            ustVerse={ustVerse}
            notes={notes}
            comments={comments}
            onWordClick={handleWordClick}
            onQuoteHover={onQuoteHover}
            onAddComment={onAddComment}
            highlightedStrongs={highlightedStrongs}
            panelPosition={panelPosition}
            style={{ height: '100%', maxHeight: '100%' }}
          />
        </div>
      ))}
    </div>
  );
}; 