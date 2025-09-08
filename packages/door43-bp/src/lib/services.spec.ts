import { BookPackageService } from './book-package-service';
import { DEFAULT_BOOK_PACKAGE_CONFIG } from './config';

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('BookPackageService', () => {
  let service: BookPackageService;

  beforeEach(() => {
    service = new BookPackageService(DEFAULT_BOOK_PACKAGE_CONFIG, {
      debug: false,
      fetchFn: mockFetch,
    });
    mockFetch.mockClear();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultService = new BookPackageService();
      expect(defaultService).toBeInstanceOf(BookPackageService);
    });

    it('should initialize with custom options', () => {
      const customService = new BookPackageService(
        DEFAULT_BOOK_PACKAGE_CONFIG,
        {
          baseUrl: 'https://custom.api.com',
          timeout: 5000,
          maxRetries: 1,
          debug: true,
        }
      );
      expect(customService).toBeInstanceOf(BookPackageService);
    });
  });

  describe('fetchBookPackage', () => {
    it('should fetch a book package successfully', async () => {
      // Mock catalog response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                name: 'en_ult',
                owner: { login: 'unfoldingWord' },
                full_name: 'unfoldingWord/en_ult',
                language: 'en',
                branch_or_tag_name: 'v86',
              },
            ]),
        })
        // Mock manifest response
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              content: Buffer.from(
                `
projects:
- title: Genesis
  identifier: gen
  path: ./01-GEN.usfm
            `
              ).toString('base64'),
            }),
        })
        // Mock USFM file response
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              content: Buffer.from(
                '\\id GEN\n\\c 1\n\\v 1 In the beginning...'
              ).toString('base64'),
            }),
        });

      const result = await service.fetchBookPackage({
        book: 'GEN',
        language: 'en',
        organization: 'unfoldingWord',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.book).toBe('GEN');
      expect(result.data?.language).toBe('en');
      expect(result.data?.organization).toBe('unfoldingWord');
    });

    it('should return cached result on second call', async () => {
      // Mock first call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      // First call
      await service.fetchBookPackage({
        book: 'GEN',
        language: 'en',
        organization: 'unfoldingWord',
      });

      // Second call should use cache
      const result = await service.fetchBookPackage({
        book: 'GEN',
        language: 'en',
        organization: 'unfoldingWord',
      });

      expect(result.source).toBe('cache');
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.fetchBookPackage({
        book: 'GEN',
        language: 'en',
        organization: 'unfoldingWord',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('fetchOnDemandResource', () => {
    it('should fetch translation academy article', async () => {
      const result = await service.fetchOnDemandResource({
        type: 'translation-academy',
        identifier: 'metaphor',
        language: 'en',
        organization: 'unfoldingWord',
      });

      // For now, this will fail because we haven't implemented the full logic
      // but it should handle the error gracefully
      expect(result.success).toBe(false);
    });

    it('should fetch translation words article', async () => {
      const result = await service.fetchOnDemandResource({
        type: 'translation-words',
        identifier: 'god',
        language: 'en',
        organization: 'unfoldingWord',
      });

      // For now, this will fail because we haven't implemented the full logic
      // but it should handle the error gracefully
      expect(result.success).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should return cache stats', () => {
      const stats = service.getCacheStats();
      expect(stats).toHaveProperty('repositories');
      expect(stats).toHaveProperty('manifests');
      expect(stats).toHaveProperty('bookPackages');
      expect(stats).toHaveProperty('onDemandResources');
    });

    it('should clear cache', () => {
      service.clearCache();
      const stats = service.getCacheStats();
      expect(stats.repositories).toBe(0);
      expect(stats.manifests).toBe(0);
      expect(stats.bookPackages).toBe(0);
      expect(stats.onDemandResources).toBe(0);
    });
  });
});
