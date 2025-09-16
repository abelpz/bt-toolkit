/**
 * Example Usage of Hierarchical Passage Sets
 * 
 * Demonstrates various patterns and use cases for the passage sets system.
 */

import {
  PassageSet,
  PassageSetTemplate,
  TemplateConfig
} from '../types/passage-sets';
import {
  createPassageSetBuilder,
  createPassage,
  parsePassageString,
  validatePassageSet,
  getPassageSetStats,
  serializePassageSet,
  deserializePassageSet,
  loadPassageSetFromObject,
  loadPassageSetFromUrl,
  flattenPassageSet
} from '../utils/passage-sets';

// ============================================================================
// Example 1: Simple Reading Plan
// ============================================================================

export function createSimpleReadingPlan(): PassageSet {
  return createPassageSetBuilder()
    .setId('jonah-reading-plan')
    .setName('Book of Jonah - 4 Day Reading Plan')
    .setDescription('Read through the entire book of Jonah in 4 days')
    .setMetadata({
      category: 'reading-plan',
      difficulty: 2,
      audience: ['beginner', 'intermediate']
    })
    .addGroup('day1', 'Day 1: The Call and Flight', {
      description: 'Jonah receives his calling and tries to flee',
      groupType: 'sequential'
    })
    .addPassage('day1', createPassage('JON 1:1-17', {
      title: 'Jonah Flees from God',
      estimatedTime: 5,
      theme: 'obedience'
    }))
    .addGroup('day2', 'Day 2: Prayer from the Deep', {
      description: 'Jonah prays from inside the fish'
    })
    .addPassage('day2', createPassage('JON 2:1-10', {
      title: 'Jonah\'s Prayer',
      estimatedTime: 4,
      theme: 'prayer'
    }))
    .addGroup('day3', 'Day 3: Second Chance', {
      description: 'Jonah obeys and preaches to Nineveh'
    })
    .addPassage('day3', createPassage('JON 3:1-10', {
      title: 'Jonah Goes to Nineveh',
      estimatedTime: 5,
      theme: 'repentance'
    }))
    .addGroup('day4', 'Day 4: God\'s Compassion', {
      description: 'God teaches Jonah about compassion'
    })
    .addPassage('day4', createPassage('JON 4:1-11', {
      title: 'Jonah\'s Anger and God\'s Compassion',
      estimatedTime: 6,
      theme: 'compassion'
    }))
    .build();
}

// ============================================================================
// Example 2: Topical Study with Multiple Books
// ============================================================================

export function createTopicalStudy(): PassageSet {
  return createPassageSetBuilder()
    .setId('faith-study')
    .setName('Heroes of Faith Study')
    .setDescription('A study of faith through biblical characters')
    .setMetadata({
      category: 'topical-study',
      difficulty: 3,
      audience: ['intermediate', 'advanced']
    })
    .addGroup('old-testament', 'Old Testament Examples', {
      description: 'Examples of faith from the Hebrew Scriptures',
      groupType: 'parallel'
    })
    .addGroup('ot-patriarchs', 'The Patriarchs', {
      description: 'Faith of the founding fathers'
    })
    .addPassages('ot-patriarchs', [
      createPassage('GEN 12:1-9', {
        title: 'Abraham\'s Call',
        theme: 'faith',
        tags: ['abraham', 'calling', 'promise'],
        estimatedTime: 8
      }),
      createPassage('GEN 22:1-19', {
        title: 'Abraham\'s Test',
        theme: 'faith',
        tags: ['abraham', 'sacrifice', 'obedience'],
        estimatedTime: 10
      })
    ])
    .addGroup('ot-leaders', 'Leaders and Prophets', {
      description: 'Faith in leadership and prophecy'
    })
    .addPassages('ot-leaders', [
      createPassage('EXO 14:10-31', {
        title: 'Moses at the Red Sea',
        theme: 'faith',
        tags: ['moses', 'deliverance', 'miracle'],
        estimatedTime: 12
      }),
      createPassage('1KI 18:20-40', {
        title: 'Elijah on Mount Carmel',
        theme: 'faith',
        tags: ['elijah', 'prayer', 'power'],
        estimatedTime: 15
      })
    ])
    .addGroup('new-testament', 'New Testament Examples', {
      description: 'Examples of faith in the early church',
      groupType: 'parallel'
    })
    .addGroup('nt-disciples', 'The Disciples', {
      description: 'Faith development in Jesus\' followers'
    })
    .addPassages('nt-disciples', [
      createPassage('MAT 14:22-33', {
        title: 'Peter Walks on Water',
        theme: 'faith',
        tags: ['peter', 'miracle', 'doubt'],
        estimatedTime: 8
      }),
      createPassage('JOH 20:24-31', {
        title: 'Thomas Believes',
        theme: 'faith',
        tags: ['thomas', 'doubt', 'belief'],
        estimatedTime: 6
      })
    ])
    .build();
}

// ============================================================================
// Example 3: Complex Curriculum Structure
// ============================================================================

export function createCurriculumExample(): PassageSet {
  return createPassageSetBuilder()
    .setId('nt-survey-curriculum')
    .setName('New Testament Survey Course')
    .setDescription('A comprehensive study of the New Testament')
    .setMetadata({
      category: 'curriculum',
      difficulty: 4,
      audience: ['advanced'],
      totalTime: 2400 // 40 hours
    })
    .addGroup('unit1', 'Unit 1: The Gospels', {
      description: 'Study of the four Gospel accounts',
      requiresSequentialCompletion: true,
      groupType: 'sequential'
    })
    .addGroup('unit1-matthew', 'Matthew: The King', {
      description: 'Jesus as the promised Messiah'
    })
    .addPassages('unit1-matthew', [
      createPassage('MAT 1:1-17', {
        title: 'The Genealogy of Jesus',
        estimatedTime: 20,
        difficulty: 3
      }),
      createPassage('MAT 5:1-7:29', {
        title: 'The Sermon on the Mount',
        estimatedTime: 45,
        difficulty: 4
      })
    ])
    .addGroup('unit1-mark', 'Mark: The Servant', {
      description: 'Jesus as the suffering servant'
    })
    .addPassages('unit1-mark', [
      createPassage('MAR 1:1-20', {
        title: 'The Beginning of the Gospel',
        estimatedTime: 15,
        difficulty: 2
      }),
      createPassage('MAR 8:27-9:1', {
        title: 'Peter\'s Confession',
        estimatedTime: 20,
        difficulty: 3
      })
    ])
    .addGroup('unit2', 'Unit 2: Acts and Epistles', {
      description: 'The early church and apostolic letters',
      requiresSequentialCompletion: true,
      groupType: 'sequential'
    })
    .addGroup('unit2-acts', 'Acts: The Church Begins', {
      description: 'The birth and growth of the early church'
    })
    .addPassages('unit2-acts', [
      createPassage('ACT 1:1-11', {
        title: 'The Ascension',
        estimatedTime: 10,
        difficulty: 2
      }),
      createPassage('ACT 2:1-47', {
        title: 'Pentecost',
        estimatedTime: 30,
        difficulty: 3
      })
    ])
    .build();
}

// ============================================================================
// Example 4: Comparative Study
// ============================================================================

export function createComparativeStudy(): PassageSet {
  return createPassageSetBuilder()
    .setId('parables-comparison')
    .setName('Parables Across the Gospels')
    .setDescription('Comparing how different Gospels record Jesus\' parables')
    .setMetadata({
      category: 'comparative-study',
      difficulty: 4
    })
    .addGroup('sower-parable', 'The Parable of the Sower', {
      description: 'Compare the three accounts of the sower parable',
      groupType: 'parallel',
      readTogether: true
    })
    .addPassages('sower-parable', [
      createPassage('MAT 13:1-23', {
        title: 'Matthew\'s Account',
        tags: ['parable', 'sower', 'matthew']
      }),
      createPassage('MAR 4:1-20', {
        title: 'Mark\'s Account',
        tags: ['parable', 'sower', 'mark']
      }),
      createPassage('LUK 8:4-15', {
        title: 'Luke\'s Account',
        tags: ['parable', 'sower', 'luke']
      })
    ])
    .addGroup('mustard-seed', 'The Mustard Seed Parable', {
      description: 'Compare the mustard seed parable accounts',
      groupType: 'parallel'
    })
    .addPassages('mustard-seed', [
      createPassage('MAT 13:31-32', {
        title: 'Matthew\'s Version',
        tags: ['parable', 'mustard-seed', 'matthew']
      }),
      createPassage('MAR 4:30-32', {
        title: 'Mark\'s Version',
        tags: ['parable', 'mustard-seed', 'mark']
      }),
      createPassage('LUK 13:18-19', {
        title: 'Luke\'s Version',
        tags: ['parable', 'mustard-seed', 'luke']
      })
    ])
    .build();
}

// ============================================================================
// Example Usage Functions
// ============================================================================

/**
 * Demonstrate basic usage of the passage sets system
 */
export function demonstrateBasicUsage() {
  console.log('=== Hierarchical Passage Sets Demo ===\n');
  
  // Create a simple reading plan
  const readingPlan = createSimpleReadingPlan();
  console.log('Created reading plan:', readingPlan.name);
  
  // Validate the passage set
  const validation = validatePassageSet(readingPlan);
  console.log('Validation result:', validation.isValid ? 'VALID' : 'INVALID');
  if (!validation.isValid) {
    console.log('Errors:', validation.errors);
  }
  
  // Get statistics
  const stats = getPassageSetStats(readingPlan);
  console.log('Statistics:', {
    totalPassages: stats.totalPassages,
    books: stats.bookList,
    totalTime: stats.totalEstimatedTime + ' minutes'
  });
  
  console.log('\n=== Topical Study Demo ===\n');
  
  // Create a topical study
  const topicalStudy = createTopicalStudy();
  console.log('Created topical study:', topicalStudy.name);
  
  const topicalStats = getPassageSetStats(topicalStudy);
  console.log('Topical study statistics:', {
    totalPassages: topicalStats.totalPassages,
    books: topicalStats.bookList,
    themes: topicalStats.themes,
    tags: topicalStats.tags.slice(0, 5) // Show first 5 tags
  });
}

/**
 * Example of parsing individual passages
 */
export function demonstratePassageParsing() {
  console.log('\n=== Passage Parsing Demo ===\n');
  
  const examples = [
    'JON 1:5-8',
    'MAT 5:1-7:29',
    'GEN 12:1-9',
    'PSA 23',
    'ROM 8:28-39'
  ];
  
  examples.forEach(example => {
    try {
      const parsed = parsePassageString(example);
      console.log(`"${example}" ->`, {
        book: parsed.bookCode,
        ref: parsed.ref
      });
    } catch (error) {
      console.log(`"${example}" -> ERROR:`, error.message);
    }
  });
}

// ============================================================================
// Template Configurations
// ============================================================================

export const templateConfigs: Record<PassageSetTemplate, TemplateConfig> = {
  'reading-plan': {
    template: 'reading-plan',
    parameters: {
      duration: 30, // 30 days
      frequency: 'daily',
      difficulty: 'beginner'
    }
  },
  'topical-study': {
    template: 'topical-study',
    parameters: {
      difficulty: 'intermediate'
    }
  },
  'curriculum': {
    template: 'curriculum',
    parameters: {
      duration: 12, // 12 weeks
      frequency: 'weekly',
      difficulty: 'advanced'
    }
  },
  'devotional': {
    template: 'devotional',
    parameters: {
      frequency: 'daily',
      difficulty: 'beginner'
    }
  },
  'comparative': {
    template: 'comparative',
    parameters: {
      difficulty: 'advanced'
    }
  },
  'chronological': {
    template: 'chronological',
    parameters: {
      duration: 365, // 1 year
      frequency: 'daily',
      difficulty: 'intermediate'
    }
  },
  'custom': {
    template: 'custom',
    parameters: {}
  }
};

// ============================================================================
// JSON Loading and Saving Examples
// ============================================================================

/**
 * Demonstrate JSON serialization and deserialization
 */
export function demonstrateJsonHandling() {
  console.log('\n=== JSON Serialization Demo ===\n');
  
  // Create a passage set
  const readingPlan = createSimpleReadingPlan();
  
  // Serialize to JSON
  const jsonString = serializePassageSet(readingPlan);
  console.log('Serialized to JSON:', jsonString.substring(0, 200) + '...');
  
  // Deserialize from JSON
  const loadedPassageSet = deserializePassageSet(jsonString);
  console.log('Loaded from JSON:', {
    id: loadedPassageSet.id,
    name: loadedPassageSet.name,
    rootNodes: loadedPassageSet.root.length
  });
  
  // Verify they're equivalent
  const originalStats = getPassageSetStats(readingPlan);
  const loadedStats = getPassageSetStats(loadedPassageSet);
  console.log('Stats match:', JSON.stringify(originalStats) === JSON.stringify(loadedStats));
}

/**
 * Example JSON structure for a simple passage set
 */
export const exampleJsonPassageSet = {
  "id": "sample-reading-plan",
  "name": "Sample Reading Plan",
  "description": "A simple example of a JSON passage set",
  "version": "1.0.0",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "metadata": {
    "category": "reading-plan",
    "difficulty": 2,
    "audience": ["beginner"]
  },
  "root": [
    {
      "id": "week1",
      "type": "group",
      "label": "Week 1: Getting Started",
      "description": "Introduction to the study",
      "groupType": "sequential",
      "children": [
        {
          "id": "day1-passages",
          "type": "passage",
          "label": "Day 1: Creation",
          "passages": [
            {
              "bookCode": "GEN",
              "ref": "1:1-31",
              "label": "The Creation Account",
              "metadata": {
                "title": "In the Beginning",
                "theme": "creation",
                "estimatedTime": 10,
                "difficulty": 1
              }
            }
          ]
        },
        {
          "id": "day2-passages",
          "type": "passage", 
          "label": "Day 2: The Fall",
          "passages": [
            {
              "bookCode": "GEN",
              "ref": {
                "startChapter": 3,
                "startVerse": 1,
                "endVerse": 24
              },
              "label": "The Fall of Humanity",
              "metadata": {
                "title": "Paradise Lost",
                "theme": "sin",
                "estimatedTime": 8,
                "difficulty": 2
              }
            }
          ]
        }
      ]
    }
  ]
};

/**
 * Demonstrate loading from a plain object
 */
export function demonstrateObjectLoading() {
  console.log('\n=== Object Loading Demo ===\n');
  
  try {
    // Load from the example object
    const passageSet = loadPassageSetFromObject(exampleJsonPassageSet);
    console.log('Successfully loaded passage set:', passageSet.name);
    
    const stats = getPassageSetStats(passageSet);
    console.log('Loaded passage set stats:', {
      totalPassages: stats.totalPassages,
      books: stats.bookList,
      totalTime: stats.totalEstimatedTime
    });
    
    // Demonstrate both ref formats work
    const flattened = flattenPassageSet(passageSet);
    flattened.passages.forEach((passage: any, index: number) => {
      console.log(`Passage ${index + 1}:`, {
        book: passage.bookCode,
        ref: passage.ref,
        refType: typeof passage.ref
      });
    });
    
  } catch (error) {
    console.error('Failed to load passage set:', error.message);
  }
}

/**
 * Example of loading from a remote URL (browser environment)
 */
export async function demonstrateUrlLoading() {
  console.log('\n=== URL Loading Demo ===\n');
  
  try {
    // This would work in a browser environment with a real URL
    // const passageSet = await loadPassageSetFromUrl('https://example.com/passage-sets/jonah-plan.json');
    
    // For demo purposes, simulate with a mock fetch
    console.log('Would load from URL: https://example.com/passage-sets/jonah-plan.json');
    console.log('In a real environment, this would fetch and parse the JSON automatically');
    
  } catch (error) {
    console.log('URL loading would handle errors gracefully:', error.message);
  }
}

/**
 * Example of handling malformed JSON
 */
export function demonstrateErrorHandling() {
  console.log('\n=== Error Handling Demo ===\n');
  
  const malformedExamples = [
    // Missing required fields
    { name: "Missing ID" },
    
    // Invalid book code
    {
      id: "test",
      name: "Test",
      version: "1.0.0",
      root: [{
        id: "node1",
        type: "passage",
        label: "Test",
        passages: [{
          bookCode: "INVALID", // Should be 3 letters
          ref: "1:1"
        }]
      }]
    },
    
    // Invalid reference format
    {
      id: "test2",
      name: "Test 2", 
      version: "1.0.0",
      root: [{
        id: "node2",
        type: "passage",
        label: "Test",
        passages: [{
          bookCode: "GEN",
          ref: {
            startChapter: "not-a-number" // Should be number
          }
        }]
      }]
    }
  ];
  
  malformedExamples.forEach((example, index) => {
    try {
      loadPassageSetFromObject(example);
      console.log(`Example ${index + 1}: Unexpectedly succeeded`);
    } catch (error) {
      console.log(`Example ${index + 1}: Correctly failed - ${error.message}`);
    }
  });
}

// Export all examples for testing
export const examples = {
  simpleReadingPlan: createSimpleReadingPlan(),
  topicalStudy: createTopicalStudy(),
  curriculum: createCurriculumExample(),
  comparativeStudy: createComparativeStudy(),
  
  // JSON examples
  jsonExample: exampleJsonPassageSet,
  
  // Demo functions
  demonstrateJsonHandling,
  demonstrateObjectLoading,
  demonstrateUrlLoading,
  demonstrateErrorHandling
};
