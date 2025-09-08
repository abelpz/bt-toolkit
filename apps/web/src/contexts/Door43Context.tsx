/**
 * Door43 Context Provider
 * Manages server, organization, language, and available books configuration
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { offlineCache } from '../services/offline-cache';
import { fetchResourceMetadata } from '../services/door43-api';

export interface Door43Config {
  server: string;
  organization: string;
  language: string;
  resourceType: string; // e.g., 'ult', 'ust', etc.
}

export interface BookInfo {
  code: string;
  name: string;
  testament: 'OT' | 'NT';
  chapters: number;
  available: boolean;
}

export interface ResourceInfo {
  resourceType: string;
  title: string;
  description: string;
  icon: string;
  available: boolean;
}

export interface Door43ContextType {
  config: Door43Config;
  availableBooks: BookInfo[];
  availableResources: ResourceInfo[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  updateConfig: (newConfig: Partial<Door43Config>) => void;
  refreshBooks: () => Promise<void>;
  refreshResources: () => Promise<void>;
  
  // Utilities
  getBookInfo: (bookCode: string) => BookInfo | undefined;
  isBookAvailable: (bookCode: string) => boolean;
  getResourceInfo: (resourceType: string) => ResourceInfo | undefined;
  isResourceAvailable: (resourceType: string) => boolean;
}

const defaultConfig: Door43Config = {
  server: 'https://git.door43.org',
  organization: 'unfoldingWord',
  language: 'en',
  resourceType: 'ult'
};

// Default book list with standard biblical books
const DEFAULT_BOOKS: BookInfo[] = [
  // Old Testament
  { code: 'gen', name: 'Genesis', testament: 'OT', chapters: 50, available: false },
  { code: 'exo', name: 'Exodus', testament: 'OT', chapters: 40, available: false },
  { code: 'lev', name: 'Leviticus', testament: 'OT', chapters: 27, available: false },
  { code: 'num', name: 'Numbers', testament: 'OT', chapters: 36, available: false },
  { code: 'deu', name: 'Deuteronomy', testament: 'OT', chapters: 34, available: false },
  { code: 'jos', name: 'Joshua', testament: 'OT', chapters: 24, available: false },
  { code: 'jdg', name: 'Judges', testament: 'OT', chapters: 21, available: false },
  { code: 'rut', name: 'Ruth', testament: 'OT', chapters: 4, available: false },
  { code: '1sa', name: '1 Samuel', testament: 'OT', chapters: 31, available: false },
  { code: '2sa', name: '2 Samuel', testament: 'OT', chapters: 24, available: false },
  { code: '1ki', name: '1 Kings', testament: 'OT', chapters: 22, available: false },
  { code: '2ki', name: '2 Kings', testament: 'OT', chapters: 25, available: false },
  { code: '1ch', name: '1 Chronicles', testament: 'OT', chapters: 29, available: false },
  { code: '2ch', name: '2 Chronicles', testament: 'OT', chapters: 36, available: false },
  { code: 'ezr', name: 'Ezra', testament: 'OT', chapters: 10, available: false },
  { code: 'neh', name: 'Nehemiah', testament: 'OT', chapters: 13, available: false },
  { code: 'est', name: 'Esther', testament: 'OT', chapters: 10, available: false },
  { code: 'job', name: 'Job', testament: 'OT', chapters: 42, available: false },
  { code: 'psa', name: 'Psalms', testament: 'OT', chapters: 150, available: false },
  { code: 'pro', name: 'Proverbs', testament: 'OT', chapters: 31, available: false },
  { code: 'ecc', name: 'Ecclesiastes', testament: 'OT', chapters: 12, available: false },
  { code: 'sng', name: 'Song of Songs', testament: 'OT', chapters: 8, available: false },
  { code: 'isa', name: 'Isaiah', testament: 'OT', chapters: 66, available: false },
  { code: 'jer', name: 'Jeremiah', testament: 'OT', chapters: 52, available: false },
  { code: 'lam', name: 'Lamentations', testament: 'OT', chapters: 5, available: false },
  { code: 'ezk', name: 'Ezekiel', testament: 'OT', chapters: 48, available: false },
  { code: 'dan', name: 'Daniel', testament: 'OT', chapters: 12, available: false },
  { code: 'hos', name: 'Hosea', testament: 'OT', chapters: 14, available: false },
  { code: 'jol', name: 'Joel', testament: 'OT', chapters: 3, available: false },
  { code: 'amo', name: 'Amos', testament: 'OT', chapters: 9, available: false },
  { code: 'oba', name: 'Obadiah', testament: 'OT', chapters: 1, available: false },
  { code: 'jon', name: 'Jonah', testament: 'OT', chapters: 4, available: false },
  { code: 'mic', name: 'Micah', testament: 'OT', chapters: 7, available: false },
  { code: 'nam', name: 'Nahum', testament: 'OT', chapters: 3, available: false },
  { code: 'hab', name: 'Habakkuk', testament: 'OT', chapters: 3, available: false },
  { code: 'zep', name: 'Zephaniah', testament: 'OT', chapters: 3, available: false },
  { code: 'hag', name: 'Haggai', testament: 'OT', chapters: 2, available: false },
  { code: 'zec', name: 'Zechariah', testament: 'OT', chapters: 14, available: false },
  { code: 'mal', name: 'Malachi', testament: 'OT', chapters: 4, available: false },
  
  // New Testament
  { code: 'mat', name: 'Matthew', testament: 'NT', chapters: 28, available: false },
  { code: 'mrk', name: 'Mark', testament: 'NT', chapters: 16, available: false },
  { code: 'luk', name: 'Luke', testament: 'NT', chapters: 24, available: false },
  { code: 'jhn', name: 'John', testament: 'NT', chapters: 21, available: false },
  { code: 'act', name: 'Acts', testament: 'NT', chapters: 28, available: false },
  { code: 'rom', name: 'Romans', testament: 'NT', chapters: 16, available: false },
  { code: '1co', name: '1 Corinthians', testament: 'NT', chapters: 16, available: false },
  { code: '2co', name: '2 Corinthians', testament: 'NT', chapters: 13, available: false },
  { code: 'gal', name: 'Galatians', testament: 'NT', chapters: 6, available: false },
  { code: 'eph', name: 'Ephesians', testament: 'NT', chapters: 6, available: false },
  { code: 'php', name: 'Philippians', testament: 'NT', chapters: 4, available: false },
  { code: 'col', name: 'Colossians', testament: 'NT', chapters: 4, available: false },
  { code: '1th', name: '1 Thessalonians', testament: 'NT', chapters: 5, available: false },
  { code: '2th', name: '2 Thessalonians', testament: 'NT', chapters: 3, available: false },
  { code: '1ti', name: '1 Timothy', testament: 'NT', chapters: 6, available: false },
  { code: '2ti', name: '2 Timothy', testament: 'NT', chapters: 4, available: false },
  { code: 'tit', name: 'Titus', testament: 'NT', chapters: 3, available: false },
  { code: 'phm', name: 'Philemon', testament: 'NT', chapters: 1, available: false },
  { code: 'heb', name: 'Hebrews', testament: 'NT', chapters: 13, available: false },
  { code: 'jas', name: 'James', testament: 'NT', chapters: 5, available: false },
  { code: '1pe', name: '1 Peter', testament: 'NT', chapters: 5, available: false },
  { code: '2pe', name: '2 Peter', testament: 'NT', chapters: 3, available: false },
  { code: '1jn', name: '1 John', testament: 'NT', chapters: 5, available: false },
  { code: '2jn', name: '2 John', testament: 'NT', chapters: 1, available: false },
  { code: '3jn', name: '3 John', testament: 'NT', chapters: 1, available: false },
  { code: 'jud', name: 'Jude', testament: 'NT', chapters: 1, available: false },
  { code: 'rev', name: 'Revelation', testament: 'NT', chapters: 22, available: false },
];

const Door43Context = createContext<Door43ContextType | undefined>(undefined);

export const Door43Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<Door43Config>(defaultConfig);
  const [availableBooks, setAvailableBooks] = useState<BookInfo[]>(DEFAULT_BOOKS);
  const [availableResources, setAvailableResources] = useState<ResourceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get resource icons
  const getResourceIcon = (resourceType: string): string => {
    const iconMap: Record<string, string> = {
      'ult': '📖',
      'ust': '📚', 
      'tn': '📝',
      'glt': '🌍',
      'ulb': '📜',
      'udb': '📘',
      'reg': '📄'
    };
    return iconMap[resourceType] || '📄';
  };

  // Fetch available resources for the current organization/language using the new API
  const fetchAvailableResources = useCallback(async (orgParam?: string, langParam?: string) => {
    const org = orgParam || config.organization;
    const lang = langParam || config.language;
    
    // Use organization-specific resource types to avoid 404s
    let resourceTypes;
    if (org === 'unfoldingWord') {
      // unfoldingWord typically has ult, ust, tn, ulb, udb
      resourceTypes = ['ult', 'ust', 'tn', 'ulb', 'udb'];
    } else {
      // Other organizations might have different resources
      resourceTypes = ['ult', 'ust', 'tn', 'glt', 'ulb', 'udb', 'reg'];
    }
    
    const resources: ResourceInfo[] = [];
    
    console.log(`🔍 Fetching available resources for ${org}/${lang}...`);
    
    for (const resourceType of resourceTypes) {
      const repositoryId = `${lang}_${resourceType}`;
      
      try {
        // Use the new fetchResourceMetadata function with caching
        const metadata = await fetchResourceMetadata(org, repositoryId);
        
        if (metadata) {
          resources.push({
            resourceType,
            // Use the clean API title from metadata, fallback to resourceType
            title: metadata.metadata?.title || resourceType.toUpperCase(),
            description: metadata.metadata?.description || `${resourceType.toUpperCase()} resource`,
            icon: getResourceIcon(resourceType),
            available: true
          });
          
          console.log(`✅ Found resource ${resourceType}: "${metadata.metadata?.title}"`);
        }
      } catch (error) {
        console.log(`❌ Resource ${resourceType} not available:`, error);
      }
    }
    
    console.log(`📋 Found ${resources.length} available resources`);
    return resources;
  }, [config.organization, config.language]); // Include config dependencies

  // Fetch available books from repository with resource fallback
  const fetchAvailableBooks = useCallback(async (skipResourceFetch = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // Only fetch resources if not already done or explicitly requested
      if (!skipResourceFetch && availableResources.length === 0) {
        console.log('🔄 Fetching resources as part of book fetch...');
        const resources = await fetchAvailableResources(config.organization, config.language);
        setAvailableResources(resources);
      }

      // Resource priority order based on organization
      let resourcePriority;
      if (config.organization === 'unfoldingWord') {
        // unfoldingWord typically has ult, ust, ulb, udb
        resourcePriority = ['ult', 'ust', 'ulb', 'udb'];
      } else {
        // Other organizations might have different resources
        resourcePriority = ['ult', 'ust', 'glt', 'ulb', 'udb', 'reg'];
      }
      let foundResource = null;
      let repositoryContents = null;
      let finalUrl = '';

      // Try each resource type in priority order
      for (const resourceType of resourcePriority) {
        const repositoryId = `${config.language}_${resourceType}`;
        const url = `${config.server}/api/v1/repos/${config.organization}/${repositoryId}/contents`;
        
        console.log(`🔍 Trying resource: ${resourceType} at ${url}`);
        
        try {
          const response = await fetch(url);
          if (response.ok) {
            repositoryContents = await response.json();
            foundResource = resourceType;
            finalUrl = url;
            console.log(`✅ Found resource: ${resourceType}`);
            
            // Update config if we found a different resource than requested
            if (resourceType !== config.resourceType) {
              console.log(`🔄 Updating resource type from ${config.resourceType} to ${resourceType}`);
              setConfig(prev => ({ ...prev, resourceType }));
            }
            break;
          } else {
            console.log(`❌ Resource ${resourceType} not found (${response.status})`);
          }
        } catch (fetchError) {
          console.log(`❌ Error fetching ${resourceType}:`, fetchError);
          continue;
        }
      }

      if (!foundResource || !repositoryContents) {
        throw new Error(`No available resources found for ${config.organization}/${config.language}`);
      }

      console.log('🌐 Successfully fetching from URL:', finalUrl);
      console.log('📋 Using config:', { ...config, resourceType: foundResource });

      console.log(`📁 Repository contents:`, repositoryContents);
      
      // Try to get manifest from cache first, then fetch if needed
      let manifestBooks: BookInfo[] = [];
      const manifestContext = { organization: config.organization, language: config.language, resourceType: foundResource };
      
      try {
        // Check cache first
        const cachedManifest = await offlineCache.getCachedManifest(manifestContext);
        
        if (cachedManifest && await offlineCache.isManifestCacheValid(manifestContext)) {
          console.log('📋 Using cached manifest data');
          manifestBooks = cachedManifest.parsedBooks;
        } else {
          // Fetch manifest from server
          const manifestUrl = `${config.server}/api/v1/repos/${config.organization}/${config.language}_${foundResource}/contents/manifest.yaml`;
          console.log('📋 Fetching manifest from:', manifestUrl);
          
          const manifestResponse = await fetch(manifestUrl);
          if (manifestResponse.ok) {
            const manifestFile = await manifestResponse.json();
            
            // Fetch the actual manifest content
            const manifestContentResponse = await fetch(manifestFile.download_url);
            if (manifestContentResponse.ok) {
              const manifestContent = await manifestContentResponse.text();
              console.log('📋 Manifest content received');
            
            // Parse YAML manifest (improved parsing for projects section)
            const projectMatches = manifestContent.match(/projects:\s*\n((?:\s*-.*(?:\n(?:\s{2,}.*)?)*)*)/s);
            if (projectMatches) {
              const projectsSection = projectMatches[1];
              
              // Split by project entries (lines starting with "- title:")
              const projectBlocks = projectsSection.split(/\n\s*-\s*title:\s*/).filter(block => block.trim());
              
              projectBlocks.forEach((block, index) => {
                // For the first block, it might already have the title, for others we need to add it back
                const fullBlock = index === 0 ? block : `title: ${block}`;
                
                const titleMatch = fullBlock.match(/title:\s*(.+)/);
                const identifierMatch = fullBlock.match(/identifier:\s*(\w+)/);
                const sortMatch = fullBlock.match(/sort:\s*(\d+)/);
                const categoryMatch = fullBlock.match(/categories:\s*\n\s*-\s*(bible-(?:ot|nt))/);
                
                if (titleMatch && identifierMatch) {
                  const title = titleMatch[1].trim();
                  const identifier = identifierMatch[1].toLowerCase();
                  const sort = sortMatch ? parseInt(sortMatch[1]) : 0;
                  const testament = categoryMatch && categoryMatch[1] === 'bible-nt' ? 'NT' : 'OT';
                  
                  // Enhanced chapter estimates based on biblical books
                  const chapterEstimates: { [key: string]: number } = {
                    // Old Testament
                    'rut': 4, 'est': 10, 'jon': 4, 'dan': 12, 'ezr': 10, 'neh': 13,
                    'gen': 50, 'exo': 40, 'lev': 27, 'num': 36, 'deu': 34,
                    'jos': 24, 'jdg': 21, '1sa': 31, '2sa': 24, '1ki': 22, '2ki': 25,
                    '1ch': 29, '2ch': 36, 'job': 42, 'psa': 150, 'pro': 31, 'ecc': 12,
                    'sng': 8, 'isa': 66, 'jer': 52, 'lam': 5, 'ezk': 48,
                    'hos': 14, 'jol': 3, 'amo': 9, 'oba': 1, 'mic': 7, 'nam': 3,
                    'hab': 3, 'zep': 3, 'hag': 2, 'zec': 14, 'mal': 4,
                    // New Testament  
                    'tit': 3, '3jn': 1, '2jn': 1, '1jn': 5, 'jud': 1, 'phm': 1,
                    'mat': 28, 'mrk': 16, 'luk': 24, 'jhn': 21, 'act': 28,
                    'rom': 16, '1co': 16, '2co': 13, 'gal': 6, 'eph': 6, 'php': 4,
                    'col': 4, '1th': 5, '2th': 3, '1ti': 6, '2ti': 4,
                    'heb': 13, 'jas': 5, '1pe': 5, '2pe': 3, 'rev': 22
                  };
                  const chapters = chapterEstimates[identifier] || 1;
                  
                  manifestBooks.push({
                    code: identifier,
                    name: title,
                    testament,
                    chapters,
                    available: true
                  });
                }
              });
              
              // Sort books by their sort order from manifest
              manifestBooks.sort((a, b) => {
                const aSort = manifestContent.match(new RegExp(`identifier:\\s*${a.code}[\\s\\S]*?sort:\\s*(\\d+)`))?.[1];
                const bSort = manifestContent.match(new RegExp(`identifier:\\s*${b.code}[\\s\\S]*?sort:\\s*(\\d+)`))?.[1];
                return (parseInt(aSort || '0') || 0) - (parseInt(bSort || '0') || 0);
              });
              
              console.log(`📚 Found ${manifestBooks.length} books from manifest:`, manifestBooks.map(b => `${b.code} (${b.name})`));
              
              // Cache the manifest data
              try {
                await offlineCache.cacheManifest(
                  manifestContext,
                  manifestContent,
                  manifestBooks,
                  manifestFile.sha,
                  manifestFile.size,
                  manifestFile.last_commit_sha
                );
                console.log('💾 Manifest cached successfully');
              } catch (cacheError) {
                console.warn('⚠️ Failed to cache manifest:', cacheError);
              }
            }
          }
        }
      }
      } catch (manifestError) {
        console.log('⚠️ Could not fetch manifest, falling back to USFM file detection:', manifestError);
      }
      
      // If manifest parsing succeeded, use those books
      if (manifestBooks.length > 0) {
        setAvailableBooks(manifestBooks);
        console.log(`📚 Using ${manifestBooks.length} books from manifest`);
      } else {
        // Fallback to USFM file detection
        const usfmFiles = repositoryContents.filter((file: any) => 
          file.name.endsWith('.usfm') && file.type === 'file'
        );
        
        console.log(`📄 USFM files found:`, usfmFiles.map((f: any) => f.name));

        // Extract book codes from filenames
        const availableBookCodes = new Set<string>();
        usfmFiles.forEach((file: any) => {
          // Handle different filename patterns: "01-GEN.usfm", "gen.usfm", etc.
          const filename = file.name.toLowerCase().replace('.usfm', '');
          
          // Try different patterns
          let bookCode = '';
          if (filename.includes('-')) {
            // Pattern: "01-GEN.usfm" -> "gen"
            bookCode = filename.split('-')[1]?.toLowerCase();
          } else {
            // Pattern: "gen.usfm" -> "gen"
            bookCode = filename.toLowerCase();
          }
          
          if (bookCode && bookCode.length >= 3) {
            availableBookCodes.add(bookCode);
          }
        });

        // Update book availability from default list
        const updatedBooks = DEFAULT_BOOKS.map(book => ({
          ...book,
          available: availableBookCodes.has(book.code.toLowerCase())
        })).filter(book => book.available); // Only include available books

        // If no books found, use fallback
        if (availableBookCodes.size === 0) {
          console.log('📚 No USFM files found, using fallback books');
          const fallbackBooks = DEFAULT_BOOKS.map(book => ({
            ...book,
            available: ['jon', 'phm', 'mat', 'mrk', 'luk', 'jhn'].includes(book.code)
          })).filter(book => book.available);
          setAvailableBooks(fallbackBooks);
        } else {
          setAvailableBooks(updatedBooks);
          console.log(`📚 Found ${availableBookCodes.size} available books from USFM files`);
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch available books';
      setError(errorMessage);
      console.error('Error fetching available books:', err);
      
      // Fallback: mark some common books as available
      const fallbackBooks = DEFAULT_BOOKS.map(book => ({
        ...book,
        available: ['jon', 'phm', 'mat', 'mrk', 'luk', 'jhn'].includes(book.code)
      }));
      setAvailableBooks(fallbackBooks);
      
      console.log('📚 Using fallback book list with common books available');
      console.log('📚 Fallback books:', fallbackBooks.filter(b => b.available).map(b => b.code));
    } finally {
      setIsLoading(false);
    }
  }, [availableResources.length]); // Only depend on whether resources are loaded

  // Separate effect for initial load
  useEffect(() => {
    fetchAvailableBooks();
  }, []); // Only run once on mount

  // Separate effect for config changes that require refetching
  useEffect(() => {
    const configChanged = config.organization !== defaultConfig.organization || 
                         config.language !== defaultConfig.language;
    
    if (configChanged) {
      console.log('🔄 Config changed, refetching resources and books...');
      // Clear existing data first
      setAvailableResources([]);
      setAvailableBooks(DEFAULT_BOOKS);
      // Then fetch new data
      fetchAvailableBooks();
    }
  }, [config.organization, config.language]); // Only depend on org/lang changes

  const updateConfig = useCallback((newConfig: Partial<Door43Config>) => {
    console.log('🔄 Updating Door43 config:', newConfig);
    const updatedConfig = { ...config, ...newConfig };
    console.log('📝 New config will be:', updatedConfig);
    setConfig(updatedConfig);
  }, [config]);

  const refreshBooks = useCallback(async () => {
    await fetchAvailableBooks();
  }, [fetchAvailableBooks]);

  // Separate function to refresh resources only
  const refreshResources = useCallback(async () => {
    console.log('🔄 Refreshing resources...');
    const resources = await fetchAvailableResources(config.organization, config.language);
    setAvailableResources(resources);
  }, [fetchAvailableResources, config.organization, config.language]);

  const getBookInfo = useCallback((bookCode: string): BookInfo | undefined => {
    return availableBooks.find(book => book.code.toLowerCase() === bookCode.toLowerCase());
  }, [availableBooks]);

  const isBookAvailable = useCallback((bookCode: string): boolean => {
    const book = getBookInfo(bookCode);
    return book?.available ?? false;
  }, [getBookInfo]);

  const getResourceInfo = useCallback((resourceType: string): ResourceInfo | undefined => {
    return availableResources.find(resource => resource.resourceType.toLowerCase() === resourceType.toLowerCase());
  }, [availableResources]);

  const isResourceAvailable = useCallback((resourceType: string): boolean => {
    const resource = getResourceInfo(resourceType);
    return resource?.available ?? false;
  }, [getResourceInfo]);

  const contextValue: Door43ContextType = {
    config,
    availableBooks,
    availableResources,
    isLoading,
    error,
    updateConfig,
    refreshBooks,
    refreshResources,
    getBookInfo,
    isBookAvailable,
    getResourceInfo,
    isResourceAvailable
  };

  return (
    <Door43Context.Provider value={contextValue}>
      {children}
    </Door43Context.Provider>
  );
};

export const useDoor43 = (): Door43ContextType => {
  const context = useContext(Door43Context);
  if (context === undefined) {
    throw new Error('useDoor43 must be used within a Door43Provider');
  }
  return context;
};

export default Door43Context;
