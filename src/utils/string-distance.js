/**
 * String distance utilities for name normalization
 * @module utils/string-distance
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {number} maxDistance - Maximum distance to compute (early termination)
 * @returns {number} Levenshtein distance or maxDistance+1 if exceeded
 */
function levenshteinDistance(str1, str2, maxDistance = Infinity) {
  if (str1 === str2) return 0;
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;

  // Ensure str1 is the shorter string for space optimization
  if (str1.length > str2.length) {
    [str1, str2] = [str2, str1];
  }

  const len1 = str1.length;
  const len2 = str2.length;

  // Early termination: if length diff exceeds maxDistance
  if (len2 - len1 > maxDistance) {
    return maxDistance + 1;
  }

  // Use two rows instead of full matrix (O(min(n,m)) space)
  let prevRow = new Array(len1 + 1);
  let currRow = new Array(len1 + 1);

  for (let j = 0; j <= len1; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    currRow[0] = i;
    let minInRow = currRow[0];

    for (let j = 1; j <= len1; j++) {
      const cost = str1[j - 1] === str2[i - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,      // deletion
        currRow[j - 1] + 1,  // insertion
        prevRow[j - 1] + cost // substitution
      );
      minInRow = Math.min(minInRow, currRow[j]);
    }

    // Early termination check
    if (minInRow > maxDistance) {
      return maxDistance + 1;
    }

    // Swap rows
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[len1];
}

/**
 * Calculate normalized Levenshtein similarity (0-1 scale)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {number} threshold - Minimum similarity (0-1) for early termination
 * @returns {number} Similarity score between 0 and 1 (1 = identical)
 */
function normalizedLevenshtein(str1, str2, threshold = 0) {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0 && len2 === 0) return 1;
  if (len1 === 0 || len2 === 0) return 0;

  // Quick pre-filter: if length differs too much, similarity will be low
  const maxLen = Math.max(len1, len2);
  const minLen = Math.min(len1, len2);
  if (minLen / maxLen < threshold) {
    return 0;
  }

  const maxDistance = Math.floor(maxLen * (1 - threshold));
  const distance = levenshteinDistance(str1, str2, maxDistance);

  if (distance > maxDistance) {
    return 0; // Below threshold
  }

  return 1 - (distance / maxLen);
}

/**
 * Normalize a name by removing diacritics and converting common variants
 * @param {string} str - Name to normalize
 * @returns {string} Normalized name
 */
function normalizeName(str) {
  if (!str) return '';
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
}

/**
 * Check if two names differ only by diacritics or common diacritic-based spellings
 * @param {string} name1 - First name
 * @param {string} name2 - Second name
 * @returns {boolean} True if names differ only by diacritical marks
 */
function isDiacriticOnlyVariant(name1, name2) {
  if (!name1 || !name2) return false;
  return normalizeName(name1) === normalizeName(name2);
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    levenshteinDistance,
    normalizedLevenshtein,
    isDiacriticOnlyVariant,
    normalizeName
  };
}

// Export for ES modules
if (typeof window !== 'undefined') {
  window.StringDistance = {
    levenshteinDistance,
    normalizedLevenshtein,
    isDiacriticOnlyVariant,
    normalizeName
  };
}
