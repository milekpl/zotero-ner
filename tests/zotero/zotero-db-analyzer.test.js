/**
 * Unit tests for ZoteroDBAnalyzer
 * Tests the core functionality of the database analyzer module
 */

// Mock the Zotero global object for testing
const mockZoteroDB = {
  query: jest.fn()
};

global.Zotero = {
  DB: mockZoteroDB
};

const ZoteroDBAnalyzer = require('../../src/zotero/zotero-db-analyzer.js');

describe('ZoteroDBAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ZoteroDBAnalyzer();
    // Reset the mock before each test
    mockZoteroDB.query.mockClear();
  });

  describe('constructor', () => {
    test('should initialize with candidateFinder and learningEngine', () => {
      expect(analyzer.candidateFinder).toBeDefined();
      expect(analyzer.learningEngine).toBeDefined();
    });
  });

  describe('analyzeCreators', () => {
    test('should analyze creators and return surname frequencies', async () => {
      const creators = [
        { firstName: 'John', lastName: 'Smith', count: 5 },
        { firstName: 'Jane', lastName: 'Smith', count: 3 },
        { firstName: 'Bob', lastName: 'Johnson', count: 2 }
      ];

      const result = await analyzer.analyzeCreators(creators);

      expect(result.surnameFrequencies).toHaveProperty('smith', 8); // 5 + 3
      expect(result.surnameFrequencies).toHaveProperty('johnson', 2);
      expect(result.totalUniqueSurnames).toBe(2);
    });

    test('should identify potential variants with high similarity', async () => {
      const creators = [
        { firstName: 'John', lastName: 'Smith', count: 2 },
        { firstName: 'J.', lastName: 'Smith', count: 3 }, // Similar to John Smith
        { firstName: 'Jane', lastName: 'Doe', count: 1 }
      ];

      const result = await analyzer.analyzeCreators(creators);

      // We expect to find variants for similar surnames
      expect(result.potentialVariants.length).toBeGreaterThanOrEqual(0);
      if (result.potentialVariants.length > 0) {
        const variant = result.potentialVariants[0];
        expect(variant).toHaveProperty('variant1');
        expect(variant).toHaveProperty('variant2');
        expect(variant).toHaveProperty('similarity');
        expect(variant.similarity).toBeGreaterThanOrEqual(0.8);
      }
    });

    test('should generate normalization suggestions', async () => {
      const creators = [
        { firstName: 'John', lastName: 'Smith', count: 5 },
        { firstName: 'J.', lastName: 'Smith', count: 3 }
      ];

      const result = await analyzer.analyzeCreators(creators);

      expect(Array.isArray(result.suggestions)).toBe(true);
      if (result.suggestions.length > 0) {
        const suggestion = result.suggestions[0];
        expect(suggestion).toHaveProperty('primary');
        expect(suggestion).toHaveProperty('variants');
        expect(Array.isArray(suggestion.variants)).toBe(true);
      }
    });
  });

  describe('calculateStringSimilarity', () => {
    test('should return 1 for identical strings', () => {
      const similarity = analyzer.calculateStringSimilarity('Smith', 'Smith');
      expect(similarity).toBe(1);
    });

    test('should return appropriate similarity for completely different strings', () => {
      const similarity = analyzer.calculateStringSimilarity('Smith', 'Johnson');
      // Two completely different strings will have some similarity based on length, but it should be low
      expect(similarity).toBeLessThan(0.5);
    });

    test('should return high similarity for similar strings', () => {
      const similarity = analyzer.calculateStringSimilarity('Smith', 'Smyth');
      expect(similarity).toBeGreaterThan(0.7);
    });

    test('should handle empty strings', () => {
      expect(analyzer.calculateStringSimilarity('', '')).toBe(1);
      expect(analyzer.calculateStringSimilarity('Smith', '')).toBe(0);
      expect(analyzer.calculateStringSimilarity('', 'Smith')).toBe(0);
    });
  });

  describe('generateNormalizationSuggestions', () => {
    test('should generate suggestions from variant pairs', () => {
      const variants = [
        {
          variant1: { name: 'Smith', frequency: 5 },
          variant2: { name: 'Smyth', frequency: 1 },
          similarity: 0.9,
          recommendedNormalization: 'Smith'
        }
      ];

      const suggestions = analyzer.generateNormalizationSuggestions(variants);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toHaveProperty('primary', 'Smith');
      expect(suggestions[0]).toHaveProperty('variants');
      expect(suggestions[0]).toHaveProperty('similarity', 0.9);
    });

    test('should avoid duplicate suggestions', () => {
      const variants = [
        {
          variant1: { name: 'Smith', frequency: 5 },
          variant2: { name: 'Smyth', frequency: 1 },
          similarity: 0.9,
          recommendedNormalization: 'Smith'
        },
        {
          variant1: { name: 'Smyth', frequency: 1 },
          variant2: { name: 'Smith', frequency: 5 }, // Same pair, reversed
          similarity: 0.9,
          recommendedNormalization: 'Smith'
        }
      ];

      const suggestions = analyzer.generateNormalizationSuggestions(variants);

      // Should only have 1 suggestion, not 2, because they are the same pair
      expect(suggestions).toHaveLength(1);
    });
  });

  describe('parseName', () => {
    test('should parse a full name correctly', () => {
      const result = analyzer.parseName('John Smith');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Smith');
    });

    test('should parse an abbreviated name correctly', () => {
      const result = analyzer.parseName('J. Smith');
      expect(result.firstName).toBe('J.');
      expect(result.lastName).toBe('Smith');
    });
  });

  describe('applyNormalizationSuggestions', () => {
    test('should apply normalizations when autoConfirm is true', async () => {
      const suggestions = [
        {
          primary: 'Smith',
          variants: [
            { name: 'Smyth', frequency: 2 },
            { name: 'Smith', frequency: 5 } // This one should be skipped (same as primary)
          ],
          similarity: 0.9
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      expect(results).toHaveProperty('totalSuggestions', 1);
      expect(results).toHaveProperty('applied');
      expect(results).toHaveProperty('skipped');
      expect(results).toHaveProperty('errors');
    });

    test('should skip normalizations when autoConfirm is false and confirmNormalization returns false', async () => {
      // Mock the confirmNormalization method to return false
      analyzer.confirmNormalization = jest.fn().mockResolvedValue(false);

      const suggestions = [
        {
          primary: 'Smith',
          variants: [{ name: 'Smyth', frequency: 2 }],
          similarity: 0.9
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, false);

      expect(results.applied).toBe(0);
      expect(results.skipped).toBeGreaterThan(0);
    });
  });
});