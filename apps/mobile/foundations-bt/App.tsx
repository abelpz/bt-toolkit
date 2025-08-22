// Initialize Immer plugins first
import './src/immer-init';

import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import our contexts and components
import { ScriptureNavigationProvider } from './src/contexts/ScriptureNavigationContext';
import { LinkedPanelsLayout } from './src/components/LinkedPanelsLayout';
import { availableBooks } from './src/data/sampleUSFMData';

export default function App() {
  const [appReady, setAppReady] = React.useState(false);

  React.useEffect(() => {
    // Initialize the app
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing Foundations BT with Global Navigation...');
        setAppReady(true);
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setAppReady(true);
      }
    };

    initializeApp();
  }, []);

  if (!appReady) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading Foundations BT...</Text>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <ScriptureNavigationProvider
      initialReference={{ book: 'Jonah', chapter: 1, verse: 1 }}
      initialBooks={['Jonah', 'Philemon']} // Only books with sample data
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <LinkedPanelsLayout />
          <StatusBar style="light" />
        </SafeAreaView>
      </GestureHandlerRootView>
    </ScriptureNavigationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
    color: '#64748b',
  },
});