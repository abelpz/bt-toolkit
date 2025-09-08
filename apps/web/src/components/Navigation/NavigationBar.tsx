/**
 * Navigation Bar
 * Book/chapter/verse navigation controls
 * Based on ARCHITECTURE.md Navigation System
 */

import React, { useState } from 'react'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { useNavigation } from '../../contexts/NavigationContext'

export function NavigationBar() {
  const { state: workspaceState } = useWorkspace()
  const { 
    state: navigationState, 
    navigateToBook, 
    navigateToReferenceString,
    navigateToWorkspace,
    getReferenceString 
  } = useNavigation()
  
  const [referenceInput, setReferenceInput] = useState('')
  
  // Get available books from scripture resources
  const availableBooks = React.useMemo(() => {
    const scriptureResources = Object.values(workspaceState.resourceMetadata)
      .filter(r => r.type === 'scripture' && r.available)
    
    // For now, return a basic book list - in production this would come from resource metadata
    return [
      { code: 'tit', name: 'Titus' },
      { code: 'jon', name: 'Jonah' },
      { code: 'mat', name: 'Matthew' },
      { code: 'mrk', name: 'Mark' },
      { code: 'luk', name: 'Luke' },
      { code: 'jhn', name: 'John' }
    ]
  }, [workspaceState.resourceMetadata])
  
  const handleBookChange = (bookCode: string) => {
    navigateToBook(bookCode)
  }
  
  const handleReferenceSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (referenceInput.trim()) {
      navigateToReferenceString(referenceInput.trim())
      setReferenceInput('')
    }
  }
  
  const handleWorkspaceChange = (owner: string, language: string) => {
    navigateToWorkspace(owner, language, navigationState.book, getReferenceString())
  }
  
  return (
    <nav className="navigation-bar px-4 py-2">
      <div className="flex items-center justify-between">
        
        {/* Left: App Title and Workspace */}
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-800">
            Bible Translation Toolkit
          </h1>
          
          <div className="flex items-center space-x-2 text-sm">
            <select
              value={workspaceState.owner}
              onChange={(e) => handleWorkspaceChange(e.target.value, workspaceState.language)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="unfoldingWord">unfoldingWord</option>
              <option value="Door43-Catalog">Door43-Catalog</option>
            </select>
            
            <span className="text-gray-400">/</span>
            
            <select
              value={workspaceState.language}
              onChange={(e) => handleWorkspaceChange(workspaceState.owner, e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>
        
        {/* Center: Book and Reference Navigation */}
        <div className="flex items-center space-x-4">
          
          {/* Book Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Book:</label>
            <select
              value={navigationState.book}
              onChange={(e) => handleBookChange(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm min-w-[120px]"
            >
              {availableBooks.map(book => (
                <option key={book.code} value={book.code}>
                  {book.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Reference Input */}
          <form onSubmit={handleReferenceSubmit} className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Reference:</label>
            <input
              type="text"
              value={referenceInput}
              onChange={(e) => setReferenceInput(e.target.value)}
              placeholder={getReferenceString()}
              className="border border-gray-300 rounded px-3 py-1 text-sm w-24"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Go
            </button>
          </form>
          
        </div>
        
        {/* Right: Status and Actions */}
        <div className="flex items-center space-x-2">
          
          {/* Current Reference Display */}
          <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
            {availableBooks.find(b => b.code === navigationState.book)?.name || navigationState.book} {getReferenceString()}
          </div>
          
          {/* Loading Indicator */}
          {(workspaceState.initializing || navigationState.navigating) && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
          
        </div>
        
      </div>
    </nav>
  )
}
