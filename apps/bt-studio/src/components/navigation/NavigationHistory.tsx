/**
 * Navigation History Component
 * 
 * Provides back/forward navigation buttons.
 * Uses individual selectors to avoid infinite loop issues.
 */

import React from 'react';
import { useNavigationSelector } from '../../contexts/NavigationContext';

interface NavigationHistoryProps {
  className?: string;
  compact?: boolean;
}

// Individual stable selectors to avoid object recreation
const selectCanGoBack = (state: any) => state.canGoBack();
const selectCanGoForward = (state: any) => state.canGoForward();
const selectGoBack = (state: any) => state.goBack;
const selectGoForward = (state: any) => state.goForward;
// History length and index selectors removed - not needed

export const NavigationHistory: React.FC<NavigationHistoryProps> = ({
  className = '',
  compact = false
}) => {
  // Use individual selectors to prevent object recreation
  const canBack = useNavigationSelector(selectCanGoBack);
  const canForward = useNavigationSelector(selectCanGoForward);
  const goBack = useNavigationSelector(selectGoBack);
  const goForward = useNavigationSelector(selectGoForward);
  // History length and index removed - not needed for display

  const handleBack = () => {
    if (canBack && goBack) {
      goBack();
    }
  };

  const handleForward = () => {
    if (canForward && goForward) {
      goForward();
    }
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* Back Button */}
      <button
        onClick={handleBack}
        disabled={!canBack}
        className={`
          p-1.5 rounded-md transition-colors
          ${canBack 
            ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200' 
            : 'text-gray-300 cursor-not-allowed'
          }
          ${compact ? 'p-1' : 'p-1.5'}
        `}
        title="Go back"
        type="button"
      >
        <svg className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Forward Button */}
      <button
        onClick={handleForward}
        disabled={!canForward}
        className={`
          p-1.5 rounded-md transition-colors
          ${canForward 
            ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200' 
            : 'text-gray-300 cursor-not-allowed'
          }
          ${compact ? 'p-1' : 'p-1.5'}
        `}
        title="Go forward"
        type="button"
      >
        <svg className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Navigation counter removed - keeping it clean with just arrow buttons */}
    </div>
  );
};
