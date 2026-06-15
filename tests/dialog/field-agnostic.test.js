/**
 * Tests for field-agnostic normalization helpers in content/dialog.html:
 *   - resolveFieldType: maps a Zotero field name to the similarity fieldType
 *   - splitFieldValue: field-aware multi-value splitting
 *   - buildNormalizableFieldList: smart-filtered field enumeration
 *
 * Functions are extracted from the shipped dialog.html so the tests guard the
 * real code (same approach as field-threshold.test.js).
 */

const fs = require('fs');
const path = require('path');

const dialogSource = fs.readFileSync(
  path.join(__dirname, '..', '..', 'content', 'dialog.html'),
  'utf8'
);

function extractMethod(source, name) {
  const startMatch = source.match(new RegExp(name + '\\s*:\\s*function\\s*\\(([^)]*)\\)\\s*\\{'));
  if (!startMatch) throw new Error(`Method ${name} not found in dialog.html`);
  const args = startMatch[1];
  const bodyStart = source.indexOf('{', startMatch.index);
  let depth = 0, i = bodyStart;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) break;
  }
  const body = source.slice(bodyStart + 1, i);
  // eslint-disable-next-line no-new-func
  return new Function(...args.split(',').map(s => s.trim()).filter(Boolean), body);
}

// Extract the real denylist array literal from the source.
function extractArray(source, name) {
  const m = source.match(new RegExp(name + '\\s*:\\s*(\\[[^\\]]*\\])'));
  if (!m) throw new Error(`Array ${name} not found in dialog.html`);
  // eslint-disable-next-line no-eval
  return eval(m[1]);
}

const ctrl = {
  NORMALIZABLE_FIELD_DENYLIST: extractArray(dialogSource, 'NORMALIZABLE_FIELD_DENYLIST'),
  resolveFieldType: extractMethod(dialogSource, 'resolveFieldType'),
  splitFieldValue: extractMethod(dialogSource, 'splitFieldValue'),
  buildNormalizableFieldList: extractMethod(dialogSource, 'buildNormalizableFieldList'),
  buildFieldDropdown: extractMethod(dialogSource, 'buildFieldDropdown'),
  log: () => {}
};

// Minimal DOM element/double for buildFieldDropdown tests.
function fakeEl(tag) {
  return {
    tag, attrs: {}, children: [], listeners: {}, _value: '', id: '', textContent: '',
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
    get value() { return this._value; },
    set value(v) { this._value = v; },
    fire(t) { (this.listeners[t] || []).forEach(fn => fn({ target: this })); }
  };
}

// Mock Zotero.ItemFields for enumeration tests.
function makeZoteroMock() {
  const idToName = {
    1: 'publisher', 2: 'place', 3: 'series', 4: 'ISBN', 5: 'date', 6: 'title',
    7: 'publicationTitle', 8: 'DOI', 9: 'pages'
  };
  const labels = {
    publisher: 'Publisher', place: 'Place', series: 'Series',
    publicationTitle: 'Publication Title'
  };
  const typeFields = {
    1: [1, 2, 3, 4, 5, 6],     // book: publisher, place, series, ISBN, date, title
    2: [7, 3, 8, 9, 6]          // journalArticle: publicationTitle, series, DOI, pages, title
  };
  return {
    ItemFields: {
      getItemTypeFields: (typeID) => typeFields[typeID] || [],
      getName: (id) => idToName[id],
      getLocalizedString: (name) => labels[name] || name
    }
  };
}

function makeItem(itemTypeID, fields) {
  return { itemTypeID, getField: (name) => fields[name] || '' };
}

describe('resolveFieldType', () => {
  test('maps the three special fields to their heuristic keys', () => {
    expect(ctrl.resolveFieldType('publisher')).toBe('publisher');
    expect(ctrl.resolveFieldType('place')).toBe('location');
    expect(ctrl.resolveFieldType('publicationTitle')).toBe('journal');
  });

  test('passes any other field through as its own name (generic branch)', () => {
    expect(ctrl.resolveFieldType('series')).toBe('series');
    expect(ctrl.resolveFieldType('language')).toBe('language');
    expect(ctrl.resolveFieldType('rights')).toBe('rights');
    expect(ctrl.resolveFieldType('originalPublisher')).toBe('originalPublisher');
  });
});

describe('splitFieldValue (field-aware)', () => {
  test('splits publisher on ; and /', () => {
    expect(ctrl.splitFieldValue('Routledge; Springer', 'publisher')).toEqual(['Routledge', 'Springer']);
  });

  test('splits location on ; and /', () => {
    expect(ctrl.splitFieldValue('London; New York', 'location')).toEqual(['London', 'New York']);
  });

  test('keeps generic fields atomic (no splitting)', () => {
    // A rights string can legitimately contain "/" and ";" - must not be split.
    expect(ctrl.splitFieldValue('CC BY-NC-ND 4.0 / public domain', 'rights')).toEqual(['CC BY-NC-ND 4.0 / public domain']);
    expect(ctrl.splitFieldValue('English; French', 'language')).toEqual(['English; French']);
  });

  test('keeps journal atomic', () => {
    expect(ctrl.splitFieldValue('Mind / Brain', 'journal')).toEqual(['Mind / Brain']);
  });
});

describe('last-used field persistence (survives localStorage failure)', () => {
  const originalLocalStorage = global.localStorage;
  afterEach(() => { global.localStorage = originalLocalStorage; });

  test('remembers the last field even when localStorage throws', () => {
    global.localStorage = {
      getItem: () => { throw new Error('insecure'); },
      setItem: () => { throw new Error('insecure'); }
    };
    const c = {
      getLastNormalizedField: extractMethod(dialogSource, 'getLastNormalizedField'),
      setLastNormalizedField: extractMethod(dialogSource, 'setLastNormalizedField')
    };
    c.setLastNormalizedField('series');
    expect(c.getLastNormalizedField()).toBe('series');
  });
});

describe('buildFieldDropdown', () => {
  const fieldList = [
    { name: 'series', label: 'Series', populated: 2 },
    { name: 'publisher', label: 'Publisher', populated: 1 }
  ];
  const originalDocument = global.document;
  afterEach(() => { global.document = originalDocument; });

  test('builds a native XUL menulist when createXULElement is available', () => {
    global.document = {
      createXULElement: (t) => fakeEl(t),
      createElement: (t) => fakeEl(t)
    };
    const host = fakeEl('span');
    const chosen = [];
    const el = ctrl.buildFieldDropdown(host, fieldList, 'series', (f) => chosen.push(f));

    expect(el.tag).toBe('menulist');
    expect(host.children[0]).toBe(el);
    const popup = el.children[0];
    expect(popup.tag).toBe('menupopup');
    expect(popup.children.map(mi => mi.attrs.value)).toEqual(['series', 'publisher']);
    expect(el.value).toBe('series'); // default pre-selected

    // Simulate the user picking "publisher" -> command event -> onChange.
    el.value = 'publisher';
    el.fire('command');
    expect(chosen).toEqual(['publisher']);
  });

  test('falls back to an HTML <select> when XUL is unavailable', () => {
    global.document = { createElement: (t) => fakeEl(t) }; // no createXULElement
    const host = fakeEl('span');
    const chosen = [];
    const el = ctrl.buildFieldDropdown(host, fieldList, 'publisher', (f) => chosen.push(f));

    expect(el.tag).toBe('select');
    expect(el.children.map(o => o.value)).toEqual(['series', 'publisher']);

    el.value = 'series';
    el.fire('change');
    expect(chosen).toEqual(['series']);
  });
});

describe('buildNormalizableFieldList', () => {
  const zotero = makeZoteroMock();
  const items = [
    makeItem(1, { publisher: 'OUP', place: 'Oxford', series: 'Studies', ISBN: '123', date: '2020', title: 'A' }),
    makeItem(2, { publicationTitle: 'Mind', series: 'Studies', DOI: '10.x', pages: '1-2', title: 'B' })
  ];

  test('excludes denylisted fields (identifiers, dates, numerics, title)', () => {
    const names = ctrl.buildNormalizableFieldList(items, zotero).map(f => f.name);
    expect(names).not.toContain('ISBN');
    expect(names).not.toContain('DOI');
    expect(names).not.toContain('date');
    expect(names).not.toContain('pages');
    expect(names).not.toContain('title');
  });

  test('excludes PubMed identifiers (PMID, PMCID)', () => {
    const z = {
      ItemFields: {
        getItemTypeFields: () => [101, 102, 103],
        getName: (id) => ({ 101: 'PMID', 102: 'PMCID', 103: 'series' }[id]),
        getLocalizedString: (n) => n
      }
    };
    const its = [makeItem(1, { PMID: '12345', PMCID: 'PMC678', series: 'Studies' })];
    const names = ctrl.buildNormalizableFieldList(its, z).map(f => f.name);
    expect(names).not.toContain('PMID');
    expect(names).not.toContain('PMCID');
    expect(names).toContain('series');
  });

  test('includes normalizable fields across mixed item types (union)', () => {
    const names = ctrl.buildNormalizableFieldList(items, zotero).map(f => f.name);
    expect(names).toContain('publisher');
    expect(names).toContain('place');
    expect(names).toContain('series');
    expect(names).toContain('publicationTitle');
  });

  test('ranks by populated-item count, then label', () => {
    const list = ctrl.buildNormalizableFieldList(items, zotero);
    // "series" is populated in both items -> highest count -> first.
    expect(list[0].name).toBe('series');
    expect(list[0].populated).toBe(2);
    expect(list[0].label).toBe('Series');
  });

  test('omits fields no selected item has a value for', () => {
    const empties = [makeItem(1, { publisher: 'OUP' })];
    const names = ctrl.buildNormalizableFieldList(empties, zotero).map(f => f.name);
    expect(names).toEqual(['publisher']);
  });
});
