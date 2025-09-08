/**
 * Translation Notes Viewer Component
 * 
 * Displays Translation Notes (TN) content with filtering and navigation
 */

import { useState, useEffect, useMemo } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { ProcessedNotes, TranslationNote } from '../../services/notes-processor';
import { ResourceMetadata, ResourceType } from '../../types/context';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { AcademyModal } from '../modals/AcademyModal';
import { parseRcLink, isTranslationAcademyLink, getArticleDisplayTitle } from '../../utils/rc-link-parser';

export interface NotesViewerProps {
  resourceId: string;
  loading?: boolean;
  error?: string;
  notes?: ProcessedNotes;
  currentChapter?: number;
}

export function NotesViewer({ 
  resourceId, 
  loading = false, 
  error, 
  notes: propNotes, 
  currentChapter = 1 
}: NotesViewerProps) {
  const { resourceManager, processedResourceConfig } = useWorkspace();
  const { currentReference } = useNavigation();
  
  const [actualNotes, setActualNotes] = useState<ProcessedNotes | null>(propNotes || null);
  const [contentLoading, setContentLoading] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(error || null);
  const [resourceMetadata, setResourceMetadata] = useState<ResourceMetadata | null>(null);
  
  // Academy modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [selectedArticleTitle, setSelectedArticleTitle] = useState<string>('');

  // Handle clicking on support reference links
  const handleSupportReferenceClick = (supportReference: string) => {
    if (!isTranslationAcademyLink(supportReference)) {
      console.warn(`Not a Translation Academy link: ${supportReference}`);
      return;
    }

    const parsed = parseRcLink(supportReference);
    if (parsed.isValid) {
      setSelectedArticleId(parsed.fullArticleId);
      setSelectedArticleTitle(getArticleDisplayTitle(parsed.articleId, parsed.category));
      setIsModalOpen(true);
      console.log(`🎓 Opening Translation Academy article: ${parsed.fullArticleId}`);
    }
  };

  // Fetch content when navigation changes
  useEffect(() => {
    if (!resourceManager || !currentReference.book || propNotes || !processedResourceConfig) return;

    const fetchContent = async () => {
      try {
        setContentLoading(true);
        setDisplayError(null);
        setActualNotes(null); // Clear previous content
        
        
        // Find the resource config to get the correct adapter resource ID
        const resourceConfig = processedResourceConfig.find((config: { panelResourceId: string }) => config.panelResourceId === resourceId);
        if (!resourceConfig) {
          throw new Error(`Resource config not found for ${resourceId}`);
        }
        
        // Construct the full content key in the same format as ScriptureViewer
        const contentKey = `${resourceConfig.metadata.server}/${resourceConfig.metadata.owner}/${resourceConfig.metadata.language}/${resourceConfig.metadata.id}/${currentReference.book}`;
        
        const content = await resourceManager.getOrFetchContent(
          contentKey, // Full key format: server/owner/language/resourceId/book
          resourceConfig.metadata.type as ResourceType // Resource type from metadata
        );
        
        if (content) {
          const processedNotes = content as unknown as ProcessedNotes;
          if (processedNotes && processedNotes.notes && Array.isArray(processedNotes.notes)) {
            setActualNotes(processedNotes);
          } else {
            setDisplayError(`Invalid notes content structure for ${currentReference.book}`);
          }
        } else {
          setDisplayError(`No notes found for ${currentReference.book}`);
        }
        
        // Use existing metadata from resource config for language direction
        setResourceMetadata(resourceConfig.metadata);
      } catch (err) {
        setDisplayError(err instanceof Error ? err.message : 'Failed to load notes');
      } finally {
        setContentLoading(false);
      }
    };

    fetchContent();
  }, [resourceManager, resourceId, currentReference.book, propNotes, processedResourceConfig]);

  const displayNotes = actualNotes || propNotes;
  const isLoading = loading || contentLoading;

  // Filter notes by current navigation range (like NotesPanel.tsx)
  const filteredNotesByNavigation = useMemo(() => {
    if (!displayNotes?.notes || !currentReference) {
      return displayNotes?.notes || [];
    }
    
    return displayNotes.notes.filter((note: TranslationNote) => {
      // Parse chapter and verse from reference (e.g., "1:1" -> chapter: 1, verse: 1)
      const refParts = note.reference.split(':');
      const noteChapter = parseInt(refParts[0] || '1');
      const noteVerse = parseInt(refParts[1] || '1');
      
      // Determine the range bounds (default to single verse/chapter if no end specified)
      const startChapter = currentReference.chapter;
      const startVerse = currentReference.verse;
      const endChapter = currentReference.endChapter || currentReference.chapter;
      const endVerse = currentReference.endVerse || currentReference.verse;
      
      // Skip filtering if we don't have valid chapter/verse data
      if (!startChapter || !startVerse) {
        return true;
      }
      
      // Check if note is within the chapter range
      if (noteChapter < startChapter) {
        return false;
      }
      if (endChapter && noteChapter > endChapter) {
        return false;
      }
      
      // Filter by start verse in start chapter
      if (noteChapter === startChapter && noteVerse < startVerse) {
        return false;
      }
      
      // Filter by end verse in end chapter
      if (endChapter && endVerse && noteChapter === endChapter && noteVerse > endVerse) {
        return false;
      }
      
      return true;
    });
  }, [displayNotes?.notes, currentReference]);


  // Use navigation-filtered notes directly (they're already filtered by the current range)
  const filteredNotes = filteredNotesByNavigation;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading translation notes...</p>
          {currentReference.book && (
            <p className="text-sm text-gray-500 mt-2">Book: {currentReference.book}</p>
          )}
        </div>
      </div>
    );
  }

  if (displayError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-red-500 text-xl mb-2">
            <span role="img" aria-label="Warning">⚠️</span>
          </div>
          <p className="font-medium">Error loading notes</p>
          <p className="text-sm mt-2">{displayError}</p>
        </div>
      </div>
    );
  }

  if (!displayNotes) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-gray-400 text-xl mb-2">
            <span role="img" aria-label="Notes">📝</span>
          </div>
          <p>No notes available</p>
          <p className="text-sm mt-1">Resource: {resourceId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Notes content */}
      <div 
        className={`flex-1 overflow-y-auto p-3 ${
          // Apply RTL styling based on metadata
          resourceMetadata?.languageDirection === 'rtl'
            ? 'text-right rtl' 
            : 'text-left ltr'
        }`}
        dir={resourceMetadata?.languageDirection || 'ltr'}
      >
        {filteredNotes.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-gray-400 text-xl mb-2">
              <span role="img" aria-label="Notes">📝</span>
            </div>
            <p>No notes for this selection</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotes.map((note, index) => (
              <div key={note.id || index} className="border border-gray-200 rounded-lg p-3 bg-white">
                {/* Note header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {note.reference}
                    </span>
                    {note.occurrence && note.occurrence !== '1' && (
                      <span className="text-xs text-gray-500">
                        occurrence {note.occurrence}
                      </span>
                    )}
                  </div>
                  {note.id && (
                    <span className="text-xs text-gray-400 font-mono">
                      {note.id}
                    </span>
                  )}
                </div>

                {/* Quoted text */}
                {note.quote && (
                  <div className="mb-3 p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                    <p className="text-sm font-medium text-gray-700 mb-1">Quoted text:</p>
                    <p className="text-gray-900 italic">"{note.quote}"</p>
                  </div>
                )}

                {/* Note content */}
                <div className="prose prose-sm max-w-none">
                  <div className="text-gray-800 leading-relaxed">
                    <MarkdownRenderer content={note.note} />
                  </div>
                </div>

                {/* Translation Academy button */}
                {note.supportReference && isTranslationAcademyLink(note.supportReference) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleSupportReferenceClick(note.supportReference)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                      title="Open Translation Academy article"
                    >
                      <span className="mr-2" role="img" aria-label="graduation cap">🎓</span>
                      {parseRcLink(note.supportReference).articleId}
                    </button>
                  </div>
                )}
                
                {/* Non-academy support reference (fallback) */}
                {note.supportReference && !isTranslationAcademyLink(note.supportReference) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Support reference: <span className="font-mono text-gray-600">{note.supportReference}</span>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Translation Academy Modal */}
      <AcademyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        articleId={selectedArticleId}
        title={selectedArticleTitle}
      />
    </div>
  );
}

