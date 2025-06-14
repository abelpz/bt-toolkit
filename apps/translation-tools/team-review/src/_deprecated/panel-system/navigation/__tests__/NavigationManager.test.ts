import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NavigationManager, NavigationTarget } from '../NavigationManager';
import { PanelManager } from '../../panels/PanelManager';
import { SignalBus } from '../../core/SignalBus';
import { SIGNAL_TYPES } from '../../signals/SignalTypes';
import { PanelAPI } from '../../types/Panel';
import { ResourceAPI } from '../../types/Resource';

// Mock PanelManager
const createMockPanelManager = (): any => ({
  getRegistry: vi.fn(),
  switchToPanel: vi.fn(),
  focusPanel: vi.fn(),
  getActivePanel: vi.fn(),
} as any);

// Mock Panel
const createMockPanel = (id: string, resources: ResourceAPI[] = []): any => ({
  id,
  getResource: vi.fn((resourceId: string) => resources.find(r => r.id === resourceId)),
  setActiveResource: vi.fn(),
  getActiveResource: vi.fn(() => resources[0]),
  getResources: vi.fn(() => resources),
} as any);

// Mock Resource
const createMockResource = (id: string): any => ({
  id,
  type: 'test-resource',
  navigateToContent: vi.fn(),
} as any);

// Mock Registry
const createMockRegistry = (panels: PanelAPI[] = []) => ({
  getPanels: vi.fn(() => panels),
});

describe('NavigationManager', () => {
  let navigationManager: NavigationManager;
  let mockPanelManager: any;
  let signalBus: SignalBus;

  beforeEach(() => {
    signalBus = new SignalBus();
    mockPanelManager = createMockPanelManager();
    navigationManager = new NavigationManager(mockPanelManager, signalBus);
  });

  afterEach(() => {
    signalBus.clearHistory();
  });

  describe('Constructor and Setup', () => {
    it('should initialize with panel manager and signal bus', () => {
      expect(navigationManager).toBeDefined();
    });

    it('should setup signal handlers', () => {
      const onGlobalSpy = vi.spyOn(signalBus, 'onGlobal');
      
      new NavigationManager(mockPanelManager, signalBus);
      
      expect(onGlobalSpy).toHaveBeenCalledWith(
        SIGNAL_TYPES.NAVIGATE_TO_RESOURCE,
        expect.any(Function)
      );
      expect(onGlobalSpy).toHaveBeenCalledWith(
        SIGNAL_TYPES.NAVIGATE_TO_NOTE,
        expect.any(Function)
      );
    });
  });

  describe('Resource Navigation', () => {
    it('should navigate to existing resource successfully', async () => {
      const mockResource = createMockResource('test-resource');
      const mockPanel = createMockPanel('test-panel', [mockResource]);
      const mockRegistry = createMockRegistry([mockPanel]);
      
      mockPanelManager.getRegistry.mockReturnValue(mockRegistry as any);
      mockPanelManager.switchToPanel.mockResolvedValue();
      mockPanelManager.focusPanel.mockResolvedValue();

      const result = await navigationManager.navigateToResource('test-resource');

      expect(result.success).toBe(true);
      expect(mockPanelManager.switchToPanel).toHaveBeenCalledWith('test-panel');
      expect(mockPanel.setActiveResource).toHaveBeenCalledWith('test-resource');
      expect(mockPanelManager.focusPanel).toHaveBeenCalledWith('test-panel');
    });

    it('should handle resource not found', async () => {
      const mockRegistry = createMockRegistry([]);
      mockPanelManager.getRegistry.mockReturnValue(mockRegistry as any);

      const result = await navigationManager.navigateToResource('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe("Resource 'non-existent' not found in any panel");
    });

    it('should navigate to resource with navigation data', async () => {
      const mockResource = createMockResource('test-resource');
      mockResource.navigateToContent = vi.fn();
      const mockPanel = createMockPanel('test-panel', [mockResource]);
      const mockRegistry = createMockRegistry([mockPanel]);
      
      mockPanelManager.getRegistry.mockReturnValue(mockRegistry as any);
      mockPanelManager.switchToPanel.mockResolvedValue();
      mockPanelManager.focusPanel.mockResolvedValue();

      const navigationData = { type: 'verse', target: 'GEN.1.1' };
      const result = await navigationManager.navigateToResource('test-resource', navigationData);

      expect(result.success).toBe(true);
      expect(mockResource.navigateToContent).toHaveBeenCalledWith(navigationData);
    });

    it('should handle navigation without focus when specified', async () => {
      const mockResource = createMockResource('test-resource');
      const mockPanel = createMockPanel('test-panel', [mockResource]);
      const mockRegistry = createMockRegistry([mockPanel]);
      
      mockPanelManager.getRegistry.mockReturnValue(mockRegistry as any);
      mockPanelManager.switchToPanel.mockResolvedValue();

      const result = await navigationManager.navigateToResource(
        'test-resource',
        undefined,
        { focus: false }
      );

      expect(result.success).toBe(true);
      expect(mockPanelManager.focusPanel).not.toHaveBeenCalled();
    });

    it('should handle panel switching error', async () => {
      const mockResource = createMockResource('test-resource');
      const mockPanel = createMockPanel('test-panel', [mockResource]);
      const mockRegistry = createMockRegistry([mockPanel]);
      
      mockPanelManager.getRegistry.mockReturnValue(mockRegistry as any);
      mockPanelManager.switchToPanel.mockRejectedValue(new Error('Switch failed'));

      const result = await navigationManager.navigateToResource('test-resource');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Switch failed');
    });
  });

  describe('Panel Navigation', () => {
    it('should navigate to panel successfully', async () => {
      mockPanelManager.switchToPanel.mockResolvedValue();
      mockPanelManager.focusPanel.mockResolvedValue();

      const target: NavigationTarget = { type: 'panel', id: 'test-panel' };
      const result = await navigationManager.navigateTo(target);

      expect(result.success).toBe(true);
      expect(mockPanelManager.switchToPanel).toHaveBeenCalledWith('test-panel');
      expect(mockPanelManager.focusPanel).toHaveBeenCalledWith('test-panel');
    });

    it('should handle panel navigation error', async () => {
      mockPanelManager.switchToPanel.mockRejectedValue(new Error('Panel not found'));

      const target: NavigationTarget = { type: 'panel', id: 'non-existent' };
      const result = await navigationManager.navigateTo(target);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Panel not found');
    });
  });

  describe('Content Navigation', () => {
    it('should navigate to content successfully', async () => {
      const mockResource = createMockResource('test-resource');
      const mockPanel = createMockPanel('test-panel', [mockResource]);
      const mockRegistry = createMockRegistry([mockPanel]);
      
      mockPanelManager.getRegistry.mockReturnValue(mockRegistry as any);
      mockPanelManager.switchToPanel.mockResolvedValue();
      mockPanelManager.focusPanel.mockResolvedValue();

      const target: NavigationTarget = {
        type: 'content',
        id: 'content-1',
        data: {
          resourceId: 'test-resource',
          navigationData: { type: 'verse', target: 'GEN.1.1' }
        }
      };

      const result = await navigationManager.navigateTo(target);

      expect(result.success).toBe(true);
    });

    it('should handle content navigation without resource ID', async () => {
      const target: NavigationTarget = {
        type: 'content',
        id: 'content-1',
        data: {}
      };

      const result = await navigationManager.navigateTo(target);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Content navigation requires resourceId in target data');
    });
  });

  describe('External Navigation', () => {
    it('should handle external navigation as not implemented', async () => {
      const target: NavigationTarget = { type: 'external', id: 'http://example.com' };
      const result = await navigationManager.navigateTo(target);

      expect(result.success).toBe(false);
      expect(result.error).toBe('External navigation not implemented');
    });
  });

  describe('Navigation with Options', () => {
    it('should add to history by default', async () => {
      const mockResource = createMockResource('test-resource');
      const mockPanel = createMockPanel('test-panel', [mockResource]);
      const mockRegistry = createMockRegistry([mockPanel]);
      
      mockPanelManager.getRegistry.mockReturnValue(mockRegistry as any);
      mockPanelManager.switchToPanel.mockResolvedValue();

      const target: NavigationTarget = { type: 'resource', id: 'test-resource' };
      await navigationManager.navigateTo(target);

      const history = navigationManager.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].target).toEqual(target);
    });

    it('should not add to history when specified', async () => {
      const mockResource = createMockResource('test-resource');
      const mockPanel = createMockPanel('test-panel', [mockResource]);
      const mockRegistry = createMockRegistry([mockPanel]);
      
      mockPanelManager.getRegistry.mockReturnValue(mockRegistry as any);
      mockPanelManager.switchToPanel.mockResolvedValue();

      const target: NavigationTarget = { type: 'resource', id: 'test-resource' };
      await navigationManager.navigateTo(target, { addToHistory: false });

      const history = navigationManager.getHistory();
      expect(history).toHaveLength(0);
    });

    it('should replace history when specified', async () => {
      const mockResource1 = createMockResource('test-resource-1');
      const mockResource2 = createMockResource('test-resource-2');
      const mockPanel = createMockPanel('test-panel', [mockResource1, mockResource2]);
      const mockRegistry = createMockRegistry([mockPanel]);
      
      mockPanelManager.getRegistry.mockReturnValue(mockRegistry as any);
      mockPanelManager.switchToPanel.mockResolvedValue();

      // First navigation
      await navigationManager.navigateTo({ type: 'resource', id: 'test-resource-1' });
      
      // Second navigation with replace
      await navigationManager.navigateTo(
        { type: 'resource', id: 'test-resource-2' },
        { replaceHistory: true }
      );

      const history = navigationManager.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].target.id).toBe('test-resource-2');
    });
  });

  describe('History Management', () => {
    beforeEach(async () => {
      // Setup mock resources and panels
      const mockResource1 = createMockResource('resource-1');
      const mockResource2 = createMockResource('resource-2');
      const mockPanel = createMockPanel('test-panel', [mockResource1, mockResource2]);
      const mockRegistry = createMockRegistry([mockPanel]);
      
      mockPanelManager.getRegistry.mockReturnValue(mockRegistry as any);
      mockPanelManager.switchToPanel.mockResolvedValue();
      mockPanelManager.focusPanel.mockResolvedValue();
    });

    it('should track navigation history', async () => {
      await navigationManager.navigateTo({ type: 'resource', id: 'resource-1' });
      await navigationManager.navigateTo({ type: 'resource', id: 'resource-2' });

      const history = navigationManager.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].target.id).toBe('resource-1');
      expect(history[1].target.id).toBe('resource-2');
    });

    it('should go back in history', async () => {
      await navigationManager.navigateTo({ type: 'resource', id: 'resource-1' });
      await navigationManager.navigateTo({ type: 'resource', id: 'resource-2' });

      const result = await navigationManager.goBack();

      expect(result).toBeDefined();
      expect(result!.success).toBe(true);
      expect(navigationManager.getCurrentEntry()?.target.id).toBe('resource-1');
    });

    it('should go forward in history', async () => {
      await navigationManager.navigateTo({ type: 'resource', id: 'resource-1' });
      await navigationManager.navigateTo({ type: 'resource', id: 'resource-2' });
      await navigationManager.goBack();

      const result = await navigationManager.goForward();

      expect(result).toBeDefined();
      expect(result!.success).toBe(true);
      expect(navigationManager.getCurrentEntry()?.target.id).toBe('resource-2');
    });

    it('should return null when cannot go back', async () => {
      const result = await navigationManager.goBack();
      expect(result).toBeNull();
    });

    it('should return null when cannot go forward', async () => {
      await navigationManager.navigateTo({ type: 'resource', id: 'resource-1' });
      
      const result = await navigationManager.goForward();
      expect(result).toBeNull();
    });

    it('should check can go back/forward correctly', async () => {
      expect(navigationManager.canGoBack()).toBe(false);
      expect(navigationManager.canGoForward()).toBe(false);

      await navigationManager.navigateTo({ type: 'resource', id: 'resource-1' });
      expect(navigationManager.canGoBack()).toBe(false);
      expect(navigationManager.canGoForward()).toBe(false);

      await navigationManager.navigateTo({ type: 'resource', id: 'resource-2' });
      expect(navigationManager.canGoBack()).toBe(true);
      expect(navigationManager.canGoForward()).toBe(false);

      await navigationManager.goBack();
      expect(navigationManager.canGoBack()).toBe(false);
      expect(navigationManager.canGoForward()).toBe(true);
    });

    it('should clear history', () => {
      navigationManager.navigateTo({ type: 'resource', id: 'resource-1' });
      navigationManager.clearHistory();

      expect(navigationManager.getHistory()).toHaveLength(0);
      expect(navigationManager.getCurrentEntry()).toBeNull();
    });

    it('should respect max history size', async () => {
      navigationManager.setMaxHistorySize(2);

      await navigationManager.navigateTo({ type: 'resource', id: 'resource-1' });
      await navigationManager.navigateTo({ type: 'resource', id: 'resource-2' });
      await navigationManager.navigateTo({ type: 'resource', id: 'resource-1' }); // Will trim

      const history = navigationManager.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].target.id).toBe('resource-2');
      expect(history[1].target.id).toBe('resource-1');
    });
  });

  describe('Event Handling', () => {
    it('should handle navigation events', async () => {
      const handler = vi.fn();
      navigationManager.onNavigation(handler);

      const mockResource = createMockResource('test-resource');
      const mockPanel = createMockPanel('test-panel', [mockResource]);
      const mockRegistry = createMockRegistry([mockPanel]);
      
      mockPanelManager.getRegistry.mockReturnValue(mockRegistry as any);
      mockPanelManager.switchToPanel.mockResolvedValue();

      await navigationManager.navigateTo({ type: 'resource', id: 'test-resource' });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ id: 'test-resource' })
        }),
        expect.objectContaining({ success: true })
      );
    });

    it('should handle history change events', async () => {
      const handler = vi.fn();
      navigationManager.onHistoryChange(handler);

      const mockResource = createMockResource('test-resource');
      const mockPanel = createMockPanel('test-panel', [mockResource]);
      const mockRegistry = createMockRegistry([mockPanel]);
      
      mockPanelManager.getRegistry.mockReturnValue(mockRegistry as any);
      mockPanelManager.switchToPanel.mockResolvedValue();

      await navigationManager.navigateTo({ type: 'resource', id: 'test-resource' });

      expect(handler).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            target: expect.objectContaining({ id: 'test-resource' })
          })
        ])
      );
    });

    it('should unsubscribe from events', async () => {
      const handler = vi.fn();
      const unsubscribe = navigationManager.onNavigation(handler);
      unsubscribe();

      const mockResource = createMockResource('test-resource');
      const mockPanel = createMockPanel('test-panel', [mockResource]);
      const mockRegistry = createMockRegistry([mockPanel]);
      
      mockPanelManager.getRegistry.mockReturnValue(mockRegistry as any);
      mockPanelManager.switchToPanel.mockResolvedValue();

      await navigationManager.navigateTo({ type: 'resource', id: 'test-resource' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Navigation State', () => {
    it('should get navigation state', () => {
      const state = navigationManager.getNavigationState();

      expect(state).toEqual({
        canGoBack: false,
        canGoForward: false,
        historyLength: 0,
        currentIndex: -1,
        isNavigating: false,
        currentEntry: null,
      });
    });

    it('should update navigation state during navigation', async () => {
      const mockResource = createMockResource('test-resource');
      const mockPanel = createMockPanel('test-panel', [mockResource]);
      const mockRegistry = createMockRegistry([mockPanel]);
      
      mockPanelManager.getRegistry.mockReturnValue(mockRegistry as any);
      mockPanelManager.switchToPanel.mockResolvedValue();

      await navigationManager.navigateTo({ type: 'resource', id: 'test-resource' });

      const state = navigationManager.getNavigationState();
      expect(state.historyLength).toBe(1);
      expect(state.currentIndex).toBe(0);
      expect(state.currentEntry?.target.id).toBe('test-resource');
    });
  });

  describe('Signal Integration', () => {
    it('should emit navigation signals', async () => {
      const signalSpy = vi.spyOn(signalBus, 'emit');
      
      const mockResource = createMockResource('test-resource');
      const mockPanel = createMockPanel('test-panel', [mockResource]);
      const mockRegistry = createMockRegistry([mockPanel]);
      
      mockPanelManager.getRegistry.mockReturnValue(mockRegistry as any);
      mockPanelManager.switchToPanel.mockResolvedValue();

      await navigationManager.navigateTo({ type: 'resource', id: 'test-resource' });

      expect(signalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SIGNAL_TYPES.FOCUS_RESOURCE,
          source: {
            panelId: 'navigation-manager',
            resourceId: 'test-resource'
          },
          payload: expect.objectContaining({
            resourceId: 'test-resource'
          })
        })
      );
    });

    it('should handle concurrent navigation attempts', async () => {
      const mockResource = createMockResource('test-resource');
      const mockPanel = createMockPanel('test-panel', [mockResource]);
      const mockRegistry = createMockRegistry([mockPanel]);
      
      mockPanelManager.getRegistry.mockReturnValue(mockRegistry as any);
      
      // Make first navigation slow
      mockPanelManager.switchToPanel.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      // Start two navigations simultaneously
      const navigation1 = navigationManager.navigateTo({ type: 'resource', id: 'test-resource' });
      const navigation2 = navigationManager.navigateTo({ type: 'resource', id: 'test-resource' });

      const [result1, result2] = await Promise.all([navigation1, navigation2]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Navigation already in progress');
    });
  });

  describe('Unknown Navigation Types', () => {
    it('should handle unknown navigation target type', async () => {
      const target = { type: 'unknown', id: 'test' } as unknown as NavigationTarget;
      const result = await navigationManager.navigateTo(target);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown navigation target type: unknown');
    });
  });
}); 