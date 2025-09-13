/**
 * NavigationBar - Top navigation component
 * 
 * Displays current navigation state and provides navigation controls
 */

import { ScriptureNavigator } from './navigation/ScriptureNavigator'
import { AppLogo } from './shared/AppLogo'
import { NavigationContainer } from './shared/NavigationContainer'

export function NavigationBar() {

  return (
    <NavigationContainer>
      {/* App Logo */}
      <AppLogo />

      {/* Navigation Controls */}
      <div className="flex items-center space-x-3">
        {/* Modern Scripture Navigator */}
        <ScriptureNavigator />
      </div>
    </NavigationContainer>
  )
}
