/**
 * Learning Engine - Handles storing and retrieving learned name mappings with enhanced learning capabilities
 */
class LearningEngine {
  constructor() {
    this.storageKey = 'ner_normalizer_mappings';
    this.settingsKey = 'ner_normalizer_settings';
    this.mappings = new Map();
    this.settings = this.getDefaultSettings();
    this.distinctPairsKey = 'ner_normalizer_distinct_pairs';
    this.distinctPairs = new Map();

    this.loadMappings();
    this.loadSettings();
    this.loadDistinctPairs();
  }

  /**
   * Get the storage object based on environment
   */
  getStorage() {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    } else {
      // For Node.js environment, use a simple in-memory store
      // In a real Zotero extension, this would use Zotero's storage APIs
      if (!global._nerStorage) {
        global._nerStorage = {};
      }
      return {
        getItem: (key) => global._nerStorage[key] || null,
        setItem: (key, value) => { global._nerStorage[key] = value; },
        removeItem: (key) => { delete global._nerStorage[key]; }
      };
    }
  }

  /**
   * Load mappings from storage
   */
  async loadMappings() {
    try {
      const storage = this.getStorage();
      const stored = storage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert back to Map
        this.mappings = new Map(parsed);
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
      this.mappings = new Map();
    }
  }

  /**
   * Save mappings to storage
   */
  async saveMappings() {
    try {
      const storage = this.getStorage();
      const serialized = JSON.stringify([...this.mappings.entries()]);
      storage.setItem(this.storageKey, serialized);
    } catch (error) {
      console.error('Error saving mappings:', error);
    }
  }

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      const storage = this.getStorage();
      const stored = storage.getItem(this.settingsKey);
      if (stored) {
        this.settings = { ...this.getDefaultSettings(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  /**
   * Save settings to storage
   */
  async saveSettings() {
    try {
      const storage = this.getStorage();
      storage.setItem(this.settingsKey, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  async loadDistinctPairs() {
    try {
      const storage = this.getStorage();
      const stored = storage.getItem(this.distinctPairsKey);
      if (stored) {
        this.distinctPairs = new Map(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading distinct name pairs:', error);
      this.distinctPairs = new Map();
    }
  }

  async saveDistinctPairs() {
    try {
      const storage = this.getStorage();
      const serialized = JSON.stringify([...this.distinctPairs.entries()]);
      storage.setItem(this.distinctPairsKey, serialized);
    } catch (error) {
      console.error('Error saving distinct name pairs:', error);
    }
  }

  createPairKey(nameA, nameB, scope = '') {
    if (!nameA || !nameB) {
      return null;
    }

    const canonicalA = this.createCanonicalKey(nameA);
    const canonicalB = this.createCanonicalKey(nameB);
    if (!canonicalA || !canonicalB) {
      return null;
    }

    const sorted = [canonicalA, canonicalB].sort();
    return `${scope || 'global'}::${sorted[0]}|${sorted[1]}`;
  }

  async recordDistinctPair(nameA, nameB, scope = '') {
    const key = this.createPairKey(nameA, nameB, scope);
    if (!key) {
      return false;
    }

    if (!this.distinctPairs.has(key)) {
      this.distinctPairs.set(key, {
        scope: scope || 'global',
        timestamp: Date.now()
      });
      await this.saveDistinctPairs();
      return true;
    }

    return false;
  }

  isDistinctPair(nameA, nameB, scope = '') {
    const key = this.createPairKey(nameA, nameB, scope);
    if (!key) {
      return false;
    }
    return this.distinctPairs.has(key);
  }

  async clearDistinctPair(nameA, nameB, scope = '') {
    const key = this.createPairKey(nameA, nameB, scope);
    if (!key) {
      return false;
    }
    if (this.distinctPairs.delete(key)) {
      await this.saveDistinctPairs();
      return true;
    }
    return false;
  }

  /**
   * Get default settings
   */
  getDefaultSettings() {
    return {
      autoApplyLearned: true,
      confidenceThreshold: 0.8,
      enableSpanishSurnameDetection: true,
      showSimilarityScore: true,
      maxSuggestions: 5
    };
  }

  /**
   * Store a learned mapping
   * @param {string} rawName - Original raw name
   * @param {string} normalized - User-accepted normalized form
   * @param {number} confidence - Confidence score (0-1)
   * @param {Object} context - Additional context information
   */
  async storeMapping(rawName, normalized, confidence = 1.0, context = {}) {
    const canonicalKey = this.createCanonicalKey(rawName);
    const now = Date.now();
    
    // Check if we already have a mapping for this raw name
    if (this.mappings.has(canonicalKey)) {
      const existing = this.mappings.get(canonicalKey);
      // Update the existing mapping with new information
      existing.normalized = normalized;
      existing.confidence = Math.max(existing.confidence, confidence);
      existing.lastUsed = now;
      existing.usageCount = (existing.usageCount || 0) + 1;
      existing.context = { ...existing.context, ...context };
    } else {
      // Create new mapping
      this.mappings.set(canonicalKey, {
        raw: rawName,
        normalized: normalized,
        timestamp: now,
        lastUsed: now,
        confidence: confidence,
        usageCount: 1,
        context: context
      });
    }
    
    await this.saveMappings();
  }

  /**
   * Record that a mapping was used (for popularity tracking)
   * @param {string} rawName - Raw name that was mapped
   */
  async recordUsage(rawName) {
    const canonicalKey = this.createCanonicalKey(rawName);
    const mapping = this.mappings.get(canonicalKey);
    
    if (mapping) {
      mapping.lastUsed = Date.now();
      mapping.usageCount = (mapping.usageCount || 0) + 1;
      await this.saveMappings();
    }
  }

  /**
   * Retrieve a learned mapping
   * @param {string} rawName - Raw name to look up
   * @returns {string|null} Normalized form if found
   */
  getMapping(rawName) {
    const canonicalKey = this.createCanonicalKey(rawName);
    const mapping = this.mappings.get(canonicalKey);
    
    if (mapping) {
      // Record usage
      this.recordUsage(rawName);
      return mapping.normalized;
    }
    
    return null;
  }

  /**
   * Check if a mapping exists
   * @param {string} rawName - Raw name to check
   * @returns {boolean} True if mapping exists
   */
  hasMapping(rawName) {
    const canonicalKey = this.createCanonicalKey(rawName);
    return this.mappings.has(canonicalKey);
  }

  /**
   * Get mapping details with metadata
   * @param {string} rawName - Raw name to look up
   * @returns {Object|null} Mapping object with metadata if found
   */
  getMappingDetails(rawName) {
    const canonicalKey = this.createCanonicalKey(rawName);
    const mapping = this.mappings.get(canonicalKey);
    
    if (mapping) {
      // Record usage
      this.recordUsage(rawName);
      return { ...mapping };
    }
    
    return null;
  }

  /**
   * Get all mappings
   * @returns {Map} All stored mappings
   */
  getAllMappings() {
    return new Map(this.mappings);
  }

  /**
   * Remove a specific mapping
   * @param {string} rawName - Raw name to remove
   */
  async removeMapping(rawName) {
    const canonicalKey = this.createCanonicalKey(rawName);
    this.mappings.delete(canonicalKey);
    await this.saveMappings();
  }

  /**
   * Clear all mappings
   */
  async clearAllMappings() {
    this.mappings.clear();
    await this.saveMappings();
  }

  /**
   * Create a canonical key for consistent lookups
   * @param {string} name - Name to create key for
   * @returns {string} Canonical key
   */
  createCanonicalKey(name) {
    // Simple canonicalization - remove spaces, convert to lowercase, remove punctuation
    return name.trim()
      .toLowerCase()
      .replace(/[.,]/g, '')  // Remove common punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Find similar names using enhanced similarity algorithm
   * @param {string} name - Name to find similarities for
   * @returns {Array} Array of similar mappings
   */
  findSimilar(name) {
    const query = this.createCanonicalKey(name);
    const results = [];
    
    for (const [key, mapping] of this.mappings) {
      // Enhanced similarity calculation
      const similarity = this.calculateSimilarity(query, key);
      
      // Apply threshold from settings
      if (similarity >= this.settings.confidenceThreshold) {
        results.push({
          ...mapping,
          similarity: similarity
        });
      }
    }
    
    // Sort by similarity descending, then by usage count
    return results.sort((a, b) => {
      // First by similarity
      if (b.similarity !== a.similarity) {
        return b.similarity - a.similarity;
      }
      // Then by usage count
      return (b.usageCount || 0) - (a.usageCount || 0);
    }).slice(0, this.settings.maxSuggestions);
  }

  /**
   * Calculate similarity between two strings using multiple methods
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    // Multiple similarity metrics
    const jaroWinkler = this.jaroWinklerSimilarity(str1, str2);
    const longestCommonSubsequence = this.lcsSimilarity(str1, str2);
    const initialMatching = this.initialMatchingSimilarity(str1, str2);
    
    // Weighted combination of similarity metrics
    return (jaroWinkler * 0.5) + (longestCommonSubsequence * 0.3) + (initialMatching * 0.2);
  }

  /**
   * Jaro-Winkler similarity (good for names)
   * @param {string} s1 - First string
   * @param {string} s2 - Second string
   * @returns {number} Similarity score
   */
  jaroWinklerSimilarity(s1, s2) {
    if (s1 === s2) return 1.0;
    if (!s1 || !s2) return 0.0;

    const matches = [];
    const s1_len = s1.length;
    const s2_len = s2.length;
    const match_window = Math.floor(Math.max(s1_len, s2_len) / 2) - 1;
    let matches_count = 0;
    let transpositions = 0;

    // Create arrays to track matches
    const s1_matches = new Array(s1_len).fill(false);
    const s2_matches = new Array(s2_len).fill(false);

    // Find matches
    for (let i = 0; i < s1_len; i++) {
      const start = Math.max(0, i - match_window);
      const end = Math.min(i + match_window + 1, s2_len);

      for (let j = start; j < end; j++) {
        if (s2_matches[j] || s1[i] !== s2[j]) continue;
        s1_matches[i] = s2_matches[j] = true;
        matches_count++;
        matches.push(s1[i]);
        break;
      }
    }

    if (matches_count === 0) return 0.0;

    // Count transpositions
    let k = 0;
    for (let i = 0; i < s1_len; i++) {
      if (!s1_matches[i]) continue;
      while (!s2_matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    const jaro = ((matches_count / s1_len) + 
                  (matches_count / s2_len) + 
                  ((matches_count - transpositions / 2) / matches_count)) / 3;

    // Calculate common prefix (for Winkler)
    let prefix = 0;
    const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
    for (let i = 0; i < maxPrefix; i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }

    // Winkler adjustment
    return jaro + (0.1 * prefix * (1 - jaro));
  }

  /**
   * Longest Common Subsequence similarity
   * @param {string} s1 - First string
   * @param {string} s2 - Second string
   * @returns {number} Similarity score
   */
  lcsSimilarity(s1, s2) {
    if (!s1 || !s2) return 0.0;
    if (s1 === s2) return 1.0;

    // Split names into words and compare
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);

    let matches = 0;
    for (const word1 of words1) {
      if (words2.some(word2 => this.isSimilarWord(word1, word2))) {
        matches++;
      }
    }

    const totalWords = Math.max(words1.length, words2.length);
    return totalWords > 0 ? matches / totalWords : 0;
  }

  /**
   * Check if two words are similar (considering initials)
   * @param {string} word1 - First word
   * @param {string} word2 - Second word
   * @returns {boolean} True if words are similar
   */
  isSimilarWord(word1, word2) {
    // Remove periods for comparison
    word1 = word1.replace(/\./g, '');
    word2 = word2.replace(/\./g, '');
    
    // Direct match
    if (word1 === word2) return true;
    
    // Check if one is initial form of the other
    if ((word1.length === 1 && word2.startsWith(word1)) || 
        (word2.length === 1 && word1.startsWith(word2))) {
      return true;
    }
    
    // Common abbreviation patterns
    const commonAbbreviations = {
      'jose': 'joseph',
      'joseph': 'joe',
      'robert': 'rob',
      'charles': 'chuck',
      'william': 'will',
      'jonathan': 'jon'
    };
    
    if (commonAbbreviations[word1] === word2 || commonAbbreviations[word2] === word1) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Public method to check if two words are similar
   * @param {string} word1 - First word
   * @param {string} word2 - Second word
   * @returns {boolean} True if words are similar
   */
  areWordsSimilar(word1, word2) {
    return this.isSimilarWord(word1, word2);
  }

  /**
   * Check if one word is an abbreviation of another
   * @param {string} abbr - Abbreviation
   * @param {string} full - Full word
   * @returns {boolean} True if abbr is an abbreviation of full
   */
  isAbbreviation(abbr, full) {
    if (abbr.length >= full.length) return false;

    // Check if abbreviation matches the beginning letters of the full word
    for (let i = 0; i < abbr.length; i++) {
      if (full[i] !== abbr[i]) return false;
    }

    return true;
  }

  /**
   * Similarity based on initial matching
   * @param {string} s1 - First string
   * @param {string} s2 - Second string
   * @returns {number} Similarity score
   */
  initialMatchingSimilarity(s1, s2) {
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);

    if (words1.length === 0 || words2.length === 0) return 0;

    // Compare first names and last names separately
    const firstNameSim = this.compareNameParts(
      words1[0], 
      words2[0]
    );

    const lastNameSim = this.compareNameParts(
      words1[words1.length - 1], 
      words2[words2.length - 1]
    );

    // Average of first and last name similarity
    return (firstNameSim + lastNameSim) / 2;
  }

  /**
   * Compare two name parts for similarity
   * @param {string} part1 - First name part
   * @param {string} part2 - Second name part
   * @returns {number} Similarity score
   */
  compareNameParts(part1, part2) {
    if (!part1 || !part2) return 0;
    if (part1.toLowerCase() === part2.toLowerCase()) return 1.0;

    // Check for initial vs full name
    const clean1 = part1.replace(/\./g, '').toLowerCase();
    const clean2 = part2.replace(/\./g, '').toLowerCase();

    if (clean1.length === 1 && clean2.startsWith(clean1)) return 0.8;
    if (clean2.length === 1 && clean1.startsWith(clean2)) return 0.8;

    // Use Jaro-Winkler for the actual name comparison
    return this.jaroWinklerSimilarity(clean1, clean2);
  }

  /**
   * Export mappings to a format suitable for sharing or backup
   * @returns {Object} Exported data
   */
  exportMappings() {
    const exportData = {
      version: '1.0',
      timestamp: Date.now(),
      mappings: [...this.mappings.entries()],
      settings: this.settings
    };
    return exportData;
  }

  /**
   * Import mappings from exported data
   * @param {Object} importData - Data to import
   */
  importMappings(importData) {
    if (importData.version !== '1.0') {
      throw new Error('Unsupported import data version');
    }

    this.mappings = new Map(importData.mappings);
    
    if (importData.settings) {
      this.settings = { ...this.settings, ...importData.settings };
      this.saveSettings();
    }
    
    this.saveMappings();
  }

  /**
   * Get statistics about the learning engine
   * @returns {Object} Statistics
   */
  getStatistics() {
    const totalMappings = this.mappings.size;
    let totalUsage = 0;
    let avgConfidence = 0;
    
    for (const mapping of this.mappings.values()) {
      totalUsage += mapping.usageCount || 0;
      avgConfidence += mapping.confidence || 0;
    }
    
    avgConfidence = totalMappings > 0 ? avgConfidence / totalMappings : 0;
    
    return {
      totalMappings,
      totalUsage,
      averageUsage: totalMappings > 0 ? totalUsage / totalMappings : 0,
      averageConfidence: avgConfidence
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LearningEngine;
}