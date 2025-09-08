/**
 * Compact Header Component
 * Single-row header with navigation and system info dropdown
 */

import React, { useState, useRef, useEffect } from 'react';
import { CompactNavigation } from './Navigation/CompactNavigation';
import { ThemeToggle } from './ThemeToggle';
import { Door43ConfigPanel } from './Door43ConfigPanel';
import { useDoor43 } from '../contexts/Door43Context';
import { useNavigation } from '../contexts/NavigationContext';
import { NavigationMode, RangeReference } from '../types/navigation';
import { offlineCache } from '../services/offline-cache';

interface CacheStats {
  totalEntries: number;
  scriptureEntries: number;
  translationNotesEntries: number;
  estimatedSize: string;
  lastUpdated: Date | null;
}

interface CompactHeaderProps {
  onNavigationChange: (range: RangeReference, mode: NavigationMode) => void;
}

export const CompactHeader: React.FC<CompactHeaderProps> = ({ onNavigationChange }) => {
  const { navigationState, availableBooks } = useNavigation();
  const { config, availableBooks: door43Books } = useDoor43();
  const [isSystemDropdownOpen, setIsSystemDropdownOpen] = useState(false);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Since we now only include available books from manifest, available = total
  const availableCount = door43Books.length;
  const totalCount = door43Books.length;

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

  // Load cache stats
  useEffect(() => {
    const loadCacheStats = async () => {
      try {
        const stats = await offlineCache.getCacheStats();
        setCacheStats(stats);
      } catch (error) {
        console.error('Failed to load cache stats:', error);
      }
    };

    loadCacheStats();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSystemDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClearCache = async () => {
    if (window.confirm('Clear all cached data?')) {
      try {
        await offlineCache.clearCache();
        setCacheStats({
          totalEntries: 0,
          scriptureEntries: 0,
          translationNotesEntries: 0,
          estimatedSize: '0 KB',
          lastUpdated: null
        });
        alert('Cache cleared successfully!');
      } catch (error) {
        console.error('Failed to clear cache:', error);
        alert('Failed to clear cache.');
      }
    }
  };

  return (
    <>
    <div className="
      flex-shrink-0 
      bg-white/80 dark:bg-gray-900/80 
      backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50
      shadow-sm
    ">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Left: App Title + Navigation */}
          <div className="flex items-center space-x-4">
            {/* App Title */}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white text-xs font-bold">📖</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Translation Studio
                </h1>
                <div className="text-xs text-gray-500 dark:text-gray-400">v1.0</div>
              </div>
            </div>

            {/* Navigation */}
            <CompactNavigation
              navigationState={navigationState}
              onNavigationChange={onNavigationChange}
              availableBooks={availableBooks}
              className="max-w-md"
            />
          </div>

          {/* Right: System Info + Theme Toggle */}
          <div className="flex items-center space-x-2">
            {/* System Info Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsSystemDropdownOpen(!isSystemDropdownOpen)}
                className="
                  flex items-center space-x-2 px-2 py-1 rounded-lg text-xs
                  text-gray-600 dark:text-gray-300 
                  hover:text-gray-800 dark:hover:text-gray-100
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  dark:focus:ring-offset-gray-800
                "
              >
                {/* Status Indicators */}
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-medium">{config.organization}</span>
                <span className="text-gray-400">•</span>
                <span className="font-medium">{config.language}_{config.resourceType}</span>
                <span className="text-gray-400">•</span>
                <span>📚 {availableCount}/{totalCount}</span>
                <span className="text-gray-400">•</span>
                <span>💾 {cacheStats?.totalEntries || 0}</span>
                {/* Configuration indicator */}
                {(config.organization !== 'unfoldingWord' || config.language !== 'en') && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full">
                      Custom
                    </span>
                  </>
                )}
                {/* Auto-detected resource indicator */}
                {config.resourceType !== 'ult' && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded-full">
                      Auto: {config.resourceType.toUpperCase()}
                    </span>
                  </>
                )}
                <span className={`transform transition-transform duration-200 ${isSystemDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {/* System Info Dropdown */}
              {isSystemDropdownOpen && (
                <div className="
                  absolute right-0 top-full mt-2 w-80 
                  bg-white dark:bg-gray-800 
                  border border-gray-200 dark:border-gray-700 
                  rounded-xl shadow-xl dark:shadow-2xl 
                  backdrop-blur-md z-50
                  animate-in slide-in-from-top-2 duration-200
                ">
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">System Status</h4>
                      <button
                        onClick={() => setIsSystemDropdownOpen(false)}
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

                    {/* Connection Status */}
                    <div className="mb-4">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Connection</div>
                      <div className={`
                        flex items-center space-x-2 px-3 py-2 rounded-lg text-sm
                        ${isOnline 
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                          : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                        }
                      `}>
                        <span>{isOnline ? '🌐' : '📱'}</span>
                        <span>{isOnline ? 'Online' : 'Offline'}</span>
                      </div>
                    </div>

                    {/* Door43 Configuration */}
                    <div className="mb-4">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Door43 Configuration</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Organization:</span>
                          <span className="font-medium">{config.organization}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Language:</span>
                          <span className="font-medium">{config.language}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Resource:</span>
                          <span className="font-medium">{config.resourceType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Available Books:</span>
                          <span className="font-medium">{availableCount}/{totalCount}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setIsConfigPanelOpen(true);
                          setIsSystemDropdownOpen(false);
                        }}
                        className="
                          w-full px-3 py-2 text-xs font-medium rounded-lg mt-3
                          text-blue-700 dark:text-blue-300
                          bg-blue-50 dark:bg-blue-900/20
                          hover:bg-blue-100 dark:hover:bg-blue-900/30
                          border border-blue-200 dark:border-blue-800/50
                          transition-colors duration-200
                          flex items-center justify-center space-x-2
                        "
                      >
                        <span>⚙️</span>
                        <span>Change Configuration</span>
                      </button>
                    </div>

                    {/* Cache Information */}
                    <div className="mb-4">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Cache Status</div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Scripture</div>
                          <div className="font-semibold">{cacheStats?.scriptureEntries || 0}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Notes</div>
                          <div className="font-semibold">{cacheStats?.translationNotesEntries || 0}</div>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-3">
                        <span>Total Size:</span>
                        <span>{cacheStats?.estimatedSize || '0 KB'}</span>
                      </div>
                      <button
                        onClick={handleClearCache}
                        className="
                          w-full px-3 py-2 text-xs font-medium rounded-lg
                          text-red-700 dark:text-red-300
                          bg-red-50 dark:bg-red-900/20
                          hover:bg-red-100 dark:hover:bg-red-900/30
                          border border-red-200 dark:border-red-800/50
                          transition-colors duration-200
                        "
                      >
                        Clear Cache
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>

    {/* Door43 Configuration Panel */}
    <Door43ConfigPanel
      isOpen={isConfigPanelOpen}
      onClose={() => setIsConfigPanelOpen(false)}
    />
    </>
  );
};

export default CompactHeader;
