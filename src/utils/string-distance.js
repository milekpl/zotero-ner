/**
 * String distance utilities for name normalization
 * @module utils/string-distance
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Levenshtein distance (number of edits required)
 */
function levenshteinDistance(str1, str2) {
  if (str1 === str2) return 0;
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;

  const matrix = [];

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
 * Calculate normalized Levenshtein similarity (0-1 scale)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0 and 1 (1 = identical)
 */
function normalizedLevenshtein(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0 && len2 === 0) return 1;
  if (len1 === 0 || len2 === 0) return 0;

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(len1, len2);
  return 1 - (distance / maxLength);
}

/**
 * Check if two names differ only by diacritics or common diacritic-based spellings
 * @param {string} name1 - First name
 * @param {string} name2 - Second name
 * @returns {boolean} True if names differ only by diacritical marks
 */
function isDiacriticOnlyVariant(name1, name2) {
  if (!name1 || !name2) return false;

  const normalizeName = (str) => {
    let normalized = str.toLowerCase();

    // German umlaut conventions: ue, oe, ae
    normalized = normalized.replace(/ä/g, 'ae');
    normalized = normalized.replace(/ö/g, 'oe');
    normalized = normalized.replace(/ü/g, 'ue');

    // Polish ł → l
    normalized = normalized.replace(/ł/g, 'l');

    // Remove combining diacritical marks
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return normalized;
  };

  return normalizeName(name1) === normalizeName(name2);
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    levenshteinDistance,
    normalizedLevenshtein,
    isDiacriticOnlyVariant
  };
}

// Export for ES modules
if (typeof window !== 'undefined') {
  window.StringDistance = {
    levenshteinDistance,
    normalizedLevenshtein,
    isDiacriticOnlyVariant
  };
}
