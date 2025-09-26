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
});