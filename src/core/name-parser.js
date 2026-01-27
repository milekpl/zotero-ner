/**
 * Name Parser - Enhanced name parsing logic
 */
const { NAME_PREFIXES, NAME_SUFFIXES } = require('../config/name-constants');

class NameParser {
  constructor() {
    this.prefixes = NAME_PREFIXES;
    this.suffixes = NAME_SUFFIXES;
    this.initialPattern = /^[A-Z]\.?$/;
    this.initialsPattern = /^[A-Z]\.[A-Z]\.?$/;
  }

  /**
   * Parse a name string with enhanced logic for specific cases
   * @param {string} rawName - Raw name string
   * @returns {Object} Parsed name components
   */
  parse(rawName) {
    const original = rawName || '';
    let working = (original || '').trim();

    if (working.includes(',')) {
      const commaSegments = working
        .split(',')
        .map(segment => segment.trim())
        .filter(segment => segment.length > 0);

      if (commaSegments.length >= 2) {
        const firstSegment = commaSegments[0];
        const restSegments = commaSegments.slice(1);
        const restCombined = restSegments.join(' ').trim();

        if (/\p{L}/u.test(firstSegment) && /\p{L}/u.test(restCombined)) {
          working = `${restCombined} ${firstSegment}`.trim();
        }
      }
    }

    let parts = working.replace(/[ ,\s]+$/, '').split(/\s+/); // Remove trailing commas/space
    const result = {
      firstName: '',
      middleName: '',
      lastName: '',
      prefix: '',
      suffix: '',
      original: original
    };

    // Handle single word case first
    if (parts.length === 1 && parts[0] !== '') {
      // If it's a known prefix, treat as prefix; otherwise treat as last name
      if (this.prefixes.includes(parts[0].toLowerCase())) {
        result.prefix = parts[0];
      } else {
        result.lastName = parts[0];
      }
      return result;
    }
    
    // Handle empty input
    if (parts.length === 1 && parts[0] === '') {
      return result;
    }

    // Handle multiple word case
    if (parts.length >= 2) {
      // Set first name as the first part
      result.firstName = this.stripTrailingPeriodIfName(parts[0]);
      
      // Check for prefixes at the beginning (after first name)
      let prefixEndIndex = 1;
      while (prefixEndIndex < parts.length - 1 && 
             this.prefixes.includes(parts[prefixEndIndex].toLowerCase())) {
        if (result.prefix) {
          result.prefix = `${result.prefix} ${parts[prefixEndIndex]}`;
        } else {
          result.prefix = parts[prefixEndIndex];
        }
        prefixEndIndex++;
      }
      
      // Handle special case where a prefix can take a following name part
      // For example, "del Carmen" is a complete prefix
      if (result.prefix && prefixEndIndex < parts.length - 1) {
        // Check if the next word after the prefix should be part of it
        if (this.isNextWordForPrefix(result.prefix, parts[prefixEndIndex])) {
          result.prefix = `${result.prefix} ${parts[prefixEndIndex]}`;
          prefixEndIndex++;
        }
      }
      
      // Check for suffixes at the end
      let suffixStartIndex = parts.length - 1;
      while (suffixStartIndex > prefixEndIndex && 
             this.suffixes.some(s => 
               parts[suffixStartIndex].toLowerCase() === s.toLowerCase() || 
               parts[suffixStartIndex].toLowerCase() === s.toLowerCase() + '.')) {
        if (result.suffix) {
          result.suffix = `${parts[suffixStartIndex]} ${result.suffix}`;
        } else {
          result.suffix = parts[suffixStartIndex];
        }
        suffixStartIndex--;
      }
      
      // Determine the last name (the part after all prefixes and before all suffixes)
      if (suffixStartIndex >= prefixEndIndex) {
        result.lastName = parts[suffixStartIndex];
      }
      
      // Handle middle names (anything between first name and last name that's not a prefix or suffix)
      if (prefixEndIndex < suffixStartIndex) {
        const middleParts = parts.slice(prefixEndIndex, suffixStartIndex);
        if (middleParts.length > 0) {
          result.middleName = middleParts.map(part => this.stripTrailingPeriodIfName(part)).join(' ');
        }
      }
    }

    result.firstName = this.stripTrailingPeriodIfName(result.firstName);
    result.middleName = this.stripTrailingPeriodIfName(result.middleName);
    result.lastName = this.stripTrailingPeriodIfName(result.lastName);

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

  stripTrailingPeriodIfName(value) {
    if (!value || typeof value !== 'string') {
      return value || '';
    }

    const trimmed = value.trim();
    if (!trimmed.endsWith('.')) {
      return trimmed;
    }

    const core = trimmed.slice(0, -1);
    if (core.length < 2) {
      return trimmed;
    }

    if (core.includes('.')) {
      return trimmed;
    }

    if (!/[A-Za-z]/.test(core)) {
      return trimmed;
    }

    if (!/[AEIOUYaeiouy]/.test(core)) {
      return trimmed;
    }

    return core;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NameParser;
}