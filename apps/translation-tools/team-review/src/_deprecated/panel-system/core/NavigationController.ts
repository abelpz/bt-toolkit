import { SignalBus } from './SignalBus';
import { SIGNAL_TYPES } from '../signals/SignalTypes';
import { PanelId, ResourceId } from '../types/Signal';
import {
  NavigationEntry,
  NavigationHistory,
  NavigationOptions,
} from '../types/Navigation';

/**
 * Controls navigation between panels and resources
 * Maintains navigation history and provides back/forward functionality
 */
export class NavigationController {
  private history: NavigationEntry[] = [];
  private currentIndex = -1;
  private maxHistorySize = 100;

  // Event handlers
  private onNavigationHandlers: Array<(entry: NavigationEntry) => void> = [];
  private onHistoryChangedHandlers: Array<(history: NavigationHistory) => void> = [];

  constructor(private signalBus: SignalBus) {
    this.setupSignalHandlers();
  }

  /**
   * Navigate to a specific resource in a panel
   */
  async navigateToResource(
    resourceId: ResourceId,
    panelId?: PanelId,
    options: NavigationOptions = {}
  ): Promise<void> {
    const entry: NavigationEntry = {
      id: this.generateEntryId(),
      resourceId,
      panelId,
      timestamp: Date.now(),
      type: 'resource',
      metadata: {
        trigger: options.trigger || 'programmatic',
        source: options.source,
        ...options.metadata
      }
    };

    // Add to history
    this.addToHistory(entry);

    // Emit navigation signal
    await this.signalBus.emit({
      type: SIGNAL_TYPES.NAVIGATE_TO_RESOURCE,
      source: { 
        panelId: options.source?.panelId || 'navigation-controller',
        resourceId: options.source?.resourceId || 'navigation-controller'
      },
      payload: {
        resourceId,
        panelId,
        navigationId: entry.id,
        options
      }
    });

    // Notify handlers
    this.onNavigationHandlers.forEach(handler => handler(entry));
  }

  /**
   * Navigate to a specific panel
   */
  async navigateToPanel(
    panelId: PanelId,
    options: NavigationOptions = {}
  ): Promise<void> {
    const entry: NavigationEntry = {
      id: this.generateEntryId(),
      panelId,
      timestamp: Date.now(),
      type: 'panel',
      metadata: {
        trigger: options.trigger || 'programmatic',
        source: options.source,
        ...options.metadata
      }
    };

    // Add to history
    this.addToHistory(entry);

    // Emit navigation signal
    await this.signalBus.emit({
      type: SIGNAL_TYPES.SWITCH_PANEL,
      source: { 
        panelId: options.source?.panelId || 'navigation-controller',
        resourceId: options.source?.resourceId || 'navigation-controller'
      },
      payload: {
        panelId,
        navigationId: entry.id,
        options
      }
    });

    // Notify handlers
    this.onNavigationHandlers.forEach(handler => handler(entry));
  }

  /**
   * Navigate back in history
   */
  async goBack(steps = 1): Promise<boolean> {
    if (!this.canGoBack(steps)) {
      return false;
    }

    this.currentIndex -= steps;
    const entry = this.history[this.currentIndex];

    await this.navigateToEntry(entry, { trigger: 'history_back' });
    return true;
  }

  /**
   * Navigate forward in history
   */
  async goForward(steps = 1): Promise<boolean> {
    if (!this.canGoForward(steps)) {
      return false;
    }

    this.currentIndex += steps;
    const entry = this.history[this.currentIndex];

    await this.navigateToEntry(entry, { trigger: 'history_forward' });
    return true;
  }

  /**
   * Check if we can go back in history
   */
  canGoBack(steps = 1): boolean {
    return this.currentIndex - steps >= 0;
  }

  /**
   * Check if we can go forward in history
   */
  canGoForward(steps = 1): boolean {
    return this.currentIndex + steps < this.history.length;
  }

  /**
   * Get current navigation entry
   */
  getCurrentEntry(): NavigationEntry | undefined {
    return this.history[this.currentIndex];
  }

  /**
   * Get navigation history
   */
  getHistory(): NavigationHistory {
    return {
      entries: [...this.history],
      currentIndex: this.currentIndex,
      canGoBack: this.canGoBack(),
      canGoForward: this.canGoForward()
    };
  }

  /**
   * Get history entries
   */
  getHistoryEntries(): NavigationEntry[] {
    return [...this.history];
  }

  /**
   * Get current position in history
   */
  getCurrentPosition(): number {
    return this.currentIndex;
  }

  /**
   * Get history size
   */
  getHistorySize(): number {
    return this.history.length;
  }

  /**
   * Clear navigation history
   */
  clearHistory(): void {
    this.history = [];
    this.currentIndex = -1;
    this.notifyHistoryChanged();
  }

  /**
   * Set maximum history size
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    this.trimHistory();
  }

  /**
   * Find navigation entries by criteria
   */
  findEntries(criteria: {
    resourceId?: ResourceId;
    panelId?: PanelId;
    type?: 'resource' | 'panel';
    since?: number;
    until?: number;
  }): NavigationEntry[] {
    return this.history.filter(entry => {
      if (criteria.resourceId && entry.resourceId !== criteria.resourceId) {
        return false;
      }
      if (criteria.panelId && entry.panelId !== criteria.panelId) {
        return false;
      }
      if (criteria.type && entry.type !== criteria.type) {
        return false;
      }
      if (criteria.since && entry.timestamp < criteria.since) {
        return false;
      }
      if (criteria.until && entry.timestamp > criteria.until) {
        return false;
      }
      return true;
    });
  }

  /**
   * Get recent navigation entries
   */
  getRecentEntries(count = 10): NavigationEntry[] {
    return this.history.slice(-count);
  }

  /**
   * Register navigation event handler
   */
  onNavigation(handler: (entry: NavigationEntry) => void): () => void {
    this.onNavigationHandlers.push(handler);
    return () => {
      const index = this.onNavigationHandlers.indexOf(handler);
      if (index > -1) {
        this.onNavigationHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Register history changed event handler
   */
  onHistoryChanged(handler: (history: NavigationHistory) => void): () => void {
    this.onHistoryChangedHandlers.push(handler);
    return () => {
      const index = this.onHistoryChangedHandlers.indexOf(handler);
      if (index > -1) {
        this.onHistoryChangedHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Cleanup navigation controller
   */
  cleanup(): void {
    this.clearHistory();
    this.onNavigationHandlers = [];
    this.onHistoryChangedHandlers = [];
  }

  /**
   * Setup signal handlers
   */
  private setupSignalHandlers(): void {
    // Handle navigation back signals
    this.signalBus.onGlobal(SIGNAL_TYPES.NAVIGATE_BACK, async (signal) => {
      const { steps = 1 } = signal.payload || {};
      await this.goBack(steps);
    });

    // Handle navigation forward signals
    this.signalBus.onGlobal(SIGNAL_TYPES.NAVIGATE_FORWARD, async (signal) => {
      const { steps = 1 } = signal.payload || {};
      await this.goForward(steps);
    });

    // Handle external navigation events to track in history
    this.signalBus.onGlobal(SIGNAL_TYPES.RESOURCE_SELECTED, async (signal) => {
      const { resourceId, panelId } = signal.payload;
      
      // Only add to history if it's not from our own navigation
      if (!signal.payload.navigationId) {
        await this.navigateToResource(resourceId, panelId, {
          trigger: 'external',
          source: signal.source
        });
      }
    });
  }

  /**
   * Navigate to a specific history entry
   */
  private async navigateToEntry(
    entry: NavigationEntry,
    options: NavigationOptions = {}
  ): Promise<void> {
    if (entry.type === 'resource' && entry.resourceId) {
      await this.signalBus.emit({
        type: SIGNAL_TYPES.NAVIGATE_TO_RESOURCE,
        source: { panelId: 'navigation-controller', resourceId: 'navigation-controller' },
        payload: {
          resourceId: entry.resourceId,
          panelId: entry.panelId,
          navigationId: entry.id,
          options: { ...options, fromHistory: true }
        }
      });
    } else if (entry.type === 'panel' && entry.panelId) {
      await this.signalBus.emit({
        type: SIGNAL_TYPES.SWITCH_PANEL,
        source: { panelId: 'navigation-controller', resourceId: 'navigation-controller' },
        payload: {
          panelId: entry.panelId,
          navigationId: entry.id,
          options: { ...options, fromHistory: true }
        }
      });
    }

    // Notify handlers
    this.onNavigationHandlers.forEach(handler => handler(entry));
  }

  /**
   * Add entry to navigation history
   */
  private addToHistory(entry: NavigationEntry): void {
    // Remove any entries after current position (when navigating after going back)
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new entry
    this.history.push(entry);
    this.currentIndex = this.history.length - 1;

    // Trim history if needed
    this.trimHistory();

    // Notify history changed
    this.notifyHistoryChanged();
  }

  /**
   * Trim history to max size
   */
  private trimHistory(): void {
    if (this.history.length > this.maxHistorySize) {
      const removeCount = this.history.length - this.maxHistorySize;
      this.history = this.history.slice(removeCount);
      this.currentIndex = Math.max(0, this.currentIndex - removeCount);
    }
  }

  /**
   * Generate unique entry ID
   */
  private generateEntryId(): string {
    return `nav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Notify history changed handlers
   */
  private notifyHistoryChanged(): void {
    const history = this.getHistory();
    this.onHistoryChangedHandlers.forEach(handler => handler(history));
  }
} 