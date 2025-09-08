// Initialize Immer plugins first
import './src/immer-init';

import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View, Alert, Switch, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import enhanced components and contexts
import { UnifiedResourceServiceProvider } from './src/contexts/UnifiedResourceServiceContext';
import { ScriptureNavigationProvider } from './src/contexts/ScriptureNavigationContext';
import { BookPackageProvider } from './src/contexts/BookPackageContext';
import EnhancedLinkedPanelsLayout from './src/components/EnhancedLinkedPanelsLayout';

// Import original components for fallback
import { ResourceServiceProvider } from './src/contexts/ResourceServiceContext';
import { TestingScreen } from './src/components/TestingScreen';

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [useEnhancedInterface, setUseEnhancedInterface] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  // Door43 auth token (in production, this would come from secure storage or user input)
  const door43AuthToken = process.env.EXPO_PUBLIC_DOOR43_TOKEN || undefined;

  useEffect(() => {
    // Initialize the app
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing Enhanced Foundations BT...');
        console.log(`   🎯 Enhanced Interface: ${useEnhancedInterface ? 'Enabled' : 'Disabled'}`);
        console.log(`   📴 Offline Mode: ${offlineMode ? 'Enabled' : 'Disabled'}`);
        console.log(`   🔑 Door43 Auth: ${door43AuthToken ? 'Available' : 'Not configured'}`);
        
        // Simulate initialization delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setAppReady(true);
        setInitializationError(null);
        
        console.log('✅ Enhanced Foundations BT initialized successfully');
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setInitializationError(error instanceof Error ? error.message : 'Unknown initialization error');
        setAppReady(true); // Still show the app, but with error state
      }
    };

    initializeApp();
  }, [useEnhancedInterface, offlineMode, door43AuthToken]);

  // Show loading screen
  if (!appReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingTitle}>🎯 Foundations BT</Text>
          <Text style={styles.loadingSubtitle}>Enhanced with Unified Sync</Text>
          <Text style={styles.loadingText}>
            {useEnhancedInterface 
              ? 'Initializing alignment-centric interface...' 
              : 'Initializing original interface...'
            }
          </Text>
          <View style={styles.loadingDetails}>
            <Text style={styles.loadingDetailText}>• Setting up Door43 sync system</Text>
            <Text style={styles.loadingDetailText}>• Configuring mobile storage backend</Text>
            <Text style={styles.loadingDetailText}>• Initializing linked panels</Text>
            <Text style={styles.loadingDetailText}>• Loading resource scope</Text>
          </View>
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  // Show initialization error if occurred
  if (initializationError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Initialization Error</Text>
          <Text style={styles.errorText}>{initializationError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setAppReady(false);
              setInitializationError(null);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          
          <View style={styles.fallbackControls}>
            <Text style={styles.fallbackText}>Or try with different settings:</Text>
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Enhanced Interface</Text>
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
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  // Enhanced interface with unified sync ecosystem
  if (useEnhancedInterface) {
    return (
      <UnifiedResourceServiceProvider
        door43AuthToken={door43AuthToken}
        offlineMode={offlineMode}
        initialScope={{
          languages: ['en'],
          books: ['GEN', 'MAT', 'JON', 'PHM'], // Default books for foundations-bt
          resourceTypes: ['bible-text', 'translation-notes', 'translation-words', 'translation-questions']
        }}
        cacheSize={100 * 1024 * 1024} // 100MB cache
      >
        <ScriptureNavigationProvider
          initialReference={{ book: 'Jonah', chapter: 1, verse: 1 }}
          initialBooks={['Jonah', 'Philemon', 'Genesis', 'Matthew']}
        >
          <BookPackageProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaView style={styles.container}>
                {/* Header with interface toggle */}
                <View style={styles.header}>
                  <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>🎯 Foundations BT Enhanced</Text>
                    <Text style={styles.headerSubtitle}>
                      Alignment-Centric Bible Translation
                    </Text>
                  </View>
                  
                  <View style={styles.headerControls}>
                    <View style={styles.controlRow}>
                      <Text style={styles.controlLabel}>Enhanced</Text>
                      <Switch
                        value={useEnhancedInterface}
                        onValueChange={(value) => {
                          setUseEnhancedInterface(value);
                          if (!value) {
                            Alert.alert(
                              'Switch to Original Interface',
                              'This will switch to the original foundations-bt interface. You can switch back anytime.',
                              [
                                { text: 'Cancel', onPress: () => setUseEnhancedInterface(true) },
                                { text: 'Switch', onPress: () => setUseEnhancedInterface(false) }
                              ]
                            );
                          }
                        }}
                        trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                        thumbColor={useEnhancedInterface ? '#FFFFFF' : '#9CA3AF'}
                      />
                    </View>
                    
                    <View style={styles.controlRow}>
                      <Text style={styles.controlLabel}>Offline</Text>
                      <Switch
                        value={offlineMode}
                        onValueChange={setOfflineMode}
                        trackColor={{ false: '#D1D5DB', true: '#F59E0B' }}
                        thumbColor={offlineMode ? '#FFFFFF' : '#9CA3AF'}
                      />
                    </View>
                  </View>
                </View>

                {/* Enhanced linked panels layout */}
                <EnhancedLinkedPanelsLayout />

                <StatusBar style="light" />
              </SafeAreaView>
            </GestureHandlerRootView>
          </BookPackageProvider>
        </ScriptureNavigationProvider>
      </UnifiedResourceServiceProvider>
    );
  }

  // Original interface for compatibility
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
              {/* Header with interface toggle */}
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <Text style={styles.headerTitle}>📚 Foundations BT</Text>
                  <Text style={styles.headerSubtitle}>
                    Original Interface
                  </Text>
                </View>
                
                <View style={styles.headerControls}>
                  <View style={styles.controlRow}>
                    <Text style={styles.controlLabel}>Enhanced</Text>
                    <Switch
                      value={useEnhancedInterface}
                      onValueChange={(value) => {
                        if (value) {
                          Alert.alert(
                            'Switch to Enhanced Interface',
                            'This will enable the new alignment-centric interface with unified sync capabilities.',
                            [
                              { text: 'Cancel' },
                              { text: 'Switch', onPress: () => setUseEnhancedInterface(true) }
                            ]
                          );
                        }
                      }}
                      trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                      thumbColor={useEnhancedInterface ? '#FFFFFF' : '#9CA3AF'}
                    />
                  </View>
                </View>
              </View>

              {/* Original testing screen */}
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
    marginBottom: 16,
  },
  loadingDetails: {
    alignItems: 'flex-start',
  },
  loadingDetailText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  fallbackControls: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fallbackText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    flex: 1,
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
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlLabel: {
    fontSize: 12,
    color: '#D1D5DB',
    fontWeight: '500',
  },
});
