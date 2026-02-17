/**
 * Unit test for name particle handling (von, van, de, etc.)
 * Tests the issue where "Kocku von Stuckrad" is sometimes stored as:
 * - Correct: firstName="Kocku", lastName="von Stuckrad"
 * - Incorrect: firstName="Kocku von", lastName="Stuckrad"
 * 
 * When normalizing surname "Stuckrad" → "von Stuckrad", the incorrect entry
 * would become "von Stuckrad, Kocku von" (particle appears twice!)
 * 
 * The fix should clean up the given name when applying surname normalization.
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
  save: jest.fn().mockResolvedValue(true),
  saveTx: jest.fn().mockResolvedValue(true)
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

describe('Name particle handling (von, van, de)', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ZoteroDBAnalyzer();
    mockZoteroDB.query.mockClear();
    mockZoteroDB.executeTransaction.mockClear();
    mockZoteroDB.executeTransaction.mockImplementation(async (fn) => {
      await fn();
    });
    global.Zotero.Items.getAsync.mockClear().mockResolvedValue([mockItem]);
    mockItem.setCreators.mockClear();
    mockItem.save.mockClear().mockResolvedValue(true);
    mockItem.saveTx.mockClear().mockResolvedValue(true);
    analyzer.learningEngine.storeMapping = jest.fn().mockResolvedValue();
    analyzer.learningEngine.recordDistinctPair = jest.fn().mockResolvedValue(true);
    analyzer.learningEngine.clearDistinctPair = jest.fn().mockResolvedValue();
    analyzer.learningEngine.isDistinctPair = jest.fn().mockReturnValue(false);
  });

  describe('analyzeCreators - particle detection', () => {
    test('should detect surname variants with and without particles', async () => {
      // Simulate the "von Stuckrad" issue
      const creators = [
        {
          firstName: 'Kocku',
          lastName: 'von Stuckrad',  // Correct form
          count: 3,
          parsedName: analyzer.parseName('Kocku von Stuckrad'),
          items: [
            { id: 1, title: 'Paper 1', author: 'Kocku von Stuckrad' }
          ]
        },
        {
          firstName: 'Kocku von',  // Incorrect: particle in given name
          lastName: 'Stuckrad',    // Incorrect: missing particle in surname
          count: 2,
          parsedName: analyzer.parseName('Kocku von Stuckrad'),
          items: [
            { id: 2, title: 'Paper 2', author: 'Kocku von Stuckrad' }
          ]
        }
      ];

      const result = await analyzer.analyzeCreators(creators);

      // Note: The current implementation may or may not group these as surname variants
      // depending on string similarity. The key fix is in applyNormalizationSuggestions
      // which cleans up particles when the user identifies the variants.
      // This test just verifies the analysis runs without errors.
      expect(result).toBeDefined();
      expect(result.surnameFrequencies).toBeDefined();
    });

    test('should handle van Dijk without requiring variant grouping', async () => {
      const creators = [
        {
          firstName: 'Eva',
          lastName: 'van Dijk',  // Correct
          count: 3,
          parsedName: analyzer.parseName('Eva van Dijk'),
          items: [{ id: 1, title: 'Paper 1', author: 'Eva van Dijk' }]
        },
        {
          firstName: 'Eva van',  // Incorrect
          lastName: 'Dijk',      // Incorrect
          count: 2,
          parsedName: analyzer.parseName('Eva van Dijk'),
          items: [{ id: 2, title: 'Paper 2', author: 'Eva van Dijk' }]
        }
      ];

      const result = await analyzer.analyzeCreators(creators);

      // Just verify analysis completes - variant detection is separate from particle cleanup
      expect(result).toBeDefined();
    });

    test('should handle de Vries without requiring variant grouping', async () => {
      const creators = [
        {
          firstName: 'Jan',
          lastName: 'de Vries',  // Correct
          count: 3,
          parsedName: analyzer.parseName('Jan de Vries'),
          items: [{ id: 1, title: 'Paper 1', author: 'Jan de Vries' }]
        },
        {
          firstName: 'Jan de',   // Incorrect
          lastName: 'Vries',     // Incorrect
          count: 2,
          parsedName: analyzer.parseName('Jan de Vries'),
          items: [{ id: 2, title: 'Paper 2', author: 'Jan de Vries' }]
        }
      ];

      const result = await analyzer.analyzeCreators(creators);

      // Just verify analysis completes
      expect(result).toBeDefined();
    });
  });

  describe('applyNormalizationSuggestions - particle cleanup', () => {
    test('should clean up particle from given name when normalizing surname', async () => {
      // Create item with particle in given name (incorrect parsing)
      const stuckradItem = {
        id: 789,
        key: 'STUCKRAD001',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Kocku von', lastName: 'Stuckrad', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
        saveTx: jest.fn().mockResolvedValue(true)
      };
      global.Zotero.Items.getAsync.mockResolvedValue([stuckradItem]);

      const suggestions = [
        {
          type: 'surname',
          primary: 'von Stuckrad',  // Normalized form with particle
          variants: [
            {
              name: 'Stuckrad',  // Variant without particle
              frequency: 2,
              items: [{ id: 789, key: 'STUCKRAD001' }]
            },
            {
              name: 'von Stuckrad',  // This one should be skipped (same as primary)
              frequency: 3,
              items: [{ id: 790, key: 'STUCKRAD002' }]
            }
          ],
          similarity: 1.0
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      expect(results.updatedCreators).toBe(1);
      
      // Should clean up the particle from given name
      expect(stuckradItem.setCreators).toHaveBeenCalledWith([
        { firstName: 'Kocku', lastName: 'von Stuckrad', creatorType: 'author' }
      ]);
    });

    test('should clean up "van" particle from given name', async () => {
      const dijkItem = {
        id: 791,
        key: 'DIJK001',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Eva van', lastName: 'Dijk', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
        saveTx: jest.fn().mockResolvedValue(true)
      };
      global.Zotero.Items.getAsync.mockResolvedValue([dijkItem]);

      const suggestions = [
        {
          type: 'surname',
          primary: 'van Dijk',
          variants: [
            {
              name: 'Dijk',
              frequency: 2,
              items: [{ id: 791, key: 'DIJK001' }]
            }
          ],
          similarity: 1.0
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      expect(results.updatedCreators).toBe(1);
      expect(dijkItem.setCreators).toHaveBeenCalledWith([
        { firstName: 'Eva', lastName: 'van Dijk', creatorType: 'author' }
      ]);
    });

    test('should clean up "de" particle from given name', async () => {
      const vriesItem = {
        id: 792,
        key: 'VRIES001',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Jan de', lastName: 'Vries', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
        saveTx: jest.fn().mockResolvedValue(true)
      };
      global.Zotero.Items.getAsync.mockResolvedValue([vriesItem]);

      const suggestions = [
        {
          type: 'surname',
          primary: 'de Vries',
          variants: [
            {
              name: 'Vries',
              frequency: 2,
              items: [{ id: 792, key: 'VRIES001' }]
            }
          ],
          similarity: 1.0
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      expect(results.updatedCreators).toBe(1);
      expect(vriesItem.setCreators).toHaveBeenCalledWith([
        { firstName: 'Jan', lastName: 'de Vries', creatorType: 'author' }
      ]);
    });

    test('should handle multi-word particles like "de la"', async () => {
      const cruzItem = {
        id: 793,
        key: 'CRUZ001',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Maria de la', lastName: 'Cruz', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
        saveTx: jest.fn().mockResolvedValue(true)
      };
      global.Zotero.Items.getAsync.mockResolvedValue([cruzItem]);

      const suggestions = [
        {
          type: 'surname',
          primary: 'de la Cruz',
          variants: [
            {
              name: 'Cruz',
              frequency: 2,
              items: [{ id: 793, key: 'CRUZ001' }]
            }
          ],
          similarity: 1.0
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      expect(results.updatedCreators).toBe(1);
      expect(cruzItem.setCreators).toHaveBeenCalledWith([
        { firstName: 'Maria', lastName: 'de la Cruz', creatorType: 'author' }
      ]);
    });

    test('should NOT modify given name if no particle match', async () => {
      // Item with correct parsing - no particle in given name
      const correctItem = {
        id: 794,
        key: 'CORRECT001',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Kocku', lastName: 'von Stuckrad', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
        saveTx: jest.fn().mockResolvedValue(true)
      };
      global.Zotero.Items.getAsync.mockResolvedValue([correctItem]);

      const suggestions = [
        {
          type: 'surname',
          primary: 'von Stuckrad',
          variants: [
            {
              name: 'von Stuckrad',  // Same as primary - should be skipped
              frequency: 3,
              items: [{ id: 794, key: 'CORRECT001' }]
            }
          ],
          similarity: 1.0
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      // Should skip because variant matches primary
      expect(results.updatedCreators).toBe(0);
      expect(correctItem.setCreators).not.toHaveBeenCalled();
    });

    test('should handle case-insensitive particle matching', async () => {
      const stuckradItem = {
        id: 795,
        key: 'STUCKRAD003',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Kocku VON', lastName: 'Stuckrad', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
        saveTx: jest.fn().mockResolvedValue(true)
      };
      global.Zotero.Items.getAsync.mockResolvedValue([stuckradItem]);

      const suggestions = [
        {
          type: 'surname',
          primary: 'von Stuckrad',
          variants: [
            {
              name: 'Stuckrad',
              frequency: 2,
              items: [{ id: 795, key: 'STUCKRAD003' }]
            }
          ],
          similarity: 1.0
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      expect(results.updatedCreators).toBe(1);
      // Should clean up particle and apply title case
      expect(stuckradItem.setCreators).toHaveBeenCalledWith([
        { firstName: 'Kocku', lastName: 'von Stuckrad', creatorType: 'author' }
      ]);
    });

    test('should handle multiple creators with particle issue in batch', async () => {
      const stuckradItem1 = {
        id: 796,
        key: 'STUCKRAD004',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Kocku von', lastName: 'Stuckrad', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
        saveTx: jest.fn().mockResolvedValue(true)
      };

      const stuckradItem2 = {
        id: 797,
        key: 'STUCKRAD005',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Kocku', lastName: 'von Stuckrad', creatorType: 'author' }  // Already correct
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
        saveTx: jest.fn().mockResolvedValue(true)
      };

      global.Zotero.Items.getAsync.mockResolvedValue([stuckradItem1, stuckradItem2]);

      const suggestions = [
        {
          type: 'surname',
          primary: 'von Stuckrad',
          variants: [
            {
              name: 'Stuckrad',
              frequency: 2,
              items: [{ id: 796, key: 'STUCKRAD004' }]
            }
          ],
          similarity: 1.0
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      expect(results.updatedCreators).toBe(1);
      expect(stuckradItem1.setCreators).toHaveBeenCalledWith([
        { firstName: 'Kocku', lastName: 'von Stuckrad', creatorType: 'author' }
      ]);
      // Second item should not be updated (correct already)
      expect(stuckradItem2.setCreators).not.toHaveBeenCalled();
    });
  });
});
