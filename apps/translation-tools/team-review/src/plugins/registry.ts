/**
 * Bible Translation Toolkit - Plugin Registry
 * 
 * Creates a plugin registry with both built-in linked-panels plugins
 * and app-specific Bible translation plugins.
 */

import { PluginRegistry, createDefaultPluginRegistry } from '../libs/linked-panels';
import { wordAlignmentPlugin } from './word-alignment';

/**
 * Creates a plugin registry pre-loaded with built-in plugins and
 * Bible translation specific plugins.
 * 
 * This includes:
 * - Text messaging (from linked-panels)
 * - Word alignment highlighting (app-specific)
 * 
 * @returns A PluginRegistry instance with all relevant plugins registered
 */
export function createBibleTranslationPluginRegistry(): PluginRegistry {
  // Start with the default linked-panels plugins
  const registry = createDefaultPluginRegistry();
  
  // Add our app-specific plugins
  registry.register(wordAlignmentPlugin);
  
  return registry;
} 