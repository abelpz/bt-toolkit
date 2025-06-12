import React, { useState } from 'react';
import { SignalAwareVerseDisplay } from './SignalAwareVerseDisplay';
import { useSignalEmitter, useSignalDebugger } from '../hooks/useSignaling';
import { SIGNAL_TYPES } from '../types/signaling';

export const SignalingDemo: React.FC = () => {
  const { emit } = useSignalEmitter();
  const { getStats, getHistory, clearHistory } = useSignalDebugger();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Demo actions
  const handleNavigateToVerse = async () => {
    await emit(
      SIGNAL_TYPES.NAVIGATE_TO_VERSE,
      { book: 'John', chapter: 3, verse: 16 },
      { panelId: 'demo-panel', resourceId: 'demo-controller' }
    );
  };

  const handleHighlightText = async () => {
    await emit(
      SIGNAL_TYPES.HIGHLIGHT_TEXT,
      {
        text: 'God created',
        startOffset: 0,
        endOffset: 11,
        highlightId: 'demo-highlight-1',
        color: '#ff9800'
      },
      { panelId: 'demo-panel', resourceId: 'demo-controller' }
    );
  };

  const handleFocusResource = async (resourceId: string) => {
    await emit(
      SIGNAL_TYPES.FOCUS_RESOURCE,
      {
        resourceId,
        scrollTo: true,
        highlight: true
      },
      { panelId: 'demo-panel', resourceId: 'demo-controller' },
      { resourceId }
    );
  };

  const handleClearHighlights = async () => {
    await emit(
      SIGNAL_TYPES.CLEAR_HIGHLIGHTS,
      {},
      { panelId: 'demo-panel', resourceId: 'demo-controller' }
    );
  };

  const handleShowDebugInfo = () => {
    const stats = getStats();
    const history = getHistory();
    setDebugInfo({ stats, history: history.slice(-5) }); // Show last 5 signals
  };

  return (
    <div className="signaling-demo p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Signaling System Demo</h1>
      
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Demo Controls</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={handleNavigateToVerse}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Navigate to John 3:16
          </button>
          
          <button
            onClick={handleHighlightText}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
          >
            Highlight "God created"
          </button>
          
          <button
            onClick={() => handleFocusResource('verse-display-1')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Focus Resource 1
          </button>
          
          <button
            onClick={() => handleFocusResource('verse-display-2')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Focus Resource 2
          </button>
          
          <button
            onClick={handleClearHighlights}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Clear Highlights
          </button>
          
          <button
            onClick={handleShowDebugInfo}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
          >
            Show Debug Info
          </button>
          
          <button
            onClick={clearHistory}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Clear History
          </button>
        </div>
      </div>

      {/* Demo Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="panel">
          <h3 className="text-lg font-semibold mb-4 text-blue-600">Top Panel</h3>
          <SignalAwareVerseDisplay
            panelId="top-panel"
            resourceId="verse-display-1"
            initialBook="Genesis"
            initialChapter={1}
            initialVerse={1}
            className="mb-4"
          />
        </div>
        
        <div className="panel">
          <h3 className="text-lg font-semibold mb-4 text-green-600">Bottom Panel</h3>
          <SignalAwareVerseDisplay
            panelId="bottom-panel"
            resourceId="verse-display-2"
            initialBook="Genesis"
            initialChapter={1}
            initialVerse={1}
            className="mb-4"
          />
        </div>
      </div>

      {/* Debug Information */}
      {debugInfo && (
        <div className="debug-info p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Debug Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">System Stats</h4>
              <pre className="text-sm bg-white p-3 rounded border overflow-auto">
                {JSON.stringify(debugInfo.stats, null, 2)}
              </pre>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Recent Signals (Last 5)</h4>
              <div className="space-y-2 max-h-64 overflow-auto">
                {debugInfo.history.map((signal: any, index: number) => (
                  <div key={signal.id} className="text-sm bg-white p-3 rounded border">
                    <div className="font-medium text-blue-600">{signal.type}</div>
                    <div className="text-gray-600">
                      From: {signal.source.panelId}/{signal.source.resourceId}
                    </div>
                    {signal.target && (
                      <div className="text-gray-600">
                        To: {signal.target.panelId || 'any'}/{signal.target.resourceId || 'any'}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(signal.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documentation */}
      <div className="documentation mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">How It Works</h3>
        
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-600">🔄 Signal Flow</h4>
            <p>Components can emit signals that other components listen for. The SignalBus routes signals based on targeting rules.</p>
          </div>
          
          <div>
            <h4 className="font-medium text-green-600">📡 Resource Communication</h4>
            <p>Each resource has a unique ID and can send/receive signals. Resources automatically register with the SignalBus.</p>
          </div>
          
          <div>
            <h4 className="font-medium text-orange-600">🎯 Targeting</h4>
            <p>Signals can be broadcast globally, targeted to specific panels, or sent to individual resources.</p>
          </div>
          
          <div>
            <h4 className="font-medium text-purple-600">🔍 Debugging</h4>
            <p>The system includes built-in debugging tools to track signal history and system statistics.</p>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded">
          <h4 className="font-medium mb-2">Try These Actions:</h4>
          <ul className="text-sm space-y-1">
            <li>• Click "Navigate to John 3:16" to see both displays update simultaneously</li>
            <li>• Use "Focus Resource" buttons to highlight specific components</li>
            <li>• Select text in either display and use the highlight buttons</li>
            <li>• Navigate using the Previous/Next buttons in each display</li>
            <li>• Check the debug info to see signal traffic</li>
          </ul>
        </div>
      </div>
    </div>
  );
}; 