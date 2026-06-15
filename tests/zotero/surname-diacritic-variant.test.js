/**
 * Regression test: surnames that differ only by diacritics (e.g. "Martinez"
 * vs "Martínez") must be detected as variants of the same author.
 */

global.Zotero = {
  DB: { query: jest.fn(), executeTransaction: jest.fn() },
  Items: { getAsync: jest.fn().mockResolvedValue([]) },
  debug: jest.fn(),
  logError: jest.fn(),
  getMainWindow: () => ({ alert: jest.fn() })
};

const ZoteroDBAnalyzer = require('../../src/zotero/zotero-db-analyzer.js');

describe('Diacritic-only surname variants', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ZoteroDBAnalyzer();
  });

  it('detects "Martinez" and "Martínez" as the same author surname', async () => {
    const creators = [
      {
        firstName: 'Maria',
        lastName: 'Martinez',
        count: 1,
        items: [{ id: 1, title: 'Paper 1', authorFirstName: 'Maria', authorLastName: 'Martinez' }]
      },
      {
        firstName: 'Maria',
        lastName: 'Martínez',
        count: 3,
        items: [
          { id: 2, title: 'Paper 2', authorFirstName: 'Maria', authorLastName: 'Martínez' },
          { id: 3, title: 'Paper 3', authorFirstName: 'Maria', authorLastName: 'Martínez' },
          { id: 4, title: 'Paper 4', authorFirstName: 'Maria', authorLastName: 'Martínez' }
        ]
      }
    ];

    const result = await analyzer.analyzeCreators(creators);

    const surnameSuggestion = result.suggestions.find(s => s.type === 'surname');
    expect(surnameSuggestion).toBeDefined();

    const names = surnameSuggestion.variants.map(v => v.name);
    expect(names).toContain('Martinez');
    expect(names).toContain('Martínez');

    // The more frequent spelling should be recommended as the canonical form.
    expect(surnameSuggestion.primary).toBe('Martínez');
  });
});
