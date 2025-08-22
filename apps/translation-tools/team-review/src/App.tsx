import { ResizablePanels } from './libs/resizable-panels';
import {
  LinkedPanelsContainer,
  LinkedPanel,
} from 'linked-panels';
import { createBibleTranslationPluginRegistry } from './plugins';

import { PanelUI } from './components/PanelUI';
import { useVerseData, useLinkedPanelsConfig } from './hooks';

export default function App() {
  // Create plugin registry with built-in and Bible translation plugins
  const pluginRegistry = createBibleTranslationPluginRegistry();

  // Get verse data using custom hook
  const { ultVerse, ustVerse, verseNotes, isLoading, error } = useVerseData({
    reference: '1:1'
  });

  // Generate configuration using custom hook
  const config = useLinkedPanelsConfig({
    ultVerse,
    ustVerse,
    verseNotes,
  });

  // Handle loading and error states
  if (isLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verse data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 p-0">
        <LinkedPanelsContainer 
          config={config}
          plugins={pluginRegistry}
          options={{
            enableDevtools: true,
            storeName: 'TeamReviewLinkedPanels',
          }}
        >
          <ResizablePanels
            topPanel={
              <LinkedPanel id="top">
                {(props) => {
                  console.log('🔝 Top panel props:', props);
                  const resourceInfo = props.getResourceInfo();
                  return (
                    <PanelUI
                      showButtons={true}
                      emptyMessage="No scripture texts available"
                      panelProps={props}
                      resourceInfo={resourceInfo}
                    />
                  );
                }}
              </LinkedPanel>
            }
            bottomPanel={
              <LinkedPanel id="bottom">
                {(props) => {
                  console.log('🔽 Bottom panel props:', props);
                  const resourceInfo = props.getResourceInfo();
                  return (
                    <PanelUI
                      showButtons={true}
                      emptyMessage="No study resources available"
                      panelProps={props}
                      resourceInfo={resourceInfo}
                    />
                  );
                }}
              </LinkedPanel>
            }
          />
        </LinkedPanelsContainer>
      </div>
      {/* Mobile app bar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 shadow-sm border-t-2">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">BT</span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-semibold text-gray-900 truncate">
                  Bible Translation Toolkit
                </h1>
                <p className="text-xs text-gray-500">Romans 1:1</p>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
