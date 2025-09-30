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
jest.mock('../../src/core/ner-processor.js', () => {
  return jest.fn().mockImplementation(() => {
    return {};
  });
});

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
      expect(candidateFinder.nerProcessor).toBeDefined();
      expect(candidateFinder.learningEngine).toBeDefined();
      expect(candidateFinder.nameParser).toBeDefined();
      expect(candidateFinder.variantGenerator).toBeDefined();
    });
  });

  describe('groupCreatorsBySurname', () => {
    test('should group creators by surname', () => {
      const creators = [
        { firstName: 'John', lastName: 'Smith', creatorType: 'author' },
        { firstName: 'Jane', lastName: 'Smith', creatorType: 'author' },
        { firstName: 'Bob', lastName: 'Johnson', creatorType: 'editor' }
      ];
      
      const result = candidateFinder.groupCreatorsBySurname(creators);
      
      // Should group by last name
      expect(result).toHaveProperty('smith');
      expect(result).toHaveProperty('johnson');
      
      // Smith group should have 2 entries
      expect(result.smith).toHaveLength(2);
      
      // Johnson group should have 1 entry
      expect(result.johnson).toHaveLength(1);
    });
  });

  describe('findFirstInitialVariations', () => {
    test('should find variations between names with initials', () => {
      const creatorsWithSameSurname = [
        { firstName: 'John', lastName: 'Smith', creatorType: 'author' },
        { firstName: 'J.', lastName: 'Smith', creatorType: 'author' },
        { firstName: 'Jack', lastName: 'Smith', creatorType: 'author' }
      ];
      
      const result = candidateFinder.findFirstInitialVariations(creatorsWithSameSurname);
      
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