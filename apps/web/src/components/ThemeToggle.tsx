/**
 * Theme Toggle Component - Modern Light/Dark Mode Toggle
 * Provides an intuitive theme switching interface
 */

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, resolvedTheme, toggleTheme } = useTheme();

  const getIcon = () => {
    if (theme === 'system') {
      return '🖥️';
    }
    return resolvedTheme === 'dark' ? '🌙' : '☀️';
  };

  const getLabel = () => {
    if (theme === 'system') {
      return `System (${resolvedTheme})`;
    }
    return theme === 'dark' ? 'Dark' : 'Light';
  };

  return (
    <button
      onClick={toggleTheme}
      className="
        inline-flex items-center space-x-2 px-3 py-1.5 
        text-sm font-medium rounded-lg
        bg-gray-100 hover:bg-gray-200 
        dark:bg-gray-700 dark:hover:bg-gray-600
        text-gray-700 dark:text-gray-200
        border border-gray-200 dark:border-gray-600
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        dark:focus:ring-offset-gray-800
      "
      title={`Current theme: ${getLabel()}. Click to cycle through themes.`}
      aria-label={`Switch theme. Current: ${getLabel()}`}
    >
      <span className="text-base" role="img" aria-hidden="true">
        {getIcon()}
      </span>
      <span className="hidden sm:inline">
        {getLabel()}
      </span>
    </button>
  );
};
