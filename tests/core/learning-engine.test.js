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