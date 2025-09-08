/**
 * Door43 Configuration Panel
 * Allows users to change Door43 server, organization, language, and resource type
 */

import React, { useState, useRef, useEffect } from 'react';
import { useDoor43 } from '../contexts/Door43Context';
import type { Door43Config } from '../contexts/Door43Context';

interface Door43ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Popular Door43 configurations (resource type auto-detected)
const POPULAR_CONFIGS: Array<Door43Config & { name: string; description: string }> = [
  {
    name: 'unfoldingWord English',
    description: 'English Bible translation (auto-detects best resource)',
    server: 'https://git.door43.org',
    organization: 'unfoldingWord',
    language: 'en',
    resourceType: 'ult' // Will be auto-detected
  },
  {
    name: 'French (fr)',
    description: 'French Bible translation (auto-detects best resource)',
    server: 'https://git.door43.org',
    organization: 'fr_gl',
    language: 'fr',
    resourceType: 'ult' // Will be auto-detected
  },
  {
    name: 'Español de Latinoamérica (es-419_gl)',
    description: 'Español de Latinoamérica',
    server: 'https://git.door43.org',
    organization: 'es-419_gl',
    language: 'es-419',
    resourceType: 'glt' // Will be auto-detected
  },
];

// Common languages
const COMMON_LANGUAGES = [
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'hi', name: 'Hindi' },
  { code: 'id', name: 'Indonesian' },
  { code: 'es-419', name: 'Spanish (Latin America)' },
  { code: 'pt-br', name: 'Portuguese (Brazil)' },
  { code: 'ru', name: 'Russian' },
];

// Note: Resource types are now auto-detected (ult -> ust -> glt -> etc.)

// Common organizations
const COMMON_ORGANIZATIONS = [
  { code: 'unfoldingWord', name: 'unfoldingWord' },
  { code: 'es-419_gl', name: 'idiomasPuentes' }
];

export const Door43ConfigPanel: React.FC<Door43ConfigPanelProps> = ({ isOpen, onClose }) => {
  const { config, updateConfig, refreshBooks, isLoading } = useDoor43();
  const [localConfig, setLocalConfig] = useState<Door43Config>(config);
  const [activeTab, setActiveTab] = useState<'popular' | 'custom'>('popular');
  const [isApplying, setIsApplying] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Update local config when global config changes
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleApplyConfig = async (configToApply: Door43Config) => {
    try {
      setIsApplying(true);
      
      console.log('🔧 Applying Door43 config:', configToApply);
      
      // Update the global configuration
      updateConfig(configToApply);
      
      // Refresh available books for the new configuration
      await refreshBooks();
      
      console.log('✅ Door43 configuration updated successfully');
      onClose();
    } catch (error) {
      console.error('❌ Failed to update Door43 configuration:', error);
      alert('Failed to update configuration. Please check the settings and try again.');
    } finally {
      setIsApplying(false);
    }
  };

  const handlePopularConfigSelect = (popularConfig: typeof POPULAR_CONFIGS[0]) => {
    const { name, description, ...config } = popularConfig;
    handleApplyConfig(config);
  };

  const handleCustomConfigApply = () => {
    handleApplyConfig(localConfig);
  };

  const updateLocalConfig = (updates: Partial<Door43Config>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
  };

  const isCurrentConfig = (testConfig: Door43Config) => {
    return (
      testConfig.server === config.server &&
      testConfig.organization === config.organization &&
      testConfig.language === config.language
      // Note: resourceType is auto-detected, so we don't compare it
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        ref={panelRef}
        className="
          bg-white dark:bg-gray-800 
          rounded-xl shadow-2xl 
          w-full max-w-2xl max-h-[90vh] 
          overflow-hidden flex flex-col
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Door43 Configuration
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Change server, organization, language, and resource type
            </p>
          </div>
          <button
            onClick={onClose}
            className="
              text-gray-400 dark:text-gray-500 
              hover:text-gray-600 dark:hover:text-gray-300
              w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700
              flex items-center justify-center transition-colors duration-200
            "
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('popular')}
            className={`
              px-6 py-3 text-sm font-medium transition-colors duration-200
              ${activeTab === 'popular'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }
            `}
          >
            📚 Popular Configurations
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`
              px-6 py-3 text-sm font-medium transition-colors duration-200
              ${activeTab === 'custom'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }
            `}
          >
            ⚙️ Custom Configuration
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'popular' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select from popular Door43 configurations:
              </p>
              
              {POPULAR_CONFIGS.map((popularConfig, index) => (
                <div
                  key={index}
                  className={`
                    p-4 rounded-lg border transition-all duration-200 cursor-pointer
                    ${isCurrentConfig(popularConfig)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }
                  `}
                  onClick={() => handlePopularConfigSelect(popularConfig)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {popularConfig.name}
                        </h3>
                        {isCurrentConfig(popularConfig) && (
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {popularConfig.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>🏢 {popularConfig.organization}</span>
                        <span>🌍 {popularConfig.language}</span>
                        <span>📖 Auto-detect best resource</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {isCurrentConfig(popularConfig) ? (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure custom Door43 settings. Resource type will be auto-detected (ULT → UST → GLT → others):
              </p>

              {/* Server */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Server URL
                </label>
                <input
                  type="url"
                  value={localConfig.server}
                  onChange={(e) => updateLocalConfig({ server: e.target.value })}
                  className="
                    w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                    rounded-lg bg-white dark:bg-gray-700 
                    text-gray-900 dark:text-gray-100
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  "
                  placeholder="https://git.door43.org"
                />
              </div>

              {/* Organization */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Organization
                </label>
                <div className="space-y-2">
                  <select
                    value={localConfig.organization}
                    onChange={(e) => updateLocalConfig({ organization: e.target.value })}
                    className="
                      w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                      rounded-lg bg-white dark:bg-gray-700 
                      text-gray-900 dark:text-gray-100
                      focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    "
                  >
                    {COMMON_ORGANIZATIONS.map((org) => (
                      <option key={org.code} value={org.code}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={localConfig.organization}
                    onChange={(e) => updateLocalConfig({ organization: e.target.value })}
                    className="
                      w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                      rounded-lg bg-white dark:bg-gray-700 
                      text-gray-900 dark:text-gray-100
                      focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    "
                    placeholder="Custom organization name"
                  />
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <div className="space-y-2">
                  <select
                    value={localConfig.language}
                    onChange={(e) => updateLocalConfig({ language: e.target.value })}
                    className="
                      w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                      rounded-lg bg-white dark:bg-gray-700 
                      text-gray-900 dark:text-gray-100
                      focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    "
                  >
                    {COMMON_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} ({lang.code})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={localConfig.language}
                    onChange={(e) => updateLocalConfig({ language: e.target.value })}
                    className="
                      w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                      rounded-lg bg-white dark:bg-gray-700 
                      text-gray-900 dark:text-gray-100
                      focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    "
                    placeholder="Custom language code (e.g., en, es, fr)"
                  />
                </div>
              </div>

              {/* Resource Type - Auto-detected */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Resource Type
                </label>
                <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <span>🔍</span>
                    <span>Auto-detected (priority: ULT → UST → GLT → others)</span>
                  </div>
                  <div className="text-xs mt-1">
                    Current: <span className="font-medium text-gray-900 dark:text-gray-100">{config.resourceType.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* Apply Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleCustomConfigApply}
                  disabled={isApplying || isLoading}
                  className="
                    px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg
                    hover:bg-blue-700 dark:hover:bg-blue-600 
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors duration-200 text-sm font-medium
                    flex items-center space-x-2
                  "
                >
                  {(isApplying || isLoading) && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  <span>{isApplying ? 'Applying...' : 'Apply Configuration'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {(isApplying || isLoading) && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isApplying ? 'Applying configuration...' : 'Loading available books...'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Door43ConfigPanel;
