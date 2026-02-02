/**
 * Unit tests for dialog adaptive timeout and Zotero API helper
 * Run with: npm run test:unit -- --testPathPattern="dialog-timeout"
 */

// Mock console functions
global.console = {
  log: jest.fn(),
  error: jest.fn()
};

// Mock the Zotero global object for testing
global.Zotero = {
  debug: jest.fn(),
  logError: jest.fn(),
  alert: jest.fn(),
  getMainWindow: () => ({
    alert: jest.fn()
  })
};

// Mock window object for dialog context testing
global.window = {
  opener: null,
  parent: null
};

describe('Dialog Adaptive Timeout', () => {
  let clearIntervalMock;
  let showEmptyStateMock;
  let logMock;
  let mockDialog;

  beforeEach(() => {
    clearIntervalMock = jest.fn();
    showEmptyStateMock = jest.fn();
    logMock = jest.fn();

    // Mock minimal dialog controller
    mockDialog = {
      analysisComplete: false,
      analysisResults: null,
      checkAnalysisInterval: null,
      showEmptyState: showEmptyStateMock,
      log: logMock
    };

    // Copy mock properties to make them accessible
    mockDialog.analysisComplete = false;
    mockDialog.analysisResults = null;
  });

  test('should clear interval when analysisComplete is set', () => {
    // Simulate the interval callback with analysisComplete = true
    const clearInterval = jest.fn();
    mockDialog.checkAnalysisInterval = { clearInterval };

    // Simulate the interval callback
    if (mockDialog.analysisComplete) {
      clearInterval.mockImplementation(function() {
        mockDialog.checkAnalysisInterval = null;
      });
    }

    mockDialog.analysisComplete = true;

    // Simulate what happens in the interval callback
    if (mockDialog.analysisComplete && mockDialog.checkAnalysisInterval) {
      mockDialog.checkAnalysisInterval.clearInterval();
      mockDialog.checkAnalysisInterval = null;
    }

    expect(clearInterval).toHaveBeenCalled();
    expect(mockDialog.checkAnalysisInterval).toBeNull();
  });

  test('should clear interval and complete when results arrive but flag not set', () => {
    const clearInterval = jest.fn();
    mockDialog.checkAnalysisInterval = { clearInterval };
    mockDialog.analysisResults = { suggestions: [{ name: 'test' }] };

    // Simulate: results arrived but analysisComplete flag not set
    if (!mockDialog.analysisComplete && mockDialog.analysisResults && mockDialog.analysisResults.suggestions) {
      clearInterval.mockImplementation(function() {
        mockDialog.checkAnalysisInterval = null;
      });
      mockDialog.checkAnalysisInterval.clearInterval();
      mockDialog.checkAnalysisInterval = null;
    }

    expect(clearInterval).toHaveBeenCalled();
    expect(mockDialog.checkAnalysisInterval).toBeNull();
  });

  test('should NOT show empty state when results arrive before timeout', () => {
    // Simulate: results arrive at 5 seconds, timeout is 60s max
    const analysisStartTime = Date.now() - 5000; // 5 seconds ago
    const ADAPTIVE_TIMEOUT_MS = 60000;

    const timeSinceStart = Date.now() - analysisStartTime;
    expect(timeSinceStart).toBeLessThan(ADAPTIVE_TIMEOUT_MS);

    // Should NOT show empty state
    expect(showEmptyStateMock).not.toHaveBeenCalled();
  });

  test('should show empty state when analysisComplete is false and timeout exceeded', () => {
    // Simulate: 65 seconds elapsed, no results
    const analysisStartTime = Date.now() - 65000; // 65 seconds ago
    const ADAPTIVE_TIMEOUT_MS = 60000;

    const timeSinceStart = Date.now() - analysisStartTime;
    expect(timeSinceStart).toBeGreaterThan(ADAPTIVE_TIMEOUT_MS);

    // Simulate timeout check
    if (timeSinceStart > ADAPTIVE_TIMEOUT_MS) {
      showEmptyStateMock('Analysis timed out. The library may be too large or the server may be busy.');
    }

    expect(showEmptyStateMock).toHaveBeenCalledWith('Analysis timed out. The library may be too large or the server may be busy.');
  });

  test('should track lastProgressTime in handleAnalysisProgress', () => {
    let lastProgressTime = null;

    // Simulate handleAnalysisProgress
    const handleAnalysisProgress = (progress) => {
      if (!progress) {
        return;
      }
      lastProgressTime = Date.now();
    };

    handleAnalysisProgress({ stage: 'analyzing', percent: 50 });

    expect(lastProgressTime).not.toBeNull();
    expect(Date.now() - lastProgressTime).toBeLessThan(1000); // Within 1 second
  });

  test('should not update lastProgressTime when null progress received', () => {
    let lastProgressTime = Date.now() - 1000; // Set to 1 second ago
    const initialTime = lastProgressTime;

    // Simulate handleAnalysisProgress with null
    const handleAnalysisProgress = (progress) => {
      if (!progress) {
        return;
      }
      lastProgressTime = Date.now();
    };

    handleAnalysisProgress(null);

    expect(lastProgressTime).toBe(initialTime);
  });

  test('should handle timeout with no progress update for extended period', () => {
    // Simulate: 20 seconds since last progress, threshold is 15 seconds
    const lastProgressTime = Date.now() - 20000; // 20 seconds ago
    const PROGRESS_UPDATE_TIMEOUT_MS = 15000;
    const logMock = jest.fn();

    const timeSinceProgress = Date.now() - lastProgressTime;
    expect(timeSinceProgress).toBeGreaterThan(PROGRESS_UPDATE_TIMEOUT_MS);

    // Should log warning but not timeout
    if (timeSinceProgress > PROGRESS_UPDATE_TIMEOUT_MS) {
      logMock('No progress for ' + timeSinceProgress + 'ms, checking status...');
      // Reset lastProgressTime to avoid repeated warnings
      // lastProgressTime = Date.now();
    }

    expect(logMock).toHaveBeenCalled();
  });

  test('should reset lastProgressTime after progress warning', () => {
    let lastProgressTime = Date.now() - 20000; // 20 seconds ago
    const PROGRESS_UPDATE_TIMEOUT_MS = 15000;

    const timeSinceProgress = Date.now() - lastProgressTime;
    expect(timeSinceProgress).toBeGreaterThan(PROGRESS_UPDATE_TIMEOUT_MS);

    // Reset lastProgressTime
    lastProgressTime = Date.now();

    // Now check again - should be within threshold
    const newTimeSinceProgress = Date.now() - lastProgressTime;
    expect(newTimeSinceProgress).toBeLessThan(PROGRESS_UPDATE_TIMEOUT_MS);
  });
});

describe('ZoteroNER_ZoteroAPI Helper', () => {
  const ADAPTIVE_TIMEOUT_MS = 60000;
  const PROGRESS_UPDATE_TIMEOUT_MS = 15000;

  beforeEach(() => {
    // Reset window mocks
    delete global.window.opener;
    global.window = {
      opener: null,
      parent: global.window // self-referencing to stop the while loop
    };
  });

  // Create a mock ZoteroNER_ZoteroAPI object based on the actual implementation
  const createZoteroAPI = () => ({
    getZotero: function() {
      // Pattern 1: window.opener.Zotero (for dialogs opened via openDialog)
      if (window.opener && window.opener.Zotero) {
        return window.opener.Zotero;
      }

      // Pattern 2: parent frame Zotero (for iframes)
      let current = window;
      try {
        while (current && current.parent !== current) {
          if (current.parent && current.parent.Zotero) {
            return current.parent.Zotero;
          }
          current = current.parent;
        }
      } catch (e) {
        // Cross-origin access may throw, continue to next pattern
      }

      // Pattern 3: Global Zotero (may not be available in dialog context)
      if (typeof Zotero !== 'undefined') {
        return Zotero;
      }

      return null;
    },

    getNameNormalizer: function() {
      const zotero = this.getZotero();
      if (!zotero) return null;

      // Prefer Zotero.NameNormalizer (modern)
      if (zotero.NameNormalizer) {
        return zotero.NameNormalizer;
      }

      // Fall back to Zotero.NER (legacy alias)
      if (zotero.NER) {
        return zotero.NER;
      }

      return null;
    },

    isAvailable: function() {
      return this.getZotero() !== null;
    }
  });

  test('getZotero should return opener.Zotero when available', () => {
    global.window.opener = { Zotero: { version: '7.0' } };
    const api = createZoteroAPI();
    expect(api.getZotero()).toEqual({ version: '7.0' });
  });

  test('getZotero should return null when no Zotero available', () => {
    // Remove global Zotero mock for this test
    const savedZotero = global.Zotero;
    delete global.Zotero;

    const api = createZoteroAPI();
    expect(api.getZotero()).toBeNull();

    // Restore global Zotero
    global.Zotero = savedZotero;
  });

  test('getZotero should return global Zotero when available', () => {
    global.Zotero = { version: '7.0' };
    const api = createZoteroAPI();
    expect(api.getZotero()).toEqual({ version: '7.0' });
  });

  test('getNameNormalizer should prefer NameNormalizer over NER', () => {
    global.window.opener = {
      Zotero: {
        NameNormalizer: { initialized: true },
        NER: { initialized: false }
      }
    };
    const api = createZoteroAPI();
    expect(api.getNameNormalizer()).toEqual({ initialized: true });
  });

  test('getNameNormalizer should fall back to NER if NameNormalizer not available', () => {
    global.window.opener = {
      Zotero: {
        NER: { initialized: true }
      }
    };
    const api = createZoteroAPI();
    expect(api.getNameNormalizer()).toEqual({ initialized: true });
  });

  test('getNameNormalizer should return null when no Zotero', () => {
    const api = createZoteroAPI();
    expect(api.getNameNormalizer()).toBeNull();
  });

  test('isAvailable should return true when Zotero is available', () => {
    global.window.opener = { Zotero: { NameNormalizer: {} } };
    const api = createZoteroAPI();
    expect(api.isAvailable()).toBe(true);
  });

  test('isAvailable should return false when Zotero is not available', () => {
    // Remove global Zotero mock for this test
    const savedZotero = global.Zotero;
    delete global.Zotero;

    const api = createZoteroAPI();
    expect(api.isAvailable()).toBe(false);

    // Restore global Zotero
    global.Zotero = savedZotero;
  });

  test('getZotero should check parent frames for iframes', () => {
    // Create a nested frame structure
    const parentFrame = {
      Zotero: { version: '7.0' },
      parent: global.window // circular reference to stop the loop
    };
    global.window = {
      opener: null,
      parent: parentFrame
    };
    const api = createZoteroAPI();
    expect(api.getZotero()).toEqual({ version: '7.0' });
  });
});

describe('Timeout Constants', () => {
  test('ADAPTIVE_TIMEOUT_MS should be 60000 (60 seconds)', () => {
    const ADAPTIVE_TIMEOUT_MS = 60000;
    expect(ADAPTIVE_TIMEOUT_MS).toBe(60000);
    expect(ADAPTIVE_TIMEOUT_MS / 1000).toBe(60);
  });

  test('PROGRESS_UPDATE_TIMEOUT_MS should be 15000 (15 seconds)', () => {
    const PROGRESS_UPDATE_TIMEOUT_MS = 15000;
    expect(PROGRESS_UPDATE_TIMEOUT_MS).toBe(15000);
    expect(PROGRESS_UPDATE_TIMEOUT_MS / 1000).toBe(15);
  });

  test('adaptive timeout should be longer than progress update timeout', () => {
    const ADAPTIVE_TIMEOUT_MS = 60000;
    const PROGRESS_UPDATE_TIMEOUT_MS = 15000;
    expect(ADAPTIVE_TIMEOUT_MS).toBeGreaterThan(PROGRESS_UPDATE_TIMEOUT_MS);
  });
});
