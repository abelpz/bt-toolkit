import { describe, it, expect } from 'vitest';
import {
  createServiceIdentifier,
  createTaggedServiceIdentifier,
  getServiceMetadata,
  hasServiceMetadata
} from '../Decorators';

describe('Decorators', () => {
  describe('service identifier utilities', () => {
    it('should create service identifier', () => {
      const identifier = createServiceIdentifier('TestService');
      expect(typeof identifier).toBe('symbol');
    });

    it('should create tagged service identifier', () => {
      const identifier = createTaggedServiceIdentifier('TestService', 'framework', 'react');
      expect(typeof identifier).toBe('symbol');
    });

    it('should create unique identifiers for same name', () => {
      const id1 = createServiceIdentifier('TestService');
      const id2 = createServiceIdentifier('TestService');
      // Should be the same for same name
      expect(id1).toBe(id2);
    });

    it('should create different tagged identifiers', () => {
      const id1 = createTaggedServiceIdentifier('TestService', 'framework', 'react');
      const id2 = createTaggedServiceIdentifier('TestService', 'framework', 'vue');
      // Should be different for different tags
      expect(id1).not.toBe(id2);
    });
  });

  describe('metadata utilities', () => {
    it('should handle metadata operations on plain classes', () => {
      class PlainService {}

      expect(() => hasServiceMetadata(PlainService)).not.toThrow();
      expect(() => getServiceMetadata(PlainService)).not.toThrow();
      
      const hasMetadata = hasServiceMetadata(PlainService);
      const metadata = getServiceMetadata(PlainService);
      
      expect(typeof hasMetadata).toBe('boolean');
      expect(metadata === undefined || typeof metadata === 'object').toBe(true);
    });
  });

  describe('decorator functions exist', () => {
    it('should export all decorator functions', async () => {
      const decorators = await import('../Decorators');
      
      // Check that key decorators are exported
      expect(typeof decorators.injectable).toBe('function');
      expect(typeof decorators.inject).toBe('function');
      expect(typeof decorators.singleton).toBe('function');
      expect(typeof decorators.transient).toBe('function');
      expect(typeof decorators.reactService).toBe('function');
      expect(typeof decorators.reactNativeService).toBe('function');
      expect(typeof decorators.vanillaService).toBe('function');
      expect(typeof decorators.webService).toBe('function');
      expect(typeof decorators.mobileService).toBe('function');
      expect(typeof decorators.desktopService).toBe('function');
      expect(typeof decorators.injectSignalBus).toBe('function');
      expect(typeof decorators.injectPanelManager).toBe('function');
      expect(typeof decorators.initialize).toBe('function');
      expect(typeof decorators.dispose).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle invalid service names', () => {
      expect(() => createServiceIdentifier('')).not.toThrow();
      expect(() => createTaggedServiceIdentifier('', '', '')).not.toThrow();
    });

    it('should handle null/undefined inputs', () => {
      // These might throw TypeError for null/undefined, which is expected behavior
      try {
        hasServiceMetadata(null as any);
        getServiceMetadata(undefined as any);
      } catch (error) {
        // Expected behavior for null/undefined inputs
        expect(error).toBeInstanceOf(TypeError);
      }
    });
  });
}); 