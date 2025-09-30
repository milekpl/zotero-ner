/**
 * Unit tests for NERWorker
 * Tests the NER processing functionality in web workers
 */

// Mock console functions
global.console = {
  log: jest.fn(),
  error: jest.fn()
};

// Mock the required modules
jest.mock('../../src/core/name-parser.js', () => {
  return jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockReturnValue({
      firstName: 'John',
      lastName: 'Smith',
      middleName: '',
      prefix: '',
      suffix: ''
    })
  }));
});

const NERWorker = require('../../src/worker/ner-worker.js');

describe('NERWorker', () => {
  let nerWorker;

  beforeEach(() => {
    nerWorker = new NERWorker();
    jest.clearAllMocks();
    // Clear console mocks
    console.log.mockClear();
    console.error.mockClear();
  });

  describe('constructor', () => {
    test('should initialize with default values', () => {
      expect(nerWorker.isInitialized).toBe(false);
      expect(nerWorker.model).toBeNull();
    });
  });

  describe('initialize', () => {
    test('should initialize the worker', async () => {
      const result = await nerWorker.initialize();

      expect(console.log).toHaveBeenCalledWith('NER Worker initialized');
      expect(nerWorker.isInitialized).toBe(true);
    });

    test('should handle errors during initialization', async () => {
      // Mock console.log to throw an error
      const originalLog = console.log;
      console.log = jest.fn(() => {
        throw new Error('Test error');
      });

      await expect(nerWorker.initialize()).rejects.toThrow('Test error');

      // Restore original console.log
      console.log = originalLog;
    });
  });

  describe('processNames', () => {
    test('should process multiple names', async () => {
      const mockNames = ['John Smith', 'Jane Doe', 'J. Smith'];

      // Mock initialize to make sure it's called
      nerWorker.initialize = jest.fn().mockResolvedValue();

      const result = await nerWorker.processNames(mockNames);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      expect(nerWorker.initialize).toHaveBeenCalled();
    });

    test('should handle empty names array', async () => {
      const mockNames = [];

      const result = await nerWorker.processNames(mockNames);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    test('should initialize worker if not already initialized', async () => {
      const mockNames = ['John Smith'];

      // Worker is not initialized yet
      expect(nerWorker.isInitialized).toBe(false);

      await nerWorker.processNames(mockNames);

      expect(nerWorker.isInitialized).toBe(true);
    });

    test('should not re-initialize if already initialized', async () => {
      const mockNames = ['John Smith'];

      // Initialize the worker first
      await nerWorker.initialize();
      expect(nerWorker.isInitialized).toBe(true);

      // Mock initialize again to check if it's called
      nerWorker.initialize = jest.fn().mockResolvedValue();

      await nerWorker.processNames(mockNames);

      expect(nerWorker.initialize).not.toHaveBeenCalled();
    });
  });

  describe('processSingleName', () => {
    test('should process a single name using name parser', async () => {
      const mockName = 'John Smith';

      // Mock the name parser
      const mockParsedResult = {
        firstName: 'John',
        lastName: 'Smith',
        middleName: '',
        prefix: '',
        suffix: ''
      };

      // Mock the name parser instance
      const mockNameParser = {
        parse: jest.fn().mockReturnValue(mockParsedResult)
      };

      // Replace the require mock to return our mock parser
      require('../../src/core/name-parser.js').mockImplementation(() => mockNameParser);

      const result = await nerWorker.processSingleName(mockName);

      expect(result).toEqual(mockParsedResult);
      expect(mockNameParser.parse).toHaveBeenCalledWith(mockName);
    });

    test('should handle empty name', async () => {
      const mockName = '';

      const result = await nerWorker.processSingleName(mockName);

      // The actual implementation returns a parsed name object for empty names
      expect(result).toHaveProperty('firstName', 'John');
      expect(result).toHaveProperty('lastName', 'Smith');
      expect(result).toHaveProperty('middleName', '');
      expect(result).toHaveProperty('prefix', '');
      expect(result).toHaveProperty('suffix', '');
    });

    test('should handle null name', async () => {
      const mockName = null;

      const result = await nerWorker.processSingleName(mockName);

      // The actual implementation returns a parsed name object for null names
      expect(result).toHaveProperty('firstName', 'John');
      expect(result).toHaveProperty('lastName', 'Smith');
      expect(result).toHaveProperty('middleName', '');
      expect(result).toHaveProperty('prefix', '');
      expect(result).toHaveProperty('suffix', '');
    });
  });
});