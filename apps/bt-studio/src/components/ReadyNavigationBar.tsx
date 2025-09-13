/**
 * ReadyNavigationBar - Navigation bar that only renders when workspace is ready
 * 
 * This component ensures that navigation components only mount after the workspace
 * has fully initialized with anchor resource metadata and initial book content.
 */

import { useWorkspace } from '../contexts/WorkspaceContext'
import { NavigationBar } from './NavigationBar'
import { AppLogo } from './shared/AppLogo'
import { NavigationContainer } from './shared/NavigationContainer'
import { NavigationLoadingState } from './shared/NavigationLoadingState'

export function ReadyNavigationBar() {
  const workspace = useWorkspace()
  
  // Only render navigation when workspace is fully ready
  if (!workspace.appReady) {
    return (
      <NavigationContainer>
        {/* App Logo - Same as NavigationBar */}
        <AppLogo />

        {/* Loading State for Navigation Controls */}
        <NavigationLoadingState />
      </NavigationContainer>
    )
  }
  
  // Workspace is ready, render full navigation
  return <NavigationBar />
}
