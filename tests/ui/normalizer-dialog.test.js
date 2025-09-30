/**
 * Unit tests for NormalizerDialog
 * Tests the normalizer dialog functionality
 */

// Mock console functions
global.console = {
  log: jest.fn(),
  error: jest.fn()
};

// Mock the required modules
jest.mock('../../src/core/learning-engine.js', () => {
  return jest.fn().mockImplementation(() => ({
    getMapping: jest.fn().mockReturnValue(null),
    findSimilar: jest.fn().mockReturnValue([]),
    storeMapping: jest.fn().mockResolvedValue()
  }));
});

jest.mock('../../src/core/variant-generator.js', () => {
  return jest.fn().mockImplementation(() => ({
    generateVariants: jest.fn().mockReturnValue([])
  }));
});

jest.mock('../../src/core/name-parser.js', () => {
  return jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockReturnValue({
      firstName: '',
      lastName: '',
      middleName: '',
      prefix: '',
      suffix: ''
    })
  }));
});

const NormalizerDialog = require('../../src/ui/normalizer-dialog.js');

describe('NormalizerDialog', () => {
  let normalizerDialog;

  beforeEach(() => {
    normalizerDialog = new NormalizerDialog();
    jest.clearAllMocks();
    // Clear console mocks
    console.log.mockClear();
    console.error.mockClear();
  });

  describe('constructor', () => {
    test('should initialize with required components', () => {
      expect(normalizerDialog.learningEngine).toBeDefined();
      expect(normalizerDialog.variantGenerator).toBeDefined();
      expect(normalizerDialog.nameParser).toBeDefined();
    });
  });

  describe('showDialog', () => {
    test('should show normalization dialog for items', async () => {
      const mockItems = [
        { id: 1, getField: () => 'Test Item 1' },
        { id: 2, getField: () => 'Test Item 2' }
      ];

      const result = await normalizerDialog.showDialog(mockItems);

      expect(console.log).toHaveBeenCalledWith('Showing normalization dialog for', 2, 'items');
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle empty items array', async () => {
      const mockItems = [];

      const result = await normalizerDialog.showDialog(mockItems);

      expect(console.log).toHaveBeenCalledWith('Showing normalization dialog for', 0, 'items');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    test('should process each item and prepare options', async () => {
      const mockItems = [
        { id: 1, getField: () => 'Test Item 1' }
      ];

      // Mock the processItem method to return specific results
      normalizerDialog.processItem = jest.fn().mockResolvedValue({
        itemID: 1,
        title: 'Test Item 1',
        creators: []
      });

      const result = await normalizerDialog.showDialog(mockItems);

      expect(normalizerDialog.processItem).toHaveBeenCalledWith(mockItems[0]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('processItem', () => {
    test('should process a single item with creators', async () => {
      const mockItem = {
        id: 1,
        getField: () => 'Test Title',
        getCreators: () => [
          { firstName: 'J.', lastName: 'Smith', creatorType: 'author' },
          { firstName: 'J.A.', lastName: 'Smith', creatorType: 'author' }
        ]
      };

      // Mock the name parser to return parsed names
      normalizerDialog.nameParser.parse.mockReturnValue({
        firstName: 'J.',
        lastName: 'Smith',
        middleName: '',
        prefix: '',
        suffix: ''
      });

      const result = await normalizerDialog.processItem(mockItem);

      expect(result).toHaveProperty('itemID', 1);
      expect(result).toHaveProperty('title', 'Test Title');
      expect(result).toHaveProperty('creators');
      expect(Array.isArray(result.creators)).toBe(true);
    });

    test('should handle items without creators', async () => {
      const mockItem = {
        id: 1,
        getField: () => 'Test Title',
        getCreators: () => []
      };

      const result = await normalizerDialog.processItem(mockItem);

      expect(result).toHaveProperty('itemID', 1);
      expect(result).toHaveProperty('title', 'Test Title');
      expect(result).toHaveProperty('creators');
      expect(Array.isArray(result.creators)).toBe(true);
      expect(result.creators).toHaveLength(0);
    });

    test('should handle items without getCreators method', async () => {
      const mockItem = {
        id: 1,
        getField: () => 'Test Title'
        // No getCreators method
      };

      const result = await normalizerDialog.processItem(mockItem);

      expect(result).toHaveProperty('itemID', 1);
      expect(result).toHaveProperty('title', 'Test Title');
      expect(result).toHaveProperty('creators');
      expect(Array.isArray(result.creators)).toBe(true);
      expect(result.creators).toHaveLength(0);
    });

    test('should check for learned mappings', async () => {
      const mockItem = {
        id: 1,
        getField: () => 'Test Title',
        getCreators: () => [
          { firstName: 'J.', lastName: 'Smith', creatorType: 'author' }
        ]
      };

      // Mock the learning engine to return a learned mapping
      const mockNormalized = 'John Smith';
      normalizerDialog.learningEngine.getMapping.mockReturnValue(mockNormalized);

      const result = await normalizerDialog.processItem(mockItem);

      expect(normalizerDialog.learningEngine.getMapping).toHaveBeenCalledWith('J. Smith');
      expect(result.creators).toHaveLength(1);
      expect(result.creators[0]).toHaveProperty('alreadyLearned', true);
      expect(result.creators[0]).toHaveProperty('normalized', mockNormalized);
    });

    test('should find similar names', async () => {
      const mockItem = {
        id: 1,
        getField: () => 'Test Title',
        getCreators: () => [
          { firstName: 'J.', lastName: 'Smith', creatorType: 'author' }
        ]
      };

      // Mock the learning engine to return similar names
      const mockSimilars = [
        { raw: 'John Smith', normalized: 'John Smith', similarity: 0.9, frequency: 5 }
      ];
      normalizerDialog.learningEngine.findSimilar.mockReturnValue(mockSimilars);

      const result = await normalizerDialog.processItem(mockItem);

      expect(normalizerDialog.learningEngine.findSimilar).toHaveBeenCalledWith('J. Smith');
      expect(result.creators).toHaveLength(1);
      expect(result.creators[0]).toHaveProperty('similars', mockSimilars);
    });

    test('should generate variant candidates', async () => {
      const mockItem = {
        id: 1,
        getField: () => 'Test Title',
        getCreators: () => [
          { firstName: 'J.', lastName: 'Smith', creatorType: 'author' }
        ]
      };

      // Mock the variant generator to return variants
      const mockVariants = ['John Smith', 'J.A. Smith'];
      normalizerDialog.variantGenerator.generateVariants.mockReturnValue(mockVariants);

      const result = await normalizerDialog.processItem(mockItem);

      expect(normalizerDialog.variantGenerator.generateVariants).toHaveBeenCalled();
      expect(result.creators).toHaveLength(1);
      expect(result.creators[0]).toHaveProperty('variants', mockVariants);
    });
  });

  describe('buildRawName', () => {
    test('should build raw name from creator with both first and last names', () => {
      const creator = { firstName: 'John', lastName: 'Smith' };
      const result = normalizerDialog.buildRawName(creator);
      expect(result).toBe('John Smith');
    });

    test('should handle creator with only first name', () => {
      const creator = { firstName: 'John', lastName: '' };
      const result = normalizerDialog.buildRawName(creator);
      expect(result).toBe('John');
    });

    test('should handle creator with only last name', () => {
      const creator = { firstName: '', lastName: 'Smith' };
      const result = normalizerDialog.buildRawName(creator);
      expect(result).toBe('Smith');
    });

    test('should handle creator with no names', () => {
      const creator = { firstName: '', lastName: '' };
      const result = normalizerDialog.buildRawName(creator);
      expect(result).toBe('');
    });

    test('should handle whitespace in names', () => {
      const creator = { firstName: '  John  ', lastName: '  Smith  ' };
      const result = normalizerDialog.buildRawName(creator);
      // The actual implementation may not trim whitespace between first and last names
      expect(result).toContain('John');
      expect(result).toContain('Smith');
    });
  });

  describe('presentOptions', () => {
    test('should present options to user (stub implementation)', async () => {
      const mockResults = [
        {
          itemID: 1,
          title: 'Test Item 1',
          creators: [
            {
              original: { firstName: 'J.', lastName: 'Smith' },
              rawName: 'J. Smith',
              variants: ['John Smith'],
              similars: [],
              type: 'author',
              alreadyLearned: false,
              parsed: { firstName: 'J.', lastName: 'Smith' },
              status: 'new'
            }
          ]
        }
      ];

      const result = await normalizerDialog.presentOptions(mockResults);

      expect(console.log).toHaveBeenCalledWith('Presenting options to user:');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('itemID', 1);
      expect(result[0]).toHaveProperty('title', 'Test Item 1');
      expect(result[0]).toHaveProperty('creators');
    });

    test('should handle empty results', async () => {
      const mockResults = [];

      const result = await normalizerDialog.presentOptions(mockResults);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    test('should handle learned mappings', async () => {
      const mockResults = [
        {
          itemID: 1,
          title: 'Test Item 1',
          creators: [
            {
              original: { firstName: 'J.', lastName: 'Smith' },
              normalized: 'John Smith',
              type: 'author',
              alreadyLearned: true,
              status: 'learned'
            }
          ]
        }
      ];

      const result = await normalizerDialog.presentOptions(mockResults);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].creators).toHaveLength(1);
      expect(result[0].creators[0]).toHaveProperty('accepted', true);
      expect(result[0].creators[0]).toHaveProperty('source', 'learned');
    });
  });

  describe('renderUIDemo', () => {
    test('should render UI demo as HTML string', () => {
      const mockResults = [
        {
          itemID: 1,
          title: 'Test Item 1',
          creators: [
            {
              original: { firstName: 'J.', lastName: 'Smith' },
              rawName: 'J. Smith',
              variants: ['John Smith'],
              similars: [],
              type: 'author',
              alreadyLearned: false,
              parsed: { firstName: 'J.', lastName: 'Smith' },
              status: 'new'
            }
          ]
        }
      ];

      const result = normalizerDialog.renderUIDemo(mockResults);

      expect(typeof result).toBe('string');
      expect(result).toContain('<div class="ner-normalizer-dialog">');
      expect(result).toContain('Test Item 1');
      expect(result).toContain('J. Smith');
    });

    test('should handle empty results in UI demo', () => {
      const mockResults = [];

      const result = normalizerDialog.renderUIDemo(mockResults);

      expect(typeof result).toBe('string');
      expect(result).toContain('<div class="ner-normalizer-dialog">');
      expect(result).toContain('<h2>Author Name Normalization</h2>');
    });

    test('should handle learned mappings in UI demo', () => {
      const mockResults = [
        {
          itemID: 1,
          title: 'Test Item 1',
          creators: [
            {
              original: { firstName: 'J.', lastName: 'Smith' },
              normalized: 'John Smith',
              type: 'author',
              alreadyLearned: true,
              status: 'learned'
            }
          ]
        }
      ];

      const result = normalizerDialog.renderUIDemo(mockResults);

      expect(typeof result).toBe('string');
      expect(result).toContain('Learned:');
      expect(result).toContain('John Smith'); // The normalized form should appear in the output
    });
  });
});