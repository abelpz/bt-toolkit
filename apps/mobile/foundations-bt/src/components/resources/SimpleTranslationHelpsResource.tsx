import React from 'react';
import { View, StyleSheet } from 'react-native';
import TranslationHelpsRenderer from '../TranslationHelpsRenderer';
import { useScriptureNavigation } from '../../contexts/ScriptureNavigationContext';
import type { VerseReference, TranslationNote, TranslationWord, TranslationQuestion } from '../../types/translationHelps';

interface SimpleTranslationHelpsResourceProps {
  resourceId: string;
}

export const SimpleTranslationHelpsResource: React.FC<SimpleTranslationHelpsResourceProps> = ({ resourceId }) => {
  const { currentReference, formatReference } = useScriptureNavigation();

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
  };

  const handleNotePress = (note: TranslationNote) => {
    console.log('📝 Note pressed:', note.Reference);
  };

  const handleQuestionPress = (question: TranslationQuestion) => {
    console.log('❓ Question pressed:', question.Reference);
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
