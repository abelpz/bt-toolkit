# Testing Guide

Comprehensive guide for testing Linked Panels applications, including unit tests, integration tests, and end-to-end testing strategies.

## Overview

Testing Linked Panels applications involves several layers:
- **Unit tests** for individual components and hooks
- **Integration tests** for panel interactions and messaging
- **State persistence tests** for storage adapters
- **End-to-end tests** for complete user workflows
- **Performance tests** for large-scale scenarios

The library uses **Vitest** as the primary testing framework with React Testing Library for component testing.

## Test Environment Setup

### Basic Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

### Test Setup File

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock storage APIs
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

## Unit Testing

### Testing Components with LinkedPanel

```tsx
// __tests__/LinkedPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LinkedPanelsContainer, LinkedPanel } from 'linked-panels';

describe('LinkedPanel', () => {
  const mockConfig = {
    resources: [
      { id: 'res1', component: <div>Resource 1</div>, title: 'Resource 1' },
      { id: 'res2', component: <div>Resource 2</div>, title: 'Resource 2' },
      { id: 'res3', component: <div>Resource 3</div>, title: 'Resource 3' },
    ],
    panels: {
      'test-panel': {
        resourceIds: ['res1', 'res2', 'res3'],
        initialResourceId: 'res1'
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render initial resource', () => {
    render(
      <LinkedPanelsContainer config={mockConfig}>
        <LinkedPanel id="test-panel">
          {({ current }) => (
            <div data-testid="panel-content">
              {current.resource?.component}
            </div>
          )}
        </LinkedPanel>
      </LinkedPanelsContainer>
    );

    expect(screen.getByText('Resource 1')).toBeInTheDocument();
  });

  it('should navigate to next resource', () => {
    render(
      <LinkedPanelsContainer config={mockConfig}>
        <LinkedPanel id="test-panel">
          {({ current, navigate }) => (
            <div>
              <div data-testid="panel-content">
                {current.resource?.component}
              </div>
              <button 
                onClick={navigate.next}
                disabled={!current.panel.canGoNext}
                data-testid="next-button"
              >
                Next
              </button>
            </div>
          )}
        </LinkedPanel>
      </LinkedPanelsContainer>
    );

    const nextButton = screen.getByTestId('next-button');
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);
    expect(screen.getByText('Resource 2')).toBeInTheDocument();
  });

  it('should disable navigation at boundaries', () => {
    render(
      <LinkedPanelsContainer config={mockConfig}>
        <LinkedPanel id="test-panel">
          {({ current, navigate }) => (
            <div>
              <button 
                onClick={navigate.previous}
                disabled={!current.panel.canGoPrevious}
                data-testid="prev-button"
              >
                Previous
              </button>
              <button 
                onClick={navigate.next}
                disabled={!current.panel.canGoNext}
                data-testid="next-button"
              >
                Next
              </button>
            </div>
          )}
        </LinkedPanel>
      </LinkedPanelsContainer>
    );

    // At first resource, previous should be disabled
    expect(screen.getByTestId('prev-button')).toBeDisabled();
    expect(screen.getByTestId('next-button')).not.toBeDisabled();
  });
});
```

### Testing useResourceAPI Hook

```tsx
// __tests__/useResourceAPI.test.tsx
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { LinkedPanelsContainer, useResourceAPI } from 'linked-panels';

const TestWrapper = ({ children }) => {
  const config = {
    resources: [
      { id: 'test-resource', component: <div>Test</div>, title: 'Test' }
    ],
    panels: {
      'test-panel': { resourceIds: ['test-resource'] }
    }
  };

  return (
    <LinkedPanelsContainer config={config}>
      {children}
    </LinkedPanelsContainer>
  );
};

describe('useResourceAPI', () => {
  it('should send and receive messages', () => {
    const { result: senderResult } = renderHook(
      () => useResourceAPI('sender'),
      { wrapper: TestWrapper }
    );

    const { result: receiverResult } = renderHook(
      () => useResourceAPI('receiver'),
      { wrapper: TestWrapper }
    );

    // Send message
    act(() => {
      senderResult.current.messaging.send('receiver', {
        type: 'test-message',
        lifecycle: 'event',
        data: { value: 'hello' }
      });
    });

    // Check message received
    const messages = receiverResult.current.messaging.getMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].content.data.value).toBe('hello');
  });

  it('should navigate between resources', () => {
    const { result } = renderHook(
      () => useResourceAPI('test-resource'),
      { wrapper: TestWrapper }
    );

    // Test navigation functions
    expect(result.current.navigation.getMyPanel()).toBe('test-panel');
    
    const allPanels = result.current.system.getAllPanels();
    expect(allPanels).toContain('test-panel');
  });
});
```

## Integration Testing

### Testing Panel Synchronization

```tsx
// __tests__/panel-synchronization.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { LinkedPanelsContainer, LinkedPanel, useResourceAPI } from 'linked-panels';

function SyncedPanel({ id, panelTitle }) {
  return (
    <LinkedPanel id={id}>
      {({ current, navigate }) => (
        <div data-testid={`panel-${id}`}>
          <h3>{panelTitle}</h3>
          <div>Current: {current.resource?.title}</div>
          <button 
            onClick={navigate.next}
            data-testid={`next-${id}`}
          >
            Next
          </button>
        </div>
      )}
    </LinkedPanel>
  );
}

function MessageSender({ id }) {
  const api = useResourceAPI(id);

  const sendSync = () => {
    api.messaging.sendToAll({
      type: 'sync-navigation',
      lifecycle: 'command',
      data: { targetIndex: 1 }
    });
  };

  return (
    <button onClick={sendSync} data-testid="sync-button">
      Sync All Panels
    </button>
  );
}

describe('Panel Synchronization', () => {
  const config = {
    resources: [
      { id: 'res1', component: <MessageSender id="res1" />, title: 'Resource 1' },
      { id: 'res2', component: <div>Resource 2</div>, title: 'Resource 2' },
      { id: 'res3', component: <div>Resource 3</div>, title: 'Resource 3' },
    ],
    panels: {
      'panel1': { resourceIds: ['res1', 'res2', 'res3'] },
      'panel2': { resourceIds: ['res1', 'res2', 'res3'] }
    }
  };

  it('should synchronize panels through messaging', () => {
    render(
      <LinkedPanelsContainer config={config}>
        <SyncedPanel id="panel1" panelTitle="Panel 1" />
        <SyncedPanel id="panel2" panelTitle="Panel 2" />
      </LinkedPanelsContainer>
    );

    // Initially both panels show Resource 1
    expect(screen.getByTestId('panel-panel1')).toHaveTextContent('Current: Resource 1');
    expect(screen.getByTestId('panel-panel2')).toHaveTextContent('Current: Resource 1');

    // Click sync button (which is in Resource 1)
    fireEvent.click(screen.getByTestId('sync-button'));

    // Both panels should sync to index 1 (Resource 2)
    expect(screen.getByTestId('panel-panel1')).toHaveTextContent('Current: Resource 2');
    expect(screen.getByTestId('panel-panel2')).toHaveTextContent('Current: Resource 2');
  });
});
```

### Testing Message Lifecycle

```tsx
// __tests__/message-lifecycle.test.tsx
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LinkedPanelsContainer, useResourceAPI } from 'linked-panels';

describe('Message Lifecycle', () => {
  const TestWrapper = ({ children }) => (
    <LinkedPanelsContainer config={{
      resources: [
        { id: 'sender', component: <div>Sender</div>, title: 'Sender' },
        { id: 'receiver', component: <div>Receiver</div>, title: 'Receiver' }
      ],
      panels: {
        'test-panel': { resourceIds: ['sender', 'receiver'] }
      }
    }}>
      {children}
    </LinkedPanelsContainer>
  );

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle event messages (consumed once)', () => {
    const { result: senderResult } = renderHook(
      () => useResourceAPI('sender'),
      { wrapper: TestWrapper }
    );

    const { result: receiverResult } = renderHook(
      () => useResourceAPI('receiver'),
      { wrapper: TestWrapper }
    );

    // Send event message
    act(() => {
      senderResult.current.messaging.send('receiver', {
        type: 'click-event',
        lifecycle: 'event',
        data: { x: 100, y: 200 }
      });
    });

    // Should receive message
    let messages = receiverResult.current.messaging.getMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].content.lifecycle).toBe('event');

    // Event messages are consumed after being read
    messages = receiverResult.current.messaging.getMessages();
    expect(messages).toHaveLength(0);
  });

  it('should handle state messages (persistent)', () => {
    const { result: senderResult } = renderHook(
      () => useResourceAPI('sender'),
      { wrapper: TestWrapper }
    );

    const { result: receiverResult } = renderHook(
      () => useResourceAPI('receiver'),
      { wrapper: TestWrapper }
    );

    // Send state message
    act(() => {
      senderResult.current.messaging.send('receiver', {
        type: 'current-selection',
        lifecycle: 'state',
        stateKey: 'selection',
        data: { selectedIds: [1, 2, 3] }
      });
    });

    // Should persist across multiple reads
    let messages = receiverResult.current.messaging.getMessages();
    expect(messages).toHaveLength(1);

    messages = receiverResult.current.messaging.getMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].content.lifecycle).toBe('state');
  });

  it('should handle message TTL', () => {
    const { result: senderResult } = renderHook(
      () => useResourceAPI('sender'),
      { wrapper: TestWrapper }
    );

    const { result: receiverResult } = renderHook(
      () => useResourceAPI('receiver'),
      { wrapper: TestWrapper }
    );

    // Send message with 1 second TTL
    act(() => {
      senderResult.current.messaging.send('receiver', {
        type: 'temp-message',
        lifecycle: 'event',
        ttl: 1000,
        data: { temp: true }
      });
    });

    // Should be available immediately
    let messages = receiverResult.current.messaging.getMessages();
    expect(messages).toHaveLength(1);

    // Fast-forward time by 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Should be expired and removed
    messages = receiverResult.current.messaging.getMessages();
    expect(messages).toHaveLength(0);
  });
});
```

## Storage Adapter Testing

### Testing Storage Adapters

```tsx
// __tests__/storage-adapters.test.tsx
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { 
  LocalStorageAdapter, 
  SessionStorageAdapter, 
  MemoryStorageAdapter 
} from 'linked-panels';

describe('Storage Adapters', () => {
  describe('LocalStorageAdapter', () => {
    let adapter: LocalStorageAdapter;

    beforeEach(() => {
      adapter = new LocalStorageAdapter();
      vi.clearAllMocks();
    });

    it('should store and retrieve data', async () => {
      const testData = JSON.stringify({ test: 'value' });
      
      adapter.setItem('test-key', testData);
      const retrieved = adapter.getItem('test-key');
      
      expect(retrieved).toBe(testData);
    });

    it('should remove data', async () => {
      adapter.setItem('test-key', 'test-value');
      adapter.removeItem('test-key');
      
      const retrieved = adapter.getItem('test-key');
      expect(retrieved).toBeNull();
    });

    it('should check availability', async () => {
      const isAvailable = adapter.isAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });
  });

  describe('MemoryStorageAdapter', () => {
    let adapter: MemoryStorageAdapter;

    beforeEach(() => {
      adapter = new MemoryStorageAdapter();
    });

    it('should always be available', () => {
      expect(adapter.isAvailable()).toBe(true);
    });

    it('should store data in memory', () => {
      adapter.setItem('memory-key', 'memory-value');
      expect(adapter.getItem('memory-key')).toBe('memory-value');
    });

    it('should clear all data', () => {
      adapter.setItem('key1', 'value1');
      adapter.setItem('key2', 'value2');
      
      adapter.clear();
      
      expect(adapter.getItem('key1')).toBeNull();
      expect(adapter.getItem('key2')).toBeNull();
    });
  });
});
```

### Testing Persistence Integration

```tsx
// __tests__/persistence.test.tsx
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { 
  LinkedPanelsContainer, 
  LinkedPanel, 
  MemoryStorageAdapter 
} from 'linked-panels';

describe('State Persistence', () => {
  let mockAdapter: MemoryStorageAdapter;

  beforeEach(() => {
    mockAdapter = new MemoryStorageAdapter();
  });

  it('should persist and restore panel navigation', async () => {
    const config = {
      resources: [
        { id: 'res1', component: <div>Resource 1</div>, title: 'Resource 1' },
        { id: 'res2', component: <div>Resource 2</div>, title: 'Resource 2' },
      ],
      panels: {
        'test-panel': { resourceIds: ['res1', 'res2'] }
      }
    };

    const persistenceOptions = {
      storageAdapter: mockAdapter,
      storageKey: 'test-state',
      autoSave: true
    };

    // Render with persistence
    const { rerender } = render(
      <LinkedPanelsContainer 
        config={config} 
        persistence={persistenceOptions}
      >
        <LinkedPanel id="test-panel">
          {({ current, navigate }) => (
            <div>
              <div data-testid="current-resource">
                {current.resource?.title}
              </div>
              <button onClick={navigate.next} data-testid="next-btn">
                Next
              </button>
            </div>
          )}
        </LinkedPanel>
      </LinkedPanelsContainer>
    );

    // Should start with first resource
    expect(screen.getByTestId('current-resource')).toHaveTextContent('Resource 1');

    // Navigate to second resource
    fireEvent.click(screen.getByTestId('next-btn'));
    expect(screen.getByTestId('current-resource')).toHaveTextContent('Resource 2');

    // Verify state was saved
    const savedState = mockAdapter.getItem('test-state');
    expect(savedState).toBeTruthy();

    // Re-render component (simulating page reload)
    rerender(
      <LinkedPanelsContainer 
        config={config} 
        persistence={persistenceOptions}
      >
        <LinkedPanel id="test-panel">
          {({ current }) => (
            <div data-testid="current-resource">
              {current.resource?.title}
            </div>
          )}
        </LinkedPanel>
      </LinkedPanelsContainer>
    );

    // Should restore to second resource
    expect(screen.getByTestId('current-resource')).toHaveTextContent('Resource 2');
  });
});
```

## End-to-End Testing

### Playwright E2E Tests

```typescript
// e2e/linked-panels.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Linked Panels E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/linked-panels-demo');
  });

  test('should navigate between panels', async ({ page }) => {
    // Check initial state
    await expect(page.locator('[data-testid="main-panel"]')).toContainText('Document 1');
    await expect(page.locator('[data-testid="sidebar-panel"]')).toContainText('Comments');

    // Navigate main panel
    await page.click('[data-testid="main-panel-next"]');
    await expect(page.locator('[data-testid="main-panel"]')).toContainText('Document 2');

    // Switch sidebar resource
    await page.click('[data-testid="sidebar-tab-notes"]');
    await expect(page.locator('[data-testid="sidebar-panel"]')).toContainText('Notes');
  });

  test('should persist state across page reloads', async ({ page }) => {
    // Navigate to specific state
    await page.click('[data-testid="main-panel-next"]');
    await page.click('[data-testid="sidebar-tab-notes"]');

    // Reload page
    await page.reload();

    // Verify state was restored
    await expect(page.locator('[data-testid="main-panel"]')).toContainText('Document 2');
    await expect(page.locator('[data-testid="sidebar-panel"]')).toContainText('Notes');
  });

  test('should handle messaging between panels', async ({ page }) => {
    // Select text in main panel
    await page.locator('[data-testid="document-content"]').selectText();
    await page.click('[data-testid="add-comment-btn"]');

    // Verify comment appears in sidebar
    await expect(page.locator('[data-testid="comments-list"]')).toContainText('New comment');

    // Verify activity feed updates
    await page.click('[data-testid="sidebar-tab-activity"]');
    await expect(page.locator('[data-testid="activity-feed"]')).toContainText('Comment added');
  });
});
```

## Performance Testing

### Load Testing with Large Datasets

```tsx
// __tests__/performance.test.tsx
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { LinkedPanelsContainer, LinkedPanel } from 'linked-panels';

describe('Performance Tests', () => {
  it('should handle large number of resources efficiently', () => {
    // Generate large dataset
    const resources = Array.from({ length: 1000 }, (_, i) => ({
      id: `resource-${i}`,
      component: <div>Resource {i}</div>,
      title: `Resource ${i}`
    }));

    const config = {
      resources,
      panels: {
        'large-panel': { 
          resourceIds: resources.map(r => r.id),
          initialIndex: 0
        }
      }
    };

    const startTime = performance.now();

    render(
      <LinkedPanelsContainer config={config}>
        <LinkedPanel id="large-panel">
          {({ current }) => (
            <div data-testid="current-resource">
              {current.resource?.title}
            </div>
          )}
        </LinkedPanel>
      </LinkedPanelsContainer>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render in reasonable time (< 100ms)
    expect(renderTime).toBeLessThan(100);
    expect(screen.getByTestId('current-resource')).toHaveTextContent('Resource 0');
  });

  it('should handle high-frequency messaging', () => {
    const { result } = renderHook(() => useResourceAPI('test-resource'), {
      wrapper: TestWrapper
    });

    const startTime = performance.now();

    // Send 1000 messages rapidly
    act(() => {
      for (let i = 0; i < 1000; i++) {
        result.current.messaging.send('target', {
          type: 'high-freq',
          lifecycle: 'event',
          data: { index: i }
        });
      }
    });

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Should process messages efficiently (< 50ms for 1000 messages)
    expect(processingTime).toBeLessThan(50);
  });
});
```

## Test Utilities

### Create Test Environment

```tsx
// src/test/utils.tsx
import { ReactNode } from 'react';
import { LinkedPanelsContainer, MemoryStorageAdapter } from 'linked-panels';

export function createTestEnvironment({
  config,
  persistence,
  children
}: {
  config: any;
  persistence?: any;
  children: ReactNode;
}) {
  const defaultPersistence = {
    storageAdapter: new MemoryStorageAdapter(),
    autoSave: false,
    ...persistence
  };

  return (
    <LinkedPanelsContainer 
      config={config} 
      persistence={defaultPersistence}
    >
      {children}
    </LinkedPanelsContainer>
  );
}

export function createMockConfig(overrides = {}) {
  return {
    resources: [
      { id: 'res1', component: <div>Resource 1</div>, title: 'Resource 1' },
      { id: 'res2', component: <div>Resource 2</div>, title: 'Resource 2' },
    ],
    panels: {
      'test-panel': { resourceIds: ['res1', 'res2'] }
    },
    ...overrides
  };
}

export function waitForMessage(api, messageType, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkMessages = () => {
      const messages = api.messaging.getMessages();
      const message = messages.find(msg => msg.content.type === messageType);
      
      if (message) {
        resolve(message);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Message ${messageType} not received within ${timeout}ms`));
      } else {
        setTimeout(checkMessages, 10);
      }
    };
    
    checkMessages();
  });
}
```

### Mock Implementations

```tsx
// src/test/mocks.ts
import { vi } from 'vitest';

export const mockStorageAdapter = {
  isAvailable: vi.fn().mockResolvedValue(true),
  getItem: vi.fn().mockResolvedValue(null),
  setItem: vi.fn().mockResolvedValue(undefined),
  removeItem: vi.fn().mockResolvedValue(undefined),
};

export const mockPlugin = {
  name: 'test-plugin',
  version: '1.0.0',
  messageTypes: {
    'test-message': {},
  },
  validators: {
    'test-message': vi.fn().mockReturnValue(true),
  },
  handlers: {
    'test-message': vi.fn(),
  },
};

export function createMockResourceAPI() {
  return {
    navigation: {
      goToResource: vi.fn(),
      goToPanel: vi.fn(),
      goToResourceInPanel: vi.fn(),
      getMyPanel: vi.fn().mockReturnValue('test-panel'),
      getVisibleResources: vi.fn().mockReturnValue({}),
    },
    messaging: {
      send: vi.fn().mockReturnValue(true),
      getMessages: vi.fn().mockReturnValue([]),
      clearMessages: vi.fn(),
      sendToAll: vi.fn().mockReturnValue(0),
      sendToPanel: vi.fn().mockReturnValue(0),
    },
    system: {
      getAllResources: vi.fn().mockReturnValue([]),
      getAllPanels: vi.fn().mockReturnValue([]),
      getResourcesInPanel: vi.fn().mockReturnValue([]),
      getPanelMapping: vi.fn().mockReturnValue({}),
      getMyPanel: vi.fn().mockReturnValue(null),
      getResourceInfo: vi.fn().mockReturnValue(null),
      getMyResourceInfo: vi.fn().mockReturnValue(null),
      getResourcesInfoInPanel: vi.fn().mockReturnValue([]),
      getResourcesByCategory: vi.fn().mockReturnValue({}),
    },
  };
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test -- --coverage
      - run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### Test Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on others
2. **Mock External Dependencies**: Use mocks for storage, APIs, and timers
3. **Test User Behavior**: Focus on testing what users can see and do
4. **Performance Awareness**: Include performance tests for critical paths
5. **Accessibility Testing**: Ensure panels work with screen readers and keyboard navigation
6. **Cross-browser Testing**: Test on different browsers and devices
7. **State Management**: Test complex state transitions and edge cases
8. **Error Handling**: Test error scenarios and recovery

By following this testing guide, you can ensure your Linked Panels applications are robust, reliable, and performant across all scenarios. 