/**
 * Immer initialization module
 * This must be imported before any other modules that use Immer
 */
import { enableMapSet, enablePatches } from 'immer';

// Enable Immer plugins immediately
enableMapSet();
enablePatches();

console.log('🔧 Immer MapSet and Patches plugins enabled');
