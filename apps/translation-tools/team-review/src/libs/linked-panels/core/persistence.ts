import { 
  LinkedPanelsPersistedState, 
  StatePersistenceOptions,
  ResourceMessage,
  PanelNavigation,
  ResourceMessages
} from './types';
import { LocalStorageAdapter } from './storage-adapters';

const DEFAULT_STORAGE_KEY = 'linked-panels-state';
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const CURRENT_STATE_VERSION = '1.0.0';

/**
 * State persistence manager for LinkedPanels
 */
export class StatePersistenceManager {
  private options: Required<StatePersistenceOptions>;
  private autoSaveTimeoutId: NodeJS.Timeout | null = null;

  constructor(options: StatePersistenceOptions = {}) {
    this.options = {
      storageKey: DEFAULT_STORAGE_KEY,
      storageAdapter: new LocalStorageAdapter(),
      persistMessages: true,
      persistNavigation: true,
      stateTTL: DEFAULT_TTL,
      autoSave: true,
      autoSaveDebounce: 1000,
      messageFilter: this.defaultMessageFilter,
      ...options,
    };
  }

  /**
   * Default message filter - only persist state messages and recent events
   */
  private defaultMessageFilter = (message: ResourceMessage): boolean => {
    const lifecycle = message.content?.lifecycle || 'event';
    const ageInMs = Date.now() - message.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Always persist state messages
    if (lifecycle === 'state') return true;
    
    // Persist recent events (but not old ones)
    if (lifecycle === 'event' && ageInMs < maxAge) return true;
    
    // Don't persist commands (they're one-time actions)
    return false;
  };

  /**
   * Save current state using the configured storage adapter
   */
  async saveState(
    panelNavigation: PanelNavigation,
    resourceMessages: ResourceMessages
  ): Promise<boolean> {
    try {
      const stateToSave: LinkedPanelsPersistedState = {
        panelNavigation: this.options.persistNavigation ? panelNavigation : {},
        resourceMessages: this.options.persistMessages 
          ? this.filterMessages(resourceMessages)
          : {},
        savedAt: Date.now(),
        version: CURRENT_STATE_VERSION,
      };

      await this.options.storageAdapter.setItem(
        this.options.storageKey,
        JSON.stringify(stateToSave)
      );

      console.log('💾 LinkedPanels state saved to storage');
      return true;
    } catch (error) {
      console.error('❌ Failed to save LinkedPanels state:', error);
      return false;
    }
  }

  /**
   * Load state from the configured storage adapter
   */
  async loadState(): Promise<LinkedPanelsPersistedState | null> {
    try {
      const storedData = await this.options.storageAdapter.getItem(this.options.storageKey);
      if (!storedData) return null;

      const parsedState = JSON.parse(storedData) as LinkedPanelsPersistedState;

      // Check if state is expired
      if (this.isStateExpired(parsedState)) {
        console.log('⏰ Stored LinkedPanels state has expired, ignoring');
        await this.clearState();
        return null;
      }

      // Handle version migration if needed
      const migratedState = this.migrateState(parsedState);

      console.log('📂 LinkedPanels state loaded from storage');
      return migratedState;
    } catch (error) {
      console.error('❌ Failed to load LinkedPanels state:', error);
      return null;
    }
  }

  /**
   * Clear stored state
   */
  async clearState(): Promise<void> {
    try {
      await this.options.storageAdapter.removeItem(this.options.storageKey);
      console.log('🗑️ LinkedPanels state cleared from storage');
    } catch (error) {
      console.error('❌ Failed to clear LinkedPanels state:', error);
    }
  }

  /**
   * Auto-save state with debouncing
   */
  scheduleAutoSave(
    panelNavigation: PanelNavigation,
    resourceMessages: ResourceMessages
  ): void {
    if (!this.options.autoSave) return;

    // Clear existing timeout
    if (this.autoSaveTimeoutId) {
      clearTimeout(this.autoSaveTimeoutId);
    }

    // Schedule new save
    this.autoSaveTimeoutId = setTimeout(async () => {
      await this.saveState(panelNavigation, resourceMessages);
    }, this.options.autoSaveDebounce);
  }

  /**
   * Check if state is expired
   */
  private isStateExpired(state: LinkedPanelsPersistedState): boolean {
    return Date.now() - state.savedAt > this.options.stateTTL;
  }

  /**
   * Filter messages based on persistence criteria
   */
  private filterMessages(resourceMessages: ResourceMessages): ResourceMessages {
    const filtered: ResourceMessages = {};

    for (const [resourceId, messages] of Object.entries(resourceMessages)) {
      const filteredMessages = messages.filter(this.options.messageFilter);
      if (filteredMessages.length > 0) {
        filtered[resourceId] = filteredMessages;
      }
    }

    return filtered;
  }

  /**
   * Handle state version migration
   */
  private migrateState(state: LinkedPanelsPersistedState): LinkedPanelsPersistedState {
    // For now, just return as-is since we're on version 1.0.0
    // In the future, add migration logic here
    return state;
  }

  /**
   * Get storage info for debugging
   */
  async getStorageInfo(): Promise<{
    hasStoredState: boolean;
    stateSize: number;
    savedAt: number | null;
    version: string | null;
  }> {
    try {
      const storedData = await this.options.storageAdapter.getItem(this.options.storageKey);
      if (!storedData) {
        return {
          hasStoredState: false,
          stateSize: 0,
          savedAt: null,
          version: null,
        };
      }

      const parsedState = JSON.parse(storedData) as LinkedPanelsPersistedState;
      return {
        hasStoredState: true,
        stateSize: storedData.length,
        savedAt: parsedState.savedAt,
        version: parsedState.version,
      };
    } catch (error) {
      return {
        hasStoredState: false,
        stateSize: 0,
        savedAt: null,
        version: null,
      };
    }
  }
}

/**
 * Utility functions for consumers
 */

/**
 * Create a persistence manager with default options
 */
export function createStatePersistence(
  options?: StatePersistenceOptions
): StatePersistenceManager {
  return new StatePersistenceManager(options);
}

/**
 * Quick save function for manual state saving
 */
export async function saveLinkedPanelsState(
  panelNavigation: PanelNavigation,
  resourceMessages: ResourceMessages,
  options?: StatePersistenceOptions
): Promise<boolean> {
  const manager = new StatePersistenceManager(options);
  return await manager.saveState(panelNavigation, resourceMessages);
}

/**
 * Quick load function for manual state loading
 */
export async function loadLinkedPanelsState(
  options?: StatePersistenceOptions
): Promise<LinkedPanelsPersistedState | null> {
  const manager = new StatePersistenceManager(options);
  return await manager.loadState();
}

/**
 * Quick clear function for manual state clearing
 */
export async function clearLinkedPanelsState(
  options?: StatePersistenceOptions
): Promise<void> {
  const manager = new StatePersistenceManager(options);
  await manager.clearState();
} 