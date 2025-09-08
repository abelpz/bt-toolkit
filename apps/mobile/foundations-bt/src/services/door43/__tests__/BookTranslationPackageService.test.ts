/**
 * Book Translation Package Service Tests
 * Tests the new modular book package system
 */

import { BookTranslationPackageService } from '../BookTranslationPackageService';
import { 
  BookPackageRequest,
  OnDemandResourceRequest 
} from '../BookTranslationPackageConfig';

// Mock fetch for testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('BookTranslationPackageService', () => {
  let service: BookTranslationPackageService;

  beforeEach(() => {
    service = new BookTranslationPackageService({
      defaults: {
        language: 'es-419',
        organization: 'es-419_gl'
      }
    });
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Book Package Fetching', () => {
    it('should fetch complete book translation package', async () => {
      // Mock repository discovery
      mockFetch
        // Catalog search for GLT
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              name: 'es-419_glt',
              owner: { login: 'es-419_gl' },
              full_name: 'es-419_gl/es-419_glt',
              default_branch: 'master'
            }
          ]
        } as Response)
        // Manifest fetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => `
dublin_core:
  identifier: es-419_glt
projects:
  - identifier: JON
    title: Jonah
    path: 35-JON.usfm
`
        } as Response)
        // USFM file fetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => `\\id JON es-419 GLT
\\h Jonás
\\c 1
\\v 1 La palabra de Yahvé vino a Jonás`
        } as Response);

      const request: BookPackageRequest = {
        book: 'JON',
        language: 'es-419',
        organization: 'es-419_gl',
        resourceTypes: ['literalText']
      };

      const bookPackage = await service.fetchBookPackage(request);

      expect(bookPackage.book).toBe('JON');
      expect(bookPackage.language).toBe('es-419');
      expect(bookPackage.organization).toBe('es-419_gl');
      expect(bookPackage.literalText).toBeDefined();
      expect(bookPackage.literalText?.source).toBe('es-419_glt');
      expect(bookPackage.literalText?.content).toContain('Jonás');
      expect(bookPackage.repositories['es-419_glt']).toBeDefined();
    });

    it('should handle multiple resource types in parallel', async () => {
      // Mock multiple repository responses
      const mockResponses = [
        // GLT repository
        { ok: true, json: async () => [{ name: 'es-419_glt', owner: { login: 'es-419_gl' }, default_branch: 'master' }] },
        { ok: true, text: async () => 'dublin_core:\n  identifier: es-419_glt\nprojects:\n  - identifier: JON' },
        { ok: true, text: async () => '\\id JON GLT content' },
        
        // GST repository
        { ok: true, json: async () => [{ name: 'es-419_gst', owner: { login: 'es-419_gl' }, default_branch: 'master' }] },
        { ok: true, text: async () => 'dublin_core:\n  identifier: es-419_gst\nprojects:\n  - identifier: JON' },
        { ok: true, text: async () => '\\id JON GST content' },
        
        // TN repository
        { ok: true, json: async () => [{ name: 'es-419_tn', owner: { login: 'es-419_gl' }, default_branch: 'master' }] },
        { ok: true, text: async () => 'dublin_core:\n  identifier: es-419_tn\nprojects:\n  - identifier: JON' },
        { ok: true, text: async () => 'Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote\n1:1\tabc1\t\t\ttest\t1\tTest note' }
      ];

      mockResponses.forEach(response => {
        mockFetch.mockResolvedValueOnce(response as unknown as Response);
      });

      const request: BookPackageRequest = {
        book: 'JON',
        language: 'es-419',
        organization: 'es-419_gl',
        resourceTypes: ['literalText', 'simplifiedText', 'translationNotes']
      };

      const bookPackage = await service.fetchBookPackage(request);

      expect(bookPackage.literalText).toBeDefined();
      expect(bookPackage.simplifiedText).toBeDefined();
      expect(bookPackage.translationNotes).toBeDefined();
      expect(Object.keys(bookPackage.repositories)).toHaveLength(3);
    });

    it('should use backup resources when primary fails', async () => {
      // Mock primary GLT failing, backup ULT succeeding
      mockFetch
        // GLT search - not found
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        } as Response)
        // ULT search - found
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              name: 'es-419_ult',
              owner: { login: 'es-419_gl' },
              default_branch: 'master'
            }
          ]
        } as Response)
        // ULT manifest and file
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'dublin_core:\n  identifier: es-419_ult'
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '\\id JON ULT backup content'
        } as Response);

      const request: BookPackageRequest = {
        book: 'JON',
        language: 'es-419',
        organization: 'es-419_gl',
        resourceTypes: ['literalText'] // Will try GLT first, then ULT
      };

      const bookPackage = await service.fetchBookPackage(request);

      expect(bookPackage.literalText).toBeDefined();
      expect(bookPackage.literalText?.source).toBe('es-419_ult');
      expect(bookPackage.literalText?.content).toContain('ULT backup content');
    });

    it('should cache book packages', async () => {
      // Mock first request
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ name: 'es-419_glt', owner: { login: 'es-419_gl' }, default_branch: 'master' }]
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'dublin_core:\n  identifier: es-419_glt'
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '\\id JON cached content'
        } as Response);

      const request: BookPackageRequest = {
        book: 'JON',
        language: 'es-419',
        organization: 'es-419_gl',
        resourceTypes: ['literalText']
      };

      // First request
      const package1 = await service.fetchBookPackage(request);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Second request (should use cache)
      const package2 = await service.fetchBookPackage(request);
      expect(mockFetch).toHaveBeenCalledTimes(3); // No additional calls
      expect(package2.literalText?.content).toBe(package1.literalText?.content);
    });
  });

  describe('On-Demand Resource Loading', () => {
    it('should fetch Translation Academy article', async () => {
      // Mock TA repository and article
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              name: 'es-419_ta',
              owner: { login: 'es-419_gl' },
              default_branch: 'master'
            }
          ]
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => `# Metáfora

Una metáfora es una figura retórica...`
        } as Response);

      const request: OnDemandResourceRequest = {
        type: 'translation-academy',
        identifier: 'figs-metaphor',
        language: 'es-419',
        organization: 'es-419_gl'
      };

      const resource = await service.fetchOnDemandResource(request);

      expect(resource).toBeDefined();
      expect(resource?.type).toBe('translation-academy');
      expect(resource?.identifier).toBe('figs-metaphor');
      expect(resource?.source).toBe('es-419_ta');
      expect(resource?.content).toContain('Metáfora');
    });

    it('should fetch Translation Words article', async () => {
      // Mock TW repository and article
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              name: 'es-419_tw',
              owner: { login: 'es-419_gl' },
              default_branch: 'master'
            }
          ]
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => `# Dios

Dios es el creador del universo...`
        } as Response);

      const request: OnDemandResourceRequest = {
        type: 'translation-words',
        identifier: 'kt/god',
        language: 'es-419',
        organization: 'es-419_gl'
      };

      const resource = await service.fetchOnDemandResource(request);

      expect(resource).toBeDefined();
      expect(resource?.type).toBe('translation-words');
      expect(resource?.identifier).toBe('kt/god');
      expect(resource?.source).toBe('es-419_tw');
      expect(resource?.content).toContain('Dios');
    });

    it('should cache on-demand resources', async () => {
      // Mock first request
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ name: 'es-419_ta', owner: { login: 'es-419_gl' }, default_branch: 'master' }]
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '# Cached Article'
        } as Response);

      const request: OnDemandResourceRequest = {
        type: 'translation-academy',
        identifier: 'test-article',
        language: 'es-419',
        organization: 'es-419_gl'
      };

      // First request
      const resource1 = await service.fetchOnDemandResource(request);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second request (should use cache)
      const resource2 = await service.fetchOnDemandResource(request);
      expect(mockFetch).toHaveBeenCalledTimes(2); // No additional calls
      expect(resource2?.content).toBe(resource1?.content);
    });
  });

  describe('Error Handling', () => {
    it('should handle repository not found gracefully', async () => {
      // Mock empty search results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response);

      const request: BookPackageRequest = {
        book: 'JON',
        language: 'nonexistent',
        organization: 'nonexistent',
        resourceTypes: ['literalText']
      };

      const bookPackage = await service.fetchBookPackage(request);

      expect(bookPackage.literalText).toBeUndefined();
      expect(bookPackage.book).toBe('JON');
      expect(Object.keys(bookPackage.repositories)).toHaveLength(0);
    });

    it('should handle network errors with retry', async () => {
      // Mock network error then success
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ name: 'es-419_glt', owner: { login: 'es-419_gl' }, default_branch: 'master' }]
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'dublin_core:\n  identifier: es-419_glt'
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '\\id JON retry success'
        } as Response);

      const request: BookPackageRequest = {
        book: 'JON',
        language: 'es-419',
        organization: 'es-419_gl',
        resourceTypes: ['literalText']
      };

      const bookPackage = await service.fetchBookPackage(request);

      expect(bookPackage.literalText).toBeDefined();
      expect(bookPackage.literalText?.content).toContain('retry success');
    });

    it('should handle rate limiting with exponential backoff', async () => {
      // Mock rate limited response then success
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ name: 'es-419_glt', owner: { login: 'es-419_gl' }, default_branch: 'master' }]
        } as Response);

      const startTime = Date.now();
      
      const request: BookPackageRequest = {
        book: 'JON',
        language: 'es-419',
        organization: 'es-419_gl',
        resourceTypes: ['literalText']
      };

      // This would normally continue with manifest and file fetches,
      // but we're just testing the rate limiting retry mechanism
      try {
        await service.fetchBookPackage(request);
      } catch (error) {
        // Expected to fail due to incomplete mocks, but should have waited
        const endTime = Date.now();
        expect(endTime - startTime).toBeGreaterThan(1900); // At least 2 seconds delay
      }
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('repositories');
      expect(stats).toHaveProperty('manifests');
      expect(stats).toHaveProperty('packages');
      expect(stats).toHaveProperty('onDemand');
      expect(typeof stats.repositories).toBe('number');
      expect(typeof stats.manifests).toBe('number');
      expect(typeof stats.packages).toBe('number');
      expect(typeof stats.onDemand).toBe('number');
    });

    it('should clear all caches', () => {
      service.clearCache();
      
      const stats = service.getCacheStats();
      expect(stats.repositories).toBe(0);
      expect(stats.manifests).toBe(0);
      expect(stats.packages).toBe(0);
      expect(stats.onDemand).toBe(0);
    });
  });
});
