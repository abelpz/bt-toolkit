/**
 * AppRouter - URL Parameter and Navigation Management
 * 
 * Handles:
 * 1. URL parameter parsing and fallbacks
 * 2. LocalStorage persistence
 * 3. App loading state management
 * 4. Initial navigation setup
 */

import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AppContexts } from '../contexts/AppContexts'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useNavigation } from '../contexts/NavigationContext'
import { 
  resolveAppParams, 
  hasUrlParams, 
  updateUrlParams, 
  storeParams,
  AppParams 
} from '../utils/urlParams'

interface AppRouterProps {
  children: React.ReactNode
}

function AppContent({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { appReady, initializing } = useWorkspace()
  const navigationStore = useNavigation()
  
  const [resolvedParams, setResolvedParams] = useState<AppParams | null>(null)
  
  // Resolve parameters on mount
  useEffect(() => {
    const params = resolveAppParams(searchParams)
    setResolvedParams(params)
    
    // If URL doesn't have params, push resolved params to URL
    if (!hasUrlParams(searchParams)) {
      console.log('🌐 No URL params found, pushing resolved params to URL')
      updateUrlParams(searchParams, navigate, params)
    }
    
    // Store params for future use
    storeParams(params)
  }, [searchParams, navigate])
  
  // Navigate to resolved book/reference when app is ready
  useEffect(() => {
    if (appReady && resolvedParams) {
      console.log('🎯 App ready, navigating to resolved params:', resolvedParams)
      
      // Navigate to the resolved book and reference
      navigationStore.navigateToBook(resolvedParams.book)
      
      // If there's a specific reference, navigate to it
      if (resolvedParams.ref && resolvedParams.ref !== '1:1') {
        const parsedRef = navigationStore.parseURLReference(resolvedParams.ref)
        if (parsedRef) {
          navigationStore.navigateToReference({
            ...parsedRef,
            book: resolvedParams.book
          })
        }
      }
    }
  }, [appReady, resolvedParams, navigationStore])
  
  // Show loading state until app is ready
  if (!appReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Loading BT Studio
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {initializing ? 'Initializing workspace...' : 'Loading resources...'}
          </p>
          {resolvedParams && (
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-500">
              <p>Owner: {resolvedParams.owner}</p>
              <p>Language: {resolvedParams.language}</p>
              <p>Book: {resolvedParams.book}</p>
              <p>Reference: {resolvedParams.ref}</p>
            </div>
          )}
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}

export function AppRouter({ children }: AppRouterProps) {
  const [searchParams] = useSearchParams()
  const resolvedParams = resolveAppParams(searchParams)
  
  return (
    <AppContexts
      initialOwner={resolvedParams.owner}
      initialLanguage={resolvedParams.language}
      initialBook={resolvedParams.book}
    >
      <AppContent>
        {children}
      </AppContent>
    </AppContexts>
  )
}
