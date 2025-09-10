/**
 * NavigationBar - Top navigation component
 * 
 * Displays current navigation state and provides navigation controls
 */

import React, { useCallback } from 'react'
import { useNavigation } from '../contexts/NavigationContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { ScriptureNavigator } from './navigation/ScriptureNavigator'

export function NavigationBar() {
  const navigation = useNavigation()
  const workspace = useWorkspace()
  
  const currentBook = navigation.currentBook
  const currentReference = navigation.currentReference
  const bookInfo = navigation.getBookInfo(currentBook)
  const { owner, language, server } = workspace
  
  const handleBookChange = useCallback((bookCode: string) => {
    navigation.navigateToBook(bookCode)
  }, [navigation])
  
  const handleChapterChange = useCallback((chapter: number) => {
    navigation.navigateToChapter(chapter)
  }, [navigation])
  
  const handleVerseChange = useCallback((verse: number) => {
    navigation.navigateToVerse(verse)
  }, [navigation])

  return (
    <div className="max-w-8xl mx-auto px-3 sm:px-4 lg:px-4">
      <div className="flex justify-between items-center py-2">
        {/* App Logo */}
        <div className="flex items-center space-x-2">
          {/* Logo Icon */}
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-base leading-none select-none">📖</span>
            </div>
            {/* Subtle glow effect */}
            <div className="absolute inset-0 w-8 h-8 bg-blue-400 rounded-lg opacity-20 blur-sm -z-10"></div>
          </div>
          
          {/* App Title */}
          <div className="flex flex-col">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent leading-tight">
              FBT
            </h1>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center space-x-3">
          {/* Modern Scripture Navigator */}
          <ScriptureNavigator />
          
          
        </div>
      </div>
    </div>
  )
}
