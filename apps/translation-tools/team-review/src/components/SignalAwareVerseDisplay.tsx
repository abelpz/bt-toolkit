import React, { useState, useEffect } from 'react';
import { useBaseResource } from './base/BaseResource';
import { useGlobalSignalListener, useCommonSignals } from '../hooks/useSignaling';
import { SIGNAL_TYPES, NavigateToVersePayload, HighlightTextPayload } from '../types/signaling';

interface SignalAwareVerseDisplayProps {
  panelId: string;
  resourceId: string;
  initialBook?: string;
  initialChapter?: number;
  initialVerse?: number;
  className?: string;
}

export const SignalAwareVerseDisplay: React.FC<SignalAwareVerseDisplayProps> = ({
  panelId,
  resourceId,
  initialBook = 'Genesis',
  initialChapter = 1,
  initialVerse = 1,
  className = ''
}) => {
  // Use the base resource hook for signaling capabilities
  const { state, setState, emitSignal } = useBaseResource(panelId, resourceId);
  
  // Use common signals helper
  const { navigateToVerse, highlightText, selectionChanged } = useCommonSignals(panelId, resourceId);
  
  // Component state
  const [currentVerse, setCurrentVerse] = useState({
    book: initialBook,
    chapter: initialChapter,
    verse: initialVerse
  });
  
  const [highlights, setHighlights] = useState<Map<string, HighlightTextPayload>>(new Map());
  const [selectedText, setSelectedText] = useState('');

  // Listen for navigation signals
  useGlobalSignalListener(
    SIGNAL_TYPES.NAVIGATE_TO_VERSE,
    async (signal) => {
      const payload = signal.payload as NavigateToVersePayload;
      setCurrentVerse({
        book: payload.book,
        chapter: payload.chapter,
        verse: payload.verse
      });
      
      // Emit a data updated signal to notify other components
      await emitSignal(SIGNAL_TYPES.DATA_UPDATED, {
        dataType: 'verse_navigation',
        resourceId,
        data: payload
      });
    },
    [resourceId]
  );

  // Listen for highlight signals
  useGlobalSignalListener(
    SIGNAL_TYPES.HIGHLIGHT_TEXT,
    async (signal) => {
      const payload = signal.payload as HighlightTextPayload;
      setHighlights(prev => new Map(prev.set(payload.highlightId, payload)));
    },
    []
  );

  // Listen for clear highlights signals
  useGlobalSignalListener(
    SIGNAL_TYPES.CLEAR_HIGHLIGHTS,
    async () => {
      setHighlights(new Map());
    },
    []
  );

  // Handle text selection
  const handleTextSelection = async () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      setSelectedText(text);
      
      // Emit selection changed signal
      await selectionChanged(
        text,
        `${currentVerse.book} ${currentVerse.chapter}:${currentVerse.verse}`
      );
    }
  };

  // Handle verse navigation
  const handleVerseClick = async (book: string, chapter: number, verse: number) => {
    await navigateToVerse(book, chapter, verse);
  };

  // Handle text highlighting
  const handleHighlight = async (text: string, color = '#ffeb3b') => {
    const highlightId = `highlight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await highlightText(text, 0, text.length, highlightId, color);
  };

  // Mock verse content - in a real app, this would come from a Bible API
  const getVerseContent = () => {
    return `In the beginning God created the heavens and the earth. (${currentVerse.book} ${currentVerse.chapter}:${currentVerse.verse})`;
  };

  // Apply highlights to text
  const renderHighlightedText = (text: string) => {
    let highlightedText = text;
    highlights.forEach((highlight, id) => {
      const style = `background-color: ${highlight.color || '#ffeb3b'}; padding: 2px 4px; border-radius: 3px;`;
      highlightedText = highlightedText.replace(
        highlight.text,
        `<span style="${style}" data-highlight-id="${id}">${highlight.text}</span>`
      );
    });
    return highlightedText;
  };

  if (!state.isVisible) {
    return null;
  }

  const componentClassName = [
    'signal-aware-verse-display p-4 border rounded-lg',
    className,
    state.isFocused ? 'ring-2 ring-blue-500 bg-blue-50' : '',
    state.isHighlighted ? 'ring-2 ring-yellow-500 bg-yellow-50' : ''
  ].filter(Boolean).join(' ');

  return (
    <div 
      id={`resource-${resourceId}`}
      className={componentClassName}
      data-resource-id={resourceId}
      data-panel-id={panelId}
      onMouseUp={handleTextSelection}
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">
          {currentVerse.book} {currentVerse.chapter}:{currentVerse.verse}
        </h3>
        
        <div 
          className="verse-content text-gray-800 leading-relaxed select-text"
          dangerouslySetInnerHTML={{ 
            __html: renderHighlightedText(getVerseContent()) 
          }}
        />
      </div>

      {/* Navigation Controls */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleVerseClick(currentVerse.book, currentVerse.chapter, Math.max(1, currentVerse.verse - 1))}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
        >
          Previous Verse
        </button>
        <button
          onClick={() => handleVerseClick(currentVerse.book, currentVerse.chapter, currentVerse.verse + 1)}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
        >
          Next Verse
        </button>
      </div>

      {/* Highlight Controls */}
      {selectedText && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-600 mb-2">
            Selected: "{selectedText}"
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleHighlight(selectedText, '#ffeb3b')}
              className="px-3 py-1 bg-yellow-200 hover:bg-yellow-300 rounded text-sm"
            >
              Highlight Yellow
            </button>
            <button
              onClick={() => handleHighlight(selectedText, '#4caf50')}
              className="px-3 py-1 bg-green-200 hover:bg-green-300 rounded text-sm"
            >
              Highlight Green
            </button>
            <button
              onClick={() => setSelectedText('')}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
        <div>Resource ID: {resourceId}</div>
        <div>Panel ID: {panelId}</div>
        <div>Focused: {state.isFocused ? 'Yes' : 'No'}</div>
        <div>Highlighted: {state.isHighlighted ? 'Yes' : 'No'}</div>
        <div>Active Highlights: {highlights.size}</div>
      </div>
    </div>
  );
}; 