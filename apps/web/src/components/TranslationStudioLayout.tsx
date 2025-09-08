/**
 * Translation Studio Layout - Iteration 2
 * Two-panel layout using real linked-panels with multiple scripture resources
 */

import React, { useState, useEffect } from 'react';
import { LinkedPanelsContainer, LinkedPanel } from 'linked-panels';
import { LoadingState } from './LoadingState';
import { CompactHeader } from './CompactHeader';
import { ErrorBoundary } from './ErrorBoundary';
import { useNavigation } from '../contexts/NavigationContext';
import { useLinkedPanelsConfig } from '../hooks/useLinkedPanelsConfig';
import { useDoor43 } from '../contexts/Door43Context';
import { NavigationMode, RangeReference } from '../types/navigation';
import { getDataManager, getInitialAppState, resetDataManager } from '../services/data-manager';

export const TranslationStudioLayout: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { navigationState, navigateToRange } = useNavigation();
  const { config } = useDoor43();

  // Get linked panels configuration with multiple resources (must be called before any conditional returns)
  const panelsConfig = useLinkedPanelsConfig({
    currentRange: navigationState.currentRange
  });

  // Smart initialization with priority-based data fetching
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing Translation Studio Web with SmartDataManager...');
        
        // Get initial app state from URL and localStorage
        const initialState = getInitialAppState();
        console.log('📍 Initial app state:', initialState);
        
        // Initialize data manager with Door43 config
        const dataManager = getDataManager({
          organization: config.organization,
          language: config.language
        });
        
        // Start priority-based fetching
        await dataManager.initialize(initialState);
        
        setIsInitialized(true);
        setInitError(null);
        
        console.log('🎉 Translation Studio Web initialized with smart data fetching!');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown initialization error';
        console.error('❌ Initialization failed:', errorMessage);
        setInitError(errorMessage);
        setIsInitialized(true); // Still show the app, but with error state
      }
    };

    initializeApp();
  }, [config.organization, config.language]);

  // Update data manager when navigation changes (only after initialization)
  useEffect(() => {
    if (isInitialized) {
      // Add a small delay to ensure data manager is fully ready
      const timer = setTimeout(() => {
        try {
          const dataManager = getDataManager();
          
          // Get current panel states from localStorage
          const panelStateJson = localStorage.getItem('translation-studio-panels-state');
          let currentPanelStates = {
            'scripture-panel': {
              id: 'scripture-panel',
              currentResourceId: 'ult-scripture',
              resourceIds: ['ult-scripture', 'ust-scripture']
            },
            'notes-panel': {
              id: 'notes-panel',
              currentResourceId: 'translation-notes',
              resourceIds: ['ust-scripture', 'translation-notes']
            }
          };

          if (panelStateJson) {
            try {
              const cachedState = JSON.parse(panelStateJson);
              if (cachedState?.panels) {
                currentPanelStates = {
                  'scripture-panel': {
                    ...currentPanelStates['scripture-panel'],
                    currentResourceId: cachedState.panels['scripture-panel']?.currentResourceId || 'ult-scripture'
                  },
                  'notes-panel': {
                    ...currentPanelStates['notes-panel'],
                    currentResourceId: cachedState.panels['notes-panel']?.currentResourceId || 'translation-notes'
                  }
                };
              }
            } catch (error) {
              console.warn('Failed to parse cached panel state for navigation update:', error);
            }
          }

          dataManager.updateNavigation(navigationState.currentRange, currentPanelStates);
        } catch (error) {
          console.warn('Failed to update data manager navigation:', error);
        }
      }, 50); // Small delay to ensure initialization is complete

      return () => clearTimeout(timer);
    }
  }, [navigationState.currentRange, isInitialized]);

  // Reset data manager when config changes
  useEffect(() => {
    resetDataManager();
  }, [config.organization, config.language]);

  // Show loading state during initialization
  if (!isInitialized) {
    return <LoadingState message="Initializing Translation Studio Web..." />;
  }

  // Show error state if initialization failed
  if (initError) {
    return (
      <div className="text-center py-12">
        <div className="
          bg-red-50 dark:bg-red-900/20 
          border border-red-200 dark:border-red-800/50 
          rounded-xl p-6 max-w-md mx-auto shadow-lg
        ">
          <div className="text-red-600 dark:text-red-400 text-lg font-semibold mb-2">
            <span role="img" aria-label="Warning">⚠️</span> Initialization Error
          </div>
          <div className="text-red-700 dark:text-red-300 text-sm mb-4">
            {initError}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="
              bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600
              text-white px-4 py-2 rounded-lg text-sm font-medium 
              transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500
            "
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Configure linked panels for two-panel layout
  const handleNavigationChange = (range: RangeReference, mode: NavigationMode) => {
    navigateToRange(range, mode);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <CompactHeader onNavigationChange={handleNavigationChange} />

      {/* Main Panels Layout - Takes remaining height */}
      <div className="
        flex-1 overflow-hidden
        bg-gradient-to-br from-gray-50 to-gray-100 
        dark:from-gray-800 dark:to-gray-900
      ">
        <LinkedPanelsContainer 
          config={panelsConfig}
          options={{
            enableDevtools: true,
            storeName: 'TranslationStudioLinkedPanels',
          }}
          persistence={{
            storageKey: 'translation-studio-panels-state',
            persistNavigation: true,
            persistMessages: false,
            autoSaveDebounce: 500,
          }}
        >
          {/* Responsive Grid Layout: 
              - Mobile (< md): Vertical stack, small gap
              - Tablet (md to lg): Vertical stack, larger gap  
              - Desktop (>= lg): Horizontal side-by-side
              - Wide Desktop (>= xl): Horizontal with more spacing
          */}
          <div className="
            grid h-full gap-1 md:gap-2 lg:gap-3 xl:gap-4
            p-1 md:p-2 lg:p-3 xl:p-4
            grid-rows-2 lg:grid-rows-1 lg:grid-cols-2
          ">
            {/* Scripture Panel - Responsive positioning with multiple resources */}
            <div className="
              bg-white dark:bg-gray-800 
              rounded-lg shadow-sm border border-gray-200/50 dark:border-gray-700/50
              overflow-hidden
              transition-all duration-300 ease-in-out
            ">
              <LinkedPanel id="scripture-panel">
                {(props) => {
                  const { current, navigate } = props;
                  const resourceInfo = current.resource ? {
                    title: current.resource.title,
                    description: current.resource.description,
                    icon: '📖',
                    category: current.resource.category
                  } : null;

                  return (
                    <div className="h-full flex flex-col">
                      {/* Panel Header with Resource Switcher */}
                      <div className="
                        flex items-center justify-between p-3 
                        bg-gray-50 dark:bg-gray-700/50 
                        border-b border-gray-200/50 dark:border-gray-600/50
                      ">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{resourceInfo?.icon || '📖'}</span>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {resourceInfo?.title || 'Scripture'}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {resourceInfo?.description || 'Scripture text'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Resource Navigation Controls */}
                        <div className="flex items-center space-x-2">
                          {/* Previous Button */}
                          <button
                            onClick={navigate.previous}
                            disabled={!current.panel.canGoPrevious}
                            className={`
                              p-1.5 rounded-md transition-colors
                              ${current.panel.canGoPrevious
                                ? 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                              }
                            `}
                            title="Previous Resource"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>

                          {/* Resource Dropdown */}
                          <div className="relative">
                            <select
                              value={current.resource?.id || ''}
                              onChange={(e) => {
                                const resourceIndex = panelsConfig.panels['scripture-panel'].resourceIds.indexOf(e.target.value);
                                if (resourceIndex !== -1) {
                                  navigate.toIndex(resourceIndex);
                                }
                              }}
                              className="
                                appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
                                rounded-md px-3 py-1 pr-8 text-sm
                                text-gray-700 dark:text-gray-300
                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                              "
                            >
                              {panelsConfig.panels['scripture-panel'].resourceIds.map((resourceId) => {
                                const resource = panelsConfig.resources.find(r => r.id === resourceId);
                                return (
                                  <option key={resourceId} value={resourceId}>
                                    {resource?.icon} {resource?.title?.split(' - ')[0] || resourceId}
                                  </option>
                                );
                              })}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {/* Next Button */}
                          <button
                            onClick={navigate.next}
                            disabled={!current.panel.canGoNext}
                            className={`
                              p-1.5 rounded-md transition-colors
                              ${current.panel.canGoNext
                                ? 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                              }
                            `}
                            title="Next Resource"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Panel Content */}
                      <div className="flex-1 overflow-hidden">
                        <ErrorBoundary
                          fallback={
                            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                              <div className="text-center">
                                <div className="text-4xl mb-4">⚠️</div>
                                <div className="text-lg font-medium">Scripture Panel Error</div>
                                <div className="text-sm">Failed to render scripture content</div>
                              </div>
                            </div>
                          }
                        >
                          {current.resource?.component as React.ReactNode}
                        </ErrorBoundary>
                      </div>
                    </div>
                  );
                }}
              </LinkedPanel>
            </div>

            {/* Translation Notes Panel - Responsive positioning */}
            <div className="
              bg-white dark:bg-gray-800 
              rounded-lg shadow-sm border border-gray-200/50 dark:border-gray-700/50
              overflow-hidden
              transition-all duration-300 ease-in-out
            ">
              <LinkedPanel id="notes-panel">
                {(props) => {
                  const { current, navigate } = props;
                  const resourceInfo = current.resource ? {
                    title: current.resource.title,
                    description: current.resource.description,
                    icon: current.resource.icon || '📝',
                    category: current.resource.category
                  } : null;

                  return (
                    <div className="h-full flex flex-col">
                      {/* Panel Header with Resource Navigation */}
                      <div className="
                        flex items-center justify-between p-3 
                        bg-gray-50 dark:bg-gray-700/50 
                        border-b border-gray-200/50 dark:border-gray-600/50
                      ">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{resourceInfo?.icon || '📝'}</span>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {resourceInfo?.title || 'Notes'}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {resourceInfo?.description || 'Translation guidance'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Resource Navigation Controls */}
                        <div className="flex items-center space-x-2">
                          {/* Previous Button */}
                          <button
                            onClick={navigate.previous}
                            disabled={!current.panel.canGoPrevious}
                            className={`
                              p-1.5 rounded-md transition-colors
                              ${current.panel.canGoPrevious
                                ? 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                              }
                            `}
                            title="Previous Resource"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>

                          {/* Resource Dropdown */}
                          <div className="relative">
                            <select
                              value={current.resource?.id || ''}
                              onChange={(e) => {
                                const resourceIndex = panelsConfig.panels['notes-panel'].resourceIds.indexOf(e.target.value);
                                if (resourceIndex !== -1) {
                                  navigate.toIndex(resourceIndex);
                                }
                              }}
                              className="
                                appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
                                rounded-md px-3 py-1 pr-8 text-sm
                                text-gray-700 dark:text-gray-300
                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                              "
                            >
                              {panelsConfig.panels['notes-panel'].resourceIds.map((resourceId) => {
                                const resource = panelsConfig.resources.find(r => r.id === resourceId);
                                return (
                                  <option key={resourceId} value={resourceId}>
                                    {resource?.icon} {resource?.title?.split(' - ')[0] || resourceId}
                                  </option>
                                );
                              })}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {/* Next Button */}
                          <button
                            onClick={navigate.next}
                            disabled={!current.panel.canGoNext}
                            className={`
                              p-1.5 rounded-md transition-colors
                              ${current.panel.canGoNext
                                ? 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                              }
                            `}
                            title="Next Resource"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Panel Content */}
                      <div className="flex-1 overflow-hidden">
                        <ErrorBoundary
                          fallback={
                            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                              <div className="text-center">
                                <div className="text-4xl mb-4">⚠️</div>
                                <div className="text-lg font-medium">Notes Panel Error</div>
                                <div className="text-sm">Failed to render notes content</div>
                              </div>
                            </div>
                          }
                        >
                          {current.resource?.component as React.ReactNode}
                        </ErrorBoundary>
                      </div>
                    </div>
                  );
                }}
              </LinkedPanel>
            </div>
          </div>
        </LinkedPanelsContainer>
      </div>
    </div>
  );
};

export default TranslationStudioLayout;
