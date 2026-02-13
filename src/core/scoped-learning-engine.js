/**
 * Scoped Learning Engine - Extends LearningEngine with collection-based scope limitation
 * Stores and retrieves learned field mappings with collection-specific scoping
 * @module core/scoped-learning-engine
 */

// Import parent class
const LearningEngine = require('./learning-engine');

/**
 * ScopedLearningEngine Class
 * Extends LearningEngine to support collection-scoped learned mappings
 * @class ScopedLearningEngine
 * @extends LearningEngine
 */
class ScopedLearningEngine extends LearningEngine {
  /**
   * Create a ScopedLearningEngine instance
   */
  constructor() {
    super();

    /**
     * Storage key for scoped mappings
     * @member {string}
     */
    this.scopedStorageKey = 'field_normalizer_scoped_mappings';

    /**
     * Collection scope key prefix
     * @member {string}
     */
    this.collectionScopeKey = 'collection_scope';

    /**
     * Cache of scoped mappings
     * @member {Map}
     */
    this.scopedMappings = new Map();

    /**
     * Load scoped mappings from storage
     */
    this.loadScopedMappings();
  }

  /**
   * Get the storage object based on environment
   * @returns {Object} Storage object
   */
  getStorage() {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    } else {
      // For Node.js environment
      // Use globalThis for cross-environment compatibility
      const globalObj = typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : {});
      if (!globalObj._fieldNormalizerStorage) {
        globalObj._fieldNormalizerStorage = {};
      }
      return {
        getItem: (key) => globalObj._fieldNormalizerStorage[key] || null,
        setItem: (key, value) => { globalObj._fieldNormalizerStorage[key] = value; },
        removeItem: (key) => { delete globalObj._fieldNormalizerStorage[key]; }
      };
    }
  }

  /**
   * Load scoped mappings from storage
   */
  loadScopedMappings() {
    try {
      const storage = this.getStorage();
      const stored = storage.getItem(this.scopedStorageKey);
      if (stored) {
        this.scopedMappings = new Map(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading scoped mappings:', error);
      this.scopedMappings = new Map();
    }
  }

  /**
   * Save scoped mappings to storage
   */
  saveScopedMappings() {
    try {
      const storage = this.getStorage();
      const serialized = JSON.stringify([...this.scopedMappings.entries()]);
      storage.setItem(this.scopedStorageKey, serialized);
    } catch (error) {
      console.error('Error saving scoped mappings:', error);
    }
  }

  /**
   * Create a scoped storage key
   * @param {string} rawValue - Raw field value
   * @param {string} fieldType - Type of field
   * @param {string} collectionId - Collection ID (null for global scope)
   * @returns {string} Scoped storage key
   */
  createScopedKey(rawValue, fieldType, collectionId = null) {
    const canonicalKey = this.createCanonicalKey(rawValue);
    const scope = collectionId || 'global';
    return `${scope}::${fieldType}::${canonicalKey}`;
  }

  /**
   * Store a mapping with collection scope
   * @param {string} rawValue - Original raw value
   * @param {string} normalizedValue - User-accepted normalized form
   * @param {string} fieldType - Type of field
   * @param {string} collectionId - Optional collection scope
   * @param {number} confidence - Confidence score (0-1)
   * @param {Object} context - Additional context information
   * @returns {Promise<boolean>} Success status
   */
  async storeScopedMapping(rawValue, normalizedValue, fieldType, collectionId = null, confidence = 1.0, context = {}) {
    const key = this.createScopedKey(rawValue, fieldType, collectionId);
    const now = Date.now();

    // Also store parent mapping
    await this.storeMapping(rawValue, normalizedValue, confidence, { ...context, fieldType, collectionId });

    // Store scoped mapping
    this.scopedMappings.set(key, {
      raw: rawValue,
      normalized: normalizedValue,
      fieldType: fieldType,
      collectionId: collectionId || 'global',
      timestamp: now,
      lastUsed: now,
      confidence: confidence,
      usageCount: 1,
      context: context
    });

    this.saveScopedMappings();
    return true;
  }

  /**
   * Retrieve a scoped mapping
   * Checks scoped mappings first, then falls back to global mappings
   * @param {string} rawValue - Raw value to look up
   * @param {string} fieldType - Type of field
   * @param {string} collectionId - Optional collection scope
   * @returns {Promise<Object|null>} Mapped value or null
   */
  async getScopedMapping(rawValue, fieldType, collectionId = null) {
    // Try scoped mapping first
    const scopedKey = this.createScopedKey(rawValue, fieldType, collectionId);
    const scopedMapping = this.scopedMappings.get(scopedKey);

    if (scopedMapping) {
      // Update usage
      scopedMapping.lastUsed = Date.now();
      scopedMapping.usageCount = (scopedMapping.usageCount || 0) + 1;
      this.saveScopedMappings();
      return {
        normalized: scopedMapping.normalized,
        confidence: scopedMapping.confidence,
        scope: scopedMapping.collectionId,
        isScoped: true
      };
    }

    // Fall back to parent learning engine
    const parentMapping = this.getMapping(rawValue);
    if (parentMapping) {
      return {
        normalized: parentMapping,
        confidence: 1.0,
        scope: 'global',
        isScoped: false
      };
    }

    return null;
  }

  /**
   * Find similar mappings for a value within a scope
   * @param {string} rawValue - Raw value to find similarities for
   * @param {string} fieldType - Type of field
   * @param {string} collectionId - Optional collection scope
   * @returns {Promise<Array>} Array of similar mappings
   */
  async findSimilarMappings(rawValue, fieldType, collectionId = null) {
    const results = [];
    const query = this.createCanonicalKey(rawValue);

    // Search scoped mappings
    const scope = collectionId || 'global';
    for (const [key, mapping] of this.scopedMappings.entries()) {
      // Check if key matches scope and fieldType
      if (key.startsWith(`${scope}::${fieldType}::`)) {
        const mappingKey = key.substring(`${scope}::${fieldType}::`.length);
        const similarity = this.calculateSimilarity(query, mappingKey);

        if (similarity >= this.settings.confidenceThreshold) {
          results.push({
            raw: mapping.raw,
            normalized: mapping.normalized,
            similarity: similarity,
            scope: mapping.collectionId,
            isScoped: true
          });
        }
      }
    }

    // Also search parent mappings with fieldType filter
    const allMappings = this.getAllMappings();
    for (const [key, mapping] of allMappings.entries()) {
      if (mapping.context && mapping.context.fieldType === fieldType) {
        const similarity = this.calculateSimilarity(query, key);

        if (similarity >= this.settings.confidenceThreshold) {
          // Check if already in results
          const exists = results.some(r => r.normalized === mapping.normalized);
          if (!exists) {
            results.push({
              raw: mapping.raw,
              normalized: mapping.normalized,
              similarity: similarity,
              scope: 'global',
              isScoped: false
            });
          }
        }
      }
    }

    // Sort by similarity descending
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, this.settings.maxSuggestions);
  }

  /**
   * Get available scopes (collections with learned mappings)
   * @returns {Promise<Array>} Array of scope objects
   */
  async getAvailableScopes() {
    const scopes = new Map();

    for (const [key, mapping] of this.scopedMappings.entries()) {
      const scope = mapping.collectionId;
      if (!scopes.has(scope)) {
        scopes.set(scope, {
          id: scope,
          count: 0,
          fieldTypes: new Set()
        });
      }
      const scopeInfo = scopes.get(scope);
      scopeInfo.count++;
      scopeInfo.fieldTypes.add(mapping.fieldType);
    }

    return Array.from(scopes.values()).map(s => ({
      id: s.id,
      count: s.count,
      fieldTypes: Array.from(s.fieldTypes)
    }));
  }

  /**
   * Clear mappings for a specific scope
   * @param {string} collectionId - Collection ID to clear
   * @returns {Promise<number>} Number of mappings removed
   */
  async clearScope(collectionId) {
    let removed = 0;

    for (const [key, mapping] of this.scopedMappings.entries()) {
      if (mapping.collectionId === collectionId) {
        this.scopedMappings.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.saveScopedMappings();
    }

    return removed;
  }

  /**
   * Clear all scoped mappings
   */
  async clearAllScopedMappings() {
    this.scopedMappings.clear();
    this.saveScopedMappings();
  }

  /**
   * Get statistics about scoped mappings
   * @returns {Object} Statistics
   */
  getScopedStatistics() {
    const scopes = {};
    let totalMappings = 0;

    for (const mapping of this.scopedMappings.values()) {
      const scope = mapping.collectionId;
      if (!scopes[scope]) {
        scopes[scope] = { count: 0, fieldTypes: new Set() };
      }
      scopes[scope].count++;
      scopes[scope].fieldTypes.add(mapping.fieldType);
      totalMappings++;
    }

    return {
      totalScopedMappings: totalMappings,
      scopes: Object.keys(scopes).length,
      scopeDetails: Object.entries(scopes).map(([id, data]) => ({
        id,
        count: data.count,
        fieldTypes: Array.from(data.fieldTypes)
      }))
    };
  }

  /**
   * Export scoped mappings
   * @returns {Object} Exported data
   */
  exportScopedMappings() {
    return {
      version: '1.0',
      timestamp: Date.now(),
      mappings: [...this.scopedMappings.entries()],
      statistics: this.getScopedStatistics()
    };
  }

  /**
   * Import scoped mappings
   * @param {Object} importData - Data to import
   * @returns {boolean} Success status
   */
  importScopedMappings(importData) {
    if (importData.version !== '1.0') {
      console.error('Unsupported import data version');
      return false;
    }

    try {
      this.scopedMappings = new Map(importData.mappings);
      this.saveScopedMappings();
      return true;
    } catch (error) {
      console.error('Error importing scoped mappings:', error);
      return false;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScopedLearningEngine;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.ScopedLearningEngine = ScopedLearningEngine;
}
