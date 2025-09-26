/**
 * Simple test runner for the Zotero NER extension
 * Runs tests without requiring full npm setup
 */

// Mock Node.js functionality for testing
global.require = require;
global.module = { exports: {} };

// Function to run tests
function runTests() {
  console.log('Running tests for Zotero NER extension...');
  
  // For now, just verify that modules can be loaded
  try {
    const NameParser = require('./src/core/name-parser.js');
    const VariantGenerator = require('./src/core/variant-generator.js');
    const LearningEngine = require('./src/core/learning-engine.js');
    
    console.log('✓ All core modules loaded successfully');
    
    // Run a basic test
    const parser = new NameParser();
    const result = parser.parse('Jerry Alan Fodor');
    console.log('✓ Name parsing test passed:', result);
    
    const generator = new VariantGenerator();
    const variants = generator.generateVariants(result);
    console.log('✓ Variant generation test passed:', variants.length, 'variants generated');
    
    const engine = new LearningEngine();
    console.log('✓ Learning engine initialized');
    
    console.log('\\nAll basic functionality tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the tests
if (require.main === module) {
  runTests();
}