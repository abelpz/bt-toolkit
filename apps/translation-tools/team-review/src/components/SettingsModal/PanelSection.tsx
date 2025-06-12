import React from 'react';
import { PanelType } from '../PanelSelector';
import { ResourceCard } from './ResourceCard';

interface PanelSectionProps {
  title: string;
  panelType: 'top' | 'bottom';
  enabledResources: PanelType[];
  allResources: { type: PanelType; label: string; description: string }[];
  onResourceToggle: (resourceType: PanelType, isEnabled: boolean) => void;
}

export const PanelSection: React.FC<PanelSectionProps> = ({
  title,
  panelType,
  enabledResources,
  allResources,
  onResourceToggle
}) => {
  const colorScheme = panelType === 'top' 
    ? {
        gradient: 'bg-gradient-to-r from-blue-50/50 to-transparent',
        border: 'border-blue-100/30',
        indicator: 'bg-blue-400'
      }
    : {
        gradient: 'bg-gradient-to-r from-green-50/50 to-transparent',
        border: 'border-green-100/30',
        indicator: 'bg-green-400'
      };

  return (
    <div className={`${colorScheme.gradient} rounded-2xl p-2 border ${colorScheme.border}`}>
      <div className="flex items-center mb-6">
        <div className={`w-3 h-3 rounded-full ${colorScheme.indicator} mr-4 shadow-sm`}></div>
        <h3 className="text-lg font-light text-slate-800 tracking-wide">{title}</h3>
        <div className="ml-auto text-xs text-slate-400 bg-slate-100/50 px-3 py-1 rounded-full">
          {enabledResources.length} enabled
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {allResources.map((resource) => {
          const isEnabled = enabledResources.includes(resource.type);
          const isDisabled = enabledResources.length === 1 && isEnabled;
          
          return (
            <ResourceCard
              key={`${panelType}-${resource.type}`}
              resource={resource}
              isEnabled={isEnabled}
              isDisabled={isDisabled}
              panelType={panelType}
              onToggle={() => onResourceToggle(resource.type, !isEnabled)}
            />
          );
        })}
      </div>
    </div>
  );
}; 