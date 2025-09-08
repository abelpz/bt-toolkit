/**
 * WorkspaceStatus - Displays workspace loading and status information
 * 
 * Shows initialization progress, loading states, and any errors
 */

import React from 'react'
import { useWorkspace } from '../contexts/WorkspaceContext'

export function WorkspaceStatus() {
  const workspace = useWorkspace()
  const { initializing, loadingStates, errors, owner, language, server } = workspace
  const hasErrors = Object.keys(errors).length > 0

  // Don't show anything if everything is loaded and no errors
  if (!initializing && Object.keys(loadingStates).length === 0 && !hasErrors) {
    return null
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between">
          {/* Status Information */}
          <div className="flex items-center space-x-4">
            {initializing && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-800">
                  Initializing workspace: {owner}/{language}
                </span>
              </div>
            )}

            {/* Loading States */}
            {Object.entries(loadingStates).map(([key, state]) => 
              state.loading && (
                <div key={key} className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-blue-800">
                    {state.message || `Loading ${key}...`}
                  </span>
                  {state.progress && (
                    <div className="w-20 bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${state.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              )
            )}

            {/* Error States */}
            {hasErrors && (
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
                <span className="text-sm text-red-800">
                  {Object.keys(errors).length} error(s) occurred
                </span>
              </div>
            )}
          </div>

          {/* Server Info */}
          <div className="text-xs text-blue-600">
            Connected to: {server}
          </div>
        </div>

        {/* Error Details */}
        {hasErrors && (
          <div className="mt-2 space-y-1">
            {Object.entries(errors).map(([key, error]) => (
              <div key={key} className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                <strong>{key}:</strong> {error}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
