import React, { useState, useEffect, useRef } from 'react';
import { TranslationNote } from '../../types';
import { useResourceAPI } from '../../libs/linked-panels';
import { createHighlightNoteQuoteMessage, createClearHighlightsMessage, WordAlignmentMessageTypes } from '../../plugins';
import { useGreekWordFiltering } from '../../hooks/useGreekWordFiltering';

interface TranslationNotesCardProps {
  notes: TranslationNote[];
  resourceId?: string; // Optional resource ID for linked-panels integration
}

export const TranslationNotesCard: React.FC<TranslationNotesCardProps> = ({ notes, resourceId = 'translation-notes' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Use linked-panels API for messaging
  const api = useResourceAPI<WordAlignmentMessageTypes['highlightNoteQuote'] | WordAlignmentMessageTypes['clearHighlights']>(resourceId);
  
  // Use filtering functionality
  const { activeFilter, hasActiveFilter, clearFilter, matchesFilter } = useGreekWordFiltering({
    resourceId
  });

  // Helper function to extract Greek words from a note's quote
  const extractGreekWordsFromNote = (note: TranslationNote): string[] => {
    // Check if the quote contains Greek characters
    const isGreekText = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(note.quote);
    if (isGreekText) {
      // Split Greek text into individual words, removing punctuation
      return note.quote
        .replace(/[^\u0370-\u03FF\u1F00-\u1FFF\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 0);
    }
    return [];
  };

  // Filter notes based on active filter
  const filteredNotes = notes.filter(note => {
    if (!hasActiveFilter) return true;
    
    const noteGreekWords = extractGreekWordsFromNote(note);
    return matchesFilter(noteGreekWords);
  });

  // Function to send highlight message for current note
  const sendHighlightMessage = (note: TranslationNote) => {
    const message = createHighlightNoteQuoteMessage(
      note.quote,
      note.occurrence,
      resourceId,
      `note-${currentIndex}`
    );
    api.messaging.sendToAll(message);
  };

  // Function to clear highlights
  const sendClearMessage = () => {
    const clearMessage = createClearHighlightsMessage(resourceId);
    api.messaging.sendToAll(clearMessage);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < (filteredNotes?.length || 0) - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Send highlight message when current note changes
  useEffect(() => {
    if (filteredNotes && filteredNotes.length > 0 && filteredNotes[currentIndex]) {
      sendHighlightMessage(filteredNotes[currentIndex]);
    }
  }, [currentIndex, filteredNotes]);

  // Reset current index when filter changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [hasActiveFilter]);

  // Separate effect for cleanup on unmount only
  useEffect(() => {
    // Cleanup function to clear highlights when component unmounts
    return () => {
      sendClearMessage();
    };
  }, []); // Empty dependency array means this only runs on mount/unmount

  // Keyboard navigation
  useEffect(() => {
    if (!filteredNotes || filteredNotes.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard events when the card is focused or contains focus
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
          setCurrentIndex(filteredNotes.length - 1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, filteredNotes]);

  // Handle empty notes array
  if (!notes || notes.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-purple-50/30 shadow-lg border border-purple-100/50 overflow-hidden h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p>No translation notes available</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle empty filtered notes
  if (filteredNotes.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-purple-50/30 shadow-lg border border-purple-100/50 overflow-hidden h-full flex flex-col">
        {/* Header with filter indicator */}
        <div className="px-4 py-2 bg-purple-50/50 border-b border-purple-100/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-purple-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xs text-purple-600 font-medium">Translation Notes</span>
            </div>
            {hasActiveFilter && (
              <button
                onClick={clearFilter}
                className="text-xs text-purple-600 hover:text-purple-700 underline"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">🔍</div>
            <p>No notes match the current filter</p>
            <p className="text-sm mt-2">
              Filtered by: {activeFilter?.greekWords.map(w => w.word).join(', ')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentNote = filteredNotes[currentIndex];
  const canGoUp = currentIndex > 0;
  const canGoDown = currentIndex < filteredNotes.length - 1;

  return (
    <div
      ref={cardRef}
      tabIndex={0}
      className="bg-gradient-to-br from-white to-purple-50/30   border border-purple-100/50 overflow-hidden h-full flex flex-col focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
    >
      {/* Header with navigation */}
      <div className="px-4 py-2 bg-purple-50/50 border-b border-purple-100/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-purple-600">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <span className="text-xs text-purple-600 font-medium">
              Note {currentIndex + 1} of {filteredNotes.length}
              {hasActiveFilter && (
                <span className="text-gray-500">
                  {' '}
                  (filtered from {notes.length})
                </span>
              )}
            </span>
          </div>

          {/* Filter indicator and clear button */}
          {hasActiveFilter && (
            <div className="flex items-center space-x-2">
              <div className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                {activeFilter!.greekWords.map((w) => w.word).join(', ')}
              </div>
              <button
                onClick={clearFilter}
                className="text-xs text-purple-600 hover:text-purple-700 underline"
              >
                Clear
              </button>
            </div>
          )}

          {/* Vertical Navigation Controls */}
          <div className="flex space-x-1">
            <button
              onClick={goToPrevious}
              disabled={!canGoUp}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                canGoUp
                  ? 'text-purple-600 hover:bg-purple-100 hover:text-purple-700'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="Previous note"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>
            <button
              onClick={goToNext}
              disabled={!canGoDown}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                canGoDown
                  ? 'text-purple-600 hover:bg-purple-100 hover:text-purple-700'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="Next note"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Current Note Content */}
      <div className="flex-1">
        <div className="bg-white/60  p-5 border-l-4 border-purple-400 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <button
              onClick={() => sendHighlightMessage(currentNote)}
              className="bg-gradient-to-r rounded-full from-purple-500 to-violet-600 text-white px-3 py-1 text-xs font-medium hover:from-purple-600 hover:to-violet-700 transition-all duration-200 cursor-pointer"
              title="Click to highlight words in translation panels"
            >
              "{currentNote?.quote}"
            </button>
            <span className="text-xs bg-gray-100 rounded-full text-gray-600 px-2 py-1 ">
              occurrence {currentNote?.occurrence}
            </span>
          </div>
          <div className="overflow-y-auto space-x-2">
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-800 leading-relaxed mb-4 text-base">
                {currentNote?.note}
              </p>
            </div>

            {currentNote?.supportReference && (
              <div className="flex items-center text-sm text-purple-600 bg-purple-50/50 px-3 py-2 rounded-lg mt-4">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                Reference: {currentNote?.supportReference}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 