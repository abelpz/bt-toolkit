# Messaging System

The Linked Panels library provides a powerful messaging system for inter-resource communication with type safety and lifecycle management.

## Overview

The messaging system allows resources to communicate with each other through type-safe messages. Messages have different lifecycles (event, state, command) and can be filtered, persisted, and automatically managed.

## Message Types

### Event Messages
Event messages are ephemeral notifications that get consumed once read:

```tsx
import { useResourceAPI } from 'linked-panels';

function MyResource({ id }) {
  const api = useResourceAPI(id);
  
  // Send an event message
  api.messaging.send('target-resource', {
    type: 'user-clicked',
    lifecycle: 'event',
    data: { buttonId: 'save' }
  });
}
```

### State Messages
State messages represent persistent state that can be read multiple times:

```tsx
api.messaging.send('target-resource', {
  type: 'current-selection',
  lifecycle: 'state',
  stateKey: 'selection', // Required for state messages
  data: { selectedIds: [1, 2, 3] }
});
```

### Command Messages
Command messages represent actions that should be executed:

```tsx
api.messaging.send('target-resource', {
  type: 'scroll-to-position',
  lifecycle: 'command',
  data: { line: 42, column: 10 }
});
```

## Receiving Messages

Use the `useResourceAPI` hook to receive messages:

```tsx
function MyResource({ id }) {
  const api = useResourceAPI(id);
  const messages = api.messaging.getMessages();
  
  // Filter messages by type
  const userClicks = messages.filter(msg => msg.content.type === 'user-clicked');
  
  // Process state messages
  const currentState = messages
    .filter(msg => msg.content.lifecycle === 'state')
    .reduce((acc, msg) => {
      if (msg.content.stateKey) {
        acc[msg.content.stateKey] = msg.content.data;
      }
      return acc;
    }, {});
  
  return <div>{/* Your component */}</div>;
}
```

## Message Lifecycle Management

Messages are automatically managed based on their lifecycle:

- **Event messages**: Consumed after being read once
- **State messages**: Persist until replaced by newer state with same key
- **Command messages**: Consumed after being processed

## Broadcasting Messages

Send messages to multiple resources:

```tsx
// Send to all resources
const sentCount = api.messaging.sendToAll({
  type: 'global-notification',
  message: 'Data updated'
});

// Send to all resources in a panel
const sentCount = api.messaging.sendToPanel('sidebar', {
  type: 'panel-notification',
  message: 'Panel refreshed'
});
```

## Message TTL

Set time-to-live for messages:

```tsx
api.messaging.send('target-resource', {
  type: 'temporary-notification',
  lifecycle: 'event',
  ttl: 5000, // 5 seconds
  message: 'This will expire in 5 seconds'
});
```

## Custom Message Types

Define your own message types with TypeScript:

```tsx
interface MyMessageContent extends BaseMessageContent {
  type: 'my-custom-message';
  data: {
    userId: string;
    action: string;
  };
}

const api = useResourceAPI<MyMessageContent>('my-resource');

// Type-safe messaging
api.messaging.send('target', {
  type: 'my-custom-message',
  lifecycle: 'event',
  data: {
    userId: 'user123',
    action: 'clicked'
  }
});
```

## Best Practices

1. **Use appropriate lifecycles**: Events for notifications, State for persistent data, Commands for actions
2. **Include meaningful type names**: Use descriptive type strings
3. **Set TTL for temporary messages**: Prevent memory leaks
4. **Use TypeScript**: Get compile-time type safety
5. **Clean up messages**: Clear messages when resources unmount
6. **Be mindful of performance**: Don't send too many messages frequently

## Integration with Persistence

Messages can be persisted across sessions:

```tsx
const config = {
  persistence: {
    storageAdapter: new LocalStorageAdapter(),
    persistMessages: true,
    messageFilter: (message) => {
      // Only persist state messages
      return message.content.lifecycle === 'state';
    }
  }
};
``` 