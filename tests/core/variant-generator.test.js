const VariantGenerator = require('../../src/core/variant-generator.js');
const NameParser = require('../../src/core/name-parser.js');

describe('VariantGenerator', () => {
  let generator;
  let parser;

  beforeEach(() => {
    generator = new VariantGenerator();
    parser = new NameParser();
  });

  test('should generate full form variant', () => {
    const parsed = parser.parse('Jerry Alan Fodor');
    const variants = generator.generateVariants(parsed);
    expect(variants).toContain('Jerry Alan Fodor');
  });

  test('should generate initial form variant', () => {
    const parsed = parser.parse('Jerry Alan Fodor');
    const variants = generator.generateVariants(parsed);
    expect(variants).toContain('J. A. Fodor');
  });

  test('should generate first initial last form', () => {
    const parsed = parser.parse('Jerry Fodor');
    const variants = generator.generateVariants(parsed);
    expect(variants).toContain('J. Fodor');
  });

  test('should handle prefixed names', () => {
    const parsed = parser.parse('Eva van Dijk');
    const variants = generator.generateVariants(parsed);
    expect(variants).toContain('Eva van Dijk');
    expect(variants).toContain('E. van Dijk');
  });

  test('should generate canonical form', () => {
    const parsed = parser.parse('Jerry Alan Fodor');
    const canonical = generator.generateCanonical(parsed);
    expect(canonical).toBe('FODOR JERRY ALAN');
  });

  test('should not generate duplicate variants', () => {
    const parsed = parser.parse('J. Fodor');
    const variants = generator.generateVariants(parsed);
    // Should not have duplicates
    const uniqueVariants = [...new Set(variants)];
    expect(variants.length).toBe(uniqueVariants.length);
  });
});