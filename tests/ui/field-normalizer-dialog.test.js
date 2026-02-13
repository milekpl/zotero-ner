/**
 * Unit tests for FieldNormalizerDialog
 * Tests field registry initialization, scope setting, option presentation, and alreadyLearned check
 */

// Mock console methods
global.console = {
  log: jest.fn(),
  error: jest.fn()
};

const FieldNormalizerDialog = require('../../src/ui/field-normalizer-dialog.js');

describe('FieldNormalizerDialog', () => {
  let dialog;

  beforeEach(() => {
    jest.clearAllMocks();
    dialog = new FieldNormalizerDialog();
    console.log.mockClear();
    console.error.mockClear();
  });

  describe('constructor', () => {
    test('should initialize with null field registry', () => {
      expect(dialog._fieldRegistry).toBeNull();
    });

    test('should initialize with null collectionId', () => {
      expect(dialog._collectionId).toBeNull();
    });
  });

  describe('fieldRegistry getter (lazy initialization)', () => {
    test('should lazy-load fieldRegistry', () => {
      expect(dialog._fieldRegistry).toBeNull();
      const registry = dialog.fieldRegistry;
      expect(registry).toBeDefined();
      expect(dialog._fieldRegistry).not.toBeNull();
    });

    test('should create normalizers for all supported field types', () => {
      const registry = dialog.fieldRegistry;

      expect(registry.has('publisher')).toBe(true);
      expect(registry.has('location')).toBe(true);
      expect(registry.has('journal')).toBe(true);
      expect(registry.size).toBe(3);
    });

    test('should return same registry on subsequent calls', () => {
      const registry1 = dialog.fieldRegistry;
      const registry2 = dialog.fieldRegistry;

      expect(registry1).toBe(registry2);
    });
  });

  describe('getAvailableFieldTypes', () => {
    test('should return array of field types', () => {
      const types = dialog.getAvailableFieldTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain('publisher');
      expect(types).toContain('location');
      expect(types).toContain('journal');
    });

    test('should return 3 field types', () => {
      const types = dialog.getAvailableFieldTypes();

      expect(types).toHaveLength(3);
    });
  });

  describe('setScope', () => {
    test('should set collectionId', () => {
      dialog.setScope('collection123');

      expect(dialog._collectionId).toBe('collection123');
    });

    test('should handle null scope', () => {
      dialog._collectionId = 'previous';
      dialog.setScope(null);

      expect(dialog._collectionId).toBeNull();
    });

    test('should not error if fieldRegistry not yet initialized', () => {
      expect(() => dialog.setScope('collection123')).not.toThrow();

      expect(dialog._collectionId).toBe('collection123');
    });
  });

  describe('showDialog', () => {
    test('should log field type and item count', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      dialog.processItemsForField = jest.fn().mockResolvedValue({
        fieldType: 'publisher',
        items: [],
        summary: { total: 2, alreadyLearned: 0, needsAttention: 0 }
      });
      dialog.presentFieldOptions = jest.fn().mockResolvedValue({
        items: [],
        summary: { autoApplied: 0, userConfirmed: 0, skipped: 0 }
      });

      await dialog.showDialog(mockItems, 'publisher');

      expect(console.log).toHaveBeenCalledWith('Showing publisher normalization dialog for', 2, 'items');
    });

    test('should call processItemsForField with items and fieldType', async () => {
      const mockItems = [{ id: 1 }];
      dialog.processItemsForField = jest.fn().mockResolvedValue({
        fieldType: 'publisher',
        items: [],
        summary: { total: 1, alreadyLearned: 0, needsAttention: 0 }
      });
      dialog.presentFieldOptions = jest.fn().mockResolvedValue({
        items: [],
        summary: { autoApplied: 0, userConfirmed: 0, skipped: 0 }
      });

      await dialog.showDialog(mockItems, 'publisher');

      expect(dialog.processItemsForField).toHaveBeenCalledWith(mockItems, 'publisher');
    });
  });

  describe('processItemsForField', () => {
    test('should throw error for unknown field type', async () => {
      const mockItems = [{ id: 1 }];

      await expect(dialog.processItemsForField(mockItems, 'unknown'))
        .rejects
        .toThrow('Unknown field type: unknown');
    });

    test('should build results object with fieldType and summary', async () => {
      const mockItems = [{ id: 1 }];
      const results = await dialog.processItemsForField(mockItems, 'publisher');

      expect(results.fieldType).toBe('publisher');
      expect(results.summary.total).toBe(1);
    });

    test('should include itemID and title in results', async () => {
      const mockItems = [{ id: 1, getField: jest.fn().mockReturnValue('Test Title') }];

      const results = await dialog.processItemsForField(mockItems, 'publisher');

      expect(results.items[0].itemID).toBe(1);
      expect(results.items[0].title).toBe('Test Title');
    });
  });

  describe('presentFieldOptions', () => {
    test('should log field type and item count', async () => {
      const mockResults = {
        fieldType: 'publisher',
        items: [],
        summary: { total: 0, alreadyLearned: 0, needsAttention: 0 }
      };

      await dialog.presentFieldOptions(mockResults, 'publisher');

      expect(console.log).toHaveBeenCalledWith('Presenting publisher options to user for', 0, 'items');
    });

    test('should include timestamp in result', async () => {
      const mockResults = {
        fieldType: 'publisher',
        items: [],
        summary: { total: 0, alreadyLearned: 0, needsAttention: 0 }
      };

      const result = await dialog.presentFieldOptions(mockResults, 'publisher');

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });

    test('should include collectionId in result', async () => {
      dialog.setScope('test-collection');
      const mockResults = {
        fieldType: 'publisher',
        items: [],
        summary: { total: 0, alreadyLearned: 0, needsAttention: 0 }
      };

      const result = await dialog.presentFieldOptions(mockResults, 'publisher');

      expect(result.collectionId).toBe('test-collection');
    });
  });

  describe('renderUIDemo', () => {
    test('should render HTML for demonstration', () => {
      const mockResults = {
        fieldType: 'publisher',
        summary: { total: 1, alreadyLearned: 0, needsAttention: 1 },
        items: [{
          itemID: 1,
          title: 'Test Title',
          rawValue: 'Test Publisher',
          processed: {
            alreadyLearned: false,
            variants: ['Normalized Publisher'],
            similars: []
          }
        }]
      };

      const html = dialog.renderUIDemo(mockResults);

      expect(typeof html).toBe('string');
      expect(html).toContain('Publisher Normalization');
      expect(html).toContain('Test Title');
      expect(html).toContain('Test Publisher');
    });

    test('should show summary statistics', () => {
      const mockResults = {
        fieldType: 'location',
        summary: { total: 10, alreadyLearned: 3, needsAttention: 7 },
        items: []
      };

      const html = dialog.renderUIDemo(mockResults);

      expect(html).toContain('Total items: 10');
      expect(html).toContain('Already learned: 3');
      expect(html).toContain('Needs attention: 7');
    });

    test('should include action buttons', () => {
      const mockResults = {
        fieldType: 'publisher',
        summary: { total: 0, alreadyLearned: 0, needsAttention: 0 },
        items: []
      };

      const html = dialog.renderUIDemo(mockResults);

      expect(html).toContain('Accept All');
      expect(html).toContain('Apply Selected Changes');
      expect(html).toContain('Cancel');
    });
  });

  describe('simulateUserSelection', () => {
    test('should prefer highest confidence similar', async () => {
      const mockItem = {
        processed: {
          similars: [
            { normalized: 'Low', similarity: 0.5 },
            { normalized: 'High', similarity: 0.9 },
            { normalized: 'Medium', similarity: 0.7 }
          ],
          variants: []
        }
      };

      const result = await dialog.simulateUserSelection(mockItem, 'publisher');

      expect(result).toBe('High');
    });

    test('should use first variant when no similars', async () => {
      const mockItem = {
        processed: {
          similars: [],
          variants: ['First Variant', 'Second Variant']
        }
      };

      const result = await dialog.simulateUserSelection(mockItem, 'publisher');

      expect(result).toBe('First Variant');
    });

    test('should fallback to rawValue when no variants or similars', async () => {
      const mockItem = {
        rawValue: 'Fallback Value',
        processed: {
          similars: [],
          variants: []
        }
      };

      const result = await dialog.simulateUserSelection(mockItem, 'publisher');

      expect(result).toBe('Fallback Value');
    });
  });
});
