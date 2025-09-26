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