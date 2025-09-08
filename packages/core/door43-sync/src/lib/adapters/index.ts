/**
 * Format Adapters Index
 * Exports all format adapters and provides registration utilities
 */

// Export adapter implementations
export { UsfmFormatAdapter, createUsfmAdapter } from './usfm-adapter.js';
export { TsvFormatAdapter, createTsvAdapter } from './tsv-adapter.js';
export { MarkdownFormatAdapter, createMarkdownAdapter } from './markdown-adapter.js';

// Export resource-specific adapters
export { TsvTranslationNotesAdapter, createTsvTranslationNotesAdapter } from './tsv-translation-notes-adapter.js';
export { TsvTranslationWordsAdapter, createTsvTranslationWordsAdapter } from './tsv-translation-words-adapter.js';

// Export adapter types
export type { UsfmBookJson, UsfmChapter, UsfmVerse } from './usfm-adapter.js';
export type { TsvDataJson, TsvRow } from './tsv-adapter.js';
export type { MarkdownDocumentJson, MarkdownSection, MarkdownMetadata } from './markdown-adapter.js';

// Export resource-specific types
export type { TranslationNotesJson, TranslationNotesRow } from './tsv-translation-notes-adapter.js';
export type { TranslationWordsJson, TranslationWordsRow } from './tsv-translation-words-adapter.js';

// Re-export format adapter system
export * from '../format-adapter-system.js';

import { 
  FormatAdapterRegistry,
  globalFormatAdapterRegistry 
} from '../format-adapter-system.js';
import { createUsfmAdapter } from './usfm-adapter.js';
import { createTsvAdapter } from './tsv-adapter.js';
import { createMarkdownAdapter } from './markdown-adapter.js';
import { createTsvTranslationNotesAdapter } from './tsv-translation-notes-adapter.js';
import { createTsvTranslationWordsAdapter } from './tsv-translation-words-adapter.js';

// ============================================================================
// Adapter Registration
// ============================================================================

/**
 * Register all built-in format adapters
 */
export function registerBuiltInAdapters(registry?: FormatAdapterRegistry): void {
  const targetRegistry = registry || globalFormatAdapterRegistry;
  
  console.log('📝 Registering built-in format adapters...');
  
  // Register USFM adapter
  targetRegistry.register(
    'usfm-adapter',
    createUsfmAdapter,
    ['usfm'],
    100 // High priority
  );
  
  // Register resource-specific TSV adapters (higher priority)
  targetRegistry.register(
    'tsv-translation-notes-adapter',
    createTsvTranslationNotesAdapter,
    ['tsv'],
    200 // Higher priority than generic TSV
  );
  
  targetRegistry.register(
    'tsv-translation-words-adapter',
    createTsvTranslationWordsAdapter,
    ['tsv'],
    200 // Higher priority than generic TSV
  );
  
  // Register generic TSV adapter (lower priority)
  targetRegistry.register(
    'tsv-adapter',
    createTsvAdapter,
    ['tsv'],
    50 // Lower priority - fallback for unknown TSV types
  );
  
  // Register Markdown adapter
  targetRegistry.register(
    'markdown-adapter',
    createMarkdownAdapter,
    ['md', 'markdown'],
    100 // High priority
  );
  
  console.log('✅ Built-in format adapters registered');
}

/**
 * Register adapters with custom configuration
 */
export function registerAdaptersWithConfig(
  registry: FormatAdapterRegistry,
  config: {
    usfm?: Record<string, any>;
    tsv?: Record<string, any>;
    markdown?: Record<string, any>;
  }
): void {
  console.log('📝 Registering format adapters with custom configuration...');
  
  // Register USFM adapter with config
  if (config.usfm !== undefined) {
    registry.register(
      'usfm-adapter',
      (cfg) => createUsfmAdapter({ ...config.usfm, ...cfg }),
      ['usfm'],
      100,
      config.usfm
    );
  }
  
  // Register TSV adapter with config
  if (config.tsv !== undefined) {
    registry.register(
      'tsv-adapter',
      (cfg) => createTsvAdapter({ ...config.tsv, ...cfg }),
      ['tsv'],
      100,
      config.tsv
    );
  }
  
  // Register Markdown adapter with config
  if (config.markdown !== undefined) {
    registry.register(
      'markdown-adapter',
      (cfg) => createMarkdownAdapter({ ...config.markdown, ...cfg }),
      ['md', 'markdown'],
      100,
      config.markdown
    );
  }
  
  console.log('✅ Format adapters registered with custom configuration');
}

/**
 * Create a registry with all built-in adapters
 */
export function createRegistryWithBuiltInAdapters(): FormatAdapterRegistry {
  const registry = new FormatAdapterRegistry();
  registerBuiltInAdapters(registry);
  return registry;
}

// ============================================================================
// Adapter Utilities
// ============================================================================

/**
 * Get adapter information
 */
export function getAdapterInfo() {
  return {
    builtInAdapters: [
      {
        id: 'usfm-adapter',
        formats: ['usfm'],
        description: 'USFM to JSON round-trip converter',
        version: '1.0.0'
      },
      {
        id: 'tsv-adapter',
        formats: ['tsv'],
        description: 'TSV to JSON round-trip converter',
        version: '1.0.0'
      },
      {
        id: 'markdown-adapter',
        formats: ['md', 'markdown'],
        description: 'Markdown to JSON round-trip converter',
        version: '1.0.0'
      }
    ],
    totalAdapters: 3,
    supportedFormats: ['usfm', 'tsv', 'md', 'markdown']
  };
}

/**
 * Validate adapter compatibility
 */
export function validateAdapterCompatibility(
  sourceFormat: string,
  targetFormat: string,
  registry?: FormatAdapterRegistry
): boolean {
  const targetRegistry = registry || globalFormatAdapterRegistry;
  
  const context = {
    sourceFormat,
    targetFormat,
    resourceType: 'unknown'
  };
  
  const adapter = targetRegistry.findAdapter(context);
  return adapter !== null;
}

// ============================================================================
// Auto-registration
// ============================================================================

// Auto-register built-in adapters on module load
registerBuiltInAdapters();
