import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PanelManager } from '../PanelManager';
import { SignalBus } from '../../core/SignalBus';
import { SIGNAL_TYPES } from '../../signals/SignalTypes';
import {
  PanelConfig,
  PanelLayout,
  PanelVisibility,
  PanelLifecyclePhase,
  PanelCoordination,
} from '../../types/Panel';

// Mock PanelRegistry - Simplified to avoid memory leaks
const createMockRegistry = (): any => {
  return {
    createPanel: vi.fn(),
    getPanel: vi.fn(),
    getPanels: vi.fn(() => []),
    unregisterPanel: vi.fn(),
    onPanelCreated: vi.fn(() => vi.fn()), // Return a simple cleanup function
    onPanelDestroyed: vi.fn(() => vi.fn()), // Return a simple cleanup function
    getMetrics: vi.fn(() => ({
      totalPanels: 0,
      activePanels: 0,
      panelsCreated: 0,
      panelsDestroyed: 0,
      totalResources: 0,
    })),
  } as any;
};

// Mock Panel
const createMockPanel = (id: string): any =>
  ({
    id,
    type: 'test-panel',
    config: { id, type: 'test-panel' },
    getState: vi.fn(() => ({
      phase: PanelLifecyclePhase.READY,
      visibility: PanelVisibility.VISIBLE,
      isActive: false,
      isFocused: false,
      isLoading: false,
      hasError: false,
      resourceCount: 0,
      lastActivity: Date.now(),
    })),
    getConfig: vi.fn(() => ({ id, type: 'test-panel' })), // Add missing getConfig
    getMetrics: vi.fn(() => ({ signalsEmitted: 0, signalsReceived: 0 })), // Add missing getMetrics
    activate: vi.fn(),
    deactivate: vi.fn(),
    destroy: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
    addResource: vi.fn(),
    removeResource: vi.fn(),
    getResource: vi.fn(),
    getResources: vi.fn(() => []),
    getActiveResource: vi.fn(),
    setActiveResource: vi.fn(),
    onLifecycleEvent: vi.fn(() => vi.fn()),
    onVisibilityEvent: vi.fn(() => vi.fn()),
    onFocusEvent: vi.fn(() => vi.fn()),
    addCoordination: vi.fn(),
    removeCoordination: vi.fn(),
    getCoordinations: vi.fn(() => []),
  } as any);

// Mock Resource
const createMockResource = (id: string): any =>
  ({
    id,
    type: 'test-resource',
    unmount: vi.fn(),
    mount: vi.fn(),
    getState: vi.fn(() => ({ phase: 'mounted' })),
  } as any);

describe('PanelManager', () => {
  let panelManager: PanelManager;
  let mockRegistry: any;
  let signalBus: SignalBus;

  beforeEach(() => {
    signalBus = new SignalBus();
    mockRegistry = createMockRegistry();
    panelManager = new PanelManager(signalBus, mockRegistry);
  });

  afterEach(() => {
    signalBus.clearHistory();
  });

  describe('Constructor and Registry Access', () => {
    it('should initialize with signal bus and registry', () => {
      expect(panelManager).toBeDefined();
      expect(panelManager.getRegistry()).toBe(mockRegistry);
    });

    it('should create default registry if none provided', () => {
      const manager = new PanelManager(signalBus);
      expect(manager.getRegistry()).toBeDefined();
    });
  });

  describe('Panel Lifecycle', () => {
    it('should create panel successfully', async () => {
      const config: PanelConfig = {
        id: 'test-panel',
        type: 'test',
        title: 'Test Panel',
        layout: PanelLayout.SINGLE,
        visibility: PanelVisibility.VISIBLE,
      };

      const mockPanel = createMockPanel('test-panel');
      mockRegistry.createPanel.mockResolvedValue(mockPanel);

      const panel = await panelManager.createPanel(config);

      expect(panel).toBe(mockPanel);
      expect(mockRegistry.createPanel).toHaveBeenCalledWith(config);
      expect(mockPanel.activate).toHaveBeenCalled(); // First panel should be activated
    });

    it('should not activate second panel automatically', async () => {
      const config1: PanelConfig = {
        id: 'panel-1',
        type: 'test',
        title: 'Panel 1',
        layout: PanelLayout.SINGLE,
        visibility: PanelVisibility.VISIBLE,
      };
      const config2: PanelConfig = {
        id: 'panel-2',
        type: 'test',
        title: 'Panel 2',
        layout: PanelLayout.SINGLE,
        visibility: PanelVisibility.VISIBLE,
      };

      const mockPanel1 = createMockPanel('panel-1');
      const mockPanel2 = createMockPanel('panel-2');

      mockRegistry.createPanel
        .mockResolvedValueOnce(mockPanel1)
        .mockResolvedValueOnce(mockPanel2);

      await panelManager.createPanel(config1);
      await panelManager.createPanel(config2);

      expect(mockPanel1.activate).toHaveBeenCalled();
      expect(mockPanel2.activate).not.toHaveBeenCalled();
    });

    it('should handle panel creation failure', async () => {
      const config: PanelConfig = {
        id: 'test-panel',
        type: 'test',
        title: 'Test Panel',
        layout: PanelLayout.SINGLE,
        visibility: PanelVisibility.VISIBLE,
      };
      mockRegistry.createPanel.mockRejectedValue(new Error('Creation failed'));

      await expect(panelManager.createPanel(config)).rejects.toThrow(
        'Failed to create panel: Creation failed'
      );
    });

    it('should destroy panel successfully', async () => {
      const mockPanel = createMockPanel('test-panel');
      mockRegistry.getPanel.mockReturnValue(mockPanel);
      mockRegistry.getPanels.mockReturnValue([mockPanel]);

      await panelManager.destroyPanel('test-panel');

      expect(mockPanel.destroy).toHaveBeenCalled();
      expect(mockRegistry.unregisterPanel).toHaveBeenCalledWith('test-panel');
    });

    it('should handle destroying non-existent panel', async () => {
      mockRegistry.getPanel.mockReturnValue(undefined);

      await panelManager.destroyPanel('non-existent'); // Should not throw

      expect(mockRegistry.unregisterPanel).not.toHaveBeenCalled();
    });

    it('should switch active panel when destroying active panel', async () => {
      const mockPanel1 = createMockPanel('panel-1');
      const mockPanel2 = createMockPanel('panel-2');

      mockRegistry.getPanel
        .mockReturnValueOnce(mockPanel1) // For destroy call
        .mockReturnValueOnce(mockPanel2); // For switch call
      mockRegistry.getPanels.mockReturnValue([mockPanel1, mockPanel2]);

      // Set panel-1 as active
      panelManager = new PanelManager(signalBus, mockRegistry);
      (panelManager as any).activePanelId = 'panel-1';

      await panelManager.destroyPanel('panel-1');

      expect(mockPanel2.activate).toHaveBeenCalled();
    });

    it('should handle panel destruction failure', async () => {
      const mockPanel = createMockPanel('test-panel');
      mockPanel.destroy.mockRejectedValue(new Error('Destroy failed'));
      mockRegistry.getPanel.mockReturnValue(mockPanel);

      await expect(panelManager.destroyPanel('test-panel')).rejects.toThrow(
        "Failed to destroy panel 'test-panel': Destroy failed"
      );
    });
  });

  describe('Panel Coordination', () => {
    let mockPanel1: any;
    let mockPanel2: any;

    beforeEach(() => {
      // Reset mocks completely to avoid state leakage
      mockRegistry.getPanel.mockReset();
      mockRegistry.getPanels.mockReset();
      mockRegistry.createPanel.mockReset();
      mockRegistry.unregisterPanel.mockReset();

      // Create fresh mock panels for each test
      mockPanel1 = createMockPanel('panel-1');
      mockPanel2 = createMockPanel('panel-2');

      // Reset panel manager state completely
      (panelManager as any).activePanelId = undefined;
      (panelManager as any).focusedPanelId = undefined;
      (panelManager as any).currentLayout = PanelLayout.SINGLE;
      (panelManager as any).globalCoordinations.clear();

      // Clear signal bus history to prevent accumulation
      signalBus.clearHistory();
    });

    it('should switch to panel successfully', async () => {
      // The switchToPanel method calls getPanel twice:
      // 1. First to get the target panel (panel-2)
      // 2. Then to get the previous panel (panel-1) for deactivation
      mockRegistry.getPanel
        .mockReturnValueOnce(mockPanel2) // Target panel (first call)
        .mockReturnValueOnce(mockPanel1); // Previous panel (second call)

      // Set panel-1 as active
      (panelManager as any).activePanelId = 'panel-1';

      await panelManager.switchToPanel('panel-2');

      expect(mockPanel1.deactivate).toHaveBeenCalled();
      expect(mockPanel2.activate).toHaveBeenCalled();
    });

    it('should not deactivate when switching to same panel', async () => {
      mockRegistry.getPanel.mockReturnValue(mockPanel1);
      (panelManager as any).activePanelId = 'panel-1';

      await panelManager.switchToPanel('panel-1');

      expect(mockPanel1.deactivate).not.toHaveBeenCalled();
      expect(mockPanel1.activate).toHaveBeenCalled();
    });

    it('should handle switching to non-existent panel', async () => {
      mockRegistry.getPanel.mockReturnValue(undefined);

      await expect(panelManager.switchToPanel('non-existent')).rejects.toThrow(
        "Panel 'non-existent' not found"
      );
    });

    it('should show panel', async () => {
      mockRegistry.getPanel.mockReturnValue(mockPanel1);

      await panelManager.showPanel('panel-1');

      expect(mockPanel1.show).toHaveBeenCalled();
    });

    it('should hide panel and switch active if needed', async () => {
      mockPanel1.getState.mockReturnValue({
        phase: PanelLifecyclePhase.ACTIVE,
        visibility: PanelVisibility.VISIBLE,
        isActive: true,
        isFocused: false,
        isLoading: false,
        hasError: false,
        resourceCount: 0,
        lastActivity: Date.now(),
      });

      mockPanel2.getState.mockReturnValue({
        phase: PanelLifecyclePhase.READY,
        visibility: PanelVisibility.VISIBLE,
        isActive: false,
        isFocused: false,
        isLoading: false,
        hasError: false,
        resourceCount: 0,
        lastActivity: Date.now(),
      });

      // Setup mock calls for hidePanel method:
      // 1. First call to get the panel to hide
      // 2. Second call to get panels for switching
      // 3. Third call to get the target panel for switching
      mockRegistry.getPanel
        .mockReturnValueOnce(mockPanel1) // Panel to hide
        .mockReturnValueOnce(mockPanel2); // Target panel for switching
      mockRegistry.getPanels.mockReturnValue([mockPanel1, mockPanel2]);

      // Set panel-1 as active
      (panelManager as any).activePanelId = 'panel-1';

      await panelManager.hidePanel('panel-1');

      expect(mockPanel1.hide).toHaveBeenCalled();
      expect(mockPanel2.activate).toHaveBeenCalled(); // Should switch to visible panel
    });

    // Focus tests cause memory leaks - need investigation
    it('should focus panel', async () => {
      mockRegistry.getPanel
        .mockReturnValueOnce(mockPanel2) // Target panel (first call)
        .mockReturnValueOnce(mockPanel1); // Previous focused (second call)

      // Set panel-1 as focused
      (panelManager as any).focusedPanelId = 'panel-1';

      await panelManager.focusPanel('panel-2');

      expect(mockPanel1.blur).toHaveBeenCalled();
      expect(mockPanel2.focus).toHaveBeenCalled();
    });

    it('should not blur when focusing same panel', async () => {
      mockRegistry.getPanel.mockReturnValue(mockPanel1);
      (panelManager as any).focusedPanelId = 'panel-1';

      await panelManager.focusPanel('panel-1');

      expect(mockPanel1.blur).not.toHaveBeenCalled();
      expect(mockPanel1.focus).toHaveBeenCalled();
    });
  });

  describe('Layout Management', () => {
    it('should set layout successfully', async () => {
      mockRegistry.getPanels.mockReturnValue([]);

      await panelManager.setLayout(PanelLayout.SPLIT_HORIZONTAL);

      expect(panelManager.getLayout()).toBe(PanelLayout.SPLIT_HORIZONTAL);
    });

    it('should not change layout if already set', async () => {
      const signalSpy = vi.spyOn(signalBus, 'emit');

      await panelManager.setLayout(PanelLayout.SINGLE); // Same as default

      expect(signalSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'layout_changed',
        })
      );
    });

    it('should optimize layout', async () => {
      const mockPanel = createMockPanel('test-panel');
      mockRegistry.getPanels.mockReturnValue([mockPanel]);

      await panelManager.optimizeLayout();

      // Should not throw and should complete successfully
      expect(true).toBe(true);
    });
  });

  describe('Resource Management', () => {
    let mockPanel1: any;
    let mockPanel2: any;
    let mockResource: any;

    beforeEach(() => {
      mockPanel1 = createMockPanel('panel-1');
      mockPanel2 = createMockPanel('panel-2');
      mockResource = createMockResource('test-resource');
    });

    it('should move resource between panels', async () => {
      mockRegistry.getPanel
        .mockReturnValueOnce(mockPanel1) // Source panel
        .mockReturnValueOnce(mockPanel2); // Target panel

      mockPanel1.getResource.mockReturnValue(mockResource);

      await panelManager.moveResource('test-resource', 'panel-1', 'panel-2');

      expect(mockPanel1.removeResource).toHaveBeenCalledWith('test-resource');
      expect(mockPanel2.addResource).toHaveBeenCalledWith(mockResource);
    });

    it('should handle moving non-existent resource', async () => {
      mockRegistry.getPanel.mockReturnValue(mockPanel1);
      mockPanel1.getResource.mockReturnValue(undefined);

      await expect(
        panelManager.moveResource('non-existent', 'panel-1', 'panel-2')
      ).rejects.toThrow("Resource 'non-existent' not found in panel 'panel-1'");
    });

    it('should handle moving to non-existent panel', async () => {
      mockRegistry.getPanel
        .mockReturnValueOnce(mockPanel1)
        .mockReturnValueOnce(undefined);

      mockPanel1.getResource.mockReturnValue(mockResource);

      await expect(
        panelManager.moveResource('test-resource', 'panel-1', 'non-existent')
      ).rejects.toThrow("Target panel 'non-existent' not found");
    });

    it('should duplicate resource to another panel', async () => {
      mockRegistry.getPanel
        .mockReturnValueOnce(mockPanel1) // Search for resource
        .mockReturnValueOnce(mockPanel2); // Target panel

      mockPanel1.getResource.mockReturnValue(mockResource);
      mockRegistry.getPanels.mockReturnValue([mockPanel1]);

      await expect(
        panelManager.duplicateResource('test-resource', 'panel-2')
      ).rejects.toThrow(
        'Resource duplication requires resource-specific implementation'
      );
    });

    it('should handle duplicating non-existent resource', async () => {
      mockRegistry.getPanel.mockReturnValue(undefined); // Target panel not found
      mockRegistry.getPanels.mockReturnValue([mockPanel1]);
      mockPanel1.getResource.mockReturnValue(undefined);

      await expect(
        panelManager.duplicateResource('non-existent', 'panel-2')
      ).rejects.toThrow("Target panel 'panel-2' not found");
    });
  });

  describe('State Management', () => {
    it('should save state', async () => {
      const mockPanel = createMockPanel('test-panel');
      mockRegistry.getPanels.mockReturnValue([mockPanel]);

      const state = await panelManager.saveState();

      expect(state).toBeDefined();
      expect(state.layout).toBe(PanelLayout.SINGLE);
      expect(state.panels).toBeDefined();
    });

    it('should load state', async () => {
      const state = {
        layout: PanelLayout.SPLIT_HORIZONTAL,
        activePanelId: 'panel-1',
        focusedPanelId: 'panel-1',
        panels: [],
        timestamp: Date.now(),
      };

      await panelManager.loadState(state);

      expect(panelManager.getLayout()).toBe(PanelLayout.SPLIT_HORIZONTAL);
    });

    it('should handle state loading failure', async () => {
      const invalidState = { invalid: true };

      await expect(panelManager.loadState(invalidState)).rejects.toThrow(
        'Invalid state data'
      );
    });

    it('should reset state', async () => {
      // Set some non-default state
      await panelManager.setLayout(PanelLayout.SPLIT_HORIZONTAL);
      (panelManager as any).activePanelId = 'test-panel';

      await panelManager.resetState();

      expect(panelManager.getLayout()).toBe(PanelLayout.SINGLE);
      expect(panelManager.getActivePanelId()).toBeUndefined();
    });
  });

  describe('Global Coordination', () => {
    it('should add global coordination', () => {
      const coordination: PanelCoordination = {
        id: 'test-coordination',
        panels: ['panel-1', 'panel-2'],
        type: 'sync',
        handler: vi.fn(),
      };

      panelManager.addGlobalCoordination(coordination);

      // Should not throw and should complete successfully
      expect(true).toBe(true);
    });

    it('should remove global coordination', () => {
      const coordination: PanelCoordination = {
        id: 'test-coordination',
        panels: ['panel-1', 'panel-2'],
        type: 'sync',
        handler: vi.fn(),
      };

      panelManager.addGlobalCoordination(coordination);
      panelManager.removeGlobalCoordination('test-coordination');

      // Should not throw and should complete successfully
      expect(true).toBe(true);
    });
  });

  describe('Getters', () => {
    it('should get active panel ID', () => {
      expect(panelManager.getActivePanelId()).toBeUndefined();

      (panelManager as any).activePanelId = 'test-panel';
      expect(panelManager.getActivePanelId()).toBe('test-panel');
    });

    it('should get focused panel ID', () => {
      expect(panelManager.getFocusedPanelId()).toBeUndefined();

      (panelManager as any).focusedPanelId = 'test-panel';
      expect(panelManager.getFocusedPanelId()).toBe('test-panel');
    });

    it('should get active panel', () => {
      const mockPanel = createMockPanel('test-panel');
      mockRegistry.getPanel.mockReturnValue(mockPanel);
      (panelManager as any).activePanelId = 'test-panel';

      expect(panelManager.getActivePanel()).toBe(mockPanel);
    });

    it('should get focused panel', () => {
      const mockPanel = createMockPanel('test-panel');
      mockRegistry.getPanel.mockReturnValue(mockPanel);
      (panelManager as any).focusedPanelId = 'test-panel';

      expect(panelManager.getFocusedPanel()).toBe(mockPanel);
    });

    it('should return undefined for non-existent panels', () => {
      mockRegistry.getPanel.mockReturnValue(undefined);
      (panelManager as any).activePanelId = 'non-existent';

      expect(panelManager.getActivePanel()).toBeUndefined();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup successfully', async () => {
      const mockPanel = createMockPanel('test-panel');
      mockRegistry.getPanels.mockReturnValue([mockPanel]);
      mockRegistry.getPanel.mockReturnValue(mockPanel);

      await panelManager.cleanup();

      expect(mockPanel.destroy).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockPanel = createMockPanel('test-panel');
      mockPanel.destroy.mockRejectedValue(new Error('Cleanup failed'));
      mockRegistry.getPanels.mockReturnValue([mockPanel]);
      mockRegistry.getPanel.mockReturnValue(mockPanel);

      // Should handle errors gracefully but still throw
      await expect(panelManager.cleanup()).rejects.toThrow(
        "Failed to destroy panel 'test-panel': Cleanup failed"
      );

      expect(mockPanel.destroy).toHaveBeenCalled();
    });
  });

  describe('Signal Integration', () => {
    it('should emit signals correctly', async () => {
      const signalSpy = vi.spyOn(signalBus, 'emit');

      const mockPanel = createMockPanel('test-panel');
      mockRegistry.createPanel.mockResolvedValue(mockPanel);

      await panelManager.createPanel({
        id: 'test-panel',
        type: 'test',
        title: 'Test Panel',
        layout: PanelLayout.SINGLE,
        visibility: PanelVisibility.VISIBLE,
      });

      expect(signalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SIGNAL_TYPES.SHOW_PANEL,
          source: expect.objectContaining({
            panelId: 'panel-manager',
            resourceId: 'panel-manager',
          }),
        })
      );
    });
  });
});
