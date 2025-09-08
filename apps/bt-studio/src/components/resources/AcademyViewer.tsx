/**
 * Academy Viewer Component
 * 
 * Displays Translation Academy articles with markdown rendering and navigation support.
 * Handles entry-based content (articles) rather than book-based content.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { ProcessedContent, AcademyArticle, ResourceMetadata } from '../../types/context';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';

interface AcademyViewerProps {
  resourceId: string;
  propArticle?: ProcessedContent;
}

export const AcademyViewer: React.FC<AcademyViewerProps> = ({ 
  resourceId, 
  propArticle 
}) => {
  const { currentReference } = useNavigation();
  const { resourceManager, processedResourceConfig } = useWorkspace();
  
  const [actualArticle, setActualArticle] = useState<ProcessedContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [resourceMetadata, setResourceMetadata] = useState<ResourceMetadata | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('translate/figs-metaphor'); // Default article

  // Find the resource configuration for this resourceId
  const resourceConfig = useMemo(() => {
    if (!processedResourceConfig?.metadata) return null;
    
    return Array.from(processedResourceConfig.metadata.values()).find(
      config => config.id === resourceId
    );
  }, [processedResourceConfig, resourceId]);

  // Load article content
  useEffect(() => {
    if (!resourceManager || !resourceConfig || !selectedArticleId) return;

    const fetchContent = async () => {
      setLoading(true);
      setContentError(null);
      
      try {
        console.log(`📋 AcademyViewer - Loading article: ${selectedArticleId}`);
        console.log(`📋 AcademyViewer - Found resource config:`, resourceConfig);
        console.log(`📋 AcademyViewer - Using resource ID: ${resourceConfig.id}`);
        
        // Construct the full content key for academy articles
        // Format: server/owner/language/resourceId/entryId
        const contentKey = `${resourceConfig.server}/${resourceConfig.owner}/${resourceConfig.language}/${resourceConfig.id}/${selectedArticleId}`;
        console.log(`📋 AcademyViewer - Content key: ${contentKey}`);
        
        // Try to get content using the resource manager
        const content = await resourceManager.getOrFetchContent(
          contentKey,
          resourceConfig.type as any // Resource type from metadata
        );
        
        console.log(`✅ AcademyViewer - Content loaded for ${resourceId}:`, content);
        setActualArticle(content as ProcessedContent);
        
        // Use existing metadata from resource config for language direction
        console.log(`📋 AcademyViewer - Using existing metadata:`, resourceConfig);
        setResourceMetadata(resourceConfig);
        
      } catch (err) {
        console.error(`❌ AcademyViewer - Failed to load content for ${resourceId}:`, err);
        setContentError(err instanceof Error ? err.message : 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [resourceManager, resourceId, selectedArticleId, resourceConfig]);

  const displayArticle = actualArticle || propArticle;
  const isLoading = loading;

  // Get available articles from metadata
  const availableArticles = useMemo(() => {
    if (!resourceMetadata?.toc?.articles) return [];
    return resourceMetadata.toc.articles;
  }, [resourceMetadata]);

  // Determine text direction based on resource metadata
  const textDirection = resourceMetadata?.languageDirection || 'ltr';
  const textAlign = textDirection === 'rtl' ? 'text-right rtl' : 'text-left ltr';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading Translation Academy article...</p>
        </div>
      </div>
    );
  }

  if (contentError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <span role="img" aria-label="error">⚠️</span>
          <p className="mt-2">Failed to load article</p>
          <p className="text-sm text-gray-500 mt-1">{contentError}</p>
        </div>
      </div>
    );
  }

  if (!displayArticle?.article) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-500">
          <span role="img" aria-label="no content">📖</span>
          <p className="mt-2">No article content available</p>
          <p className="text-sm mt-1">Select an article to view its content</p>
        </div>
      </div>
    );
  }

  const article = displayArticle.article as AcademyArticle;

  return (
    <div className="h-full flex flex-col">
      {/* Article Selection Header */}
      <div className="flex-shrink-0 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Translation Academy</h2>
            <p className="text-sm text-gray-600">Training materials and methodology</p>
          </div>
          
          {/* Article Selector */}
          <div className="flex items-center space-x-2">
            <label htmlFor="article-select" className="text-sm font-medium text-gray-700">
              Article:
            </label>
            <select
              id="article-select"
              value={selectedArticleId}
              onChange={(e) => setSelectedArticleId(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableArticles.map((articleInfo) => (
                <option key={articleInfo.id} value={articleInfo.id}>
                  {articleInfo.title} ({articleInfo.category})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="flex-1 overflow-auto">
        <div className={`p-6 ${textAlign}`} dir={textDirection}>
          <div className="max-w-4xl mx-auto">
            {/* Article Header */}
            <div className="mb-6">
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {article.category}
                </span>
                <span>•</span>
                <span>Translation Academy</span>
              </div>
            </div>

            {/* Rendered Article Content */}
            <div className="prose prose-lg max-w-none">
              <MarkdownRenderer content={article.content} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
