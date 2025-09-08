#!/usr/bin/env node
/**
 * CLI Tester for SQLite Storage Plugin
 * Tests SQLite plugin registration and functionality
 */

import { storageFactory } from '@bt-toolkit/door43-storage';
import { SQLiteStoragePlugin } from './lib/sqlite-plugin.js';

async function testSQLitePlugin() {
  console.log('🧪 Testing SQLite Storage Plugin...');
  
  try {
    // Create and register SQLite plugin
    const sqlitePlugin = new SQLiteStoragePlugin();
    console.log(`✅ Created SQLite plugin: ${sqlitePlugin.metadata.name} v${sqlitePlugin.metadata.version}`);

    // Test plugin metadata
    console.log('📋 Plugin metadata:');
    console.log(`  - Name: ${sqlitePlugin.metadata.name}`);
    console.log(`  - Type: ${sqlitePlugin.metadata.type}`);
    console.log(`  - Description: ${sqlitePlugin.metadata.description}`);
    console.log(`  - Platforms: ${sqlitePlugin.metadata.platforms.join(', ')}`);
    console.log(`  - Dependencies: ${sqlitePlugin.metadata.dependencies.join(', ')}`);
    console.log(`  - Built-in: ${sqlitePlugin.metadata.builtin}`);

    // Test plugin availability
    const availabilityResult = await sqlitePlugin.isAvailable();
    if (!availabilityResult.success) {
      throw new Error(`Availability check failed: ${availabilityResult.error}`);
    }
    console.log(`✅ Plugin availability: ${availabilityResult.data ? 'available' : 'not available'}`);

    // Test configuration schema
    const schema = sqlitePlugin.getConfigSchema();
    console.log('✅ Configuration schema:', Object.keys(schema));
    console.log('  - Required properties:', schema.required);
    console.log('  - Options properties:', Object.keys(schema.properties.options.properties));

    // Test configuration validation
    const validConfig = {
      type: 'sqlite' as const,
      options: {
        databasePath: './test.db',
        enableWAL: true,
        cacheSize: 10000
      }
    };

    const validationResult = await sqlitePlugin.validateConfig(validConfig);
    if (!validationResult.success) {
      throw new Error(`Config validation failed: ${validationResult.error}`);
    }
    console.log(`✅ Valid config validation: ${validationResult.data.valid ? 'valid' : 'invalid'}`);
    if (validationResult.data.warnings.length > 0) {
      console.log(`  - Warnings: ${validationResult.data.warnings.join(', ')}`);
    }

    // Test invalid configuration
    const invalidConfig = {
      type: 'sqlite' as const,
      options: {} // Missing required databasePath or databaseName
    };

    const invalidValidationResult = await sqlitePlugin.validateConfig(invalidConfig);
    if (!invalidValidationResult.success) {
      throw new Error(`Invalid config validation failed: ${invalidValidationResult.error}`);
    }
    console.log(`✅ Invalid config validation: ${invalidValidationResult.data.valid ? 'valid' : 'invalid'}`);
    if (invalidValidationResult.data.errors.length > 0) {
      console.log(`  - Errors: ${invalidValidationResult.data.errors.join(', ')}`);
    }

    // Register plugin with storage factory
    console.log('🔌 Registering SQLite plugin with storage factory...');
    const registerResult = await storageFactory.registerPlugin(sqlitePlugin);
    if (!registerResult.success) {
      throw new Error(`Plugin registration failed: ${registerResult.error}`);
    }
    console.log('✅ SQLite plugin registered successfully');

    // Verify plugin is available in factory
    const availableTypes = storageFactory.getAvailableTypes();
    console.log(`✅ Available storage types: ${availableTypes.join(', ')}`);
    
    if (!availableTypes.includes('sqlite')) {
      throw new Error('SQLite type not found in available types');
    }

    // Test backend creation
    console.log('🧪 Testing SQLite backend creation...');
    const backendResult = await storageFactory.createBackend(validConfig);
    if (!backendResult.success) {
      throw new Error(`Backend creation failed: ${backendResult.error}`);
    }
    console.log('✅ SQLite backend created successfully');

    const backend = backendResult.data;

    // Test basic operations
    console.log('🧪 Testing basic SQLite operations...');

    // Test set/get
    const setResult = await backend.set('sqlite:test:1', { 
      message: 'Hello SQLite!', 
      timestamp: new Date(),
      data: { nested: true, array: [1, 2, 3] }
    });
    if (!setResult.success) {
      throw new Error(`Set operation failed: ${setResult.error}`);
    }
    console.log('✅ Set operation successful');

    const getResult = await backend.get('sqlite:test:1');
    if (!getResult.success) {
      throw new Error(`Get operation failed: ${getResult.error}`);
    }
    console.log('✅ Get operation successful:', getResult.data?.message);

    // Test has
    const hasResult = await backend.has('sqlite:test:1');
    if (!hasResult.success || !hasResult.data) {
      throw new Error('Has operation failed');
    }
    console.log('✅ Has operation successful');

    // Test keys
    const keysResult = await backend.keys('sqlite:test:');
    if (!keysResult.success) {
      throw new Error(`Keys operation failed: ${keysResult.error}`);
    }
    console.log('✅ Keys operation successful:', keysResult.data);

    // Test batch operations
    console.log('🧪 Testing SQLite batch operations...');
    const batchResult = await backend.batch([
      { type: 'set', key: 'sqlite:batch:1', value: 'batch-value-1' },
      { type: 'set', key: 'sqlite:batch:2', value: 'batch-value-2' },
      { type: 'get', key: 'sqlite:batch:1' },
      { type: 'has', key: 'sqlite:batch:2' }
    ]);

    if (!batchResult.success) {
      throw new Error(`Batch operation failed: ${batchResult.error}`);
    }
    console.log('✅ Batch operations successful:', batchResult.data.results.length, 'operations');

    // Test storage info
    const infoResult = await backend.getStorageInfo();
    if (!infoResult.success) {
      throw new Error(`Storage info failed: ${infoResult.error}`);
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

    console.log('🎉 All SQLite plugin tests passed!');
    return true;

  } catch (error) {
    console.error('❌ SQLite plugin test failed:', error);
    return false;
  }
}

async function testPluginIntegration() {
  console.log('\n🧪 Testing Plugin Integration...');
  
  try {
    // Initialize storage factory
    const initResult = await storageFactory.initialize();
    if (!initResult.success) {
      throw new Error(`Factory initialization failed: ${initResult.error}`);
    }

    // Register SQLite plugin
    const sqlitePlugin = new SQLiteStoragePlugin();
    const registerResult = await storageFactory.registerPlugin(sqlitePlugin);
    if (!registerResult.success) {
      throw new Error(`Plugin registration failed: ${registerResult.error}`);
    }

    // Test that both memory and SQLite are available
    const availableTypes = storageFactory.getAvailableTypes();
    console.log(`✅ Available types after registration: ${availableTypes.join(', ')}`);

    if (!availableTypes.includes('memory')) {
      throw new Error('Memory type should still be available');
    }

    if (!availableTypes.includes('sqlite')) {
      throw new Error('SQLite type should be available after registration');
    }

    // Test creating both backends
    const memoryBackend = await storageFactory.createBackend({
      type: 'memory',
      options: {}
    });

    const sqliteBackend = await storageFactory.createBackend({
      type: 'sqlite',
      options: { databasePath: './integration-test.db' }
    });

    if (!memoryBackend.success || !sqliteBackend.success) {
      throw new Error('Failed to create both backends');
    }

    console.log('✅ Both memory and SQLite backends created successfully');

    // Test cross-backend operations
    await memoryBackend.data.set('integration:memory', 'memory-value');
    await sqliteBackend.data.set('integration:sqlite', 'sqlite-value');

    const memoryValue = await memoryBackend.data.get('integration:memory');
    const sqliteValue = await sqliteBackend.data.get('integration:sqlite');

    if (!memoryValue.success || !sqliteValue.success) {
      throw new Error('Cross-backend operations failed');
    }

    console.log('✅ Cross-backend operations successful');
    console.log(`  - Memory value: ${memoryValue.data}`);
    console.log(`  - SQLite value: ${sqliteValue.data}`);

    // Cleanup
    await memoryBackend.data.close();
    await sqliteBackend.data.close();

    console.log('🎉 All plugin integration tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Plugin integration test failed:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting SQLite Storage Plugin Tests\n');
  
  const results = {
    sqlitePlugin: false,
    pluginIntegration: false
  };

  // Run all tests
  results.sqlitePlugin = await testSQLitePlugin();
  results.pluginIntegration = await testPluginIntegration();

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
    console.log('🎉 All tests passed! SQLite plugin is working correctly.');
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
SQLite Storage Plugin CLI Tester

Usage: npx tsx src/cli-tester.ts [options]

Options:
  --help, -h              Show this help message
  --plugin                Test SQLite plugin only
  --integration           Test plugin integration only
  --verbose               Enable verbose output

Examples:
  npx tsx src/cli-tester.ts                    # Run all tests
  npx tsx src/cli-tester.ts --plugin           # Test plugin only
  npx tsx src/cli-tester.ts --integration      # Test integration only
`);
    process.exit(0);
  }

  // Run specific tests based on arguments
  if (args.includes('--plugin')) {
    testSQLitePlugin().then(success => process.exit(success ? 0 : 1));
  } else if (args.includes('--integration')) {
    testPluginIntegration().then(success => process.exit(success ? 0 : 1));
  } else {
    // Run all tests
    runAllTests();
  }
}
