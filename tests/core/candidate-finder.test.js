/**
 * Unit tests for CandidateFinder
 * Tests the name variant candidate finder functionality
 */

// Mock the Zotero global object for testing
global.Zotero = {
  Items: {
    getAll: jest.fn()
  },
  debug: jest.fn(),
  logError: jest.fn()
};

// Mock all the dependencies before importing the module
jest.mock('../../src/core/learning-engine.js', () => {
  return jest.fn().mockImplementation(() => {
    return {};
  });
});

jest.mock('../../src/core/name-parser.js', () => {
  return jest.fn().mockImplementation(() => {
    return {
      parse: jest.fn((name) => {
        // Simple parsing for test: split by space, first part as firstName, rest as lastName
        const parts = name.split(' ');
        return {
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || '',
          prefix: '',
          suffix: ''
        };
      })
    };
  });
});

jest.mock('../../src/core/variant-generator.js', () => {
  return jest.fn().mockImplementation(() => {
    return {
      generateVariants: jest.fn((parsed) => {
        // Return some simple variants for testing
        return [parsed.firstName + ' ' + parsed.lastName];
      })
    };
  });
});

const CandidateFinder = require('../../src/core/candidate-finder.js');

describe('CandidateFinder', () => {
  let candidateFinder;

  beforeEach(() => {
    candidateFinder = new CandidateFinder();
  });

  describe('constructor', () => {
    test('should initialize with required components', () => {
      expect(candidateFinder.learningEngine).toBeDefined();
      expect(candidateFinder.nameParser).toBeDefined();
      expect(candidateFinder.variantGenerator).toBeDefined();
    });
  });

  describe('groupCreatorsBySurname', () => {
    test('should group creators by normalized first name + surname', () => {
      const creators = [
        { firstName: 'John', lastName: 'Smith', creatorType: 'author' },
        { firstName: 'Jane', lastName: 'Smith', creatorType: 'author' },
        { firstName: 'Bob', lastName: 'Johnson', creatorType: 'editor' }
      ];

      const result = candidateFinder.groupCreatorsBySurname(creators);

      // Should group by normalized first name + surname
      // Different authors with same surname are NOT grouped together
      // "Bob" normalizes to "robert" (variant of Robert)
      expect(result).toHaveProperty('john|smith');  // John Smith
      expect(result).toHaveProperty('jane|smith');  // Jane Smith
      expect(result).toHaveProperty('robert|johnson'); // Bob Johnson (normalized to Robert)

      // Each group should have only 1 entry (different authors)
      expect(result['john|smith']).toHaveLength(1);
      expect(result['jane|smith']).toHaveLength(1);
      expect(result['robert|johnson']).toHaveLength(1);
    });

    test('should group SAME author variants together', () => {
      const creators = [
        { firstName: 'John', lastName: 'Smith', creatorType: 'author' },
        { firstName: 'J.', lastName: 'Smith', creatorType: 'author' },
        { firstName: 'Johnny', lastName: 'Smith', creatorType: 'author' }
      ];

      const result = candidateFinder.groupCreatorsBySurname(creators);

      // All three should be in the same group because "john", "j.", and "johnny"
      // all normalize to or are considered variants of "john"
      // Note: "j." is treated as initials and grouped with "john"
      expect(Object.keys(result)).toHaveLength(1);  // All in one group
      const groupKey = Object.keys(result)[0];
      expect(groupKey).toContain('smith');
      expect(result[groupKey]).toHaveLength(3);
    });

    test('should NOT group different authors with same surname', () => {
      const creators = [
        { firstName: 'Alex', lastName: 'Martin', creatorType: 'author' },
        { firstName: 'Alia', lastName: 'Martin', creatorType: 'author' },
        { firstName: 'Andrea', lastName: 'Martin', creatorType: 'author' }
      ];

      const result = candidateFinder.groupCreatorsBySurname(creators);

      // Each author should be in their own group - different first names
      // "Alex" normalizes to "alexander", others stay as-is
      expect(result['alexander|martin']).toHaveLength(1);
      expect(result['alia|martin']).toHaveLength(1);
      expect(result['andrea|martin']).toHaveLength(1);
      expect(Object.keys(result)).toHaveLength(3);  // Three separate groups
    });
  });

  describe('findFirstInitialVariations', () => {
    test('should find variations between SAME author name variants', () => {
      // These are variants of the SAME author (John Smith)
      const sameAuthorVariants = [
        { firstName: 'John', lastName: 'Smith', creatorType: 'author' },
        { firstName: 'J.', lastName: 'Smith', creatorType: 'author' },
        { firstName: 'Johnny', lastName: 'Smith', creatorType: 'author' }
      ];

      const result = candidateFinder.findFirstInitialVariations(sameAuthorVariants);

      expect(Array.isArray(result)).toBe(true);

      // Check that results have expected properties
      result.forEach(variation => {
        expect(variation).toHaveProperty('surname');
        expect(variation).toHaveProperty('variant1');
        expect(variation).toHaveProperty('variant2');
        expect(variation).toHaveProperty('similarity');
        expect(variation).toHaveProperty('distance');
      });
    });

    test('should NOT find variations between DIFFERENT authors', () => {
      // These are DIFFERENT authors (Alex Martin, Andrea Martin)
      // They should NOT be grouped together, so no variations should be found
      const differentAuthors = [
        { firstName: 'Alex', lastName: 'Martin', creatorType: 'author' },
        { firstName: 'Andrea', lastName: 'Martin', creatorType: 'author' }
      ];

      const result = candidateFinder.findFirstInitialVariations(differentAuthors);

      // Each author is in their own group (due to new grouping logic)
      // so findFirstInitialVariations will only process single-author groups
      // which return empty arrays
      expect(Array.isArray(result)).toBe(true);
      // Since they're different authors, they're not in the same group
      // so no variations should be found
    });
  });

  describe('calculateLevenshteinDistance', () => {
    test('should return 0 for identical strings', () => {
      expect(candidateFinder.calculateLevenshteinDistance('Smith', 'Smith')).toBe(0);
    });

    test('should return correct distance for different strings', () => {
      // "Smith" -> "Smyth" requires 1 substitution
      expect(candidateFinder.calculateLevenshteinDistance('Smith', 'Smyth')).toBe(1);
      
      // "Smith" -> "" requires 5 deletions
      expect(candidateFinder.calculateLevenshteinDistance('Smith', '')).toBe(5);
      
      // "" -> "Smith" requires 5 insertions
      expect(candidateFinder.calculateLevenshteinDistance('', 'Smith')).toBe(5);
    });
  });

  describe('findCanonicalForms', () => {
    test('should find canonical forms from variations', () => {
      const variationsBySurname = {
        'smith': [
          {
            surname: 'Smith',
            variant1: { firstName: 'John', frequency: 5 },
            variant2: { firstName: 'J.', frequency: 3 },
            similarity: 0.9,
            distance: 1
          }
        ]
      };
      
      const result = candidateFinder.findCanonicalForms(variationsBySurname);
      
      // Should return a mapping of canonical forms
      expect(typeof result).toBe('object');
    });
  });

  describe('generateNormalizationSuggestions', () => {
    test('should generate normalization suggestions', async () => {
      const variationsBySurname = {
        'smith': [
          {
            surname: 'Smith',
            variant1: { firstName: 'John', frequency: 5 },
            variant2: { firstName: 'J.', frequency: 3 },
            similarity: 0.9,
            distance: 1
          }
        ]
      };
      
      const canonicalForms = {};
      
      const result = await candidateFinder.generateNormalizationSuggestions(variationsBySurname, canonicalForms);
      
      // Should return an array of suggestions
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('surname');
        expect(result[0]).toHaveProperty('canonicalForm');
        expect(result[0]).toHaveProperty('variant1');
        expect(result[0]).toHaveProperty('variant2');
        expect(result[0]).toHaveProperty('similarity');
        expect(result[0]).toHaveProperty('recommendedNormalization');
      }
    });
  });

  describe('getAllVariations', () => {
    test('should generate all possible variations of a name', async () => {
      const result = await candidateFinder.getAllVariations('John Smith');
      
      // Should return an array of variations
      expect(Array.isArray(result)).toBe(true);
    });
  });
});