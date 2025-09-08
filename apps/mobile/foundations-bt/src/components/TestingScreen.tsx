/**
 * Testing Screen Component
 * Provides a UI for testing the Door43 integration
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ResourceServiceTester } from './testing/ResourceServiceTester';
import { LinkedPanelsLayout } from './LinkedPanelsLayout';

export const TestingScreen: React.FC = () => {
  const [currentView, setCurrentView] = useState<'app' | 'tester'>('app');

  return (
    <View style={styles.container}>
      {/* View Switcher */}
      <View style={styles.switcher}>
        <TouchableOpacity 
          style={[styles.switchButton, currentView === 'app' && styles.activeButton]}
          onPress={() => setCurrentView('app')}
        >
          <Text style={[styles.switchText, currentView === 'app' && styles.activeText]}>
            App View
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.switchButton, currentView === 'tester' && styles.activeButton]}
          onPress={() => setCurrentView('tester')}
        >
          <Text style={[styles.switchText, currentView === 'tester' && styles.activeText]}>
            API Tester
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {currentView === 'app' ? (
          <LinkedPanelsLayout />
        ) : (
          <ResourceServiceTester />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    margin: 8,
    borderRadius: 8,
    padding: 4,
  },
  switchButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#3b82f6',
  },
  switchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeText: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
});
