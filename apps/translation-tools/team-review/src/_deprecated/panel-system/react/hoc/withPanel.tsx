import React from 'react';
import { usePanel } from '../hooks/usePanel';
import type { UsePanelReturn } from '../hooks/usePanel';

/**
 * Props injected by withPanel HOC
 */
export interface WithPanelProps {
  panel: UsePanelReturn;
}

/**
 * Props required by withPanel HOC
 */
export interface WithPanelHOCProps {
  panelId: string;
}

/**
 * HOC that provides panel access to wrapped components
 */
export function withPanel<P extends WithPanelProps>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<Omit<P, 'panel'> & WithPanelHOCProps> {
  const WithPanelComponent = (props: Omit<P, 'panel'> & WithPanelHOCProps) => {
    const { panelId, ...restProps } = props;
    const panel = usePanel(panelId);
    
    return (
      <WrappedComponent
        {...(restProps as unknown as P)}
        panel={panel}
      />
    );
  };

  WithPanelComponent.displayName = `withPanel(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithPanelComponent;
} 