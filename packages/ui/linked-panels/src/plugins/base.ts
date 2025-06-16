import { ResourceMessage, BaseMessageContent } from '../core/types';

/**
 * Plugin interface that preserves the exact types from the plugin developer
 */
export interface MessageTypePlugin<TMessageRegistry = any> {
  name: string;
  version: string;
  description?: string;
  
  // Message type definitions - preserves exact types from plugin developer
  messageTypes: TMessageRegistry;
  
  // Type-safe validators - each validator knows its exact message type
  validators?: {
    [K in keyof TMessageRegistry]?: (content: unknown) => content is TMessageRegistry[K];
  };
  
  // Type-safe handlers - each handler receives the exact message type
  handlers?: {
    [K in keyof TMessageRegistry]?: (message: ResourceMessage<any>) => void;
  };
  
  // Lifecycle hooks
  onInstall?: () => void;
  onUninstall?: () => void;
}

/**
 * Plugin registry that maintains type safety while allowing flexibility
 */
export class PluginRegistry {
  private plugins: Map<string, MessageTypePlugin<any>> = new Map();
  
  /**
   * Register a plugin with full type preservation
   */
  register<TMessageRegistry>(
    plugin: MessageTypePlugin<TMessageRegistry>
  ): this {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered. Overwriting...`);
    }
    
    this.plugins.set(plugin.name, plugin);
    
    // Handle plugin initialization errors gracefully
    try {
      plugin.onInstall?.();
    } catch (error) {
      console.error(`Plugin "${plugin.name}" initialization failed:`, error);
      // Continue execution - don't let plugin errors break the system
    }
    
    console.log(`✅ Registered plugin: ${plugin.name} v${plugin.version}`);
    return this;
  }
  
  unregister(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    if (plugin) {
      // Handle plugin cleanup errors gracefully
      try {
        plugin.onUninstall?.();
      } catch (error) {
        console.error(`Plugin "${pluginName}" cleanup failed:`, error);
        // Continue execution - don't let plugin errors break the system
      }
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
  
  /**
   * Validate a message against all registered plugins
   */
  validateMessage(messageType: string, content: unknown): boolean {
    for (const plugin of this.plugins.values()) {
      const validator = plugin.validators?.[messageType];
      if (validator && validator(content)) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Handle a message by triggering appropriate plugin handlers
   */
  handleMessage<T extends BaseMessageContent>(message: ResourceMessage<T>): void {
    if (!message.content?.type) return;
    
    for (const plugin of this.plugins.values()) {
      const handler = plugin.handlers?.[message.content.type];
      if (handler) {
        try {
          handler(message as ResourceMessage<any>);
        } catch (error) {
          console.error(`Plugin "${plugin.name}" handler failed for message type "${message.content.type}":`, error);
          // Continue execution - don't let plugin errors break the system
        }
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

/**
 * Utility function to create a type-safe plugin
 */
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