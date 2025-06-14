# BasePanel API

BasePanel is the abstract base class for all panel implementations in the system. It provides core functionality for lifecycle management, resource handling, and signal communication.

## Overview

```typescript
import { BasePanel } from '../panels/BasePanel';

class MyCustomPanel extends BasePanel {
  constructor(config: PanelConfig, signalBus: SignalBus) {
    super(config, signalBus);
  }

  // Implement abstract methods
  async onActivate(): Promise<void> {
    // Custom activation logic
  }

  async onDeactivate(): Promise<void> {
    // Custom deactivation logic
  }
}
```

## Constructor

### `new BasePanel(config: PanelConfig, signalBus: SignalBus)`

Creates a new panel instance.

```typescript
const panel = new MyCustomPanel({
  id: 'my-panel',
  type: 'custom',
  title: 'My Custom Panel',
  layout: PanelLayout.SINGLE,
  visibility: PanelVisibility.VISIBLE
}, signalBus);
```

**Parameters:**
- `config`: Panel configuration object
- `signalBus`: SignalBus instance for communication

## Abstract Methods (Must Implement)

### `onActivate(): Promise<void>`

Called when the panel becomes active.

```typescript
async onActivate(): Promise<void> {
  // Initialize panel-specific resources
  await this.loadInitialData();
  
  // Set up panel-specific signal handlers
  this.setupSignalHandlers();
  
  // Update UI state
  this.updateActiveState(true);
}
```

### `onDeactivate(): Promise<void>`

Called when the panel becomes inactive.

```typescript
async onDeactivate(): Promise<void> {
  // Save current state
  await this.saveCurrentState();
  
  // Clean up temporary resources
  this.cleanupTempResources();
  
  // Update UI state
  this.updateActiveState(false);
}
```

## Lifecycle Methods

### `activate(): Promise<void>`

Activates the panel and calls `onActivate()`.

```typescript
await panel.activate();
```

**Behavior:**
- Sets state to ACTIVE
- Calls `onActivate()` hook
- Emits lifecycle event
- Updates last activity timestamp

### `deactivate(): Promise<void>`

Deactivates the panel and calls `onDeactivate()`.

```typescript
await panel.deactivate();
```

**Behavior:**
- Sets state to READY
- Calls `onDeactivate()` hook
- Emits lifecycle event

### `destroy(): Promise<void>`

Destroys the panel and cleans up all resources.

```typescript
await panel.destroy();
```

**Behavior:**
- Sets state to DESTROYED
- Calls `onDestroy()` hook
- Removes all resources
- Cleans up signal handlers
- Emits lifecycle event

## Visibility Methods

### `show(): Promise<void>`

Shows the panel (makes it visible).

```typescript
await panel.show();
```

**Behavior:**
- Sets visibility to VISIBLE
- Calls `onShow()` hook
- Emits visibility event

### `hide(): Promise<void>`

Hides the panel.

```typescript
await panel.hide();
```

**Behavior:**
- Sets visibility to HIDDEN
- Calls `onHide()` hook
- Emits visibility event

## Focus Methods

### `focus(): Promise<void>`

Focuses the panel for keyboard input.

```typescript
await panel.focus();
```

**Behavior:**
- Sets focus state to true
- Calls `onFocus()` hook
- Emits focus event

### `blur(): Promise<void>`

Removes focus from the panel.

```typescript
await panel.blur();
```

**Behavior:**
- Sets focus state to false
- Calls `onBlur()` hook
- Emits focus event

## Resource Management

### `addResource(resource: ResourceAPI): Promise<void>`

Adds a resource to the panel.

```typescript
const resource = {
  id: 'genesis-1-1',
  type: 'verse',
  data: { book: 'Genesis', chapter: 1, verse: 1 }
};

await panel.addResource(resource);
```

**Parameters:**
- `resource`: Resource to add

**Behavior:**
- Validates resource
- Adds to internal collection
- Calls `onResourceAdded()` hook
- Emits resource event

### `removeResource(resourceId: string): Promise<void>`

Removes a resource from the panel.

```typescript
await panel.removeResource('genesis-1-1');
```

**Parameters:**
- `resourceId`: ID of resource to remove

**Behavior:**
- Finds and removes resource
- Calls resource cleanup
- Calls `onResourceRemoved()` hook
- Emits resource event

### `getResource(resourceId: string): ResourceAPI | undefined`

Gets a specific resource by ID.

```typescript
const resource = panel.getResource('genesis-1-1');
if (resource) {
  // Use resource
}
```

### `getResources(): ResourceAPI[]`

Gets all resources in the panel.

```typescript
const allResources = panel.getResources();
```

### `setActiveResource(resourceId: string): Promise<void>`

Sets the active resource in the panel.

```typescript
await panel.setActiveResource('genesis-1-1');
```

**Parameters:**
- `resourceId`: ID of resource to activate

**Behavior:**
- Deactivates current active resource
- Activates specified resource
- Updates internal state
- Calls `onActiveResourceChanged()` hook

### `getActiveResource(): ResourceAPI | undefined`

Gets the currently active resource.

```typescript
const activeResource = panel.getActiveResource();
```

## State Management

### `getState(): PanelState`

Gets the current panel state.

```typescript
const state = panel.getState();
console.log('Panel phase:', state.phase);
console.log('Is active:', state.isActive);
console.log('Is focused:', state.isFocused);
```

**Returns:** Complete panel state object

### `getConfig(): PanelConfig`

Gets the panel configuration.

```typescript
const config = panel.getConfig();
console.log('Panel type:', config.type);
```

### `getMetrics(): PanelMetrics`

Gets panel performance metrics.

```typescript
const metrics = panel.getMetrics();
console.log('Signals emitted:', metrics.signalsEmitted);
console.log('Signals received:', metrics.signalsReceived);
```

## Event Handlers

### `onLifecycleEvent(handler: LifecycleEventHandler): CleanupFunction`

Registers a lifecycle event handler.

```typescript
const cleanup = panel.onLifecycleEvent((event) => {
  console.log('Lifecycle event:', event.phase);
});
```

### `onVisibilityEvent(handler: VisibilityEventHandler): CleanupFunction`

Registers a visibility event handler.

```typescript
const cleanup = panel.onVisibilityEvent((event) => {
  console.log('Visibility changed:', event.visibility);
});
```

### `onFocusEvent(handler: FocusEventHandler): CleanupFunction`

Registers a focus event handler.

```typescript
const cleanup = panel.onFocusEvent((event) => {
  console.log('Focus changed:', event.focused);
});
```

## Coordination

### `addCoordination(coordination: PanelCoordination): void`

Adds a coordination rule for this panel.

```typescript
panel.addCoordination({
  id: 'resource-sync',
  panels: ['panel-1', 'panel-2'],
  type: 'sync',
  handler: async (eventData, panels) => {
    // Coordination logic
  }
});
```

### `removeCoordination(coordinationId: string): void`

Removes a coordination rule.

```typescript
panel.removeCoordination('resource-sync');
```

### `getCoordinations(): PanelCoordination[]`

Gets all coordination rules for this panel.

```typescript
const coordinations = panel.getCoordinations();
```

## Signal Handling

### Protected Signal Methods

These methods are available for subclasses to use:

#### `emitSignal(type: string, payload?: any): Promise<void>`

Emits a signal from this panel.

```typescript
protected async handleUserAction(action: string) {
  await this.emitSignal('USER_ACTION', { 
    action,
    panelId: this.id 
  });
}
```

#### `onSignal(type: string, handler: SignalHandler): CleanupFunction`

Registers a signal handler for this panel.

```typescript
protected setupSignalHandlers() {
  this.onSignal('RESOURCE_UPDATED', async (signal) => {
    await this.handleResourceUpdate(signal.payload);
  });
}
```

## Hooks (Override in Subclasses)

### Lifecycle Hooks

```typescript
// Called during activation
protected async onActivate(): Promise<void> {
  // Override in subclass
}

// Called during deactivation  
protected async onDeactivate(): Promise<void> {
  // Override in subclass
}

// Called during destruction
protected async onDestroy(): Promise<void> {
  // Override in subclass
}
```

### Visibility Hooks

```typescript
// Called when panel is shown
protected async onShow(): Promise<void> {
  // Override in subclass
}

// Called when panel is hidden
protected async onHide(): Promise<void> {
  // Override in subclass
}
```

### Focus Hooks

```typescript
// Called when panel gains focus
protected async onFocus(): Promise<void> {
  // Override in subclass
}

// Called when panel loses focus
protected async onBlur(): Promise<void> {
  // Override in subclass
}
```

### Resource Hooks

```typescript
// Called when resource is added
protected async onResourceAdded(resource: ResourceAPI): Promise<void> {
  // Override in subclass
}

// Called when resource is removed
protected async onResourceRemoved(resource: ResourceAPI): Promise<void> {
  // Override in subclass
}

// Called when active resource changes
protected async onActiveResourceChanged(
  newResource: ResourceAPI | undefined,
  oldResource: ResourceAPI | undefined
): Promise<void> {
  // Override in subclass
}
```

## Example Implementation

Here's a complete example of a custom panel:

```typescript
import { BasePanel } from '../panels/BasePanel';
import { PanelConfig, ResourceAPI } from '../types';
import { SignalBus } from '../core/SignalBus';

class TranslationPanel extends BasePanel {
  private translationData: Map<string, string> = new Map();
  private isDirty = false;

  constructor(config: PanelConfig, signalBus: SignalBus) {
    super(config, signalBus);
    this.setupTranslationHandlers();
  }

  // Lifecycle hooks
  async onActivate(): Promise<void> {
    console.log('Translation panel activated');
    await this.loadTranslationData();
    this.startAutoSave();
  }

  async onDeactivate(): Promise<void> {
    console.log('Translation panel deactivated');
    await this.saveIfDirty();
    this.stopAutoSave();
  }

  async onDestroy(): Promise<void> {
    console.log('Translation panel destroyed');
    await this.saveIfDirty();
    this.cleanup();
  }

  // Resource hooks
  async onResourceAdded(resource: ResourceAPI): Promise<void> {
    if (resource.type === 'verse') {
      await this.loadVerseTranslation(resource.id);
    }
  }

  async onActiveResourceChanged(
    newResource: ResourceAPI | undefined,
    oldResource: ResourceAPI | undefined
  ): Promise<void> {
    if (oldResource) {
      await this.saveResourceTranslation(oldResource.id);
    }
    
    if (newResource) {
      await this.loadResourceTranslation(newResource.id);
    }
  }

  // Custom methods
  private setupTranslationHandlers(): void {
    this.onSignal('TRANSLATION_UPDATED', async (signal) => {
      await this.handleTranslationUpdate(signal.payload);
    });

    this.onSignal('SAVE_TRANSLATION', async (signal) => {
      await this.saveTranslation(signal.payload.resourceId);
    });
  }

  private async loadTranslationData(): Promise<void> {
    // Load translation data from storage
    const data = await this.loadFromStorage();
    this.translationData = new Map(data);
  }

  private async saveIfDirty(): Promise<void> {
    if (this.isDirty) {
      await this.saveTranslationData();
      this.isDirty = false;
    }
  }

  private async handleTranslationUpdate(payload: any): Promise<void> {
    this.translationData.set(payload.resourceId, payload.translation);
    this.isDirty = true;
    
    // Emit update signal
    await this.emitSignal('TRANSLATION_CHANGED', {
      resourceId: payload.resourceId,
      translation: payload.translation
    });
  }

  // Auto-save functionality
  private autoSaveInterval?: NodeJS.Timeout;

  private startAutoSave(): void {
    this.autoSaveInterval = setInterval(async () => {
      await this.saveIfDirty();
    }, 30000); // Save every 30 seconds
  }

  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
    }
  }

  private cleanup(): void {
    this.stopAutoSave();
    this.translationData.clear();
  }
}
```

## Best Practices

### 1. Always Call Super

When overriding lifecycle methods, always call the parent implementation:

```typescript
async onActivate(): Promise<void> {
  await super.onActivate(); // Important!
  // Your custom logic here
}
```

### 2. Handle Errors Gracefully

Wrap async operations in try-catch blocks:

```typescript
async onResourceAdded(resource: ResourceAPI): Promise<void> {
  try {
    await this.processResource(resource);
  } catch (error) {
    console.error('Failed to process resource:', error);
    // Handle error appropriately
  }
}
```

### 3. Clean Up Resources

Always clean up in the destroy hook:

```typescript
async onDestroy(): Promise<void> {
  // Clean up timers
  if (this.timer) {
    clearInterval(this.timer);
  }
  
  // Clean up event listeners
  this.cleanupFunctions.forEach(cleanup => cleanup());
  
  // Clear data structures
  this.dataMap.clear();
  
  await super.onDestroy();
}
```

### 4. Use Proper State Management

Update panel state appropriately:

```typescript
private async updateLoadingState(isLoading: boolean): Promise<void> {
  // Update internal state
  this.isLoading = isLoading;
  
  // Emit state change signal
  await this.emitSignal('LOADING_STATE_CHANGED', { isLoading });
}
``` 