/**
 * Translation Helps Renderer Component
 * Displays translation notes, questions, and word links for scripture passages
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import {
  PassageHelps,
  VerseReference,
  TranslationNote,
  TranslationQuestion,
  TranslationWordsLink,
  TranslationWord,
} from '../types/translationHelps';

import { sampleResourcesService } from '../services/sampleResourcesService';

interface TranslationHelpsRendererProps {
  reference: VerseReference;
  onWordPress?: (word: TranslationWord) => void;
  onNotePress?: (note: TranslationNote) => void;
  onQuestionPress?: (question: TranslationQuestion) => void;
  style?: any;
}

export const TranslationHelpsRenderer: React.FC<TranslationHelpsRendererProps> = ({
  reference,
  onWordPress,
  onNotePress,
  onQuestionPress,
  style
}) => {
  const [helps, setHelps] = useState<PassageHelps | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'questions' | 'words' | 'academy' | 'texts'>('notes');

  useEffect(() => {
    loadHelps();
  }, [reference]);

  const loadHelps = async () => {
    if (!reference.book) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const passageHelps = await sampleResourcesService.getPassageHelps(reference);
      setHelps(passageHelps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load translation helps');
      console.error('Error loading translation helps:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderTabButton = (tab: 'notes' | 'questions' | 'words' | 'academy' | 'texts', label: string, count: number) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tab && styles.activeTabButton
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[
        styles.tabButtonText,
        activeTab === tab && styles.activeTabButtonText
      ]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderTranslationNote = (note: TranslationNote, index: number) => (
    <TouchableOpacity
      key={`note-${index}`}
      style={styles.helpItem}
      onPress={() => onNotePress?.(note)}
    >
      <View style={styles.helpHeader}>
        <Text style={styles.helpReference}>{note.Reference}</Text>
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
      
      <Text style={styles.helpContent}>{note.Note}</Text>
      
      {note.SupportReference && (
        <Text style={styles.supportReference}>
          📚 See: {note.SupportReference.split('/').pop()}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderTranslationQuestion = (question: TranslationQuestion, index: number) => (
    <TouchableOpacity
      key={`question-${index}`}
      style={styles.helpItem}
      onPress={() => onQuestionPress?.(question)}
    >
      <View style={styles.helpHeader}>
        <Text style={styles.helpReference}>{question.Reference}</Text>
        {question.Tags && (
          <View style={styles.tagContainer}>
            <Text style={styles.tag}>{question.Tags}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.questionText}>❓ {question.Question}</Text>
      
      {question.Response && (
        <Text style={styles.responseText}>💡 {question.Response}</Text>
      )}
    </TouchableOpacity>
  );

  const renderTranslationWord = (word: TranslationWord, index: number) => (
    <TouchableOpacity
      key={`word-${index}`}
      style={styles.helpItem}
      onPress={() => onWordPress?.(word)}
    >
      <View style={styles.helpHeader}>
        <Text style={styles.wordTitle}>{word.title}</Text>
        <View style={styles.tagContainer}>
          <Text style={[styles.tag, styles[`${word.category}Tag`]]}>{word.category}</Text>
        </View>
      </View>
      
      <Text style={styles.helpContent} numberOfLines={3}>
        {word.definition}
      </Text>
      
      {word.translationSuggestions && (
        <Text style={styles.supportReference}>
          💡 Translation suggestions available
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderWordLink = (link: TranslationWordsLink, index: number) => (
    <View key={`link-${index}`} style={styles.wordLinkItem}>
      <Text style={styles.wordLinkReference}>{link.Reference}</Text>
      <Text style={styles.wordLinkOriginal}>{link.OrigWords}</Text>
      <Text style={styles.wordLinkTarget}>→ {link.TWLink.split('/').pop()}</Text>
    </View>
  );

  const renderTranslationAcademyArticle = (article: any, index: number) => (
    <TouchableOpacity
      key={`academy-${index}`}
      style={styles.helpItem}
      onPress={() => {/* Handle academy article press */}}
    >
      <View style={styles.helpHeader}>
        <Text style={styles.wordTitle}>{article.title}</Text>
        <View style={styles.tagContainer}>
          <Text style={styles.tag}>{article.category}</Text>
        </View>
      </View>
      
      {article.description && (
        <Text style={styles.helpContent} numberOfLines={3}>
          {article.description}
        </Text>
      )}
      
      {article.examples && (
        <Text style={styles.supportReference}>
          📖 Examples available
        </Text>
      )}
      
      {article.strategies && (
        <Text style={styles.supportReference}>
          💡 Translation strategies available
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderBibleText = (text: any, index: number) => (
    <View key={`text-${index}`} style={styles.helpItem}>
      <View style={styles.helpHeader}>
        <Text style={styles.wordTitle}>{text.book} - {text.translation}</Text>
        <View style={styles.tagContainer}>
          <Text style={styles.tag}>{text.hasAlignment ? 'Aligned' : 'Text'}</Text>
        </View>
      </View>
      
      <Text style={styles.helpContent} numberOfLines={5}>
        {text.content.substring(0, 200)}...
      </Text>
      
      {text.hasAlignment && (
        <Text style={styles.supportReference}>
          🔗 Word alignment data available
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading translation helps...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadHelps}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!helps) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <Text style={styles.noDataText}>No translation helps available</Text>
      </View>
    );
  }

  const notesCount = helps.notes.length;
  const questionsCount = helps.questions.length;
  const wordsCount = helps.words.length;
  const academyCount = helps.academyArticles?.length || 0;
  const textsCount = helps.bibleTexts?.length || 0;
  const totalCount = notesCount + questionsCount + wordsCount + academyCount + textsCount;

  if (totalCount === 0) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <Text style={styles.noDataText}>
          No translation helps found for {reference.book} {reference.chapter}:{reference.verse}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollContainer}
        contentContainerStyle={styles.tabContainer}
      >
        {renderTabButton('notes', 'Notes', notesCount)}
        {renderTabButton('questions', 'Questions', questionsCount)}
        {renderTabButton('words', 'Words', wordsCount)}
        {academyCount > 0 && renderTabButton('academy', 'Academy', academyCount)}
        {textsCount > 0 && renderTabButton('texts', 'Texts', textsCount)}
      </ScrollView>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'notes' && (
          <View>
            {helps.notes.map(renderTranslationNote)}
            {helps.notes.length === 0 && (
              <Text style={styles.emptyTabText}>No translation notes for this passage</Text>
            )}
          </View>
        )}

        {activeTab === 'questions' && (
          <View>
            {helps.questions.map(renderTranslationQuestion)}
            {helps.questions.length === 0 && (
              <Text style={styles.emptyTabText}>No translation questions for this passage</Text>
            )}
          </View>
        )}

        {activeTab === 'words' && (
          <View>
            {helps.words.map(renderTranslationWord)}
            {helps.wordLinks.length > 0 && (
              <View style={styles.wordLinksSection}>
                <Text style={styles.sectionTitle}>Word Links</Text>
                {helps.wordLinks.map(renderWordLink)}
              </View>
            )}
            {helps.words.length === 0 && helps.wordLinks.length === 0 && (
              <Text style={styles.emptyTabText}>No translation words for this passage</Text>
            )}
          </View>
        )}

        {activeTab === 'academy' && (
          <View>
            {helps.academyArticles?.map(renderTranslationAcademyArticle) || []}
            {academyCount === 0 && (
              <Text style={styles.emptyTabText}>No Translation Academy articles for this passage</Text>
            )}
          </View>
        )}

        {activeTab === 'texts' && (
          <View>
            {helps.bibleTexts?.map(renderBibleText) || []}
            {textsCount === 0 && (
              <Text style={styles.emptyTabText}>No Bible texts available</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  tabScrollContainer: {
    backgroundColor: '#ffffff',
    flex: 0,
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    flex: 0,
    flexGrow: 0,
  },
  tabButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 4,
  },
  activeTabButton: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#007AFF',
  },
  tabButtonText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  helpItem: {
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  helpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  helpReference: {
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
  helpContent: {
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
  questionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 8,
  },
  responseText: {
    fontSize: 14,
    color: '#059669',
    fontStyle: 'italic',
  },
  wordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  wordLinksSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
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
  emptyTabText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
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

export default TranslationHelpsRenderer;
