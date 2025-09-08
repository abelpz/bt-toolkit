/**
 * Enhanced Scripture Resource
 * Scripture component with alignment-centric word-tap interactions
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useResourceAPI } from 'linked-panels';
import { useUnifiedResourceService } from '../../contexts/UnifiedResourceServiceContext';
import { useScriptureNavigation } from '../../contexts/ScriptureNavigationContext';
import { ScriptureReference, AlignmentInteraction } from '../../services/unified-resource-service';

// Props interface
interface EnhancedScriptureResourceProps {
  resourceId: string;
  textType: 'simplified' | 'literal';
  reference?: ScriptureReference;
}

// Word interaction message types for linked-panels
interface WordSelectedMessage {
  type: 'word-selected';
  lifecycle: 'state';
  data: {
    word: string;
    reference: ScriptureReference;
    interaction: AlignmentInteraction;
    sourcePanel: string;
  };
}

interface HighlightWordMessage {
  type: 'highlight-word';
  lifecycle: 'state';
  data: {
    word: string;
    reference: ScriptureReference;
    sourcePanel: string;
  };
}

/**
 * Enhanced Scripture Resource Component
 * Provides tappable scripture text with alignment-centric interactions
 */
export const EnhancedScriptureResource: React.FC<EnhancedScriptureResourceProps> = ({
  resourceId,
  textType,
  reference: propReference
}) => {
  // Hooks
  const api = useResourceAPI(resourceId);
  const { getResourcesForReference, getWordInteractions, syncStatus } = useUnifiedResourceService();
  const { currentReference } = useScriptureNavigation();
  
  // Use prop reference or current navigation reference
  const reference = propReference || {
    book: currentReference.book,
    chapter: currentReference.chapter,
    verse: currentReference.verse
  };
  
  // State
  const [scriptureText, setScriptureText] = useState<string>('');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wordInteraction, setWordInteraction] = useState<AlignmentInteraction | null>(null);
  
  // Load scripture text for current reference
  useEffect(() => {
    let mounted = true;
    
    const loadScriptureText = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`📖 Loading ${textType} scripture for ${reference.book} ${reference.chapter}:${reference.verse || 'all'}`);
        
        // Get bible text resources
        const resources = await getResourcesForReference(reference, {
          resourceTypes: ['bible-text'],
          maxResults: 5
        });
        
        // Find the appropriate text type
        const bibleResource = resources.find(r => {
          if (textType === 'simplified') {
            return r.metadata.title?.toLowerCase().includes('simplified') || 
                   r.metadata.title?.toLowerCase().includes('ust') ||
                   r.id.includes('ust');
          } else {
            return r.metadata.title?.toLowerCase().includes('literal') || 
                   r.metadata.title?.toLowerCase().includes('ult') ||
                   r.id.includes('ult');
          }
        }) || resources[0]; // Fallback to first available
        
        if (bibleResource && mounted) {
          // Extract text from resource content
          let text = '';
          if (typeof bibleResource.content === 'string') {
            text = bibleResource.content;
          } else if (bibleResource.content?.text) {
            text = bibleResource.content.text;
                      } else if (bibleResource.content?.chapters) {
              // Handle structured USFM content
              const chapter = bibleResource.content.chapters[reference.chapter - 1];
              if (chapter) {
                if (reference.verse) {
                  const verse = chapter.verses[reference.verse - 1];
                  text = verse?.content || '';
                } else {
                  text = chapter.verses.map((v: { verse: number; content: string }) => `${v.verse} ${v.content}`).join(' ');
                }
              }
            } else {
            text = JSON.stringify(bibleResource.content).substring(0, 200) + '...';
          }
          
          setScriptureText(text || `No ${textType} text available for ${reference.book} ${reference.chapter}:${reference.verse || 'all'}`);
        } else if (mounted) {
          setScriptureText(`No ${textType} scripture found for ${reference.book} ${reference.chapter}:${reference.verse || 'all'}`);
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load scripture';
          setError(errorMessage);
          setLoading(false);
          console.error('❌ Error loading scripture text:', err);
        }
      }
    };
    
    loadScriptureText();
    
    return () => {
      mounted = false;
    };
  }, [reference, textType, getResourcesForReference]);
  
  // Listen for highlight messages from other panels
  const messages = api.messaging.getMessages();
  
  useEffect(() => {
    const highlightMessages = messages.filter(m => 
      m.content.type === 'highlight-word' && 
      m.content.data.sourcePanel !== resourceId
    );
    
    const latestHighlight = highlightMessages[highlightMessages.length - 1];
    
    if (latestHighlight) {
      const { word } = latestHighlight.content.data;
      setHighlightedWord(word);
      console.log(`🔤 Highlighting word "${word}" from other panel`);
    }
  }, [messages, resourceId]);
  
  // Handle word tap - core alignment-centric feature
  const handleWordTap = useCallback(async (word: string) => {
    try {
      console.log(`🔤 Word tapped: "${word}" in ${textType} text`);
      
      setSelectedWord(word);
      setHighlightedWord(word);
      
      // Get word interactions from unified service
      const interaction = await getWordInteractions(reference, word, {
        includeOriginalText: true,
        maxDepth: 3,
        includeRelated: true
      });
      
      if (interaction) {
        setWordInteraction(interaction);
        
        // Send word selection message to other panels
        api.messaging.send('translation-helps', {
          type: 'word-selected',
          lifecycle: 'state',
          data: {
            word,
            reference,
            interaction,
            sourcePanel: resourceId
          }
        } as WordSelectedMessage);
        
        // Send highlight message to other scripture panels
        const otherScripturePanel = textType === 'simplified' ? 'literal-text' : 'simplified-text';
        api.messaging.send(otherScripturePanel, {
          type: 'highlight-word',
          lifecycle: 'state',
          data: {
            word,
            reference,
            sourcePanel: resourceId
          }
        } as HighlightWordMessage);
        
        console.log(`🎯 Word interaction found: ${interaction.translationNotes.length} notes, ${interaction.translationWords.length} words`);
      } else {
        console.log(`ℹ️ No additional information found for "${word}"`);
      }
    } catch (error) {
      console.error('❌ Error handling word tap:', error);
    }
  }, [reference, textType, resourceId, api, getWordInteractions]);
  
  // Render tappable words
  const renderTappableText = useMemo(() => {
    if (!scriptureText) return null;
    
    // Split text into words and whitespace
    const tokens = scriptureText.split(/(\s+)/);
    
    return (
      <View style={styles.textContainer}>
        {tokens.map((token, index) => {
          // If it's whitespace, render as regular text
          if (/^\s+$/.test(token)) {
            return <Text key={index} style={styles.text}>{token}</Text>;
          }
          
          // Clean word for comparison (remove punctuation)
          const cleanWord = token.replace(/[^\w]/g, '').toLowerCase();
          const isSelected = selectedWord?.toLowerCase() === cleanWord;
          const isHighlighted = highlightedWord?.toLowerCase() === cleanWord;
          
          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleWordTap(cleanWord)}
              style={[
                styles.wordButton,
                isSelected && styles.selectedWord,
                isHighlighted && !isSelected && styles.highlightedWord
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.text,
                isSelected && styles.selectedWordText,
                isHighlighted && !isSelected && styles.highlightedWordText
              ]}>
                {token}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }, [scriptureText, selectedWord, highlightedWord, handleWordTap]);
  
  // Render word interaction info
  const renderWordInteractionInfo = () => {
    if (!selectedWord || !wordInteraction) return null;
    
    return (
      <View style={styles.interactionInfo}>
        <Text style={styles.interactionTitle}>
          "{selectedWord}" - {wordInteraction.translationNotes.length} notes, {wordInteraction.translationWords.length} definitions
        </Text>
        {wordInteraction.originalText && (
          <Text style={styles.originalText}>
            Original: {wordInteraction.originalText}
          </Text>
        )}
      </View>
    );
  };
  
  // Render sync status indicator
  const renderSyncStatus = () => {
    const getStatusColor = () => {
      switch (syncStatus.state) {
        case 'idle': return '#10B981'; // Use 'idle' instead of 'synced'
        case 'syncing': return '#F59E0B';
        case 'error': return '#EF4444';
        case 'offline': return '#6B7280';
        default: return '#6B7280';
      }
    };
    
    return (
      <View style={styles.syncStatus}>
        <View style={[styles.syncIndicator, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.syncText}>
          {syncStatus.state === 'syncing' ? 'Syncing...' : 
           syncStatus.state === 'error' ? 'Sync Error' :
           syncStatus.state === 'idle' ? 'Synced' :
           syncStatus.connected ? 'Online' : 'Offline'}
        </Text>
      </View>
    );
  };
  
  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{textType === 'simplified' ? 'Simplified Text' : 'Literal Text'}</Text>
          {renderSyncStatus()}
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading {textType} scripture...</Text>
        </View>
      </View>
    );
  }
  
  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{textType === 'simplified' ? 'Simplified Text' : 'Literal Text'}</Text>
          {renderSyncStatus()}
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => window.location.reload()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Main render
  return (
    <View style={styles.container}>
      {/* Header with title and sync status */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {textType === 'simplified' ? 'Simplified Text' : 'Literal Text'}
        </Text>
        {renderSyncStatus()}
      </View>
      
      {/* Reference info */}
      <View style={styles.referenceInfo}>
        <Text style={styles.referenceText}>
          {reference.book} {reference.chapter}:{reference.verse || 'all'}
        </Text>
        {selectedWord && (
          <TouchableOpacity
            onPress={() => {
              setSelectedWord(null);
              setHighlightedWord(null);
              setWordInteraction(null);
            }}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>Clear Selection</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Word interaction info */}
      {renderWordInteractionInfo()}
      
      {/* Scripture text with tappable words */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderTappableText}
        
        {/* Help text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            💡 Tap any word to see related translation notes, definitions, and cross-references
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  syncText: {
    fontSize: 12,
    color: '#6B7280',
  },
  referenceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
  },
  referenceText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#6B7280',
  },
  interactionInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#EBF8FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  interactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  originalText: {
    fontSize: 12,
    color: '#374151',
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  textContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 16,
    lineHeight: 24,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1F2937',
  },
  wordButton: {
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 3,
    marginHorizontal: 1,
  },
  selectedWord: {
    backgroundColor: '#3B82F6',
  },
  selectedWordText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  highlightedWord: {
    backgroundColor: '#FEF3C7',
  },
  highlightedWordText: {
    color: '#92400E',
    fontWeight: '500',
  },
  helpContainer: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginTop: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default EnhancedScriptureResource;
