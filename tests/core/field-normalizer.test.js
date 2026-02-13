/**
 * Unit tests for FieldNormalizer
 * Tests the factory pattern, lazy initialization, and normalization pipeline
 */

// Mock console methods
global.console = {
  log: jest.fn(),
  error: jest.fn()
};

// Mock Zotero global for tests
global.Zotero = {
  debug: jest.fn()
};

// Mock the learning engine and variant generator
jest.mock('../../src/core/scoped-learning-engine.js', () => {
  return jest.fn().mockImplementation(() => ({
    getScopedMapping: jest.fn().mockResolvedValue(null),
    findSimilarMappings: jest.fn().mockResolvedValue([]),
    storeScopedMapping: jest.fn().mockResolvedValue(true),
    setScope: jest.fn()
  }));
});

jest.mock('../../src/core/field-variant-generator.js', () => {
  return jest.fn().mockImplementation(() => ({
    generatePublisherVariants: jest.fn().mockReturnValue([]),
    generateLocationVariants: jest.fn().mockReturnValue([]),
    generateJournalVariants: jest.fn().mockReturnValue([]),
    generateFieldCanonical: jest.fn().mockReturnValue(''),
    toTitleCase: jest.fn(s => s)
  }));
});

const {
  FieldNormalizer,
  PublisherNormalizer,
  LocationNormalizer,
  JournalNormalizer
} = require('../../src/core/field-normalizer.js');

describe('FieldNormalizer', () => {
  let normalizer;

  beforeEach(() => {
    normalizer = new FieldNormalizer('test', 'testField');
    jest.clearAllMocks();
    console.log.mockClear();
    console.error.mockClear();
  });

  describe('constructor', () => {
    test('should initialize with correct fieldType and fieldName', () => {
      expect(normalizer.fieldType).toBe('test');
      expect(normalizer.fieldName).toBe('testField');
    });

    test('should set default options', () => {
      expect(normalizer.options.expandAbbreviations).toBe(true);
      expect(normalizer.options.normalizeSeparators).toBe(true);
      expect(normalizer.options.splitMultiValues).toBe(true);
      expect(normalizer.options.caseNormalization).toBe('titlecase');
      expect(normalizer.options.useLearningEngine).toBe(true);
    });

    test('should merge custom options', () => {
      const customNormalizer = new FieldNormalizer('test', 'testField', {
        expandAbbreviations: false,
        customOption: 'value'
      });
      expect(customNormalizer.options.expandAbbreviations).toBe(false);
      expect(customNormalizer.options.customOption).toBe('value');
    });

    test('should initialize lazy-loaders as null', () => {
      expect(normalizer._variantGenerator).toBeNull();
      expect(normalizer._learningEngine).toBeNull();
    });

    test('should set storageKeyPrefix', () => {
      expect(normalizer.storageKeyPrefix).toBe('field_normalizer_test_');
    });
  });

  describe('factory pattern - FieldNormalizer.create', () => {
    test('should create PublisherNormalizer for publisher type', () => {
      const publisherNormalizer = FieldNormalizer.create('publisher', 'publisher');
      expect(publisherNormalizer).toBeInstanceOf(PublisherNormalizer);
      expect(publisherNormalizer.fieldType).toBe('publisher');
    });

    test('should create PublisherNormalizer for PUBLISHER type (case insensitive)', () => {
      const publisherNormalizer = FieldNormalizer.create('PUBLISHER', 'publisher');
      expect(publisherNormalizer).toBeInstanceOf(PublisherNormalizer);
    });

    test('should create LocationNormalizer for location type', () => {
      const locationNormalizer = FieldNormalizer.create('location', 'place');
      expect(locationNormalizer).toBeInstanceOf(LocationNormalizer);
      expect(locationNormalizer.fieldType).toBe('location');
    });

    test('should create LocationNormalizer for place type', () => {
      const placeNormalizer = FieldNormalizer.create('place', 'place');
      expect(placeNormalizer).toBeInstanceOf(LocationNormalizer);
    });

    test('should create JournalNormalizer for journal type', () => {
      const journalNormalizer = FieldNormalizer.create('journal', 'publicationTitle');
      expect(journalNormalizer).toBeInstanceOf(JournalNormalizer);
      expect(journalNormalizer.fieldType).toBe('journal');
    });

    test('should create JournalNormalizer for publicationtitle type', () => {
      const pubTitleNormalizer = FieldNormalizer.create('publicationtitle', 'publicationTitle');
      expect(pubTitleNormalizer).toBeInstanceOf(JournalNormalizer);
    });

    test('should create base FieldNormalizer for unknown types', () => {
      const unknownNormalizer = FieldNormalizer.create('unknown', 'unknownField');
      expect(unknownNormalizer).toBeInstanceOf(FieldNormalizer);
      expect(unknownNormalizer.fieldType).toBe('unknown');
    });

    test('should pass options to created normalizers', () => {
      const options = { expandAbbreviations: false };
      const publisherNormalizer = FieldNormalizer.create('publisher', 'publisher', options);
      expect(publisherNormalizer.options.expandAbbreviations).toBe(false);
    });
  });

  describe('lazy initialization', () => {
    test('should lazy-load variantGenerator', () => {
      expect(normalizer._variantGenerator).toBeNull();
      const generator = normalizer.variantGenerator;
      expect(generator).toBeDefined();
      expect(normalizer._variantGenerator).not.toBeNull();
      // Same access should return same instance
      expect(normalizer.variantGenerator).toBe(generator);
    });

    test('should lazy-load learningEngine', () => {
      expect(normalizer._learningEngine).toBeNull();
      const engine = normalizer.learningEngine;
      expect(engine).toBeDefined();
      expect(normalizer._learningEngine).not.toBeNull();
      // Same access should return same instance
      expect(normalizer.learningEngine).toBe(engine);
    });

    test('should allow setting custom variantGenerator', () => {
      const customGenerator = { test: 'value' };
      normalizer.variantGenerator = customGenerator;
      expect(normalizer.variantGenerator).toBe(customGenerator);
    });

    test('should allow setting custom learningEngine', () => {
      const customEngine = { test: 'value' };
      normalizer.learningEngine = customEngine;
      expect(normalizer.learningEngine).toBe(customEngine);
    });
  });

  describe('createCanonicalKey', () => {
    test('should lowercase and trim value', () => {
      expect(normalizer.createCanonicalKey('  TEST Value  ')).toBe('test value');
    });

    test('should remove punctuation', () => {
      expect(normalizer.createCanonicalKey('test, value.!')).toBe('test value');
    });

    test('should normalize whitespace', () => {
      expect(normalizer.createCanonicalKey('test    value')).toBe('test value');
    });

    test('should return empty string for null', () => {
      expect(normalizer.createCanonicalKey(null)).toBe('');
    });

    test('should return empty string for empty string', () => {
      expect(normalizer.createCanonicalKey('')).toBe('');
    });
  });

  describe('getLearnedMapping', () => {
    test('should return mapping from learning engine', async () => {
      const expectedMapping = { original: 'test', normalized: 'result' };
      normalizer.learningEngine.getScopedMapping = jest.fn().mockResolvedValue(expectedMapping);

      const result = await normalizer.getLearnedMapping('test');

      expect(result).toEqual(expectedMapping);
      expect(normalizer.learningEngine.getScopedMapping).toHaveBeenCalled();
    });

    test('should return null on error', async () => {
      normalizer.learningEngine.getScopedMapping = jest.fn().mockRejectedValue(new Error('error'));

      const result = await normalizer.getLearnedMapping('test');

      expect(result).toBeNull();
    });
  });

  describe('findSimilarMappings', () => {
    test('should return mappings from learning engine', async () => {
      const expectedMappings = [{ raw: 'test', normalized: 'result', similarity: 0.9 }];
      normalizer.learningEngine.findSimilarMappings = jest.fn().mockResolvedValue(expectedMappings);

      const result = await normalizer.findSimilarMappings('test');

      expect(result).toEqual(expectedMappings);
      expect(normalizer.learningEngine.findSimilarMappings).toHaveBeenCalled();
    });

    test('should return empty array on error', async () => {
      normalizer.learningEngine.findSimilarMappings = jest.fn().mockRejectedValue(new Error('error'));

      const result = await normalizer.findSimilarMappings('test');

      expect(result).toEqual([]);
    });
  });

  describe('storeLearnedMapping', () => {
    test('should store mapping in learning engine', async () => {
      normalizer.learningEngine.storeScopedMapping = jest.fn().mockResolvedValue(true);

      const result = await normalizer.storeLearnedMapping('original', 'normalized', 0.9, 'collection1');

      expect(result).toBe(true);
      expect(normalizer.learningEngine.storeScopedMapping).toHaveBeenCalledWith(
        'original', 'normalized', 'test', 'collection1'
      );
    });

    test('should use default confidence', async () => {
      normalizer.learningEngine.storeScopedMapping = jest.fn().mockResolvedValue(true);

      await normalizer.storeLearnedMapping('original', 'normalized');

      expect(normalizer.learningEngine.storeScopedMapping).toHaveBeenCalledWith(
        'original', 'normalized', 'test', null
      );
    });

    test('should return false on error', async () => {
      normalizer.learningEngine.storeScopedMapping = jest.fn().mockRejectedValue(new Error('error'));

      const result = await normalizer.storeLearnedMapping('original', 'normalized');

      expect(result).toBe(false);
    });
  });

  describe('abstract method requirements', () => {
    test('generateVariants should throw error in base class', () => {
      expect(() => normalizer.generateVariants('test')).toThrow('generateVariants() must be implemented by subclass');
    });

    test('parseFieldValue should throw error in base class', () => {
      expect(() => normalizer.parseFieldValue('test')).toThrow('parseFieldValue() must be implemented by subclass');
    });

    test('extractFieldValue should throw error in base class', () => {
      expect(() => normalizer.extractFieldValue({})).toThrow('extractFieldValue() must be implemented by subclass');
    });
  });
});

describe('PublisherNormalizer', () => {
  beforeEach(() => {
    console.log.mockClear();
    console.error.mockClear();
  });

  test('should have publisher fieldType', () => {
    const normalizer = new PublisherNormalizer();
    expect(normalizer.fieldType).toBe('publisher');
    expect(normalizer.fieldName).toBe('publisher');
  });

  test('should accept custom fieldName', () => {
    const normalizer = new PublisherNormalizer('customPublisher');
    expect(normalizer.fieldName).toBe('customPublisher');
  });

  test('should generate publisher variants', () => {
    const normalizer = new PublisherNormalizer();
    normalizer.variantGenerator.generatePublisherVariants = jest.fn().mockReturnValue(['variant1']);

    const variants = normalizer.generateVariants('Test Publisher');

    expect(variants).toEqual(['variant1']);
    expect(normalizer.variantGenerator.generatePublisherVariants).toHaveBeenCalled();
  });

  test('should extract publisher from item', () => {
    const normalizer = new PublisherNormalizer();
    const mockItem = { getField: jest.fn().mockReturnValue('Test Publisher') };

    const result = normalizer.extractFieldValue(mockItem);

    expect(result).toBe('Test Publisher');
    expect(mockItem.getField).toHaveBeenCalledWith('publisher');
  });

  test('should return null for null item', () => {
    const normalizer = new PublisherNormalizer();

    expect(normalizer.extractFieldValue(null)).toBeNull();
  });

  test('should parse field value', () => {
    const normalizer = new PublisherNormalizer();

    const result = normalizer.parseFieldValue('Test Publisher');

    expect(result.type).toBe('publisher');
    expect(result.original).toBe('Test Publisher');
    expect(result.publishers).toContain('Test Publisher');
    expect(result.hasMultiple).toBe(false);
  });
});

describe('LocationNormalizer', () => {
  beforeEach(() => {
    console.log.mockClear();
    console.error.mockClear();
  });

  test('should have location fieldType', () => {
    const normalizer = new LocationNormalizer();
    expect(normalizer.fieldType).toBe('location');
    expect(normalizer.fieldName).toBe('place');
  });

  test('should accept custom fieldName', () => {
    const normalizer = new LocationNormalizer('customPlace');
    expect(normalizer.fieldName).toBe('customPlace');
  });

  test('should generate location variants', () => {
    const normalizer = new LocationNormalizer();
    normalizer.variantGenerator.generateLocationVariants = jest.fn().mockReturnValue(['variant1']);

    const variants = normalizer.generateVariants('New York, NY');

    expect(variants).toEqual(['variant1']);
  });

  test('should extract place from item', () => {
    const normalizer = new LocationNormalizer();
    const mockItem = { getField: jest.fn().mockReturnValue('Boston, MA') };

    const result = normalizer.extractFieldValue(mockItem);

    expect(result).toBe('Boston, MA');
    expect(mockItem.getField).toHaveBeenCalledWith('place');
  });

  test('should parse state information', () => {
    const normalizer = new LocationNormalizer();

    const result = normalizer.parseStateInfo('Boston, MA');

    expect(result.city).toBe('Boston');
    expect(result.state).toBe('Massachusetts');
    expect(result.stateAbbrev).toBe('MA');
  });

  test('should parse state with full name', () => {
    const normalizer = new LocationNormalizer();

    const result = normalizer.parseStateInfo('Austin, Texas');

    expect(result.city).toBe('Austin');
    expect(result.state).toBe('Texas');
    expect(result.stateAbbrev).toBe('TX');
  });

  test('should handle location without state', () => {
    const normalizer = new LocationNormalizer();

    const result = normalizer.parseStateInfo('London');

    expect(result.city).toBe('London');
    expect(result.state).toBeNull();
    expect(result.stateAbbrev).toBeNull();
  });
});

describe('JournalNormalizer', () => {
  beforeEach(() => {
    console.log.mockClear();
    console.error.mockClear();
  });

  test('should have journal fieldType', () => {
    const normalizer = new JournalNormalizer();
    expect(normalizer.fieldType).toBe('journal');
    expect(normalizer.fieldName).toBe('publicationTitle');
  });

  test('should accept custom fieldName', () => {
    const normalizer = new JournalNormalizer('journalTitle');
    expect(normalizer.fieldName).toBe('journalTitle');
  });

  test('should generate journal variants', () => {
    const normalizer = new JournalNormalizer();
    normalizer.variantGenerator.generateJournalVariants = jest.fn().mockReturnValue(['variant1']);

    const variants = normalizer.generateVariants('J. of Science');

    expect(variants).toEqual(['variant1']);
  });

  test('should extract publicationTitle from item', () => {
    const normalizer = new JournalNormalizer();
    const mockItem = { getField: jest.fn().mockReturnValue('Nature') };

    const result = normalizer.extractFieldValue(mockItem);

    expect(result).toBe('Nature');
    expect(mockItem.getField).toHaveBeenCalledWith('publicationTitle');
  });

  test('should detect abbreviated journal names', () => {
    const normalizer = new JournalNormalizer();

    expect(normalizer.detectAbbreviation('J. of Science')).toBe(true);
    expect(normalizer.detectAbbreviation('Int. J. of Comp.')).toBe(true);
    expect(normalizer.detectAbbreviation('Journal of Science')).toBe(false);
  });

  test('should parse field value with abbreviation detection', () => {
    const normalizer = new JournalNormalizer();

    const result = normalizer.parseFieldValue('J. of Science');

    expect(result.type).toBe('journal');
    expect(result.original).toBe('J. of Science');
    expect(result.title).toBe('J. of Science');
    expect(result.isAbbreviated).toBe(true);
  });
});
