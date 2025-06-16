import React from 'react';
import {
  LinkedPanelsContainer,
  LinkedPanel,
  createDefaultPluginRegistry,
  LinkedPanelsConfig,
  StatePersistenceOptions,
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
  IndexedDBAdapter,
  HTTPStorageAdapter,
  AsyncStorageAdapter,
  PersistenceStorageAdapter,
} from '../index';

// Example 1: Using localStorage (default)
export function LocalStorageExample() {
  const config: LinkedPanelsConfig = {
    resources: [
      { id: 'doc1', component: <div>Document 1</div>, title: 'Document 1' },
      { id: 'doc2', component: <div>Document 2</div>, title: 'Document 2' },
    ],
    panels: {
      'main': { resourceIds: ['doc1', 'doc2'] }
    }
  };

  const persistenceOptions: StatePersistenceOptions = {
    storageKey: 'localStorage-example',
    storageAdapter: new LocalStorageAdapter(), // Explicit localStorage
    autoSave: true,
  };

  return (
    <LinkedPanelsContainer 
      config={config} 
      persistence={persistenceOptions}
    >
      <LinkedPanel id="main">
        {({ current, navigate }) => (
          <div style={{ border: '1px solid blue', padding: '10px' }}>
            <h3>localStorage Example</h3>
            <p>Data persists across browser sessions</p>
            <div>Current: {current.resource?.title}</div>
            <button onClick={navigate.next}>Next</button>
          </div>
        )}
      </LinkedPanel>
    </LinkedPanelsContainer>
  );
}

// Example 2: Using sessionStorage
export function SessionStorageExample() {
  const config: LinkedPanelsConfig = {
    resources: [
      { id: 'temp1', component: <div>Temp 1</div>, title: 'Temp 1' },
      { id: 'temp2', component: <div>Temp 2</div>, title: 'Temp 2' },
    ],
    panels: {
      'session': { resourceIds: ['temp1', 'temp2'] }
    }
  };

  const persistenceOptions: StatePersistenceOptions = {
    storageKey: 'sessionStorage-example',
    storageAdapter: new SessionStorageAdapter(), // Session only
    autoSave: true,
  };

  return (
    <LinkedPanelsContainer 
      config={config} 
      persistence={persistenceOptions}
    >
      <LinkedPanel id="session">
        {({ current, navigate }) => (
          <div style={{ border: '1px solid green', padding: '10px' }}>
            <h3>sessionStorage Example</h3>
            <p>Data only persists for this browser tab/session</p>
            <div>Current: {current.resource?.title}</div>
            <button onClick={navigate.next}>Next</button>
          </div>
        )}
      </LinkedPanel>
    </LinkedPanelsContainer>
  );
}

// Example 3: Using memory storage (no persistence)
export function MemoryStorageExample() {
  const config: LinkedPanelsConfig = {
    resources: [
      { id: 'mem1', component: <div>Memory 1</div>, title: 'Memory 1' },
      { id: 'mem2', component: <div>Memory 2</div>, title: 'Memory 2' },
    ],
    panels: {
      'memory': { resourceIds: ['mem1', 'mem2'] }
    }
  };

  const persistenceOptions: StatePersistenceOptions = {
    storageKey: 'memory-example',
    storageAdapter: new MemoryStorageAdapter(), // No persistence
    autoSave: true,
  };

  return (
    <LinkedPanelsContainer 
      config={config} 
      persistence={persistenceOptions}
    >
      <LinkedPanel id="memory">
        {({ current, navigate }) => (
          <div style={{ border: '1px solid orange', padding: '10px' }}>
            <h3>Memory Storage Example</h3>
            <p>Data is lost on page refresh</p>
            <div>Current: {current.resource?.title}</div>
            <button onClick={navigate.next}>Next</button>
          </div>
        )}
      </LinkedPanel>
    </LinkedPanelsContainer>
  );
}

// Example 4: Using IndexedDB for larger data
export function IndexedDBExample() {
  const config: LinkedPanelsConfig = {
    resources: [
      { id: 'large1', component: <div>Large Dataset 1</div>, title: 'Large Dataset 1' },
      { id: 'large2', component: <div>Large Dataset 2</div>, title: 'Large Dataset 2' },
    ],
    panels: {
      'indexed': { resourceIds: ['large1', 'large2'] }
    }
  };

  const persistenceOptions: StatePersistenceOptions = {
    storageKey: 'indexeddb-example',
    storageAdapter: new IndexedDBAdapter({
      dbName: 'LinkedPanelsApp',
      storeName: 'panelStates',
      version: 1
    }),
    autoSave: true,
  };

  return (
    <LinkedPanelsContainer 
      config={config} 
      persistence={persistenceOptions}
    >
      <LinkedPanel id="indexed">
        {({ current, navigate }) => (
          <div style={{ border: '1px solid purple', padding: '10px' }}>
            <h3>IndexedDB Example</h3>
            <p>Robust storage for large amounts of data</p>
            <div>Current: {current.resource?.title}</div>
            <button onClick={navigate.next}>Next</button>
          </div>
        )}
      </LinkedPanel>
    </LinkedPanelsContainer>
  );
}

// Example 5: Using HTTP API for server-side storage
export function HTTPStorageExample() {
  const config: LinkedPanelsConfig = {
    resources: [
      { id: 'server1', component: <div>Server Doc 1</div>, title: 'Server Doc 1' },
      { id: 'server2', component: <div>Server Doc 2</div>, title: 'Server Doc 2' },
    ],
    panels: {
      'server': { resourceIds: ['server1', 'server2'] }
    }
  };

  const persistenceOptions: StatePersistenceOptions = {
    storageKey: 'user-123-session',
    storageAdapter: new HTTPStorageAdapter({
      baseUrl: 'https://api.example.com',
      headers: {
        'Authorization': 'Bearer your-token-here',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }),
    autoSave: true,
    autoSaveDebounce: 2000, // Longer debounce for network calls
  };

  return (
    <LinkedPanelsContainer 
      config={config} 
      persistence={persistenceOptions}
    >
      <LinkedPanel id="server">
        {({ current, navigate }) => (
          <div style={{ border: '1px solid red', padding: '10px' }}>
            <h3>HTTP Storage Example</h3>
            <p>Data is saved to your server backend</p>
            <div>Current: {current.resource?.title}</div>
            <button onClick={navigate.next}>Next</button>
          </div>
        )}
      </LinkedPanel>
    </LinkedPanelsContainer>
  );
}

// Example 6: React Native AsyncStorage
export function ReactNativeExample() {
  // This would be imported from '@react-native-async-storage/async-storage'
  const mockAsyncStorage = {
    async getItem(key: string): Promise<string | null> {
      // Mock implementation - replace with real AsyncStorage
      return null;
    },
    async setItem(key: string, value: string): Promise<void> {
      // Mock implementation
    },
    async removeItem(key: string): Promise<void> {
      // Mock implementation
    }
  };

  const config: LinkedPanelsConfig = {
    resources: [
      { id: 'mobile1', component: <div>Mobile Screen 1</div>, title: 'Mobile Screen 1' },
      { id: 'mobile2', component: <div>Mobile Screen 2</div>, title: 'Mobile Screen 2' },
    ],
    panels: {
      'mobile': { resourceIds: ['mobile1', 'mobile2'] }
    }
  };

  const persistenceOptions: StatePersistenceOptions = {
    storageKey: 'react-native-example',
    storageAdapter: new AsyncStorageAdapter(mockAsyncStorage),
    autoSave: true,
  };

  return (
    <LinkedPanelsContainer 
      config={config} 
      persistence={persistenceOptions}
    >
      <LinkedPanel id="mobile">
        {({ current, navigate }) => (
          <div style={{ border: '1px solid teal', padding: '10px' }}>
            <h3>React Native AsyncStorage Example</h3>
            <p>Perfect for mobile applications</p>
            <div>Current: {current.resource?.title}</div>
            <button onClick={navigate.next}>Next</button>
          </div>
        )}
      </LinkedPanel>
    </LinkedPanelsContainer>
  );
}

// Example 7: Custom storage adapter
class CustomDatabaseAdapter implements PersistenceStorageAdapter {
  constructor(private database: any) {}

  async isAvailable(): Promise<boolean> {
    try {
      await this.database.ping();
      return true;
    } catch {
      return false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const result = await this.database.query(
        'SELECT data FROM panel_states WHERE key = ?',
        [key]
      );
      return result.rows[0]?.data || null;
    } catch (error) {
      console.warn('CustomDatabaseAdapter: Failed to get item', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.database.query(
        'INSERT OR REPLACE INTO panel_states (key, data, updated_at) VALUES (?, ?, ?)',
        [key, value, new Date().toISOString()]
      );
    } catch (error) {
      console.warn('CustomDatabaseAdapter: Failed to set item', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.database.query(
        'DELETE FROM panel_states WHERE key = ?',
        [key]
      );
    } catch (error) {
      console.warn('CustomDatabaseAdapter: Failed to remove item', error);
    }
  }
}

export function CustomStorageExample() {
  // Mock database - replace with your actual database connection
  const mockDatabase = {
    async ping() { return true; },
    async query(sql: string, params: any[]) {
      return { rows: [] };
    }
  };

  const config: LinkedPanelsConfig = {
    resources: [
      { id: 'db1', component: <div>Database Record 1</div>, title: 'Database Record 1' },
      { id: 'db2', component: <div>Database Record 2</div>, title: 'Database Record 2' },
    ],
    panels: {
      'database': { resourceIds: ['db1', 'db2'] }
    }
  };

  const persistenceOptions: StatePersistenceOptions = {
    storageKey: 'custom-db-example',
    storageAdapter: new CustomDatabaseAdapter(mockDatabase),
    autoSave: true,
  };

  return (
    <LinkedPanelsContainer 
      config={config} 
      persistence={persistenceOptions}
    >
      <LinkedPanel id="database">
        {({ current, navigate }) => (
          <div style={{ border: '1px solid brown', padding: '10px' }}>
            <h3>Custom Database Storage Example</h3>
            <p>Using your own database as storage backend</p>
            <div>Current: {current.resource?.title}</div>
            <button onClick={navigate.next}>Next</button>
          </div>
        )}
      </LinkedPanel>
    </LinkedPanelsContainer>
  );
}

// Example 8: Fallback storage with multiple adapters
export function FallbackStorageExample() {
  // Create a custom adapter that tries multiple storage backends
  class FallbackStorageAdapter implements PersistenceStorageAdapter {
    private adapters: PersistenceStorageAdapter[];
    private activeAdapter: PersistenceStorageAdapter | null = null;

    constructor(adapters: PersistenceStorageAdapter[]) {
      this.adapters = adapters;
    }

    async isAvailable(): Promise<boolean> {
      for (const adapter of this.adapters) {
        const available = await adapter.isAvailable();
        if (available) {
          this.activeAdapter = adapter;
          return true;
        }
      }
      return false;
    }

    async getItem(key: string): Promise<string | null> {
      if (!this.activeAdapter) {
        await this.findActiveAdapter();
      }
      return this.activeAdapter?.getItem(key) || null;
    }

    async setItem(key: string, value: string): Promise<void> {
      if (!this.activeAdapter) {
        await this.findActiveAdapter();
      }
      await this.activeAdapter?.setItem(key, value);
    }

    async removeItem(key: string): Promise<void> {
      if (!this.activeAdapter) {
        await this.findActiveAdapter();
      }
      await this.activeAdapter?.removeItem(key);
    }

    private async findActiveAdapter(): Promise<void> {
      for (const adapter of this.adapters) {
        const available = await adapter.isAvailable();
        if (available) {
          this.activeAdapter = adapter;
          break;
        }
      }
    }
  }

  const config: LinkedPanelsConfig = {
    resources: [
      { id: 'fallback1', component: <div>Fallback 1</div>, title: 'Fallback 1' },
      { id: 'fallback2', component: <div>Fallback 2</div>, title: 'Fallback 2' },
    ],
    panels: {
      'fallback': { resourceIds: ['fallback1', 'fallback2'] }
    }
  };

  const persistenceOptions: StatePersistenceOptions = {
    storageKey: 'fallback-example',
    storageAdapter: new FallbackStorageAdapter([
      new IndexedDBAdapter(), // Try IndexedDB first
      new LocalStorageAdapter(), // Fall back to localStorage
      new SessionStorageAdapter(), // Fall back to sessionStorage
      new MemoryStorageAdapter() // Final fallback
    ]),
    autoSave: true,
  };

  return (
    <LinkedPanelsContainer 
      config={config} 
      persistence={persistenceOptions}
    >
      <LinkedPanel id="fallback">
        {({ current, navigate }) => (
          <div style={{ border: '1px solid gray', padding: '10px' }}>
            <h3>Fallback Storage Example</h3>
            <p>Automatically chooses best available storage</p>
            <div>Current: {current.resource?.title}</div>
            <button onClick={navigate.next}>Next</button>
          </div>
        )}
      </LinkedPanel>
    </LinkedPanelsContainer>
  );
} 