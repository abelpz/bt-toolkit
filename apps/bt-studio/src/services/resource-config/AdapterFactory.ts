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
  CustomAdapterConfig,
  AdapterFactory as IAdapterFactory
} from '../../types/resource-config';
import { ResourceAdapter, ResourceType } from '../../types/context';

// Import adapter classes (these would be the actual implementations)
import { Door43ScriptureAdapter, Door43ScriptureConfig } from '../adapters/Door43ScriptureAdapter';
import { Door43NotesAdapter, Door43NotesConfig } from '../adapters/Door43NotesAdapter';
import { Door43AcademyAdapter } from '../adapters/Door43AcademyAdapter';

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
        return this.createWordsAdapter(config as NotesAdapterConfig);
        
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
    
    const scriptureConfig: Door43ScriptureConfig = {
      // Resource priority configuration
      resourceIds: config.resourceIds,
      
      // Server configuration
      serverId: config.server || 'git.door43.org',
      
      // Processing options
      includeAlignments: config.includeAlignments ?? true,
      includeSections: config.includeSections ?? true,
      usfmVersion: config.usfmVersion || '3.0',
      
      // Base configuration
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      validateContent: config.validateContent ?? true
    };
    
    console.log(`🔧 Creating Door43ScriptureAdapter with resourceIds: [${config.resourceIds.join(', ')}]`);
    
    const adapter = new Door43ScriptureAdapter(scriptureConfig);
    
    // Set the resource type
    adapter.resourceType = resourceType;
    
    return adapter;
  }

  private createNotesAdapter(config: NotesAdapterConfig): ResourceAdapter {
    const notesConfig: Door43NotesConfig = {
      // Resource configuration
      resourceId: config.resourceId,
      
      // Server configuration
      serverId: config.server || 'git.door43.org',
      
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

  private createWordsAdapter(config: NotesAdapterConfig): ResourceAdapter {
    // TODO: Implement Door43WordsAdapter (or reuse NotesAdapter with special config)
    throw new Error(`Words adapter not yet implemented. Config: ${JSON.stringify(config)}`);
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
    // TODO: Implement Door43QuestionsAdapter (or reuse NotesAdapter with special config)
    throw new Error(`Questions adapter not yet implemented. Config: ${JSON.stringify(config)}`);
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
