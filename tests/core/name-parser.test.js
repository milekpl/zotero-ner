/**
 * Unit tests for NameParser
 * Tests the enhanced name parsing logic
 */

const NameParser = require('../../src/core/name-parser.js');

describe('NameParser', () => {
  let parser;

  beforeEach(() => {
    parser = new NameParser();
  });

  test('should parse full name correctly', () => {
    const result = parser.parse('Jerry Alan Fodor');
    expect(result.firstName).toBe('Jerry');
    expect(result.middleName).toBe('Alan');
    expect(result.lastName).toBe('Fodor');
  });

  test('should parse abbreviated name correctly', () => {
    const result = parser.parse('Jerry A. Fodor');
    expect(result.firstName).toBe('Jerry');
    expect(result.middleName).toBe('A.');
    expect(result.lastName).toBe('Fodor');
  });

  test('should parse single initial correctly', () => {
    const result = parser.parse('J.A. Fodor');
    expect(result.firstName).toBe('J.A.');
    expect(result.lastName).toBe('Fodor');
  });

  test('should handle Spanish double surnames', () => {
    const result = parser.parse('Juan Martinez Garcia');
    expect(result.firstName).toBe('Juan');
    expect(result.middleName).toBe('Martinez');
    expect(result.lastName).toBe('Garcia');
  });

  test('should handle prefixes like van', () => {
    const result = parser.parse('Eva van Dijk');
    expect(result.firstName).toBe('Eva');
    expect(result.prefix).toBe('van');
    expect(result.lastName).toBe('Dijk');
  });

  test('should handle names with suffixes', () => {
    const result = parser.parse('John Smith Jr');
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Smith');
    expect(result.suffix).toBe('Jr');
  });

  test('should handle names with multiple prefixes', () => {
    const result = parser.parse('Maria del Carmen Rodriguez');
    expect(result.firstName).toBe('Maria');
    expect(result.prefix).toBe('del Carmen');
    expect(result.lastName).toBe('Rodriguez');
  });

  test('should handle last name only', () => {
    const result = parser.parse('Fodor');
    expect(result.firstName).toBe('');
    expect(result.lastName).toBe('Fodor');
  });

  test('should handle empty string', () => {
    const result = parser.parse('');
    expect(result.firstName).toBe('');
    expect(result.middleName).toBe('');
    expect(result.lastName).toBe('');
    expect(result.prefix).toBe('');
    expect(result.suffix).toBe('');
    expect(result.original).toBe('');
  });

  test('should handle null input', () => {
    const result = parser.parse(null);
    expect(result.firstName).toBe('');
    expect(result.middleName).toBe('');
    expect(result.lastName).toBe('');
    expect(result.prefix).toBe('');
    expect(result.suffix).toBe('');
    expect(result.original).toBe('');
  });

  test('should handle undefined input', () => {
    const result = parser.parse(undefined);
    expect(result.firstName).toBe('');
    expect(result.middleName).toBe('');
    expect(result.lastName).toBe('');
    expect(result.prefix).toBe('');
    expect(result.suffix).toBe('');
    expect(result.original).toBe('');
  });

  test('should handle whitespace-only input', () => {
    const result = parser.parse('   ');
    expect(result.firstName).toBe('');
    expect(result.middleName).toBe('');
    expect(result.lastName).toBe('');
    expect(result.prefix).toBe('');
    expect(result.suffix).toBe('');
    expect(result.original).toBe('   ');
  });

  test('should handle names with trailing commas', () => {
    const result = parser.parse('John Smith,');
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Smith');
  });

  test('should parse inverted name with trailing period after comma', () => {
    const result = parser.parse('Boogerd, Fred.');
    expect(result.firstName).toBe('Fred');
    expect(result.lastName).toBe('Boogerd');
  });

  test('should strip trailing period from standalone given name', () => {
    const result = parser.parse('Fred. Smith');
    expect(result.firstName).toBe('Fred');
    expect(result.lastName).toBe('Smith');
  });

  test('should parse inverted initials with comma', () => {
    const result = parser.parse('Hooker, C.A.');
    expect(result.firstName).toBe('C.A.');
    expect(result.lastName).toBe('Hooker');
  });

  test('should handle names with multiple spaces', () => {
    const result = parser.parse('John   Smith');
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Smith');
  });

  test('should handle compound first names', () => {
    const result = parser.parse('Mary Jane Smith');
    expect(result.firstName).toBe('Mary');
    expect(result.middleName).toBe('Jane');
    expect(result.lastName).toBe('Smith');
  });

  test('should handle names with hyphens', () => {
    const result = parser.parse('Jean-Pierre Smith');
    expect(result.firstName).toBe('Jean-Pierre');
    expect(result.lastName).toBe('Smith');
  });

  test('should handle names with apostrophes', () => {
    const result = parser.parse('O\'Connor Smith');
    expect(result.firstName).toBe('O\'Connor');
    expect(result.lastName).toBe('Smith');
  });

  test('should handle names with multiple middle names', () => {
    const result = parser.parse('John Michael David Smith');
    expect(result.firstName).toBe('John');
    expect(result.middleName).toBe('Michael David');
    expect(result.lastName).toBe('Smith');
  });

  test('should handle names with initials in middle', () => {
    const result = parser.parse('John M. D. Smith');
    expect(result.firstName).toBe('John');
    expect(result.middleName).toBe('M. D.');
    expect(result.lastName).toBe('Smith');
  });

  test('should handle names with mixed initials and full names', () => {
    const result = parser.parse('J. Alan Fodor');
    expect(result.firstName).toBe('J.');
    expect(result.middleName).toBe('Alan');
    expect(result.lastName).toBe('Fodor');
  });
});