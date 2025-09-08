/**
 * BCV Navigator - Iteration 2
 * Book/Chapter/Verse navigation with range selection support
 * Uses versification data for accurate chapter/verse counts
 */

import React, { useState, useEffect } from 'react';
import { RangeReference } from '../../types/navigation';
import { getBookVersification, getChapterVerseCount, getAllBooks } from '../../data/versification';

export interface BCVNavigatorProps {
  currentRange: RangeReference;
  onRangeSelect: (range: RangeReference) => void;
  availableBooks?: string[];
}

interface BCVState {
  selectedBook?: string;
  startChapter?: number;
  startVerse?: number;
  endChapter?: number;
  endVerse?: number;
  isRangeMode: boolean;
}

export const BCVNavigator: React.FC<BCVNavigatorProps> = ({
  currentRange,
  onRangeSelect,
  availableBooks
}) => {
  const [bcvState, setBcvState] = useState<BCVState>({
    selectedBook: currentRange.book,
    startChapter: currentRange.startChapter,
    startVerse: currentRange.startVerse,
    endChapter: currentRange.endChapter,
    endVerse: currentRange.endVerse,
    isRangeMode: !!(currentRange.endChapter || currentRange.endVerse)
  });

  const [step, setStep] = useState<'book' | 'start-chapter' | 'start-verse' | 'end-chapter' | 'end-verse'>('book');

  // Get available books with versification data
  const books = getAllBooks().filter(book => 
    !availableBooks || availableBooks.includes(book.code)
  );

  // Update state when currentRange changes
  useEffect(() => {
    setBcvState({
      selectedBook: currentRange.book,
      startChapter: currentRange.startChapter,
      startVerse: currentRange.startVerse,
      endChapter: currentRange.endChapter,
      endVerse: currentRange.endVerse,
      isRangeMode: !!(currentRange.endChapter || currentRange.endVerse)
    });
  }, [currentRange]);

  const handleBookSelect = (bookCode: string) => {
    setBcvState(prev => ({
      ...prev,
      selectedBook: bookCode,
      startChapter: 1,
      startVerse: 1,
      endChapter: undefined,
      endVerse: undefined
    }));
    setStep('start-chapter');
  };

  const handleStartChapterSelect = (chapter: number) => {
    setBcvState(prev => ({
      ...prev,
      startChapter: chapter,
      startVerse: 1
    }));
    setStep('start-verse');
  };

  const handleStartVerseSelect = (verse: number) => {
    setBcvState(prev => ({
      ...prev,
      startVerse: verse
    }));
    
    if (bcvState.isRangeMode) {
      setStep('end-chapter');
    } else {
      // Single verse selection - complete
      completeSelection();
    }
  };

  const handleEndChapterSelect = (chapter: number) => {
    setBcvState(prev => ({
      ...prev,
      endChapter: chapter,
      endVerse: 1
    }));
    setStep('end-verse');
  };

  const handleEndVerseSelect = (verse: number) => {
    setBcvState(prev => ({
      ...prev,
      endVerse: verse
    }));
    completeSelection();
  };

  const completeSelection = () => {
    if (!bcvState.selectedBook || !bcvState.startChapter || !bcvState.startVerse) return;

    const range: RangeReference = {
      book: bcvState.selectedBook,
      startChapter: bcvState.startChapter,
      startVerse: bcvState.startVerse,
      endChapter: bcvState.isRangeMode ? bcvState.endChapter : undefined,
      endVerse: bcvState.isRangeMode ? bcvState.endVerse : undefined
    };

    onRangeSelect(range);
  };

  const toggleRangeMode = () => {
    setBcvState(prev => ({
      ...prev,
      isRangeMode: !prev.isRangeMode,
      endChapter: undefined,
      endVerse: undefined
    }));
    
    if (bcvState.startVerse && !bcvState.isRangeMode) {
      setStep('end-chapter');
    }
  };

  const getCurrentBook = () => {
    return bcvState.selectedBook ? getBookVersification(bcvState.selectedBook) : null;
  };

  const getStepTitle = () => {
    switch (step) {
      case 'book': return 'Select Book';
      case 'start-chapter': return `Select Chapter in ${getCurrentBook()?.name}`;
      case 'start-verse': return `Select Starting Verse in Chapter ${bcvState.startChapter}`;
      case 'end-chapter': return 'Select Ending Chapter';
      case 'end-verse': return `Select Ending Verse in Chapter ${bcvState.endChapter}`;
      default: return 'Navigate';
    }
  };

  const renderBookSelection = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {getStepTitle()}
        </h3>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {books.length} available
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
        {books.map((book) => (
          <button
            key={book.code}
            onClick={() => handleBookSelect(book.code)}
            className={`
              p-2 text-left rounded-lg text-sm transition-colors duration-200
              ${book.code === bcvState.selectedBook
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border-2 border-blue-500'
                : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
              }
            `}
          >
            <div className="font-medium">{book.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {book.chapters.length} ch
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderChapterSelection = (isEndChapter = false) => {
    const book = getCurrentBook();
    if (!book) return null;

    const chapters = Array.from({ length: book.chapters.length }, (_, i) => i + 1);
    const selectedChapter = isEndChapter ? bcvState.endChapter : bcvState.startChapter;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {getStepTitle()}
          </h3>
          <button
            onClick={() => setStep(isEndChapter ? 'start-verse' : 'book')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back
          </button>
        </div>
        
        <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
          {chapters.map((chapter) => (
            <button
              key={chapter}
              onClick={() => isEndChapter ? handleEndChapterSelect(chapter) : handleStartChapterSelect(chapter)}
              className={`
                w-8 h-8 rounded text-xs font-medium transition-colors duration-200
                ${chapter === selectedChapter
                  ? 'bg-blue-500 dark:bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              {chapter}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderVerseSelection = (isEndVerse = false) => {
    const book = getCurrentBook();
    if (!book) return null;

    const chapter = isEndVerse ? bcvState.endChapter : bcvState.startChapter;
    if (!chapter) return null;

    const verseCount = getChapterVerseCount(book.code, chapter);
    const verses = Array.from({ length: verseCount }, (_, i) => i + 1);
    const selectedVerse = isEndVerse ? bcvState.endVerse : bcvState.startVerse;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {getStepTitle()}
          </h3>
          <button
            onClick={() => setStep(isEndVerse ? 'end-chapter' : 'start-chapter')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back
          </button>
        </div>
        
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          {verseCount} verses in chapter {chapter}
        </div>
        
        <div className="grid grid-cols-10 gap-1 max-h-32 overflow-y-auto">
          {verses.map((verse) => (
            <button
              key={verse}
              onClick={() => isEndVerse ? handleEndVerseSelect(verse) : handleStartVerseSelect(verse)}
              className={`
                w-6 h-6 rounded text-xs font-medium transition-colors duration-200
                ${verse === selectedVerse
                  ? 'bg-blue-500 dark:bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              {verse}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bcv-navigator space-y-4">
      {/* Range Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Navigation Mode
        </div>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={bcvState.isRangeMode}
            onChange={toggleRangeMode}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Range Selection
          </span>
        </label>
      </div>

      {/* Current Selection Display */}
      {bcvState.selectedBook && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Current Selection:
          </div>
          <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
            {bcvState.selectedBook.toUpperCase()} {bcvState.startChapter}:{bcvState.startVerse}
            {bcvState.isRangeMode && bcvState.endChapter && bcvState.endVerse && 
              `-${bcvState.endChapter}:${bcvState.endVerse}`}
          </div>
        </div>
      )}

      {/* Step Content */}
      {step === 'book' && renderBookSelection()}
      {step === 'start-chapter' && renderChapterSelection(false)}
      {step === 'start-verse' && renderVerseSelection(false)}
      {step === 'end-chapter' && renderChapterSelection(true)}
      {step === 'end-verse' && renderVerseSelection(true)}

      {/* Action Buttons */}
      {bcvState.selectedBook && bcvState.startChapter && bcvState.startVerse && (
        <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setStep('book')}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Start Over
          </button>
          
          {(!bcvState.isRangeMode || (bcvState.endChapter && bcvState.endVerse)) && (
            <button
              onClick={completeSelection}
              className="
                px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg
                hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200
                text-sm font-medium
              "
            >
              Go to Reference
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BCVNavigator;
