import React from 'react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  category?: string;
  description?: string;
  children?: React.ReactNode;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  category,
  description,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {icon && <span className="text-2xl">{icon}</span>}
              <div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                {category && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                    {category}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto">
          {description && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
            </div>
          )}
          {children}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}; 