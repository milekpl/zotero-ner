/**
 * Unit tests for FieldVariantGenerator
 * Tests variant generation for publisher names, locations, and journal names
 */

const FieldVariantGenerator = require('../../src/core/field-variant-generator.js');

describe('FieldVariantGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new FieldVariantGenerator();
  });

  describe('constructor', () => {
    test('should initialize with publisher patterns', () => {
      expect(generator.publisherPatterns).toBeDefined();
      expect(generator.publisherPatterns.separatorVariants).toBeDefined();
      expect(generator.publisherPatterns.abbreviationExpansions).toBeDefined();
      expect(generator.publisherPatterns.companySuffixes).toBeDefined();
    });

    test('should initialize with location patterns', () => {
      expect(generator.locationPatterns).toBeDefined();
      expect(generator.locationPatterns.stateAbbreviations).toBeDefined();
      expect(generator.locationPatterns.locationSeparators).toBeDefined();
    });

    test('should initialize with journal patterns', () => {
      expect(generator.journalPatterns).toBeDefined();
      expect(generator.journalPatterns.journalAbbreviations).toBeDefined();
      expect(generator.journalPatterns.conjunctionPatterns).toBeDefined();
    });
  });

  describe('generateFieldVariants', () => {
    test('should return empty array for null input', () => {
      expect(generator.generateFieldVariants(null, 'publisher')).toEqual([]);
    });

    test('should return empty array for non-string input', () => {
      expect(generator.generateFieldVariants(123, 'publisher')).toEqual([]);
    });

    test('should generate publisher variants', () => {
      const variants = generator.generateFieldVariants('Test Publisher', 'publisher');
      expect(Array.isArray(variants)).toBe(true);
      expect(variants).toContain('Test Publisher');
    });

    test('should generate location variants', () => {
      const variants = generator.generateFieldVariants('Boston, MA', 'location');
      expect(Array.isArray(variants)).toBe(true);
      expect(variants).toContain('Boston, MA');
    });

    test('should generate journal variants', () => {
      const variants = generator.generateFieldVariants('J. of Science', 'journal');
      expect(Array.isArray(variants)).toBe(true);
      expect(variants).toContain('J. of Science');
    });

    test('should handle place type as location', () => {
      const variants = generator.generateFieldVariants('New York, NY', 'place');
      expect(Array.isArray(variants)).toBe(true);
    });

    test('should return only original for unknown types', () => {
      const variants = generator.generateFieldVariants('Unknown', 'unknown');
      expect(variants).toEqual(['Unknown']);
    });
  });

  describe('generatePublisherVariants', () => {
    test('should return array of variants', () => {
      const variants = generator.generatePublisherVariants('Test Publisher', new Set());
      expect(Array.isArray(variants)).toBe(true);
    });

    test('should include original value', () => {
      const variants = generator.generatePublisherVariants('Elsevier', new Set());
      // Original should be in variants (as-is or transformed)
      expect(variants.length).toBeGreaterThan(0);
      // Check that Elsevier is in variants (may be transformed by case variants)
      const hasElsevier = variants.some(v => v.toLowerCase().includes('elsevier'));
      expect(hasElsevier).toBe(true);
    });

    test('should generate separator variants', () => {
      const variants = generator.generatePublisherVariants('Pub A; Pub B', new Set());
      expect(variants.length).toBeGreaterThan(1);
    });

    test('should generate abbreviation expansion variants', () => {
      const variants = generator.generatePublisherVariants('Test Co.', new Set());
      expect(variants).toContain('Test Company');
    });

    test('should generate pattern-based variants', () => {
      const variants = generator.generatePublisherVariants('Springer-Verlag', new Set());
      expect(variants).toContain('Springer');
    });

    test('should generate case variants', () => {
      const variants = generator.generatePublisherVariants('test publisher', new Set());
      // Should include title case version
      expect(variants.some(v => v === 'Test Publisher')).toBe(true);
    });
  });

  describe('generateSeparatorVariants', () => {
    test('should generate variants with different separators', () => {
      const variants = new Set();
      generator.generateSeparatorVariants('A & B', variants);

      // Should have "A and B" variant
      expect(variants.has('A and B')).toBe(true);
    });

    test('should handle semicolon separator', () => {
      const variants = new Set();
      generator.generateSeparatorVariants('Publisher A; Publisher B', variants);

      // Should have alternative separator variants
      expect(variants.size).toBeGreaterThan(0);
    });

    test('should handle forward slash separator', () => {
      const variants = new Set();
      generator.generateSeparatorVariants('Publisher A / Publisher B', variants);

      // Should have alternative separator variants
      expect(variants.size).toBeGreaterThan(0);
    });

    test('should handle hyphen separator', () => {
      const variants = new Set();
      generator.generateSeparatorVariants('Publisher A - Publisher B', variants);

      // Should have alternative separator variants
      expect(variants.size).toBeGreaterThan(0);
    });
  });

  describe('generateAbbreviationVariants', () => {
    test('should expand Co. abbreviation', () => {
      const variants = new Set();
      generator.generateAbbreviationVariants('Test Co.', variants);

      expect(variants.has('Test Company')).toBe(true);
    });

    test('should expand Inc. abbreviation', () => {
      const variants = new Set();
      generator.generateAbbreviationVariants('Test Inc.', variants);

      expect(variants.has('Test Incorporated')).toBe(true);
    });

    test('should expand Ltd. abbreviation', () => {
      const variants = new Set();
      generator.generateAbbreviationVariants('Test Ltd.', variants);

      expect(variants.has('Test Limited')).toBe(true);
    });

    test('should expand Press abbreviation', () => {
      const variants = new Set();
      generator.generateAbbreviationVariants('MIT Press', variants);

      expect(variants.has('MIT Press.')).toBe(true);
    });

    test('should contract expansions to abbreviations', () => {
      const variants = new Set();
      generator.generateAbbreviationVariants('Test Company', variants);

      expect(variants.has('Test Co.')).toBe(true);
    });

    test('should handle multiple abbreviations', () => {
      const variants = new Set();
      generator.generateAbbreviationVariants('Test Co. Ltd.', variants);

      expect(variants.size).toBeGreaterThan(1);
    });
  });

  describe('generatePublisherPatternVariants', () => {
    test('should map Springer-Verlag to Springer', () => {
      const variants = new Set();
      generator.generatePublisherPatternVariants('Springer-Verlag', variants);

      expect(variants.has('Springer')).toBe(true);
    });

    test('should map Wiley-Blackwell to Wiley', () => {
      const variants = new Set();
      generator.generatePublisherPatternVariants('Wiley-Blackwell', variants);

      expect(variants.has('Wiley')).toBe(true);
    });

    test('should map Taylor & Francis variants', () => {
      const variants = new Set();
      generator.generatePublisherPatternVariants('Taylor & Francis Group', variants);

      expect(variants.has('Taylor and Francis')).toBe(true);
    });

    test('should handle Elsevier variants', () => {
      const variants = new Set();
      generator.generatePublisherPatternVariants('Elsevier BV', variants);

      expect(variants.has('Elsevier')).toBe(true);
    });
  });

  describe('generateCaseVariants', () => {
    test('should generate title case variant', () => {
      const variants = new Set();
      generator.generateCaseVariants('test publisher', variants);

      expect(variants.has('Test Publisher')).toBe(true);
    });

    test('should generate uppercase variant', () => {
      const variants = new Set();
      generator.generateCaseVariants('Test Publisher', variants);

      expect(variants.has('TEST PUBLISHER')).toBe(true);
    });

    test('should generate lowercase variant', () => {
      const variants = new Set();
      generator.generateCaseVariants('Test Publisher', variants);

      expect(variants.has('test publisher')).toBe(true);
    });

    test('should not add duplicate variants', () => {
      const variants = new Set();
      generator.generateCaseVariants('TEST PUBLISHER', variants);

      // Uppercase should not be added if it's already the original
      expect(variants.has('TEST PUBLISHER')).toBe(false);
    });
  });

  describe('generateLocationVariants', () => {
    test('should return array of variants', () => {
      const variants = generator.generateLocationVariants('Boston, MA', new Set());
      expect(Array.isArray(variants)).toBe(true);
      expect(variants.length).toBeGreaterThan(0);
      // Check that Boston is in variants
      const hasBoston = variants.some(v => v.includes('Boston'));
      expect(hasBoston).toBe(true);
    });

    test('should split multi-location values', () => {
      const variants = generator.generateLocationVariants('Boston, MA; Cambridge, MA', new Set());
      // Should contain individual locations
      expect(variants.length).toBeGreaterThan(1);
    });

    test('should generate state abbreviation variants', () => {
      const variants = generator.generateLocationVariants('Boston, Massachusetts', new Set());
      // Should include abbreviation variant
      expect(variants).toContain('Boston, MA');
    });

    test('should generate state full name variants', () => {
      const variants = generator.generateLocationVariants('Austin, TX', new Set());
      // Should include full name variant
      expect(variants).toContain('Austin, Texas');
    });
  });

  describe('splitLocationVariants', () => {
    test('should split by semicolon', () => {
      const variants = new Set();
      generator.splitLocationVariants('Boston; Cambridge', variants);

      expect(variants.has('Boston')).toBe(true);
      expect(variants.has('Cambridge')).toBe(true);
    });

    test('should split by slash', () => {
      const variants = new Set();
      generator.splitLocationVariants('Boston / Cambridge', variants);

      expect(variants.has('Boston')).toBe(true);
      expect(variants.has('Cambridge')).toBe(true);
    });

    test('should split by comma', () => {
      const variants = new Set();
      generator.splitLocationVariants('Boston, Cambridge', variants);

      expect(variants.has('Boston')).toBe(true);
      expect(variants.has('Cambridge')).toBe(true);
    });
  });

  describe('generateStateVariants', () => {
    test('should convert abbreviation to full name', () => {
      const variants = new Set();
      generator.generateStateVariants('Boston, MA', variants);

      expect(variants.has('Boston, Massachusetts')).toBe(true);
    });

    test('should convert full name to abbreviation', () => {
      const variants = new Set();
      generator.generateStateVariants('Boston, New York', variants);

      expect(variants.has('Boston, NY')).toBe(true);
    });

    test('should handle California abbreviation', () => {
      const variants = new Set();
      generator.generateStateVariants('Los Angeles, CA', variants);

      expect(variants.has('Los Angeles, California')).toBe(true);
    });

    test('should handle DC', () => {
      const variants = new Set();
      generator.generateStateVariants('Washington, DC', variants);

      expect(variants.has('Washington, District of Columbia')).toBe(true);
    });
  });

  describe('generateJournalVariants', () => {
    test('should return array of variants', () => {
      const variants = generator.generateJournalVariants('J. of Science', new Set());
      expect(Array.isArray(variants)).toBe(true);
      expect(variants.length).toBeGreaterThan(0);
      // Check that Journal or Science is in variants
      const hasJournal = variants.some(v => v.toLowerCase().includes('journal') || v.toLowerCase().includes('science'));
      expect(hasJournal).toBe(true);
    });

    test('should generate abbreviation expansion variants', () => {
      const variants = generator.generateJournalVariants('J. of Science', new Set());
      expect(variants).toContain('Journal of Science');
    });

    test('should generate conjunction variants', () => {
      const variants = generator.generateJournalVariants('Journal of Science', new Set());
      // Should have variants with "of" removed
      expect(variants.length).toBeGreaterThan(1);
    });
  });

  describe('generateJournalAbbreviationVariants', () => {
    test('should expand J. to Journal', () => {
      const variants = new Set();
      generator.generateJournalAbbreviationVariants('J. of Science', variants);

      expect(variants.has('Journal of Science')).toBe(true);
    });

    test('should expand Trans. to Transactions', () => {
      const variants = new Set();
      generator.generateJournalAbbreviationVariants('Proc. of the Academy', variants);

      expect(variants.has('Proceedings of the Academy')).toBe(true);
    });

    test('should expand Rev. to Review', () => {
      const variants = new Set();
      generator.generateJournalAbbreviationVariants('Phys. Rev.', variants);

      // Should contain Review expansion
      const hasReview = Array.from(variants).some(v => v.toLowerCase().includes('review'));
      expect(hasReview).toBe(true);
    });

    test('should contract Journal to J.', () => {
      const variants = new Set();
      generator.generateJournalAbbreviationVariants('Journal of Science', variants);

      expect(variants.has('J. of Science')).toBe(true);
    });
  });

  describe('generateJournalConjunctionVariants', () => {
    test('should remove "of" conjunction', () => {
      const variants = new Set();
      generator.generateJournalConjunctionVariants('Journal of Science', variants);

      expect(variants.has('Journal Science')).toBe(true);
    });

    test('should remove "and" conjunction', () => {
      const variants = new Set();
      generator.generateJournalConjunctionVariants('Journal and Science', variants);

      expect(variants.has('Journal Science')).toBe(true);
    });

    test('should add conjunction variants', () => {
      const variants = new Set();
      generator.generateJournalConjunctionVariants('Journal Science', variants);

      expect(variants.has('Journal of Science')).toBe(true);
      expect(variants.has('Journal and Science')).toBe(true);
    });
  });

  describe('toTitleCase', () => {
    test('should convert to title case', () => {
      expect(generator.toTitleCase('hello world')).toBe('Hello World');
    });

    test('should handle single word', () => {
      expect(generator.toTitleCase('hello')).toBe('Hello');
    });

    test('should handle already capitalized', () => {
      expect(generator.toTitleCase('Hello World')).toBe('Hello World');
    });

    test('should handle all uppercase', () => {
      expect(generator.toTitleCase('HELLO WORLD')).toBe('Hello World');
    });

    test('should handle mixed case', () => {
      expect(generator.toTitleCase('hElLo wOrLd')).toBe('Hello World');
    });

    test('should handle punctuation', () => {
      expect(generator.toTitleCase('hello, world!')).toBe('Hello, World!');
    });

    test('should handle empty string', () => {
      expect(generator.toTitleCase('')).toBe('');
    });
  });

  describe('generateFieldCanonical', () => {
    test('should lowercase and trim', () => {
      expect(generator.generateFieldCanonical('  TEST  ', 'publisher')).toBe('test');
    });

    test('should remove punctuation', () => {
      expect(generator.generateFieldCanonical('Test, Publisher!', 'publisher')).toBe('test publisher');
    });

    test('should normalize whitespace', () => {
      expect(generator.generateFieldCanonical('Test    Publisher', 'publisher')).toBe('test publisher');
    });

    test('should return empty string for null', () => {
      expect(generator.generateFieldCanonical(null, 'publisher')).toBe('');
    });

    test('should return empty string for empty string', () => {
      expect(generator.generateFieldCanonical('', 'publisher')).toBe('');
    });
  });
});
