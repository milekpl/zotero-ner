/**
 * Unit tests for dialog HTML escaping and sanitization functions
 * Tests the escapeHTML function and related utilities
 */

describe('Dialog HTML escaping', () => {
  // The escapeHTML function from dialog.html
  const escapeHTML = function(value) {
    if (typeof value !== 'string') {
      return '';
    }
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return value.replace(/[&<>"']/g, (char) => map[char]);
  };

  test('escapeHTML escapes & character', () => {
    expect(escapeHTML('AT&T')).toBe('AT&amp;T');
  });

  test('escapeHTML escapes < and > characters', () => {
    expect(escapeHTML('<script>')).toBe('&lt;script&gt;');
  });

  test('escapeHTML escapes " character', () => {
    expect(escapeHTML('say "hello"')).toBe('say &quot;hello&quot;');
  });

  test('escapeHTML escapes single quote', () => {
    expect(escapeHTML("it's")).toBe('it&#39;s');
  });

  test('escapeHTML handles null/undefined', () => {
    expect(escapeHTML(null)).toBe('');
    expect(escapeHTML(undefined)).toBe('');
    expect(escapeHTML(123)).toBe('');
  });

  test('escapeHTML handles normal text', () => {
    expect(escapeHTML('Miłkowski')).toBe('Miłkowski');
    expect(escapeHTML('Smith')).toBe('Smith');
  });

  test('escapeHTML handles malicious input', () => {
    const malicious = '<img src=x onerror=alert(1)>';
    expect(escapeHTML(malicious)).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  test('escapeHTML handles script tag', () => {
    const malicious = '<script>alert("xss")</script>';
    expect(escapeHTML(malicious)).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
});

describe('Not variants key generation', () => {
  // The getNotVariantsKey function logic
  const getNotVariantsKey = function(suggestion) {
    const sanitize = function(value) {
      return (value || '').replace(/[:\\/\n\r\t]/g, '_').substring(0, 100);
    };
    if (suggestion.type === 'given-name') {
      return `given-name:${sanitize(suggestion.surname)}:${sanitize(suggestion.primary)}`;
    }
    return `surname:${sanitize(suggestion.primary)}`;
  };

  test('getNotVariantsKey creates correct key for surname', () => {
    const suggestion = { type: 'surname', primary: 'Smith' };
    expect(getNotVariantsKey(suggestion)).toBe('surname:Smith');
  });

  test('getNotVariantsKey creates correct key for given-name', () => {
    const suggestion = { type: 'given-name', surname: 'Smith', primary: 'John' };
    expect(getNotVariantsKey(suggestion)).toBe('given-name:Smith:John');
  });

  test('getNotVariantsKey handles special characters in surname', () => {
    const suggestion = { type: 'surname', primary: 'Miłkowski' };
    expect(getNotVariantsKey(suggestion)).toBe('surname:Miłkowski');
  });

  test('getNotVariantsKey sanitizes colons', () => {
    const suggestion = { type: 'surname', primary: 'name:with:colons' };
    expect(getNotVariantsKey(suggestion)).toBe('surname:name_with_colons');
  });

  test('getNotVariantsKey sanitizes newlines', () => {
    const suggestion = { type: 'surname', primary: 'name\nwith\nnewlines' };
    expect(getNotVariantsKey(suggestion)).toBe('surname:name_with_newlines');
  });

  test('getNotVariantsKey sanitizes tabs', () => {
    const suggestion = { type: 'surname', primary: 'name\twith\ttabs' };
    expect(getNotVariantsKey(suggestion)).toBe('surname:name_with_tabs');
  });

  test('getNotVariantsKey handles null values', () => {
    const suggestion = { type: 'surname', primary: null };
    expect(getNotVariantsKey(suggestion)).toBe('surname:');
  });

  test('getNotVariantsKey truncates long values', () => {
    const longValue = 'a'.repeat(150);
    const suggestion = { type: 'surname', primary: longValue };
    const result = getNotVariantsKey(suggestion);
    expect(result.length).toBeLessThan(120); // 'surname:' + 100 chars max
    expect(result.startsWith('surname:')).toBe(true);
  });
});

describe('Group title HTML generation', () => {
  const escapeHTML = function(value) {
    if (typeof value !== 'string') return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return value.replace(/[&<>"']/g, (char) => map[char]);
  };

  const titleCase = function(value) {
    if (!value || typeof value !== 'string') return '';
    return value.split(/\s+/).filter(Boolean).map(part =>
      part.toLowerCase().replace(/(^|['`-])(\p{L})/gu, (match, prefix, letter) => prefix + letter.toUpperCase())
    ).join(' ');
  };

  const getGroupTitle = function(index, suggestion) {
    const groupNumber = index + 1;
    if (suggestion.type === 'given-name') {
      const surname = titleCase(suggestion.surname || suggestion.primary || '');
      const safeSurname = escapeHTML(surname);
      return surname
        ? `Given name variants <span class="surname-variant">${safeSurname}</span>`
        : `Given name variants Group ${groupNumber}`;
    }
    const surname = titleCase(suggestion.primary || '');
    const safeSurname = escapeHTML(surname);
    return surname
      ? `Surname variants <span class="surname-variant">${safeSurname}</span>`
      : `Variant Group ${groupNumber}`;
  };

  test('getGroupTitle generates correct HTML for surname', () => {
    const suggestion = { type: 'surname', primary: 'smith' };
    const result = getGroupTitle(0, suggestion);
    expect(result).toBe('Surname variants <span class="surname-variant">Smith</span>');
  });

  test('getGroupTitle escapes HTML in surname', () => {
    const suggestion = { type: 'surname', primary: '<script>' };
    const result = getGroupTitle(0, suggestion);
    expect(result).toBe('Surname variants <span class="surname-variant">&lt;script&gt;</span>');
  });

  test('getGroupTitle handles given-name type', () => {
    const suggestion = { type: 'given-name', surname: 'smith', primary: 'john' };
    const result = getGroupTitle(0, suggestion);
    expect(result).toBe('Given name variants <span class="surname-variant">Smith</span>');
  });

  test('getGroupTitle handles empty surname', () => {
    const suggestion = { type: 'surname', primary: '' };
    const result = getGroupTitle(5, suggestion);
    expect(result).toBe('Variant Group 6');
  });

  test('getGroupTitle handles special characters in name', () => {
    const suggestion = { type: 'surname', primary: 'Miłkowski & Sons' };
    const result = getGroupTitle(0, suggestion);
    expect(result).toBe('Surname variants <span class="surname-variant">Miłkowski &amp; Sons</span>');
  });
});

describe('Variant detail title HTML generation', () => {
  const escapeHTML = function(value) {
    if (typeof value !== 'string') return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return value.replace(/[&<>"']/g, (char) => map[char]);
  };

  const getVariantDisplayLabel = function(suggestion, variant) {
    if (!variant) return '';
    const frequency = typeof variant.frequency === 'number' ? ` (${variant.frequency})` : '';
    if (suggestion.type === 'given-name') {
      const name = variant.firstName || variant.name || '';
      return `${name}${frequency}`;
    }
    const surnameDisplay = typeof variant.name === 'string' ? variant.name : '';
    return `${surnameDisplay}${frequency}`;
  };

  const getVariantDetailTitle = function(suggestion, variant) {
    const label = getVariantDisplayLabel(suggestion, variant).replace(/\s+\([^)]*\)$/, '');
    const safeLabel = escapeHTML(label);
    if (suggestion.type === 'given-name') {
      return `Occurrences for ${safeLabel}`;
    }
    return `Occurrences for <span class="surname-variant">${safeLabel}</span>`;
  };

  test('getVariantDetailTitle escapes HTML for surname', () => {
    const suggestion = { type: 'surname' };
    const variant = { name: '<img src=x onerror=alert(1)>', frequency: 5 };
    const result = getVariantDetailTitle(suggestion, variant);
    expect(result).toBe('Occurrences for <span class="surname-variant">&lt;img src=x onerror=alert(1)&gt;</span>');
  });

  test('getVariantDetailTitle escapes HTML for given-name', () => {
    const suggestion = { type: 'given-name' };
    const variant = { firstName: '<script>alert(1)</script>', frequency: 3 };
    const result = getVariantDetailTitle(suggestion, variant);
    expect(result).toBe('Occurrences for &lt;script&gt;alert(1)&lt;/script&gt;');
  });

  test('getVariantDetailTitle handles normal names', () => {
    const suggestion = { type: 'surname' };
    const variant = { name: 'Smith', frequency: 10 };
    const result = getVariantDetailTitle(suggestion, variant);
    expect(result).toBe('Occurrences for <span class="surname-variant">Smith</span>');
  });
});
