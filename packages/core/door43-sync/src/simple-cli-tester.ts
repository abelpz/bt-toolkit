#!/usr/bin/env tsx

/**
 * Simple CLI Tester for Door43 Sync Library
 * Tests synchronization components without external dependencies
 */

import { 
  ChangeDetectionService,
  ChangeType,
  ChangeOperation,
  ResourceVersion,
  ChangeTrackingConfig
} from './lib/change-detection-service.js';

// Mock storage backend for testing
class MockStorageBackend {
  private data = new Map<string, any>();

  async initialize() {
    return { success: true, data: undefined };
  }

  async set(key: string, value: any) {
    this.data.set(key, value);
    return { success: true, data: undefined };
  }

  async get<T>(key: string) {
    const value = this.data.get(key);
    return { success: true, data: value as T || null };
  }

  async has(key: string) {
    return { success: true, data: this.data.has(key) };
  }

  async delete(key: string) {
    const deleted = this.data.delete(key);
    return { success: true, data: deleted };
  }

  async keys() {
    return { success: true, data: Array.from(this.data.keys()) };
  }

  async clear() {
    this.data.clear();
    return { success: true, data: undefined };
  }

  async close() {
    return { success: true, data: undefined };
  }
}

// ============================================================================
// Test Functions
// ============================================================================

async function testChangeDetectionInitialization(): Promise<boolean> {
  console.log('\n🧪 Testing Change Detection Initialization...');
  
  try {
    const mockStorage = new MockStorageBackend();
    await mockStorage.initialize();
    
    const config: ChangeTrackingConfig = {
      enabled: true,
      trackContent: true,
      trackMetadata: true,
      maxHistorySize: 100,
      batchChanges: true,
      compressHistory: false
    };
    
    const changeDetection = new ChangeDetectionService(mockStorage as any, config);
    const initResult = await changeDetection.initialize();
    
    if (!initResult.success) {
      console.error(`❌ Initialization failed: ${initResult.error}`);
      return false;
    }
    
    console.log('✅ Change detection service initialized successfully');
    
    // Shutdown
    await changeDetection.shutdown();
    
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testVersionRecording(): Promise<boolean> {
  console.log('\n🧪 Testing Version Recording...');
  
  try {
    const mockStorage = new MockStorageBackend();
    await mockStorage.initialize();
    
    const changeDetection = new ChangeDetectionService(mockStorage as any);
    await changeDetection.initialize();
    
    // Record initial version
    console.log('📝 Recording initial version...');
    const version1Result = await changeDetection.recordVersion(
      'test-resource-1',
      'content-hash-1',
      'metadata-hash-1',
      'test-user'
    );
    
    if (!version1Result.success) {
      console.error(`❌ Failed to record version: ${version1Result.error}`);
      return false;
    }
    
    console.log(`📝 Recorded version: ${version1Result.data.version}`);
    
    // Record updated version
    console.log('📝 Recording updated version...');
    const version2Result = await changeDetection.recordVersion(
      'test-resource-1',
      'content-hash-2',
      'metadata-hash-1',
      'test-user'
    );
    
    if (!version2Result.success) {
      console.error(`❌ Failed to record updated version: ${version2Result.error}`);
      return false;
    }
    
    console.log(`📝 Recorded updated version: ${version2Result.data.version}`);
    
    // Verify version increment
    if (version2Result.data.version !== version1Result.data.version + 1) {
      console.error('❌ Version not incremented correctly');
      return false;
    }
    
    console.log('✅ Version recording working correctly');
    
    await changeDetection.shutdown();
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testChangeRecording(): Promise<boolean> {
  console.log('\n🧪 Testing Change Recording...');
  
  try {
    const mockStorage = new MockStorageBackend();
    await mockStorage.initialize();
    
    const changeDetection = new ChangeDetectionService(mockStorage as any);
    await changeDetection.initialize();
    
    // Record a change
    const change: ChangeOperation = {
      type: 'updated' as ChangeType,
      resourceId: 'test-resource-1',
      field: 'content',
      oldValue: 'old content',
      newValue: 'new content',
      timestamp: new Date(),
      changedBy: 'test-user',
      context: 'Test change',
      checksum: 'test-checksum'
    };
    
    console.log('📝 Recording change...');
    const recordResult = await changeDetection.recordChange(change);
    
    if (!recordResult.success) {
      console.error(`❌ Failed to record change: ${recordResult.error}`);
      return false;
    }
    
    // Get change history
    console.log('📖 Getting change history...');
    const historyResult = await changeDetection.getChangeHistory('test-resource-1');
    
    if (!historyResult.success) {
      console.error(`❌ Failed to get change history: ${historyResult.error}`);
      return false;
    }
    
    console.log(`📊 Found ${historyResult.data.length} changes in history`);
    
    if (historyResult.data.length !== 1) {
      console.error('❌ Expected 1 change in history');
      return false;
    }
    
    const recordedChange = historyResult.data[0];
    if (recordedChange.type !== change.type || recordedChange.field !== change.field) {
      console.error('❌ Recorded change does not match original');
      return false;
    }
    
    console.log('✅ Change recording working correctly');
    
    await changeDetection.shutdown();
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testChangeDetection(): Promise<boolean> {
  console.log('\n🧪 Testing Change Detection...');
  
  try {
    const mockStorage = new MockStorageBackend();
    await mockStorage.initialize();
    
    const changeDetection = new ChangeDetectionService(mockStorage as any);
    await changeDetection.initialize();
    
    const resourceId = 'test-resource-1';
    
    // Record initial version
    await changeDetection.recordVersion(
      resourceId,
      'content-hash-1',
      'metadata-hash-1',
      'test-user'
    );
    
    // Detect changes with same hashes (no change)
    console.log('🔍 Detecting changes with same content...');
    const noChangeResult = await changeDetection.detectChanges(
      resourceId,
      'content-hash-1',
      'metadata-hash-1'
    );
    
    if (!noChangeResult.success) {
      console.error(`❌ Failed to detect changes: ${noChangeResult.error}`);
      return false;
    }
    
    if (noChangeResult.data.hasChanged) {
      console.error('❌ Should not detect changes with same hashes');
      return false;
    }
    
    console.log('✅ No changes detected correctly');
    
    // Detect changes with different content hash
    console.log('🔍 Detecting changes with different content...');
    const contentChangeResult = await changeDetection.detectChanges(
      resourceId,
      'content-hash-2',
      'metadata-hash-1'
    );
    
    if (!contentChangeResult.success) {
      console.error(`❌ Failed to detect content changes: ${contentChangeResult.error}`);
      return false;
    }
    
    if (!contentChangeResult.data.hasChanged) {
      console.error('❌ Should detect content changes');
      return false;
    }
    
    if (contentChangeResult.data.changeType !== 'updated') {
      console.error('❌ Should detect update change type');
      return false;
    }
    
    console.log('✅ Content changes detected correctly');
    
    // Detect changes with different metadata hash
    console.log('🔍 Detecting changes with different metadata...');
    const metadataChangeResult = await changeDetection.detectChanges(
      resourceId,
      'content-hash-1',
      'metadata-hash-2'
    );
    
    if (!metadataChangeResult.success) {
      console.error(`❌ Failed to detect metadata changes: ${metadataChangeResult.error}`);
      return false;
    }
    
    if (!metadataChangeResult.data.hasChanged) {
      console.error('❌ Should detect metadata changes');
      return false;
    }
    
    console.log('✅ Metadata changes detected correctly');
    
    console.log('✅ Change detection working correctly');
    
    await changeDetection.shutdown();
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testChangeDetectionStatistics(): Promise<boolean> {
  console.log('\n🧪 Testing Change Detection Statistics...');
  
  try {
    const mockStorage = new MockStorageBackend();
    await mockStorage.initialize();
    
    const changeDetection = new ChangeDetectionService(mockStorage as any);
    await changeDetection.initialize();
    
    // Record some versions and changes
    await changeDetection.recordVersion('resource-1', 'hash-1', 'meta-1', 'user-1');
    await changeDetection.recordVersion('resource-2', 'hash-2', 'meta-2', 'user-2');
    
    const change1: ChangeOperation = {
      type: 'created' as ChangeType,
      resourceId: 'resource-1',
      timestamp: new Date(),
      changedBy: 'user-1',
      checksum: 'chk-1'
    };
    
    const change2: ChangeOperation = {
      type: 'updated' as ChangeType,
      resourceId: 'resource-1',
      field: 'content',
      timestamp: new Date(),
      changedBy: 'user-1',
      checksum: 'chk-2'
    };
    
    await changeDetection.recordChange(change1);
    await changeDetection.recordChange(change2);
    
    // Get statistics
    console.log('📊 Getting statistics...');
    const statsResult = await changeDetection.getStatistics();
    
    if (!statsResult.success) {
      console.error(`❌ Failed to get statistics: ${statsResult.error}`);
      return false;
    }
    
    const stats = statsResult.data;
    console.log('📈 Change Detection Statistics:');
    console.log(`   Total Resources: ${stats.totalResources}`);
    console.log(`   Total Changes: ${stats.totalChanges}`);
    console.log(`   Changes by Type:`, stats.changesByType);
    console.log(`   Average Changes per Resource: ${stats.averageChangesPerResource}`);
    
    if (stats.totalResources !== 2) {
      console.error(`❌ Expected 2 resources, got ${stats.totalResources}`);
      return false;
    }
    
    if (stats.totalChanges !== 2) {
      console.error(`❌ Expected 2 changes, got ${stats.totalChanges}`);
      return false;
    }
    
    console.log('✅ Change detection statistics working correctly');
    
    await changeDetection.shutdown();
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

async function testResourceVersionRetrieval(): Promise<boolean> {
  console.log('\n🧪 Testing Resource Version Retrieval...');
  
  try {
    const mockStorage = new MockStorageBackend();
    await mockStorage.initialize();
    
    const changeDetection = new ChangeDetectionService(mockStorage as any);
    await changeDetection.initialize();
    
    const resourceId = 'test-resource-1';
    
    // Get version for non-existent resource
    console.log('🔍 Getting version for non-existent resource...');
    const noVersionResult = await changeDetection.getResourceVersion(resourceId);
    
    if (!noVersionResult.success) {
      console.error(`❌ Failed to get version: ${noVersionResult.error}`);
      return false;
    }
    
    if (noVersionResult.data !== null) {
      console.error('❌ Should return null for non-existent resource');
      return false;
    }
    
    console.log('✅ Non-existent resource handled correctly');
    
    // Record a version
    const recordResult = await changeDetection.recordVersion(
      resourceId,
      'content-hash-1',
      'metadata-hash-1',
      'test-user'
    );
    
    if (!recordResult.success) {
      console.error(`❌ Failed to record version: ${recordResult.error}`);
      return false;
    }
    
    // Get the recorded version
    console.log('🔍 Getting recorded version...');
    const versionResult = await changeDetection.getResourceVersion(resourceId);
    
    if (!versionResult.success) {
      console.error(`❌ Failed to get recorded version: ${versionResult.error}`);
      return false;
    }
    
    if (!versionResult.data) {
      console.error('❌ Should return version for existing resource');
      return false;
    }
    
    const version = versionResult.data;
    console.log(`📝 Retrieved version: ${version.version} (${version.contentHash})`);
    
    if (version.resourceId !== resourceId) {
      console.error('❌ Resource ID mismatch');
      return false;
    }
    
    if (version.contentHash !== 'content-hash-1') {
      console.error('❌ Content hash mismatch');
      return false;
    }
    
    console.log('✅ Resource version retrieval working correctly');
    
    await changeDetection.shutdown();
    return true;
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
    return false;
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Door43 Sync Library Simple Tests');
  console.log('===========================================');
  
  const tests = [
    { name: 'Change Detection Initialization', fn: testChangeDetectionInitialization },
    { name: 'Version Recording', fn: testVersionRecording },
    { name: 'Change Recording', fn: testChangeRecording },
    { name: 'Change Detection', fn: testChangeDetection },
    { name: 'Change Detection Statistics', fn: testChangeDetectionStatistics },
    { name: 'Resource Version Retrieval', fn: testResourceVersionRetrieval }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
        console.log(`✅ ${test.name} - PASSED`);
      } else {
        failed++;
        console.log(`❌ ${test.name} - FAILED`);
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${test.name} - ERROR: ${error}`);
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total:  ${tests.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! The Door43 Sync core components are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}
