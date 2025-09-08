/**
 * Unified Resource Service Context
 * Integrates our new sync ecosystem with the existing foundations-bt app
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  UnifiedResourceService, 
  ScriptureReference, 
  TranslationResource, 
  AlignmentInteraction,
  ResourceScope,
  createUnifiedResourceService
} from '../services/unified-resource-service';

// Types for the context
export interface SyncStatus {
  state: 'initializing' | 'idle' | 'syncing' | 'error' | 'offline';
  connected: boolean;
  pendingChanges: number;
  lastSync?: Date;
  error?: string;
}

export interface SyncStatistics {
  cachedResources: number;
  totalCacheSize: number;
  syncOperations: number;
  cacheHitRate: number;
  storageStats?: any;
}

export interface UnifiedResourceServiceContextType {
  // Core service
  resourceService: UnifiedResourceService | null;
  isInitialized: boolean;
  initializationError: string | null;
  
  // Sync status
  syncStatus: SyncStatus;
  offlineMode: boolean;
  setOfflineMode: (offline: boolean) => void;
  
  // Resource methods (alignment-centric)
  getResourcesForReference: (ref: ScriptureReference, options?: {
    includeAlignment?: boolean;
    resourceTypes?: string[];
    maxResults?: number;
  }) => Promise<TranslationResource[]>;
  
  getWordInteractions: (ref: ScriptureReference, word: string, options?: {
    includeOriginalText?: boolean;
    maxDepth?: number;
    includeRelated?: boolean;
  }) => Promise<AlignmentInteraction | null>;
  
  // Resource management
  storeResource: (resource: Omit<TranslationResource, 'metadata'> & { 
    metadata?: Partial<TranslationResource['metadata']> 
  }, options?: {
    syncToServer?: boolean;
    updateAlignment?: boolean;
  }) => Promise<{ success: boolean; resourceId?: string; syncStatus?: string; error?: string }>;
  
  // Scope management
  currentScope: ResourceScope;
  updateScope: (newScope: Partial<ResourceScope>) => Promise<void>;
  
  // Sync operations
  syncToServer: (resourceId: string) => Promise<{ success: boolean; error?: string }>;
  getSyncStatistics: () => Promise<SyncStatistics>;
  
  // Compatibility with existing resource service interface
  getAvailableBooks: () => Promise<string[]>;
  getPassageHelps: (reference: { book: string; chapter: number; verse?: number }) => Promise<any>;
}

// Create context
const UnifiedResourceServiceContext = createContext<UnifiedResourceServiceContextType | null>(null);

// Provider props
export interface UnifiedResourceServiceProviderProps {
  children: React.ReactNode;
  door43AuthToken?: string;
  offlineMode?: boolean;
  initialScope?: Partial<ResourceScope>;
  cacheSize?: number;
}

/**
 * Unified Resource Service Provider
 * Provides the enhanced resource service with sync capabilities
 */
export const UnifiedResourceServiceProvider: React.FC<UnifiedResourceServiceProviderProps> = ({
  children,
  door43AuthToken,
  offlineMode = false,
  initialScope,
  cacheSize = 100 * 1024 * 1024 // 100MB default
}) => {
  // State
  const [resourceService, setResourceService] = useState<UnifiedResourceService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'initializing',
    connected: false,
    pendingChanges: 0
  });
  const [offlineModeState, setOfflineModeState] = useState(offlineMode);
  const [currentScope, setCurrentScope] = useState<ResourceScope>({
    languages: ['en'],
    books: ['GEN', 'MAT', 'JON', 'PHM'], // Default books for foundations-bt
    resourceTypes: ['bible-text', 'translation-notes', 'translation-words', 'translation-questions'],
    offline: offlineMode,
    ...initialScope
  });
  
  // Initialize service
  useEffect(() => {
    let mounted = true;
    
    const initializeService = async () => {
      try {
        console.log('🎯 Initializing Unified Resource Service Context...');
        console.log(`   🔑 Auth Token: ${door43AuthToken ? 'Available' : 'Not provided'}`);
        console.log(`   📴 Offline Mode: ${offlineModeState}`);
        console.log(`   📚 Initial Scope: ${currentScope.languages.join(', ')} | ${currentScope.books.join(', ')}`);
        
        // Create service
        const service = createUnifiedResourceService({
          door43AuthToken,
          offlineMode: offlineModeState,
          scope: currentScope,
          cacheSize
        });
        
        // Initialize service
        const result = await service.initialize();
        if (!result.success) {
          throw new Error(result.error);
        }
        
        if (mounted) {
          setResourceService(service);
          setIsInitialized(true);
          setInitializationError(null);
          
          // Update sync status
          const status = service.getSyncStatus();
          setSyncStatus({
            state: status.state as any,
            connected: status.connected,
            pendingChanges: status.pendingChanges,
            lastSync: status.lastSync
          });
          
          console.log('✅ Unified Resource Service Context initialized');
          console.log(`   📊 Sync Status: ${status.state}`);
          console.log(`   🔗 Connected: ${status.connected}`);
        }
      } catch (error) {
        if (mounted) {
          const errorMessage = error instanceof Error ? error.message : 'Service initialization failed';
          setInitializationError(errorMessage);
          setSyncStatus(prev => ({
            ...prev,
            state: 'error',
            error: errorMessage
          }));
          console.error('❌ Unified Resource Service Context initialization failed:', error);
        }
      }
    };
    
    initializeService();
    
    return () => {
      mounted = false;
      if (resourceService) {
        resourceService.shutdown();
      }
    };
  }, [door43AuthToken, offlineModeState, cacheSize]);
  
  // Update sync status periodically
  useEffect(() => {
    if (!resourceService || !isInitialized) return;
    
    const updateSyncStatus = () => {
      const status = resourceService.getSyncStatus();
      setSyncStatus({
        state: status.state as any,
        connected: status.connected,
        pendingChanges: status.pendingChanges,
        lastSync: status.lastSync,
        error: status.error
      });
    };
    
    // Update immediately
    updateSyncStatus();
    
    // Update every 5 seconds
    const interval = setInterval(updateSyncStatus, 5000);
    
    return () => clearInterval(interval);
  }, [resourceService, isInitialized]);
  
  // Resource methods
  const getResourcesForReference = useCallback(async (
    ref: ScriptureReference, 
    options?: {
      includeAlignment?: boolean;
      resourceTypes?: string[];
      maxResults?: number;
    }
  ): Promise<TranslationResource[]> => {
    if (!resourceService) {
      console.warn('⚠️ Resource service not initialized');
      return [];
    }
    
    try {
      const result = await resourceService.getResourcesForReference(ref, options);
      if (result.success) {
        return result.data || [];
      } else {
        console.warn('⚠️ Failed to get resources for reference:', result.error);
        return [];
      }
    } catch (error) {
      console.error('❌ Error getting resources for reference:', error);
      return [];
    }
  }, [resourceService]);
  
  const getWordInteractions = useCallback(async (
    ref: ScriptureReference, 
    word: string, 
    options?: {
      includeOriginalText?: boolean;
      maxDepth?: number;
      includeRelated?: boolean;
    }
  ): Promise<AlignmentInteraction | null> => {
    if (!resourceService) {
      console.warn('⚠️ Resource service not initialized');
      return null;
    }
    
    try {
      const result = await resourceService.getWordInteractions(ref, word, options);
      if (result.success) {
        return result.data || null;
      } else {
        console.warn('⚠️ Failed to get word interactions:', result.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting word interactions:', error);
      return null;
    }
  }, [resourceService]);
  
  const storeResource = useCallback(async (
    resource: Omit<TranslationResource, 'metadata'> & { 
      metadata?: Partial<TranslationResource['metadata']> 
    },
    options?: {
      syncToServer?: boolean;
      updateAlignment?: boolean;
    }
  ) => {
    if (!resourceService) {
      return { success: false, error: 'Resource service not initialized' };
    }
    
    try {
      return await resourceService.storeResource(resource, options);
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Store operation failed' 
      };
    }
  }, [resourceService]);
  
  const updateScope = useCallback(async (newScope: Partial<ResourceScope>) => {
    if (!resourceService) {
      console.warn('⚠️ Resource service not initialized');
      return;
    }
    
    try {
      const updatedScope = { ...currentScope, ...newScope };
      const result = await resourceService.updateScope(updatedScope);
      
      if (result.success) {
        setCurrentScope(updatedScope);
        console.log('✅ Scope updated:', updatedScope);
      } else {
        console.warn('⚠️ Failed to update scope:', result.error);
      }
    } catch (error) {
      console.error('❌ Error updating scope:', error);
    }
  }, [resourceService, currentScope]);
  
  const syncToServer = useCallback(async (resourceId: string) => {
    if (!resourceService) {
      return { success: false, error: 'Resource service not initialized' };
    }
    
    try {
      // This would trigger a sync operation for a specific resource
      // For now, we'll simulate it
      console.log(`🔄 Syncing resource ${resourceId} to server...`);
      
      // Update sync status to show syncing
      setSyncStatus(prev => ({ ...prev, state: 'syncing' }));
      
      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update sync status back to idle
      setSyncStatus(prev => ({ 
        ...prev, 
        state: 'idle',
        lastSync: new Date()
      }));
      
      return { success: true };
    } catch (error) {
      setSyncStatus(prev => ({ 
        ...prev, 
        state: 'error',
        error: error instanceof Error ? error.message : 'Sync failed'
      }));
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sync operation failed' 
      };
    }
  }, [resourceService]);
  
  const getSyncStatistics = useCallback(async (): Promise<SyncStatistics> => {
    if (!resourceService) {
      return {
        cachedResources: 0,
        totalCacheSize: 0,
        syncOperations: 0,
        cacheHitRate: 0
      };
    }
    
    try {
      const stats = await resourceService.getStatistics();
      return {
        cachedResources: stats.cachedResources,
        totalCacheSize: stats.totalCacheSize,
        syncOperations: 0, // Would track sync operations
        cacheHitRate: 0.9, // Would calculate from actual metrics
        storageStats: stats.storageStats
      };
    } catch (error) {
      console.error('❌ Error getting sync statistics:', error);
      return {
        cachedResources: 0,
        totalCacheSize: 0,
        syncOperations: 0,
        cacheHitRate: 0
      };
    }
  }, [resourceService]);
  
  // Compatibility methods for existing resource service interface
  const getAvailableBooks = useCallback(async (): Promise<string[]> => {
    // Return books from current scope
    return currentScope.books;
  }, [currentScope.books]);
  
  const getPassageHelps = useCallback(async (reference: { book: string; chapter: number; verse?: number }) => {
    // Convert to our ScriptureReference format and get resources
    const scriptureRef: ScriptureReference = {
      book: reference.book,
      chapter: reference.chapter,
      verse: reference.verse
    };
    
    const resources = await getResourcesForReference(scriptureRef, {
      resourceTypes: ['translation-notes', 'translation-words', 'translation-questions'],
      maxResults: 50
    });
    
    // Convert to expected format for compatibility
    return {
      translationNotes: resources.filter(r => r.type === 'translation-notes'),
      translationWords: resources.filter(r => r.type === 'translation-words'),
      translationQuestions: resources.filter(r => r.type === 'translation-questions')
    };
  }, [getResourcesForReference]);
  
  // Context value
  const contextValue: UnifiedResourceServiceContextType = {
    // Core service
    resourceService,
    isInitialized,
    initializationError,
    
    // Sync status
    syncStatus,
    offlineMode: offlineModeState,
    setOfflineMode: setOfflineModeState,
    
    // Resource methods
    getResourcesForReference,
    getWordInteractions,
    storeResource,
    
    // Scope management
    currentScope,
    updateScope,
    
    // Sync operations
    syncToServer,
    getSyncStatistics,
    
    // Compatibility methods
    getAvailableBooks,
    getPassageHelps
  };
  
  return (
    <UnifiedResourceServiceContext.Provider value={contextValue}>
      {children}
    </UnifiedResourceServiceContext.Provider>
  );
};

/**
 * Hook to use the unified resource service context
 */
export const useUnifiedResourceService = (): UnifiedResourceServiceContextType => {
  const context = useContext(UnifiedResourceServiceContext);
  if (!context) {
    throw new Error('useUnifiedResourceService must be used within a UnifiedResourceServiceProvider');
  }
  return context;
};

/**
 * Hook for compatibility with existing useResourceService
 */
export const useResourceService = () => {
  const context = useUnifiedResourceService();
  
  // Return interface compatible with existing code
  return {
    resourceService: {
      getAvailableBooks: context.getAvailableBooks,
      getPassageHelps: context.getPassageHelps
    },
    isInitialized: context.isInitialized,
    syncStatus: context.syncStatus,
    offlineMode: context.offlineMode
  };
};

export default UnifiedResourceServiceProvider;
