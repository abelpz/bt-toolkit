import { Door43ScriptureAdapter } from './Door43ScriptureAdapter';
import { ScriptureMetadata } from '../../types/context';

/**
 * Adapter for unfoldingWord Literal Text (ULT) resources
 * Falls back to Gateway Language Translation (GLT) if ULT is not available
 */
export class Door43ULTAdapter extends Door43ScriptureAdapter {
  constructor() {
    super({
      resourceIds: ['ult', 'glt', 'ulb'],
      includeAlignments: true,
      includeSections: true,
      usfmVersion: '3.0',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      validateContent: true
    });
    
    console.log(`🔧 Door43ULTAdapter initialized for ULT resources`);
  }

  override async getResourceMetadata(server: string, owner: string, language: string): Promise<ScriptureMetadata> {
    console.log(`📋 Fetching ULT metadata for ${owner}/${language} from ${server}`);
    return super.getResourceMetadata(server, owner, language);
  }
}
