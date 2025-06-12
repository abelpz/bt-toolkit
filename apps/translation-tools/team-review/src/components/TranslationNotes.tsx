import React from 'react';
import { TranslationNote } from '../types';

interface TranslationNotesProps {
  notes: TranslationNote[];
  onQuoteHover?: (quote: string, isHovering: boolean) => void;
  className?: string;
}

export const TranslationNotes: React.FC<TranslationNotesProps> = ({
  notes,
  onQuoteHover,
  className = ''
}) => {
  const handleQuoteMouseEnter = (quote: string) => {
    if (onQuoteHover) {
      onQuoteHover(quote, true);
    }
  };

  const handleQuoteMouseLeave = (quote: string) => {
    if (onQuoteHover) {
      onQuoteHover(quote, false);
    }
  };

  const renderNoteContent = (note: string) => {
    // Simple markdown-like rendering for **bold** text
    return note.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  if (notes.length === 0) {
    return (
      <div className={className}>
        <h3 className="text-lg font-light text-slate-800 tracking-wide mb-4">
          Translation Notes
        </h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-slate-400 text-xl">◒</span>
          </div>
          <p className="text-slate-500 font-light">No notes available for this verse</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-light text-slate-800 tracking-wide">
          Translation Notes
        </h3>
        <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-full">
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </span>
      </div>
      
      <div className="space-y-6">
        {notes.map((note) => (
          <div key={note.id} className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-slate-300 to-transparent"></div>
            <div className="pl-6">
              <div className="mb-3">
                <span 
                  className="inline-block bg-slate-900 text-white px-3 py-1.5 rounded-full text-sm font-mono cursor-pointer hover:bg-slate-700 transition-all duration-300 shadow-sm"
                  onMouseEnter={() => handleQuoteMouseEnter(note.quote)}
                  onMouseLeave={() => handleQuoteMouseLeave(note.quote)}
                  title="Hover to highlight in text above"
                >
                  {note.quote}
                </span>
                {note.occurrence > 1 && (
                  <span className="ml-3 text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                    #{note.occurrence}
                  </span>
                )}
              </div>
              
              <div 
                className="text-slate-600 leading-relaxed font-light"
                dangerouslySetInnerHTML={{ __html: renderNoteContent(note.note) }}
              />
              
              {note.supportReference && (
                <div className="mt-4">
                  <a 
                    href={`#${note.supportReference}`}
                    className="inline-flex items-center text-slate-500 hover:text-slate-700 text-sm transition-colors"
                    title="View translation academy article"
                  >
                    <div className="w-1 h-1 rounded-full bg-slate-400 mr-2"></div>
                    Translation Academy Reference
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 