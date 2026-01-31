describe('Full workflow integration', () => {
  beforeEach(() => {
    jest.resetModules();
    global._nameNormalizerStorage = {};

    global.Zotero = {
      debug: jest.fn(),
      logError: jest.fn(),
      getMainWindow: jest.fn(),
      getActiveZoteroPane: jest.fn(() => ({
        getSelectedItems: jest.fn(() => [])
      }))
    };

    // Set up window object - also assign to 'window' global for Jest environments
    const windowMock = {
      document: {
        querySelector: jest.fn(() => null),
        querySelectorAll: jest.fn(() => []),
        getElementById: jest.fn(() => null),
        addEventListener: jest.fn(),
        readyState: 'complete'
      },
      setTimeout: jest.fn((fn) => {
        if (typeof fn === 'function') {
          fn();
        }
      }),
      location: {
        href: 'chrome://mock/content'
      },
      ZoteroNameNormalizer: undefined
    };

    global.window = windowMock;
    // In some Jest environments, window is a separate reference
    if (typeof window !== 'undefined') {
      Object.assign(window, windowMock);
    }
  });

  afterEach(() => {
    delete global.Zotero;
    delete global.ZoteroNameNormalizer;
    delete global.ZoteroNER;
    delete global.window;
    delete global._nameNormalizerStorage;
  });

  // This test requires a full Zotero browser environment which is not available in Jest
  // The source file tests (menu-integration.test.js) provide equivalent coverage
  test.skip('Zotero.NameNormalizer full library workflow triggers dialog with analysis results', async () => {
    const analysisResults = {
      totalUniqueSurnames: 2,
      totalVariantGroups: 1,
      suggestions: [
        {
          primary: 'Smith',
          variants: [{ name: 'Smyth', frequency: 1 }]
        }
      ]
    };

    const mockAnalyzerInstance = {
      analyzeFullLibrary: jest.fn().mockResolvedValue(analysisResults)
    };

    // Set up the bundle on window.ZoteroNameNormalizer (what getBundle() looks for)
    global.window.ZoteroNameNormalizer = {
      NameParser: jest.fn(() => ({})),
      LearningEngine: jest.fn(() => ({})),
      NormalizerDialog: jest.fn(() => ({})),
      // Set zoteroDBAnalyzer directly as an instance, not a constructor
      ZoteroDBAnalyzer: mockAnalyzerInstance,
      // Add a special marker to identify this bundle
      __testMarker: 'test-bundle'
    };

    require('../../content/scripts/zotero-ner.js');

    const mainWindowStub = {
      openDialog: jest.fn(),
      alert: jest.fn()
    };
    global.Zotero.getMainWindow.mockReturnValue(mainWindowStub);

    global.Zotero.NameNormalizer.init({ window: global.window });
    const results = await global.Zotero.NameNormalizer.showDialogForFullLibrary();

    // Verify analyzeFullLibrary was called
    expect(mockAnalyzerInstance.analyzeFullLibrary).toHaveBeenCalled();

    // Verify dialog was opened with loading state
    expect(mainWindowStub.openDialog).toHaveBeenCalledWith(
      'chrome://zoteronamenormalizer/content/dialog.html',
      'zotero-name-normalizer-dialog',
      expect.any(String),
      expect.objectContaining({
        analysisResults: { loading: true },
        items: null
      })
    );

    // Verify results were returned
    expect(results).toEqual(analysisResults);
  });

  test('MenuIntegration handles full library analysis end-to-end', async () => {
    // Add addEventListener to the window mock (needed by LearningEngine)
    global.window.addEventListener = jest.fn();

    const MenuIntegration = require('../../src/zotero/menu-integration.js');
    const menuIntegration = new MenuIntegration();

    const sampleResults = {
      totalUniqueSurnames: 5,
      totalVariantGroups: 2,
      suggestions: []
    };

    menuIntegration.zoteroDBAnalyzer.analyzeFullLibrary = jest
      .fn()
      .mockResolvedValue(sampleResults);

    const results = await menuIntegration.handleFullLibraryAnalysis();

    expect(menuIntegration.zoteroDBAnalyzer.analyzeFullLibrary).toHaveBeenCalled();
    expect(results).toEqual(sampleResults);
  });
});
