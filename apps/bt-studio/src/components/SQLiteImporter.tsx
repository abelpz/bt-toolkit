/**
 * SQLiteImporter Component
 * 
 * Handles importing SQLite database files into IndexedDB storage.
 * Parses SQL INSERT statements and converts them to IndexedDB records.
 */

import React, { useState, useCallback } from 'react';
import { storageService } from '../services/storage/StorageService';

interface ImportProgress {
  stage: 'idle' | 'reading' | 'parsing' | 'importing' | 'complete' | 'error';
  message: string;
  progress?: number;
  total?: number;
  error?: string;
}

interface SQLiteRecord {
  table: 'resource_metadata' | 'resource_content';
  data: Record<string, any>;
}

export function SQLiteImporter() {
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    stage: 'idle',
    message: 'Ready to import'
  });
  const [dragActive, setDragActive] = useState(false);

  // Parse SQL INSERT statements
  const parseSQLInserts = useCallback((sqlContent: string): SQLiteRecord[] => {
    const records: SQLiteRecord[] = [];
    
    // Split content by lines and find INSERT statements
    const lines = sqlContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line starts with INSERT for our tables
      const insertMatch = line.match(/^INSERT(?:\s+OR\s+REPLACE)?\s+INTO\s+(resource_metadata|resource_content)\s+VALUES\s+\(/i);
      if (!insertMatch) continue;
      
      const tableName = insertMatch[1].toLowerCase();
      
      try {
        // Extract the VALUES part - everything after "VALUES ("
        const valuesStart = line.indexOf('VALUES (') + 8;
        let valuesContent = line.substring(valuesStart);
        
        // Remove the trailing ); if present
        if (valuesContent.endsWith(');')) {
          valuesContent = valuesContent.slice(0, -2);
        }
        
        // Parse the values using a more robust approach
        const values = parseComplexValuesClause(valuesContent);
        
        if (tableName === 'resource_metadata') {
          const data = parseMetadataRecord(values);
          records.push({ table: 'resource_metadata', data });
        } else if (tableName === 'resource_content') {
          const data = parseContentRecord(values);
          records.push({ table: 'resource_content', data });
        }
      } catch (error) {
        console.warn('Failed to parse SQL record:', error, 'Line:', line.substring(0, 100) + '...');
      }
    }
    
    return records;
  }, []);

  // Parse complex VALUES clause that may contain JSON
  const parseComplexValuesClause = (valuesStr: string): any[] => {
    const values: any[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    let depth = 0;
    let i = 0;
    
    while (i < valuesStr.length) {
      const char = valuesStr[i];
      
      if (!inString) {
        if (char === "'" || char === '"') {
          inString = true;
          stringChar = char;
          current += char;
        } else if (char === '{' || char === '[') {
          // JSON object/array start
          depth++;
          current += char;
        } else if (char === '}' || char === ']') {
          // JSON object/array end
          depth--;
          current += char;
        } else if (char === ',' && depth === 0) {
          // Top-level comma separator
          values.push(parseValue(current.trim()));
          current = '';
        } else {
          current += char;
        }
      } else {
        // Inside a string
        if (char === '\\' && i + 1 < valuesStr.length) {
          // Escaped character
          current += char + valuesStr[i + 1];
          i++; // Skip next character
        } else if (char === stringChar) {
          // End of string
          inString = false;
          current += char;
        } else {
          current += char;
        }
      }
      
      i++;
    }
    
    // Add the last value
    if (current.trim()) {
      values.push(parseValue(current.trim()));
    }
    
    return values;
  };

  // Parse individual value
  const parseValue = (value: string): any => {
    const trimmed = value.trim();
    
    if (trimmed === 'NULL') return null;
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    
    // String values (quoted)
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      const unquoted = trimmed.slice(1, -1);
      
      // Try to parse as JSON if it looks like JSON
      if (unquoted.startsWith('{') || unquoted.startsWith('[')) {
        try {
          return JSON.parse(unquoted);
        } catch {
          // If JSON parsing fails, return as string
          return unquoted.replace(/\\'/g, "'").replace(/\\"/g, '"');
        }
      }
      
      return unquoted.replace(/\\'/g, "'").replace(/\\"/g, '"');
    }
    
    // Numbers
    if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (/^-?\d*\.\d+$/.test(trimmed)) return parseFloat(trimmed);
    
    return trimmed;
  };

  // Parse metadata record - matches sqlite-builder.ts column order
  const parseMetadataRecord = (values: any[]): any => {
    const [
      resourceKey, id, server, owner, language, type, title, description,
      name, version, lastUpdated, available, toc, isAnchor,
      languageDirection, languageTitle, languageIsGL, updated_at
    ] = values;

    return {
      resourceKey,
      id,
      server,
      owner,
      language,
      type,
      title,
      description,
      name,
      version,
      lastUpdated: new Date(), // Set to current time to prevent staleness
      available: Boolean(available),
      toc: toc && toc !== 'NULL' ? (typeof toc === 'string' ? JSON.parse(toc) : toc) : undefined,
      isAnchor: Boolean(isAnchor),
      languageDirection: languageDirection === 'NULL' ? undefined : languageDirection,
      languageTitle: languageTitle === 'NULL' ? undefined : languageTitle,
      languageIsGL: Boolean(languageIsGL),
      updated_at: typeof updated_at === 'number' ? updated_at : parseInt(updated_at)
    };
  };

  // Parse content record - matches sqlite-builder.ts column order
  const parseContentRecord = (values: any[]): any => {
    const [
      key, resourceKey, resourceId, server, owner, language, type,
      bookCode, articleId, content, lastFetched, cachedUntil, 
      checksum, size, sourceSha, sourceCommit, updated_at
    ] = values;

    return {
      key,
      resourceKey,
      resourceId,
      server,
      owner,
      language,
      type,
      bookCode: bookCode === 'NULL' ? undefined : bookCode,
      articleId: articleId === 'NULL' ? undefined : articleId,
      content: typeof content === 'string' ? JSON.parse(content) : content,
      lastFetched: new Date(), // Set to current time to prevent staleness
      cachedUntil: new Date(Date.now() + (24 * 60 * 60 * 1000)), // Cache for 24 hours
      checksum: checksum === 'NULL' ? undefined : checksum,
      size: typeof size === 'number' ? size : parseInt(size),
      sourceSha: sourceSha === 'NULL' ? undefined : sourceSha,
      sourceCommit: sourceCommit === 'NULL' ? undefined : sourceCommit,
      updated_at: typeof updated_at === 'number' ? updated_at : parseInt(updated_at)
    };
  };

  // Import records to IndexedDB
  const importRecords = useCallback(async (records: SQLiteRecord[]) => {
    const metadataRecords = records.filter(r => r.table === 'resource_metadata');
    const contentRecords = records.filter(r => r.table === 'resource_content');

    // Import metadata first
    for (let i = 0; i < metadataRecords.length; i++) {
      const record = metadataRecords[i];
      setImportProgress({
        stage: 'importing',
        message: `Importing metadata ${i + 1}/${metadataRecords.length}`,
        progress: i + 1,
        total: metadataRecords.length + contentRecords.length
      });

      await storageService.saveResourceMetadata(record.data);
    }

    // Import content
    for (let i = 0; i < contentRecords.length; i++) {
      const record = contentRecords[i];
      setImportProgress({
        stage: 'importing',
        message: `Importing content ${i + 1}/${contentRecords.length}`,
        progress: metadataRecords.length + i + 1,
        total: metadataRecords.length + contentRecords.length
      });

      await storageService.saveResourceContent(record.data);
    }
  }, []);

  // Handle file processing
  const processFile = useCallback(async (file: File) => {
    try {
      setImportProgress({
        stage: 'reading',
        message: 'Reading SQL file...'
      });

      const content = await file.text();
      
      setImportProgress({
        stage: 'parsing',
        message: 'Parsing SQL statements...'
      });

      const records = parseSQLInserts(content);
      
      if (records.length === 0) {
        throw new Error('No valid records found in SQL file');
      }

      setImportProgress({
        stage: 'importing',
        message: 'Importing to IndexedDB...',
        progress: 0,
        total: records.length
      });

      await importRecords(records);

      setImportProgress({
        stage: 'complete',
        message: `Successfully imported ${records.length} records!`
      });

    } catch (error) {
      console.error('Import error:', error);
      setImportProgress({
        stage: 'error',
        message: 'Import failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [parseSQLInserts, importRecords]);

  // File drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const sqlFile = files.find(f => f.name.endsWith('.sql'));
    
    if (sqlFile) {
      processFile(sqlFile);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const resetImport = () => {
    setImportProgress({
      stage: 'idle',
      message: 'Ready to import'
    });
  };

  return (
    <div className="space-y-4">
      {/* File Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="text-center">
          <div className="mx-auto text-4xl text-gray-400 mb-2">📤</div>
          <div className="mt-2">
            <label htmlFor="sql-file" className="cursor-pointer">
              <span className="block text-sm font-medium text-gray-900 dark:text-white">
                Drop SQL file here or{' '}
                <span className="text-blue-600 hover:text-blue-500">browse</span>
              </span>
              <input
                id="sql-file"
                name="sql-file"
                type="file"
                accept=".sql"
                className="sr-only"
                onChange={handleFileSelect}
                disabled={importProgress.stage !== 'idle'}
              />
            </label>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              .sql files
            </p>
          </div>
        </div>
      </div>

      {/* Progress Display */}
      {importProgress.stage !== 'idle' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            {importProgress.stage === 'complete' && (
              <span className="text-green-500 text-lg mt-0.5">✅</span>
            )}
            {importProgress.stage === 'error' && (
              <span className="text-red-500 text-lg mt-0.5">❌</span>
            )}
            {!['complete', 'error'].includes(importProgress.stage) && (
              <div className="w-5 h-5 mt-0.5">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
            
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {importProgress.message}
              </p>
              
              {importProgress.error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {importProgress.error}
                </p>
              )}
              
              {importProgress.progress && importProgress.total && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{importProgress.progress} of {importProgress.total}</span>
                    <span>{Math.round((importProgress.progress / importProgress.total) * 100)}%</span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(importProgress.progress / importProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {['complete', 'error'].includes(importProgress.stage) && (
            <div className="mt-4">
              <button
                onClick={resetImport}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 transition-colors"
              >
                Import Another File
              </button>
            </div>
          )}
        </div>
      )}

      {/* Compact Instructions */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          💡 <strong>Note:</strong> SQL files are larger but work with any SQL-compatible system. Resources will be available in the main app after import.
        </p>
      </div>
    </div>
  );
}
