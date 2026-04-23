/**
 * Regression test for given-name normalization with middle initials.
 *
 * Bug: "Richard E. Baldwin" and "Richard Baldwin" in library.
 * User selects "Richard E." as canonical given name.
 * Expected result: all Baldwin entries get firstName="Richard E.", lastName="Baldwin".
 * Actual (broken): firstName="Richard" (initial dropped), lastName="E. Baldwin" (surname corrupted).
 *
 * Root cause: applyDatabaseNormalizations treated the full recommendedFullName
 * ("Richard E. Baldwin") as a word-split firstName+lastName, assigning
 * normalizedParts[0]="Richard" to firstName and "E. Baldwin" to lastName.
 */

const mockZoteroDB = {
  query: jest.fn(),
  executeTransaction: jest.fn()
};

function makeItem(id, firstName, lastName) {
  return {
    id,
    key: 'TST' + id,
    getCreators: jest.fn().mockReturnValue([
      { firstName, lastName, creatorType: 'author' }
    ]),
    setCreators: jest.fn(),
    saveTx: jest.fn().mockResolvedValue(true)
  };
}

global.Zotero = {
  DB: mockZoteroDB,
  Items: {
    getAsync: jest.fn()
  },
  debug: jest.fn(),
  logError: jest.fn(),
  getMainWindow: () => ({ alert: jest.fn() })
};

const ZoteroDBAnalyzer = require('../../src/zotero/zotero-db-analyzer.js');

describe('given-name normalization with middle initial', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ZoteroDBAnalyzer();
    mockZoteroDB.query.mockClear();
    mockZoteroDB.executeTransaction.mockClear();
    mockZoteroDB.executeTransaction.mockImplementation(async (fn) => fn());
    analyzer.learningEngine.storeGivenNameMapping = jest.fn().mockResolvedValue();
    analyzer.learningEngine.storeMapping = jest.fn().mockResolvedValue();
    analyzer.learningEngine.recordDistinctPair = jest.fn().mockResolvedValue(true);
    analyzer.learningEngine.clearDistinctPair = jest.fn().mockResolvedValue();
    analyzer.learningEngine.isDistinctPair = jest.fn().mockReturnValue(false);
  });

  test('normalizing "Richard" → "Richard E." preserves lastName "Baldwin"', async () => {
    // Item that needs updating: firstName="Richard", lastName="Baldwin"
    const itemToNormalize = makeItem(1, 'Richard', 'Baldwin');
    // Item that is already the canonical form: firstName="Richard E.", lastName="Baldwin"
    const canonicalItem = makeItem(2, 'Richard E.', 'Baldwin');

    global.Zotero.Items.getAsync.mockResolvedValue([itemToNormalize]);

    const suggestion = {
      type: 'given-name',
      surname: 'Baldwin',
      surnameKey: 'baldwin',
      primary: 'Richard E. Baldwin',       // recommendedFullName
      recommendedFirstName: 'Richard E.',
      recommendedFullName: 'Richard E. Baldwin',
      variants: [
        {
          name: 'Richard E. Baldwin',
          firstName: 'Richard E.',
          lastName: 'Baldwin',
          frequency: 1,
          items: [{ id: canonicalItem.id }]
        },
        {
          name: 'Richard Baldwin',
          firstName: 'Richard',
          lastName: 'Baldwin',
          frequency: 1,
          items: [{ id: itemToNormalize.id }]
        }
      ]
    };

    await analyzer.applyNormalizationSuggestions([suggestion], true);

    expect(itemToNormalize.setCreators).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ firstName: 'Richard E.', lastName: 'Baldwin' })
      ])
    );
    expect(itemToNormalize.saveTx).toHaveBeenCalled();
  });

  test('canonical entry ("Richard E. Baldwin") is left unchanged', async () => {
    const itemToNormalize = makeItem(1, 'Richard', 'Baldwin');
    const canonicalItem = makeItem(2, 'Richard E.', 'Baldwin');

    global.Zotero.Items.getAsync.mockResolvedValue([itemToNormalize]);

    const suggestion = {
      type: 'given-name',
      surname: 'Baldwin',
      surnameKey: 'baldwin',
      primary: 'Richard E. Baldwin',
      recommendedFirstName: 'Richard E.',
      recommendedFullName: 'Richard E. Baldwin',
      variants: [
        {
          name: 'Richard E. Baldwin',
          firstName: 'Richard E.',
          lastName: 'Baldwin',
          frequency: 1,
          items: [{ id: canonicalItem.id }]
        },
        {
          name: 'Richard Baldwin',
          firstName: 'Richard',
          lastName: 'Baldwin',
          frequency: 1,
          items: [{ id: itemToNormalize.id }]
        }
      ]
    };

    await analyzer.applyNormalizationSuggestions([suggestion], true);

    // canonical item (id=2) should NOT appear in getAsync (skipped because its
    // variant.name === suggestion.primary), so setCreators is never called on it
    expect(canonicalItem.setCreators).not.toHaveBeenCalled();
  });

  test('does not corrupt lastName when normalizing given name', async () => {
    const item = makeItem(10, 'Richard', 'Baldwin');
    global.Zotero.Items.getAsync.mockResolvedValue([item]);

    const suggestion = {
      type: 'given-name',
      surname: 'Baldwin',
      surnameKey: 'baldwin',
      primary: 'Richard E. Baldwin',
      recommendedFirstName: 'Richard E.',
      recommendedFullName: 'Richard E. Baldwin',
      variants: [
        {
          name: 'Richard E. Baldwin',
          firstName: 'Richard E.',
          lastName: 'Baldwin',
          frequency: 3,
          items: []
        },
        {
          name: 'Richard Baldwin',
          firstName: 'Richard',
          lastName: 'Baldwin',
          frequency: 1,
          items: [{ id: item.id }]
        }
      ]
    };

    await analyzer.applyNormalizationSuggestions([suggestion], true);

    const [[updatedCreators]] = item.setCreators.mock.calls;
    const updated = updatedCreators[0];
    expect(updated.firstName).toBe('Richard E.');
    expect(updated.lastName).toBe('Baldwin');  // must NOT become "E. Baldwin"
  });
});
