/**
 * Book Translation Package Configuration
 * Defines the structure and rules for fetching complete book translation packages
 */

export interface ResourceTypeConfig {
  /** Primary resource ID to search for */
  primary: string;
  /** Backup resource IDs to try if primary fails */
  backups?: string[];
  /** Whether this resource is book-specific */
  bookSpecific: true;
  /** File pattern for book-specific resources */
  filePattern: (book: string, bookNumber?: string) => string[];
}

export interface GlobalResourceTypeConfig {
  /** Primary resource ID to search for */
  primary: string;
  /** Backup resource IDs to try if primary fails */
  backups?: string[];
  /** Whether this resource is global (not book-specific) */
  bookSpecific: false;
  /** How to fetch this resource on-demand */
  onDemandStrategy: 'reference-based' | 'link-based';
}

export type ResourceConfig = ResourceTypeConfig | GlobalResourceTypeConfig;

export interface BookTranslationPackageConfig {
  /** Resource type configurations */
  resourceTypes: {
    literalText: ResourceTypeConfig;
    simplifiedText: ResourceTypeConfig;
    translationNotes: ResourceTypeConfig;
    translationWordsLinks: ResourceTypeConfig;
    translationQuestions: ResourceTypeConfig;
    translationAcademy: GlobalResourceTypeConfig;
    translationWords: GlobalResourceTypeConfig;
  };

  /** Default language and organization */
  defaults: {
    language: string;
    organization: string;
  };

  /** Book number mapping for file patterns */
  bookNumbers: Record<string, string>;
}

/**
 * Default configuration for unfoldingWord resources
 */
export const DEFAULT_BOOK_PACKAGE_CONFIG: BookTranslationPackageConfig = {
  resourceTypes: {
    literalText: {
      primary: 'ult',
      backups: ['glt'],
      bookSpecific: true,
      filePattern: (book: string, bookNumber?: string) => [
        `${bookNumber}-${book}.usfm`,
        `${book}.usfm`,
        `${book.toLowerCase()}.usfm`,
      ],
    },

    simplifiedText: {
      primary: 'ust',
      backups: ['gst'],
      bookSpecific: true,
      filePattern: (book: string, bookNumber?: string) => [
        `${bookNumber}-${book}.usfm`,
        `${book}.usfm`,
        `${book.toLowerCase()}.usfm`,
      ],
    },

    translationNotes: {
      primary: 'tn',
      backups: [],
      bookSpecific: true,
      filePattern: (book: string) => [
        `tn_${book}.tsv`,
        `${book.toLowerCase()}.tsv`,
      ],
    },

    translationWordsLinks: {
      primary: 'twl',
      backups: [],
      bookSpecific: true,
      filePattern: (book: string) => [
        `twl_${book}.tsv`,
        `${book.toLowerCase()}.tsv`,
      ],
    },

    translationQuestions: {
      primary: 'tq',
      backups: [],
      bookSpecific: true,
      filePattern: (book: string) => [
        `tq_${book}.tsv`,
        `${book.toLowerCase()}.tsv`,
      ],
    },

    translationAcademy: {
      primary: 'ta',
      backups: [],
      bookSpecific: false,
      onDemandStrategy: 'reference-based',
    },

    translationWords: {
      primary: 'tw',
      backups: [],
      bookSpecific: false,
      onDemandStrategy: 'link-based',
    },
  },

  defaults: {
    language: 'en',
    organization: 'unfoldingWord',
  },

  // Standard book number mapping (01-66)
  bookNumbers: {
    GEN: '01',
    EXO: '02',
    LEV: '03',
    NUM: '04',
    DEU: '05',
    JOS: '06',
    JDG: '07',
    RUT: '08',
    '1SA': '09',
    '2SA': '10',
    '1KI': '11',
    '2KI': '12',
    '1CH': '13',
    '2CH': '14',
    EZR: '15',
    NEH: '16',
    EST: '17',
    JOB: '18',
    PSA: '19',
    PRO: '20',
    ECC: '21',
    SNG: '22',
    ISA: '23',
    JER: '24',
    LAM: '25',
    EZK: '26',
    DAN: '27',
    HOS: '28',
    JOL: '29',
    AMO: '30',
    OBA: '31',
    JON: '32',
    MIC: '33',
    NAM: '34',
    HAB: '35',
    ZEP: '36',
    HAG: '37',
    ZEC: '38',
    MAL: '39',
    MAT: '40',
    MRK: '41',
    LUK: '42',
    JHN: '43',
    ACT: '44',
    ROM: '45',
    '1CO': '46',
    '2CO': '47',
    GAL: '48',
    EPH: '49',
    PHP: '50',
    COL: '51',
    '1TH': '52',
    '2TH': '53',
    '1TI': '54',
    '2TI': '55',
    TIT: '56',
    PHM: '57',
    HEB: '58',
    JAS: '59',
    '1PE': '60',
    '2PE': '61',
    '1JN': '62',
    '2JN': '63',
    '3JN': '64',
    JUD: '65',
    REV: '66',
  },
};

/**
 * Book Translation Package Request
 */
export interface BookPackageRequest {
  book: string;
  language: string;
  organization: string;
  resourceTypes?: (keyof BookTranslationPackageConfig['resourceTypes'])[];
}

/**
 * Book Translation Package Result
 */
export interface BookTranslationPackage {
  book: string;
  language: string;
  organization: string;

  // Book-specific resources
  literalText?: {
    source: string; // Repository name
    content: string; // Raw USFM content
    processed?: any; // Processed content
  };

  simplifiedText?: {
    source: string;
    content: string;
    processed?: any;
  };

  translationNotes?: {
    source: string;
    content: string; // Raw TSV content
    processed?: any; // Parsed notes
  };

  translationWordsLinks?: {
    source: string;
    content: string; // Raw TSV content
    processed?: any; // Parsed links
  };

  translationQuestions?: {
    source: string;
    content: string; // Raw TSV content
    processed?: any; // Parsed questions
  };

  // Metadata
  fetchedAt: Date;
  repositories: Record<
    string,
    {
      name: string;
      url: string;
      manifest?: any;
    }
  >;
}

/**
 * On-demand resource request
 */
export interface OnDemandResourceRequest {
  type: 'translation-academy' | 'translation-words';
  identifier: string; // Article ID or word link
  language: string;
  organization: string;
}

export interface OnDemandResource {
  type: 'translation-academy' | 'translation-words';
  identifier: string;
  source: string;
  content: string;
  processed?: any;
  fetchedAt: Date;
}
