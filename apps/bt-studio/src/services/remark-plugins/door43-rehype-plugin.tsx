/**
 * Rehype Plugin for Door43 Links
 * 
 * Transforms rc:// links and relative links in the HTML AST
 * to use custom React components.
 */

import React, { useState, useEffect, memo } from 'react';
import { visit } from 'unist-util-visit';
import type { Node } from 'unist';
import type { Element } from 'hast';
import { Icon } from '../../components/ui/Icon';
import { 
  parseRcLink, 
  parseRelativeLink, 
  isRelativeLink,
  type ParsedRcLink 
} from '../../utils/rc-link-parser';
import { ResourceType } from '../../types/context';

export interface Door43LinkHandlers {
  onTALinkClick?: (articleId: string, title?: string) => void;
  onTWLinkClick?: (wordId: string, title?: string) => void;
  onNavigationClick?: (bookCode: string, chapter: number, verse: number, title?: string) => void;
  onDisabledLinkClick?: (linkInfo: ParsedRcLink, title?: string) => void;
}

export interface Door43RehypePluginOptions {
  handlers?: Door43LinkHandlers;
  currentBook?: string;
  resourceManager?: any; // ResourceManager instance for fetching titles
  processedResourceConfig?: any[]; // Resource configuration for finding TA/TW resources
}

/**
 * Title cache to avoid refetching the same titles
 * This persists across re-renders but gets cleared when the module reloads
 */
const titleCache = new Map<string, string>();

/**
 * Component instance cache to track which components have already fetched their titles
 * This prevents re-fetching during re-renders of the same component instance
 */
const componentTitleCache = new Map<string, string>();

/**
 * Global store for complex objects that can't be serialized through AST
 * We store them here and pass only simple keys through the AST
 */
const globalResourceStore = {
  resourceManager: null as any,
  processedResourceConfig: null as any[],
  lastUpdateId: 0
};

// Clear cache on module reload for debugging
titleCache.clear();
componentTitleCache.clear();
console.log('[REMARK TITLE FETCH DEBUG] 🧹 All caches cleared for fresh debugging');

/**
 * Function to clear component title cache - call this when NotesViewer unmounts
 */
export function clearComponentTitleCache() {
  componentTitleCache.clear();
  console.log('[REMARK TITLE FETCH DEBUG] 🧹 Component title cache cleared');
}

/**
 * Fetch title for Translation Academy article
 */
async function fetchTATitle(
  articleId: string, 
  resourceManager: any, 
  processedResourceConfig: any[]
): Promise<string> {
  const cacheKey = `ta:${articleId}`;
  console.log(`[REMARK TITLE FETCH DEBUG] 🔍 fetchTATitle called:`, { articleId, cacheKey, hasCached: titleCache.has(cacheKey) });
  
  if (titleCache.has(cacheKey)) {
    const cachedTitle = titleCache.get(cacheKey)!;
    console.log(`[REMARK TITLE FETCH DEBUG] 📋 Using cached TA title: ${articleId} -> "${cachedTitle}"`);
    return cachedTitle;
  }

  try {
    console.log(`[REMARK TITLE FETCH DEBUG] 🔍 processedResourceConfig debug:`, {
      type: typeof processedResourceConfig,
      isArray: Array.isArray(processedResourceConfig),
      keys: processedResourceConfig ? Object.keys(processedResourceConfig) : 'null/undefined',
      value: processedResourceConfig
    });

    // Check if it's an array before calling map
    if (!Array.isArray(processedResourceConfig)) {
      console.error(`[REMARK TITLE FETCH DEBUG] ❌ processedResourceConfig is not an array:`, processedResourceConfig);
      return getDefaultTATitle(articleId);
    }

    console.log(`[REMARK TITLE FETCH DEBUG] 🔍 Looking for TA resource config in:`, processedResourceConfig.map(c => ({
      type: c.metadata?.type,
      id: c.metadata?.id,
      owner: c.metadata?.owner
    })));

    // Find TA resource config
    const taResourceConfig = processedResourceConfig?.find((config: any) => 
      config.metadata?.type === 'academy' || config.metadata?.id === 'ta'
    );
    
    console.log(`[REMARK TITLE FETCH DEBUG] 🔍 Found TA resource config:`, taResourceConfig?.metadata);
    
    if (!taResourceConfig || !resourceManager) {
      console.warn('[REMARK TITLE FETCH DEBUG] ⚠️ TA resource config not found or no resourceManager');
      return getDefaultTATitle(articleId);
    }

    // Construct content key for TA article
    const contentKey = `${taResourceConfig.metadata.server}/${taResourceConfig.metadata.owner}/${taResourceConfig.metadata.language}/${taResourceConfig.metadata.id}/${articleId}`;
    
    console.log(`[REMARK TITLE FETCH DEBUG] 🔍 Fetching TA title for: ${articleId} (key: ${contentKey})`);
    
    const content = await resourceManager.getOrFetchContent(
      contentKey,
      taResourceConfig.metadata.type as ResourceType
    );
    
    console.log(`[REMARK TITLE FETCH DEBUG] 📦 TA Content received:`, {
      hasContent: !!content,
      contentKeys: content ? Object.keys(content) : [],
      contentStructure: content ? {
        hasArticle: !!(content as any).article,
        articleKeys: (content as any).article ? Object.keys((content as any).article) : [],
        articleTitle: (content as any).article?.title,
        fullContent: content
      } : null
    });
    
    if (content && (content as any).article?.title) {
      const title = (content as any).article.title;
      titleCache.set(cacheKey, title);
      console.log(`[REMARK TITLE FETCH DEBUG] ✅ Fetched TA title: ${articleId} -> "${title}"`);
      return title;
    }
  } catch (error) {
    console.error(`[REMARK TITLE FETCH DEBUG] ❌ Failed to fetch TA title for ${articleId}:`, error);
  }
  
  const defaultTitle = getDefaultTATitle(articleId);
  titleCache.set(cacheKey, defaultTitle);
  return defaultTitle;
}

/**
 * Fetch title for Translation Words entry
 */
async function fetchTWTitle(
  wordId: string, 
  resourceManager: any, 
  processedResourceConfig: any[]
): Promise<string> {
  const cacheKey = `tw:${wordId}`;
  console.log(`[REMARK TITLE FETCH DEBUG] 🔍 fetchTWTitle called:`, { wordId, cacheKey, hasCached: titleCache.has(cacheKey) });
  
  if (titleCache.has(cacheKey)) {
    const cachedTitle = titleCache.get(cacheKey)!;
    console.log(`[REMARK TITLE FETCH DEBUG] 📋 Using cached TW title: ${wordId} -> "${cachedTitle}"`);
    return cachedTitle;
  }

  try {
    console.log(`[REMARK TITLE FETCH DEBUG] 🔍 processedResourceConfig debug (TW):`, {
      type: typeof processedResourceConfig,
      isArray: Array.isArray(processedResourceConfig),
      keys: processedResourceConfig ? Object.keys(processedResourceConfig) : 'null/undefined',
      value: processedResourceConfig
    });

    // Check if it's an array before calling map
    if (!Array.isArray(processedResourceConfig)) {
      console.error(`[REMARK TITLE FETCH DEBUG] ❌ processedResourceConfig is not an array (TW):`, processedResourceConfig);
      return getDefaultTWTitle(wordId);
    }

    console.log(`[REMARK TITLE FETCH DEBUG] 🔍 Looking for TW resource config in:`, processedResourceConfig.map(c => ({
      type: c.metadata?.type,
      id: c.metadata?.id,
      owner: c.metadata?.owner
    })));

    // Find TW resource config
    const twResourceConfig = processedResourceConfig?.find((config: any) => 
      config.metadata?.type === 'words' || config.metadata?.id === 'tw'
    );
    
    console.log(`[REMARK TITLE FETCH DEBUG] 🔍 Found TW resource config:`, twResourceConfig?.metadata);
    
    if (!twResourceConfig || !resourceManager) {
      console.warn('[REMARK TITLE FETCH DEBUG] ⚠️ TW resource config not found or no resourceManager');
      return getDefaultTWTitle(wordId);
    }

    // Parse wordId to get category and term (e.g., "kt/faith" -> category: "kt", term: "faith")
    const parts = wordId.split('/');
    const category = parts[0] || 'kt';
    const term = parts[1] || wordId;
    
    // Construct article ID in the format expected by Door43TranslationWordsAdapter
    const articleId = `bible/${category}/${term}`;
    const contentKey = `${twResourceConfig.metadata.server}/${twResourceConfig.metadata.owner}/${twResourceConfig.metadata.language}/${twResourceConfig.metadata.id}/${articleId}`;
    
    console.log(`[REMARK TITLE FETCH DEBUG] 🔍 Fetching TW title for: ${wordId} (key: ${contentKey})`);
    
    const content = await resourceManager.getOrFetchContent(
      contentKey,
      twResourceConfig.metadata.type as ResourceType
    );
    
    console.log(`[REMARK TITLE FETCH DEBUG] 📦 TW Content received:`, {
      hasContent: !!content,
      contentKeys: content ? Object.keys(content) : [],
      contentStructure: content ? {
        hasWord: !!(content as any).word,
        wordKeys: (content as any).word ? Object.keys((content as any).word) : [],
        wordTerm: (content as any).word?.term,
        fullContent: content
      } : null
    });
    
    if (content && (content as any).word?.term) {
      const title = (content as any).word.term;
      titleCache.set(cacheKey, title);
      console.log(`[REMARK TITLE FETCH DEBUG] ✅ Fetched TW title: ${wordId} -> "${title}"`);
      return title;
    }
  } catch (error) {
    console.error(`[REMARK TITLE FETCH DEBUG] ❌ Failed to fetch TW title for ${wordId}:`, error);
  }
  
  const defaultTitle = getDefaultTWTitle(wordId);
  titleCache.set(cacheKey, defaultTitle);
  return defaultTitle;
}

/**
 * Generate default TA title from article ID
 */
function getDefaultTATitle(articleId: string): string {
  const parts = articleId.split('/');
  const article = parts[parts.length - 1] || articleId;
  
  // Convert from kebab-case to title case
  return article
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/^Figs /, 'Figures of Speech: ')
    .replace(/^Translate /, 'How to Translate ');
}

/**
 * Generate default TW title from word ID
 */
function getDefaultTWTitle(wordId: string): string {
  const parts = wordId.split('/');
  const term = parts[parts.length - 1] || wordId;
  
  // Convert from kebab-case to title case
  return term
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Custom Door43 Link Component
 */
const Door43Link: React.FC<{
  parsedLink: ParsedRcLink;
  children: React.ReactNode;
  title?: string;
  handlers?: Door43LinkHandlers;
  currentBook?: string;
}> = memo(({ parsedLink, children, title, handlers, currentBook }) => {
  // Create a unique key for this component instance
  const componentKey = `${parsedLink.resourceType}:${parsedLink.fullArticleId}`;
  
  // Check if we already have a cached title for this component
  const cachedComponentTitle = componentTitleCache.get(componentKey);
  
  const [fetchedTitle, setFetchedTitle] = useState<string | null>(cachedComponentTitle || null);
  // Start with loading state for TA/TW links ONLY if we don't have a cached title
  const [isLoadingTitle, setIsLoadingTitle] = useState(
    (parsedLink.resourceType === 'ta' || parsedLink.resourceType === 'tw') && !cachedComponentTitle
  );

  // Fetch title when component mounts or when resources change
  useEffect(() => {
    // Get resources from global store
    const { resourceManager, processedResourceConfig, lastUpdateId } = globalResourceStore;
    
    console.log(`[REMARK TITLE FETCH DEBUG] 🔧 Door43Link useEffect triggered:`, {
      resourceType: parsedLink.resourceType,
      fullArticleId: parsedLink.fullArticleId,
      hasResourceManager: !!resourceManager,
      hasProcessedResourceConfig: !!processedResourceConfig,
      configLength: processedResourceConfig?.length
    });

    if (!resourceManager || !processedResourceConfig) {
      console.warn(`[REMARK TITLE FETCH DEBUG] ⚠️ Missing dependencies for title fetching:`, {
        hasResourceManager: !!resourceManager,
        hasProcessedResourceConfig: !!processedResourceConfig
      });
      return;
    }

    // Skip if not TA or TW (we don't fetch titles for other types)
    if (parsedLink.resourceType !== 'ta' && parsedLink.resourceType !== 'tw') {
      return;
    }

    // Check if we already have this title in component cache (prevents re-fetching on re-renders)
    if (cachedComponentTitle) {
      console.log(`[REMARK TITLE FETCH DEBUG] 📋 Using component cached title: ${componentKey} -> "${cachedComponentTitle}"`);
      setFetchedTitle(cachedComponentTitle);
      setIsLoadingTitle(false);
      return;
    }

    // Check if we already have this title in global cache
    const cacheKey = `${parsedLink.resourceType}:${parsedLink.fullArticleId}`;
    if (titleCache.has(cacheKey)) {
      const cachedTitle = titleCache.get(cacheKey)!;
      console.log(`[REMARK TITLE FETCH DEBUG] 📋 Using global cached title: ${cacheKey} -> "${cachedTitle}"`);
      // Store in component cache for future re-renders
      componentTitleCache.set(componentKey, cachedTitle);
      setFetchedTitle(cachedTitle);
      setIsLoadingTitle(false);
      return;
    }

    const fetchTitle = async () => {
      setIsLoadingTitle(true);
      console.log(`[REMARK TITLE FETCH DEBUG] 🔄 Starting title fetch for ${parsedLink.resourceType}:${parsedLink.fullArticleId}`);
      
      try {
        let newTitle: string;
        
        if (parsedLink.resourceType === 'ta') {
          newTitle = await fetchTATitle(parsedLink.fullArticleId, resourceManager, processedResourceConfig);
        } else if (parsedLink.resourceType === 'tw') {
          newTitle = await fetchTWTitle(parsedLink.fullArticleId, resourceManager, processedResourceConfig);
        } else {
          console.log(`[REMARK TITLE FETCH DEBUG] ⏭️ Skipping title fetch for resource type: ${parsedLink.resourceType}`);
          return; // Don't fetch titles for other types
        }
        
        console.log(`[REMARK TITLE FETCH DEBUG] ✅ Title fetch completed:`, {
          resourceType: parsedLink.resourceType,
          articleId: parsedLink.fullArticleId,
          fetchedTitle: newTitle
        });
        // Store in both caches
        componentTitleCache.set(componentKey, newTitle);
        setFetchedTitle(newTitle);
      } catch (error) {
        console.error(`[REMARK TITLE FETCH DEBUG] ❌ Failed to fetch title for ${parsedLink.resourceType}:${parsedLink.fullArticleId}`, error);
      } finally {
        setIsLoadingTitle(false);
      }
    };

    fetchTitle();
  }, [parsedLink.resourceType, parsedLink.fullArticleId, globalResourceStore.lastUpdateId]);
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log(`🔗 Door43Link clicked: ${parsedLink.resourceType} - ${parsedLink.fullArticleId}`);
    
    switch (parsedLink.resourceType) {
      case 'ta':
        if (handlers?.onTALinkClick) {
          handlers.onTALinkClick(parsedLink.fullArticleId, title);
        } else {
          console.warn('No TA link handler provided');
        }
        break;
        
      case 'tw':
        if (handlers?.onTWLinkClick) {
          handlers.onTWLinkClick(parsedLink.fullArticleId, title);
        } else {
          console.warn('No TW link handler provided');
        }
        break;
        
      case 'tn':
        console.log('🧭 TN link details:', {
          bookCode: parsedLink.bookCode,
          chapter: parsedLink.chapter,
          verse: parsedLink.verse,
          currentBook,
          hasNavigationHandler: !!handlers?.onNavigationClick
        });
        
        if (parsedLink.bookCode && parsedLink.chapter && parsedLink.verse) {
          const bookCode = parsedLink.bookCode === 'navigation' && currentBook 
            ? currentBook 
            : parsedLink.bookCode;
            
          console.log('🧭 Calling navigation handler:', { bookCode, chapter: parsedLink.chapter, verse: parsedLink.verse });
          
          if (handlers?.onNavigationClick) {
            handlers.onNavigationClick(bookCode, parsedLink.chapter, parsedLink.verse, title);
          } else {
            console.warn('No navigation handler provided');
          }
        } else {
          console.warn('🧭 TN link missing required fields:', parsedLink);
        }
        break;
        
      case 'obs':
        // OBS links are disabled for now
        if (handlers?.onDisabledLinkClick) {
          handlers.onDisabledLinkClick(parsedLink, title);
        } else {
          console.log('OBS link clicked (disabled):', parsedLink);
        }
        break;
        
      default:
        console.warn('Unknown link type:', parsedLink);
    }
  };

  const getLinkStyle = (): string => {
    const baseStyle = "inline-flex items-center space-x-1 px-2 py-1 rounded-md text-sm transition-colors duration-200 cursor-pointer";
    
    switch (parsedLink.resourceType) {
      case 'ta':
        return `${baseStyle} bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100`;
      case 'tw':
        return `${baseStyle} bg-green-50 text-green-700 border border-green-200 hover:bg-green-100`;
      case 'tn':
        return `${baseStyle} bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100`;
      case 'obs':
        return `${baseStyle} bg-gray-50 text-gray-500 border border-gray-200 cursor-not-allowed opacity-60`;
      default:
        return `${baseStyle} bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100`;
    }
  };

  const getIcon = () => {
    switch (parsedLink.resourceType) {
      case 'ta': return 'academy';
      case 'tw': return 'translation-words';
      case 'tn': return 'search'; // Navigation/search icon for translation notes
      case 'obs': return 'book-open'; // Open book for OBS
      default: return 'file'; // Generic file icon for other links
    }
  };

  const getTooltip = (): string => {
    switch (parsedLink.resourceType) {
      case 'ta': 
        return `Translation Academy: ${parsedLink.fullArticleId}`;
      case 'tw': 
        return `Translation Words: ${parsedLink.fullArticleId}`;
      case 'tn': 
        if (parsedLink.bookCode && parsedLink.chapter && parsedLink.verse) {
          const bookCode = parsedLink.bookCode === 'navigation' && currentBook 
            ? currentBook 
            : parsedLink.bookCode;
          return `Navigate to ${bookCode.toUpperCase()} ${parsedLink.chapter}:${parsedLink.verse}`;
        }
        return 'Navigation link';
      case 'obs': 
        return `OBS ${parsedLink.chapter}:${parsedLink.verse} (not supported yet)`;
      default: 
        return 'Door43 resource link';
    }
  };

  const isClickable = parsedLink.resourceType !== 'obs';

  // Determine what title to display
  const displayTitle = fetchedTitle || title || getTooltip();
  
  // For TA and TW links, show the fetched title instead of children
  const shouldShowFetchedTitle = (parsedLink.resourceType === 'ta' || parsedLink.resourceType === 'tw') && fetchedTitle;

  return (
    <span
      className={getLinkStyle()}
      onClick={isClickable ? handleClick : undefined}
      onPointerDown={isClickable ? (e) => {
        console.log('🖱️ Door43Link pointerDown - calling handleClick directly');
        handleClick(e as any);
      } : undefined}
      title={getTooltip()}
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
    >
      <Icon name={getIcon()} size={12} className="flex-shrink-0" />
      <span>
        {shouldShowFetchedTitle ? fetchedTitle : (
          isLoadingTitle && (parsedLink.resourceType === 'ta' || parsedLink.resourceType === 'tw') 
            ? '...' 
            : children
        )}
      </span>
    </span>
  );
});

/**
 * Extract text content from HTML AST element
 */
function extractTextContent(node: Element): string {
  if (node.children) {
    return node.children
      .map((child: any) => {
        if (child.type === 'text') {
          return child.value;
        } else if (child.type === 'element' && child.children) {
          return extractTextContent(child);
        }
        return '';
      })
      .join('');
  }
  return '';
}

/**
 * Rehype plugin for Door43 links
 */
export function door43RehypePlugin(options: Door43RehypePluginOptions = {}) {
  return (tree: Node) => {
    
    // Only update global store if resources have actually changed
    const currentUpdateId = Date.now();
    if (globalResourceStore.resourceManager !== options.resourceManager || 
        globalResourceStore.processedResourceConfig !== options.processedResourceConfig) {
      globalResourceStore.resourceManager = options.resourceManager;
      globalResourceStore.processedResourceConfig = options.processedResourceConfig;
      globalResourceStore.lastUpdateId = currentUpdateId;
      console.log('[REMARK TITLE FETCH DEBUG] 📦 Updated global resource store');
    }
    
    let linkCount = 0;
    
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'a' && node.properties?.href) {
        const href = String(node.properties.href);
        linkCount++;
        console.log(`🔗 Processing link ${linkCount}: ${href}`);
        
        // Handle rc:// links
        if (href.startsWith('rc://')) {
          const parsedLink = parseRcLink(href);
          
          if (parsedLink.isValid) {
            // Get the text content for the title
            const textContent = extractTextContent(node);
            
            // Replace with custom Door43Link component
            node.tagName = 'Door43Link';
            node.properties = {
              parsedLink,
              title: textContent,
              handlers: options.handlers,
              currentBook: options.currentBook,
            };
            
            console.log(`🔄 Transformed rc:// link: ${href} -> ${parsedLink.resourceType}/${parsedLink.fullArticleId}`, {
              nodeTagName: node.tagName,
              nodeProperties: node.properties
            });
          }
        }
        
        // Handle relative links
        else if (isRelativeLink(href)) {
          const parsedLink = parseRelativeLink(href);
          
          if (parsedLink.isValid) {
            // Get the text content for the title
            const textContent = extractTextContent(node);
            
            // Replace with custom Door43Link component
            node.tagName = 'Door43Link';
            node.properties = {
              parsedLink,
              title: textContent,
              handlers: options.handlers,
              currentBook: options.currentBook,
            };
            
            console.log(`🔄 Transformed relative link: ${href} -> ${parsedLink.resourceType}/${parsedLink.fullArticleId}`, {
              nodeTagName: node.tagName,
              nodeProperties: node.properties
            });
          }
        }
      }
    });
    
  };
}

/**
 * Component registry for rehype-react
 */
export const door43Components = {
  Door43Link
};

export default door43RehypePlugin;
