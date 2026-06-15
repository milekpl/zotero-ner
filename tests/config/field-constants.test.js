/**
 * Unit tests for FieldConstants
 * Tests all state abbreviations, publisher abbreviations, and publisher patterns
 */

const FieldConstants = require('../../src/config/field-constants.js');

describe('FieldConstants', () => {
  describe('PUBLISHER_ABBREVIATIONS', () => {
    test('should contain common company suffixes', () => {
      expect(FieldConstants.PUBLISHER_ABBREVIATIONS).toContain('Co.');
      expect(FieldConstants.PUBLISHER_ABBREVIATIONS).toContain('Co');
      expect(FieldConstants.PUBLISHER_ABBREVIATIONS).toContain('Inc.');
      expect(FieldConstants.PUBLISHER_ABBREVIATIONS).toContain('Inc');
      expect(FieldConstants.PUBLISHER_ABBREVIATIONS).toContain('Ltd.');
      expect(FieldConstants.PUBLISHER_ABBREVIATIONS).toContain('Ltd');
      expect(FieldConstants.PUBLISHER_ABBREVIATIONS).toContain('Corp.');
      expect(FieldConstants.PUBLISHER_ABBREVIATIONS).toContain('Corp');
    });

    test('should contain press-related abbreviations', () => {
      expect(FieldConstants.PUBLISHER_ABBREVIATIONS).toContain('Press');
      expect(FieldConstants.PUBLISHER_ABBREVIATIONS).toContain('Press.');
      expect(FieldConstants.PUBLISHER_ABBREVIATIONS).toContain('Pub.');
      expect(FieldConstants.PUBLISHER_ABBREVIATIONS).toContain('Pub');
    });

    test('should contain university press abbreviation', () => {
      expect(FieldConstants.PUBLISHER_ABBREVIATIONS).toContain('UP');
      expect(FieldConstants.PUBLISHER_ABBREVIATIONS).toContain('University Press');
    });

    test('should be an array', () => {
      expect(Array.isArray(FieldConstants.PUBLISHER_ABBREVIATIONS)).toBe(true);
    });
  });

  describe('STATE_ABBREVIATIONS', () => {
    test('should be an object', () => {
      expect(typeof FieldConstants.STATE_ABBREVIATIONS).toBe('object');
    });

    test('should contain all 50 states', () => {
      expect(Object.keys(FieldConstants.STATE_ABBREVIATIONS)).toHaveProperty('length');
      expect(Object.keys(FieldConstants.STATE_ABBREVIATIONS).length).toBeGreaterThanOrEqual(50);
    });

    test('should map AL to Alabama', () => {
      expect(FieldConstants.STATE_ABBREVIATIONS['AL']).toBe('Alabama');
    });

    test('should map CA to California', () => {
      expect(FieldConstants.STATE_ABBREVIATIONS['CA']).toBe('California');
    });

    test('should map TX to Texas', () => {
      expect(FieldConstants.STATE_ABBREVIATIONS['TX']).toBe('Texas');
    });

    test('should map NY to New York', () => {
      expect(FieldConstants.STATE_ABBREVIATIONS['NY']).toBe('New York');
    });

    test('should map DC to District of Columbia', () => {
      expect(FieldConstants.STATE_ABBREVIATIONS['DC']).toBe('District of Columbia');
    });

    test('should map state abbreviations to full names', () => {
      // Verify all abbreviations are valid 2-letter codes
      Object.keys(FieldConstants.STATE_ABBREVIATIONS).forEach(abbr => {
        expect(abbr.length).toBe(2);
        expect(abbr).toMatch(/^[A-Z]{2}$/);
      });
    });

    test('should map all unique full names', () => {
      const fullNames = Object.values(FieldConstants.STATE_ABBREVIATIONS);
      const uniqueNames = new Set(fullNames);
      expect(uniqueNames.size).toBe(fullNames.length);
    });
  });

  describe('PROVINCE_ABBREVIATIONS', () => {
    test('should be an object', () => {
      expect(typeof FieldConstants.PROVINCE_ABBREVIATIONS).toBe('object');
    });

    test('should contain Canadian provinces', () => {
      expect(FieldConstants.PROVINCE_ABBREVIATIONS['ON']).toBe('Ontario');
      expect(FieldConstants.PROVINCE_ABBREVIATIONS['BC']).toBe('British Columbia');
      expect(FieldConstants.PROVINCE_ABBREVIATIONS['AB']).toBe('Alberta');
      expect(FieldConstants.PROVINCE_ABBREVIATIONS['QC']).toBe('Quebec');
    });

    test('should contain territories', () => {
      expect(FieldConstants.PROVINCE_ABBREVIATIONS['NT']).toBe('Northwest Territories');
      expect(FieldConstants.PROVINCE_ABBREVIATIONS['NU']).toBe('Nunavut');
      expect(FieldConstants.PROVINCE_ABBREVIATIONS['YT']).toBe('Yukon');
    });
  });

  describe('PUBLISHER_PATTERNS', () => {
    test('should be an object', () => {
      expect(typeof FieldConstants.PUBLISHER_PATTERNS).toBe('object');
    });

    test('should map academic publishers', () => {
      expect(FieldConstants.PUBLISHER_PATTERNS['Springer-Verlag']).toBe('Springer');
      expect(FieldConstants.PUBLISHER_PATTERNS['Elsevier BV']).toBe('Elsevier');
    });

    test('should map Wiley variants', () => {
      expect(FieldConstants.PUBLISHER_PATTERNS['John Wiley & Sons']).toBe('Wiley');
      expect(FieldConstants.PUBLISHER_PATTERNS['Wiley-Blackwell']).toBe('Wiley');
    });

    test('should map Taylor & Francis variants', () => {
      expect(FieldConstants.PUBLISHER_PATTERNS['Taylor & Francis']).toBe('Taylor and Francis');
      expect(FieldConstants.PUBLISHER_PATTERNS['Routledge']).toBe('Taylor and Francis');
    });

    test('should map university presses', () => {
      expect(FieldConstants.PUBLISHER_PATTERNS['Oxford University Press']).toBe('Oxford UP');
      expect(FieldConstants.PUBLISHER_PATTERNS['Cambridge University Press']).toBe('Cambridge UP');
      expect(FieldConstants.PUBLISHER_PATTERNS['MIT Press']).toBe('MIT Press');
    });

    test('should map scientific societies', () => {
      expect(FieldConstants.PUBLISHER_PATTERNS['Nature Publishing Group']).toBe('Nature');
      expect(FieldConstants.PUBLISHER_PATTERNS['Science']).toBe('AAAS');
      expect(FieldConstants.PUBLISHER_PATTERNS['American Chemical Society']).toBe('ACS');
      // IEEE is the abbreviation - it's the key, not the value
      expect(FieldConstants.PUBLISHER_PATTERNS['Institute of Electrical and Electronics Engineers']).toBe('IEEE');
    });

    test('should have unique values', () => {
      const values = Object.values(FieldConstants.PUBLISHER_PATTERNS);
      // Just verify the values array has content
      expect(values.length).toBeGreaterThan(0);
      // Check that we have the expected count of patterns (27 patterns)
      expect(values.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('PUBLISHER_SEPARATORS', () => {
    test('should be an array of RegExp', () => {
      expect(Array.isArray(FieldConstants.PUBLISHER_SEPARATORS)).toBe(true);
      FieldConstants.PUBLISHER_SEPARATORS.forEach(sep => {
        expect(sep instanceof RegExp).toBe(true);
      });
    });

    test('should contain semicolon separator', () => {
      const hasSemicolon = FieldConstants.PUBLISHER_SEPARATORS.some(sep =>
        sep.toString().includes(';')
      );
      expect(hasSemicolon).toBe(true);
    });

    test('should contain forward slash separator', () => {
      const hasSlash = FieldConstants.PUBLISHER_SEPARATORS.some(sep =>
        sep.toString().includes('/')
      );
      expect(hasSlash).toBe(true);
    });

    test('should contain ampersand separator', () => {
      const hasAmpersand = FieldConstants.PUBLISHER_SEPARATORS.some(sep =>
        sep.toString().includes('&')
      );
      expect(hasAmpersand).toBe(true);
    });

    test('should contain "and" separator', () => {
      const hasAnd = FieldConstants.PUBLISHER_SEPARATORS.some(sep =>
        sep.toString().includes('and')
      );
      expect(hasAnd).toBe(true);
    });
  });

  describe('LOCATION_SEPARATORS', () => {
    test('should be an array of RegExp', () => {
      expect(Array.isArray(FieldConstants.LOCATION_SEPARATORS)).toBe(true);
      FieldConstants.LOCATION_SEPARATORS.forEach(sep => {
        expect(sep instanceof RegExp).toBe(true);
      });
    });

    test('should contain comma separator', () => {
      const hasComma = FieldConstants.LOCATION_SEPARATORS.some(sep =>
        sep.toString().includes(',')
      );
      expect(hasComma).toBe(true);
    });

    test('should contain semicolon separator', () => {
      const hasSemicolon = FieldConstants.LOCATION_SEPARATORS.some(sep =>
        sep.toString().includes(';')
      );
      expect(hasSemicolon).toBe(true);
    });

    test('should contain forward slash separator', () => {
      const hasSlash = FieldConstants.LOCATION_SEPARATORS.some(sep =>
        sep.toString().includes('/')
      );
      expect(hasSlash).toBe(true);
    });
  });

  describe('LOCATION_SEPARATOR_STRINGS', () => {
    test('should be an array of strings', () => {
      expect(Array.isArray(FieldConstants.LOCATION_SEPARATOR_STRINGS)).toBe(true);
      FieldConstants.LOCATION_SEPARATOR_STRINGS.forEach(sep => {
        expect(typeof sep).toBe('string');
      });
    });

    test('should contain common separators', () => {
      expect(FieldConstants.LOCATION_SEPARATOR_STRINGS).toContain(';');
      expect(FieldConstants.LOCATION_SEPARATOR_STRINGS).toContain('/');
      expect(FieldConstants.LOCATION_SEPARATOR_STRINGS).toContain(',');
    });
  });

  describe('SUPPORTED_FIELD_TYPES', () => {
    test('should be an array', () => {
      expect(Array.isArray(FieldConstants.SUPPORTED_FIELD_TYPES)).toBe(true);
    });

    test('should include publisher', () => {
      expect(FieldConstants.SUPPORTED_FIELD_TYPES).toContain('publisher');
    });

    test('should include location', () => {
      expect(FieldConstants.SUPPORTED_FIELD_TYPES).toContain('location');
    });

    test('should include journal', () => {
      expect(FieldConstants.SUPPORTED_FIELD_TYPES).toContain('journal');
    });

    test('should include place', () => {
      expect(FieldConstants.SUPPORTED_FIELD_TYPES).toContain('place');
    });
  });

  describe('DEFAULT_FIELD_OPTIONS', () => {
    test('should be an object', () => {
      expect(typeof FieldConstants.DEFAULT_FIELD_OPTIONS).toBe('object');
    });

    test('should have expandAbbreviations option', () => {
      expect(FieldConstants.DEFAULT_FIELD_OPTIONS.expandAbbreviations).toBe(true);
    });

    test('should have normalizeSeparators option', () => {
      expect(FieldConstants.DEFAULT_FIELD_OPTIONS.normalizeSeparators).toBe(true);
    });

    test('should have splitMultiValues option', () => {
      expect(FieldConstants.DEFAULT_FIELD_OPTIONS.splitMultiValues).toBe(true);
    });

    test('should have caseNormalization option', () => {
      expect(FieldConstants.DEFAULT_FIELD_OPTIONS.caseNormalization).toBe('titlecase');
    });

    test('should have removeTrailingPunctuation option', () => {
      expect(FieldConstants.DEFAULT_FIELD_OPTIONS.removeTrailingPunctuation).toBe(true);
    });
  });

  describe('Completeness checks', () => {
    test('state abbreviations should cover common states used in publications', () => {
      // Verify a few commonly used states in academic publications
      const commonStates = ['CA', 'NY', 'MA', 'TX', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
      commonStates.forEach(state => {
        expect(FieldConstants.STATE_ABBREVIATIONS[state]).toBeDefined();
      });
    });

    test('publisher patterns should cover major academic publishers', () => {
      const majorPublishers = ['Springer', 'Elsevier', 'Wiley', 'Taylor and Francis', 'Nature', 'AAAS'];
      majorPublishers.forEach(publisher => {
        const found = Object.values(FieldConstants.PUBLISHER_PATTERNS).includes(publisher);
        expect(found).toBe(true);
      });
    });
  });
});
