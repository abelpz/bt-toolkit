/**
 * Markdown Format Adapter
 * Handles round-trip conversion between Markdown and JSON
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import { 
  BaseFormatAdapter, 
  ConversionContext, 
  ConversionResult,
  ResourceFormat 
} from '../format-adapter-system.js';

// ============================================================================
// Markdown Types
// ============================================================================

/**
 * Markdown section structure
 */
export interface MarkdownSection {
  /** Section level (1-6 for h1-h6) */
  level: number;
  /** Section title */
  title: string;
  /** Section content */
  content: string;
  /** Section ID/anchor */
  id?: string;
  /** Subsections */
  subsections?: MarkdownSection[];
}

/**
 * Markdown metadata (front matter)
 */
export interface MarkdownMetadata {
  /** Document title */
  title?: string;
  /** Document author */
  author?: string;
  /** Creation date */
  date?: string;
  /** Tags */
  tags?: string[];
  /** Custom metadata */
  [key: string]: any;
}

/**
 * Markdown document structure (JSON representation)
 */
export interface MarkdownDocumentJson {
  /** Document metadata */
  metadata?: MarkdownMetadata;
  /** Document sections */
  sections: MarkdownSection[];
  /** Raw content (for simple documents) */
  content?: string;
  /** Document type */
  type?: 'structured' | 'simple';
  /** Original filename */
  filename?: string;
}

// ============================================================================
// Markdown Adapter
// ============================================================================

/**
 * Markdown Format Adapter
 * Converts between Markdown text format and structured JSON
 */
export class MarkdownFormatAdapter extends BaseFormatAdapter {
  readonly id = 'markdown-adapter';
  readonly supportedFormats: ResourceFormat[] = ['md', 'markdown'];
  readonly supportedResourceTypes: string[] = []; // Supports all resource types
  readonly version = '1.0.0';
  readonly description = 'Markdown to JSON round-trip converter';
  readonly priority = 100;

  /**
   * Convert Markdown to JSON
   */
  async toJson(content: string, context: ConversionContext): AsyncResult<ConversionResult> {
    try {
      console.log('📄 Converting Markdown to JSON...');
      
      const markdownData = this.parseMarkdown(content, context);
      const jsonContent = this.stringifyJson(markdownData, true);
      
      const result = this.createResult(jsonContent, {
        originalFormat: 'markdown',
        resourceType: context.resourceType,
        conversionTimestamp: new Date().toISOString(),
        documentType: markdownData.type,
        sectionCount: markdownData.sections.length
      });

      return { success: true, data: result };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Markdown to JSON conversion failed'
      };
    }
  }

  /**
   * Convert JSON to Markdown
   */
  async fromJson(jsonContent: string, context: ConversionContext): AsyncResult<ConversionResult> {
    try {
      console.log('📝 Converting JSON to Markdown...');
      
      const markdownData = this.parseJson(jsonContent) as MarkdownDocumentJson;
      const markdownContent = this.generateMarkdown(markdownData, context);
      
      const result = this.createResult(markdownContent, {
        targetFormat: 'markdown',
        resourceType: context.resourceType,
        conversionTimestamp: new Date().toISOString(),
        documentType: markdownData.type,
        sectionCount: markdownData.sections.length
      });

      return { success: true, data: result };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'JSON to Markdown conversion failed'
      };
    }
  }

  /**
   * Validate Markdown content
   */
  async validate(content: string, format: ResourceFormat): AsyncResult<boolean> {
    try {
      if (format === 'md' || format === 'markdown') {
        // Basic Markdown validation - check for common patterns
        const hasHeaders = /^#{1,6}\s+.+$/m.test(content);
        const hasContent = content.trim().length > 0;
        
        return { success: true, data: hasContent };
      }
      
      if (format === 'json') {
        const data = this.parseJson(content);
        const isValid = data && typeof data === 'object' && 
                        ('sections' in data || 'content' in data);
        return { success: true, data: isValid };
      }

      return { success: true, data: false };

    } catch (error) {
      return { success: true, data: false };
    }
  }

  /**
   * Check if adapter supports specific resource types
   */
  supports(context: ConversionContext): boolean {
    const supportedResourceTypes = [
      'translation-academy',
      'translation-manual',
      'obs',
      'obs-study-notes',
      'obs-study-questions'
    ];
    
    return super.supports(context) && 
           (!context.resourceType || supportedResourceTypes.includes(context.resourceType));
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Parse Markdown content into structured data
   */
  private parseMarkdown(content: string, context: ConversionContext): MarkdownDocumentJson {
    const { metadata, body } = this.extractFrontMatter(content);
    
    // Check if document has clear structure (headers)
    const hasHeaders = /^#{1,6}\s+.+$/m.test(body);
    
    if (!hasHeaders) {
      // Simple document without clear structure
      return {
        metadata,
        sections: [],
        content: body.trim(),
        type: 'simple',
        filename: context.metadata?.filename
      };
    }

    // Parse structured document
    const sections = this.parseSections(body);
    
    return {
      metadata,
      sections,
      type: 'structured',
      filename: context.metadata?.filename
    };
  }

  /**
   * Extract front matter from Markdown content
   */
  private extractFrontMatter(content: string): { metadata?: MarkdownMetadata; body: string } {
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (!frontMatterMatch) {
      return { body: content };
    }

    const frontMatterText = frontMatterMatch[1];
    const body = frontMatterMatch[2];
    
    try {
      // Simple YAML-like parsing for common metadata
      const metadata: MarkdownMetadata = {};
      const lines = frontMatterText.split('\n');
      
      for (const line of lines) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          
          // Handle arrays (tags)
          if (value.startsWith('[') && value.endsWith(']')) {
            metadata[key] = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
          } else {
            metadata[key] = value.replace(/['"]/g, '');
          }
        }
      }
      
      return { metadata, body };
    } catch (error) {
      console.warn('Failed to parse front matter, treating as regular content');
      return { body: content };
    }
  }

  /**
   * Parse sections from Markdown body
   */
  private parseSections(body: string): MarkdownSection[] {
    const lines = body.split('\n');
    const sections: MarkdownSection[] = [];
    let currentSection: MarkdownSection | null = null;
    let contentLines: string[] = [];

    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.content = contentLines.join('\n').trim();
          sections.push(currentSection);
        }

        // Start new section
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();
        const id = this.generateSectionId(title);

        currentSection = {
          level,
          title,
          content: '',
          id
        };
        contentLines = [];
      } else {
        // Add to current section content
        contentLines.push(line);
      }
    }

    // Save final section
    if (currentSection) {
      currentSection.content = contentLines.join('\n').trim();
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Generate section ID from title
   */
  private generateSectionId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Generate Markdown content from structured data
   */
  private generateMarkdown(data: MarkdownDocumentJson, context: ConversionContext): string {
    const lines: string[] = [];

    // Add front matter if present
    if (data.metadata && Object.keys(data.metadata).length > 0) {
      lines.push('---');
      
      for (const [key, value] of Object.entries(data.metadata)) {
        if (Array.isArray(value)) {
          lines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`);
        } else {
          lines.push(`${key}: "${value}"`);
        }
      }
      
      lines.push('---');
      lines.push('');
    }

    // Add content
    if (data.type === 'simple' && data.content) {
      lines.push(data.content);
    } else {
      // Add structured sections
      for (const section of data.sections) {
        const headerPrefix = '#'.repeat(section.level);
        lines.push(`${headerPrefix} ${section.title}`);
        lines.push('');
        
        if (section.content) {
          lines.push(section.content);
          lines.push('');
        }
        
        // Add subsections if present
        if (section.subsections) {
          for (const subsection of section.subsections) {
            const subHeaderPrefix = '#'.repeat(subsection.level);
            lines.push(`${subHeaderPrefix} ${subsection.title}`);
            lines.push('');
            
            if (subsection.content) {
              lines.push(subsection.content);
              lines.push('');
            }
          }
        }
      }
    }

    return lines.join('\n').trim();
  }

  /**
   * Get configuration schema for Markdown adapter
   */
  getConfigSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        preserveFrontMatter: {
          type: 'boolean',
          default: true,
          description: 'Preserve YAML front matter in documents'
        },
        generateIds: {
          type: 'boolean',
          default: true,
          description: 'Generate section IDs from titles'
        },
        structureMode: {
          type: 'string',
          enum: ['auto', 'structured', 'simple'],
          default: 'auto',
          description: 'How to parse document structure'
        },
        maxHeaderLevel: {
          type: 'number',
          minimum: 1,
          maximum: 6,
          default: 6,
          description: 'Maximum header level to recognize'
        }
      }
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create Markdown format adapter
 */
export function createMarkdownAdapter(config?: Record<string, any>): MarkdownFormatAdapter {
  return new MarkdownFormatAdapter();
}
