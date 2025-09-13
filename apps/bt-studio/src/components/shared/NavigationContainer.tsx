/**
 * NavigationContainer - Shared navigation container component
 * 
 * Provides consistent layout and spacing for navigation bars
 */

import React from 'react'

interface NavigationContainerProps {
  children: React.ReactNode
}

export function NavigationContainer({ children }: NavigationContainerProps) {
  return (
    <div className="max-w-8xl mx-auto px-3 sm:px-4 lg:px-4">
      <div className="flex justify-between items-center py-2">
        {children}
      </div>
    </div>
  )
}
