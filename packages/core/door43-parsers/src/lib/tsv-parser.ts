/**
 * TSV Parser
 * Parses Tab-Separated Values content into structured data
 */

import { ServiceResult } from '@bt-toolkit/door43-core';

export interface TSVParseOptions {
  /** Whether the first row contains headers */
  hasHeader?: boolean;
  /** Field delimiter (default: tab) */
  delimiter?: string;
  /** Quote character for escaping */
  quote?: string;
  /** Escape character */
  escape?: string;
}

export interface TSVParseResult<T> {
  /** Parsed data rows */
  data: T[];
  /** Headers (if hasHeader is true) */
  headers?: string[];
  /** Parsing metadata */
  metadata: {
    totalRows: number;
    dataRows: number;
    columns: number;
    hasHeaders: boolean;
  };
}

export class TSVParser {
  /**
   * Parse TSV content into structured data
   */
  parseTSV<T = Record<string, string>>(
    content: string, 
    options: TSVParseOptions = {}
  ): ServiceResult<TSVParseResult<T>> {
    try {
      const startTime = Date.now();
      
      const {
        hasHeader = true,
        delimiter = '\t',
        quote = '"',
        escape = '\\'
      } = options;
      
      // Normalize content
      const normalizedContent = this.normalizeContent(content);
      
      // Parse rows
      const rows = this.parseRows(normalizedContent, delimiter, quote, escape);
      
      if (rows.length === 0) {
        return {
          success: true,
          data: {
            data: [],
            headers: [],
            metadata: {
              totalRows: 0,
              dataRows: 0,
              columns: 0,
              hasHeaders: false
            }
          },
          metadata: {
            source: 'api' as const,
            timestamp: new Date(),
            processingTimeMs: Date.now() - startTime
          }
        };
      }
      
      let headers: string[] = [];
      let dataRows: string[][] = rows;
      
      // Extract headers if specified
      if (hasHeader && rows.length > 0) {
        headers = rows[0];
        dataRows = rows.slice(1);
      }
      
      // Convert rows to objects
      const data = this.convertRowsToObjects<T>(dataRows, headers, hasHeader);
      
      const result: TSVParseResult<T> = {
        data,
        headers: hasHeader ? headers : undefined,
        metadata: {
          totalRows: rows.length,
          dataRows: dataRows.length,
          columns: rows[0]?.length || 0,
          hasHeaders: hasHeader
        }
      };
      
      return {
        success: true,
        data: result,
        metadata: {
          source: 'api' as const,
          timestamp: new Date(),
          processingTimeMs: Date.now() - startTime
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown TSV parsing error'
      };
    }
  }
  
  /**
   * Parse Translation Notes TSV format
   */
  parseTranslationNotes(content: string): ServiceResult<any[]> {
    const result = this.parseTSV(content, { hasHeader: true });
    
    if (!result.success || !result.data) {
      return {
        success: result.success,
        data: undefined,
        error: result.error,
        metadata: result.metadata
      };
    }
    
    // Convert to Translation Notes format
    const notes = result.data.data.map((row: any) => ({
      Reference: row.Reference || '',
      reference: this.parseReference(row.Reference || ''),
      chapter: this.parseChapter(row.Reference || ''),
      verse: this.parseVerse(row.Reference || ''),
      ID: row.ID || '',
      Tags: row.Tags || '',
      SupportReference: row.SupportReference || '',
      Quote: row.Quote || '',
      Occurrence: parseInt(row.Occurrence || '0'),
      GLQuote: row.GLQuote || '',
      OccurrenceNote: row.OccurrenceNote || '',
      Note: row.Note || ''
    }));
    
    return {
      success: true,
      data: notes,
      metadata: result.metadata
    };
  }
  
  /**
   * Parse Translation Words Links TSV format
   */
  parseTranslationWordsLinks(content: string): ServiceResult<any[]> {
    const result = this.parseTSV(content, { hasHeader: true });
    
    if (!result.success || !result.data) {
      return {
        success: result.success,
        data: undefined,
        error: result.error,
        metadata: result.metadata
      };
    }
    
    // Convert to Translation Words Links format
    const links = result.data.data.map((row: any) => ({
      Reference: row.Reference || '',
      reference: this.parseReference(row.Reference || ''),
      chapter: this.parseChapter(row.Reference || ''),
      verse: this.parseVerse(row.Reference || ''),
      ID: row.ID || '',
      Tags: row.Tags || '',
      OrigWords: row.OrigWords || '',
      Occurrence: parseInt(row.Occurrence || '0'),
      GLWords: row.GLWords || '',
      TWLink: row.TWLink || ''
    }));
    
    return {
      success: true,
      data: links,
      metadata: result.metadata
    };
  }
  
  /**
   * Parse Translation Questions TSV format
   */
  parseTranslationQuestions(content: string): ServiceResult<any[]> {
    const result = this.parseTSV(content, { hasHeader: true });
    
    if (!result.success || !result.data) {
      return {
        success: result.success,
        data: undefined,
        error: result.error,
        metadata: result.metadata
      };
    }
    
    // Convert to Translation Questions format
    const questions = result.data.data.map((row: any) => ({
      Reference: row.Reference || '',
      reference: this.parseReference(row.Reference || ''),
      chapter: this.parseChapter(row.Reference || ''),
      verse: this.parseVerse(row.Reference || ''),
      ID: row.ID || '',
      Tags: row.Tags || '',
      Question: row.Question || '',
      Response: row.Response || ''
    }));
    
    return {
      success: true,
      data: questions,
      metadata: result.metadata
    };
  }
  
  /**
   * Normalize TSV content
   */
  private normalizeContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')   // Handle old Mac line endings
      .trim();
  }
  
  /**
   * Parse rows from TSV content
   */
  private parseRows(
    content: string, 
    delimiter: string, 
    quote: string, 
    escape: string
  ): string[][] {
    const rows: string[][] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue; // Skip empty lines
      
      const row = this.parseRow(line, delimiter, quote, escape);
      if (row.length > 0) {
        rows.push(row);
      }
    }
    
    return rows;
  }
  
  /**
   * Parse a single row
   */
  private parseRow(
    line: string, 
    delimiter: string, 
    quote: string, 
    escape: string
  ): string[] {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === escape && nextChar) {
        // Escaped character
        currentField += nextChar;
        i += 2;
      } else if (char === quote) {
        if (inQuotes && nextChar === quote) {
          // Escaped quote
          currentField += quote;
          i += 2;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        // Field separator
        fields.push(currentField);
        currentField = '';
        i++;
      } else {
        // Regular character
        currentField += char;
        i++;
      }
    }
    
    // Add final field
    fields.push(currentField);
    
    return fields;
  }
  
  /**
   * Convert rows to objects
   */
  private convertRowsToObjects<T>(
    rows: string[][], 
    headers: string[], 
    hasHeaders: boolean
  ): T[] {
    if (!hasHeaders) {
      // Return rows as arrays
      return rows as unknown as T[];
    }
    
    return rows.map(row => {
      const obj: Record<string, string> = {};
      
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        const value = row[i] || '';
        obj[header] = value;
      }
      
      return obj as T;
    });
  }
  
  /**
   * Parse reference string to VerseReference object
   */
  private parseReference(reference: string): any {
    // This is a simplified parser - in real implementation,
    // we'd need to determine the book from context
    const match = reference.match(/(\d+):(\d+)(?:-(\d+))?/);
    if (match) {
      return {
        book: 'UNK', // Would need book context
        chapter: parseInt(match[1]),
        verse: parseInt(match[2])
      };
    }
    
    return {
      book: 'UNK',
      chapter: 1,
      verse: 1
    };
  }
  
  /**
   * Parse chapter number from reference
   */
  private parseChapter(reference: string): number {
    const match = reference.match(/(\d+):/);
    return match ? parseInt(match[1]) : 1;
  }
  
  /**
   * Parse verse number from reference
   */
  private parseVerse(reference: string): number {
    const match = reference.match(/:(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }
}

// Export singleton instance
export const tsvParser = new TSVParser();
