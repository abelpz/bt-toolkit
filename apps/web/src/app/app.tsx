/**
 * Bible Translation Toolkit - Web App
 * Architecture-compliant implementation following ARCHITECTURE.md
 * 
 * Layer Architecture:
 * 1. UI Framework Layer (React) - This file
 * 2. Business Logic Layer - Contexts and services
 * 3. Presentation Layer - Context providers and adapters
 * 4. Panels Layer - LinkedPanels integration
 * 5. Resource Layer - Resource components and factory
 * 6. Services Layer - Storage and Door43 services
 */

import { BrowserRouter as Router } from 'react-router-dom'
import { WorkspaceProvider } from '../contexts/WorkspaceContext'
import { NavigationProvider } from '../contexts/NavigationContext'
import { PanelsContainer } from '../components/panels/PanelsContainer'
import { NavigationBar } from '../components/Navigation/NavigationBar'
import { WorkspaceStatus } from '../components/workspace/WorkspaceStatus'
import { ErrorBoundary } from '../components/ErrorBoundary'

// Main App Component
export function App() {
  return (
    <ErrorBoundary>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <WorkspaceProvider>
          <NavigationProvider>
            <div className="app h-screen flex flex-col bg-gray-50">
              
              {/* Navigation Bar (UI Framework Layer) */}
              <header className="flex-shrink-0 border-b border-gray-200 bg-white shadow-sm">
                <NavigationBar />
              </header>
              
              {/* Workspace Status */}
              <div className="flex-shrink-0">
                <WorkspaceStatus />
              </div>
              
              {/* Main Content Area - Temporary simple implementation */}
              <main className="flex-1 min-h-0">
                <WorkspaceView />
              </main>
              
            </div>
          </NavigationProvider>
        </WorkspaceProvider>
      </Router>
    </ErrorBoundary>
  )
}

// Workspace View Component
function WorkspaceView() {
  return (
    <div className="workspace-view h-full flex flex-col">
      {/* Panels Container (Panels Layer + Resource Layer) */}
      <div className="flex-1 min-h-0">
        <PanelsContainer className="h-full" />
      </div>
    </div>
  )
}

export default App