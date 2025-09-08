/**
 * Resource Service Factory
 * Implements dependency injection for resource services
 */

import { IResourceService, IResourceServiceFactory } from './interfaces/IResourceService';
import { SampleResourcesService } from './sampleResourcesService';
import { Door43ApiService } from './door43/Door43ApiService';
import type { Door43ApiConfig } from './door43/Door43ApiService';

export type ResourceServiceType = 'sample' | 'door43-api';
export type { Door43ApiConfig };

export interface ResourceServiceFactoryConfig {
  serviceType: ResourceServiceType;
  door43Config?: Door43ApiConfig;
}

export class ResourceServiceFactory implements IResourceServiceFactory {
  private config: ResourceServiceFactoryConfig;

  constructor(config: ResourceServiceFactoryConfig) {
    this.config = config;
  }

  createResourceService(): IResourceService {
    switch (this.config.serviceType) {
      case 'sample':
        console.log('🏗️ Creating Sample Resource Service');
        return new SampleResourcesService();
        
      case 'door43-api':
        console.log('🏗️ Creating Door43 API Resource Service');
        return new Door43ApiService(this.config.door43Config);
        
      default:
        throw new Error(`Unknown resource service type: ${this.config.serviceType}`);
    }
  }

  static createSampleService(): IResourceService {
    const factory = new ResourceServiceFactory({ serviceType: 'sample' });
    return factory.createResourceService();
  }

  static createDoor43Service(config?: Door43ApiConfig): IResourceService {
    const factory = new ResourceServiceFactory({ 
      serviceType: 'door43-api',
      door43Config: config 
    });
    return factory.createResourceService();
  }
}

// Global service instance (can be swapped out for testing or different modes)
let globalResourceService: IResourceService | null = null;

export const setGlobalResourceService = (service: IResourceService): void => {
  globalResourceService = service;
};

export const getGlobalResourceService = (): IResourceService => {
  if (!globalResourceService) {
    // Default to Door43 API service for online mode
    globalResourceService = ResourceServiceFactory.createDoor43Service();
  }
  return globalResourceService;
};

// Convenience functions for common configurations
export const useOnlineMode = (config?: Door43ApiConfig): void => {
  const service = ResourceServiceFactory.createDoor43Service(config);
  setGlobalResourceService(service);
  console.log('🌐 Switched to online mode (Door43 API)');
};

export const useOfflineMode = (): void => {
  const service = ResourceServiceFactory.createSampleService();
  setGlobalResourceService(service);
  console.log('📱 Switched to offline mode (Sample data)');
};

// React hook for accessing the resource service
export const useResourceService = (): IResourceService => {
  return getGlobalResourceService();
};
