/**
 * Adapter Factory
 * 
 * Creates and configures resource adapters based on type and configuration.
 * Handles the creation of reusable adapters like Door43ScriptureAdapter.
 */

import { 
  AdapterType, 
  AdapterConfiguration, 
  ScriptureAdapterConfig,
  NotesAdapterConfig,
  AcademyAdapterConfig,
  TranslationWordsAdapterConfig,
  TranslationWordsLinksAdapterConfig,
  CustomAdapterConfig,
  AdapterFactory as IAdapterFactory
} from '../../types/resource-config';
import { ResourceAdapter, ResourceType } from '../../types/context';

// Import adapter classes (these would be the actual implementations)
import { Door43ScriptureAdapter, Door43ScriptureConfig } from '../adapters/Door43ScriptureAdapter';
import { Door43ULTAdapter } from '../adapters/Door43ULTAdapter';
import { Door43USTAdapter } from '../adapters/Door43USTAdapter';
import { Door43OriginalAdapter } from '../adapters/Door43OriginalAdapter';
import { Door43NotesAdapter, Door43NotesConfig } from '../adapters/Door43NotesAdapter';
import { Door43QuestionsAdapter, Door43QuestionsConfig } from '../adapters/Door43QuestionsAdapter';
import { Door43AcademyAdapter } from '../adapters/Door43AcademyAdapter';
import { Door43TranslationWordsAdapter } from '../adapters/Door43TranslationWordsAdapter';
import { Door43TranslationWordsLinksAdapter } from '../adapters/Door43TranslationWordsLinksAdapter';

export class AdapterFactory implements IAdapterFactory {
  
  /**
   * Create a configured adapter instance
   */
  createAdapter(
    type: AdapterType, 
    config: AdapterConfiguration,
    resourceType: ResourceType
  ): ResourceAdapter {
    
    switch (type) {
      case AdapterType.DOOR43_SCRIPTURE:
        return this.createScriptureAdapter(config as ScriptureAdapterConfig, resourceType);
        
      case AdapterType.DOOR43_NOTES:
        return this.createNotesAdapter(config as NotesAdapterConfig);
        
      case AdapterType.DOOR43_WORDS:
        return this.createWordsAdapter(config as TranslationWordsAdapterConfig);
        
      case AdapterType.DOOR43_WORDS_LINKS:
        return this.createWordsLinksAdapter(config as TranslationWordsLinksAdapterConfig);
        
      case AdapterType.DOOR43_ACADEMY:
        return this.createAcademyAdapter(config as AcademyAdapterConfig);
        
      case AdapterType.DOOR43_QUESTIONS:
        return this.createQuestionsAdapter(config as NotesAdapterConfig);
        
      case AdapterType.DOOR43_AUDIO:
        return this.createAudioAdapter(config as NotesAdapterConfig);
        
      case AdapterType.DOOR43_VIDEO:
        return this.createVideoAdapter(config as NotesAdapterConfig);
        
      case AdapterType.CUSTOM:
        return this.createCustomAdapter(config as CustomAdapterConfig);
        
      default:
        throw new Error(`Unknown adapter type: ${type}`);
    }
  }

  // ============================================================================
  // ADAPTER CREATION METHODS
  // ============================================================================

  private createScriptureAdapter(
    config: ScriptureAdapterConfig, 
    resourceType: ResourceType
  ): ResourceAdapter {
    
    const primaryResourceId = config.resourceIds[0];
    
    console.log(`🔧 Creating specialized scripture adapter for primary resource: ${primaryResourceId}`);
    
    // Create specialized adapters based on the primary resource ID
    switch (primaryResourceId) {
      case 'ult': {
        console.log(`🔧 Creating Door43ULTAdapter`);
        return new Door43ULTAdapter();
      }
        
      case 'ust': {
        console.log(`🔧 Creating Door43USTAdapter`);
        return new Door43USTAdapter();
      }
        
      case 'uhb': {
        console.log(`🔧 Creating Door43OriginalAdapter for Hebrew Bible`);
        return new Door43OriginalAdapter('uhb');
      }
        
      case 'ugnt': {
        console.log(`🔧 Creating Door43OriginalAdapter for Greek New Testament`);
        return new Door43OriginalAdapter('ugnt');
      }
        
      default: {
        // Fallback to generic adapter for other resource types
        console.log(`🔧 Creating generic Door43ScriptureAdapter for ${primaryResourceId}`);
        const scriptureConfig: Door43ScriptureConfig = {
          resourceIds: config.resourceIds,
          serverId: config.server || 'git.door43.org',
          includeAlignments: config.includeAlignments ?? true,
          includeSections: config.includeSections ?? true,
          usfmVersion: config.usfmVersion || '3.0',
          timeout: config.timeout || 30000,
          retryAttempts: config.retryAttempts || 3,
          retryDelay: config.retryDelay || 1000,
          validateContent: config.validateContent ?? true
        };
        
        const adapter = new Door43ScriptureAdapter(scriptureConfig);
        adapter.resourceType = resourceType;
        return adapter;
      }
    }
  }

  private createNotesAdapter(config: NotesAdapterConfig): ResourceAdapter {
    const notesConfig: Door43NotesConfig = {
      // Resource configuration
      resourceId: config.resourceId,
      
      // Server configuration
      server: config.server || 'git.door43.org',
      
      // Processing options
      markdownProcessor: config.markdownProcessor || 'basic',
      
      // Base configuration
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      validateContent: config.validateContent ?? true
    };
    
    console.log(`🔧 Creating Door43NotesAdapter with resourceId: ${config.resourceId}`);
    
    const adapter = new Door43NotesAdapter(notesConfig);
    
    return adapter;
  }

  private createWordsAdapter(config: TranslationWordsAdapterConfig): ResourceAdapter {
    console.log(`🔧 Creating Door43TranslationWordsAdapter with resourceId: ${config.resourceId}`);
    
    const adapter = new Door43TranslationWordsAdapter(
      config.server || 'git.door43.org',
      config.resourceId
    );
    
    return adapter;
  }

  private createWordsLinksAdapter(config: TranslationWordsLinksAdapterConfig): ResourceAdapter {
    console.log(`🔧 Creating Door43TranslationWordsLinksAdapter with resourceId: ${config.resourceId}`);
    
    const linksConfig = {
      resourceId: config.resourceId,
      serverId: config.server || 'git.door43.org',
      timeout: config.timeout,
      retryAttempts: config.retryAttempts,
      retryDelay: config.retryDelay,
      validateContent: config.validateContent
    };
    
    const adapter = new Door43TranslationWordsLinksAdapter(linksConfig);
    
    return adapter;
  }

  private createAcademyAdapter(config: AcademyAdapterConfig): ResourceAdapter {
    console.log(`🔧 Creating Door43AcademyAdapter with resourceId: ${config.resourceId}`);
    
    const adapter = new Door43AcademyAdapter(
      config.server || 'git.door43.org',
      config.resourceId
    );
    
    return adapter;
  }

  private createQuestionsAdapter(config: NotesAdapterConfig): ResourceAdapter {
    console.log(`🔧 Creating Door43QuestionsAdapter with config:`, config);
    
    // Convert NotesAdapterConfig to Door43QuestionsConfig
    const questionsConfig: Door43QuestionsConfig = {
      resourceId: config.resourceId,
      serverId: config.serverId,
      timeout: config.timeout,
      retryAttempts: config.retryAttempts,
      retryDelay: config.retryDelay,
      validateContent: config.validateContent
    };
    
    const adapter = new Door43QuestionsAdapter(questionsConfig);
    console.log(`✅ Created Door43QuestionsAdapter: ${adapter.resourceId}`);
    
    return adapter;
  }

  private createAudioAdapter(config: NotesAdapterConfig): ResourceAdapter {
    // Placeholder for audio adapter - would need actual implementation
    throw new Error('Audio adapter not yet implemented');
  }

  private createVideoAdapter(config: NotesAdapterConfig): ResourceAdapter {
    // Placeholder for video adapter - would need actual implementation  
    throw new Error('Video adapter not yet implemented');
  }

  private createCustomAdapter(config: CustomAdapterConfig): ResourceAdapter {
    // Dynamic adapter loading - would need actual implementation
    throw new Error('Custom adapter loading not yet implemented');
  }
}

// ============================================================================
// ADAPTER CONFIGURATION INTERFACES
// ============================================================================

/**
 * Configuration interface for Door43ScriptureAdapter
 */
export interface Door43ScriptureAdapterConfig {
  // Resource configuration
  resourceIds: string[];           // Priority list: ['ult', 'glt', 'ulb']
  serverId: string;               // Server identifier
  
  // Processing options
  includeAlignments: boolean;     // Include word alignments
  includeSections: boolean;       // Include section markers
  usfmVersion: string;           // USFM version to expect
  
  // Base options
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  validateContent: boolean;
  cacheExpiry: number;
}

/**
 * Configuration interface for Door43NotesAdapter
 */
export interface Door43NotesAdapterConfig {
  resourceId: string;             // Single resource ID
  serverId: string;              // Server identifier
  markdownProcessor: 'basic' | 'advanced';
  
  // Special processing flags
  processAsWords?: boolean;       // Process as Translation Words
  processAsQuestions?: boolean;   // Process as Translation Questions
  
  // Base options
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  validateContent: boolean;
  cacheExpiry: number;
}

/**
 * Configuration interface for Door43AcademyAdapter
 */
export interface Door43AcademyAdapterConfig {
  resourceId: string;             // Resource ID (usually 'ta')
  serverId: string;              // Server identifier
  categories: string[];          // Filter categories
  includeImages: boolean;        // Include embedded images
  
  // Base options
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  validateContent: boolean;
  cacheExpiry: number;
}

/**
 * Configuration interface for Door43TranslationWordsAdapter
 */
export interface Door43TranslationWordsAdapterConfig {
  resourceId: string;             // Resource ID (usually 'tw')
  serverId: string;              // Server identifier
  categories: string[];          // Filter categories: 'keyTerm', 'properName', 'generalTerm'
  includeStrongsNumbers: boolean; // Include Strong's numbers in content
  
  // Base options
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  validateContent: boolean;
  cacheExpiry: number;
}

/**
 * Configuration interface for Door43TranslationWordsLinksAdapter
 */
export interface Door43TranslationWordsLinksAdapterConfig {
  resourceId: string;             // Resource ID (usually 'twl')
  serverId: string;              // Server identifier
  categories: string[];          // Filter categories: 'kt', 'names', 'other'
  includeOriginalWords: boolean; // Include original language words in content
  
  // Base options
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  validateContent: boolean;
  cacheExpiry: number;
}
