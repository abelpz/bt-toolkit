# Panel System Library Implementation Plan

## Overview

This document outlines the step-by-step implementation of a comprehensive, extensible panel management library. We'll build it initially within the `team-review` app for easy testing, then migrate to its own library in the monorepo.

## Recent Discoveries and Patterns

### Resource Unmounting and Signal Cleanup

Based on our implementation experience, resources can and should send signals to other resources or panels when they are unmounted. This is crucial for proper cleanup and state management.

#### Current Implementation Patterns

**1. useEffect Cleanup Function Pattern**

```typescript
useEffect(() => {
  // Setup code...
  
  return () => {
    // Cleanup code that runs on unmount
    if (resourceRef.current) {
      // Send signals before unmounting
      emitSignal(SIGNAL_TYPES.RESOURCE_DISMISSED, {
        resourceId,
        resourceType: 'my-resource',
        reason: 'unmounted'
      });
      
      resourceRef.current.unmount();
      resourceRef.current = null;
    }
  };
}, []);
```

**2. BaseResource Hook Cleanup**

```typescript
// In useBaseResource hook
return () => {
  if (resourceRef.current) {
    resourceRef.current.unmount();
    resourceRef.current = null;
  }
};
```

**3. Visibility-Based Dismissal**

```typescript
// Emit dismiss signal when component becomes invisible
useEffect(() => {
  if (!state.isVisible) {
    console.log('Resource became invisible, emitting dismiss signal');
    
    // Emit resource dismissed signal
    emitSignal(SIGNAL_TYPES.RESOURCE_DISMISSED, {
      resourceId,
      resourceType: 'translation-notes',
      reason: 'hidden'
    });
    
    // Clear highlighting
    emitSignal(SIGNAL_TYPES.CLEAR_HIGHLIGHTING, {
      key: 'translation_notes',
      reason: 'resource_dismissed'
    });
  }
}, [state.isVisible]);
```

#### Signal Types for Unmounting

The system supports several unmount-related signals:

- `RESOURCE_DISMISSED` - When a resource becomes unavailable
- `CLEAR_HIGHLIGHTING` - To clean up visual states
- `CLEAR_ALIGNMENT_HIGHLIGHTS` - To clean up alignment states
- Custom cleanup signals - Resources can emit any signal type

#### Best Practices for Unmount Signals

**1. Emit Cleanup Signals First**

```typescript
useEffect(() => {
  return () => {
    // 1. Send cleanup signals to other components
    emitSignal(SIGNAL_TYPES.CLEAR_HIGHLIGHTING, { key: 'my-resource' });
    emitSignal(SIGNAL_TYPES.RESOURCE_DISMISSED, { 
      resourceId, 
      resourceType: 'my-type',
      reason: 'unmounted' 
    });
    
    // 2. Then cleanup local state
    cleanup();
  };
}, []);
```

**2. Use Stable Signal References**

```typescript
// Create stable emitSignal function using refs to avoid dependency issues
if (!emitSignalRef.current) {
  emitSignalRef.current = async <TPayload = any>(
    type: string,
    payload: TPayload,
    target?: { panelId?: PanelId; resourceId?: ResourceId },
    metadata?: Record<string, any>
  ) => {
    await signalBus.emit({
      type,
      source: { panelId, resourceId },
      target,
      payload,
      metadata
    });
  };
}
```

**3. Handle Different Unmount Reasons**

```typescript
const emitDismissSignal = (reason: 'unmounted' | 'hidden' | 'panel_switched') => {
  emitSignal(SIGNAL_TYPES.RESOURCE_DISMISSED, {
    resourceId,
    resourceType: 'my-resource',
    reason
  });
};
```

### Key-Based Highlighting System

Our implementation evolved to use a key-based highlighting system that properly handles multiple highlighting sources:

#### Enhanced Signal Types

```typescript
// Highlighting system signals
RESOURCE_DISMISSED = 'resource_dismissed',
SET_HIGHLIGHTING = 'set_highlighting', 
CLEAR_HIGHLIGHTING = 'clear_highlighting',

// Highlighting keys enum
enum HighlightingKey {
  TRANSLATION_NOTES = 'translation_notes',
  WORD_CLICK = 'word_click', 
  ALIGNMENT = 'alignment'
}
```

#### Event-Driven Cleanup

- Resources emit dismiss signals when becoming invisible
- Automatic cleanup based on signal-based events
- No periodic DOM checking needed
- Better performance and reliability

### Signal Bus Architecture Insights

#### Multi-Level Signal Handling

The SignalBus supports three levels of signal handling:

1. **Global signals** - Broadcast to all listeners
2. **Panel-specific signals** - Targeted to specific panels
3. **Resource-specific signals** - Targeted to specific resources

#### Signal Routing and Filtering

```typescript
// Signal routing example
Resource A (Translation Notes) 
  → emits SET_HIGHLIGHTING signal 
  → SignalBus routes to all VerseDisplay resources
  → VerseDisplay resources update highlighting
  → Navigation signal triggers panel switch
  → Resource B (Alignment) receives focus
```

#### Resource Lifecycle Integration

```typescript
// Resource lifecycle with signals
1. Registration → ResourceRegistry.register()
2. Creation → ResourceFactory.create()
3. Mounting → resource.mount()
4. Signal Handling → resource.onSignal()
5. State Updates → resource.setState()
6. Navigation → resource.navigateToResource()
7. Unmounting → resource.unmount() + emit cleanup signals
8. Cleanup → ResourceLifecycle.cleanup()
```

## Project Structure

```
apps/translation-tools/team-review/src/
├── panel-system/                    # Our new library folder
│   ├── core/
│   │   ├── PanelManager.ts
│   │   ├── ResourceRegistry.ts
│   │   ├── SignalBus.ts
│   │   └── NavigationController.ts
│   ├── resources/
│   │   ├── BaseResource.ts
│   │   ├── ResourceFactory.ts
│   │   ├── ResourceLifecycle.ts     # Enhanced with unmount signal handling
│   │   └── ResourceCleanup.ts       # New: Cleanup orchestration
│   ├── panels/
│   │   ├── Panel.ts
│   │   ├── PanelState.ts
│   │   └── PanelConfiguration.ts
│   ├── signals/
│   │   ├── SignalTypes.ts           # Enhanced with cleanup signals
│   │   ├── SignalRouter.ts
│   │   ├── SignalMiddleware.ts
│   │   └── SignalCleanup.ts         # New: Signal cleanup utilities
│   ├── di/
│   │   ├── Container.ts
│   │   ├── ServiceRegistry.ts
│   │   └── Decorators.ts
│   ├── types/
│   │   ├── Panel.ts
│   │   ├── Resource.ts
│   │   ├── Signal.ts                # Enhanced with cleanup signal types
│   │   ├── Navigation.ts
│   │   └── Cleanup.ts               # New: Cleanup-related types
│   ├── utils/
│   │   ├── EventEmitter.ts
│   │   ├── StateManager.ts
│   │   ├── Logger.ts
│   │   └── CleanupManager.ts        # New: Cleanup utilities
│   ├── react/
│   │   ├── hooks/
│   │   │   ├── usePanelSystem.ts
│   │   │   ├── useResource.ts       # Enhanced with cleanup handling
│   │   │   ├── useSignals.ts
│   │   │   ├── useNavigation.ts
│   │   │   └── useResourceCleanup.ts # New: Cleanup hook
│   │   ├── components/
│   │   │   ├── PanelProvider.tsx
│   │   │   ├── PanelContainer.tsx
│   │   │   └── ResourceRenderer.tsx
│   │   └── hoc/
│   │       └── withPanelSystem.tsx
│   └── index.ts                     # Main export file
├── components/                      # Existing components (will be migrated)
└── ...
```

## Implementation Phases

### Phase 1: Core Foundation (Days 1-3)

#### Step 1.1: Enhanced Type Definitions

**File: `panel-system/types/Signal.ts`**

- Define core signal interfaces
- Signal types enum (including cleanup signals)
- Payload type definitions
- Signal routing types
- **New**: Cleanup signal types and payloads

**File: `panel-system/types/Cleanup.ts`** *(New)*

- Resource cleanup types
- Cleanup reason enums
- Cleanup event interfaces
- Cleanup strategy types

**File: `panel-system/types/Resource.ts`**

- Resource interface definitions
- Resource lifecycle types
- Resource state management types
- Resource factory types
- **Enhanced**: Cleanup and unmount signal handling

#### Step 1.2: Enhanced Core Signal System

**File: `panel-system/core/SignalBus.ts`**

- Implement event-driven signal bus
- Signal routing and filtering
- Subscription management
- Signal middleware pipeline
- Performance optimizations
- **Enhanced**: Cleanup signal routing and resource dismissal handling

**File: `panel-system/signals/SignalCleanup.ts`** *(New)*

- Cleanup signal orchestration
- Resource dismissal handling
- Highlighting cleanup utilities
- Cross-resource cleanup coordination

#### Step 1.3: Enhanced Utility Classes

**File: `panel-system/utils/CleanupManager.ts`** *(New)*

- Resource cleanup orchestration
- Signal-based cleanup coordination
- Memory leak prevention
- Cleanup event tracking

### Phase 2: Enhanced Resource System (Days 4-6)

#### Step 2.1: Enhanced Base Resource Implementation

**File: `panel-system/resources/BaseResource.ts`**

- Abstract base resource class
- Lifecycle management (mount/unmount)
- Signal handling
- State management
- Navigation capabilities
- **Enhanced**: Unmount signal emission and cleanup coordination

**File: `panel-system/resources/ResourceCleanup.ts`** *(New)*

- Resource cleanup strategies
- Signal emission on unmount
- Cross-resource cleanup coordination
- Cleanup validation and monitoring

**File: `panel-system/resources/ResourceLifecycle.ts`**

- Resource lifecycle orchestration
- Dependency injection integration
- Error handling and recovery
- Resource cleanup
- **Enhanced**: Unmount signal handling and cleanup orchestration

#### Step 2.2: Enhanced Resource Registry

**File: `panel-system/core/ResourceRegistry.ts`**

- Resource type registration
- Factory management
- Resource discovery
- Type validation
- Plugin system support
- **Enhanced**: Cleanup tracking and resource dismissal handling

### Phase 3: Panel Management (Days 7-9)

#### Step 3.1: Enhanced Panel Core

**File: `panel-system/panels/Panel.ts`**

- Panel container implementation
- Resource loading/unloading
- Panel state management
- Navigation history
- Cross-panel communication
- **Enhanced**: Panel dismissal signal handling

### Phase 4: Dependency Injection (Days 10-11)

*(No changes from original plan)*

### Phase 5: Enhanced React Integration (Days 12-14)

#### Step 5.1: Enhanced Core Hooks

**File: `panel-system/react/hooks/useResource.ts`**

- Resource lifecycle hook
- Resource state management
- Resource communication
- Resource navigation
- **Enhanced**: Automatic cleanup signal emission on unmount

**File: `panel-system/react/hooks/useResourceCleanup.ts`** *(New)*

- Resource cleanup hook
- Cleanup signal handling
- Cross-resource cleanup coordination
- Cleanup validation

### Phase 6: Enhanced Signal Middleware (Days 15-16)

#### Step 6.1: Enhanced Middleware System

**File: `panel-system/signals/SignalMiddleware.ts`**

- Middleware pipeline
- Signal transformation
- Signal validation
- Signal logging
- Performance monitoring
- **Enhanced**: Cleanup signal middleware and resource dismissal tracking

### Phase 7: Migration and Integration (Days 17-19)

#### Step 7.1: Enhanced Component Migration

- Convert existing components to new resource system
- Implement proper unmount signal handling
- Update cleanup patterns
- Test signal-based cleanup

### Phase 8: Documentation and Examples (Days 20-21)

#### Step 8.1: Enhanced API Documentation

- Complete API documentation
- Usage examples
- Best practices guide
- Migration guide
- **New**: Cleanup patterns and unmount signal handling guide

### Phase 9: Library Extraction (Days 22-23)

*(No changes from original plan)*

## Enhanced Implementation Details

### Resource Unmount Signal Flow

```typescript
// Complete unmount signal pattern
export const MyResource: React.FC<Props> = ({ panelId, resourceId }) => {
  const { state, emitSignal } = useBaseResource(panelId, resourceId);
  
  // Handle unmount cleanup
  useEffect(() => {
    return () => {
      // 1. Send signals to clean up dependent states in other components
      emitSignal(SIGNAL_TYPES.CLEAR_HIGHLIGHTING, {
        key: resourceId,
        reason: 'resource_unmounted'
      });
      
      // 2. Notify other resources/panels that this resource is gone
      emitSignal(SIGNAL_TYPES.RESOURCE_DISMISSED, {
        resourceId,
        resourceType: 'my-resource-type',
        reason: 'unmounted'
      });
      
      // 3. Send any custom cleanup signals
      emitSignal('MY_CUSTOM_CLEANUP', {
        cleanupData: 'whatever needed'
      });
    };
  }, [emitSignal, resourceId]);
  
  // Handle visibility-based cleanup
  useEffect(() => {
    if (!state.isVisible) {
      emitSignal(SIGNAL_TYPES.RESOURCE_DISMISSED, {
        resourceId,
        resourceType: 'my-resource-type',
        reason: 'hidden'
      });
    }
  }, [state.isVisible]);
  
  // ... rest of component
};
```

### Enhanced Signal System Design

```typescript
// Enhanced signal flow with cleanup
Resource A (Translation Notes) 
  → becomes invisible
  → emits RESOURCE_DISMISSED signal 
  → emits CLEAR_HIGHLIGHTING signal
  → SignalBus routes cleanup signals to all dependent resources
  → VerseDisplay resources clear highlighting
  → AlignmentDataResource clears related highlights
  → System state is properly cleaned up
```

### Key-Based Highlighting Architecture

```typescript
// Highlighting system with proper cleanup
interface HighlightingState {
  [HighlightingKey.TRANSLATION_NOTES]: HighlightData | null;
  [HighlightingKey.WORD_CLICK]: HighlightData | null;
  [HighlightingKey.ALIGNMENT]: HighlightData | null;
}

// Priority system: word_click > translation_notes > alignment > default
const getEffectiveHighlighting = (state: HighlightingState): HighlightData | null => {
  return state[HighlightingKey.WORD_CLICK] || 
         state[HighlightingKey.TRANSLATION_NOTES] || 
         state[HighlightingKey.ALIGNMENT] || 
         null;
};
```

## Enhanced Testing Strategy

### Cleanup Testing

- Resource unmount signal emission
- Cross-resource cleanup coordination
- Memory leak prevention
- Signal cleanup validation

### Signal Flow Testing

- Cleanup signal propagation
- Resource dismissal handling
- Highlighting cleanup
- Cross-panel cleanup coordination

## Enhanced Success Criteria

1. **Functionality**: All current features work with new system
2. **Performance**: No performance regression
3. **Extensibility**: Easy to add new resource types
4. **Type Safety**: Full TypeScript support
5. **Documentation**: Comprehensive docs and examples
6. **Testing**: 90%+ test coverage
7. **Memory**: No memory leaks with proper cleanup
8. **Platform**: Works with React and React Native
9. **Cleanup**: Proper resource cleanup and signal handling *(New)*
10. **Signal Flow**: Reliable signal-based cleanup coordination *(New)*

This enhanced plan incorporates our learnings about resource unmounting, signal-based cleanup, and the key-based highlighting system that ensures proper state management across the panel system.
