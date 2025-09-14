/**
 * Translation Words Links Viewer Component
 * 
 * Displays Translation Words Links (TWL) content in the bt-studio application.
 * Shows cross-reference links between Bible words and Translation Words definitions.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useCurrentState, useResourceAPI, useMessaging } from 'linked-panels';
import { ProcessedWordsLinks, TranslationWordsLink } from '../../services/adapters/Door43TranslationWordsLinksAdapter';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { ResourceMetadata, ResourceType } from '../../types/context';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import {
  ScriptureTokensBroadcast,
  NoteSelectionBroadcast,
  TokenClickBroadcast,
  NoteTokenGroup,
} from '../../types/scripture-messages';
import type { OptimizedToken, OptimizedScripture } from '../../services/usfm-processor';
import { QuoteMatcher, QuoteMatchResult } from '../../services/quote-matcher';
import { 
  NotesTokenGroupsBroadcast, 
  createNotesTokenGroupsBroadcast 
} from '../../plugins/notes-scripture-plugin';
import { COLOR_CLASSES } from '../../contexts/TokenUnderliningContext';

export interface TranslationWordsLinksViewerProps {
  resourceId: string;
  loading?: boolean;
  error?: string;
  links?: ProcessedWordsLinks;
  currentChapter?: number;
  onLinkPress?: (link: TranslationWordsLink) => void;
  onWordHighlight?: (origWords: string, occurrence: number) => void;
  onTranslationWordPress?: (twLink: string) => void;
  onLinksFiltered?: (loadTranslationWordsContent: () => Promise<Array<{
    link: TranslationWordsLink;
    articleId: string;
    title: string;
    content: unknown;
  }>>) => void;
  compact?: boolean;
  className?: string;
}

export const TranslationWordsLinksViewer: React.FC<TranslationWordsLinksViewerProps> = ({
  resourceId,
  loading = false,
  error,
  links: propLinks,
  currentChapter = 1,
  onLinkPress,
  onWordHighlight,
  onTranslationWordPress,
  onLinksFiltered,
  compact = false,
  className = ''
}) => {
  const { resourceManager, processedResourceConfig } = useWorkspace();
  const { currentReference } = useNavigation();
  
  // Get linked-panels API for broadcasting TWL token groups
  const linkedPanelsAPI = useResourceAPI<NotesTokenGroupsBroadcast>(resourceId);
  
  // Track the last broadcast state to prevent infinite loops
  const lastBroadcastRef = useRef<string>('');
  
  const [actualLinks, setActualLinks] = useState<ProcessedWordsLinks | null>(propLinks || null);
  const [scriptureTokens, setScriptureTokens] = useState<OptimizedToken[]>([]);
  const [tokenBroadcastInfo, setTokenBroadcastInfo] = useState<{
    sourceResourceId: string;
    reference: {
      book: string;
      chapter: number;
      verse: number;
      endChapter?: number;
      endVerse?: number;
    };
    timestamp: number;
  } | null>(null);
  
  // Original language content for quote matching
  const [originalScripture, setOriginalScripture] = useState<OptimizedScripture | null>(null);
  const [quoteMatches, setQuoteMatches] = useState<Map<string, QuoteMatchResult>>(new Map());
  const [quoteMatcher] = useState(() => new QuoteMatcher());
  
  // Target language quotes built from received tokens
  const [targetLanguageQuotes, setTargetLanguageQuotes] = useState<Map<string, {
    quote: string;
    tokens: OptimizedToken[];
    sourceLanguage: string;
  }>>(new Map());
  const [contentLoading, setContentLoading] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(error || null);
  const [resourceMetadata, setResourceMetadata] = useState<ResourceMetadata | null>(null);
  const [twTitles, setTwTitles] = useState<Map<string, string>>(new Map());
  const [selectedLink, setSelectedLink] = useState<TranslationWordsLink | null>(null);
  const [showLinkDetail, setShowLinkDetail] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<{
    title: string;
    content: string;
    twLink: string;
  } | null>(null);
  const [showArticleView, setShowArticleView] = useState(false);

  // Token filter state (for filtering links by clicked tokens)
  const [tokenFilter, setTokenFilter] = useState<{
    originalLanguageToken: {
      semanticId: string;
      content: string;
      alignedSemanticIds?: string[];
      verseRef: string;
    };
    sourceResourceId: string;
    timestamp: number;
  } | null>(null);

  // Function to handle link selection and broadcast the event (similar to NotesViewer)
  const handleLinkClick = useCallback((link: TranslationWordsLink) => {
    const linkKey = link.id || `${link.reference}-${link.origWords?.trim()}`;
    const tokenGroupId = `notes-${linkKey}`; // Use same format as USFMRenderer creates token groups
    
    console.log('📝 TWL Link clicked, broadcasting selection:', {
      linkId: linkKey,
      tokenGroupId,
      origWords: link.origWords,
      reference: link.reference,
      expectedFormat: `notes-${linkKey}`
    });

    // Broadcast link selection event
    const linkSelectionBroadcast: NoteSelectionBroadcast = {
      type: 'note-selection-broadcast',
      lifecycle: 'event',
      selectedNote: {
        noteId: linkKey,
        tokenGroupId: tokenGroupId,
        quote: link.origWords || '',
        reference: link.reference
      },
      sourceResourceId: resourceId,
      timestamp: Date.now()
    };

    // Use the general messaging API
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (linkedPanelsAPI.messaging as any).sendToAll(linkSelectionBroadcast);
      console.log('✅ TWL Link selection broadcast sent successfully:', linkSelectionBroadcast);
    } catch (error) {
      console.error('❌ Failed to send TWL link selection broadcast:', error);
    }
  }, [resourceId, linkedPanelsAPI]);

  // Function to check if a link should have color indicator and be clickable
  const shouldLinkHaveColorIndicator = useCallback((link: TranslationWordsLink): boolean => {
    return !!(link.origWords && link.origWords.trim() && link.occurrence);
  }, []);


  // Testament-specific original language configuration (same as NotesViewer)
  const ORIGINAL_LANGUAGE_CONFIG = useMemo(() => ({
    OT: {
      owner: 'unfoldingWord',
      language: 'hbo',
      resourceId: 'uhb',
      title: 'Hebrew Bible'
    },
    NT: {
      owner: 'unfoldingWord', 
      language: 'el-x-koine',
      resourceId: 'ugnt',
      title: 'Greek New Testament'
    }
  } as const), []);

  // Helper function to determine testament from book code
  const getTestamentFromBook = (bookCode: string): 'OT' | 'NT' | null => {
    if (!bookCode) return null;
    
    const ntBooks = ['mat', 'mrk', 'luk', 'jhn', 'act', 'rom', '1co', '2co', 'gal', 'eph', 'php', 'col', '1th', '2th', '1ti', '2ti', 'tit', 'phm', 'heb', 'jas', '1pe', '2pe', '1jn', '2jn', '3jn', 'jud', 'rev'];
    
    return ntBooks.includes(bookCode.toLowerCase()) ? 'NT' : 'OT';
  };

  // Fetch content when navigation changes
  useEffect(() => {
    if (!resourceManager || !currentReference.book || propLinks || !processedResourceConfig) return;

    const fetchContent = async () => {
      try {
        setContentLoading(true);
        setDisplayError(null);
        setActualLinks(null); // Clear previous content
        
        console.log(`🔍 TranslationWordsLinksViewer - Fetching content for ${resourceId}, book: ${currentReference.book}`);
        
        // Find the resource config to get the correct adapter resource ID
        const resourceConfig = processedResourceConfig.find((config: { panelResourceId: string }) => config.panelResourceId === resourceId);
        if (!resourceConfig) {
          throw new Error(`Resource config not found for ${resourceId}`);
        }
        
        console.log(`📋 Found resource config:`, resourceConfig.metadata);
        
        // Construct the full content key in the same format as ScriptureViewer
        const contentKey = `${resourceConfig.metadata.server}/${resourceConfig.metadata.owner}/${resourceConfig.metadata.language}/${resourceConfig.metadata.id}/${currentReference.book}`;
        
        console.log(`🔑 Content key: ${contentKey}`);
        
        const content = await resourceManager.getOrFetchContent(
          contentKey, // Full key format: server/owner/language/resourceId/book
          resourceConfig.metadata.type as ResourceType // Resource type from metadata
        );
        
        if (content) {
          const processedLinks = content as unknown as ProcessedWordsLinks;
          if (processedLinks && processedLinks.links && Array.isArray(processedLinks.links)) {
            console.log(`✅ Loaded ${processedLinks.links.length} word links for ${currentReference.book}`);
            setActualLinks(processedLinks);
          } else {
            console.warn(`Invalid links content structure for ${currentReference.book}:`, processedLinks);
            setDisplayError(`Invalid word links content structure for ${currentReference.book}`);
          }
        } else {
          setDisplayError(`No word links found for ${currentReference.book}`);
        }
        
        // Use existing metadata from resource config for language direction
        setResourceMetadata(resourceConfig.metadata);
      } catch (err) {
        console.error(`❌ Failed to load word links:`, err);
        setDisplayError(err instanceof Error ? err.message : 'Failed to load word links');
      } finally {
        setContentLoading(false);
      }
    };

    fetchContent();
  }, [resourceManager, resourceId, currentReference.book, propLinks, processedResourceConfig]);

  // Load original language content for quote matching
  useEffect(() => {
    if (!resourceManager || !currentReference.book) {
      console.log('⏳ TWL - Missing dependencies for original language loading');
      return;
    }

    const loadOriginalLanguageContent = async () => {
      try {
        console.log('🔄 TWL - Loading original language content for quote matching');
        
        // Determine testament from current book
        const testament = getTestamentFromBook(currentReference.book);
        if (!testament) {
          console.warn(`⚠️ TWL - Cannot determine testament for book: ${currentReference.book}`);
          return;
        }

        // Get configuration for the testament
        const config = ORIGINAL_LANGUAGE_CONFIG[testament];
        
        console.log(`🔄 TWL - Loading ${testament} content for quote matching:`, config);
        
        // Construct content key for the original language resource
        const contentKey = `git.door43.org/${config.owner}/${config.language}/${config.resourceId}/${currentReference.book}`;
        console.log(`📋 TWL - Original language content key: ${contentKey}`);
        
        // Try to get content using the resource manager
        const content = await resourceManager.getOrFetchContent(
          contentKey,
          'scripture' as ResourceType
        );
        
        console.log(`✅ TWL - Original language content loaded for ${testament}:`, content);
        setOriginalScripture(content as OptimizedScripture);
        
      } catch (err) {
        console.error(`❌ TWL - Failed to load original language content:`, err);
        setOriginalScripture(null);
      }
    };

    loadOriginalLanguageContent();
  }, [resourceManager, currentReference.book, ORIGINAL_LANGUAGE_CONFIG]);

  // Listen for scripture token broadcasts using useCurrentState hook
  const scriptureTokensBroadcast = useCurrentState<ScriptureTokensBroadcast>(
    resourceId, 
    'current-scripture-tokens'
  );
  
  // Listen for token clicks via linked-panels events (transient messages)
  useMessaging({ 
    resourceId,
    eventTypes: ['token-click-broadcast'],
    onEvent: (event) => {
      if (event.type === 'token-click-broadcast') {
        const tokenClickEvent = event as TokenClickBroadcast;
        console.log('📨 TWL Viewer received token click event:', tokenClickEvent);
        
        // Set token filter based on clicked token
        setTokenFilter({
          originalLanguageToken: {
            semanticId: tokenClickEvent.clickedToken.semanticId,
            content: tokenClickEvent.clickedToken.content,
            alignedSemanticIds: tokenClickEvent.clickedToken.alignedSemanticIds,
            verseRef: tokenClickEvent.clickedToken.verseRef
          },
          sourceResourceId: tokenClickEvent.sourceResourceId,
          timestamp: tokenClickEvent.timestamp
        });
      }
    }
  });

  // Clear token filter when navigation changes (since messages are immediate/transient)
  useEffect(() => {
    setTokenFilter(null);
  }, [currentReference.book, currentReference.chapter, currentReference.verse]);

  // Update local state when broadcast changes
  useEffect(() => {
    if (scriptureTokensBroadcast) {
      // Check if this is a clear message (empty tokens and empty book)
      const isClearMessage = scriptureTokensBroadcast.tokens.length === 0 && 
                            !scriptureTokensBroadcast.reference.book;
      
      if (isClearMessage) {
        console.log(`🧹 TWL received clear signal from ${scriptureTokensBroadcast.sourceResourceId}`);
        setScriptureTokens([]);
        setTokenBroadcastInfo(null);
      } else {
        console.log(`🎯 TWL received scripture tokens from ${scriptureTokensBroadcast.sourceResourceId}:`, {
          tokenCount: scriptureTokensBroadcast.tokens.length,
          reference: scriptureTokensBroadcast.reference,
          timestamp: new Date(scriptureTokensBroadcast.timestamp).toLocaleTimeString()
        });

        setScriptureTokens(scriptureTokensBroadcast.tokens);
        setTokenBroadcastInfo({
          sourceResourceId: scriptureTokensBroadcast.sourceResourceId,
          reference: scriptureTokensBroadcast.reference,
          timestamp: scriptureTokensBroadcast.timestamp
        });
      }
    } else {
      console.log('📭 TWL: No scripture token broadcast found');
      setScriptureTokens([]);
      setTokenBroadcastInfo(null);
    }
  }, [scriptureTokensBroadcast]);

  const displayLinks = actualLinks || propLinks;
  const isLoading = loading || contentLoading;

  // Process quote matches when we have both links and original scripture
  useEffect(() => {
    if (!originalScripture || !displayLinks?.links || !currentReference.book) {
      console.log('⏳ TWL - Missing dependencies for quote matching');
      setQuoteMatches(new Map());
      return;
    }

    const processQuoteMatches = async () => {
      try {
        console.log('🔄 TWL - Processing quote matches for links');
        const newQuoteMatches = new Map<string, QuoteMatchResult>();

        // Process each link that has origWords
        for (const link of displayLinks.links) {
          if (!link.origWords || !link.reference) {
            continue;
          }

          try {
            // Parse the link reference to get chapter and verse info (e.g., "1:1" -> chapter: 1, verse: 1)
            const refParts = link.reference.split(':');
            const linkChapter = parseInt(refParts[0] || '1');
            const linkVerse = parseInt(refParts[1] || '1');
            
            // Validate parsed values
            if (isNaN(linkChapter) || isNaN(linkVerse) || linkChapter < 1 || linkVerse < 1) {
              console.warn(`⚠️ TWL - Invalid reference format for link ${link.id}: ${link.reference}`);
              continue;
            }
            
            // Create quote reference for the matcher
            const quoteReference = {
              book: currentReference.book,
              startChapter: linkChapter,
              startVerse: linkVerse,
              endChapter: linkChapter,
              endVerse: linkVerse
            };

            // Validate quote text (trim whitespace and check for meaningful content)
            const cleanQuote = link.origWords.trim();
            if (cleanQuote.length < 2) {
              console.warn(`⚠️ TWL - Quote too short for link ${link.id}: "${cleanQuote}"`);
              continue;
            }

            // Parse occurrence with validation
            const occurrence = Math.max(1, parseInt(link.occurrence || '1'));
            if (isNaN(occurrence)) {
              console.warn(`⚠️ TWL - Invalid occurrence for link ${link.id}: ${link.occurrence}`);
              continue;
            }

            // Use quote matcher to find original tokens
            const matchResult = quoteMatcher.findOriginalTokens(
              originalScripture.chapters,
              cleanQuote,
              occurrence,
              quoteReference
            );

            const linkKey = link.id || `${link.reference}-${cleanQuote}`;
            
            if (matchResult.success) {
              console.log(`✅ TWL - Found quote match for link ${link.id}:`, {
                quote: cleanQuote,
                occurrence,
                tokensFound: matchResult.totalTokens.length,
                matches: matchResult.matches.length
              });
              newQuoteMatches.set(linkKey, matchResult);
            } else {
              console.warn(`⚠️ TWL - No quote match found for link ${link.id}:`, {
                quote: cleanQuote,
                occurrence,
                reference: link.reference,
                error: matchResult.error
              });
              // Store failed match result for UI feedback
              newQuoteMatches.set(linkKey, matchResult);
            }
          } catch (linkError) {
            console.error(`❌ TWL - Error processing link ${link.id}:`, linkError);
            // Continue processing other links
            continue;
          }
        }

        setQuoteMatches(newQuoteMatches);
        console.log(`✅ TWL - Processed ${newQuoteMatches.size} quote matches`);

      } catch (err) {
        console.error('❌ TWL - Failed to process quote matches:', err);
        setQuoteMatches(new Map());
      }
    };

    processQuoteMatches();
  }, [originalScripture, displayLinks?.links, currentReference.book, quoteMatcher]);

  // Helper function to get tokens between two IDs from the received tokens
  const getMissingTokensBetween = useCallback((startId: number, endId: number, allTokens: OptimizedToken[]): OptimizedToken[] => {
    return allTokens.filter(token => token.id > startId && token.id < endId);
  }, []);

  // Helper function to check if all tokens are punctuation
  const areAllPunctuation = useCallback((tokens: OptimizedToken[]): boolean => {
    return tokens.every(token => 
      token.type === 'punctuation' || 
      /^[.,;:!?'"()[\]{}\-–—…]+$/.test(token.text.trim())
    );
  }, []);

  // Helper function to build quote with ellipsis for non-contiguous tokens
  const buildQuoteWithEllipsis = useCallback((alignedTokens: OptimizedToken[]): string => {
    if (alignedTokens.length === 0) return '';
    
    // Sort tokens by ID to maintain natural order
    const sortedTokens = alignedTokens.sort((a, b) => a.id - b.id);
    
    if (sortedTokens.length === 1) {
      return sortedTokens[0].text.trim();
    }
    
    const result: string[] = [];
    
    for (let i = 0; i < sortedTokens.length; i++) {
      const currentToken = sortedTokens[i];
      const nextToken = sortedTokens[i + 1];
      
      // Add current token text
      result.push(currentToken.text.trim());
      
      // Check if there's a gap between current and next token
      if (nextToken) {
        const gap = nextToken.id - currentToken.id;
        
        // If gap is more than 1, there are missing tokens in between
        if (gap > 1) {
          // Check if the missing tokens are only punctuation
          const missingTokens = getMissingTokensBetween(currentToken.id, nextToken.id, scriptureTokens);
          
          if (missingTokens.length > 0 && areAllPunctuation(missingTokens)) {
            // Include the punctuation tokens
            missingTokens.forEach((token: OptimizedToken) => {
              result.push(token.text.trim());
            });
          } else {
            // Use ellipsis for non-punctuation gaps
            result.push('...');
          }
        }
      }
    }
    
    return result.join(' ').trim();
  }, [scriptureTokens, getMissingTokensBetween, areAllPunctuation]);

  // Helper function to find received tokens aligned to original language tokens
  const findAlignedTokens = (originalTokens: OptimizedToken[], receivedTokens: OptimizedToken[]): OptimizedToken[] => {
    const alignedTokens: OptimizedToken[] = [];

    for (const originalToken of originalTokens) {
      // Look for received tokens that have alignment to this original token
      const matchingTokens = receivedTokens.filter(receivedToken => {
        // Check if the received token has alignment data pointing to the original token
        if (receivedToken.align && originalToken.id) {
          // The align field contains references to original language token IDs
          return receivedToken.align.includes(originalToken.id);
        }
        return false;
      });

      alignedTokens.push(...matchingTokens);
    }

    // Remove duplicates based on token ID
    const uniqueTokens = alignedTokens.filter((token, index, array) => 
      array.findIndex(t => t.id === token.id) === index
    );

    return uniqueTokens;
  };

  // Process target language quotes when we have both quote matches and received tokens
  useEffect(() => {
    if (!scriptureTokens.length || !quoteMatches.size || !tokenBroadcastInfo) {
      console.log('⏳ TWL - Missing dependencies for target quote building');
      setTargetLanguageQuotes(new Map());
      return;
    }

    const buildTargetLanguageQuotes = () => {
      try {
        console.log('🔄 TWL - Building target language quotes from received tokens');
        const newTargetQuotes = new Map<string, {
          quote: string;
          tokens: OptimizedToken[];
          sourceLanguage: string;
        }>();

        // Process each quote match
        for (const [linkKey, quoteMatch] of quoteMatches.entries()) {
          if (!quoteMatch.success || !quoteMatch.totalTokens.length) {
            continue;
          }

          try {
            // Find received tokens that are aligned to the original language tokens
            const alignedTokens = findAlignedTokens(quoteMatch.totalTokens, scriptureTokens);
            
            if (alignedTokens.length > 0) {
              // Build the target language quote from aligned tokens with ellipsis for gaps
              const targetQuote = buildQuoteWithEllipsis(alignedTokens);

              if (targetQuote) {
                newTargetQuotes.set(linkKey, {
                  quote: targetQuote,
                  tokens: alignedTokens,
                  sourceLanguage: tokenBroadcastInfo.reference.book // Use book as language identifier for now
                });

                console.log(`✅ TWL - Built target quote for ${linkKey}:`, {
                  originalTokens: quoteMatch.totalTokens.length,
                  alignedTokens: alignedTokens.length,
                  targetQuote: targetQuote.substring(0, 50) + (targetQuote.length > 50 ? '...' : '')
                });
              }
            }
          } catch (err) {
            console.error(`❌ TWL - Error building target quote for ${linkKey}:`, err);
          }
        }

        setTargetLanguageQuotes(newTargetQuotes);
        console.log(`✅ TWL - Built ${newTargetQuotes.size} target language quotes`);

      } catch (err) {
        console.error('❌ TWL - Failed to build target language quotes:', err);
        setTargetLanguageQuotes(new Map());
      }
    };

    buildTargetLanguageQuotes();
  }, [scriptureTokens, quoteMatches, tokenBroadcastInfo, buildQuoteWithEllipsis]);

  // Send TWL token groups when quote matches are updated (with debouncing)
  useEffect(() => {
    // Guard against invalid states that could cause infinite loops
    if (!currentReference.book || !resourceMetadata?.id || isLoading || !processedResourceConfig || !linkedPanelsAPI?.messaging) {
      return; // Early return if invalid state
    }

    // Additional guard: Don't broadcast if we're in a cleanup phase (no links or no original scripture)
    if (!displayLinks?.links?.length || !originalScripture) {
      console.log('🛡️ TWL: Skipping broadcast during cleanup phase (no links or original scripture)');
      return;
    }
    
    // Create a stable hash of the current state to prevent duplicate broadcasts
    const contentHash = `${quoteMatches.size}-${resourceMetadata.id}`;
    const navigationHash = `${currentReference.book}-${currentReference.chapter}-${currentReference.verse}`;
    const stateHash = `${navigationHash}-${contentHash}`;
    
    // Always broadcast when navigation changes, or when content changes
    const navigationChanged = lastBroadcastRef.current && !lastBroadcastRef.current.startsWith(navigationHash);
    const shouldBroadcast = lastBroadcastRef.current !== stateHash || navigationChanged;
    
    if (shouldBroadcast) {
      // Add a small delay to avoid broadcasting during rapid state changes
      const timeoutId = setTimeout(() => {
        try {
          const tokenGroups: NoteTokenGroup[] = [];
          
          // Create a stable snapshot of quoteMatches to avoid reference issues
          const quoteMatchesSnapshot = Array.from(quoteMatches.entries());
          
          // Get the list of links with color indicators (before token filter) for consistent color indexing
          const linksWithColorIndicators = filteredLinksByNavigation.filter(shouldLinkHaveColorIndicator);
          
          for (const [linkKey, quoteMatch] of quoteMatchesSnapshot) {
            // Find link using the same key construction logic as quote matching
            const link = displayLinks?.links?.find(l => {
              const key = l.id || `${l.reference}-${l.origWords?.trim()}`;
              return key === linkKey;
            });
            if (link && quoteMatch.totalTokens.length > 0) {
              // Calculate color index based on position in the original navigation-filtered list
              const colorIndicatorIndex = linksWithColorIndicators.findIndex(l => 
                (l.id || `${l.reference}-${l.origWords?.trim()}`) === (link.id || `${link.reference}-${link.origWords?.trim()}`)
              );
              const colorIndex = colorIndicatorIndex >= 0 ? colorIndicatorIndex % COLOR_CLASSES.length : 0;
              
              tokenGroups.push({
                noteId: link.id || linkKey,
                noteReference: link.reference,
                quote: link.origWords || '',
                occurrence: parseInt(link.occurrence) || 1,
                tokens: quoteMatch.totalTokens,
                colorIndex: colorIndex
              });
            }
          }

          // Always send a broadcast (either with tokens or empty for cleanup)
          const broadcastContent = createNotesTokenGroupsBroadcast(
            resourceId,
            {
              book: currentReference.book,
              chapter: currentReference.chapter || 1,
              verse: currentReference.verse || 1,
              endChapter: currentReference.endChapter,
              endVerse: currentReference.endVerse
            },
            tokenGroups,
            resourceMetadata
          );

          // Send state message - linked-panels will handle deduplication automatically
          linkedPanelsAPI.messaging.sendToAll(broadcastContent);
          
          if (tokenGroups.length > 0) {
            console.log(`📤 TWL (${resourceId}) - Broadcasted ${tokenGroups.length} link token groups for ${currentReference.book} ${currentReference.chapter}:${currentReference.verse}:`, 
              tokenGroups.map(g => `${g.noteId}(${g.tokens.length} tokens)`).join(', '));
          } else {
            console.log(`📤 TWL (${resourceId}) - Sent empty token groups for ${currentReference.book} ${currentReference.chapter}:${currentReference.verse}`);
          }
        } catch (error) {
          console.error('❌ Error broadcasting TWL token groups:', error);
        }
        
        lastBroadcastRef.current = stateHash;
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
    
    // Return empty cleanup function if no broadcast was scheduled
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentReference, resourceMetadata, quoteMatches.size, isLoading, processedResourceConfig, linkedPanelsAPI, resourceId, displayLinks?.links?.length]);

  // Cleanup: Silent cleanup without broadcasts to prevent infinite loops
  // Unmount cleanup pattern from team-review: Send superseding clear state message
  useEffect(() => {
    // Cleanup function to clear all TWL token groups when component unmounts
    return () => {
      // Send superseding empty state message (following team-review pattern)
      // This works even if component state is stale because we create a minimal clear message
      if (linkedPanelsAPI?.messaging) {
        try {
          const clearBroadcast: NotesTokenGroupsBroadcast = {
            type: 'notes-token-groups-broadcast',
            lifecycle: 'state',
            stateKey: 'current-notes-token-groups',
            sourceResourceId: resourceId,
            reference: { book: '', chapter: 1, verse: 1 }, // Minimal reference for clear message
            tokenGroups: [], // Empty array clears all token groups
            resourceMetadata: { id: 'cleared', language: '', type: 'twl' }, // Special marker
            timestamp: Date.now()
          };

          linkedPanelsAPI.messaging.sendToAll(clearBroadcast);
          console.log(`🧹 TWL (${resourceId}) - Unmount cleanup: Sent superseding clear state`);
        } catch (error) {
          console.error('❌ Error during TWL unmount cleanup:', error);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array is INTENTIONAL - ensures cleanup only on unmount (team-review pattern)

  // Filter links by current navigation range (matching NotesViewer and QuestionsViewer logic)
  const filteredLinksByNavigation = useMemo(() => {
    if (!displayLinks?.links || !currentReference) {
      return displayLinks?.links || [];
    }
    
    return displayLinks.links.filter(link => {
      // Parse chapter and verse from reference (e.g., "1:1" -> chapter: 1, verse: 1)
      const refParts = link.reference.split(':');
      const linkChapter = parseInt(refParts[0] || '1');
      const linkVerse = parseInt(refParts[1] || '1');
      
      // Determine the range bounds (default to single verse/chapter if no end specified)
      const startChapter = currentReference.chapter;
      const startVerse = currentReference.verse;
      const endChapter = currentReference.endChapter || currentReference.chapter;
      const endVerse = currentReference.endVerse || currentReference.verse;
      
      // Skip filtering if we don't have valid chapter/verse data
      if (!startChapter || !startVerse) {
        return true;
      }
      
      // Check if link is within the chapter range
      if (linkChapter < startChapter) {
        return false;
      }
      if (endChapter && linkChapter > endChapter) {
        return false;
      }
      
      // Filter by start verse in start chapter
      if (linkChapter === startChapter && linkVerse < startVerse) {
        return false;
      }
      
      // Filter by end verse in end chapter
      if (endChapter && endVerse && linkChapter === endChapter && linkVerse > endVerse) {
        return false;
      }
      
      return true;
    });
  }, [displayLinks?.links, currentReference]);

  // Apply token filter on top of navigation-filtered links
  const filteredLinks = useMemo(() => {
    if (!tokenFilter || !quoteMatches.size) {
      return filteredLinksByNavigation;
    }

    console.log('🔍 Applying token filter to TWL links:', {
      tokenFilter: tokenFilter.originalLanguageToken,
      totalLinks: filteredLinksByNavigation.length,
      quoteMatchesCount: quoteMatches.size
    });

    // Filter links that have quote matches containing the clicked token
    return filteredLinksByNavigation.filter(link => {
      const linkKey = link.id || `${link.reference}-${link.origWords?.trim()}`;
      const quoteMatch = quoteMatches.get(linkKey);
      
      if (!quoteMatch || !quoteMatch.totalTokens.length) {
        return false;
      }

      // Check if any of the link's matched tokens have the same ID as the clicked token
      const hasMatchingToken = quoteMatch.totalTokens.some(token => 
        token.id.toString() === tokenFilter.originalLanguageToken.semanticId ||
        (tokenFilter.originalLanguageToken.alignedSemanticIds && 
         tokenFilter.originalLanguageToken.alignedSemanticIds.includes(token.id.toString()))
      );

      if (hasMatchingToken) {
        console.log('✅ TWL Link matches token filter:', {
          linkId: linkKey,
          origWords: link.origWords,
          matchedTokenIds: quoteMatch.totalTokens.map(t => t.id),
          filterTokenId: tokenFilter.originalLanguageToken.semanticId
        });
      }

      return hasMatchingToken;
    });
  }, [filteredLinksByNavigation, tokenFilter, quoteMatches]);

  // Function to get the color for a link using the same cycling logic as token groups
  // Always use the original navigation-filtered links (before token filter) to maintain consistent colors
  const getLinkColor = useCallback((link: TranslationWordsLink): string => {
    // Use filteredLinksByNavigation (first filter only) to maintain consistent color indices
    // This ensures colors don't change when the second filter (token filter) is applied
    const originalLinksWithColorIndicators = filteredLinksByNavigation.filter(shouldLinkHaveColorIndicator);
    const colorIndicatorIndex = originalLinksWithColorIndicators.findIndex(l => 
      (l.id || `${l.reference}-${l.origWords?.trim()}`) === (link.id || `${link.reference}-${link.origWords?.trim()}`)
    );
    
    // Use the same cycling logic as the token underlining context
    const colorIndex = colorIndicatorIndex % COLOR_CLASSES.length;
    return COLOR_CLASSES[colorIndex].bgColor;
  }, [filteredLinksByNavigation, shouldLinkHaveColorIndicator]);

  // Debug logging
  console.log(`🔍 TranslationWordsLinksViewer - Filtering:`, {
    totalLinks: displayLinks?.links?.length || 0,
    filteredLinks: filteredLinks.length,
    currentReference: currentReference ? `${currentReference.chapter}:${currentReference.verse}${currentReference.endChapter && currentReference.endChapter !== currentReference.chapter ? `-${currentReference.endChapter}:${currentReference.endVerse}` : currentReference.endVerse && currentReference.endVerse !== currentReference.verse ? `-${currentReference.endVerse}` : ''}` : 'none',
    sampleLinks: displayLinks?.links?.slice(0, 3)?.map(link => link.reference)
  });

  // Automatically load Translation Words content when filtered links change
  useEffect(() => {
    if (filteredLinks.length > 0 && resourceManager && processedResourceConfig) {
      const loadTranslationWordsContent = async () => {
        console.log(`📋 Auto-loading Translation Words content for ${filteredLinks.length} filtered links...`);
        
        // Find the Translation Words resource config
        const twResourceConfig = processedResourceConfig?.find((config: { metadata: { type: string; id: string } }) => 
          config.metadata.type === 'words' || config.metadata.id === 'tw'
        );
        
        if (!twResourceConfig) {
          console.warn('❌ Translation Words resource config not found');
          return;
        }
        
        const loadedEntries: Array<{
          link: TranslationWordsLink;
          articleId: string;
          title: string;
          content: unknown;
        }> = [];
        const titlesMap = new Map();
        
        for (const link of filteredLinks) {
          try {
            // Parse the twLink to extract category and term (e.g., "rc://*/tw/dict/bible/kt/god" -> category: "kt", term: "god")
            const twInfo = parseTWLink(link.twLink);
            
            if (!twInfo.term || twInfo.category === 'unknown') {
              console.warn(`⚠️ Could not parse twLink: ${link.twLink}`);
              continue;
            }
            
            // Construct the article ID in the format expected by Door43TranslationWordsAdapter: bible/category/term-id
            const articleId = `bible/${twInfo.category}/${twInfo.term}`;
            
            // Skip if we already have this title loaded (use term as the key for the titles map)
            if (twTitles.has(twInfo.term)) {
              continue;
            }
            
            // Construct the content key for the Translation Words entry
            const contentKey = `${twResourceConfig.metadata.server}/${twResourceConfig.metadata.owner}/${twResourceConfig.metadata.language}/${twResourceConfig.metadata.id}/${articleId}`;
            
            console.log(`🔍 Loading TW content for: ${articleId} (key: ${contentKey})`);
            
            // Load the Translation Words content
            const twContent = await resourceManager.getOrFetchContent(
              contentKey,
              twResourceConfig.metadata.type as ResourceType
            );
            
            if (twContent && (twContent as { word?: { term?: string } }).word?.term) {
              const title = (twContent as { word: { term: string } }).word.term;
              loadedEntries.push({
                link,
                articleId,
                title,
                content: twContent
              });
              titlesMap.set(twInfo.term, title); // Use term as key for easy lookup in UI
              console.log(`✅ Loaded TW entry: ${articleId} - "${title}"`);
            } else {
              console.warn(`⚠️ No content or title found for TW entry: ${articleId}`, twContent);
            }
          } catch (error) {
            console.error(`❌ Failed to load TW content for link ${link.twLink}:`, error);
          }
        }
        
        console.log(`📋 Successfully loaded ${loadedEntries.length} Translation Words entries:`, loadedEntries);
        
        // Update the titles state with new titles
        if (titlesMap.size > 0) {
          setTwTitles(prev => new Map([...prev, ...titlesMap]));
        }
        
        // Call the callback if provided
        if (onLinksFiltered) {
          onLinksFiltered(() => Promise.resolve(loadedEntries));
        }
      };
      
      loadTranslationWordsContent();
    }
  }, [filteredLinks, resourceManager, processedResourceConfig, twTitles, onLinksFiltered]);

  const handleLinkPress = (link: TranslationWordsLink) => {
    if (onLinkPress) {
      onLinkPress(link);
    }
    
    if (!compact) {
      setSelectedLink(link);
      setShowLinkDetail(true);
    }
  };

  const handleWordPress = (link: TranslationWordsLink) => {
    if (onWordHighlight) {
      onWordHighlight(link.origWords, parseInt(link.occurrence) || 1);
    }
  };

  const handleTranslationWordPress = async (twLink: string) => {
    try {
      // Parse the TW link to get the term info
      const twInfo = parseTWLink(twLink);
      
      // Find the TW resource config
      const twResourceConfig = processedResourceConfig?.find((config: { metadata?: { type?: string } }) => 
        config.metadata?.type === ResourceType.WORDS
      );
      
      if (!twResourceConfig || !resourceManager) {
        console.warn('Translation Words resource not found');
        return;
      }
      
      // Construct the content key for the TW article
      const articleId = `bible/${twInfo.category}/${twInfo.term}`;
      const contentKey = `${twResourceConfig.metadata.server}/${twResourceConfig.metadata.owner}/${twResourceConfig.metadata.language}/${twResourceConfig.metadata.id}/${articleId}`;
      
      console.log(`🔍 Loading TW article: ${articleId} (key: ${contentKey})`);
      
      // Fetch the TW content
      const twContent = await resourceManager.getOrFetchContent(
        contentKey,
        twResourceConfig.metadata.type as ResourceType
      );
      
      if (twContent && (twContent as { word?: { term?: string; definition?: string } }).word) {
        const wordData = (twContent as { word: { term: string; definition: string } }).word;
        
        setSelectedArticle({
          title: wordData.term,
          content: wordData.definition,
          twLink: twLink
        });
        setShowArticleView(true);
        
        console.log(`✅ Loaded TW article: ${wordData.term}`);
      } else {
        console.warn(`⚠️ No content found for TW article: ${articleId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to load TW article for ${twLink}:`, error);
    }
    
    // Also call the original callback if provided
    if (onTranslationWordPress) {
      onTranslationWordPress(twLink);
    }
  };

  const parseTWLink = (twLink: string) => {
    // Parse rc://*/tw/dict/bible/kt/god format
    const match = twLink.match(/rc:\/\/\*\/tw\/dict\/bible\/([^/]+)\/(.+)$/);
    if (match) {
      return {
        category: match[1], // kt, names, other
        term: match[2]      // god, abraham, bread
      };
    }
    return { category: 'unknown', term: twLink };
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'kt': return 'text-blue-600 bg-blue-50 border-blue-200'; // Blue for key terms
      case 'names': return 'text-green-600 bg-green-50 border-green-200'; // Green for names
      case 'other': return 'text-purple-600 bg-purple-50 border-purple-200'; // Purple for other terms
      default: return 'text-gray-600 bg-gray-50 border-gray-200'; // Gray for unknown
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'kt': return 'Key Term';
      case 'names': return 'Name';
      case 'other': return 'Other';
      default: return 'Term';
    }
  };

  const renderOriginalWords = (origWords: string) => {
    // Check if it contains Hebrew or Greek characters
    const hasHebrew = /[\u0590-\u05FF]/.test(origWords);
    const hasGreek = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(origWords);
    
    return (
      <span className={`font-medium ${hasHebrew ? 'text-right' : ''} ${hasGreek ? 'font-greek' : ''}`}>
        {origWords}
      </span>
    );
  };

  const renderLink = (link: TranslationWordsLink, index: number) => {
    const twInfo = parseTWLink(link.twLink);

    return (
      <div
        key={link.id}
        className={`bg-gray-50 rounded-md p-2 mb-2 border border-gray-200 transition-colors ${
          shouldLinkHaveColorIndicator(link)
            ? 'hover:bg-blue-50 cursor-pointer'
            : 'hover:bg-gray-100 cursor-pointer'
        }`}
        onClick={() => {
          if (shouldLinkHaveColorIndicator(link)) {
            // For links with quotes and occurrences, only broadcast selection (like NotesViewer)
            handleLinkClick(link);
          } else {
            // For links without quotes/occurrences, open the detail modal
            handleLinkPress(link);
          }
        }}
        title={shouldLinkHaveColorIndicator(link) ? "Click to highlight this link's tokens in scripture" : undefined}
      >
        {/* Header row with reference, occurrence, and color indicator */}
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center space-x-2">
            {/* Color indicator that matches the underlining color - only for links with origWords and occurrences */}
            {shouldLinkHaveColorIndicator(link) && (
              <div 
                className={`w-3 h-3 rounded-full ${getLinkColor(link)} border border-gray-300`}
                title="This color matches the token underlining in scripture"
              ></div>
            )}
            <div className="text-xs font-semibold text-blue-600">
              {link.reference}
            </div>
          </div>
          {parseInt(link.occurrence) > 1 && (
            <div className="bg-amber-500 text-white text-xs font-semibold rounded-full w-4 h-4 flex items-center justify-center">
              {link.occurrence}
            </div>
          )}
        </div>

        {/* Original words and tags - show target language quote if available, otherwise original */}
        <div className="flex items-center gap-2 mb-2">
          {link.origWords && (
            <div className="flex flex-col gap-1">
              {(() => {
                const linkKey = link.id || `${link.reference}-${link.origWords.trim()}`;
                const targetQuote = targetLanguageQuotes.get(linkKey);
                
                if (targetQuote) {
                  // Show target language quote when available
                  return (
                    <button
                      className="bg-purple-50 text-purple-800 px-2 py-1 rounded text-xs font-medium hover:bg-purple-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWordPress(link);
                      }}
                    >
                      {targetQuote.quote}
                    </button>
                  );
                } else {
                  // Show original language words when no target quote is built
                  return (
                    <button
                      className="bg-blue-50 text-blue-800 px-2 py-1 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWordPress(link);
                      }}
                    >
                      {renderOriginalWords(link.origWords)}
                    </button>
                  );
                }
              })()}
            </div>
          )}
          {link.tags && (
            <span className="text-xs text-gray-500">
              {link.tags}
            </span>
          )}
        </div>

        {/* Translation Words definition - more compact */}
        <button
          className="w-full bg-green-50 border border-green-200 text-green-800 p-2 rounded hover:bg-green-100 transition-colors text-left"
          onClick={(e) => {
            e.stopPropagation();
            handleTranslationWordPress(link.twLink);
          }}
        >
          <div className="font-medium text-sm">
            <span role="img" aria-label="book">📖</span> {twTitles.get(twInfo.term) || twInfo.term.replace(/[-_]/g, ' ')}
          </div>
        </button>
      </div>
    );
  };

  const renderArticleView = () => {
    if (!selectedArticle) return null;

    return (
      <div className="flex flex-col h-full">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <span role="img" aria-label="book" className="mr-2">📖</span>
            {selectedArticle.title}
          </h2>
          <button
            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
            onClick={() => {
              setShowArticleView(false);
              setSelectedArticle(null);
            }}
          >
            ✕
          </button>
        </div>

        {/* Article content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="prose prose-sm max-w-none">
            {selectedArticle.content ? (
              <MarkdownRenderer 
                content={selectedArticle.content}
                className="text-gray-800 leading-relaxed"
                linkTarget="_blank"
                headerBaseLevel={2}
              />
            ) : (
              <div className="text-gray-500">No content available</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderLinkDetailModal = () => {
    if (!selectedLink || !showLinkDetail) return null;

    const twInfo = parseTWLink(selectedLink.twLink);
    const categoryColorClass = getCategoryColor(twInfo.category);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">Translation Words Link</h2>
            <button
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
              onClick={() => setShowLinkDetail(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="mb-6">
              <div className="text-lg font-semibold text-blue-600 mb-3">
                {selectedLink.reference}
              </div>
              {selectedLink.origWords && (
                (() => {
                  const linkKey = selectedLink.id || `${selectedLink.reference}-${selectedLink.origWords.trim()}`;
                  const targetQuote = targetLanguageQuotes.get(linkKey);
                  
                  if (targetQuote) {
                    // Show target language quote when available
                    return (
                      <button
                        className="bg-purple-50 text-purple-800 px-4 py-3 rounded-lg text-base font-medium hover:bg-purple-100 transition-colors"
                        onClick={() => handleWordPress(selectedLink)}
                      >
                        {targetQuote.quote}
                      </button>
                    );
                  } else {
                    // Show original language words when no target quote is built
                    return (
                      <button
                        className="bg-blue-50 text-blue-800 px-4 py-3 rounded-lg text-base font-medium hover:bg-blue-100 transition-colors"
                        onClick={() => handleWordPress(selectedLink)}
                      >
                        {renderOriginalWords(selectedLink.origWords)}
                      </button>
                    );
                  }
                })()
              )}
            </div>

            <div className="mb-6">
              <span className={`inline-block px-3 py-2 rounded-full text-sm font-semibold border ${categoryColorClass}`}>
                {getCategoryLabel(twInfo.category)}
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Translation Word:</h3>
              <button
                className="w-full bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg hover:bg-green-100 transition-colors text-left"
                onClick={() => handleTranslationWordPress(selectedLink.twLink)}
              >
                <div className="font-semibold text-lg mb-2">
                  <span role="img" aria-label="book">📖</span> {twTitles.get(twInfo.term) || twInfo.term.replace(/[-_]/g, ' ')}
                </div>
                <div className="text-sm text-green-600 italic">
                  {twTitles.get(twInfo.term) ? 'Tap to view full definition' : 'Loading title...'}
                </div>
              </button>
            </div>

            {selectedLink.tags && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags:</h3>
                <p className="text-sm text-gray-600">{selectedLink.tags}</p>
              </div>
            )}

            <div className="p-4 bg-gray-100 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Link Information:</h3>
              <div className="space-y-1 text-xs text-gray-600 font-mono">
                <div>ID: {selectedLink.id}</div>
                <div>Occurrence: {selectedLink.occurrence}</div>
                <div>Link: {selectedLink.twLink}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
        <div className="text-gray-500 text-base">Loading translation word links...</div>
      </div>
    );
  }

  // Show error state
  if (displayError) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
        <div className="text-red-500 text-base">{displayError}</div>
      </div>
    );
  }

  // Show empty state
  if (filteredLinks.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
        <div className="text-gray-500 text-base">
          {currentReference && currentReference.chapter 
            ? `No translation word links for ${currentReference.book} ${currentReference.chapter}:${currentReference.verse}${currentReference.endChapter && currentReference.endChapter !== currentReference.chapter ? `-${currentReference.endChapter}:${currentReference.endVerse}` : currentReference.endVerse && currentReference.endVerse !== currentReference.verse ? `-${currentReference.endVerse}` : ''}`
            : 'No translation word links available'
          }
        </div>
      </div>
    );
  }

  // Show article view if selected
  if (showArticleView && selectedArticle) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        {renderArticleView()}
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Token Filter Banner */}
      {tokenFilter && (
        <div className="bg-blue-50 border-b border-blue-200 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-blue-600 text-sm font-medium">
              <span role="img" aria-label="Target">🎯</span> 
            </span>
            <span className="text-blue-800 font-mono text-sm bg-blue-100 px-2 py-1 rounded">
              {tokenFilter.originalLanguageToken.content}
            </span>
            <span className="text-blue-600 text-xs">
              ({filteredLinks.length})
            </span>
          </div>
          <button
            onClick={() => {
              setTokenFilter(null);
            }}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded p-1 transition-colors"
            title="Clear token filter"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* Debug section for scripture tokens */}
          {/* {tokenBroadcastInfo && scriptureTokens.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <div className="font-semibold text-blue-800 mb-2">
                <span role="img" aria-label="broadcast">📡</span> Scripture Tokens Received
              </div>
              <div className="text-blue-700 space-y-1">
                <div>Source: {tokenBroadcastInfo.sourceResourceId}</div>
                <div>Reference: {tokenBroadcastInfo.reference.book} {tokenBroadcastInfo.reference.chapter}:{tokenBroadcastInfo.reference.verse}
                  {tokenBroadcastInfo.reference.endChapter && tokenBroadcastInfo.reference.endChapter !== tokenBroadcastInfo.reference.chapter 
                    ? `-${tokenBroadcastInfo.reference.endChapter}:${tokenBroadcastInfo.reference.endVerse}` 
                    : tokenBroadcastInfo.reference.endVerse && tokenBroadcastInfo.reference.endVerse !== tokenBroadcastInfo.reference.verse 
                    ? `-${tokenBroadcastInfo.reference.endVerse}` 
                    : ''
                  }
                </div>
                <div>Tokens: {scriptureTokens.length}</div>
                <div>Received: {new Date(tokenBroadcastInfo.timestamp).toLocaleTimeString()}</div>
                {scriptureTokens.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium">Sample tokens:</div>
                    <div className="text-xs bg-blue-100 p-2 rounded mt-1 font-mono">
                      {scriptureTokens.slice(0, 10).map(token => token.text).join(' ')}
                      {scriptureTokens.length > 10 && '...'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )} */}
                   
          <div className="space-y-3">
            {filteredLinks.map((link, index) => renderLink(link, index))}
          </div>
        </div>
      </div>
      
      {renderLinkDetailModal()}
    </div>
  );
};

export default TranslationWordsLinksViewer;
