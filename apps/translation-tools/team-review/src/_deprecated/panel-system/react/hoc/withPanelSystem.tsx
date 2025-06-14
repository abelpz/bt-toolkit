import React from 'react';
import { usePanelSystem } from '../hooks/usePanelSystem';
import type { UsePanelSystemReturn } from '../hooks/usePanelSystem';

/**
 * Props injected by withPanelSystem HOC
 */
export interface WithPanelSystemProps {
  panelSystem: UsePanelSystemReturn;
}

/**
 * HOC that provides panel system access to wrapped components
 */
export function withPanelSystem<P extends WithPanelSystemProps>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<Omit<P, 'panelSystem'>> {
  const WithPanelSystemComponent = (props: Omit<P, 'panelSystem'>) => {
    const panelSystem = usePanelSystem();
    
    return (
      <WrappedComponent
        {...(props as unknown as P)}
        panelSystem={panelSystem}
      />
    );
  };

  WithPanelSystemComponent.displayName = `withPanelSystem(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithPanelSystemComponent;
} 