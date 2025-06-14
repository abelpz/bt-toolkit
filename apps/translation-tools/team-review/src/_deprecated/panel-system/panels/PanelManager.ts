import { SignalBus } from '../core/SignalBus';
import { ResourceId, PanelId } from '../types/Signal';
import { ResourceAPI } from '../types/Resource';
import { 
  PanelAPI,
  PanelConfig,
  PanelLayout,
  PanelManager as IPanelManager,
  PanelRegistry as IPanelRegistry,
  PanelCoordination,
  PanelVisibility
} from '../types/Panel';
import { PanelRegistry } from './PanelRegistry';
import { SIGNAL_TYPES } from '../signals/SignalTypes';

/**
 * High-level manager for coordinating panels, layouts, and resources.
 * Provides the main API for panel operations and state management.
 */
export class PanelManager implements IPanelManager {
  private registry: IPanelRegistry;
  private signalBus: SignalBus;
  private currentLayout: PanelLayout = PanelLayout.SINGLE;
  private activePanelId?: PanelId;
  private focusedPanelId?: PanelId;
  
  // Global coordinations
  private globalCoordinations = new Map<string, PanelCoordination>();
  
  constructor(
    signalBus: SignalBus = SignalBus.getInstance(),
    registry?: IPanelRegistry
  ) {
    this.signalBus = signalBus;
    this.registry = registry || new PanelRegistry();
    
    this.setupSignalHandlers();
    this.setupRegistryEventHandlers();
  }

  // Registry Access
  
  getRegistry(): IPanelRegistry {
    return this.registry;
  }

  // Panel Lifecycle
  
  async createPanel(config: PanelConfig): Promise<PanelAPI> {
    try {
      const panel = await this.registry.createPanel(config);
      
      // If this is the first panel, make it active
      if (!this.activePanelId) {
        this.activePanelId = panel.id;
        await panel.activate();
      }
      
      // Emit panel creation signal
      await this.emitSignal(SIGNAL_TYPES.SHOW_PANEL, {
        panelId: panel.id,
        focus: !this.activePanelId,
      });
      
      return panel;
      
    } catch (error) {
      throw new Error(`Failed to create panel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async destroyPanel(panelId: PanelId): Promise<void> {
    const panel = this.registry.getPanel(panelId);
    if (!panel) {
      return; // Panel doesn't exist
    }
    
    try {
      // If this is the active panel, switch to another one
      if (this.activePanelId === panelId) {
        const remainingPanels = this.registry.getPanels().filter(p => p.id !== panelId);
        if (remainingPanels.length > 0) {
          await this.switchToPanel(remainingPanels[0].id);
        } else {
          this.activePanelId = undefined;
        }
      }
      
      // Clear focus if this panel was focused
      if (this.focusedPanelId === panelId) {
        this.focusedPanelId = undefined;
      }
      
      // Destroy the panel
      await panel.destroy();
      this.registry.unregisterPanel(panelId);
      
      // Emit panel destruction signal
      await this.emitSignal(SIGNAL_TYPES.HIDE_PANEL, {
        panelId,
        reason: 'destroyed',
      });
      
    } catch (error) {
      throw new Error(`Failed to destroy panel '${panelId}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Panel Coordination
  
  async switchToPanel(panelId: PanelId): Promise<void> {
    const panel = this.registry.getPanel(panelId);
    if (!panel) {
      throw new Error(`Panel '${panelId}' not found`);
    }
    
    const previousPanelId = this.activePanelId;
    
    // Deactivate current panel
    if (previousPanelId && previousPanelId !== panelId) {
      const previousPanel = this.registry.getPanel(previousPanelId);
      if (previousPanel) {
        await previousPanel.deactivate();
      }
    }
    
    // Activate new panel
    await panel.activate();
    this.activePanelId = panelId;
    
    // Emit switch signal
    await this.emitSignal(SIGNAL_TYPES.SWITCH_PANEL, {
      fromPanelId: previousPanelId,
      toPanelId: panelId,
    });
    
    // Process global coordinations
    await this.processGlobalCoordinations('panel_switch', {
      fromPanelId: previousPanelId,
      toPanelId: panelId,
    });
  }

  async showPanel(panelId: PanelId): Promise<void> {
    const panel = this.registry.getPanel(panelId);
    if (!panel) {
      throw new Error(`Panel '${panelId}' not found`);
    }
    
    await panel.show();
    
    await this.emitSignal(SIGNAL_TYPES.SHOW_PANEL, {
      panelId,
    });
  }

  async hidePanel(panelId: PanelId): Promise<void> {
    const panel = this.registry.getPanel(panelId);
    if (!panel) {
      throw new Error(`Panel '${panelId}' not found`);
    }
    
    await panel.hide();
    
    // If hiding the active panel, switch to another one
    if (this.activePanelId === panelId) {
      const visiblePanels = this.registry.getPanels().filter(p => 
        p.id !== panelId && p.getState().visibility === PanelVisibility.VISIBLE
      );
      
      if (visiblePanels.length > 0) {
        await this.switchToPanel(visiblePanels[0].id);
      } else {
        this.activePanelId = undefined;
      }
    }
    
    await this.emitSignal(SIGNAL_TYPES.HIDE_PANEL, {
      panelId,
      reason: 'hidden',
    });
  }

  async focusPanel(panelId: PanelId, fromSignal = false): Promise<void> {
    const panel = this.registry.getPanel(panelId);
    if (!panel) {
      throw new Error(`Panel '${panelId}' not found`);
    }
    
    // Blur previously focused panel
    if (this.focusedPanelId && this.focusedPanelId !== panelId) {
      const previousPanel = this.registry.getPanel(this.focusedPanelId);
      if (previousPanel) {
        await previousPanel.blur();
      }
    }
    
    // Focus new panel
    await panel.focus();
    this.focusedPanelId = panelId;
    
    // Only emit signal if this wasn't triggered by a signal (prevent infinite loop)
    if (!fromSignal) {
      await this.emitSignal(SIGNAL_TYPES.FOCUS_PANEL, {
        panelId,
        focus: true,
      });
    }
  }

  // Layout Management
  
  async setLayout(layout: PanelLayout): Promise<void> {
    if (this.currentLayout === layout) {
      return; // No change needed
    }
    
    const previousLayout = this.currentLayout;
    this.currentLayout = layout;
    
    // Apply layout to all panels
    const panels = this.registry.getPanels();
    await this.applyLayoutToPanels(layout, panels);
    
    // Emit layout change signal
    await this.emitSignal(SIGNAL_TYPES.CUSTOM, {
      type: 'layout_changed',
      data: {
        previousLayout,
        currentLayout: layout,
        panels: panels.map(p => p.id),
      }
    });
  }

  getLayout(): PanelLayout {
    return this.currentLayout;
  }

  async optimizeLayout(): Promise<void> {
    const panels = this.registry.getPanels();
    const visiblePanels = panels.filter(p => p.getState().visibility === PanelVisibility.VISIBLE);
    
    // Choose optimal layout based on number of visible panels
    let optimalLayout: PanelLayout;
    
    if (visiblePanels.length <= 1) {
      optimalLayout = PanelLayout.SINGLE;
    } else if (visiblePanels.length === 2) {
      optimalLayout = PanelLayout.SPLIT_VERTICAL;
    } else if (visiblePanels.length <= 4) {
      optimalLayout = PanelLayout.TABBED;
    } else {
      optimalLayout = PanelLayout.FLOATING;
    }
    
    if (optimalLayout !== this.currentLayout) {
      await this.setLayout(optimalLayout);
    }
  }

  // Resource Coordination
  
  async moveResource(resourceId: ResourceId, fromPanelId: PanelId, toPanelId: PanelId): Promise<void> {
    const fromPanel = this.registry.getPanel(fromPanelId);
    const toPanel = this.registry.getPanel(toPanelId);
    
    if (!fromPanel) {
      throw new Error(`Source panel '${fromPanelId}' not found`);
    }
    
    if (!toPanel) {
      throw new Error(`Target panel '${toPanelId}' not found`);
    }
    
    const resource = fromPanel.getResource(resourceId);
    if (!resource) {
      throw new Error(`Resource '${resourceId}' not found in panel '${fromPanelId}'`);
    }
    
    // Remove from source panel
    await fromPanel.removeResource(resourceId);
    
    // Add to target panel
    await toPanel.addResource(resource);
    
    // Emit resource move signal
    await this.emitSignal(SIGNAL_TYPES.NAVIGATE_TO_RESOURCE, {
      resourceId,
      panelId: toPanelId,
      data: {
        previousPanelId: fromPanelId,
        action: 'moved',
      }
    });
  }

  async duplicateResource(resourceId: ResourceId, targetPanelId: PanelId): Promise<ResourceAPI> {
    const targetPanel = this.registry.getPanel(targetPanelId);
    if (!targetPanel) {
      throw new Error(`Target panel '${targetPanelId}' not found`);
    }
    
    // Find the resource in any panel
    let sourceResource: ResourceAPI | undefined;
    const panels = this.registry.getPanels();
    
    for (const panel of panels) {
      sourceResource = panel.getResource(resourceId);
      if (sourceResource) {
        break;
      }
    }
    
    if (!sourceResource) {
      throw new Error(`Resource '${resourceId}' not found in any panel`);
    }
    
    // Create a duplicate (this would need to be implemented based on resource type)
    // For now, we'll throw an error indicating this needs resource-specific implementation
    throw new Error('Resource duplication requires resource-specific implementation');
  }

  // State Management
  
  async saveState(): Promise<any> {
    const panels = this.registry.getPanels();
    const panelStates = panels.map(panel => ({
      id: panel.id,
      type: panel.type,
      config: panel.getConfig(),
      state: panel.getState(),
      metrics: panel.getMetrics(),
      resources: panel.getResources().map(resource => ({
        id: resource.id,
        type: resource.type,
        // Additional resource state would need to be serialized
      })),
    }));
    
    const managerState = {
      layout: this.currentLayout,
      activePanelId: this.activePanelId,
      focusedPanelId: this.focusedPanelId,
      panels: panelStates,
      globalCoordinations: Array.from(this.globalCoordinations.entries()),
      timestamp: Date.now(),
    };
    
    return managerState;
  }

  async loadState(state: any): Promise<void> {
    if (!state || !state.panels) {
      throw new Error('Invalid state data');
    }
    
    try {
      // Clear current state
      await this.resetState();
      
      // Restore layout
      this.currentLayout = state.layout || PanelLayout.SINGLE;
      this.activePanelId = state.activePanelId;
      this.focusedPanelId = state.focusedPanelId;
      
      // Restore global coordinations
      if (state.globalCoordinations) {
        this.globalCoordinations = new Map(state.globalCoordinations);
      }
      
      // Restore panels (this would need factory support for recreation)
      for (const panelData of state.panels) {
        const panel = await this.createPanel(panelData.config);
        
        // Restore panel state
        if (panelData.state) {
          panel.setState(panelData.state);
        }
        
        // Restore resources (would need resource factory support)
        // This is a placeholder - actual implementation would need resource recreation
      }
      
      // Apply layout
      const panels = this.registry.getPanels();
      await this.applyLayoutToPanels(this.currentLayout, panels);
      
    } catch (error) {
      throw new Error(`Failed to load state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async resetState(): Promise<void> {
    // Destroy all panels
    const panels = this.registry.getPanels();
    for (const panel of panels) {
      await this.destroyPanel(panel.id);
    }
    
    // Reset manager state
    this.currentLayout = PanelLayout.SINGLE;
    this.activePanelId = undefined;
    this.focusedPanelId = undefined;
    this.globalCoordinations.clear();
  }

  // Events and Coordination
  
  addGlobalCoordination(coordination: PanelCoordination): void {
    this.globalCoordinations.set(coordination.id, coordination);
  }

  removeGlobalCoordination(coordinationId: string): void {
    this.globalCoordinations.delete(coordinationId);
  }

  // Cleanup
  
  async cleanup(): Promise<void> {
    await this.resetState();
  }

  // Utility Methods
  
  getActivePanelId(): PanelId | undefined {
    return this.activePanelId;
  }

  getFocusedPanelId(): PanelId | undefined {
    return this.focusedPanelId;
  }

  getActivePanel(): PanelAPI | undefined {
    return this.activePanelId ? this.registry.getPanel(this.activePanelId) : undefined;
  }

  getFocusedPanel(): PanelAPI | undefined {
    return this.focusedPanelId ? this.registry.getPanel(this.focusedPanelId) : undefined;
  }

  // Private Methods
  
  private async emitSignal<TPayload = any>(
    signalType: string,
    payload: TPayload
  ): Promise<void> {
    await this.signalBus.emit({
      type: signalType,
      source: { panelId: 'panel-manager', resourceId: 'panel-manager' },
      payload,
      metadata: {
        timestamp: Date.now(),
      }
    });
  }

  private setupSignalHandlers(): void {
    // Handle resource navigation signals
    this.signalBus.onGlobal(SIGNAL_TYPES.NAVIGATE_TO_RESOURCE, async (signal: any) => {
      if (signal.payload.panelId) {
        await this.switchToPanel(signal.payload.panelId);
      }
    });
    
    // Handle panel focus requests
    this.signalBus.onGlobal(SIGNAL_TYPES.FOCUS_PANEL, async (signal: any) => {
      if (signal.payload.panelId) {
        await this.focusPanel(signal.payload.panelId, true);
      }
    });
  }

  private setupRegistryEventHandlers(): void {
    // Monitor panel creation and destruction
    this.registry.onPanelCreated((panel) => {
      // Set up panel coordination
      this.setupPanelCoordination(panel);
    });
    
    this.registry.onPanelDestroyed((panelId) => {
      // Clean up panel references
      if (this.activePanelId === panelId) {
        this.activePanelId = undefined;
      }
      if (this.focusedPanelId === panelId) {
        this.focusedPanelId = undefined;
      }
    });
  }

  private setupPanelCoordination(panel: PanelAPI): void {
    // Apply global coordinations to the new panel
    for (const coordination of this.globalCoordinations.values()) {
      if (coordination.panels.includes(panel.id) || coordination.panels.includes('*')) {
        panel.addCoordination(coordination);
      }
    }
  }

  private async processGlobalCoordinations(eventType: string, eventData: any): Promise<void> {
    const relevantPanels = this.registry.getPanels();
    
    for (const coordination of this.globalCoordinations.values()) {
      const targetPanels = coordination.panels.includes('*') 
        ? relevantPanels 
        : relevantPanels.filter(p => coordination.panels.includes(p.id));
      
      if (targetPanels.length > 0) {
        try {
          await coordination.handler(eventData, targetPanels);
        } catch (error) {
          console.error(`Global coordination '${coordination.id}' failed:`, error);
        }
      }
    }
  }

  private async applyLayoutToPanels(layout: PanelLayout, panels: PanelAPI[]): Promise<void> {
    // This is a placeholder for layout-specific positioning logic
    // Actual implementation would depend on the UI framework being used
    
    switch (layout) {
      case PanelLayout.SINGLE: {
        // Show only active panel, hide others
        for (const panel of panels) {
          if (panel.id === this.activePanelId) {
            await panel.show();
          } else {
            await panel.hide();
          }
        }
        break;
      }
        
      case PanelLayout.SPLIT_VERTICAL:
      case PanelLayout.SPLIT_HORIZONTAL: {
        // Show up to 2 panels side by side
        const visiblePanels = panels.slice(0, 2);
        for (let i = 0; i < panels.length; i++) {
          if (i < visiblePanels.length) {
            await panels[i].show();
          } else {
            await panels[i].hide();
          }
        }
        break;
      }
        
      case PanelLayout.TABBED: {
        // All panels visible but only active one focused
        for (const panel of panels) {
          await panel.show();
        }
        break;
      }
        
      case PanelLayout.FLOATING: {
        // All panels visible and independently positioned
        for (const panel of panels) {
          await panel.show();
        }
        break;
      }
    }
  }
}

export default PanelManager; 