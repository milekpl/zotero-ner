/**
 * Field Item Processor - Handles Zotero item field normalization operations
 * Provides methods for processing individual fields, applying normalizations,
 * and batch processing with progress tracking
 * @module zotero/field-item-processor
 */

/**
 * FieldItemProcessor Class
 * Manages field normalization operations on Zotero items
 * with lazy initialization of field registry
 * @class FieldItemProcessor
 */
class FieldItemProcessor {
  /**
   * Create a FieldItemProcessor instance
   */
  constructor() {
    /**
     * Lazy-initialized field registry mapping field types to normalizers
     * @member {Map<string, FieldNormalizer>|null}
     * @private
     */
    this._fieldRegistry = null;
  }

  /**
   * Get field registry (lazy initialization)
   * @returns {Map<string, FieldNormalizer>} Field registry mapping fieldType to normalizer
   */
  get fieldRegistry() {
    if (!this._fieldRegistry) {
      this._fieldRegistry = new Map();
    }
    return this._fieldRegistry;
  }

  /**
   * Get normalizer for a specific field type
   * Creates a new normalizer if one doesn't exist for the field type
   * @param {string} fieldType - Type of field (publisher, location, journal, etc.)
   * @param {string} fieldName - Name of the Zotero field (optional, defaults to fieldType)
   * @param {Object} options - Normalization options (optional)
   * @returns {FieldNormalizer} Field normalizer instance
   */
  getFieldNormalizer(fieldType, fieldName = null, options = {}) {
    const registryKey = `${fieldType}::${fieldName || 'default'}`;

    if (this.fieldRegistry.has(registryKey)) {
      return this.fieldRegistry.get(registryKey);
    }

    // Determine the appropriate field name if not provided
    const actualFieldName = fieldName || this.getDefaultFieldName(fieldType);

    // Create the appropriate normalizer using the factory
    const { FieldNormalizer } = require('../core/field-normalizer');
    const normalizer = FieldNormalizer.create(fieldType, actualFieldName, options);

    this.fieldRegistry.set(registryKey, normalizer);
    return normalizer;
  }

  /**
   * Get the default Zotero field name for a field type
   * @param {string} fieldType - Type of field
   * @returns {string} Zotero field name
   */
  getDefaultFieldName(fieldType) {
    const fieldNameMap = {
      'publisher': 'publisher',
      'location': 'place',
      'place': 'place',
      'journal': 'publicationTitle',
      'publicationtitle': 'publicationTitle'
    };

    return fieldNameMap[fieldType.toLowerCase()] || fieldType;
  }

  /**
   * Process a single field on a Zotero item
   * @param {Object} item - Zotero item to process
   * @param {string} fieldType - Type of field to normalize
   * @param {Object} options - Processing options (optional)
   * @returns {Promise<Object>} Processing result with normalized value and metadata
   */
  async processItemField(item, fieldType) {
    const normalizer = this.getFieldNormalizer(fieldType);

    // Extract the current field value from the item
    const rawValue = normalizer.extractFieldValue(item);

    if (!rawValue || rawValue.trim() === '') {
      return {
        success: false,
        itemID: item.id,
        fieldType: fieldType,
        fieldName: normalizer.fieldName,
        original: rawValue,
        normalized: null,
        error: 'Empty or missing field value'
      };
    }

    try {
      // Normalize the field value
      const result = await normalizer.normalizeFieldValue(rawValue, item);

      return {
        success: result.success,
        itemID: item.id,
        fieldType: fieldType,
        fieldName: normalizer.fieldName,
        original: result.original,
        normalized: result.normalized,
        suggestedNormalization: result.suggestedNormalization,
        learnedMapping: result.learnedMapping,
        similarMappings: result.similarMappings,
        variants: result.variants,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        itemID: item.id,
        fieldType: fieldType,
        fieldName: normalizer.fieldName,
        original: rawValue,
        normalized: null,
        error: error.message
      };
    }
  }

  /**
   * Apply user's normalization choices to items
   * Updates each item with the normalized value and stores the learning mapping
   * @param {Array<Object>} normalizations - Array of normalization objects
   *   Each object should contain:
   *   - {number} itemID - ID of the Zotero item
   *   - {string} normalized - The normalized value to set
   *   - {string} fieldType - Type of field being normalized
   *   - {string} original - Original raw value (for learning engine)
   * @returns {Promise<Array<Object>>} Results array with success status for each
   */
  async applyFieldNormalizations(normalizations) {
    const results = [];

    for (const normalization of normalizations) {
      try {
        // Get the item from Zotero
        const item = await Zotero.Items.get(normalization.itemID);

        if (!item) {
          results.push({
            itemID: normalization.itemID,
            success: false,
            error: `Item ${normalization.itemID} not found`
          });
          continue;
        }

        // Get the normalizer for this field type
        const normalizer = this.getFieldNormalizer(normalization.fieldType);

        // Update the field on the item
        await item.setField(normalizer.fieldName, normalization.normalized);

        // Store the scoped mapping in the learning engine
        if (normalization.original && normalization.original !== normalization.normalized) {
          await normalizer.learningEngine.storeScopedMapping(
            normalization.original,
            normalization.normalized,
            normalization.fieldType
          );
        }

        // Save the item using saveTx for proper transaction handling
        await item.saveTx();

        results.push({
          itemID: normalization.itemID,
          success: true,
          fieldType: normalization.fieldType,
          fieldName: normalizer.fieldName,
          original: normalization.original,
          normalized: normalization.normalized
        });
      } catch (error) {
        results.push({
          itemID: normalization.itemID,
          success: false,
          fieldType: normalization.fieldType,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Batch process multiple items for a specific field type
   * @param {Array<Object>} items - Array of Zotero items to process
   * @param {string} fieldType - Type of field to normalize
   * @param {Object} options - Batch processing options
   *   @param {Function} options.onProgress - Progress callback function
   *   @param {boolean} options.skipAlreadyNormalized - Skip items with existing learned mappings
   *   @param {Object} options.normalizerOptions - Additional options for the normalizer
   * @returns {Promise<Object>} Batch processing results
   */
  async batchProcess(items, fieldType, options = {}) {
    const {
      onProgress = null,
      skipAlreadyNormalized = false,
      normalizerOptions = {}
    } = options;

    const results = {
      total: items.length,
      processed: 0,
      skipped: 0,
      failed: 0,
      items: []
    };

    const normalizer = this.getFieldNormalizer(fieldType, null, normalizerOptions);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        // Extract the current field value
        const rawValue = normalizer.extractFieldValue(item);

        if (!rawValue || rawValue.trim() === '') {
          results.skipped++;
          results.items.push({
            itemID: item.id,
            status: 'skipped',
            reason: 'Empty or missing field value'
          });
        } else if (skipAlreadyNormalized) {
          // Check if there's already a learned mapping
          const existingMapping = await normalizer.learningEngine.getScopedMapping(
            rawValue,
            fieldType
          );

          if (existingMapping && existingMapping.normalized === rawValue) {
            results.skipped++;
            results.items.push({
              itemID: item.id,
              status: 'skipped',
              reason: 'Already normalized'
            });
          } else {
            // Process the item
            const result = await this.processItemField(item, fieldType, normalizerOptions);
            results.processed++;
            results.items.push({
              itemID: item.id,
              status: 'processed',
              original: result.original,
              normalized: result.normalized,
              suggestedNormalization: result.suggestedNormalization
            });
          }
        } else {
          // Process the item
          const result = await this.processItemField(item, fieldType, normalizerOptions);
          results.processed++;
          results.items.push({
            itemID: item.id,
            status: 'processed',
            original: result.original,
            normalized: result.normalized,
            suggestedNormalization: result.suggestedNormalization
          });
        }
      } catch (error) {
        results.failed++;
        results.items.push({
          itemID: item.id,
          status: 'failed',
          error: error.message
        });
      }

      // Report progress
      if (onProgress) {
        const current = i + 1;
        const percent = Math.round((current / results.total) * 100);
        onProgress({
          current: current,
          total: results.total,
          percent: percent
        });
      }
    }

    return results;
  }

  /**
   * Clear the field registry (for testing or memory management)
   */
  clearRegistry() {
    this._fieldRegistry = null;
  }

  /**
   * Get statistics about the current field registry
   * @returns {Object} Registry statistics
   */
  getRegistryStats() {
    if (!this._fieldRegistry) {
      return {
        size: 0,
        fieldTypes: []
      };
    }

    const fieldTypes = [];
    for (const [key] of this._fieldRegistry) {
      fieldTypes.push(key);
    }

    return {
      size: this._fieldRegistry.size,
      fieldTypes: fieldTypes
    };
  }
}

// Export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FieldItemProcessor;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.FieldItemProcessor = FieldItemProcessor;
}
