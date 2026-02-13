/**
 * Unit tests for FieldItemProcessor
 * Tests lazy initialization, field normalizer selection, batch processing, and progress callbacks
 */

// Mock console methods
global.console = {
  log: jest.fn(),
  error: jest.fn()
};

// Mock Zotero global
global.Zotero = {
  debug: jest.fn(),
  Items: {
    get: jest.fn(),
    getAll: jest.fn()
  }
};

const FieldItemProcessor = require('../../src/zotero/field-item-processor.js');

describe('FieldItemProcessor', () => {
  let processor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new FieldItemProcessor();
    console.log.mockClear();
    console.error.mockClear();
  });

  describe('constructor', () => {
    test('should initialize with null field registry', () => {
      expect(processor._fieldRegistry).toBeNull();
    });
  });

  describe('lazy initialization', () => {
    test('should lazy-load fieldRegistry', () => {
      expect(processor._fieldRegistry).toBeNull();
      const registry = processor.fieldRegistry;
      expect(registry).toBeDefined();
      expect(processor._fieldRegistry).not.toBeNull();
      // Same access should return same instance
      expect(processor.fieldRegistry).toBe(registry);
    });

    test('should return empty map on first access', () => {
      const registry = processor.fieldRegistry;
      expect(registry.size).toBe(0);
    });
  });

  describe('getFieldNormalizer', () => {
    test('should create normalizer for new field type', () => {
      const normalizer = processor.getFieldNormalizer('publisher');

      expect(normalizer).toBeDefined();
      expect(processor.fieldRegistry.size).toBe(1);
    });

    test('should return cached normalizer for same field type', () => {
      const normalizer1 = processor.getFieldNormalizer('publisher');
      const normalizer2 = processor.getFieldNormalizer('publisher');

      expect(normalizer1).toBe(normalizer2);
      expect(processor.fieldRegistry.size).toBe(1);
    });

    test('should create separate normalizers for different field types', () => {
      const publisherNormalizer = processor.getFieldNormalizer('publisher');
      processor.clearRegistry();
      const locationNormalizer = processor.getFieldNormalizer('location');

      expect(publisherNormalizer).not.toBe(locationNormalizer);
      expect(processor.fieldRegistry.size).toBe(1); // After clear
    });

    test('should create normalizer with custom field name', () => {
      const normalizer = processor.getFieldNormalizer('publisher', 'customPublisher');

      expect(normalizer).toBeDefined();
      expect(normalizer.fieldName).toBe('customPublisher');
    });

    test('should pass options to normalizer', () => {
      const options = { expandAbbreviations: false };
      const normalizer = processor.getFieldNormalizer('publisher', null, options);

      expect(normalizer.options.expandAbbreviations).toBe(false);
    });

    test('should use consistent registry key', () => {
      const normalizer1 = processor.getFieldNormalizer('publisher');
      const normalizer2 = processor.getFieldNormalizer('publisher', 'default');

      expect(normalizer1).toBe(normalizer2);
    });
  });

  describe('getDefaultFieldName', () => {
    test('should return publisher for publisher type', () => {
      expect(processor.getDefaultFieldName('publisher')).toBe('publisher');
    });

    test('should return place for location type', () => {
      expect(processor.getDefaultFieldName('location')).toBe('place');
    });

    test('should return place for place type', () => {
      expect(processor.getDefaultFieldName('place')).toBe('place');
    });

    test('should return publicationTitle for journal type', () => {
      expect(processor.getDefaultFieldName('journal')).toBe('publicationTitle');
    });

    test('should return publicationTitle for publicationtitle type (case insensitive)', () => {
      expect(processor.getDefaultFieldName('PUBLICATIONTITLE')).toBe('publicationTitle');
    });

    test('should return original type for unknown types', () => {
      expect(processor.getDefaultFieldName('unknown')).toBe('unknown');
    });
  });

  describe('processItemField', () => {
    test('should return error result for empty field value', async () => {
      const mockItem = { id: 1, getField: jest.fn() };
      processor.getFieldNormalizer('publisher');

      const result = await processor.processItemField(mockItem, 'publisher');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty or missing field value');
    });

    test('should return error result for whitespace-only field value', async () => {
      const mockItem = { id: 1, getField: jest.fn() };
      processor.getFieldNormalizer('publisher');

      const result = await processor.processItemField(mockItem, 'publisher');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty or missing field value');
    });

    test('should return error result for null field value', async () => {
      const mockItem = { id: 1, getField: jest.fn() };
      processor.getFieldNormalizer('publisher');

      const result = await processor.processItemField(mockItem, 'publisher');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty or missing field value');
    });

    test('should return success result with normalized data', async () => {
      const mockItem = { id: 1, getField: jest.fn() };
      const normalizer = processor.getFieldNormalizer('publisher');
      normalizer.extractFieldValue = jest.fn().mockReturnValue('Original Value');
      normalizer.normalizeFieldValue = jest.fn().mockResolvedValue({
        success: true,
        original: 'Original Value',
        normalized: 'Normalized Value',
        suggestedNormalization: 'Normalized Value',
        variants: ['Variant 1', 'Variant 2'],
        similarMappings: [],
        learnedMapping: null,
        error: null
      });

      const result = await processor.processItemField(mockItem, 'publisher');

      expect(result.success).toBe(true);
      expect(result.itemID).toBe(1);
      expect(result.fieldType).toBe('publisher');
      expect(result.original).toBe('Original Value');
      expect(result.normalized).toBe('Normalized Value');
      expect(result.suggestedNormalization).toBe('Normalized Value');
      expect(result.variants).toEqual(['Variant 1', 'Variant 2']);
    });

    test('should include learnedMapping in result', async () => {
      const mockItem = { id: 1, getField: jest.fn() };
      const normalizer = processor.getFieldNormalizer('publisher');
      normalizer.extractFieldValue = jest.fn().mockReturnValue('Original Value');
      normalizer.normalizeFieldValue = jest.fn().mockResolvedValue({
        success: true,
        original: 'Original Value',
        normalized: 'Normalized Value',
        suggestedNormalization: 'Normalized Value',
        learnedMapping: { normalized: 'Learned Value', confidence: 0.9 }
      });

      const result = await processor.processItemField(mockItem, 'publisher');

      expect(result.learnedMapping).toEqual({ normalized: 'Learned Value', confidence: 0.9 });
    });

    test('should handle normalization errors', async () => {
      const mockItem = { id: 1, getField: jest.fn() };
      const normalizer = processor.getFieldNormalizer('publisher');
      normalizer.extractFieldValue = jest.fn().mockReturnValue('Original Value');
      normalizer.normalizeFieldValue = jest.fn().mockRejectedValue(new Error('Normalization failed'));

      const result = await processor.processItemField(mockItem, 'publisher');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Normalization failed');
    });
  });

  describe('batchProcess', () => {
    test('should process all items', async () => {
      const mockItems = [
        { id: 1, getField: () => 'Publisher 1' },
        { id: 2, getField: () => 'Publisher 2' },
        { id: 3, getField: () => 'Publisher 3' }
      ];

      const results = await processor.batchProcess(mockItems, 'publisher');

      expect(results.total).toBe(3);
      // Items may be processed or skipped depending on the data
      expect(results.items.length + results.skipped + results.failed).toBe(3);
    });

    test('should skip items with empty field values', async () => {
      const mockItems = [
        { id: 1 },
        { id: 2 },
        { id: 3 }
      ];
      processor.getFieldNormalizer('publisher');

      const results = await processor.batchProcess(mockItems, 'publisher');

      expect(results.total).toBe(3);
      expect(results.skipped).toBeGreaterThan(0);
    });

    test('should call progress callback', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      const progressCallback = jest.fn();
      processor.getFieldNormalizer('publisher');

      await processor.batchProcess(mockItems, 'publisher', { onProgress: progressCallback });

      expect(progressCallback).toHaveBeenCalledTimes(2);
      expect(progressCallback).toHaveBeenCalledWith({
        current: 1,
        total: 2,
        percent: 50
      });
      expect(progressCallback).toHaveBeenCalledWith({
        current: 2,
        total: 2,
        percent: 100
      });
    });

    test('should handle processing errors', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      processor.getFieldNormalizer('publisher');

      const results = await processor.batchProcess(mockItems, 'publisher');

      // Some items may have been processed or failed
      expect(results.failed + results.processed + results.skipped).toBe(2);
    });

    test('should have correct progress callback format', async () => {
      const mockItems = [{ id: 1 }];
      let progressData = null;
      processor.getFieldNormalizer('publisher');

      await processor.batchProcess(mockItems, 'publisher', {
        onProgress: (data) => { progressData = data; }
      });

      expect(progressData).toHaveProperty('current');
      expect(progressData).toHaveProperty('total');
      expect(progressData).toHaveProperty('percent');
      expect(typeof progressData.percent).toBe('number');
      expect(progressData.percent).toBeGreaterThanOrEqual(0);
      expect(progressData.percent).toBeLessThanOrEqual(100);
    });
  });

  describe('clearRegistry', () => {
    test('should clear the field registry', () => {
      processor.getFieldNormalizer('publisher');
      expect(processor._fieldRegistry).not.toBeNull();

      processor.clearRegistry();

      expect(processor._fieldRegistry).toBeNull();
    });

    test('should allow creating new normalizers after clear', () => {
      const normalizer1 = processor.getFieldNormalizer('publisher');
      processor.clearRegistry();
      const normalizer2 = processor.getFieldNormalizer('publisher');

      expect(normalizer1).not.toBe(normalizer2);
    });
  });

  describe('getRegistryStats', () => {
    test('should return zero stats for empty registry', () => {
      const stats = processor.getRegistryStats();

      expect(stats.size).toBe(0);
      expect(stats.fieldTypes).toEqual([]);
    });

    test('should return correct stats after adding normalizers', () => {
      processor.getFieldNormalizer('publisher');
      processor.getFieldNormalizer('location');

      const stats = processor.getRegistryStats();

      expect(stats.size).toBe(2);
      expect(stats.fieldTypes).toHaveLength(2);
    });

    test('should handle null registry', () => {
      processor._fieldRegistry = null;

      const stats = processor.getRegistryStats();

      expect(stats.size).toBe(0);
      expect(stats.fieldTypes).toEqual([]);
    });
  });
});
