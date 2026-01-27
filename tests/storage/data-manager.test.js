/**
 * Unit tests for DataManager
 * Tests the data persistence functionality
 */

// Mock console functions
global.console = {
  log: jest.fn(),
  error: jest.fn()
};

// Mock localStorage for testing
let localStorageStore = {};

// Mock the global localStorage
global.localStorage = {
  getItem: jest.fn((key) => localStorageStore[key] || null),
  setItem: jest.fn((key, value) => {
    localStorageStore[key] = value.toString();
  }),
  removeItem: jest.fn((key) => {
    delete localStorageStore[key];
  }),
  clear: jest.fn(() => {
    localStorageStore = {};
  })
};

const DataManager = require('../../src/storage/data-manager.js');

describe('DataManager', () => {
  let dataManager;

  beforeEach(() => {
    dataManager = new DataManager();
    // Clear localStorage before each test
    localStorage.clear();
    // Clear console mocks
    console.log.mockClear();
    console.error.mockClear();
  });

  describe('constructor', () => {
    test('should initialize with correct keys', () => {
      expect(dataManager.settingsKey).toBe('ner_normalizer_settings');
      expect(dataManager.mappingsKey).toBe('ner_normalizer_mappings');
    });
  });

  describe('saveSettings', () => {
    test('should save settings to localStorage', async () => {
      const settings = {
        autoApplyLearned: true,
        showSuggestionsThreshold: 0.8,
        enableSpanishSurnameDetection: true
      };

      const result = await dataManager.saveSettings(settings);
      
      expect(result).toBe(true);
      expect(localStorage.getItem(dataManager.settingsKey)).toBeTruthy();
    });

    test('should handle errors when saving settings', async () => {
      // Mock localStorage.setItem to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage error');
      });

      const settings = { autoApplyLearned: true };
      const result = await dataManager.saveSettings(settings);
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();

      // Restore original function
      localStorage.setItem = originalSetItem;
    });
  });

  describe('loadSettings', () => {
    test('should load settings from localStorage', async () => {
      const settings = {
        autoApplyLearned: false,
        showSuggestionsThreshold: 0.9,
        enableSpanishSurnameDetection: false
      };
      
      // Save settings first
      await dataManager.saveSettings(settings);
      
      // Load settings
      const loadedSettings = await dataManager.loadSettings();
      
      expect(loadedSettings).toEqual(settings);
    });

    test('should return default settings when none are stored', async () => {
      const defaultSettings = dataManager.getDefaultSettings();
      const loadedSettings = await dataManager.loadSettings();
      
      expect(loadedSettings).toEqual(defaultSettings);
    });

    test('should handle errors when loading settings', async () => {
      // Save invalid JSON to localStorage
      localStorage.setItem(dataManager.settingsKey, '{ invalid json }');
      
      const defaultSettings = dataManager.getDefaultSettings();
      const loadedSettings = await dataManager.loadSettings();
      
      expect(loadedSettings).toEqual(defaultSettings);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getDefaultSettings', () => {
    test('should return default settings object', () => {
      const defaultSettings = dataManager.getDefaultSettings();
      
      expect(defaultSettings).toHaveProperty('autoApplyLearned', true);
      expect(defaultSettings).toHaveProperty('showSuggestionsThreshold', 0.8);
      expect(defaultSettings).toHaveProperty('enableSpanishSurnameDetection', true);
    });
  });

  describe('saveMappings', () => {
    test('should save mappings to localStorage', async () => {
      const mappings = new Map([
        ['J. Smith', 'John Smith'],
        ['J.A. Smith', 'John A. Smith']
      ]);

      const result = await dataManager.saveMappings(mappings);
      
      expect(result).toBe(true);
      expect(localStorage.getItem(dataManager.mappingsKey)).toBeTruthy();
    });

    test('should handle errors when saving mappings', async () => {
      // Mock localStorage.setItem to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage error');
      });

      const mappings = new Map([['J. Smith', 'John Smith']]);
      const result = await dataManager.saveMappings(mappings);
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();

      // Restore original function
      localStorage.setItem = originalSetItem;
    });
  });

  describe('loadMappings', () => {
    test('should load mappings from localStorage', async () => {
      const mappings = new Map([
        ['J. Smith', 'John Smith'],
        ['J.A. Smith', 'John A. Smith']
      ]);
      
      // Save mappings first
      await dataManager.saveMappings(mappings);
      
      // Load mappings
      const loadedMappings = await dataManager.loadMappings();
      
      expect(loadedMappings).toBeInstanceOf(Map);
      expect(loadedMappings.size).toBe(2);
      expect(loadedMappings.get('J. Smith')).toBe('John Smith');
      expect(loadedMappings.get('J.A. Smith')).toBe('John A. Smith');
    });

    test('should return empty map when none are stored', async () => {
      const loadedMappings = await dataManager.loadMappings();
      
      expect(loadedMappings).toBeInstanceOf(Map);
      expect(loadedMappings.size).toBe(0);
    });

    test('should handle errors when loading mappings', async () => {
      // Save invalid JSON to localStorage
      localStorage.setItem(dataManager.mappingsKey, '{ invalid json }');
      
      const loadedMappings = await dataManager.loadMappings();
      
      expect(loadedMappings).toBeInstanceOf(Map);
      expect(loadedMappings.size).toBe(0);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('clearAllData', () => {
    test('should remove all stored data', async () => {
      const settings = { autoApplyLearned: true };
      const mappings = new Map([['J. Smith', 'John Smith']]);
      
      // Save data first
      await dataManager.saveSettings(settings);
      await dataManager.saveMappings(mappings);
      
      // Verify data was saved
      expect(localStorage.getItem(dataManager.settingsKey)).toBeTruthy();
      expect(localStorage.getItem(dataManager.mappingsKey)).toBeTruthy();
      
      // Clear all data
      await dataManager.clearAllData();
      
      // Verify data was removed
      expect(localStorage.getItem(dataManager.settingsKey)).toBeNull();
      expect(localStorage.getItem(dataManager.mappingsKey)).toBeNull();
    });
  });
});