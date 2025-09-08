/**
 * Door43 Status Component
 * Shows current Door43 configuration and available books count
 */

import React from 'react';
import { useDoor43 } from '../contexts/Door43Context';

export const Door43Status: React.FC = () => {
  const { config, availableBooks, isLoading, error } = useDoor43();

  const availableCount = availableBooks.filter(book => book.available).length;
  const totalCount = availableBooks.length;

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
        <span role="img" aria-label="Error">❌</span>
        <span className="text-xs">Door43 Error</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400">
      {/* Server/Org Info */}
      <div className="flex items-center space-x-1">
        <span role="img" aria-label="Server">🌐</span>
        <span>{config.organization}</span>
      </div>

      {/* Language/Resource */}
      <div className="flex items-center space-x-1">
        <span role="img" aria-label="Language">🌍</span>
        <span>{config.language}_{config.resourceType}</span>
      </div>

      {/* Books Status */}
      <div className="flex items-center space-x-1">
        {isLoading ? (
          <>
            <span role="img" aria-label="Loading">⏳</span>
            <span>Loading...</span>
          </>
        ) : (
          <>
            <span role="img" aria-label="Books">📚</span>
            <span>{availableCount}/{totalCount}</span>
          </>
        )}
      </div>
    </div>
  );
};

export default Door43Status;
