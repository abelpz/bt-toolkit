#!/usr/bin/env ts-node

/**
 * Test Runner
 * Runs all storage and service tests
 */

import { testStorageSystem } from './storage-test'
import { testDoor43Service } from './door43-service-test'

async function runAllTests() {
  console.log('🚀 Running All Tests for Bible Translation Toolkit Storage System\n')
  console.log('=' .repeat(80))
  
  try {
    // Run storage system tests
    console.log('\n📦 STORAGE SYSTEM TESTS')
    console.log('=' .repeat(80))
    await testStorageSystem()
    
    console.log('\n' + '=' .repeat(80))
    console.log('\n📖 DOOR43 SCRIPTURE SERVICE TESTS')
    console.log('=' .repeat(80))
    await testDoor43Service()
    
    console.log('\n' + '=' .repeat(80))
    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!')
    console.log('✅ Storage system is working correctly')
    console.log('✅ Door43 scripture service is working correctly')
    console.log('✅ Caching and performance optimizations are working')
    console.log('✅ Error handling is robust')
    console.log('\n📊 Test Summary:')
    console.log('   - Storage operations: ✅')
    console.log('   - Batch operations: ✅')
    console.log('   - Pattern matching: ✅')
    console.log('   - Cache management: ✅')
    console.log('   - Door43 API integration: ✅')
    console.log('   - USFM processing: ✅')
    console.log('   - Performance caching: ✅')
    console.log('   - Error handling: ✅')
    
  } catch (error) {
    console.error('\n❌ TESTS FAILED:', error)
    process.exit(1)
  }
}

// Run tests immediately
runAllTests().catch(console.error)

export { runAllTests }
