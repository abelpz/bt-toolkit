#!/usr/bin/env node
/**
 * Simple CLI Tester for SQLite Storage Plugin
 * Tests SQLite plugin without complex dependencies
 */

import { SQLiteStoragePlugin } from './lib/sqlite-plugin.js';

async function testSQLitePlugin() {
  console.log('🧪 Testing SQLite Storage Plugin...');
  
  try {
    // Create SQLite plugin
    const sqlitePlugin = new SQLiteStoragePlugin();
    console.log(`✅ Created SQLite plugin: ${sqlitePlugin.metadata.name} v${sqlitePlugin.metadata.version}`);

    // Test plugin metadata
    console.log('📋 Plugin metadata:');
    console.log(`  - Name: ${sqlitePlugin.metadata.name}`);
    console.log(`  - Type: ${sqlitePlugin.metadata.type}`);
    console.log(`  - Description: ${sqlitePlugin.metadata.description}`);
    console.log(`  - Platforms: ${sqlitePlugin.metadata.platforms.join(', ')}`);
    console.log(`  - Built-in: ${sqlitePlugin.metadata.builtin}`);

    // Test plugin availability
    const availabilityResult = await sqlitePlugin.isAvailable();
    if (!availabilityResult.success) {
      throw new Error(`Availability check failed: ${availabilityResult.error}`);
    }
    console.log(`✅ Plugin availability: ${availabilityResult.data ? 'available' : 'not available'}`);

    // Test configuration schema
    const schema = sqlitePlugin.getConfigSchema();
    console.log('✅ Configuration schema properties:', Object.keys(schema.properties || {}));

    // Test configuration validation - valid config
    const validConfig = {
      type: 'sqlite' as const,
      options: {
        databasePath: './test.db',
        enableWAL: true
      }
    };

    const validationResult = await sqlitePlugin.validateConfig(validConfig);
    if (!validationResult.success) {
      throw new Error(`Config validation failed: ${validationResult.error}`);
    }
    console.log(`✅ Valid config validation: ${validationResult.data?.valid ? 'valid' : 'invalid'}`);

    // Test configuration validation - invalid config
    const invalidConfig = {
      type: 'sqlite' as const,
      options: {} // Missing required databasePath or databaseName
    };

    const invalidValidationResult = await sqlitePlugin.validateConfig(invalidConfig);
    if (!invalidValidationResult.success) {
      throw new Error(`Invalid config validation failed: ${invalidValidationResult.error}`);
    }
    console.log(`✅ Invalid config validation: ${invalidValidationResult.data?.valid ? 'valid' : 'invalid'}`);
    if (invalidValidationResult.data?.errors && invalidValidationResult.data.errors.length > 0) {
      console.log(`  - Expected errors: ${invalidValidationResult.data.errors.join(', ')}`);
    }

    // Test backend creation
    console.log('🧪 Testing SQLite backend creation...');
    const backend = sqlitePlugin.createBackend();
    console.log('✅ SQLite backend created successfully');

    // Test backend initialization
    const initResult = await backend.initialize(validConfig);
    if (!initResult.success) {
      throw new Error(`Backend initialization failed: ${initResult.error}`);
    }
    console.log('✅ SQLite backend initialized successfully');

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
    console.log('✅ Get operation successful:', getResult.data?.message || 'data retrieved');

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
    console.log('✅ Keys operation successful:', keysResult.data?.length || 0, 'keys found');

    // Test storage info
    const infoResult = await backend.getStorageInfo();
    if (!infoResult.success) {
      throw new Error(`Storage info failed: ${infoResult.error}`);
    }
    console.log('✅ Storage info:', {
      type: infoResult.data?.type,
      connected: infoResult.data?.connected
    });

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

async function runTests() {
  console.log('🚀 Starting SQLite Storage Plugin Tests\n');
  
  const success = await testSQLitePlugin();
  
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`${success ? '✅' : '❌'} SQLite plugin: ${success ? 'PASSED' : 'FAILED'}`);
  
  if (success) {
    console.log('🎉 All tests passed! SQLite plugin is working correctly.');
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
