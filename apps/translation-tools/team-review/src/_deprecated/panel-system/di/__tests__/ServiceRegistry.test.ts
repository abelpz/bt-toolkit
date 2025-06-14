import { describe, it, expect, beforeEach } from 'vitest';
import { ServiceRegistry } from '../ServiceRegistry';
import { PanelSystemContainer } from '../Container';

describe('ServiceRegistry', () => {
  let serviceRegistry: ServiceRegistry;
  let container: PanelSystemContainer;

  beforeEach(() => {
    container = new PanelSystemContainer();
    serviceRegistry = new ServiceRegistry(container as any, container.getConfig());
  });

  describe('constructor', () => {
    it('should initialize with container and config', () => {
      expect(serviceRegistry).toBeDefined();
    });
  });

  describe('core services registration', () => {
    it('should register core services', async () => {
      await expect(serviceRegistry.registerCoreServices()).resolves.not.toThrow();
    });
  });

  describe('framework services registration', () => {
    it('should register React services', async () => {
      await expect(serviceRegistry.registerFrameworkServices('react')).resolves.not.toThrow();
    });

    it('should register React Native services', async () => {
      await expect(serviceRegistry.registerFrameworkServices('react-native')).resolves.not.toThrow();
    });

    it('should register vanilla services', async () => {
      await expect(serviceRegistry.registerFrameworkServices('vanilla')).resolves.not.toThrow();
    });
  });

  describe('platform services registration', () => {
    it('should register platform services', async () => {
      const features = {
        navigation: true,
        storage: true,
        notifications: true
      };
      
      await expect(serviceRegistry.registerPlatformServices(features)).resolves.not.toThrow();
    });
  });

  describe('service metadata', () => {
    it('should get service metadata', () => {
      const serviceId = Symbol.for('TestService');
      const metadata = serviceRegistry.getServiceMetadata(serviceId);
      expect(metadata).toBeUndefined(); // No service registered yet
    });

    it('should get all services', () => {
      const allServices = serviceRegistry.getAllServices();
      expect(allServices).toBeInstanceOf(Map);
    });

    it('should check if service is registered', () => {
      const serviceId = Symbol.for('TestService');
      const isRegistered = serviceRegistry.isServiceRegistered(serviceId);
      expect(typeof isRegistered).toBe('boolean');
    });
  });

  describe('service discovery', () => {
    it('should get services by framework', () => {
      const reactServices = serviceRegistry.getServicesByFramework('react');
      expect(Array.isArray(reactServices)).toBe(true);
    });

    it('should get services by platform', () => {
      const webServices = serviceRegistry.getServicesByPlatform('web');
      expect(Array.isArray(webServices)).toBe(true);
    });
  });

  describe('dependency validation', () => {
    it('should validate dependencies', () => {
      const result = serviceRegistry.validateDependencies();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
}); 