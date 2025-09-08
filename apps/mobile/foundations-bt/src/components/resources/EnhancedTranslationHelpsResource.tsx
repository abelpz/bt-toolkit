/**
 * Enhanced Translation Helps Resource
 * Translation helps component that responds to word selections from scripture panels
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { useResourceAPI } from 'linked-panels';
import { useUnifiedResourceService } from '../../contexts/UnifiedResourceServiceContext';
import { useScriptureNavigation } from '../../contexts/ScriptureNavigationContext';
import { 
  ScriptureReference, 
  TranslationResource, 
  AlignmentInteraction 
} from '../../services/unified-resource-service';

// Props interface
interface EnhancedTranslationHelpsResourceProps {
  resourceId: string;
}

// Tab types for different resource categories
type ResourceTab = 'all' | 'notes' | 'words' | 'questions' | 'academy';

interface ResourceTabInfo {
  id: ResourceTab;
  title: string;
  icon: string;
  resourceTypes: string[];
}

const RESOURCE_TABS: ResourceTabInfo[] = [
  { id: 'all', title: 'All', icon: '📚', resourceTypes: ['translation-notes', 'translation-words', 'translation-questions', 'translation-academy'] },
  { id: 'notes', title: 'Notes', icon: '📝', resourceTypes: ['translation-notes'] },
  { id: 'words', title: 'Words', icon: '📖', resourceTypes: ['translation-words'] },
  { id: 'questions', title: 'Questions', icon: '❓', resourceTypes: ['translation-questions'] },
  { id: 'academy', title: 'Academy', icon: '🎓', resourceTypes: ['translation-academy'] }
];

/**
 * Enhanced Translation Helps Resource Component
 * Displays translation resources with word-based filtering
 */
export const EnhancedTranslationHelpsResource: React.FC<EnhancedTranslationHelpsResourceProps> = ({
  resourceId
}) => {
  // Hooks
  const api = useResourceAPI(resourceId);
  const { getResourcesForReference, syncStatus } = useUnifiedResourceService();
  const { currentReference } = useScriptureNavigation();
  
  // State
  const [resources, setResources] = useState<TranslationResource[]>([]);
  const [filteredResources, setFilteredResources] = useState<TranslationResource[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordInteraction, setWordInteraction] = useState<AlignmentInteraction | null>(null);
  const [activeTab, setActiveTab] = useState<ResourceTab>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Convert current reference to ScriptureReference format
  const reference: ScriptureReference = useMemo(() => ({
    book: currentReference.book,
    chapter: currentReference.chapter,
    verse: currentReference.verse
  }), [currentReference]);
  
  // Load resources for current reference
  useEffect(() => {
    let mounted = true;
    
    const loadResources = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`📚 Loading translation helps for ${reference.book} ${reference.chapter}:${reference.verse || 'all'}`);
        
        const result = await getResourcesForReference(reference, {
          resourceTypes: ['translation-notes', 'translation-words', 'translation-questions', 'translation-academy'],
          maxResults: 100
        });
        
        if (mounted) {
          setResources(result);
          setFilteredResources(result);
          setLoading(false);
          
          console.log(`📚 Loaded ${result.length} translation helps resources`);
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load translation helps';
          setError(errorMessage);
          setLoading(false);
          console.error('❌ Error loading translation helps:', err);
        }
      }
    };
    
    loadResources();
    
    return () => {
      mounted = false;
    };
  }, [reference, getResourcesForReference]);
  
  // Listen for word selection messages from scripture panels
  const messages = api.messaging.getMessages();
  
  useEffect(() => {
    const wordSelectedMessages = messages.filter(m => m.content.type === 'word-selected');
    const latestMessage = wordSelectedMessages[wordSelectedMessages.length - 1];
    
    if (latestMessage) {
      const { word, interaction } = latestMessage.content.data;
      setSelectedWord(word);
      setWordInteraction(interaction);
      
      // Filter resources based on word interaction
      const relatedResources = [
        ...interaction.translationNotes,
        ...interaction.translationWords
      ];
      
      if (relatedResources.length > 0) {
        setFilteredResources(relatedResources);
        console.log(`📝 Filtered to ${relatedResources.length} resources for word "${word}"`);
      } else {
        // If no specific resources found, show all resources for context
        setFilteredResources(resources);
        console.log(`📝 No specific resources for "${word}", showing all ${resources.length} resources`);
      }
    }
  }, [messages, resources]);
  
  // Filter resources by active tab
  const tabFilteredResources = useMemo(() => {
    const activeTabInfo = RESOURCE_TABS.find(tab => tab.id === activeTab);
    if (!activeTabInfo || activeTab === 'all') {
      return filteredResources;
    }
    
    return filteredResources.filter(resource => 
      activeTabInfo.resourceTypes.includes(resource.type)
    );
  }, [filteredResources, activeTab]);
  
  // Get resource counts for tabs
  const getTabCounts = useCallback(() => {
    const counts: Record<ResourceTab, number> = {
      all: filteredResources.length,
      notes: 0,
      words: 0,
      questions: 0,
      academy: 0
    };
    
    filteredResources.forEach(resource => {
      switch (resource.type) {
        case 'translation-notes':
          counts.notes++;
          break;
        case 'translation-words':
          counts.words++;
          break;
        case 'translation-questions':
          counts.questions++;
          break;
        case 'translation-academy':
          counts.academy++;
          break;
      }
    });
    
    return counts;
  }, [filteredResources]);
  
  // Clear word selection
  const clearWordSelection = useCallback(() => {
    setSelectedWord(null);
    setWordInteraction(null);
    setFilteredResources(resources);
    console.log('🔄 Cleared word selection, showing all resources');
  }, [resources]);
  
  // Handle resource item press
  const handleResourcePress = useCallback((resource: TranslationResource) => {
    Alert.alert(
      resource.metadata.title || resource.type,
      typeof resource.content === 'string' 
        ? resource.content 
        : JSON.stringify(resource.content, null, 2),
      [{ text: 'OK' }]
    );
  }, []);
  
  // Render resource item
  const renderResourceItem = useCallback((resource: TranslationResource) => {
    const getResourceIcon = (type: string) => {
      switch (type) {
        case 'translation-notes': return '📝';
        case 'translation-words': return '📖';
        case 'translation-questions': return '❓';
        case 'translation-academy': return '🎓';
        default: return '📄';
      }
    };
    
    const getSyncStatusColor = (status?: string) => {
      switch (status) {
        case 'idle': return '#10B981'; // Use 'idle' instead of 'synced'
        case 'pending': return '#F59E0B';
        case 'error': return '#EF4444';
        default: return '#6B7280';
      }
    };
    
    const getResourceTypeLabel = (type: string) => {
      switch (type) {
        case 'translation-notes': return 'Translation Notes';
        case 'translation-words': return 'Translation Words';
        case 'translation-questions': return 'Translation Questions';
        case 'translation-academy': return 'Translation Academy';
        default: return type.replace('-', ' ');
      }
    };
    
    return (
      <TouchableOpacity
        key={resource.id}
        style={styles.resourceItem}
        onPress={() => handleResourcePress(resource)}
        activeOpacity={0.7}
      >
        <View style={styles.resourceHeader}>
          <View style={styles.resourceTitleRow}>
            <Text style={styles.resourceIcon}>
              {getResourceIcon(resource.type)}
            </Text>
            <Text style={styles.resourceTitle} numberOfLines={1}>
              {resource.metadata.title || getResourceTypeLabel(resource.type)}
            </Text>
            <View
              style={[
                styles.syncIndicator,
                { backgroundColor: getSyncStatusColor(resource.metadata.syncStatus) }
              ]}
            />
          </View>
          
          <View style={styles.resourceMeta}>
            <Text style={styles.resourceType}>
              {getResourceTypeLabel(resource.type)}
            </Text>
            {resource.book && (
              <Text style={styles.resourceReference}>
                {resource.book} {resource.chapter}:{resource.verse || 'all'}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.resourceContent}>
          <Text style={styles.resourceText} numberOfLines={3}>
            {typeof resource.content === 'string' 
              ? resource.content 
              : JSON.stringify(resource.content).substring(0, 150) + '...'
            }
          </Text>
        </View>
        
        <View style={styles.resourceFooter}>
          <Text style={styles.resourceSource}>
            {resource.metadata.source} • {resource.language}
          </Text>
          <Text style={styles.resourceDate}>
            {resource.metadata.lastModified.toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [handleResourcePress]);
  
  // Render tab bar
  const renderTabBar = () => {
    const tabCounts = getTabCounts();
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {RESOURCE_TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[
              styles.tabTitle,
              activeTab === tab.id && styles.activeTabTitle
            ]}>
              {tab.title}
            </Text>
            <Text style={[
              styles.tabCount,
              activeTab === tab.id && styles.activeTabCount
            ]}>
              {tabCounts[tab.id]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };
  
  // Render word selection info
  const renderWordSelectionInfo = () => {
    if (!selectedWord || !wordInteraction) return null;
    
    return (
      <View style={styles.wordSelectionInfo}>
        <View style={styles.wordSelectionHeader}>
          <Text style={styles.wordSelectionTitle}>
            Showing resources for: "{selectedWord}"
          </Text>
          <TouchableOpacity
            onPress={clearWordSelection}
            style={styles.clearSelectionButton}
          >
            <Text style={styles.clearSelectionText}>Clear</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.wordSelectionStats}>
          <Text style={styles.wordSelectionStat}>
            📝 {wordInteraction.translationNotes.length} notes
          </Text>
          <Text style={styles.wordSelectionStat}>
            📖 {wordInteraction.translationWords.length} definitions
          </Text>
          <Text style={styles.wordSelectionStat}>
            🔗 {wordInteraction.crossReferences.length} references
          </Text>
        </View>
        
        {wordInteraction.originalText && (
          <Text style={styles.originalText}>
            Original: {wordInteraction.originalText}
          </Text>
        )}
      </View>
    );
  };
  
  // Render sync status
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
        <View style={[styles.syncStatusIndicator, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.syncStatusText}>
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
          <Text style={styles.title}>Translation Helps</Text>
          {renderSyncStatus()}
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading translation helps...</Text>
        </View>
      </View>
    );
  }
  
  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Translation Helps</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Translation Helps</Text>
        {renderSyncStatus()}
      </View>
      
      {/* Reference info */}
      <View style={styles.referenceInfo}>
        <Text style={styles.referenceText}>
          {reference.book} {reference.chapter}:{reference.verse || 'all'}
        </Text>
        <Text style={styles.resourceCount}>
          {tabFilteredResources.length} resources
        </Text>
      </View>
      
      {/* Word selection info */}
      {renderWordSelectionInfo()}
      
      {/* Tab bar */}
      {renderTabBar()}
      
      {/* Resource list */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {tabFilteredResources.length > 0 ? (
          <View style={styles.resourceList}>
            {tabFilteredResources.map((resource) => 
              renderResourceItem(resource)
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📚</Text>
            <Text style={styles.emptyStateTitle}>
              {selectedWord ? `No resources found for "${selectedWord}"` : 'No translation helps available'}
            </Text>
            <Text style={styles.emptyStateText}>
              {selectedWord 
                ? 'Try selecting a different word or clear the selection to see all resources.'
                : 'Translation helps will appear here when available for the current verse.'
              }
            </Text>
            {selectedWord && (
              <TouchableOpacity
                style={styles.clearSelectionButton}
                onPress={clearWordSelection}
              >
                <Text style={styles.clearSelectionButtonText}>Show All Resources</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
  syncStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  syncStatusText: {
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
  resourceCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  wordSelectionInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#EBF8FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  wordSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordSelectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    flex: 1,
  },
  clearSelectionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#DBEAFE',
    borderRadius: 4,
  },
  clearSelectionText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  wordSelectionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  wordSelectionStat: {
    fontSize: 12,
    color: '#374151',
  },
  originalText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabBarContent: {
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginRight: 6,
  },
  activeTabTitle: {
    color: '#FFFFFF',
  },
  tabCount: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  activeTabCount: {
    color: '#1E40AF',
    backgroundColor: '#DBEAFE',
  },
  scrollView: {
    flex: 1,
  },
  resourceList: {
    padding: 16,
  },
  resourceItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resourceHeader: {
    marginBottom: 12,
  },
  resourceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resourceIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  syncIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resourceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resourceType: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  resourceReference: {
    fontSize: 12,
    color: '#6B7280',
  },
  resourceContent: {
    marginBottom: 12,
  },
  resourceText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  resourceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resourceSource: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  resourceDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  clearSelectionButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
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

export default EnhancedTranslationHelpsResource;
