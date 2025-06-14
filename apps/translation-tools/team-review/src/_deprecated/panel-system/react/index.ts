// Context and Provider
export { 
  PanelSystemProvider,
  usePanelSystemContext,
  usePanelSystemAvailable,
  PanelSystemContext
} from './context/PanelSystemContext';
export type { 
  PanelSystemContextValue,
  PanelSystemProviderProps 
} from './context/PanelSystemContext';

// Core Hooks
export { usePanelSystem } from './hooks/usePanelSystem';
export type { UsePanelSystemReturn } from './hooks/usePanelSystem';

export { usePanel } from './hooks/usePanel';
export type { UsePanelReturn } from './hooks/usePanel';

export { useResource } from './hooks/useResource';
export type { UseResourceReturn } from './hooks/useResource';

export { 
  useSignalBus,
  useSignalSubscription,
  useSignalSourceSubscription 
} from './hooks/useSignalBus';
export type { UseSignalBusReturn } from './hooks/useSignalBus';

// Components
export { PanelContainer } from './components/PanelContainer';
export type { PanelContainerProps } from './components/PanelContainer';

export { ResourceRenderer } from './components/ResourceRenderer';
export type { ResourceRendererProps } from './components/ResourceRenderer';

export { PanelLayout } from './components/PanelLayout';
export type { PanelLayoutProps } from './components/PanelLayout';

// Higher-Order Components
export { withPanelSystem } from './hoc/withPanelSystem';
export type { WithPanelSystemProps } from './hoc/withPanelSystem';

export { withPanel } from './hoc/withPanel';
export type { WithPanelProps } from './hoc/withPanel';

// Utilities
export { createPanelComponent } from './utils/createPanelComponent';
export { createResourceComponent } from './utils/createResourceComponent';

// Version and feature flags
export const REACT_INTEGRATION_VERSION = '1.0.0';
export const REACT_FEATURES = {
  CONTEXT_PROVIDER: true,
  HOOKS: true,
  COMPONENTS: true,
  HOC: true,
  UTILITIES: true,
  SIGNAL_INTEGRATION: true,
  ERROR_BOUNDARIES: true,
  SUSPENSE_SUPPORT: false  // Future feature
} as const; 