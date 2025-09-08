// Initialize Immer plugins first
import './src/immer-init';

import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View, Alert, Switch } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import enhanced components
import AlignmentCentricInterface from './src/components/AlignmentCentricInterface';
import { ScriptureReference, AlignmentInteraction } from './src/services/unified-resource-service';

// Import existing contexts for compatibility
import { ScriptureNavigationProvider } from './src/contexts/ScriptureNavigationContext';
import { ResourceServiceProvider } from './src/contexts/ResourceServiceContext';
import { BookPackageProvider } from './src/contexts/BookPackageContext';
import { TestingScreen } from './src/components/TestingScreen';

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [useEnhancedInterface, setUseEnhancedInterface] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [currentReference, setCurrentReference] = useState<ScriptureReference>({
    book: 'JON',
    chapter: 1,
    verse: 1
  });
  const [lastWordInteraction, setLastWordInteraction] = useState<{
    word: string;
    interaction: AlignmentInteraction;
  } | null>(null);

  // Door43 auth token (in real app, this would come from secure storage or user input)
  const door43AuthToken = process.env.EXPO_PUBLIC_DOOR43_TOKEN || undefined;

  useEffect(() => {
    // Initialize the app
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing Enhanced Foundations BT...');
        console.log(`   🔄 Enhanced Interface: ${useEnhancedInterface ? 'Enabled' : 'Disabled'}`);
        console.log(`   📡 Offline Mode: ${offlineMode ? 'Enabled' : 'Disabled'}`);
        console.log(`   🔑 Door43 Auth: ${door43AuthToken ? 'Available' : 'Not configured'}`);
        
        setAppReady(true);
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        Alert.alert('Initialization Error', 'Failed to initialize the app. Please restart.');
        setAppReady(true);
      }
    };

    initializeApp();
  }, [useEnhancedInterface, offlineMode, door43AuthToken]);

  // Handle reference changes from alignment interface
  const handleReferenceChange = (reference: ScriptureReference) => {
    console.log(`📍 Reference changed to: ${reference.book} ${reference.chapter}:${reference.verse || 'all'}`);
    setCurrentReference(reference);
  };

  // Handle word interactions (core alignment-centric feature)
  const handleWordInteraction = (word: string, interaction: AlignmentInteraction) => {
    console.log(`🔤 Word interaction: "${word}" with ${interaction.translationNotes.length} notes, ${interaction.translationWords.length} words`);
    setLastWordInteraction({ word, interaction });
    
    // Show brief feedback
    Alert.alert(
      `Word: "${word}"`,
      `Found ${interaction.translationNotes.length} notes and ${interaction.translationWords.length} definitions`,
      [{ text: 'OK' }]
    );
  };

  if (!appReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingTitle}>🎯 Foundations BT</Text>
          <Text style={styles.loadingSubtitle}>Enhanced with Unified Sync</Text>
          <Text style={styles.loadingText}>Initializing alignment-centric interface...</Text>
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  // Enhanced interface with alignment-centric features
  if (useEnhancedInterface) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          {/* Header with controls */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>🎯 Foundations BT Enhanced</Text>
              <Text style={styles.headerSubtitle}>
                Alignment-Centric Bible Translation
              </Text>
            </View>
            
            <View style={styles.controls}>
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Enhanced UI</Text>
                <Switch
                  value={useEnhancedInterface}
                  onValueChange={setUseEnhancedInterface}
                  trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                  thumbColor={useEnhancedInterface ? '#FFFFFF' : '#9CA3AF'}
                />
              </View>
              
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Offline Mode</Text>
                <Switch
                  value={offlineMode}
                  onValueChange={setOfflineMode}
                  trackColor={{ false: '#D1D5DB', true: '#F59E0B' }}
                  thumbColor={offlineMode ? '#FFFFFF' : '#9CA3AF'}
                />
              </View>
            </View>
          </View>

          {/* Status bar */}
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>
              📍 {currentReference.book} {currentReference.chapter}:{currentReference.verse || 'all'}
            </Text>
            {lastWordInteraction && (
              <Text style={styles.statusText}>
                🔤 Last: "{lastWordInteraction.word}"
              </Text>
            )}
            <Text style={styles.statusText}>
              {offlineMode ? '📴 Offline' : '📡 Online'}
            </Text>
          </View>

          {/* Main alignment-centric interface */}
          <AlignmentCentricInterface
            initialReference={currentReference}
            door43AuthToken={door43AuthToken}
            offlineMode={offlineMode}
            onReferenceChange={handleReferenceChange}
            onWordInteraction={handleWordInteraction}
          />

          <StatusBar style="light" />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // Fallback to original interface for compatibility
  return (
    <ResourceServiceProvider
      initialServiceType="door43-api"
      door43Config={{
        language: 'en',
        organization: 'unfoldingWord',
      }}
    >
      <ScriptureNavigationProvider
        initialReference={{ book: 'Jonah', chapter: 1, verse: 1 }}
        initialBooks={['Jonah', 'Philemon']}
      >
        <BookPackageProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
              {/* Header with controls */}
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <Text style={styles.headerTitle}>📚 Foundations BT</Text>
                  <Text style={styles.headerSubtitle}>
                    Original Interface
                  </Text>
                </View>
                
                <View style={styles.controls}>
                  <View style={styles.controlRow}>
                    <Text style={styles.controlLabel}>Enhanced UI</Text>
                    <Switch
                      value={useEnhancedInterface}
                      onValueChange={setUseEnhancedInterface}
                      trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                      thumbColor={useEnhancedInterface ? '#FFFFFF' : '#9CA3AF'}
                    />
                  </View>
                </View>
              </View>

              <TestingScreen />
              <StatusBar style="light" />
            </SafeAreaView>
          </GestureHandlerRootView>
        </BookPackageProvider>
      </ScriptureNavigationProvider>
    </ResourceServiceProvider>
  );
}

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
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#9CA3AF',
  },
  header: {
    backgroundColor: '#1F2937',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 12,
    color: '#D1D5DB',
    marginRight: 8,
  },
  statusBar: {
    backgroundColor: '#374151',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 11,
    color: '#D1D5DB',
    flex: 1,
    textAlign: 'center',
  },
});
