/**
 * Resource Service Context Tests
 * Tests the core logic of resource service management
 * 
 * Note: These are simplified tests for the core logic.
 * For full React component testing, install @testing-library/react-native
 */

import { ResourceServiceFactory } from '../../services/ResourceServiceFactory';

describe('ResourceServiceContext Logic', () => {
  describe('Service Factory Integration', () => {
    it('should create Door43 service with correct config', () => {
      const service = ResourceServiceFactory.createDoor43Service({
        language: 'en',
        organization: 'unfoldingWord'
      });
      
      expect(service).toBeDefined();
      expect(service.constructor.name).toBe('Door43ApiService');
    });

    it('should create sample service', () => {
      const service = ResourceServiceFactory.createSampleService();
      
      expect(service).toBeDefined();
      expect(service.constructor.name).toBe('SampleResourcesService');
    });
  });

  describe('Service Configuration', () => {
    it('should handle different language configurations', () => {
      const enService = ResourceServiceFactory.createDoor43Service({
        language: 'en',
        organization: 'unfoldingWord'
      });
      
      const esService = ResourceServiceFactory.createDoor43Service({
        language: 'es',
        organization: 'Door43-Catalog'
      });
      
      expect(enService).toBeDefined();
      expect(esService).toBeDefined();
    });
  });
});