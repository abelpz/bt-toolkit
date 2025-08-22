import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useResourceAPI } from 'linked-panels';
import { useScriptureNavigation } from '../../contexts/ScriptureNavigationContext';
import { sampleResourcesService } from '../../services/sampleResourcesService';
import type { TranslationQuestion } from '../../types/translationHelps';

interface TranslationQuestionsResourceProps {
  resourceId: string;
}

export const TranslationQuestionsResource: React.FC<TranslationQuestionsResourceProps> = ({ 
  resourceId 
}) => {
  const { currentReference, formatReference } = useScriptureNavigation();
  const api = useResourceAPI(resourceId);
  const [questions, setQuestions] = useState<TranslationQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  // Load questions when reference changes
  useEffect(() => {
    loadQuestions();
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
              findRelatedQuestions(data.word);
            }
          } else if (content.message.startsWith('note-selected:')) {
            const data = JSON.parse(content.message.replace('note-selected:', ''));
            if (data.note && data.note.Quote) {
              findQuestionsForQuote(data.note.Quote);
            }
          }
        } catch (e) {
          console.warn('Failed to parse message:', e);
        }
      }
    }
  }, [api.messaging]);

  const loadQuestions = async () => {
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
      setQuestions(passageHelps.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load translation questions');
      console.error('Error loading translation questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const findRelatedQuestions = (word: string) => {
    // Find questions that might be related to the selected word
    const relatedQuestions = questions.filter(question => 
      question.Question.toLowerCase().includes(word.toLowerCase()) ||
      (question.Response && question.Response.toLowerCase().includes(word.toLowerCase()))
    );
    
    if (relatedQuestions.length > 0) {
      console.log('🔍 Found related questions:', relatedQuestions.length);
    }
  };

  const findQuestionsForQuote = (quote: string) => {
    // Find questions that reference the quote
    console.log('🔍 Finding questions for quote:', quote);
  };

  const handleQuestionPress = (question: TranslationQuestion) => {
    // Toggle expanded state
    const questionId = `${question.Reference}-${question.Question}`;
    setExpandedQuestion(expandedQuestion === questionId ? null : questionId);
    
    // Send question selection to other resources
    api.messaging.sendToAll({
      type: 'text',
      message: `question-selected:${JSON.stringify({
        question: question,
        source: resourceId,
        reference: currentReference
      })}`
    });

    // If the question has keywords, highlight them in scripture
    const keywords = extractKeywords(question.Question);
    if (keywords.length > 0) {
      api.messaging.sendToAll({
        type: 'text',
        message: `highlight-words:${JSON.stringify({
          words: keywords,
          source: resourceId,
          questionReference: question.Reference
        })}`
      });
    }
  };

  const extractKeywords = (question: string): string[] => {
    // Simple keyword extraction - look for quoted words or important terms
    const quotedWords = question.match(/"([^"]+)"/g);
    if (quotedWords) {
      return quotedWords.map(word => word.replace(/"/g, ''));
    }
    
    // Fallback: extract important words (nouns, verbs)
    const words = question.split(' ').filter(word => 
      word.length > 3 && 
      !['what', 'when', 'where', 'why', 'how', 'does', 'will', 'should', 'could'].includes(word.toLowerCase())
    );
    
    return words.slice(0, 3); // Limit to first 3 important words
  };

  const renderTranslationQuestion = (question: TranslationQuestion, index: number) => {
    const questionId = `${question.Reference}-${question.Question}`;
    const isExpanded = expandedQuestion === questionId;
    
    return (
      <TouchableOpacity
        key={`question-${index}`}
        style={[
          styles.questionItem,
          isExpanded && styles.expandedQuestionItem
        ]}
        onPress={() => handleQuestionPress(question)}
      >
        <View style={styles.questionHeader}>
          <Text style={styles.questionReference}>{question.Reference}</Text>
          {question.Tags && (
            <View style={styles.tagContainer}>
              <Text style={styles.tag}>{question.Tags}</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.questionText}>❓ {question.Question}</Text>
        
        {isExpanded && question.Response && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseLabel}>Suggested Response:</Text>
            <Text style={styles.responseText}>{question.Response}</Text>
          </View>
        )}
        
        {!isExpanded && question.Response && (
          <Text style={styles.hasResponseIndicator}>
            💡 Tap to see suggested response
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading translation questions...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadQuestions}>
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
          Translation Questions - {formatReference(currentReference)}
        </Text>
        <Text style={styles.subHeaderText}>
          {questions.length} question{questions.length !== 1 ? 's' : ''} available
        </Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {questions.length > 0 ? (
          questions.map(renderTranslationQuestion)
        ) : (
          <Text style={styles.emptyText}>
            No translation questions available for {formatReference(currentReference)}
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
  questionItem: {
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
  expandedQuestionItem: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionReference: {
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
  questionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    lineHeight: 20,
  },
  responseContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
  },
  responseLabel: {
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '600',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#0c4a6e',
    lineHeight: 20,
  },
  hasResponseIndicator: {
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

export default TranslationQuestionsResource;
