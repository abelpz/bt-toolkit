import { SignalBus } from '../core/SignalBus';
import { ResourceId, PanelId } from '../types/Signal';
import { ResourceNavigationData } from '../types/Resource';
import { PanelManager } from '../panels/PanelManager';
import { SIGNAL_TYPES } from '../signals/SignalTypes';

// Navigation target types
export interface NavigationTarget {
  type: 'resource' | 'panel' | 'content' | 'external';
  id: string;
  data?: any;
}

// Navigation entry for history
export interface NavigationEntry {
  id: string;
  timestamp: number;
  target: NavigationTarget;
  source?: NavigationTarget;
  context?: Record<string, any>;
  navigationData?: ResourceNavigationData;
}

// Navigation options
export interface NavigationOptions {
  addToHistory?: boolean;
  replaceHistory?: boolean;
  focus?: boolean;
  highlight?: boolean;
  scrollTo?: boolean;
  metadata?: Record<string, any>;
}

// Navigation result
export interface NavigationResult {
  success: boolean;
  target: NavigationTarget;
  entry?: NavigationEntry;
  error?: string;
}

/**
 * Manages navigation across the panel system.
 * Handles resource navigation, panel switching, content navigation,
 * and maintains navigation history with proper coordination.
 */
export class NavigationManager {
  private signalBus: SignalBus;
  private panelManager: PanelManager;
  
  // Navigation history
  private history: NavigationEntry[] = [];
  private currentIndex = -1;
  private maxHistorySize = 100;
  
  // Navigation state
  private isNavigating = false;
  
  // Event handlers
  private navigationHandlers = new Set<(entry: NavigationEntry, result: NavigationResult) => void>();
  private historyChangeHandlers = new Set<(history: NavigationEntry[]) => void>();

  constructor(
    panelManager: PanelManager,
    signalBus: SignalBus = SignalBus.getInstance()
  ) {
    this.panelManager = panelManager;
    this.signalBus = signalBus;
    
    this.setupSignalHandlers();
  }

  // Core Navigation Methods

  /**
   * Navigate to a specific target
   */
  async navigateTo(
    target: NavigationTarget, 
    options: NavigationOptions = {}
  ): Promise<NavigationResult> {
    if (this.isNavigating) {
      return {
        success: false,
        target,
        error: 'Navigation already in progress',
      };
    }

    this.isNavigating = true;

    try {
      // Create navigation entry
      const entry: NavigationEntry = {
        id: this.generateNavigationId(),
        timestamp: Date.now(),
        target,
        source: this.getCurrentTarget(),
        context: options.metadata,
      };

      // Perform navigation based on target type
      let result: NavigationResult;
      
      switch (target.type) {
        case 'resource':
          result = await this.navigateToResource(target.id, target.data, options);
          break;
        case 'panel':
          result = await this.navigateToPanel(target.id, entry, options);
          break;
        case 'content':
          result = await this.navigateToContent(target, entry, options);
          break;
        case 'external':
          result = await this.navigateToExternal(target, entry, options);
          break;
        default:
          result = {
            success: false,
            target,
            error: `Unknown navigation target type: ${target.type}`,
          };
      }

      // Add to history if successful and requested
      if (result.success && options.addToHistory !== false) {
        this.addToHistory(entry, options.replaceHistory);
      }

      // Emit navigation signals
      if (result.success) {
        await this.emitNavigationSignals(target, entry, options);
      }

      // Notify handlers
      this.notifyNavigationHandlers(entry, result);

      return result;

    } catch (error) {
      const result: NavigationResult = {
        success: false,
        target,
        error: error instanceof Error ? error.message : 'Navigation failed',
      };

      this.notifyNavigationHandlers({
        id: this.generateNavigationId(),
        timestamp: Date.now(),
        target,
      }, result);

      return result;

    } finally {
      this.isNavigating = false;
    }
  }

  /**
   * Navigate to a specific resource
   */
  async navigateToResource(
    resourceId: ResourceId,
    navigationData?: ResourceNavigationData,
    options: NavigationOptions = {}
  ): Promise<NavigationResult> {
    const target: NavigationTarget = {
      type: 'resource',
      id: resourceId,
      data: navigationData,
    };

    // Find panel containing the resource
    const panels = this.panelManager.getRegistry().getPanels();
    const targetPanel = panels.find(panel => panel.getResource(resourceId));

    if (!targetPanel) {
      return {
        success: false,
        target,
        error: `Resource '${resourceId}' not found in any panel`,
      };
    }

    try {
      // Switch to the panel containing the resource
      await this.panelManager.switchToPanel(targetPanel.id);

      // Set the resource as active in the panel
      await targetPanel.setActiveResource(resourceId);

      // Focus the panel if requested
      if (options.focus !== false) {
        await this.panelManager.focusPanel(targetPanel.id);
      }

      // Navigate within the resource if navigation data provided
      if (navigationData) {
        const resource = targetPanel.getResource(resourceId);
        if (resource && typeof (resource as any).navigateToContent === 'function') {
          await (resource as any).navigateToContent(navigationData);
        }
      }

      return {
        success: true,
        target,
      };

    } catch (error) {
      return {
        success: false,
        target,
        error: error instanceof Error ? error.message : 'Resource navigation failed',
      };
    }
  }

  /**
   * Navigate to a specific panel
   */
  async navigateToPanel(
    panelId: PanelId,
    entry: NavigationEntry,
    options: NavigationOptions = {}
  ): Promise<NavigationResult> {
    const target = entry.target;

    try {
      // Switch to the panel
      await this.panelManager.switchToPanel(panelId);

      // Focus if requested
      if (options.focus !== false) {
        await this.panelManager.focusPanel(panelId);
      }

      return {
        success: true,
        target,
        entry,
      };

    } catch (error) {
      return {
        success: false,
        target,
        error: error instanceof Error ? error.message : 'Panel navigation failed',
      };
    }
  }

  /**
   * Navigate to specific content within a resource
   */
  async navigateToContent(
    target: NavigationTarget,
    entry: NavigationEntry,
    options: NavigationOptions = {}
  ): Promise<NavigationResult> {
    // Content navigation requires the resource ID and navigation data
    if (!target.data || !target.data.resourceId) {
      return {
        success: false,
        target,
        error: 'Content navigation requires resourceId in target data',
      };
    }

    try {
      // First navigate to the resource
      const resourceResult = await this.navigateToResource(
        target.data.resourceId,
        target.data.navigationData,
        options
      );

      if (!resourceResult.success) {
        return resourceResult;
      }

      return {
        success: true,
        target,
        entry,
      };

    } catch (error) {
      return {
        success: false,
        target,
        error: error instanceof Error ? error.message : 'Content navigation failed',
      };
    }
  }

  /**
   * Navigate to external target (placeholder for extension)
   */
  async navigateToExternal(
    target: NavigationTarget,
    entry: NavigationEntry,
    options: NavigationOptions = {}
  ): Promise<NavigationResult> {
    // External navigation would be handled by platform-specific implementations
    return {
      success: false,
      target,
      error: 'External navigation not implemented',
    };
  }

  // History Management

  /**
   * Go back in navigation history
   */
  async goBack(): Promise<NavigationResult | null> {
    if (!this.canGoBack()) {
      return null;
    }

    this.currentIndex--;
    const entry = this.history[this.currentIndex];
    
    const result = await this.navigateTo(entry.target, { 
      addToHistory: false,
      focus: true,
    });

    return result;
  }

  /**
   * Go forward in navigation history
   */
  async goForward(): Promise<NavigationResult | null> {
    if (!this.canGoForward()) {
      return null;
    }

    this.currentIndex++;
    const entry = this.history[this.currentIndex];
    
    const result = await this.navigateTo(entry.target, { 
      addToHistory: false,
      focus: true,
    });

    return result;
  }

  /**
   * Check if can go back
   */
  canGoBack(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if can go forward
   */
  canGoForward(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get navigation history
   */
  getHistory(): NavigationEntry[] {
    return [...this.history];
  }

  /**
   * Get current navigation entry
   */
  getCurrentEntry(): NavigationEntry | null {
    return this.currentIndex >= 0 ? this.history[this.currentIndex] : null;
  }

  /**
   * Clear navigation history
   */
  clearHistory(): void {
    this.history = [];
    this.currentIndex = -1;
    this.notifyHistoryChangeHandlers();
  }

  // Event Handling

  /**
   * Subscribe to navigation events
   */
  onNavigation(handler: (entry: NavigationEntry, result: NavigationResult) => void): () => void {
    this.navigationHandlers.add(handler);
    return () => this.navigationHandlers.delete(handler);
  }

  /**
   * Subscribe to history change events
   */
  onHistoryChange(handler: (history: NavigationEntry[]) => void): () => void {
    this.historyChangeHandlers.add(handler);
    return () => this.historyChangeHandlers.delete(handler);
  }

  // Utility Methods

  /**
   * Get navigation state
   */
  getNavigationState() {
    return {
      canGoBack: this.canGoBack(),
      canGoForward: this.canGoForward(),
      historyLength: this.history.length,
      currentIndex: this.currentIndex,
      isNavigating: this.isNavigating,
      currentEntry: this.getCurrentEntry(),
    };
  }

  /**
   * Set maximum history size
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    this.trimHistory();
  }

  // Private Methods

  private setupSignalHandlers(): void {
    // Handle navigation signals from other components
    this.signalBus.onGlobal(SIGNAL_TYPES.NAVIGATE_TO_RESOURCE, async (signal: any) => {
      await this.navigateToResource(
        signal.payload.resourceId,
        signal.payload.data,
        { focus: true }
      );
    });

    this.signalBus.onGlobal(SIGNAL_TYPES.NAVIGATE_TO_NOTE, async (signal: any) => {
      const target: NavigationTarget = {
        type: 'content',
        id: signal.payload.noteId,
        data: {
          resourceId: signal.payload.resourceId || signal.payload.noteId,
          navigationData: {
            type: 'note',
            target: signal.payload.noteId,
          },
        },
      };

      await this.navigateTo(target, { focus: true });
    });
  }

  private addToHistory(entry: NavigationEntry, replace = false): void {
    if (replace && this.currentIndex >= 0) {
      // Replace current entry
      this.history[this.currentIndex] = entry;
    } else {
      // Remove forward history if we're not at the end
      if (this.currentIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.currentIndex + 1);
      }

      // Add new entry
      this.history.push(entry);
      this.currentIndex = this.history.length - 1;

      // Trim history if needed
      this.trimHistory();
    }

    this.notifyHistoryChangeHandlers();
  }

  private trimHistory(): void {
    if (this.history.length > this.maxHistorySize) {
      const removeCount = this.history.length - this.maxHistorySize;
      this.history = this.history.slice(removeCount);
      this.currentIndex = Math.max(0, this.currentIndex - removeCount);
    }
  }

  private getCurrentTarget(): NavigationTarget | undefined {
    const activePanel = this.panelManager.getActivePanel();
    if (!activePanel) {
      return undefined;
    }

    const activeResource = activePanel.getActiveResource();
    if (activeResource) {
      return {
        type: 'resource',
        id: activeResource.id,
      };
    }

    return {
      type: 'panel',
      id: activePanel.id,
    };
  }

  private generateNavigationId(): string {
    return `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async emitNavigationSignals(
    target: NavigationTarget,
    entry: NavigationEntry,
    options: NavigationOptions
  ): Promise<void> {
    // Emit appropriate navigation signals based on target type
    switch (target.type) {
      case 'resource':
        await this.signalBus.emit({
          type: SIGNAL_TYPES.FOCUS_RESOURCE,
          source: { 
            panelId: 'navigation-manager',
            resourceId: target.id
          },
          payload: {
            resourceId: target.id,
            highlight: options.highlight,
            scrollTo: options.scrollTo,
          },
          metadata: {
            timestamp: entry.timestamp,
            navigationId: entry.id,
          },
        });
        break;

      case 'panel':
        await this.signalBus.emit({
          type: SIGNAL_TYPES.FOCUS_PANEL,
          source: { 
            panelId: target.id,
            resourceId: 'navigation-manager'
          },
          payload: {
            panelId: target.id,
            focus: options.focus,
          },
          metadata: {
            timestamp: entry.timestamp,
            navigationId: entry.id,
          },
        });
        break;
    }
  }

  private notifyNavigationHandlers(entry: NavigationEntry, result: NavigationResult): void {
    for (const handler of this.navigationHandlers) {
      try {
        handler(entry, result);
      } catch (error) {
        console.error('Navigation handler failed:', error);
      }
    }
  }

  private notifyHistoryChangeHandlers(): void {
    for (const handler of this.historyChangeHandlers) {
      try {
        handler([...this.history]);
      } catch (error) {
        console.error('History change handler failed:', error);
      }
    }
  }
}

export default NavigationManager; 