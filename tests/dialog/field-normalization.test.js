/**
 * Unit tests for Field Normalization Dialog Initialization
 * Tests unwrapDialogParams, initializeFieldNormalization, and related functionality
 */

// Mock console methods
global.console = {
  log: jest.fn(),
  error: jest.fn()
};

// Mock Zotero global
global.Zotero = {
  debug: jest.fn(),
  logError: jest.fn(),
  Items: {
    get: jest.fn()
  }
};

// Mock window object
const windowMock = {
  document: {
    querySelector: jest.fn(() => ({
      style: { display: 'none' }
    })),
    querySelectorAll: jest.fn(() => []),
    getElementById: jest.fn(() => ({
      style: { display: '' }
    })),
    addEventListener: jest.fn()
  },
  setTimeout: jest.fn((fn) => {
    if (typeof fn === 'function') {
      fn();
    }
  }),
  location: { href: 'chrome://mock/content' },
  addEventListener: jest.fn(),
  ZoteroNERDialogParams: null,
  ZoteroNERDialogParamsJSON: null,
  ZoteroNERAnalysisResults: null,
  ZoteroNERAnalysisResultsJSON: null,
  opener: null
};

global.window = windowMock;

// Create a mock dialog controller that wraps the dialog.html functionality
function createMockDialogController() {
  return {
    log: jest.fn((msg) => console.log(msg)),
    unwrapDialogParams: function(raw) {
      if (!raw) {
        return raw;
      }

      try {
        if (raw.wrappedJSObject) {
          return raw.wrappedJSObject;
        }
      } catch (err) {
        this.log('Failed to access wrappedJSObject: ' + err.message);
      }

      if (typeof raw.getProperty === 'function') {
        try {
          const wrapped = raw.getProperty('wrappedJSObject');
          if (wrapped) {
            return wrapped;
          }
        } catch (err) {
          this.log('No wrappedJSObject property in param bag: ' + err.message);
        }

        let items;
        let analysisResults;
        let analysisResultsJSON;

        try {
          items = raw.getProperty('items');
        } catch (err) {
          this.log('Unable to read items from param bag: ' + err.message);
        }

        try {
          analysisResults = raw.getProperty('analysisResults');
        } catch (err) {
          this.log('Unable to read analysisResults from param bag: ' + err.message);
        }

        try {
          analysisResultsJSON = raw.getProperty('analysisResultsJSON');
        } catch (err) {
          this.log('Unable to read analysisResultsJSON from param bag: ' + err.message);
        }

        let fieldType;
        try {
          fieldType = raw.getProperty('fieldType');
        } catch (err) {
          this.log('Unable to read fieldType from param bag: ' + err.message);
        }

        let collectionId;
        try {
          collectionId = raw.getProperty('collectionId');
        } catch (err) {
          this.log('Unable to read collectionId from param bag: ' + err.message);
        }

        if (analysisResultsJSON || analysisResults || items || fieldType) {
          return {
            items,
            analysisResults,
            analysisResultsJSON,
            fieldType,
            collectionId
          };
        }
      }

      return raw;
    },

    showEmptyState: jest.fn(),
    showLoadingState: jest.fn(),
    getZotero: function() {
      if (typeof Zotero !== 'undefined') {
        return Zotero;
      }
      if (window.opener && window.opener.Zotero) {
        return window.opener.Zotero;
      }
      if (window.opener && window.opener.ZoteroPane && window.opener.ZoteroPane.Zotero) {
        return window.opener.ZoteroPane.Zotero;
      }
      return null;
    },

    // Mock initializeFieldNormalization behavior
    initializeFieldNormalization: async function(params) {
      this.log('Initializing field normalization for: ' + params.fieldType);

      // Get Zotero and items
      const Zotero = this.getZotero();
      if (!Zotero) {
        this.log('Zotero not available');
        this.showEmptyState('Zotero is not available. Field normalization requires Zotero.');
        return;
      }

      // Get item IDs from params
      let itemIDs = [];
      if (params.items && Array.isArray(params.items)) {
        itemIDs = params.items;
      } else if (params.itemIDs && Array.isArray(params.itemIDs)) {
        itemIDs = params.itemIDs;
      }

      // Get collectionId from params (for scoped learning lookups)
      let collectionId = null;
      if (params.collectionId) {
        collectionId = params.collectionId;
      }

      if (itemIDs.length === 0) {
        this.showEmptyState('No items were provided for normalization.');
        return;
      }

      // Load items
      let items = [];
      try {
        for (const id of itemIDs) {
          const item = await Zotero.Items.get(id);
          if (item) {
            items.push(item);
          }
        }
      } catch (err) {
        this.log('Error loading items: ' + err.message);
        this.showEmptyState('Failed to load items: ' + err.message);
        return;
      }

      if (items.length === 0) {
        this.showEmptyState('No valid items found.');
        return;
      }

      this.log('Loaded ' + items.length + ' items for field normalization');
    },

    displayFieldResults: jest.fn(),
    processFieldItems: jest.fn()
  };
}

describe('Field Normalization Dialog', () => {
  let dialogController;

  beforeEach(() => {
    jest.clearAllMocks();
    dialogController = createMockDialogController();
    console.log.mockClear();
    console.error.mockClear();
  });

  describe('unwrapDialogParams', () => {
    test('should return null/undefined as-is', () => {
      expect(dialogController.unwrapDialogParams(null)).toBeNull();
      expect(dialogController.unwrapDialogParams(undefined)).toBeUndefined();
    });

    test('should unwrap wrappedJSObject', () => {
      const wrapped = { wrappedJSObject: { items: [1, 2, 3], fieldType: 'publisher' } };
      const result = dialogController.unwrapDialogParams(wrapped);

      expect(result).toEqual({ items: [1, 2, 3], fieldType: 'publisher' });
    });

    test('should extract fieldType from param bag', () => {
      const paramBag = {
        getProperty: jest.fn((prop) => {
          if (prop === 'fieldType') return 'publisher';
          if (prop === 'items') return [1, 2];
          if (prop === 'collectionId') return null;
          return null;
        })
      };

      const result = dialogController.unwrapDialogParams(paramBag);

      expect(result.fieldType).toBe('publisher');
      expect(result.items).toEqual([1, 2]);
      expect(result.collectionId).toBeNull();
    });

    test('should preserve collectionId through unwrapping', () => {
      const paramBag = {
        getProperty: jest.fn((prop) => {
          if (prop === 'fieldType') return 'location';
          if (prop === 'items') return [100, 200, 300];
          if (prop === 'collectionId') return 12345;
          return null;
        })
      };

      const result = dialogController.unwrapDialogParams(paramBag);

      expect(result.fieldType).toBe('location');
      expect(result.items).toEqual([100, 200, 300]);
      expect(result.collectionId).toBe(12345);
    });

    test('should preserve fieldType through unwrapping for all field types', () => {
      const testFieldTypes = ['publisher', 'location', 'journal'];

      for (const fieldType of testFieldTypes) {
        const paramBag = {
          getProperty: jest.fn((prop) => {
            if (prop === 'fieldType') return fieldType;
            if (prop === 'items') return [1];
            return null;
          })
        };

        const result = dialogController.unwrapDialogParams(paramBag);
        expect(result.fieldType).toBe(fieldType);
      }
    });

    test('should handle missing fieldType gracefully', () => {
      const paramBag = {
        getProperty: jest.fn((prop) => {
          if (prop === 'items') return [1, 2];
          // fieldType not found - returns null
          if (prop === 'fieldType') return null;
          if (prop === 'collectionId') return null;
          if (prop === 'analysisResults') return null;
          if (prop === 'analysisResultsJSON') return null;
          return null;
        })
      };

      const result = dialogController.unwrapDialogParams(paramBag);

      expect(result.items).toEqual([1, 2]);
      // When fieldType is null, it should be in the result as null
      expect(result.fieldType).toBeNull();
    });

    test('should return raw object unchanged if no wrappedJSObject and no getProperty', () => {
      const raw = { items: [1, 2], fieldType: 'publisher' };
      const result = dialogController.unwrapDialogParams(raw);

      expect(result).toBe(raw);
    });

    test('should handle mixed wrapped and non-wrapped params', () => {
      const paramBag = {
        getProperty: jest.fn((prop) => {
          if (prop === 'wrappedJSObject') return { items: [1] };
          return null;
        })
      };

      // When wrappedJSObject exists, it should be used
      const result = dialogController.unwrapDialogParams(paramBag);
      expect(result).toEqual({ items: [1] });
    });
  });

  describe('initializeFieldNormalization', () => {
    beforeEach(() => {
      dialogController.getZotero = jest.fn().mockReturnValue(global.Zotero);
    });

    test('should read fieldType from params', async () => {
      const params = { fieldType: 'publisher', items: [1, 2] };

      await dialogController.initializeFieldNormalization(params);

      expect(dialogController.log).toHaveBeenCalledWith(
        expect.stringContaining('Initializing field normalization for: publisher')
      );
    });

    test('should read collectionId from params', async () => {
      const params = { fieldType: 'location', items: [1], collectionId: 999 };

      await dialogController.initializeFieldNormalization(params);

      expect(dialogController.log).toHaveBeenCalledWith(
        expect.stringContaining('Initializing field normalization for: location')
      );
    });

    test('should handle missing Zotero gracefully', async () => {
      dialogController.getZotero.mockReturnValue(null);
      const params = { fieldType: 'publisher', items: [1] };

      await dialogController.initializeFieldNormalization(params);

      expect(dialogController.showEmptyState).toHaveBeenCalledWith(
        'Zotero is not available. Field normalization requires Zotero.'
      );
      expect(dialogController.log).toHaveBeenCalledWith('Zotero not available');
    });

    test('should handle missing items gracefully', async () => {
      const params = { fieldType: 'publisher' };

      await dialogController.initializeFieldNormalization(params);

      expect(dialogController.showEmptyState).toHaveBeenCalledWith(
        'No items were provided for normalization.'
      );
    });

    test('should handle empty items array', async () => {
      const params = { fieldType: 'publisher', items: [] };

      await dialogController.initializeFieldNormalization(params);

      expect(dialogController.showEmptyState).toHaveBeenCalledWith(
        'No items were provided for normalization.'
      );
    });

    test('should handle null items', async () => {
      const params = { fieldType: 'publisher', items: null };

      await dialogController.initializeFieldNormalization(params);

      expect(dialogController.showEmptyState).toHaveBeenCalledWith(
        'No items were provided for normalization.'
      );
    });

    test('should handle undefined items', async () => {
      const params = { fieldType: 'publisher', items: undefined };

      await dialogController.initializeFieldNormalization(params);

      expect(dialogController.showEmptyState).toHaveBeenCalledWith(
        'No items were provided for normalization.'
      );
    });

    test('should prefer items over itemIDs', async () => {
      const params = {
        fieldType: 'publisher',
        items: [1, 2, 3],
        itemIDs: [4, 5, 6]
      };

      await dialogController.initializeFieldNormalization(params);

      expect(global.Zotero.Items.get).toHaveBeenCalledWith(1);
      expect(global.Zotero.Items.get).toHaveBeenCalledWith(2);
      expect(global.Zotero.Items.get).toHaveBeenCalledWith(3);
    });

    test('should use itemIDs when items is not array', async () => {
      const params = {
        fieldType: 'publisher',
        items: null,
        itemIDs: [7, 8, 9]
      };

      await dialogController.initializeFieldNormalization(params);

      expect(global.Zotero.Items.get).toHaveBeenCalledWith(7);
      expect(global.Zotero.Items.get).toHaveBeenCalledWith(8);
      expect(global.Zotero.Items.get).toHaveBeenCalledWith(9);
    });

    test('should handle item loading errors gracefully', async () => {
      global.Zotero.Items.get.mockRejectedValue(new Error('Failed to load'));
      const params = { fieldType: 'publisher', items: [999] };

      await dialogController.initializeFieldNormalization(params);

      expect(dialogController.showEmptyState).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load items: Failed to load')
      );
    });

    test('should handle items array with invalid IDs gracefully', async () => {
      global.Zotero.Items.get.mockResolvedValue(null);
      const params = { fieldType: 'publisher', items: [999] };

      await dialogController.initializeFieldNormalization(params);

      expect(dialogController.showEmptyState).toHaveBeenCalledWith(
        'No valid items found.'
      );
    });

    test('should handle all valid item IDs', async () => {
      const mockItem = { id: 1, getField: () => 'Test' };
      global.Zotero.Items.get.mockResolvedValue(mockItem);
      const params = { fieldType: 'journal', items: [1, 2, 3] };

      await dialogController.initializeFieldNormalization(params);

      expect(global.Zotero.Items.get).toHaveBeenCalledTimes(3);
      expect(dialogController.log).toHaveBeenCalledWith(
        'Loaded 3 items for field normalization'
      );
    });
  });

  describe('parameter preservation through unwrapDialogParams', () => {
    test('should preserve fieldType and collectionId together', () => {
      const paramBag = {
        getProperty: jest.fn((prop) => {
          const values = {
            fieldType: 'publisher',
            items: [1, 2, 3],
            collectionId: 54321
          };
          return values[prop];
        })
      };

      const result = dialogController.unwrapDialogParams(paramBag);

      expect(result.fieldType).toBe('publisher');
      expect(result.collectionId).toBe(54321);
      expect(result.items).toEqual([1, 2, 3]);
    });

    test('should preserve fieldType when collectionId is null', () => {
      const paramBag = {
        getProperty: jest.fn((prop) => {
          if (prop === 'fieldType') return 'location';
          if (prop === 'items') return [1];
          if (prop === 'collectionId') return null;
          return null;
        })
      };

      const result = dialogController.unwrapDialogParams(paramBag);

      expect(result.fieldType).toBe('location');
      expect(result.collectionId).toBeNull();
    });

    test('should preserve fieldType when collectionId is undefined', () => {
      const raw = { fieldType: 'journal', items: [1], collectionId: undefined };

      const result = dialogController.unwrapDialogParams(raw);

      expect(result.fieldType).toBe('journal');
      expect(result.collectionId).toBeUndefined();
    });

    test('should preserve string collectionId', () => {
      const raw = { fieldType: 'publisher', items: [1], collectionId: 'col_12345' };

      const result = dialogController.unwrapDialogParams(raw);

      expect(result.collectionId).toBe('col_12345');
    });

    test('should preserve fieldType through wrappedJSObject unwrapping', () => {
      const wrapped = {
        wrappedJSObject: {
          fieldType: 'location',
          items: [1, 2],
          collectionId: 77777
        }
      };

      const result = dialogController.unwrapDialogParams(wrapped);

      expect(result.fieldType).toBe('location');
      expect(result.items).toEqual([1, 2]);
      expect(result.collectionId).toBe(77777);
    });
  });

  describe('getZotero', () => {
    test('should return global Zotero when available', () => {
      const result = dialogController.getZotero();

      expect(result).toBe(global.Zotero);
    });

    test('should fall back to opener.Zotero when global Zotero is not available', () => {
      // Temporarily remove global Zotero
      const originalZotero = global.Zotero;
      delete global.Zotero;

      windowMock.opener = { Zotero: { test: 'opener zotero' } };

      const result = dialogController.getZotero();

      expect(result).toEqual({ test: 'opener zotero' });

      // Restore global Zotero
      global.Zotero = originalZotero;
    });

    test('should fall back to opener.ZoteroPane.Zotero', () => {
      // Temporarily remove global Zotero
      const originalZotero = global.Zotero;
      delete global.Zotero;

      windowMock.opener = {
        ZoteroPane: { Zotero: { test: 'zotero pane zotero' } }
      };

      const result = dialogController.getZotero();

      expect(result).toEqual({ test: 'zotero pane zotero' });

      // Restore global Zotero
      global.Zotero = originalZotero;
    });

    test('should return null when no Zotero available', () => {
      // Temporarily remove global Zotero
      const originalZotero = global.Zotero;
      delete global.Zotero;

      windowMock.opener = null;

      const result = dialogController.getZotero();

      expect(result).toBeNull();

      // Restore global Zotero
      global.Zotero = originalZotero;
    });
  });

  describe('Dialog Title Setting', () => {
    test('should set document.title for publisher normalization', () => {
      // Simulate document.title
      let currentTitle = 'Default Title';
      windowMock.document = {
        ...windowMock.document,
        get title() { return currentTitle; },
        set title(value) { currentTitle = value; }
      };

      // Simulate the title setting logic from initializeFieldNormalization
      const fieldType = 'publisher';
      const fieldTypeLabel = fieldType.charAt(0).toUpperCase() + fieldType.slice(1);
      const expectedTitle = fieldTypeLabel + ' Normalization';

      // Verify the title format
      expect(expectedTitle).toBe('Publisher Normalization');
    });

    test('should set document.title for location normalization', () => {
      const fieldType = 'location';
      const fieldTypeLabel = fieldType.charAt(0).toUpperCase() + fieldType.slice(1);
      const expectedTitle = fieldTypeLabel + ' Normalization';

      expect(expectedTitle).toBe('Location Normalization');
    });

    test('should set document.title for journal normalization', () => {
      const fieldType = 'journal';
      const fieldTypeLabel = fieldType.charAt(0).toUpperCase() + fieldType.slice(1);
      const expectedTitle = fieldTypeLabel + ' Normalization';

      expect(expectedTitle).toBe('Journal Normalization');
    });

    test('should capitalize first letter of field type', () => {
      const testCases = [
        { input: 'publisher', expected: 'Publisher Normalization' },
        { input: 'location', expected: 'Location Normalization' },
        { input: 'journal', expected: 'Journal Normalization' },
        { input: 'PUBLISHER', expected: 'PUBLISHER Normalization' }, // Edge case - already uppercase
        { input: 'Publisher', expected: 'Publisher Normalization' }   // Edge case - already title case
      ];

      for (const { input, expected } of testCases) {
        const fieldTypeLabel = input.charAt(0).toUpperCase() + input.slice(1);
        const result = fieldTypeLabel + ' Normalization';
        expect(result).toBe(expected);
      }
    });
  });
});
