/**
 * Translation Words Links Viewer Component
 * 
 * Displays Translation Words Links (TWL) content in the bt-studio application.
 * Shows cross-reference links between Bible words and Translation Words definitions.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useCurrentState } from 'linked-panels';
import { ProcessedWordsLinks, TranslationWordsLink } from '../../services/adapters/Door43TranslationWordsLinksAdapter';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { ResourceMetadata, ResourceType } from '../../types/context';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { ScriptureTokensBroadcast } from '../../types/scripture-messages';
import type { OptimizedToken } from '../../services/usfm-processor';

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
  const [contentLoading, setContentLoading] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(error || null);
  const [, setResourceMetadata] = useState<ResourceMetadata | null>(null);
  const [twTitles, setTwTitles] = useState<Map<string, string>>(new Map());
  const [selectedLink, setSelectedLink] = useState<TranslationWordsLink | null>(null);
  const [showLinkDetail, setShowLinkDetail] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<{
    title: string;
    content: string;
    twLink: string;
  } | null>(null);
  const [showArticleView, setShowArticleView] = useState(false);

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

  // Listen for scripture token broadcasts using useCurrentState hook
  const scriptureTokensBroadcast = useCurrentState<ScriptureTokensBroadcast>(
    resourceId, 
    'current-scripture-tokens'
  );

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

  // Filter links by current navigation range (matching NotesViewer and QuestionsViewer logic)
  const filteredLinks = useMemo(() => {
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
        className="bg-gray-50 rounded-md p-2 mb-2 border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
        onClick={() => handleLinkPress(link)}
      >
        {/* Header row with reference and occurrence */}
        <div className="flex justify-between items-center mb-1">
          <div className="text-xs font-semibold text-blue-600">
            {link.reference}
          </div>
          {parseInt(link.occurrence) > 1 && (
            <div className="bg-amber-500 text-white text-xs font-semibold rounded-full w-4 h-4 flex items-center justify-center">
              {link.occurrence}
            </div>
          )}
        </div>

        {/* Original words and tags in one row */}
        <div className="flex items-center gap-2 mb-2">
          {link.origWords && (
            <button
              className="bg-blue-50 text-blue-800 px-2 py-1 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleWordPress(link);
              }}
            >
              {renderOriginalWords(link.origWords)}
            </button>
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
                <button
                  className="bg-blue-50 text-blue-800 px-4 py-3 rounded-lg text-base font-medium hover:bg-blue-100 transition-colors"
                  onClick={() => handleWordPress(selectedLink)}
                >
                  {renderOriginalWords(selectedLink.origWords)}
                </button>
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
