/**
 * Original Scripture Viewer Component
 * 
 * Displays Hebrew Bible (OT) or Greek New Testament (NT) based on current testament.
 * Always loads from unfoldingWord organization with fixed language codes:
 * - Hebrew Bible (OT): hbo_uhb (Ancient Hebrew)
 * - Greek New Testament (NT): el-x-koine_ugnt (Koine Greek)
 */

import { useEffect, useState } from 'react';
import { ProcessedScripture } from '../../types/context';
import { useNavigation } from '../../contexts/NavigationContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { USFMRenderer } from './USFMRenderer';

export interface OriginalScriptureViewerProps {
  scripture?: ProcessedScripture;
  loading?: boolean;
  error?: string;
  currentChapter?: number;
  onChapterChange?: (chapter: number) => void;
  resourceId?: string; // ID to identify which resource this viewer should display
}

// Testament-specific resource configuration
const ORIGINAL_LANGUAGE_CONFIG = {
  OT: {
    owner: 'unfoldingWord',
    language: 'hbo',
    resourceId: 'uhb',
    repoName: 'hbo_uhb',
    title: 'Hebrew Bible',
    description: 'unfoldingWord® Hebrew Bible (UHB)',
    url: 'https://git.door43.org/unfoldingWord/hbo_uhb'
  },
  NT: {
    owner: 'unfoldingWord', 
    language: 'el-x-koine',
    resourceId: 'ugnt',
    repoName: 'el-x-koine_ugnt',
    title: 'Greek New Testament',
    description: 'unfoldingWord® Greek New Testament (UGNT)',
    url: 'https://git.door43.org/unfoldingWord/el-x-koine_ugnt'
  }
} as const;

export function OriginalScriptureViewer({ 
  scripture, 
  loading = false, 
  error, 
  currentChapter = 1,
  onChapterChange,
  resourceId 
}: OriginalScriptureViewerProps) {
  
  // Get current navigation reference and testament info
  const { currentReference, getBookInfo } = useNavigation();
  const currentBookInfo = getBookInfo(currentReference.book);
  const testament = currentBookInfo?.testament;
  
  // Access workspace context to get resource manager
  const { resourceManager } = useWorkspace();
  
  // State for actual scripture content
  const [actualScripture, setActualScripture] = useState<ProcessedScripture | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const [currentLanguageConfig, setCurrentLanguageConfig] = useState<typeof ORIGINAL_LANGUAGE_CONFIG.OT | typeof ORIGINAL_LANGUAGE_CONFIG.NT | null>(null);
  const [resourceMetadata, setResourceMetadata] = useState<any>(null);
  
  // Use actual loaded content if available, otherwise fall back to prop
  const displayScripture = actualScripture || scripture;
  const isLoading = loading || contentLoading;
  const displayError = error || contentError;
  
  // Debug logging
  console.log('🏛️ OriginalScriptureViewer - resourceId:', resourceId);
  console.log('🏛️ OriginalScriptureViewer - testament:', testament);
  console.log('🏛️ OriginalScriptureViewer - currentReference:', currentReference);
  
  // Load content when testament or navigation changes
  useEffect(() => {
    if (!resourceManager || !currentReference.book || !testament) {
      console.log('⏳ OriginalScriptureViewer - Missing dependencies for content loading');
      return;
    }
    
    const loadContent = async () => {
      try {
        setContentLoading(true);
        setContentError(null);
        setActualScripture(null); // Clear previous content
        setLoadingProgress('Determining language...');
        
        // Select configuration based on testament
        const config = ORIGINAL_LANGUAGE_CONFIG[testament];
        setCurrentLanguageConfig(config);
        
        console.log(`🔄 OriginalScriptureViewer - Loading ${testament} content:`, config);
        setLoadingProgress(`Loading ${config.title}...`);
        
        // Construct content key for the original language resource
        // Format: server/owner/language/resourceId/book
        const contentKey = `git.door43.org/${config.owner}/${config.language}/${config.resourceId}/${currentReference.book}`;
        console.log(`📋 OriginalScriptureViewer - Content key: ${contentKey}`);
        
        setLoadingProgress(`Fetching ${config.resourceId.toUpperCase()} content...`);
        
        // Try to get content using the resource manager
        const content = await resourceManager.getOrFetchContent(
          contentKey,
          'scripture' as any // Resource type
        );
        
        console.log(`✅ OriginalScriptureViewer - Content loaded for ${testament}:`, content);
        setActualScripture(content as ProcessedScripture);
        
        // Set language direction based on the language (Hebrew = RTL, Greek = LTR)
        const mockMetadata = {
          languageDirection: config.language === 'hbo' ? 'rtl' as const : 'ltr' as const,
          languageTitle: config.language === 'hbo' ? 'Hebrew' : 'Greek',
          languageIsGL: false
        };
        console.log(`📋 OriginalScriptureViewer - Using language direction:`, mockMetadata);
        setResourceMetadata(mockMetadata);
        
      } catch (err) {
        console.error(`❌ OriginalScriptureViewer - Failed to load ${testament} content:`, err);
        setContentError(err instanceof Error ? err.message : `Failed to load ${testament} content`);
      } finally {
        setContentLoading(false);
        setLoadingProgress('');
      }
    };
    
    loadContent();
  }, [resourceManager, currentReference.book, testament]);
  
  // Helper function to format the navigation reference range
  const formatNavigationRange = () => {
    if (!currentReference || !currentReference.chapter || !currentReference.verse) {
      return `No navigation reference`;
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
  
  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loadingProgress || 'Loading original language text...'}
          </p>
          {testament && currentLanguageConfig && (
            <p className="text-sm text-gray-500 mt-2">
              {testament === 'OT' ? 'Hebrew Bible' : 'Greek New Testament'} • Book: {currentReference.book}
            </p>
          )}
          {contentLoading && (
            <div className="mt-3 text-xs text-gray-400">
              Loading from {currentLanguageConfig?.url}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (displayError) {
    return (
      <div className="h-full flex items-center justify-center bg-red-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-xl mb-2">
            <span role="img" aria-label="Warning">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-red-900 mb-2">Failed to Load Original Text</h3>
          <p className="text-red-700 text-sm mb-4">{displayError}</p>
          {currentLanguageConfig && (
            <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
              Attempted to load: {currentLanguageConfig.title}
            </div>
          )}
        </div>
      </div>
    );
  }

  // No testament detected
  if (!testament) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-gray-400 text-xl mb-2">
            <span role="img" aria-label="Languages">🏛️</span>
          </div>
          <p className="text-gray-600 mb-4">Cannot determine testament for current book</p>
          <div className="text-sm text-gray-500">
            Book: {currentReference.book || 'Not selected'}
          </div>
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
            <span role="img" aria-label="Languages">🏛️</span>
          </div>
          <p className="text-gray-600 mb-4">No original language content available</p>
          
          {/* Resource Information Display */}
          <div className="space-y-2 text-sm">
            <div className="px-3 py-2 bg-blue-100 rounded">
              <span className="font-medium">Testament:</span> {testament} ({testament === 'OT' ? 'Hebrew' : 'Greek'})
            </div>
            
            {currentLanguageConfig && (
              <div className="px-3 py-2 bg-gray-100 rounded">
                <span className="font-medium">Resource:</span> {currentLanguageConfig.title}
              </div>
            )}
            
            <div className="px-3 py-2 bg-gray-100 rounded">
              <span className="font-medium">Resource Manager:</span> {resourceManager ? '✅ Available' : '❌ Not available'}
            </div>
          </div>
          
          {/* Navigation Reference Display */}
          <div className="mt-4 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded text-sm inline-block">
            <span className="text-blue-800 dark:text-blue-200 font-medium">
              📍 Navigation: {formatNavigationRange()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white h-full">
      {/* Scripture Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-lg" role="img" aria-label="Languages">🏛️</span>
            <div>
              <h2 className="font-medium text-gray-900">
                {currentLanguageConfig?.title}
              </h2>
              <p className="text-sm text-gray-600">
                {currentLanguageConfig?.description}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {testament === 'OT' ? 'Hebrew' : 'Greek'} • {formatNavigationRange()}
          </div>
        </div>
      </div>

      {/* Scripture Content using USFMRenderer */}
      <div className="flex-1 min-h-0">
        <div className="p-6 max-w-4xl mx-auto">
          {displayScripture && (
            <div 
              className={`${
                // Apply RTL styling based on metadata or fallback to language detection
                resourceMetadata?.languageDirection === 'rtl' || 
                (currentLanguageConfig?.language === 'hbo') 
                  ? 'text-right rtl' 
                  : 'text-left ltr'
              }`}
              dir={
                resourceMetadata?.languageDirection || 
                (currentLanguageConfig?.language === 'hbo' ? 'rtl' : 'ltr')
              }
            >
              <USFMRenderer
                scripture={displayScripture}
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
                className="original-scripture-content"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
