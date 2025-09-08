/**
 * Passage Sets - Iteration 2
 * Preset passage collections organized hierarchically
 */

export interface PassageRange {
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter?: number;
  endVerse?: number;
}

export interface Passage {
  id: string;
  name: string;
  description?: string;
  ranges: PassageRange[];
}

export interface PassageCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  passages: Passage[];
}

export interface PassageSet {
  id: string;
  name: string;
  description: string;
  version: string;
  categories: PassageCategory[];
}

// Default passage sets for Translation Studio
export const DEFAULT_PASSAGE_SETS: PassageSet[] = [
  {
    id: 'essential-passages',
    name: 'Essential Bible Passages',
    description: 'Key passages for Bible translation and study',
    version: '1.0',
    categories: [
      {
        id: 'creation-fall',
        name: 'Creation & Fall',
        description: 'The beginning of all things and humanity\'s fall',
        icon: '🌍',
        passages: [
          {
            id: 'creation-account',
            name: 'Creation Account',
            description: 'God creates the heavens and earth',
            ranges: [
              { book: 'gen', startChapter: 1, startVerse: 1, endChapter: 2, endVerse: 3 }
            ]
          },
          {
            id: 'garden-eden',
            name: 'Garden of Eden',
            description: 'Adam and Eve in the garden',
            ranges: [
              { book: 'gen', startChapter: 2, startVerse: 4, endChapter: 2, endVerse: 25 }
            ]
          },
          {
            id: 'the-fall',
            name: 'The Fall',
            description: 'Humanity\'s disobedience and consequences',
            ranges: [
              { book: 'gen', startChapter: 3, startVerse: 1, endChapter: 3, endVerse: 24 }
            ]
          }
        ]
      },
      {
        id: 'covenants',
        name: 'God\'s Covenants',
        description: 'Major covenants throughout Scripture',
        icon: '🤝',
        passages: [
          {
            id: 'noah-covenant',
            name: 'Covenant with Noah',
            description: 'God\'s promise after the flood',
            ranges: [
              { book: 'gen', startChapter: 9, startVerse: 8, endChapter: 9, endVerse: 17 }
            ]
          },
          {
            id: 'abraham-covenant',
            name: 'Covenant with Abraham',
            description: 'God\'s promise to Abraham',
            ranges: [
              { book: 'gen', startChapter: 12, startVerse: 1, endChapter: 12, endVerse: 9 },
              { book: 'gen', startChapter: 15, startVerse: 1, endChapter: 15, endVerse: 21 },
              { book: 'gen', startChapter: 17, startVerse: 1, endChapter: 17, endVerse: 27 }
            ]
          },
          {
            id: 'david-covenant',
            name: 'Covenant with David',
            description: 'God\'s promise of an eternal kingdom',
            ranges: [
              { book: '2sa', startChapter: 7, startVerse: 8, endChapter: 7, endVerse: 17 }
            ]
          },
          {
            id: 'new-covenant',
            name: 'New Covenant',
            description: 'The promised new covenant',
            ranges: [
              { book: 'jer', startChapter: 31, startVerse: 31, endChapter: 31, endVerse: 34 }
            ]
          }
        ]
      },
      {
        id: 'messianic-prophecies',
        name: 'Messianic Prophecies',
        description: 'Old Testament prophecies about the Messiah',
        icon: '👑',
        passages: [
          {
            id: 'seed-promise',
            name: 'The Seed Promise',
            description: 'First messianic prophecy',
            ranges: [
              { book: 'gen', startChapter: 3, startVerse: 15, endChapter: 3, endVerse: 15 }
            ]
          },
          {
            id: 'virgin-birth',
            name: 'Virgin Birth',
            description: 'Prophecy of the virgin birth',
            ranges: [
              { book: 'isa', startChapter: 7, startVerse: 14, endChapter: 7, endVerse: 14 }
            ]
          },
          {
            id: 'suffering-servant',
            name: 'Suffering Servant',
            description: 'The servant who suffers for others',
            ranges: [
              { book: 'isa', startChapter: 52, startVerse: 13, endChapter: 53, endVerse: 12 }
            ]
          },
          {
            id: 'bethlehem-prophecy',
            name: 'Born in Bethlehem',
            description: 'Prophecy of Messiah\'s birthplace',
            ranges: [
              { book: 'mic', startChapter: 5, startVerse: 2, endChapter: 5, endVerse: 2 }
            ]
          }
        ]
      },
      {
        id: 'gospel-core',
        name: 'Gospel Core',
        description: 'Central passages of the Gospel message',
        icon: '✝️',
        passages: [
          {
            id: 'john-3-16',
            name: 'God\'s Love for the World',
            description: 'The most famous verse in the Bible',
            ranges: [
              { book: 'jhn', startChapter: 3, startVerse: 16, endChapter: 3, endVerse: 21 }
            ]
          },
          {
            id: 'romans-road',
            name: 'Romans Road',
            description: 'Key verses explaining salvation',
            ranges: [
              { book: 'rom', startChapter: 3, startVerse: 23, endChapter: 3, endVerse: 23 },
              { book: 'rom', startChapter: 6, startVerse: 23, endChapter: 6, endVerse: 23 },
              { book: 'rom', startChapter: 5, startVerse: 8, endChapter: 5, endVerse: 8 },
              { book: 'rom', startChapter: 10, startVerse: 9, endChapter: 10, endVerse: 13 }
            ]
          },
          {
            id: 'great-commission',
            name: 'Great Commission',
            description: 'Jesus\' command to make disciples',
            ranges: [
              { book: 'mat', startChapter: 28, startVerse: 16, endChapter: 28, endVerse: 20 }
            ]
          },
          {
            id: 'crucifixion',
            name: 'The Crucifixion',
            description: 'Jesus\' death on the cross',
            ranges: [
              { book: 'mat', startChapter: 27, startVerse: 32, endChapter: 27, endVerse: 56 }
            ]
          },
          {
            id: 'resurrection',
            name: 'The Resurrection',
            description: 'Jesus rises from the dead',
            ranges: [
              { book: 'mat', startChapter: 28, startVerse: 1, endChapter: 28, endVerse: 15 }
            ]
          }
        ]
      },
      {
        id: 'wisdom-literature',
        name: 'Wisdom & Poetry',
        description: 'Key passages from wisdom and poetic books',
        icon: '📜',
        passages: [
          {
            id: 'psalm-23',
            name: 'The Lord is My Shepherd',
            description: 'The beloved shepherd psalm',
            ranges: [
              { book: 'psa', startChapter: 23, startVerse: 1, endChapter: 23, endVerse: 6 }
            ]
          },
          {
            id: 'psalm-1',
            name: 'Blessed is the Man',
            description: 'The two ways of life',
            ranges: [
              { book: 'psa', startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 6 }
            ]
          },
          {
            id: 'proverbs-wisdom',
            name: 'The Beginning of Wisdom',
            description: 'Fear of the Lord is the beginning of wisdom',
            ranges: [
              { book: 'pro', startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 7 }
            ]
          },
          {
            id: 'ecclesiastes-time',
            name: 'A Time for Everything',
            description: 'There is a season for everything',
            ranges: [
              { book: 'ecc', startChapter: 3, startVerse: 1, endChapter: 3, endVerse: 8 }
            ]
          }
        ]
      },
      {
        id: 'prophetic-hope',
        name: 'Prophetic Hope',
        description: 'Messages of hope and restoration',
        icon: '🌅',
        passages: [
          {
            id: 'valley-dry-bones',
            name: 'Valley of Dry Bones',
            description: 'Vision of restoration and new life',
            ranges: [
              { book: 'ezk', startChapter: 37, startVerse: 1, endChapter: 37, endVerse: 14 }
            ]
          },
          {
            id: 'new-heavens-earth',
            name: 'New Heavens and Earth',
            description: 'God\'s promise of renewal',
            ranges: [
              { book: 'isa', startChapter: 65, startVerse: 17, endChapter: 65, endVerse: 25 }
            ]
          },
          {
            id: 'jonah-mission',
            name: 'Jonah\'s Mission',
            description: 'God\'s mercy extends to all nations',
            ranges: [
              { book: 'jon', startChapter: 1, startVerse: 1, endChapter: 4, endVerse: 11 }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'translation-challenges',
    name: 'Translation Challenges',
    description: 'Passages that present common translation difficulties',
    version: '1.0',
    categories: [
      {
        id: 'cultural-concepts',
        name: 'Cultural Concepts',
        description: 'Passages with culture-specific terms and concepts',
        icon: '🏛️',
        passages: [
          {
            id: 'kinsman-redeemer',
            name: 'Kinsman Redeemer',
            description: 'Cultural concept of redemption',
            ranges: [
              { book: 'rut', startChapter: 3, startVerse: 1, endChapter: 4, endVerse: 22 }
            ]
          },
          {
            id: 'temple-worship',
            name: 'Temple Worship',
            description: 'Sacrificial system and temple practices',
            ranges: [
              { book: 'lev', startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 17 }
            ]
          }
        ]
      },
      {
        id: 'theological-terms',
        name: 'Theological Terms',
        description: 'Key theological concepts requiring careful translation',
        icon: '⛪',
        passages: [
          {
            id: 'justification',
            name: 'Justification by Faith',
            description: 'Core doctrine of justification',
            ranges: [
              { book: 'rom', startChapter: 3, startVerse: 21, endChapter: 3, endVerse: 31 }
            ]
          },
          {
            id: 'sanctification',
            name: 'Sanctification',
            description: 'Process of being made holy',
            ranges: [
              { book: 'rom', startChapter: 6, startVerse: 1, endChapter: 6, endVerse: 14 }
            ]
          }
        ]
      },
      {
        id: 'figurative-language',
        name: 'Figurative Language',
        description: 'Metaphors, parables, and symbolic language',
        icon: '🎭',
        passages: [
          {
            id: 'vine-branches',
            name: 'Vine and Branches',
            description: 'Jesus as the vine metaphor',
            ranges: [
              { book: 'jhn', startChapter: 15, startVerse: 1, endChapter: 15, endVerse: 17 }
            ]
          },
          {
            id: 'good-shepherd',
            name: 'Good Shepherd',
            description: 'Jesus as the good shepherd',
            ranges: [
              { book: 'jhn', startChapter: 10, startVerse: 1, endChapter: 10, endVerse: 21 }
            ]
          }
        ]
      }
    ]
  }
];

// Helper functions
export const getAllPassageSets = (): PassageSet[] => {
  return DEFAULT_PASSAGE_SETS;
};

export const getPassageSetById = (id: string): PassageSet | null => {
  return DEFAULT_PASSAGE_SETS.find(set => set.id === id) || null;
};

export const getAllPassages = (): Passage[] => {
  return DEFAULT_PASSAGE_SETS.flatMap(set => 
    set.categories.flatMap(category => category.passages)
  );
};

export const formatPassageRange = (range: PassageRange): string => {
  const bookName = range.book.toUpperCase();
  
  if (!range.endChapter || (range.startChapter === range.endChapter && !range.endVerse)) {
    // Single verse or single chapter
    if (range.endVerse) {
      return `${bookName} ${range.startChapter}:${range.startVerse}`;
    } else {
      return `${bookName} ${range.startChapter}:${range.startVerse}`;
    }
  }
  
  if (range.startChapter === range.endChapter) {
    // Same chapter, verse range
    return `${bookName} ${range.startChapter}:${range.startVerse}-${range.endVerse}`;
  }
  
  // Cross-chapter range
  return `${bookName} ${range.startChapter}:${range.startVerse}-${range.endChapter}:${range.endVerse}`;
};

export const formatPassageRanges = (ranges: PassageRange[]): string => {
  return ranges.map(formatPassageRange).join(', ');
};
