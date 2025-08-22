#!/usr/bin/env node

/**
 * Door43 API Resource Fetcher
 * Fetches sample translation helps resources for testing
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DOOR43_API_BASE = 'https://git.door43.org/api/v1';
const DOOR43_RAW_BASE = 'https://git.door43.org';

// Sample resources to fetch
const SAMPLE_RESOURCES = [
  // Bible Text Resources
  {
    owner: 'unfoldingWord',
    repo: 'en_ult',
    type: 'Literal Translation',
    files: ['32-JON.usfm', '57-PHM.usfm'], // Small books for testing
    outputDir: 'bible-text/ult'
  },
  {
    owner: 'unfoldingWord',
    repo: 'en_ust',
    type: 'Simplified Translation',
    files: ['32-JON.usfm', '57-PHM.usfm'],
    outputDir: 'bible-text/ust'
  },
  // Translation Helps Resources
  {
    owner: 'unfoldingWord',
    repo: 'en_tn',
    type: 'Translation Notes',
    files: ['tn_JON.tsv', 'tn_PHM.tsv'],
    outputDir: 'translation-notes'
  },
  {
    owner: 'unfoldingWord', 
    repo: 'en_tw',
    type: 'Translation Words',
    files: ['bible/kt/god.md', 'bible/kt/love.md', 'bible/names/jonah.md', 'bible/kt/mercy.md', 'bible/kt/grace.md'],
    outputDir: 'translation-words',
    preserveStructure: true
  },
  {
    owner: 'unfoldingWord',
    repo: 'en_tq', 
    type: 'Translation Questions',
    files: ['tq_JON.tsv', 'tq_PHM.tsv'],
    outputDir: 'translation-questions'
  },
  {
    owner: 'unfoldingWord',
    repo: 'en_twl',
    type: 'Translation Words Links', 
    files: ['twl_JON.tsv', 'twl_PHM.tsv'],
    outputDir: 'translation-words-links'
  },
  // Translation Academy Resources
  {
    owner: 'unfoldingWord',
    repo: 'en_ta',
    type: 'Translation Academy',
    files: [
      'translate/figs-metaphor/title.md',
      'translate/figs-metaphor/sub-title.md',
      'translate/figs-metaphor/01.md',
      'translate/translate-names/title.md',
      'translate/translate-names/sub-title.md',
      'translate/translate-names/01.md',
      'translate/writing-newevent/title.md',
      'translate/writing-newevent/sub-title.md',
      'translate/writing-newevent/01.md',
      'translate/grammar-connect-logic-result/title.md',
      'translate/grammar-connect-logic-result/sub-title.md',
      'translate/grammar-connect-logic-result/01.md',
      'translate/figs-explicit/title.md',
      'translate/figs-explicit/sub-title.md',
      'translate/figs-explicit/01.md',
      'translate/figs-idiom/title.md',
      'translate/figs-idiom/sub-title.md',
      'translate/figs-idiom/01.md'
    ],
    outputDir: 'translation-academy',
    preserveStructure: true
  }
];

/**
 * Make HTTP GET request
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch repository manifest
 */
async function fetchManifest(owner, repo) {
  const url = `${DOOR43_API_BASE}/repos/${owner}/${repo}/contents/manifest.yaml`;
  console.log(`📋 Fetching manifest: ${owner}/${repo}`);
  
  try {
    const response = await httpsGet(url);
    const data = JSON.parse(response);
    
    if (data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf8');
    }
    return data.content;
  } catch (error) {
    console.warn(`⚠️  Could not fetch manifest for ${owner}/${repo}:`, error.message);
    return null;
  }
}

/**
 * Fetch file content using raw URL
 */
async function fetchFileContent(owner, repo, filePath, branch = 'master') {
  const url = `${DOOR43_RAW_BASE}/${owner}/${repo}/raw/branch/${branch}/${filePath}`;
  console.log(`📄 Fetching: ${filePath}`);
  
  try {
    return await httpsGet(url);
  } catch (error) {
    console.warn(`⚠️  Could not fetch ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Save content to file
 */
function saveFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Saved: ${filePath}`);
}

/**
 * Fetch all sample resources
 */
async function fetchSampleResources() {
  const outputBaseDir = path.join(__dirname, '..', 'src', 'data', 'sample-resources');
  
  console.log('🚀 Starting Door43 API resource fetch...\n');
  
  for (const resource of SAMPLE_RESOURCES) {
    console.log(`\n📦 Processing ${resource.type}: ${resource.owner}/${resource.repo}`);
    
    const resourceDir = path.join(outputBaseDir, resource.outputDir);
    ensureDir(resourceDir);
    
    // Fetch manifest
    const manifest = await fetchManifest(resource.owner, resource.repo);
    if (manifest) {
      saveFile(path.join(resourceDir, 'manifest.yaml'), manifest);
    }
    
    // Fetch sample files
    for (const filePath of resource.files) {
      const content = await fetchFileContent(resource.owner, resource.repo, filePath);
      if (content) {
        let outputPath;
        
        // Handle directory structure preservation
        if (resource.preserveStructure) {
          // Preserve the full directory structure
          outputPath = path.join(resourceDir, filePath);
          
          // Ensure directory exists
          const dir = path.dirname(outputPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        } else {
          // Flat structure - just use filename
          const fileName = path.basename(filePath);
          outputPath = path.join(resourceDir, fileName);
        }
        
        saveFile(outputPath, content);
      }
      
      // Add small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Create index file with resource information
  const indexContent = {
    fetchedAt: new Date().toISOString(),
    resources: SAMPLE_RESOURCES.map(r => ({
      type: r.type,
      owner: r.owner,
      repo: r.repo,
      outputDir: r.outputDir,
      files: r.files
    }))
  };
  
  saveFile(
    path.join(outputBaseDir, 'index.json'), 
    JSON.stringify(indexContent, null, 2)
  );
  
  console.log('\n🎉 Sample resources fetch completed!');
  console.log(`📁 Resources saved to: ${outputBaseDir}`);
}

/**
 * Main execution
 */
if (require.main === module) {
  fetchSampleResources().catch(error => {
    console.error('❌ Error fetching resources:', error);
    process.exit(1);
  });
}

module.exports = { fetchSampleResources, fetchFileContent, fetchManifest };
