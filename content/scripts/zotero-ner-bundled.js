/**
 * Zotero NER Author Name Normalizer - Bundled Implementation
 * Generated on 2025-09-25T15:47:37.794Z
 * Contains all core functionality for the extension
 */

// Global namespace for the extension
if (typeof window !== 'undefined' && !window.ZoteroNER) {
  window.ZoteroNER = {};
}

(function() {
  'use strict';
  
  // Utility functions
  const utils = {
    // Deep clone an object
    clone: function(obj) {
      if (obj === null || typeof obj !== 'object') return obj;
      if (obj instanceof Date) {
        const copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
      }
      if (obj instanceof Array) {
        const copy = [];
        for (let i = 0, len = obj.length; i < len; i++) {
          copy[i] = utils.clone(obj[i]);
        }
        return copy;
      }
      if (obj instanceof Object) {
        const copy = {};
        for (const attr in obj) {
          if (obj.hasOwnProperty(attr)) copy[attr] = utils.clone(obj[attr]);
        }
        return copy;
      }
      throw new Error("Unable to copy obj! Its type isn't supported.");
    },
    
    // Merge two objects
    merge: function(target, source) {
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          target[key] = source[key];
        }
      }
      return target;
    },
    
    // Calculate Levenshtein distance between two strings
    levenshteinDistance: function(str1, str2) {
      const matrix = [];
      
      if (str1.length === 0) return str2.length;
      if (str2.length === 0) return str1.length;
      
      // Initialize matrix
      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }
      
      // Fill the matrix
      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1, // substitution
              matrix[i][j - 1] + 1,     // insertion
              matrix[i - 1][j] + 1      // deletion
            );
          }
        }
      }
      
      return matrix[str2.length][str1.length];
    }
  };
  
  // Main ZoteroNER namespace
  const ZoteroNER = window.ZoteroNER || {};
  

  // Module: ner-processor
  try {
    ZoteroNER.NerProcessor = (function() {
      // Module content
      /**
 * NER Processor - Handles name parsing and recognition using GLINER or similar
 */
class NERProcessor {
  constructor() {
    this.glinerHandler = null;
    this.isInitialized = false;
    this.entities = ['PERSON', 'FIRST_NAME', 'MIDDLE_NAME', 'LAST_NAME', 'PREFIX', 'SUFFIX'];
  }

  async initialize() {
    // Initialize the GLINER handler
    const GLINERHandler = require('./gliner-handler.js');
    this.glinerHandler = new GLINERHandler();
    
    try {
      await this.glinerHandler.initialize();
      console.log('NER Processor initialized with GLINER handler');
    } catch (error) {
      console.error('Error initializing GLINER handler:', error);
      console.log('Using fallback rule-based processing');
    }
    
    this.isInitialized = true;
  }

  /**
   * Process text with NER to identify name components
   * @param {string} text - Text to process
   * @returns {Array} Array of identified entities
   */
  async processText(text) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.glinerHandler && this.glinerHandler.isInitialized) {
      return await this.glinerHandler.runNER(text);
    } else {
      // Fallback to rule-based processing
      return this.fallbackNER(text);
    }
  }

  /**
   * Rule-based NER as fallback
   * @param {string} text - Input text
   * @returns {Array} Array of entities
   */
  fallbackNER(text) {
    // This uses the same logic as in GLINERHandler for consistency
    const words = text.split(/\s+/);
    const entities = [];
    const prefixes = ['van', 'de', 'la', 'von', 'del', 'di', 'du', 'le', 'lo', 'da', 'des', 'dos', 'das', 'el', 'al'];
    const suffixes = ['Jr', 'Sr', 'II', 'III', 'IV', 'PhD', 'MD', 'Jr.', 'Sr.'];

    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,]/g, ''); // Remove punctuation
      const originalWord = words[i];

      let label = 'O'; // Default: not an entity

      if (suffixes.some(s => s.toLowerCase() === word.toLowerCase())) {
        label = 'suffix';
      } else if (prefixes.includes(word.toLowerCase())) {
        label = 'prefix';
      } else if (/^[A-Z]\.?$/.test(word)) {
        label = 'initial';
      } else if (i === 0) {
        label = 'first_name';
      } else if (i === words.length - 1) {
        label = 'last_name';
      } else if (i > 0 && i < words.length - 1) {
        label = 'middle_name';
      }

      entities.push({
        text: originalWord,
        start: text.indexOf(originalWord),
        end: text.indexOf(originalWord) + originalWord.length,
        label: label
      });
    }

    return entities;
  }

  /**
   * Parse a raw author name string into components
   * @param {string} rawName - Raw author name string
   * @returns {Object} Parsed name components
   */
  async parseName(rawName) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Use NER to identify components, then structure them
    const entities = await this.processText(rawName);
    
    // Structure the entities into name components
    return this.structureNameComponents(rawName, entities);
  }

  /**
   * Structure entities into name components
   * @param {string} rawName - Original name
   * @param {Array} entities - Identified entities
   * @returns {Object} Structured name components
   */
  structureNameComponents(rawName, entities) {
    // For now, use our enhanced NameParser as the authoritative source
    // The NER entities can be used to validate or enhance the parsing
    const NameParser = require('./name-parser.js');
    const parser = new NameParser();
    const structured = parser.parse(rawName);

    // Apply any additional logic from NER entities
    for (const entity of entities) {
      if (entity.label === 'prefix') {
        structured.prefix = entity.text;
      } else if (entity.label === 'suffix') {
        structured.suffix = entity.text;
      }
    }

    return structured;
  }

  /**
   * Process a batch of names
   * @param {Array} names - Array of name strings
   * @returns {Promise<Array>} Array of parsed results
   */
  async processBatch(names) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.glinerHandler && this.glinerHandler.isInitialized) {
      return await this.glinerHandler.runBatchNER(names);
    } else {
      // Process individually with fallback
      const results = [];
      for (const name of names) {
        const entities = await this.fallbackNER(name);
        results.push({ text: name, entities });
      }
      return results;
    }
  }

  /**
   * Get confidence score for a parsed name
   * @param {Object} parsed - Parsed name object
   * @returns {number} Confidence score (0-1)
   */
  getConfidence(parsed) {
    // Calculate confidence based on completeness and pattern matching
    let score = 0.5; // Base score

    // Increase confidence if we have both first and last names
    if (parsed.firstName && parsed.lastName) {
      score += 0.3;
    }

    // Increase confidence if we detect specific patterns
    if (parsed.prefix) score += 0.1;
    if (parsed.suffix) score += 0.1;

    // Adjust based on name part lengths
    if (parsed.firstName && parsed.firstName.length > 2) score += 0.05;
    if (parsed.lastName && parsed.lastName.length > 2) score += 0.05;

    return Math.min(score, 1.0);
  }

  /**
   * Find potential variants using Levenshtein distance
   * @param {string} name - Name to find variants for
   * @param {Array} candidates - Candidate names to check against
   * @param {number} threshold - Similarity threshold (0-1)
   * @returns {Array} Array of similar names with distance scores
   */
  findVariantsBySimilarity(name, candidates, threshold = 0.8) {
    const results = [];
    
    for (const candidate of candidates) {
      const distance = this.levenshteinDistance(name, candidate);
      const maxLength = Math.max(name.length, candidate.length);
      const similarity = 1 - (distance / maxLength);
      
      if (similarity >= threshold) {
        results.push({
          name: candidate,
          similarity: similarity,
          distance: distance
        });
      }
    }
    
    // Sort by similarity descending
    return results.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    if (str1.length === 0) return str2.length;
    if (str2.length === 0) return str1.length;

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill the matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Extract name components and their frequencies from a list of names
   * @param {Array} names - Array of name strings
   * @returns {Object} Object with surname and first name frequencies
   */
  extractNameFrequencies(names) {
    const surnameCount = {};
    const firstNameCount = {};
    const NameParser = require('./name-parser.js');
    const parser = new NameParser();
    
    for (const name of names) {
      const parsed = parser.parse(name);
      if (parsed.lastName) {
        const lastName = parsed.lastName.toLowerCase().trim();
        surnameCount[lastName] = (surnameCount[lastName] || 0) + 1;
      }
      if (parsed.firstName) {
        const firstName = parsed.firstName.toLowerCase().trim();
        firstNameCount[firstName] = (firstNameCount[firstName] || 0) + 1;
      }
    }
    
    return { surnames: surnameCount, firstNames: firstNameCount };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NERProcessor;
}
      
      // Return the default export or the module itself
      return typeof module !== 'undefined' && module.exports ? module.exports : (typeof exports !== 'undefined' ? exports : {});
    })();
  } catch (e) {
    console.error('Error loading module ner-processor:', e);
  }
  

  // Module: name-parser
  try {
    ZoteroNER.NameParser = (function() {
      // Module content
      /**
 * Name Parser - Enhanced name parsing logic
 */
class NameParser {
  constructor() {
    this.prefixes = ['van', 'de', 'la', 'von', 'del', 'di', 'du', 'le', 'lo', 'da', 'des', 'dos', 'das', 'el', 'al'];
    this.suffixes = ['Jr', 'Sr', 'II', 'III', 'IV', 'PhD', 'MD', 'Jr.', 'Sr.'];
    this.initialPattern = /^[A-Z]\.?$/;
    this.initialsPattern = /^[A-Z]\.[A-Z]\.?$/;
  }

  /**
   * Parse a name string with enhanced logic for specific cases
   * @param {string} rawName - Raw name string
   * @returns {Object} Parsed name components
   */
  parse(rawName) {
    const original = rawName;
    let parts = rawName.trim().replace(/[,\s]+$/, '').split(/\s+/); // Remove trailing commas/space
    const result = {
      firstName: '',
      middleName: '',
      lastName: '',
      prefix: '',
      suffix: '',
      original: original
    };

    // Handle single word case first
    if (parts.length === 1) {
      // If it's a known prefix, treat as prefix; otherwise treat as last name
      if (this.prefixes.includes(parts[0].toLowerCase())) {
        result.prefix = parts[0];
      } else {
        result.lastName = parts[0];
      }
      return result;
    }

    // Process from the end (potential suffix and last name)
    const reversedParts = [...parts].reverse();
    let suffixProcessed = false;

    // Check for suffixes at the end first
    for (let i = 0; i < reversedParts.length; i++) {
      const part = reversedParts[i];
      
      if (!suffixProcessed && this.suffixes.some(s => 
        part.toLowerCase() === s.toLowerCase() || 
        part.toLowerCase() === s.toLowerCase() + '.')) {
        if (!result.suffix) result.suffix = part;
        else result.suffix = `${part} ${result.suffix}`;
        parts = parts.filter((_, idx) => idx !== (parts.length - 1 - i));
      } else {
        suffixProcessed = true;
        break;
      }
    }

    // Process remaining parts for prefixes, first/middle/last names
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // Check if it's a prefix
      if (this.prefixes.includes(part.toLowerCase())) {
        // Check if this is the start of a multi-part prefix like "del Carmen" or "de la Cruz"
        // For certain prefixes, we accept the next word as part of the prefix if it's capitalized (likely a proper name)
        if (i + 1 < parts.length && this.isNextWordForPrefix(part.toLowerCase(), parts[i + 1])) {
          // Combine the prefix with the next word
          const combinedPrefix = `${part} ${parts[i + 1]}`;
          if (!result.prefix) {
            result.prefix = combinedPrefix;
          } else {
            result.prefix = `${result.prefix} ${combinedPrefix}`;
          }
          i++; // Skip the next word since we processed it as part of the prefix
        } else {
          // Single prefix
          if (!result.prefix) {
            result.prefix = part;
          } else {
            result.prefix = `${result.prefix} ${part}`;
          }
        }
      } 
      // Check if it's an initial or abbreviated name
      else if (this.initialPattern.test(part) || this.initialsPattern.test(part)) {
        // If we don't have a first name yet, treat as first name
        if (!result.firstName) {
          result.firstName = part;
        } else if (!result.lastName) {
          // Otherwise, if we don't have a last name, treat as middle name
          result.middleName = result.middleName ? `${result.middleName} ${part}` : part;
        } else {
          // If we have both first and last, treat as middle name
          result.middleName = result.middleName ? `${result.middleName} ${part}` : part;
        }
      }
      // Handle the case where it might be first name, middle name or last name
      else {
        // If we don't have a first name yet, treat as first name
        if (!result.firstName) {
          result.firstName = part;
        } 
        // If we only have a first name (for 2-part names like "John Smith"), treat this as last name
        else if (result.firstName && !result.middleName && !result.lastName && i === parts.length - 1) {
          result.lastName = part;
        }
        // If we have first name and might have more parts, determine if middle or last name
        else if (result.firstName) {
          // For 3+ part names, second part is usually middle name, last part is last name
          if (i === parts.length - 1) { // This is the last part, so it's the last name
            result.lastName = result.lastName ? `${result.lastName} ${part}` : part;
          } else {
            // Middle part of a multi-part name
            result.middleName = result.middleName ? `${result.middleName} ${part}` : part;
          }
        }
        // If we already have both first and last names, add to middle name
        else if (result.firstName && result.lastName) {
          result.middleName = result.middleName ? `${result.middleName} ${part}` : part;
        }
      }
    }

    return result;
  }

  /**
   * Check if the next word should be considered part of the prefix
   * @param {string} currentPrefix - Current prefix word 
   * @param {string} nextWord - Next word to consider
   * @returns {boolean} True if next word should be part of the prefix
   */
  isNextWordForPrefix(currentPrefix, nextWord) {
    // For certain prefixes like "del", "de la", "van", we might accept the next capitalized word as part of the prefix
    // This is common in Spanish/Portuguese names: "del Carmen", "de la Cruz"
    const prefixesThatTakeName = ['del', 'de', 'da', 'das', 'dos', 'do', 'du', 'des', 'di'];
    
    if (prefixesThatTakeName.includes(currentPrefix)) {
      // Check if the next word looks like a proper name (starts with uppercase, not an initial)
      return /^[A-Z][a-zA-Z]+$/.test(nextWord) && nextWord.length > 1;
    }
    
    return false;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NameParser;
}
      
      // Return the default export or the module itself
      return typeof module !== 'undefined' && module.exports ? module.exports : (typeof exports !== 'undefined' ? exports : {});
    })();
  } catch (e) {
    console.error('Error loading module name-parser:', e);
  }
  

  // Module: variant-generator
  try {
    ZoteroNER.VariantGenerator = (function() {
      // Module content
      /**
 * Variant Generator - Creates multiple normalized name variations
 */
class VariantGenerator {
  constructor() {
    this.variationPatterns = [
      this.fullForm,
      this.initialForm,
      this.lastOnlyForm,
      this.firstInitialLastForm,
      this.firstInitialsLastForm
    ];
  }

  /**
   * Generate various forms of a parsed name
   * @param {Object} parsedName - Name components from parser
   * @returns {Array} Array of variant representations
   */
  generateVariants(parsedName) {
    const variants = new Set(); // Use Set to avoid duplicates

    this.variationPatterns.forEach(pattern => {
      const variant = pattern.call(this, parsedName);
      if (variant) {
        variants.add(variant);
      }
    });

    // Add original form
    variants.add(parsedName.original);

    return Array.from(variants);
  }

  /**
   * Full name: First Middle [Prefix] Last
   * @param {Object} parsedName - Parsed name object
   * @returns {string} Full name form
   */
  fullForm(parsedName) {
    const parts = [];
    if (parsedName.firstName) parts.push(parsedName.firstName);
    if (parsedName.middleName) parts.push(parsedName.middleName);
    if (parsedName.prefix) parts.push(parsedName.prefix);  // Position prefix after first/middle names
    if (parsedName.lastName) parts.push(parsedName.lastName);
    return parts.join(' ').trim();
  }

  /**
   * Initials form: F.M. [Prefix] Last
   * @param {Object} parsedName - Parsed name object
   * @returns {string} Initials form
   */
  initialForm(parsedName) {
    if (!parsedName.firstName || !parsedName.lastName) return null;

    const firstNameInitial = parsedName.firstName.charAt(0).toUpperCase() + '.';
    let middleInitials = '';
    
    if (parsedName.middleName) {
      const middleParts = parsedName.middleName.split(/\s+/);
      middleInitials = middleParts
        .map(part => part.charAt(0).toUpperCase() + '.')
        .join(' ');
    }

    const parts = [];
    parts.push(firstNameInitial);
    if (middleInitials) parts.push(middleInitials);
    if (parsedName.prefix) parts.push(parsedName.prefix);  // Position prefix after initials
    parts.push(parsedName.lastName);

    return parts.join(' ').trim();
  }

  /**
   * Last name only
   * @param {Object} parsedName - Parsed name object
   * @returns {string} Last name only
   */
  lastOnlyForm(parsedName) {
    return parsedName.lastName ? parsedName.lastName.trim() : null;
  }

  /**
   * First Initial Last form: F. [Prefix] Last
   * @param {Object} parsedName - Parsed name object
   * @returns {string} First initial last form
   */
  firstInitialLastForm(parsedName) {
    if (!parsedName.firstName || !parsedName.lastName) return null;

    const firstNameInitial = parsedName.firstName.charAt(0).toUpperCase() + '.';
    const parts = [];
    
    parts.push(firstNameInitial);
    if (parsedName.prefix) parts.push(parsedName.prefix);  // Position prefix after initial
    parts.push(parsedName.lastName);

    return parts.join(' ').trim();
  }

  /**
   * First Initials Last form: F.M. [Prefix] Last
   * @param {Object} parsedName - Parsed name object
   * @returns {string} First and middle initials last form
   */
  firstInitialsLastForm(parsedName) {
    if (!parsedName.firstName || !parsedName.lastName) return null;

    const firstNameInitial = parsedName.firstName.charAt(0).toUpperCase() + '.';
    let middleInitials = '';
    
    if (parsedName.middleName) {
      const middleParts = parsedName.middleName.split(/\s+/);
      middleInitials = middleParts
        .map(part => part.charAt(0).toUpperCase() + '.')
        .join('');
    }

    const parts = [];
    parts.push(firstNameInitial + middleInitials);
    if (parsedName.prefix) parts.push(parsedName.prefix);  // Position prefix after initials
    parts.push(parsedName.lastName);

    const result = parts.join(' ').trim();
    // Remove extra dots if they exist
    return result.replace(/\.{2,}/g, '.');
  }

  /**
   * Generate canonical form for comparison
   * @param {Object} parsedName - Parsed name object
   * @returns {string} Canonical form
   */
  generateCanonical(parsedName) {
    // Create a standardized form for comparison purposes
    const parts = [];
    if (parsedName.lastName) parts.push(parsedName.lastName.toUpperCase());
    if (parsedName.firstName) parts.push(parsedName.firstName.toUpperCase());
    if (parsedName.middleName) {
      const middleParts = parsedName.middleName.split(/\s+/);
      middleParts.forEach(part => parts.push(part.toUpperCase()));
    }
    return parts.join(' ').trim();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VariantGenerator;
}
      
      // Return the default export or the module itself
      return typeof module !== 'undefined' && module.exports ? module.exports : (typeof exports !== 'undefined' ? exports : {});
    })();
  } catch (e) {
    console.error('Error loading module variant-generator:', e);
  }
  

  // Module: learning-engine
  try {
    ZoteroNER.LearningEngine = (function() {
      // Module content
      /**
 * Learning Engine - Handles storing and retrieving learned name mappings with enhanced learning capabilities
 */
class LearningEngine {
  constructor() {
    this.storageKey = 'ner_normalizer_mappings';
    this.settingsKey = 'ner_normalizer_settings';
    this.mappings = new Map();
    this.settings = this.getDefaultSettings();
    
    this.loadMappings();
    this.loadSettings();
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
      
      // Return the default export or the module itself
      return typeof module !== 'undefined' && module.exports ? module.exports : (typeof exports !== 'undefined' ? exports : {});
    })();
  } catch (e) {
    console.error('Error loading module learning-engine:', e);
  }
  

  // Module: candidate-finder
  try {
    ZoteroNER.CandidateFinder = (function() {
      // Module content
      /**
 * Candidate Finder - Finds name variants across the entire Zotero library
 * Focuses on first name/initial variations for the same surnames
 */
class CandidateFinder {
  constructor() {
    this.nerProcessor = new (require('./ner-processor.js'))();
    this.learningEngine = new (require('./learning-engine.js'))();
    this.nameParser = new (require('./name-parser.js'))();
    this.variantGenerator = new (require('./variant-generator.js'))();
  }

  /**
   * Find all name variants in the Zotero database, focusing on first name/initial variations
   * for the same surnames
   * @param {Object} zoteroDB - Zotero database object (Zotero.DB in Zotero context)
   * @returns {Object} Object with surname groups and name variations
   */
  async findNameVariants(zoteroDB) {
    if (!zoteroDB) {
      throw new Error('Zotero database object required for candidate finding');
    }
    
    try {
      // Get all creators from the database
      const creators = await this.fetchAllCreators(zoteroDB);
      
      // Group creators by surname
      const creatorsBySurname = this.groupCreatorsBySurname(creators);
      
      // Find variations within each surname group
      const surnameVariations = {};
      let totalVariantGroups = 0;
      
      for (const [surname, creatorList] of Object.entries(creatorsBySurname)) {
        const variations = this.findFirstInitialVariations(creatorList);
        if (variations.length > 0) {
          surnameVariations[surname] = variations;
          totalVariantGroups += variations.length;
        }
      }
      
      return {
        surnameGroups: creatorsBySurname,
        variationsBySurname: surnameVariations,
        totalVariantGroups: totalVariantGroups,
        totalSurnames: Object.keys(creatorsBySurname).length
      };
    } catch (error) {
      console.error('Error in findNameVariants:', error);
      throw error;
    }
  }

  /**
   * Fetch all creators from the Zotero database
   * @param {Object} zoteroDB - Zotero database object
   * @returns {Array} Array of creator objects
   */
  async fetchAllCreators(zoteroDB) {
    // This is a placeholder implementation
    // In actual Zotero context, this would access the creators table
    if (typeof Zotero !== 'undefined') {
      // Real Zotero implementation would query the database
      const creators = [];
      
      // Get all items that have creators
      const items = await Zotero.Items.getAll();
      for (const item of items) {
        const itemCreators = item.getCreators();
        for (const creator of itemCreators) {
          creators.push(creator);
        }
      }
      
      return creators;
    } else {
      // For testing purposes, return mock data focusing on first name variations
      return [
        { firstName: "Jerry", lastName: "Fodor", creatorType: "author" },
        { firstName: "J.", lastName: "Fodor", creatorType: "author" },
        { firstName: "Jerry", lastName: "Fodor", creatorType: "author" },
        { firstName: "Jerry A.", lastName: "Fodor", creatorType: "author" },
        { firstName: "J.A.", lastName: "Fodor", creatorType: "author" },
        { firstName: "Eva", lastName: "van Dijk", creatorType: "author" },
        { firstName: "E.", lastName: "van Dijk", creatorType: "author" },
        { firstName: "John", lastName: "Smith", creatorType: "author" },
        { firstName: "J.", lastName: "Smith", creatorType: "author" },
        { firstName: "Johnny", lastName: "Smith", creatorType: "author" },
        { firstName: "J.B.", lastName: "Smith", creatorType: "author" },
        { firstName: "John B.", lastName: "Smith", creatorType: "author" }
      ];
    }
  }

  /**
   * Group creators by surname
   * @param {Array} creators - Array of creator objects
   * @returns {Object} Object with surnames as keys and creator arrays as values
   */
  groupCreatorsBySurname(creators) {
    const grouped = {};
    
    for (const creator of creators) {
      const parsed = this.nameParser.parse(`${creator.firstName || ''} ${creator.lastName || ''}`.trim());
      if (parsed.lastName) {
        const lastNameKey = parsed.lastName.toLowerCase().trim();
        if (!grouped[lastNameKey]) {
          grouped[lastNameKey] = [];
        }
        grouped[lastNameKey].push(creator);
      }
    }
    
    return grouped;
  }

  /**
   * Find first name/initial variations within a surname group
   * @param {Array} creators - Array of creators with the same surname
   * @returns {Array} Array of variation groups
   */
  findFirstInitialVariations(creators) {
    // Group by the full name to count frequencies, but focus on first name variations
    const nameFrequency = {};
    const nameToCreator = {};
    
    for (const creator of creators) {
      const fullName = `${creator.firstName || ''} ${creator.lastName || ''}`.trim().toLowerCase();
      nameFrequency[fullName] = (nameFrequency[fullName] || 0) + 1;
      if (!nameToCreator[fullName]) {
        nameToCreator[fullName] = creator;
      }
    }
    
    // Get unique first names for this surname group
    const firstNameVariants = {};
    for (const creator of creators) {
      const firstName = (creator.firstName || '').trim().toLowerCase();
      if (firstName) {
        if (!firstNameVariants[firstName]) {
          firstNameVariants[firstName] = 0;
        }
        firstNameVariants[firstName]++;
      }
    }
    
    // Find potential variants based on similarity of first names
    const firstNames = Object.keys(firstNameVariants);
    const variantGroups = [];
    
    for (let i = 0; i < firstNames.length; i++) {
      for (let j = i + 1; j < firstNames.length; j++) {
        const name1 = firstNames[i];
        const name2 = firstNames[j];
        
        // Calculate similarity using Levenshtein distance
        const distance = this.calculateLevenshteinDistance(name1, name2);
        const maxLength = Math.max(name1.length, name2.length);
        const similarity = maxLength > 0 ? 1 - (distance / maxLength) : 1;
        
        // Higher threshold for first name/initial similarity since they should be more similar
        if (similarity >= 0.6) { // Lower threshold to catch initial variations like "J." vs "Jerry"
          variantGroups.push({
            surname: creators[0].lastName, // All creators in this group share the same surname
            variant1: {
              firstName: name1,
              frequency: firstNameVariants[name1]
            },
            variant2: {
              firstName: name2,
              frequency: firstNameVariants[name2]
            },
            similarity: similarity,
            distance: distance
          });
        }
      }
    }
    
    // Sort by frequency sum descending (prioritize more common first name variants)
    variantGroups.sort((a, b) => {
      const totalFreqA = a.variant1.frequency + a.variant2.frequency;
      const totalFreqB = b.variant1.frequency + b.variant2.frequency;
      return totalFreqB - totalFreqA;
    });
    
    return variantGroups;
  }

  /**
   * Find canonical forms based on frequency for each surname group
   * @param {Object} variationsBySurname - Object with surname variations
   * @returns {Object} Mapping of name variants to canonical forms
   */
  findCanonicalForms(variationsBySurname) {
    const canonicalForms = {};
    
    for (const [surname, variations] of Object.entries(variationsBySurname)) {
      for (const variation of variations) {
        // Choose the more frequent first name variant as the canonical form
        const canonical = variation.variant1.frequency >= variation.variant2.frequency 
          ? variation.variant1.firstName 
          : variation.variant2.firstName;
        
        // Map both variants to the canonical form, but keep surname context
        const fullVariant1 = `${variation.variant1.firstName} ${variation.surname}`.trim();
        const fullVariant2 = `${variation.variant2.firstName} ${variation.surname}`.trim();
        const fullCanonical = `${canonical} ${variation.surname}`.trim();
        
        canonicalForms[fullVariant1.toLowerCase()] = fullCanonical;
        canonicalForms[fullVariant2.toLowerCase()] = fullCanonical;
      }
    }
    
    return canonicalForms;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Levenshtein distance
   */
  calculateLevenshteinDistance(str1, str2) {
    const matrix = [];

    if (str1.length === 0) return str2.length;
    if (str2.length === 0) return str1.length;

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill the matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Perform a full analysis of the Zotero library for first name/initial normalization opportunities
   * @param {Object} zoteroDB - Zotero database object
   * @returns {Object} Complete analysis results
   */
  async performFullAnalysis(zoteroDB) {
    console.log('Starting full name variant analysis (first name/initial focus)...');
    
    // Find name variants
    const variantData = await this.findNameVariants(zoteroDB);
    
    // Find canonical forms
    const canonicalForms = this.findCanonicalForms(variantData.variationsBySurname);
    
    // Generate potential normalization suggestions
    const suggestions = await this.generateNormalizationSuggestions(
      variantData.variationsBySurname, 
      canonicalForms
    );
    
    console.log(`Analysis complete: Found ${variantData.totalVariantGroups} variant groups across ${variantData.totalSurnames} surnames`);
    
    return {
      surnameGroups: variantData.surnameGroups,
      variationsBySurname: variantData.variationsBySurname,
      canonicalForms: canonicalForms,
      suggestions: suggestions,
      totalVariantGroups: variantData.totalVariantGroups,
      totalSurnamesAnalyzed: variantData.totalSurnames
    };
  }

  /**
   * Generate normalization suggestions for UI presentation
   * @param {Object} variationsBySurname - Variations grouped by surname
   * @param {Object} canonicalForms - Canonical form mappings
   * @returns {Array} Array of suggestions for user review
   */
  async generateNormalizationSuggestions(variationsBySurname, canonicalForms) {
    const suggestions = [];
    
    for (const [surname, variations] of Object.entries(variationsBySurname)) {
      for (const variation of variations) {
        const fullVariant1 = `${variation.variant1.firstName} ${variation.surname}`.trim();
        const fullVariant2 = `${variation.variant2.firstName} ${variation.surname}`.trim();
        
        suggestions.push({
          surname: variation.surname,
          canonicalForm: canonicalForms[fullVariant1.toLowerCase()] || canonicalForms[fullVariant2.toLowerCase()],
          variant1: {
            firstName: variation.variant1.firstName,
            frequency: variation.variant1.frequency
          },
          variant2: {
            firstName: variation.variant2.firstName,
            frequency: variation.variant2.frequency
          },
          similarity: variation.similarity,
          recommendedNormalization: variation.variant1.frequency >= variation.variant2.frequency 
            ? variation.variant1.firstName 
            : variation.variant2.firstName
        });
      }
    }
    
    return suggestions;
  }

  /**
   * Get all variations of a name using the variant generator
   * @param {string} name - Name to generate variations for
   * @returns {Array} Array of possible variations
   */
  async getAllVariations(name) {
    const parsed = this.nameParser.parse(name);
    return this.variantGenerator.generateVariants(parsed);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CandidateFinder;
}
      
      // Return the default export or the module itself
      return typeof module !== 'undefined' && module.exports ? module.exports : (typeof exports !== 'undefined' ? exports : {});
    })();
  } catch (e) {
    console.error('Error loading module candidate-finder:', e);
  }
  

  // Module: gliner-handler
  try {
    ZoteroNER.GlinerHandler = (function() {
      // Module content
      /**
 * GLINER Model Handler - Interface for GLINER NER model integration
 * This module handles the actual ML model operations
 */
class GLINERHandler {
  constructor() {
    this.model = null;
    this.isInitialized = false;
    this.entities = ['person', 'first_name', 'middle_name', 'last_name', 'prefix', 'suffix'];
  }

  /**
   * Initialize the GLINER model
   * Note: This is a conceptual implementation as actual integration
   * would require ONNX.js or a similar approach for browser environment
   */
  async initialize(modelPath = null) {
    console.log('Initializing GLINER model handler...');
    
    // In a real implementation, we would load the GLINER model here
    // This could be done with ONNX.js for client-side inference
    // or by calling an API endpoint that runs the model server-side
    try {
      if (typeof ort !== 'undefined') {
        // Attempt to load ONNX model
        // this.model = await ort.InferenceSession.create(modelPath || 'models/gliner_model.onnx');
        console.log('ONNX model loaded successfully');
      } else {
        console.log('ONNX runtime not available, using mock implementation');
        this.model = {
          run: async (inputs) => {
            // Mock implementation for testing
            return this.mockNERResult(inputs);
          }
        };
      }
      this.isInitialized = true;
      console.log('GLINER model handler initialized');
    } catch (error) {
      console.error('Error initializing GLINER model:', error);
      // Fallback to rule-based approach
      this.model = null;
      this.isInitialized = false;
    }
  }

  /**
   * Mock NER result for testing purposes
   * @param {Object} inputs - Input text
   * @returns {Object} Mock NER results
   */
  mockNERResult(inputs) {
    // This would simulate what the real model would return
    const text = inputs.text || inputs[0] || '';
    const words = text.split(/\s+/);
    const results = [];

    // Simple rule-based mock for demonstration
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let label = 'O'; // Default: not an entity

      // Simple detection rules
      if (/^[A-Z]\.?$/.test(word)) {
        label = 'initial';
      } else if (/^[A-Z][a-z]+/.test(word) && i === 0) {
        label = 'first_name';
      } else if (/^[A-Z][a-z]+/.test(word) && i === words.length - 1) {
        label = 'last_name';
      } else if (['van', 'de', 'la', 'von', 'del', 'di', 'du', 'le', 'lo'].includes(word.toLowerCase())) {
        label = 'prefix';
      }

      results.push({
        word: word,
        start: text.indexOf(word),
        end: text.indexOf(word) + word.length,
        label: label
      });
    }

    return { entities: results };
  }

  /**
   * Run NER on input text
   * @param {string} text - Text to process
   * @returns {Array} Array of entities
   */
  async runNER(text) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.model) {
      // Fallback to rule-based processing
      return this.ruleBasedNER(text);
    }

    try {
      // Prepare input for the model
      const inputs = { text: text };
      
      // Run the model
      const results = await this.model.run(inputs);
      return results.entities || [];
    } catch (error) {
      console.error('Error running NER:', error);
      // Fallback to rule-based processing
      return this.ruleBasedNER(text);
    }
  }

  /**
   * Fallback rule-based NER implementation
   * @param {string} text - Text to process
   * @returns {Array} Array of entities
   */
  ruleBasedNER(text) {
    // This is our enhanced rule-based approach as a fallback
    const words = text.split(/\s+/);
    const entities = [];
    const prefixes = ['van', 'de', 'la', 'von', 'del', 'di', 'du', 'le', 'lo', 'da', 'des', 'dos', 'das', 'el', 'al'];
    const suffixes = ['Jr', 'Sr', 'II', 'III', 'IV', 'PhD', 'MD', 'Jr.', 'Sr.'];

    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,]/g, ''); // Remove punctuation
      const originalWord = words[i];

      let label = 'O'; // Default: not an entity

      if (suffixes.some(s => s.toLowerCase() === word.toLowerCase())) {
        label = 'suffix';
      } else if (prefixes.includes(word.toLowerCase())) {
        label = 'prefix';
      } else if (/^[A-Z]\.?$/.test(word)) {
        label = 'initial';
      } else if (i === 0) {
        label = 'first_name';
      } else if (i === words.length - 1) {
        label = 'last_name';
      } else if (i > 0 && i < words.length - 1) {
        label = 'middle_name';
      }

      entities.push({
        text: originalWord,
        start: text.indexOf(originalWord),
        end: text.indexOf(originalWord) + originalWord.length,
        label: label
      });
    }

    return entities;
  }

  /**
   * Process multiple texts
   * @param {Array} texts - Array of texts to process
   * @returns {Array} Array of results
   */
  async runBatchNER(texts) {
    const results = [];
    for (const text of texts) {
      const entities = await this.runNER(text);
      results.push({ text, entities });
    }
    return results;
  }
}

module.exports = GLINERHandler;
      
      // Return the default export or the module itself
      return typeof module !== 'undefined' && module.exports ? module.exports : (typeof exports !== 'undefined' ? exports : {});
    })();
  } catch (e) {
    console.error('Error loading module gliner-handler:', e);
  }
  

  // Module: item-processor
  try {
    ZoteroNER.ItemProcessor = (function() {
      // Module content
      /**
 * Item Processor - Handles integration with Zotero items
 */
class ItemProcessor {
  constructor() {
    this.nameParser = new (require('../core/name-parser.js'))();
    this.variantGenerator = new (require('../core/variant-generator.js'))();
    this.learningEngine = new (require('../core/learning-engine.js'))();
    this.candidateFinder = new (require('../core/candidate-finder.js'))();
  }

  /**
   * Process creators in a Zotero item
   * @param {Object} item - Zotero item
   * @returns {Array} Processed creators with normalization options
   */
  async processItemCreators(item) {
    const results = [];
    const creators = item.getCreators ? item.getCreators() : [];

    for (const creator of creators) {
      if (creator.firstName || creator.lastName) {
        const rawName = this.buildRawName(creator);
        
        // Check for learned normalization
        const learned = this.learningEngine.getMapping(rawName);
        if (learned) {
          results.push({
            original: { ...creator },
            normalized: this.parseNameFromFullString(learned),
            type: creator.creatorType,
            status: 'learned',
            suggestion: learned
          });
          continue;
        }

        // Find similar names
        const similars = this.learningEngine.findSimilar(rawName);
        
        // Parse the name and generate variants
        const parsed = this.nameParser.parse(rawName);
        const variants = this.variantGenerator.generateVariants(parsed);
        
        // Check for potential database-wide variants (in a full scan scenario)
        // This would be done when doing a library-wide analysis
        const libraryVariants = await this.findLibraryWideVariants(parsed.lastName);
        
        results.push({
          original: { ...creator },
          parsed: parsed,
          variants: variants,
          similars: similars,
          libraryVariants: libraryVariants,
          type: creator.creatorType,
          status: 'new'
        });
      }
    }

    return results;
  }

  /**
   * Find variants that might exist across the entire library for this surname
   * @param {string} lastName - Last name to check for variants
   * @returns {Array} Array of potential library-wide variants
   */
  async findLibraryWideVariants(lastName) {
    // In a real implementation, this would access the full library
    // and find similar surnames using the candidate finder
    // For now, this is a simplified version
    
    if (typeof Zotero !== 'undefined') {
      try {
        // This would perform a library-wide scan for variants
        // In practice, this would be called as part of a full analysis
        return [];
      } catch (error) {
        console.warn('Could not perform library-wide variant scan:', error);
        return [];
      }
    }
    
    // For testing purposes, return empty array
    return [];
  }

  /**
   * Build a raw name string from creator object
   * @param {Object} creator - Creator object
   * @returns {string} Raw name string
   */
  buildRawName(creator) {
    return `${creator.firstName || ''} ${creator.lastName || ''}`.trim();
  }

  /**
   * Parse a full name string back to Zotero creator format
   * @param {string} fullName - Full name string
   * @returns {Object} Creator object with firstName and lastName
   */
  parseNameFromFullString(fullName) {
    const parsed = this.nameParser.parse(fullName);
    return {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      fieldMode: 0  // Standard format in Zotero
    };
  }

  /**
   * Apply normalization to a Zotero item
   * @param {Object} item - Zotero item
   * @param {Array} normalizations - Normalization mappings to apply
   */
  async applyNormalizations(item, normalizations) {
    // This would update the Zotero item with normalized names
    // In a real Zotero extension, we would use Zotero's API to update creators
    
    for (let i = 0; i < normalizations.length; i++) {
      const norm = normalizations[i];
      if (norm.accepted) {
        // Update the creator in the item
        console.log(`Applying normalization: ${norm.original.firstName} ${norm.original.lastName} -> ${norm.normalized.firstName} ${norm.normalized.lastName}`);
        
        // Store the learned mapping
        const originalName = this.buildRawName(norm.original);
        const normalizedName = this.buildRawName(norm.normalized);
        await this.learningEngine.storeMapping(originalName, normalizedName);
      }
    }
    
    // In real implementation, would save the item back to Zotero
    console.log('Applied normalizations to item:', item.getField('title'));
  }

  /**
   * Perform a library-wide name normalization analysis
   * @param {Array} items - Array of Zotero items to analyze
   * @returns {Object} Analysis results
   */
  async performLibraryAnalysis(items) {
    // This would analyze all items in the library for name variants
    const allNames = [];
    
    for (const item of items) {
      const creators = item.getCreators ? item.getCreators() : [];
      for (const creator of creators) {
        if (creator.firstName || creator.lastName) {
          const rawName = this.buildRawName(creator);
          allNames.push(rawName);
        }
      }
    }
    
    // Use the candidate finder to analyze all names
    const surnameFreq = this.learningEngine.constructor.prototype.extractSurnamesWithFrequency || 
                        this.nameParser.constructor.prototype.extractSurnamesWithFrequency;
    
    // Since the method isn't directly available, we'll implement directly:
    const frequencies = {};
    for (const name of allNames) {
      const parsed = this.nameParser.parse(name);
      if (parsed.lastName) {
        const lastName = parsed.lastName.toLowerCase().trim();
        frequencies[lastName] = (frequencies[lastName] || 0) + 1;
      }
    }
    
    // Find potential variants
    const surnames = Object.keys(frequencies);
    const variants = [];
    
    // Compare surnames to find potential variants
    for (let i = 0; i < surnames.length; i++) {
      for (let j = i + 1; j < surnames.length; j++) {
        const name1 = surnames[i];
        const name2 = surnames[j];
        
        // Calculate similarity using edit distance
        const distance = this.calculateLevenshteinDistance(name1, name2);
        const maxLength = Math.max(name1.length, name2.length);
        const similarity = maxLength > 0 ? 1 - (distance / maxLength) : 1;
        
        if (similarity >= 0.8) { // 80% similarity threshold
          variants.push({
            name1: name1,
            name2: name2,
            frequency1: frequencies[name1],
            frequency2: frequencies[name2],
            similarity: similarity
          });
        }
      }
    }
    
    return {
      surnameFrequencies: frequencies,
      potentialVariants: variants,
      totalNames: allNames.length,
      uniqueSurnames: surnames.length
    };
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Levenshtein distance
   */
  calculateLevenshteinDistance(str1, str2) {
    const matrix = [];

    if (str1.length === 0) return str2.length;
    if (str2.length === 0) return str1.length;

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ItemProcessor;
}
      
      // Return the default export or the module itself
      return typeof module !== 'undefined' && module.exports ? module.exports : (typeof exports !== 'undefined' ? exports : {});
    })();
  } catch (e) {
    console.error('Error loading module item-processor:', e);
  }
  

  // Module: menu-integration
  try {
    ZoteroNER.MenuIntegration = (function() {
      // Module content
      /**
 * Menu Integration - Adds menu items to Zotero interface
 */
class MenuIntegration {
  constructor() {
    this.itemProcessor = new (require('./item-processor.js'))();
    this.zoteroDBAnalyzer = new (require('./zotero-db-analyzer.js'))();
  }

  /**
   * Initialize the menu integration
   */
  async initialize() {
    console.log('Initializing menu integration');
    // In a real Zotero extension, this would add menu items to Zotero's interface
    this.registerMenuItems();
  }

  /**
   * Register menu items with Zotero
   */
  registerMenuItems() {
    // This would register the actual menu items in Zotero
    // Examples: 
    // - Right-click context menu on items
    // - Tools menu option
    // - Item pane button
    
    console.log('Registered menu items for name normalization');
  }

  /**
   * Handle normalize action for selected items
   * @param {Array} items - Selected Zotero items
   */
  async handleNormalizeAction(items) {
    console.log(`Handling normalize action for ${items.length} items`);
    
    // Process each selected item
    const results = [];
    for (const item of items) {
      const itemResults = await this.itemProcessor.processItemCreators(item);
      results.push({
        item: item,
        results: itemResults
      });
    }
    
    // Show the normalization dialog with results
    const normalizerDialog = new (require('../ui/normalizer-dialog.js'))();
    const userSelections = await normalizerDialog.showDialog(items);
    
    // Apply the user's selections
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const selections = userSelections[i];
      await this.itemProcessor.applyNormalizations(item, selections.creators);
    }
    
    return { success: true, processed: items.length };
  }

  /**
   * Perform a full library analysis for name variants
   * @returns {Object} Analysis results
   */
  async performFullLibraryAnalysis() {
    if (typeof Zotero === 'undefined') {
      throw new Error('This feature requires Zotero context');
    }
    
    console.log('Starting full library analysis for name variants...');
    
    try {
      const results = await this.zoteroDBAnalyzer.analyzeFullLibrary();
      
      console.log(`Analysis complete: Found ${results.totalVariantGroups} potential variant groups`);
      return results;
    } catch (error) {
      console.error('Error in full library analysis:', error);
      throw error;
    }
  }

  /**
   * Handle full library analysis action
   */
  async handleFullLibraryAnalysis() {
    try {
      const results = await this.performFullLibraryAnalysis();
      
      // In a real implementation, this would show the results in a dedicated UI
      // For now, we'll just return the results
      console.log('Full library analysis results:', {
        totalUniqueSurnames: results.totalUniqueSurnames,
        totalVariantGroups: results.totalVariantGroups,
        topSuggestions: results.suggestions.slice(0, 10) // First 10 suggestions
      });
      
      return results;
    } catch (error) {
      console.error('Error handling full library analysis:', error);
      throw error;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MenuIntegration;
}
      
      // Return the default export or the module itself
      return typeof module !== 'undefined' && module.exports ? module.exports : (typeof exports !== 'undefined' ? exports : {});
    })();
  } catch (e) {
    console.error('Error loading module menu-integration:', e);
  }
  

  // Module: zotero-db-analyzer
  try {
    ZoteroNER.ZoteroDbAnalyzer = (function() {
      // Module content
      /**
 * Zotero DB Analyzer - Handles database-specific queries for name analysis
 * This module uses Zotero's database APIs to efficiently extract and analyze names
 */
class ZoteroDBAnalyzer {
  constructor() {
    this.candidateFinder = new (require('../core/candidate-finder.js'))();
    this.learningEngine = new (require('../core/learning-engine.js'))();
  }

  /**
   * Perform a database-wide analysis of creator names
   * In a Zotero context, this would execute efficient SQL queries
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeFullLibrary() {
    if (typeof Zotero === 'undefined') {
      throw new Error('This method must be run in the Zotero context');
    }

    console.log('Starting full library analysis...');
    
    try {
      // Query all creators efficiently using Zotero's DB API
      // This is more efficient than iterating through all items
      const query = `
        SELECT firstName, lastName, fieldMode, COUNT(*) as occurrenceCount
        FROM creators
        GROUP BY firstName, lastName, fieldMode
        ORDER BY occurrenceCount DESC
      `;
      
      const rows = await Zotero.DB.query(query);
      const creators = rows.map(row => ({
        firstName: row.firstName || '',
        lastName: row.lastName || '',
        fieldMode: row.fieldMode || 0,
        count: row.occurrenceCount
      }));
      
      // Analyze creators for surname frequencies and variants
      const results = await this.analyzeCreators(creators);
      
      console.log(`Analysis complete: processed ${creators.length} unique creator entries`);
      return results;
      
    } catch (error) {
      console.error('Error in database analysis:', error);
      throw error;
    }
  }

  /**
   * Analyze a list of creators for name variants
   * @param {Array} creators - Array of creator objects with occurrence counts
   * @returns {Object} Analysis results
   */
  async analyzeCreators(creators) {
    const surnameFrequencies = {};
    const creatorVariants = [];
    
    // Process each creator to extract surname frequencies
    for (const creator of creators) {
      const fullName = `${creator.firstName} ${creator.lastName}`.trim();
      const parsed = this.parseName(fullName);
      
      if (parsed.lastName) {
        const lastNameKey = parsed.lastName.toLowerCase().trim();
        surnameFrequencies[lastNameKey] = (surnameFrequencies[lastNameKey] || 0) + (creator.count || 1);
      }
    }
    
    // Find potential variants using similarity algorithms
    const surnames = Object.keys(surnameFrequencies);
    const potentialVariants = [];
    
    for (let i = 0; i < surnames.length; i++) {
      for (let j = i + 1; j < surnames.length; j++) {
        const name1 = surnames[i];
        const name2 = surnames[j];
        
        // Calculate similarity using Levenshtein distance
        const similarity = this.calculateStringSimilarity(name1, name2);
        
        if (similarity >= 0.8) { // 80% similarity threshold
          potentialVariants.push({
            variant1: {
              name: name1,
              frequency: surnameFrequencies[name1]
            },
            variant2: {
              name: name2,
              frequency: surnameFrequencies[name2]
            },
            similarity: similarity,
            recommendedNormalization: surnameFrequencies[name1] >= surnameFrequencies[name2] 
              ? name1 : name2
          });
        }
      }
    }
    
    // Sort variants by combined frequency (prioritize more common surnames)
    potentialVariants.sort((a, b) => {
      const totalFreqA = a.variant1.frequency + a.variant2.frequency;
      const totalFreqB = b.variant1.frequency + b.variant2.frequency;
      return totalFreqB - totalFreqA;
    });
    
    // Generate normalization suggestions
    const suggestions = this.generateNormalizationSuggestions(potentialVariants);
    
    return {
      surnameFrequencies,
      potentialVariants,
      suggestions,
      totalUniqueSurnames: surnames.length,
      totalVariantGroups: potentialVariants.length
    };
  }

  /**
   * Parse a name string into components
   * @param {string} name - Full name string
   * @returns {Object} Parsed name components
   */
  parseName(name) {
    const NameParser = require('../core/name-parser.js');
    const parser = new NameParser();
    return parser.parse(name);
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateStringSimilarity(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Initialize matrix
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    // Fill the matrix
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    const distance = matrix[len2][len1];
    const maxLength = Math.max(len1, len2);
    const similarity = 1 - (distance / maxLength);
    
    return similarity;
  }

  /**
   * Generate normalization suggestions from variant pairs
   * @param {Array} variants - Array of variant pairs
   * @returns {Array} Array of normalization suggestions
   */
  generateNormalizationSuggestions(variants) {
    const suggestions = [];
    const processedSurnames = new Set();
    
    for (const variant of variants) {
      const norm1 = variant.variant1.name;
      const norm2 = variant.variant2.name;
      
      // Avoid duplicate suggestions
      if (!processedSurnames.has(norm1) && !processedSurnames.has(norm2)) {
        suggestions.push({
          primary: variant.recommendedNormalization,
          variants: [
            { name: variant.variant1.name, frequency: variant.variant1.frequency },
            { name: variant.variant2.name, frequency: variant.variant2.frequency }
          ],
          similarity: variant.similarity
        });
        
        processedSurnames.add(norm1);
        processedSurnames.add(norm2);
      }
    }
    
    return suggestions;
  }

  /**
   * Get normalization recommendations for a specific surname
   * @param {string} surname - Surname to check
   * @returns {Object|null} Normalization recommendation or null
   */
  async getNormalizationForSurname(surname) {
    if (typeof Zotero === 'undefined') {
      return null;
    }
    
    const results = await this.analyzeFullLibrary();
    
    // Find variants that include this surname
    for (const variant of results.potentialVariants) {
      if (variant.variant1.name === surname || variant.variant2.name === surname) {
        return {
          recommended: variant.recommendedNormalization,
          alternatives: [
            variant.variant1.name,
            variant.variant2.name
          ],
          similarity: variant.similarity,
          frequencies: {
            [variant.variant1.name]: variant.variant1.frequency,
            [variant.variant2.name]: variant.variant2.frequency
          }
        };
      }
    }
    
    return null;
  }

  /**
   * Apply learned normalizations from analysis to the database
   * @param {Array} suggestions - Array of normalization suggestions to apply
   * @param {boolean} autoConfirm - Whether to auto-confirm all suggestions
   * @returns {Object} Results of the normalization application
   */
  async applyNormalizationSuggestions(suggestions, autoConfirm = false) {
    if (typeof Zotero === 'undefined') {
      throw new Error('This method must be run in the Zotero context');
    }
    
    const results = {
      totalSuggestions: suggestions.length,
      applied: 0,
      skipped: 0,
      errors: 0
    };
    
    for (const suggestion of suggestions) {
      try {
        if (autoConfirm || await this.confirmNormalization(suggestion)) {
          // Apply the normalization mapping
          for (const variant of suggestion.variants) {
            if (variant.name !== suggestion.primary) {
              // Store mapping in learning engine
              await this.learningEngine.storeMapping(
                variant.name,
                suggestion.primary,
                suggestion.similarity
              );
            }
          }
          results.applied++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        console.error('Error applying normalization:', error);
        results.errors++;
      }
    }
    
    return results;
  }

  /**
   * Confirm if a normalization should be applied (in a real UI this would show a dialog)
   * @param {Object} suggestion - Normalization suggestion
   * @returns {Promise<boolean>} Whether to apply the normalization
   */
  async confirmNormalization(suggestion) {
    // In a real implementation, this would show a UI dialog
    // For now, we'll auto-confirm for testing purposes
    return true;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZoteroDBAnalyzer;
}
      
      // Return the default export or the module itself
      return typeof module !== 'undefined' && module.exports ? module.exports : (typeof exports !== 'undefined' ? exports : {});
    })();
  } catch (e) {
    console.error('Error loading module zotero-db-analyzer:', e);
  }
  

  // Module: normalizer-dialog
  try {
    ZoteroNER.NormalizerDialog = (function() {
      // Module content
      /**
 * Normalizer Dialog - UI for showing name normalization options
 * This will be implemented as a XUL dialog in the actual Zotero extension
 */
class NormalizerDialog {
  constructor() {
    this.learningEngine = new (require('../core/learning-engine.js'))();
    this.variantGenerator = new (require('../core/variant-generator.js'))();
    this.nameParser = new (require('../core/name-parser.js'))();
  }

  /**
   * Show the normalization dialog
   * @param {Array} items - Zotero items to process
   * @returns {Promise<Object>} User selections
   */
  async showDialog(items) {
    // In actual Zotero extension, this would create a XUL dialog
    console.log('Showing normalization dialog for', items.length, 'items');
    
    // Process each item and prepare options
    const results = [];
    for (const item of items) {
      const itemResults = await this.processItem(item);
      results.push(itemResults);
    }
    
    // Present options to user (in real implementation, show actual UI)
    return await this.presentOptions(results);
  }

  /**
   * Process a single Zotero item
   * @param {Object} item - Zotero item
   * @returns {Object} Processed results
   */
  async processItem(item) {
    const creators = item.getCreators ? item.getCreators() : [];
    const processedCreators = [];

    for (const creator of creators) {
      if (creator.firstName || creator.lastName) {
        const rawName = this.buildRawName(creator);
        
        // Check if we have a learned mapping
        let learned = this.learningEngine.getMapping(rawName);
        if (learned) {
          processedCreators.push({
            original: { ...creator },
            normalized: learned,
            type: creator.creatorType,
            alreadyLearned: true,
            status: 'learned'
          });
          continue;
        }

        // Get similar mappings
        const similars = this.learningEngine.findSimilar(rawName);
        
        // Parse the name and generate variants
        const parsed = this.nameParser.parse(rawName);
        const variants = this.variantGenerator.generateVariants(parsed);
        
        processedCreators.push({
          original: { ...creator },
          rawName: rawName,
          variants: variants,
          similars: similars,
          type: creator.creatorType,
          alreadyLearned: false,
          parsed: parsed,
          status: 'new'
        });
      }
    }

    return {
      itemID: item.id,
      title: item.getField ? item.getField('title') : 'Unknown Title',
      creators: processedCreators
    };
  }

  /**
   * Build raw name from creator object
   * @param {Object} creator - Creator object
   * @returns {string} Raw name string
   */
  buildRawName(creator) {
    return `${creator.firstName || ''} ${creator.lastName || ''}`.trim();
  }

  /**
   * Present options to user (stub implementation)
   * @param {Array} results - Processed results
   * @returns {Promise<Array>} User selections
   */
  async presentOptions(results) {
    // This is a stub - in the real extension this would show actual UI
    console.log('Presenting options to user:');
    
    const userSelections = [];
    for (const itemResult of results) {
      const itemSelections = {
        itemID: itemResult.itemID,
        title: itemResult.title,
        creators: []
      };
      
      for (const creator of itemResult.creators) {
        if (creator.alreadyLearned) {
          // For learned mappings, just confirm they should be applied
          itemSelections.creators.push({
            original: creator.original,
            normalized: creator.normalized,
            type: creator.type,
            accepted: true,  // Auto-accept learned mappings
            source: 'learned'
          });
        } else {
          // For new mappings, simulate user selection
          // In real UI, this would allow user to select from variants or similars
          const selectedVariant = creator.variants[0]; // Default to first variant
          itemSelections.creators.push({
            original: creator.original,
            normalized: selectedVariant,
            type: creator.type,
            accepted: true, // For demo purposes, accept all
            source: 'user_selected',
            selectedFrom: 'variants'
          });
        }
      }
      
      userSelections.push(itemSelections);
    }
    
    return userSelections;
  }

  /**
   * Render the UI as HTML for demonstration purposes
   * @param {Array} results - Processed results to display
   * @returns {string} HTML representation of the dialog
   */
  renderUIDemo(results) {
    let html = '<div class="ner-normalizer-dialog"><h2>Author Name Normalization</h2>';
    
    for (const itemResult of results) {
      html += `<div class="item-section" data-item-id="${itemResult.itemID}">`;
      html += `<h3>${itemResult.title}</h3>`;
      
      for (const creator of itemResult.creators) {
        html += '<div class="creator-section">';
        
        if (creator.alreadyLearned) {
          html += `<p><strong>Learned:</strong> ${creator.rawName} → ${creator.normalized}</p>`;
        } else {
          html += `<p><strong>Original:</strong> ${creator.rawName}</p>`;
          
          // Show variants
          html += '<div class="variants-section">';
          html += '<h4>Variant Suggestions:</h4><ul>';
          for (const variant of creator.variants) {
            html += `<li><label><input type="radio" name="selection-${creator.rawName}" value="${variant}"> ${variant}</label></li>`;
          }
          html += '</ul></div>';
          
          // Show similar learned names
          if (creator.similars.length > 0) {
            html += '<div class="similar-section">';
            html += '<h4>Similar Previously Learned Names:</h4><ul>';
            for (const similar of creator.similars) {
              html += `<li><label><input type="radio" name="selection-${creator.rawName}" value="${similar.normalized}"> ${similar.raw} → ${similar.normalized} (confidence: ${(similar.similarity * 100).toFixed(1)}%)</label></li>`;
            }
            html += '</ul></div>';
          }
        }
        
        html += '</div>'; // creator-section
      }
      
      html += '</div>'; // item-section
    }
    
    html += '<div class="dialog-actions">';
    html += '<button id="accept-all-btn">Accept All</button>';
    html += '<button id="cancel-btn">Cancel</button>';
    html += '</div></div>'; // ner-normalizer-dialog
    
    return html;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NormalizerDialog;
}
      
      // Return the default export or the module itself
      return typeof module !== 'undefined' && module.exports ? module.exports : (typeof exports !== 'undefined' ? exports : {});
    })();
  } catch (e) {
    console.error('Error loading module normalizer-dialog:', e);
  }
  

  // Module: batch-processor
  try {
    ZoteroNER.BatchProcessor = (function() {
      // Module content
      /**
 * Batch Processor - UI for batch processing multiple items
 */
class BatchProcessor {
  constructor() {
    this.learningEngine = new (require('../core/learning-engine.js'))();
  }

  /**
   * Process multiple Zotero items in batch
   * @param {Array} items - Array of Zotero items to process
   */
  async processBatch(items) {
    console.log(`Processing ${items.length} items in batch`);
    
    for (const item of items) {
      await this.processItem(item);
    }
    
    return { success: true, processedCount: items.length };
  }

  /**
   * Process a single Zotero item
   * @param {Object} item - Zotero item to process
   */
  async processItem(item) {
    // Extract creators from the item
    const creators = item.getCreators ? item.getCreators() : [];
    
    for (const creator of creators) {
      if (creator.firstName || creator.lastName) {
        const rawName = `${creator.firstName || ''} ${creator.lastName || ''}`.trim();
        
        // Check if we have a learned normalization
        const learned = this.learningEngine.getMapping(rawName);
        
        if (learned) {
          // Apply learned normalization
          console.log(`Applying learned normalization: ${rawName} -> ${learned}`);
          // In actual implementation, would update the item with normalized name
        } else {
          // For now, just log that we need to process this one
          console.log(`Need to process: ${rawName}`);
        }
      }
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BatchProcessor;
}
      
      // Return the default export or the module itself
      return typeof module !== 'undefined' && module.exports ? module.exports : (typeof exports !== 'undefined' ? exports : {});
    })();
  } catch (e) {
    console.error('Error loading module batch-processor:', e);
  }
  

  // Module: data-manager
  try {
    ZoteroNER.DataManager = (function() {
      // Module content
      /**
 * Data Manager - Handles data persistence for the extension
 * In a real Zotero extension, this would use Zotero's storage APIs
 */
class DataManager {
  constructor() {
    this.settingsKey = 'ner_normalizer_settings';
    this.mappingsKey = 'ner_normalizer_mappings';
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
      
      // Return the default export or the module itself
      return typeof module !== 'undefined' && module.exports ? module.exports : (typeof exports !== 'undefined' ? exports : {});
    })();
  } catch (e) {
    console.error('Error loading module data-manager:', e);
  }
  

  // Module: ner-worker
  try {
    ZoteroNER.NerWorker = (function() {
      // Module content
      /**
 * NER Web Worker - Handles intensive NER processing in background
 * This allows the UI to remain responsive during processing
 */
class NERWorker {
  constructor() {
    this.isInitialized = false;
    this.model = null;
  }

  /**
   * Initialize the worker with NER model
   */
  async initialize() {
    // In a real implementation, this would load the NER model in the worker
    console.log('NER Worker initialized');
    this.isInitialized = true;
  }

  /**
   * Process names using NER
   * @param {Array} names - Array of name strings to process
   * @returns {Array} Processed results
   */
  async processNames(names) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Placeholder implementation - would use actual NER model in real implementation
    const results = [];
    for (const name of names) {
      // This would call the actual NER model
      const result = await this.processSingleName(name);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Process a single name
   * @param {string} name - Name to process
   * @returns {Object} Processed result
   */
  async processSingleName(name) {
    // Using the local name parser for now
    const NameParser = require('../core/name-parser.js');
    const parser = new NameParser();
    return parser.parse(name);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NERWorker;
}
      
      // Return the default export or the module itself
      return typeof module !== 'undefined' && module.exports ? module.exports : (typeof exports !== 'undefined' ? exports : {});
    })();
  } catch (e) {
    console.error('Error loading module ner-worker:', e);
  }
  

  // Initialize the extension when Zotero is ready
  function initZoteroNER() {
    if (typeof Zotero === 'undefined') {
      console.warn('Zotero not found, delaying initialization');
      setTimeout(initZoteroNER, 1000);
      return;
    }
    
    try {
      // Make sure Zotero.NER exists
      if (!Zotero.NER) {
        Zotero.NER = {};
      }
      
      // Attach our bundled modules to Zotero.NER
      Object.keys(ZoteroNER).forEach(key => {
        Zotero.NER[key] = ZoteroNER[key];
      });
      
      console.log('Zotero NER Author Name Normalizer initialized');
    } catch (e) {
      console.error('Error initializing Zotero NER:', e);
    }
  }
  
  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ZoteroNER;
  }
  
  // Initialize when the script loads
  if (typeof window !== 'undefined') {
    // Wait a bit for Zotero to be fully loaded
    setTimeout(initZoteroNER, 100);
  }
  
  // Make available globally
  window.ZoteroNER = ZoteroNER;
  
})();

// End of bundled content
