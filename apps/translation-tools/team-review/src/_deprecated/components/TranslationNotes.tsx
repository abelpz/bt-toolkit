import React, { useState, useEffect } from 'react';
import { useBaseResource } from './base/BaseResource';
import { SignalBus } from '../services/SignalBus';
import { 
  Signal, 
  SIGNAL_TYPES, 
  NavigateToNotePayload,
  ShowNotePayload,
  SetHighlightingPayload,
  PanelId,
  ResourceId 
} from '../types/signaling';
import { TranslationNote } from '../types';

interface TranslationNotesProps {
  notes: TranslationNote[];
  onQuoteHover?: (quote: string, isHovering: boolean) => void;
  className?: string;
  panelId?: PanelId;
  resourceId?: ResourceId;
}

export const TranslationNotes: React.FC<TranslationNotesProps> = ({
  notes,
  onQuoteHover,
  className = '',
  panelId = 'default-panel',
  resourceId = 'translation-notes'
}) => {
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const { state, emitSignal } = useBaseResource(panelId, resourceId);
  const signalBus = SignalBus.getInstance();

  // Emit highlighting when the current note changes (only when component is mounted and visible)
  useEffect(() => {
    // Only emit if we have notes and the component is currently visible
    if (notes.length > 0 && state.isVisible) {
      const currentNote = notes[currentNoteIndex];
      console.log('Note changed, setting translation notes highlighting:', {
        quote: currentNote.quote,
        occurrence: currentNote.occurrence,
        resourceId
      });
      
      // Use new highlighting system
      emitSignal(SIGNAL_TYPES.SET_HIGHLIGHTING, {
        key: 'translation_notes',
        data: {
          quote: currentNote.quote,
          occurrence: currentNote.occurrence,
          color: 'bg-yellow-200',
          temporary: false
        }
      });
    }
  }, [currentNoteIndex, notes.length]); // Only depend on note changes, not visibility

  // Emit dismiss signal and clear highlighting when component becomes invisible
  useEffect(() => {
    if (!state.isVisible) {
      console.log('TranslationNotes became invisible, emitting dismiss signal');
      
      // Emit resource dismissed signal
      emitSignal(SIGNAL_TYPES.RESOURCE_DISMISSED, {
        resourceId,
        resourceType: 'translation-notes',
        reason: 'hidden'
      });
      
      // Clear translation notes highlighting
      emitSignal(SIGNAL_TYPES.CLEAR_HIGHLIGHTING, {
        key: 'translation_notes',
        reason: 'resource_dismissed'
      });
    }
  }, [state.isVisible]); // Removed emitSignal and resourceId from dependencies

  // Handle signals for navigation
  useEffect(() => {
    const handleSignal = async (signal: Signal) => {
      switch (signal.type) {
        case SIGNAL_TYPES.NAVIGATE_TO_NOTE: {
          const payload = signal.payload as NavigateToNotePayload;
          if (signal.target?.panelId === panelId || !signal.target?.panelId) {
            const targetIndex = notes.findIndex(note => note.id === payload.noteId);
            if (targetIndex !== -1) {
              setCurrentNoteIndex(targetIndex);
            }
          }
          break;
        }

        case SIGNAL_TYPES.SHOW_NOTE: {
          const payload = signal.payload as ShowNotePayload;
          if (signal.target?.panelId === panelId || !signal.target?.panelId) {
            const targetIndex = notes.findIndex(note => note.id === payload.noteId);
            if (targetIndex !== -1) {
              setCurrentNoteIndex(targetIndex);
            }
          }
          break;
        }
      }
    };

    // Subscribe to signals
    const unsubscribeNavigate = signalBus.onGlobal(SIGNAL_TYPES.NAVIGATE_TO_NOTE, handleSignal);
    const unsubscribeShow = signalBus.onGlobal(SIGNAL_TYPES.SHOW_NOTE, handleSignal);
    
    return () => {
      unsubscribeNavigate();
      unsubscribeShow();
    };
  }, [panelId, signalBus, notes]);

  const handleQuoteMouseEnter = (quote: string) => {
    if (onQuoteHover) {
      onQuoteHover(quote, true);
    }
    
    // Hover can provide additional visual feedback if needed
    // The persistent highlighting is now handled by the useEffect above
  };

  const handleQuoteMouseLeave = (quote: string) => {
    if (onQuoteHover) {
      onQuoteHover(quote, false);
    }
    
    // Don't clear highlights on mouse leave since we want persistent highlighting
    // The highlighting will only clear when navigating to a different note or hiding the panel
  };

  const renderNoteContent = (note: string) => {
    // Simple markdown-like rendering for **bold** text
    return note.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  const goToPrevious = () => {
    setCurrentNoteIndex(prev => 
      prev > 0 ? prev - 1 : notes.length - 1
    );
  };

  const goToNext = () => {
    setCurrentNoteIndex(prev => 
      prev < notes.length - 1 ? prev + 1 : 0
    );
  };

  const handleNoteClick = async (note: TranslationNote) => {
    // Emit signal when note is clicked for potential cross-panel interactions
    await emitSignal(SIGNAL_TYPES.SHOW_NOTE, {
      noteId: note.id,
      quote: note.quote
    });
    
    // Highlighting is now handled automatically by the useEffect when the note is selected
  };

  if (notes.length === 0) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <p className="text-xs font-medium">No notes available</p>
          <p className="text-xs text-gray-400">No notes for this verse</p>
        </div>
      </div>
    );
  }

  const currentNote = notes[currentNoteIndex];

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
      {/* Minimal Navigation - Only show if multiple notes */}
      {notes.length > 1 && (
        <div className="flex items-center justify-center px-2 py-2 mb-3 bg-gray-50/30 rounded-lg border border-gray-100">
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-500 font-medium tabular-nums">
              {currentNoteIndex + 1} / {notes.length}
            </span>
            <div className="flex space-x-1">
              {notes.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentNoteIndex(index)}
                  className={`w-6 h-6 rounded-full transition-all duration-200 flex items-center justify-center ${
                    index === currentNoteIndex 
                      ? 'bg-slate-50' 
                      : 'hover:bg-gray-100'
                  }`}
                  title={`Go to note ${index + 1}`}
                >
                  <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentNoteIndex 
                      ? 'bg-slate-500' 
                      : 'bg-gray-300'
                  }`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Compact Current Note */}
      <div 
        className="group cursor-pointer p-3 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50 transition-all duration-200"
        onClick={() => handleNoteClick(currentNote)}
      >
        {/* Quote - Compact Hero */}
        <div className="mb-3">
          <div className="flex items-center space-x-2">
            <span 
              className="inline-flex items-center bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-mono cursor-pointer hover:bg-slate-700 transition-all duration-300"
              onMouseEnter={() => handleQuoteMouseEnter(currentNote.quote)}
              onMouseLeave={() => handleQuoteMouseLeave(currentNote.quote)}
              title="Hover to highlight in text above"
            >
              {currentNote.quote}
            </span>
            {currentNote.occurrence > 1 && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium">
                #{currentNote.occurrence}
              </span>
            )}
          </div>
        </div>
        
        {/* Note Content - Compact */}
        <div 
          className="text-gray-700 leading-relaxed text-xs"
          dangerouslySetInnerHTML={{ __html: renderNoteContent(currentNote.note) }}
        />
        
        {/* Translation Academy Reference - Compact */}
        {currentNote.supportReference && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <a 
              href={`#${currentNote.supportReference}`}
              className="inline-flex items-center text-gray-500 hover:text-gray-700 text-xs transition-colors"
              title="View translation academy article"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="mr-1">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              TA Reference
            </a>
          </div>
        )}
      </div>
    </div>
  );
}; 