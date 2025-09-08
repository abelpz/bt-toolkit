/**
 * Panel Layer
 * Manages individual panel state and resource selection
 * Contains multiple resources and handles switching between them
 */

import React, { useState, useCallback } from 'react';
import { ResourceLayer } from './ResourceLayer';
import { useNavigation } from './PanelsLayer';
import { useWorkspace } from './WorkspaceLayer';

// Panel props interface
interface PanelLayerProps {
  panelId: string;
  availableResourceTypes: string[];
  defaultResourceType: string;
}

// Resource type metadata
const RESOURCE_METADATA = {
  ult: { title: 'ULT', description: 'Literal Translation', icon: '📖' },
  ust: { title: 'UST', description: 'Simplified Translation', icon: '📚' },
  tn: { title: 'TN', description: 'Translation Notes', icon: '📝' },
  glt: { title: 'GLT', description: 'Gateway Language Translation', icon: '🌐' }
};

export const PanelLayer: React.FC<PanelLayerProps> = ({
  panelId,
  availableResourceTypes,
  defaultResourceType
}) => {
  const { navigationState } = useNavigation();
  const { config } = useWorkspace();
  const [currentResourceType, setCurrentResourceType] = useState(defaultResourceType);
  const [currentResourceIndex, setCurrentResourceIndex] = useState(
    availableResourceTypes.indexOf(defaultResourceType)
  );

  // Navigate to previous resource
  const goToPreviousResource = useCallback(() => {
    const newIndex = currentResourceIndex > 0 
      ? currentResourceIndex - 1 
      : availableResourceTypes.length - 1;
    
    setCurrentResourceIndex(newIndex);
    setCurrentResourceType(availableResourceTypes[newIndex]);
  }, [currentResourceIndex, availableResourceTypes]);

  // Navigate to next resource
  const goToNextResource = useCallback(() => {
    const newIndex = currentResourceIndex < availableResourceTypes.length - 1 
      ? currentResourceIndex + 1 
      : 0;
    
    setCurrentResourceIndex(newIndex);
    setCurrentResourceType(availableResourceTypes[newIndex]);
  }, [currentResourceIndex, availableResourceTypes]);

  // Select specific resource
  const selectResource = useCallback((resourceType: string) => {
    const index = availableResourceTypes.indexOf(resourceType);
    if (index !== -1) {
      setCurrentResourceIndex(index);
      setCurrentResourceType(resourceType);
    }
  }, [availableResourceTypes]);

  const currentMetadata = RESOURCE_METADATA[currentResourceType as keyof typeof RESOURCE_METADATA] || {
    title: currentResourceType.toUpperCase(),
    description: 'Resource',
    icon: '📄'
  };

  return (
    <div className="h-full flex flex-col">
      {/* Panel Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Resource Navigation */}
          <div className="flex items-center space-x-2">
            {/* Previous Resource Button */}
            <button
              onClick={goToPreviousResource}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Previous Resource"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Current Resource Info */}
            <div className="flex items-center space-x-2">
              <span className="text-lg">{currentMetadata.icon}</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {currentMetadata.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {currentMetadata.description}
                </div>
              </div>
            </div>

            {/* Next Resource Button */}
            <button
              onClick={goToNextResource}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Next Resource"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Resource Dropdown */}
          <div className="relative">
            <select
              value={currentResourceType}
              onChange={(e) => selectResource(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              {availableResourceTypes.map(resourceType => {
                const metadata = RESOURCE_METADATA[resourceType as keyof typeof RESOURCE_METADATA] || {
                  title: resourceType.toUpperCase(),
                  icon: '📄'
                };
                return (
                  <option key={resourceType} value={resourceType}>
                    {metadata.icon} {metadata.title}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Resource Counter */}
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {currentResourceIndex + 1} of {availableResourceTypes.length} resources
        </div>
      </div>

      {/* Resource Content */}
      <div className="flex-1 overflow-hidden">
        <ResourceLayer
          resourceType={currentResourceType}
          owner={config.owner}
          language={config.language}
          navigationRange={navigationState.currentRange}
        />
      </div>
    </div>
  );
};
