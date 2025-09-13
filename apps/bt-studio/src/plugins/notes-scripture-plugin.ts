/**
 * Notes-Scripture Communication Plugin
 * 
 * This plugin defines the message types for communication between
 * NotesViewer and ScriptureViewer components using the linked-panels
 * plugin system.
 */

import { BaseMessageContent, ResourceMessage } from 'linked-panels';
import { OptimizedToken } from '../services/usfm-processor';
import { TokenClickBroadcast, NoteSelectionBroadcast } from '../types/scripture-messages';

/**
 * Note token group for highlighting specific notes in scripture
 */
export interface NoteTokenGroup {
  noteId: string;
  noteReference: string;
  quote: string;
  occurrence: number;
  tokens: OptimizedToken[];
}

/**
 * Notes token groups broadcast message
 * This allows notes resources to send groups of tokens to scripture resources
 * for highlighting different notes with different colors
 */
export interface NotesTokenGroupsBroadcast extends BaseMessageContent {
  type: 'notes-token-groups-broadcast';
  lifecycle: 'state';
  stateKey: 'current-notes-token-groups';
  
  /** The notes resource ID that is broadcasting the token groups */
  sourceResourceId: string;
  
  /** Current navigation reference */
  reference: {
    book: string;
    chapter: number;
    verse: number;
    endChapter?: number;
    endVerse?: number;
  };
  
  /** Groups of tokens for different notes */
  tokenGroups: NoteTokenGroup[];
  
  /** Resource metadata */
  resourceMetadata: {
    id: string;
    language: string;
    languageDirection?: string;
    type: string;
  };
  
  /** Timestamp when the message was created */
  timestamp: number;
}

/**
 * Message registry for notes-scripture communication
 */
export interface NotesScriptureMessageTypes {
  'notes-token-groups-broadcast': NotesTokenGroupsBroadcast;
  'token-click-broadcast': TokenClickBroadcast;
  'note-selection-broadcast': NoteSelectionBroadcast;
}

/**
 * Validation function for notes token groups broadcast
 */
function isNotesTokenGroupsBroadcast(content: unknown): content is NotesTokenGroupsBroadcast {
  if (!content || typeof content !== 'object') return false;
  
  const msg = content as any;
  return (
    msg.type === 'notes-token-groups-broadcast' &&
    msg.lifecycle === 'state' &&
    msg.stateKey === 'current-notes-token-groups' &&
    typeof msg.sourceResourceId === 'string' &&
    msg.reference &&
    typeof msg.reference.book === 'string' &&
    typeof msg.reference.chapter === 'number' &&
    Array.isArray(msg.tokenGroups) &&
    msg.resourceMetadata &&
    typeof msg.resourceMetadata.id === 'string' &&
    typeof msg.timestamp === 'number'
  );
}

/**
 * Validation function for token click broadcast
 */
function isTokenClickBroadcast(content: unknown): content is TokenClickBroadcast {
  if (!content || typeof content !== 'object') return false;
  
  const msg = content as any;
  return (
    msg.type === 'token-click-broadcast' &&
    msg.lifecycle === 'event' &&
    msg.clickedToken &&
    typeof msg.clickedToken.id === 'number' &&
    typeof msg.clickedToken.content === 'string' &&
    typeof msg.clickedToken.semanticId === 'string' &&
    typeof msg.sourceResourceId === 'string' &&
    typeof msg.timestamp === 'number'
  );
}

/**
 * Handler for notes token groups broadcast messages
 */
function handleNotesTokenGroupsBroadcast(message: ResourceMessage<NotesTokenGroupsBroadcast>) {
  console.log(`📡 Notes token groups broadcast from ${message.fromResourceId}:`, {
    tokenGroups: message.content.tokenGroups.length,
    reference: message.content.reference,
    timestamp: new Date(message.content.timestamp).toLocaleTimeString()
  });
}

/**
 * Validation function for note selection broadcast
 */
function isNoteSelectionBroadcast(content: unknown): content is NoteSelectionBroadcast {
  if (!content || typeof content !== 'object') return false;
  
  const msg = content as any;
  return (
    msg.type === 'note-selection-broadcast' &&
    msg.lifecycle === 'event' &&
    msg.selectedNote &&
    typeof msg.selectedNote.noteId === 'string' &&
    typeof msg.selectedNote.tokenGroupId === 'string' &&
    typeof msg.selectedNote.quote === 'string' &&
    typeof msg.selectedNote.reference === 'string' &&
    typeof msg.sourceResourceId === 'string' &&
    typeof msg.timestamp === 'number'
  );
}

/**
 * Handler for token click broadcast messages
 */
function handleTokenClickBroadcast(message: ResourceMessage<TokenClickBroadcast>) {
  console.log(`🖱️ Token click broadcast from ${message.fromResourceId}:`, {
    tokenId: message.content.clickedToken.id,
    content: message.content.clickedToken.content,
    semanticId: message.content.clickedToken.semanticId,
    timestamp: new Date(message.content.timestamp).toLocaleTimeString()
  });
}

/**
 * Handler for note selection broadcast messages
 */
function handleNoteSelectionBroadcast(message: ResourceMessage<NoteSelectionBroadcast>) {
  console.log(`📝 Note selection broadcast from ${message.fromResourceId}:`, {
    noteId: message.content.selectedNote.noteId,
    tokenGroupId: message.content.selectedNote.tokenGroupId,
    quote: message.content.selectedNote.quote,
    reference: message.content.selectedNote.reference,
    timestamp: new Date(message.content.timestamp).toLocaleTimeString()
  });
}

/**
 * Notes-Scripture Communication Plugin
 */
export const notesScripturePlugin = {
  name: 'notes-scripture-communication',
  version: '1.0.0',
  description: 'Communication plugin for Notes and Scripture viewers',
  
  messageTypes: {
    'notes-token-groups-broadcast': {} as NotesTokenGroupsBroadcast,
    'token-click-broadcast': {} as TokenClickBroadcast,
    'note-selection-broadcast': {} as NoteSelectionBroadcast
  } as NotesScriptureMessageTypes,
  
  validators: {
    'notes-token-groups-broadcast': isNotesTokenGroupsBroadcast,
    'token-click-broadcast': isTokenClickBroadcast,
    'note-selection-broadcast': isNoteSelectionBroadcast
  },
  
  handlers: {
    'notes-token-groups-broadcast': handleNotesTokenGroupsBroadcast,
    'token-click-broadcast': handleTokenClickBroadcast,
    'note-selection-broadcast': handleNoteSelectionBroadcast
  }
};

/**
 * Helper function to create a notes token groups broadcast message
 */
export function createNotesTokenGroupsBroadcast(
  sourceResourceId: string,
  reference: NotesTokenGroupsBroadcast['reference'],
  tokenGroups: NoteTokenGroup[],
  resourceMetadata: NotesTokenGroupsBroadcast['resourceMetadata']
): NotesTokenGroupsBroadcast {
  return {
    type: 'notes-token-groups-broadcast',
    lifecycle: 'state',
    stateKey: 'current-notes-token-groups',
    sourceResourceId,
    reference,
    tokenGroups,
    resourceMetadata,
    timestamp: Date.now()
  };
}
