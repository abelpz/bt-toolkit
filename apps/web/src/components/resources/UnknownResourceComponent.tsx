/**
 * Unknown Resource Component
 * Fallback for unrecognized resource types
 * Based on ARCHITECTURE.md Resource Component Factory System
 */

import React from 'react'
import { ResourceComponentProps } from '../../types/resources'

export function UnknownResourceComponent({
  resourceId,
  navigationState,
  onCrossReference,
  onNavigationChange,
  onShowModal,
  onHideModal,
  panelId
}: ResourceComponentProps) {
  return (
    <div className="unknown-resource h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">
          Unknown Resource
        </h2>
        <p className="text-sm text-gray-600">
          {resourceId}
        </p>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-4">❓</div>
          <h3 className="text-lg font-medium mb-2">Unknown Resource Type</h3>
          <p className="text-sm mb-4">
            No component registered for this resource type.
          </p>
          <div className="bg-gray-100 p-3 rounded text-xs text-left max-w-md mx-auto">
            <div><strong>Resource ID:</strong> {resourceId}</div>
            <div><strong>Panel ID:</strong> {panelId}</div>
            <div><strong>Current Book:</strong> {navigationState.book}</div>
            <div><strong>Current Reference:</strong> {navigationState.chapter}:{navigationState.verse}</div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Register a component for this resource type in the ResourceFactory
          </p>
        </div>
      </div>
    </div>
  )
}
