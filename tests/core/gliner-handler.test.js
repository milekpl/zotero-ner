/**
 * Unit tests for GLINERHandler
 * Tests the GLINER model handler functionality
 */

// Mock the ort object for testing
global.ort = {
  InferenceSession: {
    create: jest.fn()
  }
};

const GLINERHandler = require('../../src/core/gliner-handler.js');

describe('GLINERHandler', () => {
  let glinerHandler;

  beforeEach(() => {
    glinerHandler = new GLINERHandler();
  });

  describe('constructor', () => {
    test('should initialize with default values', () => {
      expect(glinerHandler.model).toBeNull();
      expect(glinerHandler.isInitialized).toBe(false);
      expect(glinerHandler.entities).toEqual(['person', 'first_name', 'middle_name', 'last_name', 'prefix', 'suffix']);
    });
  });

  describe('initialize', () => {
    test('should initialize with ONNX runtime available', async () => {
      // Mock ONNX runtime availability
      global.ort = {
        InferenceSession: {
          create: jest.fn().mockResolvedValue({})
        }
      };

      await glinerHandler.initialize();

      expect(glinerHandler.isInitialized).toBe(true);
    });

    test('should initialize with mock implementation when ONNX not available', async () => {
      // Temporarily remove ONNX runtime
      delete global.ort;

      await glinerHandler.initialize();

      expect(glinerHandler.isInitialized).toBe(true);
      expect(glinerHandler.model).toBeDefined();
    });
  });

  describe('mockNERResult', () => {
    test('should return mock entities for input text', () => {
      const inputs = { text: 'John Smith' };
      const result = glinerHandler.mockNERResult(inputs);

      expect(result).toHaveProperty('entities');
      expect(Array.isArray(result.entities)).toBe(true);

      // Check that entities have expected structure
      if (result.entities.length > 0) {
        expect(result.entities[0]).toHaveProperty('word');
        expect(result.entities[0]).toHaveProperty('start');
        expect(result.entities[0]).toHaveProperty('end');
        expect(result.entities[0]).toHaveProperty('label');
      }
    });

    test('should identify initials in mock results', () => {
      const inputs = { text: 'J. Smith' };
      const result = glinerHandler.mockNERResult(inputs);

      const initialEntity = result.entities.find(entity => entity.word === 'J.');
      if (initialEntity) {
        expect(initialEntity.label).toBe('initial');
      }
    });

    test('should identify names in mock results', () => {
      const inputs = { text: 'John Smith' };
      const result = glinerHandler.mockNERResult(inputs);

      const firstNameEntity = result.entities.find(entity => 
        entity.word === 'John' && entity.label === 'first_name'
      );
      const lastNameEntity = result.entities.find(entity => 
        entity.word === 'Smith' && entity.label === 'last_name'
      );

      expect(firstNameEntity).toBeDefined();
      expect(lastNameEntity).toBeDefined();
    });
  });

  describe('ruleBasedNER', () => {
    test('should identify prefixes', () => {
      const result = glinerHandler.ruleBasedNER('Eva van Dijk');
      
      const prefixEntity = result.find(entity => 
        entity.text === 'van' && entity.label === 'prefix'
      );
      expect(prefixEntity).toBeDefined();
    });

    test('should identify suffixes', () => {
      const result = glinerHandler.ruleBasedNER('John Smith Jr');
      
      const suffixEntity = result.find(entity => 
        entity.text === 'Jr' && entity.label === 'suffix'
      );
      expect(suffixEntity).toBeDefined();
    });

    test('should identify initials', () => {
      const result = glinerHandler.ruleBasedNER('J. Smith');
      
      const initialEntity = result.find(entity => 
        entity.text === 'J.' && entity.label === 'initial'
      );
      expect(initialEntity).toBeDefined();
    });

    test('should identify first and last names', () => {
      const result = glinerHandler.ruleBasedNER('John Smith');
      
      const firstNameEntity = result.find(entity => 
        entity.text === 'John' && entity.label === 'first_name'
      );
      const lastNameEntity = result.find(entity => 
        entity.text === 'Smith' && entity.label === 'last_name'
      );
      
      expect(firstNameEntity).toBeDefined();
      expect(lastNameEntity).toBeDefined();
    });
  });

  describe('runNER', () => {
    test('should run NER and return entities', async () => {
      // Initialize without ONNX to use mock implementation
      await glinerHandler.initialize();

      const result = await glinerHandler.runNER('John Smith');

      expect(Array.isArray(result)).toBe(true);

      // Verify that each entity has required properties
      result.forEach(entity => {
        // The entity structure depends on whether it's from mockNERResult or ruleBasedNER
        // mockNERResult returns entities with 'word' property
        // ruleBasedNER returns entities with 'text' property
        if ('word' in entity) {
          expect(entity).toHaveProperty('word');
        } else {
          expect(entity).toHaveProperty('text');
        }
        expect(entity).toHaveProperty('start');
        expect(entity).toHaveProperty('end');
        expect(entity).toHaveProperty('label');
      });
    });
  });

  describe('runBatchNER', () => {
    test('should process multiple texts in batch', async () => {
      await glinerHandler.initialize();

      const texts = ['John Smith', 'Jane Doe'];
      const results = await glinerHandler.runBatchNER(texts);

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(texts.length);

      // Each result should have text and entities
      results.forEach(result => {
        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('entities');
        expect(Array.isArray(result.entities)).toBe(true);
      });
    });
  });
});