import React, { useEffect, useMemo } from 'react';
import { useResource } from '../hooks/useResource';
import type { ResourceAPI } from '../..';

/**
 * Props for ResourceRenderer component
 */
export interface ResourceRendererProps {
  resourceId: string;
  className?: string;
  style?: React.CSSProperties;
  
  // Render functions
  renderResource: (resource: ResourceAPI) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: Error) => React.ReactNode;
  renderNotFound?: () => React.ReactNode;
  
  // Event handlers
  onResourceLoad?: (resource: ResourceAPI) => void;
  onResourceUnload?: (resource: ResourceAPI) => void;
  onResourceError?: (error: Error) => void;
  
  // Auto-load behavior
  autoLoad?: boolean;
}

/**
 * Component for rendering resources
 * Provides automatic resource loading and state management
 */
export function ResourceRenderer({
  resourceId,
  className = '',
  style,
  renderResource,
  renderLoading,
  renderError,
  renderNotFound,
  onResourceLoad,
  onResourceUnload,
  onResourceError,
  autoLoad = true
}: ResourceRendererProps) {
  const {
    resource,
    isLoaded,
    isLoading,
    hasError,
    error,
    load,
    unload
  } = useResource(resourceId);

  // Auto-load resource if enabled
  useEffect(() => {
    if (autoLoad && !isLoaded && !isLoading && !hasError) {
      load().catch(console.error);
    }
  }, [autoLoad, isLoaded, isLoading, hasError, load]);

  // Handle resource events
  useEffect(() => {
    if (resource && isLoaded) {
      onResourceLoad?.(resource);
    }
  }, [resource, isLoaded, onResourceLoad]);

  useEffect(() => {
    if (!resource && !isLoading) {
      onResourceUnload?.(resource as any);
    }
  }, [resource, isLoading, onResourceUnload]);

  useEffect(() => {
    if (error) {
      onResourceError?.(error);
    }
  }, [error, onResourceError]);

  // Compute CSS classes
  const containerClasses = [
    'resource-renderer',
    className,
    isLoaded ? 'resource-loaded' : '',
    isLoading ? 'resource-loading' : '',
    hasError ? 'resource-error' : ''
  ].filter(Boolean).join(' ');

  // Render loading state
  if (isLoading) {
    if (renderLoading) {
      return (
        <div className={containerClasses} style={style}>
          {renderLoading()}
        </div>
      );
    }
    
    return (
      <div className={containerClasses} style={style}>
        <div className="resource-loading-indicator">
          <div className="resource-spinner" />
          <div className="resource-loading-text">Loading resource...</div>
        </div>
      </div>
    );
  }

  // Render error state
  if (hasError && error) {
    if (renderError) {
      return (
        <div className={containerClasses} style={style}>
          {renderError(error)}
        </div>
      );
    }
    
    return (
      <div className={containerClasses} style={style}>
        <div className="resource-error-container">
          <div className="resource-error-icon">⚠️</div>
          <div className="resource-error-message">
            <h4>Resource Error</h4>
            <p>{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render resource not found state
  if (!resource) {
    if (renderNotFound) {
      return (
        <div className={containerClasses} style={style}>
          {renderNotFound()}
        </div>
      );
    }
    
    return (
      <div className={containerClasses} style={style}>
        <div className="resource-not-found">
          <div className="resource-not-found-icon">🔍</div>
          <div className="resource-not-found-message">
            Resource '{resourceId}' not found
          </div>
        </div>
      </div>
    );
  }

  // Render loaded resource
  return (
    <div className={containerClasses} style={style}>
      {renderResource(resource)}
    </div>
  );
} 