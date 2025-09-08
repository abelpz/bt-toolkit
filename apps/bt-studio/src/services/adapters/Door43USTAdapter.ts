import { Door43ScriptureAdapter } from './Door43ScriptureAdapter';
import { ScriptureMetadata } from '../../types/context';

/**
 * Adapter for unfoldingWord Simplified Text (UST) resources
 * Falls back to Gateway Language Simplified Text (GST) if UST is not available
 */
export class Door43USTAdapter extends Door43ScriptureAdapter {
  constructor() {
    super({
      resourceIds: ['ust', 'gst'],
      includeAlignments: false,
      includeSections: true,
      usfmVersion: '3.0',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      validateContent: true
    });
    
    console.log(`🔧 Door43USTAdapter initialized for UST resources`);
  }

  override async getResourceMetadata(server: string, owner: string, language: string): Promise<ScriptureMetadata> {
    console.log(`📋 Fetching UST metadata for ${owner}/${language} from ${server}`);
    return super.getResourceMetadata(server, owner, language);
  }
}
