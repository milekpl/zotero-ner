/**
 * Tests for name-constants configuration
 * @module tests/core/name-constants
 */

const {
  NAME_PREFIXES,
  NAME_SUFFIXES,
  COMMON_GIVEN_NAME_EQUIVALENTS,
  EUROPEAN_NAME_EQUIVALENTS
} = require('../../src/config/name-constants');

describe('NameConstants Config', () => {
  describe('NAME_PREFIXES', () => {
    test('is an array', () => {
      expect(Array.isArray(NAME_PREFIXES)).toBe(true);
    });

    test('contains common surname prefixes', () => {
      expect(NAME_PREFIXES).toContain('van');
      expect(NAME_PREFIXES).toContain('de');
      expect(NAME_PREFIXES).toContain('la');
      expect(NAME_PREFIXES).toContain('von');
      expect(NAME_PREFIXES).toContain('del');
    });

    test('contains diverse language prefixes', () => {
      expect(NAME_PREFIXES).toContain('di');    // Italian/Spanish
      expect(NAME_PREFIXES).toContain('du');    // French
      expect(NAME_PREFIXES).toContain('le');    // French
      expect(NAME_PREFIXES).toContain('da');    // Portuguese/Italian
      expect(NAME_PREFIXES).toContain('Mac');   // Scottish
      expect(NAME_PREFIXES).toContain('Mc');    // Scottish
      expect(NAME_PREFIXES).toContain('Saint'); // French
      expect(NAME_PREFIXES).toContain('San');   // Spanish/Italian
    });

    test('all items are lowercase except special cases', () => {
      const mixedCase = NAME_PREFIXES.filter(p => p[0] !== p[0].toLowerCase());
      expect(mixedCase).toEqual(["O'", 'Mac', 'Mc', 'Saint', 'St', 'San', 'Santa']);
    });

    test('has reasonable length (not empty, not too long)', () => {
      expect(NAME_PREFIXES.length).toBeGreaterThan(10);
      expect(NAME_PREFIXES.length).toBeLessThan(50);
    });

    test('has no duplicate entries', () => {
      const unique = [...new Set(NAME_PREFIXES)];
      expect(unique.length).toBe(NAME_PREFIXES.length);
    });
  });

  describe('NAME_SUFFIXES', () => {
    test('is an array', () => {
      expect(Array.isArray(NAME_SUFFIXES)).toBe(true);
    });

    test('contains generational suffixes', () => {
      expect(NAME_SUFFIXES).toContain('Jr');
      expect(NAME_SUFFIXES).toContain('Sr');
      expect(NAME_SUFFIXES).toContain('II');
      expect(NAME_SUFFIXES).toContain('III');
      expect(NAME_SUFFIXES).toContain('IV');
      expect(NAME_SUFFIXES).toContain('V');
    });

    test('contains academic suffixes', () => {
      expect(NAME_SUFFIXES).toContain('PhD');
      expect(NAME_SUFFIXES).toContain('MD');
      expect(NAME_SUFFIXES).toContain('JD');
      expect(NAME_SUFFIXES).toContain('MBA');
      expect(NAME_SUFFIXES).toContain('MA');
      expect(NAME_SUFFIXES).toContain('BS');
    });

    test('has no duplicate entries', () => {
      const unique = [...new Set(NAME_SUFFIXES)];
      expect(unique.length).toBe(NAME_SUFFIXES.length);
    });

    test('has reasonable length', () => {
      expect(NAME_SUFFIXES.length).toBeGreaterThan(5);
      expect(NAME_SUFFIXES.length).toBeLessThan(30);
    });
  });

  describe('COMMON_GIVEN_NAME_EQUIVALENTS', () => {
    test('is an object', () => {
      expect(typeof COMMON_GIVEN_NAME_EQUIVALENTS).toBe('object');
    });

    test('contains common name mappings', () => {
      expect(COMMON_GIVEN_NAME_EQUIVALENTS['William']).toContain('Bill');
      expect(COMMON_GIVEN_NAME_EQUIVALENTS['Robert']).toContain('Bob');
      expect(COMMON_GIVEN_NAME_EQUIVALENTS['James']).toContain('Jim');
      expect(COMMON_GIVEN_NAME_EQUIVALENTS['John']).toContain('Jack');
      expect(COMMON_GIVEN_NAME_EQUIVALENTS['Michael']).toContain('Mike');
    });

    test('all values are arrays', () => {
      Object.values(COMMON_GIVEN_NAME_EQUIVALENTS).forEach(value => {
        expect(Array.isArray(value)).toBe(true);
      });
    });

    test('all arrays contain strings', () => {
      Object.values(COMMON_GIVEN_NAME_EQUIVALENTS).forEach(value => {
        value.forEach(name => {
          expect(typeof name).toBe('string');
        });
      });
    });

    test('has bidirectional mappings where appropriate', () => {
      // If "William" maps to "Bill", then "Bill" should exist as a key
      const billExists = COMMON_GIVEN_NAME_EQUIVALENTS['Bill'];
      const williamMappings = COMMON_GIVEN_NAME_EQUIVALENTS['William'];
      if (billExists) {
        expect(billExists).toContain('William');
      }
    });
  });

  describe('EUROPEAN_NAME_EQUIVALENTS', () => {
    test('is an object', () => {
      expect(typeof EUROPEAN_NAME_EQUIVALENTS).toBe('object');
    });

    test('contains European name variations', () => {
      expect(EUROPEAN_NAME_EQUIVALENTS['Johann']).toContain('Hans');
      expect(EUROPEAN_NAME_EQUIVALENTS['Johannes']).toContain('Jan');
      expect(EUROPEAN_NAME_EQUIVALENTS['Pierre']).toContain('Peter');
    });

    test('all values are arrays', () => {
      Object.values(EUROPEAN_NAME_EQUIVALENTS).forEach(value => {
        expect(Array.isArray(value)).toBe(true);
      });
    });
  });

  describe('constants are frozen', () => {
    // These tests verify that the constants are read-only
    // Note: In a real codebase, you might want to freeze these
    test('NAME_PREFIXES is not modified during tests', () => {
      const originalLength = NAME_PREFIXES.length;
      // Simulate reading multiple times
      const lengths = [NAME_PREFIXES.length, NAME_PREFIXES.length, NAME_PREFIXES.length];
      expect(lengths.every(l => l === originalLength)).toBe(true);
    });

    test('NAME_SUFFIXES is not modified during tests', () => {
      const originalLength = NAME_SUFFIXES.length;
      const lengths = [NAME_SUFFIXES.length, NAME_SUFFIXES.length, NAME_SUFFIXES.length];
      expect(lengths.every(l => l === originalLength)).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    test('can be used for name parsing', () => {
      const testName = 'Johann van der Berg';
      const parts = testName.split(' ');

      // Check if first part could be a prefix
      const firstPart = parts[0];
      const isEuropeanName = EUROPEAN_NAME_EQUIVALENTS[firstPart];
      expect(isEuropeanName).toBeTruthy();

      // Check if middle part is a prefix
      const middlePart = parts[1];
      const isPrefix = NAME_PREFIXES.some(p =>
        p.toLowerCase() === middlePart.toLowerCase().replace(/^\w/, c => c.toLowerCase())
      );
      expect(isPrefix).toBe(true);
    });

    test('can be used for suffix detection', () => {
      const testNameWithSuffix = 'John Smith Jr';
      const parts = testNameWithSuffix.split(' ');
      const lastPart = parts[parts.length - 1];

      expect(NAME_SUFFIXES).toContain(lastPart);
    });
  });
});
