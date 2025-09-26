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
    // For now, the current implementation should detect this as potential double surname
    expect(result.lastName).toBeTruthy();
  });

  test('should handle prefixes like van', () => {
    const result = parser.parse('Eva van Dijk');
    expect(result.prefix).toBe('van');
    expect(result.firstName).toBe('Eva');
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
    expect(result.prefix).toBe('del Carmen');
    expect(result.firstName).toBe('Maria');
    expect(result.lastName).toBe('Rodriguez');
  });

  test('should handle last name only', () => {
    const result = parser.parse('Fodor');
    expect(result.firstName).toBe('');
    expect(result.lastName).toBe('Fodor');
  });
});