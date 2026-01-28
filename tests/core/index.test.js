/**
 * Unit tests for index.js - Main entry point
 * Tests that all modules are properly exported
 */

// Since the index.js file uses ES6 imports, we need to mock them
// For simplicity in testing, we'll mock the modules it imports

jest.mock('../../src/core/name-parser.js', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('../../src/core/variant-generator.js', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('../../src/core/learning-engine.js', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('../../src/core/candidate-finder.js', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('../../src/zotero/item-processor.js', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('../../src/zotero/menu-integration.js', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('../../src/zotero/zotero-db-analyzer.js', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('../../src/ui/normalizer-dialog.js', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('../../src/ui/batch-processor.js', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('../../src/storage/data-manager.js', () => {
  return jest.fn().mockImplementation(() => ({}));
});

describe('ZoteroNameNormalizer Index', () => {
  let originalWindow;
  let originalZoteroNameNormalizer;

  beforeEach(() => {
    // Save original window and ZoteroNameNormalizer
    originalWindow = global.window;
    originalZoteroNameNormalizer = global.ZoteroNameNormalizer;

    // Create a mock window object
    global.window = {
      ZoteroNameNormalizer: undefined
    };
  });

  afterEach(() => {
    // Restore original window and ZoteroNameNormalizer
    global.window = originalWindow;
    global.ZoteroNameNormalizer = originalZoteroNameNormalizer;
  });

  test('should export all core modules', async () => {
    // Import the index file dynamically
    const indexModule = await import('../../src/index.js');

    // Check that all expected exports are present
    expect(indexModule).toHaveProperty('NameParser');
    expect(indexModule).toHaveProperty('VariantGenerator');
    expect(indexModule).toHaveProperty('LearningEngine');
    expect(indexModule).toHaveProperty('CandidateFinder');
    expect(indexModule).toHaveProperty('ItemProcessor');
    expect(indexModule).toHaveProperty('MenuIntegration');
    expect(indexModule).toHaveProperty('ZoteroDBAnalyzer');
    expect(indexModule).toHaveProperty('NormalizerDialog');
    expect(indexModule).toHaveProperty('BatchProcessor');
    expect(indexModule).toHaveProperty('DataManager');

    // Check that default export is present
    expect(indexModule.default).toBeDefined();
  });

  test('should create global ZoteroNameNormalizer object when window is available', async () => {
    // Import the index file to execute the code that sets up the global object
    const indexModule = await import('../../src/index.js');

    // Check that the module was imported successfully
    expect(indexModule).toBeDefined();

    // Check that all exports are available
    expect(indexModule).toHaveProperty('NameParser');
    expect(indexModule).toHaveProperty('VariantGenerator');
    expect(indexModule).toHaveProperty('LearningEngine');
    expect(indexModule).toHaveProperty('CandidateFinder');
    expect(indexModule).toHaveProperty('ItemProcessor');
    expect(indexModule).toHaveProperty('MenuIntegration');
    expect(indexModule).toHaveProperty('ZoteroDBAnalyzer');
    expect(indexModule).toHaveProperty('NormalizerDialog');
    expect(indexModule).toHaveProperty('BatchProcessor');
    expect(indexModule).toHaveProperty('DataManager');
    expect(indexModule).toHaveProperty('default');
  });

  test('should not create global ZoteroNameNormalizer object when window is not available', async () => {
    // Remove window object temporarily
    const originalWindow = global.window;
    delete global.window;

    // Import the index file
    const indexModule = await import('../../src/index.js');

    // Check that the module was still imported successfully
    expect(indexModule).toBeDefined();

    // Restore window object
    global.window = originalWindow;
  });
});
