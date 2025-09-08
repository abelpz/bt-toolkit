/**
 * Resource Service Tester Component
 * Manual testing interface for Door43 API integration
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { useResourceService } from '../../contexts/ResourceServiceContext';

interface TestResult {
  test: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  duration?: number;
}

export const ResourceServiceTester: React.FC = () => {
  const { 
    resourceService, 
    isInitialized, 
    isInitializing, 
    error,
    switchToOnlineMode,
    switchToOfflineMode 
  } = useResourceService();

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const updateTestResult = (testName: string, status: TestResult['status'], message: string, duration?: number) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.test === testName);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.duration = duration;
        return [...prev];
      } else {
        return [...prev, { test: testName, status, message, duration }];
      }
    });
  };

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    updateTestResult(testName, 'running', 'Running...');
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTestResult(testName, 'success', `✅ Passed (${duration}ms)`, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      updateTestResult(testName, 'error', `❌ Failed: ${message} (${duration}ms)`, duration);
    }
  };

  const runAllTests = async () => {
    if (!resourceService || !isInitialized) {
      Alert.alert('Error', 'Resource service not initialized');
      return;
    }

    setIsRunningTests(true);
    setTestResults([]);

    // Test 1: Get Available Books
    await runTest('Get Available Books', async () => {
      const books = await resourceService.getAvailableBooks();
      if (!books || books.length === 0) {
        throw new Error('No books returned');
      }
      console.log('📚 Available books:', books);
    });

    // Test 2: Get Bible Text (ULT)
    await runTest('Get Bible Text (ULT)', async () => {
      const books = await resourceService.getAvailableBooks();
      const testBook = books[0] || 'JON'; // Use first available book
      const bibleText = await resourceService.getBibleText(testBook, 'ult');
      if (!bibleText) {
        throw new Error(`No ULT text found for ${testBook}`);
      }
      console.log(`📖 ULT for ${testBook}:`, bibleText.content.substring(0, 100) + '...');
    });

    // Test 3: Get Bible Text (UST)
    await runTest('Get Bible Text (UST)', async () => {
      const books = await resourceService.getAvailableBooks();
      const testBook = books[0] || 'JON'; // Use first available book
      const bibleText = await resourceService.getBibleText(testBook, 'ust');
      if (!bibleText) {
        throw new Error(`No UST text found for ${testBook}`);
      }
      console.log(`📖 UST for ${testBook}:`, bibleText.content.substring(0, 100) + '...');
    });

    // Test 4: Get Translation Notes
    await runTest('Get Translation Notes', async () => {
      const books = await resourceService.getAvailableBooks();
      const testBook = books[0] || 'JON'; // Use first available book
      const notes = await resourceService.getTranslationNotes(testBook);
      if (!notes || notes.notes.length === 0) {
        throw new Error(`No translation notes found for ${testBook}`);
      }
      console.log(`📝 Notes for ${testBook}:`, notes.notes.length, 'notes');
    });

    // Test 5: Get Translation Questions
    await runTest('Get Translation Questions', async () => {
      const books = await resourceService.getAvailableBooks();
      const testBook = books[0] || 'JON'; // Use first available book
      const questions = await resourceService.getTranslationQuestions(testBook);
      if (!questions || questions.questions.length === 0) {
        throw new Error(`No translation questions found for ${testBook}`);
      }
      console.log(`❓ Questions for ${testBook}:`, questions.questions.length, 'questions');
    });

    // Test 6: Get Passage Helps
    await runTest('Get Passage Helps', async () => {
      const books = await resourceService.getAvailableBooks();
      const testBook = books[0] || 'JON'; // Use first available book
      const passageHelps = await resourceService.getPassageHelps({
        book: testBook,
        chapter: 1,
        verse: 1,
        original: `${testBook} 1:1`
      });
      
      console.log(`🔍 Passage helps for ${testBook} 1:1:`, {
        notes: passageHelps.notes.length,
        questions: passageHelps.questions.length,
        wordLinks: passageHelps.wordLinks.length
      });
    });

    // Test 7: Search Helps
    await runTest('Search Helps', async () => {
      const results = await resourceService.searchHelps('God');
      console.log('🔍 Search results for "God":', results.length, 'results');
    });

    setIsRunningTests(false);
  };

  const switchToOnline = async () => {
    try {
      await switchToOnlineMode({
        language: 'en',
        organization: 'unfoldingWord'
      });
      Alert.alert('Success', 'Switched to online mode (Door43 API)');
    } catch (error) {
      Alert.alert('Error', `Failed to switch to online mode: ${error}`);
    }
  };

  const switchToOffline = async () => {
    try {
      await switchToOfflineMode();
      Alert.alert('Success', 'Switched to offline mode (Sample data)');
    } catch (error) {
      Alert.alert('Error', `Failed to switch to offline mode: ${error}`);
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      case 'running': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Resource Service Tester</Text>
      
      {/* Service Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Status</Text>
        <Text style={styles.statusText}>
          Service: {resourceService?.constructor.name || 'None'}
        </Text>
        <Text style={styles.statusText}>
          Status: {isInitializing ? 'Initializing...' : isInitialized ? 'Ready' : 'Not Ready'}
        </Text>
        {error && <Text style={[styles.statusText, { color: '#ef4444' }]}>Error: {error}</Text>}
      </View>

      {/* Service Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Controls</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, styles.onlineButton]} 
            onPress={switchToOnline}
            disabled={isInitializing}
          >
            <Text style={styles.buttonText}>Switch to Online</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.offlineButton]} 
            onPress={switchToOffline}
            disabled={isInitializing}
          >
            <Text style={styles.buttonText}>Switch to Offline</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Test Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tests</Text>
        <TouchableOpacity 
          style={[styles.button, styles.testButton]} 
          onPress={runAllTests}
          disabled={!isInitialized || isRunningTests}
        >
          {isRunningTests ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Run All Tests</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Test Results */}
      {testResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {testResults.map((result, index) => (
            <View key={index} style={styles.testResult}>
              <View style={styles.testHeader}>
                <Text style={styles.testName}>{result.test}</Text>
                <View 
                  style={[
                    styles.statusIndicator, 
                    { backgroundColor: getStatusColor(result.status) }
                  ]} 
                />
              </View>
              <Text style={styles.testMessage}>{result.message}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1f2937',
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#374151',
  },
  statusText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#6b7280',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  onlineButton: {
    backgroundColor: '#3b82f6',
  },
  offlineButton: {
    backgroundColor: '#6b7280',
  },
  testButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  testResult: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  testName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  testMessage: {
    fontSize: 12,
    color: '#6b7280',
  },
});
