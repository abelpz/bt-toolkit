/**
 * Translation Words Modal Component
 * 
 * Displays Translation Words articles in a modal overlay.
 * Used when clicking on TW links in markdown content.
 */

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Icon } from '../ui/Icon';
import { ResourceMetadata, ResourceType } from '../../types/context';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';

interface TranslationWord {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface TranslationWordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordId: string; // e.g., "kt/faith", "names/moses", "other/shepherd"
  title?: string;
  onTWLinkClick?: (wordId: string, title?: string) => void; // Handle TW-to-TW navigation
  onTALinkClick?: (articleId: string, title?: string) => void; // Handle TA links within TW content
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

export const TranslationWordsModal: React.FC<TranslationWordsModalProps> = ({
  isOpen,
  onClose,
  wordId,
  title,
  onTWLinkClick,
  onTALinkClick
}) => {
  const { resourceManager, processedResourceConfig, anchorResource } = useWorkspace();
  
  const [word, setWord] = useState<TranslationWord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setResourceMetadata] = useState<ResourceMetadata | null>(null);

  // Find the Translation Words global resource
  const wordsResourceConfig = React.useMemo(() => {
    if (!processedResourceConfig?.metadata) return null;
    
    console.log(`🔍 TranslationWordsModal - Looking for Translation Words resource in:`, processedResourceConfig.metadata);
    
    // Look for the Translation Words global resource by panelResourceId
    const config = Array.from(processedResourceConfig.metadata.values()).find(
      config => {
        console.log(`🔍 TranslationWordsModal - Checking config:`, config);
        return config.id === 'translation-words-global' || 
               (config.id === 'tw' && config.type === 'words') ||
               config.resourceKey?.includes('/tw');
      }
    );
    
    console.log(`🎯 TranslationWordsModal - Found words config:`, config);
    return config;
  }, [processedResourceConfig]);

  // Load word content when modal opens
  useEffect(() => {
    if (!isOpen || !wordId || !resourceManager) {
      console.log(`❌ TranslationWordsModal - Missing dependencies:`, {
        isOpen,
        wordId,
        hasResourceManager: !!resourceManager,
        hasWordsConfig: !!wordsResourceConfig
      });
      return;
    }

    const loadWord = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`📖 TranslationWordsModal - Loading word: ${wordId}`);
        console.log(`📋 TranslationWordsModal - Using config:`, wordsResourceConfig);
        
        // Construct the content key for Translation Words
        // Format: server/owner/language/resourceId/entryId
        // Use workspace context (anchor resource) for server/owner/language
        const server = anchorResource?.server || wordsResourceConfig?.server || 'git.door43.org';
        const owner = anchorResource?.owner || wordsResourceConfig?.owner || 'unfoldingWord';
        const language = anchorResource?.language || wordsResourceConfig?.language || 'en';
        const resourceId = 'tw'; // Always 'tw' for Translation Words
        
        console.log(`📋 TranslationWordsModal - Anchor resource:`, anchorResource);
        console.log(`📋 TranslationWordsModal - Server: ${server} (from: ${anchorResource?.server ? 'anchor' : wordsResourceConfig?.server ? 'config' : 'default'})`);
        console.log(`📋 TranslationWordsModal - Owner: ${owner} (from: ${anchorResource?.owner ? 'anchor' : wordsResourceConfig?.owner ? 'config' : 'default'})`);
        console.log(`📋 TranslationWordsModal - Language: ${language} (from: ${anchorResource?.language ? 'anchor' : wordsResourceConfig?.language ? 'config' : 'default'})`);
        console.log(`📋 TranslationWordsModal - Resource ID: ${resourceId}`);
        console.log(`📋 TranslationWordsModal - Word ID: ${wordId}`);
        
        const contentKey = `${server}/${owner}/${language}/${resourceId}/${wordId}`;
        console.log(`📋 TranslationWordsModal - Content key: ${contentKey}`);
        
        // Get word content using ResourceType.WORDS
        const content = await resourceManager.getOrFetchContent(
          contentKey,
          ResourceType.WORDS
        );
        
        console.log(`📋 TranslationWordsModal - Raw content received:`, content);
        
        if (content && (content as { word?: { term?: string; definition?: string } }).word) {
          // Content has direct word structure (same as TranslationWordsLinksViewer)
          const wordData = (content as { word: { term: string; definition: string; id?: string } }).word;
          
          console.log(`✅ TranslationWordsModal - Word data:`, wordData);
          
          setWord({
            id: wordData.id || wordId,
            title: wordData.term || title || extractTitleFromId(wordId),
            content: wordData.definition || 'No content available.',
            category: extractCategoryFromId(wordId)
          });
          
          // Store metadata for display
          setResourceMetadata(wordsResourceConfig);
          
        } else if (content?.content?.words && content.content.words.length > 0) {
          // Fallback: Content is wrapped in a ProcessedContent structure
          const wordData = content.content.words[0]; // Get the first (and likely only) word
          
          console.log(`✅ TranslationWordsModal - Word data (fallback):`, wordData);
          
          setWord({
            id: wordData.id || wordId,
            title: wordData.term || title || extractTitleFromId(wordId),
            content: wordData.definition || 'No content available.',
            category: extractCategoryFromId(wordId)
          });
          
          // Store metadata for display
          setResourceMetadata(wordsResourceConfig);
          
        } else if (content?.content) {
          // Handle direct content structure (fallback)
          console.log(`📋 TranslationWordsModal - Direct content structure:`, content.content);
          
          setWord({
            id: wordId,
            title: title || extractTitleFromId(wordId),
            content: typeof content.content === 'string' ? content.content : 'No content available.',
            category: extractCategoryFromId(wordId)
          });
          
          setResourceMetadata(wordsResourceConfig);
        } else {
          console.warn(`❌ TranslationWordsModal - No word content found for: ${wordId}`);
          setError(`Translation Word "${wordId}" not found.`);
        }
        
      } catch (err) {
        console.error(`❌ TranslationWordsModal - Failed to load word:`, err);
        setError(err instanceof Error ? err.message : 'Failed to load Translation Word');
      } finally {
        setLoading(false);
      }
    };

    loadWord();
  }, [isOpen, wordId, resourceManager, wordsResourceConfig, anchorResource, title]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
              <Icon name="translation-words" size={16} aria-label="book" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {word?.title || title || 'Translation Words'}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-xs text-gray-500">
                  {wordId}
                </p>
                
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Loading Translation Word...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-red-500" role="img" aria-label="warning">⚠️</span>
                <span className="text-red-700 font-medium">Error</span>
              </div>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          )}

          {word && !loading && !error && (
            <div className="space-y-6">
              {/* Content */}
              <div className="prose prose-lg max-w-none">
                <MarkdownRenderer 
                  content={removeFirstHeading(word.content)}
                  onTWLinkClick={onTWLinkClick ? (wordId: string, title?: string) => {
                    console.log(`📚 TW-to-TW navigation in modal: ${wordId} (${title})`);
                    onTWLinkClick(wordId, title);
                  } : undefined}
                  onTALinkClick={onTALinkClick ? (articleId: string, title?: string) => {
                    console.log(`📖 TA link clicked in TW modal: ${articleId} (${title})`);
                    onTALinkClick(articleId, title);
                  } : undefined}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranslationWordsModal;
