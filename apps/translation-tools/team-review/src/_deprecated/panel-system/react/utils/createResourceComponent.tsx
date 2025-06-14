import React from 'react';
import { ResourceRenderer } from '../components/ResourceRenderer';
import type { ResourceRendererProps } from '../components/ResourceRenderer';
import type { ResourceAPI } from '../..';

/**
 * Options for creating a resource component
 */
export interface CreateResourceComponentOptions {
  // Resource configuration
  defaultClassName?: string;
  defaultStyle?: React.CSSProperties;
  
  // Auto-behaviors
  autoLoad?: boolean;
  
  // Event handlers
  onResourceReady?: (resource: ResourceAPI) => void;
  onResourceError?: (error: Error) => void;
}

/**
 * Props for the created resource component
 */
export interface ResourceComponentProps extends Omit<ResourceRendererProps, 'renderResource'> {
  children?: (resource: ResourceAPI) => React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Creates a React component that wraps a resource with automatic management
 */
export function createResourceComponent(
  resourceId: string,
  options: CreateResourceComponentOptions = {}
): React.ComponentType<ResourceComponentProps> {
  const {
    defaultClassName = '',
    defaultStyle = {},
    autoLoad = true,
    onResourceReady,
    onResourceError
  } = options;

  const ResourceComponent: React.FC<ResourceComponentProps> = ({
    className = defaultClassName,
    style = defaultStyle,
    children,
    fallback,
    onResourceLoad,
    onResourceError: onResourceErrorProp,
    ...restProps
  }) => {
    // Handle resource load
    const handleResourceLoad = React.useCallback((resource: ResourceAPI) => {
      onResourceLoad?.(resource);
      onResourceReady?.(resource);
    }, [onResourceLoad]);

    // Handle resource errors
    const handleResourceError = React.useCallback((error: Error) => {
      onResourceErrorProp?.(error);
      onResourceError?.(error);
    }, [onResourceErrorProp]);

    // Default render function
    const renderResource = React.useCallback((resource: ResourceAPI) => {
      if (children) {
        return children(resource);
      }
      
      // Default rendering
      return (
        <div className="resource-content">
          <div className="resource-id">Resource: {resource.id}</div>
          <div className="resource-type">Type: {resource.type}</div>
        </div>
      );
    }, [children]);

    return (
      <ResourceRenderer

        className={className}
        style={style}
        renderResource={renderResource}
        renderNotFound={() => fallback || <div>Resource not found</div>}
        onResourceLoad={handleResourceLoad}
        onResourceError={handleResourceError}
        autoLoad={autoLoad}
        {...restProps}
      />
    );
  };

  ResourceComponent.displayName = `ResourceComponent(${resourceId})`;

  return ResourceComponent;
} 