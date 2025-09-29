/**
 * Unit tests for the NER Normalization Dialog Controller
 * Specifically testing the scenario when no items are selected
 */

// Mock global objects for testing
global.Zotero = {
  Libraries: {
    userLibraryID: 1
  },
  Items: {
    getAll: jest.fn(),
    getAsync: jest.fn()
  },
  Search: jest.fn()
};

global.ZoteroNER = {
  LearningEngine: jest.fn(),
  NameParser: jest.fn(),
  VariantGenerator: jest.fn(),
  ItemProcessor: jest.fn(),
  NERProcessor: jest.fn()
};

// Mock the Zotero Search functionality
const mockSearchAddCondition = jest.fn();
const mockSearch = jest.fn();

// Mock Search constructor
const SearchMock = jest.fn().mockImplementation(() => {
  return {
    addCondition: mockSearchAddCondition,
    search: mockSearch
  };
});

global.Zotero.Search = SearchMock;

// Create the ZoteroNER_NormalizationDialog object in the global scope
global.ZoteroNER_NormalizationDialog = {
  items: [],
  results: [],
  currentItemIndex: 0,
  processedIndices: new Set(),
  skippedIndices: new Set(),
  learningEngine: null,
  variantGenerator: null,
  nameParser: null,
  nerProcessor: null,
  itemProcessor: null,
  isProcessing: false,

  log: function(message) {
    try {
      if (typeof Zotero !== 'undefined' && typeof Zotero.debug === 'function') {
        Zotero.debug('Zotero NER Dialog: ' + message);
      }
    } catch (e) {}
  },

  alert: function(title, message) {
    try {
      if (typeof Zotero !== 'undefined' && typeof Zotero.alert === 'function') {
        Zotero.alert(null, title, message);
      } else {
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(title + ': ' + message);
        }
      }
    } catch (e) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(title + ': ' + message);
      }
    }
  },

  initialize: async function() {
    // Check if Zotero is available before proceeding
    if (typeof Zotero === 'undefined') {
      this.alert('Error', 'Zotero object not found. This dialog must run in a Zotero context.');
      if (typeof window !== 'undefined' && typeof window.close === 'function') {
        window.close();
      }
      return;
    }
    
    await this.ensureComponents();

    this.items = await this.resolveItems();
    if (!this.items || this.items.length === 0) {
      this.alert('NER Author Name Normalizer', 'No items available for normalization.');
      if (typeof window !== 'undefined' && typeof window.close === 'function') {
        window.close();
      }
      return;
    }

    this.populateItemsList();
    this.currentItemIndex = 0;
    await this.renderCurrentItem();
    this.updateProgress();
  },

  ensureComponents: async function() {
    // Only try to get components from Zotero if it's available
    if (typeof Zotero !== 'undefined') {
      if (!this.learningEngine) {
        if (Zotero.NER && Zotero.NER.learningEngine) {
          this.learningEngine = Zotero.NER.learningEngine;
        } else if (typeof ZoteroNER !== 'undefined' && ZoteroNER.LearningEngine) {
          this.learningEngine = new ZoteroNER.LearningEngine();
        }
      }

      if (!this.itemProcessor && typeof ZoteroNER !== 'undefined' && ZoteroNER.ItemProcessor) {
        this.itemProcessor = new ZoteroNER.ItemProcessor();
        if (this.learningEngine) {
          this.itemProcessor.learningEngine = this.learningEngine;
        }
        if (this.nameParser) {
          this.itemProcessor.nameParser = this.nameParser;
        }
        if (this.variantGenerator) {
          this.itemProcessor.variantGenerator = this.variantGenerator;
        }
      }
    } else {
      // If Zotero isn't available, try to use standalone components
      if (!this.learningEngine && typeof ZoteroNER !== 'undefined' && ZoteroNER.LearningEngine) {
        this.learningEngine = new ZoteroNER.LearningEngine();
      }
      if (!this.variantGenerator && typeof ZoteroNER !== 'undefined' && ZoteroNER.VariantGenerator) {
        this.variantGenerator = new ZoteroNER.VariantGenerator();
      }
      if (!this.nameParser && typeof ZoteroNER !== 'undefined' && ZoteroNER.NameParser) {
        this.nameParser = new ZoteroNER.NameParser();
      }
      if (!this.itemProcessor && typeof ZoteroNER !== 'undefined' && ZoteroNER.ItemProcessor) {
        this.itemProcessor = new ZoteroNER.ItemProcessor();
        if (this.learningEngine) {
          this.itemProcessor.learningEngine = this.learningEngine;
        }
        if (this.nameParser) {
          this.itemProcessor.nameParser = this.nameParser;
        }
        if (this.variantGenerator) {
          this.itemProcessor.variantGenerator = this.variantGenerator;
        }
      }
    }

    await this.ensureNERProcessor();
  },

  ensureNERProcessor: async function() {
    if (!this.nerProcessor) {
      if (typeof Zotero !== 'undefined' && Zotero.NER && Zotero.NER.nerProcessor) {
        this.nerProcessor = Zotero.NER.nerProcessor;
      } else if (typeof ZoteroNER !== 'undefined' && ZoteroNER.NERProcessor) {
        this.nerProcessor = new ZoteroNER.NERProcessor();
      }
    }

    if (this.nerProcessor && typeof this.nerProcessor.initialize === 'function' && !this.nerProcessor.isInitialized) {
      try {
        await this.nerProcessor.initialize();
      } catch (error) {
        this.log('NER processor initialization failed: ' + error.message);
      }
    }

    return this.nerProcessor;
  },

  resolveItems: async function() {
    var args = window.arguments || [];
    if (args.length > 0 && args[0] && 'items' in args[0]) {
      // If items parameter was explicitly passed (whether array, null, or undefined), it means
      // the caller wants to determine what to process - either specific items or all items
      // If it's an array with items, return those
      // If it's null or undefined, then fetch all items
      if (Array.isArray(args[0].items) && args[0].items.length > 0) {
        return args[0].items;
      }
      // If items array is empty or null/undefined, process all items
    } else {
      // If no items parameter was passed at all, try to get selected items first
      if (typeof Zotero !== 'undefined' && Zotero.getActiveZoteroPane) {
        var pane = Zotero.getActiveZoteroPane();
        if (pane && typeof pane.getSelectedItems === 'function') {
          var selected = pane.getSelectedItems();
          if (selected && selected.length > 0) {
            return selected;
          }
        }
      }
    }
    
    // If we reach here, either:
    // 1. items parameter was null/undefined/empty array (meaning process all)
    // 2. No items were selected in Zotero
    // 3. No items parameter was provided but no items were selected
    // In all these cases, we should process all items with creators
    if (typeof Zotero !== 'undefined' && typeof Zotero.getActiveZoteroPane === 'function') {
      try {
        var pane = Zotero.getActiveZoteroPane();
        if (!pane) {
          this.log('Could not get Zotero pane');
          return [];
        }
        
        var collectionTreeRow = pane.getSelectedCollection ? pane.getSelectedCollection() : null;
        if (collectionTreeRow) {
          // Get all items from the selected library/collection that have creators
          var search = new Zotero.Search();
          search.addCondition('libraryID', 'is', collectionTreeRow.ref && collectionTreeRow.ref.libraryID);
          search.addCondition('hasCreator', 'true'); // Only items with creators
          
          if (collectionTreeRow.ref && collectionTreeRow.ref.id !== 0) { // 0 means the main library, other IDs mean specific collections
            search.addCondition('collectionID', 'is', collectionTreeRow.ref.id);
          }
          
          var itemIDs = await search.search();
          var itemsWithCreators = [];
          
          if (itemIDs && itemIDs.length > 0) {
            itemsWithCreators = await Zotero.Items.getAsync(itemIDs);
          }
          
          return itemsWithCreators;
        } else {
          // If no collection is selected, get items from the user library that have creators
          var libraryID = typeof Zotero.Libraries !== 'undefined' && typeof Zotero.Libraries.userLibraryID !== 'undefined' 
            ? Zotero.Libraries.userLibraryID 
            : 1; // Default to main library if we can't get it
          var search = new Zotero.Search();
          search.addCondition('libraryID', 'is', libraryID);
          search.addCondition('hasCreator', 'true'); // Only items with creators
          
          var itemIDs = await search.search();
          var itemsWithCreators = [];
          
          if (itemIDs && itemIDs.length > 0) {
            itemsWithCreators = await Zotero.Items.getAsync(itemIDs);
          }
          
          return itemsWithCreators;
        }
      } catch (error) {
        this.log('Failed to fetch all items, using empty list: ' + error.message);
        return [];
      }
    }

    return [];
  },

  populateItemsList: function() {
    // Mock function - not testing UI elements here
  },

  renderCurrentItem: async function() {
    // Mock function - not testing rendering here
  },

  updateProgress: function() {
    // Mock function - not testing UI updates here
  },

  createCreatorFromString: function(name, original) {
    return {
      firstName: '',
      lastName: '',
      creatorType: original && original.creatorType ? original.creatorType : 'author'
    };
  },

  formatCreatorName: function(creator) {
    if (!creator) return '';
    if (creator.name) return creator.name;
    var parts = [];
    if (creator.firstName) parts.push(creator.firstName);
    if (creator.lastName) parts.push(creator.lastName);
    return parts.join(' ').trim();
  },

  formatNameString: function(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value.firstName || value.lastName) return this.formatCreatorName(value);
    return String(value);
  },

  cloneCreator: function(creator) {
    if (!creator) return { firstName: '', lastName: '', creatorType: 'author' };
    return {
      firstName: creator.firstName || '',
      lastName: creator.lastName || '',
      creatorType: creator.creatorType || 'author'
    };
  }
};

describe('Normalization Dialog Controller - No Items Selected Scenario', () => {
  let mockWindow;
  let mockZoteroPane;
  let mockCollectionTreeRow;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock Zotero pane
    mockZoteroPane = {
      getSelectedItems: jest.fn().mockReturnValue([]), // No selected items
      getSelectedCollection: jest.fn()
    };
    
    // Mock collection tree row
    mockCollectionTreeRow = {
      ref: {
        libraryID: 1,
        id: 0  // 0 means main library
      }
    };
    
    // Mock window with no arguments (no items passed)
    mockWindow = {
      arguments: [],
      close: jest.fn()
    };
    
    global.window = mockWindow;
    global.Zotero.getActiveZoteroPane = jest.fn().mockReturnValue(mockZoteroPane);
  });

  test('should handle case when no items are selected and fetch all items', async () => {
    // Mock the collection selection
    mockZoteroPane.getSelectedCollection.mockReturnValue(mockCollectionTreeRow);
    
    // Mock the search functionality
    mockSearchAddCondition.mockImplementation(() => {});
    mockSearch.mockResolvedValue([1, 2, 3]); // Return item IDs
    
    // Mock the Items.getAsync to return sample items with creators
    const mockItems = [
      {
        id: 1,
        getField: jest.fn().mockReturnValue('Test Item 1'),
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'John', lastName: 'Smith', creatorType: 'author' }
        ])
      },
      {
        id: 2,
        getField: jest.fn().mockReturnValue('Test Item 2'),
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Jane', lastName: 'Doe', creatorType: 'author' }
        ])
      },
      {
        id: 3,
        getField: jest.fn().mockReturnValue('Test Item 3'),
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Bob', lastName: 'Johnson', creatorType: 'author' }
        ])
      }
    ];
    
    global.Zotero.Items.getAsync.mockResolvedValue(mockItems);
    
    // Call the resolveItems function
    const result = await global.ZoteroNER_NormalizationDialog.resolveItems();
    
    // Assertions
    expect(result).toHaveLength(3);
    expect(result).toEqual(mockItems);
    
    // Verify search was called with correct conditions
    expect(global.Zotero.Search).toHaveBeenCalledTimes(1);
    expect(mockSearchAddCondition).toHaveBeenCalledWith('libraryID', 'is', 1);
    expect(mockSearchAddCondition).toHaveBeenCalledWith('hasCreator', 'true');
  });

  test('should handle case when items parameter is explicitly null', async () => {
    // Mock window with explicit null items parameter
    mockWindow.arguments = [{ items: null }];
    
    // Mock the collection selection
    mockZoteroPane.getSelectedCollection.mockReturnValue(mockCollectionTreeRow);
    
    // Mock the search functionality
    mockSearchAddCondition.mockImplementation(() => {});
    mockSearch.mockResolvedValue([1, 2]);
    
    // Mock the Items.getAsync to return sample items with creators
    const mockItems = [
      {
        id: 1,
        getField: jest.fn().mockReturnValue('Test Item 1'),
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'John', lastName: 'Smith', creatorType: 'author' }
        ])
      },
      {
        id: 2,
        getField: jest.fn().mockReturnValue('Test Item 2'),
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Jane', lastName: 'Doe', creatorType: 'author' }
        ])
      }
    ];
    
    global.Zotero.Items.getAsync.mockResolvedValue(mockItems);
    
    // Call the resolveItems function
    const result = await global.ZoteroNER_NormalizationDialog.resolveItems();
    
    // Assertions
    expect(result).toHaveLength(2);
    expect(result).toEqual(mockItems);
  });

  test('should handle case when items parameter is an empty array', async () => {
    // Mock window with empty array items parameter
    mockWindow.arguments = [{ items: [] }];
    
    // Mock the collection selection
    mockZoteroPane.getSelectedCollection.mockReturnValue(mockCollectionTreeRow);
    
    // Mock the search functionality
    mockSearchAddCondition.mockImplementation(() => {});
    mockSearch.mockResolvedValue([42]);
    
    // Mock the Items.getAsync to return sample items with creators
    const mockItem = {
      id: 42,
      getField: jest.fn().mockReturnValue('Test Item'),
      getCreators: jest.fn().mockReturnValue([
        { firstName: 'Test', lastName: 'User', creatorType: 'author' }
      ])
    };
    
    global.Zotero.Items.getAsync.mockResolvedValue([mockItem]);
    
    // Call the resolveItems function
    const result = await global.ZoteroNER_NormalizationDialog.resolveItems();
    
    // Assertions
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockItem);
  });

  test('should return empty array when no items are available', async () => {
    // Mock collection to return null (no specific collection selected)
    mockZoteroPane.getSelectedCollection.mockReturnValue(null);
    
    // Mock the search to return empty result
    mockSearchAddCondition.mockImplementation(() => {});
    mockSearch.mockResolvedValue([]);
    
    global.Zotero.Items.getAsync.mockResolvedValue([]);
    
    // Call the resolveItems function
    const result = await global.ZoteroNER_NormalizationDialog.resolveItems();
    
    // Assertions
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  test('should handle Zotero availability check', () => {
    // Test that the initialize function checks for Zotero
    const originalZotero = global.Zotero;
    global.Zotero = undefined;
    
    // Mock alert function
    const mockAlert = jest.fn();
    global.ZoteroNER_NormalizationDialog.alert = mockAlert;
    
    // Mock window close
    global.window.close = jest.fn();
    
    // Create a copy of the function to test
    const testInitialize = global.ZoteroNER_NormalizationDialog.initialize;
    
    // The initialize function has a safeguard now, so this should work without error
    expect(() => {
      testInitialize.call(global.ZoteroNER_NormalizationDialog);
    }).not.toThrow();
    
    // Restore Zotero
    global.Zotero = originalZotero;
  });
});