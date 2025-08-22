/**
 * @qa-app/usfm-processor
 * 
 * A comprehensive TypeScript library for processing USFM (Unified Standard Format Markers) files
 * into structured data for Bible applications.
 * 
 * Features:
 * - USFM to JSON conversion
 * - Text extraction and cleaning
 * - Paragraph and section detection
 * - Word alignment processing
 * - Comprehensive TypeScript types
 * - Utility functions for scripture manipulation
 */

// Main processor class
export { USFMProcessor } from './processors/USFMProcessor.js';

// Type definitions
export type {
  // Raw USFM types
  USFMDocument,
  USFMChapter,
  USFMVerse,
  USFMVerseObject,
  USFMTextObject,
  USFMWordObject,
  USFMAlignmentObject,
  USFMParagraphObject,
  USFMHeader,
  
  // Processed types
  ProcessedScripture,
  ProcessedChapter,
  ProcessedVerse,
  ProcessedParagraph,
  TranslationSection,
  WordAlignment,
  ProcessingResult,
  ProcessingMetadata,
  
  // Utility types
  ScriptureReference,
  SectionReference,
  NavigationTarget,
  VerseWithSection
} from './types/usfm.js';

// Utility functions
export {
  getVerse,
  getVerseRange,
  formatVerses,
  parseScriptureReference,
  getVersesByReference,
  searchScripture,
  getChapterSummary,
  getBookStatistics
} from './utils/scriptureUtils.js';

// Create a default processor instance for convenience
import { USFMProcessor } from './processors/USFMProcessor.js';

const defaultProcessor = new USFMProcessor();

/**
 * Convenience function to process USFM content with full features
 */
export const processUSFM = (usfmContent: string, bookCode: string, bookName: string) =>
  defaultProcessor.processUSFM(usfmContent, bookCode, bookName);

/**
 * Convenience function for simple USFM processing
 */
export const processUSFMSimple = (usfmContent: string, bookName?: string) =>
  defaultProcessor.processUSFMSimple(usfmContent, bookName);

// Export the default processor instance
export { defaultProcessor as processor };

// Version information
export const version = '1.0.0';
export const name = '@qa-app/usfm-processor';
