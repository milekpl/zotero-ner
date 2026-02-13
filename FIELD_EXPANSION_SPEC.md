# Zotero Data Normalization - Field Expansion Spec

## Overview

This specification defines the expansion of Zotero Data Normalizer to support normalization of additional Zotero fields beyond author names. The goal is to provide intelligent, learned normalization capabilities for publisher names, locations, and journal names using the existing dialog system and learning engine architecture.

## Target Fields

### 1. Publisher Names (High Priority)
- **Zotero Field**: `publisher` (flat string field)
- **Normalization Opportunities**:
  - Handle ampersands vs "and" variations
  - Normalize separator variations (/, -, &, and)
  - Handle common publisher abbreviations
  - Standardize company name formats

### 2. Locations (High Priority)
- **Zotero Field**: `place` (flat string field)
- **Normalization Opportunities**:
  - Split on semicolons and slashes
  - Normalize state/province abbreviations
  - Handle multiple location formats
  - Standardize city/state/country ordering

### 3. Journal Names (Medium Priority)
- **Zotero Field**: `publicationTitle` (flat string field)
- **Normalization Opportunities**:
  - Handle journal abbreviations vs full names
  - Normalize title variations
  - Standardize journal name formats

## Architecture Changes

### 1. Core Field Normalizer System

#### FieldNormalizer Base Class
```javascript
class FieldNormalizer {
  constructor(fieldType, fieldName, fieldPath) {
    this.fieldType = fieldType;     // 'publisher', 'location', 'journal'
    this.fieldName = fieldName;     // 'publisher', 'location', 'journalTitle'
    this.fieldPath = fieldPath;     // Zotero field path
    this.variantGenerator = new FieldVariantGenerator();
    this.learningEngine = new ScopedLearningEngine();
  }

  // Main normalization pipeline
  async normalizeFieldValue(rawValue, item) {
    // 1. Parse and extract field value
    // 2. Generate variants
    // 3. Check learned mappings
    // 4. Find similar learned values
    // 5. Return normalization options
  }

  // Field-specific variant generation
  generateVariants(rawValue) {
    // Implemented by subclasses
  }

  // Field-specific parsing
  parseFieldValue(rawValue) {
    // Implemented by subclasses
  }
}
```

#### Field-Specific Implementations
- `PublisherNormalizer` - Handles publisher name normalization
- `LocationNormalizer` - Handles location parsing and normalization
- `JournalNormalizer` - Handles journal name normalization

### 2. Scoped Learning Engine Extension

#### ScopedLearningEngine Class
```javascript
class ScopedLearningEngine extends LearningEngine {
  constructor() {
    super();
    this.collectionScopeKey = 'field_normalizer_collection_scope';
  }

  // Store mappings with collection scope
  async storeScopedMapping(rawValue, normalizedValue, fieldType, collectionId = null) {
    // Store with scope prefix: {collectionId}::{fieldType}::{rawValue}
  }

  // Retrieve scoped mappings
  getScopedMapping(rawValue, fieldType, collectionId = null) {
    // Check scoped mappings first, then fall back to global
  }

  // Get available scopes
  getAvailableScopes() {
    // Return list of collections with learned mappings
  }
}
```

### 3. Parameterized Dialog System

#### FieldNormalizerDialog Class
```javascript
class FieldNormalizerDialog extends NormalizerDialog {
  constructor() {
    super();
    this.currentFieldNormalizer = null;
    this.availableFieldTypes = ['publisher', 'location', 'journal'];
  }

  // Show dialog for specific field type
  async showDialog(items, fieldType) {
    this.currentFieldNormalizer = this.getFieldNormalizer(fieldType);
    
    // Process items for the specific field
    const fieldResults = await this.processItemsForField(items, fieldType);
    
    // Present field-specific options
    return await this.presentFieldOptions(fieldResults, fieldType);
  }

  // Field-specific processing
  async processItemsForField(items, fieldType) {
    const results = [];
    
    for (const item of items) {
      const fieldValue = this.extractFieldValue(item, fieldType);
      if (fieldValue) {
        const processed = await this.currentFieldNormalizer.normalizeFieldValue(fieldValue, item);
        results.push({
          item,
          fieldType,
          fieldValue,
          processed
        });
      }
    }
    
    return results;
  }
}
```

## Field-Specific Processing Logic

### Publisher Name Normalization

#### Variant Generation Rules
1. **Separator Normalization**:
   - Replace " / " with " and "
   - Replace " - " with " and "
   - Replace " & " with " and "

2. **Abbreviation Handling**:
   - "Co." → "Company"
   - "Inc." → "Incorporated"
   - "Ltd." → "Limited"
   - "Pub." → "Publisher"

3. **Common Publisher Patterns**:
   - "Springer-Verlag" → "Springer"
   - "Cambridge University Press" → "Cambridge UP"
   - "Oxford University Press" → "Oxford UP"

#### Example Processing
```javascript
// Input: "Springer-Verlag / Cambridge University Press"
// Variants:
[
  "Springer-Verlag and Cambridge University Press",
  "Springer and Cambridge University Press",
  "Springer-Verlag and Cambridge UP",
  "Springer and Cambridge UP"
]
```

### Location Normalization

#### Multi-Location Splitting
```javascript
// Input: "Boca Raton, London, New York"
// Split into individual locations:
[
  "Boca Raton",
  "London",
  "New York"
]

// Input: "Springfield, Ill; Chicago, IL"
// Split and normalize:
[
  "Springfield, Illinois",
  "Chicago, Illinois"
]
```

#### State/Province Normalization
```javascript
const STATE_ABBREVIATIONS = {
  'Ill': 'Illinois',
  'IL': 'Illinois',
  'CA': 'California',
  'NY': 'New York'
  // ... full state list
};
```

### Journal Name Normalization

#### Abbreviation Handling
```javascript
// Input: "J. Comp. Ling."
// Variants:
[
  "Journal of Computational Linguistics",
  "Computational Linguistics",
  "J. Computational Linguistics"
]

// Input: "IEEE Trans. Pattern Anal. Mach. Intell."
// Variants:
[
  "IEEE Transactions on Pattern Analysis and Machine Intelligence",
  "IEEE Trans. Pattern Anal. Mach. Intell.",
  "Transactions on Pattern Analysis and Machine Intelligence"
]
```

## Collection-Based Scope Limitation

### Scope Management

#### Collection Detection
```javascript
class CollectionManager {
  async getAvailableCollections() {
    // Use Zotero API to get all collections
    // Return: [{ id, name, parentCollectionId }]
  }

  async getItemsInCollection(collectionId) {
    // Get all items belonging to a specific collection
  }

  async getCollectionsForItem(itemId) {
    // Get all collections that contain a specific item
  }
}
```

#### Scoped Processing
```javascript
// When processing with collection scope:
async function processWithCollectionScope(items, collectionId, fieldType) {
  // 1. Filter items to only those in the collection
  // 2. Process with collection-scoped learning engine
  // 3. Store mappings with collection scope
  // 4. Fall back to global mappings if no collection-specific mapping exists
}
```

### User Interface for Scope Selection

#### Collection Selection UI
- **Dropdown**: Single collection selection
- **Checkbox List**: Multiple collection selection
- **"All Collections"**: Library-wide processing (default)
- **Scope Indicator**: Show current scope in dialog title

#### Scope Persistence
- Store last used scope per field type
- Remember collection preferences across sessions
- Allow users to clear collection-specific learned mappings

## Integration Points

### 1. Zotero Menu Integration

#### Field-Specific Menu Items
```javascript
// Add to Zotero Tools menu
Zotero.menu.addItem({
  label: "Normalize Publisher Data",
  callback: (items) => this.fieldNormalizerDialog.showDialog(items, 'publisher')
});

Zotero.menu.addItem({
  label: "Normalize Location Data",
  callback: (items) => this.fieldNormalizerDialog.showDialog(items, 'location')
});

Zotero.menu.addItem({
  label: "Normalize Journal Data",
  callback: (items) => this.fieldNormalizerDialog.showDialog(items, 'journal')
});
```

### 2. Item Processing Pipeline

#### Enhanced ItemProcessor
```javascript
class FieldItemProcessor extends ItemProcessor {
  async processFieldValues(item, fieldType) {
    const fieldValue = this.extractFieldValue(item, fieldType);
    if (!fieldValue) return null;

    const fieldNormalizer = this.getFieldNormalizer(fieldType);
    return await fieldNormalizer.normalizeFieldValue(fieldValue, item);
  }

  extractFieldValue(item, fieldType) {
    switch(fieldType) {
      case 'publisher':
        return item.getField('publisher');
      case 'location':
        return item.getField('place');
      case 'journal':
        return item.getField('publicationTitle');
    }
  }
}
```

### 3. Data Extraction

#### Publisher Extraction
```javascript
extractPublisher(item) {
  // Zotero API uses flat string fields, not nested objects
  return item.getField('publisher');
}
```

#### Location Extraction
```javascript
extractLocation(item) {
  // Zotero API uses flat string fields, not nested objects  
  return item.getField('place');
}
```

## Performance Considerations

### 1. Batch Processing Optimization
- Process items in batches (100-200 items per batch)
- Use Web Workers for intensive processing
- Implement progress indicators for long operations

### 2. Caching Strategy
- Cache extracted field values per item
- Cache learned mappings with TTL
- Cache collection structure for faster access

### 3. Memory Management
- Limit in-memory storage of processed items
- Use streaming processing for large libraries
- Implement garbage collection for old cached data

## Error Handling and Edge Cases

### 1. Missing Field Values
- Gracefully handle items without target fields
- Skip processing for items missing required fields
- Provide user feedback for skipped items

### 2. Malformed Data
- Handle null or undefined field values
- Sanitize input to prevent processing errors
- Log and skip problematic items

### 3. Collection Conflicts
- Handle items in multiple collections
- Define clear precedence rules for scoped mappings
- Provide user control over conflict resolution

## Testing Strategy

### 1. Unit Tests
- Test field-specific normalization logic
- Test collection scope functionality
- Test error handling and edge cases

### 2. Integration Tests
- Test full workflow with Zotero API
- Test batch processing performance
- Test collection-based scope limitation

### 3. User Acceptance Tests
- Test UI workflows for each field type
- Test collection selection and scope management
- Test learned mapping persistence

## Success Metrics

### 1. Functional Metrics
- [ ] All three field types support normalization
- [ ] Collection scope limitation works correctly
- [ ] Learned mappings persist across sessions
- [ ] Batch processing handles large libraries efficiently
- [ ] Data extraction uses actual Zotero APIs correctly

### 2. Performance Metrics
- [ ] Processing 1000 items completes in under 30 seconds
- [ ] Memory usage stays below 100MB during processing
- [ ] UI remains responsive during batch operations
- [ ] Field extraction is optimized for flat string access

### 3. User Experience Metrics
- [ ] Dialog loads in under 2 seconds
- [ ] Collection selection is intuitive
- [ ] Progress indicators provide clear feedback
- [ ] Error messages are helpful and actionable
- [ ] Menu structure is logical and discoverable

---

*Document Version: 1.0*
*Last Updated: 2026-02-09*
*Author: Kilo AI Assistant*