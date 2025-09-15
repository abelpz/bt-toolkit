/**
 * Unified Resource Modal Component
 * 
 * Displays both Translation Academy and Translation Words content in a single modal
 * with navigation history support for seamless back/forward navigation.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { AcademyArticle, ResourceType } from '../../types/context';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';

// Resource types that can be displayed in the modal
type ResourceContentType = 'ta' | 'tw';

interface ResourceItem {
  type: ResourceContentType;
  id: string; // articleId for TA, wordId for TW
  title?: string;
  displayTitle?: string; // Actual title from content
}

interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialResource?: ResourceItem;
  // Override props for external state management
  isMinimizedOverride?: boolean;
  onMinimizeOverride?: () => void;
  onRestoreOverride?: () => void;
}

interface TranslationWord {
  id: string;
  title: string;
  content: string;
  category: string;
}

// Utility function to remove the first heading from markdown content to avoid duplication with modal header
const removeFirstHeading = (content: string): string => {
  const lines = content.split('\n');
  let firstHeadingRemoved = false;
  
  return lines.filter(line => {
    // Skip the first heading (# Title)
    if (!firstHeadingRemoved && line.trim().startsWith('# ')) {
      firstHeadingRemoved = true;
      return false;
    }
    return true;
  }).join('\n');
};

export const ResourceModal: React.FC<ResourceModalProps> = ({
  isOpen,
  onClose,
  initialResource,
  isMinimizedOverride,
  onMinimizeOverride,
  onRestoreOverride
}) => {
  const { resourceManager, processedResourceConfig, anchorResource } = useWorkspace();
  const { currentReference, navigateToReference } = useNavigation();
  
  // Navigation history stack
  const [navigationStack, setNavigationStack] = useState<ResourceItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  
  // Content state
  const [content, setContent] = useState<AcademyArticle | TranslationWord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Removed resourceMetadata state as it's not being used
  
  // Minimize state - use override if provided, otherwise internal state
  const [internalIsMinimized, setInternalIsMinimized] = useState(false);
  const isMinimized = isMinimizedOverride !== undefined ? isMinimizedOverride : internalIsMinimized;
  const setIsMinimized = useMemo(() => {
    return onMinimizeOverride && onRestoreOverride 
      ? (minimized: boolean) => minimized ? onMinimizeOverride() : onRestoreOverride()
      : setInternalIsMinimized;
  }, [onMinimizeOverride, onRestoreOverride]);
  
  // Track loaded resources to prevent infinite loops
  const loadedResourcesRef = useRef<Set<string>>(new Set());
  
  // Track the last initial resource to detect changes
  const lastInitialResourceRef = useRef<string | null>(null);
  
  // Removed pending navigation system - using direct approach with setTimeout
  
  // Track if we're in the middle of a navigation to prevent unwanted restoration
  const isNavigatingRef = useRef(false);
  
  // Track when the modal was explicitly requested to be opened (not just due to prop changes)
  const wasExplicitlyRequestedRef = useRef(false);

  // Current resource being displayed - memoized to prevent unnecessary re-renders
  const currentResource = useMemo(() => {
    return currentIndex >= 0 ? navigationStack[currentIndex] : null;
  }, [navigationStack, currentIndex]);

  // Initialize modal with initial resource
  useEffect(() => {
    console.log(`🔄 ResourceModal: Initialization useEffect triggered - isOpen: ${isOpen}, initialResource: ${initialResource ? `${initialResource.type}/${initialResource.id}` : 'null'}, isMinimized: ${isMinimized}`);
    
    if (!isOpen || !initialResource) {
      return;
    }
    
    const currentResourceKey = `${initialResource.type}/${initialResource.id}`;
    console.log(`🔄 ResourceModal: Initialization - Resource: ${currentResourceKey}, isMinimized: ${isMinimized}, isNavigating: ${isNavigatingRef.current}`);
    
    // Check if this is a new initial resource (different from the last one)
    const isNewResource = lastInitialResourceRef.current !== currentResourceKey;
    
    if (!isNewResource) {
      console.log(`🔄 ResourceModal: Same resource, skipping initialization`);
      return;
    }
    
    console.log(`🔄 ResourceModal: New initial resource detected: ${currentResourceKey}`);
    
    // If modal has existing history, add to it
    if (navigationStack.length > 0 && !isNavigatingRef.current) {
      console.log(`🔄 ResourceModal: Adding new resource to existing history`);
      
      // Add new resource to navigation history (preserving existing history)
      setNavigationStack(prev => {
        // Remove any items after current index (forward history)
        const newStack = prev.slice(0, currentIndex + 1);
        // Add new resource
        newStack.push(initialResource);
        return newStack;
      });
      setCurrentIndex(prev => prev + 1);
    } else {
      // First time opening modal or fresh start
      console.log(`🔄 ResourceModal: First time opening or fresh start - loading new content`);
      setNavigationStack([initialResource]);
      setCurrentIndex(0);
      loadedResourcesRef.current.clear(); // Clear cache for fresh loading
    }
    
    // Update the last initial resource tracker
    lastInitialResourceRef.current = currentResourceKey;
  }, [isOpen, initialResource, isMinimized]);

  // Removed localStorage persistence - using context instead

  // Clear navigation when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNavigationStack([]);
      setCurrentIndex(-1);
      setContent(null);
      setError(null);
      setIsMinimized(false);
      loadedResourcesRef.current.clear();
      lastInitialResourceRef.current = null;
      isNavigatingRef.current = false;
      wasExplicitlyRequestedRef.current = false;
    }
  }, [isOpen, setIsMinimized]);

  // Removed pending navigation useLayoutEffect - using direct setTimeout approach

  // Navigation functions
  const navigateToResource = useCallback((resource: ResourceItem) => {
    setNavigationStack(prev => {
      // Remove any items after current index (forward history)
      const newStack = prev.slice(0, currentIndex + 1);
      // Add new resource
      newStack.push(resource);
      return newStack;
    });
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex]);

  const navigateBack = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev > 0) {
        console.log(`🔄 ResourceModal: Navigating back from index ${prev} to ${prev - 1}`);
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const navigateForward = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev < navigationStack.length - 1) {
        console.log(`🔄 ResourceModal: Navigating forward from index ${prev} to ${prev + 1}`);
        return prev + 1;
      }
      return prev;
    });
  }, [navigationStack.length]);

  // Minimize/Restore functions
  const handleMinimize = useCallback(() => {
    console.log(`🔄 ResourceModal: User explicitly minimized modal`);
    if (onMinimizeOverride) {
      onMinimizeOverride();
    } else {
      setInternalIsMinimized(true);
    }
  }, [onMinimizeOverride]);

  const handleRestore = useCallback(() => {
    console.log(`🔄 ResourceModal: User explicitly restored modal`);
    wasExplicitlyRequestedRef.current = true;
    
    if (onRestoreOverride) {
      onRestoreOverride();
    } else {
      setInternalIsMinimized(false);
    }
    
    // Clear the explicit request flag after a short delay
    setTimeout(() => {
      wasExplicitlyRequestedRef.current = false;
    }, 1000);
  }, [onRestoreOverride]);

  // Load Translation Academy article
  const loadAcademyArticle = useCallback(async (articleId: string) => {
    // Find TA resource config
    const academyResourceConfig = processedResourceConfig?.find((config: any) => 
      config.metadata?.type === 'academy' || config.metadata?.id === 'ta'
    );

    if (!academyResourceConfig) {
      throw new Error('Translation Academy resource not found');
    }

    // Construct content key
    const server = anchorResource?.server || academyResourceConfig.server || 'git.door43.org';
    const owner = anchorResource?.owner || academyResourceConfig.owner || 'unfoldingWord';
    const language = anchorResource?.language || academyResourceConfig.language || 'en';
    const resourceId = 'ta';
    
    const contentKey = `${server}/${owner}/${language}/${resourceId}/${articleId}`;
    
    const content = await resourceManager?.getOrFetchContent(contentKey, ResourceType.ACADEMY);
    
    if (content && 'article' in content) {
      const article = content.article as AcademyArticle;
      setContent(article);
      
      // Update the current resource with the actual title
      setNavigationStack(prev => prev.map((item, index) => 
        index === currentIndex 
          ? { ...item, displayTitle: article.title }
          : item
      ));
    } else {
      throw new Error('No article content received');
    }

    // Resource metadata not needed for display
  }, [processedResourceConfig, anchorResource, resourceManager, currentIndex]);

  // Load Translation Word
  const loadTranslationWord = useCallback(async (wordId: string) => {
    // Find TW resource config
    const wordsResourceConfig = processedResourceConfig?.find((config: any) => 
      config.id === 'translation-words-global' || 
      (config.id === 'tw' && config.type === 'words') ||
      config.resourceKey?.includes('/tw')
    );

    // Construct content key
    const server = anchorResource?.server || wordsResourceConfig?.server || 'git.door43.org';
    const owner = anchorResource?.owner || wordsResourceConfig?.owner || 'unfoldingWord';
    const language = anchorResource?.language || wordsResourceConfig?.language || 'en';
    const resourceId = 'tw';
    
    const contentKey = `${server}/${owner}/${language}/${resourceId}/${wordId}`;
    
    if (!resourceManager) {
      throw new Error('Resource manager not available');
    }
    
    const content = await resourceManager.getOrFetchContent(contentKey, ResourceType.WORDS);
    
    if (content && (content as { word?: { term?: string; definition?: string } }).word) {
      const wordData = (content as { word: { term: string; definition: string; id?: string } }).word;
      
      const word: TranslationWord = {
        id: wordData.id || wordId,
        title: wordData.term || extractTitleFromId(wordId),
        content: wordData.definition || 'No content available.',
        category: extractCategoryFromId(wordId)
      };
      
      setContent(word);
      
      // Update the current resource with the actual title
      setNavigationStack(prev => prev.map((item, index) => 
        index === currentIndex 
          ? { ...item, displayTitle: word.title }
          : item
      ));
    } else {
      throw new Error('No word content received');
    }

    // Resource metadata not needed for display
  }, [processedResourceConfig, anchorResource, resourceManager, currentIndex]);

  // Load content when current resource type/id changes (but not when displayTitle changes)
  useEffect(() => {
    console.log(`🔄 ResourceModal: Content loading useEffect triggered - currentResource: ${currentResource ? `${currentResource.type}/${currentResource.id}` : 'null'}, currentIndex: ${currentIndex}, resourceManager: ${!!resourceManager}`);
    
    if (!currentResource || !resourceManager) return;

    const resourceKey = `${currentResource.type}/${currentResource.id}`;
    
    console.log(`🔄 ResourceModal loading content: ${resourceKey} at index ${currentIndex} (ALWAYS LOADING FOR NAVIGATION)`);

    const loadContent = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (currentResource.type === 'ta') {
          await loadAcademyArticle(currentResource.id);
        } else if (currentResource.type === 'tw') {
          await loadTranslationWord(currentResource.id);
        }
      } catch (err) {
        console.error(`Failed to load ${currentResource.type} content:`, err);
        setError(err instanceof Error ? err.message : `Failed to load ${currentResource.type} content`);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [currentResource?.type, currentResource?.id, currentIndex, resourceManager, loadAcademyArticle, loadTranslationWord]);

  // Handle TA link clicks
  const handleTALinkClick = useCallback((articleId: string, title?: string) => {
    const newResource: ResourceItem = {
      type: 'ta',
      id: articleId,
      title: title
    };
    navigateToResource(newResource);
  }, [navigateToResource]);

  // Handle TW link clicks
  const handleTWLinkClick = useCallback((wordId: string, title?: string) => {
    const fullWordId = wordId.startsWith('bible/') ? wordId : `bible/${wordId}`;
    const newResource: ResourceItem = {
      type: 'tw',
      id: fullWordId,
      title: title
    };
    navigateToResource(newResource);
  }, [navigateToResource]);

  // Handle TN (scripture navigation) link clicks
  const handleTNLinkClick = useCallback((bookCode: string, chapter: number, verse: number, title?: string) => {
    console.log(`🔄 ResourceModal: TN link clicked, minimizing and navigating to: ${bookCode} ${chapter}:${verse}`, title);
    
    // Set navigation flag to prevent unwanted restoration
    isNavigatingRef.current = true;
    
    // Minimize the modal immediately using the appropriate method
    if (onMinimizeOverride) {
      onMinimizeOverride();
    } else {
      setInternalIsMinimized(true);
    }
    
    // Navigate directly with a small delay to ensure minimization is processed
    setTimeout(() => {
      navigateToReference({
        book: bookCode.toLowerCase(),
        chapter,
        verse
      });
      
      // Clear navigation flag after navigation
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
    }, 50);
  }, [navigateToReference, onMinimizeOverride]);

  // Handle escape key and body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isMinimized) {
          // If minimized, restore first, then close on second escape
          handleRestore();
        } else {
          // If open, minimize first, then close on second escape
          handleMinimize();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Only hide overflow when modal is fully open, not when minimized
      if (!isMinimized) {
        document.body.style.overflow = 'hidden';
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isMinimized, handleMinimize, handleRestore]);

  // Helper functions
  const extractTitleFromId = (id: string): string => {
    const parts = id.split('/');
    const filename = parts[parts.length - 1];
    return filename
      .replace(/\.md$/, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const extractCategoryFromId = (id: string): string => {
    if (id.includes('/kt/')) return 'Key Terms';
    if (id.includes('/names/')) return 'Names';
    if (id.includes('/other/')) return 'Other';
    return 'Translation Words';
  };

  // Removed getCategoryColor as it's not being used in the current UI

  const getResourceIcon = (type: ResourceContentType): string => {
    return type === 'ta' ? '🎓' : '📚';
  };

  const getResourceTypeLabel = (type: ResourceContentType): string => {
    return type === 'ta' ? 'Translation Academy' : 'Translation Words';
  };

  if (!isOpen) return null;

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < navigationStack.length - 1;

  // Minimized state - show floating button
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleRestore}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105 flex items-center space-x-3"
          aria-label="Restore resource modal"
        >
          <div className="flex items-center space-x-2">
            <span role="img" aria-label={currentResource ? getResourceTypeLabel(currentResource.type) : 'Resource'}>
              {currentResource ? getResourceIcon(currentResource.type) : '📖'}
            </span>
            <span className="hidden sm:block text-sm font-medium">
              {currentResource?.displayTitle || currentResource?.title || 'Resource'}
            </span>
          </div>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </button>
      </div>
    );
  }

  // Full modal state
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2 flex-1">
            {/* Navigation Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={navigateBack}
                disabled={!canGoBack}
                className={`p-1.5 rounded-md transition-colors ${
                  canGoBack 
                    ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100' 
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                aria-label="Go back"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={navigateForward}
                disabled={!canGoForward}
                className={`p-1.5 rounded-md transition-colors ${
                  canGoForward 
                    ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100' 
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                aria-label="Go forward"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Resource Info */}
            {currentResource && (
              <>
                <div className="w-px h-5 bg-gray-300 mx-2" />
                <div className="flex items-center space-x-2">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full">
                    <span role="img" aria-label={getResourceTypeLabel(currentResource.type)} className="text-sm">
                      {getResourceIcon(currentResource.type)}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                      {currentResource.displayTitle || currentResource.title || getResourceTypeLabel(currentResource.type)}
                    </h2>
                    <p className="text-xs text-gray-500 leading-tight">
                      {currentResource.id}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Minimize Button */}
            <button
              onClick={handleMinimize}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Minimize modal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <p className="text-sm text-gray-600">Loading content...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center p-12">
              <div className="text-center text-red-600">
                <span role="img" aria-label="error">⚠️</span>
                <p className="mt-2 font-medium">Failed to load content</p>
                <p className="text-sm text-gray-500 mt-1">{error}</p>
              </div>
            </div>
          )}

          {content && !loading && !error && (
            <div className="p-6">
              <div className="prose prose-lg max-w-none">
                 <MarkdownRenderer 
                   content={removeFirstHeading(content.content)}
                   currentBook={currentReference.book}
                   onTALinkClick={handleTALinkClick}
                   onTWLinkClick={handleTWLinkClick}
                   onNavigationClick={handleTNLinkClick}
                 />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceModal;
