/**
 * Basic Usage Examples
 * 
 * Shows how to use the Door43 Resource Downloader in different scenarios.
 */

import { 
  downloadResources, 
  downloadSpecificResources,
  createMinimalConfig,
  createComprehensiveConfig,
  ResourceDownloader,
  AdapterType 
} from '../index';

/**
 * Example 1: Download all resources with default configuration
 */
async function example1_downloadAll() {
  console.log('🔹 Example 1: Download all resources (English, unfoldingWord)');
  
  try {
    await downloadResources();
    console.log('✅ All resources downloaded successfully!');
  } catch (error) {
    console.error('❌ Download failed:', error);
  }
}

/**
 * Example 2: Download specific resources only
 */
async function example2_downloadSpecific() {
  console.log('🔹 Example 2: Download only ULT and UST scripture');
  
  try {
    await downloadSpecificResources(['ult-scripture', 'ust-scripture']);
    console.log('✅ Specific resources downloaded successfully!');
  } catch (error) {
    console.error('❌ Download failed:', error);
  }
}

/**
 * Example 3: Download for a different language
 */
async function example3_differentLanguage() {
  console.log('🔹 Example 3: Download Spanish resources');
  
  const config = createComprehensiveConfig(
    'git.door43.org',
    'unfoldingWord',
    'es-419' // Spanish
  );
  
  // Customize output directory
  config.outputDir = './resources-spanish';
  config.databasePath = './resources-spanish/resources.db';
  
  try {
    await downloadResources(config);
    console.log('✅ Spanish resources downloaded successfully!');
  } catch (error) {
    console.error('❌ Download failed:', error);
  }
}

/**
 * Example 4: Minimal configuration for basic translation work
 */
async function example4_minimal() {
  console.log('🔹 Example 4: Minimal download (ULT + UST only)');
  
  const config = createMinimalConfig();
  config.outputDir = './resources-minimal';
  config.databasePath = './resources-minimal/resources.db';
  
  try {
    await downloadResources(config);
    console.log('✅ Minimal resources downloaded successfully!');
  } catch (error) {
    console.error('❌ Download failed:', error);
  }
}

/**
 * Example 5: Custom configuration with specific resources
 */
async function example5_custom() {
  console.log('🔹 Example 5: Custom configuration');
  
  const downloader = new ResourceDownloader({
    server: 'git.door43.org',
    owner: 'unfoldingWord',
    language: 'en',
    outputDir: './resources-custom',
    
    resources: [
      // Only ULT Scripture
      {
        id: 'ult-scripture',
        adapterType: AdapterType.DOOR43_SCRIPTURE,
        config: {
          resourceIds: ['ult'],
          includeAlignments: true,
          includeSections: true
        }
      },
      
      // Translation Notes
      {
        id: 'tn-notes',
        adapterType: AdapterType.DOOR43_NOTES,
        config: {
          resourceId: 'tn'
        }
      },
      
      // Translation Academy (global resource)
      {
        id: 'translation-academy',
        adapterType: AdapterType.DOOR43_ACADEMY,
        config: {
          resourceId: 'ta',
          categories: ['translate', 'checking']
        }
      }
    ],
    
    // Processing options
    concurrency: 2,
    retryAttempts: 3,
    timeout: 45000,
    
    // Database options
    createDatabase: true,
    databasePath: './resources-custom/resources.db',
    
    // Logging
    verbose: true
  });
  
  try {
    await downloader.downloadAll();
    console.log('✅ Custom resources downloaded successfully!');
  } catch (error) {
    console.error('❌ Download failed:', error);
  }
}

/**
 * Example 6: Download original language resources
 */
async function example6_originalLanguages() {
  console.log('🔹 Example 6: Download original language resources');
  
  const downloader = new ResourceDownloader({
    server: 'git.door43.org',
    owner: 'unfoldingWord',
    language: 'en', // Default language for non-original resources
    outputDir: './resources-original',
    
    resources: [
      // Hebrew Bible
      {
        id: 'hebrew-bible',
        adapterType: AdapterType.DOOR43_SCRIPTURE,
        config: {
          resourceIds: ['uhb'],
          includeAlignments: true,
          includeSections: true
        },
        // Override for Hebrew
        language: 'hbo'
      },
      
      // Greek New Testament
      {
        id: 'greek-nt',
        adapterType: AdapterType.DOOR43_SCRIPTURE,
        config: {
          resourceIds: ['ugnt'],
          includeAlignments: true,
          includeSections: true
        },
        // Override for Greek
        language: 'el-x-koine'
      },
      
      // English ULT for comparison
      {
        id: 'english-ult',
        adapterType: AdapterType.DOOR43_SCRIPTURE,
        config: {
          resourceIds: ['ult'],
          includeAlignments: true,
          includeSections: true
        }
        // Uses default language (en)
      }
    ],
    
    createDatabase: true,
    databasePath: './resources-original/resources.db',
    verbose: true
  });
  
  try {
    await downloader.downloadAll();
    console.log('✅ Original language resources downloaded successfully!');
  } catch (error) {
    console.error('❌ Download failed:', error);
  }
}

/**
 * Example 7: Download single resource
 */
async function example7_singleResource() {
  console.log('🔹 Example 7: Download single resource');
  
  const downloader = new ResourceDownloader({
    server: 'git.door43.org',
    owner: 'unfoldingWord',
    language: 'en',
    outputDir: './resources-single',
    
    resources: [
      {
        id: 'translation-notes',
        adapterType: AdapterType.DOOR43_NOTES,
        config: {
          resourceId: 'tn'
        }
      }
    ],
    
    createDatabase: false, // Skip database creation
    verbose: true
  });
  
  try {
    await downloader.downloadResource('translation-notes');
    console.log('✅ Single resource downloaded successfully!');
  } catch (error) {
    console.error('❌ Download failed:', error);
  }
}

/**
 * Run all examples (commented out to avoid accidental execution)
 */
async function runAllExamples() {
  console.log('🚀 Running Door43 Resource Downloader Examples\n');
  
  // Uncomment the examples you want to run:
  
  // await example1_downloadAll();
  // console.log('\n' + '='.repeat(60) + '\n');
  
  // await example2_downloadSpecific();
  // console.log('\n' + '='.repeat(60) + '\n');
  
  // await example3_differentLanguage();
  // console.log('\n' + '='.repeat(60) + '\n');
  
  // await example4_minimal();
  // console.log('\n' + '='.repeat(60) + '\n');
  
  // await example5_custom();
  // console.log('\n' + '='.repeat(60) + '\n');
  
  // await example6_originalLanguages();
  // console.log('\n' + '='.repeat(60) + '\n');
  
  await example7_singleResource();
  
  console.log('\n✅ All examples completed!');
}

// Export examples for individual use
export {
  example1_downloadAll,
  example2_downloadSpecific,
  example3_differentLanguage,
  example4_minimal,
  example5_custom,
  example6_originalLanguages,
  example7_singleResource,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
