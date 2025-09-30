/**
 * Unit tests for zotero-ner.js - Main Zotero integration file
 */

// Mock the Zotero global object
const mockZoteroDB = {
  query: jest.fn()
};

const mockActivePane = {
  getSelectedItems: jest.fn()
};

global.Zotero = {
  NER: null, // Initially undefined, will be defined by the script
  getMainWindow: () => ({
    alert: jest.fn()
  }),
  getActiveZoteroPane: () => mockActivePane,
  DB: mockZoteroDB,
  debug: jest.fn(),
  logError: jest.fn()
};

global.window = {
  document: {
    createElement: jest.fn(),
    querySelector: jest.fn(),
    getElementsByTagName: jest.fn(() => []),
    head: { appendChild: jest.fn() }
  },
  setTimeout: jest.fn((fn) => fn()) // Execute immediately for testing
};

// Mock the ZoteroNER object that might be available
global.ZoteroNER = {
  NERProcessor: jest.fn(),
  NameParser: jest.fn(),
  LearningEngine: jest.fn(),
  NormalizerDialog: jest.fn(),
  ItemProcessor: jest.fn(),
  ZoteroDBAnalyzer: jest.fn()
};

// Also mock the constructors
const mockNERProcessorInstance = {};
const mockNameParserInstance = {};
const mockLearningEngineInstance = {};
const mockNormalizerDialogInstance = {};
const mockItemProcessorInstance = {};
const mockZoteroDBAnalyzerInstance = {};

global.ZoteroNER.NERProcessor = jest.fn(() => mockNERProcessorInstance);
global.ZoteroNER.NameParser = jest.fn(() => mockNameParserInstance);
global.ZoteroNER.LearningEngine = jest.fn(() => mockLearningEngineInstance);
global.ZoteroNER.NormalizerDialog = jest.fn(() => mockNormalizerDialogInstance);
global.ZoteroNER.ItemProcessor = jest.fn(() => mockItemProcessorInstance);
global.ZoteroNER.ZoteroDBAnalyzer = jest.fn(() => mockZoteroDBAnalyzerInstance);

// Now run the actual script to initialize Zotero.NER
const fs = require('fs');
const path = require('path');
const scriptContent = fs.readFileSync(path.join(__dirname, '../../content/scripts/zotero-ner.js'), 'utf8');

// Execute the script content
eval(scriptContent);

describe('Zotero NER Integration', () => {
  let zoteroNER;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Ensure the Zotero.NER object was created
    zoteroNER = global.Zotero.NER;
    expect(zoteroNER).toBeDefined();
  });

  test('should initialize properly', () => {
    expect(zoteroNER.initialized).toBe(false);
    
    // Call init to test initialization
    zoteroNER.init();
    
    expect(zoteroNER.initialized).toBe(true);
    expect(zoteroNER.nerProcessor).toBeDefined();
    expect(zoteroNER.nameParser).toBeDefined();
    expect(zoteroNER.learningEngine).toBeDefined();
    expect(zoteroNER.normalizerDialog).toBeDefined();
  });

  test('should handle initialization with options', () => {
    const mockWindow = {
      ZoteroNER: {
        NERProcessor: jest.fn(() => mockNERProcessorInstance),
        NameParser: jest.fn(() => mockNameParserInstance),
        LearningEngine: jest.fn(() => mockLearningEngineInstance),
        NormalizerDialog: jest.fn(() => mockNormalizerDialogInstance)
      }
    };
    
    zoteroNER.initialized = false; // Reset for this test
    zoteroNER.init({ window: mockWindow });
    
    expect(zoteroNER.initialized).toBe(true);
  });

  test('showDialogForFullLibrary should work with proper DB access', async () => {
    // Mock the ZoteroDBAnalyzer
    const mockAnalyzer = {
      analyzeFullLibrary: jest.fn().mockResolvedValue({
        suggestions: [{ primary: 'Smith', variants: [{ name: 'Smyth', frequency: 1 }] }]
      })
    };
    
    // Mock the bundled ZoteroNER
    global.ZoteroNER.ZoteroDBAnalyzer = jest.fn(() => mockAnalyzer);
    
    zoteroNER.init();
    
    // Mock the openDialog function
    const mockOpenDialog = jest.fn();
    global.Zotero.getMainWindow = () => ({
      openDialog: mockOpenDialog
    });
    
    // Call the function
    await zoteroNER.showDialogForFullLibrary();
    
    // Verify that dialog was opened with analysis results
    expect(mockOpenDialog).toHaveBeenCalledWith(
      expect.any(String), // dialog URL
      expect.any(String), // dialog ID
      expect.any(String), // dialog features
      expect.objectContaining({
        analysisResults: expect.any(Object)
      })
    );
  });

  test('showDialogForFullLibrary should handle DB errors gracefully', async () => {
    // Mock the analyzer to throw an error
    const mockAnalyzer = {
      analyzeFullLibrary: jest.fn().mockRejectedValue(new Error('DB Error'))
    };
    
    global.ZoteroNER.ZoteroDBAnalyzer = jest.fn(() => mockAnalyzer);
    
    zoteroNER.init();
    
    // Mock alert function
    const mockAlert = jest.fn();
    global.Zotero.getMainWindow = () => ({
      alert: mockAlert
    });
    
    // Call the function and expect it not to crash
    await expect(zoteroNER.showDialogForFullLibrary()).resolves.not.toThrow();
  });

  test('showDialog should handle null/undefined items properly', () => {
    zoteroNER.init();
    
    // Mock the openDialog function
    const mockOpenDialog = jest.fn();
    global.Zotero.getMainWindow = () => ({
      openDialog: mockOpenDialog
    });
    
    // Call showDialog with null items
    zoteroNER.showDialog(null);
    
    // Verify dialog was opened with null items
    expect(mockOpenDialog).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        items: null,
        analysisResults: undefined
      })
    );
  });

  test('should handle missing ZoteroNER gracefully', () => {
    // Temporarily remove ZoteroNER to test fallback
    const originalZoteroNER = global.ZoteroNER;
    global.ZoteroNER = undefined;
    
    zoteroNER.init();
    
    // Should still initialize without crashing
    expect(zoteroNER.initialized).toBe(true);
    
    // Restore ZoteroNER
    global.ZoteroNER = originalZoteroNER;
  });
});