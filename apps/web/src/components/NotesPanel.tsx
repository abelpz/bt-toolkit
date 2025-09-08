/**
 * Notes Panel - Smart Data Integration
 * Displays Translation Notes with priority-based fetching and optimistic rendering
 */

import React, { useMemo } from 'react';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { RangeReference } from '../types/navigation';
import { useSmartNotesData } from '../hooks/useSmartData';
import type { TranslationNote } from '../services/door43-api';

export interface NotesPanelProps {
  currentRange?: RangeReference;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ currentRange }) => {
  // Use current range or default to Jonah
  const range = currentRange || { book: 'jon', startChapter: 1, startVerse: 1 };
  
  // Use smart data hook for optimistic loading
  const { data: notesData, isLoading, isRefreshing, error } = useSmartNotesData(
    range,
    true
  );

  console.log('📝 NotesPanel:', { 
    range, 
    hasData: !!notesData, 
    isLoading, 
    isRefreshing,
    notesCount: notesData?.notes?.length || 0
  });

  // Filter notes by current range
  const filteredNotes = useMemo(() => {
    if (!notesData?.notes || !currentRange) return notesData?.notes || [];
    
    return notesData.notes.filter((note: TranslationNote) => {
      // Parse chapter and verse from reference (e.g., "1:1" -> chapter: 1, verse: 1)
      const refParts = note.reference.split(':');
      const noteChapter = parseInt(refParts[0] || '1');
      const noteVerse = parseInt(refParts[1] || '1');
      
      // Check if note is within the current range
      if (noteChapter < currentRange.startChapter) return false;
      if (currentRange.endChapter && noteChapter > currentRange.endChapter) return false;
      
      if (noteChapter === currentRange.startChapter && noteVerse < currentRange.startVerse) return false;
      if (currentRange.endChapter && noteChapter === currentRange.endChapter && 
          currentRange.endVerse && noteVerse > currentRange.endVerse) return false;
      
      return true;
    });
  }, [notesData?.notes, currentRange]);

  // Loading state (only show for initial load, not refreshes)
  if (isLoading && !notesData) {
    return (
      <LoadingState 
        message={`Loading Translation Notes for ${range.book.toUpperCase()}...`}
        detail="Fetching notes with smart priority system..."
      />
    );
  }

  // Error state (only if no data and there's an error)
  if (error && !notesData) {
    return (
      <ErrorState 
        title="Failed to Load Translation Notes"
        message={error.message}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // No data state
  if (!notesData) {
    return (
      <div className="
        flex items-center justify-center h-full 
        text-gray-500 dark:text-gray-400
      ">
        <div className="text-center">
          <div className="text-4xl mb-4">
            <span role="img" aria-label="Notes">📝</span>
          </div>
          <div className="text-lg font-medium">No translation notes available</div>
          <div className="text-sm mt-2">Check your network connection and try again</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {/* Background refresh indicator */}
      {isRefreshing && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800 px-4 py-2">
          <div className="flex items-center space-x-2 text-sm text-purple-800 dark:text-purple-200">
            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Updating translation notes in background...</span>
          </div>
        </div>
      )}

      {/* Range filter indicator */}
      {currentRange && filteredNotes.length !== notesData.notes.length && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-medium">📍 Filtered:</span> Showing {filteredNotes.length} of {notesData.notes.length} notes for {range.book.toUpperCase()} {currentRange.startChapter}:{currentRange.startVerse}
            {currentRange.endChapter && currentRange.endVerse && 
              ` - ${currentRange.endChapter}:${currentRange.endVerse}`
            }
          </div>
        </div>
      )}
      
      <div className="p-6">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">
              <span role="img" aria-label="Empty">📭</span>
            </div>
            <div className="text-lg font-medium">No notes for this range</div>
            <div className="text-sm mt-2">
              {currentRange 
                ? `No translation notes found for ${range.book.toUpperCase()} ${currentRange.startChapter}:${currentRange.startVerse}`
                : 'No translation notes available'
              }
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredNotes.map((note: TranslationNote, index: number) => {
              const refParts = note.reference.split(':');
              const noteChapter = refParts[0] || '1';
              const noteVerse = refParts[1] || '1';
              
              return (
                <div 
                  key={`${note.reference}-${index}`}
                  className="
                    bg-gray-50 dark:bg-gray-800/50 
                    rounded-lg p-4 border border-gray-200/50 dark:border-gray-700/50
                  "
                >
                  {/* Note header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="
                        bg-blue-100 dark:bg-blue-900/30 
                        text-blue-800 dark:text-blue-200 
                        px-2 py-1 rounded text-sm font-medium
                      ">
                        {range.book.toUpperCase()} {noteChapter}:{noteVerse}
                      </span>
                      {note.id && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {note.id}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Note content */}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <MarkdownRenderer content={note.note} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesPanel;