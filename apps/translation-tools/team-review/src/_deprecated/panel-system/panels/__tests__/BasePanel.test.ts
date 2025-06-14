import { BasePanel } from '../BasePanel';
import { SignalBus } from '../../core/SignalBus';
import { SIGNAL_TYPES } from '../../signals/SignalTypes';
import { 
  PanelConfig, 
  PanelLifecyclePhase, 
  PanelVisibility, 
  PanelLayout,
  PanelLifecycleEvent,
  PanelVisibilityEvent,
  PanelFocusEvent
} from '../../types/Panel';
import { ResourceAPI } from '../../types/Resource';
import { vi } from 'vitest';

// Mock concrete implementation of BasePanel for testing
class TestPanel extends BasePanel {
  private initializeCallCount = 0;
  private destroyCallCount = 0;
  private renderCallCount = 0;
  private shouldFailInitialize = false;
  private shouldFailDestroy = false;

  render() {
    this.renderCallCount++;
    return `<div>Test Panel ${this.id}</div>`;
  }

  protected async initializePanel(): Promise<void> {
    this.initializeCallCount++;
    if (this.shouldFailInitialize) {
      throw new Error('Initialize failed');
    }
    // Simulate async initialization
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  protected async destroyPanel(): Promise<void> {
    this.destroyCallCount++;
    if (this.shouldFailDestroy) {
      throw new Error('Destroy failed');
    }
    // Simulate async cleanup
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  // Test helpers
  getInitializeCallCount() { return this.initializeCallCount; }
  getDestroyCallCount() { return this.destroyCallCount; }
  getRenderCallCount() { return this.renderCallCount; }
  setInitializeFailure(shouldFail: boolean) { this.shouldFailInitialize = shouldFail; }
  setDestroyFailure(shouldFail: boolean) { this.shouldFailDestroy = shouldFail; }
}

// Mock resource for testing
const createMockResource = (id: string): ResourceAPI => ({
  id,
  type: 'test-resource',
  panelId: 'test-panel',
  unmount: vi.fn(),
  mount: vi.fn(),
  setState: vi.fn(),
  onSignal: vi.fn(() => vi.fn()),
  emitSignal: vi.fn(),
  getState: vi.fn(() => ({ 
    phase: 'mounted',
    isVisible: true,
    isFocused: false,
    isHighlighted: false,
    isLoading: false,
    hasError: false
  })),
  cleanup: vi.fn(),
} as any);

describe('BasePanel', () => {
  let signalBus: SignalBus;
  let config: PanelConfig;
  let panel: TestPanel;

  beforeEach(() => {
    signalBus = new SignalBus();
    config = {
      id: 'test-panel',
      type: 'test',
      title: 'Test Panel',
      visibility: PanelVisibility.HIDDEN,
      layout: PanelLayout.SINGLE,
    };
    panel = new TestPanel(config, signalBus);
  });

  afterEach(() => {
    // SignalBus doesn't have destroy method based on coverage
    signalBus.clearHistory();
  });

  describe('Constructor and Basic Properties', () => {
    it('should initialize with correct properties', () => {
      expect(panel.id).toBe('test-panel');
      expect(panel.type).toBe('test');
      expect(panel.config.title).toBe('Test Panel');
    });

    it('should have initial state set correctly', () => {
      const state = panel.getState();
      expect(state.phase).toBe(PanelLifecyclePhase.CREATED);
      expect(state.visibility).toBe(PanelVisibility.HIDDEN);
      expect(state.isActive).toBe(false);
      expect(state.isFocused).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.hasError).toBe(false);
      expect(state.resourceCount).toBe(0);
    });

    it('should have initial metrics set correctly', () => {
      const metrics = panel.getMetrics();
      expect(metrics.createdAt).toBeGreaterThan(0);
      expect(metrics.lastActivated).toBe(0);
      expect(metrics.totalActivations).toBe(0);
      expect(metrics.totalTimeActive).toBe(0);
      expect(metrics.resourcesLoaded).toBe(0);
      expect(metrics.resourcesUnloaded).toBe(0);
      expect(metrics.signalsEmitted).toBe(0);
      expect(metrics.signalsReceived).toBe(0);
      expect(metrics.errors).toBe(0);
    });
  });

  describe('Lifecycle Management', () => {
    it('should initialize successfully', async () => {
      await panel.initialize();
      
      expect(panel.getInitializeCallCount()).toBe(1);
      expect(panel.getState().phase).toBe(PanelLifecyclePhase.READY);
      expect(panel.getState().isLoading).toBe(false);
    });

    it('should not allow initialization from non-created phase', async () => {
      await panel.initialize();
      
      await expect(panel.initialize()).rejects.toThrow(
        'Cannot initialize panel in ready phase'
      );
    });

    it('should handle initialization failure', async () => {
      panel.setInitializeFailure(true);
      
      await expect(panel.initialize()).rejects.toThrow('Initialize failed');
      expect(panel.getState().phase).toBe(PanelLifecyclePhase.ERROR);
      expect(panel.getState().hasError).toBe(true);
      expect(panel.getMetrics().errors).toBe(1);
    });

    it('should activate panel', async () => {
      await panel.initialize();
      await panel.activate();
      
      expect(panel.getState().phase).toBe(PanelLifecyclePhase.ACTIVE);
      expect(panel.getState().isActive).toBe(true);
      expect(panel.getMetrics().totalActivations).toBe(1);
    });

    it('should initialize during activation if not ready', async () => {
      await panel.activate();
      
      expect(panel.getInitializeCallCount()).toBe(1);
      expect(panel.getState().phase).toBe(PanelLifecyclePhase.ACTIVE);
      expect(panel.getState().isActive).toBe(true);
    });

    it('should not allow activation from error state', async () => {
      panel.setInitializeFailure(true);
      await expect(panel.initialize()).rejects.toThrow();
      
      await expect(panel.activate()).rejects.toThrow(
        'Cannot activate panel in error state'
      );
    });

    it('should deactivate panel', async () => {
      await panel.activate();
      await panel.deactivate();
      
      expect(panel.getState().phase).toBe(PanelLifecyclePhase.INACTIVE);
      expect(panel.getState().isActive).toBe(false);
      expect(panel.getState().isFocused).toBe(false);
    });

    it('should handle deactivation when already inactive', async () => {
      await panel.initialize();
      await panel.deactivate(); // Should not throw
      
      expect(panel.getState().isActive).toBe(false);
    });

    it('should destroy panel', async () => {
      await panel.initialize();
      await panel.destroy();
      
      expect(panel.getDestroyCallCount()).toBe(1);
      expect(panel.getState().phase).toBe(PanelLifecyclePhase.DESTROYED);
    });

    it('should handle multiple destroy calls', async () => {
      await panel.initialize();
      await panel.destroy();
      await panel.destroy(); // Should not throw or call destroyPanel again
      
      expect(panel.getDestroyCallCount()).toBe(1);
    });

    it('should handle destroy failure', async () => {
      await panel.initialize();
      panel.setDestroyFailure(true);
      
      await expect(panel.destroy()).rejects.toThrow('Destroy failed');
      expect(panel.getState().phase).toBe(PanelLifecyclePhase.ERROR);
      expect(panel.getMetrics().errors).toBe(1);
    });
  });

  describe('State Management', () => {
    it('should update state correctly', () => {
      const initialState = panel.getState();
      
      panel.setState({ isLoading: true, hasError: true });
      
      const newState = panel.getState();
      expect(newState.isLoading).toBe(true);
      expect(newState.hasError).toBe(true);
      expect(newState.phase).toBe(initialState.phase); // Should preserve other properties
    });

    it('should emit state change signal when state updates', async () => {
      const signalSpy = vi.spyOn(signalBus, 'emit');
      
      panel.setState({ isLoading: true });
      
      expect(signalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SIGNAL_TYPES.RESOURCE_STATE_CHANGED,
          payload: expect.objectContaining({
            panelId: 'test-panel',
            state: expect.objectContaining({ isLoading: true }),
          }),
        })
      );
    });
  });

  describe('Visibility Management', () => {
    it('should show panel', async () => {
      await panel.show();
      
      expect(panel.getState().visibility).toBe(PanelVisibility.VISIBLE);
      expect(panel.config.visibility).toBe(PanelVisibility.VISIBLE);
    });

    it('should hide panel', async () => {
      await panel.show();
      await panel.hide();
      
      expect(panel.getState().visibility).toBe(PanelVisibility.HIDDEN);
    });

    it('should minimize panel', async () => {
      await panel.minimize();
      
      expect(panel.getState().visibility).toBe(PanelVisibility.MINIMIZED);
    });

    it('should maximize panel', async () => {
      await panel.maximize();
      
      expect(panel.getState().visibility).toBe(PanelVisibility.MAXIMIZED);
    });

    it('should not change visibility if already set', async () => {
      await panel.show();
      const signalSpy = vi.spyOn(signalBus, 'emit');
      signalSpy.mockClear();
      
      await panel.show(); // Should not emit signal
      
      expect(signalSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: SIGNAL_TYPES.PANEL_VISIBILITY_CHANGED,
        })
      );
    });

    it('should emit visibility change signal', async () => {
      const signalSpy = vi.spyOn(signalBus, 'emit');
      
      await panel.show();
      
      expect(signalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SIGNAL_TYPES.PANEL_VISIBILITY_CHANGED,
          payload: expect.objectContaining({
            panelId: 'test-panel',
            visibility: PanelVisibility.VISIBLE,
            isVisible: true,
          }),
        })
      );
    });
  });

  describe('Focus Management', () => {
    it('should focus panel', async () => {
      await panel.focus();
      
      expect(panel.getState().isFocused).toBe(true);
      expect(panel.isFocused()).toBe(true);
    });

    it('should blur panel', async () => {
      await panel.focus();
      await panel.blur();
      
      expect(panel.getState().isFocused).toBe(false);
      expect(panel.isFocused()).toBe(false);
    });

    it('should not focus if already focused', async () => {
      await panel.focus();
      const signalSpy = vi.spyOn(signalBus, 'emit');
      signalSpy.mockClear();
      
      await panel.focus(); // Should not emit signal
      
      expect(signalSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: SIGNAL_TYPES.FOCUS_PANEL,
        })
      );
    });

    it('should not blur if already blurred', async () => {
      const signalSpy = vi.spyOn(signalBus, 'emit');
      
      await panel.blur(); // Should not emit signal
      
      expect(signalSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: SIGNAL_TYPES.FOCUS_PANEL,
        })
      );
    });
  });

  describe('Resource Management', () => {
    let mockResource: ResourceAPI;

    beforeEach(() => {
      mockResource = createMockResource('test-resource-1');
    });

    it('should add resource', async () => {
      await panel.addResource(mockResource);
      
      expect(panel.getState().resourceCount).toBe(1);
      expect(panel.getState().activeResourceId).toBe('test-resource-1');
      expect(panel.getResource('test-resource-1')).toBe(mockResource);
      expect(panel.getMetrics().resourcesLoaded).toBe(1);
    });

    it('should not add duplicate resource', async () => {
      await panel.addResource(mockResource);
      
      await expect(panel.addResource(mockResource)).rejects.toThrow(
        'Resource test-resource-1 already exists in panel test-panel'
      );
    });

    it('should remove resource', async () => {
      await panel.addResource(mockResource);
      await panel.removeResource('test-resource-1');
      
      expect(panel.getState().resourceCount).toBe(0);
      expect(panel.getState().activeResourceId).toBeUndefined();
      expect(panel.getResource('test-resource-1')).toBeUndefined();
      expect(panel.getMetrics().resourcesUnloaded).toBe(1);
      expect(mockResource.unmount).toHaveBeenCalled();
    });

    it('should handle removing non-existent resource', async () => {
      await panel.removeResource('non-existent'); // Should not throw
      expect(panel.getState().resourceCount).toBe(0);
    });

    it('should set active resource', async () => {
      await panel.addResource(mockResource);
      const mockResource2 = createMockResource('test-resource-2');
      await panel.addResource(mockResource2);
      
      await panel.setActiveResource('test-resource-2');
      
      expect(panel.getState().activeResourceId).toBe('test-resource-2');
      expect(panel.getActiveResource()).toBe(mockResource2);
    });

    it('should not set non-existent resource as active', async () => {
      await expect(panel.setActiveResource('non-existent')).rejects.toThrow(
        'Resource non-existent not found in panel test-panel'
      );
    });

    it('should get all resources', async () => {
      await panel.addResource(mockResource);
      const mockResource2 = createMockResource('test-resource-2');
      await panel.addResource(mockResource2);
      
      const resources = panel.getResources();
      expect(resources).toHaveLength(2);
      expect(resources).toContain(mockResource);
      expect(resources).toContain(mockResource2);
    });

    it('should update active resource when removing current active', async () => {
      await panel.addResource(mockResource);
      const mockResource2 = createMockResource('test-resource-2');
      await panel.addResource(mockResource2);
      
      // First resource should be active
      expect(panel.getState().activeResourceId).toBe('test-resource-1');
      
      // Remove active resource
      await panel.removeResource('test-resource-1');
      
      // Second resource should become active
      expect(panel.getState().activeResourceId).toBe('test-resource-2');
    });
  });

  describe('Signal Handling', () => {
    it('should register and handle signals', async () => {
      const handler = vi.fn();
      const unsubscribe = panel.onSignal('test-signal', handler);
      
      await signalBus.emit({
        type: 'test-signal',
        source: { panelId: 'other-panel', resourceId: 'other-resource' },
        target: { panelId: 'test-panel' }, // Target the specific panel
        payload: { test: 'data' },
        metadata: { timestamp: Date.now() },
      });
      
      expect(handler).toHaveBeenCalled();
      
      unsubscribe();
    });

    it('should emit signals correctly', async () => {
      const signalSpy = vi.spyOn(signalBus, 'emit');
      
      await panel.emitSignal('test-signal', { test: 'data' });
      
      expect(signalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test-signal',
          source: { 
            panelId: 'test-panel',
            resourceId: 'panel-system' // fallback when no active resource
          },
          payload: { test: 'data' },
        })
      );
      
      expect(panel.getMetrics().signalsEmitted).toBe(1);
    });

    it('should use active resource in signal source', async () => {
      const mockResource = createMockResource('test-resource');
      await panel.addResource(mockResource);
      
      const signalSpy = vi.spyOn(signalBus, 'emit');
      
      await panel.emitSignal('test-signal', { test: 'data' });
      
      expect(signalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          source: { 
            panelId: 'test-panel',
            resourceId: 'test-resource'
          },
        })
      );
    });
  });

  describe('Configuration', () => {
    it('should update configuration', async () => {
      await panel.updateConfig({ title: 'New Title' });
      
      expect(panel.config.title).toBe('New Title');
    });

    it('should update visibility when config changes', async () => {
      await panel.updateConfig({ visibility: PanelVisibility.VISIBLE });
      
      expect(panel.getState().visibility).toBe(PanelVisibility.VISIBLE);
    });

    it('should get configuration copy', () => {
      const configCopy = panel.getConfig();
      configCopy.title = 'Modified';
      
      expect(panel.config.title).toBe('Test Panel'); // Should not be modified
    });
  });

  describe('Event Handling', () => {
    it('should handle lifecycle events', async () => {
      const handler = vi.fn();
      const unsubscribe = panel.onLifecycleEvent(handler);
      
      await panel.initialize();
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          panelId: 'test-panel',
          phase: PanelLifecyclePhase.READY,
          previousPhase: PanelLifecyclePhase.INITIALIZING,
        })
      );
      
      unsubscribe();
    });

    it('should handle visibility events', async () => {
      const handler = vi.fn();
      const unsubscribe = panel.onVisibilityEvent(handler);
      
      await panel.show();
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          panelId: 'test-panel',
          visibility: PanelVisibility.VISIBLE,
          previousVisibility: PanelVisibility.HIDDEN,
        })
      );
      
      unsubscribe();
    });

    it('should handle focus events', async () => {
      const handler = vi.fn();
      const unsubscribe = panel.onFocusEvent(handler);
      
      await panel.focus();
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          panelId: 'test-panel',
          isFocused: true,
          source: 'system',
        })
      );
      
      unsubscribe();
    });
  });

  describe('Layout and Positioning', () => {
    it('should set position', async () => {
      await panel.setPosition(100, 200);
      
      expect(panel.config.position?.x).toBe(100);
      expect(panel.config.position?.y).toBe(200);
    });

    it('should set size', async () => {
      await panel.setSize(800, 600);
      
      expect(panel.config.position?.width).toBe(800);
      expect(panel.config.position?.height).toBe(600);
    });

    it('should set bounds', async () => {
      await panel.setBounds(50, 75, 900, 700);
      
      expect(panel.config.position).toEqual({
        x: 50,
        y: 75,
        width: 900,
        height: 700,
      });
    });
  });

  describe('Refresh', () => {
    it('should update last activity on refresh', async () => {
      const initialActivity = panel.getState().lastActivity;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await panel.refresh();
      
      expect(panel.getState().lastActivity).toBeGreaterThan(initialActivity);
    });
  });

  describe('Render', () => {
    it('should call render method', () => {
      const result = panel.render();
      
      expect(result).toBe('<div>Test Panel test-panel</div>');
      expect(panel.getRenderCallCount()).toBe(1);
    });
  });
}); 