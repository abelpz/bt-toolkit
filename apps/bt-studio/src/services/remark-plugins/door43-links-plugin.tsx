/**
 * Remark Plugin for Door43 Links
 * 
 * Transforms rc:// links and relative links into interactive components
 * that can trigger navigation or open modals.
 */

import React from 'react';
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

export interface Door43LinkHandlers {
  onTALinkClick?: (articleId: string, title?: string) => void;
  onTWLinkClick?: (wordId: string, title?: string) => void;
  onNavigationClick?: (bookCode: string, chapter: number, verse: number, title?: string) => void;
  onDisabledLinkClick?: (linkInfo: ParsedRcLink, title?: string) => void;
}

export interface Door43LinksPluginOptions {
  handlers?: Door43LinkHandlers;
  currentBook?: string; // For resolving relative navigation links
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
}> = ({ parsedLink, children, title, handlers, currentBook }) => {
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    console.log(`🔗 Door43Link clicked:`, parsedLink);
    
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
        if (parsedLink.bookCode && parsedLink.chapter && parsedLink.verse) {
          const bookCode = parsedLink.bookCode === 'navigation' && currentBook 
            ? currentBook 
            : parsedLink.bookCode;
            
          if (handlers?.onNavigationClick) {
            handlers.onNavigationClick(bookCode, parsedLink.chapter, parsedLink.verse, title);
          } else {
            console.warn('No navigation handler provided');
          }
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
        return `${baseStyle} bg-green-600 text-white border border-green-700 hover:bg-green-700`;
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
      case 'tn': return 'search';
      case 'obs': return 'book-open';
      default: return 'file';
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

  return (
    <span
      className={getLinkStyle()}
      onClick={parsedLink.resourceType !== 'obs' ? handleClick : undefined}
      title={getTooltip()}
    >
      <Icon name={getIcon()} size={12} className="flex-shrink-0" />
      <span>{children}</span>
    </span>
  );
};

/**
 * Transform rc:// links in the markdown AST (before HTML conversion)
 */
function transformRcLinks(tree: Node, options: Door43LinksPluginOptions) {
  visit(tree, 'link', (node: any) => {
    const url = node.url;
    
    if (!url) return;
    
    // Handle rc:// links
    if (url.startsWith('rc://')) {
      const parsedLink = parseRcLink(url);
      
      if (parsedLink.isValid) {
        // Get the text content for the title
        const textContent = extractTextFromChildren(node.children);
        
        // Transform to a custom node that rehype-react will recognize
        node.type = 'door43Link';
        node.data = {
          hName: 'Door43Link',
          hProperties: {
            parsedLink,
            title: textContent,
            handlers: options.handlers,
            currentBook: options.currentBook
          }
        };
        
        console.log(`🔄 Transformed rc:// link: ${url} -> ${parsedLink.resourceType}/${parsedLink.fullArticleId}`);
      }
    }
    
    // Handle relative links
    else if (isRelativeLink(url)) {
      const parsedLink = parseRelativeLink(url);
      
      if (parsedLink.isValid) {
        // Get the text content for the title
        const textContent = extractTextFromChildren(node.children);
        
        // Transform to a custom node that rehype-react will recognize
        node.type = 'door43Link';
        node.data = {
          hName: 'Door43Link',
          hProperties: {
            parsedLink,
            title: textContent,
            handlers: options.handlers,
            currentBook: options.currentBook
          }
        };
        
        console.log(`🔄 Transformed relative link: ${url} -> ${parsedLink.resourceType}/${parsedLink.fullArticleId}`);
      }
    }
  });
}

/**
 * Extract text content from markdown AST children
 */
function extractTextFromChildren(children: any[]): string {
  if (!children) return '';
  
  return children
    .map((child: any) => {
      if (child.type === 'text') {
        return child.value;
      } else if (child.type === 'strong' || child.type === 'emphasis') {
        return extractTextFromChildren(child.children);
      }
      return '';
    })
    .join('');
}

/**
 * Remark plugin for Door43 links
 */
export function door43LinksPlugin(options: Door43LinksPluginOptions = {}) {
  return (tree: Node) => {
    transformRcLinks(tree, options);
  };
}

/**
 * Component registry for rehype-react
 */
export const door43Components = {
  Door43Link
};

export default door43LinksPlugin;
