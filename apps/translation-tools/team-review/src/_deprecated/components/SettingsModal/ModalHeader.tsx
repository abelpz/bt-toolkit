import React from 'react';

interface ModalHeaderProps {
  title: string;
  description: string;
  onClose: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  description,
  onClose
}) => {
  return (
    <div className="flex items-center justify-between p-8 pb-2 border-b border-slate-100/50">
      <div>
        <h2 className="text-2xl font-light text-slate-800 tracking-wide mb-2">
          {title}
        </h2>
        <p className="text-sm text-slate-500 font-light leading-relaxed">
          {description}
        </p>
      </div>
      <button
        onClick={onClose}
        className="w-10 h-10 rounded-full bg-slate-100/50 hover:bg-slate-200/50 flex items-center justify-center transition-all duration-300 text-slate-400 hover:text-slate-600 ml-6"
      >
        ✕
      </button>
    </div>
  );
}; 