import { ResourceMessage } from '../core/types';

// Base plugin interface for message type extensions
export interface MessageTypePlugin<TMessageRegistry = Record<string, unknown>> {
  name: string;
  version: string;
  description?: string;
  
  // Message type definitions
  messageTypes: TMessageRegistry;
  
  // Optional runtime validators
  validators?: {
    [K in keyof TMessageRegistry]?: (content: unknown) => content is TMessageRegistry[K];
  };
  
  // Optional message handlers
  handlers?: {
    [K in keyof TMessageRegistry]?: (message: ResourceMessage<TMessageRegistry[K]>) => void;
  };
  
  // Optional lifecycle hooks
  onInstall?: () => void;
  onUninstall?: () => void;
}

// Plugin registry for managing installed plugins
export class PluginRegistry<TMessageRegistry = Record<string, unknown>> {
  private plugins: Map<string, MessageTypePlugin<any>> = new Map();
  
  register<TPlugin extends MessageTypePlugin<any>>(plugin: TPlugin): this {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered. Overwriting...`);
    }
    
    this.plugins.set(plugin.name, plugin);
    plugin.onInstall?.();
    
    console.log(`✅ Registered plugin: ${plugin.name} v${plugin.version}`);
    return this;
  }
  
  unregister(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    if (plugin) {
      plugin.onUninstall?.();
      this.plugins.delete(pluginName);
      console.log(`🗑️ Unregistered plugin: ${pluginName}`);
      return true;
    }
    return false;
  }
  
  get(pluginName: string): MessageTypePlugin<any> | undefined {
    return this.plugins.get(pluginName);
  }
  
  getAll(): MessageTypePlugin<any>[] {
    return Array.from(this.plugins.values());
  }
  
  validateMessage<K extends keyof TMessageRegistry>(
    messageType: K,
    content: unknown
  ): content is TMessageRegistry[K] {
    for (const plugin of this.plugins.values()) {
      const validator = plugin.validators?.[messageType as string];
      if (validator && validator(content)) {
        return true;
      }
    }
    return false;
  }
  
  handleMessage<K extends keyof TMessageRegistry>(
    message: ResourceMessage<TMessageRegistry[K]>
  ): void {
    if (!message.messageType) return;
    
    for (const plugin of this.plugins.values()) {
      const handler = plugin.handlers?.[message.messageType];
      if (handler) {
        handler(message);
      }
    }
  }
  
  clear(): void {
    for (const plugin of this.plugins.values()) {
      plugin.onUninstall?.();
    }
    this.plugins.clear();
  }
}

// Utility function to create a simple plugin
export function createPlugin<TMessageRegistry>(
  config: Omit<MessageTypePlugin<TMessageRegistry>, 'messageTypes'> & {
    messageTypes?: TMessageRegistry;
  }
): MessageTypePlugin<TMessageRegistry> {
  return {
    messageTypes: {} as TMessageRegistry,
    ...config,
  };
} 