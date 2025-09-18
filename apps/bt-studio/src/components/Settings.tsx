/**
 * Settings Component
 * 
 * Provides application settings including SQLite database import functionality.
 * Allows users to import pre-built SQLite databases into their local IndexedDB storage.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SQLiteImporter } from './SQLiteImporter';
import { JSONImporter } from './JSONImporter';
import { storageService } from '../services/storage/StorageService';

export function Settings() {
  const [activeTab, setActiveTab] = useState<'general' | 'import'>('general');
  const [importFormat, setImportFormat] = useState<'json' | 'sql'>('json');
  const [storageInfo, setStorageInfo] = useState<any>(null);

  useEffect(() => {
    // Load storage information
    const loadStorageInfo = async () => {
      try {
        const info = await storageService.getStorageInfo();
        setStorageInfo(info);
      } catch (error) {
        console.warn('Failed to load storage info:', error);
      }
    };

    if (activeTab === 'general') {
      loadStorageInfo();
    }
  }, [activeTab]);

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                to="/"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ← Back to App
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Settings
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="flex lg:flex-col space-x-1 lg:space-x-0 lg:space-y-1 lg:sticky lg:top-4 overflow-x-auto lg:overflow-x-visible">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full lg:w-full flex-shrink-0 flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'general'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 lg:border-r-2 border-blue-500'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                🗄️ General
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`w-full lg:w-full flex-shrink-0 flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'import'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 lg:border-r-2 border-blue-500'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                📤 Import Database
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-4">
            {activeTab === 'general' && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  General Settings
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Application Info
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Version</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">1.0.0</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Storage</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">IndexedDB</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Server</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">git.door43.org</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Theme</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">System</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Storage Status
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                      {storageInfo ? (
                        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Resources</dt>
                            <dd className="text-sm text-gray-900 dark:text-white">{storageInfo.resourceCount || 0}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Content Items</dt>
                            <dd className="text-sm text-gray-900 dark:text-white">{storageInfo.contentCount || 0}</dd>
                          </div>
                        </dl>
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Your resources are stored locally in your browser's IndexedDB. 
                          Use the Import Database tab to load pre-built resource collections.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'import' && (
              <div className="space-y-6">
                {/* Import Options */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Import Database
                  </h2>
                    <div className="mb-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Import a pre-built database containing translation resources. 
                        This will add all the resources to your workspace and make them available in the main app.
                      </p>
                    </div>

                  {/* Format Selection */}
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Import Format:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setImportFormat('json')}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                          importFormat === 'json'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        📦 JSON (47 MB)
                      </button>
                      <button
                        onClick={() => setImportFormat('sql')}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                          importFormat === 'sql'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        🗄️ SQL (339 MB)
                      </button>
                    </div>
                  </div>

                  {/* Compact Instructions */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                    <h4 className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                      📋 Quick Steps:
                    </h4>
                    {importFormat === 'json' ? (
                      <div className="text-xs text-blue-800 dark:text-blue-200 space-y-0.5">
                        <div>1. Run: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded text-xs">npx tsx json-exporter.ts</code></div>
                        <div>2. Upload: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded text-xs">.json.gz</code> file (47 MB)</div>
                      </div>
                    ) : (
                      <div className="text-xs text-blue-800 dark:text-blue-200 space-y-0.5">
                        <div>1. Run: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded text-xs">npx tsx sqlite-builder.ts</code></div>
                        <div>2. Upload: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded text-xs">.sql</code> file (339 MB)</div>
                      </div>
                    )}
                  </div>

                  {importFormat === 'json' ? <JSONImporter /> : <SQLiteImporter />}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
