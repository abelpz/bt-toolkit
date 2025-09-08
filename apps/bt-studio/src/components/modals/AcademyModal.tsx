/**
 * Academy Modal Component
 * 
 * Displays Translation Academy articles in a modal overlay.
 * Used when clicking on support references in Translation Notes.
 */

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { AcademyArticle, ResourceMetadata, ResourceType } from '../../types/context';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';

interface AcademyModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string; // e.g., "translate/figs-metaphor"
  title?: string;
}

export const AcademyModal: React.FC<AcademyModalProps> = ({
  isOpen,
  onClose,
  articleId,
  title
}) => {
  const { resourceManager, processedResourceConfig, anchorResource } = useWorkspace();
  
  const [article, setArticle] = useState<AcademyArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resourceMetadata, setResourceMetadata] = useState<ResourceMetadata | null>(null);

  // Find the Translation Academy global resource
  const academyResourceConfig = React.useMemo(() => {
    if (!processedResourceConfig?.metadata) return null;
    
    console.log(`🔍 AcademyModal - Looking for Translation Academy resource in:`, processedResourceConfig.metadata);
    
    // Look for the Translation Academy global resource by panelResourceId
    const config = Array.from(processedResourceConfig.metadata.values()).find(
      config => {
        console.log(`🔍 AcademyModal - Checking config:`, config);
        return config.id === 'translation-academy-global' || 
               (config.id === 'ta' && config.type === 'academy') ||
               config.resourceKey?.includes('/ta');
      }
    );
    
    console.log(`🎯 AcademyModal - Found academy config:`, config);
    return config;
  }, [processedResourceConfig]);

  // Load article content when modal opens
  useEffect(() => {
    if (!isOpen || !articleId || !resourceManager) {
      console.log(`❌ AcademyModal - Missing dependencies:`, {
        isOpen,
        articleId,
        hasResourceManager: !!resourceManager,
        hasAcademyConfig: !!academyResourceConfig
      });
      return;
    }

    const loadArticle = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`📖 AcademyModal - Loading article: ${articleId}`);
        console.log(`📋 AcademyModal - Using config:`, academyResourceConfig);
        
        // Construct the content key for Translation Academy
        // Format: server/owner/language/resourceId/entryId
        // Use workspace context (anchor resource) for server/owner/language
        const server = anchorResource?.server || academyResourceConfig?.server || 'git.door43.org';
        const owner = anchorResource?.owner || academyResourceConfig?.owner || 'unfoldingWord';
        const language = anchorResource?.language || academyResourceConfig?.language || 'en';
        const resourceId = 'ta'; // Always 'ta' for Translation Academy
        
        console.log(`📋 AcademyModal - Anchor resource:`, anchorResource);
        console.log(`📋 AcademyModal - Server: ${server} (from: ${anchorResource?.server ? 'anchor' : academyResourceConfig?.server ? 'config' : 'default'})`);
        console.log(`📋 AcademyModal - Owner: ${owner} (from: ${anchorResource?.owner ? 'anchor' : academyResourceConfig?.owner ? 'config' : 'default'})`);
        console.log(`📋 AcademyModal - Language: ${language} (from: ${anchorResource?.language ? 'anchor' : academyResourceConfig?.language ? 'config' : 'default'})`);
        console.log(`📋 AcademyModal - Resource ID: ${resourceId}`);
        console.log(`📋 AcademyModal - Article ID: ${articleId}`);
        
        const contentKey = `${server}/${owner}/${language}/${resourceId}/${articleId}`;
        console.log(`📋 AcademyModal - Content key: ${contentKey}`);
        
        // Get article content using ResourceType.ACADEMY
        const content = await resourceManager.getOrFetchContent(
          contentKey,
          ResourceType.ACADEMY
        );
        
        console.log(`📋 AcademyModal - Raw content received:`, content);
        
        if (content?.content?.article) {
          // Content is wrapped in a ProcessedContent structure
          setArticle(content.content.article as AcademyArticle);
          console.log(`✅ AcademyModal - Article loaded from content.content.article:`, content.content.article);
        } else if (content?.article) {
          // Content is directly an article
          setArticle(content.article as AcademyArticle);
          console.log(`✅ AcademyModal - Article loaded from content.article:`, content.article);
        } else {
          console.error(`❌ AcademyModal - No article found in content:`, content);
          throw new Error('No article content received');
        }
        
        // Use existing metadata from resource config or defaults
        setResourceMetadata(academyResourceConfig || {
          languageDirection: 'ltr',
          languageTitle: 'English',
          languageIsGL: false
        } as ResourceMetadata);
        
      } catch (err) {
        console.error(`❌ AcademyModal - Failed to load article ${articleId}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [isOpen, articleId, resourceManager, academyResourceConfig, anchorResource]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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

  if (!isOpen) return null;

  // Determine text direction based on resource metadata
  const textDirection = resourceMetadata?.languageDirection || 'ltr';
  const textAlign = textDirection === 'rtl' ? 'text-right rtl' : 'text-left ltr';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                <span role="img" aria-label="graduation cap">🎓</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {title || article?.title || 'Translation Academy'}
                </h2>
                <p className="text-sm text-gray-600">
                  Training Article • {articleId}
                </p>
              </div>
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
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            {loading && (
              <div className="flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                  <p className="text-sm text-gray-600">Loading article...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center p-12">
                <div className="text-center text-red-600">
                  <span role="img" aria-label="error">⚠️</span>
                  <p className="mt-2 font-medium">Failed to load article</p>
                  <p className="text-sm text-gray-500 mt-1">{error}</p>
                  <button
                    onClick={onClose}
                    className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {article && !loading && !error && (
              <div className={`p-6 ${textAlign}`} dir={textDirection}>
                <div className="max-w-none">
                  {/* Article Category Badge */}
                  <div className="mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {article.category}
                    </span>
                  </div>

                  {/* Article Content */}
                  <div className="prose prose-lg max-w-none">
                    <MarkdownRenderer content={article.content} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-500">
              <span role="img" aria-label="info">ℹ️</span>
              Translation Academy • unfoldingWord®
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
