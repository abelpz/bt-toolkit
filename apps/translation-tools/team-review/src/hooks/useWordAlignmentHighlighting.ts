import { useState, useEffect } from 'react';
import { useResourceAPI } from 'linked-panels';
import { WordAlignmentMessageTypes, createHighlightAlignmentMessage, createFilterByGreekWordsMessage } from '../plugins/word-alignment';
import { findWordsForNoteQuote } from '../utils/wordAlignmentUtils';

interface WordAlignmentHighlightingOptions {
  resourceId: string;
  mergedWords: any[];
  enableFiltering?: boolean; // Whether to send filter messages on word clicks
}

interface WordData {
  greekWord: string;
  strongNumber: string;
  lemma: string;
}

export function useWordAlignmentHighlighting({ resourceId, mergedWords, enableFiltering = false }: WordAlignmentHighlightingOptions) {
  const [hoveredAlignment, setHoveredAlignment] = useState<string | null>(null);
  const [externalHighlight, setExternalHighlight] = useState<string | null>(null);
  
  // Use linked-panels API
  const api = useResourceAPI<
    WordAlignmentMessageTypes['highlightAlignment'] | 
    WordAlignmentMessageTypes['highlightNoteQuote'] | 
    WordAlignmentMessageTypes['clearHighlights'] |
    WordAlignmentMessageTypes['filterByGreekWords']
  >(resourceId);

  // Get messages reactively - this will trigger re-renders when messages change
  const messages = api.messaging.getMessages();

  // Listen for incoming highlight messages
  useEffect(() => {
    if (messages.length === 0) return;
    
    // Find the chronologically latest message (highest timestamp) that affects highlighting
    const relevantMessages = messages.filter(msg => 
      msg.content.type === 'highlightAlignment' || 
      msg.content.type === 'highlightNoteQuote' || 
      msg.content.type === 'clearHighlights'
    );
    
    // Sort by timestamp to get the most recent message
    const latestMessage = relevantMessages.sort((a, b) => b.timestamp - a.timestamp)[0];
    
    if (!latestMessage) return;
    
    // Process the latest message
    if (latestMessage.content.type === 'clearHighlights') {
      // Clear highlights unless it's from this same resource
      if (!latestMessage.content.sourceResourceId || latestMessage.content.sourceResourceId !== resourceId) {
        setExternalHighlight(null);
      }
    } else if (latestMessage.content.type === 'highlightAlignment') {
      // Don't highlight if the message came from this same resource
      if (latestMessage.content.sourceResourceId !== resourceId) {
        setExternalHighlight(latestMessage.content.alignmentKey);
      }
    } else if (latestMessage.content.type === 'highlightNoteQuote') {
      // Don't highlight if the message came from this same resource
      if (latestMessage.content.sourceResourceId !== resourceId) {
        // Find words that match the quote and occurrence
        const noteHighlightKey = findWordsForNoteQuote(
          latestMessage.content.quote, 
          latestMessage.content.occurrence,
          mergedWords
        );
        setExternalHighlight(noteHighlightKey);
      }
    }
  }, [messages, resourceId, mergedWords]);

  const handleWordHover = (alignmentKey: string | null, wordData?: WordData) => {
    setHoveredAlignment(alignmentKey);
    
    // Send message to other panels about the highlight
    if (alignmentKey && wordData) {
      const message = createHighlightAlignmentMessage(
        alignmentKey,
        wordData.greekWord,
        wordData.strongNumber,
        wordData.lemma,
        resourceId
      );
      api.messaging.sendToAll(message);
    } else {
      // Send clear message
      const clearMessage = { type: 'clearHighlights' as const, lifecycle: 'command' as const, sourceResourceId: resourceId };
      api.messaging.sendToAll(clearMessage);
    }
  };

  const handleWordClick = (alignmentKey: string | null, wordData?: WordData) => {
    if (!enableFiltering || !alignmentKey || !wordData) return;
    
    // Collect all Greek words that share the same alignment key
    const relatedWords = mergedWords
      .filter(word => word.alignment && `${word.alignment.content}-${word.alignment.strong}` === alignmentKey)
      .map(word => ({
        word: word.alignment.content,
        strongNumber: word.alignment.strong,
        lemma: word.alignment.lemma
      }));
    
    // Remove duplicates
    const uniqueWords = relatedWords.filter((word, index, arr) => 
      arr.findIndex(w => w.word === word.word && w.strongNumber === word.strongNumber) === index
    );
    
    if (uniqueWords.length > 0) {
      const filterMessage = createFilterByGreekWordsMessage(
        uniqueWords,
        resourceId,
        [alignmentKey]
      );
      api.messaging.sendToAll(filterMessage);
    }
  };

  const getWordHighlightState = (alignmentKey: string | null) => {
    const isLocallyHighlighted = !!(hoveredAlignment && alignmentKey === hoveredAlignment);
    
    // Check if this word's alignment key is in the external highlight (could be multiple keys separated by |)
    const isExternallyHighlighted = !!(externalHighlight && alignmentKey && (
      externalHighlight === alignmentKey || 
      externalHighlight.split('|').includes(alignmentKey)
    ));
    
    return {
      isLocallyHighlighted,
      isExternallyHighlighted,
      isHighlighted: isLocallyHighlighted || isExternallyHighlighted,
      hasAlignment: !!alignmentKey
    };
  };

  return {
    hoveredAlignment,
    externalHighlight,
    handleWordHover,
    handleWordClick,
    getWordHighlightState
  };
} 