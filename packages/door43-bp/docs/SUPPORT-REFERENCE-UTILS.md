# Support Reference Parsing Utilities

This document provides utility functions for parsing Translation Notes support references and fetching Translation Academy articles.

## 🔧 Core Parsing Functions

### parseSupportReference()

Parses a support reference string into structured data for easy TA article fetching.

```typescript
interface ParsedSupportReference {
  type: 'translation-academy' | 'translation-words' | 'other';
  identifier: string;
  taPath?: string;
  category?: string;
  slug?: string;
  title?: string;
}

function parseSupportReference(supportRef: string): ParsedSupportReference {
  if (!supportRef) {
    return { type: 'other', identifier: '' };
  }

  // Parse Translation Academy references
  // Format: rc://*/ta/man/translate/figs-abstractnouns
  const taMatch = supportRef.match(/rc:\/\/\*\/ta\/man\/([^\/]+)\/([^\/]+)/);
  if (taMatch) {
    const [, category, slug] = taMatch;
    return {
      type: 'translation-academy',
      identifier: supportRef,
      taPath: `/${category}/${slug}`,
      category,
      slug,
      title: formatTitleFromSlug(slug)
    };
  }

  // Parse Translation Words references  
  // Format: rc://*/tw/dict/bible/kt/god
  const twMatch = supportRef.match(/rc:\/\/\*\/tw\/dict\/bible\/([^\/]+)\/([^\/]+)/);
  if (twMatch) {
    const [, category, slug] = twMatch;
    return {
      type: 'translation-words',
      identifier: supportRef,
      category,
      slug,
      title: formatTitleFromSlug(slug)
    };
  }

  // Unknown reference type
  return {
    type: 'other',
    identifier: supportRef
  };
}

function formatTitleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```

## 📚 Translation Academy Utilities

### fetchTranslationAcademyArticle()

Fetches and processes a complete TA article from its three component files.

```typescript
interface TAFileContent {
  title: string;
  subtitle?: string;
  content: string;
}

async function fetchTranslationAcademyArticle(
  taPath: string,
  language: string = 'en',
  organization: string = 'unfoldingWord'
): Promise<ProcessedTranslationAcademy> {
  const [, category, slug] = taPath.split('/');
  
  if (!category || !slug) {
    throw new Error(`Invalid TA path: ${taPath}`);
  }

  try {
    // Fetch the three component files
    const fileContents = await fetchTAFiles(taPath, language, organization);
    
    // Process and merge content
    const processed: ProcessedTranslationAcademy = {
      identifier: slug,
      taPath,
      category,
      title: fileContents.title.trim(),
      subtitle: fileContents.subtitle?.trim(),
      content: fileContents.content,
      sections: parseMarkdownSections(fileContents.content),
      sourceFiles: {
        title: fileContents.title,
        subtitle: fileContents.subtitle,
        content: fileContents.content
      },
      relatedArticles: extractRelatedArticles(fileContents.content),
      bibleReferences: extractBibleReferences(fileContents.content)
    };

    return processed;
  } catch (error) {
    throw new Error(`Failed to fetch TA article ${taPath}: ${error.message}`);
  }
}

async function fetchTAFiles(
  taPath: string,
  language: string,
  organization: string
): Promise<TAFileContent> {
  const baseUrl = `https://git.door43.org/${organization}/${language}_ta/raw/master`;
  
  // Fetch all three files in parallel
  const [titleContent, subtitleContent, mainContent] = await Promise.allSettled([
    fetchTAFile(`${baseUrl}${taPath}/title.md`),
    fetchTAFile(`${baseUrl}${taPath}/subtitle.md`),
    fetchTAFile(`${baseUrl}${taPath}/01.md`)
  ]);

  // Handle results
  const title = titleContent.status === 'fulfilled' ? titleContent.value : 'Untitled';
  const subtitle = subtitleContent.status === 'fulfilled' ? subtitleContent.value : undefined;
  const content = mainContent.status === 'fulfilled' ? mainContent.value : '';

  if (!content) {
    throw new Error(`Required file 01.md not found for ${taPath}`);
  }

  return { title, subtitle, content };
}

async function fetchTAFile(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.text();
}
```

## 📝 Content Processing Functions

### parseMarkdownSections()

Parses TA article content into structured sections.

```typescript
interface ProcessedTASection {
  heading: string;
  content: string;
  type: 'description' | 'examples' | 'strategies' | 'reason' | 'translation';
  examples?: ProcessedExample[];
  strategies?: string[];
}

interface ProcessedExample {
  text: string;
  reference?: string;
  explanation?: string;
}

function parseMarkdownSections(content: string): ProcessedTASection[] {
  const sections: ProcessedTASection[] = [];
  const lines = content.split('\n');
  
  let currentSection: Partial<ProcessedTASection> | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    // Check for section headings (## or ###)
    const headingMatch = line.match(/^(#{2,3})\s+(.+)$/);
    
    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        sections.push(currentSection as ProcessedTASection);
      }
      
      // Start new section
      const [, level, heading] = headingMatch;
      currentSection = {
        heading: heading.trim(),
        content: '',
        type: inferSectionType(heading),
        examples: [],
        strategies: []
      };
      currentContent = [];
    } else {
      // Add content to current section
      currentContent.push(line);
    }
  }

  // Don't forget the last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    
    // Parse examples and strategies
    if (currentSection.type === 'examples') {
      currentSection.examples = extractExamples(currentSection.content);
    } else if (currentSection.type === 'strategies') {
      currentSection.strategies = extractStrategies(currentSection.content);
    }
    
    sections.push(currentSection as ProcessedTASection);
  }

  return sections;
}

function inferSectionType(heading: string): ProcessedTASection['type'] {
  const lower = heading.toLowerCase();
  
  if (lower.includes('example')) return 'examples';
  if (lower.includes('strateg')) return 'strategies';
  if (lower.includes('reason')) return 'reason';
  if (lower.includes('translation')) return 'translation';
  
  return 'description';
}

function extractExamples(content: string): ProcessedExample[] {
  const examples: ProcessedExample[] = [];
  
  // Look for bullet points or numbered lists
  const lines = content.split('\n');
  let currentExample: Partial<ProcessedExample> | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check for list items
    if (trimmed.match(/^[\*\-\+]\s+/) || trimmed.match(/^\d+\.\s+/)) {
      // Save previous example
      if (currentExample) {
        examples.push(currentExample as ProcessedExample);
      }
      
      // Start new example
      const text = trimmed.replace(/^[\*\-\+\d\.]\s+/, '');
      currentExample = { text };
      
      // Check for scripture reference
      const refMatch = text.match(/\(([^)]+\s+\d+:\d+[^)]*)\)/);
      if (refMatch) {
        currentExample.reference = refMatch[1];
      }
    } else if (currentExample && trimmed) {
      // Add to current example
      currentExample.text += ' ' + trimmed;
    }
  }
  
  // Don't forget the last example
  if (currentExample) {
    examples.push(currentExample as ProcessedExample);
  }
  
  return examples;
}

function extractStrategies(content: string): string[] {
  const strategies: string[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Look for numbered strategies
    if (trimmed.match(/^\d+\.\s+/)) {
      const strategy = trimmed.replace(/^\d+\.\s+/, '');
      strategies.push(strategy);
    }
  }
  
  return strategies;
}
```

## 🔍 Content Extraction Functions

### extractRelatedArticles()

Finds references to other TA articles in the content.

```typescript
function extractRelatedArticles(content: string): string[] {
  const articles: string[] = [];
  
  // Look for TA links in content
  const taLinkRegex = /rc:\/\/\*\/ta\/man\/([^\/]+)\/([^\/\s\)]+)/g;
  let match;
  
  while ((match = taLinkRegex.exec(content)) !== null) {
    const [, category, slug] = match;
    const taPath = `/${category}/${slug}`;
    
    if (!articles.includes(taPath)) {
      articles.push(taPath);
    }
  }
  
  return articles;
}

function extractBibleReferences(content: string): string[] {
  const references: string[] = [];
  
  // Common Bible reference patterns
  const patterns = [
    // "Genesis 1:1", "1 Corinthians 13:4-7"
    /\b([1-3]?\s*[A-Z][a-z]+)\s+(\d+):(\d+)(?:-(\d+))?/g,
    // "Gen 1:1", "1Cor 13:4"
    /\b([1-3]?[A-Z][a-z]{2,3})\s+(\d+):(\d+)(?:-(\d+))?/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const reference = match[0];
      if (!references.includes(reference)) {
        references.push(reference);
      }
    }
  }
  
  return references;
}
```

## 🧪 Usage Examples

### Processing Translation Notes with Support References

```typescript
async function processTranslationNotesWithTA(
  notes: ProcessedTranslationNote[]
): Promise<ProcessedTranslationNote[]> {
  
  return Promise.all(notes.map(async (note) => {
    if (note.supportReference) {
      // Parse the support reference
      const parsed = parseSupportReference(note.supportReference);
      
      // Add parsed reference to note
      note.parsedSupportReference = parsed;
      
      // Optionally pre-fetch TA articles
      if (parsed.type === 'translation-academy' && parsed.taPath) {
        try {
          const taArticle = await fetchTranslationAcademyArticle(parsed.taPath);
          // Cache or store the article for later use
          console.log(`Fetched TA article: ${taArticle.title}`);
        } catch (error) {
          console.warn(`Failed to fetch TA article ${parsed.taPath}:`, error.message);
        }
      }
    }
    
    return note;
  }));
}
```

### Building a TA Article Cache

```typescript
class TranslationAcademyCache {
  private cache = new Map<string, ProcessedTranslationAcademy>();
  
  async getArticle(taPath: string, language = 'en', organization = 'unfoldingWord'): Promise<ProcessedTranslationAcademy> {
    const cacheKey = `${language}/${organization}${taPath}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    const article = await fetchTranslationAcademyArticle(taPath, language, organization);
    this.cache.set(cacheKey, article);
    
    return article;
  }
  
  async preloadArticlesFromNotes(notes: ProcessedTranslationNote[]): Promise<void> {
    const taPaths = new Set<string>();
    
    // Collect all unique TA paths
    notes.forEach(note => {
      if (note.parsedSupportReference?.taPath) {
        taPaths.add(note.parsedSupportReference.taPath);
      }
    });
    
    // Preload all articles
    await Promise.allSettled(
      Array.from(taPaths).map(taPath => this.getArticle(taPath))
    );
    
    console.log(`Preloaded ${taPaths.size} TA articles`);
  }
  
  getCacheStats() {
    return {
      size: this.cache.size,
      articles: Array.from(this.cache.keys())
    };
  }
  
  clear() {
    this.cache.clear();
  }
}
```

## 🎯 Integration with Book Package Service

These utilities can be integrated into the main Book Package Service to provide seamless TA article fetching:

```typescript
// In BookPackageService
async fetchOnDemandResource(request: OnDemandResourceRequest): Promise<FetchResult<OnDemandResource>> {
  if (request.type === 'translation-academy') {
    try {
      // Use the taPath directly as the identifier
      const taPath = request.identifier; // e.g., '/translate/figs-abstractnouns'
      const processed = await fetchTranslationAcademyArticle(taPath, request.language, request.organization);
      
      return {
        success: true,
        data: {
          type: 'translation-academy',
          identifier: taPath,
          source: `${request.language}_ta`,
          content: processed.sourceFiles.content, // Raw content
          processed,
          fetchedAt: new Date()
        },
        source: 'api'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch TA article: ${error.message}`
      };
    }
  }
  
  // Handle other resource types...
}
```

This improved parsing system makes it much easier to work with Translation Academy articles by providing direct paths and structured data for efficient fetching and processing.
