/**
 * Unit test for the "and Friston" item display issue
 */

const mockZoteroDB = {
  query: jest.fn(),
  executeTransaction: jest.fn()
};

const mockItem = {
  id: 123,
  key: 'ABC123',
  getCreators: jest.fn().mockReturnValue([
    { firstName: 'John', lastName: 'Smyth', creatorType: 'author' }
  ]),
  setCreators: jest.fn(),
  save: jest.fn().mockResolvedValue(true)
};

global.Zotero = {
  DB: mockZoteroDB,
  Items: {
    getAsync: jest.fn().mockResolvedValue([mockItem])
  },
  debug: jest.fn(),
  logError: jest.fn(),
  getMainWindow: () => ({
    alert: jest.fn()
  })
};

const ZoteroDBAnalyzer = require('../../src/zotero/zotero-db-analyzer.js');

describe('Malformed surname "and Friston" handling', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ZoteroDBAnalyzer();
  });

  it('should find items for "and Friston" variant', async () => {
    // Create creators with "Karl and Friston" (malformed) and "Karl Friston" (correct)
    const creators = [
      {
        firstName: 'Karl',
        lastName: 'and Friston',  // Malformed entry
        count: 1,
        parsedName: analyzer.parseName('Karl and Friston'),
        items: [
          { id: 1, title: 'Paper 1', author: 'Karl and Friston', authorFirstName: 'Karl', authorLastName: 'and Friston' }
        ]
      },
      {
        firstName: 'Karl',
        lastName: 'Friston',  // Correct entry
        count: 3,
        parsedName: analyzer.parseName('Karl Friston'),
        items: [
          { id: 2, title: 'Paper 2', author: 'Karl Friston', authorFirstName: 'Karl', authorLastName: 'Friston' },
          { id: 3, title: 'Paper 3', author: 'Karl Friston', authorFirstName: 'Karl', authorLastName: 'Friston' },
          { id: 4, title: 'Paper 4', author: 'Karl Friston', authorFirstName: 'Karl', authorLastName: 'Friston' }
        ]
      }
    ];

    const result = await analyzer.analyzeCreators(creators);

    // Find the surname variant suggestion
    const surnameSuggestion = result.suggestions.find(s => s.type === 'surname');

    expect(surnameSuggestion).toBeDefined();

    // Find "and Friston" variant
    const andFristonVariant = surnameSuggestion.variants.find(v => v.name === 'and Friston');
    const fristonVariant = surnameSuggestion.variants.find(v => v.name === 'Friston');

    // Both variants should have items
    expect(andFristonVariant).toBeDefined();
    expect(andFristonVariant.items).toBeDefined();
    expect(andFristonVariant.items.length).toBe(1);

    expect(fristonVariant).toBeDefined();
    expect(fristonVariant.items).toBeDefined();
    expect(fristonVariant.items.length).toBe(3);

    // Verify item content
    expect(andFristonVariant.items[0].title).toBe('Paper 1');
    expect(andFristonVariant.items[0].author).toBe('Karl and Friston');

    // Check that the first item shows "Karl and Friston" as author
    expect(fristonVariant.items[0].author).toBe('Karl Friston');
  });

  it('should serialize and deserialize items correctly for dialog', async () => {
    const creators = [
      {
        firstName: 'Karl',
        lastName: 'and Friston',
        count: 1,
        parsedName: analyzer.parseName('Karl and Friston'),
        items: [
          { id: 1, title: 'Paper 1', author: 'Karl and Friston', authorFirstName: 'Karl', authorLastName: 'and Friston' }
        ]
      },
      {
        firstName: 'Karl',
        lastName: 'Friston',
        count: 3,
        parsedName: analyzer.parseName('Karl Friston'),
        items: [
          { id: 2, title: 'Paper 2', author: 'Karl Friston', authorFirstName: 'Karl', authorLastName: 'Friston' }
        ]
      }
    ];

    const result = await analyzer.analyzeCreators(creators);

    // Simulate JSON serialization/deserialization (as done when passing to dialog)
    const jsonString = JSON.stringify(result);
    const parsed = JSON.parse(jsonString);

    const andFristonVariant = parsed.suggestions[0].variants.find(v => v.name === 'and Friston');

    // After JSON round-trip, items should still be present
    expect(andFristonVariant).toBeDefined();
    expect(andFristonVariant.items).toBeDefined();
    expect(andFristonVariant.items.length).toBe(1);
    expect(andFristonVariant.items[0].title).toBe('Paper 1');
    expect(andFristonVariant.items[0].author).toBe('Karl and Friston');
  });
});
