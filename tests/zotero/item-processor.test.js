/**
 * Unit tests for ItemProcessor
 * Tests the processing of Zotero items for name normalization
 */

const ItemProcessor = require('../../src/zotero/item-processor.js');

// Mock the Zotero global object for testing
global.Zotero = {
  debug: jest.fn()
};

describe('ItemProcessor', () => {
  let itemProcessor;

  beforeEach(() => {
    itemProcessor = new ItemProcessor();
  });

  describe('constructor', () => {
    test('should initialize with all required components', () => {
      expect(itemProcessor.nameParser).toBeDefined();
      expect(itemProcessor.variantGenerator).toBeDefined();
      expect(itemProcessor.learningEngine).toBeDefined();
      expect(itemProcessor.candidateFinder).toBeDefined();
    });
  });

  describe('buildRawName', () => {
    test('should build raw name from creator with both first and last names', () => {
      const creator = { firstName: 'John', lastName: 'Smith' };
      const rawName = itemProcessor.buildRawName(creator);
      expect(rawName).toBe('John Smith');
    });

    test('should handle creator with only first name', () => {
      const creator = { firstName: 'John', lastName: '' };
      const rawName = itemProcessor.buildRawName(creator);
      expect(rawName).toBe('John');
    });

    test('should handle creator with only last name', () => {
      const creator = { firstName: '', lastName: 'Smith' };
      const rawName = itemProcessor.buildRawName(creator);
      expect(rawName).toBe('Smith');
    });

    test('should return empty string for creator with no names', () => {
      const creator = { firstName: '', lastName: '' };
      const rawName = itemProcessor.buildRawName(creator);
      expect(rawName).toBe('');
    });
  });

  describe('parseNameFromFullString', () => {
    test('should parse a full name string correctly', () => {
      const result = itemProcessor.parseNameFromFullString('John Smith');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Smith');
      expect(result.fieldMode).toBe(0);
    });

    test('should handle name with middle initial', () => {
      const result = itemProcessor.parseNameFromFullString('John A. Smith');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Smith');
    });
  });

  describe('processItemCreators', () => {
    test('should process creators in an item', async () => {
      const mockItem = {
        getCreators: () => [
          { firstName: 'John', lastName: 'Smith', creatorType: 'author' },
          { firstName: 'Jane', lastName: 'Doe', creatorType: 'editor' }
        ]
      };

      const results = await itemProcessor.processItemCreators(mockItem);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('original');
      expect(results[0]).toHaveProperty('status');
      expect(results[0].original.firstName).toBe('John');
      expect(results[0].original.lastName).toBe('Smith');
      expect(results[1].original.firstName).toBe('Jane');
      expect(results[1].original.lastName).toBe('Doe');
    });

    test('should handle learned mappings', async () => {
      // Mock the learning engine to return a learned mapping
      jest.spyOn(itemProcessor.learningEngine, 'getMapping')
        .mockReturnValue('John Smith Jr');

      const mockItem = {
        getCreators: () => [
          { firstName: 'John', lastName: 'Smith', creatorType: 'author' }
        ]
      };

      const results = await itemProcessor.processItemCreators(mockItem);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('learned');
      expect(results[0]).toHaveProperty('suggestion', 'John Smith Jr');
    });

    test('should handle creators with variants and similars', async () => {
      // Mock the learning engine to return no learned mapping
      jest.spyOn(itemProcessor.learningEngine, 'getMapping')
        .mockReturnValue(null);
      
      // Mock similar names
      jest.spyOn(itemProcessor.learningEngine, 'findSimilar')
        .mockReturnValue([{ raw: 'John Smith', normalized: 'John A. Smith', similarity: 0.9 }]);

      const mockItem = {
        getCreators: () => [
          { firstName: 'John', lastName: 'Smith', creatorType: 'author' }
        ]
      };

      const results = await itemProcessor.processItemCreators(mockItem);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('new');
      expect(results[0]).toHaveProperty('similars');
      expect(results[0]).toHaveProperty('variants');
    });

    test('should skip creators with no names', async () => {
      const mockItem = {
        getCreators: () => [
          { firstName: '', lastName: '', creatorType: 'author' },
          { firstName: 'John', lastName: 'Smith', creatorType: 'editor' }
        ]
      };

      const results = await itemProcessor.processItemCreators(mockItem);

      expect(results).toHaveLength(1); // Only one result, not two
      expect(results[0].original.firstName).toBe('John');
      expect(results[0].original.lastName).toBe('Smith');
    });
  });

  describe('findLibraryWideVariants', () => {
    test('should return empty array for library variant scan', async () => {
      const variants = await itemProcessor.findLibraryWideVariants('Smith');
      expect(variants).toEqual([]);
    });
  });

  describe('applyNormalizations', () => {
    test('should apply accepted normalizations and store mappings', async () => {
      const mockItem = { getField: jest.fn(() => 'Test Title') };
      const normalizations = [
        {
          original: { firstName: 'J.', lastName: 'Smith', creatorType: 'author' },
          normalized: { firstName: 'John', lastName: 'Smith', creatorType: 'author' },
          accepted: true,
          source: 'learned'
        },
        {
          original: { firstName: 'Jane', lastName: 'Doe', creatorType: 'editor' },
          normalized: { firstName: 'Jane', lastName: 'Doe', creatorType: 'editor' },
          accepted: false, // Not accepted, so shouldn't be processed
          source: 'original'
        }
      ];

      // Spy on the learning engine to verify storeMapping is called
      const storeMappingSpy = jest.spyOn(itemProcessor.learningEngine, 'storeMapping')
        .mockResolvedValue();

      await itemProcessor.applyNormalizations(mockItem, normalizations);

      // Only the accepted normalization should have triggered a storeMapping call
      expect(storeMappingSpy).toHaveBeenCalledTimes(1);
      expect(storeMappingSpy).toHaveBeenCalledWith('J. Smith', 'John Smith');
    });
  });

  describe('performLibraryAnalysis', () => {
    test('should analyze multiple items and find surname frequencies', async () => {
      const mockItems = [
        {
          getCreators: () => [
            { firstName: 'John', lastName: 'Smith', creatorType: 'author' },
            { firstName: 'Jane', lastName: 'Johnson', creatorType: 'editor' }
          ]
        },
        {
          getCreators: () => [
            { firstName: 'Bob', lastName: 'Smith', creatorType: 'author' }  // Another Smith
          ]
        }
      ];

      const result = await itemProcessor.performLibraryAnalysis(mockItems);

      expect(result.surnameFrequencies).toHaveProperty('smith', 2); // Two Smiths
      expect(result.surnameFrequencies).toHaveProperty('johnson', 1); // One Johnson
      expect(result.totalNames).toBe(3); // Total of 3 names
      expect(result.uniqueSurnames).toBe(2); // Two unique surnames
    });

    test('should find potential variants with high similarity', async () => {
      const mockItems = [
        {
          getCreators: () => [
            { firstName: 'John', lastName: 'Smith', creatorType: 'author' },
            { firstName: 'J.', lastName: 'Smith', creatorType: 'author' } // Similar to John Smith
          ]
        }
      ];

      const result = await itemProcessor.performLibraryAnalysis(mockItems);

      // We expect to find variants for similar surnames
      expect(Array.isArray(result.potentialVariants)).toBe(true);
      
      // If any variants were found, check their properties
      for (const variant of result.potentialVariants) {
        expect(variant).toHaveProperty('name1');
        expect(variant).toHaveProperty('name2');
        expect(variant).toHaveProperty('frequency1');
        expect(variant).toHaveProperty('frequency2');
        expect(variant).toHaveProperty('similarity');
        expect(variant.similarity).toBeGreaterThanOrEqual(0.8); // 80% threshold
      }
    });
  });

  describe('calculateLevenshteinDistance', () => {
    test('should return 0 for identical strings', () => {
      expect(itemProcessor.calculateLevenshteinDistance('Smith', 'Smith')).toBe(0);
    });

    test('should return correct distance for different strings', () => {
      // "Smith" -> "Smyth" requires 1 substitution
      expect(itemProcessor.calculateLevenshteinDistance('Smith', 'Smyth')).toBe(1);
      
      // "Smith" -> "SMith" requires 1 substitution
      expect(itemProcessor.calculateLevenshteinDistance('Smith', 'SMith')).toBe(1);
      
      // "Smith" -> "" requires 5 deletions
      expect(itemProcessor.calculateLevenshteinDistance('Smith', '')).toBe(5);
      
      // "" -> "Smith" requires 5 insertions
      expect(itemProcessor.calculateLevenshteinDistance('', 'Smith')).toBe(5);
    });
  });
});