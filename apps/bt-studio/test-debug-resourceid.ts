#!/usr/bin/env npx ts-node

/**
 * Test script to verify USFMRenderer debugging for resourceId prop
 * This simulates what happens when USFMRenderer is rendered without the required props
 */

import React from 'react';

// Mock the cross-panel communication service
const mockCrossPanelService = {
  registerPanel: (panel: any) => {
    console.log('Mock: registerPanel called with:', panel);
  },
  unregisterPanel: (resourceId: string) => {
    console.log('Mock: unregisterPanel called with:', resourceId);
  },
  addMessageHandler: (handler: any) => {
    console.log('Mock: addMessageHandler called');
    return () => console.log('Mock: unsubscribe called');
  },
  handleWordClick: async (token: any, resourceId: string, verse: any) => {
    console.log('Mock: handleWordClick called with resourceId:', resourceId);
  }
};

// Mock the getCrossPanelCommunicationService function
jest.mock('../../services/cross-panel-communication', () => ({
  getCrossPanelCommunicationService: () => mockCrossPanelService
}));

console.log('🧪 Testing USFMRenderer resourceId debugging...');
console.log('');

// Test case 1: Missing resourceId prop
console.log('📋 Test Case 1: USFMRenderer with undefined resourceId');
console.log('Expected: Should log error about missing resourceId');
console.log('');

// Simulate what happens when USFMRenderer is called without resourceId
const mockProps = {
  scripture: {
    book: 'Ruth',
    bookCode: 'rut',
    chapters: []
  },
  resourceId: undefined, // This is the problem!
  resourceType: 'ULT' as const,
  language: 'en' as const
};

console.log('Mock props being passed to USFMRenderer:', mockProps);
console.log('');

// Test case 2: Valid resourceId prop
console.log('📋 Test Case 2: USFMRenderer with valid resourceId');
console.log('Expected: Should successfully register panel');
console.log('');

const validProps = {
  scripture: {
    book: 'Ruth',
    bookCode: 'rut',
    chapters: []
  },
  resourceId: 'ult-scripture',
  resourceType: 'ULT' as const,
  language: 'en' as const
};

console.log('Valid props being passed to USFMRenderer:', validProps);
console.log('');

console.log('✅ Debug test completed!');
console.log('');
console.log('🔍 What to look for in the browser console:');
console.log('1. When resourceId is undefined: "🚨 USFMRenderer: resourceId prop is undefined!"');
console.log('2. When resourceId is valid: "✅ USFMRenderer: Registering panel with cross-panel service:"');
console.log('3. When word is clicked without resourceId: "🚨 USFMRenderer handleTokenClick: resourceId is undefined!"');
console.log('');
console.log('💡 The issue is that the parent component (ScriptureViewer) is not passing the resourceId prop to USFMRenderer.');
console.log('   You need to update ScriptureViewer to pass: resourceId, resourceType, and language props.');

