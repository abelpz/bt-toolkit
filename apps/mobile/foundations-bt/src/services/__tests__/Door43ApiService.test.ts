/**
 * Door43 API Service Tests
 * Tests the Door43 API integration and fallback behavior
 */

import { Door43ApiService } from '../door43/Door43ApiService';

// Mock fetch for testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Door43ApiService', () => {
  let service: Door43ApiService;

  beforeEach(() => {
    service = new Door43ApiService({
      language: 'en',
      organization: 'unfoldingWord',
    });
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Catalog API Integration', () => {
    it('should discover resources from catalog API', async () => {
      // Mock catalog search response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            name: 'en_ult',
            owner: { login: 'unfoldingWord', full_name: 'unfoldingWord' },
            full_name: 'unfoldingWord/en_ult',
            description: 'English Unlocked Literal Text',
            subject: 'Aligned Bible',
            language: 'en',
            stage: 'prod',
            updated_at: '2024-01-01T00:00:00Z',
            url: 'https://git.door43.org/unfoldingWord/en_ult',
            git_url: 'https://git.door43.org/unfoldingWord/en_ult.git',
            clone_url: 'https://git.door43.org/unfoldingWord/en_ult.git',
            default_branch: 'master'
          }
        ]
      } as Response);

      // Mock repository contents response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { name: '01-GEN.usfm', type: 'file' },
          { name: '02-EXO.usfm', type: 'file' },
          { name: '40-MAT.usfm', type: 'file' }
        ]
      } as Response);

      await service.initialize();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/catalog/search'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'FoundationsBT/1.0.0',
            'Content-Type': 'application/json'
          })
        })
      );

      const availableBooks = await service.getAvailableBooks();
      expect(availableBooks).toContain('GEN');
      expect(availableBooks).toContain('EXO');
      expect(availableBooks).toContain('MAT');
    });

    it('should handle API errors gracefully', async () => {
      // Mock failed API response
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.initialize()).rejects.toThrow('Network error');
    });

    it('should implement rate limiting with exponential backoff', async () => {
      // Mock rate limited response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      } as Response);

      // Mock successful retry
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response);

      const startTime = Date.now();
      await service.initialize();
      const endTime = Date.now();

      // Should have waited at least 2 seconds (2^1 * 1000ms)
      expect(endTime - startTime).toBeGreaterThan(1900);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Bible Text Fetching', () => {
    beforeEach(async () => {
      // Mock initialization
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              name: 'en_ult',
              owner: { login: 'unfoldingWord' },
              subject: 'Aligned Bible'
            }
          ]
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ name: '32-JON.usfm' }]
        } as Response);

      await service.initialize();
      mockFetch.mockClear();
    });

    it('should fetch ULT Bible text', async () => {
      const mockUsfmContent = `\\id JON unfoldingWord Literal Text
\\h Jonah
\\toc1 The Book of Jonah
\\toc2 Jonah
\\toc3 Jon
\\mt Jonah
\\c 1
\\p
\\v 1 Now the word of Yahweh came to Jonah son of Amittai, saying,`;

      // Mock catalog search for ULT
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            name: 'en_ult',
            owner: { login: 'unfoldingWord' },
            subject: 'Aligned Bible'
          }
        ]
      } as Response);

      // Mock raw file fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockUsfmContent
      } as Response);

      const bibleText = await service.getBibleText('JON', 'ult');

      expect(bibleText).toBeTruthy();
      expect(bibleText?.book).toBe('JON');
      expect(bibleText?.translation).toBe('ULT');
      expect(bibleText?.content).toBe(mockUsfmContent);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('unfoldingWord/en_ult/raw/branch/master'),
        expect.any(Object)
      );
    });

    it('should try multiple filename patterns', async () => {
      // Mock catalog search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            name: 'en_ult',
            owner: { login: 'unfoldingWord' }
          }
        ]
      } as Response);

      // Mock failed attempts for different filename patterns
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 404 } as Response) // 32-JON.usfm
        .mockResolvedValueOnce({ ok: false, status: 404 } as Response) // JON.usfm
        .mockResolvedValueOnce({
          ok: true,
          text: async () => '\\id JON test content'
        } as Response); // jon.usfm

      const bibleText = await service.getBibleText('JON', 'ult');
      expect(bibleText).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 catalog + 3 file attempts
    });
  });

  describe('Translation Helps Integration', () => {
    it('should fetch translation notes', async () => {
      const mockTsvContent = `Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote
1:1\tabc1\t\t\tword of Yahweh\t1\tThis refers to a message from God.`;

      // Mock catalog and file responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ name: 'en_tn', owner: { login: 'unfoldingWord' } }]
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockTsvContent
        } as Response);

      const notes = await service.getTranslationNotes('JON');
      
      expect(notes).toBeTruthy();
      expect(notes?.book).toBe('JON');
      expect(notes?.notes).toHaveLength(1);
      expect(notes?.notes[0].Quote).toBe('word of Yahweh');
    });

    it('should get passage helps with combined resources', async () => {
      // Mock all resource types
      const mockResponses = [
        // Translation Notes
        { ok: true, json: async () => [{ name: 'en_tn', owner: { login: 'unfoldingWord' } }] },
        { ok: true, text: async () => 'Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote\n1:1\tabc1\t\t\ttest\t1\tTest note' },
        
        // Translation Words Links  
        { ok: true, json: async () => [{ name: 'en_twl', owner: { login: 'unfoldingWord' } }] },
        { ok: true, text: async () => 'Reference\tID\tTags\tOrigWords\tOccurrence\tTWLink\n1:1\txyz1\t\t\ttest\t1\trc://*/tw/dict/bible/kt/god' },
        
        // Translation Questions
        { ok: true, json: async () => [{ name: 'en_tq', owner: { login: 'unfoldingWord' } }] },
        { ok: true, text: async () => 'Reference\tID\tTags\tQuote\tOccurrence\tQuestion\tResponse\n1:1\tdef1\t\t\ttest\t1\tWhat happened?\tSomething happened.' }
      ];

      mockResponses.forEach(response => {
        mockFetch.mockResolvedValueOnce(response as unknown as Response);
      });

      const passageHelps = await service.getPassageHelps({
        book: 'JON',
        chapter: 1,
        verse: 1,
        original: 'JON 1:1'
      });

      expect(passageHelps.reference.book).toBe('JON');
      expect(passageHelps.notes).toBeDefined();
      expect(passageHelps.questions).toBeDefined();
      expect(passageHelps.wordLinks).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should fallback gracefully when resources are not found', async () => {
      // Mock 404 responses
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      const bibleText = await service.getBibleText('NONEXISTENT', 'ult');
      expect(bibleText).toBeNull();

      const notes = await service.getTranslationNotes('NONEXISTENT');
      expect(notes).toBeNull();
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      await expect(service.getBibleText('JON', 'ult')).rejects.toThrow('Network timeout');
    });
  });
});
