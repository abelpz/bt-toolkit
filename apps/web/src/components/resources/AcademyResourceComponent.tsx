/**
 * Academy Resource Component
 * Handles Translation Academy (TA)
 * Based on ARCHITECTURE.md Resource Component Interface
 */

import React from 'react'
import { ResourceComponentProps } from '../../types/resources'

export function AcademyResourceComponent({
  resourceId,
  navigationState,
  onCrossReference,
  onNavigationChange,
  onShowModal,
  onHideModal,
  panelId
}: ResourceComponentProps) {
  return (
    <div className="academy-resource h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">
          Translation Academy
        </h2>
        <p className="text-sm text-gray-600">
          Independent Navigation Mode
        </p>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-4">🎓</div>
          <h3 className="text-lg font-medium mb-2">Translation Academy</h3>
          <p className="text-sm">
            Academy resource implementation coming soon...
          </p>
          <div className="mt-4 text-xs text-gray-400">
            Resource ID: {resourceId}
          </div>
        </div>
      </div>
    </div>
  )
}
