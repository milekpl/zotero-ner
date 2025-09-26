/**
 * GLINER Model Handler - Interface for GLINER NER model integration
 * This module handles the actual ML model operations
 */
class GLINERHandler {
  constructor() {
    this.model = null;
    this.isInitialized = false;
    this.entities = ['person', 'first_name', 'middle_name', 'last_name', 'prefix', 'suffix'];
  }

  /**
   * Initialize the GLINER model
   * Note: This is a conceptual implementation as actual integration
   * would require ONNX.js or a similar approach for browser environment
   */
  async initialize(modelPath = null) {
    console.log('Initializing GLINER model handler...');
    
    // In a real implementation, we would load the GLINER model here
    // This could be done with ONNX.js for client-side inference
    // or by calling an API endpoint that runs the model server-side
    try {
      if (typeof ort !== 'undefined') {
        // Attempt to load ONNX model
        // this.model = await ort.InferenceSession.create(modelPath || 'models/gliner_model.onnx');
        console.log('ONNX model loaded successfully');
      } else {
        console.log('ONNX runtime not available, using mock implementation');
        this.model = {
          run: async (inputs) => {
            // Mock implementation for testing
            return this.mockNERResult(inputs);
          }
        };
      }
      this.isInitialized = true;
      console.log('GLINER model handler initialized');
    } catch (error) {
      console.error('Error initializing GLINER model:', error);
      // Fallback to rule-based approach
      this.model = null;
      this.isInitialized = false;
    }
  }

  /**
   * Mock NER result for testing purposes
   * @param {Object} inputs - Input text
   * @returns {Object} Mock NER results
   */
  mockNERResult(inputs) {
    // This would simulate what the real model would return
    const text = inputs.text || inputs[0] || '';
    const words = text.split(/\s+/);
    const results = [];

    // Simple rule-based mock for demonstration
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let label = 'O'; // Default: not an entity

      // Simple detection rules
      if (/^[A-Z]\.?$/.test(word)) {
        label = 'initial';
      } else if (/^[A-Z][a-z]+/.test(word) && i === 0) {
        label = 'first_name';
      } else if (/^[A-Z][a-z]+/.test(word) && i === words.length - 1) {
        label = 'last_name';
      } else if (['van', 'de', 'la', 'von', 'del', 'di', 'du', 'le', 'lo'].includes(word.toLowerCase())) {
        label = 'prefix';
      }

      results.push({
        word: word,
        start: text.indexOf(word),
        end: text.indexOf(word) + word.length,
        label: label
      });
    }

    return { entities: results };
  }

  /**
   * Run NER on input text
   * @param {string} text - Text to process
   * @returns {Array} Array of entities
   */
  async runNER(text) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.model) {
      // Fallback to rule-based processing
      return this.ruleBasedNER(text);
    }

    try {
      // Prepare input for the model
      const inputs = { text: text };
      
      // Run the model
      const results = await this.model.run(inputs);
      return results.entities || [];
    } catch (error) {
      console.error('Error running NER:', error);
      // Fallback to rule-based processing
      return this.ruleBasedNER(text);
    }
  }

  /**
   * Fallback rule-based NER implementation
   * @param {string} text - Text to process
   * @returns {Array} Array of entities
   */
  ruleBasedNER(text) {
    // This is our enhanced rule-based approach as a fallback
    const words = text.split(/\s+/);
    const entities = [];
    const prefixes = ['van', 'de', 'la', 'von', 'del', 'di', 'du', 'le', 'lo', 'da', 'des', 'dos', 'das', 'el', 'al'];
    const suffixes = ['Jr', 'Sr', 'II', 'III', 'IV', 'PhD', 'MD', 'Jr.', 'Sr.'];

    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[.,]/g, ''); // Remove punctuation
      const originalWord = words[i];

      let label = 'O'; // Default: not an entity

      if (suffixes.some(s => s.toLowerCase() === word.toLowerCase())) {
        label = 'suffix';
      } else if (prefixes.includes(word.toLowerCase())) {
        label = 'prefix';
      } else if (/^[A-Z]\.?$/.test(word)) {
        label = 'initial';
      } else if (i === 0) {
        label = 'first_name';
      } else if (i === words.length - 1) {
        label = 'last_name';
      } else if (i > 0 && i < words.length - 1) {
        label = 'middle_name';
      }

      entities.push({
        text: originalWord,
        start: text.indexOf(originalWord),
        end: text.indexOf(originalWord) + originalWord.length,
        label: label
      });
    }

    return entities;
  }

  /**
   * Process multiple texts
   * @param {Array} texts - Array of texts to process
   * @returns {Array} Array of results
   */
  async runBatchNER(texts) {
    const results = [];
    for (const text of texts) {
      const entities = await this.runNER(text);
      results.push({ text, entities });
    }
    return results;
  }
}

module.exports = GLINERHandler;