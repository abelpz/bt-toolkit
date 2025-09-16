/**
 * Scripture Viewer Component
 * Displays OptimizedScripture content with chapters, verses, and paragraphs
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useResourceAPI } from 'linked-panels';
import { OptimizedScripture } from '../../services/usfm-processor';
import { useNavigation } from '../../contexts/NavigationContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { USFMRenderer } from './USFMRenderer';
import { ScriptureTokensBroadcast } from '../../types/scripture-messages';
import { extractTokensFromVerseRange, getTokenSummary } from '../../utils/scripture-token-utils';
import { TTSControl } from '../ui/TTSControl';
import { TTSWordBoundary } from '../../types/tts';
import { Icon } from '../ui/Icon';

export interface ScriptureViewerProps {
  scripture?: OptimizedScripture;
  loading?: boolean;
  error?: string;
  currentChapter?: number;
  onChapterChange?: (chapter: number) => void;
  resourceId?: string; // ID to identify which resource this viewer should display
}

export function ScriptureViewer({ 
  scripture, 
  loading = false, 
  error, 
  currentChapter = 1,
  onChapterChange,
  resourceId 
}: ScriptureViewerProps) {
  
  // Get current navigation reference to test context access
  const { currentReference } = useNavigation();
  
  // Access workspace context to get resource manager and adapters
  const { resourceManager, processedResourceConfig } = useWorkspace();
  
  // Get linked-panels API for broadcasting tokens (only if resourceId is provided)
  const linkedPanelsAPI = useResourceAPI<ScriptureTokensBroadcast>(resourceId || 'default');
  
  // State for actual scripture content
  const [actualScripture, setActualScripture] = useState<OptimizedScripture | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [resourceMetadata, setResourceMetadata] = useState<any>(null);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  
  // State for TTS word highlighting
  const [currentTTSWord, setCurrentTTSWord] = useState<TTSWordBoundary | null>(null);

  // Extract text content for TTS from current scripture display
  const ttsText = useMemo(() => {
    const displayScripture = scripture || actualScripture;
    if (!displayScripture?.chapters) return '';
    
    try {
      // Get the current chapter content
      const chapterNumber = currentReference.chapter;
      if (!chapterNumber) return '';
      
      // Find the chapter in the chapters array
      const currentChapterData = displayScripture.chapters.find(ch => ch.number === chapterNumber);
      if (!currentChapterData) return '';
      
      // If we have a specific verse range, extract just that
      if (currentReference.verse) {
        const startVerse = currentReference.verse;
        const endVerse = currentReference.endVerse || startVerse;
        
        let text = '';
        for (let v = startVerse; v <= endVerse; v++) {
          const verseData = currentChapterData.verses?.find(verse => verse.number === v);
          if (verseData?.text) {
            text += verseData.text + ' ';
          }
        }
        return text.trim();
      } else {
        // Extract all verses from the chapter
        return currentChapterData.verses
          ?.map(verse => verse.text || '')
          .join(' ')
          .trim() || '';
      }
    } catch (error) {
      console.warn('Failed to extract TTS text:', error);
      return '';
    }
  }, [scripture, actualScripture, currentReference]);
  
  // TTS word boundary callback for word-by-word highlighting
  const handleTTSWordBoundary = useCallback((wordBoundary: TTSWordBoundary) => {
    console.log('🔊 TTS Word Boundary in ScriptureViewer:', wordBoundary);
    // Clear highlighting if word is empty (indicates pause/stop/end)
    if (!wordBoundary.word || wordBoundary.word.trim() === '') {
      setCurrentTTSWord(null);
    } else {
      setCurrentTTSWord(wordBoundary);
    }
  }, []);
  
  // Clear TTS highlighting when TTS stops or pauses
  const handleTTSStateChange = useCallback((isPlaying: boolean) => {
    if (!isPlaying) {
      console.log('🔊 TTS stopped/paused - clearing word highlighting');
      setCurrentTTSWord(null);
    }
  }, []);
  
  // Listen for notes token groups broadcasts using the plugin system
  // Note: NotesTokenGroupsBroadcast is handled by USFMRenderer via TokenUnderliningContext
  // const notesTokenGroupsBroadcast = useCurrentState<NotesTokenGroupsBroadcast>(
  //   resourceId || 'default',
  //   'current-notes-token-groups'
  // );
  
  // Use actual loaded content if available, otherwise fall back to prop
  const displayScripture = actualScripture || scripture;
  const isLoading = loading || contentLoading;
  const displayError = error || contentError;
  
  // Debug logging (reduced)
  // console.log('🔍 ScriptureViewer - resourceId:', resourceId);
  
  // Load actual content when component mounts or navigation changes
  useEffect(() => {
    if (!resourceManager || !currentReference.book || !resourceId) {
      console.log('⏳ ScriptureViewer - Missing dependencies for content loading');
      return;
    }
    
    const loadContent = async () => {
      try {
        setContentLoading(true);
        setContentError(null);
        setActualScripture(null); // Clear previous content to avoid showing stale data
        setLoadingProgress('Initializing...');
        
        console.log(`🔄 ScriptureViewer - Loading content for ${resourceId}, book: ${currentReference.book}`);
        
        // Find the resource configuration for this panel
        setLoadingProgress('Finding resource configuration...');
        const resourceConfig = processedResourceConfig?.find((config: any) => 
          config.panelResourceId === resourceId
        );
        
        if (!resourceConfig) {
          throw new Error(`Resource configuration not found for ${resourceId}`);
        }
        
        console.log(`📋 ScriptureViewer - Found resource config:`, resourceConfig);
        console.log(`📋 ScriptureViewer - Using resource ID: ${resourceConfig.metadata.id}`);
        
        // Construct the full content key in the same format as WorkspaceContext
        const contentKey = `${resourceConfig.metadata.server}/${resourceConfig.metadata.owner}/${resourceConfig.metadata.language}/${resourceConfig.metadata.id}/${currentReference.book}`;
        console.log(`📋 ScriptureViewer - Content key: ${contentKey}`);
        
        setLoadingProgress(`Fetching ${resourceConfig.metadata.id.toUpperCase()} content...`);
        
        // Try to get content using the resource manager
        const content = await resourceManager.getOrFetchContent(
          contentKey, // Full key format: server/owner/language/resourceId/book
          resourceConfig.metadata.type as any // Resource type from metadata
        );
        
        console.log(`✅ ScriptureViewer - Content loaded for ${resourceId}:`, content);
        setActualScripture(content as OptimizedScripture); // Optimized format
        
        // Use existing metadata from resource config for language direction
        console.log(`📋 ScriptureViewer - Using existing metadata:`, resourceConfig.metadata);
        setResourceMetadata(resourceConfig.metadata);
        
      } catch (err) {
        console.error(`❌ ScriptureViewer - Failed to load content for ${resourceId}:`, err);
        setContentError(err instanceof Error ? err.message : 'Failed to load content');
      } finally {
        setContentLoading(false);
        setLoadingProgress('');
      }
    };
    
    loadContent();
  }, [resourceManager, currentReference.book, resourceId, processedResourceConfig]);
  
  // Broadcast scripture tokens when content or navigation changes
  useEffect(() => {
    if (!linkedPanelsAPI || !displayScripture || !resourceId || !currentReference.book) {
      return;
    }

    // Only broadcast tokens if the scripture resource has alignments
    if (!displayScripture.meta?.hasAlignments) {
      console.log(`⏭️ Skipping token broadcast from ${resourceId} - no alignments available`);
      return;
    }

    // Debounce the broadcast to prevent rapid-fire updates
    const timeoutId = setTimeout(() => {
      try {
        // Extract tokens from the current verse range
        const tokens = extractTokensFromVerseRange(displayScripture, {
          book: currentReference.book,
          chapter: currentReference.chapter || 1,
          verse: currentReference.verse || 1,
          endChapter: currentReference.endChapter,
          endVerse: currentReference.endVerse
        });

        // Get token summary for logging
        const summary = getTokenSummary(tokens);
        console.log(`📡 Broadcasting ${summary.totalTokens} tokens from ${resourceId} (aligned resource):`, {
          reference: currentReference,
          summary,
          sampleTokens: summary.sampleTokens.slice(0, 5),
          hasAlignments: displayScripture.meta.hasAlignments
        });

        // Create the broadcast message
        const broadcast: ScriptureTokensBroadcast = {
          type: 'scripture-tokens-broadcast',
          lifecycle: 'state',
          stateKey: 'current-scripture-tokens',
          sourceResourceId: resourceId,
          reference: {
            book: currentReference.book,
            chapter: currentReference.chapter || 1,
            verse: currentReference.verse || 1,
            endChapter: currentReference.endChapter,
            endVerse: currentReference.endVerse
          },
          tokens,
          resourceMetadata: {
            id: resourceMetadata?.id || resourceId,
            language: resourceMetadata?.language || 'en',
            languageDirection: resourceMetadata?.languageDirection,
            type: resourceMetadata?.type || 'scripture'
          },
          timestamp: Date.now()
        };

        // Broadcast to all non-scripture resources only
        // This prevents infinite loops when multiple scripture resources are mounted
        const allResourceIds = processedResourceConfig?.map((config: any) => config.panelResourceId) || [];
        const scriptureResourceIds = processedResourceConfig
          ?.filter((config: any) => config.metadata?.type === 'scripture')
          ?.map((config: any) => config.panelResourceId) || [];
        
        const nonScriptureResourceIds = allResourceIds.filter((id: string) => 
          !scriptureResourceIds.includes(id) && id !== resourceId
        );

        console.log(`📡 Filtering broadcast targets:`, {
          allResources: allResourceIds.length,
          scriptureResources: scriptureResourceIds.length,
          nonScriptureTargets: nonScriptureResourceIds.length,
          scriptureResourceIds,
          nonScriptureResourceIds
        });

        let sentCount = 0;
        nonScriptureResourceIds.forEach((targetId: string) => {
          try {
            if (linkedPanelsAPI.messaging.send(targetId, broadcast)) {
              sentCount++;
            }
          } catch (error) {
            console.warn(`⚠️ Failed to send broadcast to ${targetId}:`, error);
          }
        });

        console.log(`✅ Scripture tokens broadcast sent to ${sentCount} non-scripture resources`);

      } catch (err) {
        console.error('❌ Failed to broadcast scripture tokens:', err);
      }
    }, 200); // Debounce for 200ms

    return () => clearTimeout(timeoutId);
  }, [
    linkedPanelsAPI, 
    resourceId, 
    currentReference.book, 
    currentReference.chapter, 
    currentReference.verse,
    displayScripture?.meta?.book,
    displayScripture?.meta?.hasAlignments,
    resourceMetadata?.id,
    processedResourceConfig?.length
  ]);

  // Proper cleanup using state lifecycle pattern (inspired by team-review)
  useEffect(() => {
    // Only register cleanup when we have valid alignment data to clean
    if (
      !linkedPanelsAPI?.messaging ||
      !resourceId ||
      !displayScripture?.meta?.hasAlignments
    ) {
      console.log('⏭️ Skipping state lifecycle cleanup - no alignments available');
      return;
    }

    return () => {
      // State lifecycle cleanup - send a single superseding empty state
      // This follows the linked-panels state lifecycle pattern
      try {
        const clearBroadcast: ScriptureTokensBroadcast = {
          type: 'scripture-tokens-broadcast',
          lifecycle: 'state',
          stateKey: 'current-scripture-tokens',
          sourceResourceId: resourceId,
          reference: { book: '', chapter: 0, verse: 0 }, // Empty reference indicates clear
          tokens: [],
          resourceMetadata: { id: '', language: '', type: 'scripture' },
          timestamp: Date.now(),
        };

        linkedPanelsAPI.messaging.sendToAll(clearBroadcast);
        console.log(
          `🧹 ScriptureViewer (${resourceId}) - State lifecycle cleanup: sent superseding empty state`
        );
      } catch (error) {
        console.error('❌ Error during ScriptureViewer state cleanup:', error);
      }
    };
  }, [resourceId]); // Stable dependencies only
  
  // Helper function to format the navigation reference range
  const formatNavigationRange = () => {
    // Add debug info
    console.log('🔍 formatNavigationRange - currentReference:', currentReference);
    
    if (!currentReference || !currentReference.chapter || !currentReference.verse) {
      return `No navigation reference (${JSON.stringify(currentReference)})`;
    }
    
    const start = `${currentReference.chapter}:${currentReference.verse}`;
    
    if (currentReference.endChapter && currentReference.endVerse) {
      // Handle range display
      if (currentReference.chapter === currentReference.endChapter) {
        // Same chapter: "1:1-6"
        return `${start}-${currentReference.endVerse}`;
      } else {
        // Different chapters: "1:1-2:6"
        return `${start}-${currentReference.endChapter}:${currentReference.endVerse}`;
      }
    }
    
    return start; // Single verse
  };
  
  // Loading state - show when initially loading OR when fetching new content
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loadingProgress || (contentLoading ? 'Fetching scripture content...' : 'Loading scripture content...')}
          </p>
          {resourceId && (
            <p className="text-sm text-gray-500 mt-2">
              Resource: {resourceId} • Book: {currentReference.book}
            </p>
          )}
          {contentLoading && (
            <div className="mt-3 text-xs text-gray-400">
              This may take a few seconds for new content...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-red-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-xl mb-2">
            <Icon name="warning" size={16} className="text-yellow-500" aria-label="Warning" />
          </div>
          <h3 className="text-lg font-medium text-red-900 mb-2">Failed to Load Scripture</h3>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // No scripture data
  if (!displayScripture && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-gray-400 text-xl mb-2">
            <Icon name="book-open" size={16} className="text-gray-500" aria-label="Book" />
          </div>
          <p className="text-gray-600 mb-4">No scripture content available</p>
          
          {/* Resource Information Display */}
          <div className="space-y-2 text-sm">
            <div className="px-3 py-2 bg-gray-100 rounded">
              <span className="font-medium">Resource ID:</span> {resourceId || 'Not specified'}
            </div>
            
            <div className="px-3 py-2 bg-gray-100 rounded">
              <span className="font-medium">Resource Manager:</span> {resourceManager ? '✅ Available' : '❌ Not available'}
            </div>
            
            <div className="px-3 py-2 bg-gray-100 rounded">
              <span className="font-medium">Config:</span> {processedResourceConfig ? '✅ Available' : '❌ Not available'}
            </div>
            
            {displayError && (
              <div className="px-3 py-2 bg-red-100 text-red-700 rounded">
                <span className="font-medium">Error:</span> {displayError}
              </div>
            )}
          </div>
          
          {/* Navigation Reference Display for testing */}
          <div className="mt-4 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded text-sm inline-block">
            <span className="text-blue-800 dark:text-blue-200 font-medium">
              <Icon name="search" size={14} className="inline mr-1" aria-label="Location" /> Navigation: {formatNavigationRange()}
            </span>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col bg-white h-full relative">
      {/* Floating TTS Control - positioned absolutely in top-right corner */}
      {ttsText && (
        <div className="absolute top-2 right-2 z-10">
          <TTSControl
            text={ttsText}
            compact={true}
            title={`Read ${formatNavigationRange()} aloud`}
            className="shadow-sm"
            onWordBoundary={handleTTSWordBoundary}
            onStateChange={handleTTSStateChange}
          />
        </div>
      )}

      {/* Scripture Content using USFMRenderer */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 max-w-4xl mx-auto">
          {displayScripture && (
            <div 
              className={`${
                // Apply RTL styling based on metadata or fallback to language detection
                resourceMetadata?.languageDirection === 'rtl'
                  ? 'text-right rtl' 
                  : 'text-left ltr'
              }`}
              dir={resourceMetadata?.languageDirection || 'ltr'}
            >
              <USFMRenderer
                scripture={displayScripture}
                resourceId={resourceId || 'unknown-resource'}
                resourceType={getResourceType(resourceMetadata?.id)}
                language={getLanguageCode(resourceMetadata?.language)}
                startRef={
                  currentReference.chapter && currentReference.verse
                    ? { chapter: currentReference.chapter, verse: currentReference.verse }
                    : undefined
                }
                endRef={
                  currentReference.endChapter && currentReference.endVerse
                    ? { chapter: currentReference.endChapter, verse: currentReference.endVerse }
                    : currentReference.chapter && currentReference.verse
                    ? { chapter: currentReference.chapter, verse: currentReference.verse }
                    : undefined
                }
                showVerseNumbers={true}
                showChapterNumbers={true}
                showParagraphs={true}
                showAlignments={false}
                className="scripture-content"
                currentTTSWord={currentTTSWord}
                ttsText={ttsText}
              />
            </div>
          )}
        </div>
      </div>

      
    </div>
  );
}

/**
 * Helper function to map resource ID to resource type
 */
function getResourceType(resourceId?: string): 'ULT' | 'UST' | 'UGNT' | 'UHB' {
  if (!resourceId) return 'ULT'; // Default fallback
  
  const id = resourceId.toLowerCase();
  if (id.includes('ult')) return 'ULT';
  if (id.includes('ust')) return 'UST';
  if (id.includes('ugnt')) return 'UGNT';
  if (id.includes('uhb')) return 'UHB';
  
  // Default fallback
  return 'ULT';
}

/**
 * Helper function to map language to language code
 */
function getLanguageCode(language?: string): 'en' | 'el-x-koine' | 'hbo' {
  if (!language) return 'en'; // Default fallback
  
  const lang = language.toLowerCase();
  if (lang.includes('el-x-koine') || lang.includes('greek')) return 'el-x-koine';
  if (lang.includes('hbo') || lang.includes('hebrew')) return 'hbo';
  
  // Default to English for most cases
  return 'en';
}
