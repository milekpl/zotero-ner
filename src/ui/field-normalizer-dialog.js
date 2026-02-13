/**
 * Field Normalizer Dialog - UI for showing field normalization options
 * Handles publisher, location, and journal field normalization
 * Extends/uses the NormalizerDialog pattern for consistency
 */
class FieldNormalizerDialog {
  constructor() {
    /**
     * Lazy-loaded field registry mapping field types to normalizers
     * @member {Map<string, FieldNormalizer>|null}
     */
    this._fieldRegistry = null;

    /**
     * Current collection scope for scoped learning
     * @member {string|null}
     */
    this._collectionId = null;
  }

  /**
   * Get the field registry with lazy initialization
   * Creates normalizers for publisher, location, and journal
   * @returns {Map<string, FieldNormalizer>} Field type to normalizer mapping
   */
  get fieldRegistry() {
    if (!this._fieldRegistry) {
      this._fieldRegistry = new Map();

      // Create normalizers for each supported field type
      const { FieldNormalizer } = require('../core/field-normalizer');

      this._fieldRegistry.set('publisher', FieldNormalizer.create('publisher', 'publisher'));
      this._fieldRegistry.set('location', FieldNormalizer.create('location', 'place'));
      this._fieldRegistry.set('journal', FieldNormalizer.create('journal', 'publicationTitle'));
    }
    return this._fieldRegistry;
  }

  /**
   * Get the available field types for normalization
   * @returns {string[]} Array of supported field type names
   */
  getAvailableFieldTypes() {
    return ['publisher', 'location', 'journal'];
  }

  /**
   * Set the collection scope for scoped learning
   * @param {string|null} collectionId - Collection ID to scope to
   */
  setScope(collectionId) {
    this._collectionId = collectionId;

    // Propagate scope to all registered normalizers
    if (this._fieldRegistry) {
      for (const normalizer of this._fieldRegistry.values()) {
        normalizer.learningEngine.setScope(collectionId);
      }
    }
  }

  /**
   * Main entry point - Show the field normalization dialog
   * @param {Array} items - Zotero items to process
   * @param {string} fieldType - Type of field to normalize (publisher, location, journal)
   * @returns {Promise<Object>} User selections with processed results
   */
  async showDialog(items, fieldType) {
    console.log(`Showing ${fieldType} normalization dialog for`, items.length, 'items');

    // Process items for the specified field type
    const results = await this.processItemsForField(items, fieldType);

    // Present options to user and get selections
    return await this.presentFieldOptions(results, fieldType);
  }

  /**
   * Process items for a specific field type
   * Extracts field values and checks learned mappings
   * @param {Array} items - Zotero items to process
   * @param {string} fieldType - Type of field to normalize
   * @returns {Promise<Object>} Processed results
   */
  async processItemsForField(items, fieldType) {
    const normalizer = this.fieldRegistry.get(fieldType);

    if (!normalizer) {
      throw new Error(`Unknown field type: ${fieldType}. Available types: ${this.getAvailableFieldTypes().join(', ')}`);
    }

    const results = {
      fieldType: fieldType,
      normalizer: normalizer,
      items: [],
      summary: {
        total: items.length,
        alreadyLearned: 0,
        needsAttention: 0
      }
    };

    for (const item of items) {
      // Extract field value from item
      const rawValue = normalizer.extractFieldValue(item);

      if (!rawValue || rawValue.trim() === '') {
        // Skip items without this field
        continue;
      }

      // Check for already learned mapping
      const learnedMapping = await normalizer.getLearnedMapping(rawValue);

      if (learnedMapping) {
        results.items.push({
          itemID: item.id,
          title: item.getField ? item.getField('title') : 'Unknown Title',
          rawValue: rawValue,
          processed: {
            alreadyLearned: true,
            normalized: learnedMapping.normalized,
            confidence: learnedMapping.confidence,
            source: 'learned'
          }
        });
        results.summary.alreadyLearned++;
      } else {
        // Generate variants and find similar mappings
        const variants = normalizer.generateVariants(rawValue);
        const similarMappings = await normalizer.findSimilarMappings(rawValue);
        const parsed = normalizer.parseFieldValue(rawValue);

        results.items.push({
          itemID: item.id,
          title: item.getField ? item.getField('title') : 'Unknown Title',
          rawValue: rawValue,
          processed: {
            alreadyLearned: false,
            variants: variants,
            similars: similarMappings,
            parsed: parsed,
            suggestedNormalization: variants[0] || rawValue,
            source: 'new'
          }
        });
        results.summary.needsAttention++;
      }
    }

    return results;
  }

  /**
   * Present field normalization options to user
   * Returns user selections with chosen normalizations
   * @param {Object} results - Processed results from processItemsForField
   * @param {string} fieldType - Type of field being normalized
   * @returns {Promise<Object>} User selections and metadata
   */
  async presentFieldOptions(results, fieldType) {
    console.log(`Presenting ${fieldType} options to user for`, results.items.length, 'items');

    const userSelections = {
      fieldType: fieldType,
      timestamp: new Date().toISOString(),
      collectionId: this._collectionId,
      items: [],
      summary: {
        autoApplied: results.summary.alreadyLearned,
        userConfirmed: 0,
        skipped: 0
      }
    };

    for (const item of results.items) {
      const itemSelection = {
        itemID: item.itemID,
        title: item.title,
        rawValue: item.rawValue
      };

      // Use the correct syntax: if (result.processed && result.processed.alreadyLearned)
      if (item.processed && item.processed.alreadyLearned) {
        // Learned mappings are auto-applied
        itemSelection.normalized = item.processed.normalized;
        itemSelection.accepted = true;
        itemSelection.source = 'learned';
        itemSelection.autoApplied = true;
        userSelections.summary.autoApplied++;
      } else {
        // New mappings need user confirmation
        // In a real implementation, this would show UI for user to select
        const selectedNormalization = await this.simulateUserSelection(item, fieldType);

        itemSelection.normalized = selectedNormalization;
        itemSelection.accepted = selectedNormalization !== null;
        itemSelection.source = selectedNormalization !== null ? 'user_selected' : 'skipped';
        itemSelection.variants = item.processed?.variants || [];
        itemSelection.similars = item.processed?.similars || [];

        if (selectedNormalization !== null) {
          userSelections.summary.userConfirmed++;
        } else {
          userSelections.summary.skipped++;
        }
      }

      userSelections.items.push(itemSelection);
    }

    return userSelections;
  }

  /**
   * Simulate user selection for a new (not yet learned) normalization
   * In a real implementation, this would show UI and wait for user input
   * @param {Object} item - Processed item result
   * @param {string} fieldType - Type of field being normalized
   * @returns {Promise<string|null>} Selected normalization or null if skipped
   */
  async simulateUserSelection(item, fieldType) {
    // This is a stub implementation
    // In the real Zotero extension, this would show a XUL dialog

    const processed = item.processed;

    // If there are similar mappings, prefer the highest confidence one
    if (processed.similars && processed.similars.length > 0) {
      const bestSimilar = processed.similars.reduce((best, current) =>
        current.similarity > best.similarity ? current : best
      );
      return bestSimilar.normalized;
    }

    // Otherwise, use the first variant as default
    if (processed.variants && processed.variants.length > 0) {
      return processed.variants[0];
    }

    // Fallback to original value
    return item.rawValue;
  }

  /**
   * Render the UI as HTML for demonstration purposes
   * @param {Object} results - Processed results to display
   * @returns {string} HTML representation of the dialog
   */
  renderUIDemo(results) {
    const fieldTypeLabel = results.fieldType.charAt(0).toUpperCase() + results.fieldType.slice(1);
    let html = `<div class="ner-field-normalizer-dialog"><h2>${fieldTypeLabel} Normalization</h2>`;

    html += `<div class="dialog-summary">`;
    html += `<p>Total items: ${results.summary.total}</p>`;
    html += `<p>Already learned: ${results.summary.alreadyLearned}</p>`;
    html += `<p>Needs attention: ${results.summary.needsAttention}</p>`;
    html += `</div>`;

    for (const item of results.items) {
      html += `<div class="item-section" data-item-id="${item.itemID}">`;
      html += `<h3>${item.title}</h3>`;

      // Use the correct syntax: if (result.processed && result.processed.alreadyLearned)
      if (item.processed && item.processed.alreadyLearned) {
        html += `<p class="learned"><strong>Learned:</strong> ${item.rawValue} → ${item.processed.normalized}</p>`;
        html += `<input type="hidden" name="selection-${item.itemID}" value="${item.processed.normalized}">`;
      } else {
        html += `<p><strong>Original:</strong> ${item.rawValue}</p>`;

        // Show variants
        const variants = item.processed?.variants || [];
        if (variants.length > 0) {
          html += `<div class="variants-section"><h4>Suggested Normalizations:</h4><ul>`;
          for (const variant of variants) {
            html += `<li><label><input type="radio" name="selection-${item.itemID}" value="${variant}"> ${variant}</label></li>`;
          }
          html += `</ul></div>`;
        }

        // Show similar learned names
        const similars = item.processed?.similars || [];
        if (similars.length > 0) {
          html += `<div class="similar-section"><h4>Similar Previously Learned:</h4><ul>`;
          for (const similar of similars) {
            html += `<li><label><input type="radio" name="selection-${item.itemID}" value="${similar.normalized}"> ${similar.raw} → ${similar.normalized} (${(similar.similarity * 100).toFixed(1)}%)</label></li>`;
          }
          html += `</ul></div>`;
        }

        // Option to keep original
        html += `<div class="original-section"><label><input type="radio" name="selection-${item.itemID}" value="${item.rawValue}" checked> Keep original: ${item.rawValue}</label></div>`;
      }

      html += `</div>`;
    }

    html += `<div class="dialog-actions">`;
    html += `<button id="accept-all-btn">Accept All</button>`;
    html += `<button id="apply-changes-btn">Apply Selected Changes</button>`;
    html += `<button id="cancel-btn">Cancel</button>`;
    html += `</div></div>`;

    return html;
  }
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FieldNormalizerDialog;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.FieldNormalizerDialog = FieldNormalizerDialog;
}
