/**
 * Scripture Panel - Smart Data Integration
 * Displays ULT scripture with priority-based fetching and optimistic rendering
 */

import React from 'react';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { USFMRenderer } from './USFMRenderer';
import type { RangeReference } from '../types/navigation';
import { useSmartScriptureData } from '../hooks/useSmartData';

export interface ScripturePanelProps {
  currentRange?: RangeReference;
}

export const ScripturePanel: React.FC<ScripturePanelProps> = ({ currentRange }) => {
  // Use current range or default to Jonah
  const range = currentRange || { book: 'jon', startChapter: 1, startVerse: 1 };
  
  // Use smart data hook for optimistic loading
  const { data: scriptureData, isLoading, isRefreshing, error } = useSmartScriptureData(
    'ult',
    range,
    true
  );

  console.log('📖 ScripturePanel (ULT):', { 
    range, 
    hasData: !!scriptureData, 
    isLoading, 
    isRefreshing 
  });

  // Loading state (only show for initial load, not refreshes)
  if (isLoading && !scriptureData) {
    return (
      <LoadingState 
        message={`Loading ULT ${range.book.toUpperCase()}...`}
        detail="Fetching scripture with smart priority system..."
      />
    );
  }

  // Error state (only if no data and there's an error)
  if (error && !scriptureData) {
    return (
      <ErrorState 
        title="Failed to Load Scripture"
        message={error.message}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // No data state
  if (!scriptureData) {
    return (
      <div className="
        flex items-center justify-center h-full 
        text-gray-500 dark:text-gray-400
      ">
        <div className="text-center">
          <div className="text-4xl mb-4">
            <span role="img" aria-label="Book">📖</span>
          </div>
          <div className="text-lg font-medium">No scripture data available</div>
          <div className="text-sm mt-2">Check your network connection and try again</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {/* Background refresh indicator */}
      {isRefreshing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2">
          <div className="flex items-center space-x-2 text-sm text-blue-800 dark:text-blue-200">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Updating scripture in background...</span>
          </div>
        </div>
      )}
      
      <div className="p-6">
        <USFMRenderer
          scripture={scriptureData.processedScripture}
          startRef={currentRange ? { 
            chapter: currentRange.startChapter, 
            verse: currentRange.startVerse 
          } : undefined}
          endRef={currentRange ? { 
            chapter: currentRange.endChapter || currentRange.startChapter, 
            verse: currentRange.endVerse || currentRange.startVerse 
          } : undefined}
          showVerseNumbers={true}
          showChapterNumbers={true}
          showParagraphs={true}
          showAlignments={false}
          onWordClick={(word, verse, alignment) => {
            console.log('Word clicked:', { word, verse: verse.reference, alignment });
            // TODO: Implement word interaction for next iteration
          }}
          className="text-gray-900 dark:text-gray-100"
        />
      </div>
    </div>
  );
};

export default ScripturePanel;