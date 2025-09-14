/**
 * Enhanced Remark Markdown Renderer with Door43 Plugins
 * 
 * Extends the base remark renderer with custom Door43 syntax support
 * for rc:// links, relative links, and other Door43-specific markdown patterns.
 */

import React from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeReact from 'rehype-react';
import { Fragment } from 'react';
import * as prod from 'react/jsx-runtime';
import type { Processor } from 'unified';
import type { Node } from 'unist';

// Import our custom plugins
import { 
  door43RehypePlugin, 
  door43Components,
  type Door43LinkHandlers,
  type Door43RehypePluginOptions 
} from './remark-plugins/door43-rehype-plugin';

export interface EnhancedRemarkRendererOptions {
  allowDangerousHtml?: boolean;
  linkTarget?: '_blank' | '_self';
  headerBaseLevel?: number;
  customComponents?: Record<string, React.ComponentType<any>>;
  
  // Door43-specific options
  door43Handlers?: Door43LinkHandlers;
  currentBook?: string; // For resolving relative navigation links
  resourceManager?: any; // ResourceManager instance for fetching titles
  processedResourceConfig?: any[]; // Resource configuration for finding TA/TW resources
}

export class EnhancedRemarkRenderer {
  private processor: Processor | null = null;
  private options: EnhancedRemarkRendererOptions;

  constructor(options: EnhancedRemarkRendererOptions = {}) {
    this.options = options;
    this.initializeProcessor();
  }

  /**
   * Initialize the remark processor with plugins
   */
  private initializeProcessor() {
    if (this.processor) return this.processor;

    // Create the Door43 links plugin options
    const door43Options: Door43RehypePluginOptions = {
      handlers: this.options.door43Handlers,
      currentBook: this.options.currentBook,
      resourceManager: this.options.resourceManager,
      processedResourceConfig: this.options.processedResourceConfig
    };

    this.processor = unified()
      .use(remarkParse) // Parse markdown to AST
      .use(remarkRehype, { 
        allowDangerousHtml: this.options.allowDangerousHtml || false 
      }) // Convert markdown AST to HTML AST
      .use(door43RehypePlugin, door43Options) // Transform Door43 links in HTML AST
      .use(rehypeReact, {
        Fragment,
        jsx: prod.jsx,
        jsxs: prod.jsxs,
        components: {
          // Standard component mappings
          a: (props: any) => (
            <a 
              {...props} 
              target={this.options.linkTarget || '_blank'}
              rel={this.options.linkTarget === '_blank' ? 'noopener noreferrer' : undefined}
              className="text-blue-600 hover:text-blue-800 underline"
            />
          ),
          h1: (props: any) => <h1 {...props} className="text-xl font-bold mb-3" />,
          h2: (props: any) => <h2 {...props} className="text-lg font-semibold mb-2" />,
          h3: (props: any) => <h3 {...props} className="text-base font-semibold mb-2" />,
          h4: (props: any) => <h4 {...props} className="text-sm font-semibold mb-1" />,
          p: (props: any) => <p {...props} className="mb-3 last:mb-0" />,
          ul: (props: any) => <ul {...props} className="mb-3 ml-4 list-disc" />,
          ol: (props: any) => <ol {...props} className="mb-3 ml-4 list-decimal" />,
          li: (props: any) => <li {...props} className="mb-1" />,
          code: (props: any) => (
            <code {...props} className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono" />
          ),
          pre: (props: any) => (
            <pre {...props} className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto mb-3" />
          ),
          blockquote: (props: any) => (
            <blockquote {...props} className="border-l-4 border-gray-300 pl-4 italic mb-3" />
          ),
          strong: (props: any) => <strong {...props} className="font-semibold" />,
          em: (props: any) => <em {...props} className="italic" />,
          
          // Door43 custom components
          ...door43Components,
          
          // User custom components (override everything else)
          ...this.options.customComponents
        }
      }); // Convert HTML AST to React components

    return this.processor;
  }

  /**
   * Update the renderer options (useful for dynamic handler updates)
   */
  updateOptions(newOptions: Partial<EnhancedRemarkRendererOptions>) {
    this.options = { ...this.options, ...newOptions };
    this.processor = null; // Force re-initialization
    this.initializeProcessor();
  }

  /**
   * Update Door43 handlers specifically
   */
  updateDoor43Handlers(handlers: Door43LinkHandlers) {
    this.updateOptions({ door43Handlers: handlers });
  }

  /**
   * Update current book for relative navigation
   */
  updateCurrentBook(bookCode: string) {
    this.updateOptions({ currentBook: bookCode });
  }

  /**
   * Parse markdown content and return React components
   */
  async renderToReact(content: string): Promise<React.ReactNode> {
    if (!content) return null;

    // Preprocess content (same as our current implementation)
    const preprocessedContent = this.preprocessContent(content);

    const processor = this.initializeProcessor();
    const file = await processor!.process(preprocessedContent);
    
    return file.result as React.ReactNode;
  }

  /**
   * Parse markdown and return AST for custom processing
   */
  async parseToAST(content: string): Promise<Node> {
    const preprocessedContent = this.preprocessContent(content);

    const processor = unified().use(remarkParse);
    const ast = processor.parse(preprocessedContent);
    return ast;
  }

  /**
   * Preprocess content to handle escaped characters and Door43 patterns
   */
  private preprocessContent(content: string): string {
    console.log('🔄 Preprocessing markdown content:', content.substring(0, 200) + '...');
    
    let processed = content
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '  ')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\r/g, '\r')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    // Handle standalone rc:// links (not in markdown link format)
    // Convert [[rc://...]] to [rc://...](rc://...)
    const rcLinkMatches = processed.match(/\[\[rc:\/\/[^\]]+\]\]/g);
    if (rcLinkMatches) {
      console.log('🔗 Found standalone rc:// links:', rcLinkMatches);
    }
    processed = processed.replace(
      /\[\[rc:\/\/([^\]]+)\]\]/g,
      '[rc://$1](rc://$1)'
    );

    // Handle standalone relative links
    // Convert [[../path]] to [../path](../path)
    const relativeLinkMatches = processed.match(/\[\[(\.\.[^\]]+)\]\]/g);
    if (relativeLinkMatches) {
      console.log('🔗 Found standalone relative links:', relativeLinkMatches);
    }
    processed = processed.replace(
      /\[\[(\.\.[^\]]+)\]\]/g,
      '[$1]($1)'
    );

    // Log all markdown links found
    const markdownLinks = processed.match(/\[([^\]]+)\]\(([^)]+)\)/g);
    if (markdownLinks) {
      console.log('🔗 Found markdown links:', markdownLinks);
    }

    console.log('✅ Preprocessed content:', processed.substring(0, 200) + '...');
    return processed;
  }

  /**
   * Get processing statistics
   */
  async getStats(content: string) {
    try {
      const ast = await this.parseToAST(content);
      
      // Count nodes by type
      const nodeTypes: Record<string, number> = {};
      let totalNodes = 0;
      
      const countNodes = (node: any) => {
        totalNodes++;
        nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
        
        if (node.children) {
          node.children.forEach(countNodes);
        }
      };
      
      countNodes(ast);
      
      // Count Door43 links
      let door43Links = 0;
      let relativeLinks = 0;
      
      const countLinks = (node: any) => {
        if (node.type === 'link' && node.url) {
          if (node.url.startsWith('rc://')) {
            door43Links++;
          } else if (node.url.startsWith('../') || node.url.startsWith('./')) {
            relativeLinks++;
          }
        }
        
        if (node.children) {
          node.children.forEach(countLinks);
        }
      };
      
      countLinks(ast);
      
      return {
        totalNodes,
        nodeTypes,
        door43Links,
        relativeLinks,
        hasMarkdown: content.includes('#') || content.includes('*') || content.includes('['),
        hasDoor43Content: door43Links > 0 || relativeLinks > 0
      };
    } catch (error) {
      return {
        totalNodes: 0,
        nodeTypes: {},
        door43Links: 0,
        relativeLinks: 0,
        hasMarkdown: content.includes('#') || content.includes('*') || content.includes('['),
        hasDoor43Content: content.includes('rc://') || content.includes('../'),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance (can be updated with new options)
export const enhancedRemarkRenderer = new EnhancedRemarkRenderer({
  linkTarget: '_blank',
  headerBaseLevel: 3,
  allowDangerousHtml: false
});

export default EnhancedRemarkRenderer;
