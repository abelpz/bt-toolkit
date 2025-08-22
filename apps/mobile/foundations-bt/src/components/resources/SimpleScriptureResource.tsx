import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ParagraphAwareScriptureRenderer from '../ParagraphAwareScriptureRenderer';
import { useContextualScriptureRenderer } from '../../hooks/useContextualScriptureRenderer';
import { useScriptureNavigation } from '../../contexts/ScriptureNavigationContext';

interface SimpleScriptureResourceProps {
  resourceId: string;
}

export const SimpleScriptureResource: React.FC<SimpleScriptureResourceProps> = ({ resourceId }) => {
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

  const handleVersePress = (chapter: number, verse: number) => {
    console.log('📖 Verse pressed:', `${chapter}:${verse}`);
    // Could trigger navigation in a more complex setup
  };

  const handleWordPress = (word: string, verse: number, chapter: number) => {
    console.log('Word pressed:', word, 'in', `${chapter}:${verse}`);
    
    // Highlight the word temporarily in this resource
    highlightWords([word]);
    setTimeout(() => clearHighlights(), 2000);
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
