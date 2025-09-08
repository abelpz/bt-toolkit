/**
 * Resource Service Context
 * Provides dependency injection for resource services throughout the app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { IResourceService } from '../services/interfaces/IResourceService';
import { 
  ResourceServiceFactory, 
  ResourceServiceType,
  Door43ApiConfig 
} from '../services/ResourceServiceFactory';

export interface ResourceServiceContextValue {
  resourceService: IResourceService | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  switchToOnlineMode: (config?: Door43ApiConfig) => Promise<void>;
  switchToOfflineMode: () => Promise<void>;
  reinitialize: () => Promise<void>;
}

const ResourceServiceContext = createContext<ResourceServiceContextValue | null>(null);

export interface ResourceServiceProviderProps {
  children: React.ReactNode;
  initialServiceType?: ResourceServiceType;
  door43Config?: Door43ApiConfig;
}

export const ResourceServiceProvider: React.FC<ResourceServiceProviderProps> = ({
  children,
  initialServiceType = 'door43-api', // Default to online mode
  door43Config,
}) => {
  const [resourceService, setResourceService] = useState<IResourceService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeService = async (serviceType: ResourceServiceType, config?: Door43ApiConfig) => {
    setIsInitializing(true);
    setError(null);
    
    try {
      console.log(`🔄 Initializing ${serviceType} resource service...`);
      
      let service: IResourceService;
      
      if (serviceType === 'door43-api') {
        service = ResourceServiceFactory.createDoor43Service(config);
      } else {
        service = ResourceServiceFactory.createSampleService();
      }
      
      await service.initialize();
      
      setResourceService(service);
      setIsInitialized(true);
      
      console.log(`✅ ${serviceType} resource service initialized successfully`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error(`❌ Failed to initialize ${serviceType} resource service:`, err);
      setError(errorMessage);
      
      // Fallback to sample service if Door43 API fails
      if (serviceType === 'door43-api') {
        console.log('🔄 Falling back to sample service...');
        try {
          const fallbackService = ResourceServiceFactory.createSampleService();
          await fallbackService.initialize();
          setResourceService(fallbackService);
          setIsInitialized(true);
          console.log('✅ Fallback to sample service successful');
        } catch (fallbackErr) {
          console.error('❌ Fallback to sample service also failed:', fallbackErr);
          setError('Failed to initialize any resource service');
        }
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const switchToOnlineMode = async (config?: Door43ApiConfig) => {
    setIsInitialized(false);
    await initializeService('door43-api', config);
  };

  const switchToOfflineMode = async () => {
    setIsInitialized(false);
    await initializeService('sample');
  };

  const reinitialize = async () => {
    if (resourceService) {
      setIsInitialized(false);
      try {
        await resourceService.initialize();
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Reinitialization failed';
        setError(errorMessage);
      }
    }
  };

  // Initialize on mount
  useEffect(() => {
    initializeService(initialServiceType, door43Config);
  }, []); // Only run once on mount

  const contextValue: ResourceServiceContextValue = {
    resourceService,
    isInitialized,
    isInitializing,
    error,
    switchToOnlineMode,
    switchToOfflineMode,
    reinitialize,
  };

  return (
    <ResourceServiceContext.Provider value={contextValue}>
      {children}
    </ResourceServiceContext.Provider>
  );
};

export const useResourceService = (): ResourceServiceContextValue => {
  const context = useContext(ResourceServiceContext);
  if (!context) {
    throw new Error('useResourceService must be used within a ResourceServiceProvider');
  }
  return context;
};

// Convenience hook to get just the service instance
export const useResourceServiceInstance = (): IResourceService => {
  const { resourceService, isInitialized } = useResourceService();
  
  if (!resourceService) {
    throw new Error('Resource service is not available');
  }
  
  if (!isInitialized) {
    throw new Error('Resource service is not initialized yet');
  }
  
  return resourceService;
};
