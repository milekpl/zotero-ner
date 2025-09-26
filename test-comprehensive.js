/**
 * Comprehensive test suite for the complete Zotero NER extension
 */

const NERProcessor = require('./src/core/ner-processor.js');
const NameParser = require('./src/core/name-parser.js');
const VariantGenerator = require('./src/core/variant-generator.js');
const LearningEngine = require('./src/core/learning-engine.js');
const ItemProcessor = require('./src/zotero/item-processor.js');
const NormalizerDialog = require('./src/ui/normalizer-dialog.js');

async function runComprehensiveTests() {
  console.log('Running comprehensive tests for Zotero NER extension...\n');
  
  let testsPassed = 0;
  let totalTests = 0;

  // Test 1: Name Parsing
  console.log('Test 1: Name Parsing');
  totalTests++;
  try {
    const parser = new NameParser();
    const result1 = parser.parse('Jerry Alan Fodor');
    assert(result1.firstName === 'Jerry', 'First name parsing failed');
    assert(result1.middleName === 'Alan', 'Middle name parsing failed');
    assert(result1.lastName === 'Fodor', 'Last name parsing failed');
    
    const result2 = parser.parse('Eva van Dijk');
    assert(result2.prefix === 'van', 'Prefix parsing failed');
    assert(result2.firstName === 'Eva', 'First name with prefix failed');
    assert(result2.lastName === 'Dijk', 'Last name with prefix failed');
    
    console.log('✓ Name parsing tests passed');
    testsPassed++;
  } catch (error) {
    console.log('✗ Name parsing tests failed:', error.message);
  }

  // Test 2: Variant Generation
  console.log('\nTest 2: Variant Generation');
  totalTests++;
  try {
    const parser = new NameParser();  // Added missing parser definition
    const generator = new VariantGenerator();
    const parsed = parser.parse('Jerry Alan Fodor');
    const variants = generator.generateVariants(parsed);
    
    assert(variants.length >= 3, 'Should generate multiple variants');
    assert(variants.includes('Jerry Alan Fodor'), 'Full form should be generated');
    assert(variants.some(v => v.includes('J.')), 'Initial form should be generated');
    
    console.log('✓ Variant generation tests passed');
    testsPassed++;
  } catch (error) {
    console.log('✗ Variant generation tests failed:', error.message);
  }

  // Test 3: Learning Engine
  console.log('\nTest 3: Learning Engine');
  totalTests++;
  try {
    const learningEngine = new LearningEngine();
    
    // Test storing and retrieving
    await learningEngine.storeMapping('J. Fodor', 'Jerry Alan Fodor');
    const retrieved = learningEngine.getMapping('J. Fodor');
    assert(retrieved === 'Jerry Alan Fodor', 'Learning engine store/retrieve failed');
    
    // Test similarity
    const similars = learningEngine.findSimilar('Jerry Fodor');
    assert(Array.isArray(similars), 'Find similar should return array');
    
    console.log('✓ Learning engine tests passed');
    testsPassed++;
  } catch (error) {
    console.log('✗ Learning engine tests failed:', error.message);
  }

  // Test 4: Full Processing Pipeline
  console.log('\nTest 4: Full Processing Pipeline');
  totalTests++;
  try {
    // Mock a Zotero item
    const mockItem = {
      id: 1,
      getField: function(field) {
        if (field === 'title') return 'Test Paper';
        return '';
      },
      getCreators: function() {
        return [
          { 
            firstName: 'Jerry', 
            lastName: 'Fodor', 
            creatorType: 'author' 
          },
          { 
            firstName: 'J.A.', 
            lastName: 'Fodor', 
            creatorType: 'author' 
          }
        ];
      }
    };
    
    const itemProcessor = new ItemProcessor();
    const results = await itemProcessor.processItemCreators(mockItem);
    
    assert(Array.isArray(results), 'Should return array of results');
    assert(results.length === 2, 'Should process both creators');
    
    console.log('✓ Full processing pipeline tests passed');
    testsPassed++;
  } catch (error) {
    console.log('✗ Full processing pipeline tests failed:', error.message);
  }
  
  // Test 5: NER Processing
  console.log('\nTest 5: NER Processing');
  totalTests++;
  try {
    const nerProcessor = new NERProcessor();
    await nerProcessor.initialize();
    
    const parsed = await nerProcessor.parseName('Maria Martinez Garcia');
    assert(parsed.firstName === 'Maria', 'NER parsing of Spanish names failed');
    // For Spanish surnames, depending on implementation, it might be in lastName or middleName
    
    const confidence = nerProcessor.getConfidence(parsed);
    assert(typeof confidence === 'number' && confidence >= 0 && confidence <= 1, 
           'Confidence should be a number between 0 and 1');
    
    console.log('✓ NER processing tests passed');
    testsPassed++;
  } catch (error) {
    console.log('✗ NER processing tests failed:', error.message);
  }

  // Test 6: UI Components
  console.log('\nTest 6: UI Components');
  totalTests++;
  try {
    const dialog = new NormalizerDialog();
    
    // Mock items for UI testing
    const mockItems = [{
      id: 1,
      getField: function(field) {
        if (field === 'title') return 'Test Paper';
        return '';
      },
      getCreators: function() {
        return [
          { 
            firstName: 'J.', 
            lastName: 'Fodor', 
            creatorType: 'author' 
          }
        ];
      }
    }];
    
    // Process items through UI component
    const results = await dialog.processItem(mockItems[0]);
    assert(results.creators.length === 1, 'UI component should process creators');
    
    console.log('✓ UI component tests passed');
    testsPassed++;
  } catch (error) {
    console.log('✗ UI component tests failed:', error.message);
  }

  // Summary
  console.log(`\n\nTest Summary: ${testsPassed}/${totalTests} tests passed`);
  
  if (testsPassed === totalTests) {
    console.log('🎉 All tests passed! The extension is working correctly.');
    return true;
  } else {
    console.log('❌ Some tests failed. Please review the implementation.');
    return false;
  }
}

// Simple assertion helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runComprehensiveTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
}

module.exports = { runComprehensiveTests, assert };