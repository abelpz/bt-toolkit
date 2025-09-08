/**
 * ReadyNavigationBar - Navigation bar that only renders when workspace is ready
 * 
 * This component ensures that navigation components only mount after the workspace
 * has fully initialized with anchor resource metadata and initial book content.
 */

import React from 'react'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { NavigationBar } from './NavigationBar'

export function ReadyNavigationBar() {
  const workspace = useWorkspace()
  
  // Only render navigation when workspace is fully ready
  if (!workspace.appReady) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* App Title */}
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">BT Studio</h1>
            <div className="text-sm text-gray-500">
              {workspace.owner}/{workspace.language}
            </div>
          </div>

          {/* Loading State */}
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500 animate-pulse">
              Loading navigation...
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Workspace is ready, render full navigation
  return <NavigationBar />
}
