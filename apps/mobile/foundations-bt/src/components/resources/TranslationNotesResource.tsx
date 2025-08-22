import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useResourceAPI } from 'linked-panels';
import { useScriptureNavigation } from '../../contexts/ScriptureNavigationContext';
import { sampleResourcesService } from '../../services/sampleResourcesService';
import type { TranslationNote } from '../../types/translationHelps';

interface TranslationNotesResourceProps {
  resourceId: string;
}

export const TranslationNotesResource: React.FC<TranslationNotesResourceProps> = ({ 
  resourceId 
}) => {
  const { currentReference, formatReference } = useScriptureNavigation();
  const api = useResourceAPI(resourceId);
  const [notes, setNotes] = useState<TranslationNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load notes when reference changes
  useEffect(() => {
    loadNotes();
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
              highlightRelatedNotes(data.word);
            }
          } else if (content.message.startsWith('scripture-navigation:')) {
            const data = JSON.parse(content.message.replace('scripture-navigation:', ''));
            console.log('📍 Navigation update from:', data.source);
          }
        } catch (e) {
          console.warn('Failed to parse message:', e);
        }
      }
    }
  }, [api.messaging]);

  const loadNotes = async () => {
    if (!currentReference.book) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Convert ScriptureReference to VerseReference format
      const verseRef = {
        ...currentReference,
        original: `${currentReference.book} ${currentReference.chapter}:${currentReference.verse}`
      };
      const passageHelps = await sampleResourcesService.getPassageHelps(verseRef);
      setNotes(passageHelps.notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load translation notes');
      console.error('Error loading translation notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const highlightRelatedNotes = (word: string) => {
    // Logic to highlight notes related to the selected word
    console.log('🔍 Highlighting notes related to word:', word);
  };

  const handleNotePress = (note: TranslationNote) => {
    // Send note selection to other resources
    api.messaging.sendToAll({
      type: 'text',
      message: `note-selected:${JSON.stringify({
        note: note,
        source: resourceId,
        reference: currentReference
      })}`
    });

    // If the note has a quote, highlight those words in scripture
    if (note.Quote) {
      api.messaging.sendToAll({
        type: 'text',
        message: `highlight-words:${JSON.stringify({
          words: note.Quote.split(' '),
          source: resourceId,
          noteReference: note.Reference
        })}`
      });
    }
  };

  const renderTranslationNote = (note: TranslationNote, index: number) => (
    <TouchableOpacity
      key={`note-${index}`}
      style={styles.noteItem}
      onPress={() => handleNotePress(note)}
    >
      <View style={styles.noteHeader}>
        <Text style={styles.noteReference}>{note.Reference}</Text>
        {note.Tags && (
          <View style={styles.tagContainer}>
            <Text style={styles.tag}>{note.Tags}</Text>
          </View>
        )}
      </View>
      
      {note.Quote && (
        <View style={styles.quoteContainer}>
          <Text style={styles.quoteLabel}>Quote:</Text>
          <Text style={styles.quoteText}>"{note.Quote}"</Text>
        </View>
      )}
      
      <Text style={styles.noteContent}>{note.Note}</Text>
      
      {note.SupportReference && (
        <Text style={styles.supportReference}>
          📚 See: {note.SupportReference.split('/').pop()}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading translation notes...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadNotes}>
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
          Translation Notes - {formatReference(currentReference)}
        </Text>
        <Text style={styles.subHeaderText}>
          {notes.length} note{notes.length !== 1 ? 's' : ''} available
        </Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {notes.length > 0 ? (
          notes.map(renderTranslationNote)
        ) : (
          <Text style={styles.emptyText}>
            No translation notes available for {formatReference(currentReference)}
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
  noteItem: {
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
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteReference: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  tagContainer: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tag: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  quoteContainer: {
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  quoteLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  quoteText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    marginTop: 2,
  },
  noteContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  supportReference: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
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

export default TranslationNotesResource;
