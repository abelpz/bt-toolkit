import { Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { AppContexts } from '../contexts/AppContexts';
import { ReadyNavigationBar } from '../components/ReadyNavigationBar';
import { EnhancedPanelSystem } from '../components/panels/EnhancedPanelSystem';
import { Settings } from '../components/Settings';
import { resolveAppParams, PathParams, storeParams, getStoredParams, DEFAULT_PARAMS } from '../utils/urlParams';
import { useEffect, useMemo } from 'react';

function DefaultRedirect() {
  const storedParams = getStoredParams()
  const fallbackParams = storedParams || DEFAULT_PARAMS
  
  const redirectPath = `/${fallbackParams.owner}/${fallbackParams.language}/${fallbackParams.book}`
  console.log('🏠 Default route redirecting to:', redirectPath, 'from stored params:', storedParams)
  
  return <Navigate to={redirectPath} replace />
}

export function App() {
  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Main Content */}
        <main className="flex-1 min-h-0 overflow-hidden">
          <Routes>
            <Route path="/" element={<DefaultRedirect />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/:owner/:language/:book" element={<WorkspaceView />} />
            <Route path="/:owner/:language/:book/:ref" element={<WorkspaceView />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function WorkspaceView() {
  const pathParams = useParams() as PathParams
  const [searchParams] = useSearchParams()
  
  console.log('🏠 WorkspaceView rendering with params:', { pathParams, searchParams: Object.fromEntries(searchParams.entries()) });
  
  // Extract individual values for stable memoization
  const { owner, language, book } = pathParams
  const ref = searchParams.get('ref')
  
  // Resolve the final parameters from URL - memoized to prevent infinite re-renders
  const resolvedParams = useMemo(() => {
    return resolveAppParams(pathParams, searchParams)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, language, book, ref])
  
  useEffect(() => {
    console.log('🎯 WorkspaceView resolved params:', resolvedParams)
    // Store resolved parameters to localStorage for future use
    storeParams(resolvedParams)
  }, [resolvedParams])
  
  return (
    <AppContexts
      initialOwner={resolvedParams.owner}
      initialLanguage={resolvedParams.language}
      initialBook={resolvedParams.book}
    >
      <div className="flex flex-col h-full">
        {/* Main Content - Fixed height container */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <EnhancedPanelSystem />
        </div>
        
        {/* Navigation Bar - Moved to bottom */}
        <header className="flex-shrink-0 bg-white shadow-sm border-t">
          <ReadyNavigationBar />
        </header>
      </div>
    </AppContexts>
  );
}

export default App;
