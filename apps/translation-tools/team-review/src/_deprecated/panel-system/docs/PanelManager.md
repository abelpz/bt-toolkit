# PanelManager API

The PanelManager is the high-level coordinator for all panel operations in the system. It manages panel lifecycle, layout, coordination, and state persistence.

## Overview

```typescript
import { PanelManager } from '../panels/PanelManager';
import { SignalBus } from '../core/SignalBus';

const signalBus = SignalBus.getInstance();
const panelManager = new PanelManager(signalBus);
```

## Constructor

### `new PanelManager(signalBus: SignalBus, registry?: PanelRegistry)`

Creates a new PanelManager instance.

```typescript
// With default registry
const panelManager = new PanelManager(signalBus);

// With custom registry
const customRegistry = new PanelRegistry();
const panelManager = new PanelManager(signalBus, customRegistry);
```

**Parameters:**
- `signalBus`: SignalBus instance for communication
- `registry` (optional): Custom panel registry, creates default if not provided

## Panel Lifecycle

### `createPanel(config: PanelConfig): Promise<PanelAPI>`

Creates a new panel with the specified configuration.

```typescript
const panel = await panelManager.createPanel({
  id: 'translation-panel',
  type: 'translation',
  title: 'Translation View',
  layout: PanelLayout.SINGLE,
  visibility: PanelVisibility.VISIBLE,
  position: { x: 100, y: 100 },
  size: { width: 800, height: 600 }
});
```

**Parameters:**
- `config`: Panel configuration object

**Returns:** Promise resolving to the created panel

**Behavior:**
- First panel created becomes active automatically
- Emits `SHOW_PANEL` signal
- Sets up panel coordination

### `destroyPanel(panelId: string): Promise<void>`

Destroys a panel and cleans up all resources.

```typescript
await panelManager.destroyPanel('translation-panel');
```

**Parameters:**
- `panelId`: ID of panel to destroy

**Behavior:**
- Switches to another panel if destroying active panel
- Clears focus if destroying focused panel
- Calls panel's destroy method
- Unregisters from registry
- Emits `HIDE_PANEL` signal

## Panel Coordination

### `switchToPanel(panelId: string): Promise<void>`

Switches the active panel to the specified panel.

```typescript
await panelManager.switchToPanel('translation-panel');
```

**Parameters:**
- `panelId`: ID of panel to activate

**Behavior:**
- Deactivates current active panel
- Activates target panel
- Updates internal active panel tracking
- Emits `SWITCH_PANEL` signal
- Processes global coordinations

### `showPanel(panelId: string): Promise<void>`

Shows a panel (makes it visible).

```typescript
await panelManager.showPanel('translation-panel');
```

**Parameters:**
- `panelId`: ID of panel to show

**Behavior:**
- Calls panel's show method
- Emits `SHOW_PANEL` signal

### `hidePanel(panelId: string): Promise<void>`

Hides a panel and switches active panel if needed.

```typescript
await panelManager.hidePanel('translation-panel');
```

**Parameters:**
- `panelId`: ID of panel to hide

**Behavior:**
- Calls panel's hide method
- Switches to another visible panel if hiding active panel
- Emits `HIDE_PANEL` signal

### `focusPanel(panelId: string, fromSignal?: boolean): Promise<void>`

Focuses a panel for keyboard input.

```typescript
await panelManager.focusPanel('translation-panel');
```

**Parameters:**
- `panelId`: ID of panel to focus
- `fromSignal` (optional): Whether call originated from signal (prevents infinite loops)

**Behavior:**
- Blurs previously focused panel
- Focuses target panel
- Updates internal focus tracking
- Emits `FOCUS_PANEL` signal (unless fromSignal is true)

## Layout Management

### `setLayout(layout: PanelLayout): Promise<void>`

Sets the layout mode for all panels.

```typescript
await panelManager.setLayout(PanelLayout.SPLIT_HORIZONTAL);
```

**Parameters:**
- `layout`: Layout mode to apply

**Available Layouts:**
- `PanelLayout.SINGLE` - Only active panel visible
- `PanelLayout.SPLIT_VERTICAL` - Two panels side by side
- `PanelLayout.SPLIT_HORIZONTAL` - Two panels stacked
- `PanelLayout.TABBED` - All panels in tabs
- `PanelLayout.FLOATING` - Independent floating panels

**Behavior:**
- Applies layout to all panels
- Emits layout change signal
- No-op if layout already set

### `getLayout(): PanelLayout`

Gets the current layout mode.

```typescript
const currentLayout = panelManager.getLayout();
```

**Returns:** Current layout mode

### `optimizeLayout(): Promise<void>`

Automatically chooses optimal layout based on panel count.

```typescript
await panelManager.optimizeLayout();
```

**Behavior:**
- 1 panel: SINGLE
- 2 panels: SPLIT_VERTICAL  
- 3-4 panels: TABBED
- 5+ panels: FLOATING

## Resource Management

### `moveResource(resourceId: string, fromPanelId: string, toPanelId: string): Promise<void>`

Moves a resource from one panel to another.

```typescript
await panelManager.moveResource('genesis-1-1', 'source-panel', 'translation-panel');
```

**Parameters:**
- `resourceId`: ID of resource to move
- `fromPanelId`: Source panel ID
- `toPanelId`: Target panel ID

**Behavior:**
- Removes resource from source panel
- Adds resource to target panel
- Emits `NAVIGATE_TO_RESOURCE` signal

### `duplicateResource(resourceId: string, targetPanelId: string): Promise<ResourceAPI>`

Duplicates a resource to another panel.

```typescript
try {
  const duplicatedResource = await panelManager.duplicateResource('genesis-1-1', 'target-panel');
} catch (error) {
  // Currently throws error - requires resource-specific implementation
}
```

**Parameters:**
- `resourceId`: ID of resource to duplicate
- `targetPanelId`: Target panel ID

**Returns:** Promise resolving to duplicated resource

**Note:** Currently throws error requiring resource-specific implementation

## State Management

### `saveState(): Promise<any>`

Saves the current state of all panels and the manager.

```typescript
const state = await panelManager.saveState();
localStorage.setItem('panel-state', JSON.stringify(state));
```

**Returns:** Promise resolving to serializable state object

**State includes:**
- Current layout
- Active and focused panel IDs
- All panel configurations and states
- Panel metrics
- Resource information
- Global coordinations
- Timestamp

### `loadState(state: any): Promise<void>`

Restores the panel system from saved state.

```typescript
const savedState = JSON.parse(localStorage.getItem('panel-state'));
await panelManager.loadState(savedState);
```

**Parameters:**
- `state`: Previously saved state object

**Behavior:**
- Validates state structure
- Destroys existing panels
- Recreates panels from state
- Restores layout and focus
- Applies saved configurations

### `resetState(): Promise<void>`

Resets the panel system to initial state.

```typescript
await panelManager.resetState();
```

**Behavior:**
- Destroys all panels
- Resets layout to SINGLE
- Clears active and focused panel IDs
- Clears global coordinations

## Global Coordination

### `addGlobalCoordination(coordination: PanelCoordination): void`

Adds a global coordination rule between panels.

```typescript
panelManager.addGlobalCoordination({
  id: 'verse-sync',
  panels: ['source-panel', 'translation-panel'],
  type: 'sync',
  handler: async (eventData, panels) => {
    // Sync verse selection across panels
    for (const panel of panels) {
      await panel.setActiveResource(eventData.resourceId);
    }
  }
});
```

**Parameters:**
- `coordination`: Coordination configuration

**Coordination Properties:**
- `id`: Unique identifier
- `panels`: Array of panel IDs (or '*' for all)
- `type`: Coordination type (custom)
- `handler`: Function to execute coordination

### `removeGlobalCoordination(coordinationId: string): void`

Removes a global coordination rule.

```typescript
panelManager.removeGlobalCoordination('verse-sync');
```

**Parameters:**
- `coordinationId`: ID of coordination to remove

## Getters

### `getActivePanelId(): string | undefined`

Gets the ID of the currently active panel.

```typescript
const activePanelId = panelManager.getActivePanelId();
```

### `getFocusedPanelId(): string | undefined`

Gets the ID of the currently focused panel.

```typescript
const focusedPanelId = panelManager.getFocusedPanelId();
```

### `getActivePanel(): PanelAPI | undefined`

Gets the currently active panel instance.

```typescript
const activePanel = panelManager.getActivePanel();
if (activePanel) {
  await activePanel.addResource(resource);
}
```

### `getFocusedPanel(): PanelAPI | undefined`

Gets the currently focused panel instance.

```typescript
const focusedPanel = panelManager.getFocusedPanel();
```

### `getRegistry(): PanelRegistry`

Gets the panel registry instance.

```typescript
const registry = panelManager.getRegistry();
const allPanels = registry.getPanels();
```

## Cleanup

### `cleanup(): Promise<void>`

Cleans up all panels and resets state.

```typescript
await panelManager.cleanup();
```

**Behavior:**
- Calls `resetState()`
- Destroys all panels
- Clears all coordinations

## Events and Signals

The PanelManager automatically handles these signals:

### Incoming Signals
- `NAVIGATE_TO_RESOURCE` - Switches to specified panel
- `FOCUS_PANEL` - Focuses specified panel

### Outgoing Signals
- `SHOW_PANEL` - When panel is shown
- `HIDE_PANEL` - When panel is hidden
- `SWITCH_PANEL` - When active panel changes
- `FOCUS_PANEL` - When panel focus changes
- `NAVIGATE_TO_RESOURCE` - When resource is moved
- `CUSTOM` (layout_changed) - When layout changes

## Best Practices

### 1. Panel Creation

Always handle panel creation errors:

```typescript
try {
  const panel = await panelManager.createPanel(config);
  // Use panel
} catch (error) {
  console.error('Failed to create panel:', error);
  // Handle error appropriately
}
```

### 2. State Management

Save state periodically and on important events:

```typescript
// Auto-save every 30 seconds
setInterval(async () => {
  const state = await panelManager.saveState();
  localStorage.setItem('panel-state', JSON.stringify(state));
}, 30000);

// Save on window unload
window.addEventListener('beforeunload', async () => {
  const state = await panelManager.saveState();
  localStorage.setItem('panel-state', JSON.stringify(state));
});
```

### 3. Coordination

Keep coordination handlers simple and fast:

```typescript
// Good - simple sync
handler: async (eventData, panels) => {
  for (const panel of panels) {
    await panel.setActiveResource(eventData.resourceId);
  }
}

// Avoid - complex logic in coordination
handler: async (eventData, panels) => {
  // Complex business logic
  // Database operations
  // Heavy computations
}
```

### 4. Layout Management

Use layout optimization for better UX:

```typescript
// Optimize layout when panels change
panelManager.onPanelCreated(() => {
  panelManager.optimizeLayout();
});

panelManager.onPanelDestroyed(() => {
  panelManager.optimizeLayout();
});
```

## Error Handling

Common errors and how to handle them:

### Panel Not Found
```typescript
try {
  await panelManager.switchToPanel('non-existent');
} catch (error) {
  if (error.message.includes('not found')) {
    // Handle missing panel
  }
}
```

### Invalid State
```typescript
try {
  await panelManager.loadState(invalidState);
} catch (error) {
  if (error.message.includes('Invalid state')) {
    // Reset to default state
    await panelManager.resetState();
  }
}
```

### Resource Conflicts
```typescript
try {
  await panelManager.moveResource('resource-1', 'from-panel', 'to-panel');
} catch (error) {
  if (error.message.includes('not found')) {
    // Handle missing resource or panel
  }
}
``` 