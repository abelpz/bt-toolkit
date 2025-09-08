/**
 * Markdown Rendering Service for Translation Notes
 * 
 * A lightweight markdown parser and renderer optimized for Translation Notes content.
 * Supports common markdown features without external dependencies.
 * 
 * Features:
 * - **bold** and *italic* text
 * - [links](url) with configurable targets
 * - `inline code` with custom styling
 * - Line breaks and paragraphs
 * - Lists (- item)
 * - Headers (# ## ###)
 * - Escaped characters
 * - Door43-specific link patterns
 * - Verse reference links
 */

export type MarkdownOutputFormat = 'html' | 'react' | 'react-native';

export interface MarkdownElement {
  type: 'paragraph' | 'header' | 'bold' | 'italic' | 'code' | 'link' | 'list' | 'text' | 'door43-link' | 'verse-link';
  content: string | MarkdownElement[];
  level?: number; // For headers
  href?: string; // For links
  className?: string;
  // Door43-specific properties
  resourceType?: string; // For Door43 links (ta, tw, tn, etc.)
  resourcePath?: string; // For Door43 links
  verseRef?: string; // For verse links
}

export interface MarkdownRenderOptions {
  format: MarkdownOutputFormat;
  className?: string;
  linkTarget?: '_blank' | '_self';
  codeClassName?: string;
  headerBaseLevel?: number; // Base level for headers (default: 3)
}

export class MarkdownRenderingService {
  private defaultOptions: MarkdownRenderOptions = {
    format: 'html',
    linkTarget: '_blank',
    codeClassName: 'bg-gray-100 px-1 py-0.5 rounded text-sm font-mono',
    headerBaseLevel: 3
  };

  /**
   * Preprocess content to handle special cases
   */
  private preprocessContent(content: string): string {
    // Handle line breaks - convert double newlines to paragraph breaks
    let processed = content.replace(/\n\n+/g, '\n\n');
    
    // Handle Door43 resource links: [[rc://*/ta/man/translate/figs-metaphor]]
    processed = processed.replace(
      /\[\[rc:\/\/\*\/([^\/]+)\/[^\/]+\/([^\/]+)\/([^\]]+)\]\]/g,
      '[Door43 $1]($3)'
    );
    
    // Handle verse references: [[01:04]]
    processed = processed.replace(
      /\[\[(\d+):(\d+)\]\]/g,
      '[Verse $1:$2](verse:$1:$2)'
    );
    
    return processed;
  }

  /**
   * Parse markdown content into structured elements
   */
  parse(content: string): MarkdownElement[] {
    const preprocessed = this.preprocessContent(content);
    const lines = preprocessed.split('\n');
    const elements: MarkdownElement[] = [];
    
    let currentParagraph: string[] = [];
    
    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim();
        if (paragraphText) {
          elements.push({
            type: 'paragraph',
            content: this.parseInlineElements(paragraphText)
          });
        }
        currentParagraph = [];
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Empty line - flush current paragraph
      if (!trimmed) {
        flushParagraph();
        continue;
      }
      
      // Headers
      const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        flushParagraph();
        elements.push({
          type: 'header',
          level: headerMatch[1].length,
          content: this.parseInlineElements(headerMatch[2])
        });
        continue;
      }
      
      // Lists
      const listMatch = trimmed.match(/^[-*+]\s+(.+)$/);
      if (listMatch) {
        flushParagraph();
        elements.push({
          type: 'list',
          content: this.parseInlineElements(listMatch[1])
        });
        continue;
      }
      
      // Regular text - add to current paragraph
      currentParagraph.push(trimmed);
    }
    
    // Flush any remaining paragraph
    flushParagraph();
    
    return elements;
  }

  /**
   * Parse inline markdown elements (bold, italic, links, code)
   */
  private parseInlineElements(text: string): MarkdownElement[] {
    const elements: MarkdownElement[] = [];
    let remaining = text;
    
    while (remaining.length > 0) {
      // Find the next markdown pattern
      const patterns = [
        { regex: /^\*\*([^*]+)\*\*/, type: 'bold' as const },
        { regex: /^\*([^*]+)\*/, type: 'italic' as const },
        { regex: /^`([^`]+)`/, type: 'code' as const },
        { regex: /^\[([^\]]+)\]\(([^)]+)\)/, type: 'link' as const }
      ];
      
      let matched = false;
      
      for (const pattern of patterns) {
        const match = remaining.match(pattern.regex);
        if (match) {
          if (pattern.type === 'link') {
            const linkText = match[1];
            const linkUrl = match[2];
            
            // Check for Door43 links
            if (linkText.startsWith('Door43 ')) {
              const resourceType = linkText.replace('Door43 ', '').toLowerCase();
              elements.push({
                type: 'door43-link',
                content: linkText,
                href: `https://door43.org/${resourceType}/${linkUrl}`,
                resourceType,
                resourcePath: linkUrl
              });
            }
            // Check for verse links
            else if (linkUrl.startsWith('verse:')) {
              const verseRef = linkUrl.replace('verse:', '');
              elements.push({
                type: 'verse-link',
                content: linkText,
                href: `#verse-${verseRef}`,
                verseRef
              });
            }
            // Regular link
            else {
              elements.push({
                type: 'link',
                content: linkText,
                href: linkUrl
              });
            }
          } else {
            elements.push({
              type: pattern.type,
              content: match[1]
            });
          }
          
          remaining = remaining.substring(match[0].length);
          matched = true;
          break;
        }
      }
      
      // If no pattern matched, consume one character as text
      if (!matched) {
        const nextPatternIndex = Math.min(
          ...patterns
            .map(p => {
              const match = remaining.match(p.regex);
              return match ? remaining.indexOf(match[0]) : Infinity;
            })
            .filter(i => i > 0)
        );
        
        const textLength = nextPatternIndex === Infinity ? remaining.length : nextPatternIndex;
        const textContent = remaining.substring(0, textLength);
        
        if (textContent) {
          elements.push({
            type: 'text',
            content: textContent
          });
        }
        
        remaining = remaining.substring(textLength);
      }
    }
    
    return elements;
  }

  /**
   * Render elements to HTML
   */
  renderToHTML(elements: MarkdownElement[], options: Partial<MarkdownRenderOptions> = {}): string {
    const opts = { ...this.defaultOptions, ...options };
    
    return elements.map(element => this.elementToHTML(element, opts)).join('');
  }

  private elementToHTML(element: MarkdownElement, options: MarkdownRenderOptions): string {
    switch (element.type) {
      case 'paragraph':
        const pContent = Array.isArray(element.content)
          ? this.renderToHTML(element.content, options)
          : element.content;
        return `<p class="mb-3 last:mb-0">${pContent}</p>`;
        
      case 'header':
        const level = Math.min((element.level || 1) + (options.headerBaseLevel || 3) - 1, 6);
        const hContent = Array.isArray(element.content)
          ? this.renderToHTML(element.content, options)
          : element.content;
        const headerClass = level <= 3 ? 'text-lg font-semibold' : 
                           level === 4 ? 'text-base font-semibold' : 
                           'text-sm font-semibold';
        return `<h${level} class="${headerClass} mb-2">${hContent}</h${level}>`;
        
      case 'list':
        const lContent = Array.isArray(element.content)
          ? this.renderToHTML(element.content, options)
          : element.content;
        return `<ul class="mb-3 ml-4"><li class="list-disc">${lContent}</li></ul>`;
        
      case 'bold':
        return `<strong class="font-semibold">${element.content}</strong>`;
        
      case 'italic':
        return `<em class="italic">${element.content}</em>`;
        
      case 'code':
        return `<code class="${options.codeClassName}">${element.content}</code>`;
        
      case 'link':
        const target = options.linkTarget === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${element.href}" class="text-blue-600 hover:text-blue-800 underline"${target}>${element.content}</a>`;

      case 'door43-link':
        return `<a href="${element.href}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-sm bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors duration-200" title="Door43 ${element.resourceType?.toUpperCase()} Resource: ${element.resourcePath}"><span class="text-xs">📖</span><span>${element.content}</span></a>`;

      case 'verse-link':
        return `<a href="${element.href}" class="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-sm bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors duration-200" title="Scripture Reference: ${element.verseRef}"><span class="text-xs">📍</span><span>${element.content}</span></a>`;
        
      case 'text':
      default:
        return String(element.content);
    }
  }

  /**
   * Convenience method to render markdown directly to HTML
   */
  renderMarkdownToHTML(content: string, options: Partial<MarkdownRenderOptions> = {}): string {
    const elements = this.parse(content);
    return this.renderToHTML(elements, options);
  }

  /**
   * Get statistics about markdown content
   */
  getStats(content: string) {
    const elements = this.parse(content);
    
    const countElements = (els: MarkdownElement[]): Record<string, number> => {
      const counts: Record<string, number> = {};
      
      for (const el of els) {
        counts[el.type] = (counts[el.type] || 0) + 1;
        
        if (Array.isArray(el.content)) {
          const subCounts = countElements(el.content);
          for (const [type, count] of Object.entries(subCounts)) {
            counts[type] = (counts[type] || 0) + count;
          }
        }
      }
      
      return counts;
    };
    
    const elementCounts = countElements(elements);
    const totalElements = Object.values(elementCounts).reduce((sum, count) => sum + count, 0);
    const hasMarkdown = totalElements > 1 || (totalElements === 1 && !elementCounts.text);
    
    return {
      totalElements,
      hasMarkdown,
      elementCounts
    };
  }
}

// Export singleton instance
export const markdownRenderer = new MarkdownRenderingService();
