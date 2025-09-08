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

import React, { useMemo } from 'react';
import { markdownRenderer, type MarkdownElement, type MarkdownRenderOptions } from '../services/markdown-renderer';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  mode?: 'react' | 'html';
  linkTarget?: '_blank' | '_self';
  headerBaseLevel?: number;
  showStats?: boolean; // For debugging
}

// Convert parsed elements to React components
const elementsToReact = (elements: MarkdownElement[], options: MarkdownRenderOptions): React.ReactNode[] => {
  return elements.map((element, index) => {
    const key = `${element.type}-${index}`;
    
    switch (element.type) {
      case 'paragraph':
        const pContent = Array.isArray(element.content) 
          ? elementsToReact(element.content, options)
          : element.content;
        return (
          <p key={key} className="mb-3 last:mb-0">
            {pContent}
          </p>
        );
        
      case 'header':
        const level = Math.min((element.level || 1) + (options.headerBaseLevel || 3) - 1, 6);
        const HeaderTag = `h${level}` as keyof JSX.IntrinsicElements;
        const hContent = Array.isArray(element.content)
          ? elementsToReact(element.content, options)
          : element.content;
        const headerClass = level <= 3 ? 'text-lg font-semibold' : 
                           level === 4 ? 'text-base font-semibold' : 
                           'text-sm font-semibold';
        return (
          <HeaderTag key={key} className={`${headerClass} mb-2`}>
            {hContent}
          </HeaderTag>
        );
        
      case 'list':
        const lContent = Array.isArray(element.content)
          ? elementsToReact(element.content, options)
          : element.content;
        return (
          <ul key={key} className="mb-3 ml-4">
            <li className="list-disc">{lContent}</li>
          </ul>
        );
        
      case 'bold':
        return (
          <strong key={key} className="font-semibold">
            {element.content}
          </strong>
        );
        
      case 'italic':
        return (
          <em key={key} className="italic">
            {element.content}
          </em>
        );
        
      case 'code':
        return (
          <code key={key} className={options.codeClassName || 'bg-gray-100 px-1 py-0.5 rounded text-sm font-mono'}>
            {element.content}
          </code>
        );
        
      case 'link':
        const linkProps = options.linkTarget === '_blank' 
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {};
        return (
          <a 
            key={key}
            href={element.href}
            className="text-blue-600 hover:text-blue-800 underline"
            {...linkProps}
          >
            {element.content}
          </a>
        );

      case 'door43-link':
        return (
          <a 
            key={key}
            href={element.href}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center space-x-1 px-2 py-1 rounded-md text-sm
              bg-blue-50 dark:bg-blue-900/20 
              text-blue-700 dark:text-blue-300
              border border-blue-200 dark:border-blue-800
              hover:bg-blue-100 dark:hover:bg-blue-900/40
              transition-colors duration-200
            "
            title={`Door43 ${element.resourceType?.toUpperCase()} Resource: ${element.resourcePath}`}
          >
            <span className="text-xs">📖</span>
            <span>{element.content}</span>
          </a>
        );

      case 'verse-link':
        return (
          <a 
            key={key}
            href={element.href}
            className="
              inline-flex items-center space-x-1 px-2 py-1 rounded-md text-sm
              bg-purple-50 dark:bg-purple-900/20 
              text-purple-700 dark:text-purple-300
              border border-purple-200 dark:border-purple-800
              hover:bg-purple-100 dark:hover:bg-purple-900/40
              transition-colors duration-200
            "
            title={`Scripture Reference: ${element.verseRef}`}
          >
            <span className="text-xs">📍</span>
            <span>{element.content}</span>
          </a>
        );
        
      case 'text':
      default:
        return String(element.content);
    }
  });
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = "",
  mode = 'react',
  linkTarget = '_blank',
  headerBaseLevel = 3,
  showStats = false
}) => {
  // Memoize parsing and rendering for performance
  const { renderedContent, stats } = useMemo(() => {
    if (!content) {
      return { renderedContent: null, stats: null };
    }
    
    const options: MarkdownRenderOptions = {
      format: mode === 'html' ? 'html' : 'react',
      linkTarget,
      headerBaseLevel
    };
    
    const stats = showStats ? markdownRenderer.getStats(content) : null;
    
    if (mode === 'html') {
      const html = markdownRenderer.renderMarkdownToHTML(content, options);
      return { 
        renderedContent: <div dangerouslySetInnerHTML={{ __html: html }} />,
        stats 
      };
    } else {
      const elements = markdownRenderer.parse(content);
      const reactElements = elementsToReact(elements, options);
      return { 
        renderedContent: <>{reactElements}</>,
        stats 
      };
    }
  }, [content, mode, linkTarget, headerBaseLevel, showStats]);
  
  if (!content) {
    return null;
  }
  
  return (
    <div className={`markdown-content ${className}`}>
      {renderedContent}
      {showStats && stats && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <div><strong>Markdown Stats:</strong></div>
          <div>Elements: {stats.totalElements}, Has Markdown: {stats.hasMarkdown ? 'Yes' : 'No'}</div>
          <div>Types: {Object.entries(stats.elementCounts).map(([type, count]) => `${type}:${count}`).join(', ')}</div>
        </div>
      )}
    </div>
  );
};

export default MarkdownRenderer;
