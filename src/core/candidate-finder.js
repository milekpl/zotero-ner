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
        { firstName: 'Jerry', lastName: 'Fodor', creatorType: 'author' },
        { firstName: 'J.', lastName: 'Fodor', creatorType: 'author' },
        { firstName: 'Jerry', lastName: 'Fodor', creatorType: 'author' },
        { firstName: 'Jerry A.', lastName: 'Fodor', creatorType: 'author' },
        { firstName: 'J.A.', lastName: 'Fodor', creatorType: 'author' },
        { firstName: 'Eva', lastName: 'van Dijk', creatorType: 'author' },
        { firstName: 'E.', lastName: 'van Dijk', creatorType: 'author' },
        { firstName: 'John', lastName: 'Smith', creatorType: 'author' },
        { firstName: 'J.', lastName: 'Smith', creatorType: 'author' },
        { firstName: 'Johnny', lastName: 'Smith', creatorType: 'author' },
        { firstName: 'J.B.', lastName: 'Smith', creatorType: 'author' },
        { firstName: 'John B.', lastName: 'Smith', creatorType: 'author' }
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