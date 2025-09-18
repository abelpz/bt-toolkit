/**
 * JSONImporter Component
 * 
 * Handles importing JSON database files into IndexedDB storage.
 * Much simpler than SQL parsing - directly imports JSON data.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { storageService } from '../services/storage/StorageService';

interface ImportProgress {
  stage: 'idle' | 'reading' | 'importing' | 'complete' | 'error';
  message: string;
  progress?: number;
  total?: number;
  error?: string;
}

// Support both old and new formats
interface ExportData {
  metadata: any[];
  content: any[];
  exportInfo: {
    timestamp: string;
    server: string;
    owner: string;
    language: string;
    totalResources: number;
    totalContent: number;
  };
}

interface OptimizedExportData {
  v: number; // version
  ts: string; // timestamp
  srv: string; // server
  own: string; // owner
  lng: string; // language
  meta: any[]; // compressed metadata
  cont: any[]; // compressed content
}

export function JSONImporter() {
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    stage: 'idle',
    message: 'Ready to import'
  });
  const [dragActive, setDragActive] = useState(false);
  const [importStrategy, setImportStrategy] = useState<'overwrite' | 'skip' | 'newer'>('newer');
  const [existingData, setExistingData] = useState<{resourceKeys: string[], contentKeys: string[]} | null>(null);

  // Version comparison utility
  const compareVersions = useCallback((version1: string, version2: string): number => {
    // Remove 'v' prefix if present
    const v1 = version1.replace(/^v/, '');
    const v2 = version2.replace(/^v/, '');
    
    // Split into parts and compare numerically
    const parts1 = v1.split('.').map(x => parseInt(x) || 0);
    const parts2 = v2.split('.').map(x => parseInt(x) || 0);
    
    const maxLength = Math.max(parts1.length, parts2.length);
    
    for (let i = 0; i < maxLength; i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0; // Equal
  }, []);

  // Check existing data on component mount
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        const [resourceKeys, contentKeys] = await Promise.all([
          storageService.getExistingResourceKeys(),
          storageService.getExistingContentKeys()
        ]);
        setExistingData({ resourceKeys, contentKeys });
      } catch (error) {
        console.warn('Failed to load existing data:', error);
        setExistingData({ resourceKeys: [], contentKeys: [] });
      }
    };

    loadExistingData();
  }, []);

  // Decompress optimized data back to full format
  const decompressData = useCallback((data: OptimizedExportData): ExportData => {
    console.log('🔧 Decompressing data structure:', {
      version: data.v,
      hasMetadata: !!data.meta,
      metadataCount: data.meta?.length || 0,
      hasContent: !!data.cont,
      contentCount: data.cont?.length || 0
    });

    if (!data.meta || !Array.isArray(data.meta)) {
      throw new Error('Invalid optimized data: meta array is missing or not an array');
    }

    if (!data.cont || !Array.isArray(data.cont)) {
      throw new Error('Invalid optimized data: cont array is missing or not an array');
    }

    const metadata = data.meta.map((m, index) => {
      if (!m || typeof m !== 'object') {
        console.error(`❌ Invalid metadata object at index ${index}:`, m);
        throw new Error(`Invalid metadata object at index ${index}: ${typeof m}`);
      }

      if (!m.k || !m.i) {
        console.error(`❌ Missing required fields in metadata at index ${index}:`, {
          hasKey: !!m.k,
          hasId: !!m.i,
          object: m
        });
        throw new Error(`Missing required fields (k or i) in metadata at index ${index}`);
      }

      return {
        resourceKey: m.k,
        id: m.i,
        server: m.s,
        owner: m.o,
        language: m.l,
        type: m.t,
        title: m.ti,
        description: m.d,
        name: m.n,
        version: m.v,
        lastUpdated: new Date(), // Set to current time to prevent staleness
        available: Boolean(m.a),
        toc: m.toc,
        isAnchor: Boolean(m.ia),
        languageDirection: m.ld,
        languageTitle: m.lt,
        languageIsGL: Boolean(m.lg),
        updated_at: m.ua
      };
    });

    const content = data.cont.map((c, index) => {
      if (!c || typeof c !== 'object') {
        console.error(`❌ Invalid content object at index ${index}:`, c);
        throw new Error(`Invalid content object at index ${index}: ${typeof c}`);
      }

      if (!c.k || !c.rk) {
        console.error(`❌ Missing required fields in content at index ${index}:`, {
          hasKey: !!c.k,
          hasResourceKey: !!c.rk,
          object: c
        });
        throw new Error(`Missing required fields (k or rk) in content at index ${index}`);
      }

      return {
        key: c.k,
        resourceKey: c.rk,
        resourceId: c.ri,
        server: c.s,
        owner: c.o,
        language: c.l,
        type: c.t,
        bookCode: c.bc,
        articleId: c.ai,
        content: c.c,
        lastFetched: new Date(), // Set to current time to prevent staleness
        cachedUntil: new Date(Date.now() + (24 * 60 * 60 * 1000)), // Cache for 24 hours
        checksum: c.cs,
        size: c.sz,
        sourceSha: c.sh,
        sourceCommit: c.sc,
        updated_at: c.ua
      };
    });

    const result = {
      metadata,
      content,
      exportInfo: {
        timestamp: data.ts,
        server: data.srv,
        owner: data.own,
        language: data.lng,
        totalResources: metadata.length,
        totalContent: content.length
      }
    };

    console.log('✅ Decompression complete:', {
      metadataLength: result.metadata.length,
      contentLength: result.content.length,
      exportInfo: result.exportInfo
    });

    return result;
  }, []);

  // Check existing data before import
  const checkExistingData = useCallback(async () => {
    console.log('🔍 Checking existing data...');
    const [resourceKeys, contentKeys] = await Promise.all([
      storageService.getExistingResourceKeys(),
      storageService.getExistingContentKeys()
    ]);
    
    setExistingData({ resourceKeys, contentKeys });
    console.log(`📊 Found ${resourceKeys.length} existing resources and ${contentKeys.length} existing content items`);
    return { resourceKeys, contentKeys };
  }, []);

  // Import records to IndexedDB with conflict resolution
  const importRecords = useCallback(async (data: ExportData) => {
    console.log('📦 Starting import:', data.exportInfo);
    console.log('📊 Data structure:', {
      hasMetadata: !!data.metadata,
      metadataLength: data.metadata?.length || 0,
      hasContent: !!data.content,
      contentLength: data.content?.length || 0,
      metadataType: Array.isArray(data.metadata) ? 'array' : typeof data.metadata
    });

    if (!data.metadata || !Array.isArray(data.metadata)) {
      throw new Error(`Invalid data structure: metadata is ${typeof data.metadata}, expected array`);
    }

    if (!data.content || !Array.isArray(data.content)) {
      throw new Error(`Invalid data structure: content is ${typeof data.content}, expected array`);
    }

    // Check existing data
    const existing = await checkExistingData();
    const existingResourceSet = new Set(existing.resourceKeys);
    const existingContentSet = new Set(existing.contentKeys);

    // For version comparison, get existing metadata with versions
    let existingVersions: Map<string, {version: string, lastUpdated: Date}> | null = null;
    if (importStrategy === 'newer') {
      existingVersions = await storageService.getExistingMetadataWithVersions();
    }

    // Filter data based on import strategy
    let metadataToImport = data.metadata;
    let contentToImport = data.content;
    let versionStats = { newer: 0, same: 0, older: 0 };

    if (importStrategy === 'skip') {
      metadataToImport = data.metadata.filter(m => !existingResourceSet.has(m.resourceKey));
      contentToImport = data.content.filter(c => !existingContentSet.has(c.key));
      console.log(`📋 Strategy 'skip': Importing ${metadataToImport.length}/${data.metadata.length} new resources, ${contentToImport.length}/${data.content.length} new content items`);
    } else if (importStrategy === 'newer' && existingVersions) {
      metadataToImport = data.metadata.filter(m => {
        const existing = existingVersions!.get(m.resourceKey);
        if (!existing) {
          versionStats.newer++;
          return true; // New resource
        }
        
        const comparison = compareVersions(m.version, existing.version);
        if (comparison > 0) {
          versionStats.newer++;
          return true; // Newer version
        } else if (comparison === 0) {
          versionStats.same++;
          return false; // Same version
        } else {
          versionStats.older++;
          return false; // Older version
        }
      });
      
      // For content, include content for resources that are being imported OR missing content for existing resources
      const importingResourceKeys = new Set(metadataToImport.map(m => m.resourceKey));
      contentToImport = data.content.filter(c => {
        const resourceKey = c.key.split('/').slice(0, -1).join('/'); // Remove bookCode from key
        
        // Include if resource is being imported
        if (importingResourceKeys.has(resourceKey)) {
          return true;
        }
        
        // Also include if content doesn't exist yet (missing content for existing resources)
        if (!existingContentSet.has(c.key)) {
          return true;
        }
        
        return false;
      });
      
      const missingContent = contentToImport.length - (importingResourceKeys.size > 0 ? data.content.filter(c => {
        const resourceKey = c.key.split('/').slice(0, -1).join('/');
        return importingResourceKeys.has(resourceKey);
      }).length : 0);
      
      console.log(`📋 Strategy 'newer': ${versionStats.newer} newer, ${versionStats.same} same, ${versionStats.older} older versions.`);
      console.log(`📋 Importing ${metadataToImport.length} resources, ${contentToImport.length} content items (${missingContent} missing content for existing resources)`);
    } else if (importStrategy === 'overwrite') {
      console.log(`📋 Strategy 'overwrite': Importing all ${data.metadata.length} resources and ${data.content.length} content items`);
    }

    // Import metadata first (filtered based on strategy)
    if (metadataToImport.length > 0) {
      console.log(`📋 Importing ${metadataToImport.length} metadata records...`);
      setImportProgress({
        stage: 'importing',
        message: `Importing ${metadataToImport.length} metadata records...`,
        progress: 0,
        total: metadataToImport.length + contentToImport.length
      });

      await storageService.saveResourceMetadata(metadataToImport);
    } else {
      console.log(`📋 Skipping metadata import - all ${data.metadata.length} records already exist`);
    }
    
    const contentMessage = metadataToImport.length > 0 
      ? `Metadata processed, starting content...`
      : contentToImport.length > 0 
        ? `No new resources, importing missing content...`
        : `Import complete - no new data to import`;
        
    setImportProgress({
      stage: 'importing',
      message: contentMessage,
      progress: metadataToImport.length,
      total: metadataToImport.length + contentToImport.length
    });

    // Import content (filtered based on strategy)
    for (let i = 0; i < contentToImport.length; i++) {
      const content = contentToImport[i];
      setImportProgress({
        stage: 'importing',
        message: `Importing content ${i + 1}/${contentToImport.length}`,
        progress: metadataToImport.length + i + 1,
        total: metadataToImport.length + contentToImport.length
      });

      await storageService.saveResourceContent(content);
    }

    console.log(`✅ Import complete: ${metadataToImport.length} resources, ${contentToImport.length} content items`);
  }, [importStrategy, checkExistingData]);

  // Handle file processing (supports compressed and uncompressed formats)
  const processFile = useCallback(async (file: File) => {
    try {
      setImportProgress({
        stage: 'reading',
        message: 'Reading file...'
      });

      let content: string;
      
      // Handle different file types
      if (file.name.endsWith('.gz') || file.name.endsWith('.deflate')) {
        // Compressed files - use browser's built-in decompression
        const arrayBuffer = await file.arrayBuffer();
        
        try {
          // Try using DecompressionStream (modern browsers)
          const compressionFormat = file.name.endsWith('.gz') ? 'gzip' : 'deflate';
          const stream = new DecompressionStream(compressionFormat);
          const decompressedStream = new Response(arrayBuffer).body?.pipeThrough(stream);
          const decompressed = await new Response(decompressedStream).arrayBuffer();
          content = new TextDecoder().decode(decompressed);
          console.log(`📦 Decompressed ${compressionFormat} file using browser API`);
        } catch (error) {
          throw new Error(`Failed to decompress ${file.name}. Please upload an uncompressed .json file instead.`);
        }
      } else {
        // Regular JSON
        content = await file.text();
      }

      const rawData = JSON.parse(content);
      
      console.log('🔍 Parsed JSON structure:', {
        hasVersion: !!rawData.v,
        hasMeta: !!rawData.meta,
        hasCont: !!rawData.cont,
        hasMetadata: !!rawData.metadata,
        hasContent: !!rawData.content,
        hasExportInfo: !!rawData.exportInfo,
        topLevelKeys: Object.keys(rawData)
      });
      
      // Detect format and convert if needed
      let data: ExportData;
      if (rawData.v && rawData.meta && rawData.cont) {
        // Optimized format - decompress
        console.log('🔧 Detected optimized format, decompressing...');
        data = decompressData(rawData as OptimizedExportData);
      } else if (rawData.metadata && rawData.content && rawData.exportInfo) {
        // Legacy format
        console.log('📄 Detected legacy format');
        data = rawData as ExportData;
      } else {
        throw new Error('Invalid file format - not a recognized database export');
      }

      setImportProgress({
        stage: 'importing',
        message: 'Importing to IndexedDB...',
        progress: 0,
        total: data.metadata.length + data.content.length
      });

      await importRecords(data);

      setImportProgress({
        stage: 'complete',
        message: `Successfully imported ${data.metadata.length} resources and ${data.content.length} content items!`
      });

    } catch (error) {
      console.error('Import error:', error);
      setImportProgress({
        stage: 'error',
        message: 'Import failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [importRecords, decompressData]);

  // File drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const dbFile = files.find(f => 
      f.name.endsWith('.json') || 
      f.name.endsWith('.json.gz') || 
      f.name.endsWith('.json.deflate')
    );
    
    if (dbFile) {
      processFile(dbFile);
    } else {
      setImportProgress({
        stage: 'error',
        message: 'Please select a valid database file',
        error: 'Supported formats: .json, .json.gz, .json.deflate'
      });
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
      {/* Import Strategy Selection */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
          📋 Import Strategy:
        </h3>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="importStrategy"
              value="newer"
              checked={importStrategy === 'newer'}
              onChange={(e) => setImportStrategy(e.target.value as 'newer')}
              className="mr-2"
            />
            <span className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Import newer versions only</strong> - Only import resources with newer versions (Recommended)
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="importStrategy"
              value="overwrite"
              checked={importStrategy === 'overwrite'}
              onChange={(e) => setImportStrategy(e.target.value as 'overwrite')}
              className="mr-2"
            />
            <span className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Overwrite all existing data</strong> - Replace all existing resources with imported data
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="importStrategy"
              value="skip"
              checked={importStrategy === 'skip'}
              onChange={(e) => setImportStrategy(e.target.value as 'skip')}
              className="mr-2"
            />
            <span className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Skip existing data</strong> - Only import new resources that don't exist
            </span>
          </label>
        </div>
        {existingData && (
          <div className="mt-3 text-xs text-blue-700 dark:text-blue-300">
            📊 Current database: {existingData.resourceKeys.length} resources, {existingData.contentKeys.length} content items
          </div>
        )}
      </div>

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
            <label htmlFor="json-file" className="cursor-pointer">
              <span className="block text-sm font-medium text-gray-900 dark:text-white">
                Drop file here or{' '}
                <span className="text-blue-600 hover:text-blue-500">browse</span>
              </span>
              <input
                id="json-file"
                name="json-file"
                type="file"
                accept=".json,.gz,.deflate"
                className="sr-only"
                onChange={handleFileSelect}
                disabled={importProgress.stage !== 'idle'}
              />
            </label>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              .json, .json.gz, .json.deflate
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
          💡 <strong>Tip:</strong> Use <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded text-xs">.json.gz</code> files for fastest uploads. Resources will be available in the main app immediately after import.
        </p>
      </div>
    </div>
  );
}
