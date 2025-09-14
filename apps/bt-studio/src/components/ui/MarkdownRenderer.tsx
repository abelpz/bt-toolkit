/**
 * Markdown Renderer Component for Translation Notes
 * 
 * A React component that renders markdown content using the MarkdownRenderingService.
 * Supports both React elements and HTML output modes.
 * 
 * Features:
 * - **bold** and *italic* text
 * - [links](url) with configurable targets
 * - `inline code` with custom styling
 * - Line breaks and paragraphs
 * - Lists (- item)
 * - Headers (# ## ###)
 * - Escaped characters
 * - Performance optimized with memoization
 */

import React, { useState, useEffect } from 'react';
import { enhancedRemarkRenderer } from '../../services/enhanced-remark-renderer';
import { useNavigation } from '../../contexts/NavigationContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import type { Door43LinkHandlers } from '../../services/remark-plugins/door43-rehype-plugin';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  linkTarget?: '_blank' | '_self';
  headerBaseLevel?: number;
  showStats?: boolean; // For debugging
  
  // Door43-specific props
  onTALinkClick?: (articleId: string, title?: string) => void;
  onTWLinkClick?: (wordId: string, title?: string) => void;
  onDisabledLinkClick?: (linkInfo: any, title?: string) => void;
  currentBook?: string; // For resolving relative navigation links
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = "",
  linkTarget = '_blank',
  headerBaseLevel = 3,
  showStats = false,
  onTALinkClick,
  onTWLinkClick,
  onDisabledLinkClick,
  currentBook
}) => {
  const [renderedContent, setRenderedContent] = useState<React.ReactNode>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get navigation actions and workspace resources
  const { navigateToReference, currentReference } = useNavigation();
  const { resourceManager, processedResourceConfig } = useWorkspace();
  
  useEffect(() => {
    if (!content) {
      setRenderedContent(null);
      setStats(null);
      setIsLoading(false);
      return;
    }
    
    const renderContent = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Create Door43 link handlers
        const door43Handlers: Door43LinkHandlers = {
          onTALinkClick: (articleId: string, title?: string) => {
            console.log(`📖 TA Link clicked: ${articleId}`, title);
            if (onTALinkClick) {
              onTALinkClick(articleId, title);
            }
          },
          
          onTWLinkClick: (wordId: string, title?: string) => {
            console.log(`📚 TW Link clicked: ${wordId}`, title);
            if (onTWLinkClick) {
              onTWLinkClick(wordId, title);
            }
          },
          
          onNavigationClick: (bookCode: string, chapter: number, verse: number, title?: string) => {
            console.log(`📍 Navigation clicked: ${bookCode} ${chapter}:${verse}`, title);
            navigateToReference({
              book: bookCode,
              chapter,
              verse
            });
          },
          
          onDisabledLinkClick: (linkInfo: any, title?: string) => {
            console.log(`🚫 Disabled link clicked:`, linkInfo, title);
            if (onDisabledLinkClick) {
              onDisabledLinkClick(linkInfo, title);
            }
          }
        };
        
        // Update the enhanced renderer with current options
        enhancedRemarkRenderer.updateOptions({
          linkTarget,
          headerBaseLevel,
          door43Handlers,
          currentBook: currentBook || currentReference.book,
          resourceManager,
          processedResourceConfig
        });
        
        // Render markdown content
        const result = await enhancedRemarkRenderer.renderToReact(content);
        setRenderedContent(result);
        
        // Get stats if requested
        if (showStats) {
          const statsResult = await enhancedRemarkRenderer.getStats(content);
          setStats(statsResult);
        }
        
      } catch (err) {
        console.error('Markdown rendering error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setRenderedContent(<span className="text-red-500">Error rendering markdown</span>);
      } finally {
        setIsLoading(false);
      }
    };
    
    renderContent();
  }, [content, linkTarget, headerBaseLevel, showStats, onTALinkClick, onTWLinkClick, onDisabledLinkClick, currentBook, currentReference.book, navigateToReference, resourceManager, processedResourceConfig]);
  
  if (!content) {
    return null;
  }
  
  if (isLoading) {
    return (
      <div className={`markdown-content ${className}`}>
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`markdown-content ${className}`}>
        <span className="text-red-500">Error: {error}</span>
      </div>
    );
  }
  
  return (
    <div className={`markdown-content ${className}`}>
      {renderedContent}
      {showStats && stats && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <div><strong>Markdown Stats:</strong></div>
          <div>Nodes: {stats.totalNodes}, Has Markdown: {stats.hasMarkdown ? 'Yes' : 'No'}</div>
          <div>Door43 Links: {stats.door43Links || 0}, Relative Links: {stats.relativeLinks || 0}</div>
          <div>Has Door43 Content: {stats.hasDoor43Content ? 'Yes' : 'No'}</div>
          <div>Types: {Object.entries(stats.nodeTypes || {}).map(([type, count]) => `${type}:${count}`).join(', ')}</div>
          {stats.error && <div className="text-red-600">Error: {stats.error}</div>}
        </div>
      )}
    </div>
  );
};

export default MarkdownRenderer;
