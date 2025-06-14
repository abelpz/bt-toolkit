import React from 'react';
import { PanelContainer } from '../components/PanelContainer';
import type { PanelContainerProps } from '../components/PanelContainer';
import type { PanelAPI } from '../..';

/**
 * Options for creating a panel component
 */
export interface CreatePanelComponentOptions {
  // Panel configuration
  defaultClassName?: string;
  defaultStyle?: React.CSSProperties;
  
  // Auto-behaviors
  autoActivate?: boolean;
  
  // Event handlers
  onPanelError?: (error: Error) => void;
}

/**
 * Props for the created panel component
 */
export interface PanelComponentProps extends Omit<PanelContainerProps, 'renderContent'> {
  children?: React.ReactNode;
}

/**
 * Creates a React component that wraps a panel with automatic management
 */
export function createPanelComponent(
  panelId: string,
  options: CreatePanelComponentOptions = {}
): React.ComponentType<PanelComponentProps> {
  const {
    defaultClassName = '',
    defaultStyle = {},
    autoActivate = false,
    onPanelError
  } = options;

  const PanelComponent: React.FC<PanelComponentProps> = ({
    className = defaultClassName,
    style = defaultStyle,
    children,
    onActivate,
    onError,
    ...restProps
  }) => {
    // Handle panel activation
    const handleActivate = React.useCallback(() => {
      onActivate?.();
    }, [onActivate]);

    // Handle panel errors
    const handleError = React.useCallback((error: Error) => {
      onError?.(error);
      onPanelError?.(error);
    }, [onError]);

    // Auto-activate panel on mount
    React.useEffect(() => {
      if (autoActivate) {
        // Trigger activation after component mounts
        const timer = setTimeout(() => {
          handleActivate();
        }, 0);
        
        return () => clearTimeout(timer);
      }
    }, [autoActivate, handleActivate]);

    return (
      <PanelContainer
        {...restProps}
        panelId={panelId}
        className={className}
        style={style}
        onActivate={handleActivate}
        onError={handleError}
        renderContent={(panel) => children}
      />
    );
  };

  PanelComponent.displayName = `PanelComponent(${panelId})`;

  return PanelComponent;
} 