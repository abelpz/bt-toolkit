/**
 * Cache Manager Component
 * Provides UI for managing offline cache and viewing cache statistics
 */

import React, { useState, useEffect } from 'react';
import { offlineCache } from '../services/offline-cache';
import { useDoor43 } from '../contexts/Door43Context';

interface CacheStats {
  totalEntries: number;
  scriptureEntries: number;
  translationNotesEntries: number;
  estimatedSize: string;
  lastUpdated: Date | null;
}

interface CachedBooks {
  scripture: string[];
  translationNotes: string[];
}

export const CacheManager: React.FC = () => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [cachedBooks, setCachedBooks] = useState<CachedBooks>({ scripture: [], translationNotes: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isExpanded, setIsExpanded] = useState(false);
  const { config } = useDoor43();

  // Online/offline event listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cache data
  useEffect(() => {
    const loadCacheData = async () => {
      try {
        setIsLoading(true);
        
        const [cacheStats, books] = await Promise.all([
          offlineCache.getCacheStats(),
          offlineCache.getCachedBooks({
            organization: config.organization,
            language: config.language,
            resourceType: config.resourceType
          })
        ]);
        
        setStats(cacheStats);
        setCachedBooks(books);
      } catch (error) {
        console.error('Failed to load cache data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCacheData();
  }, []);

  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear all cached data? This will remove all offline content.')) {
      try {
        await offlineCache.clearCache();
        setStats({
          totalEntries: 0,
          scriptureEntries: 0,
          translationNotesEntries: 0,
          estimatedSize: '0 KB',
          lastUpdated: null
        });
        setCachedBooks({ scripture: [], translationNotes: [] });
        alert('Cache cleared successfully!');
      } catch (error) {
        console.error('Failed to clear cache:', error);
        alert('Failed to clear cache. Please try again.');
      }
    }
  };

  const handleRemoveBook = async (bookName: string, type: 'scripture' | 'translationNotes') => {
    if (window.confirm(`Remove ${bookName} ${type} from cache?`)) {
      try {
        const context = {
          organization: config.organization,
          language: config.language,
          resourceType: config.resourceType
        };
        
        if (type === 'scripture') {
          await offlineCache.removeCachedScripture(context, bookName);
        } else {
          await offlineCache.removeCachedTranslationNotes(context, bookName);
        }
        
        // Refresh data
        const [cacheStats, books] = await Promise.all([
          offlineCache.getCacheStats(),
          offlineCache.getCachedBooks(context)
        ]);
        
        setStats(cacheStats);
        setCachedBooks(books);
      } catch (error) {
        console.error(`Failed to remove ${bookName} ${type}:`, error);
        alert(`Failed to remove ${bookName} ${type}. Please try again.`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="
        bg-gray-50 dark:bg-gray-700/50 
        border border-gray-200 dark:border-gray-600/50 
        rounded-lg p-3 animate-pulse
      ">
        <div className="text-sm text-gray-600 dark:text-gray-400">Loading cache information...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Compact Status Display */}
      <div className="flex items-center space-x-2">
        <span className={`
          text-xs px-2 py-1 rounded-full font-medium transition-colors duration-200
          ${isOnline 
            ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' 
            : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
          }
        `}>
          {isOnline ? '🌐' : '📱'}
        </span>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="
            text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200
            text-gray-600 dark:text-gray-300 
            hover:text-gray-800 dark:hover:text-gray-100
            border border-gray-300 dark:border-gray-600 
            hover:border-gray-400 dark:hover:border-gray-500
            bg-white dark:bg-gray-800 
            hover:bg-gray-50 dark:hover:bg-gray-700
            shadow-sm hover:shadow-md
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            dark:focus:ring-offset-gray-800
          "
        >
          💾 {stats?.totalEntries || 0}
        </button>
      </div>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="
          absolute right-0 top-full mt-2 w-80 
          bg-white dark:bg-gray-800 
          border border-gray-200 dark:border-gray-700 
          rounded-xl shadow-xl dark:shadow-2xl 
          backdrop-blur-md z-50
          animate-in slide-in-from-top-2 duration-200
        ">
          <div className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Offline Cache</h4>
              <button
                onClick={() => setIsExpanded(false)}
                className="
                  text-gray-400 dark:text-gray-500 
                  hover:text-gray-600 dark:hover:text-gray-300
                  w-6 h-6 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700
                  flex items-center justify-center transition-colors duration-200
                "
              >
                ×
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm mb-5">
              <div className="
                bg-gray-50 dark:bg-gray-700/50 
                rounded-lg p-3 border border-gray-200 dark:border-gray-600/50
              ">
                <div className="text-gray-500 dark:text-gray-400 text-xs font-medium">Scripture</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {stats?.scriptureEntries || 0} books
                </div>
              </div>
              <div className="
                bg-gray-50 dark:bg-gray-700/50 
                rounded-lg p-3 border border-gray-200 dark:border-gray-600/50
              ">
                <div className="text-gray-500 dark:text-gray-400 text-xs font-medium">Notes</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {stats?.translationNotesEntries || 0} books
                </div>
              </div>
              <div className="
                bg-gray-50 dark:bg-gray-700/50 
                rounded-lg p-3 border border-gray-200 dark:border-gray-600/50
              ">
                <div className="text-gray-500 dark:text-gray-400 text-xs font-medium">Total Size</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {stats?.estimatedSize || '0 KB'}
                </div>
              </div>
              <div className="
                bg-gray-50 dark:bg-gray-700/50 
                rounded-lg p-3 border border-gray-200 dark:border-gray-600/50
              ">
                <div className="text-gray-500 dark:text-gray-400 text-xs font-medium">Status</div>
                <div className={`font-semibold mt-1 ${
                  isOnline 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {isOnline ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            <div className="space-y-4">
              {/* Cached Scripture Books */}
              {cachedBooks.scripture.length > 0 && (
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">Cached Scripture Books</h5>
                  <div className="flex flex-wrap gap-2">
                    {cachedBooks.scripture.map((book) => (
                      <div key={book} className="
                        flex items-center space-x-1 
                        bg-blue-100 dark:bg-blue-900/50 
                        text-blue-800 dark:text-blue-200 
                        px-3 py-1.5 rounded-full text-xs font-medium
                        border border-blue-200 dark:border-blue-800/50
                        hover:bg-blue-200 dark:hover:bg-blue-900/70
                        transition-colors duration-200
                      ">
                        <span>{book.toUpperCase()}</span>
                        <button
                          onClick={() => handleRemoveBook(book, 'scripture')}
                          className="
                            text-blue-600 dark:text-blue-400 
                            hover:text-blue-800 dark:hover:text-blue-200 
                            ml-1 w-4 h-4 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800
                            flex items-center justify-center transition-colors duration-200
                          "
                          title={`Remove ${book} scripture`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cached Translation Notes */}
              {cachedBooks.translationNotes.length > 0 && (
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">Cached Translation Notes</h5>
                  <div className="flex flex-wrap gap-2">
                    {cachedBooks.translationNotes.map((book) => (
                      <div key={book} className="
                        flex items-center space-x-1 
                        bg-green-100 dark:bg-green-900/50 
                        text-green-800 dark:text-green-200 
                        px-3 py-1.5 rounded-full text-xs font-medium
                        border border-green-200 dark:border-green-800/50
                        hover:bg-green-200 dark:hover:bg-green-900/70
                        transition-colors duration-200
                      ">
                        <span>{book.toUpperCase()}</span>
                        <button
                          onClick={() => handleRemoveBook(book, 'translationNotes')}
                          className="
                            text-green-600 dark:text-green-400 
                            hover:text-green-800 dark:hover:text-green-200 
                            ml-1 w-4 h-4 rounded-full hover:bg-green-200 dark:hover:bg-green-800
                            flex items-center justify-center transition-colors duration-200
                          "
                          title={`Remove ${book} translation notes`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No cached data */}
              {cachedBooks.scripture.length === 0 && cachedBooks.translationNotes.length === 0 && (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <div className="text-3xl mb-3">📦</div>
                  <div className="font-medium">No cached data available</div>
                  <div className="text-xs mt-2 text-gray-400 dark:text-gray-500">
                    Load some content while online to cache it for offline use
                  </div>
                </div>
              )}

              {/* Actions */}
              {(cachedBooks.scripture.length > 0 || cachedBooks.translationNotes.length > 0) && (
                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {stats?.lastUpdated && `Last updated: ${stats.lastUpdated.toLocaleString()}`}
                  </div>
                  <button
                    onClick={handleClearCache}
                    className="
                      text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200
                      text-red-600 dark:text-red-400 
                      hover:text-red-800 dark:hover:text-red-200
                      border border-red-300 dark:border-red-700 
                      hover:border-red-400 dark:hover:border-red-600
                      bg-red-50 dark:bg-red-900/20 
                      hover:bg-red-100 dark:hover:bg-red-900/40
                      focus:outline-none focus:ring-2 focus:ring-red-500
                    "
                  >
                    Clear All Cache
                  </button>
                </div>
              )}

              {/* Offline Mode Info */}
              {!isOnline && (
                <div className="
                  bg-yellow-50 dark:bg-yellow-900/20 
                  border border-yellow-200 dark:border-yellow-800/50 
                  rounded-lg p-4
                ">
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <div className="font-semibold mb-2 flex items-center space-x-2">
                      <span>📱</span>
                      <span>Offline Mode</span>
                    </div>
                    <div className="text-xs text-yellow-700 dark:text-yellow-300">
                      You're currently offline. Only cached content is available. 
                      {(cachedBooks.scripture.length > 0 || cachedBooks.translationNotes.length > 0) 
                        ? ' You can access the cached books shown above.'
                        : ' No cached content is available.'
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheManager;
