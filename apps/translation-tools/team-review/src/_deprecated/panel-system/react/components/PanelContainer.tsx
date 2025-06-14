import React, { useEffect, useCallback, useMemo } from 'react';
import { usePanel } from '../hooks/usePanel';
import { useSignalSubscription } from '../hooks/useSignalBus';
import { SIGNAL_TYPES } from '../../signals/SignalTypes';
import type { PanelConfig } from '../..';

/**
 * Props for PanelContainer component
 */
export interface PanelContainerProps {
  panelId: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  
  // Panel configuration
  config?: Partial<PanelConfig>;
  
  // Event handlers
  onActivate?: () => void;
  onDeactivate?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onShow?: () => void;
  onHide?: () => void;
  onError?: (error: Error) => void;
  
  // Render customization
  renderHeader?: (panel: any) => React.ReactNode;
  renderContent?: (panel: any) => React.ReactNode;
  renderFooter?: (panel: any) => React.ReactNode;
  renderError?: (error: Error) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
}

/**
 * Container component for rendering panels
 * Provides automatic state management and event handling
 */
export function PanelContainer({
  panelId,
  className = '',
  style,
  children,
  config,
  onActivate,
  onDeactivate,
  onFocus,
  onBlur,
  onShow,
  onHide,
  onError,
  renderHeader,
  renderContent,
  renderFooter,
  renderError,
  renderLoading
}: PanelContainerProps) {
  const {
    panel,
    isActive,
    isFocused,
    isVisible,
    isLoading,
    hasError,
    error,
    updateConfig
  } = usePanel(panelId);

  // Update panel configuration when config prop changes
  useEffect(() => {
    if (config && panel) {
      updateConfig(config).catch(console.error);
    }
  }, [config, panel, updateConfig]);

  // Handle lifecycle events
  useSignalSubscription(SIGNAL_TYPES.SHOW_PANEL, useCallback((signal) => {
    if (signal.payload?.panelId === panelId) {
      onActivate?.();
    }
  }, [panelId, onActivate]));

  useSignalSubscription(SIGNAL_TYPES.HIDE_PANEL, useCallback((signal) => {
    if (signal.payload?.panelId === panelId) {
      onDeactivate?.();
    }
  }, [panelId, onDeactivate]));

  useSignalSubscription(SIGNAL_TYPES.FOCUS_PANEL, useCallback((signal) => {
    if (signal.payload?.panelId === panelId) {
      onFocus?.();
    }
  }, [panelId, onFocus]));

  useSignalSubscription(SIGNAL_TYPES.SWITCH_PANEL, useCallback((signal) => {
    if (signal.payload?.toPanelId === panelId) {
      onFocus?.();
    } else if (signal.payload?.fromPanelId === panelId) {
      onBlur?.();
    }
  }, [panelId, onFocus, onBlur]));

  useSignalSubscription(SIGNAL_TYPES.SHOW_PANEL, useCallback((signal) => {
    if (signal.payload?.panelId === panelId) {
      onShow?.();
    }
  }, [panelId, onShow]));

  useSignalSubscription(SIGNAL_TYPES.HIDE_PANEL, useCallback((signal) => {
    if (signal.payload?.panelId === panelId) {
      onHide?.();
    }
  }, [panelId, onHide]));

  // Handle errors
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // Compute CSS classes
  const containerClasses = useMemo(() => {
    const classes = ['panel-container'];
    
    if (className) {
      classes.push(className);
    }
    
    if (isActive) {
      classes.push('panel-active');
    }
    
    if (isFocused) {
      classes.push('panel-focused');
    }
    
    if (isVisible) {
      classes.push('panel-visible');
    } else {
      classes.push('panel-hidden');
    }
    
    if (isLoading) {
      classes.push('panel-loading');
    }
    
    if (hasError) {
      classes.push('panel-error');
    }
    
    return classes.join(' ');
  }, [className, isActive, isFocused, isVisible, isLoading, hasError]);

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
        <div className="panel-loading-indicator">
          <div className="panel-spinner" />
          <div className="panel-loading-text">Loading panel...</div>
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
        <div className="panel-error-container">
          <div className="panel-error-icon">⚠️</div>
          <div className="panel-error-message">
            <h3>Panel Error</h3>
            <p>{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render panel not found state
  if (!panel) {
    return (
      <div className={containerClasses} style={style}>
        <div className="panel-not-found">
          <div className="panel-not-found-icon">🔍</div>
          <div className="panel-not-found-message">
            Panel '{panelId}' not found
          </div>
        </div>
      </div>
    );
  }

  // Render normal panel state
  return (
    <div className={containerClasses} style={style}>
      {renderHeader && (
        <div className="panel-header">
          {renderHeader(panel)}
        </div>
      )}
      
      <div className="panel-content">
        {renderContent ? renderContent(panel) : children}
      </div>
      
      {renderFooter && (
        <div className="panel-footer">
          {renderFooter(panel)}
        </div>
      )}
    </div>
  );
} 