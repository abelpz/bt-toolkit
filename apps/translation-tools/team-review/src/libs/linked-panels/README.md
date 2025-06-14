# Linked Panels Library

A powerful React library for creating interconnected panel systems with resource management, navigation, and messaging capabilities. Built specifically for Bible translation tools but flexible enough for any multi-panel application.

## Features

- **🔗 Linked Panel System**: Multiple panels that can display different resources with synchronized navigation
- **📨 Inter-Resource Messaging**: Real-time communication between resources across panels
- **🔌 Plugin Architecture**: Extensible messaging system with built-in and custom plugins
- **⚡ Zustand State Management**: Reactive state management with automatic UI updates
- **🎯 TypeScript Support**: Full type safety with comprehensive TypeScript definitions
- **🎨 Render Props Pattern**: Flexible UI composition with render props
- **🔄 Navigation API**: Programmatic navigation between resources and panels

## Quick Start

```tsx
import {
  LinkedPanelsContainer,
  LinkedPanel,
  createDefaultPluginRegistry,
  LinkedPanelsConfig
} from './libs/linked-panels';

const config: LinkedPanelsConfig = {
  resources: [
    { id: 'resource1', component: <MyComponent1 /> },
    { id: 'resource2', component: <MyComponent2 /> },
  ],
  panels: {
    left: { resourceIds: ['resource1', 'resource2'] },
    right: { resourceIds: ['resource2', 'resource1'] },
  },
};

function App() {
  const pluginRegistry = createDefaultPluginRegistry();

  return (
    <LinkedPanelsContainer config={config} plugins={pluginRegistry}>
      <div style={{ display: 'flex' }}>
        <LinkedPanel id="left">
          {(props) => <PanelUI {...props} />}
        </LinkedPanel>
        <LinkedPanel id="right">
          {(props) => <PanelUI {...props} />}
        </LinkedPanel>
      </div>
    </LinkedPanelsContainer>
  );
}
```

## Core Concepts

### Resources
Resources are the content units that can be displayed in panels. Each resource has an ID and a React component.

### Panels
Panels are containers that can display resources. Each panel has a list of available resources and tracks which one is currently visible.

### Messaging
Resources can send messages to each other using the built-in messaging system. Messages are typed and can be extended with plugins.

### Plugins
The plugin system allows extending message types and handling. Built-in plugins include text messaging with validation and formatting.

#### How Plugin System Works

The plugin system automatically:
1. **Extracts message types** from content objects with a `type` property
2. **Validates messages** using plugin validators before processing
3. **Routes messages** to appropriate plugin handlers based on message type
4. **Handles messages** in real-time as they're sent between resources

When you send a message with `{ type: 'notification', title: 'Hello' }`, the system:
- Extracts `messageType: 'notification'` from the content
- Finds plugins that handle the 'notification' message type
- Validates the message using the plugin's validator
- Calls the plugin's handler to process the message

## Creating Custom Plugins

The plugin system allows you to create custom message types with validation, formatting, and special handling. Here's a comprehensive tutorial on creating your own plugins.

### Basic Plugin Structure

Every plugin implements the `MessageTypePlugin` interface:

```tsx
import { MessageTypePlugin, createPlugin } from './libs/linked-panels';

// Define your message types registry
interface MyCustomMessageTypes {
  'my-custom': {
    type: 'my-custom';
    data: string;
    priority: 'low' | 'medium' | 'high';
    timestamp: number;
  };
}

const myCustomPlugin: MessageTypePlugin<MyCustomMessageTypes> = {
  name: 'my-custom-plugin',
  version: '1.0.0',
  description: 'A custom plugin for priority messages',
  
  messageTypes: {} as MyCustomMessageTypes, // Type-only, no runtime value needed
  
  validators: {
    'my-custom': (content: unknown): content is MyCustomMessageTypes['my-custom'] => {
      return (
        typeof content === 'object' &&
        content !== null &&
        'type' in content &&
        content.type === 'my-custom' &&
        'data' in content &&
        typeof (content as any).data === 'string' &&
        'priority' in content &&
        ['low', 'medium', 'high'].includes((content as any).priority)
      );
    }
  },
  
  handlers: {
    'my-custom': (message) => {
      console.log(`📨 Custom message received:`, message.content);
      // Add custom handling logic here
    }
  },
  
  onInstall: () => {
    console.log('🔌 My custom plugin installed');
  },
  
  onUninstall: () => {
    console.log('🔌 My custom plugin uninstalled');
  }
};
```

### Simple Plugin Creation

Here's how to create a custom plugin in 3 easy steps:

#### 1. Create Your Plugin

```tsx
import { MessageTypePlugin } from './libs/linked-panels';

// Define your message type
interface AlertMessageTypes {
  alert: {
    type: 'alert';
    message: string;
  };
}

// Create the plugin
export const alertPlugin: MessageTypePlugin<AlertMessageTypes> = {
  name: 'alert-plugin',
  version: '1.0.0',
  
  messageTypes: {} as AlertMessageTypes,
  
  handlers: {
    alert: (message) => {
      // Show an alert when message is received
      alert(`Alert from ${message.fromResourceId}: ${message.content.message}`);
    }
  }
};

// Helper function to create alert messages
export const createAlert = (message: string) => ({ type: 'alert' as const, message });
```

#### 2. Register and Connect Plugin

```tsx
import { LinkedPanelsContainer, createDefaultPluginRegistry } from './libs/linked-panels';
import { alertPlugin } from './alert-plugin';

function App() {
  // Add your plugin to the registry
  const plugins = createDefaultPluginRegistry();
  plugins.register(alertPlugin);

  return (
    <LinkedPanelsContainer config={config} plugins={plugins}>
      {/* Your panels */}
    </LinkedPanelsContainer>
  );
}
```

#### 3. Use Your Plugin

```tsx
import { useResourceAPI } from './libs/linked-panels';
import { createAlert } from './alert-plugin';

function MyComponent({ id }: { id: string }) {
  const api = useResourceAPI(id);
  
  const sendAlert = () => {
    const alert = createAlert('Hello from custom plugin!');
    api.messaging.sendToAll(alert);
  };
  
  return <button onClick={sendAlert}>Send Alert</button>;
}
```

That's it! Your custom plugin is now working. The system automatically handles message routing and validation.

### Advanced Plugin Features

#### Plugin Configuration

Accept configuration options:

```tsx
interface PluginConfig {
  enableLogging: boolean;
  maxRetries: number;
}

interface ConfigurableMessageTypes {
  configurable: {
    type: 'configurable';
    data: string;
  };
}

function createConfigurablePlugin(config: PluginConfig): MessageTypePlugin<ConfigurableMessageTypes> {
  return {
    name: 'configurable-plugin',
    version: '1.0.0',
    description: 'A configurable plugin example',
    
    messageTypes: {} as ConfigurableMessageTypes,
    
    handlers: {
      configurable: (message) => {
        if (config.enableLogging) {
          console.log('Message received:', message);
        }
        
        // Use config.maxRetries for retry logic
      }
    },
    
    // ... rest of implementation
  };
}

// Usage
const myPlugin = createConfigurablePlugin({
  enableLogging: true,
  maxRetries: 3,
});

registry.register(myPlugin);
```

### Complete Example: File Sharing Plugin

Here's a complete example of a file sharing plugin:

```tsx
interface FileMessageTypes {
  file: {
    type: 'file';
    fileName: string;
    fileSize: number;
    fileType: string;
    fileData: string; // base64 encoded
    description?: string;
  };
}

export function createFileMessage(
  file: File,
  description?: string
): Promise<FileMessageTypes['file']> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve({
        type: 'file',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileData: reader.result as string,
        description,
      });
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const filePlugin: MessageTypePlugin<FileMessageTypes> = {
  name: 'file-sharing-plugin',
  version: '1.0.0',
  description: 'Plugin for sharing files between resources',
  
  messageTypes: {} as FileMessageTypes,
  
  validators: {
    file: (content: unknown): content is FileMessageTypes['file'] => {
      if (typeof content !== 'object' || content === null) return false;
      
      const msg = content as any;
      return (
        msg.type === 'file' &&
        typeof msg.fileName === 'string' &&
        typeof msg.fileSize === 'number' &&
        typeof msg.fileType === 'string' &&
        typeof msg.fileData === 'string' &&
        (msg.description === undefined || typeof msg.description === 'string')
      );
    }
  },
  
  handlers: {
    file: (message) => {
      const { content } = message;
      
      // Create download link
      const link = document.createElement('a');
      link.href = content.fileData;
      link.download = content.fileName;
      
      // Show file received notification
      console.log(`📁 File received: ${content.fileName} (${content.fileSize} bytes)`);
      
      // Auto-download or show in UI
      // link.click(); // Uncomment to auto-download
    }
  },
  
  onInstall: () => {
    console.log('📁 File sharing plugin installed');
  }
};
```

This plugin system provides a powerful way to extend the messaging capabilities of your Linked Panels application with custom message types, validation, and handling logic.

## API Documentation

This documentation is auto-generated from TypeScript definitions and JSDoc comments. See the individual sections below for detailed API reference.
