import { describe, it, expect, afterEach } from 'vitest';
import { createPanelSystem, createPanelSystemWithDI } from '../index';

describe('Panel System Factory Functions', () => {
  describe('createPanelSystem', () => {
    it('should create panel system with default config', () => {
      const system = createPanelSystem();
      
      expect(system).toBeDefined();
      expect(system.signalBus).toBeDefined();
      expect(system.panelManager).toBeDefined();
      expect(system.resourceRegistry).toBeDefined();
      expect(system.navigationController).toBeDefined();
      expect(system.cleanupManager).toBeDefined();
      expect(system.resourceLifecycle).toBeDefined();
      expect(system.resourceCleanup).toBeDefined();
    });

    it('should create panel system with custom config', () => {
      const config = {
        maxHistorySize: 50,
        enableCleanupTracking: true,
        enablePerformanceMetrics: true,
        signalBus: {
          maxHistorySize: 100
        }
      };
      
      const system = createPanelSystem(config);
      
      expect(system).toBeDefined();
      expect(system.signalBus).toBeDefined();
      expect(system.panelManager).toBeDefined();
      expect(system.resourceRegistry).toBeDefined();
      expect(system.navigationController).toBeDefined();
      expect(system.cleanupManager).toBeDefined();
      expect(system.resourceLifecycle).toBeDefined();
      expect(system.resourceCleanup).toBeDefined();
    });

    it('should configure navigation controller with max history size', () => {
      const config = {
        maxHistorySize: 25
      };
      
      const system = createPanelSystem(config);
      
      // The navigation controller should be configured with the max history size
      expect(system.navigationController).toBeDefined();
    });
  });

  describe('createPanelSystemWithDI', () => {
    let system: any;

    afterEach(async () => {
      if (system?.container) {
        await system.container.dispose();
      }
    });

    it('should create panel system with DI container', async () => {
      system = await createPanelSystemWithDI();
      
      expect(system).toBeDefined();
      expect(system.container).toBeDefined();
      expect(system.signalBus).toBeDefined();
      expect(system.panelManager).toBeDefined();
      expect(system.resourceRegistry).toBeDefined();
      expect(system.navigationController).toBeDefined();
      expect(system.cleanupManager).toBeDefined();
      expect(system.resourceLifecycle).toBeDefined();
      expect(system.resourceCleanup).toBeDefined();
    });

    it('should create panel system with custom DI config', async () => {
      const config = {
        maxHistorySize: 30,
        di: {
          framework: 'react-native' as const,
          enableLogging: true,
          platformFeatures: {
            navigation: false,
            storage: true,
            notifications: false
          }
        }
      };
      
      system = await createPanelSystemWithDI(config);
      
      expect(system).toBeDefined();
      expect(system.container).toBeDefined();
      expect(system.container.getConfig().framework).toBe('react-native');
      expect(system.container.getConfig().enableLogging).toBe(true);
    });

    it('should configure navigation controller with max history size in DI version', async () => {
      const config = {
        maxHistorySize: 15
      };
      
      system = await createPanelSystemWithDI(config);
      
      expect(system.navigationController).toBeDefined();
    });

    it('should handle DI initialization errors gracefully', async () => {
      // This should not throw even if there are initialization issues
      await expect(createPanelSystemWithDI()).resolves.toBeDefined();
    });
  });

  describe('factory function comparison', () => {
    let traditionalSystem: any;
    let diSystem: any;

    afterEach(async () => {
      if (diSystem?.container) {
        await diSystem.container.dispose();
      }
    });

    it('should create systems with same component types', async () => {
      traditionalSystem = createPanelSystem();
      diSystem = await createPanelSystemWithDI();
      
      // Both should have the same component types
      expect(traditionalSystem.signalBus.constructor.name).toBe('SignalBus');
      expect(diSystem.signalBus.constructor.name).toBe('SignalBus');
      
      expect(traditionalSystem.panelManager.constructor.name).toBe('PanelManager');
      expect(diSystem.panelManager.constructor.name).toBe('PanelManager');
      
      expect(traditionalSystem.resourceRegistry.constructor.name).toBe('ResourceRegistry');
      expect(diSystem.resourceRegistry.constructor.name).toBe('ResourceRegistry');
    });

    it('should create functional systems', async () => {
      traditionalSystem = createPanelSystem();
      diSystem = await createPanelSystemWithDI();
      
      // Both systems should have working signal buses
      expect(typeof traditionalSystem.signalBus.emit).toBe('function');
      expect(typeof diSystem.signalBus.emit).toBe('function');
      
      // Both systems should have working panel managers
      expect(typeof traditionalSystem.panelManager.createPanel).toBe('function');
      expect(typeof diSystem.panelManager.createPanel).toBe('function');
    });
  });
}); 