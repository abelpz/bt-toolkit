# NavigationManager API

The NavigationManager handles navigation between panels and resources, maintaining navigation history and providing intelligent routing capabilities for the panel system.

## Overview

```typescript
import { NavigationManager } from '../navigation/NavigationManager';
import { SignalBus } from '../core/SignalBus';
import { PanelManager } from '../panels/PanelManager';

const signalBus = SignalBus.getInstance();
const panelManager = new PanelManager(signalBus);
const navigationManager = new NavigationManager(signalBus, panelManager);
```

## Constructor

### `new NavigationManager(signalBus: SignalBus, panelManager: PanelManager)`

Creates a new NavigationManager instance.

```typescript
const navigationManager = new NavigationManager(signalBus, panelManager);
```

**Parameters:**
- `signalBus`: SignalBus instance for communication
- `panelManager`: PanelManager instance for panel operations

## Core Navigation Methods

### `navigateToResource(resourceId: string, targetPanelId?: string): Promise<void>`

Navigates to a specific resource, optionally in a specific panel.

```typescript
// Navigate to resource in any available panel
await navigationManager.navigateToResource('genesis-1-1');

// Navigate to resource in specific panel
await navigationManager.navigateToResource('genesis-1-1', 'translation-panel');
```

**Parameters:**
- `resourceId`: ID of resource to navigate to
- `targetPanelId` (optional): Specific panel to navigate in

**Behavior:**
- Finds panels containing the resource
- Switches to target panel if specified
- Sets resource as active in the panel
- Adds entry to navigation history
- Emits `NAVIGATE_TO_RESOURCE` signal

### `navigateToPanel(panelId: string): Promise<void>`

Navigates to (activates) a specific panel.

```typescript
await navigationManager.navigateToPanel('translation-panel');
```

**Parameters:**
- `panelId`: ID of panel to navigate to

**Behavior:**
- Switches to the specified panel
- Adds entry to navigation history
- Emits `SWITCH_PANEL` signal

### `navigateWithHistory(resourceId: string, targetPanelId?: string): Promise<void>`

Navigates to a resource while maintaining detailed history.

```typescript
await navigationManager.navigateWithHistory('genesis-1-2', 'source-panel');
```

**Parameters:**
- `resourceId`: ID of resource to navigate to
- `targetPanelId` (optional): Specific panel to navigate in

**Behavior:**
- Same as `navigateToResource` but with enhanced history tracking
- Records navigation context and metadata
- Enables more intelligent back/forward navigation

## History Management

### `goBack(): Promise<boolean>`

Navigates back to the previous location in history.

```typescript
const didNavigate = await navigationManager.goBack();
if (didNavigate) {
  console.log('Navigated back successfully');
} else {
  console.log('No previous location in history');
}
```

**Returns:** `true` if navigation occurred, `false` if no history available

**Behavior:**
- Moves back one step in navigation history
- Restores previous panel and resource state
- Updates current position in history

### `goForward(): Promise<boolean>`

Navigates forward to the next location in history.

```typescript
const didNavigate = await navigationManager.goForward();
```

**Returns:** `true` if navigation occurred, `false` if no forward history available

**Behavior:**
- Moves forward one step in navigation history
- Restores next panel and resource state
- Updates current position in history

### `canGoBack(): boolean`

Checks if backward navigation is possible.

```typescript
if (navigationManager.canGoBack()) {
  // Show back button
  showBackButton();
}
```

**Returns:** `true` if there are previous entries in history

### `canGoForward(): boolean`

Checks if forward navigation is possible.

```typescript
if (navigationManager.canGoForward()) {
  // Show forward button
  showForwardButton();
}
```

**Returns:** `true` if there are forward entries in history

## History Querying

### `getHistory(): NavigationEntry[]`

Gets the complete navigation history.

```typescript
const history = navigationManager.getHistory();
history.forEach((entry, index) => {
  console.log(`${index}: ${entry.resourceId} in ${entry.panelId}`);
});
```

**Returns:** Array of navigation entries

### `getCurrentEntry(): NavigationEntry | undefined`

Gets the current navigation entry.

```typescript
const current = navigationManager.getCurrentEntry();
if (current) {
  console.log('Current:', current.resourceId, 'in', current.panelId);
}
```

**Returns:** Current navigation entry or undefined

### `getHistorySize(): number`

Gets the total number of entries in history.

```typescript
const historySize = navigationManager.getHistorySize();
console.log(`Navigation history has ${historySize} entries`);
```

### `getCurrentPosition(): number`

Gets the current position in the navigation history.

```typescript
const position = navigationManager.getCurrentPosition();
const total = navigationManager.getHistorySize();
console.log(`Position ${position + 1} of ${total}`);
```

## History Management

### `clearHistory(): void`

Clears all navigation history.

```typescript
navigationManager.clearHistory();
```

**Behavior:**
- Removes all navigation entries
- Resets current position to -1
- Does not affect current panel/resource state

### `setMaxHistorySize(size: number): void`

Sets the maximum number of entries to keep in history.

```typescript
// Keep only the last 50 navigation entries
navigationManager.setMaxHistorySize(50);
```

**Parameters:**
- `size`: Maximum number of history entries to maintain

**Behavior:**
- Trims history if current size exceeds new limit
- Removes oldest entries first

## Advanced Navigation

### `findResourceInPanels(resourceId: string): string[]`

Finds all panels that contain a specific resource.

```typescript
const panelsWithResource = navigationManager.findResourceInPanels('genesis-1-1');
console.log('Resource found in panels:', panelsWithResource);
```

**Parameters:**
- `resourceId`: ID of resource to find

**Returns:** Array of panel IDs containing the resource

### `getOptimalPanel(resourceId: string): string | undefined`

Gets the optimal panel for displaying a resource.

```typescript
const optimalPanel = navigationManager.getOptimalPanel('genesis-1-1');
if (optimalPanel) {
  await navigationManager.navigateToResource('genesis-1-1', optimalPanel);
}
```

**Parameters:**
- `resourceId`: ID of resource

**Returns:** Panel ID of optimal panel, or undefined

**Selection Criteria:**
- Currently active panel (if it contains the resource)
- Panel with the resource already active
- Panel of the same type as the resource
- First available panel with the resource

## Signal Integration

The NavigationManager automatically handles these signals:

### Incoming Signals
- `NAVIGATE_TO_RESOURCE` - Triggers resource navigation
- `NAVIGATE_BACK` - Triggers backward navigation
- `NAVIGATE_FORWARD` - Triggers forward navigation

### Outgoing Signals
- `NAVIGATE_TO_RESOURCE` - When navigation occurs
- `SWITCH_PANEL` - When panel switching occurs
- `NAVIGATION_HISTORY_CHANGED` - When history is modified

## Navigation Entry Structure

```typescript
interface NavigationEntry {
  resourceId: string;           // Target resource ID
  panelId: string;             // Target panel ID
  timestamp: number;           // When navigation occurred
  context?: {                  // Additional context
    previousResourceId?: string;
    previousPanelId?: string;
    trigger: 'user' | 'system' | 'signal';
    metadata?: any;
  };
}
```

## Usage Examples

### Basic Navigation Setup

```typescript
class TranslationApp {
  private navigationManager: NavigationManager;

  constructor() {
    const signalBus = SignalBus.getInstance();
    const panelManager = new PanelManager(signalBus);
    this.navigationManager = new NavigationManager(signalBus, panelManager);
    
    this.setupNavigationHandlers();
  }

  private setupNavigationHandlers(): void {
    // Handle keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'ArrowLeft') {
        this.navigationManager.goBack();
      } else if (event.ctrlKey && event.key === 'ArrowRight') {
        this.navigationManager.goForward();
      }
    });

    // Handle navigation signals
    signalBus.onGlobal('VERSE_SELECTED', async (signal) => {
      await this.navigationManager.navigateToResource(
        signal.payload.verseId,
        signal.payload.targetPanel
      );
    });
  }
}
```

### Navigation with Context

```typescript
// Navigate with additional context
await navigationManager.navigateWithHistory('genesis-1-1', 'source-panel');

// Check navigation history
const history = navigationManager.getHistory();
const lastEntry = history[history.length - 1];
console.log('Last navigation context:', lastEntry.context);
```

### Smart Panel Selection

```typescript
async function smartNavigateToVerse(verseId: string): Promise<void> {
  // Find all panels that can display this verse
  const availablePanels = navigationManager.findResourceInPanels(verseId);
  
  if (availablePanels.length === 0) {
    // No panels have this resource, create or load it
    const activePanel = panelManager.getActivePanel();
    if (activePanel) {
      await activePanel.addResource({ id: verseId, type: 'verse' });
      await navigationManager.navigateToResource(verseId, activePanel.id);
    }
  } else {
    // Use optimal panel selection
    const optimalPanel = navigationManager.getOptimalPanel(verseId);
    await navigationManager.navigateToResource(verseId, optimalPanel);
  }
}
```

### Navigation History UI

```typescript
function createNavigationHistoryUI(): HTMLElement {
  const container = document.createElement('div');
  
  // Back button
  const backButton = document.createElement('button');
  backButton.textContent = '← Back';
  backButton.disabled = !navigationManager.canGoBack();
  backButton.onclick = () => navigationManager.goBack();
  
  // Forward button
  const forwardButton = document.createElement('button');
  forwardButton.textContent = 'Forward →';
  forwardButton.disabled = !navigationManager.canGoForward();
  forwardButton.onclick = () => navigationManager.goForward();
  
  // History dropdown
  const historySelect = document.createElement('select');
  const history = navigationManager.getHistory();
  const currentPos = navigationManager.getCurrentPosition();
  
  history.forEach((entry, index) => {
    const option = document.createElement('option');
    option.value = index.toString();
    option.textContent = `${entry.resourceId} (${entry.panelId})`;
    option.selected = index === currentPos;
    historySelect.appendChild(option);
  });
  
  historySelect.onchange = async (event) => {
    const targetIndex = parseInt((event.target as HTMLSelectElement).value);
    const targetEntry = history[targetIndex];
    await navigationManager.navigateToResource(
      targetEntry.resourceId,
      targetEntry.panelId
    );
  };
  
  container.appendChild(backButton);
  container.appendChild(forwardButton);
  container.appendChild(historySelect);
  
  return container;
}
```

## Best Practices

### 1. Use Appropriate Navigation Methods

```typescript
// For user-initiated navigation
await navigationManager.navigateWithHistory(resourceId, panelId);

// For system/programmatic navigation
await navigationManager.navigateToResource(resourceId, panelId);

// For simple panel switching
await navigationManager.navigateToPanel(panelId);
```

### 2. Handle Navigation Errors

```typescript
try {
  await navigationManager.navigateToResource('non-existent-resource');
} catch (error) {
  console.error('Navigation failed:', error);
  // Show user-friendly error message
  showErrorMessage('Could not navigate to the requested resource');
}
```

### 3. Optimize History Size

```typescript
// Set reasonable history limits based on your app's needs
navigationManager.setMaxHistorySize(100); // Keep last 100 navigations

// Clear history periodically if needed
setInterval(() => {
  if (navigationManager.getHistorySize() > 200) {
    navigationManager.clearHistory();
  }
}, 300000); // Every 5 minutes
```

### 4. Provide Navigation Feedback

```typescript
// Show loading state during navigation
async function navigateWithFeedback(resourceId: string, panelId?: string): Promise<void> {
  showLoadingIndicator();
  
  try {
    await navigationManager.navigateToResource(resourceId, panelId);
    showSuccessMessage('Navigation completed');
  } catch (error) {
    showErrorMessage('Navigation failed');
  } finally {
    hideLoadingIndicator();
  }
}
```

## Performance Considerations

### History Management
- Set appropriate `maxHistorySize` to prevent memory issues
- Clear history periodically in long-running applications
- Consider implementing history persistence for better UX

### Panel Selection
- Use `getOptimalPanel()` for better performance
- Cache panel-resource mappings when possible
- Avoid unnecessary panel switches

### Signal Handling
- Use specific signal handlers instead of global ones when possible
- Debounce rapid navigation requests
- Handle navigation signals asynchronously to prevent blocking 