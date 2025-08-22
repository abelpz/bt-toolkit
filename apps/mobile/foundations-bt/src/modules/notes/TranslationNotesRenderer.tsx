import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';

export interface TranslationNote {
  id: string;
  reference: string;
  quote: string;
  occurrence: number;
  note: string;
  supportReference?: string;
  tags?: string[];
}

export interface TranslationNotesRendererProps {
  notes: TranslationNote[];
  currentReference?: string;
  onNotePress?: (note: TranslationNote) => void;
  onQuoteHighlight?: (quote: string, occurrence: number) => void;
  resourceId?: string;
  compact?: boolean;
}

export const TranslationNotesRenderer: React.FC<TranslationNotesRendererProps> = ({
  notes,
  currentReference,
  onNotePress,
  onQuoteHighlight,
  resourceId = 'translation-notes',
  compact = false
}) => {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [selectedNote, setSelectedNote] = useState<TranslationNote | null>(null);
  const [showNoteDetail, setShowNoteDetail] = useState(false);

  // Filter notes for current reference if provided
  const filteredNotes = currentReference 
    ? notes.filter(note => note.reference === currentReference)
    : notes;

  const toggleNoteExpansion = (noteId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  const handleNotePress = (note: TranslationNote) => {
    if (onNotePress) {
      onNotePress(note);
    }
    
    if (!compact) {
      setSelectedNote(note);
      setShowNoteDetail(true);
    }
  };

  const handleQuotePress = (note: TranslationNote) => {
    if (onQuoteHighlight) {
      onQuoteHighlight(note.quote, note.occurrence);
    }
  };

  const extractGreekWords = (noteText: string): string[] => {
    // Simple regex to find Greek text (characters in Greek Unicode range)
    const greekRegex = /[\u0370-\u03FF\u1F00-\u1FFF]+/g;
    const matches = noteText.match(greekRegex);
    return matches || [];
  };

  const formatNoteText = (text: string) => {
    // Simple markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1')     // Italic
      .replace(/`(.*?)`/g, '$1');      // Code
  };

  const renderNoteContent = (note: TranslationNote, isExpanded: boolean) => {
    const maxLength = compact ? 100 : 200;
    const shouldTruncate = note.note.length > maxLength && !isExpanded;
    const displayText = shouldTruncate 
      ? note.note.substring(0, maxLength) + '...'
      : note.note;

    return (
      <View style={styles.noteContent}>
        <Text style={styles.noteText}>
          {formatNoteText(displayText)}
        </Text>
        
        {note.note.length > maxLength && (
          <Pressable
            style={styles.expandButton}
            onPress={() => toggleNoteExpansion(note.id)}
          >
            <Text style={styles.expandButtonText}>
              {isExpanded ? 'Show Less' : 'Show More'}
            </Text>
          </Pressable>
        )}
        
        {note.supportReference && (
          <Text style={styles.supportReference}>
            Reference: {note.supportReference}
          </Text>
        )}
        
        {note.tags && note.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {note.tags.map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderNote = (note: TranslationNote, index: number) => {
    const isExpanded = expandedNotes.has(note.id);
    const greekWords = extractGreekWords(note.note);

    return (
      <Pressable
        key={note.id}
        style={[styles.noteCard, compact && styles.compactNoteCard]}
        onPress={() => handleNotePress(note)}
      >
        <View style={styles.noteHeader}>
          <View style={styles.noteHeaderLeft}>
            <Text style={styles.noteReference}>{note.reference}</Text>
            {note.quote && (
              <Pressable
                style={styles.quoteButton}
                onPress={() => handleQuotePress(note)}
              >
                <Text style={styles.quoteText}>"{note.quote}"</Text>
              </Pressable>
            )}
          </View>
          
          {note.occurrence > 1 && (
            <View style={styles.occurrenceBadge}>
              <Text style={styles.occurrenceText}>{note.occurrence}</Text>
            </View>
          )}
        </View>

        {greekWords.length > 0 && (
          <View style={styles.greekWordsContainer}>
            <Text style={styles.greekWordsLabel}>Greek:</Text>
            {greekWords.map((word, idx) => (
              <Text key={idx} style={styles.greekWord}>{word}</Text>
            ))}
          </View>
        )}

        {renderNoteContent(note, isExpanded)}
      </Pressable>
    );
  };

  const renderNoteDetailModal = () => {
    if (!selectedNote) return null;

    const greekWords = extractGreekWords(selectedNote.note);

    return (
      <Modal
        visible={showNoteDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNoteDetail(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Translation Note</Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => setShowNoteDetail(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.noteDetailHeader}>
              <Text style={styles.noteDetailReference}>{selectedNote.reference}</Text>
              {selectedNote.quote && (
                <Pressable
                  style={styles.noteDetailQuote}
                  onPress={() => handleQuotePress(selectedNote)}
                >
                  <Text style={styles.noteDetailQuoteText}>"{selectedNote.quote}"</Text>
                </Pressable>
              )}
            </View>

            {greekWords.length > 0 && (
              <View style={styles.noteDetailGreek}>
                <Text style={styles.noteDetailGreekLabel}>Greek Words:</Text>
                <View style={styles.noteDetailGreekWords}>
                  {greekWords.map((word, idx) => (
                    <Text key={idx} style={styles.noteDetailGreekWord}>{word}</Text>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.noteDetailContent}>
              <Text style={styles.noteDetailText}>
                {formatNoteText(selectedNote.note)}
              </Text>
            </View>

            {selectedNote.supportReference && (
              <View style={styles.noteDetailSupport}>
                <Text style={styles.noteDetailSupportLabel}>Support Reference:</Text>
                <Text style={styles.noteDetailSupportText}>{selectedNote.supportReference}</Text>
              </View>
            )}

            {selectedNote.tags && selectedNote.tags.length > 0 && (
              <View style={styles.noteDetailTags}>
                <Text style={styles.noteDetailTagsLabel}>Tags:</Text>
                <View style={styles.noteDetailTagsContainer}>
                  {selectedNote.tags.map(tag => (
                    <View key={tag} style={styles.noteDetailTag}>
                      <Text style={styles.noteDetailTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (filteredNotes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {currentReference 
            ? `No translation notes for ${currentReference}`
            : 'No translation notes available'
          }
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Translation Notes</Text>
            <Text style={styles.count}>{filteredNotes.length} notes</Text>
          </View>
          
          {filteredNotes.map((note, index) => renderNote(note, index))}
        </View>
      </ScrollView>
      
      {renderNoteDetailModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  count: {
    fontSize: 14,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noteCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  compactNoteCard: {
    padding: 12,
    marginBottom: 8,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteHeaderLeft: {
    flex: 1,
  },
  noteReference: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  quoteButton: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  quoteText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1d4ed8',
    fontStyle: 'italic',
  },
  occurrenceBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  occurrenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  greekWordsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
  },
  greekWordsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369a1',
    marginRight: 8,
  },
  greekWord: {
    fontSize: 16,
    fontFamily: 'System', // Greek font
    color: '#0c4a6e',
    marginRight: 8,
    marginBottom: 2,
  },
  noteContent: {
    marginTop: 8,
  },
  noteText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },
  expandButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  expandButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  supportReference: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#64748b',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  noteDetailHeader: {
    marginBottom: 20,
  },
  noteDetailReference: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 8,
  },
  noteDetailQuote: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  noteDetailQuoteText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1d4ed8',
    fontStyle: 'italic',
  },
  noteDetailGreek: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
  },
  noteDetailGreekLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  noteDetailGreekWords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  noteDetailGreekWord: {
    fontSize: 18,
    fontFamily: 'System',
    color: '#0c4a6e',
    marginRight: 12,
    marginBottom: 4,
  },
  noteDetailContent: {
    marginBottom: 20,
  },
  noteDetailText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
  noteDetailSupport: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  noteDetailSupportLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  noteDetailSupportText: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
  noteDetailTags: {
    marginBottom: 20,
  },
  noteDetailTagsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  noteDetailTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  noteDetailTag: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  noteDetailTagText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
});

export default TranslationNotesRenderer;
