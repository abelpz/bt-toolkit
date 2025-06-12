import React from 'react';

export type PanelType = 'ult' | 'ust' | 'tn';

interface PanelSelectorProps {
  currentPanel: PanelType;
  onPanelChange: (panel: PanelType) => void;
  position: 'top' | 'bottom';
  className?: string;
}

const panelConfig = {
  ult: {
    label: 'ULT',
    icon: '◐',
    description: 'Literal',
    color: 'bg-slate-900'
  },
  ust: {
    label: 'UST',
    icon: '◑',
    description: 'Simplified',
    color: 'bg-slate-700'
  },
  tn: {
    label: 'Notes',
    icon: '◒',
    description: 'Context',
    color: 'bg-slate-600'
  }
};

export const PanelSelector: React.FC<PanelSelectorProps> = ({
  currentPanel,
  onPanelChange,
  position,
  className = ''
}) => {
  return (
    <div className={`flex bg-white/95 backdrop-blur-sm border-b border-gray-200/50 ${className}`}>
      <div className="flex-1 flex">
        {Object.entries(panelConfig).map(([key, config]) => {
          const panelKey = key as PanelType;
          const isActive = currentPanel === panelKey;
          
          return (
            <button
              key={panelKey}
              onClick={() => onPanelChange(panelKey)}
              className={`
                flex-1 flex flex-col items-center justify-center py-4 px-3 text-xs font-medium transition-all duration-300 ease-out relative
                ${isActive 
                  ? `${config.color} text-white` 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }
              `}
            >
              <span className="text-xl mb-1.5 font-light">{config.icon}</span>
              <span className="font-medium tracking-wide">{config.label}</span>
              <span className={`text-xs font-light ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                {config.description}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/30"></div>
              )}
            </button>
          );
        })}
      </div>
      
      <div className="flex items-center px-4 text-xs text-gray-400 border-l border-gray-200/50">
        <div className="w-1 h-1 rounded-full bg-gray-300 mr-2"></div>
        <span className="font-light tracking-wider">{position.toUpperCase()}</span>
      </div>
    </div>
  );
}; 