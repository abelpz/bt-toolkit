/**
 * Workspace Context
 * Manages owner/language scope with resource metadata and processed book content
 * Based on ARCHITECTURE.md Context Architecture
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { BaseResource, ResourceType } from '../types/resources'
import { createStorage, UnifiedStorage } from '../lib/storage'
import { Door43ScriptureService } from '../lib/services/door43-scripture-service'

// Workspace State
export interface WorkspaceState {
  // Current workspace configuration
  owner: string
  language: string
  server: string
  
  // Resource Metadata (lightweight, loaded immediately)
  resourceMetadata: Record<string, ResourceMetadata>
  
  // Resource Component Registry (maps types to components)
  componentRegistry: Record<string, React.ComponentType<any>>
  
  // Processed Book Content (heavy, loaded on-demand)
  processedBooks: Record<string, Record<string, any>> // resourceId -> bookCode -> ProcessedBook
  
  // Resource Cross-References
  resourceLinks: Record<string, ResourceLinks>
  
  // Loading States
  loadingStates: Record<string, LoadingState>
  
  // Error States
  errors: Record<string, string>
  
  // Initialization state
  initialized: boolean
  initializing: boolean
}

export interface ResourceMetadata {
  id: string
  title: string
  description: string
  type: ResourceType
  subtype?: string
  available: boolean
  lastUpdated?: Date
  bookCount?: number
}

export interface ResourceLinks {
  related: string[]
  fallback?: string
  sourceTexts?: string[]
}

export interface LoadingState {
  metadata: boolean
  books: Record<string, boolean> // bookCode -> loading
}

// Workspace Actions
export type WorkspaceAction =
  | { type: 'SET_WORKSPACE'; payload: { owner: string; language: string; server: string } }
  | { type: 'SET_INITIALIZING'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_RESOURCE_METADATA'; payload: Record<string, ResourceMetadata> }
  | { type: 'SET_RESOURCE_LINKS'; payload: Record<string, ResourceLinks> }
  | { type: 'SET_BOOK_CONTENT'; payload: { resourceId: string; bookCode: string; content: any } }
  | { type: 'SET_LOADING_STATE'; payload: { resourceId: string; type: 'metadata' | 'book'; bookCode?: string; loading: boolean } }
  | { type: 'SET_ERROR'; payload: { key: string; error: string } }
  | { type: 'CLEAR_ERROR'; payload: string }
  | { type: 'RESET_WORKSPACE' }

// Initial State
const initialState: WorkspaceState = {
  owner: 'unfoldingWord',
  language: 'en',
  server: 'door43.org',
  resourceMetadata: {},
  componentRegistry: {},
  processedBooks: {},
  resourceLinks: {},
  loadingStates: {},
  errors: {},
  initialized: false,
  initializing: false
}

// Reducer
function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SET_WORKSPACE':
      return {
        ...initialState, // Reset everything
        ...action.payload,
        componentRegistry: state.componentRegistry // Preserve component registry
      }
    
    case 'SET_INITIALIZING':
      return { ...state, initializing: action.payload }
    
    case 'SET_INITIALIZED':
      return { ...state, initialized: action.payload, initializing: false }
    
    case 'SET_RESOURCE_METADATA':
      return { ...state, resourceMetadata: action.payload }
    
    case 'SET_RESOURCE_LINKS':
      return { ...state, resourceLinks: action.payload }
    
    case 'SET_BOOK_CONTENT':
      return {
        ...state,
        processedBooks: {
          ...state.processedBooks,
          [action.payload.resourceId]: {
            ...state.processedBooks[action.payload.resourceId],
            [action.payload.bookCode]: action.payload.content
          }
        }
      }
    
    case 'SET_LOADING_STATE':
      const { resourceId, type, bookCode, loading } = action.payload
      const currentLoadingState = state.loadingStates[resourceId] || { metadata: false, books: {} }
      
      if (type === 'metadata') {
        return {
          ...state,
          loadingStates: {
            ...state.loadingStates,
            [resourceId]: { ...currentLoadingState, metadata: loading }
          }
        }
      } else if (type === 'book' && bookCode) {
      return {
        ...state,
        loadingStates: {
          ...state.loadingStates,
            [resourceId]: {
              ...currentLoadingState,
              books: { ...currentLoadingState.books, [bookCode]: loading }
            }
          }
        }
      }
      return state
    
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.error }
      }
    
    case 'CLEAR_ERROR':
      const { [action.payload]: removed, ...remainingErrors } = state.errors
      return { ...state, errors: remainingErrors }
    
    case 'RESET_WORKSPACE':
      return { ...initialState, componentRegistry: state.componentRegistry }
    
    default:
      return state
  }
}

// Context
export interface WorkspaceContextValue {
  state: WorkspaceState
  dispatch: React.Dispatch<WorkspaceAction>
  
  // Helper functions
  initializeWorkspace: (owner: string, language: string, server?: string) => Promise<void>
  getBookContent: (resourceId: string, bookCode: string) => Promise<any>
  loadResourceOnDemand: (resourceType: string) => Promise<ResourceMetadata | null>
  isBookLoaded: (resourceId: string, bookCode: string) => boolean
  isResourceAvailable: (resourceId: string) => boolean
  getResourceMetadata: (resourceId: string) => ResourceMetadata | undefined
  
  // Services
  storage: UnifiedStorage
  scriptureService: Door43ScriptureService
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

// Provider Props
export interface WorkspaceProviderProps {
  children: ReactNode
  initialOwner?: string
  initialLanguage?: string
  initialServer?: string
}

// Provider Component
export function WorkspaceProvider({ 
  children, 
  initialOwner = 'unfoldingWord',
  initialLanguage = 'en',
  initialServer = 'door43.org'
}: WorkspaceProviderProps) {
  const [state, dispatch] = useReducer(workspaceReducer, {
    ...initialState,
    owner: initialOwner,
    language: initialLanguage,
    server: initialServer
  })
  
  // Initialize services asynchronously
  const [storage, setStorage] = React.useState<UnifiedStorage | null>(null)
  const [scriptureService, setScriptureService] = React.useState<Door43ScriptureService | null>(null)
  
  // Initialize storage and services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        console.log('🔧 Initializing storage system...')
        const storageInstance = await createStorage({ platform: 'memory' }) // Will be IndexedDB in production
        setStorage(storageInstance)
        
        console.log('🔧 Initializing Door43 Scripture service...')
        const service = new Door43ScriptureService(storageInstance)
        setScriptureService(service)
        
        console.log('✅ Services initialized successfully')
      } catch (error) {
        console.error('❌ Failed to initialize services:', error)
      }
    }
    
    initializeServices()
  }, [])
  
  // Initialize workspace when services are ready or owner/language changes
  useEffect(() => {
    if (scriptureService && !state.initialized && !state.initializing) {
      initializeWorkspace(state.owner, state.language, state.server)
    }
  }, [scriptureService, state.owner, state.language, state.server, state.initialized, state.initializing])
  
  // Initialize workspace when owner/language changes
  const initializeWorkspace = async (owner: string, language: string, server = 'door43.org') => {
    console.log(`🚀 Initializing workspace: ${owner}/${language}`)
    
    // Wait for services to be ready
    if (!scriptureService) {
      console.log('⏳ Waiting for services to initialize...')
      return
    }
    
    dispatch({ type: 'SET_WORKSPACE', payload: { owner, language, server } })
    dispatch({ type: 'SET_INITIALIZING', payload: true })
    
    try {
      // ARCHITECTURE: Only load primary scripture resource (ULT or GLT as fallback) for navigation initialization
      console.log(`📖 Loading primary scripture resource for navigation...`)
      
      let primaryScriptureResource: ResourceMetadata | null = null
      let primaryResourceId: string | null = null
      
      // Try ULT first, then GLT as fallback
      const primaryResourceTypes = ['ult', 'glt']
      
      for (const resourceType of primaryResourceTypes) {
        const resourceId = `${language}_${resourceType}`
        
        try {
          console.log(`🔍 Trying ${resourceType.toUpperCase()}...`)
          dispatch({ type: 'SET_LOADING_STATE', payload: { resourceId, type: 'metadata', loading: true } })
          
          // Try to get metadata from Door43
          const resourceMetadata = await scriptureService.getResourceMetadata({
            server,
            owner,
            language,
            resourceType: resourceType as any
          })
          
          primaryScriptureResource = {
            id: resourceId,
            title: resourceMetadata.title,
            description: resourceMetadata.description,
            type: getResourceType(resourceType),
            subtype: resourceType,
            available: true,
            lastUpdated: resourceMetadata.lastModified,
            bookCount: resourceMetadata.availableBooks?.length
          }
          
          primaryResourceId = resourceId
          dispatch({ type: 'CLEAR_ERROR', payload: resourceId })
          console.log(`✅ Found primary scripture: ${resourceType.toUpperCase()} (${resourceMetadata.availableBooks?.length} books)`)
          break // Found primary resource, stop looking
          
        } catch (error) {
          console.warn(`❌ ${resourceType.toUpperCase()} not available:`, error)
          dispatch({ type: 'SET_ERROR', payload: { 
            key: resourceId, 
            error: `Failed to load ${resourceType}: ${error instanceof Error ? error.message : 'Unknown error'}` 
          } })
        } finally {
          dispatch({ type: 'SET_LOADING_STATE', payload: { resourceId, type: 'metadata', loading: false } })
        }
      }
      
      if (!primaryScriptureResource || !primaryResourceId) {
        throw new Error(`No primary scripture resource found. Tried: ${primaryResourceTypes.join(', ')}`)
      }
      
      // Initialize workspace with only the primary scripture resource
      const metadata: Record<string, ResourceMetadata> = {
        [primaryResourceId]: primaryScriptureResource
      }
      
      const links: Record<string, ResourceLinks> = {
        [primaryResourceId]: getResourceLinks(primaryScriptureResource.subtype!, language)
      }
      
      // Update workspace with primary resource
      dispatch({ type: 'SET_RESOURCE_METADATA', payload: metadata })
      dispatch({ type: 'SET_RESOURCE_LINKS', payload: links })
      dispatch({ type: 'SET_INITIALIZED', payload: true })
      
      console.log(`✅ Workspace initialized with primary scripture: ${primaryResourceId}`)
      console.log(`📚 Navigation will be initialized from ${primaryScriptureResource.bookCount} available books`)
      
    } catch (error) {
      console.error('Failed to initialize workspace:', error)
      dispatch({ type: 'SET_ERROR', payload: { key: 'workspace', error: error.message } })
      dispatch({ type: 'SET_INITIALIZING', payload: false })
    }
  }
  
  // Get book content (on-demand loading)
  const getBookContent = async (resourceId: string, bookCode: string): Promise<any> => {
      // Check if already loaded
    if (state.processedBooks[resourceId]?.[bookCode]) {
      return state.processedBooks[resourceId][bookCode]
    }
    
    // Check if resource is available
    const metadata = state.resourceMetadata[resourceId]
    if (!metadata?.available) {
      throw new Error(`Resource ${resourceId} is not available`)
    }
    
    console.log(`📖 Loading book content: ${resourceId} ${bookCode}`)
    
    dispatch({ type: 'SET_LOADING_STATE', payload: { resourceId, type: 'book', bookCode, loading: true } })
    
    try {
      // For scripture resources, use the scripture service
      if (metadata.type === ResourceType.SCRIPTURE) {
        const [, resourceType] = resourceId.split('_')
        const content = await scriptureService.getScripture({
          server: state.server,
          owner: state.owner,
          language: state.language,
          resourceType: resourceType as any,
          bookCode
        })
        
        dispatch({ type: 'SET_BOOK_CONTENT', payload: { resourceId, bookCode, content } })
        dispatch({ type: 'CLEAR_ERROR', payload: `${resourceId}_${bookCode}` })
        
        return content
      }
      
      // TODO: Implement other resource types (notes, words, academy)
      throw new Error(`Resource type ${metadata.type} not yet implemented`)
      
      } catch (error) {
      console.error(`Failed to load ${resourceId} ${bookCode}:`, error)
      dispatch({ type: 'SET_ERROR', payload: { 
        key: `${resourceId}_${bookCode}`, 
        error: error.message 
      } })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING_STATE', payload: { resourceId, type: 'book', bookCode, loading: false } })
    }
  }
  
  // Load additional resource on-demand (for panels)
  const loadResourceOnDemand = async (resourceType: string): Promise<ResourceMetadata | null> => {
    const resourceId = `${state.language}_${resourceType}`
    
    // Check if already loaded
    if (state.resourceMetadata[resourceId]) {
      return state.resourceMetadata[resourceId]
    }
    
    console.log(`📦 Loading resource on-demand: ${resourceType}`)
    
    try {
      dispatch({ type: 'SET_LOADING_STATE', payload: { resourceId, type: 'metadata', loading: true } })
      
      // Try to get metadata from Door43
      const resourceMetadata = await scriptureService!.getResourceMetadata({
        server: state.server,
        owner: state.owner,
        language: state.language,
        resourceType: resourceType as any
      })
      
      const metadata: ResourceMetadata = {
        id: resourceId,
        title: resourceMetadata.title,
        description: resourceMetadata.description,
        type: getResourceType(resourceType),
        subtype: resourceType,
        available: true,
        lastUpdated: resourceMetadata.lastModified,
        bookCount: resourceMetadata.availableBooks?.length
      }
      
      const links = getResourceLinks(resourceType, state.language)
      
      // Update workspace with new resource
      dispatch({ type: 'SET_RESOURCE_METADATA', payload: { 
        ...state.resourceMetadata, 
        [resourceId]: metadata 
      } })
      dispatch({ type: 'SET_RESOURCE_LINKS', payload: { 
        ...state.resourceLinks, 
        [resourceId]: links 
      } })
      
      dispatch({ type: 'CLEAR_ERROR', payload: resourceId })
      console.log(`✅ Loaded resource on-demand: ${resourceType}`)
      
      return metadata
      
      } catch (error) {
      console.warn(`❌ Failed to load resource ${resourceType}:`, error)
      
      // Mark as unavailable
      const unavailableMetadata: ResourceMetadata = {
        id: resourceId,
        title: getResourceTitle(resourceType, state.language),
        description: `${resourceType.toUpperCase()} resource`,
        type: getResourceType(resourceType),
        subtype: resourceType,
        available: false,
        lastUpdated: undefined,
        bookCount: 0
      }
      
      dispatch({ type: 'SET_RESOURCE_METADATA', payload: { 
        ...state.resourceMetadata, 
        [resourceId]: unavailableMetadata 
      } })
      
      dispatch({ type: 'SET_ERROR', payload: { 
        key: resourceId, 
        error: `Failed to load ${resourceType}: ${error instanceof Error ? error.message : 'Unknown error'}` 
      } })
      
      return null
      
    } finally {
      dispatch({ type: 'SET_LOADING_STATE', payload: { resourceId, type: 'metadata', loading: false } })
    }
  }
  
  // Helper functions
  const isBookLoaded = (resourceId: string, bookCode: string): boolean => {
    return !!state.processedBooks[resourceId]?.[bookCode]
  }
  
  const isResourceAvailable = (resourceId: string): boolean => {
    return state.resourceMetadata[resourceId]?.available ?? false
  }
  
  const getResourceMetadata = (resourceId: string): ResourceMetadata | undefined => {
    return state.resourceMetadata[resourceId]
  }
  
  // Initialize on mount
  useEffect(() => {
    if (!state.initialized && !state.initializing) {
      initializeWorkspace(state.owner, state.language, state.server)
    }
  }, [state.owner, state.language, state.server, state.initialized, state.initializing])
  
  const contextValue: WorkspaceContextValue = {
    state: {
      ...state,
      initializing: state.initializing || !storage || !scriptureService
    },
    dispatch,
    initializeWorkspace,
    getBookContent,
    loadResourceOnDemand,
    isBookLoaded,
    isResourceAvailable,
    getResourceMetadata,
    storage: storage || ({} as UnifiedStorage), // Provide empty object during initialization
    scriptureService: scriptureService || ({} as Door43ScriptureService)
  }

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  )
}

// Hook
export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}

// Helper functions
function getResourceType(resourceType: string): ResourceType {
  if (['ult', 'ust', 'glt', 'gst'].includes(resourceType)) {
    return ResourceType.SCRIPTURE
  }
  if (resourceType === 'tn') return ResourceType.NOTES
  if (resourceType === 'tw') return ResourceType.WORDS
  if (resourceType === 'ta') return ResourceType.ACADEMY
  return ResourceType.SCRIPTURE // Default
}

function getResourceTitle(resourceType: string, language: string): string {
  const titles: Record<string, string> = {
    'ult': 'Literal Translation',
    'ust': 'Simplified Translation',
    'glt': 'Gateway Language Translation',
    'gst': 'Gateway Simplified Translation',
    'tn': 'Translation Notes',
    'tw': 'Translation Words',
    'ta': 'Translation Academy'
  }
  
  const title = titles[resourceType] || resourceType.toUpperCase()
  return `${language.toUpperCase()} ${title}`
}

function getResourceLinks(resourceType: string, language: string): ResourceLinks {
  const resourceId = `${language}_${resourceType}`
  
  // Define relationships based on resource type
  switch (resourceType) {
    case 'ult':
      return {
        related: [`${language}_ust`, `${language}_tn`],
        fallback: `${language}_glt`
      }
    case 'ust':
      return {
        related: [`${language}_ult`, `${language}_tn`],
        fallback: `${language}_gst`
      }
    case 'glt':
      return {
        related: [`${language}_gst`, `${language}_tn`]
      }
    case 'gst':
      return {
        related: [`${language}_glt`, `${language}_tn`]
      }
    case 'tn':
      return {
        related: [`${language}_ult`, `${language}_ust`, `${language}_tw`, `${language}_ta`],
        sourceTexts: [`${language}_ult`, `${language}_ust`]
      }
    case 'tw':
      return {
        related: [`${language}_tn`, `${language}_ta`],
        sourceTexts: [`${language}_ult`, `${language}_ust`]
      }
    case 'ta':
      return {
        related: [`${language}_tn`, `${language}_tw`]
      }
    default:
      return { related: [] }
  }
}
