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