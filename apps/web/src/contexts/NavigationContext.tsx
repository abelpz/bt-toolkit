/**
 * Navigation Context
 * Manages book/reference scope with URL synchronization
 * Based on ARCHITECTURE.md Context Architecture
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { NavigationState, ResourceNavigationState, ScriptureReference } from '../types/resources'

// Navigation State
export interface NavigationContextState extends NavigationState {
  // URL synchronization
  urlPath: string
  urlQuery: string
  
  // Validation
  validReference: boolean
  validBook: boolean
  
  // Loading state
  navigating: boolean
}

// Navigation Actions
export type NavigationAction =
  | { type: 'SET_WORKSPACE'; payload: { owner: string; language: string } }
  | { type: 'SET_BOOK'; payload: string }
  | { type: 'SET_REFERENCE'; payload: { chapter: number; verse: number; endChapter?: number; endVerse?: number } }
  | { type: 'SET_REFERENCE_STRING'; payload: string }
  | { type: 'SET_RESOURCE_STATE'; payload: { resourceId: string; state: ResourceNavigationState } }
  | { type: 'SET_URL'; payload: { path: string; query: string } }
  | { type: 'SET_VALIDATION'; payload: { validReference: boolean; validBook: boolean } }
  | { type: 'SET_NAVIGATING'; payload: boolean }
  | { type: 'RESET_NAVIGATION' }

// Initial State
const initialState: NavigationContextState = {
  book: 'tit', // Default book
  chapter: 1,
  verse: 1,
  resourceStates: {},
  urlPath: '',
  urlQuery: '',
  validReference: true,
  validBook: true,
  navigating: false
}

// Reducer
function navigationReducer(state: NavigationContextState, action: NavigationAction): NavigationContextState {
  switch (action.type) {
    case 'SET_WORKSPACE':
      // Reset navigation when workspace changes
      return {
        ...initialState,
        urlPath: `/${action.payload.owner}/${action.payload.language}/${state.book}`,
        urlQuery: `ref=${state.chapter}:${state.verse}`
      }
    
    case 'SET_BOOK':
      return {
        ...state,
        book: action.payload,
        chapter: 1,
        verse: 1,
        endChapter: undefined,
        endVerse: undefined,
        resourceStates: {} // Reset resource states when book changes
      }
    
    case 'SET_REFERENCE':
      return {
        ...state,
        chapter: action.payload.chapter,
        verse: action.payload.verse,
        endChapter: action.payload.endChapter,
        endVerse: action.payload.endVerse
      }
    
    case 'SET_REFERENCE_STRING':
      const parsed = parseReferenceString(action.payload)
      return {
        ...state,
        chapter: parsed.chapter,
        verse: parsed.verse,
        endChapter: parsed.endChapter,
        endVerse: parsed.endVerse
      }
    
    case 'SET_RESOURCE_STATE':
        return {
          ...state,
        resourceStates: {
          ...state.resourceStates,
          [action.payload.resourceId]: action.payload.state
        }
      }
    
    case 'SET_URL':
      return {
        ...state,
        urlPath: action.payload.path,
        urlQuery: action.payload.query
      }
    
    case 'SET_VALIDATION':
        return {
          ...state,
        validReference: action.payload.validReference,
        validBook: action.payload.validBook
      }

    case 'SET_NAVIGATING':
      return {
        ...state,
        navigating: action.payload
      }
    
    case 'RESET_NAVIGATION':
      return initialState

    default:
      return state
  }
}

// Context
export interface NavigationContextValue {
  state: NavigationContextState
  dispatch: React.Dispatch<NavigationAction>
  
  // Navigation functions
  navigateToBook: (bookCode: string) => void
  navigateToReference: (chapter: number, verse: number, endChapter?: number, endVerse?: number) => void
  navigateToReferenceString: (referenceString: string) => void
  navigateToWorkspace: (owner: string, language: string, book?: string, reference?: string) => void
  
  // URL functions
  getCurrentUrl: () => string
  parseCurrentUrl: () => { owner: string; language: string; book: string; reference: string }
  
  // Reference utilities
  getReferenceString: () => string
  getScriptureReference: () => ScriptureReference
  isRangeReference: () => boolean
  
  // Resource state management
  setResourceNavigationState: (resourceId: string, state: ResourceNavigationState) => void
  getResourceNavigationState: (resourceId: string) => ResourceNavigationState | undefined
}

const NavigationContext = createContext<NavigationContextValue | null>(null)

// Provider Props
export interface NavigationProviderProps {
  children: ReactNode
}

// Provider Component
export function NavigationProvider({ children }: NavigationProviderProps) {
  const [state, dispatch] = useReducer(navigationReducer, initialState)
  const location = useLocation()
  const navigate = useNavigate()
  
  // Sync with URL changes
  useEffect(() => {
    const urlInfo = parseUrl(location.pathname, location.search)
    
    if (urlInfo) {
      dispatch({ type: 'SET_URL', payload: { path: location.pathname, query: location.search } })
      
      // Update navigation state from URL
      if (urlInfo.book !== state.book) {
        dispatch({ type: 'SET_BOOK', payload: urlInfo.book })
      }
      
      if (urlInfo.reference) {
        dispatch({ type: 'SET_REFERENCE_STRING', payload: urlInfo.reference })
      }
      
      // Validate reference
      dispatch({ type: 'SET_VALIDATION', payload: { 
        validReference: isValidReference(urlInfo.reference || '1:1'),
        validBook: isValidBook(urlInfo.book)
      } })
    }
  }, [location.pathname, location.search])
  
  // Navigation functions
  const navigateToBook = (bookCode: string) => {
    dispatch({ type: 'SET_NAVIGATING', payload: true })
    dispatch({ type: 'SET_BOOK', payload: bookCode })
    
    const urlInfo = parseCurrentUrl()
    const newPath = `/${urlInfo.owner}/${urlInfo.language}/${bookCode}`
    const newQuery = `?ref=${state.chapter}:${state.verse}`
    
    navigate(`${newPath}${newQuery}`)
    dispatch({ type: 'SET_NAVIGATING', payload: false })
  }
  
  const navigateToReference = (chapter: number, verse: number, endChapter?: number, endVerse?: number) => {
    dispatch({ type: 'SET_NAVIGATING', payload: true })
    dispatch({ type: 'SET_REFERENCE', payload: { chapter, verse, endChapter, endVerse } })
    
    const urlInfo = parseCurrentUrl()
    const referenceString = formatReferenceString(chapter, verse, endChapter, endVerse)
    const newPath = `/${urlInfo.owner}/${urlInfo.language}/${state.book}`
    const newQuery = `?ref=${referenceString}`
    
    navigate(`${newPath}${newQuery}`)
    dispatch({ type: 'SET_NAVIGATING', payload: false })
  }
  
  const navigateToReferenceString = (referenceString: string) => {
    const parsed = parseReferenceString(referenceString)
    navigateToReference(parsed.chapter, parsed.verse, parsed.endChapter, parsed.endVerse)
  }
  
  const navigateToWorkspace = (owner: string, language: string, book = 'tit', reference = '1:1') => {
    dispatch({ type: 'SET_NAVIGATING', payload: true })
    dispatch({ type: 'SET_WORKSPACE', payload: { owner, language } })
    dispatch({ type: 'SET_BOOK', payload: book })
    dispatch({ type: 'SET_REFERENCE_STRING', payload: reference })
    
    const newPath = `/${owner}/${language}/${book}`
    const newQuery = `?ref=${reference}`
    
    navigate(`${newPath}${newQuery}`)
    dispatch({ type: 'SET_NAVIGATING', payload: false })
  }
  
  // URL functions
  const getCurrentUrl = (): string => {
    return `${state.urlPath}${state.urlQuery}`
  }
  
  const parseCurrentUrl = () => {
    return parseUrl(state.urlPath, state.urlQuery) || {
      owner: 'unfoldingWord',
      language: 'en',
      book: 'tit',
      reference: '1:1'
    }
  }
  
  // Reference utilities
  const getReferenceString = (): string => {
    return formatReferenceString(state.chapter, state.verse, state.endChapter, state.endVerse)
  }
  
  const getScriptureReference = (): ScriptureReference => {
    return {
      book: state.book,
      chapter: state.chapter,
      verse: state.verse,
      endChapter: state.endChapter,
      endVerse: state.endVerse
    }
  }
  
  const isRangeReference = (): boolean => {
    return !!(state.endChapter || state.endVerse)
  }
  
  // Resource state management
  const setResourceNavigationState = (resourceId: string, resourceState: ResourceNavigationState) => {
    dispatch({ type: 'SET_RESOURCE_STATE', payload: { resourceId, state: resourceState } })
  }
  
  const getResourceNavigationState = (resourceId: string): ResourceNavigationState | undefined => {
    return state.resourceStates[resourceId]
  }
  
  const contextValue: NavigationContextValue = {
    state,
    dispatch,
    navigateToBook,
    navigateToReference,
    navigateToReferenceString,
    navigateToWorkspace,
    getCurrentUrl,
    parseCurrentUrl,
    getReferenceString,
    getScriptureReference,
    isRangeReference,
    setResourceNavigationState,
    getResourceNavigationState
  }

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  )
}

// Hook
export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}

// Utility functions
function parseUrl(pathname: string, search: string) {
  // Expected format: /{owner}/{language}/{bookCode}?ref={reference}
  const pathParts = pathname.split('/').filter(Boolean)
  
  if (pathParts.length >= 3) {
    const [owner, language, book] = pathParts
    const urlParams = new URLSearchParams(search)
    const reference = urlParams.get('ref') || '1:1'
    
    return { owner, language, book, reference }
  }
  
  return null
}

function parseReferenceString(referenceString: string): {
  chapter: number
  verse: number
  endChapter?: number
  endVerse?: number
} {
  // Handle formats: "1", "1:1", "1:1-3", "1:1-2:4"
  const trimmed = referenceString.trim()
  
  // Check for range (contains dash)
  if (trimmed.includes('-')) {
    const [start, end] = trimmed.split('-')
    const startParsed = parseReferenceString(start.trim())
    const endParsed = parseReferenceString(end.trim())
    
    return {
      chapter: startParsed.chapter,
      verse: startParsed.verse,
      endChapter: endParsed.chapter,
      endVerse: endParsed.verse
    }
  }
  
  // Check for chapter:verse format
  if (trimmed.includes(':')) {
    const [chapterStr, verseStr] = trimmed.split(':')
    const chapter = parseInt(chapterStr.trim()) || 1
    const verse = parseInt(verseStr.trim()) || 1
    
    return { chapter, verse }
  }
  
  // Just chapter number
  const chapter = parseInt(trimmed) || 1
  return { chapter, verse: 1 }
}

function formatReferenceString(chapter: number, verse: number, endChapter?: number, endVerse?: number): string {
  let reference = `${chapter}:${verse}`
  
  if (endChapter && endVerse) {
    if (endChapter === chapter) {
      // Same chapter range: "1:4-6"
      reference += `-${endVerse}`
    } else {
      // Cross-chapter range: "1:4-2:6"
      reference += `-${endChapter}:${endVerse}`
    }
  } else if (endVerse && endVerse !== verse) {
    // Same chapter range: "1:4-6"
    reference += `-${endVerse}`
  }
  
  return reference
}

function isValidReference(referenceString: string): boolean {
  try {
    const parsed = parseReferenceString(referenceString)
    return parsed.chapter > 0 && parsed.verse > 0 &&
           (!parsed.endChapter || parsed.endChapter > 0) &&
           (!parsed.endVerse || parsed.endVerse > 0)
  } catch {
    return false
  }
}

function isValidBook(bookCode: string): boolean {
  // Simple validation - in production, this would check against available books
  const validBooks = [
    'gen', 'exo', 'lev', 'num', 'deu', 'jos', 'jdg', 'rut', '1sa', '2sa',
    '1ki', '2ki', '1ch', '2ch', 'ezr', 'neh', 'est', 'job', 'psa', 'pro',
    'ecc', 'sng', 'isa', 'jer', 'lam', 'ezk', 'dan', 'hos', 'jol', 'amo',
    'oba', 'jon', 'mic', 'nam', 'hab', 'zep', 'hag', 'zec', 'mal',
    'mat', 'mrk', 'luk', 'jhn', 'act', 'rom', '1co', '2co', 'gal', 'eph',
    'php', 'col', '1th', '2th', '1ti', '2ti', 'tit', 'phm', 'heb', 'jas',
    '1pe', '2pe', '1jn', '2jn', '3jn', 'jud', 'rev'
  ]
  
  return validBooks.includes(bookCode.toLowerCase())
}