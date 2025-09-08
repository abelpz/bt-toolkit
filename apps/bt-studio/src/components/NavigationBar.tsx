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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center py-4">
        {/* App Title */}
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">BT Studio</h1>
          <div className="text-sm text-gray-500">
            {owner}/{language}
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center space-x-4">
          {/* Modern Scripture Navigator */}
          <ScriptureNavigator />
          
          
        </div>
      </div>
    </div>
  )
}
