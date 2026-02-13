/**
 * Field Normalizer - Base class for normalizing Zotero field values
 * Supports publisher names, locations, and journal names with factory pattern
 * @module core/field-normalizer
 */

/**
 * FieldNormalizer Base Class
 * Provides factory pattern for creating field-specific normalizers
 * with lazy initialization of variant generator and learning engine
 * @class FieldNormalizer
 */
class FieldNormalizer {
  /**
   * Factory method to create field-specific normalizers
   * @param {string} fieldType - Type of field (publisher, location, journal)
   * @param {string} fieldName - Name of the field
   * @param {Object} options - Normalization options
   * @returns {FieldNormalizer} Field-specific normalizer instance
   */
  static create(fieldType, fieldName, options = {}) {
    switch (fieldType.toLowerCase()) {
      case 'publisher':
        return new PublisherNormalizer(fieldName, options);
      case 'location':
      case 'place':
        return new LocationNormalizer(fieldName, options);
      case 'journal':
      case 'publicationtitle':
        return new JournalNormalizer(fieldName, options);
      default:
        return new FieldNormalizer(fieldType, fieldName, options);
    }
  }

  /**
   * Create a FieldNormalizer instance
   * @param {string} fieldType - Type of field
   * @param {string} fieldName - Name of the field
   * @param {Object} options - Normalization options
   */
  constructor(fieldType, fieldName, options = {}) {
    /**
     * Type of field being normalized
     * @member {string}
     */
    this.fieldType = fieldType;

    /**
     * Name of the field
     * @member {string}
     */
    this.fieldName = fieldName;

    /**
     * Normalization options
     * @member {Object}
     */
    this.options = Object.assign({
      expandAbbreviations: true,
      normalizeSeparators: true,
      splitMultiValues: true,
      caseNormalization: 'titlecase',
      removeTrailingPunctuation: true,
      useLearningEngine: true
    }, options);

    /**
     * Lazy-loaded variant generator
     * @member {FieldVariantGenerator|null}
     */
    this._variantGenerator = null;

    /**
     * Lazy-loaded learning engine
     * @member {ScopedLearningEngine|null}
     */
    this._learningEngine = null;

    /**
     * Storage key prefix for this field type
     * @member {string}
     */
    this.storageKeyPrefix = `field_normalizer_${fieldType}_`;
  }

  /**
   * Get variant generator (lazy initialization)
   * @returns {FieldVariantGenerator} Variant generator instance
   */
  get variantGenerator() {
    if (!this._variantGenerator) {
      const FieldVariantGenerator = require('./field-variant-generator');
      this._variantGenerator = new FieldVariantGenerator();
    }
    return this._variantGenerator;
  }

  /**
   * Set variant generator
   * @param {FieldVariantGenerator} generator - Variant generator instance
   */
  set variantGenerator(generator) {
    this._variantGenerator = generator;
  }

  /**
   * Get learning engine (lazy initialization)
   * @returns {ScopedLearningEngine} Learning engine instance
   */
  get learningEngine() {
    if (!this._learningEngine) {
      const ScopedLearningEngine = require('./scoped-learning-engine');
      this._learningEngine = new ScopedLearningEngine();
    }
    return this._learningEngine;
  }

  /**
   * Set learning engine
   * @param {ScopedLearningEngine} engine - Learning engine instance
   */
  set learningEngine(engine) {
    this._learningEngine = engine;
  }

  /**
   * Main normalization pipeline
   * Normalizes a field value through parsing, variant generation, and learning lookup
   * @param {string} rawValue - Raw field value to normalize
   * @param {Object} item - Zotero item context (optional)
   * @returns {Promise<Object>} Normalization result with variants and suggestions
   */
  async normalizeFieldValue(rawValue, item = null) {
    if (!rawValue || typeof rawValue !== 'string') {
      return {
        success: false,
        original: rawValue,
        normalized: null,
        error: 'Invalid input value'
      };
    }

    const trimmedValue = rawValue.trim();
    if (trimmedValue === '') {
      return {
        success: false,
        original: rawValue,
        normalized: null,
        error: 'Empty input value'
      };
    }

    try {
      // Step 1: Parse the field value
      const parsed = this.parseFieldValue(trimmedValue);

      // Step 2: Generate variants
      const variants = this.generateVariants(trimmedValue);

      // Step 3: Check learned mappings
      let learnedMapping = null;
      if (this.options.useLearningEngine) {
        learnedMapping = await this.getLearnedMapping(trimmedValue);
      }

      // Step 4: Find similar learned values
      let similarMappings = [];
      if (this.options.useLearningEngine) {
        similarMappings = await this.findSimilarMappings(trimmedValue);
      }

      // Step 5: Build result
      const result = {
        success: true,
        original: trimmedValue,
        fieldType: this.fieldType,
        fieldName: this.fieldName,
        parsed: parsed,
        variants: variants,
        learnedMapping: learnedMapping,
        similarMappings: similarMappings,
        suggestedNormalization: learnedMapping ? learnedMapping.normalized : variants[0] || trimmedValue
      };

      return result;
    } catch (error) {
      return {
        success: false,
        original: trimmedValue,
        normalized: null,
        error: error.message
      };
    }
  }

  /**
   * Generate field-specific variants
   * To be implemented by subclasses
   * @param {string} rawValue - Raw field value
   * @returns {Array} Array of variant strings
   * @abstract
   */
  generateVariants(rawValue) {
    throw new Error('generateVariants() must be implemented by subclass');
  }

  /**
   * Parse field value into components
   * To be implemented by subclasses
   * @param {string} rawValue - Raw field value
   * @returns {Object} Parsed components
   * @abstract
   */
  parseFieldValue(rawValue) {
    throw new Error('parseFieldValue() must be implemented by subclass');
  }

  /**
   * Extract field value from Zotero item
   * To be implemented by subclasses
   * @param {Object} item - Zotero item
   * @returns {string|null} Extracted field value
   * @abstract
   */
  extractFieldValue(item) {
    throw new Error('extractFieldValue() must be implemented by subclass');
  }

  /**
   * Get learned mapping for a value
   * @param {string} rawValue - Raw field value
   * @returns {Promise<Object|null>} Learned mapping or null
   */
  async getLearnedMapping(rawValue) {
    try {
      const canonicalKey = this.createCanonicalKey(rawValue);
      return await this.learningEngine.getScopedMapping(canonicalKey, this.fieldType);
    } catch (error) {
      console.error('Error getting learned mapping:', error);
      return null;
    }
  }

  /**
   * Find similar learned mappings
   * @param {string} rawValue - Raw field value
   * @returns {Promise<Array>} Array of similar mappings
   */
  async findSimilarMappings(rawValue) {
    try {
      return await this.learningEngine.findSimilarMappings(rawValue, this.fieldType);
    } catch (error) {
      console.error('Error finding similar mappings:', error);
      return [];
    }
  }

  /**
   * Store a learned mapping
   * @param {string} rawValue - Original raw value
   * @param {string} normalizedValue - User-accepted normalized form
   * @param {number} confidence - Confidence score (0-1)
   * @param {string} collectionId - Optional collection scope
   * @returns {Promise<boolean>} Success status
   */
  async storeLearnedMapping(rawValue, normalizedValue, confidence = 1.0, collectionId = null) {
    try {
      await this.learningEngine.storeScopedMapping(
        rawValue,
        normalizedValue,
        this.fieldType,
        collectionId
      );
      return true;
    } catch (error) {
      console.error('Error storing learned mapping:', error);
      return false;
    }
  }

  /**
   * Create canonical key for consistent lookups
   * @param {string} value - Value to canonicalize
   * @returns {string} Canonical key
   */
  createCanonicalKey(value) {
    if (!value) return '';
    return value
      .trim()
      .toLowerCase()
      .replace(/[.,;:!?()]/g, '')
      .replace(/\s+/g, ' ');
  }
}


/**
 * Publisher Normalizer - Handles publisher name normalization
 * @class PublisherNormalizer
 * @extends FieldNormalizer
 */
class PublisherNormalizer extends FieldNormalizer {
  /**
   * Create a PublisherNormalizer instance
   * @param {string} fieldName - Name of the field
   * @param {Object} options - Normalization options
   */
  constructor(fieldName = 'publisher', options = {}) {
    super('publisher', fieldName, options);
  }

  /**
   * Generate publisher-specific variants
   * @param {string} rawValue - Raw publisher value
   * @returns {Array} Array of variant strings
   */
  generateVariants(rawValue) {
    return this.variantGenerator.generatePublisherVariants(rawValue, new Set());
  }

  /**
   * Parse publisher value into components
   * @param {string} rawValue - Raw publisher value
   * @returns {Object} Parsed components
   */
  parseFieldValue(rawValue) {
    const FieldConstants = require('../config/field-constants');

    // Try to split multi-publisher values
    let publishers = [rawValue];
    for (const separator of FieldConstants.PUBLISHER_SEPARATORS) {
      if (rawValue.match(separator)) {
        publishers = rawValue.split(separator).map(s => s.trim());
        break;
      }
    }

    return {
      original: rawValue,
      type: 'publisher',
      publishers: publishers,
      hasMultiple: publishers.length > 1,
      canonical: this.variantGenerator.generateFieldCanonical(rawValue, 'publisher')
    };
  }

  /**
   * Extract publisher from Zotero item
   * @param {Object} item - Zotero item
   * @returns {string|null} Publisher value
   */
  extractFieldValue(item) {
    if (!item) return null;
    try {
      return item.getField('publisher');
    } catch (error) {
      console.error('Error extracting publisher:', error);
      return null;
    }
  }
}


/**
 * Location Normalizer - Handles location/place normalization
 * @class LocationNormalizer
 * @extends FieldNormalizer
 */
class LocationNormalizer extends FieldNormalizer {
  /**
   * Create a LocationNormalizer instance
   * @param {string} fieldName - Name of the field
   * @param {Object} options - Normalization options
   */
  constructor(fieldName = 'place', options = {}) {
    super('location', fieldName, options);
  }

  /**
   * Generate location-specific variants
   * @param {string} rawValue - Raw location value
   * @returns {Array} Array of variant strings
   */
  generateVariants(rawValue) {
    return this.variantGenerator.generateLocationVariants(rawValue, new Set());
  }

  /**
   * Parse location value into components
   * @param {string} rawValue - Raw location value
   * @returns {Object} Parsed components
   */
  parseFieldValue(rawValue) {
    const FieldConstants = require('../config/field-constants');

    // Split multi-location values
    let locations = [rawValue];
    for (const separator of FieldConstants.LOCATION_SEPARATORS) {
      if (rawValue.includes(separator)) {
        locations = rawValue.split(separator).map(s => s.trim()).filter(s => s);
        break;
      }
    }

    // Parse each location for state information
    const parsedLocations = locations.map(loc => {
      const stateInfo = this.parseStateInfo(loc);
      return {
        raw: loc,
        city: stateInfo.city,
        state: stateInfo.state,
        stateAbbrev: stateInfo.stateAbbrev,
        country: stateInfo.country
      };
    });

    return {
      original: rawValue,
      type: 'location',
      locations: parsedLocations,
      hasMultiple: locations.length > 1,
      canonical: this.variantGenerator.generateFieldCanonical(rawValue, 'location')
    };
  }

  /**
   * Parse state information from location string
   * @param {string} location - Location string
   * @returns {Object} Parsed state info
   */
  parseStateInfo(location) {
    const stateAbbrevs = require('../config/field-constants').STATE_ABBREVIATIONS;

    let city = location;
    let state = null;
    let stateAbbrev = null;
    let country = null;

    // Check for state abbreviation at end
    for (const [abbr, fullName] of Object.entries(stateAbbrevs)) {
      const abbrPattern = new RegExp(`\\s*,?\\s*${abbr}$`);
      const fullPattern = new RegExp(`\\s*,?\\s*${fullName}$`);

      if (abbrPattern.test(location)) {
        stateAbbrev = abbr;
        state = fullName;
        city = location.replace(abbrPattern, '').trim();
        break;
      }

      if (fullPattern.test(location)) {
        state = fullName;
        stateAbbrev = abbr;
        city = location.replace(fullPattern, '').trim();
        break;
      }
    }

    return { city, state, stateAbbrev, country };
  }

  /**
   * Extract location from Zotero item
   * @param {Object} item - Zotero item
   * @returns {string|null} Location value
   */
  extractFieldValue(item) {
    if (!item) return null;
    try {
      return item.getField('place');
    } catch (error) {
      console.error('Error extracting place:', error);
      return null;
    }
  }
}


/**
 * Journal Normalizer - Handles journal/publication title normalization
 * @class JournalNormalizer
 * @extends FieldNormalizer
 */
class JournalNormalizer extends FieldNormalizer {
  /**
   * Create a JournalNormalizer instance
   * @param {string} fieldName - Name of the field
   * @param {Object} options - Normalization options
   */
  constructor(fieldName = 'publicationTitle', options = {}) {
    super('journal', fieldName, options);
  }

  /**
   * Generate journal-specific variants
   * @param {string} rawValue - Raw journal value
   * @returns {Array} Array of variant strings
   */
  generateVariants(rawValue) {
    return this.variantGenerator.generateJournalVariants(rawValue, new Set());
  }

  /**
   * Parse journal value into components
   * @param {string} rawValue - Raw journal value
   * @returns {Object} Parsed components
   */
  parseFieldValue(rawValue) {
    return {
      original: rawValue,
      type: 'journal',
      title: rawValue,
      isAbbreviated: this.detectAbbreviation(rawValue),
      canonical: this.variantGenerator.generateFieldCanonical(rawValue, 'journal')
    };
  }

  /**
   * Detect if a journal name appears to be abbreviated
   * @param {string} journalName - Journal name
   * @returns {boolean} True if likely abbreviated
   */
  detectAbbreviation(journalName) {
    // Check for common abbreviation patterns
    const abbrevPattern = /\b[A-Z]\.\s*[A-Z]?\.?\s*[A-Z]?\.?/;
    return abbrevPattern.test(journalName);
  }

  /**
   * Extract journal from Zotero item
   * @param {Object} item - Zotero item
   * @returns {string|null} Journal/publication title
   */
  extractFieldValue(item) {
    if (!item) return null;
    try {
      return item.getField('publicationTitle');
    } catch (error) {
      console.error('Error extracting publicationTitle:', error);
      return null;
    }
  }
}


// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FieldNormalizer,
    PublisherNormalizer,
    LocationNormalizer,
    JournalNormalizer
  };
}

// Export for browser
if (typeof window !== 'undefined') {
  window.FieldNormalizer = FieldNormalizer;
  window.PublisherNormalizer = PublisherNormalizer;
  window.LocationNormalizer = LocationNormalizer;
  window.JournalNormalizer = JournalNormalizer;
}
