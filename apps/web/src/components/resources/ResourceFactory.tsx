/**
 * Resource Factory
 * Dynamic component creation based on resource type
 * Based on ARCHITECTURE.md Resource Component Factory System
 */

import React from 'react'
import { ResourceType, ResourceComponentProps } from '../../types/resources'
import { ScriptureResourceComponent } from './ScriptureResourceComponent'
import { NotesResourceComponent } from './NotesResourceComponent'
import { WordsResourceComponent } from './WordsResourceComponent'
import { AcademyResourceComponent } from './AcademyResourceComponent'
import { UnknownResourceComponent } from './UnknownResourceComponent'

// Component Registry Type
export type ResourceComponentRegistry = Record<string, React.ComponentType<ResourceComponentProps>>

// Default Component Registry
const defaultComponentRegistry: ResourceComponentRegistry = {
  [ResourceType.SCRIPTURE]: ScriptureResourceComponent,
  [ResourceType.NOTES]: NotesResourceComponent,
  [ResourceType.WORDS]: WordsResourceComponent,
  [ResourceType.ACADEMY]: AcademyResourceComponent,
  [ResourceType.AUDIO]: UnknownResourceComponent, // TODO: Implement
  [ResourceType.VIDEO]: UnknownResourceComponent, // TODO: Implement
  [ResourceType.IMAGES]: UnknownResourceComponent // TODO: Implement
}

// Factory Props
export interface ResourceFactoryProps extends Omit<ResourceComponentProps, 'resourceData'> {
  // Resource identification
  resourceId: string
  
  // Resource data from workspace context
  resourceData?: any
  
  // Component registry override
  componentRegistry?: ResourceComponentRegistry
  
  // Error boundary
  onError?: (error: Error, resourceId: string) => void
}

// Resource Factory Component
export function ResourceFactory({
  resourceId,
  resourceData,
  componentRegistry = defaultComponentRegistry,
  onError,
  ...props
}: ResourceFactoryProps) {
  // Determine resource type from resourceData or resourceId
  const resourceType = getResourceType(resourceData, resourceId)
  
  // Get component from registry
  const ResourceComponent = componentRegistry[resourceType] || UnknownResourceComponent
  
  // Error boundary wrapper
  return (
    <ResourceErrorBoundary resourceId={resourceId} onError={onError}>
      <ResourceComponent
        {...props}
        resourceId={resourceId}
        resourceData={resourceData}
      />
    </ResourceErrorBoundary>
  )
}

// Error Boundary for Resource Components
interface ResourceErrorBoundaryProps {
  children: React.ReactNode
  resourceId: string
  onError?: (error: Error, resourceId: string) => void
}

interface ResourceErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ResourceErrorBoundary extends React.Component<
  ResourceErrorBoundaryProps,
  ResourceErrorBoundaryState
> {
  constructor(props: ResourceErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error): ResourceErrorBoundaryState {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Resource error in ${this.props.resourceId}:`, error, errorInfo)
    this.props.onError?.(error, this.props.resourceId)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Resource Error
          </h3>
          <p className="text-red-600 mb-2">
            Failed to load resource: {this.props.resourceId}
          </p>
          {this.state.error && (
            <details className="text-sm text-red-500">
              <summary className="cursor-pointer">Error Details</summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
                {this.state.error.message}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )
    }
    
    return this.props.children
  }
}

// Utility function to determine resource type
function getResourceType(resourceData: any, resourceId: string): string {
  // If we have resource data, use its type
  if (resourceData?.type) {
    return resourceData.type
  }
  
  // Otherwise, infer from resource ID
  const [, resourceType] = resourceId.split('_')
  
  if (['ult', 'ust', 'glt', 'gst'].includes(resourceType)) {
    return ResourceType.SCRIPTURE
  }
  
  if (resourceType === 'tn') return ResourceType.NOTES
  if (resourceType === 'tw') return ResourceType.WORDS
  if (resourceType === 'ta') return ResourceType.ACADEMY
  if (resourceType === 'audio') return ResourceType.AUDIO
  if (resourceType === 'video') return ResourceType.VIDEO
  if (resourceType === 'images') return ResourceType.IMAGES
  
  // Default to scripture for unknown types
  return ResourceType.SCRIPTURE
}

// Factory Hook for easier usage
export function useResourceFactory() {
  return {
    createResource: (props: ResourceFactoryProps) => <ResourceFactory {...props} />,
    getResourceType,
    defaultComponentRegistry
  }
}
