const ZoteroDBAnalyzer = require('../../src/zotero/zotero-db-analyzer.js');

describe('Title-case formatting (ZoteroDBAnalyzer.toTitleCase)', () => {
  test('toTitleCase returns TitleCase and lowercases inner letters', () => {
    const analyzer = new ZoteroDBAnalyzer();
    const raw = 'o\'neill garzón';
    const result = analyzer.toTitleCase(raw);
    expect(result).toBe('O\'Neill Garzón');
  });

  test('toTitleCase handles HTML-like input by preserving text (escaping is handled in UI)', () => {
    const analyzer = new ZoteroDBAnalyzer();
    const raw = 'smith & sons';
    const result = analyzer.toTitleCase(raw);
    expect(result).toBe('Smith & Sons');
  });
});
