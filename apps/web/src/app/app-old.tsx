/**
 * Translation Studio Web - Layered Architecture
 * App Layer: Handles routing, theme, and global error boundaries
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import { WorkspaceLayer } from '../layers/WorkspaceLayer';
import { ErrorBoundary } from '../components/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <ThemeProvider defaultTheme="system">
          <div className="h-screen w-screen bg-white dark:bg-gray-900 transition-colors duration-200">
            <WorkspaceLayer />
          </div>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;