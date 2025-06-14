# React Integration Guide

React integration for the Panel System, providing hooks, components, and utilities for seamless React application development.

## 🎯 Overview

The React integration provides:
- **React Hooks**: Custom hooks for panel and resource management
- **React Components**: Pre-built components for common panel operations
- **Context Providers**: React context for dependency injection
- **HOCs**: Higher-order components for panel integration
- **TypeScript Support**: Full type safety for React components

## ✅ Implementation Status

**Current Status**: Phase 5 - Complete

### ✅ Implemented Features
- `usePanelSystem()` - Main hook for accessing panel system
- `usePanel()` - Hook for individual panel management
- `useResource()` - Hook for resource management
- `useSignalBus()` - Hook for signal handling with automatic cleanup
- `PanelSystemProvider` - Context provider for DI container
- `PanelContainer` - Component for rendering panels
- `ResourceRenderer` - Component for rendering resources
- Full TypeScript support with comprehensive type definitions
- Automatic subscription cleanup and memory management
- Error boundaries and loading states
- Signal integration with React lifecycle

### 🔄 Future Enhancements
- Panel layout components with drag-and-drop
- Advanced resource lifecycle components
- Signal middleware integration
- Performance optimization hooks
- Suspense support for async operations
- Testing utilities and mock providers

## 📋 Planned API

### Hooks

#### `usePanelSystem()`
```typescript
function usePanelSystem(): {
  panelManager: PanelManager;
  resourceRegistry: ResourceRegistry;
  signalBus: SignalBus;
  navigationController: NavigationController;
  cleanupManager: CleanupManager;
}
```

#### `usePanel(panelId: string)`
```typescript
function usePanel(panelId: string): {
  panel: PanelAPI | null;
  state: PanelState;
  isActive: boolean;
  isFocused: boolean;
  activate: () => Promise<void>;
  deactivate: () => Promise<void>;
  focus: () => Promise<void>;
  show: () => Promise<void>;
  hide: () => Promise<void>;
}
```

#### `useResource(resourceId: string)`
```typescript
function useResource(resourceId: string): {
  resource: ResourceAPI | null;
  state: ResourceState;
  isLoaded: boolean;
  load: () => Promise<void>;
  unload: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

### Components

#### `PanelSystemProvider`
```typescript
interface PanelSystemProviderProps {
  config?: PanelSystemConfig;
  children: React.ReactNode;
}

function PanelSystemProvider({ config, children }: PanelSystemProviderProps): JSX.Element
```

#### `PanelContainer`
```typescript
interface PanelContainerProps {
  panelId: string;
  className?: string;
  style?: React.CSSProperties;
  onPanelChange?: (panel: PanelAPI) => void;
}

function PanelContainer({ panelId, className, style, onPanelChange }: PanelContainerProps): JSX.Element
```

#### `ResourceRenderer`
```typescript
interface ResourceRendererProps {
  resourceId: string;
  renderResource: (resource: ResourceAPI) => React.ReactNode;
  fallback?: React.ReactNode;
  onResourceChange?: (resource: ResourceAPI) => void;
}

function ResourceRenderer({ resourceId, renderResource, fallback, onResourceChange }: ResourceRendererProps): JSX.Element
```

## 📚 Usage Examples

### Basic Setup
```typescript
import React from 'react';
import { PanelSystemProvider, usePanelSystem } from './react';

function App() {
  return (
    <PanelSystemProvider config={{ 
      di: { framework: 'react', platform: 'web' }
    }}>
      <MainContent />
    </PanelSystemProvider>
  );
}

function MainContent() {
  const { panelManager } = usePanelSystem();
  
  React.useEffect(() => {
    // Initialize panels
    panelManager.createPanel({
      id: 'main-panel',
      type: 'translation',
      title: 'Translation Panel'
    });
  }, [panelManager]);

  return <div>Panel System App</div>;
}
```

### Panel Management
```typescript
import React from 'react';
import { usePanel, PanelContainer } from './react';

function TranslationPanel({ panelId }: { panelId: string }) {
  const { panel, state, isActive, activate, focus } = usePanel(panelId);

  const handleActivate = React.useCallback(async () => {
    await activate();
    await focus();
  }, [activate, focus]);

  return (
    <PanelContainer 
      panelId={panelId}
      className={`panel ${isActive ? 'active' : ''}`}
    >
      <div className="panel-header">
        <h3>{panel?.getConfig().title}</h3>
        <button onClick={handleActivate}>Activate</button>
      </div>
      <div className="panel-content">
        {/* Panel content */}
      </div>
    </PanelContainer>
  );
}
```

### Resource Management
```typescript
import React from 'react';
import { useResource, ResourceRenderer } from './react';

function VerseDisplay({ verseId }: { verseId: string }) {
  const { resource, state, isLoaded, load } = useResource(verseId);

  React.useEffect(() => {
    if (!isLoaded) {
      load();
    }
  }, [isLoaded, load]);

  const renderVerse = React.useCallback((resource: ResourceAPI) => {
    const verseData = resource.getData();
    return (
      <div className="verse">
        <span className="verse-reference">
          {verseData.book} {verseData.chapter}:{verseData.verse}
        </span>
        <span className="verse-text">{verseData.text}</span>
      </div>
    );
  }, []);

  return (
    <ResourceRenderer
      resourceId={verseId}
      renderResource={renderVerse}
      fallback={<div>Loading verse...</div>}
    />
  );
}
```

### Signal Handling
```typescript
import React from 'react';
import { useSignalBus } from './react';

function NavigationHandler() {
  const signalBus = useSignalBus();

  React.useEffect(() => {
    const unsubscribe = signalBus.on('NAVIGATE_TO_RESOURCE', (signal) => {
      console.log('Navigation signal received:', signal);
      // Handle navigation
    });

    return unsubscribe;
  }, [signalBus]);

  const handleNavigate = React.useCallback(async (resourceId: string) => {
    await signalBus.emit({
      type: 'NAVIGATE_TO_RESOURCE',
      source: { panelId: 'main-panel', resourceId: 'current' },
      payload: { resourceId }
    });
  }, [signalBus]);

  return (
    <button onClick={() => handleNavigate('verse-genesis-1-1')}>
      Navigate to Genesis 1:1
    </button>
  );
}
```

## 🔧 Advanced Patterns

### Custom Panel Component
```typescript
import React from 'react';
import { usePanel, usePanelSystem } from './react';

interface CustomPanelProps {
  panelId: string;
  children: React.ReactNode;
}

function CustomPanel({ panelId, children }: CustomPanelProps) {
  const { panel, state, isActive } = usePanel(panelId);
  const { cleanupManager } = usePanelSystem();

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      cleanupManager.cleanup(panelId, 'panel');
    };
  }, [cleanupManager, panelId]);

  // Handle panel state changes
  React.useEffect(() => {
    if (panel) {
      const unsubscribe = panel.onLifecycleEvent((event) => {
        console.log(`Panel ${panelId} lifecycle event:`, event);
      });
      return unsubscribe;
    }
  }, [panel, panelId]);

  if (!panel) {
    return <div>Panel not found: {panelId}</div>;
  }

  return (
    <div 
      className={`custom-panel ${isActive ? 'active' : 'inactive'}`}
      data-panel-id={panelId}
      data-panel-state={state.phase}
    >
      {children}
    </div>
  );
}
```

### Resource List Component
```typescript
import React from 'react';
import { usePanelSystem, useResource } from './react';

interface ResourceListProps {
  resourceIds: string[];
  renderItem: (resource: ResourceAPI) => React.ReactNode;
}

function ResourceList({ resourceIds, renderItem }: ResourceListProps) {
  const { resourceRegistry } = usePanelSystem();
  const [resources, setResources] = React.useState<ResourceAPI[]>([]);

  React.useEffect(() => {
    const loadResources = async () => {
      const loadedResources = await Promise.all(
        resourceIds.map(id => resourceRegistry.getResource(id))
      );
      setResources(loadedResources.filter(Boolean));
    };

    loadResources();
  }, [resourceIds, resourceRegistry]);

  return (
    <div className="resource-list">
      {resources.map(resource => (
        <div key={resource.id} className="resource-item">
          {renderItem(resource)}
        </div>
      ))}
    </div>
  );
}
```

## 🧪 Testing

### Testing with React Testing Library
```typescript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PanelSystemProvider, usePanelSystem } from './react';

// Test component
function TestComponent() {
  const { panelManager } = usePanelSystem();
  
  React.useEffect(() => {
    panelManager.createPanel({
      id: 'test-panel',
      type: 'test',
      title: 'Test Panel'
    });
  }, [panelManager]);

  return <div>Test Component</div>;
}

// Test
describe('React Integration', () => {
  it('should provide panel system context', async () => {
    render(
      <PanelSystemProvider>
        <TestComponent />
      </PanelSystemProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Component')).toBeInTheDocument();
    });
  });
});
```

### Mock Providers for Testing
```typescript
import React from 'react';
import { PanelSystemProvider } from './react';

interface MockPanelSystemProviderProps {
  mockPanelManager?: Partial<PanelManager>;
  mockSignalBus?: Partial<SignalBus>;
  children: React.ReactNode;
}

function MockPanelSystemProvider({ 
  mockPanelManager, 
  mockSignalBus, 
  children 
}: MockPanelSystemProviderProps) {
  // Create mock system with provided mocks
  const mockSystem = createMockPanelSystem({
    panelManager: mockPanelManager,
    signalBus: mockSignalBus
  });

  return (
    <PanelSystemProvider value={mockSystem}>
      {children}
    </PanelSystemProvider>
  );
}
```

## 🔧 Best Practices

### 1. Hook Usage
- Use hooks at the top level of components
- Memoize expensive operations with `useMemo` and `useCallback`
- Clean up subscriptions in `useEffect` cleanup functions
- Handle loading and error states appropriately

### 2. Component Design
- Keep components focused and single-purpose
- Use TypeScript for better type safety
- Implement proper error boundaries
- Handle async operations gracefully

### 3. Performance
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Lazy load panels and resources when possible
- Optimize re-renders with proper dependencies

### 4. Testing
- Test components in isolation with mock providers
- Test hook behavior with React Testing Library
- Use integration tests for complex workflows
- Mock external dependencies appropriately

## 📚 Related Documentation

- [Dependency Injection Guide](./DependencyInjection.md)
- [PanelManager API](./PanelManager.md)
- [SignalBus API](./SignalBus.md)
- [Performance Guide](./Performance.md)

---

**Note**: React integration for Phase 5 is now complete. All hooks, components, and utilities are implemented and ready for use. 