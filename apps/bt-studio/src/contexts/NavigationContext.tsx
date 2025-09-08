/**
 * NavigationContext - Zustand-based navigation state management
 * 
 * This context manages the navigation state including:
 * - Current book and reference position
 * - Available books and their metadata
 * - URL synchronization
 * - Reference parsing and validation
 */

import { createContext, useContext, useEffect, useRef } from 'react'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { devtools } from 'zustand/middleware'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { 
  NavigationStore, 
  NavigationProviderProps, 
  NavigationReference, 
  BookInfo,
  ResourceType,
  TranslatorSection
} from '../types/context'
import { useWorkspace } from './WorkspaceContext'
import { storeParams } from '../utils/urlParams'

// ============================================================================
// ZUSTAND STORE DEFINITION
// ============================================================================

const useNavigationStore = create<NavigationStore>()(
  devtools(
    immer((set, get) => ({
      // ========================================================================
      // INITIAL STATE
      // ========================================================================
      currentBook: 'tit',  // Updated to match new default
      currentReference: {
        book: 'tit',
        chapter: 1,
        verse: 1
      },
      availableBooks: [
        { code: 'gen', name: 'Genesis', testament: 'OT' },
        { code: 'exo', name: 'Exodus', testament: 'OT' },
        { code: 'mat', name: 'Matthew', testament: 'NT' },
        { code: 'jhn', name: 'John', testament: 'NT' },
        { code: 'tit', name: 'Titus', testament: 'NT' }
      ],

      // ========================================================================
      // NAVIGATION ACTIONS
      // ========================================================================
      
      navigateToBook: (bookCode: string) => {
        console.log(`📖 Navigating to book: ${bookCode}`)
        
        const bookInfo = get().getBookInfo(bookCode)
        if (!bookInfo) {
          console.warn(`❌ Book not found: ${bookCode}`)
          return
        }

        set((state) => {
          state.currentBook = bookCode
          state.currentReference = {
            book: bookCode,
            chapter: 1,
            verse: 1
          }
        })

        // Update URL
        get().updateURL(get().currentReference)
        
        // Note: Content loading will be handled by components that need chapter/verse data
      },

      navigateToReference: (reference: NavigationReference) => {
        console.log(`🎯 Navigating to reference:`, reference)
        
        // Validate the reference
        const bookInfo = get().getBookInfo(reference.book)
        if (!bookInfo) {
          console.warn(`❌ Invalid book: ${reference.book}`)
          return
        }

        // Validate chapter and verse ranges
        const maxChapters = bookInfo.chapters || 999 // Use a high number if chapters not available
        const chapter = Math.max(1, Math.min(reference.chapter || 1, maxChapters))
        const verse = Math.max(1, reference.verse || 1)

        const validatedReference: NavigationReference = {
          book: reference.book,
          chapter,
          verse,
          endChapter: reference.endChapter,
          endVerse: reference.endVerse
        }

        set((state) => {
          state.currentBook = reference.book
          state.currentReference = validatedReference
        })

        // Update URL
        get().updateURL(validatedReference)
      },

      navigateToChapter: (chapter: number) => {
        const currentRef = get().currentReference
        const bookInfo = get().getBookInfo(currentRef.book)
        
        if (!bookInfo) {
          console.warn(`❌ No book info for: ${currentRef.book}`)
          return
        }

        const validChapter = Math.max(1, Math.min(chapter, bookInfo.chapters || 1))
        
        get().navigateToReference({
          book: currentRef.book,
          chapter: validChapter,
          verse: 1
        })
      },

      navigateToVerse: (verse: number) => {
        const currentRef = get().currentReference
        
        get().navigateToReference({
          book: currentRef.book,
          chapter: currentRef.chapter || 1,
          verse: Math.max(1, verse)
        })
      },

      navigateToRange: (startChapter: number, startVerse: number, endChapter?: number, endVerse?: number) => {
        const currentRef = get().currentReference
        
        get().navigateToReference({
          book: currentRef.book,
          chapter: startChapter,
          verse: startVerse,
          endChapter,
          endVerse
        })
      },

      // ========================================================================
      // URL SYNCHRONIZATION ACTIONS
      // ========================================================================
      
      updateURL: (reference: NavigationReference) => {
        // This will be called by the provider component that has access to navigate
        // Check if a global URL updater is available
        const globalUpdater = (window as any).navigationUpdateURL
        if (globalUpdater) {
          globalUpdater(reference)
        }
      },

      parseURLReference: (ref: string): NavigationReference | null => {
        if (!ref) return null

        try {
          // Parse reference formats:
          // - "1" -> chapter 1
          // - "1:4" -> chapter 1, verse 4
          // - "1:4-6" -> chapter 1, verses 4-6
          // - "1:4-2:6" -> chapter 1 verse 4 to chapter 2 verse 6
          
          const parts = ref.split('-')
          const startPart = parts[0]
          const endPart = parts[1]

          // Parse start reference
          const startMatch = startPart.match(/^(\d+)(?::(\d+))?$/)
          if (!startMatch) return null

          const startChapter = parseInt(startMatch[1], 10)
          const startVerse = startMatch[2] ? parseInt(startMatch[2], 10) : undefined

          let endChapter: number | undefined
          let endVerse: number | undefined

          // Parse end reference if it exists
          if (endPart) {
            const endMatch = endPart.match(/^(?:(\d+):)?(\d+)$/)
            if (endMatch) {
              endChapter = endMatch[1] ? parseInt(endMatch[1], 10) : startChapter
              endVerse = parseInt(endMatch[2], 10)
            }
          }

          const currentBook = get().currentBook

          return {
            book: currentBook,
            chapter: startChapter,
            verse: startVerse,
            endChapter,
            endVerse
          }
        } catch (error) {
          console.warn('❌ Failed to parse reference:', ref, error)
          return null
        }
      },

      // ========================================================================
      // BOOK MANAGEMENT ACTIONS
      // ========================================================================
      
      setAvailableBooks: (books: BookInfo[]) => {
        console.log(`📚 Setting available books: ${books.length} books`)
        
        set((state) => {
          state.availableBooks = books
        })
      },

      getBookInfo: (bookCode: string): BookInfo | null => {
        return get().availableBooks.find(book => book.code === bookCode) || null
      },

      // Load book content and extract chapter/verse info
      // This method will be enhanced by the NavigationProvider component
      loadBookContent: async (bookCode: string) => {
        console.log(`📖 Navigation requesting content for book: ${bookCode}`)
        // This will be implemented via the provider component that has access to workspace
        return null
      },

      // Get chapter count from loaded content or return default
      getChapterCount: async (bookCode: string): Promise<number> => {
        const bookInfo = get().getBookInfo(bookCode)
        
        // If we already have chapter count, return it
        if (bookInfo?.chapters) {
          return bookInfo.chapters
        }
        
        // Try to load content if workspace is available
        if ((window as any).loadBookContentWithWorkspace) {
          try {
            const content = await (window as any).loadBookContentWithWorkspace(bookCode)
            return content?.chapters?.length || 1
          } catch (error) {
            console.warn(`Failed to load content for ${bookCode}:`, error)
          }
        }
        
        // Return default chapter count for common books
        const defaultChapters: Record<string, number> = {
          'tit': 3, 'phm': 1, 'jud': 1, '2jn': 1, '3jn': 1
        }
        return defaultChapters[bookCode] || 1
      },

      // Get verse count from loaded content or return default
      getVerseCount: async (bookCode: string, chapter: number): Promise<number> => {
        // Try to load content if workspace is available
        if ((window as any).loadBookContentWithWorkspace) {
          try {
            const content = await (window as any).loadBookContentWithWorkspace(bookCode)
            if (content?.chapters?.[chapter - 1]?.verses) {
              return content.chapters[chapter - 1].verses.length
            }
          } catch (error) {
            console.warn(`Failed to load content for ${bookCode}:`, error)
          }
        }
        
        // Return reasonable default
        return 31
      },

      getBookSections: async (bookCode: string): Promise<TranslatorSection[]> => {
        // Try to load content if workspace is available
        if ((window as any).loadBookContentWithWorkspace) {
          try {
            const content = await (window as any).loadBookContentWithWorkspace(bookCode)
            
            if (content?.translatorSections) {
              return content.translatorSections
            }
          } catch (error) {
            console.warn(`Failed to load sections for ${bookCode}:`, error)
          }
        }
        
        // Return empty array as default
        return []
      }
    })),
    { name: 'navigation-store' }
  )
)

// ============================================================================
// CONTEXT DEFINITION
// ============================================================================

const NavigationContext = createContext<NavigationStore | null>(null)

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function NavigationProvider({ 
  children, 
  initialBook = 'gen',
  initialReference
}: NavigationProviderProps) {
  const store = useNavigationStore()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { anchorResource, anchorResourceId } = useWorkspace()
  const workspace = useWorkspace()

  console.log({anchorResource})

  // Update available books from anchor resource
  useEffect(() => {
    if (anchorResource?.toc?.books) {
      console.log(`📚 Updating navigation with ${anchorResource.toc.books.length} books from anchor resource`)
      store.setAvailableBooks(anchorResource.toc.books)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorResource]) // Removed store from dependencies to prevent infinite loop

  // Create a workspace-aware content loader with stable reference
  const { getOrFetchContent } = workspace
  
  // Use useRef to create a stable function reference and cache loaded content
  const loadBookContentWithWorkspaceRef = useRef<((bookCode: string) => Promise<any>) | null>(null)
  const contentCacheRef = useRef<Map<string, any>>(new Map())
  
  // Clear cache when anchor resource changes
  useEffect(() => {
    contentCacheRef.current.clear()
  }, [anchorResource, anchorResourceId])
  
  // Update the function only when dependencies actually change
  useEffect(() => {
    if (anchorResource && anchorResourceId && getOrFetchContent) {
      loadBookContentWithWorkspaceRef.current = async (bookCode: string) => {
        // Check cache first
        const cacheKey = `${anchorResource.server}/${anchorResource.owner}/${anchorResource.language}/${anchorResourceId}/${bookCode}`
        if (contentCacheRef.current.has(cacheKey)) {
          console.log(`📋 Using cached content for book: ${bookCode}`)
          return contentCacheRef.current.get(cacheKey)
        }
        
        console.log(`📖 Loading content for book: ${bookCode}`)
        
        try {
          // Get content from ResourceManager via WorkspaceContext
          const content = await getOrFetchContent(cacheKey, ResourceType.SCRIPTURE)
          
          if (content) {
            console.log(`✅ Content loaded for ${bookCode}: ${content.chapters?.length || 0} chapters`)
            // Cache the content
            contentCacheRef.current.set(cacheKey, content)
            return content
          }
          
          return null
        } catch (error) {
          console.error(`❌ Failed to load content for ${bookCode}:`, error)
          return null
        }
      }
      
      // Expose to window only when we have a valid function
      (window as any).loadBookContentWithWorkspace = loadBookContentWithWorkspaceRef.current
    }
  }, [anchorResource, anchorResourceId, getOrFetchContent])

  // Set up the global URL update function for the store to use
  useEffect(() => {
    const updateURLFunction = (reference: NavigationReference) => {
      if (anchorResource) {
        let refString = ''
        
        if (reference.chapter) {
          refString = reference.chapter.toString()
          
          if (reference.verse) {
            refString += `:${reference.verse}`
            
            if (reference.endChapter && reference.endVerse) {
              if (reference.endChapter === reference.chapter) {
                // Only add range suffix if end verse is different from start verse
                if (reference.endVerse !== reference.verse) {
                  refString += `-${reference.endVerse}`
                }
              } else {
                refString += `-${reference.endChapter}:${reference.endVerse}`
              }
            } else if (reference.endVerse && reference.endVerse !== reference.verse) {
              // Only add range suffix if end verse is different from start verse
              refString += `-${reference.endVerse}`
            }
          }
        }

        // Build path-based URL: /:owner/:language/:book
        let path = `/${anchorResource.owner}/${anchorResource.language}/${reference.book}`
        
        // Add reference as query parameter if present
        if (refString) {
          path += `?ref=${encodeURIComponent(refString)}`
        }
        
        // Navigate to new URL
        navigate(path, { replace: true })
        console.log('🌐 Updated URL to path-based:', path)
        
        // Store updated parameters to localStorage
        storeParams({
          owner: anchorResource.owner,
          language: anchorResource.language,
          book: reference.book,
          ref: refString || undefined
        })
      }
    }
    
    // Expose the function globally for the store to use
    (window as any).navigationUpdateURL = updateURLFunction
    
    return () => {
      (window as any).navigationUpdateURL = null
    }
  }, [anchorResource, navigate])

  // Capture initial values to avoid dependency issues
  const initialValuesRef = useRef({ initialBook, initialReference })
  
  // Initialize navigation from URL or props - wait for anchor resource to be available
  const hasInitialized = useRef(false)
  useEffect(() => {
    // Don't initialize navigation until anchor resource is available
    if (!anchorResource) {
      console.log(`⏳ NavigationProvider waiting for anchor resource...`)
      return
    }
    
    // Only initialize once
    if (hasInitialized.current) {
      console.log(`⏭️ NavigationProvider already initialized, skipping`)
      return
    }
    
    hasInitialized.current = true
    
    const urlRef = searchParams.get('ref')
    const { initialBook: initBook, initialReference: initRef } = initialValuesRef.current
    
    console.log(`🎯 NavigationProvider initializing with anchor resource available:`, { 
      initialBook: initBook, 
      urlRef, 
      initialReference: initRef,
      anchorResourceId: anchorResource.id 
    })
    
    // Load initial content for the URL-specified book to avoid loading Genesis unnecessarily
    if (initBook && workspace.loadInitialAnchorContent) {
      workspace.loadInitialAnchorContent(initBook).catch(error => {
        console.warn(`⚠️ Failed to load initial content for ${initBook}:`, error)
      })
    }
    
    // Always use the initialBook from URL path as the primary book source
    if (initBook) {
      if (urlRef) {
        // Parse the reference but use the book from URL path
        const parsedRef = store.parseURLReference(urlRef)
        if (parsedRef) {
          // Override the book with the one from URL path
          const finalRef = {
            ...parsedRef,
            book: initBook
          }
          console.log(`🎯 Navigating to reference from URL:`, finalRef)
          store.navigateToReference(finalRef)
          return
        }
      }
      
      // No valid reference, just navigate to the book from URL
      console.log(`🎯 Navigating to book from URL:`, initBook)
      store.navigateToBook(initBook)
    } else if (initRef) {
      // Fallback to initialReference if no initialBook
      console.log(`🎯 Navigating to initialReference:`, initRef)
      store.navigateToReference(initRef)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorResource]) // Only depend on anchorResource, not searchParams

  return (
    <NavigationContext.Provider value={store}>
      {children}
    </NavigationContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useNavigation(): NavigationStore {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}

// ============================================================================
// SELECTOR HOOKS FOR PERFORMANCE
// ============================================================================

/**
 * Hook to subscribe to specific parts of the navigation state
 */
export function useNavigationSelector<T>(selector: (state: NavigationStore) => T): T {
  return useNavigationStore(selector)
}

/**
 * Hook to get current navigation state
 */
export function useCurrentNavigation() {
  return useNavigationSelector((state) => ({
    currentBook: state.currentBook,
    currentReference: state.currentReference,
    bookInfo: state.getBookInfo(state.currentBook)
  }))
}

/**
 * Hook to get available books
 */
export function useAvailableBooks() {
  return useNavigationSelector((state) => ({
    books: state.availableBooks,
    getBookInfo: state.getBookInfo
  }))
}

/**
 * Hook to get navigation actions
 */
export function useNavigationActions() {
  return useNavigationSelector((state) => ({
    navigateToBook: state.navigateToBook,
    navigateToReference: state.navigateToReference,
    navigateToChapter: state.navigateToChapter,
    navigateToVerse: state.navigateToVerse,
    navigateToRange: state.navigateToRange
  }))
}
