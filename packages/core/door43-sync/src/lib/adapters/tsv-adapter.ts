/**
 * TSV Format Adapter
 * Handles round-trip conversion between TSV and JSON
 */

import { AsyncResult } from '@bt-toolkit/door43-core';
import { 
  BaseFormatAdapter, 
  ConversionContext, 
  ConversionResult,
  ResourceFormat 
} from '../format-adapter-system.js';

// ============================================================================
// TSV Types
// ============================================================================

/**
 * TSV row structure
 */
export interface TsvRow {
  /** Row data as key-value pairs */
  [key: string]: string;
}

/**
 * TSV data structure (JSON representation)
 */
export interface TsvDataJson {
  /** Column headers */
  headers: string[];
  /** Row data */
  rows: TsvRow[];
  /** Metadata */
  metadata?: {
    /** Original filename */
    filename?: string;
    /** Resource type */
    resourceType?: string;
    /** Encoding */
    encoding?: string;
    /** Delimiter used */
    delimiter?: string;
    /** Row count */
    rowCount?: number;
    /** Column count */
    columnCount?: number;
  };
}

// ============================================================================
// TSV Adapter
// ============================================================================

/**
 * TSV Format Adapter
 * Converts between TSV text format and structured JSON
 */
export class TsvFormatAdapter extends BaseFormatAdapter {
  readonly id = 'tsv-adapter';
  readonly supportedFormats: ResourceFormat[] = ['tsv'];
  readonly supportedResourceTypes: string[] = []; // Generic TSV adapter - supports all
  readonly version = '1.0.0';
  readonly description = 'Generic TSV to JSON round-trip converter';
  readonly priority = 50; // Lower priority than specialized adapters

  /**
   * Convert TSV to JSON
   */
  async toJson(content: string, context: ConversionContext): AsyncResult<ConversionResult> {
    try {
      console.log('📊 Converting TSV to JSON...');
      
      const tsvData = this.parseTsv(content, context);
      const jsonContent = this.stringifyJson(tsvData, true);
      
      const result = this.createResult(jsonContent, {
        originalFormat: 'tsv',
        resourceType: context.resourceType,
        conversionTimestamp: new Date().toISOString(),
        rowCount: tsvData.rows.length,
        columnCount: tsvData.headers.length
      });

      return { success: true, data: result };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'TSV to JSON conversion failed'
      };
    }
  }

  /**
   * Convert JSON to TSV
   */
  async fromJson(jsonContent: string, context: ConversionContext): AsyncResult<ConversionResult> {
    try {
      console.log('📝 Converting JSON to TSV...');
      
      const tsvData = this.parseJson(jsonContent) as TsvDataJson;
      const tsvContent = this.generateTsv(tsvData, context);
      
      const result = this.createResult(tsvContent, {
        targetFormat: 'tsv',
        resourceType: context.resourceType,
        conversionTimestamp: new Date().toISOString(),
        rowCount: tsvData.rows.length,
        columnCount: tsvData.headers.length
      });

      return { success: true, data: result };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'JSON to TSV conversion failed'
      };
    }
  }

  /**
   * Validate TSV content
   */
  async validate(content: string, format: ResourceFormat): AsyncResult<boolean> {
    try {
      if (format === 'tsv') {
        // Basic TSV validation
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) return { success: true, data: false }; // Need at least header + 1 row
        
        const headerColumns = lines[0].split('\t').length;
        const isValid = lines.slice(1).every(line => 
          line.split('\t').length === headerColumns
        );
        
        return { success: true, data: isValid };
      }
      
      if (format === 'json') {
        const data = this.parseJson(content);
        const isValid = data && typeof data === 'object' && 
                        'headers' in data && 'rows' in data &&
                        Array.isArray(data.headers) && Array.isArray(data.rows);
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
      'translation-notes',
      'translation-words', 
      'translation-questions',
      'translation-academy'
    ];
    
    return super.supports(context) && 
           (!context.resourceType || supportedResourceTypes.includes(context.resourceType));
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Parse TSV content into structured data
   */
  private parseTsv(content: string, context: ConversionContext): TsvDataJson {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length === 0) {
      throw new Error('Empty TSV content');
    }

    const delimiter = this.detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map(header => header.trim());
    
    if (headers.length === 0) {
      throw new Error('No headers found in TSV');
    }

    const rows: TsvRow[] = [];
    const warnings: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const values = line.split(delimiter);
      
      // Handle rows with different column counts
      if (values.length !== headers.length) {
        warnings.push(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`);
        
        // Pad with empty strings or truncate
        while (values.length < headers.length) {
          values.push('');
        }
        values.splice(headers.length);
      }

      const row: TsvRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
    }

    const result: TsvDataJson = {
      headers,
      rows,
      metadata: {
        resourceType: context.resourceType,
        delimiter,
        rowCount: rows.length,
        columnCount: headers.length,
        encoding: 'utf-8'
      }
    };

    return result;
  }

  /**
   * Generate TSV content from structured data
   */
  private generateTsv(data: TsvDataJson, context: ConversionContext): string {
    const delimiter = data.metadata?.delimiter || '\t';
    const lines: string[] = [];

    // Add headers
    lines.push(data.headers.join(delimiter));

    // Add rows
    for (const row of data.rows) {
      const values = data.headers.map(header => {
        const value = row[header] || '';
        // Escape delimiter in values
        return this.escapeValue(value, delimiter);
      });
      lines.push(values.join(delimiter));
    }

    return lines.join('\n');
  }

  /**
   * Detect delimiter used in TSV line
   */
  private detectDelimiter(line: string): string {
    const delimiters = ['\t', ',', ';', '|'];
    
    for (const delimiter of delimiters) {
      if (line.includes(delimiter)) {
        return delimiter;
      }
    }
    
    return '\t'; // Default to tab
  }

  /**
   * Escape value for TSV output
   */
  private escapeValue(value: string, delimiter: string): string {
    // If value contains delimiter, newline, or quotes, wrap in quotes
    if (value.includes(delimiter) || value.includes('\n') || value.includes('\r') || value.includes('"')) {
      // Escape existing quotes by doubling them
      const escaped = value.replace(/"/g, '""');
      return `"${escaped}"`;
    }
    
    return value;
  }

  /**
   * Get configuration schema for TSV adapter
   */
  getConfigSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        delimiter: {
          type: 'string',
          enum: ['\t', ',', ';', '|'],
          default: '\t',
          description: 'Delimiter to use for TSV files'
        },
        encoding: {
          type: 'string',
          enum: ['utf-8', 'utf-16', 'ascii'],
          default: 'utf-8',
          description: 'Text encoding for TSV files'
        },
        validateColumns: {
          type: 'boolean',
          default: true,
          description: 'Validate that all rows have the same number of columns'
        },
        trimValues: {
          type: 'boolean',
          default: true,
          description: 'Trim whitespace from cell values'
        }
      }
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create TSV format adapter
 */
export function createTsvAdapter(config?: Record<string, any>): TsvFormatAdapter {
  return new TsvFormatAdapter();
}
