/**
 * Regression tests for the field-normalization similarity threshold slider.
 *
 * These tests extract the REAL grouping helpers from content/dialog.html (rather
 * than reimplementing them) so they guard the code that actually ships. The slider
 * must affect grouping for every field type, including journals.
 */

const fs = require('fs');
const path = require('path');

const dialogPath = path.join(__dirname, '..', '..', 'content', 'dialog.html');
const dialogSource = fs.readFileSync(dialogPath, 'utf8');

/**
 * Extract a `name: function(...) { ... }` method body from the dialog source by
 * brace-matching, and return its source as a standalone function expression.
 */
function extractMethod(source, name) {
  const startMatch = source.match(new RegExp(name + '\\s*:\\s*function\\s*\\(([^)]*)\\)\\s*\\{'));
  if (!startMatch) {
    throw new Error(`Method ${name} not found in dialog.html`);
  }
  const args = startMatch[1];
  const bodyStart = source.indexOf('{', startMatch.index);
  let depth = 0;
  let i = bodyStart;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const body = source.slice(bodyStart + 1, i);
  // eslint-disable-next-line no-new-func
  return new Function(...args.split(',').map(s => s.trim()).filter(Boolean), body);
}

// Build a minimal controller carrying the real dialog methods.
const controller = {
  normalizedLevenshtein: extractMethod(dialogSource, 'normalizedLevenshtein'),
  areJournalsSimilar: extractMethod(dialogSource, 'areJournalsSimilar'),
  areLocationsSimilar: extractMethod(dialogSource, 'areLocationsSimilar'),
  areFieldValuesSimilar: extractMethod(dialogSource, 'areFieldValuesSimilar')
};

describe('Threshold persistence when localStorage is unavailable', () => {
  // In Zotero's chrome:// dialog context, accessing localStorage can throw.
  // The slider value must still survive within the session via in-memory state.
  const originalLocalStorage = global.localStorage;

  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  test('getFieldThreshold returns the value set even when localStorage throws', () => {
    global.localStorage = {
      getItem: () => { throw new Error('The operation is insecure.'); },
      setItem: () => { throw new Error('The operation is insecure.'); }
    };

    const ctrl = {
      getFieldThreshold: extractMethod(dialogSource, 'getFieldThreshold'),
      setFieldThreshold: extractMethod(dialogSource, 'setFieldThreshold')
    };

    ctrl.setFieldThreshold(0.3);
    expect(ctrl.getFieldThreshold()).toBe(0.3);
  });
});

describe('Field normalization threshold slider', () => {
  describe('journals', () => {
    test('does not group spelling variants at threshold 0 (exact-ish only)', () => {
      const similar = controller.areFieldValuesSimilar(
        'Behavioural and Brain Sciences',
        'Behavioral and Brain Sciences',
        'journal',
        0
      );
      expect(similar).toBe(false);
    });

    test('groups close spelling variants once the threshold is raised', () => {
      // British vs American spelling - normalized edit distance is tiny (~0.03).
      const similar = controller.areFieldValuesSimilar(
        'Behavioural and Brain Sciences',
        'Behavioral and Brain Sciences',
        'journal',
        0.3
      );
      expect(similar).toBe(true);
    });

    test('still rejects clearly different journals at a moderate threshold', () => {
      const similar = controller.areFieldValuesSimilar(
        'Cognition',
        'Neuron',
        'journal',
        0.3
      );
      expect(similar).toBe(false);
    });
  });

  describe('publishers (control - already worked)', () => {
    test('groups "Blackwell" / "Blackwells" when threshold raised', () => {
      expect(controller.areFieldValuesSimilar('Blackwell', 'Blackwells', 'publisher', 0.1)).toBe(true);
    });
  });
});
