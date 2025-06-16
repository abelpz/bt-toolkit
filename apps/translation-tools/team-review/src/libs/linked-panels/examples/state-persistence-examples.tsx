import React, { useEffect } from 'react';
import {
  LinkedPanelsContainer,
  LinkedPanel,
  createDefaultPluginRegistry,
  useResourceAPI,
  LinkedPanelsConfig,
  StatePersistenceOptions,
  createStatePersistence,
  loadLinkedPanelsState,
  saveLinkedPanelsState,
  clearLinkedPanelsState
} from '../index';

// Example 1: Basic State Persistence Setup
export function BasicStatePersistenceExample() {
  // Configure persistence options
  const persistenceOptions: StatePersistenceOptions = {
    storageKey: 'my-app-panels-state',
    persistMessages: true,
    persistNavigation: true,
    autoSave: true,
    autoSaveDebounce: 1000,
    stateTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  // Create basic config
  const config: LinkedPanelsConfig = {
    resources: [
      { id: 'scripture-1', component: <div>John 3:16</div>, title: 'John 3:16' },
      { id: 'scripture-2', component: <div>John 3:17</div>, title: 'John 3:17' },
      { id: 'notes-1', component: <div>Translation Notes for John 3:16</div>, title: 'Notes 3:16' },
      { id: 'notes-2', component: <div>Translation Notes for John 3:17</div>, title: 'Notes 3:17' },
    ],
    panels: {
      'scripture-panel': { resourceIds: ['scripture-1', 'scripture-2'] },
      'notes-panel': { resourceIds: ['notes-1', 'notes-2'] },
    }
  };

  const plugins = createDefaultPluginRegistry();

  return (
    <LinkedPanelsContainer 
      config={config} 
      plugins={plugins}
      persistence={persistenceOptions}
    >
      <div style={{ display: 'flex', gap: '20px' }}>
        <LinkedPanel id="scripture-panel">
          {({ current, navigate }) => (
            <div style={{ border: '1px solid #ccc', padding: '10px' }}>
              <h3>Scripture Panel</h3>
              <div>Resource: {current.resource?.title}</div>
              <div>Index: {current.index + 1} of {current.panel.totalResources}</div>
              <button onClick={navigate.previous} disabled={!current.panel.canGoPrevious}>
                Previous
              </button>
              <button onClick={navigate.next} disabled={!current.panel.canGoNext}>
                Next
              </button>
              <div>{current.resource?.component}</div>
            </div>
          )}
        </LinkedPanel>
        
        <LinkedPanel id="notes-panel">
          {({ current, navigate }) => (
            <div style={{ border: '1px solid #ccc', padding: '10px' }}>
              <h3>Notes Panel</h3>
              <div>Resource: {current.resource?.title}</div>
              <div>Index: {current.index + 1} of {current.panel.totalResources}</div>
              <button onClick={navigate.previous} disabled={!current.panel.canGoPrevious}>
                Previous
              </button>
              <button onClick={navigate.next} disabled={!current.panel.canGoNext}>
                Next
              </button>
              <div>{current.resource?.component}</div>
            </div>
          )}
        </LinkedPanel>
      </div>
    </LinkedPanelsContainer>
  );
}

// Example 2: Initial Resource Display Configuration
export function InitialResourceDisplayExample() {
  const config: LinkedPanelsConfig = {
    resources: [
      { id: 'chapter-1', component: <div>Chapter 1</div>, title: 'Chapter 1' },
      { id: 'chapter-2', component: <div>Chapter 2</div>, title: 'Chapter 2' },
      { id: 'chapter-3', component: <div>Chapter 3</div>, title: 'Chapter 3' },
      { id: 'notes-1', component: <div>Notes 1</div>, title: 'Notes 1' },
      { id: 'notes-2', component: <div>Notes 2</div>, title: 'Notes 2' },
      { id: 'notes-3', component: <div>Notes 3</div>, title: 'Notes 3' },
    ],
    panels: {
      // Method 1: Use initialResourceId (resource order remains unchanged)
      'main-panel': { 
        resourceIds: ['chapter-1', 'chapter-2', 'chapter-3'],
        initialResourceId: 'chapter-2' // Will show Chapter 2 initially
      },
      
      // Method 2: Use initialIndex (resource order remains unchanged)
      'sidebar-panel': { 
        resourceIds: ['notes-1', 'notes-2', 'notes-3'],
        initialIndex: 2 // Will show Notes 3 initially (0-based index)
      },
    },
    
    // Method 3: Use global initialState (overrides panel-specific settings)
    initialState: {
      panelNavigation: {
        'main-panel': { currentIndex: 0 }, // Override to show Chapter 1
        // sidebar-panel will use its initialIndex: 2
      }
    }
  };

  return (
    <LinkedPanelsContainer config={config}>
      <div style={{ display: 'flex', gap: '20px' }}>
        <LinkedPanel id="main-panel">
          {({ current, navigate }) => (
            <div style={{ border: '1px solid #blue', padding: '10px' }}>
              <h3>Main Panel</h3>
              <p>Initially shows: Chapter 1 (due to initialState override)</p>
              <div>Current: {current.resource?.title}</div>
              <button onClick={navigate.previous} disabled={!current.panel.canGoPrevious}>
                Previous
              </button>
              <button onClick={navigate.next} disabled={!current.panel.canGoNext}>
                Next
              </button>
            </div>
          )}
        </LinkedPanel>
        
        <LinkedPanel id="sidebar-panel">
          {({ current, navigate }) => (
            <div style={{ border: '1px solid #green', padding: '10px' }}>
              <h3>Sidebar Panel</h3>
              <p>Initially shows: Notes 3 (due to initialIndex: 2)</p>
              <div>Current: {current.resource?.title}</div>
              <button onClick={navigate.previous} disabled={!current.panel.canGoPrevious}>
                Previous
              </button>
              <button onClick={navigate.next} disabled={!current.panel.canGoNext}>
                Next
              </button>
            </div>
          )}
        </LinkedPanel>
      </div>
    </LinkedPanelsContainer>
  );
}

// Example 3: Manual State Persistence with React Component
export function ManualStatePersistenceExample() {
  const config: LinkedPanelsConfig = {
    resources: [
      { id: 'doc-1', component: <div>Document 1</div>, title: 'Document 1' },
      { id: 'doc-2', component: <div>Document 2</div>, title: 'Document 2' },
      { id: 'doc-3', component: <div>Document 3</div>, title: 'Document 3' },
    ],
    panels: {
      'document-panel': { resourceIds: ['doc-1', 'doc-2', 'doc-3'] },
    }
  };

  return (
    <LinkedPanelsContainer config={config}>
      <div>
        <StateControlButtons />
        <LinkedPanel id="document-panel">
          {({ current, navigate }) => (
            <div style={{ border: '1px solid #purple', padding: '10px', marginTop: '10px' }}>
              <h3>Document Panel</h3>
              <div>Current: {current.resource?.title}</div>
              <button onClick={navigate.previous} disabled={!current.panel.canGoPrevious}>
                Previous
              </button>
              <button onClick={navigate.next} disabled={!current.panel.canGoNext}>
                Next
              </button>
              <div style={{ marginTop: '10px' }}>
                {current.resource?.component}
              </div>
            </div>
          )}
        </LinkedPanel>
      </div>
    </LinkedPanelsContainer>
  );
}

// Helper component for manual state control
function StateControlButtons() {
  const api = useResourceAPI('doc-1'); // Use any resource to access the store

  const handleSaveState = () => {
    const success = api.system.getStorageInfo(); // This uses the store's methods
    console.log('Storage info:', success);
    
    // Or use the utility functions directly
    // saveLinkedPanelsState(panelNavigation, resourceMessages);
  };

  const handleLoadState = () => {
    const state = loadLinkedPanelsState();
    console.log('Loaded state:', state);
  };

  const handleClearState = () => {
    clearLinkedPanelsState();
    console.log('State cleared');
  };

  return (
    <div style={{ padding: '10px', backgroundColor: '#f5f5f5' }}>
      <h4>Manual State Control</h4>
      <button onClick={handleSaveState} style={{ marginRight: '10px' }}>
        Save State
      </button>
      <button onClick={handleLoadState} style={{ marginRight: '10px' }}>
        Load State
      </button>
      <button onClick={handleClearState}>
        Clear State
      </button>
    </div>
  );
}

// Example 4: Advanced Persistence with Custom Message Filtering
export function AdvancedPersistenceExample() {
  const customPersistenceOptions: StatePersistenceOptions = {
    storageKey: 'advanced-app-state',
    persistMessages: true,
    persistNavigation: true,
    autoSave: true,
    autoSaveDebounce: 2000,
    stateTTL: 24 * 60 * 60 * 1000, // 24 hours
    
    // Custom message filter - only persist important messages
    messageFilter: (message) => {
      const lifecycle = message.content?.lifecycle || 'event';
      
      // Always persist state messages
      if (lifecycle === 'state') return true;
      
      // Only persist events from the last hour that are marked as important
      const ageInMs = Date.now() - message.timestamp;
      const oneHour = 60 * 60 * 1000;
      
      if (lifecycle === 'event' && ageInMs < oneHour) {
        // Check if message is marked as important
        return (message.content as any).important === true;
      }
      
      return false;
    }
  };

  const config: LinkedPanelsConfig = {
    resources: [
      { id: 'task-1', component: <TaskComponent taskId="1" />, title: 'Task 1' },
      { id: 'task-2', component: <TaskComponent taskId="2" />, title: 'Task 2' },
      { id: 'task-3', component: <TaskComponent taskId="3" />, title: 'Task 3' },
    ],
    panels: {
      'task-panel': { 
        resourceIds: ['task-1', 'task-2', 'task-3'],
        initialResourceId: 'task-2'
      },
    }
  };

  return (
    <LinkedPanelsContainer 
      config={config} 
      persistence={customPersistenceOptions}
    >
      <LinkedPanel id="task-panel">
        {({ current, navigate }) => (
          <div style={{ border: '1px solid #orange', padding: '10px' }}>
            <h3>Task Panel (Advanced Persistence)</h3>
            <div>Current: {current.resource?.title}</div>
            <button onClick={navigate.previous} disabled={!current.panel.canGoPrevious}>
              Previous
            </button>
            <button onClick={navigate.next} disabled={!current.panel.canGoNext}>
              Next
            </button>
            <div style={{ marginTop: '10px' }}>
              {current.resource?.component}
            </div>
          </div>
        )}
      </LinkedPanel>
    </LinkedPanelsContainer>
  );
}

// Sample task component that sends messages
function TaskComponent({ taskId }: { taskId: string }) {
  const api = useResourceAPI<{ 
    type: 'task-update'; 
    lifecycle: 'state' | 'event'; 
    important?: boolean; 
    status: string; 
  }>(`task-${taskId}`);

  const sendImportantMessage = () => {
    api.messaging.sendToAll({
      type: 'task-update',
      lifecycle: 'event',
      important: true, // This will be persisted due to custom filter
      status: `Task ${taskId} marked as important`
    });
  };

  const sendRegularMessage = () => {
    api.messaging.sendToAll({
      type: 'task-update',
      lifecycle: 'event',
      important: false, // This won't be persisted
      status: `Task ${taskId} regular update`
    });
  };

  return (
    <div>
      <h4>Task {taskId}</h4>
      <button onClick={sendImportantMessage} style={{ marginRight: '10px' }}>
        Send Important Message
      </button>
      <button onClick={sendRegularMessage}>
        Send Regular Message
      </button>
    </div>
  );
}

// Example 5: Restoring State from Previous Session
export function StateRestorationExample() {
  const [restoredFromStorage, setRestoredFromStorage] = React.useState(false);

  // Check if we have saved state on component mount
  useEffect(() => {
    const savedState = loadLinkedPanelsState({ storageKey: 'restoration-example' });
    if (savedState) {
      console.log('Found saved state from:', new Date(savedState.savedAt));
      setRestoredFromStorage(true);
    }
  }, []);

  const config: LinkedPanelsConfig = {
    resources: [
      { id: 'page-1', component: <div>Page 1 Content</div>, title: 'Page 1' },
      { id: 'page-2', component: <div>Page 2 Content</div>, title: 'Page 2' },
      { id: 'page-3', component: <div>Page 3 Content</div>, title: 'Page 3' },
    ],
    panels: {
      'reader-panel': { 
        resourceIds: ['page-1', 'page-2', 'page-3'],
        // If no saved state, start with page 2
        initialResourceId: 'page-2'
      },
    }
  };

  const persistenceOptions: StatePersistenceOptions = {
    storageKey: 'restoration-example',
    autoSave: true,
  };

  return (
    <div>
      {restoredFromStorage && (
        <div style={{ padding: '10px', backgroundColor: '#e6ffe6', marginBottom: '10px' }}>
          ✅ State restored from previous session!
        </div>
      )}
      
      <LinkedPanelsContainer 
        config={config} 
        persistence={persistenceOptions}
      >
        <LinkedPanel id="reader-panel">
          {({ current, navigate }) => (
            <div style={{ border: '1px solid #teal', padding: '10px' }}>
              <h3>Reader Panel</h3>
              <p>Navigate and close/reopen the app to test state persistence</p>
              <div>Current: {current.resource?.title}</div>
              <button onClick={navigate.previous} disabled={!current.panel.canGoPrevious}>
                Previous
              </button>
              <button onClick={navigate.next} disabled={!current.panel.canGoNext}>
                Next
              </button>
              <div style={{ marginTop: '10px' }}>
                {current.resource?.component}
              </div>
            </div>
          )}
        </LinkedPanel>
      </LinkedPanelsContainer>
    </div>
  );
} 