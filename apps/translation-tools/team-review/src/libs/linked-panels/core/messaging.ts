import { BaseMessageContent, ResourceMessage } from './types';
import { PluginRegistry } from '../plugins/base';
// import { MessageLifecycle } from './types';

/**
 * Enhanced messaging system with automatic lifecycle management
 */
export class MessagingSystem {
  private messages: Map<string, ResourceMessage[]> = new Map();
  private stateMessages: Map<string, Map<string, ResourceMessage>> = new Map(); // resourceId -> stateKey -> message
  private consumedEventIds: Set<string> = new Set();
  private consumedCommandIds: Set<string> = new Set();
  private pluginRegistry?: PluginRegistry;

  constructor(pluginRegistry?: PluginRegistry) {
    this.pluginRegistry = pluginRegistry;
  }

  /**
   * Send a message with automatic lifecycle management
   */
  sendMessage<T extends BaseMessageContent>(
    content: T,
    fromResourceId: string,
    toResourceId?: string
  ): void {
    // Validate message using plugin registry if available
    if (this.pluginRegistry) {
      const isValid = this.pluginRegistry.validateMessage(content.type, content);
      if (!isValid) {
        throw new Error(`Message validation failed for type "${content.type}". Ensure the message type is registered in a plugin and the content matches the expected schema.`);
      }
    }

    // Generate unique ID and add metadata
    const message: ResourceMessage<T> = {
      content,
      fromResourceId,
      toResourceId,
      id: this.generateId(),
      timestamp: Date.now(),
      consumed: false
    };

    // Get lifecycle (default to 'event' if not specified)
    const lifecycle = content.lifecycle || 'event';

    // Handle different lifecycles
    switch (lifecycle) {
      case 'state':
        this.handleStateMessage(message);
        break;
      case 'event':
        this.handleEventMessage(message);
        break;
      case 'command':
        this.handleCommandMessage(message);
        break;
    }

    // Add to general message queue for backward compatibility
    const targetId = toResourceId || 'broadcast';
    if (!this.messages.has(targetId)) {
      this.messages.set(targetId, []);
    }
    this.messages.get(targetId)!.push(message);

    // Trigger plugin handlers if available
    if (this.pluginRegistry) {
      this.pluginRegistry.handleMessage(message);
    }

    // Cleanup old messages periodically
    this.cleanup();
  }

  /**
   * Handle STATE messages - supersede previous messages with same stateKey
   */
  private handleStateMessage<T extends BaseMessageContent>(message: ResourceMessage<T>): void {
    if (!message.content.stateKey) {
      console.warn('State message missing stateKey:', message.content.type);
      return;
    }

    const targetId = message.toResourceId || 'broadcast';
    
    if (!this.stateMessages.has(targetId)) {
      this.stateMessages.set(targetId, new Map());
    }
    
    const stateMap = this.stateMessages.get(targetId)!;
    
    // Supersede previous state message with same key
    stateMap.set(message.content.stateKey, message);
  }

  /**
   * Handle EVENT messages - add to queue with TTL
   */
  private handleEventMessage<T extends BaseMessageContent>(message: ResourceMessage<T>): void {
    // Events are just added to the general queue
    // TTL cleanup happens in the cleanup method
  }

  /**
   * Handle COMMAND messages - add to queue for one-time consumption
   */
  private handleCommandMessage<T extends BaseMessageContent>(message: ResourceMessage<T>): void {
    // Commands are just added to the general queue
    // Consumption tracking happens when messages are retrieved
  }

  /**
   * Get messages for a resource with automatic lifecycle filtering
   */
  getMessages(resourceId: string): ResourceMessage[] {
    const messages: ResourceMessage[] = [];
    
    // Add current state messages
    const stateMap = this.stateMessages.get('broadcast') || new Map();
    const resourceStateMap = this.stateMessages.get(resourceId) || new Map();
    
    // Merge broadcast and resource-specific state messages
    const allStateMessages = new Map([...stateMap, ...resourceStateMap]);
    messages.push(...Array.from(allStateMessages.values()));

    // Add unconsumed events and commands
    const broadcastMessages = this.messages.get('broadcast') || [];
    const resourceMessages = this.messages.get(resourceId) || [];
    
    const allMessages = [...broadcastMessages, ...resourceMessages];
    
    for (const message of allMessages) {
      const lifecycle = message.content.lifecycle || 'event';
      
      if (lifecycle === 'event') {
        // Check if event is expired or consumed
        if (this.consumedEventIds.has(message.id)) continue;
        if (this.isExpired(message)) {
          this.consumedEventIds.add(message.id);
          continue;
        }
        messages.push(message);
      } else if (lifecycle === 'command') {
        // Check if command is consumed
        if (this.consumedCommandIds.has(message.id)) continue;
        messages.push(message);
      }
      // State messages are already added above
    }

    return messages.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Mark an event as consumed
   */
  consumeEvent(messageId: string): void {
    this.consumedEventIds.add(messageId);
  }

  /**
   * Mark a command as consumed
   */
  consumeCommand(messageId: string): void {
    this.consumedCommandIds.add(messageId);
  }

  /**
   * Get current state for a specific state key
   */
  getCurrentState<T extends BaseMessageContent>(
    resourceId: string, 
    stateKey: string
  ): ResourceMessage<T> | null {
    const stateMap = this.stateMessages.get('broadcast') || new Map();
    const resourceStateMap = this.stateMessages.get(resourceId) || new Map();
    
    // Resource-specific state takes precedence over broadcast state
    return resourceStateMap.get(stateKey) || stateMap.get(stateKey) || null;
  }

  /**
   * Clear state for a specific key
   */
  clearState(resourceId: string, stateKey: string): void {
    const stateMap = this.stateMessages.get(resourceId);
    if (stateMap) {
      stateMap.delete(stateKey);
    }
    
    const broadcastStateMap = this.stateMessages.get('broadcast');
    if (broadcastStateMap) {
      broadcastStateMap.delete(stateKey);
    }
  }

  /**
   * Clear all messages for a resource
   */
  clearMessages(resourceId: string): void {
    // Clear regular messages
    this.messages.delete(resourceId);
    
    // Clear state messages
    this.stateMessages.delete(resourceId);
    
    // Note: We don't clear broadcast messages as they affect all resources
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isExpired(message: ResourceMessage): boolean {
    if (!message.content.ttl) return false;
    return Date.now() - message.timestamp > message.content.ttl;
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    // Clean up old consumed event IDs
    // We'd need to track when events were consumed to do this properly
    
    // Clean up old messages from general queue
    for (const [resourceId, messages] of this.messages.entries()) {
      this.messages.set(
        resourceId,
        messages.filter(msg => now - msg.timestamp < maxAge)
      );
    }
  }
} 