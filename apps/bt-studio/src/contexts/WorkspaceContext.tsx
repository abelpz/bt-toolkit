/**
 * WorkspaceContext - Zustand-based workspace state management
 * 
 * This context manages the workspace-level state using the new resource configuration architecture:
 * - Declarative resource configuration from APP_RESOURCES
 * - Resource Manager orchestration with configured adapters
 * - Anchor resource identification and management
 * - Panel configuration generation from resource declarations
 */

import { createContext, useContext, useEffect } from 'react'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { devtools } from 'zustand/middleware'
import { LinkedPanelsConfig } from 'linked-panels'
import { 
  WorkspaceStore, 
  WorkspaceProviderProps, 
  BaseResource, 
  ResourceType, 
  LoadingState,
  ResourceMetadata,
  ProcessedContent,
  StorageInfo
} from '../types/context'
import { createResourceManager } from '../services/resources/ResourceManager'
import { createIndexedDBStorage } from '../services/storage/IndexedDBStorageAdapter'

// Import the new resource configuration system
import { 
  initializeAppResources, 
  getAppResourceConfig
} from '../services/resource-config'

// ============================================================================
// ZUSTAND STORE DEFINITION
// ============================================================================

const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    immer((set, get) => ({
      // ========================================================================
      // INITIAL STATE
      // ========================================================================
      owner: '',
      language: '',
      server: 'git.door43.org',
      
      // Resource management (enhanced with ResourceManager and resource config)
      resourceManager: null,
      resources: {},
      resourceMetadata: {},
      anchorResource: null,
      anchorResourceId: null,
      
      // Resource configuration
      resourceConfigs: [],
      processedResourceConfig: null,
      
      panelConfig: null,
      initializing: false,
      appReady: false,  // App not ready until anchor metadata + first book loaded
      loadingStates: {},
      errors: {},
      storageInfo: null,

      // ========================================================================
      // WORKSPACE MANAGEMENT ACTIONS
      // ========================================================================
      
      initializeWorkspace: async (
        owner: string, 
        language: string, 
        server = 'git.door43.org',
        resourceMode: 'minimal' | 'default' | 'comprehensive' = 'default'
      ) => {
        const currentState = get()
        
        // Prevent re-initialization if already initializing or initialized with same params
        if (currentState.initializing || 
            (currentState.owner === owner && 
             currentState.language === language && 
             currentState.server === server && 
             currentState.resourceManager !== null)) {
          console.log(`⏭️ Skipping workspace initialization - already initialized or in progress`)
          return
        }
        
        console.log(`🚀 Initializing workspace: ${owner}/${language} (${resourceMode} mode)`)
        
        set((state) => {
          state.owner = owner
          state.language = language
          state.server = server
          state.initializing = true
          state.errors = {}
        })

        try {
          // Step 1: Get resource configuration based on mode
          console.log('📋 Loading resource configuration...')
          const resourceConfigs = getAppResourceConfig(resourceMode)
          
          set((state) => {
            state.resourceConfigs = resourceConfigs
          })
          
          console.log(`📦 Loaded ${resourceConfigs.length} resource configurations`)
          
          // Step 2: Initialize storage and ResourceManager
          console.log('🔧 Initializing storage and ResourceManager...')
          const storageAdapter = createIndexedDBStorage('bt-studio-workspace')
          const resourceManager = createResourceManager()
          
          // Initialize storage first
          await storageAdapter.initialize()
          
          // Step 3: Use the new resource configuration system
          console.log('🔧 Processing resource configurations...')
          const { processedConfig, panelConfig, anchorResource } = await initializeAppResources(
            resourceConfigs,
            { server, owner, language },
            storageAdapter,
            resourceManager
          )
          
          // Step 4: Update workspace state with processed configuration
          set((state) => {
            state.resourceManager = resourceManager
            state.processedResourceConfig = processedConfig
            state.panelConfig = panelConfig
            state.anchorResource = anchorResource.metadata
            state.anchorResourceId = anchorResource.metadata.id
            
            // Convert processed metadata to the existing format for compatibility
            state.resourceMetadata = {}
            processedConfig.forEach(config => {
              state.resourceMetadata[config.metadata.id] = config.metadata
            })
          })
          
          console.log(`✅ Resources initialized: ${processedConfig.length} resources, anchor: ${anchorResource.metadata.title}`)
          
          // Step 5: Load initial content from anchor resource
          // Note: Initial content loading is now handled by NavigationContext with the correct book
          
          // Step 6: Load initial storage info
          await get().refreshStorageInfo()
          
          console.log(`✅ Workspace initialized: ${owner}/${language}`)
          
          set((state) => {
            state.initializing = false
            state.appReady = true  // App is now ready - anchor metadata + first book loaded
          })
          
          console.log(`🎉 App ready for navigation!`)
        } catch (error) {
          console.error('❌ Failed to initialize workspace:', error)
          
          set((state) => {
            state.initializing = false
            state.appReady = false  // App not ready due to error
            state.errors.workspace = error instanceof Error ? error.message : 'Unknown error'
          })
        }
      },

      resetWorkspace: () => {
        console.log('🔄 Resetting workspace')
        
        set((state) => {
          state.owner = ''
          state.language = ''
          state.server = 'git.door43.org'
          state.resourceManager = null
          state.resources = {}
          state.resourceMetadata = {}
          state.anchorResource = null
          state.anchorResourceId = null
          
          // Reset resource configuration
          state.resourceConfigs = []
          state.processedResourceConfig = null
          
          state.panelConfig = null
          state.initializing = false
          state.appReady = false  // Reset app ready state
          state.loadingStates = {}
          state.errors = {}
          state.storageInfo = null
        })
      },

      // ========================================================================
      // RESOURCE MANAGER INTEGRATION
      // ========================================================================

      refreshResourceMetadata: async () => {
        console.log('🔄 Refreshing resource metadata...')
        // Re-initialize the workspace to refresh all resources
        const { owner, language, server } = get()
        if (owner && language) {
          await get().initializeWorkspace(owner, language, server)
        }
      },

      loadInitialAnchorContent: async (bookCode?: string) => {
        const { anchorResource, anchorResourceId, resourceManager } = get()
        
        if (!anchorResource || !anchorResourceId || !resourceManager) {
          console.log('⏭️ Skipping initial content load - no anchor resource, resource ID, or resource manager')
          return
        }

        try {
          // Use provided book code, or fall back to first book from anchor resource
          const targetBook = bookCode || anchorResource.toc?.books?.[0]?.code || 'gen'
          const contentKey = `${anchorResource.server}/${anchorResource.owner}/${anchorResource.language}/${anchorResourceId}/${targetBook}`
          
          console.log(`📖 Loading initial content for ${targetBook} from anchor resource`)
          
          // This will cache the content for faster navigation
          await resourceManager.getOrFetchContent(contentKey, anchorResource.type)
          
          console.log(`✅ Initial anchor content loaded: ${targetBook}`)
        } catch (error) {
          console.warn('⚠️ Failed to load initial anchor content:', error)
          // Don't throw - this is not critical for app initialization
        }
      },

      getOrFetchContent: async (key: string, resourceType: ResourceType): Promise<ProcessedContent | null> => {
        const { resourceManager } = get()
        
        if (!resourceManager) {
          throw new Error('ResourceManager not initialized')
        }

        console.log(`📖 Getting content for key: ${key}`)
        
        try {
          return await resourceManager.getOrFetchContent(key, resourceType)
        } catch (error) {
          console.error(`❌ Failed to get content for ${key}:`, error)
          throw error
        }
      },

      preloadContent: async (keys: string[], resourceType: ResourceType) => {
        const { resourceManager } = get()
        
        if (!resourceManager) {
          throw new Error('ResourceManager not initialized')
        }

        console.log(`📦 Preloading ${keys.length} content items`)
        
        try {
          await resourceManager.preloadContent(keys, resourceType)
          console.log(`✅ Preloaded ${keys.length} content items`)
        } catch (error) {
          console.error('❌ Failed to preload content:', error)
          throw error
        }
      },

      setAnchorResource: (resource: ResourceMetadata) => {
        console.log(`⚓ Setting anchor resource: ${resource.title}`)
        
        set((state) => {
          state.anchorResource = resource
        })
      },

      getAnchorResource: (): ResourceMetadata | null => {
        return get().anchorResource
      },

      clearCache: async () => {
        const { resourceManager } = get()
        
        if (!resourceManager) {
          throw new Error('ResourceManager not initialized')
        }

        console.log('🧹 Clearing cache...')
        
        try {
          // Use ResourceManager's clearExpiredContent method
          await resourceManager.clearExpiredContent()
          await get().refreshStorageInfo()
          console.log('✅ Cache cleared successfully')
        } catch (error) {
          console.error('❌ Failed to clear cache:', error)
          throw error
        }
      },

      getStorageInfo: async (): Promise<StorageInfo> => {
        const { resourceManager } = get()
        
        if (!resourceManager) {
          throw new Error('ResourceManager not initialized')
        }

        return await resourceManager.getStorageInfo()
      },

      refreshStorageInfo: async () => {
        try {
          const storageInfo = await get().getStorageInfo()
          
          set((state) => {
            state.storageInfo = storageInfo
          })
          
          console.log(`📊 Storage info updated: ${storageInfo.itemCount} items, ${Math.round(storageInfo.totalSize / 1024)} KB`)
        } catch (error) {
          console.error('❌ Failed to refresh storage info:', error)
        }
      },

      // ========================================================================
      // RESOURCE MANAGEMENT ACTIONS
      // ========================================================================
      
      loadResource: async (resourceType: ResourceType, resourceId: string): Promise<BaseResource | null> => {
        console.log(`📦 Loading resource: ${resourceType}/${resourceId}`)
        
        set((state) => {
          state.loadingStates[resourceId] = { loading: true, message: `Loading ${resourceType}...` }
        })

        try {
          // Use real adapter for scripture resources
          if (resourceType === ResourceType.SCRIPTURE) {
            return await get().loadScriptureResource(resourceId)
          }
          
          // For other resource types, return mock for now
          const mockResource: BaseResource = {
            id: resourceId,
            type: resourceType,
            title: `Mock ${resourceType} Resource`,
            description: `Mock resource for ${resourceId}`,
            metadata: {}
          }

          set((state) => {
            state.resources[resourceId] = mockResource
            state.loadingStates[resourceId] = { loading: false }
          })

          console.log(`✅ Resource loaded: ${resourceId}`)
          return mockResource
        } catch (error) {
          console.error(`❌ Failed to load resource ${resourceId}:`, error)
          
          set((state) => {
            state.loadingStates[resourceId] = { loading: false }
            state.errors[resourceId] = error instanceof Error ? error.message : 'Unknown error'
          })
          
          return null
        }
      },

      loadScriptureResource: async (resourceId: string): Promise<BaseResource | null> => {
        const { owner, language, server } = get()
        
        try {
          // Import the adapter
          const { door43ULTAdapter } = await import('../services/adapters/Door43ScriptureAdapter')
          
          // For now, assume we're loading Genesis (gen) - later this will be dynamic
          const bookCode = 'gen'
          
          console.log(`📖 Loading scripture: ${resourceId} for ${bookCode}`)
          
          // Fetch the scripture content
          const scriptureContent = await door43ULTAdapter.getBookContent(server, owner, language, bookCode)
          
          // Create a scripture resource
          const scriptureResource: BaseResource = {
            id: resourceId,
            type: ResourceType.SCRIPTURE,
            title: `${scriptureContent.book} (ULT)`,
            description: `Unfoldingword Literal Text - ${scriptureContent.book}`,
            metadata: {
              bookCode: scriptureContent.bookCode,
              book: scriptureContent.book,
              chapters: scriptureContent.chapters.length,
              verses: scriptureContent.metadata.statistics.totalVerses,
              content: scriptureContent // Store the processed content
            }
          }

          set((state) => {
            state.resources[resourceId] = scriptureResource
            state.loadingStates[resourceId] = { loading: false }
          })

          console.log(`✅ Scripture loaded: ${scriptureContent.book} with ${scriptureContent.chapters.length} chapters`)
          return scriptureResource
        } catch (error) {
          console.error(`❌ Failed to load scripture ${resourceId}:`, error)
          
          set((state) => {
            state.loadingStates[resourceId] = { loading: false }
            state.errors[resourceId] = error instanceof Error ? error.message : 'Unknown error'
          })
          
          throw error
        }
      },

      getResource: (resourceId: string): BaseResource | null => {
        return get().resources[resourceId] || null
      },

      isResourceAvailable: (resourceId: string): boolean => {
        const metadata = get().resourceMetadata[resourceId]
        return metadata?.available || false
      },

      // ========================================================================
      // PANEL CONFIGURATION MANAGEMENT ACTIONS
      // ========================================================================

      updatePanelConfig: (config: LinkedPanelsConfig) => {
        console.log('🔄 Updating panel configuration:', config)
        
        set((state) => {
          state.panelConfig = config
        })
      },

      getPanelConfig: (): LinkedPanelsConfig | null => {
        return get().panelConfig
      },



      // ========================================================================
      // LOADING STATE MANAGEMENT ACTIONS
      // ========================================================================
      
      setLoadingState: (key: string, state: LoadingState) => {
        set((draft) => {
          draft.loadingStates[key] = state
        })
      },

      clearLoadingState: (key: string) => {
        set((state) => {
          delete state.loadingStates[key]
        })
      },

      // ========================================================================
      // ERROR MANAGEMENT ACTIONS
      // ========================================================================
      
      setError: (key: string, error: string) => {
        set((state) => {
          state.errors[key] = error
        })
      },

      clearError: (key: string) => {
        set((state) => {
          delete state.errors[key]
        })
      },

      clearAllErrors: () => {
        set((state) => {
          state.errors = {}
        })
      }
    })),
    { name: 'workspace-store' }
  )
)

// ============================================================================
// CONTEXT DEFINITION
// ============================================================================

const WorkspaceContext = createContext<WorkspaceStore | null>(null)

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function WorkspaceProvider({ 
  children, 
  initialOwner = 'unfoldingWord',
  initialLanguage = 'en',
  initialServer = 'git.door43.org',
  resourceMode = 'default'
}: WorkspaceProviderProps & { 
  resourceMode?: 'minimal' | 'default' | 'comprehensive' 
}) {
  const store = useWorkspaceStore()

  // Expose store to window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { workspaceStore: WorkspaceStore }).workspaceStore = store
      console.log('🔧 Workspace store exposed to window.workspaceStore for debugging')
    }
  }, [store])

  // Initialize workspace on mount
  useEffect(() => {
    if (initialOwner && initialLanguage) {
      store.initializeWorkspace(initialOwner, initialLanguage, initialServer, resourceMode)
    }
  }, [store, initialOwner, initialLanguage, initialServer, resourceMode])

  return (
    <WorkspaceContext.Provider value={store}>
      {children}
    </WorkspaceContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useWorkspace(): WorkspaceStore {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}

// ============================================================================
// SELECTOR HOOKS FOR PERFORMANCE
// ============================================================================

/**
 * Hook to subscribe to specific parts of the workspace state
 * This prevents unnecessary re-renders when unrelated state changes
 */
export function useWorkspaceSelector<T>(selector: (state: WorkspaceStore) => T): T {
  return useWorkspaceStore(selector)
}

/**
 * Hook to get workspace loading state
 */
export function useWorkspaceLoading() {
  return useWorkspaceSelector((state) => ({
    initializing: state.initializing,
    loadingStates: state.loadingStates,
    hasErrors: Object.keys(state.errors).length > 0,
    errors: state.errors
  }))
}

/**
 * Hook to get workspace configuration
 */
export function useWorkspaceConfig() {
  return useWorkspaceSelector((state) => ({
    owner: state.owner,
    language: state.language,
    server: state.server
  }))
}

/**
 * Hook to get resource information
 */
export function useWorkspaceResources() {
  return useWorkspaceSelector((state) => ({
    resources: state.resources,
    resourceMetadata: state.resourceMetadata,
    getResource: state.getResource,
    isResourceAvailable: state.isResourceAvailable,
    loadResource: state.loadResource
  }))
}

/**
 * Hook to get panel configuration
 */
export function useWorkspacePanels() {
  return useWorkspaceSelector((state) => state.panelConfig)
}
