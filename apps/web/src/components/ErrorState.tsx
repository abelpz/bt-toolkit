/**
 * Error State Component
 * Displays error messages with retry functionality
 */

import React from 'react';

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ title, message, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      {/* Error Icon */}
      <div className="text-red-500 dark:text-red-400 text-5xl">
        <span role="img" aria-label="Warning">⚠️</span>
      </div>
      
      {/* Error Content */}
      <div className="text-center max-w-md">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          {message}
        </p>
      </div>
      
      {/* Retry Button */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="
            bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600
            text-white px-6 py-2.5 rounded-lg text-sm font-semibold
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
            dark:focus:ring-offset-gray-800
            shadow-sm hover:shadow-md
          "
        >
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorState;
