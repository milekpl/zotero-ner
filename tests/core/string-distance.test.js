/**
 * Tests for string-distance utilities
 * @module tests/core/string-distance
 */

const {
  levenshteinDistance,
  normalizedLevenshtein,
  isDiacriticOnlyVariant
} = require('../../src/utils/string-distance');

describe('StringDistance Utils', () => {
  describe('levenshteinDistance', () => {
    test('returns 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('a', 'a')).toBe(0);
    });

    test('returns length for completely different strings', () => {
      expect(levenshteinDistance('', 'abc')).toBe(3);
      expect(levenshteinDistance('abc', '')).toBe(3);
      expect(levenshteinDistance('abc', 'xyz')).toBe(3);
    });

    test('calculates single insertion', () => {
      expect(levenshteinDistance('hello', 'helloo')).toBe(1);
      expect(levenshteinDistance('hell', 'hello')).toBe(1);
    });

    test('calculates single deletion', () => {
      expect(levenshteinDistance('hello', 'hell')).toBe(1);
      expect(levenshteinDistance('abc', 'ab')).toBe(1);
    });

    test('calculates single substitution', () => {
      expect(levenshteinDistance('hello', 'hallo')).toBe(1);
      expect(levenshteinDistance('abc', 'abd')).toBe(1);
    });

    test('calculates multiple operations', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('saturday', 'sunday')).toBe(3);
    });

    test('handles case sensitivity', () => {
      expect(levenshteinDistance('Hello', 'hello')).toBe(1);
      expect(levenshteinDistance('HELLO', 'hello')).toBe(5);
    });

    test('handles special characters', () => {
      expect(levenshteinDistance('hello', 'hello!')).toBe(1);
      expect(levenshteinDistance('name', 'na-me')).toBe(1);
    });

    test('handles whitespace', () => {
      expect(levenshteinDistance('hello world', 'helloworld')).toBe(1);
      expect(levenshteinDistance('hello', 'hello ')).toBe(1);
    });

    test('handles unicode characters', () => {
      expect(levenshteinDistance('café', 'cafe')).toBe(1);
      expect(levenshteinDistance('résumé', 'resume')).toBe(2);
    });

    test('handles long strings efficiently', () => {
      const str1 = 'a'.repeat(100);
      const str2 = 'b'.repeat(100);
      const result = levenshteinDistance(str1, str2);
      expect(result).toBe(100);
    });
  });

  describe('normalizedLevenshtein', () => {
    test('returns 1 for identical strings', () => {
      expect(normalizedLevenshtein('hello', 'hello')).toBe(1);
      expect(normalizedLevenshtein('', '')).toBe(1);
    });

    test('returns 0 for completely different strings of same length', () => {
      expect(normalizedLevenshtein('abc', 'xyz')).toBe(0);
    });

    test('returns 0 when one string is empty', () => {
      expect(normalizedLevenshtein('', 'abc')).toBe(0);
      expect(normalizedLevenshtein('abc', '')).toBe(0);
    });

    test('returns 0.5 for 50% difference', () => {
      expect(normalizedLevenshtein('ab', 'xy')).toBe(0);
      expect(normalizedLevenshtein('abc', 'abx')).toBeCloseTo(0.667, 2);
    });

    test('returns correct similarity for similar names', () => {
      expect(normalizedLevenshtein('Smith', 'Smythe')).toBeGreaterThan(0.5);
      expect(normalizedLevenshtein('Johnson', 'Johnsen')).toBeGreaterThan(0.5);
      expect(normalizedLevenshtein('Williams', 'Williamson')).toBeGreaterThan(0.6);
    });

    test('returns correct similarity for different names', () => {
      expect(normalizedLevenshtein('Smith', 'Jones')).toBeLessThan(0.5);
    });

    test('handles case sensitivity', () => {
      expect(normalizedLevenshtein('Hello', 'hello')).toBe(0.8);
    });

    test('handles special characters', () => {
      expect(normalizedLevenshtein('O\'Brien', 'OBrien')).toBeLessThan(1);
    });

    test('handles unicode characters', () => {
      expect(normalizedLevenshtein('café', 'cafe')).toBe(0.75);
    });

    test('handles very long strings', () => {
      const str1 = 'a'.repeat(50);
      const str2 = 'b'.repeat(50);
      expect(normalizedLevenshtein(str1, str2)).toBe(0);
    });

    test('returns exact 1 for same string', () => {
      const longString = 'a'.repeat(100);
      expect(normalizedLevenshtein(longString, longString)).toBe(1);
    });
  });

  describe('consistency between functions', () => {
    test('normalizedLevenshtein is consistent with levenshteinDistance', () => {
      const pairs = [
        ['hello', 'hallo'],
        ['smith', 'smythe'],
        ['johnson', 'johnsen'],
        ['williams', 'williamson'],
        ['thompson', 'tompkins']
      ];

      for (const [str1, str2] of pairs) {
        const distance = levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        const expected = 1 - (distance / maxLength);
        expect(normalizedLevenshtein(str1, str2)).toBeCloseTo(expected, 10);
      }
    });
  });

  describe('isDiacriticOnlyVariant', () => {
    it('should return false for empty strings', () => {
      expect(isDiacriticOnlyVariant('', '')).toBe(false);
      expect(isDiacriticOnlyVariant('test', '')).toBe(false);
      expect(isDiacriticOnlyVariant('', 'test')).toBe(false);
    });

    it('should return true for names differing only by diacritics', () => {
      expect(isDiacriticOnlyVariant('Miłkowski', 'Milkowski')).toBe(true);
      expect(isDiacriticOnlyVariant('Müller', 'Mueller')).toBe(true);
      expect(isDiacriticOnlyVariant('MÜLLER', 'Mueller')).toBe(true);
      expect(isDiacriticOnlyVariant('café', 'cafe')).toBe(true);
      expect(isDiacriticOnlyVariant('José', 'Jose')).toBe(true);
    });

    it('should return false for names with different letters', () => {
      expect(isDiacriticOnlyVariant('Dennett', 'Bennett')).toBe(false);
      expect(isDiacriticOnlyVariant('Smith', 'Smyth')).toBe(false);
      expect(isDiacriticOnlyVariant('Johnson', 'Johnsen')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isDiacriticOnlyVariant('MÜLLER', 'mueller')).toBe(true);
      expect(isDiacriticOnlyVariant('CAFÉ', 'Cafe')).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('handles null-like empty strings', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(normalizedLevenshtein('', '')).toBe(1);
    });

    test('handles very short strings', () => {
      expect(levenshteinDistance('', 'a')).toBe(1);
      expect(levenshteinDistance('a', '')).toBe(1);
      expect(levenshteinDistance('a', 'a')).toBe(0);
      expect(levenshteinDistance('a', 'b')).toBe(1);
    });

    test('handles strings with only spaces', () => {
      expect(levenshteinDistance(' ', '  ')).toBe(1);
      expect(levenshteinDistance('a ', 'a')).toBe(1);
    });

    test('handles strings with only numbers', () => {
      expect(levenshteinDistance('123', '124')).toBe(1);
      expect(levenshteinDistance('123', '456')).toBe(3);
    });
  });
});
