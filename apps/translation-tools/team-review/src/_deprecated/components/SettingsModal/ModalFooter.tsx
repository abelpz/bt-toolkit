import React from 'react';

interface ModalFooterProps {
  onReset?: () => void;
  onPrimary: () => void;
  resetLabel?: string;
  primaryLabel: string;
  helpText?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  onReset,
  onPrimary,
  resetLabel = "Reset All",
  primaryLabel,
  helpText
}) => {
  return (
    <div className="border-t border-slate-100/50 bg-white/80 backdrop-blur-sm p-6">
      <div className="flex gap-4">
        {onReset && (
          <button
            onClick={onReset}
            className="flex-1 px-6 py-3 bg-slate-100/70 text-slate-600 rounded-2xl hover:bg-slate-200/70 transition-all duration-300 text-sm font-light tracking-wide border border-slate-200/50"
          >
            {resetLabel}
          </button>
        )}
        <button
          onClick={onPrimary}
          className="flex-2 px-8 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-700 transition-all duration-300 text-sm font-light tracking-wide shadow-lg"
        >
          {primaryLabel}
        </button>
      </div>
      
      {helpText && (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-400 font-light">
            {helpText}
          </p>
        </div>
      )}
    </div>
  );
}; 