#!/usr/bin/env node

/**
 * CLI Testing Tool for Book Package Service
 * Usage: npx tsx packages/services/src/lib/cli-tester.ts [command] [options]
 */

import { BookPackageService } from './book-package-service.js';
import { DEFAULT_BOOK_PACKAGE_CONFIG } from './config.js';

interface CliOptions {
  book?: string;
  language?: string;
  organization?: string;
  debug?: boolean;
  cache?: boolean;
}

class BookPackageCliTester {
  private service: BookPackageService;

  constructor(options: CliOptions = {}) {
    this.service = new BookPackageService(DEFAULT_BOOK_PACKAGE_CONFIG, {
      debug: options.debug || true,
      timeout: 30000,
      maxRetries: 3,
    });
  }

  async testBookPackage(options: CliOptions): Promise<void> {
    const book = options.book || 'GEN';
    const language = options.language || 'en';
    const organization = options.organization || 'unfoldingWord';

    console.log(`\n🧪 Testing Book Package Fetch`);
    console.log(`📖 Book: ${book}`);
    console.log(`🌍 Language: ${language}`);
    console.log(`🏢 Organization: ${organization}\n`);

    try {
      const result = await this.service.fetchBookPackage({
        book,
        language,
        organization,
      });

      if (result.success && result.data) {
        console.log(`✅ SUCCESS! Book package fetched from ${result.source}`);
        console.log(`📊 Package Summary:`);
        console.log(
          `   📖 Literal Text: ${result.data.literalText ? '✅' : '❌'}`
        );
        console.log(
          `   📝 Simplified Text: ${result.data.simplifiedText ? '✅' : '❌'}`
        );
        console.log(
          `   📝 Translation Notes: ${
            result.data.translationNotes ? '✅' : '❌'
          }`
        );
        console.log(
          `   🔗 Translation Words Links: ${
            result.data.translationWordsLinks ? '✅' : '❌'
          }`
        );
        console.log(
          `   ❓ Translation Questions: ${
            result.data.translationQuestions ? '✅' : '❌'
          }`
        );
        console.log(
          `   📂 Repositories: ${Object.keys(result.data.repositories).length}`
        );
        console.log(`   ⏰ Fetched: ${result.data.fetchedAt.toISOString()}`);

        if (result.data.literalText) {
          console.log(`\n📖 Literal Text Preview:`);
          console.log(`   Source: ${result.data.literalText.source}`);
          console.log(
            `   Content Length: ${result.data.literalText.content.length} chars`
          );
          console.log(
            `   Preview: ${result.data.literalText.content.substring(
              0,
              200
            )}...`
          );
        }

        if (result.data.simplifiedText) {
          console.log(`\n📝 Simplified Text Preview:`);
          console.log(`   Source: ${result.data.simplifiedText.source}`);
          console.log(
            `   Content Length: ${result.data.simplifiedText.content.length} chars`
          );
          console.log(
            `   Preview: ${result.data.simplifiedText.content.substring(
              0,
              200
            )}...`
          );
        }
      } else {
        console.log(`❌ FAILED: ${result.error}`);
      }
    } catch (error) {
      console.error(`💥 ERROR: ${error}`);
    }
  }

  async testCacheStats(): Promise<void> {
    console.log(`\n📊 Cache Statistics:`);
    const stats = this.service.getCacheStats();
    console.log(`   📂 Repositories: ${stats.repositories}`);
    console.log(`   📋 Manifests: ${stats.manifests}`);
    console.log(`   📦 Book Packages: ${stats.bookPackages}`);
    console.log(`   📚 On-Demand Resources: ${stats.onDemandResources}`);
  }

  async testMultipleBooks(): Promise<void> {
    const testBooks = ['GEN', 'JON', 'PHM', 'MAT', 'REV'];

    console.log(`\n🧪 Testing Multiple Books: ${testBooks.join(', ')}\n`);

    for (const book of testBooks) {
      console.log(`\n--- Testing ${book} ---`);

      const startTime = Date.now();
      const result = await this.service.fetchBookPackage({
        book,
        language: 'en',
        organization: 'unfoldingWord',
      });
      const duration = Date.now() - startTime;

      if (result.success && result.data) {
        const hasLiteral = !!result.data.literalText;
        const hasSimplified = !!result.data.simplifiedText;
        const hasNotes = !!result.data.translationNotes;

        console.log(
          `✅ ${book}: ${duration}ms (${result.source}) - ULT:${
            hasLiteral ? '✅' : '❌'
          } UST:${hasSimplified ? '✅' : '❌'} TN:${hasNotes ? '✅' : '❌'}`
        );
      } else {
        console.log(`❌ ${book}: ${duration}ms - FAILED: ${result.error}`);
      }
    }
  }

  async clearCache(): Promise<void> {
    console.log(`\n🧹 Clearing cache...`);
    this.service.clearCache();
    console.log(`✅ Cache cleared`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';

  const options: CliOptions = {
    debug: args.includes('--debug') || args.includes('-d'),
    cache: args.includes('--cache') || args.includes('-c'),
  };

  // Parse named arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '--book' || arg === '-b') {
      options.book = nextArg;
      i++;
    } else if (arg === '--language' || arg === '-l') {
      options.language = nextArg;
      i++;
    } else if (arg === '--organization' || arg === '-o') {
      options.organization = nextArg;
      i++;
    }
  }

  const tester = new BookPackageCliTester(options);

  try {
    switch (command) {
      case 'test':
        await tester.testBookPackage(options);
        break;

      case 'multiple':
        await tester.testMultipleBooks();
        break;

      case 'cache':
        await tester.testCacheStats();
        break;

      case 'clear':
        await tester.clearCache();
        break;

      case 'help':
      default:
        console.log(`
📦 Book Package Service CLI Tester

Usage:
  npx tsx packages/services/src/lib/cli-tester.ts [command] [options]

Commands:
  test      Test fetching a single book package (default)
  multiple  Test fetching multiple books
  cache     Show cache statistics
  clear     Clear all caches
  help      Show this help

Options:
  -b, --book <book>           Book to test (default: GEN)
  -l, --language <lang>       Language code (default: en)
  -o, --organization <org>    Organization (default: unfoldingWord)
  -d, --debug                 Enable debug logging
  -c, --cache                 Show cache stats after operation

Examples:
  npx tsx packages/services/src/lib/cli-tester.ts test --book JON --debug
  npx tsx packages/services/src/lib/cli-tester.ts multiple
  npx tsx packages/services/src/lib/cli-tester.ts cache
        `);
        break;
    }

    if (options.cache) {
      await tester.testCacheStats();
    }
  } catch (error) {
    console.error(`💥 CLI Error: ${error}`);
    process.exit(1);
  }
}

// Run if called directly
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1]) ||
  process.argv[1].endsWith('cli-tester.ts');

if (isMainModule) {
  main().catch(console.error);
}

export { BookPackageCliTester };
