import { BaseMessageContent } from linked-panels/core/types';

/**
 * SUPER SIMPLE! Developers just add lifecycle properties to their existing messages
 */
export interface WordAlignmentMessages {
  // STATE message - persists until superseded
  highlightAlignment: {
    type: 'highlightAlignment';
    lifecycle: 'state';           // ← Just add this!
    stateKey: 'highlight';        // ← And this!
    alignmentKey: string | null;
    greekWord: string;
    strongNumber: string;
    lemma: string;
    sourceResourceId: string;
  } & BaseMessageContent;

  // STATE message - persists until superseded  
  filterByGreekWords: {
    type: 'filterByGreekWords';
    lifecycle: 'state';           // ← Just add this!
    stateKey: 'filter';           // ← And this!
    greekWords: Array<{
      word: string;
      strongNumber: string;
      lemma: string;
    }>;
    sourceResourceId: string;
    alignmentKeys: string[];
  } & BaseMessageContent;

  // COMMAND message - executed once
  clearHighlights: {
    type: 'clearHighlights';
    lifecycle: 'command';         // ← Just add this!
    sourceResourceId?: string;
  } & BaseMessageContent;

  // COMMAND message - executed once
  clearFilters: {
    type: 'clearFilters';
    lifecycle: 'command';         // ← Just add this!
    sourceResourceId?: string;
  } & BaseMessageContent;

  // EVENT message - consumed once, then discarded
  wordClicked: {
    type: 'wordClicked';
    lifecycle: 'event';           // ← Just add this!
    ttl: 5000;                    // ← Optional: expires after 5 seconds
    alignmentKey: string;
    greekWord: string;
    strongNumber: string;
    lemma: string;
    sourceResourceId: string;
  } & BaseMessageContent;

  // EVENT message - consumed once, expires quickly
  wordHovered: {
    type: 'wordHovered';
    lifecycle: 'event';           // ← Just add this!
    ttl: 1000;                    // ← Expires after 1 second
    alignmentKey: string | null;
    greekWord?: string;
    strongNumber?: string;
    lemma?: string;
    sourceResourceId: string;
  } & BaseMessageContent;
} 