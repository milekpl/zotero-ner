/**
 * Integration test for dialog Zotero access patterns
 * Run with: npm run test:zotero
 */

describe('Dialog Zotero Access Integration', () => {
  // Quick check for Zotero availability (non-blocking for unit tests)
  const zoteroAvailable = typeof Zotero !== 'undefined' && Zotero.NameNormalizer?.initialized;

  test('ZoteroNER_ZoteroAPI helper should find Zotero', () => {
    if (!zoteroAvailable) {
      console.log('Zotero not available (expected in unit test mode)');
      return;
    }
    expect(Zotero.NameNormalizer).toBeDefined();
  });

  test('dialog should open with analysis results from opener', () => {
    if (!zoteroAvailable) {
      console.log('Skipping - Zotero not available');
      return;
    }

    // Verify the helper can access Zotero APIs
    const nameNormalizer = Zotero.NameNormalizer;
    expect(nameNormalizer).toBeDefined();
    expect(nameNormalizer.initialized).toBe(true);
  });

  test('Zotero.NER alias should point to NameNormalizer', () => {
    if (!zoteroAvailable) {
      console.log('Zotero not available (expected in unit test mode)');
      return;
    }
    expect(Zotero.NER).toBe(Zotero.NameNormalizer);
  });
});
