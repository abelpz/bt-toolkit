/**
 * Smart Data Manager - Priority-based fetching system
 * Coordinates data fetching based on URL params, cached panel state, and navigation context
 */

import { RangeReference } from '../types/navigation';
import { fetchScripture, fetchTranslationNotes } from './door43-api';

export interface PanelState {
  id: string;
  currentResourceId: string;
  resourceIds: string[];
}

export interface AppInitialState {
  navigation: {
    currentRange: RangeReference;
    mode: 'bcv' | 'sections' | 'passage';
  };
  panels: {
    'scripture-panel': PanelState;
    'notes-panel': PanelState;
  };
}

export interface FetchPriority {
  resourceId: string;
  panelId: string;
  range: RangeReference;
  priority: number; // 1 = highest, 10 = lowest
  reason: string;
}

/**
 * Extracts initial state from URL parameters and localStorage
 */
export function getInitialAppState(): AppInitialState {
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const book = urlParams.get('book') || 'jon';
  const chapter = parseInt(urlParams.get('chapter') || '1');
  const verse = parseInt(urlParams.get('verse') || '1');
  const endChapter = urlParams.get('endChapter') ? parseInt(urlParams.get('endChapter')!) : undefined;
  const endVerse = urlParams.get('endVerse') ? parseInt(urlParams.get('endVerse')!) : undefined;
  const mode = (urlParams.get('mode') as 'bcv' | 'sections' | 'passage') || 'bcv';

  // Get cached panel state from linked-panels localStorage
  let cachedPanelState: any = null;
  try {
    const panelStateJson = localStorage.getItem('translation-studio-panels-state');
    if (panelStateJson) {
      cachedPanelState = JSON.parse(panelStateJson);
    }
  } catch (error) {
    console.warn('Failed to parse cached panel state:', error);
  }

  // Build navigation state
  const currentRange: RangeReference = {
    book,
    startChapter: chapter,
    startVerse: verse,
    endChapter,
    endVerse
  };

  // Build panel states with fallbacks
  const scripturePanel: PanelState = {
    id: 'scripture-panel',
    currentResourceId: cachedPanelState?.panels?.['scripture-panel']?.currentResourceId || 'ult-scripture',
    resourceIds: ['ult-scripture', 'ust-scripture']
  };

  const notesPanel: PanelState = {
    id: 'notes-panel', 
    currentResourceId: cachedPanelState?.panels?.['notes-panel']?.currentResourceId || 'translation-notes',
    resourceIds: ['ust-scripture', 'translation-notes']
  };

  return {
    navigation: {
      currentRange,
      mode
    },
    panels: {
      'scripture-panel': scripturePanel,
      'notes-panel': notesPanel
    }
  };
}

/**
 * Determines fetch priorities based on current app state
 */
export function calculateFetchPriorities(initialState: AppInitialState): FetchPriority[] {
  const priorities: FetchPriority[] = [];
  const { navigation, panels } = initialState;

  // Priority 1: Currently visible resources in both panels
  const scriptureResourceId = panels['scripture-panel'].currentResourceId;
  const notesResourceId = panels['notes-panel'].currentResourceId;

  priorities.push({
    resourceId: scriptureResourceId,
    panelId: 'scripture-panel',
    range: navigation.currentRange,
    priority: 1,
    reason: 'Currently visible in scripture panel'
  });

  if (notesResourceId !== scriptureResourceId) {
    priorities.push({
      resourceId: notesResourceId,
      panelId: 'notes-panel', 
      range: navigation.currentRange,
      priority: 1,
      reason: 'Currently visible in notes panel'
    });
  }

  // Priority 2: Other resources available in current panels (for quick switching)
  panels['scripture-panel'].resourceIds.forEach(resourceId => {
    if (resourceId !== scriptureResourceId) {
      priorities.push({
        resourceId,
        panelId: 'scripture-panel',
        range: navigation.currentRange,
        priority: 2,
        reason: 'Available in scripture panel for quick switching'
      });
    }
  });

  panels['notes-panel'].resourceIds.forEach(resourceId => {
    if (resourceId !== notesResourceId && resourceId !== scriptureResourceId) {
      priorities.push({
        resourceId,
        panelId: 'notes-panel',
        range: navigation.currentRange,
        priority: 2,
        reason: 'Available in notes panel for quick switching'
      });
    }
  });

  // Sort by priority (lower number = higher priority)
  return priorities.sort((a, b) => a.priority - b.priority);
}

/**
 * Maps resource IDs to actual API resource types and fetching functions
 */
export function getResourceFetchInfo(resourceId: string) {
  switch (resourceId) {
    case 'ult-scripture':
      return {
        type: 'scripture' as const,
        resourceType: 'ult'
      };
    case 'ust-scripture':
      return {
        type: 'scripture' as const,
        resourceType: 'ust'
      };
    case 'translation-notes':
      return {
        type: 'notes' as const,
        resourceType: 'tn'
      };
    default:
      throw new Error(`Unknown resource ID: ${resourceId}`);
  }
}

/**
 * Smart data fetcher that respects priorities and caching
 */
export class SmartDataManager {
  private fetchQueue: FetchPriority[] = [];
  private activeFetches = new Set<string>();
  private fetchCallbacks = new Map<string, ((data: any) => void)[]>();

  constructor(
    private config: { organization: string; language: string }
  ) {}

  /**
   * Initialize with app state and start priority fetching
   */
  async initialize(initialState: AppInitialState) {
    console.log('🧠 SmartDataManager: Initializing with state:', initialState);
    
    this.fetchQueue = calculateFetchPriorities(initialState);
    
    console.log('📋 Fetch priorities:', this.fetchQueue.map(p => 
      `${p.priority}: ${p.resourceId} (${p.reason})`
    ));

    // Start fetching high-priority items immediately
    await this.processFetchQueue();
  }

  /**
   * Process the fetch queue, respecting priorities and cache
   */
  private async processFetchQueue() {
    const highPriorityItems = this.fetchQueue.filter(item => item.priority <= 2);
    
    // Fetch high-priority items in parallel
    const highPriorityPromises = highPriorityItems.map(item => 
      this.fetchResourceData(item)
    );

    await Promise.allSettled(highPriorityPromises);
  }

  /**
   * Get data for a resource, using cache-first approach
   */
  async getResourceData(
    resourceId: string, 
    range: RangeReference,
    callback?: (data: any) => void
  ): Promise<any> {
    // For now, just call the existing fetch function directly
    // This is a simplified implementation
    const priority: FetchPriority = {
      resourceId,
      panelId: 'dynamic',
      range,
      priority: 1,
      reason: 'On-demand request'
    };
    
    return this.fetchResourceData(priority);
  }

  /**
   * Fetch data for a specific resource and range
   */
  private async fetchResourceData(priority: FetchPriority): Promise<any> {
    const { resourceId, range } = priority;
    const fetchKey = `${resourceId}:${range.book}:${range.startChapter}:${range.startVerse}`;
    
    // Avoid duplicate fetches
    if (this.activeFetches.has(fetchKey)) {
      return;
    }

    this.activeFetches.add(fetchKey);

    try {
      const fetchInfo = getResourceFetchInfo(resourceId);
      const { organization, language } = this.config;

      console.log(`🔄 Fetching ${resourceId} for ${range.book} ${range.startChapter}:${range.startVerse}`);

      let data: any = null;
      if (fetchInfo.type === 'scripture') {
        data = await fetchScripture(
          range.book,
          undefined, // Fetch whole book, not just chapter
          {
            organization,
            language,
            resourceType: fetchInfo.resourceType
          }
        );
      } else if (fetchInfo.type === 'notes') {
        data = await fetchTranslationNotes(
          range.book,
          range.startChapter,
          {
            organization,
            language,
            resourceType: 'tn'
          }
        );
      }

      // Notify any waiting callbacks
      const callbacks = this.fetchCallbacks.get(fetchKey) || [];
      callbacks.forEach(callback => callback(data));
      this.fetchCallbacks.delete(fetchKey);

      console.log(`✅ Fetched ${resourceId} for ${range.book} ${range.startChapter}:${range.startVerse}`);
      return data;

    } catch (error) {
      console.error(`❌ Failed to fetch ${resourceId}:`, error);
      throw error;
    } finally {
      this.activeFetches.delete(fetchKey);
    }
  }

  /**
   * Update priorities when navigation changes
   */
  updateNavigation(newRange: RangeReference, currentPanelStates: Record<string, PanelState>) {
    console.log('🧭 Navigation changed, updating priorities:', newRange);
    
    const newState: AppInitialState = {
      navigation: { currentRange: newRange, mode: 'bcv' },
      panels: currentPanelStates as any
    };

    this.fetchQueue = calculateFetchPriorities(newState);
    this.processFetchQueue();
  }
}

// Global instance
let globalDataManager: SmartDataManager | null = null;

/**
 * Get or create the global data manager instance
 */
export function getDataManager(config?: { organization: string; language: string }): SmartDataManager {
  if (!globalDataManager && config) {
    globalDataManager = new SmartDataManager(config);
  }
  
  if (!globalDataManager) {
    throw new Error('DataManager not initialized. Call with config first.');
  }
  
  return globalDataManager;
}

/**
 * Reset the global data manager (useful for config changes)
 */
export function resetDataManager() {
  globalDataManager = null;
}