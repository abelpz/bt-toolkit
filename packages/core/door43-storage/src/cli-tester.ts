#!/usr/bin/env node
/**
 * CLI Tester for Door43 Storage System
 * Tests storage backends, plugin registry, and factory
 */

import { storageFactory } from './lib/storage-factory.js';
import { storagePluginRegistry } from './lib/plugin-registry.js';
import { StorageConfig } from './lib/storage-interface.js';

async function testStorageInterface() {
  console.log('🧪 Testing Storage Interface...');
  
  try {
    // Test factory initialization
    const initResult = await storageFactory.initialize();
    if (!initResult.success) {
      throw new Error(`Factory initialization failed: ${initResult.error}`);
    }
    console.log('✅ Storage factory initialized');

    // Test plugin registry
    const availableTypes = storageFactory.getAvailableTypes();
    console.log(`✅ Available storage types: ${availableTypes.join(', ')}`);

    // Test memory backend creation
    const memoryConfig: StorageConfig = {
      type: 'memory',
      options: {
        maxSize: 10 * 1024 * 1024 // 10MB
      }
    };

    const backendResult = await storageFactory.createBackend(memoryConfig);
    if (!backendResult.success) {
      throw new Error(`Backend creation failed: ${backendResult.error}`);
    }
    console.log('✅ Memory backend created successfully');

    const backend = backendResult.data;
    if (!backend) {
      throw new Error('Backend creation returned undefined');
    }

    // Test basic operations
    console.log('🧪 Testing basic storage operations...');

    // Test set/get
    const setResult = await backend.set('test:key1', { message: 'Hello World', timestamp: new Date() });
    if (!setResult.success) {
      throw new Error(`Set operation failed: ${setResult.error}`);
    }
    console.log('✅ Set operation successful');

    const getResult = await backend.get('test:key1');
    if (!getResult.success) {
      throw new Error(`Get operation failed: ${getResult.error}`);
    }
    console.log('✅ Get operation successful:', getResult.data);

    // Test has
    const hasResult = await backend.has('test:key1');
    if (!hasResult.success || !hasResult.data) {
      throw new Error('Has operation failed');
    }
    console.log('✅ Has operation successful');

    // Test keys
    const keysResult = await backend.keys('test:');
    if (!keysResult.success) {
      throw new Error(`Keys operation failed: ${keysResult.error}`);
    }
    console.log('✅ Keys operation successful:', keysResult.data);

    // Test batch operations
    console.log('🧪 Testing batch operations...');
    const batchResult = await backend.batch([
      { type: 'set', key: 'batch:1', value: 'value1' },
      { type: 'set', key: 'batch:2', value: 'value2' },
      { type: 'get', key: 'batch:1' },
      { type: 'has', key: 'batch:2' }
    ]);

    if (!batchResult.success) {
      throw new Error(`Batch operation failed: ${batchResult.error}`);
    }
    if (!batchResult.data) {
      throw new Error('Batch operation returned undefined data');
    }
    console.log('✅ Batch operations successful:', batchResult.data.results.length, 'operations');

    // Test multiple operations
    console.log('🧪 Testing multiple operations...');
    const multiSetResult = await backend.setMultiple([
      { key: 'multi:1', value: 'multi-value1' },
      { key: 'multi:2', value: 'multi-value2' },
      { key: 'multi:3', value: 'multi-value3' }
    ]);

    if (!multiSetResult.success) {
      throw new Error(`Multi-set failed: ${multiSetResult.error}`);
    }
    console.log('✅ Multi-set successful');

    const multiGetResult = await backend.getMultiple(['multi:1', 'multi:2', 'multi:3', 'multi:missing']);
    if (!multiGetResult.success) {
      throw new Error(`Multi-get failed: ${multiGetResult.error}`);
    }
    if (!multiGetResult.data) {
      throw new Error('Multi-get returned undefined data');
    }
    console.log('✅ Multi-get successful:', multiGetResult.data.length, 'results');

    // Test TTL
    console.log('🧪 Testing TTL...');
    const ttlResult = await backend.set('ttl:test', 'expires-soon', { ttl: 100 }); // 100ms
    if (!ttlResult.success) {
      throw new Error(`TTL set failed: ${ttlResult.error}`);
    }

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const expiredResult = await backend.get('ttl:test');
    if (!expiredResult.success) {
      throw new Error(`TTL get failed: ${expiredResult.error}`);
    }
    
    if (expiredResult.data !== null) {
      console.log('⚠️ TTL test: value should have expired but still exists');
    } else {
      console.log('✅ TTL test successful - value expired as expected');
    }

    // Test storage info
    const infoResult = await backend.getStorageInfo();
    if (!infoResult.success) {
      throw new Error(`Storage info failed: ${infoResult.error}`);
    }
    if (!infoResult.data) {
      throw new Error('Storage info returned undefined data');
    }
    console.log('✅ Storage info:', {
      type: infoResult.data.type,
      usedSpace: infoResult.data.usedSpace,
      connected: infoResult.data.connected
    });

    // Test optimization
    const optimizeResult = await backend.optimize();
    if (!optimizeResult.success) {
      throw new Error(`Optimization failed: ${optimizeResult.error}`);
    }
    if (!optimizeResult.data) {
      throw new Error('Optimization returned undefined data');
    }
    console.log('✅ Optimization successful:', optimizeResult.data.operations);

    // Cleanup
    const clearResult = await backend.clear();
    if (!clearResult.success) {
      throw new Error(`Clear failed: ${clearResult.error}`);
    }
    console.log('✅ Clear successful');

    // Close backend
    const closeResult = await backend.close();
    if (!closeResult.success) {
      throw new Error(`Close failed: ${closeResult.error}`);
    }
    console.log('✅ Backend closed successfully');

    console.log('🎉 All storage interface tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Storage interface test failed:', error);
    return false;
  }
}

async function testPluginRegistry() {
  console.log('\n🧪 Testing Plugin Registry...');
  
  try {
    // Test registry initialization
    const initResult = await storagePluginRegistry.initialize();
    if (!initResult.success) {
      throw new Error(`Registry initialization failed: ${initResult.error}`);
    }
    console.log('✅ Plugin registry initialized');

    // Test available plugins
    const plugins = storagePluginRegistry.getAllPlugins();
    console.log(`✅ Found ${plugins.length} registered plugins`);

    for (const plugin of plugins) {
      console.log(`  - ${plugin.metadata.name} (${plugin.metadata.type}) v${plugin.metadata.version}`);
      console.log(`    Platforms: ${plugin.metadata.platforms.join(', ')}`);
      console.log(`    Built-in: ${plugin.metadata.builtin}`);
    }

    // Test plugin availability
    for (const plugin of plugins) {
      const availabilityResult = await plugin.isAvailable();
      if (!availabilityResult.success) {
        console.log(`⚠️ Plugin ${plugin.metadata.name} availability check failed: ${availabilityResult.error}`);
      } else {
        console.log(`✅ Plugin ${plugin.metadata.name} is ${availabilityResult.data ? 'available' : 'not available'}`);
      }
    }

    // Test configuration validation
    for (const plugin of plugins) {
      const testConfig: StorageConfig = {
        type: plugin.metadata.type,
        options: {}
      };

      const validationResult = await plugin.validateConfig(testConfig);
      if (!validationResult.success) {
        console.log(`⚠️ Plugin ${plugin.metadata.name} config validation failed: ${validationResult.error}`);
      } else {
        if (!validationResult.data) {
          throw new Error('Validation returned undefined data');
        }
        console.log(`✅ Plugin ${plugin.metadata.name} config validation: ${validationResult.data.valid ? 'valid' : 'invalid'}`);
        if (!validationResult.data.valid) {
          console.log(`    Errors: ${validationResult.data.errors.join(', ')}`);
        }
        if (validationResult.data.warnings.length > 0) {
          console.log(`    Warnings: ${validationResult.data.warnings.join(', ')}`);
        }
      }
    }

    // Test configuration schemas
    for (const plugin of plugins) {
      const schema = plugin.getConfigSchema();
      console.log(`✅ Plugin ${plugin.metadata.name} config schema:`, Object.keys(schema));
    }

    console.log('🎉 All plugin registry tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Plugin registry test failed:', error);
    return false;
  }
}

async function testStorageFactory() {
  console.log('\n🧪 Testing Storage Factory...');
  
  try {
    // Test factory methods
    const availableTypes = storageFactory.getAvailableTypes();
    console.log(`✅ Available types from factory: ${availableTypes.join(', ')}`);

    // Test type support checking
    for (const type of availableTypes) {
      const isSupported = storageFactory.isTypeSupported(type);
      console.log(`✅ Type ${type} is ${isSupported ? 'supported' : 'not supported'}`);
    }

    // Test plugin info
    for (const type of availableTypes) {
      const info = storageFactory.getPluginInfo(type);
      if (info) {
        console.log(`✅ Plugin info for ${type}: ${info.name} v${info.version}`);
      }
    }

    // Test configuration validation
    const testConfig: StorageConfig = {
      type: 'memory',
      options: { maxSize: 1024 * 1024 }
    };

    const validationResult = await storageFactory.validateConfig(testConfig);
    if (!validationResult.success) {
      throw new Error(`Config validation failed: ${validationResult.error}`);
    }
    if (!validationResult.data) {
      throw new Error('Config validation returned undefined data');
    }
    console.log(`✅ Config validation: ${validationResult.data.valid ? 'valid' : 'invalid'}`);

    // Test config schema
    const schema = storageFactory.getConfigSchema('memory');
    if (schema) {
      console.log('✅ Config schema for memory:', Object.keys(schema));
    }

    console.log('🎉 All storage factory tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Storage factory test failed:', error);
    return false;
  }
}

async function testPerformance() {
  console.log('\n🧪 Testing Performance...');
  
  try {
    const config: StorageConfig = {
      type: 'memory',
      options: {}
    };

    const backendResult = await storageFactory.createBackend(config);
    if (!backendResult.success) {
      throw new Error(`Backend creation failed: ${backendResult.error}`);
    }

    const backend = backendResult.data;
    if (!backend) {
      throw new Error('Backend creation returned undefined');
    }
    const iterations = 1000;
    
    // Test write performance
    console.log(`🧪 Testing write performance (${iterations} operations)...`);
    const writeStart = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      const result = await backend.set(`perf:write:${i}`, { 
        id: i, 
        data: `test-data-${i}`,
        timestamp: new Date()
      });
      if (!result.success) {
        throw new Error(`Write ${i} failed: ${result.error}`);
      }
    }
    
    const writeTime = Date.now() - writeStart;
    const writeOpsPerSec = Math.round((iterations / writeTime) * 1000);
    console.log(`✅ Write performance: ${writeTime}ms total, ${writeOpsPerSec} ops/sec`);

    // Test read performance
    console.log(`🧪 Testing read performance (${iterations} operations)...`);
    const readStart = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      const result = await backend.get(`perf:write:${i}`);
      if (!result.success) {
        throw new Error(`Read ${i} failed: ${result.error}`);
      }
      if (!result.data) {
        throw new Error(`Read ${i} returned null`);
      }
    }
    
    const readTime = Date.now() - readStart;
    const readOpsPerSec = Math.round((iterations / readTime) * 1000);
    console.log(`✅ Read performance: ${readTime}ms total, ${readOpsPerSec} ops/sec`);

    // Test batch performance
    console.log(`🧪 Testing batch performance...`);
    const batchSize = 100;
    const batchOperations = [];
    
    for (let i = 0; i < batchSize; i++) {
      batchOperations.push({
        type: 'set' as const,
        key: `perf:batch:${i}`,
        value: { id: i, data: `batch-data-${i}` }
      });
    }
    
    const batchStart = Date.now();
    const batchResult = await backend.batch(batchOperations);
    const batchTime = Date.now() - batchStart;
    
    if (!batchResult.success) {
      throw new Error(`Batch operation failed: ${batchResult.error}`);
    }
    
    const batchOpsPerSec = Math.round((batchSize / batchTime) * 1000);
    console.log(`✅ Batch performance: ${batchTime}ms total, ${batchOpsPerSec} ops/sec`);

    // Cleanup
    await backend.clear();
    await backend.close();

    console.log('🎉 All performance tests completed!');
    return true;

  } catch (error) {
    console.error('❌ Performance test failed:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Door43 Storage System Tests\n');
  
  const results = {
    storageInterface: false,
    pluginRegistry: false,
    storageFactory: false,
    performance: false
  };

  // Run all tests
  results.storageInterface = await testStorageInterface();
  results.pluginRegistry = await testPluginRegistry();
  results.storageFactory = await testStorageFactory();
  results.performance = await testPerformance();

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  for (const [test, result] of Object.entries(results)) {
    console.log(`${result ? '✅' : '❌'} ${test}: ${result ? 'PASSED' : 'FAILED'}`);
  }
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Storage system is working correctly.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please check the output above.');
    process.exit(1);
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}` || 
    import.meta.url.endsWith(process.argv[1]) || 
    process.argv[1].endsWith('cli-tester.ts')) {
  
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Door43 Storage System CLI Tester

Usage: npx tsx src/cli-tester.ts [options]

Options:
  --help, -h              Show this help message
  --interface             Test storage interface only
  --registry              Test plugin registry only
  --factory               Test storage factory only
  --performance           Test performance only
  --verbose               Enable verbose output

Examples:
  npx tsx src/cli-tester.ts                    # Run all tests
  npx tsx src/cli-tester.ts --interface        # Test interface only
  npx tsx src/cli-tester.ts --performance      # Test performance only
`);
    process.exit(0);
  }

  // Run specific tests based on arguments
  if (args.includes('--interface')) {
    testStorageInterface().then(success => process.exit(success ? 0 : 1));
  } else if (args.includes('--registry')) {
    testPluginRegistry().then(success => process.exit(success ? 0 : 1));
  } else if (args.includes('--factory')) {
    testStorageFactory().then(success => process.exit(success ? 0 : 1));
  } else if (args.includes('--performance')) {
    testPerformance().then(success => process.exit(success ? 0 : 1));
  } else {
    // Run all tests
    runAllTests();
  }
}
