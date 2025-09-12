/**
 * Message types for scripture token broadcasting via linked-panels
 */

import { BaseMessageContent } from 'linked-panels';
import type { OptimizedToken } from '../services/usfm-processor';

/**
 * Scripture tokens broadcast message
 * This is a STATE message that persists until the scripture resource is unmounted
 * or navigation changes, allowing other resources to access token data even if
 * they mount after the broadcast was sent.
 */
export interface ScriptureTokensBroadcast extends BaseMessageContent {
  type: 'scripture-tokens-broadcast';
  lifecycle: 'state';
  stateKey: 'current-scripture-tokens'; // Fixed key for current scripture tokens
  
  /** The resource ID that is broadcasting the tokens */
  sourceResourceId: string;
  
  /** Current navigation reference */
  reference: {
    book: string;
    chapter: number;
    verse: number;
    endChapter?: number;
    endVerse?: number;
  };
  
  /** List of tokens from the filtered verse range */
  tokens: OptimizedToken[];
  
  /** Resource metadata for context */
  resourceMetadata: {
    id: string;
    language: string;
    languageDirection?: 'ltr' | 'rtl';
    type: string;
  };
  
  /** Timestamp when the broadcast was sent */
  timestamp: number;
}

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
  
  /** Groups of tokens, one per note */
  tokenGroups: NoteTokenGroup[];
  
  /** Resource metadata for context */
  resourceMetadata: {
    id: string;
    language: string;
    languageDirection?: 'ltr' | 'rtl';
    type: string;
  };
  
  /** Timestamp when the broadcast was sent */
  timestamp: number;
}

/**
 * Message registry for scripture-related messages
 */
export interface ScriptureMessageTypes {
  'scripture-tokens-broadcast': ScriptureTokensBroadcast;
  'notes-token-groups-broadcast': NotesTokenGroupsBroadcast;
}
