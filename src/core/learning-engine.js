/**
 * Learning Engine - Handles storing and retrieving learned name mappings with enhanced learning capabilities
 */
class LearningEngine {
  // Constants for similarity calculations
  static get CONFIDENCE_THRESHOLD() { return 0.8; }

  // Scoped mappings key for storage
  static get SCOPED_MAPPINGS_KEY() { return 'field_normalizer_scoped_mappings'; }

  // Field types for scoped mappings
  static get FIELD_TYPES() {
    return {
      PUBLISHER: 'publisher',
      LOCATION: 'location',
      JOURNAL: 'journal'
    };
  }
  static get JARO_WINKLER_WEIGHT() { return 0.5; }
  static get LCS_WEIGHT() { return 0.3; }
  static get INITIAL_MATCHING_WEIGHT() { return 0.2; }
  static get PREFIX_BONUS() { return 0.1; }
  static get SINGLE_CHAR_MATCH_SCORE() { return 0.8; }

  constructor() {
    this.storageKey = 'name_normalizer_mappings';
    this.settingsKey = 'name_normalizer_settings';
    this.mappings = new Map();
    this.settings = this.getDefaultSettings();
    this.distinctPairsKey = 'name_normalizer_distinct_pairs';
    this.distinctPairs = new Map();
    this.skipStorageKey = 'name_normalizer_skipped_suggestions';
    this.skippedPairs = new Set();

    // Performance optimizations: caching
    this.canonicalKeyCache = new Map();
    this.canonicalKeyCacheMaxSize = 10000;
    this.similarityCache = new Map();
    this.similarityCacheMaxSize = 5000;

    // Batch storage optimization
    this.pendingSaves = new Set();
    this.saveTimeout = null;
    this.saveDelay = 5000; // 5 seconds
    this.maxBatchSize = 100;
    this.isBatchingEnabled = true;

    // Register for shutdown event to ensure data is saved
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.forceSave());
    }

    this.loadMappings();
    this.loadSettings();
    this.loadDistinctPairs();
    this.loadSkippedPairs();

    // Scoped mappings initialization
    this.scopedMappings = new Map();
    this.loadScopedMappings();
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
      // Use globalThis for cross-environment compatibility
      const globalObj = typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : {});
      if (!globalObj._nameNormalizerStorage) {
        globalObj._nameNormalizerStorage = {};
      }
      return {
        getItem: (key) => globalObj._nameNormalizerStorage[key] || null,
        setItem: (key, value) => { globalObj._nameNormalizerStorage[key] = value; },
        removeItem: (key) => { delete globalObj._nameNormalizerStorage[key]; }
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
      confidenceThreshold: LearningEngine.CONFIDENCE_THRESHOLD,
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

    // Queue for batch save instead of immediate save
    if (this.isBatchingEnabled) {
      this.pendingSaves.add(canonicalKey);

      // Immediate save if batch is large
      if (this.pendingSaves.size >= this.maxBatchSize) {
        await this.flushPendingSaves();
      } else {
        this.scheduleSave();
      }
    } else {
      await this.saveMappings();
    }
  }

  /**
   * Schedule a batched save operation
   * @private
   */
  scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.flushPendingSaves();
    }, this.saveDelay);
  }

  /**
   * Flush all pending saves to storage
   * @private
   */
  async flushPendingSaves() {
    if (this.pendingSaves.size === 0) return;

    this.pendingSaves.clear();
    await this.saveMappings();
  }

  /**
   * Force immediate save of all pending changes
   * Call this before shutdown or critical operations
   */
  async forceSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    await this.flushPendingSaves();
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
      // Use batch save instead of immediate save
      if (this.isBatchingEnabled) {
        this.pendingSaves.add(canonicalKey);
        this.scheduleSave();
      } else {
        await this.saveMappings();
      }
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
    // Handle null/undefined input
    if (name == null) {
      return '';
    }

    // Check cache first
    if (this.canonicalKeyCache.has(name)) {
      return this.canonicalKeyCache.get(name);
    }

    // Simple canonicalization - remove spaces, convert to lowercase, remove punctuation
    const key = name.trim()
      .toLowerCase()
      .replace(/[.,]/g, '')  // Remove common punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace

    // Cache management: simple LRU via size limit
    if (this.canonicalKeyCache.size >= this.canonicalKeyCacheMaxSize) {
      const entriesToDelete = Math.floor(this.canonicalKeyCacheMaxSize / 2);
      const keys = this.canonicalKeyCache.keys();
      for (let i = 0; i < entriesToDelete; i++) {
        this.canonicalKeyCache.delete(keys.next().value);
      }
    }

    this.canonicalKeyCache.set(name, key);
    return key;
  }

  /**
   * Find similar names using enhanced similarity algorithm
   * @param {string} name - Name to find similarities for
   * @returns {Array} Array of similar mappings
   */
  findSimilar(name) {
    const query = this.createCanonicalKey(name);
    const results = [];

    // Get candidate keys from all mappings
    const candidateKeys = [...this.mappings.keys()];

    for (const key of candidateKeys) {
      const mapping = this.mappings.get(key);
      if (!mapping) continue;

      // Use isDiacriticOnlyVariant for strict diacritic-only matching
      // This prevents false positives like Chen/Cohen, Anderson/Andersen
      const { isDiacriticOnlyVariant } = require('../utils/string-distance');

      // Check for diacritic-only variant match
      if (isDiacriticOnlyVariant(query, key)) {
        // High similarity for diacritic variants
        const similarity = 0.95;

        if (similarity >= this.settings.confidenceThreshold) {
          results.push({
            ...mapping,
            similarity: similarity
          });
        }
        continue;
      }

      // For non-diacritic candidates, use full similarity calculation
      // This handles initial-to-full-name matching like "J. Fodor" -> "Jerry Fodor"
      const similarity = this.calculateSimilarity(query, key);

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
    // Early exit: exact match
    if (str1 === str2) return 1.0;

    // Early exit: empty strings
    if (!str1 || !str2) return 0.0;

    // Check similarity cache
    const cacheKey = str1 < str2 ? `${str1}|${str2}` : `${str2}|${str1}`;
    if (this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey);
    }

    // Quick pre-filter: length difference check
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    const minLen = Math.min(len1, len2);

    // If length differs by more than 50%, similarity will be low
    if (minLen / maxLen < 0.5) {
      this.setSimilarityCache(cacheKey, 0);
      return 0;
    }

    // First character mismatch check (for names, first letter usually matches)
    if (str1[0]?.toLowerCase() !== str2[0]?.toLowerCase()) {
      // Still compute but with reduced expectation
      const jaroWinkler = this.jaroWinklerSimilarity(str1, str2);
      if (jaroWinkler < 0.5) {
        const result = jaroWinkler * 0.5;
        this.setSimilarityCache(cacheKey, result);
        return result;
      }
    }

    // Multiple similarity metrics
    const jaroWinkler = this.jaroWinklerSimilarity(str1, str2);

    // Early exit if Jaro-Winkler is already below threshold
    if (jaroWinkler < 0.3) {
      const result = jaroWinkler * 0.5;
      this.setSimilarityCache(cacheKey, result);
      return result;
    }

    const longestCommonSubsequence = this.lcsSimilarity(str1, str2);
    const initialMatching = this.initialMatchingSimilarity(str1, str2);

    // Weighted combination of similarity metrics
    const result = (jaroWinkler * LearningEngine.JARO_WINKLER_WEIGHT) +
                   (longestCommonSubsequence * LearningEngine.LCS_WEIGHT) +
                   (initialMatching * LearningEngine.INITIAL_MATCHING_WEIGHT);

    this.setSimilarityCache(cacheKey, result);
    return result;
  }

  /**
   * Set similarity cache with LRU eviction
   * @param {string} key - Cache key
   * @param {number} value - Similarity score
   */
  setSimilarityCache(key, value) {
    // Cache management: simple LRU via size limit
    if (this.similarityCache.size >= this.similarityCacheMaxSize) {
      const entriesToDelete = Math.floor(this.similarityCacheMaxSize / 2);
      const keys = this.similarityCache.keys();
      for (let i = 0; i < entriesToDelete; i++) {
        this.similarityCache.delete(keys.next().value);
      }
    }
    this.similarityCache.set(key, value);
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
    return jaro + (LearningEngine.PREFIX_BONUS * prefix * (1 - jaro));
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

    if (clean1.length === 1 && clean2.startsWith(clean1)) return LearningEngine.SINGLE_CHAR_MATCH_SCORE;
    if (clean2.length === 1 && clean1.startsWith(clean2)) return LearningEngine.SINGLE_CHAR_MATCH_SCORE;

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
      averageConfidence: avgConfidence,
      skippedPairs: this.skippedPairs ? this.skippedPairs.size : 0
    };
  }

  // ============ Skip Learning Methods ============

  /**
   * Get the storage key for skipped suggestions
   */
  static get SKIP_STORAGE_KEY() {
    return 'name_normalizer_skipped_suggestions';
  }

  /**
   * Initialize skipped pairs from storage
   */
  loadSkippedPairs() {
    try {
      const storage = this.getStorage();
      const stored = storage.getItem(LearningEngine.SKIP_STORAGE_KEY);
      if (stored) {
        this.skippedPairs = new Set(JSON.parse(stored));
      } else {
        this.skippedPairs = new Set();
      }
    } catch (error) {
      console.error('Error loading skipped pairs:', error);
      this.skippedPairs = new Set();
    }
  }

  /**
   * Save skipped pairs to storage
   */
  saveSkippedPairs() {
    try {
      const storage = this.getStorage();
      const serialized = JSON.stringify([...this.skippedPairs]);
      storage.setItem(LearningEngine.SKIP_STORAGE_KEY, serialized);

      // Also sync to Zotero.Prefs if available
      if (typeof Zotero !== 'undefined' && Zotero.Prefs) {
        Zotero.Prefs.set(LearningEngine.SKIP_STORAGE_KEY, serialized);
      }
    } catch (error) {
      console.error('Error saving skipped pairs:', error);
    }
  }

  /**
   * Generate a unique key for skip decisions
   * Format: name:skip:{surnameHash}:{firstNamePatternHash}
   * @param {string} surname - Surname to generate key for
   * @param {string} firstNamePattern - First name pattern (can be empty string)
   * @returns {string} Skip key
   */
  generateSkipKey(surname, firstNamePattern) {
    const s = (surname || '').toLowerCase().trim();
    const f = (firstNamePattern || '').toLowerCase().trim();

    // Simple hash function
    const hashString = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16);
    };

    const sHash = hashString(s);
    const fHash = hashString(f);
    return `name:skip:${sHash}:${fHash}`;
  }

  /**
   * Record a skip decision for a suggestion
   * @param {string} surname - Surname that was skipped
   * @param {string} firstNamePattern - First name pattern that was skipped
   * @param {Object} context - Additional context (e.g., suggestion object)
   * @returns {boolean} True if recorded successfully
   */
  recordSkipDecision(surname, firstNamePattern, context = {}) {
    const key = this.generateSkipKey(surname, firstNamePattern);

    if (!this.skippedPairs) {
      this.loadSkippedPairs();
    }

    if (!this.skippedPairs.has(key)) {
      this.skippedPairs.add(key);
      this.saveSkippedPairs();

      // Log for debugging
      if (context.debug) {
        console.debug(`LearningEngine: Recorded skip for "${surname}, ${firstNamePattern}" -> ${key}`);
      }

      return true;
    }

    return false;
  }

  /**
   * Check if a suggestion should be skipped
   * @param {Object} suggestion - Suggestion object with surname and firstNamePattern
   * @returns {boolean} True if suggestion should be skipped
   */
  shouldSkipSuggestion(suggestion) {
    if (!this.skippedPairs) {
      this.loadSkippedPairs();
    }

    const surname = suggestion.surname || suggestion.canonical || '';
    const firstNamePattern = suggestion.firstNamePattern || suggestion.firstName || '';
    const key = this.generateSkipKey(surname, firstNamePattern);

    return this.skippedPairs.has(key);
  }

  /**
   * Check if a specific pair should be skipped
   * @param {string} surname - Surname to check
   * @param {string} firstNamePattern - First name pattern to check
   * @returns {boolean} True if should be skipped
   */
  shouldSkipPair(surname, firstNamePattern) {
    if (!this.skippedPairs) {
      this.loadSkippedPairs();
    }

    const key = this.generateSkipKey(surname, firstNamePattern);
    return this.skippedPairs.has(key);
  }

  /**
   * Remove a skip decision
   * @param {string} surname - Surname to unskip
   * @param {string} firstNamePattern - First name pattern to unskip
   * @returns {boolean} True if removed successfully
   */
  removeSkipDecision(surname, firstNamePattern) {
    if (!this.skippedPairs) {
      this.loadSkippedPairs();
    }

    const key = this.generateSkipKey(surname, firstNamePattern);
    const removed = this.skippedPairs.delete(key);

    if (removed) {
      this.saveSkippedPairs();
    }

    return removed;
  }

  /**
   * Clear all skip decisions
   */
  clearSkippedPairs() {
    this.skippedPairs = new Set();
    this.saveSkippedPairs();

    // Also clear from Zotero.Prefs
    if (typeof Zotero !== 'undefined' && Zotero.Prefs) {
      Zotero.Prefs.clear(LearningEngine.SKIP_STORAGE_KEY);
    }
  }

  /**
   * Get count of skipped pairs
   * @returns {number} Number of skipped pairs
   */
  getSkippedPairsCount() {
    if (!this.skippedPairs) {
      this.loadSkippedPairs();
    }
    return this.skippedPairs.size;
  }

  /**
   * Get all skipped pairs (for debugging/display)
   * @returns {Array} Array of skipped pair objects
   */
  getSkippedPairs() {
    if (!this.skippedPairs) {
      this.loadSkippedPairs();
    }
    return [...this.skippedPairs];
  }

  /**
   * Filter out skipped suggestions from an array
   * @param {Array} suggestions - Array of suggestions to filter
   * @returns {Array} Filtered suggestions
   */
  filterSkippedSuggestions(suggestions) {
    if (!this.skippedPairs) {
      this.loadSkippedPairs();
    }

    return suggestions.filter(suggestion => !this.shouldSkipSuggestion(suggestion));
  }

  /**
   * Get statistics about skipped suggestions
   * @returns {Object} Skip statistics
   */
  getSkipStatistics() {
    if (!this.skippedPairs) {
      this.loadSkippedPairs();
    }

    return {
      skippedCount: this.skippedPairs ? this.skippedPairs.size : 0
    };
  }

  // ============ Scoped Mappings Methods ============

  /**
   * Load scoped mappings from storage
   */
  async loadScopedMappings() {
    try {
      const storage = this.getStorage();
      const stored = storage.getItem(LearningEngine.SCOPED_MAPPINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert back to Map
        this.scopedMappings = new Map(parsed);
      }
    } catch (error) {
      console.error('Error loading scoped mappings:', error);
      this.scopedMappings = new Map();
    }
  }

  /**
   * Save scoped mappings to storage
   */
  async saveScopedMappings() {
    try {
      const storage = this.getStorage();
      const serialized = JSON.stringify([...this.scopedMappings.entries()]);
      storage.setItem(LearningEngine.SCOPED_MAPPINGS_KEY, serialized);
    } catch (error) {
      console.error('Error saving scoped mappings:', error);
    }
  }

  /**
   * Create a scoped key for mapping lookups
   * Format: ${scope}::${fieldType}::${canonicalKey}
   * @param {string} rawValue - Raw value to create key for
   * @param {string} fieldType - Field type (publisher, location, journal)
   * @param {string|null} collectionId - Collection ID or null for global scope
   * @returns {string} Scoped key
   */
  createScopedKey(rawValue, fieldType, collectionId) {
    const scope = collectionId || 'global';
    const canonicalKey = this.createCanonicalKey(rawValue);
    return `${scope}::${fieldType}::${canonicalKey}`;
  }

  /**
   * Store a scoped mapping
   * @param {string} rawValue - Original raw value
   * @param {string} normalizedValue - User-accepted normalized form
   * @param {string} fieldType - Field type (publisher, location, journal)
   * @param {string|null} collectionId - Collection ID or null for global scope
   */
  async storeScopedMapping(rawValue, normalizedValue, fieldType, collectionId) {
    const scopedKey = this.createScopedKey(rawValue, fieldType, collectionId);
    const now = Date.now();

    if (this.scopedMappings.has(scopedKey)) {
      // Update existing mapping
      const existing = this.scopedMappings.get(scopedKey);
      existing.normalized = normalizedValue;
      existing.lastUsed = now;
      existing.usageCount = (existing.usageCount || 0) + 1;
    } else {
      // Create new mapping
      this.scopedMappings.set(scopedKey, {
        raw: rawValue,
        normalized: normalizedValue,
        fieldType: fieldType,
        scope: collectionId || 'global',
        timestamp: now,
        lastUsed: now,
        usageCount: 1
      });
    }

    await this.saveScopedMappings();
  }

  /**
   * Get a scoped mapping
   * First checks exact scope (collectionId), then global scope (collectionId === null)
   * NO fallback to global mappings
   * @param {string} rawValue - Raw value to look up
   * @param {string} fieldType - Field type (publisher, location, journal)
   * @param {string|null} collectionId - Collection ID or null for global scope
   * @returns {string|null} Normalized form if found
   */
  getScopedMapping(rawValue, fieldType, collectionId) {
    const canonicalKey = this.createCanonicalKey(rawValue);

    // Check exact scope first
    const scope = collectionId || 'global';
    const scopedKey = `${scope}::${fieldType}::${canonicalKey}`;
    const scopedMapping = this.scopedMappings.get(scopedKey);

    if (scopedMapping) {
      // Update usage
      scopedMapping.lastUsed = Date.now();
      scopedMapping.usageCount = (scopedMapping.usageCount || 0) + 1;
      return scopedMapping.normalized;
    }

    // If collectionId is not null, check global scope (collectionId === null)
    if (collectionId !== null) {
      const globalKey = `global::${fieldType}::${canonicalKey}`;
      const globalMapping = this.scopedMappings.get(globalKey);

      if (globalMapping) {
        globalMapping.lastUsed = Date.now();
        globalMapping.usageCount = (globalMapping.usageCount || 0) + 1;
        return globalMapping.normalized;
      }
    }

    return null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LearningEngine;
}