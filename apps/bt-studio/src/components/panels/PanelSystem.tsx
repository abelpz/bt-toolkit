import React, { useMemo } from 'react';
import {
  LinkedPanelsContainer,
  LinkedPanel,
  createDefaultPluginRegistry,
  LocalStorageAdapter,
  StatePersistenceOptions
} from 'linked-panels';
import { useWorkspacePanels } from '../../contexts/WorkspaceContext';

export function PanelSystem() {
  console.log('🎯 PanelSystem rendering...');
  
  // Get panel configuration from workspace context
  const panelConfig = useWorkspacePanels();
  
  // Create plugin registry (memoized to prevent recreation)
  const plugins = useMemo(() => {
    const pluginRegistry = createDefaultPluginRegistry();
    console.log('📦 Plugins created:', pluginRegistry);
    return pluginRegistry;
  }, []);

  // Configure persistence (memoized to prevent recreation)
  const persistenceOptions = useMemo(() => {
    const options: StatePersistenceOptions = {
      storageAdapter: new LocalStorageAdapter(),
      storageKey: 'bt-studio-panels-state',
      autoSave: true,
      autoSaveDebounce: 1000,
      stateTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    console.log('💾 Persistence configured:', options);
    return options;
  }, []);

  // Check if panel configuration is available
  if (!panelConfig) {
    console.log('⏳ Panel configuration not yet available');
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading panel configuration...</p>
        </div>
      </div>
    );
  }

  console.log('⚙️ Using panel config from workspace:', panelConfig);

  return (
    <div className="h-full">

      
      <LinkedPanelsContainer 
        config={panelConfig} 
        plugins={plugins}
        persistence={persistenceOptions}
      >
        <div className="h-full flex gap-4">
          {/* ULT Panel (Left) */}
          <div className="flex-1">
            <LinkedPanel id="ult-scripture-panel">
              {({ current, navigate }) => (
                <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border">
                  {/* Panel Header */}
                  <div className="flex-shrink-0 px-4 py-3 border-b bg-gray-50 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {current.resource?.title || 'ULT Panel'}
                      </h2>
                    </div>
                    {current.resource?.description && (
                      <div className="mt-1">
                        <p className="text-xs text-gray-500">
                          {current.resource.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Panel Content */}
                  <div className="flex-1 overflow-y-auto">
                    {current.resource?.component ? (
                      React.createElement(current.resource.component as unknown as React.ComponentType<any>, {
                        // Pass resource identification for content fetching
                        resourceId: 'ult-scripture', // ULT panel should fetch ULT content
                        loading: false,
                        error: undefined,
                        scripture: undefined, // Will be loaded by the component
                        currentChapter: 1
                      })
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        No resource selected
                      </div>
                    )}
                  </div>
                </div>
              )}
            </LinkedPanel>
          </div>

          {/* UST Panel (Right) */}
          <div className="flex-1">
            <LinkedPanel id="ust-scripture-panel">
              {({ current, navigate }) => (
                <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border">
                  {/* Panel Header */}
                  <div className="flex-shrink-0 px-4 py-3 border-b bg-gray-50 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {current.resource?.title || 'UST Panel'}
                      </h2>
                    </div>
                    {current.resource?.description && (
                      <div className="mt-1">
                        <p className="text-xs text-gray-500">
                          {current.resource.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Panel Content */}
                  <div className="flex-1 overflow-y-auto">
                    {current.resource?.component ? (
                      React.createElement(current.resource.component as unknown as React.ComponentType<any>, {
                        // Pass resource identification for content fetching
                        resourceId: 'ust-scripture', // UST panel should fetch UST content
                        loading: false,
                        error: undefined,
                        scripture: undefined, // Will be loaded by the component
                        currentChapter: 1
                      })
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        No resource selected
                      </div>
                    )}
                  </div>
                </div>
              )}
            </LinkedPanel>
          </div>
        </div>
      </LinkedPanelsContainer>
    </div>
  );
}