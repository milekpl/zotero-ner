/**
 * Field Variant Generator - Extends VariantGenerator with field-specific patterns
 * Handles variant generation for publisher names, locations, and journal names
 * @module core/field-variant-generator
 */

// Import parent class
const VariantGenerator = require('./variant-generator');

/**
 * Field-specific variant patterns for publisher names
 * @type {Object}
 */
const PUBLISHER_VARIANT_PATTERNS = {
  separatorVariants: [
    { pattern: /\s*;\s*/g, replacement: ' and ' },
    { pattern: /\s*\/\s*/g, replacement: ' and ' },
    { pattern: /\s*-\s*/g, replacement: ' and ' },
    { pattern: /\s*&\s*/g, replacement: ' and ' }
  ],
  abbreviationExpansions: {
    'Co.': 'Company',
    'Co': 'Company',
    'Inc.': 'Incorporated',
    'Inc': 'Incorporated',
    'Ltd.': 'Limited',
    'Ltd': 'Limited',
    'Pub.': 'Publisher',
    'Pub': 'Publisher',
    'Corp.': 'Corporation',
    'Corp': 'Corporation',
    'Press': 'Press',
    'Press.': 'Press',
    'UP': 'University Press',
    'University Press': 'University Press'
  },
  companySuffixes: [
    'Company',
    'Companies',
    'Corporation',
    'Corporations',
    'Incorporated',
    'Inc',
    'Limited',
    'Ltd',
    'Publisher',
    'Publishers',
    'Press',
    'Books',
    'Edition',
    'Verlag',
    'House'
  ]
};

/**
 * Field-specific variant patterns for location names
 * @type {Object}
 */
const LOCATION_VARIANT_PATTERNS = {
  stateAbbreviations: {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
  },
  locationSeparators: [';', '/', ',']
};

/**
 * Field-specific variant patterns for journal names
 * @type {Object}
 */
const JOURNAL_VARIANT_PATTERNS = {
  journalAbbreviations: {
    'J.': 'Journal',
    'J': 'Journal',
    'Trans.': 'Transactions',
    'Trans': 'Transactions',
    'Proc.': 'Proceedings',
    'Proc': 'Proceedings',
    'Rev.': 'Review',
    'Rev': 'Review',
    'Int.': 'International',
    'Int': 'International',
    'Appl.': 'Applied',
    'Appl': 'Applied',
    'Sci.': 'Science',
    'Sci': 'Science',
    'Comp.': 'Computer',
    'Comp': 'Computer',
    'Ling.': 'Linguistics',
    'Ling': 'Linguistics',
    'Math.': 'Mathematics',
    'Math': 'Mathematics',
    'Phys.': 'Physics',
    'Phys': 'Physics',
    'Chem.': 'Chemistry',
    'Chem': 'Chemistry',
    'Biol.': 'Biology',
    'Biol': 'Biology',
    'Tech.': 'Technology',
    'Tech': 'Technology',
    'Res.': 'Research',
    'Res': 'Research',
    'Q.': 'Quarterly',
    'Q': 'Quarterly',
    'Ann.': 'Annual',
    'Ann': 'Annual',
    'Bull.': 'Bulletin',
    'Bull': 'Bulletin',
    'Mag.': 'Magazine',
    'Mag': 'Magazine'
  },
  conjunctionPatterns: [
    /\s+of\s+/gi,
    /\s+and\s+/gi,
    /\s+in\s+/gi,
    /\s+on\s+/gi
  ]
};

/**
 * Field Variant Generator class
 * Extends VariantGenerator with field-specific variant generation
 * @class
 */
class FieldVariantGenerator extends VariantGenerator {
  constructor() {
    super();
    this.publisherPatterns = PUBLISHER_VARIANT_PATTERNS;
    this.locationPatterns = LOCATION_VARIANT_PATTERNS;
    this.journalPatterns = JOURNAL_VARIANT_PATTERNS;
  }

  /**
   * Generate variants for a field value based on field type
   * @param {string} rawValue - Raw field value
   * @param {string} fieldType - Type of field (publisher, location, journal)
   * @returns {Array} Array of variant strings
   */
  generateFieldVariants(rawValue, fieldType) {
    if (!rawValue || typeof rawValue !== 'string') {
      return [];
    }

    const normalizedValue = rawValue.trim();
    const variants = new Set();

    // Always add original
    variants.add(normalizedValue);

    switch (fieldType) {
      case 'publisher':
        return this.generatePublisherVariants(normalizedValue, variants);
      case 'location':
      case 'place':
        return this.generateLocationVariants(normalizedValue, variants);
      case 'journal':
        return this.generateJournalVariants(normalizedValue, variants);
      default:
        return Array.from(variants);
    }
  }

  /**
   * Generate variants for publisher names
   * @param {string} publisherName - Publisher name
   * @param {Set} variants - Set to add variants to
   * @returns {Array} Array of variant strings
   */
  generatePublisherVariants(publisherName, variants) {
    // Generate separator variants
    this.generateSeparatorVariants(publisherName, variants);

    // Generate abbreviation expansion variants
    this.generateAbbreviationVariants(publisherName, variants);

    // Generate pattern-based variants
    this.generatePublisherPatternVariants(publisherName, variants);

    // Generate case variants
    this.generateCaseVariants(publisherName, variants);

    return Array.from(variants);
  }

  /**
   * Generate separator variants (;, /, &, - variations)
   * @param {string} value - Raw value
   * @param {Set} variants - Set to add variants to
   */
  generateSeparatorVariants(value, variants) {
    const separators = [';', '/', '&', '-', ' and '];

    for (const sep of separators) {
      if (value.includes(sep)) {
        // Replace all instances of this separator with alternatives
        for (const altSep of separators) {
          if (sep !== altSep) {
            const replaced = value.split(sep).map(s => s.trim()).join(altSep === ' and ' ? ' and ' : altSep);
            if (replaced && replaced !== value) {
              variants.add(replaced);
            }
          }
        }
      }
    }
  }

  /**
   * Generate abbreviation expansion and contraction variants
   * @param {string} value - Raw value
   * @param {Set} variants - Set to add variants to
   */
  generateAbbreviationVariants(value, variants) {
    const abbrevs = this.publisherPatterns.abbreviationExpansions;

    for (const [abbr, expansion] of Object.entries(abbrevs)) {
      // Expand abbreviation
      if (value.includes(abbr)) {
        const expanded = value.replace(new RegExp(abbr.replace('.', '\\.'), 'g'), expansion);
        if (expanded !== value) {
          variants.add(expanded);
        }
      }

      // Contract expansion to abbreviation
      if (value.includes(expansion)) {
        const contracted = value.split(expansion).join(abbr);
        if (contracted !== value) {
          variants.add(contracted);
        }
      }
    }
  }

  /**
   * Generate pattern-based publisher variants (Springer-Verlag -> Springer)
   * @param {string} value - Raw value
   * @param {Set} variants - Set to add variants to
   */
  generatePublisherPatternVariants(value, variants) {
    const patterns = require('../config/field-constants').PUBLISHER_PATTERNS;

    for (const [pattern, replacement] of Object.entries(patterns)) {
      if (value.includes(pattern)) {
        variants.add(replacement);
      }
      // Also try reverse mapping
      if (value === replacement) {
        variants.add(pattern);
      }
    }
  }

  /**
   * Generate case variants (title case, uppercase, lowercase)
   * @param {string} value - Raw value
   * @param {Set} variants - Set to add variants to
   */
  generateCaseVariants(value, variants) {
    // Title case
    const titleCase = this.toTitleCase(value);
    if (titleCase !== value) {
      variants.add(titleCase);
    }

    // Upper case
    const upperCase = value.toUpperCase();
    if (upperCase !== value && upperCase !== titleCase) {
      variants.add(upperCase);
    }

    // Lower case
    const lowerCase = value.toLowerCase();
    if (lowerCase !== value && lowerCase !== titleCase && lowerCase !== upperCase) {
      variants.add(lowerCase);
    }
  }

  /**
   * Generate variants for location names
   * @param {string} locationName - Location name
   * @param {Set} variants - Set to add variants to
   * @returns {Array} Array of variant strings
   */
  generateLocationVariants(locationName, variants) {
    // Split multi-location values
    this.splitLocationVariants(locationName, variants);

    // Generate state abbreviation variants
    this.generateStateVariants(locationName, variants);

    // Generate case variants
    this.generateCaseVariants(locationName, variants);

    return Array.from(variants);
  }

  /**
   * Split multi-location values into individual locations
   * @param {string} value - Raw location value
   * @param {Set} variants - Set to add variants to
   */
  splitLocationVariants(value, variants) {
    const separators = this.locationPatterns.locationSeparators;

    for (const sep of separators) {
      if (value.includes(sep)) {
        const parts = value.split(sep).map(s => s.trim()).filter(s => s);
        if (parts.length > 1) {
          // Add individual parts
          parts.forEach(part => variants.add(part));
          // Add joined with different separators
          for (const altSep of separators) {
            if (sep !== altSep) {
              const joined = parts.join(altSep === ' and ' ? ' and ' : altSep);
              if (joined && joined !== value) {
                variants.add(joined);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Generate state abbreviation/full name variants
   * @param {string} value - Raw location value
   * @param {Set} variants - Set to add variants to
   */
  generateStateVariants(value, variants) {
    const stateAbbrevs = this.locationPatterns.stateAbbreviations;

    // Check if value ends with a state abbreviation
    for (const [abbr, fullName] of Object.entries(stateAbbrevs)) {
      // Pattern: City, State Abbr or City, State Full
      const abbrPattern = new RegExp(`\\s*,?\\s*${abbr}$`);
      const fullPattern = new RegExp(`\\s*,?\\s*${fullName}$`);

      if (abbrPattern.test(value)) {
        // Convert to full name
        const fullNameVersion = value.replace(abbrPattern, `, ${fullName}`);
        variants.add(fullNameVersion);
      }

      if (fullPattern.test(value)) {
        // Convert to abbreviation
        const abbrVersion = value.replace(fullPattern, `, ${abbr}`);
        variants.add(abbrVersion);
      }
    }
  }

  /**
   * Generate variants for journal names
   * @param {string} journalName - Journal name
   * @param {Set} variants - Set to add variants to
   * @returns {Array} Array of variant strings
   */
  generateJournalVariants(journalName, variants) {
    // Generate abbreviation variants
    this.generateJournalAbbreviationVariants(journalName, variants);

    // Generate conjunction variants
    this.generateJournalConjunctionVariants(journalName, variants);

    // Generate case variants
    this.generateCaseVariants(journalName, variants);

    return Array.from(variants);
  }

  /**
   * Generate journal abbreviation expansion/contraction variants
   * @param {string} value - Raw journal name
   * @param {Set} variants - Set to add variants to
   */
  generateJournalAbbreviationVariants(value, variants) {
    const abbrevs = this.journalPatterns.journalAbbreviations;

    for (const [abbr, expansion] of Object.entries(abbrevs)) {
      // Handle abbreviation with period
      const abbrWithPeriod = abbr.endsWith('.') ? abbr : abbr + '.';

      // Expand abbreviation
      if (value.includes(abbr) || value.includes(abbrWithPeriod)) {
        const expanded = value
          .replace(new RegExp(abbr.replace('.', '\\.'), 'g'), expansion)
          .replace(new RegExp(abbrWithPeriod.replace('.', '\\.'), 'g'), expansion);
        if (expanded !== value) {
          variants.add(expanded);
        }
      }

      // Contract expansion to abbreviation
      if (value.includes(expansion)) {
        const contracted = value
          .split(expansion)
          .join(abbrWithPeriod)
          .replace(/\s+/g, ' ')
          .trim();
        if (contracted !== value) {
          variants.add(contracted);
        }
      }
    }
  }

  /**
   * Generate conjunction removal/addition variants
   * @param {string} value - Raw journal name
   * @param {Set} variants - Set to add variants to
   */
  generateJournalConjunctionVariants(value, variants) {
    // Remove conjunctions
    const noConjunctions = value
      .replace(/\s+of\s+/gi, ' ')
      .replace(/\s+and\s+/gi, ' ')
      .replace(/\s+in\s+/gi, ' ')
      .replace(/\s+on\s+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (noConjunctions !== value) {
      variants.add(noConjunctions);
    }

    // Try adding common conjunctions
    const words = value.split(/\s+/);
    if (words.length >= 2) {
      variants.add(`${words[0]} of ${words.slice(1).join(' ')}`);
      variants.add(`${words[0]} and ${words.slice(1).join(' ')}`);
    }
  }

  /**
   * Convert string to title case
   * @param {string} str - String to convert
   * @returns {string} Title case string
   */
  toTitleCase(str) {
    return str.replace(
      /\w\S*/g,
      function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  }

  /**
   * Generate canonical form for field comparison
   * @param {string} value - Field value
   * @param {string} fieldType - Type of field
   * @returns {string} Canonical form
   */
  generateFieldCanonical(value, fieldType) {
    if (!value) return '';

    // Normalize whitespace and punctuation
    let canonical = value
      .trim()
      .toLowerCase()
      .replace(/[.,;:!?()]/g, '')
      .replace(/\s+/g, ' ');

    return canonical;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FieldVariantGenerator;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.FieldVariantGenerator = FieldVariantGenerator;
}
