/**
 * Resource Service Factory Tests
 * Tests dependency injection and service switching
 */

import { ResourceServiceFactory } from '../ResourceServiceFactory';
import { Door43ApiService } from '../door43/Door43ApiService';
import { SampleResourcesService } from '../sampleResourcesService';

// Mock the services
jest.mock('../door43/Door43ApiService');
jest.mock('../sampleResourcesService');

describe('ResourceServiceFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Creation', () => {
    it('should create Door43 API service', () => {
      const factory = new ResourceServiceFactory({
        serviceType: 'door43-api',
        door43Config: {
          language: 'en',
          organization: 'unfoldingWord'
        }
      });

      const service = factory.createResourceService();
      expect(Door43ApiService).toHaveBeenCalledWith({
        language: 'en',
        organization: 'unfoldingWord'
      });
    });

    it('should create sample service', () => {
      const factory = new ResourceServiceFactory({
        serviceType: 'sample'
      });

      const service = factory.createResourceService();
      expect(SampleResourcesService).toHaveBeenCalled();
    });

    it('should throw error for unknown service type', () => {
      const factory = new ResourceServiceFactory({
        serviceType: 'unknown' as any
      });

      expect(() => factory.createResourceService()).toThrow('Unknown resource service type: unknown');
    });
  });

  describe('Static Factory Methods', () => {
    it('should create sample service via static method', () => {
      const service = ResourceServiceFactory.createSampleService();
      expect(SampleResourcesService).toHaveBeenCalled();
    });

    it('should create Door43 service via static method', () => {
      const service = ResourceServiceFactory.createDoor43Service({
        language: 'es',
        organization: 'Door43-Catalog'
      });

      expect(Door43ApiService).toHaveBeenCalledWith({
        language: 'es',
        organization: 'Door43-Catalog'
      });
    });

    it('should create Door43 service with default config', () => {
      const service = ResourceServiceFactory.createDoor43Service();
      expect(Door43ApiService).toHaveBeenCalledWith(undefined);
    });
  });
});
