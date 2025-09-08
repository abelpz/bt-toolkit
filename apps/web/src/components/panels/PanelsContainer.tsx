/**
 * Panels Container
 * LinkedPanels integration with resource definitions
 * Based on ARCHITECTURE.md Panels Layer
 */

import React, { useMemo } from 'react'
import { LinkedPanelsContainer, ResourceDefinition } from 'linked-panels'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { useNavigation } from '../../contexts/NavigationContext'
import { ResourceFactory } from '../resources/ResourceFactory'

export interface PanelsContainerProps {
  className?: string
}

export function PanelsContainer({ className = '' }: PanelsContainerProps) {
  const { state: workspaceState } = useWorkspace()
  const { state: navigationState } = useNavigation()
  
  // Create resource definitions from workspace metadata
  const resourceDefinitions = useMemo((): ResourceDefinition[] => {
    return Object.values(workspaceState.resourceMetadata)
      .filter(metadata => metadata.available)
      .map(metadata => ({
        id: metadata.id,
        title: metadata.title,
        description: metadata.description,
        type: metadata.type,
        subtype: metadata.subtype,
        
        // Resource component factory
        component: (props: any) => (
          <ResourceFactory
            {...props}
            resourceId={metadata.id}
            resourceData={workspaceState.processedBooks[metadata.id]}
            navigationState={navigationState}
            onCrossReference={handleCrossReference}
            onNavigationChange={handleNavigationChange}
            onShowModal={handleShowModal}
            onHideModal={handleHideModal}
          />
        )
      }))
  }, [workspaceState.resourceMetadata, workspaceState.processedBooks, navigationState])
  
  // LinkedPanels configuration - start with primary scripture only
  const linkedPanelsConfig = useMemo(() => {
    const availableResources = resourceDefinitions.map(r => r.id)
    
    // Panel 1: Primary Scripture (ULT or GLT - the one that was loaded during initialization)
    const primaryScripture = availableResources.find(id => id.includes('_ult')) ||
                             availableResources.find(id => id.includes('_glt')) ||
                             availableResources[0] // Fallback to first available
    
    // Create panel configuration with only primary scripture initially
    const panelConfig: any = {}
    
    if (primaryScripture) {
      panelConfig['panel-1'] = {
        resourceIds: [primaryScripture]
      }
      
      console.log(`📱 Initializing panels with primary scripture: ${primaryScripture}`)
    }
    
    return {
      resources: resourceDefinitions.map(def => ({
        id: def.id,
        title: def.title,
        component: def.component
      })),
      panels: panelConfig
    }
  }, [resourceDefinitions, workspaceState.resourceMetadata])
  
  // Event handlers for resource components
  const handleCrossReference = (crossRef: any) => {
    console.log('Cross-reference clicked:', crossRef)
    // TODO: Handle cross-reference navigation
  }
  
  const handleNavigationChange = (resourceId: string, newState: any) => {
    console.log('Resource navigation change:', resourceId, newState)
    // TODO: Update resource-specific navigation state
  }
  
  const handleShowModal = (content: any) => {
    console.log('Show modal:', content)
    // TODO: Handle modal display
  }
  
  const handleHideModal = () => {
    console.log('Hide modal')
    // TODO: Handle modal hiding
  }
  
  // Show loading state while workspace is initializing
  if (!workspaceState.initialized) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Initializing Workspace
          </h3>
          <p className="text-sm text-gray-500">
            Loading resources for {workspaceState.owner}/{workspaceState.language}...
          </p>
        </div>
      </div>
    )
  }
  
  // Show error state if no resources available
  if (resourceDefinitions.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            No Resources Available
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            No resources could be loaded for {workspaceState.owner}/{workspaceState.language}
          </p>
          <div className="text-xs text-gray-400">
            {Object.keys(workspaceState.errors).length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer">View Errors</summary>
                <div className="mt-2 text-left bg-red-50 p-3 rounded">
                  {Object.entries(workspaceState.errors).map(([key, error]) => (
                    <div key={key} className="mb-1">
                      <strong>{key}:</strong> {error}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`panels-container h-full ${className}`}>
      <LinkedPanelsContainer
        config={linkedPanelsConfig}
        options={{
          enableResize: true,
          enableDragDrop: true,
          enableResourceSwitching: true
        }}
      >
        <div className="h-full">
          {/* LinkedPanels will render the panels here */}
        </div>
      </LinkedPanelsContainer>
    </div>
  )
}
