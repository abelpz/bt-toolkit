/**
 * Markdown Rendering Service
 * 
 * A flexible markdown rendering service that can output different formats:
 * - HTML for web applications
 * - React elements for React web
 * - React Native elements (future)
 * 
 * This service is designed to handle translation notes markdown content
 * and can be extended to support additional markdown features as needed.
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
   * Preprocess content to handle escaped characters and normalize formatting
   */
  private preprocessContent(content: string): string {
    return content
      // Convert escaped newlines to actual newlines
      .replace(/\\n/g, '\n')
      // Convert escaped tabs to spaces
      .replace(/\\t/g, '  ')
      // Convert escaped quotes
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      // Convert other common escape sequences
      .replace(/\\r/g, '\r')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }

  /**
   * Parse markdown content into structured elements
   */
  parse(content: string): MarkdownElement[] {
    if (!content) return [];
    
    // Preprocess content to handle escaped newlines and other escape sequences
    const preprocessedContent = this.preprocessContent(content);
    
    const lines = preprocessedContent.split('\n');
    const elements: MarkdownElement[] = [];
    let currentParagraph: string[] = [];
    
    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphContent = currentParagraph.join(' ').trim();
        if (paragraphContent) {
          elements.push({
            type: 'paragraph',
            content: this.parseInlineElements(paragraphContent)
          });
        }
        currentParagraph = [];
      }
    };
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Empty line - flush current paragraph
      if (!trimmedLine) {
        flushParagraph();
        continue;
      }
      
      // Headers
      if (trimmedLine.startsWith('#')) {
        flushParagraph();
        const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const text = headerMatch[2];
          elements.push({
            type: 'header',
            content: this.parseInlineElements(text),
            level
          });
          continue;
        }
      }
      
      // List items
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        flushParagraph();
        const listText = trimmedLine.substring(2).trim();
        elements.push({
          type: 'list',
          content: this.parseInlineElements(listText)
        });
        continue;
      }
      
      // Regular line - add to current paragraph
      currentParagraph.push(trimmedLine);
    }
    
    // Flush any remaining paragraph
    flushParagraph();
    
    return elements;
  }

  /**
   * Parse inline markdown elements
   */
  private parseInlineElements(text: string): MarkdownElement[] {
    const elements: MarkdownElement[] = [];
    let remaining = text;
    
    while (remaining.length > 0) {
      // Find the next markdown pattern - order matters!
      const patterns = [
        // Door43 resource links: [[rc://*/ta/man/translate/figs-metaphor]]
        { regex: /^\[\[rc:\/\/\*\/([^\/\n]+)\/([^\/\n]+)\/([^\/\n]+)\/([^\]\n]+)\]\]/, type: 'door43-link' as const },
        // Verse reference links: [verse 6](../01/06.md) or [chapter 2](../02/intro.md)
        { regex: /^\[(?:verse|chapter|v\.?|ch\.?)\s*(\d+)(?::(\d+))?\]\(([^)\n]+?)\)/, type: 'verse-link' as const },
        // Regular markdown patterns
        { regex: /^\*\*([^*\n]+?)\*\*/, type: 'bold' as const }, // Bold first (greedy)
        { regex: /^\*([^*\n]+?)\*/, type: 'italic' as const },   // Then italic
        { regex: /^`([^`\n]+?)`/, type: 'code' as const },       // Code blocks
        { regex: /^\[([^\]\n]+?)\]\(([^)\n]+?)\)/, type: 'link' as const }, // Regular links
        { regex: /^\\([\\*_`\[\]()#-])/, type: 'escape' as const }, // Escaped characters
      ];
      
      let matched = false;
      
      for (const pattern of patterns) {
        const match = remaining.match(pattern.regex);
        if (match) {
          matched = true;
          
          if (pattern.type === 'door43-link') {
            // Parse Door43 resource link: [[rc://*/ta/man/translate/figs-metaphor]]
            const [, resourceType, category, subcategory, resourceName] = match;
            elements.push({
              type: 'door43-link',
              content: resourceName.replace(/-/g, ' '), // Convert kebab-case to readable
              resourceType,
              resourcePath: `${category}/${subcategory}/${resourceName}`,
              href: `https://git.door43.org/unfoldingWord/${resourceType}/src/branch/master/${category}/${subcategory}/${resourceName}.md`
            });
          } else if (pattern.type === 'verse-link') {
            // Parse verse reference link: [verse 6](../01/06.md)
            const [fullMatch, chapter, verse, path] = match;
            const linkText = fullMatch.substring(1, fullMatch.indexOf(']'));
            const verseRef = verse ? `${chapter}:${verse}` : chapter;
            elements.push({
              type: 'verse-link',
              content: linkText,
              verseRef,
              href: path
            });
          } else if (pattern.type === 'link') {
            elements.push({
              type: 'link',
              content: match[1],
              href: match[2]
            });
          } else if (pattern.type === 'escape') {
            elements.push({
              type: 'text',
              content: match[1] // Just the escaped character without backslash
            });
          } else {
            elements.push({
              type: pattern.type,
              content: match[1]
            });
          }
          
          remaining = remaining.substring(match[0].length);
          break;
        }
      }
      
      // If no pattern matched, take consecutive plain text
      if (!matched) {
        let plainText = '';
        let i = 0;
        
        while (i < remaining.length) {
          // Check if this position starts a markdown pattern
          const startsPattern = patterns.some(p => 
            remaining.substring(i).match(p.regex)
          );
          
          if (startsPattern) break;
          
          plainText += remaining[i];
          i++;
        }
        
        if (plainText) {
          elements.push({
            type: 'text',
            content: plainText
          });
        } else {
          // Prevent infinite loop - take at least one character
          elements.push({
            type: 'text',
            content: remaining[0]
          });
          i = 1;
        }
        
        remaining = remaining.substring(i || plainText.length);
      }
    }
    
    return elements;
  }

  /**
   * Render parsed elements to HTML string
   */
  renderToHTML(elements: MarkdownElement[], options: Partial<MarkdownRenderOptions> = {}): string {
    const opts = { ...this.defaultOptions, ...options, format: 'html' as const };
    
    return elements.map(element => this.elementToHTML(element, opts)).join('');
  }

  /**
   * Render a single element to HTML
   */
  private elementToHTML(element: MarkdownElement, options: MarkdownRenderOptions): string {
    switch (element.type) {
      case 'paragraph':
        const pContent = Array.isArray(element.content) 
          ? element.content.map(el => this.elementToHTML(el, options)).join('')
          : element.content;
        return `<p class="mb-3 last:mb-0">${pContent}</p>`;
        
      case 'header':
        const level = Math.min((element.level || 1) + (options.headerBaseLevel || 3) - 1, 6);
        const hContent = Array.isArray(element.content)
          ? element.content.map(el => this.elementToHTML(el, options)).join('')
          : element.content;
        const headerClass = level <= 3 ? 'text-lg font-semibold' : 
                           level === 4 ? 'text-base font-semibold' : 
                           'text-sm font-semibold';
        return `<h${level} class="${headerClass} mb-2">${hContent}</h${level}>`;
        
      case 'list':
        const lContent = Array.isArray(element.content)
          ? element.content.map(el => this.elementToHTML(el, options)).join('')
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
        return `<a href="${element.href}" target="_blank" rel="noopener noreferrer" 
          class="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors duration-200"
          title="Door43 ${element.resourceType?.toUpperCase()} Resource: ${element.resourcePath}">
          <span class="text-xs">📖</span>
          <span>${element.content}</span>
        </a>`;

      case 'verse-link':
        return `<a href="${element.href}" 
          class="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-sm bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors duration-200"
          title="Scripture Reference: ${element.verseRef}">
          <span class="text-xs">📍</span>
          <span>${element.content}</span>
        </a>`;
        
      case 'text':
        return String(element.content);
        
      default:
        return String(element.content);
    }
  }

  /**
   * Render markdown content directly to HTML
   */
  renderMarkdownToHTML(content: string, options: Partial<MarkdownRenderOptions> = {}): string {
    if (!content || typeof content !== 'string') {
      return '';
    }
    
    // Parse will handle preprocessing including escaped newlines
    const elements = this.parse(content);
    return this.renderToHTML(elements, options);
  }

  /**
   * Get rendering statistics
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
    
    return {
      totalElements: elements.length,
      elementCounts: countElements(elements),
      hasMarkdown: elements.some(el => 
        el.type !== 'text' && el.type !== 'paragraph' || 
        (Array.isArray(el.content) && el.content.some(sub => sub.type !== 'text'))
      )
    };
  }
}

// Create a singleton instance
export const markdownRenderer = new MarkdownRenderingService();
