import React from 'react';
import { PanelType } from './PanelSelector';

interface PanelHeaderProps {
  currentPanel: PanelType;
  onPanelChange: (panel: PanelType) => void;
  availableResources: PanelType[];
  position: 'top' | 'bottom';
  className?: string;
}

const panelConfig = {
  ult: { label: 'ULT', description: 'Literal Text' },
  ust: { label: 'UST', description: 'Simplified Text' },
  tn: { label: 'Notes', description: 'Translation Notes' }
};

// panelOrder is now determined by availableResources prop

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  currentPanel,
  onPanelChange,
  availableResources,
  position,
  className = ''
}) => {
  const currentIndex = availableResources.indexOf(currentPanel);
  
  const goToPrevious = () => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : availableResources.length - 1;
    onPanelChange(availableResources[prevIndex]);
  };
  
  const goToNext = () => {
    const nextIndex = currentIndex < availableResources.length - 1 ? currentIndex + 1 : 0;
    onPanelChange(availableResources[nextIndex]);
  };

  return (
    <div className={`flex items-center justify-between bg-white/90 backdrop-blur-sm border-b border-gray-200/50 px-4 py-3 ${className}`}>
      <button
        onClick={goToPrevious}
        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all duration-200 text-slate-600 hover:text-slate-800"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M7.5 9L4.5 6L7.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      
      <div className="flex-1 text-center">
        <h3 className="text-base font-medium text-slate-800 tracking-wide">
          {panelConfig[currentPanel].label}
        </h3>
        <p className="text-xs text-slate-500 font-light">
          {panelConfig[currentPanel].description}
        </p>
      </div>
      
      <button
        onClick={goToNext}
        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all duration-200 text-slate-600 hover:text-slate-800"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      
      {/* Panel indicator dots */}
      <div className="absolute right-4 bottom-1 flex space-x-1">
        {availableResources.map((panel, index) => (
          <div
            key={panel}
            className={`w-1 h-1 rounded-full transition-all duration-200 ${
              index === currentIndex ? 'bg-slate-600' : 'bg-slate-300'
            }`}
          />
        ))}
      </div>
      
      {/* Position indicator */}
      <div className="absolute left-4 bottom-1">
        <div className={`w-1 h-1 rounded-full ${position === 'top' ? 'bg-blue-400' : 'bg-green-400'}`}></div>
      </div>
    </div>
  );
}; 