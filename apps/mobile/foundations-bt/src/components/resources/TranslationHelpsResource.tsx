import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResourceAPI } from 'linked-panels';
import TranslationHelpsRenderer from '../TranslationHelpsRenderer';
import { useScriptureNavigation } from '../../contexts/ScriptureNavigationContext';
import type { VerseReference, TranslationNote, TranslationWord, TranslationQuestion } from '../../types/translationHelps';

interface TranslationHelpsResourceProps {
  resourceId: string;
}

interface TranslationHelpsMessage {
  type: 'highlightWords' | 'clearHighlights' | 'navigateToVerse' | 'showNote' | 'showWord';
  lifecycle?: 'event' | 'state' | 'command';
  words?: string[];
  book?: string;
  chapter?: number;
  verse?: number;
  noteId?: string;
  wordId?: string;
}

export const TranslationHelpsResource: React.FC<TranslationHelpsResourceProps> = ({ resourceId }) => {
  const api = useResourceAPI<TranslationHelpsMessage>(resourceId);
  const { currentReference, formatReference } = useScriptureNavigation();

  // Handle incoming messages from other resources
  React.useEffect(() => {
    const messages = api.messaging.getMessages();
    messages.forEach(message => {
      const content = message.content;
      
      switch (content.type) {
        case 'navigateToVerse':
          if (content.book && content.chapter && content.verse) {
            console.log('📝 Translation helps received navigation request:', {
              book: content.book,
              chapter: content.chapter,
              verse: content.verse
            });
            // The component will automatically update when navigation context changes
          }
          break;
        case 'highlightWords':
          if (content.words) {
            console.log('📝 Translation helps received word highlight:', content.words);
            // Could highlight related notes or words
          }
          break;
        case 'showNote':
          if (content.noteId) {
            console.log('📝 Translation helps showing note:', content.noteId);
            // Could scroll to or highlight specific note
          }
          break;
        case 'showWord':
          if (content.wordId) {
            console.log('📝 Translation helps showing word:', content.wordId);
            // Could scroll to or highlight specific word definition
          }
          break;
      }
    });
    
    // Clear processed messages
    api.messaging.clearMessages();
  }, [api.messaging.getMessages().length]);

  // Convert book name to the format used in sample data
  const getBookCode = (bookName: string): string => {
    const bookMap: Record<string, string> = {
      'Jonah': 'JON',
      'Philemon': 'PHM',
      'Romans': 'ROM',
      // Add more mappings as needed
    };
    return bookMap[bookName] || bookName.toUpperCase().substring(0, 3);
  };

  // Convert current reference to VerseReference format
  const verseReference: VerseReference = {
    book: getBookCode(currentReference.book),
    chapter: currentReference.chapter,
    verse: currentReference.verse,
    original: formatReference(currentReference)
  };

  const handleWordPress = (word: TranslationWord) => {
    console.log('📖 Word pressed:', word.title);
    
    // Notify other resources about word selection
    api.messaging.sendToAll({
      type: 'showWord',
      lifecycle: 'event',
      wordId: word.id
    });
    
    // Could also highlight related words in scripture
    if (word.title) {
      api.messaging.sendToAll({
        type: 'highlightWords',
        lifecycle: 'event',
        words: [word.title.toLowerCase()]
      });
    }
  };

  const handleNotePress = (note: TranslationNote) => {
    console.log('📝 Note pressed:', note.Reference);
    
    // Notify other resources about note selection
    api.messaging.sendToAll({
      type: 'showNote',
      lifecycle: 'event',
      noteId: note.ID
    });
    
    // Navigate to the verse referenced in the note if different from current
    const [chapter, verse] = note.Reference.split(':').map(Number);
    if (chapter && verse && (chapter !== currentReference.chapter || verse !== currentReference.verse)) {
      api.messaging.sendToAll({
        type: 'navigateToVerse',
        lifecycle: 'event',
        book: currentReference.book,
        chapter,
        verse
      });
    }
    
    // Highlight the quote from the note in scripture
    if (note.Quote) {
      const words = note.Quote.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      api.messaging.sendToAll({
        type: 'highlightWords',
        lifecycle: 'event',
        words
      });
    }
  };

  const handleQuestionPress = (question: TranslationQuestion) => {
    console.log('❓ Question pressed:', question.Reference);
    
    // Navigate to the verse referenced in the question
    const [chapter, verse] = question.Reference.split(':').map(Number);
    if (chapter && verse) {
      api.messaging.sendToAll({
        type: 'navigateToVerse',
        lifecycle: 'event',
        book: currentReference.book,
        chapter,
        verse
      });
    }
  };

  return (
    <View style={styles.container}>
      <TranslationHelpsRenderer
        reference={verseReference}
        onWordPress={handleWordPress}
        onNotePress={handleNotePress}
        onQuestionPress={handleQuestionPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
