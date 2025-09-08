/**
 * Simple Enhanced Layout
 * A clean, working version of the enhanced interface
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView 
} from 'react-native';
import { useUnifiedResourceService } from '../contexts/UnifiedResourceServiceContext';
import { useScriptureNavigation } from '../contexts/ScriptureNavigationContext';

/**
 * Simple Enhanced Layout Component
 * Provides a clean, working interface for the enhanced features
 */
export const SimpleEnhancedLayout: React.FC = () => {
  // Hooks
  const { 
    isInitialized, 
    syncStatus, 
    offlineMode, 
    setOfflineMode,
    currentScope 
  } = useUnifiedResourceService();
  
  const { currentReference, availableBooks } = useScriptureNavigation();
  
  // Local state
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'scripture' | 'helps'>('scripture');
  
  // Sample scripture text for demonstration
  const sampleScriptureText = `In the beginning was the Word, and the Word was with God, and the Word was God. He was in the beginning with God. All things were made through him, and without him was not any thing made that was made.`;
  
  // Split text into tappable words
  const words = sampleScriptureText.split(/(\s+)/);
  
  // Handle word tap
  const handleWordTap = (word: string) => {
    const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
    setSelectedWord(cleanWord);
    setActivePanel('helps');
    console.log(`🔤 Word tapped: "${cleanWord}"`);
  };
  
  // Render tappable scripture text
  const renderScriptureText = () => (
    <View style={styles.scriptureContainer}>
      <Text style={styles.scriptureTitle}>
        {currentReference.book} {currentReference.chapter}:{currentReference.verse || 'all'}
      </Text>
      
      <View style={styles.textContainer}>
        {words.map((token, index) => {
          // If it's whitespace, render as regular text
          if (/^\s+$/.test(token)) {
            return <Text key={index} style={styles.text}>{token}</Text>;
          }
          
          // Clean word for comparison
          const cleanWord = token.replace(/[^\w]/g, '').toLowerCase();
          const isSelected = selectedWord === cleanWord;
          
          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleWordTap(cleanWord)}
              style={[
                styles.wordButton,
                isSelected && styles.selectedWord
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.text,
                isSelected && styles.selectedWordText
              ]}>
                {token}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {selectedWord && (
        <View style={styles.wordInfo}>
          <Text style={styles.wordInfoText}>
            Selected: "{selectedWord}" - Tap to see translation helps →
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSelectedWord(null);
              setActivePanel('scripture');
            }}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
  
  // Render translation helps
  const renderTranslationHelps = () => (
    <View style={styles.helpsContainer}>
      <Text style={styles.helpsTitle}>Translation Helps</Text>
      
      {selectedWord ? (
        <View style={styles.helpContent}>
          <Text style={styles.helpWordTitle}>Resources for: "{selectedWord}"</Text>
          
          <View style={styles.helpSection}>
            <Text style={styles.helpSectionTitle}>📝 Translation Notes</Text>
            <Text style={styles.helpText}>
              This word appears in the context of creation and divine nature. 
              Consider the theological implications when translating.
            </Text>
          </View>
          
          <View style={styles.helpSection}>
            <Text style={styles.helpSectionTitle}>📖 Translation Words</Text>
            <Text style={styles.helpText}>
              Key term related to divine attributes and biblical theology. 
              See related terms: God, divine, eternal.
            </Text>
          </View>
          
          <View style={styles.helpSection}>
            <Text style={styles.helpSectionTitle}>❓ Translation Questions</Text>
            <Text style={styles.helpText}>
              What does this word reveal about the nature of God? 
              How should this concept be expressed in the target language?
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyHelps}>
          <Text style={styles.emptyHelpsText}>
            👆 Tap any word in the scripture text to see related translation resources
          </Text>
        </View>
      )}
    </View>
  );
  
  // Render sync status
  const renderSyncStatus = () => {
    const getStatusColor = () => {
      switch (syncStatus.state) {
        case 'idle': return '#10B981';
        case 'syncing': return '#F59E0B';
        case 'error': return '#EF4444';
        default: return '#6B7280';
      }
    };
    
    return (
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>
            {syncStatus.state === 'idle' ? 'Synced' : 
             syncStatus.state === 'syncing' ? 'Syncing...' : 
             syncStatus.state === 'error' ? 'Error' : 'Ready'}
          </Text>
        </View>
        
        <View style={styles.statusRight}>
          <Text style={styles.statusInfo}>
            📚 {availableBooks.length} books • 🌐 {currentScope.languages.join(', ')}
          </Text>
          
          <TouchableOpacity
            onPress={() => setOfflineMode(!offlineMode)}
            style={[styles.offlineButton, offlineMode && styles.offlineButtonActive]}
          >
            <Text style={[
              styles.offlineButtonText,
              offlineMode && styles.offlineButtonTextActive
            ]}>
              {offlineMode ? '📴 Offline' : '🌐 Online'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Show loading if not initialized
  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingTitle}>🎯 Enhanced Foundations BT</Text>
          <Text style={styles.loadingText}>Initializing alignment-centric interface...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎯 Enhanced Foundations BT</Text>
        <Text style={styles.headerSubtitle}>Alignment-Centric Bible Translation</Text>
      </View>
      
      {/* Status bar */}
      {renderSyncStatus()}
      
      {/* Panel tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activePanel === 'scripture' && styles.activeTab]}
          onPress={() => setActivePanel('scripture')}
        >
          <Text style={[styles.tabText, activePanel === 'scripture' && styles.activeTabText]}>
            📖 Scripture
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activePanel === 'helps' && styles.activeTab]}
          onPress={() => setActivePanel('helps')}
        >
          <Text style={[styles.tabText, activePanel === 'helps' && styles.activeTabText]}>
            📝 Translation Helps
          </Text>
          {selectedWord && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>1</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Main content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activePanel === 'scripture' ? renderScriptureText() : renderTranslationHelps()}
      </ScrollView>
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 This demonstrates the alignment-centric workflow: tap words to see related resources
        </Text>
      </View>
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusInfo: {
    fontSize: 10,
    color: '#6B7280',
    marginRight: 12,
  },
  offlineButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  offlineButtonActive: {
    backgroundColor: '#F59E0B',
  },
  offlineButtonText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  offlineButtonTextActive: {
    color: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  tabBadge: {
    marginLeft: 6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 16,
  },
  tabBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scriptureContainer: {
    padding: 16,
  },
  scriptureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  wordInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordInfoText: {
    fontSize: 12,
    color: '#1E40AF',
    flex: 1,
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#DBEAFE',
    borderRadius: 4,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  helpsContainer: {
    padding: 16,
  },
  helpsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  helpContent: {
    gap: 16,
  },
  helpWordTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 8,
  },
  helpSection: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  helpSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  emptyHelps: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyHelpsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default SimpleEnhancedLayout;
