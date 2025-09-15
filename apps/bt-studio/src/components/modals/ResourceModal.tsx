/**
 * Unified Resource Modal Component
 * 
 * Displays both Translation Academy and Translation Words content in a single modal
 * with navigation history support for seamless back/forward navigation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { AcademyArticle, ResourceMetadata, ResourceType } from '../../types/context';
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
  initialResource
}) => {
  const { resourceManager, processedResourceConfig, anchorResource } = useWorkspace();
  const { currentReference } = useNavigation();
  
  // Navigation history stack
  const [navigationStack, setNavigationStack] = useState<ResourceItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  
  // Content state
  const [content, setContent] = useState<AcademyArticle | TranslationWord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resourceMetadata, setResourceMetadata] = useState<ResourceMetadata | null>(null);

  // Current resource being displayed
  const currentResource = currentIndex >= 0 ? navigationStack[currentIndex] : null;

  // Initialize modal with initial resource
  useEffect(() => {
    if (isOpen && initialResource && navigationStack.length === 0) {
      setNavigationStack([initialResource]);
      setCurrentIndex(0);
    }
  }, [isOpen, initialResource, navigationStack.length]);

  // Clear navigation when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNavigationStack([]);
      setCurrentIndex(-1);
      setContent(null);
      setError(null);
    }
  }, [isOpen]);

  // Navigation functions
  const navigateToResource = useCallback((resource: ResourceItem) => {
    setNavigationStack(prev => {
      // Remove any items after current index (forward history)
      const newStack = prev.slice(0, currentIndex + 1);
      // Add new resource
      newStack.push(resource);
      return newStack;
    });
    setCurrentIndex(currentIndex + 1);
  }, [currentIndex]);

  const navigateBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const navigateForward = useCallback(() => {
    if (currentIndex < navigationStack.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, navigationStack.length]);

  // Load content when current resource changes
  useEffect(() => {
    if (!currentResource || !resourceManager) return;

    console.log(`🔄 ResourceModal loading content: ${currentResource.type}/${currentResource.id}`);

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
  }, [currentResource?.type, currentResource?.id, resourceManager]); // Only depend on type and id, not the whole object

  // Load Translation Academy article
  const loadAcademyArticle = async (articleId: string) => {
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
    
    if (content?.content?.article) {
      const article = content.content.article as AcademyArticle;
      setContent(article);
      
      // Update the current resource with the actual title
      setNavigationStack(prev => prev.map((item, index) => 
        index === currentIndex 
          ? { ...item, displayTitle: article.title }
          : item
      ));
    } else if (content?.article) {
      const article = content.article as AcademyArticle;
      setContent(article);
      
      setNavigationStack(prev => prev.map((item, index) => 
        index === currentIndex 
          ? { ...item, displayTitle: article.title }
          : item
      ));
    } else {
      throw new Error('No article content received');
    }

    setResourceMetadata(academyResourceConfig);
  };

  // Load Translation Word
  const loadTranslationWord = async (wordId: string) => {
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

    setResourceMetadata(wordsResourceConfig);
  };

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

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

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

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'Key Terms': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Names': return 'bg-green-100 text-green-800 border-green-200';
      case 'Other': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getResourceIcon = (type: ResourceContentType): string => {
    return type === 'ta' ? '🎓' : '📚';
  };

  const getResourceTypeLabel = (type: ResourceContentType): string => {
    return type === 'ta' ? 'Translation Academy' : 'Translation Words';
  };

  if (!isOpen) return null;

  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < navigationStack.length - 1;

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
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 flex-1">
            {/* Navigation Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={navigateBack}
                disabled={!canGoBack}
                className={`p-2 rounded-lg transition-colors ${
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
                className={`p-2 rounded-lg transition-colors ${
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
                <div className="w-px h-6 bg-gray-300 mx-2" />
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                    <span role="img" aria-label={getResourceTypeLabel(currentResource.type)}>
                      {getResourceIcon(currentResource.type)}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {currentResource.displayTitle || currentResource.title || getResourceTypeLabel(currentResource.type)}
                    </h2>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {currentResource.id}
                      </p>
                      
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
