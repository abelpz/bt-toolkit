import { Door43ScriptureAdapter } from './Door43ScriptureAdapter';
import { ScriptureMetadata } from '../../types/context';

/**
 * Adapter for Original Language Scripture resources (Hebrew Bible and Greek New Testament)
 * Supports both UHB (Hebrew) and UGNT (Greek) based on configuration
 */
export class Door43OriginalAdapter extends Door43ScriptureAdapter {
  private originalResourceId: string;

  constructor(resourceId: 'uhb' | 'ugnt') {
    super({
      resourceIds: [resourceId],
      includeAlignments: true,
      includeSections: true,
      usfmVersion: '3.0',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      validateContent: true
    });
    
    this.originalResourceId = resourceId;
    console.log(`🔧 Door43OriginalAdapter initialized for ${this.originalResourceId} resources`);
  }

  override async getResourceMetadata(server: string, owner: string, language: string): Promise<ScriptureMetadata> {
    const resourceName = this.originalResourceId === 'uhb' ? 'Hebrew Bible' : 'Greek New Testament';
    console.log(`📋 Fetching ${resourceName} metadata for ${owner}/${language} from ${server}`);
    return super.getResourceMetadata(server, owner, language);
  }
}
