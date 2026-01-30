/**
 * Phonetic indexing utilities for name matching
 * Provides Soundex and Metaphone-like encoding for name similarity
 * @module utils/phonetic-index
 */

/**
 * Simple Soundex implementation for phonetic name matching
 * Maps similar-sounding names to the same code
 * @param {string} str - Input string
 * @returns {string} Soundex code (4 characters)
 */
function soundex(str) {
  if (!str || str.length === 0) return '';

  const s = str.toLowerCase();
  const firstChar = s.charAt(0).toUpperCase();

  // Soundex encoding rules
  const encoding = {
    'b': '1', 'f': '1', 'p': '1', 'v': '1',
    'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
    'd': '3', 't': '3',
    'l': '4',
    'm': '5', 'n': '5',
    'r': '6'
  };

  let result = firstChar;
  let lastCode = '';

  for (let i = 1; i < s.length && result.length < 4; i++) {
    const char = s.charAt(i);
    const code = encoding[char];

    // Skip vowels and 'h', 'w'
    if (!code) continue;

    // Skip duplicate codes (including codes separated by 'h' or 'w')
    if (code === lastCode) continue;

    result += code;
    lastCode = code;
  }

  // Pad with zeros
  while (result.length < 4) {
    result += '0';
  }

  return result;
}

/**
 * Get first-letter code for quick bucketing
 * @param {string} str - Input string
 * @returns {string} First letter or empty string
 */
function getFirstLetterCode(str) {
  if (!str || str.length === 0) return '';
  return str.charAt(0).toLowerCase();
}

/**
 * Create a phonetic index key for a name
 * Combines first letter with Soundex for better matching
 * @param {string} name - Name to encode
 * @returns {string} Phonetic index key
 */
function getPhoneticKey(name) {
  if (!name || name.length === 0) return '';

  const firstLetter = getFirstLetterCode(name);
  const soundexCode = soundex(name);

  return `${firstLetter}${soundexCode}`;
}

/**
 * Get a bucket key for initial blocking
 * Groups names by first letter and length category
 * @param {string} name - Name to bucket
 * @returns {string} Bucket key
 */
function getBucketKey(name) {
  if (!name || name.length === 0) return '';

  const firstLetter = name.charAt(0).toLowerCase();
  const len = name.length;

  // Length categories: tiny (1-3), short (4-6), medium (7-10), long (11+)
  let lengthCat;
  if (len <= 3) lengthCat = 'T';
  else if (len <= 6) lengthCat = 'S';
  else if (len <= 10) lengthCat = 'M';
  else lengthCat = 'L';

  return `${firstLetter}${lengthCat}`;
}

/**
 * Calculate approximate similarity based on phonetic codes
 * @param {string} name1 - First name
 * @param {string} name2 - Second name
 * @returns {number} Approximate similarity (0-1)
 */
function phoneticSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  if (name1 === name2) return 1;

  const key1 = getPhoneticKey(name1);
  const key2 = getPhoneticKey(name2);

  if (key1 === key2) return 0.9;

  const soundex1 = key1.substring(1);
  const soundex2 = key2.substring(1);

  if (soundex1 === soundex2) return 0.8;

  // Check if first 3 characters match
  if (soundex1.substring(0, 3) === soundex2.substring(0, 3)) return 0.7;

  // Check first letter match
  if (key1.charAt(0) === key2.charAt(0)) return 0.5;

  return 0;
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    soundex,
    getFirstLetterCode,
    getPhoneticKey,
    getBucketKey,
    phoneticSimilarity
  };
}

// Export for ES modules
if (typeof window !== 'undefined') {
  window.PhoneticIndex = {
    soundex,
    getFirstLetterCode,
    getPhoneticKey,
    getBucketKey,
    phoneticSimilarity
  };
}
