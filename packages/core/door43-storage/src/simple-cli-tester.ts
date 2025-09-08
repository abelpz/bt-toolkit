#!/usr/bin/env node
/**
 * Simple CLI Tester for Door43 Storage System
 * Basic functionality test without strict null checks
 */

import { storageFactory } from './lib/storage-factory.js';
import { StorageConfig } from './lib/storage-interface.js';

async function testBasicFunctionality() {
  console.log('🧪 Testing Basic Storage Functionality...');
  
  try {
    // Initialize factory
    const initResult = await storageFactory.initialize();
    if (!initResult.success) {
      throw new Error(`Factory initialization failed: ${initResult.error}`);
    }
    console.log('✅ Storage factory initialized');

    // Check available types
    const availableTypes = storageFactory.getAvailableTypes();
    console.log(`✅ Available storage types: ${availableTypes.join(', ')}`);

    // Create memory backend
    const memoryConfig: StorageConfig = {
      type: 'memory',
      options: {}
    };

    const backendResult = await storageFactory.createBackend(memoryConfig);
    if (!backendResult.success || !backendResult.data) {
      throw new Error(`Backend creation failed: ${backendResult.error}`);
    }
    console.log('✅ Memory backend created successfully');

    const backend = backendResult.data;

    // Test basic set/get
    const setResult = await backend.set('test:key', 'test-value');
    if (!setResult.success) {
      throw new Error(`Set failed: ${setResult.error}`);
    }
    console.log('✅ Set operation successful');

    const getResult = await backend.get('test:key');
    if (!getResult.success) {
      throw new Error(`Get failed: ${getResult.error}`);
    }
    console.log('✅ Get operation successful:', getResult.data);

    // Test has
    const hasResult = await backend.has('test:key');
    if (!hasResult.success) {
      throw new Error(`Has failed: ${hasResult.error}`);
    }
    console.log('✅ Has operation successful:', hasResult.data);

    // Test keys
    const keysResult = await backend.keys();
    if (!keysResult.success) {
      throw new Error(`Keys failed: ${keysResult.error}`);
    }
    console.log('✅ Keys operation successful:', keysResult.data);

    // Test delete
    const deleteResult = await backend.delete('test:key');
    if (!deleteResult.success) {
      throw new Error(`Delete failed: ${deleteResult.error}`);
    }
    console.log('✅ Delete operation successful');

    // Test clear
    const clearResult = await backend.clear();
    if (!clearResult.success) {
      throw new Error(`Clear failed: ${clearResult.error}`);
    }
    console.log('✅ Clear operation successful');

    // Close backend
    const closeResult = await backend.close();
    if (!closeResult.success) {
      throw new Error(`Close failed: ${closeResult.error}`);
    }
    console.log('✅ Backend closed successfully');

    console.log('🎉 All basic functionality tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Basic functionality test failed:', error);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Simple Door43 Storage Tests\n');
  
  const success = await testBasicFunctionality();
  
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`${success ? '✅' : '❌'} Basic functionality: ${success ? 'PASSED' : 'FAILED'}`);
  
  if (success) {
    console.log('🎉 All tests passed! Storage system is working.');
    process.exit(0);
  } else {
    console.log('❌ Tests failed. Please check the output above.');
    process.exit(1);
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}` || 
    import.meta.url.endsWith(process.argv[1]) || 
    process.argv[1].endsWith('simple-cli-tester.ts')) {
  runTests();
}
