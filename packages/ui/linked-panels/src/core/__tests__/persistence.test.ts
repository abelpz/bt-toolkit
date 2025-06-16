import { StatePersistenceManager, createStatePersistence, saveLinkedPanelsState, loadLinkedPanelsState, clearLinkedPanelsState } from '../persistence';
import { MemoryStorageAdapter } from '../storage-adapters';
import { 
  PersistenceStorageAdapter, 
  ResourceMessages, 
  PanelNavigation, 
  ResourceMessage,
  LinkedPanelsPersistedState,
  StatePersistenceOptions 
} from '../types';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock storage adapter for testing
class MockStorageAdapter implements PersistenceStorageAdapter {
  private storage = new Map<string, string>();
  public shouldThrow = false;
  public isAvailableResult = true;

  isAvailable(): boolean {
    return this.isAvailableResult;
  }

  getItem(key: string): string | null {
    if (this.shouldThrow) throw new Error('Storage error');
    return this.storage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldThrow) throw new Error('Storage error');
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    if (this.shouldThrow) throw new Error('Storage error');
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

describe('StatePersistenceManager', () => {
  let mockAdapter: MockStorageAdapter;
  let manager: StatePersistenceManager;
  let mockPanelNavigation: PanelNavigation;
  let mockResourceMessages: ResourceMessages;

  beforeEach(() => {
    mockAdapter = new MockStorageAdapter();
    manager = new StatePersistenceManager({
      storageAdapter: mockAdapter,
      autoSave: false, // Disable auto-save for most tests
    });

    mockPanelNavigation = {
      'panel-1': { currentIndex: 0 },
      'panel-2': { currentIndex: 1 },
    };

    mockResourceMessages = {
      'resource-1': [
        {
          id: 'msg-1',
          timestamp: Date.now(),
          fromResourceId: 'resource-1',
          toResourceId: 'resource-1',
          content: { type: 'test-message', lifecycle: 'state' },
        },
        {
          id: 'msg-2',
          timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
          fromResourceId: 'resource-1',
          toResourceId: 'resource-1',
          content: { type: 'test-message', lifecycle: 'event' },
        },
      ],
      'resource-2': [
        {
          id: 'msg-3',
          timestamp: Date.now(),
          fromResourceId: 'resource-2',
          toResourceId: 'resource-2',
          content: { type: 'test-message', lifecycle: 'command' },
        },
      ],
    };
  });

  describe('constructor', () => {
    it('should use default options when none provided', () => {
      const defaultManager = new StatePersistenceManager();
      expect(defaultManager).toBeDefined();
    });

    it('should merge custom options with defaults', () => {
      const customManager = new StatePersistenceManager({
        storageKey: 'custom-key',
        autoSave: false,
        stateTTL: 1000,
      });
      expect(customManager).toBeDefined();
    });
  });

  describe('saveState', () => {
    it('should save state successfully', async () => {
      const result = await manager.saveState(mockPanelNavigation, mockResourceMessages);
      expect(result).toBe(true);
      
      const storedData = mockAdapter.getItem('linked-panels-state');
      expect(storedData).toBeTruthy();
      
      const parsedData = JSON.parse(storedData!);
      expect(parsedData.panelNavigation).toEqual(mockPanelNavigation);
      expect(parsedData.version).toBe('1.0.0');
      expect(parsedData.savedAt).toBeGreaterThan(Date.now() - 1000);
    });

    it('should handle storage errors gracefully', async () => {
      mockAdapter.shouldThrow = true;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
      
      const result = await manager.saveState(mockPanelNavigation, mockResourceMessages);
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save LinkedPanels state:'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should filter messages based on persistence options', async () => {
      const result = await manager.saveState(mockPanelNavigation, mockResourceMessages);
      expect(result).toBe(true);
      
      const storedData = mockAdapter.getItem('linked-panels-state');
      const parsedData = JSON.parse(storedData!);
      
      // Should only keep state messages and recent events, not commands or old events
      expect(parsedData.resourceMessages['resource-1']).toHaveLength(1); // Only state message
      expect(parsedData.resourceMessages['resource-2']).toBeUndefined(); // Command filtered out
    });

    it('should not persist navigation when option is disabled', async () => {
      const noNavManager = new StatePersistenceManager({
        storageAdapter: mockAdapter,
        persistNavigation: false,
      });
      
      const result = await noNavManager.saveState(mockPanelNavigation, mockResourceMessages);
      expect(result).toBe(true);
      
      const storedData = mockAdapter.getItem('linked-panels-state');
      const parsedData = JSON.parse(storedData!);
      expect(parsedData.panelNavigation).toEqual({});
    });

    it('should not persist messages when option is disabled', async () => {
      const noMsgManager = new StatePersistenceManager({
        storageAdapter: mockAdapter,
        persistMessages: false,
      });
      
      const result = await noMsgManager.saveState(mockPanelNavigation, mockResourceMessages);
      expect(result).toBe(true);
      
      const storedData = mockAdapter.getItem('linked-panels-state');
      const parsedData = JSON.parse(storedData!);
      expect(parsedData.resourceMessages).toEqual({});
    });
  });

  describe('loadState', () => {
    it('should load valid state successfully', async () => {
      // First save some state
      await manager.saveState(mockPanelNavigation, mockResourceMessages);
      
      // Then load it
      const loadedState = await manager.loadState();
      expect(loadedState).toBeTruthy();
      expect(loadedState!.panelNavigation).toEqual(mockPanelNavigation);
      expect(loadedState!.version).toBe('1.0.0');
    });

    it('should return null when no state exists', async () => {
      const loadedState = await manager.loadState();
      expect(loadedState).toBeNull();
    });

    it('should handle storage errors gracefully', async () => {
      mockAdapter.shouldThrow = true;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
      
      const loadedState = await manager.loadState();
      expect(loadedState).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load LinkedPanels state:'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle expired state', async () => {
      const expiredManager = new StatePersistenceManager({
        storageAdapter: mockAdapter,
        stateTTL: 100, // Very short TTL
      });
      
      // Save state
      await expiredManager.saveState(mockPanelNavigation, mockResourceMessages);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());
      const loadedState = await expiredManager.loadState();
      expect(loadedState).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Stored LinkedPanels state has expired')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle invalid JSON gracefully', async () => {
      mockAdapter.setItem('linked-panels-state', 'invalid-json');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
      
      const loadedState = await manager.loadState();
      expect(loadedState).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('clearState', () => {
    it('should clear stored state successfully', async () => {
      // First save some state
      await manager.saveState(mockPanelNavigation, mockResourceMessages);
      expect(mockAdapter.getItem('linked-panels-state')).toBeTruthy();
      
      // Then clear it
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());
      await manager.clearState();
      expect(mockAdapter.getItem('linked-panels-state')).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('LinkedPanels state cleared from storage')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle storage errors gracefully', async () => {
      mockAdapter.shouldThrow = true;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
      
      await manager.clearState();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to clear LinkedPanels state:'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('scheduleAutoSave', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should schedule auto-save when enabled', async () => {
      const autoSaveManager = new StatePersistenceManager({
        storageAdapter: mockAdapter,
        autoSave: true,
        autoSaveDebounce: 1000,
      });
      
      autoSaveManager.scheduleAutoSave(mockPanelNavigation, mockResourceMessages);
      
      // State should not be saved immediately
      expect(mockAdapter.getItem('linked-panels-state')).toBeNull();
      
      // Fast-forward time and wait for async operations
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();
      
      // Now state should be saved
      expect(mockAdapter.getItem('linked-panels-state')).toBeTruthy();
    });

    it('should not schedule auto-save when disabled', () => {
      const noAutoSaveManager = new StatePersistenceManager({
        storageAdapter: mockAdapter,
        autoSave: false,
      });
      
      noAutoSaveManager.scheduleAutoSave(mockPanelNavigation, mockResourceMessages);
      
      vi.advanceTimersByTime(5000);
      expect(mockAdapter.getItem('linked-panels-state')).toBeNull();
    });

    it('should debounce multiple auto-save calls', async () => {
      const autoSaveManager = new StatePersistenceManager({
        storageAdapter: mockAdapter,
        autoSave: true,
        autoSaveDebounce: 1000,
      });
      
      // Schedule multiple saves
      autoSaveManager.scheduleAutoSave(mockPanelNavigation, mockResourceMessages);
      vi.advanceTimersByTime(500);
      autoSaveManager.scheduleAutoSave(mockPanelNavigation, mockResourceMessages);
      vi.advanceTimersByTime(500);
      autoSaveManager.scheduleAutoSave(mockPanelNavigation, mockResourceMessages);
      
      // Should not be saved yet
      expect(mockAdapter.getItem('linked-panels-state')).toBeNull();
      
      // Complete the debounce and wait for async operations
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();
      
      // Should be saved only once
      expect(mockAdapter.getItem('linked-panels-state')).toBeTruthy();
    });
  });

  describe('getStorageInfo', () => {
    it('should return info when no state exists', async () => {
      const info = await manager.getStorageInfo();
      expect(info).toEqual({
        hasStoredState: false,
        stateSize: 0,
        savedAt: null,
        version: null,
      });
    });

    it('should return info when state exists', async () => {
      await manager.saveState(mockPanelNavigation, mockResourceMessages);
      
      const info = await manager.getStorageInfo();
      expect(info.hasStoredState).toBe(true);
      expect(info.stateSize).toBeGreaterThan(0);
      expect(info.savedAt).toBeGreaterThan(Date.now() - 1000);
      expect(info.version).toBe('1.0.0');
    });
  });

  describe('message filtering', () => {
    it('should use custom message filter when provided', async () => {
      const customFilter = vi.fn().mockReturnValue(true);
      const customManager = new StatePersistenceManager({
        storageAdapter: mockAdapter,
        messageFilter: customFilter,
      });
      
      await customManager.saveState(mockPanelNavigation, mockResourceMessages);
      
      expect(customFilter).toHaveBeenCalled();
    });

    it('should filter messages correctly with default filter', async () => {
      const recentEvent: ResourceMessage = {
        id: 'recent',
        timestamp: Date.now() - 1000, // 1 second ago
        fromResourceId: 'resource',
        toResourceId: 'resource',
        content: { type: 'test-event', lifecycle: 'event' },
      };

      const oldEvent: ResourceMessage = {
        id: 'old',
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        fromResourceId: 'resource',
        toResourceId: 'resource',
        content: { type: 'test-event', lifecycle: 'event' },
      };

      const stateMessage: ResourceMessage = {
        id: 'state',
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago but still state
        fromResourceId: 'resource',
        toResourceId: 'resource',
        content: { type: 'test-state', lifecycle: 'state' },
      };

      const commandMessage: ResourceMessage = {
        id: 'command',
        timestamp: Date.now(),
        fromResourceId: 'resource',
        toResourceId: 'resource',
        content: { type: 'test-command', lifecycle: 'command' },
      };

      const testMessages: ResourceMessages = {
        'test-resource': [recentEvent, oldEvent, stateMessage, commandMessage],
      };

      await manager.saveState({}, testMessages);
      
      const storedData = mockAdapter.getItem('linked-panels-state');
      const parsedData = JSON.parse(storedData!);
      
      // Should have 2 messages: recentEvent and stateMessage
      expect(parsedData.resourceMessages['test-resource']).toHaveLength(2);
      expect(parsedData.resourceMessages['test-resource'].map((m: ResourceMessage) => m.id))
        .toEqual(expect.arrayContaining(['recent', 'state']));
    });
  });
});

describe('Utility functions', () => {
  let mockAdapter: MockStorageAdapter;

  beforeEach(() => {
    mockAdapter = new MockStorageAdapter();
  });

  describe('createStatePersistence', () => {
    it('should create StatePersistenceManager with default options', () => {
      const manager = createStatePersistence();
      expect(manager).toBeInstanceOf(StatePersistenceManager);
    });

    it('should create StatePersistenceManager with custom options', () => {
      const manager = createStatePersistence({
        storageKey: 'custom-key',
        storageAdapter: mockAdapter,
      });
      expect(manager).toBeInstanceOf(StatePersistenceManager);
    });
  });

  describe('saveLinkedPanelsState', () => {
    it('should save state using default options', async () => {
      // Use memory adapter since default might not be available in test environment
      const result = await saveLinkedPanelsState(
        { 'panel-1': { currentIndex: 0 } },
        {},
        { storageAdapter: mockAdapter }
      );
      expect(result).toBe(true);
    });
  });

  describe('loadLinkedPanelsState', () => {
    it('should load state using default options', async () => {
      // First save some state
      await saveLinkedPanelsState(
        { 'panel-1': { currentIndex: 0 } },
        {},
        { storageAdapter: mockAdapter }
      );
      
      // Then load it
      const state = await loadLinkedPanelsState({ storageAdapter: mockAdapter });
      expect(state).toBeTruthy();
      expect(state!.panelNavigation['panel-1'].currentIndex).toBe(0);
    });

    it('should return null when no state exists', async () => {
      const state = await loadLinkedPanelsState({ storageAdapter: mockAdapter });
      expect(state).toBeNull();
    });
  });

  describe('clearLinkedPanelsState', () => {
    it('should clear state using default options', async () => {
      // First save some state
      await saveLinkedPanelsState(
        { 'panel-1': { currentIndex: 0 } },
        {},
        { storageAdapter: mockAdapter }
      );
      
      // Verify it exists
      let state = await loadLinkedPanelsState({ storageAdapter: mockAdapter });
      expect(state).toBeTruthy();
      
      // Clear it
      await clearLinkedPanelsState({ storageAdapter: mockAdapter });
      
      // Verify it's gone
      state = await loadLinkedPanelsState({ storageAdapter: mockAdapter });
      expect(state).toBeNull();
    });
  });
}); 