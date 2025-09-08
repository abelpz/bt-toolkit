import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useResourceAPI } from 'linked-panels';
import ParagraphAwareScriptureRenderer from '../ParagraphAwareScriptureRenderer';
import { useScriptureNavigation } from '../../contexts/ScriptureNavigationContext';
import { useBookPackageResource, useBookPackageLoading } from '../../contexts/BookPackageContext';

interface LiteralTextResourceProps {
  resourceId: string;
  textType?: 'ult' | 'glt'; // Literal text type
}

export const LiteralTextResource: React.FC<LiteralTextResourceProps> = ({ 
  resourceId, 
  textType = 'ult' 
}) => {
  const { currentReference, formatReference } = useScriptureNavigation();
  const api = useResourceAPI(resourceId);
  
  // Get data from book package context
  const isPackageLoading = useBookPackageLoading();
  const bibleText = useBookPackageResource('literalText');
  
  // Debug logging
  React.useEffect(() => {
    console.log(`📖 LiteralTextResource - bibleText:`, bibleText);
    console.log(`📖 LiteralTextResource - type:`, typeof bibleText);
    if (bibleText) {
      console.log(`📖 LiteralTextResource - keys:`, Object.keys(bibleText));
    }
  }, [bibleText]);
  
  // Local state for word highlighting
  const [highlightedWords, setHighlightedWords] = React.useState<string[]>([]);

  const highlightWords = React.useCallback((words: string[]) => {
    setHighlightedWords(words);
  }, []);

  const clearHighlights = React.useCallback(() => {
    setHighlightedWords([]);
  }, []);

  // Listen for word highlighting messages from other resources
  React.useEffect(() => {
    // For now, we'll implement a simple polling approach
    const messages = api.messaging.getMessages();
    const latestMessage = messages[messages.length - 1];
    
    if (latestMessage && latestMessage.content) {
      const content = latestMessage.content as any;
      if (content.type === 'text' && content.message) {
        try {
          if (content.message.startsWith('highlight-words:')) {
            const data = JSON.parse(content.message.replace('highlight-words:', ''));
            if (data.words) {
              highlightWords(data.words);
            }
          } else if (content.message.startsWith('clear-highlights:')) {
            clearHighlights();
          }
        } catch (e) {
          console.warn('Failed to parse message:', e);
        }
      }
    }
  }, [api.messaging, highlightWords, clearHighlights]);

  // Send navigation updates to other resources
  React.useEffect(() => {
    if (currentReference) {
      api.messaging.sendToAll({
        type: 'text',
        message: `scripture-navigation:${JSON.stringify({
          reference: currentReference,
          source: resourceId,
          textType: textType
        })}`
      });
    }
  }, [currentReference, api.messaging, resourceId, textType]);

  if (isPackageLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading book package...</Text>
        </View>
      </View>
    );
  }

  if (!bibleText) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No literal text available for {currentReference.book}</Text>
        </View>
      </View>
    );
  }

  // Validate that bibleText has the expected structure for ParagraphAwareScriptureRenderer
  if (!bibleText.chapters || !Array.isArray(bibleText.chapters)) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid scripture data structure</Text>
          <Text style={styles.debugText}>Expected ProcessedScripture with chapters array</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {textType.toUpperCase()} - {formatReference(currentReference)}
        </Text>
        <Text style={styles.subHeaderText}>
          {textType === 'ult' ? 'Unlocked Literal Text' : 'Gateway Literal Text'}
        </Text>
      </View>
      
      <View style={styles.content}>
        <ParagraphAwareScriptureRenderer
          scripture={bibleText}
          highlightWords={highlightedWords}
          onWordPress={(word) => {
            // Send word selection to other resources
            api.messaging.sendToAll({
              type: 'text',
              message: `word-selected:${JSON.stringify({
                word: word,
                source: resourceId,
                textType: textType,
                reference: currentReference
              })}`
            });
          }}
          style={styles.scriptureRenderer}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  subHeaderText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
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
  },
  debugText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  scriptureRenderer: {
    flex: 1,
  },
});

export default LiteralTextResource;
