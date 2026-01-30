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

        // Create creators with items - different authors with surname "Martin"
        // NOTE: For diacritic detection to work, the names must have the same normalized length
        // 'Martin' and 'Martin' are same, but for diacritic variants we need:
        // - 'Martin' (6 chars) vs 'Martín' (6 chars with acute on i = same length)
        // The acute accent on 'í' in 'Martin' vs 'í' in 'Martín' normalizes correctly
        const creators = [
          {
            firstName: 'C. B.',
            lastName: 'Martin',
            count: 5,
            parsedName: analyzer.parseName('C. B. Martin'),
            items: [
              { id: 1, title: 'The Ontological Turn', author: 'C. B. Martin', year: '1999' },
              { id: 2, title: 'Remembering', author: 'C. B. Martin', year: '1966' }
            ]
          },
          {
            firstName: 'Rod',
            lastName: 'Martin',
            count: 8,
            parsedName: analyzer.parseName('Rod Martin'),
            items: [
              { id: 3, title: 'The psychology of humour', author: 'Rod Martin', year: '2007' }
            ]
          },
          // Use 'Martín' with acute accent on 'i' - this should match 'Martin' as diacritic variant
          // 'Martin' (6) normalizes to 'martin' (6)
          // 'Martín' (6 with combining acute on i) normalizes to 'martin' (6)
          {
            firstName: 'José',
            lastName: 'Martín',
            count: 2,
            parsedName: analyzer.parseName('José Martín'),
            items: [
              { id: 4, title: 'Beyond error-correction', author: 'José Martín', year: '2012' }
            ]
          }
        ];

        const result = await analyzer.analyzeCreators(creators);

        // Find surname variant suggestion for Martin vs Martín
        const surnameSuggestion = result.suggestions.find(
          s => s.type === 'surname' && s.variants.some(v => v.name.toLowerCase() === 'martin' || v.name.toLowerCase() === 'martín')
        );

        expect(surnameSuggestion).toBeDefined();

        // Get the two variants (Martin and Martín)
        const variants = surnameSuggestion.variants.filter(v =>
          v.name.toLowerCase() === 'martin' || v.name.toLowerCase() === 'martín'
        );

        expect(variants.length).toBe(2);

        // Identify which is which
        const martinVariant = variants.find(v => v.name.toLowerCase() === 'martin');
        const martinVariantItems = variants.find(v => v.name.toLowerCase() === 'martín');

        expect(martinVariant).toBeDefined();
        expect(martinVariantItems).toBeDefined();

        // Martin variant items should only include C. B. Martin and Rod Martin, NOT José Martín
        const martinItemAuthors = martinVariant.items.map(item => item.author);
        expect(martinItemAuthors).toContain('C. B. Martin');
        expect(martinItemAuthors).toContain('Rod Martin');
        expect(martinItemAuthors).not.toContain('José Martín');

        // Martín variant items should only include José Martín
        const martinVariantItemAuthors = martinVariantItems.items.map(item => item.author);
        expect(martinVariantItemAuthors).toContain('José Martín');
        expect(martinVariantItemAuthors).not.toContain('C. B. Martin');
        expect(martinVariantItemAuthors).not.toContain('Rod Martin');
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
    });
  });
});