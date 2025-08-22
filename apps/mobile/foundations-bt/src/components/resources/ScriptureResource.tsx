import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResourceAPI } from 'linked-panels';
import ParagraphAwareScriptureRenderer from '../ParagraphAwareScriptureRenderer';
import { useContextualScriptureRenderer } from '../../hooks/useContextualScriptureRenderer';
import { useScriptureNavigation } from '../../contexts/ScriptureNavigationContext';

interface ScriptureResourceProps {
  resourceId: string;
}

interface ScriptureMessage {
  type: 'highlightWords' | 'clearHighlights' | 'navigateToVerse';
  lifecycle?: 'event' | 'state' | 'command';
  words?: string[];
  book?: string;
  chapter?: number;
  verse?: number;
}

export const ScriptureResource: React.FC<ScriptureResourceProps> = ({ resourceId }) => {
  const api = useResourceAPI<ScriptureMessage>(resourceId);
  const { currentReference, formatReference } = useScriptureNavigation();
  
  const {
    processedScripture,
    loading: scriptureLoading,
    error: scriptureError,
    highlightedWords,
    contextualReference,
    highlightWords,
    clearHighlights
  } = useContextualScriptureRenderer({
    enableWordHighlighting: true,
    contextualChunkSize: 'paragraph',
    autoLoadOnNavigation: true
  });

  // Handle incoming messages from other resources
  React.useEffect(() => {
    const messages = api.messaging.getMessages();
    messages.forEach(message => {
      const content = message.content;
      
      switch (content.type) {
        case 'highlightWords':
          if (content.words) {
            highlightWords(content.words);
          }
          break;
        case 'clearHighlights':
          clearHighlights();
          break;
        case 'navigateToVerse':
          if (content.book && content.chapter && content.verse) {
            // Navigation will be handled by the navigation context
            console.log('📍 Scripture resource received navigation request:', {
              book: content.book,
              chapter: content.chapter,
              verse: content.verse
            });
          }
          break;
      }
    });
    
    // Clear processed messages
    api.messaging.clearMessages();
  }, [api.messaging.getMessages().length]);

  const handleVersePress = (chapter: number, verse: number) => {
    // Notify other resources about verse navigation
    api.messaging.sendToAll({
      type: 'navigateToVerse',
      lifecycle: 'event',
      book: currentReference.book,
      chapter,
      verse
    });
  };

  const handleWordPress = (word: string, verse: number, chapter: number) => {
    console.log('Word pressed:', word, 'in', `${chapter}:${verse}`);
    
    // Highlight the word temporarily in this resource
    highlightWords([word]);
    setTimeout(() => clearHighlights(), 2000);
    
    // Notify other resources about word selection
    api.messaging.sendToAll({
      type: 'highlightWords',
      lifecycle: 'event',
      words: [word]
    });
  };

  if (scriptureLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Loading {currentReference.book}...
          </Text>
        </View>
      </View>
    );
  }

  if (scriptureError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Error: {scriptureError}
          </Text>
        </View>
      </View>
    );
  }

  if (!processedScripture) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No scripture data available
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ParagraphAwareScriptureRenderer
        scripture={processedScripture}
        reference={contextualReference}
        showVerseNumbers={true}
        showReference={false}
        highlightWords={highlightedWords}
        currentChapter={currentReference.chapter}
        currentVerse={currentReference.verse}
        contextualRendering={true}
        onVersePress={handleVersePress}
        onWordPress={handleWordPress}
        style={{ flex: 1 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
});
