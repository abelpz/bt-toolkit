import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { usePanelSystem } from '../hooks/usePanelSystem';
import { useSignalSubscription } from '../hooks/useSignalBus';
import { PanelLayout as PanelLayoutEnum } from '../../types/Panel';

/**
 * Props for PanelLayout component
 */
export interface PanelLayoutProps {
  layout?: PanelLayoutEnum;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  
  // Layout configuration
  allowResize?: boolean;
  allowReorder?: boolean;
  minPanelSize?: number;
  maxPanelSize?: number;
  
  // Event handlers
  onLayoutChange?: (layout: PanelLayoutEnum) => void;
  onPanelResize?: (panelId: string, size: { width: number; height: number }) => void;
  onPanelReorder?: (panelIds: string[]) => void;
}

/**
 * Component for managing panel layouts
 * Provides layout management and panel arrangement
 */
export function PanelLayout({
  layout = PanelLayoutEnum.SINGLE,
  className = '',
  style,
  children,
  allowResize = true,
  allowReorder = true,
  minPanelSize = 200,
  maxPanelSize = 800,
  onLayoutChange,
  onPanelResize,
  onPanelReorder
}: PanelLayoutProps) {
  const { panelManager } = usePanelSystem();
  const [currentLayout, setCurrentLayout] = useState<PanelLayoutEnum>(layout);
  const [isResizing, setIsResizing] = useState(false);

  // Update layout when prop changes
  useEffect(() => {
    if (layout !== currentLayout) {
      panelManager.setLayout(layout).catch(console.error);
      setCurrentLayout(layout);
    }
  }, [layout, currentLayout, panelManager]);

  // Listen for layout changes using custom signal subscription
  useSignalSubscription('layout_changed', useCallback((signal) => {
    const newLayout = signal.payload?.layout;
    if (newLayout && newLayout !== currentLayout) {
      setCurrentLayout(newLayout);
      onLayoutChange?.(newLayout);
    }
  }, [currentLayout, onLayoutChange]));

  // Compute layout classes
  const layoutClasses = useMemo(() => {
    const classes = ['panel-layout'];
    
    if (className) {
      classes.push(className);
    }
    
    switch (currentLayout) {
      case PanelLayoutEnum.SINGLE:
        classes.push('layout-single');
        break;
      case PanelLayoutEnum.SPLIT_HORIZONTAL:
        classes.push('layout-split-horizontal');
        break;
      case PanelLayoutEnum.SPLIT_VERTICAL:
        classes.push('layout-split-vertical');
        break;
      case PanelLayoutEnum.TABBED:
        classes.push('layout-tabbed');
        break;
      case PanelLayoutEnum.FLOATING:
        classes.push('layout-floating');
        break;
    }
    
    if (allowResize) {
      classes.push('layout-resizable');
    }
    
    if (allowReorder) {
      classes.push('layout-reorderable');
    }
    
    if (isResizing) {
      classes.push('layout-resizing');
    }
    
    return classes.join(' ');
  }, [className, currentLayout, allowResize, allowReorder, isResizing]);

  // Layout management functions
  const handleLayoutChange = useCallback((newLayout: PanelLayoutEnum) => {
    setCurrentLayout(newLayout);
    onLayoutChange?.(newLayout);
  }, [onLayoutChange]);

  const handlePanelResize = useCallback((panelId: string, size: { width: number; height: number }) => {
    onPanelResize?.(panelId, size);
  }, [onPanelResize]);

  // Layout-specific styles
  const layoutStyle = useMemo(() => {
    const baseStyle = { ...style };
    
    switch (currentLayout) {
      case PanelLayoutEnum.SINGLE:
        return {
          ...baseStyle,
          display: 'flex',
          flexDirection: 'column' as const,
          width: '100%',
          height: '100%'
        };
        
      case PanelLayoutEnum.SPLIT_HORIZONTAL:
        return {
          ...baseStyle,
          display: 'flex',
          flexDirection: 'row' as const,
          width: '100%',
          height: '100%'
        };
        
      case PanelLayoutEnum.SPLIT_VERTICAL:
        return {
          ...baseStyle,
          display: 'flex',
          flexDirection: 'column' as const,
          width: '100%',
          height: '100%'
        };
        
      case PanelLayoutEnum.TABBED:
        return {
          ...baseStyle,
          display: 'flex',
          flexDirection: 'column' as const,
          width: '100%',
          height: '100%'
        };
        
      case PanelLayoutEnum.FLOATING:
        return {
          ...baseStyle,
          position: 'relative' as const,
          width: '100%',
          height: '100%'
        };
        
      default:
        return baseStyle;
    }
  }, [style, currentLayout]);

  return (
    <div 
      className={layoutClasses} 
      style={layoutStyle}
      data-layout={currentLayout}
      data-resizable={allowResize}
      data-reorderable={allowReorder}
    >
      {children}
    </div>
  );
} 