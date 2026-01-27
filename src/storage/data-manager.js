/**
 * Data Manager - Handles data persistence for the extension
 * In a real Zotero extension, this would use Zotero's storage APIs
 */
class DataManager {
  constructor() {
    this.settingsKey = 'name_normalizer_settings';
    this.mappingsKey = 'name_normalizer_mappings';
  }

  /**
   * Save settings
   * @param {Object} settings - Settings object to save
   */
  async saveSettings(settings) {
    try {
      const serialized = JSON.stringify(settings);
      localStorage.setItem(this.settingsKey, serialized);
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  /**
   * Load settings
   * @returns {Object} Loaded settings or default
   */
  async loadSettings() {
    try {
      const stored = localStorage.getItem(this.settingsKey);
      if (stored) {
        return JSON.parse(stored);
      }
      return this.getDefaultSettings();
    } catch (error) {
      console.error('Error loading settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Get default settings
   * @returns {Object} Default settings
   */
  getDefaultSettings() {
    return {
      autoApplyLearned: true,
      showSuggestionsThreshold: 0.8,
      enableSpanishSurnameDetection: true
    };
  }

  /**
   * Save name mappings
   * @param {Map} mappings - Name mappings to save
   */
  async saveMappings(mappings) {
    try {
      const serialized = JSON.stringify([...mappings.entries()]);
      localStorage.setItem(this.mappingsKey, serialized);
      return true;
    } catch (error) {
      console.error('Error saving mappings:', error);
      return false;
    }
  }

  /**
   * Load name mappings
   * @returns {Map} Loaded mappings
   */
  async loadMappings() {
    try {
      const stored = localStorage.getItem(this.mappingsKey);
      if (stored) {
        return new Map(JSON.parse(stored));
      }
      return new Map();
    } catch (error) {
      console.error('Error loading mappings:', error);
      return new Map();
    }
  }

  /**
   * Clear all stored data
   */
  async clearAllData() {
    localStorage.removeItem(this.settingsKey);
    localStorage.removeItem(this.mappingsKey);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataManager;
}
