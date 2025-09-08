/**
 * Alignment-Centric Interface
 * Core component providing word-tap cross-resource filtering with unified sync
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { 
  UnifiedResourceService, 
  ScriptureReference, 
  TranslationResource, 
  AlignmentInteraction,
  createUnifiedResourceService
} from '../services/unified-resource-service';

// Props interface
interface AlignmentCentricInterfaceProps {
  initialReference: ScriptureReference;
  door43AuthToken?: string;
  offlineMode?: boolean;
  onReferenceChange?: (reference: ScriptureReference) => void;
  onWordInteraction?: (word: string, interaction: AlignmentInteraction) => void;
}

// Component state
interface ComponentState {
  currentReference: ScriptureReference;
  resources: TranslationResource[];
  alignmentData: AlignmentInteraction[];
  selectedWord: string | null;
  selectedInteraction: AlignmentInteraction | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  syncStatus: string;
}

/**
 * Alignment-Centric Interface Component
 * Provides the core word-tap → cross-resource filtering experience
 */
export const AlignmentCentricInterface: React.FC<AlignmentCentricInterfaceProps> = ({
  initialReference,
  door43AuthToken,
  offlineMode = false,
  onReferenceChange,
  onWordInteraction
}) => {
  // Initialize unified resource service
  const resourceService = useMemo(() => {
    return createUnifiedResourceService({
      door43AuthToken,
      offlineMode,
      scope: {
        languages: ['en'],
        books: ['GEN', 'MAT', 'JON', 'PHM'], // Default books
        resourceTypes: ['bible-text', 'translation-notes', 'translation-words', 'translation-questions']
      },
      cacheSize: 50 * 1024 * 1024 // 50MB for mobile
    });
  }, [door43AuthToken, offlineMode]);
  
  // Component state
  const [state, setState] = useState<ComponentState>({
    currentReference: initialReference,
    resources: [],
    alignmentData: [],
    selectedWord: null,
    selectedInteraction: null,
    loading: true,
    refreshing: false,
    error: null,
    syncStatus: 'initializing'
  });
  
  // Initialize service
  useEffect(() => {
    let mounted = true;
    
    const initializeService = async () => {
      try {
        console.log('🎯 Initializing Alignment-Centric Interface...');
        
        const result = await resourceService.initialize();
        if (!result.success) {
          throw new Error(result.error);
        }
        
        if (mounted) {
          setState(prev => ({
            ...prev,
            syncStatus: resourceService.getSyncStatus().state,
            error: null
          }));
          
          // Load initial resources
          await loadResourcesForReference(initialReference);
        }
      } catch (error) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Initialization failed',
            loading: false
          }));
        }
      }
    };
    
    initializeService();
    
    return () => {
      mounted = false;
      resourceService.shutdown();
    };
  }, [resourceService, initialReference]);
  
  // Load resources for reference
  const loadResourcesForReference = useCallback(async (reference: ScriptureReference) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      console.log(`🎯 Loading resources for ${reference.book} ${reference.chapter}:${reference.verse || 'all'}`);
      
      const result = await resourceService.getResourcesForReference(reference, {
        includeAlignment: true,
        maxResults: 20
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      setState(prev => ({
        ...prev,
        currentReference: reference,
        resources: result.data || [],
        alignmentData: result.alignmentData || [],
        loading: false,
        refreshing: false,
        syncStatus: resourceService.getSyncStatus().state
      }));
      
      // Notify parent of reference change
      onReferenceChange?.(reference);
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load resources',
        loading: false,
        refreshing: false
      }));
    }
  }, [resourceService, onReferenceChange]);
  
  // Handle word tap (core alignment-centric feature)
  const handleWordTap = useCallback(async (word: string) => {
    try {
      console.log(`🎯 Word tapped: "${word}"`);
      
      setState(prev => ({ ...prev, selectedWord: word, selectedInteraction: null }));
      
      const result = await resourceService.getWordInteractions(
        state.currentReference,
        word,
        {
          includeOriginalText: true,
          maxDepth: 3,
          includeRelated: true
        }
      );
      
      if (result.success && result.data) {
        setState(prev => ({ ...prev, selectedInteraction: result.data! }));
        
        // Notify parent of word interaction
        onWordInteraction?.(word, result.data);
        
        // Filter resources based on word interaction
        await filterResourcesByWord(word, result.data);
      } else {
        Alert.alert('Word Interaction', `No additional information found for "${word}"`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to get word interactions: ${error}`);
    }
  }, [resourceService, state.currentReference, onWordInteraction]);
  
  // Filter resources by word (alignment-centric filtering)
  const filterResourcesByWord = useCallback(async (word: string, interaction: AlignmentInteraction) => {
    try {
      // Combine all related resources from the interaction
      const relatedResources: TranslationResource[] = [
        ...interaction.translationNotes,
        ...interaction.translationWords
      ];
      
      // Update state with filtered resources
      setState(prev => ({
        ...prev,
        resources: relatedResources.length > 0 ? relatedResources : prev.resources
      }));
      
      console.log(`🎯 Filtered to ${relatedResources.length} resources related to "${word}"`);
    } catch (error) {
      console.warn('Failed to filter resources by word:', error);
    }
  }, []);
  
  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setState(prev => ({ ...prev, refreshing: true }));
    await loadResourcesForReference(state.currentReference);
  }, [loadResourcesForReference, state.currentReference]);
  
  // Handle reference navigation
  const handleReferenceChange = useCallback(async (newReference: ScriptureReference) => {
    if (
      newReference.book !== state.currentReference.book ||
      newReference.chapter !== state.currentReference.chapter ||
      newReference.verse !== state.currentReference.verse
    ) {
      await loadResourcesForReference(newReference);
    }
  }, [loadResourcesForReference, state.currentReference]);
  
  // Render word with tap handler
  const renderTappableWord = useCallback((word: string, index: number) => {
    const isSelected = state.selectedWord === word;
    
    return (
      <TouchableOpacity
        key={index}
        onPress={() => handleWordTap(word)}
        style={{
          paddingHorizontal: 2,
          paddingVertical: 1,
          backgroundColor: isSelected ? '#3B82F6' : 'transparent',
          borderRadius: 3,
          marginHorizontal: 1
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: isSelected ? 'white' : '#1F2937',
            fontWeight: isSelected ? '600' : '400'
          }}
        >
          {word}
        </Text>
      </TouchableOpacity>
    );
  }, [handleWordTap, state.selectedWord]);
  
  // Render scripture text with tappable words
  const renderScriptureText = useCallback((resource: TranslationResource) => {
    if (resource.type !== 'bible-text' || !resource.content?.text) {
      return null;
    }
    
    const words = resource.content.text.split(/(\s+)/);
    
    return (
      <View style={{ padding: 16, backgroundColor: '#F9FAFB', borderRadius: 8, marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
          {resource.book} {resource.chapter}:{resource.verse || 'all'} ({resource.metadata.title || 'Bible Text'})
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
          {words.map((word: string, index: number) => {
            if (/^\s+$/.test(word)) {
              return <Text key={index} style={{ fontSize: 16 }}>{word}</Text>;
            }
            return renderTappableWord(word.replace(/[^\w]/g, ''), index);
          })}
        </View>
      </View>
    );
  }, [renderTappableWord]);
  
  // Render resource item
  const renderResourceItem = useCallback((resource: TranslationResource, index: number) => {
    const getResourceIcon = (type: string) => {
      switch (type) {
        case 'bible-text': return '📖';
        case 'translation-notes': return '📝';
        case 'translation-words': return '📚';
        case 'translation-questions': return '❓';
        case 'translation-academy': return '🎓';
        default: return '📄';
      }
    };
    
    const getSyncStatusColor = (status?: string) => {
      switch (status) {
        case 'synced': return '#10B981';
        case 'pending': return '#F59E0B';
        case 'error': return '#EF4444';
        default: return '#6B7280';
      }
    };
    
    return (
      <View
        key={resource.id}
        style={{
          backgroundColor: 'white',
          borderRadius: 8,
          padding: 16,
          marginBottom: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 20, marginRight: 8 }}>
            {getResourceIcon(resource.type)}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '600', flex: 1, color: '#1F2937' }}>
            {resource.metadata.title || resource.type.replace('-', ' ')}
          </Text>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: getSyncStatusColor(resource.metadata.syncStatus)
            }}
          />
        </View>
        
        {resource.book && (
          <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
            {resource.book} {resource.chapter}:{resource.verse || 'all'} • {resource.language}
          </Text>
        )}
        
        {resource.content && (
          <Text
            style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}
            numberOfLines={3}
          >
            {typeof resource.content === 'string' 
              ? resource.content 
              : JSON.stringify(resource.content).substring(0, 150) + '...'
            }
          </Text>
        )}
        
        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
          {resource.metadata.source} • {resource.metadata.lastModified.toLocaleDateString()}
        </Text>
      </View>
    );
  }, []);
  
  // Render word interaction panel
  const renderWordInteractionPanel = useCallback(() => {
    if (!state.selectedWord || !state.selectedInteraction) {
      return null;
    }
    
    const interaction = state.selectedInteraction;
    
    return (
      <View
        style={{
          backgroundColor: '#EBF8FF',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
          borderLeftWidth: 4,
          borderLeftColor: '#3B82F6'
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E40AF', marginBottom: 8 }}>
          "{interaction.word}" Interactions
        </Text>
        
        {interaction.originalText && (
          <Text style={{ fontSize: 14, color: '#374151', marginBottom: 8 }}>
            Original: {interaction.originalText}
          </Text>
        )}
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: '#6B7280' }}>
            📝 Notes: {interaction.translationNotes.length}
          </Text>
          <Text style={{ fontSize: 12, color: '#6B7280' }}>
            📚 Words: {interaction.translationWords.length}
          </Text>
          <Text style={{ fontSize: 12, color: '#6B7280' }}>
            🔗 References: {interaction.crossReferences.length}
          </Text>
        </View>
        
        {interaction.relatedVerses.length > 0 && (
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>
              Related Verses:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {interaction.relatedVerses.map((verse, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleReferenceChange(verse)}
                  style={{
                    backgroundColor: '#DBEAFE',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 4,
                    marginRight: 8,
                    marginBottom: 4
                  }}
                >
                  <Text style={{ fontSize: 11, color: '#1E40AF' }}>
                    {verse.book} {verse.chapter}:{verse.verse}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  }, [state.selectedWord, state.selectedInteraction, handleReferenceChange]);
  
  // Render loading state
  if (state.loading && !state.refreshing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
          Initializing Alignment-Centric Interface...
        </Text>
        <Text style={{ marginTop: 8, fontSize: 14, color: '#9CA3AF', textAlign: 'center' }}>
          Sync Status: {state.syncStatus}
        </Text>
      </View>
    );
  }
  
  // Render error state
  if (state.error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#EF4444', marginBottom: 8 }}>
          Error
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
          {state.error}
        </Text>
        <TouchableOpacity
          onPress={() => loadResourcesForReference(state.currentReference)}
          style={{
            backgroundColor: '#3B82F6',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 6
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Main render
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F3F4F6' }}
      refreshControl={
        <RefreshControl
          refreshing={state.refreshing}
          onRefresh={handleRefresh}
          colors={['#3B82F6']}
        />
      }
    >
      {/* Header */}
      <View style={{ padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 4 }}>
          {state.currentReference.book} {state.currentReference.chapter}
          {state.currentReference.verse && `:${state.currentReference.verse}`}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>
            {state.resources.length} resources • Sync: {state.syncStatus}
          </Text>
          {state.selectedWord && (
            <TouchableOpacity
              onPress={() => setState(prev => ({ ...prev, selectedWord: null, selectedInteraction: null }))}
              style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
            >
              <Text style={{ fontSize: 12, color: '#6B7280' }}>Clear Selection</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Content */}
      <View style={{ padding: 16 }}>
        {/* Word Interaction Panel */}
        {renderWordInteractionPanel()}
        
        {/* Scripture Text (with tappable words) */}
        {state.resources
          .filter(r => r.type === 'bible-text')
          .map(resource => renderScriptureText(resource))
        }
        
        {/* Other Resources */}
        {state.resources
          .filter(r => r.type !== 'bible-text')
          .map((resource, index) => renderResourceItem(resource, index))
        }
        
        {/* Empty State */}
        {state.resources.length === 0 && (
          <View style={{ alignItems: 'center', padding: 32 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📚</Text>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
              No Resources Found
            </Text>
            <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center' }}>
              Try navigating to a different verse or check your connection.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default AlignmentCentricInterface;
