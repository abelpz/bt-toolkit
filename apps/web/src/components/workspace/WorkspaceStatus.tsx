/**
 * Workspace Status
 * Shows workspace initialization status and resource availability
 * Based on ARCHITECTURE.md Workspace Context
 */

import React from 'react'
import { useWorkspace } from '../../contexts/WorkspaceContext'

export function WorkspaceStatus() {
  const { state } = useWorkspace()
  
  // Don't show anything if workspace is initialized and no errors
  if (state.initialized && Object.keys(state.errors).length === 0) {
    return null
  }
  
  // Show initialization status
  if (state.initializing) {
    return (
      <div className="workspace-status bg-blue-50 border-b border-blue-200 px-4 py-2">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-blue-700">
            Initializing workspace {state.owner}/{state.language}...
          </span>
        </div>
      </div>
    )
  }
  
  // Show errors if any
  if (Object.keys(state.errors).length > 0) {
    const errorCount = Object.keys(state.errors).length
    const availableCount = Object.values(state.resourceMetadata).filter(r => r.available).length
    const totalCount = Object.keys(state.resourceMetadata).length
    
    return (
      <div className="workspace-status bg-yellow-50 border-b border-yellow-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">⚠️</span>
            <span className="text-sm text-yellow-700">
              {errorCount} resource{errorCount !== 1 ? 's' : ''} failed to load
              {totalCount > 0 && ` (${availableCount}/${totalCount} available)`}
            </span>
          </div>
          
          <details className="text-sm">
            <summary className="cursor-pointer text-yellow-600 hover:text-yellow-700">
              View Details
            </summary>
            <div className="mt-2 p-3 bg-yellow-100 rounded text-xs max-w-md">
              {Object.entries(state.errors).map(([key, error]) => (
                <div key={key} className="mb-2 last:mb-0">
                  <div className="font-medium text-yellow-800">{key}:</div>
                  <div className="text-yellow-700 ml-2">{error}</div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    )
  }
  
  // Show success message briefly after initialization
  if (state.initialized) {
    const availableCount = Object.values(state.resourceMetadata).filter(r => r.available).length
    
    return (
      <div className="workspace-status bg-green-50 border-b border-green-200 px-4 py-2">
        <div className="flex items-center space-x-2">
          <span className="text-green-600">✅</span>
          <span className="text-sm text-green-700">
            Workspace {state.owner}/{state.language} loaded with {availableCount} resource{availableCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    )
  }
  
  return null
}
