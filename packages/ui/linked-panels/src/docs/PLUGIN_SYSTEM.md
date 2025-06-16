# Plugin System

The Linked Panels library features an extensible plugin system that allows you to define custom message types, validators, and handlers.

## Overview

Plugins extend the messaging system by:
- Defining custom message types with TypeScript interfaces
- Providing validation logic for message content
- Handling message processing and side effects
- Adding domain-specific messaging patterns

## Creating a Plugin

Use the `createPlugin` function to define a new plugin:

```tsx
import { createPlugin, BaseMessageContent } from 'linked-panels';

// Define your message content interface
interface UserActionContent extends BaseMessageContent {
  type: 'user-action';
  action: 'click' | 'hover' | 'scroll';
  element: string;
  timestamp: number;
}

// Create the plugin
const userActionPlugin = createPlugin({
  name: 'user-actions',
  version: '1.0.0',
  
  messageTypes: {
    'user-action': UserActionContent
  },
  
  validators: {
    'user-action': (content): content is UserActionContent => {
      return (
        typeof content.action === 'string' &&
        ['click', 'hover', 'scroll'].includes(content.action) &&
        typeof content.element === 'string' &&
        typeof content.timestamp === 'number'
      );
    }
  },
  
  handlers: {
    'user-action': (message) => {
      console.log(`User ${message.content.action} on ${message.content.element}`);
      
      // Send analytics event
      analytics.track('user_interaction', {
        action: message.content.action,
        element: message.content.element,
        timestamp: message.content.timestamp
      });
    }
  }
});
```

## Registering Plugins

Register plugins with the plugin registry:

```tsx
import { createDefaultPluginRegistry } from 'linked-panels';

const pluginRegistry = createDefaultPluginRegistry();
pluginRegistry.register(userActionPlugin);

// Use in your application
<LinkedPanelsContainer 
  config={config} 
  plugins={pluginRegistry}
>
  {children}
</LinkedPanelsContainer>
```

## Built-in Plugins

### Text Message Plugin

The library includes a built-in text message plugin:

```tsx
import { textMessagePlugin, createTextMessage } from 'linked-panels';

// Create a text message
const message = createTextMessage('Hello, world!', 'event');

// Send via resource API
api.messaging.send('target-resource', message);
```

## Plugin Architecture

### Message Types
Define TypeScript interfaces for your message content:

```tsx
interface DataSyncContent extends BaseMessageContent {
  type: 'data-sync';
  operation: 'create' | 'update' | 'delete';
  resourceType: string;
  resourceId: string;
  data: Record<string, unknown>;
}
```

### Validators
Provide runtime validation for message content:

```tsx
validators: {
  'data-sync': (content): content is DataSyncContent => {
    return (
      typeof content.operation === 'string' &&
      ['create', 'update', 'delete'].includes(content.operation) &&
      typeof content.resourceType === 'string' &&
      typeof content.resourceId === 'string' &&
      typeof content.data === 'object' &&
      content.data !== null
    );
  }
}
```

### Handlers
Process messages when they are sent or received:

```tsx
handlers: {
  'data-sync': (message) => {
    const { operation, resourceType, resourceId, data } = message.content;
    
    // Synchronize with external API
    switch (operation) {
      case 'create':
        api.post(`/${resourceType}`, data);
        break;
      case 'update':
        api.put(`/${resourceType}/${resourceId}`, data);
        break;
      case 'delete':
        api.delete(`/${resourceType}/${resourceId}`);
        break;
    }
  }
}
```

## Advanced Plugin Features

### Plugin Dependencies
Plugins can depend on other plugins:

```tsx
const advancedPlugin = createPlugin({
  name: 'advanced-features',
  version: '2.0.0',
  dependencies: ['user-actions@1.0.0'],
  
  // Plugin implementation
});
```

### Plugin Lifecycle Hooks
Plugins can hook into the messaging lifecycle:

```tsx
const loggingPlugin = createPlugin({
  name: 'message-logger',
  version: '1.0.0',
  
  hooks: {
    beforeSend: (message) => {
      console.log('Sending message:', message);
    },
    afterReceive: (message) => {
      console.log('Received message:', message);
    }
  }
});
```

### Conditional Message Processing
Handle messages based on conditions:

```tsx
const conditionalPlugin = createPlugin({
  name: 'conditional-handler',
  version: '1.0.0',
  
  handlers: {
    'user-action': (message) => {
      // Only handle click actions
      if (message.content.action === 'click') {
        // Process click
        handleClick(message.content);
      }
    }
  }
});
```

## Real-World Examples

### Analytics Plugin
Track user interactions and application events:

```tsx
const analyticsPlugin = createPlugin({
  name: 'analytics',
  version: '1.0.0',
  
  messageTypes: {
    'track-event': TrackEventContent,
    'track-page-view': PageViewContent
  },
  
  handlers: {
    'track-event': (message) => {
      gtag('event', message.content.event, {
        category: message.content.category,
        label: message.content.label,
        value: message.content.value
      });
    },
    
    'track-page-view': (message) => {
      gtag('config', 'GA_MEASUREMENT_ID', {
        page_title: message.content.title,
        page_location: message.content.url
      });
    }
  }
});
```

### Notification Plugin
Handle application notifications:

```tsx
const notificationPlugin = createPlugin({
  name: 'notifications',
  version: '1.0.0',
  
  messageTypes: {
    'show-notification': NotificationContent,
    'dismiss-notification': DismissNotificationContent
  },
  
  handlers: {
    'show-notification': (message) => {
      toast(message.content.message, {
        type: message.content.type,
        duration: message.content.duration
      });
    },
    
    'dismiss-notification': (message) => {
      toast.dismiss(message.content.notificationId);
    }
  }
});
```

### State Synchronization Plugin
Keep application state synchronized across panels:

```tsx
const stateSyncPlugin = createPlugin({
  name: 'state-sync',
  version: '1.0.0',
  
  messageTypes: {
    'state-update': StateUpdateContent,
    'state-request': StateRequestContent
  },
  
  handlers: {
    'state-update': (message) => {
      // Update global state
      store.dispatch({
        type: 'UPDATE_STATE',
        path: message.content.path,
        value: message.content.value
      });
    },
    
    'state-request': (message) => {
      // Send current state back
      const currentState = store.getState();
      api.messaging.send(message.fromResourceId, {
        type: 'state-response',
        lifecycle: 'event',
        state: currentState
      });
    }
  }
});
```

## Best Practices

1. **Use descriptive names**: Plugin and message type names should be clear
2. **Version your plugins**: Use semantic versioning for compatibility
3. **Validate message content**: Always provide validators for type safety
4. **Handle errors gracefully**: Don't let plugin errors crash the system
5. **Document your plugins**: Provide clear documentation for custom plugins
6. **Test thoroughly**: Write tests for your plugin logic
7. **Keep handlers lightweight**: Avoid heavy processing in message handlers

## Testing Plugins

Test your plugins in isolation:

```tsx
import { PluginRegistry } from 'linked-panels';

describe('UserActionPlugin', () => {
  let registry: PluginRegistry;
  
  beforeEach(() => {
    registry = new PluginRegistry();
    registry.register(userActionPlugin);
  });
  
  it('should validate user action messages', () => {
    const validMessage = {
      type: 'user-action',
      action: 'click',
      element: 'button',
      timestamp: Date.now()
    };
    
    expect(registry.validate('user-action', validMessage)).toBe(true);
  });
  
  it('should handle user action messages', () => {
    const spy = jest.spyOn(console, 'log');
    
    registry.handle('user-action', mockMessage);
    
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('User click on button')
    );
  });
});
``` 