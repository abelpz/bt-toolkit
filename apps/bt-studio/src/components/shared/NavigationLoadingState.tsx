/**
 * NavigationLoadingState - Loading placeholder for navigation controls
 * 
 * Shows skeleton loading state that matches the shape of actual navigation controls
 */

import React from 'react'

export function NavigationLoadingState() {
  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2 animate-pulse">
        <div className="h-8 w-32 bg-gray-200 rounded-md"></div>
        <div className="h-8 w-16 bg-gray-200 rounded-md"></div>
        <div className="h-8 w-16 bg-gray-200 rounded-md"></div>
      </div>
    </div>
  )
}
