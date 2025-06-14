import React, { useState, useEffect, useRef } from 'react';
import { VerseText } from '../../types';

interface GreekWordsCardProps {
  verse: VerseText;
}

export const GreekWordsCard: React.FC<GreekWordsCardProps> = ({ verse }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const greekWords = verse.words
    .filter((word) => word.alignment)
    .reduce((acc, word) => {
      const key = word.alignment!.content;
      if (!acc[key]) {
        acc[key] = {
          greek: word.alignment!.content,
          lemma: word.alignment!.lemma,
          strong: word.alignment!.strong,
          spanish: [],
        };
      }
      acc[key].spanish.push(word.text);
      return acc;
    }, {} as Record<string, any>);

  const wordsArray = Object.values(greekWords);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < wordsArray.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (wordsArray.length === 0) return;

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
          setCurrentIndex(wordsArray.length - 1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, wordsArray.length]);

  // Handle empty words array
  if (!wordsArray || wordsArray.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-indigo-50/30 border border-indigo-100/50 overflow-hidden h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">🏛️</div>
            <p>No Greek words available</p>
          </div>
        </div>
      </div>
    );
  }

  const currentWord = wordsArray[currentIndex] as any;
  const canGoUp = currentIndex > 0;
  const canGoDown = currentIndex < wordsArray.length - 1;

  return (
    <div 
      ref={cardRef}
      tabIndex={0}
      className="bg-gradient-to-br from-white to-indigo-50/30 border border-indigo-100/50 overflow-hidden h-full flex flex-col focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
    >
      {/* Header with navigation */}
      <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-100/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-indigo-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <span className="text-xs text-indigo-600 font-medium">
              Word {currentIndex + 1} of {wordsArray.length}
            </span>
          </div>
          
          {/* Navigation Controls */}
          <div className="flex space-x-1">
            <button
              onClick={goToPrevious}
              disabled={!canGoUp}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                canGoUp
                  ? 'text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="Previous word"
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
                  ? 'text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="Next word"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Current Word Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <div className="bg-white/60 rounded-lg p-3 border border-indigo-200/50">
            <div className="space-y-3">
              {/* Greek Word Display */}
              <div className="text-center">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-3 py-2 rounded-lg inline-block">
                  <span className="font-bold text-xl">{currentWord.greek}</span>
                </div>
              </div>
              
              {/* Compact Details */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-indigo-700 font-medium">Lemma:</span>
                  <span className="text-gray-900">({currentWord.lemma})</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-indigo-700 font-medium">Strong's:</span>
                  <span className="bg-indigo-500 text-white px-2 py-0.5 rounded-full text-xs">
                    {currentWord.strong}
                  </span>
                </div>
                
                <div className="flex justify-between items-start">
                  <span className="text-indigo-700 font-medium">Spanish:</span>
                  <span className="text-gray-900 text-right flex-1 ml-2">
                    {currentWord.spanish.join(', ')}
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