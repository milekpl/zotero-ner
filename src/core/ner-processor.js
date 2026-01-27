/**
 * NER Processor - Handles name parsing and recognition using rule-based heuristics
 */
class NERProcessor {
  constructor() {
    this.isInitialized = false;
    this.entities = ['PERSON', 'FIRST_NAME', 'MIDDLE_NAME', 'LAST_NAME', 'PREFIX', 'SUFFIX'];
  }

  async initialize() {
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

    return this.fallbackNER(text);
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

    const results = [];
    for (const name of names) {
      const entities = await this.fallbackNER(name);
      results.push({ text: name, entities });
    }
    return results;
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