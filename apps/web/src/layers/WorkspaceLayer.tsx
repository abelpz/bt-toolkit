/**
 * Workspace Layer
 * Manages Door43 configuration (owner/organization, language)
 * Provides workspace context to all child layers
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { PanelsLayer } from './PanelsLayer';

// Workspace configuration interface
export interface WorkspaceConfig {
  owner: string;
  language: string;
}

// Workspace context interface
interface WorkspaceContextType {
  config: WorkspaceConfig;
  updateConfig: (newConfig: Partial<WorkspaceConfig>) => void;
  isConfiguring: boolean;
  setIsConfiguring: (configuring: boolean) => void;
}

// Create workspace context
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Hook to use workspace context
export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceLayer');
  }
  return context;
};

// Default workspace configuration
const DEFAULT_CONFIG: WorkspaceConfig = {
  owner: 'unfoldingWord',
  language: 'en'
};

export const WorkspaceLayer: React.FC = () => {
  const [config, setConfig] = useState<WorkspaceConfig>(DEFAULT_CONFIG);
  const [isConfiguring, setIsConfiguring] = useState(false);

  const updateConfig = useCallback((newConfig: Partial<WorkspaceConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...newConfig
    }));
    console.log('🔧 Workspace config updated:', { ...config, ...newConfig });
  }, [config]);

  const contextValue: WorkspaceContextType = {
    config,
    updateConfig,
    isConfiguring,
    setIsConfiguring
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
      <div className="h-full w-full flex flex-col">
        {/* Workspace Header - Configuration UI */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Translation Studio
              </h1>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {config.owner}/{config.language}
              </div>
            </div>
            
            <button
              onClick={() => setIsConfiguring(!isConfiguring)}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {isConfiguring ? 'Done' : 'Configure'}
            </button>
          </div>
          
          {/* Configuration Panel */}
          {isConfiguring && (
            <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Owner/Organization
                  </label>
                  <select
                    value={config.owner}
                    onChange={(e) => updateConfig({ owner: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="unfoldingWord">unfoldingWord</option>
                    <option value="es-419_gl">es-419_gl</option>
                    <option value="door43-catalog">door43-catalog</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Language
                  </label>
                  <select
                    value={config.language}
                    onChange={(e) => updateConfig({ language: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="en">English (en)</option>
                    <option value="es-419">Spanish (es-419)</option>
                    <option value="fr">French (fr)</option>
                    <option value="pt-br">Portuguese Brazil (pt-br)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panels Layer */}
        <div className="flex-1 overflow-hidden">
          <PanelsLayer />
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
};
