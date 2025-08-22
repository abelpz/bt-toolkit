import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResourceAPI } from 'linked-panels';
import ParagraphAwareScriptureRenderer from '../ParagraphAwareScriptureRenderer';
import { useContextualScriptureRenderer } from '../../hooks/useContextualScriptureRenderer';
import { useScriptureNavigation } from '../../contexts/ScriptureNavigationContext';

interface SimplifiedTextResourceProps {
  resourceId: string;
  textType?: 'ust' | 'gst'; // Simplified text type
}

export const SimplifiedTextResource: React.FC<SimplifiedTextResourceProps> = ({ 
  resourceId, 
  textType = 'ust' 
}) => {
  const { currentReference, formatReference } = useScriptureNavigation();
  const api = useResourceAPI(resourceId);

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

  // Listen for word highlighting messages from other resources
  React.useEffect(() => {
    // For now, we'll implement a simple polling approach
    // In a future version, we can implement proper event subscription
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

  if (scriptureLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading {textType.toUpperCase()}...</Text>
        </View>
      </View>
    );
  }

  if (scriptureError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {scriptureError}</Text>
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
          {textType === 'ust' ? 'Unlocked Simplified Text' : 'Gateway Simplified Text'}
        </Text>
      </View>
      
      <View style={styles.content}>
        <ParagraphAwareScriptureRenderer
          scripture={processedScripture}
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
  scriptureRenderer: {
    flex: 1,
  },
});

export default SimplifiedTextResource;
