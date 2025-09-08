#!/usr/bin/env tsx

console.log('🔍 Debug Test - Starting...');

try {
  console.log('📦 Importing change detection service...');
  const { ChangeDetectionService } = await import('./lib/change-detection-service.js');
  console.log('✅ ChangeDetectionService imported successfully');
  
  console.log('📦 Importing version management service...');
  const { VersionManagementService } = await import('./lib/version-management-service.js');
  console.log('✅ VersionManagementService imported successfully');
  
  console.log('📦 Importing real-time updates service...');
  const { RealTimeUpdatesService } = await import('./lib/real-time-updates-service.js');
  console.log('✅ RealTimeUpdatesService imported successfully');
  
  console.log('📦 Importing sync orchestrator...');
  const { Door43SyncOrchestrator } = await import('./lib/sync-orchestrator.js');
  console.log('✅ Door43SyncOrchestrator imported successfully');
  
  console.log('🎉 All imports successful!');
  
  // Test basic instantiation
  console.log('🧪 Testing basic instantiation...');
  
  // Mock storage
  const mockStorage = {
    async get() { return { success: true, data: null }; },
    async set() { return { success: true, data: undefined }; },
    async has() { return { success: true, data: false }; },
    async delete() { return { success: true, data: false }; },
    async keys() { return { success: true, data: [] }; },
    async clear() { return { success: true, data: undefined }; },
    async close() { return { success: true, data: undefined }; }
  };
  
  const changeService = new ChangeDetectionService(mockStorage as any);
  console.log('✅ ChangeDetectionService instantiated');
  
  const versionService = new VersionManagementService(mockStorage as any);
  console.log('✅ VersionManagementService instantiated');
  
  const realtimeService = new RealTimeUpdatesService(mockStorage as any);
  console.log('✅ RealTimeUpdatesService instantiated');
  
  const syncOrchestrator = new Door43SyncOrchestrator(mockStorage as any);
  console.log('✅ Door43SyncOrchestrator instantiated');
  
  console.log('🎯 All services instantiated successfully!');
  
} catch (error) {
  console.error('❌ Error during debug test:', error);
  console.error('Stack trace:', error.stack);
}

console.log('🔍 Debug Test - Complete');
