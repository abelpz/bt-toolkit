import React, { useState, useEffect, useRef } from 'react';
import { VerseText } from '../../types';
import { useGreekWordFiltering } from '../../hooks/useGreekWordFiltering';

interface AlignmentDataCardProps {
  verse: VerseText;
  resourceId?: string;
}

export const AlignmentDataCard: React.FC<AlignmentDataCardProps> = ({ verse, resourceId = 'alignment-data' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Use filtering functionality
  const { activeFilter, hasActiveFilter, clearFilter, matchesFilter } = useGreekWordFiltering({
    resourceId
  });

  const alignedWords = verse.words.filter((word) => word.alignment);
  
  // Filter alignments based on active filter
  const filteredAlignments = alignedWords.filter(word => {
    if (!hasActiveFilter) return true;
    
    return matchesFilter([word.alignment!.content], [word.alignment!.strong]);
  });

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < filteredAlignments.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Reset current index when filter changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [hasActiveFilter]);

  // Keyboard navigation
  useEffect(() => {
    if (filteredAlignments.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!cardRef.current?.contains(document.activeElement)) {
        return;
      }

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          goToPrevious();
          break;
        case 'ArrowDown':
          event.preventDefault();
          goToNext();
          break;
        case 'Home':
          event.preventDefault();
          setCurrentIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setCurrentIndex(filteredAlignments.length - 1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, filteredAlignments.length]);

  // Handle empty alignments array
  if (!alignedWords || alignedWords.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-amber-50/30 border border-amber-100/50 overflow-hidden h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">🔗</div>
            <p>No word alignments available</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle empty filtered alignments
  if (filteredAlignments.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-amber-50/30 border border-amber-100/50 overflow-hidden h-full flex flex-col">
        {/* Header with filter indicator */}
        <div className="px-4 py-2 bg-amber-50/50 border-b border-amber-100/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-amber-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <span className="text-xs text-amber-600 font-medium">Alignments</span>
            </div>
            {hasActiveFilter && (
              <button
                onClick={clearFilter}
                className="text-xs text-amber-600 hover:text-amber-700 underline"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">🔍</div>
            <p>No alignments match the current filter</p>
            <p className="text-sm mt-2">
              Filtered by: {activeFilter?.greekWords.map(w => w.word).join(', ')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentWord = filteredAlignments[currentIndex];
  const canGoUp = currentIndex > 0;
  const canGoDown = currentIndex < filteredAlignments.length - 1;

    return (
    <div 
      ref={cardRef}
      tabIndex={0}
      className="bg-gradient-to-br from-white to-amber-50/30  border border-amber-100/50 overflow-hidden h-full flex flex-col focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-opacity-50"
    >
      {/* Header with navigation */}
      <div className="px-4 py-2 bg-amber-50/50 border-b border-amber-100/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-amber-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <span className="text-xs text-amber-600 font-medium">
              Alignment {currentIndex + 1} of {filteredAlignments.length}
              {hasActiveFilter && (
                <span className="text-gray-500"> (filtered from {alignedWords.length})</span>
              )}
            </span>
          </div>
          
          {/* Filter indicator and clear button */}
          {hasActiveFilter && (
            <div className="flex items-center space-x-2">
              <div className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                {activeFilter!.greekWords.map(w => w.word).join(', ')}
              </div>
              <button
                onClick={clearFilter}
                className="text-xs text-amber-600 hover:text-amber-700 underline"
              >
                Clear
              </button>
            </div>
          )}
          
          {/* Navigation Controls */}
          <div className="flex space-x-1">
            <button
              onClick={goToPrevious}
              disabled={!canGoUp}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                canGoUp
                  ? 'text-amber-600 hover:bg-amber-100 hover:text-amber-700'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="Previous alignment"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              disabled={!canGoDown}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                canGoDown
                  ? 'text-amber-600 hover:bg-amber-100 hover:text-amber-700'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="Next alignment"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Current Alignment Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <div className="bg-white/60 rounded-lg p-3 border border-amber-200/50">
            <div className="space-y-3">
              {/* Alignment Flow */}
              <div className="flex items-center justify-center space-x-2">
                <div className="bg-amber-100/50 px-2 py-1 rounded text-center">
                  <span className="font-medium text-gray-800 text-sm">
                    "{currentWord.text}"
                  </span>
                </div>
                
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white px-2 py-1 rounded text-center">
                  <span className="font-bold text-sm">
                    {currentWord.alignment!.content}
                  </span>
                </div>
              </div>
              
              {/* Compact Details */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-amber-700 font-medium">Lemma:</span>
                  <span className="text-gray-900">({currentWord.alignment!.lemma})</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-amber-700 font-medium">Strong's:</span>
                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs">
                    {currentWord.alignment!.strong}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-amber-700 font-medium">Occurrence:</span>
                  <span className="text-gray-900">
                    {currentWord.occurrence}/{currentWord.occurrences}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    
    </div>
  );
}; 