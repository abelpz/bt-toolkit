/**
 * AppLogo - Shared app logo component
 * 
 * Displays the consistent FBT branding with gradient styling
 */

import React from 'react';
import { Icon } from '../ui/Icon';

export function AppLogo() {
  return (
    <div className="flex items-center space-x-2">
      {/* Logo Icon */}
      <div className="relative">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-md">
          <Icon name="book-open" size={16} className="text-white" />
        </div>
        {/* Subtle glow effect */}
        <div className="absolute inset-0 w-8 h-8 bg-blue-400 rounded-lg opacity-20 blur-sm -z-10"></div>
      </div>
      
      {/* App Title */}
      <div className="flex flex-col">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent leading-tight">
          
        </h1>
      </div>
    </div>
  )
}
