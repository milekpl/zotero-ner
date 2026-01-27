describe('Full workflow integration', () => {
  beforeEach(() => {
    jest.resetModules();
    global._nerStorage = {};

    global.Zotero = {
      debug: jest.fn(),
      logError: jest.fn(),
      getMainWindow: jest.fn(),
      getActiveZoteroPane: jest.fn(() => ({
        getSelectedItems: jest.fn(() => [])
      }))
    };

    global.window = {
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
      }
    };
  });

  afterEach(() => {
    delete global.Zotero;
    delete global.ZoteroNER;
    delete global.window;
    delete global._nerStorage;
  });

  test('Zotero.NER full library workflow triggers dialog with analysis results', async () => {
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

    global.ZoteroNER = {
      NERProcessor: jest.fn(() => ({})),
      NameParser: jest.fn(() => ({})),
      LearningEngine: jest.fn(() => ({})),
      NormalizerDialog: jest.fn(() => ({})),
      ZoteroDBAnalyzer: jest.fn(() => mockAnalyzerInstance)
    };

    require('../../content/scripts/zotero-ner.js');

    const mainWindowStub = {
      openDialog: jest.fn(),
      alert: jest.fn()
    };
    global.Zotero.getMainWindow.mockReturnValue(mainWindowStub);

    global.Zotero.NER.init({ window: global.window });
    await global.Zotero.NER.showDialogForFullLibrary();

    expect(mockAnalyzerInstance.analyzeFullLibrary).toHaveBeenCalled();
    expect(mainWindowStub.openDialog).toHaveBeenCalledWith(
      'chrome://zoteroner/content/dialog.html',
      'zotero-ner-normalization-dialog',
      expect.any(String),
      expect.objectContaining({
        analysisResults
      })
    );
  });

  test('MenuIntegration handles full library analysis end-to-end', async () => {
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
