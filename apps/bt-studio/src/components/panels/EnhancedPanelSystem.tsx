/**
 * Enhanced Panel System with Resource Navigation
 * 
 * Supports multiple resources per panel with dropdown navigation.
 * Each panel can only show/mount one resource at a time.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LinkedPanelsContainer,
  LinkedPanel,
  createDefaultPluginRegistry,
  LocalStorageAdapter,
  StatePersistenceOptions
} from 'linked-panels';
import { useWorkspace, useWorkspacePanels } from '../../contexts/WorkspaceContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { PANEL_ASSIGNMENTS, getDefaultResourceForPanel, getSmartPanelEntries } from '../../config/app-resources';

interface PanelResourceState {
  [panelId: string]: string; // panelId -> currently selected resourceId
}

interface DropdownState {
  [panelId: string]: boolean; // panelId -> is dropdown open
}

export function EnhancedPanelSystem() {
  const { processedResourceConfig } = useWorkspace();
  const panelConfig = useWorkspacePanels();
  const { currentReference, getBookInfo } = useNavigation();
  const [panelResourceState, setPanelResourceState] = useState<PanelResourceState>({});
  const [dropdownState, setDropdownState] = useState<DropdownState>({});
  const dropdownRefs = useRef<{ [panelId: string]: HTMLDivElement | null }>({});
  const currentResourceIds = useRef<Record<string, string>>({});

  console.log('🎯 EnhancedPanelSystem rendering...', { 
    hasProcessedConfig: !!processedResourceConfig, 
    hasPanelConfig: !!panelConfig 
  });

  // Get testament info for smart entries
  const currentBookInfo = getBookInfo(currentReference.book);
  const testament = currentBookInfo?.testament;

  // Helper function to get all available entries for a panel (resources + smart entries)
  const getAvailableEntriesForPanel = (panelId: string) => {
    const panelAssignment = PANEL_ASSIGNMENTS.find(panel => panel.panelId === panelId);
    if (!panelAssignment) return [];

    const entries: Array<{
      id: string;
      type: 'resource' | 'smart';
      title: string;
      description: string;
      component: any;
      icon: string;
    }> = [];

    // Add traditional resources
    if (panelAssignment.resources) {
      const availableResources = processedResourceConfig?.filter((resource: any) => 
        panelAssignment.resources!.includes(resource.panelResourceId)
      ) || [];

      availableResources.forEach((resource: any) => {
        entries.push({
          id: resource.panelResourceId,
          type: 'resource',
          title: resource.actualTitle || resource.panelConfig.title,
          description: resource.metadata?.description || resource.panelConfig.description,
          component: resource.panelConfig.component,
          icon: resource.panelConfig.icon
        });
      });
    }

    // Add smart entries
    if (panelAssignment.smartEntries) {
      const smartPanelEntries = getSmartPanelEntries();
      
      panelAssignment.smartEntries.forEach(entryId => {
        const smartEntry = smartPanelEntries.find(entry => entry.panelEntryId === entryId);
        if (smartEntry) {
          const dynamicConfig = smartEntry.getDynamicConfig({
            testament,
            currentBook: currentReference.book,
            navigation: { currentReference, getBookInfo }
          });

          entries.push({
            id: smartEntry.panelEntryId,
            type: 'smart',
            title: dynamicConfig.title,
            description: dynamicConfig.description,
            component: smartEntry.component,
            icon: dynamicConfig.icon
          });
        }
      });
    }

    return entries;
  };

  // Synchronize panel resource state with LinkedPanel current resource
  useEffect(() => {
    const syncStates = () => {
      const updates: Record<string, string> = {};
      let hasUpdates = false;

      Object.entries(currentResourceIds.current).forEach(([panelId, resourceId]) => {
        if (resourceId && panelResourceState[panelId] !== resourceId) {
          updates[panelId] = resourceId;
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        setPanelResourceState(prev => ({ ...prev, ...updates }));
      }
    };

    // Use a small delay to ensure this runs after render
    const timeoutId = setTimeout(syncStates, 0);
    return () => clearTimeout(timeoutId);
  });

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
      storageKey: 'bt-studio-enhanced-panels-state',
      autoSave: true,
      autoSaveDebounce: 1000,
      stateTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    console.log('💾 Persistence configured:', options);
    return options;
  }, []);

  // Initialize default resources for each panel
  useEffect(() => {
    if (!processedResourceConfig) return;

    const initialState: PanelResourceState = {};
    PANEL_ASSIGNMENTS.forEach(panel => {
      const defaultResource = getDefaultResourceForPanel(panel.panelId);
      if (defaultResource) {
        initialState[panel.panelId] = defaultResource.panelResourceId;
      }
    });

    setPanelResourceState(initialState);
    console.log('🔧 Initialized panel resource state:', initialState);
  }, [processedResourceConfig]);

  // Store navigate functions for each panel
  const navigateFunctions = useRef<{ [panelId: string]: any }>({});

  // Handle resource selection change within a panel
  const handleResourceChange = (panelId: string, entryId: string) => {
    // Update local state for dropdown tracking
    setPanelResourceState(prev => ({
      ...prev,
      [panelId]: entryId
    }));
    
    // Use LinkedPanel's navigate function to actually switch resources
    const navigateFunction = navigateFunctions.current[panelId];
    if (navigateFunction) {
      // Find the index of the entry in all available entries for this panel
      const availableEntries = getAvailableEntriesForPanel(panelId);
      const entryIndex = availableEntries.findIndex(entry => entry.id === entryId);
      
      if (entryIndex >= 0) {
        navigateFunction.toIndex(entryIndex);
      }
    }
    
    // Close dropdown after selection
    setDropdownState(prev => ({
      ...prev,
      [panelId]: false
    }));
    console.log(`🔄 Panel ${panelId} switched to entry: ${entryId}`);
  };

  // Toggle dropdown open/close
  const toggleDropdown = (panelId: string) => {
    setDropdownState(prev => ({
      ...prev,
      [panelId]: !prev[panelId]
    }));
  };

  // Navigate to previous resource in panel
  const navigateToPrevResource = (panelId: string) => {
    const navigateFunction = navigateFunctions.current[panelId];
    if (navigateFunction) {
      navigateFunction.previous();
    }
  };

  // Navigate to next resource in panel
  const navigateToNextResource = (panelId: string) => {
    const navigateFunction = navigateFunctions.current[panelId];
    if (navigateFunction) {
      navigateFunction.next();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(dropdownRefs.current).forEach(panelId => {
        const dropdownRef = dropdownRefs.current[panelId];
        if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
          setDropdownState(prev => ({
            ...prev,
            [panelId]: false
          }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Note: We now use current.resource from LinkedPanel instead of getCurrentResourceConfig

  // Render custom resource dropdown for panels with multiple resources
  const renderResourceDropdown = (panelId: string) => {
    // Get all available entries (resources + smart entries) for this panel
    const availableEntries = getAvailableEntriesForPanel(panelId);
    const currentResourceId = panelResourceState[panelId];
    const isOpen = dropdownState[panelId] || false;

    // If only one entry, don't show dropdown
    if (availableEntries.length <= 1) return null;

    return (
      <div 
        className="flex items-center space-x-1" 
        ref={(el) => { dropdownRefs.current[panelId] = el; }}
      >
        {/* Previous Resource Button */}
        <button
          onClick={() => navigateToPrevResource(panelId)}
          className="flex items-center justify-center w-7 h-7 bg-white hover:bg-gray-50 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          title="Previous resource"
        >
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown(panelId)}
            className="flex items-center justify-center w-7 h-7 bg-white hover:bg-gray-50 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            title="Switch resource view"
          >
            <svg 
              className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Custom Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-64 max-w-80 z-30">
              {availableEntries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleResourceChange(panelId, entry.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors duration-150 ${
                    currentResourceId === entry.id 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xs">{entry.type === 'smart' ? '🏛️' : '📖'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">
                        {entry.title}
                      </div>
                      {entry.description && (
                        <div className="text-xs text-gray-500 mt-0.5 truncate">
                          {entry.description}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Next Resource Button */}
        <button
          onClick={() => navigateToNextResource(panelId)}
          className="flex items-center justify-center w-7 h-7 bg-white hover:bg-gray-50 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          title="Next resource"
        >
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  };

  if (!processedResourceConfig || !panelConfig) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading panel configuration...</p>
          <p className="text-xs text-gray-500 mt-2">
            Config: {processedResourceConfig ? '✓' : '✗'} | Panels: {panelConfig ? '✓' : '✗'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <LinkedPanelsContainer 
        config={panelConfig}
        plugins={plugins}
        persistence={persistenceOptions}
      >
        {/* Responsive Layout: Side-by-side on landscape, stacked on portrait */}
        <div className="h-full flex flex-col lg:flex-row gap-4">
          {PANEL_ASSIGNMENTS.map(panelAssignment => (
            <div key={panelAssignment.panelId} className="flex-1">
              <LinkedPanel id={panelAssignment.panelId}>
                {({ current, navigate }) => {
                  // Store the navigate function for this panel
                  navigateFunctions.current[panelAssignment.panelId] = navigate;
                  
                  // Track current resource ID for state synchronization
                  const currentResourceId = current.resource?.id;
                  if (currentResourceId) {
                    currentResourceIds.current[panelAssignment.panelId] = currentResourceId;
                  }
                  
                  return (
                  <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border">
                    
                    {/* Panel Header with Resource Navigation */}
                    <div className="flex-shrink-0 px-4 py-3 border-b bg-gray-50 rounded-t-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h2 className="text-lg font-semibold text-gray-900">
                            {/* Use actual resource metadata title, fallback to panel title */}
                            {current.resource?.title || panelAssignment.title}
                          </h2>
                          {/* Use actual resource metadata description, fallback to panel description */}
                          {(current.resource?.description || panelAssignment.description) && (
                            <div className="mt-1">
                              <p className="text-xs text-gray-500">
                                {current.resource?.description || panelAssignment.description}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Resource Selection Dropdown */}
                        {renderResourceDropdown(panelAssignment.panelId)}
                      </div>
                    </div>

                    {/* Panel Content */}
                    <div className="flex-1 overflow-y-auto">
                      {current.resource?.component ? (
                        (() => {
                          console.log(`🎭 Panel ${panelAssignment.panelId} rendering component:`, {
                            resourceId: current.resource?.id,
                            componentName: (current.resource?.component as any)?.name || 'Unknown',
                            component: current.resource?.component
                          });
                          return React.createElement(current.resource.component as unknown as React.ComponentType<any>, {
                            // Pass the panel resource ID (e.g., 'tn-notes', 'ult-scripture')
                            resourceId: current.resource.id,
                            loading: false,
                            error: undefined,
                            scripture: undefined, // Will be loaded by the component
                            currentChapter: 1
                          });
                        })()
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                          <div className="text-center">
                            <div className="text-gray-400 text-xl mb-2">📖</div>
                            <p>No resource selected</p>
                            <p className="text-sm mt-1">Panel: {panelAssignment.panelId}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                }}
              </LinkedPanel>
            </div>
          ))}
        </div>
      </LinkedPanelsContainer>
    </div>
  );
}

