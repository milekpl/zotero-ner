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