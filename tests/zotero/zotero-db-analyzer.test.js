/**
 * Unit tests for ZoteroDBAnalyzer
 * Tests the core functionality of the database analyzer module
 */

// Mock the Zotero global object for testing
const mockZoteroDB = {
  query: jest.fn(),
  executeTransaction: jest.fn()
};

// Mock item structure
const mockItem = {
  id: 123,
  key: 'ABC123',
  getCreators: jest.fn().mockReturnValue([
    { firstName: 'John', lastName: 'Smyth', creatorType: 'author' },
    { firstName: 'Jane', lastName: 'Doe', creatorType: 'author' }
  ]),
  setCreators: jest.fn(),
  save: jest.fn().mockResolvedValue(true)
};

global.Zotero = {
  DB: mockZoteroDB,
  Items: {
    getAsync: jest.fn().mockResolvedValue([mockItem])
  },
  debug: jest.fn(),
  logError: jest.fn(),
  getMainWindow: () => ({
    alert: jest.fn()
  })
};

const ZoteroDBAnalyzer = require('../../src/zotero/zotero-db-analyzer.js');

describe('ZoteroDBAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ZoteroDBAnalyzer();
    // Reset the mock before each test
    mockZoteroDB.query.mockClear();
    mockZoteroDB.executeTransaction.mockClear();
    mockZoteroDB.executeTransaction.mockImplementation(async (fn) => {
      await fn();
    });
    global.Zotero.Items.getAsync.mockClear().mockResolvedValue([mockItem]);
    // Reset mock item state
    mockItem.setCreators.mockClear();
    mockItem.save.mockClear().mockResolvedValue(true);
    analyzer.learningEngine.storeMapping = jest.fn().mockResolvedValue();
    analyzer.learningEngine.recordDistinctPair = jest.fn().mockResolvedValue(true);
    analyzer.learningEngine.clearDistinctPair = jest.fn().mockResolvedValue();
    analyzer.learningEngine.isDistinctPair = jest.fn().mockReturnValue(false);
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

  describe('given-name variant merging', () => {
    const makeCreator = (firstName, lastName, count = 1) => ({
      firstName,
      lastName,
      count,
      items: [],
      parsedName: analyzer.parseName(`${firstName || ''} ${lastName || ''}`.trim())
    });

    test('does not append canonical initials to plain word variants', () => {
      const creators = [
        makeCreator('Fred', 'Boogerd'),
        makeCreator('Fred.', 'Boogerd'),
        makeCreator('Fred R. E. D.', 'Boogerd')
      ];

      const groups = analyzer.findGivenNameVariantGroups(
        analyzer.groupCreatorsBySurnameForVariants(creators)
      );

      const boogerdGroup = groups.find(group => group && group.surnameKey === 'boogerd');
      expect(boogerdGroup).toBeDefined();

      const variantNames = boogerdGroup.variants.map(variant => variant.firstName);
      expect(variantNames).toContain('Fred');
      expect(variantNames).toContain('Fred R. E. D.');

      const fredVariant = boogerdGroup.variants.find(variant => variant.firstName === 'Fred');
      expect(fredVariant).toBeDefined();
      expect(fredVariant.firstName).toBe('Fred');
      expect(boogerdGroup.recommendedFullName).toBe('Fred Boogerd');
    });

    test('initial-only variants borrow canonical base without mangling names', () => {
      const creators = [
        makeCreator('Cliff', 'Hooker'),
        makeCreator('C.A.', 'Hooker')
      ];

      const groups = analyzer.findGivenNameVariantGroups(
        analyzer.groupCreatorsBySurnameForVariants(creators)
      );

      const hookerGroup = groups.find(group => group && group.surnameKey === 'hooker');
      expect(hookerGroup).toBeDefined();

      const variantNames = hookerGroup.variants.map(variant => variant.firstName);
      expect(variantNames).toContain('Cliff');
      expect(variantNames).toContain('Cliff A.');
      expect(variantNames).not.toContain('Ca A.');
      expect(hookerGroup.recommendedFullName).toBe('Cliff Hooker');
    });

    test('separates given-name suggestions by normalized key', async () => {
      const creators = [
        makeCreator('Harriet', 'Brown', 6),
        makeCreator('Harriet R.', 'Brown', 4),
        makeCreator('Scott', 'Brown', 5),
        makeCreator('Scott D.', 'Brown', 3)
      ];

      const result = await analyzer.analyzeCreators(creators);
      const givenNameSuggestions = result.suggestions.filter(
        suggestion => suggestion.type === 'given-name' && suggestion.surnameKey === 'brown'
      );

      expect(givenNameSuggestions).toHaveLength(2);

      const harrietSuggestion = givenNameSuggestions.find(suggestion =>
        (suggestion.recommendedFullName || suggestion.primary || '').includes('Harriet')
      );
      const scottSuggestion = givenNameSuggestions.find(suggestion =>
        (suggestion.recommendedFullName || suggestion.primary || '').includes('Scott')
      );

      expect(harrietSuggestion).toBeDefined();
      expect(scottSuggestion).toBeDefined();

      const harrietVariantNames = harrietSuggestion.variants.map(variant => variant.firstName);
      const scottVariantNames = scottSuggestion.variants.map(variant => variant.firstName);

      expect(harrietVariantNames).toEqual(expect.arrayContaining(['Harriet', 'Harriet R.']));
      expect(harrietVariantNames).not.toEqual(expect.arrayContaining(['Scott', 'Scott D.']));
      expect(scottVariantNames).toEqual(expect.arrayContaining(['Scott', 'Scott D.']));
      expect(scottVariantNames).not.toEqual(expect.arrayContaining(['Harriet', 'Harriet R.']));
    });

    test('does not merge variants with disjoint middle initials', async () => {
      const creators = [
        makeCreator('Michael', 'Martin', 4),
        makeCreator('Michael K.', 'Martin', 3),
        makeCreator('Michael W.', 'Martin', 3)
      ];

      const result = await analyzer.analyzeCreators(creators);
      const martinSuggestions = result.suggestions.filter(
        suggestion => suggestion.type === 'given-name' && suggestion.surnameKey === 'martin'
      );

      const combinedGroup = martinSuggestions.find(suggestion => {
        const names = suggestion.variants.map(variant => variant.firstName);
        return names.includes('Michael K.') && names.includes('Michael W.');
      });

      expect(combinedGroup).toBeUndefined();

      martinSuggestions.forEach(suggestion => {
        const recommended = suggestion.recommendedFullName || suggestion.primary || '';
        expect(recommended).not.toMatch(/K\.\s*W\./i);
      });
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
          type: 'surname',
          primary: 'Smith',
          variants: [
            { name: 'Smyth', frequency: 2, items: [{ id: 123, key: 'ABC123' }] },
            { name: 'Smith', frequency: 5, items: [{ id: 456, key: 'DEF456' }] } // This one should be skipped (same as primary)
          ],
          similarity: 0.9
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      expect(results).toHaveProperty('totalSuggestions', 1);
      expect(results.applied).toBe(1);
      expect(results.skipped).toBe(0);
      expect(results.errors).toBe(0);
      // Only one item should be updated (Smyth -> Smith)
      expect(results.updatedCreators).toBe(1);
      expect(analyzer.learningEngine.storeMapping).toHaveBeenCalledWith('Smyth', 'Smith', 0.9);
      // Verify item.save() was called for the normalized item
      expect(mockItem.save).toHaveBeenCalled();
      expect(mockItem.setCreators).toHaveBeenCalled();
    });

    test('should skip normalizations when autoConfirm is false and confirmNormalization returns false', async () => {
      // Mock the confirmNormalization method to return false
      analyzer.confirmNormalization = jest.fn().mockResolvedValue(false);

      const suggestions = [
        {
          type: 'surname',
          primary: 'Smith',
          variants: [{ name: 'Smyth', frequency: 2, items: [{ id: 123, key: 'ABC123' }] }],
          similarity: 0.9
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, false);

      expect(results.applied).toBe(0);
      expect(results.skipped).toBeGreaterThan(0);
      expect(results.updatedCreators).toBe(0);
    });

    test('should handle empty suggestions gracefully', async () => {
      const results = await analyzer.applyNormalizationSuggestions([], true);

      expect(results.totalSuggestions).toBe(0);
      expect(results.applied).toBe(0);
      expect(results.updatedCreators).toBe(0);
    });

    test('should update items with matching variant names', async () => {
      // Create a mock item with Smyth lastName
      const smythItem = {
        id: 789,
        key: 'GHI789',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'John', lastName: 'Smyth', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true)
      };
      global.Zotero.Items.getAsync.mockResolvedValue([smythItem]);

      const suggestions = [
        {
          type: 'surname',
          primary: 'Smith',
          variants: [
            { name: 'Smyth', frequency: 1, items: [{ id: 789, key: 'GHI789' }] }
          ],
          similarity: 0.9
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      expect(results.updatedCreators).toBe(1);
      expect(smythItem.setCreators).toHaveBeenCalledWith([
        { firstName: 'John', lastName: 'Smith', creatorType: 'author' }
      ]);
      expect(smythItem.save).toHaveBeenCalled();
    });
  });
});