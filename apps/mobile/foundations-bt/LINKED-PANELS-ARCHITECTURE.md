# Linked Panels Architecture

## Overview

The Foundations BT app now uses the `linked-panels` library to create a flexible, modular architecture where different resources can communicate with each other across panels.

## Architecture Components

### 1. Resource Components

Each resource is now a separate, self-contained component that can communicate with other resources:

- **`NavigationResource`** - Handles scripture navigation and broadcasts navigation changes
- **`ScriptureResource`** - Displays scripture text and responds to navigation/highlighting messages
- **`TranslationHelpsResource`** - Shows translation helps and can trigger navigation/highlighting

### 2. Inter-Resource Communication

Resources communicate through a messaging system:

```typescript
// Send a message to all resources
api.messaging.sendToAll({
  type: 'highlightWords',
  lifecycle: 'event',
  words: ['word1', 'word2']
});

// Listen for messages
const messages = api.messaging.getMessages();
messages.forEach(message => {
  switch (message.content.type) {
    case 'highlightWords':
      // Handle word highlighting
      break;
    case 'navigateToVerse':
      // Handle navigation
      break;
  }
});
```

### 3. Panel Configuration

Panels are configured declaratively:

```typescript
const config: LinkedPanelsConfig = {
  resources: [
    {
      id: 'navigation',
      component: <NavigationResource resourceId="navigation" />,
      title: 'Navigation',
      icon: '🧭',
      category: 'navigation'
    },
    // ... more resources
  ],
  panels: {
    'top-panel': {
      resourceIds: ['navigation', 'scripture'],
      initialResourceId: 'navigation'
    },
    'bottom-panel': {
      resourceIds: ['translation-helps'],
      initialResourceId: 'translation-helps'
    }
  }
};
```

## Message Types

### Navigation Messages
- `navigateToVerse` - Navigate to a specific verse
- `bookChanged` - Book selection changed
- `chapterChanged` - Chapter changed
- `verseChanged` - Verse changed

### Highlighting Messages
- `highlightWords` - Highlight specific words in scripture
- `clearHighlights` - Clear all highlights

### Content Messages
- `showNote` - Show a specific translation note
- `showWord` - Show a specific word definition

## Benefits

1. **Modularity** - Each resource is independent and reusable
2. **Flexibility** - Resources can be easily moved between panels
3. **Communication** - Resources can interact without tight coupling
4. **Extensibility** - New resources can be added easily
5. **Future Features** - Drag & drop, dynamic panel configuration

## Future Enhancements

- **Drag & Drop** - Allow users to drag resources between panels
- **Dynamic Configuration** - Let users add/remove resources
- **Resource Marketplace** - Plugin system for third-party resources
- **State Persistence** - Save user's panel configuration
- **Multi-Window Support** - Support for multiple app windows

## Usage Example

```typescript
// In a resource component
const MyResource: React.FC<{resourceId: string}> = ({ resourceId }) => {
  const api = useResourceAPI(resourceId);
  
  // Send a message
  const handleClick = () => {
    api.messaging.sendToAll({
      type: 'myCustomMessage',
      lifecycle: 'event',
      data: 'some data'
    });
  };
  
  // Listen for messages
  React.useEffect(() => {
    const messages = api.messaging.getMessages();
    // Process messages...
    api.messaging.clearMessages();
  }, [api.messaging.getMessages().length]);
  
  return <div onClick={handleClick}>My Resource</div>;
};
```

This architecture provides a solid foundation for building complex, interconnected Bible translation tools while maintaining clean separation of concerns and enabling future extensibility.
