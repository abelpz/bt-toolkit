/**
 * Loading State Component
 * Displays loading indicators with cache status
 */

import React from 'react';

interface LoadingStateProps {
  message: string;
  detail?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message, detail }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      {/* Loading Spinner */}
      <div className="loading-spinner w-10 h-10"></div>
      
      {/* Loading Message */}
      <div className="text-center">
        <div className="text-gray-900 dark:text-gray-100 font-semibold text-lg">
          {message}
        </div>
        {detail && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {detail}
          </div>
        )}
      </div>
      
      {/* Progress Indicator */}
      <div className="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 shadow-inner">
        <div className="
          bg-gradient-to-r from-blue-500 to-purple-600 
          dark:from-blue-400 dark:to-purple-500
          h-2.5 rounded-full animate-pulse shadow-sm
        " style={{ width: '60%' }}></div>
      </div>
    </div>
  );
};

export default LoadingState;
