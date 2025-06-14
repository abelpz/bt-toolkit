import React from 'react';
import { PanelType } from '../PanelSelector';

interface ResourceCardProps {
  resource: { type: PanelType; label: string; description: string };
  isEnabled: boolean;
  isDisabled: boolean;
  panelType: 'top' | 'bottom';
  onToggle: () => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  isEnabled,
  isDisabled,
  panelType,
  onToggle
}) => {
  const colorScheme = panelType === 'top' 
    ? {
        enabled: 'bg-blue-50/80 border-blue-300/60',
        hover: 'hover:bg-blue-50/30 hover:border-blue-200/40',
        indicator: 'bg-blue-500'
      }
    : {
        enabled: 'bg-green-50/80 border-green-300/60',
        hover: 'hover:bg-green-50/30 hover:border-green-200/40',
        indicator: 'bg-green-500'
      };

  return (
    <div
      onClick={() => !isDisabled && onToggle()}
      className={`
        relative p-3 rounded-xl border-2 transition-all duration-300 cursor-pointer group
        ${isEnabled 
          ? `${colorScheme.enabled} shadow-lg transform scale-[1.02]` 
          : `bg-white/60 border-slate-200/40 ${colorScheme.hover} hover:shadow-md`
        }
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <div className="flex flex-col items-center text-center">
        <div className="font-medium text-slate-800 tracking-wide mb-1">
          {resource.label}
        </div>
        <div className="text-xs text-slate-500 font-light leading-relaxed">
          {resource.description}
        </div>
      </div>
      
      {isEnabled && (
        <div className={`absolute top-2 right-2 w-1 h-1 rounded-full ${colorScheme.indicator} shadow-sm`}></div>
      )}
      
      {isDisabled && (
        <div className="absolute inset-0 bg-white/20 rounded-xl flex items-center justify-center">
          <div className="text-xs text-slate-600 bg-white/80 px-2 py-1 rounded-full">
            Required
          </div>
        </div>
      )}
    </div>
  );
}; 