/**
 * Candidate Finder - Finds name variants across the entire Zotero library
 * Focuses on first name/initial variations for the same surnames
 */
class CandidateFinder {
  // Constants for name matching
  static get FIRST_NAME_SIMILARITY_THRESHOLD() { return 0.6; }

  constructor() {
    // Lazy initialization - dependencies are loaded on first access
    this._learningEngine = null;
    this._nameParser = null;
    this._variantGenerator = null;
  }

  /**
   * Lazy getter for learning engine
   */
  get learningEngine() {
    if (!this._learningEngine) {
      const LearningEngine = require('./learning-engine.js');
      this._learningEngine = new LearningEngine();
    }
    return this._learningEngine;
  }

  /**
   * Lazy getter for name parser
   */
  get nameParser() {
    if (!this._nameParser) {
      const NameParser = require('./name-parser.js');
      this._nameParser = new NameParser();
    }
    return this._nameParser;
  }

  /**
   * Lazy getter for variant generator
   */
  get variantGenerator() {
    if (!this._variantGenerator) {
      const VariantGenerator = require('./variant-generator.js');
      this._variantGenerator = new VariantGenerator();
    }
    return this._variantGenerator;
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
   * Group creators by normalized first name + surname
   * This ensures only the SAME author (same first name variant) is grouped together
   * Different authors with the same surname (e.g., "Alex Martin" vs "Andrea Martin") are NOT grouped
   * Initial-only names are grouped with full names that match their first letter
   * @param {Array} creators - Array of creator objects
   * @returns {Object} Object with group keys and creator arrays as values
   */
  groupCreatorsBySurname(creators) {
    const grouped = {};
    const initialGroups = {}; // Track initial-only names separately

    for (const creator of creators) {
      const parsed = this.nameParser.parse(`${creator.firstName || ''} ${creator.lastName || ''}`.trim());
      if (!parsed.lastName) {
        continue;
      }

      const firstName = (creator.firstName || '').trim();
      const normalizedFirst = this.normalizeFirstNameForGrouping(firstName);
      const lastNameKey = parsed.lastName.toLowerCase().trim();

      if (normalizedFirst.startsWith('init:')) {
        // Initial-only: track separately by surname
        if (!initialGroups[lastNameKey]) {
          initialGroups[lastNameKey] = [];
        }
        initialGroups[lastNameKey].push({ creator, normalizedFirst });
      } else {
        // Full name: group by normalized first name + surname
        const groupKey = `${normalizedFirst}|${lastNameKey}`;
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(creator);
      }
    }

    // Second pass: assign initial-only names to matching full name groups
    for (const [surname, initials] of Object.entries(initialGroups)) {
      for (const { creator, normalizedFirst } of initials) {
        // Get the first letter of the initial
        const firstLetter = normalizedFirst.slice(5).charAt(0).toLowerCase();

        // Look for a full name group with the same first letter
        const matchingKey = Object.keys(grouped).find(key => {
          const [normFirst] = key.split('|');
          return normFirst.startsWith(firstLetter) && key.endsWith(`|${surname}`);
        });

        if (matchingKey) {
          // Add to the matching full name group
          grouped[matchingKey].push(creator);
        } else {
          // No matching full name found, create a separate group
          const groupKey = `${normalizedFirst}|${surname}`;
          if (!grouped[groupKey]) {
            grouped[groupKey] = [];
          }
          grouped[groupKey].push(creator);
        }
      }
    }

    return grouped;
  }

  /**
   * Normalize first name for grouping purposes
   * Handles initials and uses name variants from COMMON_GIVEN_NAME_EQUIVALENTS
   * @param {string} firstName - The first name to normalize
   * @returns {string} Normalized first name for grouping
   */
  normalizeFirstNameForGrouping(firstName) {
    if (!firstName || !firstName.trim()) {
      return 'unknown';  // Handle cases with no first name
    }

    const cleaned = firstName.toLowerCase().trim();
    const tokens = cleaned.split(/[\s.-]+/).filter(Boolean);
    const baseWord = tokens[0] || '';

    // First, check if it's a known name or variant (before checking for initials)
    // COMMON_GIVEN_NAME_EQUIVALENTS is {CanonicalName: [Variants]}
    try {
      const { COMMON_GIVEN_NAME_EQUIVALENTS } = require('../config/name-constants.js');
      for (const [canonical, variants] of Object.entries(COMMON_GIVEN_NAME_EQUIVALENTS)) {
        if (canonical.toLowerCase() === baseWord ||
            (variants && variants.some(v => v.toLowerCase() === baseWord))) {
          return canonical.toLowerCase();
        }
      }
    } catch (e) {
      // If constants can't be loaded, continue with basic normalization
    }

    // Check if this looks like an initial-only name:
    // - Single token that is short (1-3 letters) AND not a known name variant
    // - OR multiple tokens that are all single letters
    const allTokensAreInitials = tokens.length > 0 && tokens.every(t => t.length === 1);

    if (tokens.length === 1 && tokens[0].length <= 3) {
      // Single short token like "J", "J.", "A" - treat as initial
      return `init:${tokens[0]}`;
    } else if (allTokensAreInitials) {
      // Multiple single-letter tokens like "J A", "J.A.B." - treat as initial sequence
      return `init:${cleaned.replace(/\./g, '')}`;
    }

    // If no match in variants and not an initial, use the base word as normalized form
    return baseWord || cleaned;
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
    // Use grouping optimization: only compare names with same initial + similar length
    const firstNames = Object.keys(firstNameVariants);
    const variantGroups = [];

    // Helper function to get grouping key (first letter + length bucket)
    const getGroupingKey = (name) => {
      const len = name.length;
      const lengthBucket = len <= 3 ? 'tiny' : len <= 5 ? 'short' : len <= 8 ? 'medium' : 'long';
      const initial = name.charAt(0).toLowerCase();
      return `${initial}_${lengthBucket}`;
    };

    // Group first names by initial+length
    const byGroup = {};
    for (const name of firstNames) {
      const key = getGroupingKey(name);
      if (!byGroup[key]) byGroup[key] = [];
      byGroup[key].push(name);
    }

    // Import optimized string distance function
    const { normalizedLevenshtein } = require('../utils/string-distance');

    // Only compare names within same group (optimization: O(n²) → O(n² * p))
    for (const key in byGroup) {
      const group = byGroup[key];
      // Skip if less than 2 names in group
      if (group.length < 2) continue;

      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const name1 = group[i];
          const name2 = group[j];

          // Quick length check before expensive calculation
          if (Math.abs(name1.length - name2.length) > 3) continue;

          // Use optimized normalized Levenshtein with threshold for early termination
          const similarity = normalizedLevenshtein(name1, name2, CandidateFinder.FIRST_NAME_SIMILARITY_THRESHOLD);

          // Higher threshold for first name/initial similarity since they should be more similar
          if (similarity >= CandidateFinder.FIRST_NAME_SIMILARITY_THRESHOLD) {
            const maxLength = Math.max(name1.length, name2.length);
            const distance = Math.floor(maxLength * (1 - similarity));

            variantGroups.push({
              surname: creators[0].lastName,
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
        const canonical = variation.variant1.frequency >= variation.variant2.frequency
          ? variation.variant1.firstName
          : variation.variant2.firstName;

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
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
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

    const variantData = await this.findNameVariants(zoteroDB);
    const canonicalForms = this.findCanonicalForms(variantData.variationsBySurname);
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

  /**
   * Find potential name variants from a list of surnames (simple synchronous version)
   * Used for testing and UI purposes
   * @param {Array} surnames - Array of surname strings to check for variants
   * @returns {Array} Array of potential variant pairs with similarity scores
   */
  findPotentialVariants(surnames) {
    const results = [];
    const threshold = CandidateFinder.FIRST_NAME_SIMILARITY_THRESHOLD;

    for (let i = 0; i < surnames.length; i++) {
      for (let j = i + 1; j < surnames.length; j++) {
        const name1 = surnames[i];
        const name2 = surnames[j];

        // Skip if they're identical
        if (name1.toLowerCase() === name2.toLowerCase()) continue;

        // Calculate similarity
        const maxLen = Math.max(name1.length, name2.length);
        if (maxLen === 0) continue;

        const distance = this.calculateLevenshteinDistance(name1, name2);
        const similarity = 1 - (distance / maxLen);

        if (similarity >= threshold) {
          results.push({
            name1: name1,
            name2: name2,
            similarity: similarity,
            isDiacriticOnlyVariant: this.isDiacriticOnlyVariant(name1, name2)
          });
        }
      }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    return results;
  }

  /**
   * Check if two names differ only by diacritics
   * @param {string} name1 - First name
   * @param {string} name2 - Second name
   * @returns {boolean} True if names differ only by diacritics
   */
  isDiacriticOnlyVariant(name1, name2) {
    if (!name1 || !name2) return false;

    const normalize = (str) => {
      return str.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // Remove diacritical marks
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ł/g, 'l');
    };

    return normalize(name1) === normalize(name2);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CandidateFinder;
}
