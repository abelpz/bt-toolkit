import { useState, useEffect } from 'react';
import { BaseMessageContent, ResourceMessage } from '../core/types';
import { useResourceAPI } from './useResourceAPI';

/**
 * Super simple hook - just listen for current state of a specific key
 * Works with the lifecycle-aware messaging system
 */
export function useCurrentState<T extends BaseMessageContent>(
  resourceId: string,
  stateKey: string
): T | null {
  const [currentState, setCurrentState] = useState<T | null>(null);
  
  const api = useResourceAPI<T>(resourceId);
  const messages = api.messaging.getMessages();

  useEffect(() => {
    if (!stateKey) {
      setCurrentState(null);
      return;
    }

    // Find the most recent state message with this key
    const stateMessages = messages.filter(msg => {
      // All messages should now be ResourceMessage format
      const resourceMsg = msg as ResourceMessage<T>;
      return resourceMsg.content.lifecycle === 'state' &&
             resourceMsg.content.stateKey === stateKey;
    });

    if (stateMessages.length === 0) {
      setCurrentState(null);
      return;
    }

    // Get the most recent one
    const latest = stateMessages.sort((a, b) => b.timestamp - a.timestamp)[0] as ResourceMessage<T>;
    setCurrentState(latest.content);
  }, [messages, stateKey]);

  return currentState;
}

/**
 * Super simple hook - listen for events and handle them automatically
 * Events are consumed once, no manual tracking needed!
 */
export function useEvents<T extends BaseMessageContent>(
  resourceId: string,
  eventTypes: string[],
  onEvent: (event: T) => void
): void {
  const [consumedIds, setConsumedIds] = useState<Set<string>>(new Set());
  
  const api = useResourceAPI<T>(resourceId);
  const messages = api.messaging.getMessages();

  useEffect(() => {
    if (eventTypes.length === 0 || !onEvent) return;

    // Find new events that haven't been consumed
    const newEvents = messages.filter(msg => {
      // All messages should now be ResourceMessage format
      const resourceMsg = msg as ResourceMessage<T>;
      return resourceMsg.content.lifecycle === 'event' &&
             eventTypes.includes(resourceMsg.content.type) &&
             !consumedIds.has(resourceMsg.id);
    });

    // Process each new event
    newEvents.forEach(eventMsg => {
      const resourceMsg = eventMsg as ResourceMessage<T>;
      
      // Check TTL expiry
      if (resourceMsg.content.ttl) {
        const age = Date.now() - resourceMsg.timestamp;
        if (age > resourceMsg.content.ttl) {
          // Expired, just mark as consumed
          setConsumedIds(prev => new Set(prev).add(resourceMsg.id));
          return;
        }
      }

      // Process the event
      onEvent(resourceMsg.content);
      
      // Mark as consumed
      setConsumedIds(prev => new Set(prev).add(resourceMsg.id));
    });
  }, [messages, eventTypes, onEvent, consumedIds]);
}

/**
 * Super simple hook - listen for commands and execute them automatically
 * Commands are executed once, no manual tracking needed!
 */
export function useCommands<T extends BaseMessageContent>(
  resourceId: string,
  commandTypes: string[],
  onCommand: (command: T) => void
): void {
  const [consumedIds, setConsumedIds] = useState<Set<string>>(new Set());
  
  const api = useResourceAPI<T>(resourceId);
  const messages = api.messaging.getMessages();

  useEffect(() => {
    if (commandTypes.length === 0 || !onCommand) return;

    // Find new commands that haven't been consumed
    const newCommands = messages.filter(msg => {
      // All messages should now be ResourceMessage format
      const resourceMsg = msg as ResourceMessage<T>;
      return resourceMsg.content.lifecycle === 'command' &&
             commandTypes.includes(resourceMsg.content.type) &&
             !consumedIds.has(resourceMsg.id);
    });

    // Execute each new command
    newCommands.forEach(commandMsg => {
      const resourceMsg = commandMsg as ResourceMessage<T>;
      
      // Execute the command
      onCommand(resourceMsg.content);
      
      // Mark as consumed
      setConsumedIds(prev => new Set(prev).add(resourceMsg.id));
    });
  }, [messages, commandTypes, onCommand, consumedIds]);
}

/**
 * All-in-one hook - handles state, events, and commands automatically
 * Developer just specifies what they want to listen for!
 */
export function useMessaging<TState extends BaseMessageContent, TEvent extends BaseMessageContent, TCommand extends BaseMessageContent>({
  resourceId,
  stateKey,
  eventTypes = [],
  commandTypes = [],
  onEvent,
  onCommand
}: {
  resourceId: string;
  stateKey?: string;
  eventTypes?: string[];
  commandTypes?: string[];
  onEvent?: (event: TEvent) => void;
  onCommand?: (command: TCommand) => void;
}) {
  // Always call hooks, but conditionally use results
  const currentState = useCurrentState<TState>(resourceId, stateKey || '');
  
  // Always call event hook
  const noOpEvent = () => { /* no-op */ };
  useEvents<TEvent>(resourceId, eventTypes, onEvent || noOpEvent);
  
  // Always call command hook  
  const noOpCommand = () => { /* no-op */ };
  useCommands<TCommand>(resourceId, commandTypes, onCommand || noOpCommand);
  
  // Return conditionally based on what was requested
  const finalState = stateKey ? currentState : null;

  return {
    currentState: finalState,
    hasState: finalState !== null
  };
} 