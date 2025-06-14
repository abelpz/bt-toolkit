import { PanelId } from '../types/Signal';
import { 
  PanelAPI,
  PanelConfig,
  PanelState,
  PanelFactory,
  PanelRegistry as IPanelRegistry
} from '../types/Panel';

/**
 * Registry for managing panel factories and panel instances.
 * Handles panel creation, registration, and lifecycle coordination.
 */
export class PanelRegistry implements IPanelRegistry {
  private factories = new Map<string, PanelFactory>();
  private panels = new Map<PanelId, PanelAPI>();
  
  // Event handlers
  private panelCreatedHandlers = new Set<(panel: PanelAPI) => void>();
  private panelDestroyedHandlers = new Set<(panelId: PanelId) => void>();
  private panelStateChangedHandlers = new Set<(panelId: PanelId, state: PanelState) => void>();
  
  private isInitialized = false;

  // Factory Management
  
  registerFactory(factory: PanelFactory): void {
    if (this.factories.has(factory.type)) {
      throw new Error(`Panel factory for type '${factory.type}' is already registered`);
    }
    
    this.factories.set(factory.type, factory);
  }

  unregisterFactory(type: string): void {
    // Check if any panels of this type exist
    const existingPanels = this.getPanelsByType(type);
    if (existingPanels.length > 0) {
      throw new Error(`Cannot unregister factory '${type}': ${existingPanels.length} panels still exist`);
    }
    
    this.factories.delete(type);
  }

  getFactory(type: string): PanelFactory | undefined {
    return this.factories.get(type);
  }

  getFactories(): PanelFactory[] {
    return Array.from(this.factories.values());
  }

  // Panel Management
  
  async createPanel(config: PanelConfig): Promise<PanelAPI> {
    const factory = this.factories.get(config.type);
    if (!factory) {
      throw new Error(`No factory registered for panel type '${config.type}'`);
    }
    
    // Validate configuration
    const validation = factory.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid panel configuration: ${validation.errors.join(', ')}`);
    }
    
    // Check if panel with this ID already exists
    if (this.panels.has(config.id)) {
      throw new Error(`Panel with ID '${config.id}' already exists`);
    }
    
    try {
      // Create the panel
      const panel = await factory.create(config);
      
      // Register the panel
      this.registerPanel(panel);
      
      // Set up state change monitoring
      this.monitorPanelStateChanges(panel);
      
      // Emit creation event
      this.emitPanelCreated(panel);
      
      return panel;
      
    } catch (error) {
      throw new Error(`Failed to create panel '${config.id}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  registerPanel(panel: PanelAPI): void {
    if (this.panels.has(panel.id)) {
      throw new Error(`Panel with ID '${panel.id}' is already registered`);
    }
    
    this.panels.set(panel.id, panel);
  }

  unregisterPanel(panelId: PanelId): void {
    const panel = this.panels.get(panelId);
    if (!panel) {
      return; // Panel doesn't exist
    }
    
    this.panels.delete(panelId);
    this.emitPanelDestroyed(panelId);
  }

  getPanel(panelId: PanelId): PanelAPI | undefined {
    return this.panels.get(panelId);
  }

  getPanels(): PanelAPI[] {
    return Array.from(this.panels.values());
  }

  getPanelsByType(type: string): PanelAPI[] {
    return Array.from(this.panels.values()).filter(panel => panel.type === type);
  }

  // Lifecycle Coordination
  
  async initializeAll(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    const initPromises = Array.from(this.panels.values()).map(async (panel) => {
      try {
        await panel.initialize();
      } catch (error) {
        console.error(`Failed to initialize panel '${panel.id}':`, error);
        throw error;
      }
    });
    
    await Promise.all(initPromises);
    this.isInitialized = true;
  }

  async destroyAll(): Promise<void> {
    const destroyPromises = Array.from(this.panels.values()).map(async (panel) => {
      try {
        await panel.destroy();
      } catch (error) {
        console.error(`Failed to destroy panel '${panel.id}':`, error);
      }
    });
    
    await Promise.all(destroyPromises);
    
    // Clear all panels
    this.panels.clear();
    this.isInitialized = false;
  }

  async activatePanel(panelId: PanelId): Promise<void> {
    const panel = this.panels.get(panelId);
    if (!panel) {
      throw new Error(`Panel '${panelId}' not found`);
    }
    
    await panel.activate();
  }

  async deactivatePanel(panelId: PanelId): Promise<void> {
    const panel = this.panels.get(panelId);
    if (!panel) {
      throw new Error(`Panel '${panelId}' not found`);
    }
    
    await panel.deactivate();
  }

  // Event Handling
  
  onPanelCreated(handler: (panel: PanelAPI) => void): () => void {
    this.panelCreatedHandlers.add(handler);
    return () => this.panelCreatedHandlers.delete(handler);
  }

  onPanelDestroyed(handler: (panelId: PanelId) => void): () => void {
    this.panelDestroyedHandlers.add(handler);
    return () => this.panelDestroyedHandlers.delete(handler);
  }

  onPanelStateChanged(handler: (panelId: PanelId, state: PanelState) => void): () => void {
    this.panelStateChangedHandlers.add(handler);
    return () => this.panelStateChangedHandlers.delete(handler);
  }

  // Utility Methods
  
  /**
   * Get panel statistics
   */
  getStatistics() {
    const panels = Array.from(this.panels.values());
    const byType = new Map<string, number>();
    const byPhase = new Map<string, number>();
    
    for (const panel of panels) {
      const state = panel.getState();
      
      // Count by type
      byType.set(panel.type, (byType.get(panel.type) || 0) + 1);
      
      // Count by phase
      byPhase.set(state.phase, (byPhase.get(state.phase) || 0) + 1);
    }
    
    return {
      total: panels.length,
      byType: Object.fromEntries(byType),
      byPhase: Object.fromEntries(byPhase),
      factories: this.factories.size,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Validate all registered panels
   */
  async validateAll(): Promise<{
    isValid: boolean;
    results: Record<PanelId, { isValid: boolean; errors: string[] }>;
  }> {
    const results: Record<PanelId, { isValid: boolean; errors: string[] }> = {};
    let overallValid = true;
    
    for (const [panelId, panel] of this.panels) {
      const factory = this.factories.get(panel.type);
      if (!factory) {
        results[panelId] = {
          isValid: false,
          errors: [`No factory found for panel type '${panel.type}'`],
        };
        overallValid = false;
        continue;
      }
      
      const validation = factory.validateConfig(panel.getConfig());
      results[panelId] = validation;
      
      if (!validation.isValid) {
        overallValid = false;
      }
    }
    
    return {
      isValid: overallValid,
      results,
    };
  }

  /**
   * Clean up orphaned panels (panels without valid factories)
   */
  async cleanupOrphanedPanels(): Promise<PanelId[]> {
    const orphanedPanels: PanelId[] = [];
    
    for (const [panelId, panel] of this.panels) {
      if (!this.factories.has(panel.type)) {
        orphanedPanels.push(panelId);
        
        try {
          await panel.destroy();
        } catch (error) {
          console.error(`Failed to destroy orphaned panel '${panelId}':`, error);
        }
        
        this.unregisterPanel(panelId);
      }
    }
    
    return orphanedPanels;
  }

  /**
   * Get factory default configuration merged with provided config
   */
  getFactoryDefaultConfig(type: string, config: Partial<PanelConfig>): PanelConfig {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`No factory registered for panel type '${type}'`);
    }
    
    const defaults = factory.getDefaultConfig();
    return {
      ...defaults,
      ...config,
      type, // Ensure type is correct
    } as PanelConfig;
  }

  // Private Methods
  
  private monitorPanelStateChanges(panel: PanelAPI): void {
    // Set up state change monitoring
    const originalSetState = panel.setState;
    if (typeof originalSetState === 'function') {
      panel.setState = (newState: Partial<PanelState>) => {
        originalSetState.call(panel, newState);
        this.emitPanelStateChanged(panel.id, panel.getState());
      };
    }
  }

  private emitPanelCreated(panel: PanelAPI): void {
    for (const handler of this.panelCreatedHandlers) {
      try {
        handler(panel);
      } catch (error) {
        console.error(`Panel created handler failed:`, error);
      }
    }
  }

  private emitPanelDestroyed(panelId: PanelId): void {
    for (const handler of this.panelDestroyedHandlers) {
      try {
        handler(panelId);
      } catch (error) {
        console.error(`Panel destroyed handler failed:`, error);
      }
    }
  }

  private emitPanelStateChanged(panelId: PanelId, state: PanelState): void {
    for (const handler of this.panelStateChangedHandlers) {
      try {
        handler(panelId, state);
      } catch (error) {
        console.error(`Panel state changed handler failed:`, error);
      }
    }
  }
}

export default PanelRegistry; 