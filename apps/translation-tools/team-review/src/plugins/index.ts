/**
 * Bible Translation Toolkit - App-specific plugins
 * 
 * This module contains plugins specific to the Bible translation workflow,
 * including word alignment highlighting and translation note integration.
 */

export { 
  /** Plugin for word alignment highlighting in Bible translation tools */
  wordAlignmentPlugin, 
  /** Utility to create highlight alignment messages */
  createHighlightAlignmentMessage, 
  /** Utility to create highlight note quote messages */
  createHighlightNoteQuoteMessage,
  /** Utility to create clear highlights messages */
  createClearHighlightsMessage 
} from './word-alignment';

export type { 
  /** Type definitions for word alignment message content */
  WordAlignmentMessageTypes 
} from './word-alignment';

export { 
  /** Creates a plugin registry with built-in and Bible translation specific plugins */
  createBibleTranslationPluginRegistry 
} from './registry'; 