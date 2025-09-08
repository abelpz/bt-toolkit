import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useResourceAPI } from 'linked-panels';
import { useScriptureNavigation } from '../../contexts/ScriptureNavigationContext';
import { useResourceServiceInstance } from '../../contexts/ResourceServiceContext';
import type { TranslationWord, TranslationWordsLink } from '../../types/translationHelps';

interface TranslationWordsResourceProps {
  resourceId: string;
}

export const TranslationWordsResource: React.FC<TranslationWordsResourceProps> = ({ 
  resourceId 
}) => {
  const { currentReference, formatReference } = useScriptureNavigation();
  const api = useResourceAPI(resourceId);
  const resourceService = useResourceServiceInstance();
  const [words, setWords] = useState<TranslationWord[]>([]);
  const [wordLinks, setWordLinks] = useState<TranslationWordsLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<TranslationWord | null>(null);

  // Load words when reference changes
  useEffect(() => {
    loadWords();
  }, [currentReference]);

  // Listen for messages from other resources
  React.useEffect(() => {
    const messages = api.messaging.getMessages();
    const latestMessage = messages[messages.length - 1];
    
    if (latestMessage && latestMessage.content) {
      const content = latestMessage.content as any;
      if (content.type === 'text' && content.message) {
        try {
          if (content.message.startsWith('word-selected:')) {
            const data = JSON.parse(content.message.replace('word-selected:', ''));
            if (data.word) {
              findRelatedWords(data.word);
            }
          } else if (content.message.startsWith('note-selected:')) {
            const data = JSON.parse(content.message.replace('note-selected:', ''));
            if (data.note && data.note.Quote) {
              highlightWordsInQuote(data.note.Quote);
            }
          }
        } catch (e) {
          console.warn('Failed to parse message:', e);
        }
      }
    }
  }, [api.messaging]);

  const loadWords = async () => {
    if (!currentReference.book) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Convert ScriptureReference to VerseReference format
      const verseRef = {
        ...currentReference,
        original: `${currentReference.book} ${currentReference.chapter}:${currentReference.verse}`
      };
      const passageHelps = await resourceService.getPassageHelps(verseRef);
      setWords(passageHelps.words);
      setWordLinks(passageHelps.wordLinks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load translation words');
      console.error('Error loading translation words:', err);
    } finally {
      setLoading(false);
    }
  };

  const findRelatedWords = (selectedWord: string) => {
    // Find words that might be related to the selected word
    const relatedWords = words.filter(word => 
      word.title.toLowerCase().includes(selectedWord.toLowerCase()) ||
      word.definition.toLowerCase().includes(selectedWord.toLowerCase())
    );
    
    if (relatedWords.length > 0) {
      console.log('🔍 Found related words:', relatedWords.map(w => w.title));
    }
  };

  const highlightWordsInQuote = (quote: string) => {
    // Logic to highlight words that appear in the quote
    console.log('🔍 Highlighting words in quote:', quote);
  };

  const handleWordPress = (word: TranslationWord) => {
    setSelectedWord(word);
    
    // Send word selection to other resources
    api.messaging.sendToAll({
      type: 'text',
      message: `translation-word-selected:${JSON.stringify({
        word: word,
        source: resourceId,
        reference: currentReference
      })}`
    });

    // Highlight the word in scripture texts
    api.messaging.sendToAll({
      type: 'text',
        message: `highlight-words:${JSON.stringify({
        words: [word.title],
        source: resourceId,
        wordId: word.id
      })}`
    });
  };

  const renderTranslationWord = (word: TranslationWord, index: number) => (
    <TouchableOpacity
      key={`word-${index}`}
      style={[
        styles.wordItem,
        selectedWord?.id === word.id && styles.selectedWordItem
      ]}
      onPress={() => handleWordPress(word)}
    >
      <View style={styles.wordHeader}>
        <Text style={styles.wordTitle}>{word.title}</Text>
        <View style={[styles.tagContainer, styles[`${word.category}Tag`]]}>
          <Text style={styles.tag}>{word.category}</Text>
        </View>
      </View>
      
      <Text style={styles.wordDefinition} numberOfLines={3}>
        {word.definition}
      </Text>
      
      {word.translationSuggestions && (
        <Text style={styles.suggestions}>
          💡 Translation suggestions available
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderWordLink = (link: TranslationWordsLink, index: number) => (
    <TouchableOpacity
      key={`link-${index}`}
      style={styles.wordLinkItem}
      onPress={() => {
        // Send word link selection to other resources
        api.messaging.sendToAll({
          type: 'text',
          message: `word-link-selected:${JSON.stringify({
            link: link,
            source: resourceId,
            reference: currentReference
          })}`
        });
      }}
    >
      <Text style={styles.wordLinkReference}>{link.Reference}</Text>
      <Text style={styles.wordLinkOriginal}>{link.OrigWords}</Text>
      <Text style={styles.wordLinkTarget}>→ {link.TWLink.split('/').pop()}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading translation words...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadWords}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          Translation Words - {formatReference(currentReference)}
        </Text>
        <Text style={styles.subHeaderText}>
          {words.length} word{words.length !== 1 ? 's' : ''} • {wordLinks.length} link{wordLinks.length !== 1 ? 's' : ''}
        </Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {words.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Terms</Text>
            {words.map(renderTranslationWord)}
          </View>
        )}

        {wordLinks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Word Links</Text>
            {wordLinks.map(renderWordLink)}
          </View>
        )}

        {words.length === 0 && wordLinks.length === 0 && (
          <Text style={styles.emptyText}>
            No translation words available for {formatReference(currentReference)}
          </Text>
        )}
      </ScrollView>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  wordItem: {
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedWordItem: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  tagContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  tag: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  ktTag: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  namesTag: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  otherTag: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  wordDefinition: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  suggestions: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  wordLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    marginBottom: 8,
  },
  wordLinkReference: {
    fontSize: 12,
    color: '#6b7280',
    minWidth: 40,
  },
  wordLinkOriginal: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    marginHorizontal: 8,
  },
  wordLinkTarget: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TranslationWordsResource;
