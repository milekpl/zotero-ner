const ZoteroDBAnalyzer = require('../../src/zotero/zotero-db-analyzer.js');

describe('COMMON_GIVEN_NAME_EQUIVALENTS behavior', () => {
  test('known nicknames are recognized via scoring (paco -> francisco)', () => {
    const analyzer = new ZoteroDBAnalyzer();
    const variant = { firstName: 'Paco', frequency: 10 };
    const score = analyzer.scoreGivenNameVariant(variant);
    // Score should include bonus for known equivalent (>= 50 extra)
    expect(score).toBeGreaterThanOrEqual(50 + 10);
  });

  test('pepe maps to jose via equivalents', () => {
    const analyzer = new ZoteroDBAnalyzer();
    const variant = { firstName: 'Pepe', frequency: 5 };
    const score = analyzer.scoreGivenNameVariant(variant);
    expect(score).toBeGreaterThanOrEqual(50 + 5);
  });
});
