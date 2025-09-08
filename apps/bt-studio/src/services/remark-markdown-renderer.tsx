/**
 * Remark-based Markdown Renderer for BT Studio
 * 
 * Uses the remark/unified ecosystem for robust AST-based markdown processing
 * with extensibility through plugins.
 * 
 * Features:
 * - Full AST access and manipulation
 * - Extensive plugin ecosystem
 * - Custom syntax extensions
 * - React component output
 * - TypeScript support
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeReact from 'rehype-react';
import { Fragment } from 'react';
import * as prod from 'react/jsx-runtime';
import type { Processor } from 'unified';
import type { VFile } from 'vfile';
import type { Node } from 'unist';

export interface RemarkRendererOptions {
  allowDangerousHtml?: boolean;
  linkTarget?: '_blank' | '_self';
  headerBaseLevel?: number;
  customComponents?: Record<string, React.ComponentType<any>>;
}

export class RemarkMarkdownRenderer {
  private processor: Processor | null = null;

  constructor(private options: RemarkRendererOptions = {}) {
    this.initializeProcessor();
  }

  /**
   * Initialize the remark processor with plugins
   */
  private initializeProcessor() {
    if (this.processor) return this.processor;

    this.processor = unified()
      .use(remarkParse) // Parse markdown to AST
      .use(remarkRehype, { 
        allowDangerousHtml: this.options.allowDangerousHtml || false 
      }) // Convert markdown AST to HTML AST
      .use(rehypeReact, {
        Fragment,
        jsx: prod.jsx,
        jsxs: prod.jsxs,
        components: {
          // Custom component mappings
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
          ...this.options.customComponents
        }
      }); // Convert HTML AST to React components

    return this.processor;
  }

  /**
   * Add a custom plugin to the processor
   */
  addPlugin(plugin: any, options?: any) {
    if (!this.processor) {
      this.initializeProcessor();
    }
    this.processor = this.processor!.use(plugin, options);
    return this;
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
   * Transform AST with custom visitors
   */
  transformAST(ast: Node, visitors: Record<string, (node: Node) => Node | void>): Node {
    // Note: For full AST transformation, install unist-util-visit
    // For now, return the AST as-is
    // TODO: Implement proper AST traversal when needed
    return ast;
  }

  /**
   * Preprocess content to handle escaped characters
   */
  private preprocessContent(content: string): string {
    return content
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '  ')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\r/g, '\r')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
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
      
      return {
        totalNodes,
        nodeTypes,
        hasMarkdown: content.includes('#') || content.includes('*') || content.includes('[')
      };
    } catch (error) {
      return {
        totalNodes: 0,
        nodeTypes: {},
        hasMarkdown: content.includes('#') || content.includes('*') || content.includes('['),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const remarkRenderer = new RemarkMarkdownRenderer({
  linkTarget: '_blank',
  headerBaseLevel: 3,
  allowDangerousHtml: false
});


export default RemarkMarkdownRenderer;
