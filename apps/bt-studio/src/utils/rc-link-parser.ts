/**
 * RC Link Parser Utility
 * 
 * Parses rc:// links from Translation Notes support references
 * to extract Translation Academy article information.
 * 
 * Example rc:// link formats:
 * - rc://en/ta/man/translate/figs-metaphor
 * - rc://wildcard/ta/man/checking/acceptable  
 * - rc://en/ta/man/intro/translation-guidelines
 */

export interface ParsedRcLink {
  language: string;
  resource: string;
  type: string; // 'man' for manual
  category: string; // 'translate', 'checking', 'intro'
  articleId: string; // 'figs-metaphor', 'acceptable', etc.
  fullArticleId: string; // 'translate/figs-metaphor'
  isValid: boolean;
}

/**
 * Parse an rc:// link to extract Translation Academy article information
 */
export function parseRcLink(rcLink: string): ParsedRcLink {
  const result: ParsedRcLink = {
    language: '',
    resource: '',
    type: '',
    category: '',
    articleId: '',
    fullArticleId: '',
    isValid: false
  };

  try {
    // Remove rc:// prefix and split by /
    const cleanLink = rcLink.replace(/^rc:\/\//, '');
    const parts = cleanLink.split('/');

    // Expected format: language/resource/type/category/article
    // Example: en/ta/man/translate/figs-metaphor
    if (parts.length < 5) {
      console.warn(`Invalid rc:// link format: ${rcLink} (expected at least 5 parts, got ${parts.length})`);
      return result;
    }

    const [language, resource, type, category, articleId] = parts;

    // Validate that this is a Translation Academy link
    if (resource !== 'ta' || type !== 'man') {
      console.warn(`Not a Translation Academy manual link: ${rcLink} (resource: ${resource}, type: ${type})`);
      return result;
    }

    // Validate category
    const validCategories = ['translate', 'checking', 'intro'];
    if (!validCategories.includes(category)) {
      console.warn(`Invalid Translation Academy category: ${category} in ${rcLink}`);
      return result;
    }

    result.language = language === '*' ? 'en' : language; // Default wildcard to English
    result.resource = resource;
    result.type = type;
    result.category = category;
    result.articleId = articleId;
    result.fullArticleId = `${category}/${articleId}`;
    result.isValid = true;


    return result;

  } catch (error) {
    console.error(`❌ Failed to parse rc:// link: ${rcLink}`, error);
    return result;
  }
}

/**
 * Check if a string contains an rc:// link
 */
export function containsRcLink(text: string): boolean {
  return /rc:\/\//.test(text);
}

/**
 * Extract all rc:// links from a text string
 */
export function extractRcLinks(text: string): string[] {
  const rcLinkRegex = /rc:\/\/[^\s,;)]+/g;
  return text.match(rcLinkRegex) || [];
}

/**
 * Check if an rc:// link is a Translation Academy link
 */
export function isTranslationAcademyLink(rcLink: string): boolean {
  const parsed = parseRcLink(rcLink);
  return parsed.isValid && parsed.resource === 'ta';
}

/**
 * Get a human-readable title for a Translation Academy article
 */
export function getArticleDisplayTitle(articleId: string, category: string): string {
  // Common article titles mapping
  const titleMap: Record<string, string> = {
    'figs-metaphor': 'Metaphor',
    'figs-simile': 'Simile',
    'figs-hyperbole': 'Hyperbole',
    'figs-irony': 'Irony',
    'translate-names': 'How to Translate Names',
    'translate-unknown': 'Translate the Unknown',
    'acceptable': 'Acceptable Style',
    'good': 'A Good Translation',
    'translation-guidelines': 'Translation Guidelines'
  };

  const title = titleMap[articleId];
  if (title) {
    return title;
  }

  // Fallback: convert kebab-case to Title Case
  return articleId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
