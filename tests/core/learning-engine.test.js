const LearningEngine = require('../../src/core/learning-engine.js');

describe('LearningEngine', () => {
  let engine;

  beforeEach(async () => {
    engine = new LearningEngine();
    // Clear mappings for a clean test
    engine.mappings = new Map();
    await engine.saveMappings();
  });

  test('should store and retrieve a mapping', async () => {
    await engine.storeMapping('Jerry Fodor', 'Jerry Alan Fodor');
    const retrieved = engine.getMapping('Jerry Fodor');
    expect(retrieved).toBe('Jerry Alan Fodor');
  });

  test('should find similar names', async () => {
    await engine.storeMapping('Jerry Fodor', 'Jerry Alan Fodor');
    const similars = engine.findSimilar('J. Fodor');
    expect(similars.length).toBeGreaterThan(0);
    expect(similars[0].normalized).toBe('Jerry Alan Fodor');
  });

  test('should check if mapping exists', async () => {
    await engine.storeMapping('Jerry Fodor', 'Jerry Alan Fodor');
    expect(engine.hasMapping('Jerry Fodor')).toBe(true);
    expect(engine.hasMapping('Unknown Name')).toBe(false);
  });

  test('should calculate similarity between names', () => {
    const similarity = engine.calculateSimilarity('Jerry Fodor', 'J. Fodor');
    expect(similarity).toBeGreaterThan(0.5); // Should be similar
  });

  test('should recognize similar words with initials', () => {
    expect(engine.isSimilarWord('J.', 'Jerry')).toBe(true);
    expect(engine.isSimilarWord('Jerry', 'J.')).toBe(true);
    expect(engine.isSimilarWord('John', 'Jane')).toBe(false);
  });

  test('should handle multiple mappings correctly', async () => {
    await engine.storeMapping('Jerry Fodor', 'Jerry Alan Fodor', 0.9);
    await engine.storeMapping('J. Fodor', 'Jerry Alan Fodor', 0.8);
    
    const mapping1 = engine.getMapping('Jerry Fodor');
    const mapping2 = engine.getMapping('J. Fodor');
    
    expect(mapping1).toBe('Jerry Alan Fodor');
    expect(mapping2).toBe('Jerry Alan Fodor');
  });

  test('should return mapping details with metadata', async () => {
    await engine.storeMapping('Jerry Fodor', 'Jerry Alan Fodor', 0.95);
    
    const details = engine.getMappingDetails('Jerry Fodor');
    
    expect(details).toHaveProperty('normalized', 'Jerry Alan Fodor');
    expect(details).toHaveProperty('confidence', 0.95);
    // Note: getMappingDetails calls recordUsage internally, so usage count will be 2
    expect(details).toHaveProperty('usageCount', 2); // Initial storage + getMappingDetails
  });

  test('should return all mappings', () => {
    expect(engine.getAllMappings()).toBeInstanceOf(Map);
    
    // Add a mapping and verify it's included
    engine.mappings.set('jerry fodor', {
      raw: 'Jerry Fodor',
      normalized: 'Jerry Alan Fodor',
      confidence: 1.0
    });
    
    const allMappings = engine.getAllMappings();
    expect(allMappings.has('jerry fodor')).toBe(true);
  });

  test('should remove specific mappings', async () => {
    await engine.storeMapping('Jerry Fodor', 'Jerry Alan Fodor');
    expect(engine.hasMapping('Jerry Fodor')).toBe(true);
    
    await engine.removeMapping('Jerry Fodor');
    expect(engine.hasMapping('Jerry Fodor')).toBe(false);
  });

  test('should clear all mappings', async () => {
    await engine.storeMapping('Jerry Fodor', 'Jerry Alan Fodor');
    expect(engine.getAllMappings().size).toBeGreaterThan(0);
    
    await engine.clearAllMappings();
    expect(engine.getAllMappings().size).toBe(0);
  });

  test('should create canonical keys correctly', () => {
    expect(engine.createCanonicalKey('Jerry Fodor')).toBe('jerry fodor');
    expect(engine.createCanonicalKey('Jerry   Fodor')).toBe('jerry fodor'); // Normalize spaces
    // The createCanonicalKey method removes periods, so 'J.' becomes 'j'
    expect(engine.createCanonicalKey('J. Fodor')).toBe('j fodor');
    expect(engine.createCanonicalKey('J.Fodor')).toBe('jfodor'); // Remove punctuation and normalize
  });

  test('should calculate Jaro-Winkler similarity', () => {
    // Same strings should have similarity of 1.0
    expect(engine.jaroWinklerSimilarity('Smith', 'Smith')).toBe(1.0);
    
    // Similar strings should have high similarity
    expect(engine.jaroWinklerSimilarity('Smith', 'Smyth')).toBeGreaterThan(0.8);
    
    // Different strings should have lower similarity
    expect(engine.jaroWinklerSimilarity('Smith', 'Johnson')).toBeLessThan(0.5);
  });

  test('should calculate LCS similarity', () => {
    // Same strings should have similarity of 1.0
    expect(engine.lcsSimilarity('John Smith', 'John Smith')).toBe(1.0);
    
    // Similar strings should have high similarity
    expect(engine.lcsSimilarity('John Smith', 'J. Smith')).toBeGreaterThan(0.5);
  });

  test('should check if one word is abbreviation of another', () => {
    // The isAbbreviation function checks if abbr length is less than full length
    // and if abbr characters match the beginning of full
    expect(engine.isAbbreviation('J', 'John')).toBe(true);
    expect(engine.isAbbreviation('Jo', 'John')).toBe(true);
    expect(engine.isAbbreviation('John', 'J.')).toBe(false); // Not an abbreviation
    expect(engine.isAbbreviation('Smith', 'Smyth')).toBe(false);
  });

  test('should calculate initial matching similarity', () => {
    const similarity = engine.initialMatchingSimilarity('John Smith', 'J. Smith');
    expect(similarity).toBeGreaterThan(0.5); // Should be similar
  });

  test('should compare name parts with high similarity for same names', () => {
    const similarity = engine.compareNameParts('John', 'John');
    expect(similarity).toBe(1.0);
  });

  test('should handle initials in name part comparison', () => {
    const similarity = engine.compareNameParts('J.', 'John');
    expect(similarity).toBe(0.8); // Should be considered similar
  });

  test('should export and import mappings', async () => {
    await engine.storeMapping('Jerry Fodor', 'Jerry Alan Fodor', 0.95);
    
    const exported = engine.exportMappings();
    
    // Verify export structure
    expect(exported).toHaveProperty('version', '1.0');
    expect(exported).toHaveProperty('mappings');
    expect(Array.isArray(exported.mappings)).toBe(true);
    
    // Create a new engine and import
    const newEngine = new LearningEngine();
    newEngine.mappings = new Map(); // Clear default mappings
    newEngine.importMappings(exported);
    
    // Verify the mapping was imported
    const retrieved = newEngine.getMapping('Jerry Fodor');
    expect(retrieved).toBe('Jerry Alan Fodor');
  });

  test('should get statistics', async () => {
    await engine.storeMapping('Jerry Fodor', 'Jerry Alan Fodor', 0.95);
    await engine.storeMapping('J. Fodor', 'Jerry Alan Fodor', 0.85);
    
    const stats = engine.getStatistics();
    
    expect(stats).toHaveProperty('totalMappings', 2);
    expect(stats).toHaveProperty('totalUsage');
    expect(stats).toHaveProperty('averageUsage');
    expect(stats).toHaveProperty('averageConfidence');
  });

  test('should record usage when accessing mappings', async () => {
    await engine.storeMapping('Jerry Fodor', 'Jerry Alan Fodor');
    // The storeMapping call creates the entry with usageCount = 1 initially
    // Then getMappingDetails increments it to 2
    const initialDetails = engine.getMappingDetails('Jerry Fodor');
    expect(initialDetails.usageCount).toBe(2);

    // Access again to increment usage
    await engine.recordUsage('Jerry Fodor');
    const updatedDetails = engine.getMappingDetails('Jerry Fodor');
    // At this point, it would be 4 (recordUsage + getMappingDetails again)
    expect(updatedDetails.usageCount).toBe(4);
  });
});

describe('LearningEngine - Skip Learning', () => {
  let engine;

  beforeEach(async () => {
    engine = new LearningEngine();
    // Clear mappings and skipped pairs for clean tests
    engine.mappings = new Map();
    engine.skippedPairs = new Set();
    await engine.saveMappings();
    // Clear storage for skipped pairs
    const storage = engine.getStorage();
    storage.removeItem(engine.skipStorageKey);
  });

  describe('Skip Key Generation', () => {
    test('should generate consistent keys for same input', () => {
      const key1 = engine.generateSkipKey('Smith', 'John');
      const key2 = engine.generateSkipKey('Smith', 'John');

      expect(key1).toBe(key2);
    });

    test('should generate different keys for different surnames', () => {
      const key1 = engine.generateSkipKey('Smith', 'John');
      const key2 = engine.generateSkipKey('Jones', 'John');

      expect(key1).not.toBe(key2);
    });

    test('should generate different keys for different first names', () => {
      const key1 = engine.generateSkipKey('Smith', 'John');
      const key2 = engine.generateSkipKey('Smith', 'Jane');

      expect(key1).not.toBe(key2);
    });

    test('should normalize case in skip keys', () => {
      const key1 = engine.generateSkipKey('smith', 'john');
      const key2 = engine.generateSkipKey('SMITH', 'JOHN');

      expect(key1).toBe(key2);
    });

    test('should normalize whitespace in skip keys', () => {
      const key1 = engine.generateSkipKey('Smith', 'John');
      const key2 = engine.generateSkipKey('Smith', '  John  ');

      expect(key1).toBe(key2);
    });

    test('should handle null/undefined surname', () => {
      const key1 = engine.generateSkipKey(null, 'John');
      const key2 = engine.generateSkipKey(undefined, 'John');

      expect(key1).toBe(key2);
    });

    test('should handle null/undefined first name', () => {
      const key1 = engine.generateSkipKey('Smith', null);
      const key2 = engine.generateSkipKey('Smith', undefined);

      expect(key1).toBe(key2);
    });

    test('should handle empty strings', () => {
      const key1 = engine.generateSkipKey('', '');
      const key2 = engine.generateSkipKey('', '');

      expect(key1).toBe(key2);
    });

    test('should generate keys with correct format', () => {
      const key = engine.generateSkipKey('Smith', 'John');

      expect(key).toMatch(/^name:skip:[a-f0-9]+:[a-f0-9]+$/);
    });
  });

  describe('Skip Decision Recording', () => {
    test('should record skip decision', async () => {
      await engine.recordSkipDecision('Smith', 'John');

      const key = engine.generateSkipKey('Smith', 'John');
      expect(engine.skippedPairs.has(key)).toBe(true);
    });

    test('should record skip decision with context', async () => {
      const context = { type: 'given-name', timestamp: Date.now() };
      await engine.recordSkipDecision('Smith', 'John', context);

      const key = engine.generateSkipKey('Smith', 'John');
      expect(engine.skippedPairs.has(key)).toBe(true);
    });

    test('should persist skip decisions', async () => {
      await engine.recordSkipDecision('Smith', 'John');

      // Create new engine instance
      const newEngine = new LearningEngine();
      const key = newEngine.generateSkipKey('Smith', 'John');

      expect(newEngine.skippedPairs.has(key)).toBe(true);
    });

    test('should record multiple skip decisions', async () => {
      await engine.recordSkipDecision('Smith', 'John');
      await engine.recordSkipDecision('Smith', 'Jane');
      await engine.recordSkipDecision('Jones', 'Bob');

      expect(engine.skippedPairs.size).toBe(3);
    });
  });

  describe('Skip Suggestion Checking', () => {
    test('should return true for skipped suggestion', async () => {
      await engine.recordSkipDecision('Smith', 'John');

      const suggestion = { surname: 'Smith', firstNamePattern: 'John' };
      expect(engine.shouldSkipSuggestion(suggestion)).toBe(true);
    });

    test('should return false for non-skipped suggestion', async () => {
      const suggestion = { surname: 'Smith', firstNamePattern: 'John' };
      expect(engine.shouldSkipSuggestion(suggestion)).toBe(false);
    });

    test('should handle suggestion without firstNamePattern', async () => {
      await engine.recordSkipDecision('Smith', '');

      const suggestion = { surname: 'Smith', firstNamePattern: '' };
      expect(engine.shouldSkipSuggestion(suggestion)).toBe(true);
    });

    test('should be case insensitive for checking', async () => {
      await engine.recordSkipDecision('Smith', 'John');

      const suggestion = { surname: 'SMITH', firstNamePattern: 'JOHN' };
      expect(engine.shouldSkipSuggestion(suggestion)).toBe(true);
    });
  });

  describe('Skip Filtering', () => {
    test('should filter out skipped suggestions', async () => {
      await engine.recordSkipDecision('Smith', 'John');

      const suggestions = [
        { surname: 'Smith', firstNamePattern: 'John' },
        { surname: 'Smith', firstNamePattern: 'Jane' },
        { surname: 'Jones', firstNamePattern: 'Bob' }
      ];

      const filtered = engine.filterSkippedSuggestions(suggestions);

      expect(filtered.length).toBe(2);
      expect(filtered[0].surname).toBe('Smith');
      expect(filtered[0].firstNamePattern).toBe('Jane');
    });

    test('should handle empty suggestions array', async () => {
      const filtered = engine.filterSkippedSuggestions([]);

      expect(filtered).toEqual([]);
    });

    test('should return all suggestions when none skipped', async () => {
      const suggestions = [
        { surname: 'Smith', firstNamePattern: 'John' },
        { surname: 'Jones', firstNamePattern: 'Bob' }
      ];

      const filtered = engine.filterSkippedSuggestions(suggestions);

      expect(filtered.length).toBe(2);
    });
  });

  describe('Skip Statistics', () => {
    test('should return correct skip count', async () => {
      await engine.recordSkipDecision('Smith', 'John');
      await engine.recordSkipDecision('Jones', 'Jane');

      const stats = engine.getSkipStatistics();

      expect(stats.skippedCount).toBe(2);
    });

    test('should return zero for no skips', () => {
      const stats = engine.getSkipStatistics();

      expect(stats.skippedCount).toBe(0);
    });
  });

  describe('Clear Skipped', () => {
    test('should clear all skipped pairs', async () => {
      await engine.recordSkipDecision('Smith', 'John');
      await engine.recordSkipDecision('Jones', 'Jane');

      await engine.clearSkippedPairs();

      expect(engine.skippedPairs.size).toBe(0);
    });

    test('should persist after clearing', async () => {
      await engine.recordSkipDecision('Smith', 'John');
      await engine.clearSkippedPairs();

      // Create new engine instance
      const newEngine = new LearningEngine();

      expect(newEngine.skippedPairs.size).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle special characters in names', async () => {
      await engine.recordSkipDecision("O'Brien", "Sean");

      const key = engine.generateSkipKey("O'Brien", "Sean");
      expect(engine.skippedPairs.has(key)).toBe(true);
    });

    test('should handle unicode characters', async () => {
      await engine.recordSkipDecision('Müller', 'Hans');

      const key = engine.generateSkipKey('Müller', 'Hans');
      expect(engine.skippedPairs.has(key)).toBe(true);
    });

    test('should handle very long names', async () => {
      const longSurname = 'A'.repeat(1000);
      const longFirstName = 'B'.repeat(1000);

      const key = engine.generateSkipKey(longSurname, longFirstName);

      expect(key).toMatch(/^name:skip:[a-f0-9]+:[a-f0-9]+$/);
    });

    test('should handle suggestions with different property names', async () => {
      // Testing firstNamePattern vs firstName
      await engine.recordSkipDecision('Smith', 'John');

      const suggestion1 = { surname: 'Smith', firstNamePattern: 'John' };
      const suggestion2 = { surname: 'Smith', firstName: 'John' };

      expect(engine.shouldSkipSuggestion(suggestion1)).toBe(true);
      expect(engine.shouldSkipSuggestion(suggestion2)).toBe(true);
    });
  });
});