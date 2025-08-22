// Scripture Module
export { default as ScriptureRenderer } from './scripture/ScriptureRenderer';
export type { 
  ScriptureRendererProps, 
  ScriptureWord, 
  ScriptureVerse, 
  AlignedWord 
} from './scripture/ScriptureRenderer';

// Navigation Module  
export { default as ScriptureNavigator } from './navigation/ScriptureNavigator';
export type { ScriptureReference, NavigationItem, ScriptureNavigatorProps } from './navigation/ScriptureNavigator';

// Translation Notes Module
export { default as TranslationNotesRenderer } from './notes/TranslationNotesRenderer';
export type { TranslationNote, TranslationNotesRendererProps } from './notes/TranslationNotesRenderer';

// Re-export types from bt-toolkit packages for convenience
export type { ProcessedScripture } from '@bt-toolkit/usfm-processor';
