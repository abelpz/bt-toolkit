/**
 * Enhanced Linked Panels Layout
 * Integrates our unified sync ecosystem with the proven linked-panels architecture
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Switch } from 'react-native';
import { 
  LinkedPanelsContainer, 
  LinkedPanel,
  createDefaultPluginRegistry,
  createPlugin,
  type LinkedPanelsConfig 
} from 'linked-panels';

// Import enhanced resource components
import EnhancedScriptureResource from './resources/EnhancedScriptureResource';
import EnhancedTranslationHelpsResource from './resources/EnhancedTranslationHelpsResource';

// Import navigation component (enhanced version)
import ScriptureNavigator from '../modules/navigation/ScriptureNavigator';

// Import contexts
import { useScriptureNavigation } from '../contexts/ScriptureNavigationContext';
import { useUnifiedResourceService } from '../contexts/UnifiedResourceServiceContext';

// Message types for word interactions
interface WordSelectedMessage {
  type: 'word-selected';
  lifecycle: 'state';
  data: {
    word: string;
    reference: any;
    interaction: any;
    sourcePanel: string;
  };
}

interface HighlightWordMessage {
  type: 'highlight-word';
  lifecycle: 'state';
  data: {
    word: string;
    reference: any;
    sourcePanel: string;
  };
}

interface FilterResourcesMessage {
  type: 'filter-resources';
  lifecycle: 'state';
  data: {
    word: string;
    resources: any[];
  };
}

/**
 * Enhanced Linked Panels Layout
 * Combines the proven linked-panels UI with our unified sync ecosystem
 */
export const EnhancedLinkedPanelsLayout: React.FC = () => {
  // Hooks
  const { currentReference, availableBooks } = useScriptureNavigation();
  const { 
    isInitialized, 
    syncStatus, 
    offlineMode, 
    setOfflineMode,
    currentScope,
    getSyncStatistics
  } = useUnifiedResourceService();
  
  // Local state
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [syncStats, setSyncStats] = useState<any>(null);
  
  // Load sync statistics
  React.useEffect(() => {
    if (showSyncDetails && isInitialized) {
      getSyncStatistics().then(setSyncStats);
    }
  }, [showSyncDetails, isInitialized, getSyncStatistics]);
  
  // Create enhanced linked panels configuration
  const config: LinkedPanelsConfig = useMemo(() => ({
    resources: [
      // Enhanced scripture resources with word interactions
      { 
        id: 'simplified-text', 
        component: (
          <EnhancedScriptureResource 
            resourceId="simplified-text" 
            textType="simplified"
          />
        ), 
        title: 'Simplified Text',
        metadata: { 
          type: 'scripture', 
          syncStatus: syncStatus.state,
          description: 'Simplified scripture text with word interactions'
        }
      },
      { 
        id: 'literal-text', 
        component: (
          <EnhancedScriptureResource 
            resourceId="literal-text" 
            textType="literal"
          />
        ), 
        title: 'Literal Text',
        metadata: { 
          type: 'scripture', 
          syncStatus: syncStatus.state,
          description: 'Literal scripture text with word interactions'
        }
      },
      
      // Enhanced translation helps with message handling
      { 
        id: 'translation-helps', 
        component: (
          <EnhancedTranslationHelpsResource 
            resourceId="translation-helps"
          />
        ), 
        title: 'Translation Helps',
        metadata: { 
          type: 'helps', 
          syncStatus: syncStatus.state,
          description: 'Translation notes, words, questions, and academy articles'
        }
      },
      
      // Enhanced navigation with sync status
      { 
        id: 'navigation', 
        component: (
          <View style={styles.navigationContainer}>
            <ScriptureNavigator 
              currentReference={currentReference}
              availableBooks={availableBooks}
              onNavigate={() => {}}
            />
            <View style={styles.navigationInfo}>
              <Text style={styles.navigationText}>
                📍 {currentReference.book} {currentReference.chapter}:{currentReference.verse || 'all'}
              </Text>
              <Text style={styles.navigationText}>
                📚 {availableBooks.length} books available
              </Text>
              <Text style={styles.navigationText}>
                🎯 Scope: {currentScope.languages.join(', ')}
              </Text>
            </View>
          </View>
        ), 
        title: 'Navigation',
        metadata: { 
          type: 'navigation',
          description: 'Scripture navigation with scope information'
        }
      }
    ],
    
    panels: {
      'main-panel': { 
        resourceIds: ['simplified-text', 'literal-text'],
        initialResourceId: 'simplified-text'
      },
      'helps-panel': { 
        resourceIds: ['translation-helps'],
        initialResourceId: 'translation-helps'
      },
      'nav-panel': { 
        resourceIds: ['navigation'],
        initialResourceId: 'navigation'
      }
    }
  }), [currentReference, availableBooks, syncStatus, currentScope]);
  
  // Enhanced plugins with word interaction support
  const plugins = useMemo(() => {
    const registry = createDefaultPluginRegistry();
    
    // Add word interaction plugin
    registry.register(createPlugin({
      name: 'word-interactions',
      version: '1.0.0',
      messageTypes: {
        'word-selected': {} as WordSelectedMessage,
        'highlight-word': {} as HighlightWordMessage,
        'filter-resources': {} as FilterResourcesMessage
      },
      validators: {
        'word-selected': (content: any): content is WordSelectedMessage => {
          return content.type === 'word-selected' && 
                 typeof content.data?.word === 'string';
        },
        'highlight-word': (content: any): content is HighlightWordMessage => {
          return content.type === 'highlight-word' && 
                 typeof content.data?.word === 'string';
        },
        'filter-resources': (content: any): content is FilterResourcesMessage => {
          return content.type === 'filter-resources' && 
                 typeof content.data?.word === 'string';
        }
      },
      handlers: {
        'word-selected': (message) => {
          console.log(`🔤 Word selected: "${message.content.data.word}" from ${message.content.data.sourcePanel}`);
        },
        'highlight-word': (message) => {
          console.log(`🎯 Highlighting word: "${message.content.data.word}" from ${message.content.data.sourcePanel}`);
        },
        'filter-resources': (message) => {
          console.log(`📝 Filtering resources for: "${message.content.data.word}"`);
        }
      }
    }));
    
    return registry;
  }, []);
  
  // Enhanced persistence with unified storage backend
  const persistenceOptions = useMemo(() => ({
    storageKey: 'foundations-bt-enhanced',
    autoSave: true,
    stateTTL: 7 * 24 * 60 * 60 * 1000 // 7 days
  }), []);
  
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
    
    const getStatusText = () => {
      switch (syncStatus.state) {
        case 'syncing': return 'Syncing...';
        case 'error': return 'Sync Error';
        case 'offline': return 'Offline';
        case 'idle': return 'Synced';
        default: return syncStatus.connected ? 'Online' : 'Offline';
      }
    };
    
    return (
      <TouchableOpacity
        style={styles.syncStatus}
        onPress={() => setShowSyncDetails(!showSyncDetails)}
        activeOpacity={0.7}
      >
        <View style={[styles.syncIndicator, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.syncText}>{getStatusText()}</Text>
        {syncStatus.pendingChanges > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>{syncStatus.pendingChanges}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  // Render sync details modal
  const renderSyncDetails = () => {
    if (!showSyncDetails) return null;
    
    return (
      <View style={styles.syncDetailsOverlay}>
        <View style={styles.syncDetailsModal}>
          <View style={styles.syncDetailsHeader}>
            <Text style={styles.syncDetailsTitle}>Sync Status</Text>
            <TouchableOpacity
              onPress={() => setShowSyncDetails(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.syncDetailsContent}>
            <View style={styles.syncDetailRow}>
              <Text style={styles.syncDetailLabel}>Status:</Text>
              <Text style={styles.syncDetailValue}>{syncStatus.state}</Text>
            </View>
            
            <View style={styles.syncDetailRow}>
              <Text style={styles.syncDetailLabel}>Connected:</Text>
              <Text style={styles.syncDetailValue}>{syncStatus.connected ? 'Yes' : 'No'}</Text>
            </View>
            
            <View style={styles.syncDetailRow}>
              <Text style={styles.syncDetailLabel}>Pending Changes:</Text>
              <Text style={styles.syncDetailValue}>{syncStatus.pendingChanges}</Text>
            </View>
            
            {syncStatus.lastSync && (
              <View style={styles.syncDetailRow}>
                <Text style={styles.syncDetailLabel}>Last Sync:</Text>
                <Text style={styles.syncDetailValue}>{syncStatus.lastSync.toLocaleString()}</Text>
              </View>
            )}
            
            {syncStats && (
              <>
                <View style={styles.syncDetailRow}>
                  <Text style={styles.syncDetailLabel}>Cached Resources:</Text>
                  <Text style={styles.syncDetailValue}>{syncStats.cachedResources}</Text>
                </View>
                
                <View style={styles.syncDetailRow}>
                  <Text style={styles.syncDetailLabel}>Cache Size:</Text>
                  <Text style={styles.syncDetailValue}>
                    {(syncStats.totalCacheSize / (1024 * 1024)).toFixed(1)} MB
                  </Text>
                </View>
              </>
            )}
            
            {syncStatus.error && (
              <View style={styles.syncDetailRow}>
                <Text style={styles.syncDetailLabel}>Error:</Text>
                <Text style={[styles.syncDetailValue, styles.errorText]}>{syncStatus.error}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };
  
  // Show loading state if not initialized
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>🎯 Foundations BT Enhanced</Text>
        <Text style={styles.loadingSubtitle}>Initializing unified sync system...</Text>
        <View style={styles.loadingDetails}>
          <Text style={styles.loadingText}>• Loading Door43 sync orchestrator</Text>
          <Text style={styles.loadingText}>• Initializing mobile storage backend</Text>
          <Text style={styles.loadingText}>• Setting up alignment-centric services</Text>
          <Text style={styles.loadingText}>• Configuring linked panels</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Enhanced header with sync status and controls */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🎯 Foundations BT Enhanced</Text>
          <Text style={styles.headerSubtitle}>Alignment-Centric Bible Translation</Text>
        </View>
        
        <View style={styles.headerRight}>
          {renderSyncStatus()}
          
          <View style={styles.offlineToggle}>
            <Text style={styles.offlineLabel}>Offline</Text>
            <Switch
              value={offlineMode}
              onValueChange={setOfflineMode}
              trackColor={{ false: '#D1D5DB', true: '#F59E0B' }}
              thumbColor={offlineMode ? '#FFFFFF' : '#9CA3AF'}
              style={styles.switch}
            />
          </View>
        </View>
      </View>
      
      {/* Main linked panels container */}
      <LinkedPanelsContainer 
        config={config} 
        plugins={plugins}
        persistence={persistenceOptions}
      >
        <View style={styles.panelsContainer}>
          {/* Main scripture panels */}
          <View style={styles.scriptureSection}>
            <LinkedPanel id="main-panel">
              {({ current, navigate }) => (
                <View style={styles.scripturePanel}>
                  <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>
                      {current.resource?.title}
                    </Text>
                    <View style={styles.panelNavigation}>
                      <TouchableOpacity
                        onPress={navigate.previous}
                        disabled={!current.panel.canGoPrevious}
                        style={[
                          styles.navButton,
                          !current.panel.canGoPrevious && styles.navButtonDisabled
                        ]}
                      >
                        <Text style={[
                          styles.navButtonText,
                          !current.panel.canGoPrevious && styles.navButtonTextDisabled
                        ]}>
                          ←
                        </Text>
                      </TouchableOpacity>
                      
                      <Text style={styles.panelPosition}>
                        {current.index + 1} of {current.panel.totalResources}
                      </Text>
                      
                      <TouchableOpacity
                        onPress={navigate.next}
                        disabled={!current.panel.canGoNext}
                        style={[
                          styles.navButton,
                          !current.panel.canGoNext && styles.navButtonDisabled
                        ]}
                      >
                        <Text style={[
                          styles.navButtonText,
                          !current.panel.canGoNext && styles.navButtonTextDisabled
                        ]}>
                          →
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.panelContent}>
                    {current.resource?.component}
                  </View>
                </View>
              )}
            </LinkedPanel>
          </View>
          
          {/* Translation helps panel */}
          <View style={styles.helpsSection}>
            <LinkedPanel id="helps-panel">
              {({ current }) => (
                <View style={styles.helpsPanel}>
                  <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>
                      {current.resource?.title}
                    </Text>
                    <Text style={styles.panelDescription}>
                      {String(current.resource?.metadata?.description || '')}
                    </Text>
                  </View>
                  
                  <View style={styles.panelContent}>
                    {current.resource?.component}
                  </View>
                </View>
              )}
            </LinkedPanel>
          </View>
          
          {/* Navigation panel */}
          <View style={styles.navigationSection}>
            <LinkedPanel id="nav-panel">
              {({ current }) => (
                <View style={styles.navPanel}>
                  <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>
                      {current.resource?.title}
                    </Text>
                  </View>
                  
                  <View style={styles.panelContent}>
                    {current.resource?.component}
                  </View>
                </View>
              )}
            </LinkedPanel>
          </View>
        </View>
      </LinkedPanelsContainer>
      
      {/* Sync details modal */}
      {renderSyncDetails()}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F3F4F6',
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  loadingDetails: {
    alignItems: 'flex-start',
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerLeft: {
    flex: 1,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#374151',
    borderRadius: 6,
    marginRight: 12,
  },
  syncIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  syncText: {
    fontSize: 12,
    color: '#D1D5DB',
    marginRight: 4,
  },
  pendingBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 16,
  },
  pendingText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  offlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineLabel: {
    fontSize: 12,
    color: '#D1D5DB',
    marginRight: 6,
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  panelsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  scriptureSection: {
    flex: 2,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  helpsSection: {
    flex: 2,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  navigationSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scripturePanel: {
    flex: 1,
  },
  helpsPanel: {
    flex: 1,
  },
  navPanel: {
    flex: 1,
  },
  panelHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  panelDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  panelNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  navButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#9CA3AF',
  },
  panelPosition: {
    fontSize: 12,
    color: '#6B7280',
    marginHorizontal: 12,
  },
  panelContent: {
    flex: 1,
  },
  navigationContainer: {
    flex: 1,
  },
  navigationInfo: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navigationText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  syncDetailsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncDetailsModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxWidth: 400,
    width: '90%',
  },
  syncDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  syncDetailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
  },
  syncDetailsContent: {
    gap: 12,
  },
  syncDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  syncDetailValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  errorText: {
    color: '#EF4444',
  },
});

export default EnhancedLinkedPanelsLayout;
