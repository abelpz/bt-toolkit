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
import { remarkRenderer } from '../../services/remark-markdown-renderer';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  linkTarget?: '_blank' | '_self';
  headerBaseLevel?: number;
  showStats?: boolean; // For debugging
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = "",
  linkTarget = '_blank',
  headerBaseLevel = 3,
  showStats = false
}) => {
  const [renderedContent, setRenderedContent] = useState<React.ReactNode>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
        
        // Render markdown content
        const result = await remarkRenderer.renderToReact(content);
        setRenderedContent(result);
        
        // Get stats if requested
        if (showStats) {
          const statsResult = await remarkRenderer.getStats(content);
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
  }, [content, linkTarget, headerBaseLevel, showStats]);
  
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
          <div>Types: {Object.entries(stats.nodeTypes).map(([type, count]) => `${type}:${count}`).join(', ')}</div>
        </div>
      )}
    </div>
  );
};

export default MarkdownRenderer;
