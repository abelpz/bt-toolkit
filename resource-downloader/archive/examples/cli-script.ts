#!/usr/bin/env node

/**
 * CLI Script for Door43 Resource Downloader
 * 
 * Provides command-line interface for downloading resources.
 * 
 * Usage:
 *   npx ts-node cli-script.ts --help
 *   npx ts-node cli-script.ts --language es-419 --owner unfoldingWord
 *   npx ts-node cli-script.ts --resources ult-scripture,tn-notes --minimal
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  downloadResources, 
  downloadSpecificResources,
  createMinimalConfig,
  createComprehensiveConfig,
  ResourceDownloader,
  AdapterType,
  ResourceDownloadConfig
} from '../index';

interface CLIOptions {
  server?: string;
  owner?: string;
  language?: string;
  output?: string;
  resources?: string[];
  minimal?: boolean;
  comprehensive?: boolean;
  database?: boolean;
  databasePath?: string;
  concurrency?: number;
  timeout?: number;
  verbose?: boolean;
  help?: boolean;
  config?: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--server':
      case '-s':
        options.server = nextArg;
        i++;
        break;
      case '--owner':
      case '-o':
        options.owner = nextArg;
        i++;
        break;
      case '--language':
      case '-l':
        options.language = nextArg;
        i++;
        break;
      case '--output':
      case '--out':
        options.output = nextArg;
        i++;
        break;
      case '--resources':
      case '-r':
        options.resources = nextArg?.split(',').map(r => r.trim());
        i++;
        break;
      case '--minimal':
      case '-m':
        options.minimal = true;
        break;
      case '--comprehensive':
      case '-c':
        options.comprehensive = true;
        break;
      case '--no-database':
        options.database = false;
        break;
      case '--database':
      case '--db':
        options.database = true;
        break;
      case '--database-path':
      case '--db-path':
        options.databasePath = nextArg;
        i++;
        break;
      case '--concurrency':
        options.concurrency = parseInt(nextArg, 10);
        i++;
        break;
      case '--timeout':
        options.timeout = parseInt(nextArg, 10);
        i++;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--quiet':
      case '-q':
        options.verbose = false;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--config':
        options.config = nextArg;
        i++;
        break;
      default:
        if (arg.startsWith('--')) {
          console.warn(`Unknown option: ${arg}`);
        }
    }
  }
  
  return options;
}

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
Door43 Resource Downloader CLI

USAGE:
  npx ts-node cli-script.ts [OPTIONS]

OPTIONS:
  -s, --server <server>           Door43 server (default: git.door43.org)
  -o, --owner <owner>             Repository owner (default: unfoldingWord)
  -l, --language <language>       Language code (default: en)
      --output <path>             Output directory (default: ./resources)
  -r, --resources <list>          Comma-separated list of resource IDs
  -m, --minimal                   Use minimal configuration (ULT + UST only)
  -c, --comprehensive             Use comprehensive configuration (all resources)
      --database                  Create SQLite database (default: true)
      --no-database               Skip database creation
      --database-path <path>      Custom database path
      --concurrency <num>         Number of concurrent downloads (default: 3)
      --timeout <ms>              Request timeout in milliseconds (default: 30000)
  -v, --verbose                   Enable verbose logging (default: true)
  -q, --quiet                     Disable verbose logging
      --config <path>             Load configuration from JSON file
  -h, --help                      Show this help message

EXAMPLES:
  # Download all resources for English
  npx ts-node cli-script.ts

  # Download Spanish resources
  npx ts-node cli-script.ts --language es-419

  # Download only ULT and Translation Notes
  npx ts-node cli-script.ts --resources ult-scripture,tn-notes

  # Minimal configuration
  npx ts-node cli-script.ts --minimal

  # Custom output directory without database
  npx ts-node cli-script.ts --output ./my-resources --no-database

  # Load configuration from file
  npx ts-node cli-script.ts --config ./my-config.json

RESOURCE IDs:
  ult-scripture                   ULT Scripture (with GLT, ULB fallback)
  ust-scripture                   UST Scripture (with GST fallback)
  tn-notes                        Translation Notes
  tq-questions                    Translation Questions
  twl-links                       Translation Words Links
  hebrew-bible-global             Hebrew Bible (UHB)
  greek-nt-global                 Greek New Testament (UGNT)
  translation-academy-global      Translation Academy
  translation-words-global        Translation Words

CONFIGURATION FILE FORMAT:
  {
    "server": "git.door43.org",
    "owner": "unfoldingWord",
    "language": "en",
    "outputDir": "./resources",
    "resources": [
      {
        "id": "ult-scripture",
        "adapterType": "door43-scripture",
        "config": {
          "resourceIds": ["ult", "glt", "ulb"],
          "includeAlignments": true,
          "includeSections": true
        }
      }
    ],
    "concurrency": 3,
    "createDatabase": true,
    "databasePath": "./resources/resources.db",
    "verbose": true
  }
`);
}

/**
 * Load configuration from JSON file
 */
async function loadConfigFile(configPath: string): Promise<Partial<ResourceDownloadConfig>> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    
    console.log(`📄 Loaded configuration from: ${configPath}`);
    return config;
  } catch (error) {
    console.error(`❌ Failed to load configuration file: ${configPath}`);
    console.error(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

/**
 * Create configuration from CLI options
 */
async function createConfigFromOptions(options: CLIOptions): Promise<ResourceDownloadConfig> {
  let config: ResourceDownloadConfig;
  
  // Load from config file if specified
  if (options.config) {
    const fileConfig = await loadConfigFile(options.config);
    config = {
      server: 'git.door43.org',
      owner: 'unfoldingWord',
      language: 'en',
      outputDir: './resources',
      resources: [],
      ...fileConfig
    } as ResourceDownloadConfig;
  }
  // Use preset configurations
  else if (options.minimal) {
    config = createMinimalConfig(
      options.server || 'git.door43.org',
      options.owner || 'unfoldingWord',
      options.language || 'en'
    );
  } else if (options.comprehensive) {
    config = createComprehensiveConfig(
      options.server || 'git.door43.org',
      options.owner || 'unfoldingWord',
      options.language || 'en'
    );
  }
  // Use default configuration
  else {
    config = createComprehensiveConfig(
      options.server || 'git.door43.org',
      options.owner || 'unfoldingWord',
      options.language || 'en'
    );
  }
  
  // Apply CLI overrides
  if (options.output) {
    config.outputDir = options.output;
  }
  
  if (options.database !== undefined) {
    config.createDatabase = options.database;
  }
  
  if (options.databasePath) {
    config.databasePath = options.databasePath;
  } else if (config.outputDir) {
    config.databasePath = path.join(config.outputDir, 'resources.db');
  }
  
  if (options.concurrency) {
    config.concurrency = options.concurrency;
  }
  
  if (options.timeout) {
    config.timeout = options.timeout;
  }
  
  if (options.verbose !== undefined) {
    config.verbose = options.verbose;
  }
  
  return config;
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  const options = parseArgs();
  
  // Show help
  if (options.help) {
    showHelp();
    return;
  }
  
  try {
    // Create configuration
    const config = await createConfigFromOptions(options);
    
    // Show configuration summary
    console.log('🔧 Configuration:');
    console.log(`  Server: ${config.server}`);
    console.log(`  Owner: ${config.owner}`);
    console.log(`  Language: ${config.language}`);
    console.log(`  Output: ${config.outputDir}`);
    console.log(`  Database: ${config.createDatabase ? config.databasePath : 'disabled'}`);
    console.log(`  Resources: ${config.resources.length} configured`);
    console.log(`  Concurrency: ${config.concurrency}`);
    console.log('');
    
    // Download specific resources or all
    if (options.resources && options.resources.length > 0) {
      console.log(`🎯 Downloading specific resources: ${options.resources.join(', ')}`);
      await downloadSpecificResources(options.resources, config);
    } else {
      console.log('📥 Downloading all configured resources');
      await downloadResources(config);
    }
    
    console.log('✅ Download completed successfully!');
    
  } catch (error) {
    console.error('❌ Download failed:');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    
    if (options.verbose && error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

/**
 * Generate example configuration file
 */
async function generateExampleConfig(): Promise<void> {
  const exampleConfig = {
    server: 'git.door43.org',
    owner: 'unfoldingWord',
    language: 'en',
    outputDir: './resources',
    resources: [
      {
        id: 'ult-scripture',
        adapterType: 'door43-scripture',
        config: {
          resourceIds: ['ult', 'glt', 'ulb'],
          includeAlignments: true,
          includeSections: true,
          usfmVersion: '3.0'
        }
      },
      {
        id: 'tn-notes',
        adapterType: 'door43-notes',
        config: {
          resourceId: 'tn',
          markdownProcessor: 'basic'
        }
      }
    ],
    concurrency: 3,
    retryAttempts: 3,
    timeout: 30000,
    createDatabase: true,
    databasePath: './resources/resources.db',
    verbose: true
  };
  
  const configPath = './example-config.json';
  await fs.writeFile(configPath, JSON.stringify(exampleConfig, null, 2), 'utf-8');
  
  console.log(`📄 Example configuration saved to: ${configPath}`);
  console.log('Edit this file and use it with: --config ./example-config.json');
}

// Handle special commands
if (process.argv.includes('--generate-config')) {
  generateExampleConfig().catch(console.error);
} else {
  // Run main CLI
  main().catch(console.error);
}

export { main, parseArgs, showHelp, loadConfigFile, createConfigFromOptions };
