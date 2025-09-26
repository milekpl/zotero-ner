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