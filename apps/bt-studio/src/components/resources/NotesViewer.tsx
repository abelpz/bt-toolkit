/**
 * Translation Notes Viewer Component
 * 
 * Displays Translation Notes (TN) content with filtering and navigation
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCurrentState } from 'linked-panels';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { ProcessedNotes, TranslationNote } from '../../services/notes-processor';
import { ResourceMetadata, ResourceType } from '../../types/context';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { AcademyModal } from '../modals/AcademyModal';
import { parseRcLink, isTranslationAcademyLink, getArticleDisplayTitle } from '../../utils/rc-link-parser';
import { QuoteMatcher, QuoteMatchResult } from '../../services/quote-matcher';
import { OptimizedScripture, OptimizedToken } from '../../services/usfm-processor';
import { ScriptureTokensBroadcast } from '../../types/scripture-messages';

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
  const { currentReference } = useNavigation();
  
  const [actualNotes, setActualNotes] = useState<ProcessedNotes | null>(propNotes || null);
  const [contentLoading, setContentLoading] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(error || null);
  const [resourceMetadata, setResourceMetadata] = useState<ResourceMetadata | null>(null);
  
  // Original language content for quote matching
  const [originalScripture, setOriginalScripture] = useState<OptimizedScripture | null>(null);
  const [originalLanguageConfig, setOriginalLanguageConfig] = useState<{
    owner: string;
    language: string;
    resourceId: string;
    title: string;
  } | null>(null);
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
  const [targetLanguageQuotes, setTargetLanguageQuotes] = useState<Map<string, {
    quote: string;
    tokens: OptimizedToken[];
    sourceLanguage: string;
  }>>(new Map());
  
  // Academy modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [selectedArticleTitle, setSelectedArticleTitle] = useState<string>('');

  // Listen for scripture token broadcasts using useCurrentState hook
  const scriptureTokensBroadcast = useCurrentState<ScriptureTokensBroadcast>(
    resourceId, 
    'current-scripture-tokens'
  );

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
  const handleSupportReferenceClick = (supportReference: string) => {
    if (!isTranslationAcademyLink(supportReference)) {
      console.warn(`Not a Translation Academy link: ${supportReference}`);
      return;
    }

    const parsed = parseRcLink(supportReference);
    if (parsed.isValid) {
      setSelectedArticleId(parsed.fullArticleId);
      setSelectedArticleTitle(getArticleDisplayTitle(parsed.articleId, parsed.category));
      setIsModalOpen(true);
      console.log(`🎓 Opening Translation Academy article: ${parsed.fullArticleId}`);
    }
  };

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
        setOriginalLanguageConfig(config);
        
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

  // Process quote matches when we have both notes and original scripture
  useEffect(() => {
    if (!originalScripture || !displayNotes?.notes || !currentReference.book) {
      console.log('⏳ NotesViewer - Missing dependencies for quote matching');
      setQuoteMatches(new Map());
      return;
    }

    const processQuoteMatches = async () => {
      try {
        console.log('🔄 NotesViewer - Processing quote matches for notes');
        const newQuoteMatches = new Map<string, QuoteMatchResult>();

        // Process each note that has a quote
        for (const note of displayNotes.notes) {
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
  }, [originalScripture, displayNotes?.notes, currentReference.book, quoteMatcher]);

  // Handle scripture token broadcasts (similar to TranslationWordsLinksViewer)
  useEffect(() => {
    if (scriptureTokensBroadcast) {
      // Check if this is a clear message (empty tokens and empty book)
      const isClearMessage = scriptureTokensBroadcast.tokens.length === 0 && 
                            !scriptureTokensBroadcast.reference.book;
      
      if (isClearMessage) {
        console.log(`🧹 NotesViewer received clear signal from ${scriptureTokensBroadcast.sourceResourceId}`);
        setScriptureTokens([]);
        setTokenBroadcastInfo(null);
        setTargetLanguageQuotes(new Map());
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
              console.warn(`⚠️ NotesViewer - No aligned tokens found for ${noteKey}`);
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

  // Filter notes by current navigation range (like NotesPanel.tsx)
  const filteredNotesByNavigation = useMemo(() => {
    if (!displayNotes?.notes || !currentReference) {
      return displayNotes?.notes || [];
    }
    
    return displayNotes.notes.filter((note: TranslationNote) => {
      // Parse chapter and verse from reference (e.g., "1:1" -> chapter: 1, verse: 1)
      const refParts = note.reference.split(':');
      const noteChapter = parseInt(refParts[0] || '1');
      const noteVerse = parseInt(refParts[1] || '1');
      
      // Determine the range bounds (default to single verse/chapter if no end specified)
      const startChapter = currentReference.chapter;
      const startVerse = currentReference.verse;
      const endChapter = currentReference.endChapter || currentReference.chapter;
      const endVerse = currentReference.endVerse || currentReference.verse;
      
      // Skip filtering if we don't have valid chapter/verse data
      if (!startChapter || !startVerse) {
        return true;
      }
      
      // Check if note is within the chapter range
      if (noteChapter < startChapter) {
        return false;
      }
      if (endChapter && noteChapter > endChapter) {
        return false;
      }
      
      // Filter by start verse in start chapter
      if (noteChapter === startChapter && noteVerse < startVerse) {
        return false;
      }
      
      // Filter by end verse in end chapter
      if (endChapter && endVerse && noteChapter === endChapter && noteVerse > endVerse) {
        return false;
      }
      
      return true;
    });
  }, [displayNotes?.notes, currentReference]);


  // Use navigation-filtered notes directly (they're already filtered by the current range)
  const filteredNotes = filteredNotesByNavigation;

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
            <span role="img" aria-label="Warning">⚠️</span>
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
          <>
            
          <div className="space-y-3">
            {filteredNotes.map((note, index) => (
              <div key={note.id || index} className="border border-gray-200 rounded p-2 bg-white">
                {/* Note header */}
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-medium text-blue-600">
                    {note.reference}
                  </span>
                  {note.occurrence && note.occurrence !== '1' && (
                    <span className="text-xs text-gray-500">
                      #{note.occurrence}
                    </span>
                  )}
                </div>

                {/* Quoted text */}
                {note.quote && (
                  <div className="mb-1 p-2 bg-gray-50 rounded">
                    <p className="text-gray-900 italic text-sm">"{note.quote}"</p>
                    
                    {/* Target language quote if available */}
                    {(() => {
                      const noteKey = note.id || `${note.reference}-${note.quote}`;
                      const targetQuote = targetLanguageQuotes.get(noteKey);
                      if (targetQuote) {
                        return (
                          <p className="text-purple-700 italic text-sm mt-1">"{targetQuote.quote}"</p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                {/* Note content */}
                <div className="prose prose-sm max-w-none">
                  <div className="text-gray-800 leading-relaxed">
                    <MarkdownRenderer content={note.note} />
                  </div>
                </div>

                {/* Translation Academy button */}
                {note.supportReference && isTranslationAcademyLink(note.supportReference) && (
                  <div className="mt-2">
                    <button
                      onClick={() => handleSupportReferenceClick(note.supportReference)}
                      className="inline-flex items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                    >
                      <span className="mr-1" role="img" aria-label="graduation cap">🎓</span>
                      {parseRcLink(note.supportReference).articleId}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Translation Academy Modal */}
      <AcademyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        articleId={selectedArticleId}
        title={selectedArticleTitle}
      />
    </div>
  );
}

