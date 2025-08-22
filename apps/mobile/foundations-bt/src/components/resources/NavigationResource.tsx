import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResourceAPI } from 'linked-panels';
import ScriptureNavigator from '../../modules/navigation/ScriptureNavigator';
import { useScriptureNavigation } from '../../contexts/ScriptureNavigationContext';
import type { ScriptureReference } from '../../modules/navigation/ScriptureNavigator';

interface NavigationResourceProps {
  resourceId: string;
}

interface NavigationMessage {
  type: 'navigateToVerse' | 'bookChanged' | 'chapterChanged' | 'verseChanged';
  lifecycle?: 'event' | 'state' | 'command';
  book?: string;
  chapter?: number;
  verse?: number;
}

export const NavigationResource: React.FC<NavigationResourceProps> = ({ resourceId }) => {
  const api = useResourceAPI<NavigationMessage>(resourceId);
  const { 
    currentReference, 
    availableBooks, 
    setCurrentReference, 
    formatReference 
  } = useScriptureNavigation();

  // Handle incoming messages from other resources
  React.useEffect(() => {
    const messages = api.messaging.getMessages();
    messages.forEach(message => {
      const content = message.content;
      
      switch (content.type) {
        case 'navigateToVerse':
          if (content.book && content.chapter && content.verse) {
            console.log('🧭 Navigation received request:', {
              book: content.book,
              chapter: content.chapter,
              verse: content.verse
            });
            
            const newReference: ScriptureReference = {
              book: content.book,
              chapter: content.chapter,
              verse: content.verse
            };
            setCurrentReference(newReference);
          }
          break;
      }
    });
    
    // Clear processed messages
    api.messaging.clearMessages();
  }, [api.messaging.getMessages().length]);

  const handleReferenceChange = (reference: ScriptureReference) => {
    setCurrentReference(reference);
    console.log('🧭 Navigation changed to:', formatReference(reference));
    
    // Notify all other resources about the navigation change
    api.messaging.sendToAll({
      type: 'navigateToVerse',
      lifecycle: 'event',
      book: reference.book,
      chapter: reference.chapter,
      verse: reference.verse
    });
  };

  return (
    <View style={styles.container}>
      <ScriptureNavigator
        currentReference={currentReference}
        availableBooks={availableBooks}
        onNavigate={handleReferenceChange}
        compact={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
});
