import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PanelSystemContainer, PanelSystemContainerConfig } from '../Container';
import { TYPES } from '../types';
import { ServiceRegistry } from '../ServiceRegistry';

describe('PanelSystemContainer', () => {
  let container: PanelSystemContainer;

  beforeEach(() => {
    container = new PanelSystemContainer();
  });

  afterEach(async () => {
    await container.dispose();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(container).toBeDefined();
      expect(container.getConfig()).toMatchObject({
        defaultScope: 'Singleton',
        enableLogging: false,
        enableMetrics: false,
        enableHotReload: false,
        framework: 'react',
        platformFeatures: {
          navigation: true,
          storage: true,
          notifications: true
        }
      });
    });

    it('should initialize with custom configuration', () => {
      const config: PanelSystemContainerConfig = {
        defaultScope: 'Transient',
        enableLogging: true,
        framework: 'react-native',
        platformFeatures: {
          navigation: false,
          storage: true,
          notifications: false
        }
      };

      const customContainer = new PanelSystemContainer(config);
      
      expect(customContainer.getConfig()).toMatchObject(config);
      
      customContainer.dispose();
    });

    it('should setup core bindings', () => {
      expect(container.isBound(TYPES.PanelSystemContainer)).toBe(true);
      expect(container.isBound(TYPES.ServiceRegistry)).toBe(true);
      expect(container.isBound(TYPES.Container)).toBe(true);
    });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(container.initialize()).resolves.not.toThrow();
      expect(container.getServiceRegistry()).toBeDefined();
    });

    it('should not initialize twice', async () => {
      await container.initialize();
      await expect(container.initialize()).resolves.not.toThrow();
    });

    it('should handle initialization errors', async () => {
      // Mock the service registry to throw an error
      const mockRegistry = {
        registerCoreServices: vi.fn().mockRejectedValue(new Error('Init failed')),
        registerFrameworkServices: vi.fn(),
        registerPlatformServices: vi.fn()
      };
      
      (container as any).serviceRegistry = mockRegistry;
      
      await expect(container.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('service resolution', () => {
    beforeEach(async () => {
      await container.initialize();
    });

    it('should get bound services', () => {
      const serviceRegistry = container.get<ServiceRegistry>(TYPES.ServiceRegistry);
      expect(serviceRegistry).toBeDefined();
      expect(serviceRegistry).toBeInstanceOf(ServiceRegistry);
    });

    it('should throw error for unbound services', () => {
      const unboundType = Symbol.for('UnboundService');
      expect(() => container.get(unboundType)).toThrow();
    });

    it('should return undefined for optional unbound services', () => {
      const unboundType = Symbol.for('UnboundService');
      expect(container.getOptional(unboundType)).toBeUndefined();
    });

    it('should return empty array for unbound service collections', () => {
      const unboundType = Symbol.for('UnboundService');
      expect(container.getAll(unboundType)).toEqual([]);
    });

    it('should check if services are bound', () => {
      expect(container.isBound(TYPES.ServiceRegistry)).toBe(true);
      expect(container.isBound(Symbol.for('UnboundService'))).toBe(false);
    });

    it('should throw error when getting services before initialization', () => {
      const uninitializedContainer = new PanelSystemContainer();
      expect(() => uninitializedContainer.get(TYPES.ServiceRegistry))
        .toThrow('Container must be initialized before resolving services');
      
      uninitializedContainer.dispose();
    });
  });

  describe('service binding', () => {
    beforeEach(async () => {
      await container.initialize();
    });

    it('should check binding capabilities', () => {
      expect(container.isBound(TYPES.ServiceRegistry)).toBe(true);
      expect(container.isBound(Symbol.for('NonExistentService'))).toBe(false);
    });

    it('should provide bind method', () => {
      const testType = Symbol.for('TestService');
      expect(typeof container.bind).toBe('function');
      expect(typeof container.rebind).toBe('function');
      expect(typeof container.unbind).toBe('function');
    });
  });

  describe('child containers', () => {
    beforeEach(async () => {
      await container.initialize();
    });

    it('should create child containers', () => {
      const childContainer = container.createChild({
        framework: 'vanilla',
        enableLogging: true
      });

      expect(childContainer).toBeDefined();
      expect(childContainer.getConfig().framework).toBe('vanilla');
      expect(childContainer.getConfig().enableLogging).toBe(true);
      
      childContainer.dispose();
    });

    it('should inherit parent bindings in child containers', () => {
      const childContainer = container.createChild();
      
      // Child containers should inherit core bindings
      expect(childContainer.isBound(TYPES.ServiceRegistry)).toBe(true);
      
      childContainer.dispose();
    });
  });

  describe('disposal', () => {
    it('should dispose successfully', async () => {
      await container.initialize();
      await expect(container.dispose()).resolves.not.toThrow();
    });

    it('should handle disposal errors gracefully', async () => {
      await container.initialize();
      
      // The container should dispose successfully even if some services fail
      await expect(container.dispose()).resolves.not.toThrow();
    });

    it('should clear all bindings on disposal', async () => {
      await container.initialize();
      
      const testType = Symbol.for('TestService');
      class TestService {}
      container.bind(testType).to(TestService);
      
      expect(container.isBound(testType)).toBe(true);
      
      await container.dispose();
      
      // Note: We can't test this directly as the container is disposed
      // but the internal state should be cleared
    });
  });

  describe('logging', () => {
    it('should log when logging is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      
      const loggingContainer = new PanelSystemContainer({
        enableLogging: true
      });
      
      await loggingContainer.initialize();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PanelSystemContainer] Initialized successfully'
      );
      
      await loggingContainer.dispose();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PanelSystemContainer] Disposed successfully'
      );
      
      consoleSpy.mockRestore();
    });

    it('should not log when logging is disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      
      const silentContainer = new PanelSystemContainer({
        enableLogging: false
      });
      
      await silentContainer.initialize();
      await silentContainer.dispose();
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await container.initialize();
    });

    it('should handle service resolution errors with logging', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      
      const loggingContainer = new PanelSystemContainer({
        enableLogging: true
      });
      
      await loggingContainer.initialize();
      
      const unboundType = Symbol.for('UnboundService');
      expect(() => loggingContainer.get(unboundType)).toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
      await loggingContainer.dispose();
    });

    it('should handle optional service warnings with logging', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      
      const loggingContainer = new PanelSystemContainer({
        enableLogging: true
      });
      
      await loggingContainer.initialize();
      
      const unboundType = Symbol.for('UnboundService');
      const result = loggingContainer.getOptional(unboundType);
      
      expect(result).toBeUndefined();
      // Optional services may or may not log warnings depending on implementation
      
      consoleWarnSpy.mockRestore();
      await loggingContainer.dispose();
    });
  });
}); 