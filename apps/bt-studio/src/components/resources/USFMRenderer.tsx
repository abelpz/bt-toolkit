/**
 * USFM Renderer Component
 * Renders processed USFM data with paragraph-based structure
 * Supports verse ranges, cross-chapter rendering, and alignment display
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useCurrentState, useResourceAPI, useMessaging } from 'linked-panels';
import type { WordAlignment } from '../../types/context';
import type { OptimizedToken, OptimizedScripture, OptimizedVerse } from '../../services/usfm-processor';
import { getCrossPanelCommunicationService, type CrossPanelMessage, type TokenHighlightMessage, type OriginalLanguageToken } from '../../services/cross-panel-communication';
import { TokenUnderliningProvider, useTokenUnderlining, type TokenGroup } from '../../contexts/TokenUnderliningContext';
import type { NotesTokenGroupsBroadcast, TokenClickBroadcast, NoteSelectionBroadcast } from '../../types/scripture-messages';
import { useNavigation } from '../../contexts/NavigationContext';

/**
 * Find tokens in optimized format that align to the given original language token
 */
function findTokensAlignedToOriginalLanguageTokenOptimized(
  originalLanguageToken: OriginalLanguageToken,
  scripture: OptimizedScripture,
  resourceType: 'ULT' | 'UST' | 'UGNT' | 'UHB',
  language: 'en' | 'el-x-koine' | 'hbo'
): number[] {
  const tokenIds: number[] = [];
  const debugInfo = {
    searchingFor: originalLanguageToken.semanticId,
    alignedSemanticIds: originalLanguageToken.alignedSemanticIds,
    isOriginalLanguage: language === 'el-x-koine' || language === 'hbo',
    matchedTokens: [] as Array<{tokenId: number, tokenText: string, matchType: string}>
  };
  
  // For original language panels
  if (language === 'el-x-koine' || language === 'hbo') {
    // Find tokens with matching semantic ID
    for (const chapter of scripture.chapters) {
      for (const verse of chapter.verses) {
        for (const token of verse.tokens) {
          // Direct semantic ID match
          if (token.id === originalLanguageToken.semanticId) {
            tokenIds.push(token.id);
            debugInfo.matchedTokens.push({
              tokenId: token.id,
              tokenText: token.text,
              matchType: 'direct_semantic_id'
            });
          }
          
          // Check aligned semantic IDs for group matches (but skip if it's the same as primary)
          if (originalLanguageToken.alignedSemanticIds) {
            for (const alignedId of originalLanguageToken.alignedSemanticIds) {
              // Skip if this alignedId is the same as the primary semanticId (avoid duplicates)
              if (alignedId !== originalLanguageToken.semanticId && token.id === alignedId) {
                tokenIds.push(token.id);
                debugInfo.matchedTokens.push({
                  tokenId: token.id,
                  tokenText: token.text,
                  matchType: 'aligned_semantic_id'
                });
              }
            }
          }
        }
      }
    }
  } else {
    // For target language panels, find tokens that align to the original language token
    let totalTokensChecked = 0;
    let tokensWithAlignment = 0;
    
    for (const chapter of scripture.chapters) {
      for (const verse of chapter.verses) {
        for (const token of verse.tokens) {
          totalTokensChecked++;
          
          if (token.align) {
            tokensWithAlignment++;
            
            const hasMatch = token.align.includes(originalLanguageToken.semanticId);
            
            // Check if this token aligns to the original language token
            if (hasMatch) {
              tokenIds.push(token.id);
              debugInfo.matchedTokens.push({
                tokenId: token.id,
                tokenText: token.text,
                matchType: 'align_to_primary',
              });
            }
            
            // Check aligned semantic IDs for group matches (but skip if it's the same as primary)
            if (originalLanguageToken.alignedSemanticIds) {
              for (const alignedId of originalLanguageToken.alignedSemanticIds) {
                // Skip if this alignedId is the same as the primary semanticId (avoid duplicates)
                if (alignedId !== originalLanguageToken.semanticId && token.align.includes(alignedId)) {
                  
                  tokenIds.push(token.id);
                  debugInfo.matchedTokens.push({
                    tokenId: token.id,
                    tokenText: token.text,
                    matchType: 'align_to_group',
                    matchedAlignedId: alignedId
                  });
                }
              }
            }
          }
        }
      }
    }
    
  }
  
  
  return [...new Set(tokenIds)]; // Remove duplicates
}

/**
 * Check if a token should be highlighted based on the highlight target
 */
function shouldHighlightToken(
  token: OptimizedToken,
  highlightTarget: OriginalLanguageToken | null,
  language: 'en' | 'el-x-koine' | 'hbo'
): boolean {
  if (!highlightTarget) {
    return false;
  }

  // For original language panels
  if (language === 'el-x-koine' || language === 'hbo') {
    // Direct semantic ID match
    if (token.id === highlightTarget.semanticId) {
      return true;
    }
    
    // Check aligned semantic IDs for group matches (but skip if it's the same as primary)
    if (highlightTarget.alignedSemanticIds) {
      for (const alignedId of highlightTarget.alignedSemanticIds) {
        if (alignedId !== highlightTarget.semanticId && token.id === alignedId) {
          return true;
        }
      }
    }
  } else {
    // For target language panels, check if this token aligns to the highlight target
    if (token.align) {
      // Check if this token aligns to the original language token
      if (token.align.includes(highlightTarget.semanticId)) {
        return true;
      }
      
      // Check aligned semantic IDs for group matches (but skip if it's the same as primary)
      if (highlightTarget.alignedSemanticIds) {
        for (const alignedId of highlightTarget.alignedSemanticIds) {
          if (alignedId !== highlightTarget.semanticId && token.align.includes(alignedId)) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}

/**
 * Wrapper function for backward compatibility
 */
function findTokensAlignedToOriginalLanguageToken(
  originalLanguageToken: OriginalLanguageToken,
  scripture: OptimizedScripture,
  resourceType: 'ULT' | 'UST' | 'UGNT' | 'UHB',
  language: 'en' | 'el-x-koine' | 'hbo'
): number[] {
  return findTokensAlignedToOriginalLanguageTokenOptimized(originalLanguageToken, scripture, resourceType, language);
}

/**
 * Get verses to render based on filters and range - optimized version
 */
function getVersesToRenderOptimized(
  scripture: OptimizedScripture,
  options: {
    chapter?: number;
    verseRange?: { start: number; end: number };
    startRef?: { chapter: number; verse: number };
    endRef?: { chapter: number; verse: number };
  }
): OptimizedVerse[] {
  const { chapter, verseRange, startRef, endRef } = options;
  let versesWithChapter: Array<OptimizedVerse & { chapterNumber: number }> = [];

  // Collect all verses from all chapters with chapter context
  for (const chapterData of scripture.chapters) {
    for (const verse of chapterData.verses) {
      versesWithChapter.push({
        ...verse,
        chapterNumber: chapterData.number
      });
    }
  }


  // Apply filters
  if (chapter) {
    versesWithChapter = versesWithChapter.filter(v => v.chapterNumber === chapter);
  }

  if (verseRange) {
    versesWithChapter = versesWithChapter.filter(v => {
      return v.number >= verseRange.start && v.number <= verseRange.end;
    });
  }

  if (startRef && endRef) {
    versesWithChapter = versesWithChapter.filter(v => {
      const chapterNum = v.chapterNumber;
      const verseNum = v.number;
      
      const isAfterStart = chapterNum > startRef.chapter || 
                          (chapterNum === startRef.chapter && verseNum >= startRef.verse);
      const isBeforeEnd = chapterNum < endRef.chapter || 
                         (chapterNum === endRef.chapter && verseNum <= endRef.verse);
      
      return isAfterStart && isBeforeEnd;
    });
  }

  // Sort by chapter and verse
  const sortedVerses = versesWithChapter.sort((a, b) => {
    if (a.chapterNumber !== b.chapterNumber) {
      return a.chapterNumber - b.chapterNumber;
    }
    return a.number - b.number;
  });


  // Return verses without the added chapterNumber property
  return sortedVerses.map(({ chapterNumber, ...verse }) => verse);
}

export interface USFMRendererProps {
  /** Processed scripture data in optimized format */
  scripture: OptimizedScripture;
  /** Resource identifier for cross-panel communication */
  resourceId: string;
  /** Resource type for alignment logic */
  resourceType: 'ULT' | 'UST' | 'UGNT' | 'UHB';
  /** Language code for alignment logic */
  language: 'en' | 'el-x-koine' | 'hbo';
  /** Filter by specific chapter */
  chapter?: number;
  /** Filter by verse range within chapter */
  verseRange?: { start: number; end: number };
  /** Start reference for cross-chapter ranges */
  startRef?: { chapter: number; verse: number };
  /** End reference for cross-chapter ranges */
  endRef?: { chapter: number; verse: number };
  /** Show verse numbers */
  showVerseNumbers?: boolean;
  /** Show chapter headers */
  showChapterNumbers?: boolean;
  /** Show paragraph structure */
  showParagraphs?: boolean;
  /** Show alignment data */
  showAlignments?: boolean;
  /** Highlight specific words */
  highlightWords?: string[];
  /** Callback when word token is clicked */
  onWordClick?: (word: string, verse: OptimizedVerse, alignment?: WordAlignment) => void;
  /** Callback when word token is clicked (enhanced) */
  onTokenClick?: (token: OptimizedToken, verse: OptimizedVerse) => void;
  /** Custom styling */
  className?: string;
}

// Internal component that uses the context
const USFMRendererInternal: React.FC<USFMRendererProps> = ({
  scripture,
  resourceId,
  resourceType,
  language,
  chapter,
  verseRange,
  startRef,
  endRef,
  showVerseNumbers = true,
  showChapterNumbers = true,
  showParagraphs = true,
  showAlignments = false,
  highlightWords = [],
  onWordClick,
  onTokenClick,
  className = ''
}) => {
  const { currentReference } = useNavigation();
  const { addTokenGroup, clearTokenGroups, setActiveGroup } = useTokenUnderlining();
  
  // Linked-panels API for broadcasting token clicks
  const linkedPanelsAPI = useResourceAPI(resourceId || 'default');

  // Listen for notes token groups broadcasts
  const notesTokenGroupsBroadcast = useCurrentState<NotesTokenGroupsBroadcast>(
    resourceId || 'default', 
    'current-notes-token-groups'
  );

  // Listen for note selection events to update active group
  const noteSelectionMessaging = useMessaging({ 
    resourceId: resourceId || 'default',
    eventTypes: ['note-selection-broadcast'],
    onEvent: (event) => {
      if (event.type === 'note-selection-broadcast') {
        const noteSelectionEvent = event as NoteSelectionBroadcast;
        console.log('📝 USFMRenderer received note selection:', noteSelectionEvent.selectedNote);
        
        // Set the active group based on the selected note's token group ID
        setActiveGroup(noteSelectionEvent.selectedNote.tokenGroupId);
      }
    }
  });
  

  // Update token groups when notes broadcast changes
  useEffect(() => {
    // Always clear existing notes token groups first
    clearTokenGroups('notes');
    
    if (notesTokenGroupsBroadcast && 
        notesTokenGroupsBroadcast.tokenGroups && 
        notesTokenGroupsBroadcast.tokenGroups.length > 0) {
      
      // Check if the broadcast is for the current book - ignore stale broadcasts
      const currentBook = currentReference?.book;
      const broadcastBook = notesTokenGroupsBroadcast.reference?.book;
      
      if (currentBook && broadcastBook && currentBook !== broadcastBook) {
        console.log(`🚫 USFMRenderer: Ignoring stale broadcast for ${broadcastBook}, current book is ${currentBook}`);
        return;
      }
      
      console.log(`🎯 USFMRenderer received notes token groups:`, {
        sourceResourceId: notesTokenGroupsBroadcast.sourceResourceId,
        tokenGroupsCount: notesTokenGroupsBroadcast.tokenGroups.length,
        reference: notesTokenGroupsBroadcast.reference,
        book: broadcastBook,
        currentBook: currentBook,
        timestamp: notesTokenGroupsBroadcast.timestamp
      });

      // Add new token groups
      notesTokenGroupsBroadcast.tokenGroups.forEach(noteGroup => {
        const tokenGroup: TokenGroup = {
          id: `notes-${noteGroup.noteId}`,
          sourceType: 'notes',
          sourceId: noteGroup.noteId,
          tokens: noteGroup.tokens,
          label: `${noteGroup.quote} (#${noteGroup.occurrence})`
        };
        addTokenGroup(tokenGroup);
      });
    } else if (notesTokenGroupsBroadcast && 
               (notesTokenGroupsBroadcast.tokenGroups?.length === 0 || 
                notesTokenGroupsBroadcast.resourceMetadata?.id === 'cleared')) {
      // Handle explicit empty broadcast (cleanup) or cleared marker
      console.log(`🧹 USFMRenderer: Received clear signal - clearing all notes underlining`, {
        isEmpty: notesTokenGroupsBroadcast.tokenGroups?.length === 0,
        isCleared: notesTokenGroupsBroadcast.resourceMetadata?.id === 'cleared'
      });
    } else {
      // No broadcast or invalid broadcast
      console.log(`🧹 USFMRenderer: No token groups to add`, {
        hasBroadcast: !!notesTokenGroupsBroadcast,
        hasTokenGroups: !!(notesTokenGroupsBroadcast?.tokenGroups),
        tokenGroupsLength: notesTokenGroupsBroadcast?.tokenGroups?.length || 0,
        broadcastReference: notesTokenGroupsBroadcast?.reference
      });
    }
  }, [notesTokenGroupsBroadcast, addTokenGroup, clearTokenGroups, currentReference?.book]);

  // Clear token groups when navigating to a different book
  useEffect(() => {
    clearTokenGroups('notes');
    console.log(`📖 USFMRenderer: Cleared token groups for book navigation to ${currentReference?.book}`);
  }, [currentReference?.book, clearTokenGroups]);

  // Cross-panel communication state - store the original language token to highlight
  const [highlightTarget, setHighlightTarget] = useState<OriginalLanguageToken | null>(null);
  const crossPanelService = getCrossPanelCommunicationService();

  // Handle highlight messages from all panels (including self-highlighting)
  const handleHighlightMessage = useCallback((message: TokenHighlightMessage) => {


    // Store the original language token - renderer will check alignment during rendering
    setHighlightTarget(message.originalLanguageToken);
  }, []);

  // Handle clear highlights messages
  const handleClearHighlights = useCallback((message: CrossPanelMessage) => {
    setHighlightTarget(null);
  }, []);

  // Handle token clicks
  const handleTokenClick = useCallback((token: OptimizedToken, verse: OptimizedVerse) => {
    console.log('🖱️ Token clicked in USFMRenderer:', {
      tokenId: token.id,
      content: token.text,
      semanticId: token.id,
      sourceResourceId: resourceId
    });
    
    // Clear active note highlighting when a word is clicked
    setActiveGroup(null);
    
    // Create original language token for the clicked token
    const verseRef = `${resourceType?.toLowerCase() || 'unknown'} ${currentReference?.chapter || 1}:${verse.number}`;
    
    // Broadcast token click via linked-panels as event message
    const tokenClickBroadcast: TokenClickBroadcast = {
      type: 'token-click-broadcast',
      lifecycle: 'event',
      clickedToken: {
        id: token.id,
        content: token.text,
        semanticId: token.id.toString(),
        alignedSemanticIds: token.align ? token.align.map(a => a.toString()) : undefined,
        verseRef: verseRef
      },
      sourceResourceId: resourceId || 'unknown',
      timestamp: Date.now()
    };
    
    console.log('📡 Broadcasting token click via linked-panels:', tokenClickBroadcast);
    linkedPanelsAPI.messaging.sendToAll(tokenClickBroadcast);
    
    // Also trigger cross-panel communication for highlighting (keep existing functionality)
    crossPanelService.handleTokenClick(token, resourceId);
    
    // Call user callback if provided
    if (onTokenClick) {
      onTokenClick(token, verse);
    }
  }, [crossPanelService, resourceId, onTokenClick, linkedPanelsAPI, resourceType, currentReference, setActiveGroup]);

  // Register panel and set up cross-panel communication
  useEffect(() => {
    
    // Register this panel with the cross-panel service
    const panelResource = {
      resourceId,
      resourceType,
      language,
      chapters: scripture.chapters as any, // Legacy property for compatibility
      isOriginalLanguage: language === 'el-x-koine' || language === 'hbo',
      optimizedChapters: scripture.chapters,
      isOptimized: true
    };

    crossPanelService.registerPanel(panelResource);

    // Add message handler for cross-panel highlights
    const unsubscribe = crossPanelService.addMessageHandler((message: CrossPanelMessage) => {

      if (message.type === 'HIGHLIGHT_TOKENS') {
        handleHighlightMessage(message);
      } else if (message.type === 'CLEAR_HIGHLIGHTS') {
        handleClearHighlights(message);
      }
    });

    return () => {
      // Only remove message handler, keep panel registered
      // Panel will be unregistered when component unmounts
      unsubscribe();
    };
  }, [resourceId, resourceType, language, scripture.chapters, crossPanelService, handleHighlightMessage, handleClearHighlights]);

  // Separate effect for component unmount - unregister panel only then
  useEffect(() => {
    return () => {
      crossPanelService.unregisterPanel(resourceId);
    };
  }, [resourceId, crossPanelService]);

  const versesToRender = getVersesToRender(scripture, { chapter, verseRange, startRef, endRef });

  if (versesToRender.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <div className="text-lg font-medium">No verses found</div>
        <div className="text-sm">No content matches the specified criteria</div>
      </div>
    );
  }

  // Group verses by paragraphs if showing paragraph structure
  if (showParagraphs) {
    return (
      <div className={`usfm-renderer prose prose-lg max-w-none ${className}`}>
        {renderByParagraphs(versesToRender, scripture, {
          showVerseNumbers,
          showChapterNumbers,
          showAlignments,
          highlightWords,
          highlightTarget,
          onWordClick,
          onTokenClick: handleTokenClick,
          resourceType,
          language
        })}
      </div>
    );
  }

  // Render as simple verse list
  return (
    <div className={`usfm-renderer prose prose-lg max-w-none ${className}`}>
      {versesToRender.map((verse) => {
        const chapterNumber = getChapterForVerse(verse, scripture);
        return (
        <VerseRenderer
            key={`${chapterNumber}:${verse.number}`}
          verse={verse}
            chapterNumber={chapterNumber}
          showVerseNumbers={showVerseNumbers}
          showAlignments={showAlignments}
          highlightWords={highlightWords}
          highlightTarget={highlightTarget}
          onWordClick={onWordClick}
          onTokenClick={handleTokenClick}
            resourceType={resourceType}
            language={language}
        />
        );
      })}
    </div>
  );
};

/**
 * Render verses grouped by paragraphs with chapter headers
 */
function renderByParagraphs(
  verses: OptimizedVerse[],
  scripture: OptimizedScripture,
  options: {
    showVerseNumbers: boolean;
    showChapterNumbers: boolean;
    showAlignments: boolean;
    highlightWords: string[];
    highlightTarget: OriginalLanguageToken | null;
    onWordClick?: (word: string, verse: OptimizedVerse, alignment?: WordAlignment) => void;
    onTokenClick?: (token: OptimizedToken, verse: OptimizedVerse) => void;
    resourceType: 'ULT' | 'UST' | 'UGNT' | 'UHB';
    language: 'en' | 'el-x-koine' | 'hbo';
  }
): React.ReactNode {
  // Group verses by chapter first
  const chapterGroups: { [chapterNum: number]: OptimizedVerse[] } = {};
  
  verses.forEach(verse => {
    const chapterNum = getChapterForVerse(verse, scripture);
    if (!chapterGroups[chapterNum]) {
      chapterGroups[chapterNum] = [];
    }
    chapterGroups[chapterNum].push(verse);
  });

  return Object.keys(chapterGroups)
    .map(Number)
    .sort((a, b) => a - b)
    .map(chapterNum => {
      const chapterVerses = chapterGroups[chapterNum];
      const chapterData = scripture.chapters.find(ch => ch.number === chapterNum);
      

  return (
        <div key={`chapter-${chapterNum}`} className="chapter-group mb-6">
              {options.showChapterNumbers && (
            <h2 className="chapter-header text-2xl font-bold mb-4 text-gray-800 border-b border-gray-200 pb-2">
              {chapterNum}
                  </h2>
          )}
          
          {/* Group verses by paragraph within chapter */}
          {renderParagraphsForChapter(chapterVerses, chapterData, chapterNum, options)}
            </div>
          );
    });
}

/**
 * Render paragraphs for a specific chapter using token-based paragraph detection
 * Creates separate <p> elements for each paragraph segment
 */
function renderParagraphsForChapter(
  verses: OptimizedVerse[],
  chapterData: any,
  chapterNumber: number,
  options: {
  showVerseNumbers: boolean;
  showAlignments: boolean;
  highlightWords: string[];
    highlightTarget: OriginalLanguageToken | null;
    onWordClick?: (word: string, verse: OptimizedVerse, alignment?: WordAlignment) => void;
    onTokenClick?: (token: OptimizedToken, verse: OptimizedVerse) => void;
    resourceType: 'ULT' | 'UST' | 'UGNT' | 'UHB';
    language: 'en' | 'el-x-koine' | 'hbo';
  }
): React.ReactNode {
  // Create paragraph segments by splitting verses at paragraph marker boundaries
  const paragraphSegments: {
    style: string;
    indentLevel: number;
    type: string;
    content: { verse: OptimizedVerse; tokens: OptimizedToken[]; showVerseNumber: boolean }[];
  }[] = [];
  
  let currentSegment: {
    style: string;
    indentLevel: number;
    type: string;
    content: { verse: OptimizedVerse; tokens: OptimizedToken[]; showVerseNumber: boolean }[];
  } | null = null;
  
  verses.forEach((verse) => {
    const tokens = verse.tokens;
    let currentTokens: OptimizedToken[] = [];
    let isFirstSegmentInVerse = true;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      if (token.type === 'paragraph-marker' && token.paragraphMarker?.isNewParagraph) {
        // Save current tokens to current segment if any
        if (currentTokens.length > 0 && currentSegment) {
          currentSegment.content.push({
            verse,
            tokens: [...currentTokens],
            showVerseNumber: isFirstSegmentInVerse
          });
          currentTokens = [];
          isFirstSegmentInVerse = false;
        }
        
        // Close current segment and start new one
        if (currentSegment) {
          paragraphSegments.push(currentSegment);
        }
        
        currentSegment = {
          style: token.paragraphMarker.style,
          indentLevel: token.paragraphMarker.indentLevel,
          type: token.paragraphMarker.type,
          content: []
        };
      } else {
        // Add non-paragraph-marker tokens to current tokens
        currentTokens.push(token);
      }
    }
    
    // Add remaining tokens to current segment
    if (currentTokens.length > 0) {
      if (!currentSegment) {
        // This shouldn't happen if we added default paragraph marker, but just in case
        currentSegment = {
          style: 'p',
          indentLevel: 0,
          type: 'paragraph',
          content: []
        };
      }
      
      currentSegment.content.push({
        verse,
        tokens: currentTokens,
        showVerseNumber: isFirstSegmentInVerse
      });
    }
  });
  
  // Close final segment
  if (currentSegment) {
    paragraphSegments.push(currentSegment);
  }
  
  // Render each paragraph segment as a separate <p> element
  return paragraphSegments.map((segment, segmentIndex) => (
    <p
      key={`paragraph-segment-${segmentIndex}`}
      className={`
        mb-4 leading-relaxed
        ${segment.indentLevel === 1 ? 'ml-2' : segment.indentLevel === 2 ? 'ml-4' : segment.indentLevel > 2 ? 'ml-6' : ''}
        ${segment.type === 'quote' ? 'italic' : ''}
        ${segment.style === 'q2' ? 'text-gray-600' : ''}
      `}
    >
      {segment.content.map((contentItem, contentIndex) => (
        <React.Fragment key={`content-${contentIndex}`}>
          {/* Show verse number if this is the first content item for this verse */}
          {contentItem.showVerseNumber && options.showVerseNumbers && (
            <span className="verse-number text-sm font-bold text-blue-600 mr-1 select-none">
              {contentItem.verse.number}
            </span>
          )}
          
          {/* Render tokens */}
          {contentItem.tokens.map((token, tokenIndex) => {
            // Get next token, considering tokens across content items within the same paragraph
            let nextToken = contentItem.tokens[tokenIndex + 1];
            
            // If this is the last token in this content item, check the first token of the next content item
            if (!nextToken && contentIndex < segment.content.length - 1) {
              const nextContentItem = segment.content[contentIndex + 1];
              if (nextContentItem && nextContentItem.tokens.length > 0) {
                nextToken = nextContentItem.tokens[0];
              }
            }
            
            // Check if this token should be highlighted
            const isHighlighted = shouldHighlightToken(token, options.highlightTarget, options.language);
            
            return (
              <React.Fragment key={`token-${token.id}`}>
                <WordTokenRenderer
                  token={token}
                  verse={contentItem.verse}
                  isHighlighted={isHighlighted}
                  showAlignments={options.showAlignments}
                  onWordClick={options.onWordClick}
                  onTokenClick={options.onTokenClick}
                  isOriginalLanguage={options.language === 'el-x-koine' || options.language === 'hbo'}
                  resourceType={options.resourceType}
                  language={options.language}
                />
                {shouldAddSpaceAfterToken(token, nextToken, options.language) && <span> </span>}
              </React.Fragment>
            );
          })}
          
        </React.Fragment>
      ))}
    </p>
  ));
}

/**
 * Render a single verse with word tokens and alignments (for non-paragraph mode)
 */
const VerseRenderer: React.FC<{
  verse: OptimizedVerse;
  chapterNumber: number;
  showVerseNumbers: boolean;
  showAlignments: boolean;
  highlightWords: string[];
  highlightTarget: OriginalLanguageToken | null;
  onWordClick?: (word: string, verse: OptimizedVerse, alignment?: WordAlignment) => void;
  onTokenClick?: (token: OptimizedToken, verse: OptimizedVerse) => void;
  resourceType: 'ULT' | 'UST' | 'UGNT' | 'UHB';
  language: 'en' | 'el-x-koine' | 'hbo';
}> = ({
  verse,
  chapterNumber,
  showVerseNumbers,
  showAlignments,
  highlightWords,
  highlightTarget,
  onWordClick,
  onTokenClick,
  resourceType,
  language
}) => {
  const isOriginalLanguage = language === 'el-x-koine' || language === 'hbo';
  
  return (
    <div className="verse-container mb-2 leading-relaxed">
      {showVerseNumbers && (
        <span className="verse-number text-sm font-bold text-blue-600 mr-2 select-none">
            {verse.number}
          </span>
      )}
      
      <span className="verse-text">
        {verse.tokens
          .filter(token => token.type !== 'whitespace') // Skip whitespace tokens
          .map((token, index, filteredTokens) => {
            const nextToken = filteredTokens[index + 1];
            const isHighlighted = shouldHighlightToken(token, highlightTarget, language);
            
            return (
              <React.Fragment key={`token-${token.id}`}>
                <WordTokenRenderer
                  token={token}
          verse={verse}
                  isHighlighted={isHighlighted}
          showAlignments={showAlignments}
          onWordClick={onWordClick}
          onTokenClick={onTokenClick}
                  isOriginalLanguage={isOriginalLanguage}
                  resourceType={resourceType}
                  language={language}
                />
                {shouldAddSpaceAfterToken(token, nextToken, language) && <span> </span>}
              </React.Fragment>
            );
          })}
      </span>
      
      {showAlignments && verse.tokens.some(t => t.align) && (
        <div className="alignment-info mt-2 text-xs text-gray-500">
          <details>
            <summary className="cursor-pointer hover:text-gray-700">
              Alignments ({verse.tokens.filter(t => t.align).length})
            </summary>
            <div className="mt-1 pl-4 space-y-1">
              {verse.tokens.filter(t => t.align).map((token, i) => (
                <div key={i} className="alignment-item">
                  <strong>{token.text}</strong> → aligned to {token.align?.length} original word(s)
                  {token.strong && <span className="ml-2 text-blue-600">({token.strong})</span>}
          </div>
              ))}
      </div>
          </details>
          </div>
        )}
    </div>
  );
};

/**
 * Determine if a space should be added after a token based on token types and text direction
 */
function shouldAddSpaceAfterToken(
  currentToken: OptimizedToken, 
  nextToken: OptimizedToken | undefined, 
  language: 'en' | 'el-x-koine' | 'hbo'
): boolean {
  // No space if there's no next token
  if (!nextToken) {
    return false;
  }

  // Never add space after or before paragraph markers
  if (currentToken.type === 'paragraph-marker' || nextToken.type === 'paragraph-marker') {
    return false;
  }

  // Determine text direction
  const isRTL = language === 'hbo'; // Hebrew is RTL
  const isLTR = !isRTL; // Greek and English are LTR

  // Get token types
  const currentType = currentToken.type;
  const nextType = nextToken.type;

  // LTR spacing rules (English, Greek, Spanish)
  if (isLTR) {
    // Special case: Hebrew maqaf (־) should never have spaces around it
    if (currentToken.text === '־' || nextToken.text === '־') {
      return false;
    }
    
    // Add space after words (except when followed by punctuation)
    if (currentType === 'word' && nextType !== 'punctuation') {
      return true;
    }
    
    // Add space after numbers (except when followed by punctuation)
    if (currentType === 'number' && nextType !== 'punctuation') {
      return true;
    }
    
    // Handle punctuation spacing more precisely
    if (currentType === 'punctuation') {
      const currentPunct = currentToken.text;
      
      // Opening punctuation: never add space after
      if (/^["''"„«‹([{¿¡]$/.test(currentPunct)) {
        return false;
      }
      
      // Colons: no space after (Spanish style: "dijo:" not "dijo: ")
      if (currentPunct === ':') {
        return false;
      }
      
      // When followed by words or numbers, add space after:
      if (nextType === 'word' || nextType === 'number') {
        // Sentence-ending punctuation
        if (/^[.!?]$/.test(currentPunct)) {
          return true;
        }
        
        // Commas and semicolons
        if (/^[,;]$/.test(currentPunct)) {
          return true;
        }
        
        // Closing punctuation (quotes, brackets, etc.)
        if (/^["''"»›)\]}]$/.test(currentPunct)) {
          return true;
        }
      }
      
      // Default: no space for other punctuation combinations
      return false;
    }
  }

  // RTL spacing rules (Hebrew)
  if (isRTL) {
    // Special case: Hebrew maqaf (־) should never have spaces around it
    if (currentToken.text === '־' || nextToken.text === '־') {
      return false;
    }
    
    // Add space after words (except when followed by punctuation)
    if (currentType === 'word' && nextType !== 'punctuation') {
      return true;
    }
    
    // Add space after numbers (except when followed by punctuation)
    if (currentType === 'number' && nextType !== 'punctuation') {
      return true;
    }
    
    // Handle punctuation spacing (same logic as LTR for now)
    if (currentType === 'punctuation') {
      const currentPunct = currentToken.text;
      
      // Opening punctuation: never add space after
      if (/^["''"„«‹([{¿¡]$/.test(currentPunct)) {
        return false;
      }
      
      // Colons: no space after
      if (currentPunct === ':') {
        return false;
      }
      
      // When followed by words or numbers, add space after:
      if (nextType === 'word' || nextType === 'number') {
        // Sentence-ending punctuation
        if (/^[.!?]$/.test(currentPunct)) {
          return true;
        }
        
        // Commas and semicolons
        if (/^[,;]$/.test(currentPunct)) {
          return true;
        }
        
        // Closing punctuation (quotes, brackets, etc.)
        if (/^["''"»›)\]}]$/.test(currentPunct)) {
          return true;
        }
      }
      
      // Default: no space for other punctuation combinations
      return false;
    }
  }

  return false;
}

/**
 * Render a single word token with highlighting and click handling
 */
const WordTokenRenderer: React.FC<{
  token: OptimizedToken;
  verse: OptimizedVerse;
  isHighlighted: boolean;
  showAlignments: boolean;
  onWordClick?: (word: string, verse: OptimizedVerse, alignment?: WordAlignment) => void;
  onTokenClick?: (token: OptimizedToken, verse: OptimizedVerse) => void;
  isOriginalLanguage: boolean;
  resourceType: 'ULT' | 'UST' | 'UGNT' | 'UHB';
  language: 'en' | 'el-x-koine' | 'hbo';
}> = ({
  token,
  verse,
  isHighlighted,
  showAlignments,
  onWordClick,
  onTokenClick,
  isOriginalLanguage,
  resourceType,
  language
}) => {
  const { 
    getAllTokenGroupsForAlignedId, 
    getColorClassForGroup,
    activeGroupId 
  } = useTokenUnderlining();
  // Don't render paragraph marker tokens - they're handled by the parent component
  if (token.type === 'paragraph-marker') {
    return null;
  }

  const handleClick = () => {
    if (onTokenClick) {
              onTokenClick(token, verse);
    } else if (onWordClick) {
      onWordClick(token.text, verse);
    }
  };

  // Determine if token is clickable
  // Hebrew maqaf (־) should never be clickable
  const isHebrewMaqaf = token.text === '־';
  const isClickable = !isHebrewMaqaf && (isOriginalLanguage || (token.align && token.align.length > 0));
  
  // Use token type from the processor
  const isPunctuation = token.type === 'punctuation';
  const isNumber = token.type === 'number';

  // Helper function to combine multiple underline classes for overlapping groups
  const combineUnderlineClasses = (groups: TokenGroup[]): string => {
    if (groups.length === 0) return '';
    
    if (groups.length === 1) {
      // Single group - use normal styling
      return getColorClassForGroup(groups[0].id);
    }
    
    // Multiple overlapping groups - use priority system for clean underlines
    // Priority: active group gets primary styling, fallback to first group
    const activeGroup = groups.find(g => g.id === activeGroupId);
    const primaryGroup = activeGroup || groups[0];
    
    // Return just the primary underline class (no overlap indicators)
    return getColorClassForGroup(primaryGroup.id);
  };

  // Check if this token should be underlined based on token groups
  let underlineClass = '';
  if (isOriginalLanguage) {
    // For original language tokens, get ALL matching groups for overlap handling
    const matchingGroups = getAllTokenGroupsForAlignedId(token.id);
    if (matchingGroups.length > 0) {
      underlineClass = combineUnderlineClasses(matchingGroups);
    }
  } else if (token.align && token.align.length > 0) {
    // For target language tokens, collect all groups from all aligned IDs
    const allMatchingGroups: TokenGroup[] = [];
    const seenGroupIds = new Set<string>();
    
    for (const alignedId of token.align) {
      const groupsForId = getAllTokenGroupsForAlignedId(alignedId);
      for (const group of groupsForId) {
        if (!seenGroupIds.has(group.id)) {
          allMatchingGroups.push(group);
          seenGroupIds.add(group.id);
        }
      }
    }
    
    if (allMatchingGroups.length > 0) {
      underlineClass = combineUnderlineClasses(allMatchingGroups);
    }
  }

  // Check if this token has an active underline (note was clicked)
  const hasActiveUnderline = underlineClass.includes('bg-') && activeGroupId;
  
  // Prioritize note underlining over word highlighting
  const shouldShowHighlight = isHighlighted && !hasActiveUnderline;

        return (
          <span
            className={`
        ${shouldShowHighlight ? 'bg-yellow-200 font-semibold shadow-sm' : ''}
        ${isClickable ? 'cursor-pointer hover:bg-blue-100 hover:shadow-sm transition-colors duration-150' : ''}
        ${isOriginalLanguage ? 'font-medium' : ''}
        ${isNumber ? 'text-gray-600' : ''}
        ${underlineClass}
        inline-block rounded-sm ${isPunctuation ? '' : 'px-0.5'}
      `}
      onClick={isClickable ? handleClick : undefined}
      title={
        isClickable 
          ? `${showAlignments && token.strong ? ` (${token.strong})` : ''}Token ID: ${token.id}${token.align ? `\nAligned to IDs: [${token.align.join(', ')}]` : ''}${token.strong ? `\nStrong's: ${token.strong}` : ''}${token.lemma ? `\nLemma: ${token.lemma}` : ''}${token.morph ? `\nMorph: ${token.morph}` : ''}` 
          : `\nToken ID: ${token.id}${token.align ? `\nAligned to IDs: [${token.align.join(', ')}]` : ''}${token.strong ? `\nStrong's: ${token.strong}` : ''}${token.lemma ? `\nLemma: ${token.lemma}` : ''}${token.morph ? `\nMorph: ${token.morph}` : ''}`
      }
    >
      {token.text}
    </span>
  );
};

/**
 * Get verses to render based on filters and range - wrapper for optimized function
 */
function getVersesToRender(
  scripture: OptimizedScripture,
  options: {
    chapter?: number;
    verseRange?: { start: number; end: number };
    startRef?: { chapter: number; verse: number };
    endRef?: { chapter: number; verse: number };
  }
): OptimizedVerse[] {
  return getVersesToRenderOptimized(scripture, options);
}

/**
 * Get chapter number for a verse
 */
function getChapterForVerse(verse: OptimizedVerse, scripture: OptimizedScripture): number {
  for (const chapter of scripture.chapters) {
    if (chapter.verses.some(v => v.number === verse.number && v.text === verse.text)) {
      return chapter.number;
    }
  }
  return 1; // Fallback
}

// Removed unused functions - paragraph information is now embedded in tokens

// Main component that provides the TokenUnderliningProvider
export const USFMRenderer: React.FC<USFMRendererProps> = (props) => {
  return (
    <TokenUnderliningProvider>
      <USFMRendererInternal {...props} />
    </TokenUnderliningProvider>
  );
};

export default USFMRenderer;