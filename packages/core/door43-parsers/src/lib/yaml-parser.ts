/**
 * YAML Parser
 * Parses YAML content into JavaScript objects
 * Simple implementation without external dependencies
 */

import { ServiceResult } from '@bt-toolkit/door43-core';

export interface YAMLParseOptions {
  /** Allow duplicate keys (default: false) */
  allowDuplicateKeys?: boolean;
  /** Maximum depth to prevent infinite recursion */
  maxDepth?: number;
}

export class YAMLParser {
  /**
   * Parse YAML content into JavaScript object
   */
  parseYAML<T = any>(content: string, options: YAMLParseOptions = {}): ServiceResult<T> {
    try {
      const startTime = Date.now();
      
      const {
        allowDuplicateKeys = false,
        maxDepth = 100
      } = options;
      
      // Normalize content
      const normalizedContent = this.normalizeContent(content);
      
      // Parse YAML
      const result = this.parseYAMLContent(normalizedContent, allowDuplicateKeys, maxDepth);
      
      return {
        success: true,
        data: result as T,
        metadata: {
          source: 'api' as const,
          timestamp: new Date(),
          processingTimeMs: Date.now() - startTime
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown YAML parsing error'
      };
    }
  }
  
  /**
   * Parse Door43 manifest.yaml format
   */
  parseManifest(content: string): ServiceResult<any> {
    const result = this.parseYAML(content);
    
    if (!result.success || !result.data) {
      return result;
    }
    
    // Ensure projects array exists
    const manifest = result.data as any;
    if (!manifest.projects) {
      manifest.projects = [];
    }
    
    // Convert projects object to array if needed
    if (typeof manifest.projects === 'object' && !Array.isArray(manifest.projects)) {
      // Convert object values to array
      manifest.projects = Object.values(manifest.projects);
    }
    
    // Ensure projects is an array
    if (!Array.isArray(manifest.projects)) {
      manifest.projects = [];
    }
    
    // Normalize project entries
    manifest.projects = manifest.projects.map((project: any) => ({
      identifier: project.identifier || '',
      title: project.title || '',
      path: project.path || '',
      categories: project.categories || []
    }));
    
    return {
      success: true,
      data: manifest,
      metadata: result.metadata
    };
  }
  
  /**
   * Normalize YAML content
   */
  private normalizeContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')   // Handle old Mac line endings
      .replace(/\t/g, '  ')   // Convert tabs to spaces
      .trim();
  }
  
  /**
   * Parse YAML content recursively
   */
  private parseYAMLContent(
    content: string, 
    allowDuplicateKeys: boolean, 
    maxDepth: number,
    currentDepth = 0
  ): any {
    if (currentDepth > maxDepth) {
      throw new Error('Maximum parsing depth exceeded');
    }
    
    const lines = content.split('\n');
    const result: any = {};
    let currentSection: any = result;
    let sectionStack: any[] = [result];
    let keyStack: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Get indentation level
      const indent = this.getIndentation(line);
      const indentLevel = Math.floor(indent / 2);
      
      // Adjust section stack based on indentation
      while (keyStack.length > indentLevel) {
        keyStack.pop();
        sectionStack.pop();
      }
      currentSection = sectionStack[sectionStack.length - 1];
      
      // Handle array items
      if (trimmedLine.startsWith('- ')) {
        const itemContent = trimmedLine.substring(2).trim();
        const parentKey = keyStack[keyStack.length - 1];
        
        if (!currentSection[parentKey]) {
          currentSection[parentKey] = [];
        }
        
        if (itemContent.includes(':')) {
          // Object in array - parse the entire object
          const itemObj: any = {};
          const parts = itemContent.split(':');
          const key = parts[0].trim();
          const value = parts.slice(1).join(':').trim();
          itemObj[key] = this.parseValue(value);
          
          // Look ahead for more properties of this object
          let j = i + 1;
          while (j < lines.length) {
            const nextLine = lines[j];
            const nextTrimmed = nextLine.trim();
            const nextIndent = this.getIndentation(nextLine);
            
            if (!nextTrimmed || nextTrimmed.startsWith('#')) {
              j++;
              continue;
            }
            
            if (nextIndent > indent && nextTrimmed.includes(':') && !nextTrimmed.startsWith('- ')) {
              const nextParts = nextTrimmed.split(':');
              const nextKey = nextParts[0].trim();
              const nextValue = nextParts.slice(1).join(':').trim();
              itemObj[nextKey] = this.parseValue(nextValue);
              j++;
            } else {
              break;
            }
          }
          
          currentSection[parentKey].push(itemObj);
          i = j - 1; // Skip the lines we've already processed
        } else {
          // Simple value in array
          currentSection[parentKey].push(this.parseValue(itemContent));
        }
        continue;
      }
      
      // Handle key-value pairs
      if (trimmedLine.includes(':')) {
        const colonIndex = trimmedLine.indexOf(':');
        const key = trimmedLine.substring(0, colonIndex).trim();
        const value = trimmedLine.substring(colonIndex + 1).trim();
        
        if (value) {
          // Single-line value
          currentSection[key] = this.parseValue(value);
        } else {
          // Nested object or array
          currentSection[key] = {};
          keyStack.push(key);
          sectionStack.push(currentSection[key]);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Parse key-value pair from a line
   */
  /*
  private parseKeyValue(line: string): any {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return {};
    
    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    
    return { [key]: this.parseValue(value) };
  }
  */
  
  /**
   * Parse a value and convert to appropriate type
   */
  private parseValue(value: string): any {
    if (!value) return '';
    
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    
    // Boolean values
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Null values
    if (value === 'null' || value === '~') return null;
    
    // Numbers
    if (/^-?\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    
    if (/^-?\d*\.\d+$/.test(value)) {
      return parseFloat(value);
    }
    
    // Arrays (simple format)
    if (value.startsWith('[') && value.endsWith(']')) {
      const items = value.slice(1, -1).split(',').map(item => 
        this.parseValue(item.trim())
      );
      return items;
    }
    
    // Return as string
    return value;
  }
  
  /**
   * Get indentation level of a line
   */
  private getIndentation(line: string): number {
    let indent = 0;
    for (const char of line) {
      if (char === ' ') {
        indent++;
      } else if (char === '\t') {
        indent += 2; // Count tab as 2 spaces
      } else {
        break;
      }
    }
    return indent;
  }
}

// Export singleton instance
export const yamlParser = new YAMLParser();
