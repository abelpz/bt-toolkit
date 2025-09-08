/**
 * Scripture Resource Component
 * Handles all scripture subtypes (ULT, UST, GLT, GST)
 * Based on ARCHITECTURE.md Resource Component Interface
 */

import React, { useEffect, useState } from 'react'
import { ResourceComponentProps, NavigationMode } from '../../types/resources'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { useNavigation } from '../../contexts/NavigationContext'

export function ScriptureResourceComponent({
  resourceId,
  navigationState,
  onCrossReference,
  onNavigationChange,
  onShowModal,
  onHideModal,
  panelId
}: ResourceComponentProps) {
  const { getBookContent, isBookLoaded, getResourceMetadata, state: workspaceState } = useWorkspace()
  const { state: navState } = useNavigation()
  
  const [bookContent, setBookContent] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filteredContent, setFilteredContent] = useState<any>(null)
  
  const resourceMetadata = getResourceMetadata(resourceId)
  const currentBook = navigationState.book
  
  // Load book content when book changes or component mounts
  useEffect(() => {
    if (!resourceMetadata?.available) {
      setError(`Resource ${resourceId} is not available`)
      return
    }
    
    const loadBookContent = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Check if already loaded in workspace
        if (isBookLoaded(resourceId, currentBook)) {
          const content = workspaceState.processedBooks[resourceId]?.[currentBook]
          setBookContent(content)
        } else {
          // Load from service
          const content = await getBookContent(resourceId, currentBook)
          setBookContent(content)
        }
      } catch (err) {
        console.error(`Failed to load ${resourceId} ${currentBook}:`, err)
        setError(err.message || 'Failed to load scripture content')
      } finally {
        setLoading(false)
      }
    }
    
    loadBookContent()
  }, [resourceId, currentBook, resourceMetadata?.available])
  
  // Filter content based on navigation range
  useEffect(() => {
    if (!bookContent) {
      setFilteredContent(null)
      return
    }
    
    try {
      const filtered = filterScriptureContent(
        bookContent,
        navigationState.chapter,
        navigationState.verse,
        navigationState.endChapter,
        navigationState.endVerse
      )
      setFilteredContent(filtered)
    } catch (err) {
      console.error('Failed to filter content:', err)
      setError('Failed to filter scripture content')
    }
  }, [bookContent, navigationState.chapter, navigationState.verse, navigationState.endChapter, navigationState.endVerse])
  
  // Handle loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading {resourceMetadata?.title || resourceId}...</span>
      </div>
    )
  }
  
  // Handle error state
  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          {resourceMetadata?.title || resourceId}
        </h3>
        <p className="text-red-600 mb-3">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }
  
  // Handle no content
  if (!filteredContent) {
    return (
      <div className="p-4 text-gray-500 text-center">
        <p>No content available for {currentBook} in {resourceMetadata?.title || resourceId}</p>
      </div>
    )
  }
  
  return (
    <div className="scripture-resource h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">
          {resourceMetadata?.title || resourceId}
        </h2>
        <p className="text-sm text-gray-600">
          {filteredContent.bookName} {formatReference(navigationState)}
        </p>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <ScriptureContent 
          content={filteredContent}
          resourceId={resourceId}
          onCrossReference={onCrossReference}
        />
      </div>
      
      {/* Footer with metadata */}
      <div className="flex-shrink-0 p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        <div className="flex justify-between items-center">
          <span>
            {filteredContent.chapters?.length || 0} chapters, {filteredContent.totalVerses || 0} verses
          </span>
          <span>
            {resourceMetadata?.lastUpdated && 
              `Updated: ${new Date(resourceMetadata.lastUpdated).toLocaleDateString()}`
            }
          </span>
        </div>
      </div>
    </div>
  )
}

// Scripture Content Renderer
interface ScriptureContentProps {
  content: any
  resourceId: string
  onCrossReference: (crossRef: any) => void
}

function ScriptureContent({ content, resourceId, onCrossReference }: ScriptureContentProps) {
  if (!content.chapters || content.chapters.length === 0) {
    return <div className="text-gray-500">No chapters available</div>
  }
  
  return (
    <div className="scripture-content space-y-6">
      {content.chapters.map((chapter: any) => (
        <div key={chapter.number} className="chapter">
          <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            Chapter {chapter.number}
          </h3>
          
          {/* Render paragraphs if available */}
          {chapter.paragraphs && chapter.paragraphs.length > 0 ? (
            <div className="space-y-4">
              {chapter.paragraphs.map((paragraph: any) => (
                <div key={paragraph.id} className={`paragraph paragraph-${paragraph.style}`}>
                  <div className="flex flex-wrap items-start gap-2">
                    {paragraph.verses.map((verse: any) => (
                      <span key={verse.number} className="verse-container">
                        <sup className="verse-number text-blue-600 font-semibold mr-1">
                          {verse.originalVerseString || verse.number}
                        </sup>
                        <span className="verse-text">{verse.text}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Fallback to individual verses */
            <div className="space-y-2">
              {chapter.verses.map((verse: any) => (
                <div key={verse.number} className="verse flex">
                  <sup className="verse-number text-blue-600 font-semibold mr-2 mt-1 flex-shrink-0">
                    {verse.originalVerseString || verse.number}
                  </sup>
                  <span className="verse-text flex-1">{verse.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Utility functions
function filterScriptureContent(
  bookContent: any,
  chapter: number,
  verse: number,
  endChapter?: number,
  endVerse?: number
): any {
  if (!bookContent?.chapters) {
    return bookContent
  }
  
  // Filter chapters based on range
  const filteredChapters = bookContent.chapters.filter((ch: any) => {
    if (endChapter) {
      return ch.number >= chapter && ch.number <= endChapter
    }
    return ch.number === chapter
  })
  
  // Filter verses within chapters
  const processedChapters = filteredChapters.map((ch: any) => {
    if (ch.number === chapter && ch.number === (endChapter || chapter)) {
      // Same chapter - filter verses
      const filteredVerses = ch.verses.filter((v: any) => {
        const verseNum = v.number
        return verseNum >= verse && verseNum <= (endVerse || verse)
      })
      
      // Also filter paragraphs if they exist
      let filteredParagraphs = ch.paragraphs
      if (ch.paragraphs) {
        filteredParagraphs = ch.paragraphs
          .map((p: any) => ({
            ...p,
            verses: p.verses.filter((v: any) => {
              const verseNum = v.number
              return verseNum >= verse && verseNum <= (endVerse || verse)
            })
          }))
          .filter((p: any) => p.verses.length > 0)
      }
      
      return {
        ...ch,
        verses: filteredVerses,
        paragraphs: filteredParagraphs
      }
    } else if (ch.number === chapter) {
      // Start chapter - from verse to end
      const filteredVerses = ch.verses.filter((v: any) => v.number >= verse)
      let filteredParagraphs = ch.paragraphs
      if (ch.paragraphs) {
        filteredParagraphs = ch.paragraphs
          .map((p: any) => ({
            ...p,
            verses: p.verses.filter((v: any) => v.number >= verse)
          }))
          .filter((p: any) => p.verses.length > 0)
      }
      
      return {
        ...ch,
        verses: filteredVerses,
        paragraphs: filteredParagraphs
      }
    } else if (ch.number === endChapter) {
      // End chapter - from start to endVerse
      const filteredVerses = ch.verses.filter((v: any) => v.number <= (endVerse || 999))
      let filteredParagraphs = ch.paragraphs
      if (ch.paragraphs) {
        filteredParagraphs = ch.paragraphs
          .map((p: any) => ({
            ...p,
            verses: p.verses.filter((v: any) => v.number <= (endVerse || 999))
          }))
          .filter((p: any) => p.verses.length > 0)
      }
      
      return {
        ...ch,
        verses: filteredVerses,
        paragraphs: filteredParagraphs
      }
    }
    
    // Middle chapters - include all verses
    return ch
  })
  
  return {
    ...bookContent,
    chapters: processedChapters,
    totalVerses: processedChapters.reduce((sum: number, ch: any) => sum + (ch.verses?.length || 0), 0)
  }
}

function formatReference(navigationState: any): string {
  const { chapter, verse, endChapter, endVerse } = navigationState
  
  if (endChapter && endVerse) {
    if (endChapter === chapter) {
      return `${chapter}:${verse}-${endVerse}`
    }
    return `${chapter}:${verse}-${endChapter}:${endVerse}`
  }
  
  if (endVerse && endVerse !== verse) {
    return `${chapter}:${verse}-${endVerse}`
  }
  
  return `${chapter}:${verse}`
}
