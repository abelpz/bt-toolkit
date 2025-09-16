/**
 * Translation Notes Viewer Component
 * 
 * Displays Translation Notes (TN) content with filtering and navigation
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useCurrentState, useResourceAPI, useMessaging } from 'linked-panels';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useResourceModal } from '../../contexts/ResourceModalContext';
import { ProcessedNotes, TranslationNote } from '../../services/notes-processor';
import { ResourceMetadata, ResourceType } from '../../types/context';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { Icon } from '../ui/Icon';
import { parseRcLink, isTranslationAcademyLink, getArticleDisplayTitle } from '../../utils/rc-link-parser';
import { clearComponentTitleCache } from '../../services/remark-plugins/door43-rehype-plugin';
import { QuoteMatcher, QuoteMatchResult } from '../../services/quote-matcher';
import { OptimizedScripture, OptimizedToken } from '../../services/usfm-processor';
import {
  ScriptureTokensBroadcast,
  TokenClickBroadcast,
  NoteSelectionBroadcast,
  NoteTokenGroup,
} from '../../types/scripture-messages';
import { 
  NotesTokenGroupsBroadcast,
  createNotesTokenGroupsBroadcast 
} from '../../plugins/notes-scripture-plugin';

import { COLOR_CLASSES } from '../../contexts/TokenUnderliningContext';

export interface NotesViewerProps {
  resourceId: string;
  loading?: boolean;
  error?: string;
  notes?: ProcessedNotes;
  currentChapter?: number;
}

export function NotesViewer({ 
  resourceId, 
  loading = false, 
  error, 
  notes: propNotes, 
  currentChapter = 1 
}: NotesViewerProps) {
  
  const { resourceManager, processedResourceConfig } = useWorkspace();
  const { currentReference, navigateToReference } = useNavigation();
  const { openModal } = useResourceModal();
  
  // Get linked-panels API for broadcasting note token groups
  const linkedPanelsAPI = useResourceAPI<NotesTokenGroupsBroadcast>(resourceId);
  
  // Track the last broadcast state to prevent infinite loops
  const lastBroadcastRef = useRef<string>('');
  
  const [actualNotes, setActualNotes] = useState<ProcessedNotes | null>(propNotes || null);
  const [contentLoading, setContentLoading] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(error || null);
  const [resourceMetadata, setResourceMetadata] = useState<ResourceMetadata | null>(null);
  
  // Original language content for quote matching
  const [originalScripture, setOriginalScripture] = useState<OptimizedScripture | null>(null);
  const [quoteMatches, setQuoteMatches] = useState<Map<string, QuoteMatchResult>>(new Map());
  const [quoteMatcher] = useState(() => new QuoteMatcher());
  
  // Token broadcast reception for building target language quotes
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
    resourceMetadata: {
      id: string;
      language: string;
      languageDirection?: 'ltr' | 'rtl';
      type: string;
    };
    timestamp: number;
  } | null>(null);

  // Clear component title cache when NotesViewer unmounts
  useEffect(() => {
    return () => {
      clearComponentTitleCache();
    };
  }, []);

  const [targetLanguageQuotes, setTargetLanguageQuotes] = useState<Map<string, {
    quote: string;
    tokens: OptimizedToken[];
    sourceLanguage: string;
  }>>(new Map());
  
  // Token filter state (for filtering notes by clicked tokens)
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
  
  // Removed internal modal state - using ResourceModalContext

  // TA button titles cache for support reference buttons - using ref to avoid re-render issues
  const taButtonTitlesRef = useRef<Map<string, string>>(new Map());
  const [taButtonTitles, setTaButtonTitles] = useState<Map<string, string>>(new Map());

  // Function to fetch TA title for support reference buttons
  const fetchTAButtonTitle = useCallback(async (supportReference: string): Promise<string> => {
    if (!resourceManager || !processedResourceConfig) {
      return parseRcLink(supportReference).articleId; // Fallback to articleId
    }

    const parsed = parseRcLink(supportReference);
    if (!parsed.isValid) {
      return supportReference;
    }

    const cacheKey = parsed.fullArticleId;
    
    // Check if already cached in ref (avoid re-render dependency)
    if (taButtonTitlesRef.current.has(cacheKey)) {
      return taButtonTitlesRef.current.get(cacheKey)!;
    }

    try {
      // Find TA resource config
      const taResourceConfig = processedResourceConfig.find((config: any) => 
        config.metadata?.type === 'academy' || config.metadata?.id === 'ta'
      );
      
      if (!taResourceConfig) {
        return parsed.articleId; // Fallback to articleId
      }

      // Construct content key for TA article
      const contentKey = `${taResourceConfig.metadata.server}/${taResourceConfig.metadata.owner}/${taResourceConfig.metadata.language}/${taResourceConfig.metadata.id}/${parsed.fullArticleId}`;
      
      const content = await resourceManager.getOrFetchContent(
        contentKey,
        taResourceConfig.metadata.type as ResourceType
      );
      
      if (content && (content as any).article?.title) {
        const title = (content as any).article.title;
        // Update both ref and state cache
        taButtonTitlesRef.current.set(cacheKey, title);
        setTaButtonTitles(prev => new Map(prev).set(cacheKey, title));
        return title;
      }
    } catch (error) {
      console.warn(`Failed to fetch TA title for ${cacheKey}:`, error);
    }

    return parsed.articleId; // Fallback to articleId
  }, [resourceManager, processedResourceConfig]); // Removed taButtonTitles dependency!

  // Component for TA button with fetched title
  const TAButton: React.FC<{ 
    supportReference: string;
    onSupportReferenceClick: (supportReference: string) => void;
  }> = React.memo(({ supportReference, onSupportReferenceClick }) => {
    // Memoize the parsed result to prevent re-renders
    const parsed = useMemo(() => parseRcLink(supportReference), [supportReference]);
    const cacheKey = parsed.fullArticleId;
    
    // Check if we already have the title cached
    const cachedTitle = taButtonTitles.get(cacheKey);
    const [buttonTitle, setButtonTitle] = useState<string>(cachedTitle || parsed.articleId);
    const [isLoading, setIsLoading] = useState(!cachedTitle);

    // Memoize the click handler to prevent re-renders
    const handleClick = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSupportReferenceClick(supportReference);
    }, [supportReference, onSupportReferenceClick]);

    useEffect(() => {
      // Skip if we already have the title
      if (cachedTitle) {
        setButtonTitle(cachedTitle);
        setIsLoading(false);
        return;
      }

      const loadTitle = async () => {
        try {
          setIsLoading(true);
          const title = await fetchTAButtonTitle(supportReference);
          setButtonTitle(title);
        } catch (error) {
          console.error(`Failed to load TA title for ${supportReference}:`, error);
          setButtonTitle(parsed.articleId); // Fallback
        } finally {
          setIsLoading(false);
        }
      };
      loadTitle();
    }, [supportReference, cachedTitle, parsed.articleId]);

    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center px-2 py-1 text-sm text-blue-700 bg-blue-50 rounded border border-blue-700/30 hover:bg-blue-100 transition-colors"
        type="button"
      >
        <Icon name="academy" size={14} className="mr-1 flex-shrink-0" aria-label="graduation cap" />
        {isLoading ? '...' : buttonTitle}
      </button>
    );
  });

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
        console.log('📨 NotesViewer received token click event:', tokenClickEvent);
        
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

  // Function to handle note selection and broadcast the event
  const handleNoteClick = useCallback((note: TranslationNote) => {
    const noteKey = note.id || `${note.reference}-${note.quote}`;
    const tokenGroupId = `notes-${noteKey}`;
    
    console.log('📝 Note clicked, broadcasting selection:', {
      noteId: noteKey,
      tokenGroupId,
      quote: note.quote,
      reference: note.reference
    });

    // Broadcast note selection event
    const noteSelectionBroadcast: NoteSelectionBroadcast = {
      type: 'note-selection-broadcast',
      lifecycle: 'event',
      selectedNote: {
        noteId: noteKey,
        tokenGroupId: tokenGroupId,
        quote: note.quote,
        reference: note.reference
      },
      sourceResourceId: resourceId,
      timestamp: Date.now()
    };

    // Use the general messaging API instead of the typed one
    (linkedPanelsAPI.messaging as any).sendToAll(noteSelectionBroadcast);
  }, [resourceId, linkedPanelsAPI]);

  // Function to check if a note should have color indicator and be clickable
  const shouldNoteHaveColorIndicator = useCallback((note: TranslationNote): boolean => {
    return !!(note.quote && note.quote.trim() && note.occurrence);
  }, []);



  // Testament-specific original language configuration (same as OriginalScriptureViewer)
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
    
    // Simple testament detection based on book codes
    // OT books: gen, exo, lev, num, deu, jos, jdg, rut, 1sa, 2sa, 1ki, 2ki, 1ch, 2ch, ezr, neh, est, job, psa, pro, ecc, sng, isa, jer, lam, ezk, dan, hos, jol, amo, oba, jon, mic, nam, hab, zep, hag, zec, mal
    // NT books: mat, mrk, luk, jhn, act, rom, 1co, 2co, gal, eph, php, col, 1th, 2th, 1ti, 2ti, tit, phm, heb, jas, 1pe, 2pe, 1jn, 2jn, 3jn, jud, rev
    const ntBooks = ['mat', 'mrk', 'luk', 'jhn', 'act', 'rom', '1co', '2co', 'gal', 'eph', 'php', 'col', '1th', '2th', '1ti', '2ti', 'tit', 'phm', 'heb', 'jas', '1pe', '2pe', '1jn', '2jn', '3jn', 'jud', 'rev'];
    
    return ntBooks.includes(bookCode.toLowerCase()) ? 'NT' : 'OT';
  };

  // Handle clicking on support reference links
  const handleSupportReferenceClick = useCallback((supportReference: string) => {
    if (!isTranslationAcademyLink(supportReference)) {
      return;
    }

    const parsed = parseRcLink(supportReference);
    
    if (parsed.isValid) {
      openModal({
        type: 'ta',
        id: parsed.fullArticleId,
        title: getArticleDisplayTitle(parsed.articleId, parsed.category)
      });
    }
  }, []); // No dependencies needed since it only uses setters

  // Fetch content when navigation changes
  useEffect(() => {
    if (!resourceManager || !currentReference.book || propNotes || !processedResourceConfig) return;

    const fetchContent = async () => {
      try {
        setContentLoading(true);
        setDisplayError(null);
        setActualNotes(null); // Clear previous content
        
        
        // Find the resource config to get the correct adapter resource ID
        const resourceConfig = processedResourceConfig.find((config: { panelResourceId: string }) => config.panelResourceId === resourceId);
        if (!resourceConfig) {
          throw new Error(`Resource config not found for ${resourceId}`);
        }
        
        // Construct the full content key in the same format as ScriptureViewer
        const contentKey = `${resourceConfig.metadata.server}/${resourceConfig.metadata.owner}/${resourceConfig.metadata.language}/${resourceConfig.metadata.id}/${currentReference.book}`;
        
        const content = await resourceManager.getOrFetchContent(
          contentKey, // Full key format: server/owner/language/resourceId/book
          resourceConfig.metadata.type as ResourceType // Resource type from metadata
        );
        
        if (content) {
          const processedNotes = content as unknown as ProcessedNotes;
          if (processedNotes && processedNotes.notes && Array.isArray(processedNotes.notes)) {
            setActualNotes(processedNotes);
          } else {
            setDisplayError(`Invalid notes content structure for ${currentReference.book}`);
          }
        } else {
          setDisplayError(`No notes found for ${currentReference.book}`);
        }
        
        // Use existing metadata from resource config for language direction
        setResourceMetadata(resourceConfig.metadata);
      } catch (err) {
        setDisplayError(err instanceof Error ? err.message : 'Failed to load notes');
      } finally {
        setContentLoading(false);
      }
    };

    fetchContent();
  }, [resourceManager, resourceId, currentReference.book, propNotes, processedResourceConfig]);

  // Load original language content for quote matching
  useEffect(() => {
    if (!resourceManager || !currentReference.book) {
      console.log('⏳ NotesViewer - Missing dependencies for original language loading');
      return;
    }

    const loadOriginalLanguageContent = async () => {
      try {
        console.log('🔄 NotesViewer - Loading original language content for quote matching');
        
        // Determine testament from current book
        const testament = getTestamentFromBook(currentReference.book);
        if (!testament) {
          console.warn(`⚠️ NotesViewer - Cannot determine testament for book: ${currentReference.book}`);
          return;
        }

        // Get configuration for the testament
        const config = ORIGINAL_LANGUAGE_CONFIG[testament];
        
        console.log(`🔄 NotesViewer - Loading ${testament} content for quote matching:`, config);
        
        // Construct content key for the original language resource (same pattern as OriginalScriptureViewer)
        // Format: server/owner/language/resourceId/book
        const contentKey = `git.door43.org/${config.owner}/${config.language}/${config.resourceId}/${currentReference.book}`;
        console.log(`📋 NotesViewer - Original language content key: ${contentKey}`);
        
        // Try to get content using the resource manager
        const content = await resourceManager.getOrFetchContent(
          contentKey,
          'scripture' as ResourceType // Resource type
        );
        
        console.log(`✅ NotesViewer - Original language content loaded for ${testament}:`, content);
        setOriginalScripture(content as OptimizedScripture);
        
      } catch (err) {
        console.error(`❌ NotesViewer - Failed to load original language content:`, err);
        // Don't set error state - quote matching is optional functionality
        setOriginalScripture(null);
      }
    };

    loadOriginalLanguageContent();
  }, [resourceManager, currentReference.book, ORIGINAL_LANGUAGE_CONFIG]);

  const displayNotes = actualNotes || propNotes;
  const isLoading = loading || contentLoading;

  // Filter notes by current navigation range (like NotesPanel.tsx) - MOVED UP
  const filteredNotesByNavigation = useMemo(() => {
    if (!actualNotes?.notes || !currentReference) {
      return actualNotes?.notes || [];
    }
    
    return actualNotes.notes.filter((note: TranslationNote) => {
      if (!note.reference) return false;
      
      try {
        const refParts = note.reference.split(':');
        const noteChapter = parseInt(refParts[0] || '1');
        
        // Parse verse part which might be a range (e.g., "3-4" or just "3")
        const versePart = refParts[1] || '1';
        let noteStartVerse: number;
        let noteEndVerse: number;
        
        if (versePart.includes('-')) {
          // Handle verse range (e.g., "3-4")
          const verseParts = versePart.split('-');
          noteStartVerse = parseInt(verseParts[0] || '1');
          noteEndVerse = parseInt(verseParts[1] || noteStartVerse.toString());
        } else {
          // Single verse
          noteStartVerse = parseInt(versePart);
          noteEndVerse = noteStartVerse;
        }
        
        // Check if note overlaps with current navigation range
        const currentChapter = currentReference.chapter || 1;
        const currentStartVerse = currentReference.verse || 1;
        const currentEndVerse = currentReference.endVerse || currentStartVerse;
        
        // Note is visible if it overlaps with the current navigation range
        return noteChapter === currentChapter && 
               noteStartVerse <= currentEndVerse && 
               noteEndVerse >= currentStartVerse;
      } catch (error) {
        console.warn(`⚠️ NotesViewer - Error parsing note reference ${note.reference}:`, error);
        return false;
      }
    });
  }, [actualNotes, currentReference]);

  // Process quote matches ONLY for navigation-filtered notes
  useEffect(() => {
    if (!originalScripture || !filteredNotesByNavigation.length || !currentReference.book) {
      console.log('⏳ NotesViewer - Missing dependencies for quote matching');
      setQuoteMatches(new Map());
      return;
    }

    const processQuoteMatches = async () => {
      try {
        console.log('🔄 NotesViewer - Processing quote matches for filtered notes', {
          totalNotes: filteredNotesByNavigation.length,
          reference: `${currentReference.book} ${currentReference.chapter}:${currentReference.verse}`
        });
        const newQuoteMatches = new Map<string, QuoteMatchResult>();

        // Process each navigation-filtered note that has a quote
        for (const note of filteredNotesByNavigation) {
          if (!note.quote || !note.reference) {
            continue;
          }

          try {
            // Parse the note reference to get chapter and verse info (supports ranges like "2:3-4")
            const refParts = note.reference.split(':');
            const noteChapter = parseInt(refParts[0] || '1');
            
            // Parse verse part which might be a range (e.g., "3-4" or just "3")
            const versePart = refParts[1] || '1';
            let noteStartVerse: number;
            let noteEndVerse: number;
            
            if (versePart.includes('-')) {
              // Handle verse range (e.g., "3-4")
              const verseParts = versePart.split('-');
              noteStartVerse = parseInt(verseParts[0] || '1');
              noteEndVerse = parseInt(verseParts[1] || noteStartVerse.toString());
            } else {
              // Single verse
              noteStartVerse = parseInt(versePart);
              noteEndVerse = noteStartVerse;
            }
            
            // Validate parsed values
            if (isNaN(noteChapter) || isNaN(noteStartVerse) || isNaN(noteEndVerse) || 
                noteChapter < 1 || noteStartVerse < 1 || noteEndVerse < noteStartVerse) {
              console.warn(`⚠️ NotesViewer - Invalid reference format for note ${note.id}: ${note.reference}`);
              continue;
            }
            
            // Create quote reference for the matcher [[memory:8491101]]
            const quoteReference = {
              book: currentReference.book,
              startChapter: noteChapter,
              startVerse: noteStartVerse,
              endChapter: noteChapter, // Same chapter for now (could be extended for multi-chapter ranges)
              endVerse: noteEndVerse
            };

            // Validate quote text (trim whitespace and check for meaningful content)
            const cleanQuote = note.quote.trim();
            if (cleanQuote.length < 2) {
              console.warn(`⚠️ NotesViewer - Quote too short for note ${note.id}: "${cleanQuote}"`);
              continue;
            }

            // Parse occurrence with validation
            const occurrence = Math.max(1, parseInt(note.occurrence || '1'));
            if (isNaN(occurrence)) {
              console.warn(`⚠️ NotesViewer - Invalid occurrence for note ${note.id}: ${note.occurrence}`);
              continue;
            }

            // Use quote matcher to find original tokens
            const matchResult = quoteMatcher.findOriginalTokens(
              originalScripture.chapters,
              cleanQuote,
              occurrence,
              quoteReference
            );

            const noteKey = note.id || `${note.reference}-${cleanQuote}`;
            
            if (matchResult.success) {
              console.log(`✅ NotesViewer - Found quote match for note ${note.id}:`, {
                quote: cleanQuote,
                occurrence,
                tokensFound: matchResult.totalTokens.length,
                matches: matchResult.matches.length
              });
              newQuoteMatches.set(noteKey, matchResult);
            } else {
              console.warn(`⚠️ NotesViewer - No quote match found for note ${note.id}:`, {
                quote: cleanQuote,
                occurrence,
                reference: note.reference,
                error: matchResult.error
              });
              // Store failed match result for UI feedback
              newQuoteMatches.set(noteKey, matchResult);
            }
          } catch (noteError) {
            console.error(`❌ NotesViewer - Error processing note ${note.id}:`, noteError);
            // Continue processing other notes
            continue;
          }
        }

        setQuoteMatches(newQuoteMatches);
        console.log(`✅ NotesViewer - Processed ${newQuoteMatches.size} quote matches`);

      } catch (err) {
        console.error('❌ NotesViewer - Failed to process quote matches:', err);
        setQuoteMatches(new Map());
      }
    };

    processQuoteMatches();
  }, [originalScripture, filteredNotesByNavigation, currentReference.book, currentReference.chapter, currentReference.verse, quoteMatcher]);

  // Handle scripture token broadcasts (similar to TranslationWordsLinksViewer)
  useEffect(() => {
    if (scriptureTokensBroadcast) {
      // Guard: Ignore broadcasts from non-scripture resources to prevent feedback loops
      if (scriptureTokensBroadcast.sourceResourceId === resourceId) {
        console.log(`🛡️ NotesViewer ignoring broadcast from self (${resourceId}) to prevent feedback loop`);
        return;
      }

      // Check if this is a clear message (empty tokens and empty book)
      const isClearMessage = scriptureTokensBroadcast.tokens.length === 0 && 
                            !scriptureTokensBroadcast.reference.book;
      
      if (isClearMessage) {
        console.log(`🧹 NotesViewer received clear signal from ${scriptureTokensBroadcast.sourceResourceId}`);
        // Proper state cleanup - clear local state but don't trigger new broadcasts
        if (scriptureTokens.length > 0 || tokenBroadcastInfo || targetLanguageQuotes.size > 0) {
          setScriptureTokens([]);
          setTokenBroadcastInfo(null);
          setTargetLanguageQuotes(new Map());
        }
        return;
      } else {
        console.log(`🎯 NotesViewer received scripture tokens from ${scriptureTokensBroadcast.sourceResourceId}:`, {
          tokenCount: scriptureTokensBroadcast.tokens.length,
          reference: scriptureTokensBroadcast.reference,
          language: scriptureTokensBroadcast.resourceMetadata.language,
          timestamp: new Date(scriptureTokensBroadcast.timestamp).toLocaleTimeString()
        });

        setScriptureTokens(scriptureTokensBroadcast.tokens);
        setTokenBroadcastInfo({
          sourceResourceId: scriptureTokensBroadcast.sourceResourceId,
          reference: scriptureTokensBroadcast.reference,
          resourceMetadata: scriptureTokensBroadcast.resourceMetadata,
          timestamp: scriptureTokensBroadcast.timestamp
        });
      }
    } else {
      console.log('📭 NotesViewer: No scripture token broadcast found');
      setScriptureTokens([]);
      setTokenBroadcastInfo(null);
      setTargetLanguageQuotes(new Map());
    }
  }, [scriptureTokensBroadcast]);

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
            missingTokens.forEach(token => {
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

  // Process target language quotes when we have both quote matches and received tokens
  useEffect(() => {
    if (!scriptureTokens.length || !quoteMatches.size || !tokenBroadcastInfo) {
      console.log('⏳ NotesViewer - Missing dependencies for target quote building');
      setTargetLanguageQuotes(new Map());
      return;
    }

    const buildTargetLanguageQuotes = () => {
      try {
        console.log('🔄 NotesViewer - Building target language quotes from received tokens');
        const newTargetQuotes = new Map<string, {
          quote: string;
          tokens: OptimizedToken[];
          sourceLanguage: string;
        }>();

        // Process each quote match
        for (const [noteKey, quoteMatch] of quoteMatches.entries()) {
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
                newTargetQuotes.set(noteKey, {
                  quote: targetQuote,
                  tokens: alignedTokens,
                  sourceLanguage: tokenBroadcastInfo.resourceMetadata.language
                });

                console.log(`✅ NotesViewer - Built target quote for ${noteKey}:`, {
                  originalTokens: quoteMatch.totalTokens.length,
                  alignedTokens: alignedTokens.length,
                  targetQuote: targetQuote.substring(0, 50) + (targetQuote.length > 50 ? '...' : '')
                });
              }
            } else {
              // Temporarily disabled to prevent console flooding
              // console.debug(`⚠️ NotesViewer - No aligned tokens found for ${noteKey}`);
            }
          } catch (err) {
            console.error(`❌ NotesViewer - Error building target quote for ${noteKey}:`, err);
          }
        }

        setTargetLanguageQuotes(newTargetQuotes);
        console.log(`✅ NotesViewer - Built ${newTargetQuotes.size} target language quotes`);

      } catch (err) {
        console.error('❌ NotesViewer - Failed to build target language quotes:', err);
        setTargetLanguageQuotes(new Map());
      }
    };

    buildTargetLanguageQuotes();
  }, [scriptureTokens, quoteMatches, tokenBroadcastInfo, buildQuoteWithEllipsis]);

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


  // Function to get the color for a note using the same cycling logic as token groups
  // Always use the original navigation-filtered notes (before token filter) to maintain consistent colors
  const getNoteColor = useCallback((note: TranslationNote): string => {
    // Use filteredNotesByNavigation (first filter only) to maintain consistent color indices
    // This ensures colors don't change when the second filter (token filter) is applied
    const originalNotesWithColorIndicators = filteredNotesByNavigation.filter(shouldNoteHaveColorIndicator);
    const colorIndicatorIndex = originalNotesWithColorIndicators.findIndex(n => 
      (n.id || `${n.reference}-${n.quote}`) === (note.id || `${note.reference}-${note.quote}`)
    );
    
    // Use the same cycling logic as the token underlining context
    const colorIndex = colorIndicatorIndex % COLOR_CLASSES.length;
    return COLOR_CLASSES[colorIndex].bgColor;
  }, [filteredNotesByNavigation, shouldNoteHaveColorIndicator]);

  // Apply token filter on top of navigation-filtered notes
  const filteredNotes = useMemo(() => {
    if (!tokenFilter || !quoteMatches.size) {
      return filteredNotesByNavigation;
    }

    console.log('🔍 Applying token filter to notes:', {
      tokenFilter: tokenFilter.originalLanguageToken,
      totalNotes: filteredNotesByNavigation.length,
      quoteMatchesCount: quoteMatches.size
    });

    // Filter notes that have quote matches containing the clicked token
    return filteredNotesByNavigation.filter(note => {
      const noteKey = note.id || `${note.reference}-${note.quote}`;
      const quoteMatch = quoteMatches.get(noteKey);
      
      if (!quoteMatch || !quoteMatch.totalTokens.length) {
        return false;
      }

      // Check if any of the note's matched tokens have the same ID as the clicked token
      const hasMatchingToken = quoteMatch.totalTokens.some(token => 
        token.id.toString() === tokenFilter.originalLanguageToken.semanticId ||
        (tokenFilter.originalLanguageToken.alignedSemanticIds && 
         tokenFilter.originalLanguageToken.alignedSemanticIds.includes(token.id.toString()))
      );

      if (hasMatchingToken) {
        console.log('✅ Note matches token filter:', {
          noteId: noteKey,
          quote: note.quote,
          matchedTokenIds: quoteMatch.totalTokens.map(t => t.id),
          filterTokenId: tokenFilter.originalLanguageToken.semanticId
        });
      }

      return hasMatchingToken;
    });
  }, [filteredNotesByNavigation, tokenFilter, quoteMatches]);


  // Send note token groups when quote matches are updated (with debouncing)
  useEffect(() => {
    // Guard against invalid states that could cause infinite loops
    if (!currentReference.book || !resourceMetadata?.id || isLoading || !processedResourceConfig || !linkedPanelsAPI?.messaging) {
      return; // Early return if invalid state
    }

    // Additional guard: Don't broadcast if we're in a cleanup phase (no notes or no original scripture)
    if (!displayNotes?.notes?.length || !originalScripture) {
      console.log('🛡️ NotesViewer: Skipping broadcast during cleanup phase (no notes or original scripture)');
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
          
          // Get the list of notes with color indicators (before token filter) for consistent color indexing
          const notesWithColorIndicators = filteredNotesByNavigation.filter(shouldNoteHaveColorIndicator);
          
          for (const [noteKey, quoteMatch] of quoteMatchesSnapshot) {
            // Find note using the same key construction logic as quote matching
            const note = filteredNotes.find(n => {
              const key = n.id || `${n.reference}-${n.quote}`;
              return key === noteKey;
            });
            if (note && quoteMatch.totalTokens.length > 0) {
              // Calculate color index based on position in the original navigation-filtered list
              const colorIndicatorIndex = notesWithColorIndicators.findIndex(n => 
                (n.id || `${n.reference}-${n.quote}`) === (note.id || `${note.reference}-${note.quote}`)
              );
              const colorIndex = colorIndicatorIndex >= 0 ? colorIndicatorIndex % COLOR_CLASSES.length : 0;
              
              tokenGroups.push({
                noteId: note.id || noteKey,
                noteReference: note.reference,
                quote: note.quote,
                occurrence: parseInt(note.occurrence) || 1,
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
            console.log(`📤 NotesViewer (${resourceId}) - Broadcasted ${tokenGroups.length} note token groups for ${currentReference.book} ${currentReference.chapter}:${currentReference.verse}:`, 
              tokenGroups.map(g => `${g.noteId}(${g.tokens.length} tokens)`).join(', '));
          } else {
            console.log(`📤 NotesViewer (${resourceId}) - Sent empty token groups for ${currentReference.book} ${currentReference.chapter}:${currentReference.verse}`);
          }
        } catch (error) {
          console.error('❌ Error broadcasting note token groups:', error);
        }
        
        lastBroadcastRef.current = stateHash;
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
    
    // Return empty cleanup function if no broadcast was scheduled
    return undefined;
  }, [currentReference, resourceMetadata, quoteMatches.size, isLoading, processedResourceConfig, linkedPanelsAPI, resourceId, filteredNotes.length]);


  // Cleanup: Silent cleanup without broadcasts to prevent infinite loops
  // Unmount cleanup pattern from team-review: Send superseding clear state message
  useEffect(() => {
    // Cleanup function to clear all note token groups when component unmounts
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
            resourceMetadata: { id: 'cleared', language: '', type: 'notes' }, // Special marker
            timestamp: Date.now()
          };

          linkedPanelsAPI.messaging.sendToAll(clearBroadcast);
          console.log(`🧹 NotesViewer (${resourceId}) - Unmount cleanup: Sent superseding clear state`);
        } catch (error) {
          console.error('❌ Error during NotesViewer unmount cleanup:', error);
        }
      }
    };
  }, []); // Empty dependency array is INTENTIONAL - ensures cleanup only on unmount (team-review pattern)

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading translation notes...</p>
          {currentReference.book && (
            <p className="text-sm text-gray-500 mt-2">Book: {currentReference.book}</p>
          )}
        </div>
      </div>
    );
  }

  if (displayError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-red-500 text-xl mb-2">
            <Icon name="warning" size={16} className="text-yellow-500" aria-label="Warning" />
          </div>
          <p className="font-medium">Error loading notes</p>
          <p className="text-sm mt-2">{displayError}</p>
        </div>
      </div>
    );
  }

  if (!displayNotes) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-gray-400 text-xl mb-2">
            <span role="img" aria-label="Notes">📝</span>
          </div>
          <p>No notes available</p>
          <p className="text-sm mt-1">Resource: {resourceId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
        {/* Token Filter Banner */}
        {tokenFilter && (
          <div className="bg-blue-50 border-b border-blue-200 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-blue-600 text-sm font-medium">
                <Icon name="search" size={16} className="text-green-600" aria-label="Target" /> 
              </span>
              <span className="text-blue-800 font-mono text-sm bg-blue-100 px-2 py-1 rounded">
                {tokenFilter.originalLanguageToken.content}
              </span>
              <span className="text-blue-600 text-xs">
                ({filteredNotes.length})
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
        
      {/* Notes content */}
      <div 
        className={`flex-1 overflow-y-auto p-3 ${
          // Apply RTL styling based on metadata
          resourceMetadata?.languageDirection === 'rtl'
            ? 'text-right rtl' 
            : 'text-left ltr'
        }`}
        dir={resourceMetadata?.languageDirection || 'ltr'}
      >
        {filteredNotes.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-gray-400 text-xl mb-2">
              <span role="img" aria-label="Notes">📝</span>
            </div>
            <p>No notes for this selection</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note, index) => (
              <div 
                key={note.id || index} 
                className={`border border-gray-200 rounded p-2 bg-white transition-colors ${
                  shouldNoteHaveColorIndicator(note) 
                    ? 'hover:bg-blue-50/50 cursor-pointer' 
                    : ''
                }`}
                onClick={shouldNoteHaveColorIndicator(note) ? () => handleNoteClick(note) : undefined}
                title={shouldNoteHaveColorIndicator(note) ? "Click to highlight this note's tokens in scripture" : undefined}
              >
                {/* Note header */}
                <div className="flex items-center space-x-2 mb-1">
                  {/* Color indicator that matches the underlining color - only for notes with quotes and occurrences */}
                  {shouldNoteHaveColorIndicator(note) && (
                    <div 
                      className={`w-3 h-3 rounded-full ${getNoteColor(note)} border border-gray-300`}
                      title="This color matches the token underlining in scripture"
                    ></div>
                  )}
                  <span className="text-xs font-medium text-blue-600">
                      {note.reference}
                    </span>
                    
                </div>

                {/* Quoted text - show target language quote if available, otherwise original */}
                {note.quote && (
                  <div className="mb-1 p-2 bg-gray-50 rounded">
                    {(() => {
                      const noteKey = note.id || `${note.reference}-${note.quote}`;
                      const targetQuote = targetLanguageQuotes.get(noteKey);
                      
                      if (targetQuote) {
                        // Show target language quote when available
                        return (
                          <p className="text-purple-700 italic text-sm font-medium">
                            “{targetQuote.quote}”
                          </p>
                        );
                      } else {
                        // Show original language quote when no target quote is built
                        return (
                          <p className="text-gray-900 italic text-sm">"{note.quote}"</p>
                        );
                      }
                    })()}
                  </div>
                )}

                {/* Note content */}
                <div className="prose prose-sm max-w-none">
                  <div className="text-gray-800 leading-relaxed">
                    <MarkdownRenderer 
                      content={note.note}
                      currentBook={currentReference.book}
                      onTALinkClick={(articleId: string, title?: string) => {
                        console.log(`📖 Opening Translation Academy article from markdown: ${articleId}`);
                        openModal({
                          type: 'ta',
                          id: articleId,
                          title: title || getArticleDisplayTitle(articleId.split('/')[1] || articleId, articleId.split('/')[0] || 'translate')
                        });
                      }}
                      onTWLinkClick={(wordId: string, title?: string) => {
                        // Add 'bible/' prefix for Door43TranslationWordsAdapter compatibility
                        const fullWordId = wordId.startsWith('bible/') ? wordId : `bible/${wordId}`;
                        console.log(`📚 Opening Translation Words article from markdown: ${wordId} -> ${fullWordId}`);
                        openModal({
                          type: 'tw',
                          id: fullWordId,
                          title: title || wordId.split('/').pop() || wordId
                        });
                      }}
                      onNavigationClick={(bookCode: string, chapter: number, verse: number, title?: string) => {
                        console.log(`🎯 NotesViewer: Navigation button clicked - ${bookCode} ${chapter}:${verse}`);
                        navigateToReference({ book: bookCode, chapter, verse });
                      }}
                      onDisabledLinkClick={(linkInfo: any, title?: string) => {
                        console.log(`🚫 Disabled link clicked in markdown:`, linkInfo, title);
                        // Could show a toast notification here
                      }}
                    />
                  </div>
                </div>

                {/* Translation Academy button */}
                {note.supportReference && isTranslationAcademyLink(note.supportReference) && (
                  <div className="mt-2">
                    <TAButton 
                      supportReference={note.supportReference} 
                      onSupportReferenceClick={handleSupportReferenceClick}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ResourceModal now managed by ResourceModalContext */}
    </div>
  );
}

