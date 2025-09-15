/**
 * AppContexts - Combined context providers for BT Studio
 * 
 * This component combines all the context providers in the correct order
 * following the architecture layers from ARCHITECTURE.md
 */

import React from 'react'
import { WorkspaceProvider } from './WorkspaceContext'
import { NavigationProvider } from './NavigationContext'
import { ResourceModalProvider } from './ResourceModalContext'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { ResourceModalWrapper } from '../components/modals/ResourceModalWrapper'

interface AppContextsProps {
  children: React.ReactNode
  initialOwner?: string
  initialLanguage?: string
  initialServer?: string
  initialBook?: string
}

export function AppContexts({ 
  children, 
  initialOwner = 'unfoldingWord',
  initialLanguage = 'en', 
  initialServer = 'git.door43.org',
  initialBook = 'tit'
}: AppContextsProps) {
  return (
    <ErrorBoundary>
      <WorkspaceProvider 
        initialOwner={initialOwner}
        initialLanguage={initialLanguage}
        initialServer={initialServer}
      >
        <ErrorBoundary>
          <NavigationProvider initialBook={initialBook}>
            <ResourceModalProvider>
              {children}
              {/* ResourceModal rendered at app level, outside of panels */}
              <ResourceModalWrapper />
            </ResourceModalProvider>
          </NavigationProvider>
        </ErrorBoundary>
      </WorkspaceProvider>
    </ErrorBoundary>
  )
}

// Export individual providers for flexibility
export { WorkspaceProvider, useWorkspace, useWorkspaceSelector, useWorkspaceLoading, useWorkspaceConfig, useWorkspaceResources } from './WorkspaceContext'
export { NavigationProvider, useNavigation, useNavigationSelector, useCurrentNavigation, useAvailableBooks, useNavigationActions } from './NavigationContext'
export { ResourceModalProvider, useResourceModal } from './ResourceModalContext'
