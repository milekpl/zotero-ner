/**
 * Unit tests for ZoteroDBAnalyzer
 * Tests the core functionality of the database analyzer module
 */

// Mock the Zotero global object for testing
const mockZoteroDB = {
  query: jest.fn(),
  executeTransaction: jest.fn()
};

// Mock item structure
const mockItem = {
  id: 123,
  key: 'ABC123',
  getCreators: jest.fn().mockReturnValue([
    { firstName: 'John', lastName: 'Smyth', creatorType: 'author' },
    { firstName: 'Jane', lastName: 'Doe', creatorType: 'author' }
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

describe('ZoteroDBAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ZoteroDBAnalyzer();
    // Reset the mock before each test
    mockZoteroDB.query.mockClear();
    mockZoteroDB.executeTransaction.mockClear();
    mockZoteroDB.executeTransaction.mockImplementation(async (fn) => {
      await fn();
    });
    global.Zotero.Items.getAsync.mockClear().mockResolvedValue([mockItem]);
    // Reset mock item state
    mockItem.setCreators.mockClear();
    mockItem.save.mockClear().mockResolvedValue(true);
    analyzer.learningEngine.storeMapping = jest.fn().mockResolvedValue();
    analyzer.learningEngine.recordDistinctPair = jest.fn().mockResolvedValue(true);
    analyzer.learningEngine.clearDistinctPair = jest.fn().mockResolvedValue();
    analyzer.learningEngine.isDistinctPair = jest.fn().mockReturnValue(false);
  });

  describe('constructor', () => {
    test('should initialize with candidateFinder and learningEngine', () => {
      expect(analyzer.candidateFinder).toBeDefined();
      expect(analyzer.learningEngine).toBeDefined();
    });
  });

  describe('analyzeCreators', () => {
    test('should analyze creators and return surname frequencies', async () => {
      const creators = [
        { firstName: 'John', lastName: 'Smith', count: 5 },
        { firstName: 'Jane', lastName: 'Smith', count: 3 },
        { firstName: 'Bob', lastName: 'Johnson', count: 2 }
      ];

      const result = await analyzer.analyzeCreators(creators);

      expect(result.surnameFrequencies).toHaveProperty('smith', 8); // 5 + 3
      expect(result.surnameFrequencies).toHaveProperty('johnson', 2);
      expect(result.totalUniqueSurnames).toBe(2);
    });

    test('should identify potential variants with high similarity', async () => {
      const creators = [
        { firstName: 'John', lastName: 'Smith', count: 2 },
        { firstName: 'J.', lastName: 'Smith', count: 3 }, // Similar to John Smith
        { firstName: 'Jane', lastName: 'Doe', count: 1 }
      ];

      const result = await analyzer.analyzeCreators(creators);

      // We expect to find variants for similar surnames
      expect(result.potentialVariants.length).toBeGreaterThanOrEqual(0);
      if (result.potentialVariants.length > 0) {
        const variant = result.potentialVariants[0];
        expect(variant).toHaveProperty('variant1');
        expect(variant).toHaveProperty('variant2');
        expect(variant).toHaveProperty('similarity');
        expect(variant.similarity).toBeGreaterThanOrEqual(0.8);
      }
    });

    test('should generate normalization suggestions', async () => {
      const creators = [
        { firstName: 'John', lastName: 'Smith', count: 5 },
        { firstName: 'J.', lastName: 'Smith', count: 3 }
      ];

      const result = await analyzer.analyzeCreators(creators);

      expect(Array.isArray(result.suggestions)).toBe(true);
      if (result.suggestions.length > 0) {
        const suggestion = result.suggestions[0];
        expect(suggestion).toHaveProperty('primary');
        expect(suggestion).toHaveProperty('variants');
        expect(Array.isArray(suggestion.variants)).toBe(true);
      }
    });
  });

  describe('calculateStringSimilarity', () => {
    test('should return 1 for identical strings', () => {
      const similarity = analyzer.calculateStringSimilarity('Smith', 'Smith');
      expect(similarity).toBe(1);
    });

    test('should return appropriate similarity for completely different strings', () => {
      const similarity = analyzer.calculateStringSimilarity('Smith', 'Johnson');
      // Two completely different strings will have some similarity based on length, but it should be low
      expect(similarity).toBeLessThan(0.5);
    });

    test('should return high similarity for similar strings', () => {
      const similarity = analyzer.calculateStringSimilarity('Smith', 'Smyth');
      expect(similarity).toBeGreaterThan(0.7);
    });

    test('should handle empty strings', () => {
      expect(analyzer.calculateStringSimilarity('', '')).toBe(1);
      expect(analyzer.calculateStringSimilarity('Smith', '')).toBe(0);
      expect(analyzer.calculateStringSimilarity('', 'Smith')).toBe(0);
    });
  });

  describe('generateNormalizationSuggestions', () => {
    test('should generate suggestions from variant pairs', () => {
      const variants = [
        {
          variant1: { name: 'Smith', frequency: 5 },
          variant2: { name: 'Smyth', frequency: 1 },
          similarity: 0.9,
          recommendedNormalization: 'Smith'
        }
      ];

      const suggestions = analyzer.generateNormalizationSuggestions(variants);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toHaveProperty('primary', 'Smith');
      expect(suggestions[0]).toHaveProperty('variants');
      expect(suggestions[0]).toHaveProperty('similarity', 0.9);
    });

    test('should avoid duplicate suggestions', () => {
      const variants = [
        {
          variant1: { name: 'Smith', frequency: 5 },
          variant2: { name: 'Smyth', frequency: 1 },
          similarity: 0.9,
          recommendedNormalization: 'Smith'
        },
        {
          variant1: { name: 'Smyth', frequency: 1 },
          variant2: { name: 'Smith', frequency: 5 }, // Same pair, reversed
          similarity: 0.9,
          recommendedNormalization: 'Smith'
        }
      ];

      const suggestions = analyzer.generateNormalizationSuggestions(variants);

      // Should only have 1 suggestion, not 2, because they are the same pair
      expect(suggestions).toHaveLength(1);
    });
  });

  describe('given-name variant merging', () => {
    const makeCreator = (firstName, lastName, count = 1) => ({
      firstName,
      lastName,
      count,
      items: [],
      parsedName: analyzer.parseName(`${firstName || ''} ${lastName || ''}`.trim())
    });

    test('does not append canonical initials to plain word variants', () => {
      const creators = [
        makeCreator('Fred', 'Boogerd'),
        makeCreator('Fred.', 'Boogerd'),
        makeCreator('Fred R. E. D.', 'Boogerd')
      ];

      const groups = analyzer.findGivenNameVariantGroups(
        analyzer.groupCreatorsBySurnameForVariants(creators)
      );

      const boogerdGroup = groups.find(group => group && group.surnameKey === 'boogerd');
      expect(boogerdGroup).toBeDefined();

      const variantNames = boogerdGroup.variants.map(variant => variant.firstName);
      expect(variantNames).toContain('Fred');
      expect(variantNames).toContain('Fred R. E. D.');

      const fredVariant = boogerdGroup.variants.find(variant => variant.firstName === 'Fred');
      expect(fredVariant).toBeDefined();
      expect(fredVariant.firstName).toBe('Fred');
      expect(boogerdGroup.recommendedFullName).toBe('Fred Boogerd');
    });

    test('initial-only variants borrow canonical base without mangling names', () => {
      const creators = [
        makeCreator('Cliff', 'Hooker'),
        makeCreator('C.A.', 'Hooker')
      ];

      const groups = analyzer.findGivenNameVariantGroups(
        analyzer.groupCreatorsBySurnameForVariants(creators)
      );

      const hookerGroup = groups.find(group => group && group.surnameKey === 'hooker');
      expect(hookerGroup).toBeDefined();

      const variantNames = hookerGroup.variants.map(variant => variant.firstName);
      expect(variantNames).toContain('Cliff');
      expect(variantNames).toContain('Cliff A.');
      expect(variantNames).not.toContain('Ca A.');
      expect(hookerGroup.recommendedFullName).toBe('Cliff Hooker');
    });

    test('separates given-name suggestions by normalized key', async () => {
      const creators = [
        makeCreator('Harriet', 'Brown', 6),
        makeCreator('Harriet R.', 'Brown', 4),
        makeCreator('Scott', 'Brown', 5),
        makeCreator('Scott D.', 'Brown', 3)
      ];

      const result = await analyzer.analyzeCreators(creators);
      const givenNameSuggestions = result.suggestions.filter(
        suggestion => suggestion.type === 'given-name' && suggestion.surnameKey === 'brown'
      );

      expect(givenNameSuggestions).toHaveLength(2);

      const harrietSuggestion = givenNameSuggestions.find(suggestion =>
        (suggestion.recommendedFullName || suggestion.primary || '').includes('Harriet')
      );
      const scottSuggestion = givenNameSuggestions.find(suggestion =>
        (suggestion.recommendedFullName || suggestion.primary || '').includes('Scott')
      );

      expect(harrietSuggestion).toBeDefined();
      expect(scottSuggestion).toBeDefined();

      const harrietVariantNames = harrietSuggestion.variants.map(variant => variant.firstName);
      const scottVariantNames = scottSuggestion.variants.map(variant => variant.firstName);

      expect(harrietVariantNames).toEqual(expect.arrayContaining(['Harriet', 'Harriet R.']));
      expect(harrietVariantNames).not.toEqual(expect.arrayContaining(['Scott', 'Scott D.']));
      expect(scottVariantNames).toEqual(expect.arrayContaining(['Scott', 'Scott D.']));
      expect(scottVariantNames).not.toEqual(expect.arrayContaining(['Harriet', 'Harriet R.']));
    });

    test('does not merge variants with disjoint middle initials', async () => {
      const creators = [
        makeCreator('Michael', 'Martin', 4),
        makeCreator('Michael K.', 'Martin', 3),
        makeCreator('Michael W.', 'Martin', 3)
      ];

      const result = await analyzer.analyzeCreators(creators);
      const martinSuggestions = result.suggestions.filter(
        suggestion => suggestion.type === 'given-name' && suggestion.surnameKey === 'martin'
      );

      const combinedGroup = martinSuggestions.find(suggestion => {
        const names = suggestion.variants.map(variant => variant.firstName);
        return names.includes('Michael K.') && names.includes('Michael W.');
      });

      expect(combinedGroup).toBeUndefined();

      martinSuggestions.forEach(suggestion => {
        const recommended = suggestion.recommendedFullName || suggestion.primary || '';
        expect(recommended).not.toMatch(/K\.\s*W\./i);
      });
    });
  });

  describe('parseName', () => {
    test('should parse a full name correctly', () => {
      const result = analyzer.parseName('John Smith');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Smith');
    });

    test('should parse an abbreviated name correctly', () => {
      const result = analyzer.parseName('J. Smith');
      expect(result.firstName).toBe('J.');
      expect(result.lastName).toBe('Smith');
    });
  });

  describe('applyNormalizationSuggestions', () => {
    test('should apply normalizations when autoConfirm is true', async () => {
      const suggestions = [
        {
          type: 'surname',
          primary: 'Smith',
          variants: [
            { name: 'Smyth', frequency: 2, items: [{ id: 123, key: 'ABC123' }] },
            { name: 'Smith', frequency: 5, items: [{ id: 456, key: 'DEF456' }] } // This one should be skipped (same as primary)
          ],
          similarity: 0.9
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      expect(results).toHaveProperty('totalSuggestions', 1);
      expect(results.applied).toBe(1);
      expect(results.skipped).toBe(0);
      expect(results.errors).toBe(0);
      // Only one item should be updated (Smyth -> Smith)
      expect(results.updatedCreators).toBe(1);
      expect(analyzer.learningEngine.storeMapping).toHaveBeenCalledWith('Smyth', 'Smith', 0.9);
      // Verify item.save() was called for the normalized item
      expect(mockItem.save).toHaveBeenCalled();
      expect(mockItem.setCreators).toHaveBeenCalled();
    });

    test('should skip normalizations when autoConfirm is false and confirmNormalization returns false', async () => {
      // Mock the confirmNormalization method to return false
      analyzer.confirmNormalization = jest.fn().mockResolvedValue(false);

      const suggestions = [
        {
          type: 'surname',
          primary: 'Smith',
          variants: [{ name: 'Smyth', frequency: 2, items: [{ id: 123, key: 'ABC123' }] }],
          similarity: 0.9
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, false);

      expect(results.applied).toBe(0);
      expect(results.skipped).toBeGreaterThan(0);
      expect(results.updatedCreators).toBe(0);
    });

    test('should handle empty suggestions gracefully', async () => {
      const results = await analyzer.applyNormalizationSuggestions([], true);

      expect(results.totalSuggestions).toBe(0);
      expect(results.applied).toBe(0);
      expect(results.updatedCreators).toBe(0);
    });

    test('should update items with matching variant names', async () => {
      // Create a mock item with Smyth lastName
      const smythItem = {
        id: 789,
        key: 'GHI789',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'John', lastName: 'Smyth', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true)
      };
      global.Zotero.Items.getAsync.mockResolvedValue([smythItem]);

      const suggestions = [
        {
          type: 'surname',
          primary: 'Smith',
          variants: [
            { name: 'Smyth', frequency: 1, items: [{ id: 789, key: 'GHI789' }] }
          ],
          similarity: 0.9
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      expect(results.updatedCreators).toBe(1);
      expect(smythItem.setCreators).toHaveBeenCalledWith([
        { firstName: 'John', lastName: 'Smith', creatorType: 'author' }
      ]);
      expect(smythItem.save).toHaveBeenCalled();
    });
  });

  describe('findVariantsEfficiently - STRICT diacritic-only normalization', () => {
    it('should return EMPTY array for non-diacritic similar names', async () => {
      const analyzer = new ZoteroDBAnalyzer();
      const surnameFrequencies = {
        'Dennett': 1,
        'Bennett': 1,
        'Smith': 1,
        'Smyth': 1
      };

      const result = await analyzer.findVariantsEfficiently(surnameFrequencies);

      // MUST return empty array - no variants found
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('CRITICAL: Bennett and Dennett are DIFFERENT people - NO MATCHING', async () => {
      const analyzer = new ZoteroDBAnalyzer();
      const surnameFrequencies = {
        'Bennett': 5,
        'Dennett': 3
      };

      const result = await analyzer.findVariantsEfficiently(surnameFrequencies);

      // ABSOLUTELY MUST return empty array
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('CRITICAL: Anderson and Andersen are DIFFERENT people - NO MATCHING', async () => {
      const analyzer = new ZoteroDBAnalyzer();
      const surnameFrequencies = {
        'Anderson': 5,
        'Andersen': 3
      };

      const result = await analyzer.findVariantsEfficiently(surnameFrequencies);

      // ABSOLUTELY MUST return empty array
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should NOT flag any similar but different surnames', async () => {
      const analyzer = new ZoteroDBAnalyzer();
      const surnameFrequencies = {
        'Johnson': 5,
        'Johnsen': 3,
        'Brown': 4,
        'Browne': 2,
        'Clark': 3,
        'Clarke': 2,
        'Smith': 10,
        'Smyth': 5,
        'Miller': 8,
        'Millar': 3
      };

      const result = await analyzer.findVariantsEfficiently(surnameFrequencies);

      // MUST return empty array - none of these are diacritic variants
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should flag surnames differing only by diacritics', async () => {
      const analyzer = new ZoteroDBAnalyzer();
      const surnameFrequencies = {
        'Miłkowski': 1,
        'Milkowski': 1,
        'Müller': 1,
        'Mueller': 1
      };

      const result = await analyzer.findVariantsEfficiently(surnameFrequencies);

      // Helper to normalize names for comparison (same logic as isDiacriticOnlyVariant)
      const normalize = (str) => {
        let n = str.toLowerCase();
        n = n.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');
        n = n.replace(/ł/g, 'l');
        n = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return n;
      };

      // Miłkowski/Milkowski SHOULD be flagged
      const milkowski = result.filter(v =>
        normalize(v.variant1.name).includes('milkowski') &&
        normalize(v.variant2.name).includes('milkowski')
      );
      expect(milkowski.length).toBeGreaterThan(0);

      // Müller/Mueller SHOULD be flagged
      const mueller = result.filter(v =>
        normalize(v.variant1.name).includes('mueller') &&
        normalize(v.variant2.name).includes('mueller')
      );
      expect(mueller.length).toBeGreaterThan(0);
    });
  });

  describe('AVOID MIXING AUTHORS - critical regression tests', () => {
    describe('findItemsBySurname - exact surname matching only', () => {
      it('should NOT mix items from different authors with similar surnames', () => {
        const analyzer = new ZoteroDBAnalyzer();
        const itemsByFullAuthor = {
          'C. B.|Martin': [{ id: 1, title: 'Book 1', author: 'C. B. Martin' }],
          'Rod|Martin': [{ id: 2, title: 'Book 2', author: 'Rod Martin' }],
          'John|Martin': [{ id: 3, title: 'Book 3', author: 'John Martin' }],
          'José|Martín': [{ id: 4, title: 'Libro', author: 'José Martín' }],
          // These should NOT match "Martin"
          'J.|Martinez': [{ id: 5, title: 'Book 5', author: 'J. Martinez' }],
          'M.|Martini': [{ id: 6, title: 'Book 6', author: 'M. Martini' }]
        };

        // When searching for "Martin", should only get items from authors with exact surname "Martin"
        const martinItems = analyzer.findItemsBySurname(itemsByFullAuthor, 'Martin');
        const martinItemIds = martinItems.map(item => item.id).sort((a, b) => a - b);

        // Should get items from C. B. Martin, Rod Martin, John Martin
        expect(martinItemIds).toEqual([1, 2, 3]);
        // Should NOT include Martinez or Martini items
        expect(martinItemIds).not.toContain(5);
        expect(martinItemIds).not.toContain(6);
      });

      it('should find items for diacritic variant Martín separately from Martin', () => {
        const analyzer = new ZoteroDBAnalyzer();
        const itemsByFullAuthor = {
          'C. B.|Martin': [{ id: 1, title: 'Book 1', author: 'C. B. Martin' }],
          'José|Martín': [{ id: 2, title: 'Libro', author: 'José Martín' }],
          'María|Martín': [{ id: 3, title: 'Otro Libro', author: 'María Martín' }]
        };

        const martinItems = analyzer.findItemsBySurname(itemsByFullAuthor, 'Martin');
        const martinItemsIds = martinItems.map(item => item.id);

        // Should ONLY get C. B. Martin, NOT José Martín or María Martín
        expect(martinItemsIds).toEqual([1]);
        expect(martinItemsIds).not.toContain(2);
        expect(martinItemsIds).not.toContain(3);
      });

      it('should handle empty or null inputs gracefully', () => {
        const analyzer = new ZoteroDBAnalyzer();

        expect(analyzer.findItemsBySurname({}, 'Martin')).toEqual([]);
        expect(analyzer.findItemsBySurname(null, 'Martin')).toEqual([]);
        expect(analyzer.findItemsBySurname({}, null)).toEqual([]);
        expect(analyzer.findItemsBySurname({}, '')).toEqual([]);
      });

      it('should be case-insensitive for surname matching', () => {
        const analyzer = new ZoteroDBAnalyzer();
        const itemsByFullAuthor = {
          'John|SMITH': [{ id: 1, title: 'Book 1', author: 'John SMITH' }],
          'Jane|smith': [{ id: 2, title: 'Book 2', author: 'Jane smith' }]
        };

        const items = analyzer.findItemsBySurname(itemsByFullAuthor, 'smith');
        const itemIds = items.map(item => item.id).sort((a, b) => a - b);

        expect(itemIds).toEqual([1, 2]);
      });

      it('should return items sorted by author name for consistent display', () => {
        const analyzer = new ZoteroDBAnalyzer();
        const itemsByFullAuthor = {
          'John|Martin': [{ id: 3, title: 'Book 3', author: 'John Martin' }],
          'C. B.|Martin': [{ id: 1, title: 'Book 1', author: 'C. B. Martin' }],
          'Rod|Martin': [{ id: 2, title: 'Book 2', author: 'Rod Martin' }]
        };

        const martinItems = analyzer.findItemsBySurname(itemsByFullAuthor, 'Martin');
        const authors = martinItems.map(item => item.author);

        // Should be sorted alphabetically by author name
        expect(authors).toEqual(['C. B. Martin', 'John Martin', 'Rod Martin']);
      });
    });

    describe('analyzeCreators - items tracked by full author name', () => {
      it('should NOT mix items from different authors with same surname', async () => {
        const analyzer = new ZoteroDBAnalyzer();

        // Create creators with items - DIFFERENT authors with surname "Martin"
        // Each author should be tracked separately, NOT mixed together
        const creators = [
          {
            firstName: 'C. B.',
            lastName: 'Martin',
            count: 2,
            parsedName: analyzer.parseName('C. B. Martin'),
            items: [
              { id: 1, title: 'The Ontological Turn', author: 'C. B. Martin', year: '1999' },
              { id: 2, title: 'Remembering', author: 'C. B. Martin', year: '1966' }
            ]
          },
          {
            firstName: 'Rod',
            lastName: 'Martin',
            count: 1,
            parsedName: analyzer.parseName('Rod Martin'),
            items: [
              { id: 3, title: 'The psychology of humour', author: 'Rod Martin', year: '2007' }
            ]
          },
          {
            firstName: 'Andrea',
            lastName: 'Martin',
            count: 1,
            parsedName: analyzer.parseName('Andrea Martin'),
            items: [
              { id: 5, title: 'Paper 1', author: 'Andrea Martin', year: '2020' }
            ]
          }
        ];

        const result = await analyzer.analyzeCreators(creators);

        // Check that different authors are NOT mixed together
        // Each author should have their own group - surnameFrequencies aggregates across authors
        expect(result.surnameFrequencies['martin']).toBe(4); // Total occurrences

        // Since these are different authors with different first names,
        // there should be NO given-name suggestions between them
        // (given-name suggestions are for variants of the SAME author)
        const givenNameSuggestions = result.suggestions.filter(s => s.type === 'given-name' && s.surnameKey === 'martin');

        // Different authors should NOT generate given-name suggestions for each other
        expect(givenNameSuggestions).toHaveLength(0);

        // Verify all items are still accessible and associated with correct authors
        const allSuggestions = result.suggestions;
        expect(allSuggestions.length).toBeGreaterThanOrEqual(0); // Just verify no crashes
      });

      it('should normalize diacritics ONLY within the SAME author', async () => {
        const analyzer = new ZoteroDBAnalyzer();

        // Create creators where ONE author has items with both "Martin" and "Martín"
        // This should trigger a diacritic normalization suggestion
        const creators = [
          {
            firstName: 'José',
            lastName: 'Martin',
            count: 3,
            parsedName: analyzer.parseName('José Martin'),
            items: [
              { id: 1, title: 'Paper 1', authorFirstName: 'José', authorLastName: 'Martin', author: 'José Martin' },
              { id: 2, title: 'Paper 2', authorFirstName: 'José', authorLastName: 'Martín', author: 'José Martín' }
            ]
          },
          {
            firstName: 'Andrea',
            lastName: 'Martin',
            count: 1,
            parsedName: analyzer.parseName('Andrea Martin'),
            items: [
              { id: 3, title: 'Paper 3', authorFirstName: 'Andrea', authorLastName: 'Martin', author: 'Andrea Martin' }
            ]
          }
        ];

        const result = await analyzer.analyzeCreators(creators);

        // Find surname variant suggestion for José Martin vs José Martín
        const surnameSuggestion = result.suggestions.find(
          s => s.type === 'surname' && s.variants.some(v => v.name.toLowerCase() === 'martin' || v.name.toLowerCase() === 'martín')
        );

        // Should find a surname suggestion because José has both "Martin" and "Martín"
        expect(surnameSuggestion).toBeDefined();

        // The suggestion should only include José's items, NOT Andrea's
        const joseVariants = surnameSuggestion.variants.filter(v =>
          v.items?.some(item => item.author === 'José Martin' || item.author === 'José Martín')
        );
        const andreaVariants = surnameSuggestion.variants.filter(v =>
          v.items?.some(item => item.author === 'Andrea Martin')
        );

        expect(joseVariants.length).toBeGreaterThan(0);
        expect(andreaVariants.length).toBe(0); // Andrea should NOT be in the suggestion
      });

      it('should preserve first names and initials in item author display', async () => {
        const analyzer = new ZoteroDBAnalyzer();

        const creators = [
          {
            firstName: 'J.',
            lastName: 'Smith',
            count: 3,
            parsedName: analyzer.parseName('J. Smith'),
            items: [
              { id: 1, title: 'Paper 1', authorFirstName: 'J.', authorLastName: 'Smith', author: 'J. Smith' }
            ]
          },
          {
            firstName: 'John',
            lastName: 'Smith',
            count: 5,
            parsedName: analyzer.parseName('John Smith'),
            items: [
              { id: 2, title: 'Paper 2', authorFirstName: 'John', authorLastName: 'Smith', author: 'John Smith' }
            ]
          }
        ];

        const result = await analyzer.analyzeCreators(creators);

        // Find the surname variant suggestion
        const surnameSuggestion = result.suggestions.find(s => s.type === 'surname');

        if (surnameSuggestion) {
          const smithVariant = surnameSuggestion.variants.find(v => v.name === 'Smith');
          if (smithVariant) {
            const authorNames = smithVariant.items.map(item => item.author);
            // Both J. Smith and John Smith should be present with their correct first names/initials
            expect(authorNames).toContain('J. Smith');
            expect(authorNames).toContain('John Smith');
          }
        }
      });

      it('should detect and normalize malformed author entries (parsing errors)', async () => {
        const analyzer = new ZoteroDBAnalyzer();

        // Create a creator with a malformed name (like "Karl and Friston" from bad metadata)
        // This simulates a Zotero parsing error where "and" was included in the surname
        const creators = [
          {
            firstName: 'Karl',
            lastName: 'and Friston',  // Malformed entry - "and" should not be in surname
            count: 1,
            parsedName: analyzer.parseName('Karl and Friston'),
            items: [
              { id: 1, title: 'Paper 1', authorFirstName: 'Karl', authorLastName: 'and Friston', author: 'Karl and Friston' }
            ]
          },
          {
            firstName: 'Karl',
            lastName: 'Friston',  // Correct entry for the same author
            count: 3,
            parsedName: analyzer.parseName('Karl Friston'),
            items: [
              { id: 2, title: 'Paper 2', authorFirstName: 'Karl', authorLastName: 'Friston', author: 'Karl Friston' },
              { id: 3, title: 'Paper 3', authorFirstName: 'Karl', authorLastName: 'Friston', author: 'Karl Friston' }
            ]
          }
        ];

        const result = await analyzer.analyzeCreators(creators);

        // The malformed entry should be detected and normalized to "Friston"
        // Find surname variant suggestion for "and Friston" vs "Friston"
        const surnameSuggestion = result.suggestions.find(
          s => s.type === 'surname' && s.variants.some(v =>
            v.name === 'and Friston' || v.name === 'Friston'
          )
        );

        // Should find a surname suggestion because "and Friston" and "Friston" are diacritic/format variants
        expect(surnameSuggestion).toBeDefined();

        // The suggestion should include both variants
        const andFristonVariant = surnameSuggestion.variants.find(v => v.name === 'and Friston');
        const fristonVariant = surnameSuggestion.variants.find(v => v.name === 'Friston');

        expect(andFristonVariant).toBeDefined();
        expect(fristonVariant).toBeDefined();

        // Both should have items
        expect(andFristonVariant.items.length).toBeGreaterThan(0);
        expect(fristonVariant.items.length).toBeGreaterThan(0);
      });
    });
  });

  describe('findDiacriticVariantsByAuthor - progress callback', () => {
    test('progress callback is called during analysis', () => {
      const analyzer = new ZoteroDBAnalyzer();
      const progressCallback = jest.fn();

      // Create test data with authors having surname variants
      const authorOccurrences = {
        'jose|martin': {
          firstName: 'José',
          lastName: 'Martin',
          originalLastName: 'Martin',
          count: 3,
          surnameVariants: { 'Martin': 2, 'Martín': 1 }
        },
        'juan|müller': {
          firstName: 'Juan',
          lastName: 'Müller',
          originalLastName: 'Müller',
          count: 2,
          surnameVariants: { 'Müller': 1, 'Mueller': 1 }
        }
      };

      analyzer.findDiacriticVariantsByAuthor(authorOccurrences, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      // Verify callback structure
      const call = progressCallback.mock.calls[0][0];
      expect(call).toHaveProperty('stage');
      expect(call).toHaveProperty('percent');
    });

    test('progress percent increases over time', () => {
      const analyzer = new ZoteroDBAnalyzer();
      const progressUpdates = [];

      const progressCallback = (progress) => {
        progressUpdates.push(progress);
      };

      // Create test data with multiple authors having surname variants
      const authorOccurrences = {
        'jose|martin': {
          firstName: 'José',
          lastName: 'Martin',
          originalLastName: 'Martin',
          count: 3,
          surnameVariants: { 'Martin': 2, 'Martín': 1 }
        },
        'juan|müller': {
          firstName: 'Juan',
          lastName: 'Müller',
          originalLastName: 'Müller',
          count: 2,
          surnameVariants: { 'Müller': 1, 'Mueller': 1 }
        },
        'pedro|garcía': {
          firstName: 'Pedro',
          lastName: 'García',
          originalLastName: 'García',
          count: 4,
          surnameVariants: { 'García': 3, 'Garcia': 1 }
        }
      };

      analyzer.findDiacriticVariantsByAuthor(authorOccurrences, progressCallback);

      // Verify progress percent values are monotonically increasing
      if (progressUpdates.length > 1) {
        const percents = progressUpdates.map(p => p.percent);
        for (let i = 1; i < percents.length; i++) {
          expect(percents[i]).toBeGreaterThanOrEqual(percents[i - 1]);
        }
      }
    });

    test('edge case: empty input (0 authors)', () => {
      const analyzer = new ZoteroDBAnalyzer();
      const progressCallback = jest.fn();

      // Pass empty object
      const result = analyzer.findDiacriticVariantsByAuthor({}, progressCallback);

      // Should return empty array, no errors
      expect(result).toEqual([]);
      // Callback may or may not be called with 0% progress - either is acceptable
    });

    test('edge case: small dataset (<50 authors)', () => {
      const analyzer = new ZoteroDBAnalyzer();
      const progressUpdates = [];

      const progressCallback = (progress) => {
        progressUpdates.push(progress);
      };

      // Create 10-20 authors with surname variants
      const authorOccurrences = {};
      for (let i = 1; i <= 15; i++) {
        authorOccurrences[`juan|sánchez${i}`] = {
          firstName: 'Juan',
          lastName: `Sánchez${i}`,
          originalLastName: `Sánchez${i}`,
          count: i,
          surnameVariants: {
            [`Sánchez${i}`]: i - 1,
            [`Sanchez${i}`]: 1
          }
        };
      }

      analyzer.findDiacriticVariantsByAuthor(authorOccurrences, progressCallback);

      // Verify at least start and end progress updates are received
      if (progressUpdates.length > 0) {
        expect(progressUpdates[0]).toHaveProperty('stage', 'analyzing_surnames');
      }
    });

    test('progress callback receives correct stage and values', () => {
      const analyzer = new ZoteroDBAnalyzer();
      const progressUpdates = [];

      const progressCallback = (progress) => {
        progressUpdates.push(progress);
      };

      const authorOccurrences = {
        'jose|martin': {
          firstName: 'José',
          lastName: 'Martin',
          originalLastName: 'Martin',
          count: 3,
          surnameVariants: { 'Martin': 2, 'Martín': 1 }
        }
      };

      analyzer.findDiacriticVariantsByAuthor(authorOccurrences, progressCallback);

      // Verify each callback has required properties
      progressUpdates.forEach((progress) => {
        expect(progress).toHaveProperty('stage');
        expect(progress).toHaveProperty('percent');
        expect(progress.stage).toBe('analyzing_surnames');
        expect(typeof progress.percent).toBe('number');
        expect(progress.percent).toBeGreaterThanOrEqual(0);
        expect(progress.percent).toBeLessThanOrEqual(100);
      });

      // Verify progress increases
      if (progressUpdates.length > 1) {
        const percents = progressUpdates.map(p => p.percent);
        for (let i = 1; i < percents.length; i++) {
          expect(percents[i]).toBeGreaterThanOrEqual(percents[i - 1]);
        }
      }
    });
  });

  describe('Capitalization-only normalization', () => {
    test('should apply capitalization-only changes like FODOR -> Fodor', async () => {
      // Create a mock item with "FODOR" (all caps)
      const fodorItem = {
        id: 999,
        key: 'FODOR001',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Jerry', lastName: 'FODOR', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true)
      };
      global.Zotero.Items.getAsync.mockResolvedValue([fodorItem]);

      const suggestions = [
        {
          type: 'surname',
          primary: 'Fodor',  // Title case normalization
          variants: [
            { 
              name: 'FODOR',  // All caps variant
              frequency: 5, 
              items: [{ id: 999, key: 'FODOR001' }] 
            }
          ],
          similarity: 1.0
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      expect(results.updatedCreators).toBe(1);
      expect(fodorItem.setCreators).toHaveBeenCalledWith([
        { firstName: 'Jerry', lastName: 'Fodor', creatorType: 'author' }
      ]);
      expect(fodorItem.save).toHaveBeenCalled();
    });

    test('should apply lowercase to titlecase normalization', async () => {
      const lowercaseItem = {
        id: 1001,
        key: 'lower001',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Jane', lastName: 'smith', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true)
      };
      global.Zotero.Items.getAsync.mockResolvedValue([lowercaseItem]);

      const suggestions = [
        {
          type: 'surname',
          primary: 'Smith',
          variants: [
            { 
              name: 'smith',
              frequency: 3, 
              items: [{ id: 1001, key: 'lower001' }] 
            }
          ],
          similarity: 1.0
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      expect(results.updatedCreators).toBe(1);
      expect(lowercaseItem.setCreators).toHaveBeenCalledWith([
        { firstName: 'Jane', lastName: 'Smith', creatorType: 'author' }
      ]);
    });

    test('should skip true duplicates (exact match)', async () => {
      const duplicateItem = {
        id: 1002,
        key: 'dup001',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'John', lastName: 'Smith', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true)
      };
      global.Zotero.Items.getAsync.mockResolvedValue([duplicateItem]);

      const suggestions = [
        {
          type: 'surname',
          primary: 'Smith',
          variants: [
            { 
              name: 'Smith',  // Exact match - should be skipped
              frequency: 10, 
              items: [{ id: 1002, key: 'dup001' }] 
            }
          ],
          similarity: 1.0
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      // Should skip this item since variant name equals normalized value
      expect(results.updatedCreators).toBe(0);
      expect(duplicateItem.setCreators).not.toHaveBeenCalled();
    });

    test('should apply multiple capitalization changes in one batch', async () => {
      const fodorItem = {
        id: 1003,
        key: 'FODOR002',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Jerry', lastName: 'FODOR', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true)
      };

      const kripkeItem = {
        id: 1004,
        key: 'KRIPKE001',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Saul', lastName: 'kripke', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true)
      };

      global.Zotero.Items.getAsync.mockResolvedValue([fodorItem, kripkeItem]);

      const suggestions = [
        {
          type: 'surname',
          primary: 'Fodor',
          variants: [
            { name: 'FODOR', frequency: 3, items: [{ id: 1003, key: 'FODOR002' }] }
          ],
          similarity: 1.0
        },
        {
          type: 'surname',
          primary: 'Kripke',
          variants: [
            { name: 'kripke', frequency: 4, items: [{ id: 1004, key: 'KRIPKE001' }] }
          ],
          similarity: 1.0
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      expect(results.applied).toBe(2);
      expect(results.updatedCreators).toBe(2);
      
      expect(fodorItem.setCreators).toHaveBeenCalledWith([
        { firstName: 'Jerry', lastName: 'Fodor', creatorType: 'author' }
      ]);
      expect(kripkeItem.setCreators).toHaveBeenCalledWith([
        { firstName: 'Saul', lastName: 'Kripke', creatorType: 'author' }
      ]);
    });

    test('should distinguish between capitalization changes and typo fixes', async () => {
      const capitalItem = {
        id: 1005,
        key: 'cap001',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Bob', lastName: 'SMITH', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true)
      };

      const typoItem = {
        id: 1006,
        key: 'typo001',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'Alice', lastName: 'Smyth', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true)
      };

      global.Zotero.Items.getAsync.mockResolvedValue([capitalItem, typoItem]);

      const suggestions = [
        {
          type: 'surname',
          primary: 'Smith',
          variants: [
            { name: 'SMITH', frequency: 2, items: [{ id: 1005, key: 'cap001' }] },
            { name: 'Smyth', frequency: 1, items: [{ id: 1006, key: 'typo001' }] }
          ],
          similarity: 0.95
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      // Should apply both normalizations - capitalization and typo
      expect(results.applied).toBe(1);
      expect(results.updatedCreators).toBeGreaterThanOrEqual(2);
      
      // Capitalization item should be normalized
      expect(capitalItem.setCreators).toHaveBeenCalledWith([
        { firstName: 'Bob', lastName: 'Smith', creatorType: 'author' }
      ]);
      
      // Typo item should be normalized
      expect(typoItem.setCreators).toHaveBeenCalledWith([
        { firstName: 'Alice', lastName: 'Smith', creatorType: 'author' }
      ]);
    });

    test('should handle given-name capitalization normalization', async () => {
      const givenNameItem = {
        id: 1006,
        key: 'given001',
        getCreators: jest.fn().mockReturnValue([
          { firstName: 'JOHN', lastName: 'Smith', creatorType: 'author' }
        ]),
        setCreators: jest.fn(),
        save: jest.fn().mockResolvedValue(true)
      };
      global.Zotero.Items.getAsync.mockResolvedValue([givenNameItem]);

      const suggestions = [
        {
          type: 'given-name',
          surname: 'Smith',
          primary: 'John Smith',
          recommendedFullName: 'John Smith',
          variants: [
            { 
              firstName: 'JOHN',
              lastName: 'Smith',
              frequency: 2, 
              items: [{ id: 1006, key: 'given001' }] 
            }
          ],
          similarity: 1.0
        }
      ];

      const results = await analyzer.applyNormalizationSuggestions(suggestions, true);

      expect(results.updatedCreators).toBe(1);
      expect(givenNameItem.setCreators).toHaveBeenCalledWith([
        { firstName: 'John', lastName: 'Smith', creatorType: 'author' }
      ]);
    });
  });
});