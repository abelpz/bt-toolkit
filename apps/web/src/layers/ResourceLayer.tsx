/**
 * Resource Layer
 * Handles resource fetching, caching, and rendering
 * 1. Check workspace context for existing resource
 * 2. Check IndexedDB cache
 * 3. Fetch from API, process, cache, and add to context
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NavigationRange } from './PanelsLayer';
import { fetchScripture, fetchTranslationNotes } from '../services/door43-api';
import { offlineCache } from '../services/offline-cache';

// Resource data interfaces
export interface ResourceData {
  id: string;
  type: string;
  owner: string;
  language: string;
  book: string;
  content: any;
  lastFetched: number;
  sha?: string;
}

// Workspace context for shared resources
interface WorkspaceResourceContextType {
  resources: Map<string, ResourceData>;
  addResource: (resource: ResourceData) => void;
  getResource: (id: string) => ResourceData | undefined;
  clearResources: () => void;
}

// Create workspace resource context
const WorkspaceResourceContext = createContext<WorkspaceResourceContextType | undefined>(undefined);

// Hook to use workspace resource context
export const useWorkspaceResources = (): WorkspaceResourceContextType => {
  const context = useContext(WorkspaceResourceContext);
  if (!context) {
    throw new Error('useWorkspaceResources must be used within ResourceLayer');
  }
  return context;
};

// Resource layer props
interface ResourceLayerProps {
  resourceType: string;
  owner: string;
  language: string;
  navigationRange: NavigationRange;
}

// Resource state
interface ResourceState {
  data: any;
  isLoading: boolean;
  error: string | null;
  cacheStatus: 'fresh' | 'cached' | 'stale' | 'none';
}

// Global workspace resources (shared across all ResourceLayer instances)
let globalWorkspaceResources = new Map<string, ResourceData>();

export const ResourceLayer: React.FC<ResourceLayerProps> = ({
  resourceType,
  owner,
  language,
  navigationRange
}) => {
  const [resourceState, setResourceState] = useState<ResourceState>({
    data: null,
    isLoading: false,
    error: null,
    cacheStatus: 'none'
  });

  // Generate unique resource ID
  const generateResourceId = useCallback((
    type: string,
    owner: string,
    language: string,
    book: string
  ): string => {
    return `${owner}/${language}/${type}/${book}`;
  }, []);

  // Add resource to workspace context
  const addResourceToWorkspace = useCallback((resource: ResourceData) => {
    globalWorkspaceResources.set(resource.id, resource);
    console.log(`📦 Added resource to workspace: ${resource.id}`);
  }, []);

  // Get resource from workspace context
  const getResourceFromWorkspace = useCallback((id: string): ResourceData | undefined => {
    return globalWorkspaceResources.get(id);
  }, []);

  // Fetch resource with the specified priority logic
  const fetchResource = useCallback(async (
    type: string,
    owner: string,
    language: string,
    book: string
  ): Promise<any> => {
    const resourceId = generateResourceId(type, owner, language, book);
    
    console.log(`🔍 Fetching resource: ${resourceId}`);
    setResourceState(prev => ({ ...prev, isLoading: true, error: null }));

    // Declare variables outside try block for catch block access
    let cachedData = null;
    let cacheStatus: 'fresh' | 'cached' | 'stale' | 'none' = 'none';

    try {
      // Step 1: Check workspace context
      const workspaceResource = getResourceFromWorkspace(resourceId);
      if (workspaceResource) {
        console.log(`✅ Found in workspace context: ${resourceId}`);
        setResourceState({
          data: workspaceResource.content,
          isLoading: false,
          error: null,
          cacheStatus: 'fresh'
        });
        return workspaceResource.content;
      }

      // Step 2: Check IndexedDB cache
      
      if (type === 'ult' || type === 'ust' || type === 'glt') {
        // Scripture resource
        const context = {
          organization: owner,
          language,
          resourceType: type
        };
        cachedData = await offlineCache.getCachedScripture(context, book);
        
        if (cachedData) {
          const cacheKey = `${owner}/${language}/${type}/${book}`;
          const isValid = await offlineCache.isCacheValid(cacheKey, 'scripture');
          cacheStatus = isValid ? 'fresh' : 'stale';
          console.log(`📋 Found cached scripture: ${resourceId} (${cacheStatus})`);
        }
      } else if (type === 'tn') {
        // Translation notes resource
        const context = {
          organization: owner,
          language,
          resourceType: 'tn'
        };
        cachedData = await offlineCache.getCachedTranslationNotes(context, book);
        
        if (cachedData) {
          const cacheKey = `${owner}/${language}/tn/${book}`;
          const isValid = await offlineCache.isCacheValid(cacheKey, 'translation_notes');
          cacheStatus = isValid ? 'fresh' : 'stale';
          console.log(`📝 Found cached notes: ${resourceId} (${cacheStatus})`);
        }
      }

      // If we have fresh cached data, use it and add to workspace
      if (cachedData && cacheStatus === 'fresh') {
        const resourceData: ResourceData = {
          id: resourceId,
          type,
          owner,
          language,
          book,
          content: cachedData,
          lastFetched: Date.now(),
          sha: cachedData.sha
        };
        
        addResourceToWorkspace(resourceData);
        setResourceState({
          data: cachedData,
          isLoading: false,
          error: null,
          cacheStatus: 'cached'
        });
        return cachedData;
      }

      // Step 3: Fetch from API
      console.log(`🌐 Fetching from API: ${resourceId}`);
      let fetchedData = null;
      
      if (type === 'ult' || type === 'ust' || type === 'glt') {
        // Fetch scripture
        console.log(`📖 Fetching scripture: book="${book}", owner="${owner}", language="${language}", type="${type}"`);
        if (!book) {
          throw new Error('Book name is required for scripture fetching');
        }
        fetchedData = await fetchScripture(book, undefined, {
          organization: owner,
          language,
          resourceType: type
        });
      } else if (type === 'tn') {
        // Fetch translation notes
        fetchedData = await fetchTranslationNotes(book, navigationRange.chapter, {
          organization: owner,
          language,
          resourceType: 'tn'
        });
      }

      if (!fetchedData) {
        throw new Error(`Failed to fetch ${type} resource`);
      }

      // Step 4: Cache the fetched data (done automatically by fetchScripture/fetchTranslationNotes)
      // The door43-api functions handle caching internally, so we don't need to cache here
      console.log(`✅ Data fetched and cached by door43-api: ${resourceId}`);

      // Step 5: Add to workspace context
      const resourceData: ResourceData = {
        id: resourceId,
        type,
        owner,
        language,
        book,
        content: fetchedData,
        lastFetched: Date.now(),
        sha: fetchedData.sha
      };
      
      addResourceToWorkspace(resourceData);
      
      setResourceState({
        data: fetchedData,
        isLoading: false,
        error: null,
        cacheStatus: 'fresh'
      });

      console.log(`✅ Successfully fetched and cached: ${resourceId}`);
      return fetchedData;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to fetch resource ${resourceId}:`, errorMessage);
      
      // If we have stale cached data, use it as fallback
      if (cachedData && cacheStatus === 'stale') {
        console.log(`🔄 Using stale cache as fallback: ${resourceId}`);
        setResourceState({
          data: cachedData,
          isLoading: false,
          error: `Using cached data (${errorMessage})`,
          cacheStatus: 'stale'
        });
        return cachedData;
      }
      
      setResourceState({
        data: null,
        isLoading: false,
        error: errorMessage,
        cacheStatus: 'none'
      });
      
      throw error;
    }
  }, [generateResourceId, getResourceFromWorkspace, addResourceToWorkspace, navigationRange.chapter]);

  // Effect to fetch resource when dependencies change
  useEffect(() => {
    fetchResource(resourceType, owner, language, navigationRange.book);
  }, [fetchResource, resourceType, owner, language, navigationRange.book]);

  // Render resource content
  const renderResourceContent = () => {
    if (resourceState.isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Loading {resourceType.toUpperCase()}...
            </div>
          </div>
        </div>
      );
    }

    if (resourceState.error && !resourceState.data) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-600 dark:text-red-400">
            <div className="text-lg mb-2">⚠️</div>
            <div className="text-sm">{resourceState.error}</div>
          </div>
        </div>
      );
    }

    if (!resourceState.data) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500 dark:text-gray-400">
            No data available
          </div>
        </div>
      );
    }

    // Render based on resource type
    if (resourceType === 'ult' || resourceType === 'ust' || resourceType === 'glt') {
      return <ScriptureRenderer data={resourceState.data} range={navigationRange} />;
    } else if (resourceType === 'tn') {
      return <NotesRenderer data={resourceState.data} range={navigationRange} />;
    }

    return (
      <div className="p-4">
        <pre className="text-sm text-gray-700 dark:text-gray-300">
          {JSON.stringify(resourceState.data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Resource Status Bar */}
      <div className="flex-shrink-0 px-4 py-1 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className={`inline-block w-2 h-2 rounded-full ${
              resourceState.cacheStatus === 'fresh' ? 'bg-green-500' :
              resourceState.cacheStatus === 'cached' ? 'bg-blue-500' :
              resourceState.cacheStatus === 'stale' ? 'bg-yellow-500' :
              'bg-gray-500'
            }`}></span>
            <span className="text-gray-600 dark:text-gray-400">
              {resourceState.cacheStatus === 'fresh' ? 'Fresh' :
               resourceState.cacheStatus === 'cached' ? 'Cached' :
               resourceState.cacheStatus === 'stale' ? 'Stale' :
               'No Cache'}
            </span>
          </div>
          
          {resourceState.error && (
            <span className="text-red-600 dark:text-red-400">
              {resourceState.error}
            </span>
          )}
        </div>
      </div>

      {/* Resource Content */}
      <div className="flex-1 overflow-auto">
        {renderResourceContent()}
      </div>
    </div>
  );
};

// Simple Scripture Renderer
const ScriptureRenderer: React.FC<{ data: any; range: NavigationRange }> = ({ data, range }) => {
  if (!data || !data.chapters) {
    return <div className="p-4 text-gray-500">No scripture data available</div>;
  }

  const chapter = data.chapters[range.chapter];
  if (!chapter || !chapter.verses) {
    return <div className="p-4 text-gray-500">Chapter {range.chapter} not found</div>;
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        {range.book.toUpperCase()} {range.chapter}
      </h3>
      <div className="space-y-2">
        {Object.entries(chapter.verses).map(([verseNum, verseData]: [string, any]) => (
          <div key={verseNum} className="flex">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-8 flex-shrink-0">
              {verseNum}
            </span>
            <div className="text-gray-900 dark:text-white">
              {verseData.text || JSON.stringify(verseData)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Simple Notes Renderer
const NotesRenderer: React.FC<{ data: any; range: NavigationRange }> = ({ data, range }) => {
  if (!data || !Array.isArray(data)) {
    return <div className="p-4 text-gray-500">No notes data available</div>;
  }

  // Filter notes for current verse
  const currentVerseNotes = data.filter((note: any) => {
    if (!note.reference) return false;
    const ref = note.reference.toLowerCase();
    return ref.includes(`${range.chapter}:${range.verse}`);
  });

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Translation Notes - {range.book.toUpperCase()} {range.chapter}:{range.verse}
      </h3>
      
      {currentVerseNotes.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400">
          No notes available for this verse
        </div>
      ) : (
        <div className="space-y-4">
          {currentVerseNotes.map((note: any, index: number) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {note.reference}
              </div>
              <div className="text-gray-900 dark:text-white">
                {note.note || note.text || JSON.stringify(note)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
