# Architecture Documentation

This document describes the internal architecture of the Field Normalization system, including class relationships, data flow, and integration points.

## System Overview

The Field Normalization system extends the existing name normalization framework to support publisher names, locations, and journal names. It consists of several interconnected components:

```
                    +---------------------+
                    |   FieldNormalizer   |
                    |     Dialog UI       |
                    +----------+----------+
                               |
                               v
                    +----------+----------+
                    |  FieldItemProcessor|
                    +----------+----------+
                               |
        +----------------------+----------------------+
        |                      |                      |
        v                      v                      v
+-------+------+    +----------+--------+    +---------+--------+
| Publisher    |    | Location        |    | Journal           |
| Normalizer   |    | Normalizer      |    | Normalizer        |
+--------------+    +-----------------+    +-------------------+
        |                      |                      |
        +----------------------+----------------------+
                               |
                    +----------+----------+
                    | FieldVariant       |
                    | Generator          |
                    +----------+----------+
                               |
                               v
                    +----------+----------+
                    | ScopedLearning     |
                    | Engine             |
                    +--------------------+
```

## Core Components

### FieldNormalizer Base Class

**File**: `src/core/field-normalizer.js`

The `FieldNormalizer` class is the base class for all field-specific normalizers. It implements the factory pattern for creating field-specific normalizers and provides common functionality.

```javascript
class FieldNormalizer {
  static create(fieldType, fieldName, options = {}) {
    // Factory method - creates the appropriate normalizer
    switch (fieldType.toLowerCase()) {
      case 'publisher':
        return new PublisherNormalizer(fieldName, options);
      case 'location':
      case 'place':
        return new LocationNormalizer(fieldName, options);
      case 'journal':
      case 'publicationtitle':
        return new JournalNormalizer(fieldName, options);
      default:
        return new FieldNormalizer(fieldType, fieldName, options);
    }
  }
}
```

#### Key Methods

| Method | Description |
|--------|-------------|
| `normalizeFieldValue(rawValue, item)` | Main normalization pipeline - parses, generates variants, checks learned mappings |
| `generateVariants(rawValue)` | Abstract - implemented by subclasses for field-specific variant generation |
| `parseFieldValue(rawValue)` | Abstract - parses field value into components |
| `extractFieldValue(item)` | Abstract - extracts field value from Zotero item |
| `getLearnedMapping(rawValue)` | Retrieves learned mapping for a value |
| `storeLearnedMapping(rawValue, normalizedValue, confidence, collectionId)` | Stores a learned mapping |
| `createCanonicalKey(value)` | Creates canonical form for consistent lookups |

#### Default Options

```javascript
{
  expandAbbreviations: true,      // Expand abbreviations (e.g., Inc. -> Incorporated)
  normalizeSeparators: true,      // Normalize separator characters
  splitMultiValues: true,         // Split multi-value strings
  caseNormalization: 'titlecase', // Case normalization style
  removeTrailingPunctuation: true, // Remove trailing punctuation
  useLearningEngine: true         // Use learned mappings
}
```

### PublisherNormalizer

**File**: `src/core/field-normalizer.js` (lines 303-362)

Specialized normalizer for publisher names. Extends `FieldNormalizer` and implements publisher-specific parsing and variant generation.

```javascript
class PublisherNormalizer extends FieldNormalizer {
  constructor(fieldName = 'publisher', options = {}) {
    super('publisher', fieldName, options);
  }

  generateVariants(rawValue) {
    return this.variantGenerator.generatePublisherVariants(rawValue, new Set());
  }

  parseFieldValue(rawValue) {
    // Splits on publisher separators: ; / & and -
    // Returns parsed publisher components
  }

  extractFieldValue(item) {
    return item.getField('publisher');
  }
}
```

### LocationNormalizer

**File**: `src/core/field-normalizer.js` (lines 370-477)

Specialized normalizer for location/place data. Extends `FieldNormalizer` and handles state abbreviation parsing.

```javascript
class LocationNormalizer extends FieldNormalizer {
  constructor(fieldName = 'place', options = {}) {
    super('location', fieldName, options);
  }

  parseStateInfo(location) {
    // Parses "City, State" format
    // Extracts city, state, and state abbreviation
  }

  generateVariants(rawValue) {
    return this.variantGenerator.generateLocationVariants(rawValue, new Set());
  }

  extractFieldValue(item) {
    return item.getField('place');
  }
}
```

### JournalNormalizer

**File**: `src/core/field-normalizer.js` (lines 485-544)

Specialized normalizer for journal/publication titles. Extends `FieldNormalizer` and handles abbreviation detection.

```javascript
class JournalNormalizer extends FieldNormalizer {
  constructor(fieldName = 'publicationTitle', options = {}) {
    super('journal', fieldName, options);
  }

  detectAbbreviation(journalName) {
    // Detects common abbreviation patterns
    // e.g., "J. Comp. Ling." -> true
  }

  generateVariants(rawValue) {
    return this.variantGenerator.generateJournalVariants(rawValue, new Set());
  }

  extractFieldValue(item) {
    return item.getField('publicationTitle');
  }
}
```

## FieldVariantGenerator

**File**: `src/core/field-variant-generator.js`

Extends the base `VariantGenerator` class with field-specific variant generation patterns.

### Variant Patterns

#### Publisher Patterns

```javascript
const PUBLISHER_VARIANT_PATTERNS = {
  separatorVariants: [
    { pattern: /\s*;\s*/g, replacement: ' and ' },
    { pattern: /\s*\/\s*/g, replacement: ' and ' },
    { pattern: /\s*-\s*/g, replacement: ' and ' },
    { pattern: /\s*&\s*/g, replacement: ' and ' }
  ],
  abbreviationExpansions: {
    'Co.': 'Company',
    'Inc.': 'Incorporated',
    'Ltd.': 'Limited',
    'Corp.': 'Corporation',
    'Press': 'Press'
  },
  companySuffixes: ['Company', 'Corporation', 'Incorporated', 'Publisher', 'Press', ...]
};
```

#### Location Patterns

```javascript
const LOCATION_VARIANT_PATTERNS = {
  stateAbbreviations: {
    'AL': 'Alabama',
    'CA': 'California',
    'NY': 'New York',
    // ... all US states
  },
  locationSeparators: [';', '/', ',']
};
```

#### Journal Patterns

```javascript
const JOURNAL_VARIANT_PATTERNS = {
  journalAbbreviations: {
    'J.': 'Journal',
    'Trans.': 'Transactions',
    'Proc.': 'Proceedings',
    'Int.': 'International',
    // ... common journal abbreviations
  }
};
```

### Key Methods

| Method | Description |
|--------|-------------|
| `generatePublisherVariants(publisherName, variants)` | Generates publisher name variants |
| `generateLocationVariants(locationName, variants)` | Generates location name variants |
| `generateJournalVariants(journalName, variants)` | Generates journal name variants |
| `generateCaseVariants(value, variants)` | Generates titlecase, uppercase, lowercase variants |
| `splitLocationVariants(value, variants)` | Splits multi-location strings |
| `generateStateVariants(value, variants)` | Generates state abbreviation/full name variants |
| `generateFieldCanonical(value, fieldType)` | Creates canonical form for comparison |

## ScopedLearningEngine

**File**: `src/core/scoped-learning-engine.js`

Extends the base `LearningEngine` with collection-based scope limitation. Stores and retrieves learned mappings with optional collection scoping.

### Storage Format

Mappings are stored with a scoped key format:

```
{collectionId}::{fieldType}::{canonicalValue}
```

Example: `collection123::publisher::springer`

### Key Methods

| Method | Description |
|--------|-------------|
| `storeScopedMapping(rawValue, normalizedValue, fieldType, collectionId, confidence, context)` | Stores a mapping with scope |
| `getScopedMapping(rawValue, fieldType, collectionId)` | Retrieves a scoped mapping, falls back to global |
| `findSimilarMappings(rawValue, fieldType, collectionId)` | Finds similar mappings within scope |
| `getAvailableScopes()` | Returns all collections with learned mappings |
| `clearScope(collectionId)` | Clears mappings for a specific scope |
| `exportScopedMappings()` | Exports all scoped mappings |

### Scope Priority

When retrieving mappings:

1. Check scoped mappings first (collection-specific)
2. Fall back to parent LearningEngine mappings (global)
3. Return null if no match found

## FieldItemProcessor

**File**: `src/zotero/field-item-processor.js`

Manages field normalization operations on Zotero items. Provides methods for processing individual fields and batch operations.

### Key Methods

| Method | Description |
|--------|-------------|
| `getFieldNormalizer(fieldType, fieldName, options)` | Gets or creates a normalizer for a field type |
| `processItemField(item, fieldType)` | Processes a single field on an item |
| `applyFieldNormalizations(normalizations)` | Applies user-selected normalizations to items |
| `batchProcess(items, fieldType, options)` | Batch processes multiple items |

### Field Registry

The processor maintains a lazy-loaded registry of field normalizers:

```javascript
class FieldItemProcessor {
  get fieldRegistry() {
    if (!this._fieldRegistry) {
      this._fieldRegistry = new Map();
    }
    return this._fieldRegistry;
  }

  getFieldNormalizer(fieldType, fieldName = null, options = {}) {
    const registryKey = `${fieldType}::${fieldName || 'default'}`;

    if (this.fieldRegistry.has(registryKey)) {
      return this.fieldRegistry.get(registryKey);
    }

    const normalizer = FieldNormalizer.create(fieldType, actualFieldName, options);
    this.fieldRegistry.set(registryKey, normalizer);
    return normalizer;
  }
}
```

## FieldNormalizerDialog

**File**: `src/ui/field-normalizer-dialog.js`

UI component for presenting field normalization options to users.

### Key Methods

| Method | Description |
|--------|-------------|
| `showDialog(items, fieldType)` | Main entry point - shows the dialog |
| `processItemsForField(items, fieldType)` | Processes items and checks learned mappings |
| `presentFieldOptions(results, fieldType)` | Presents options and collects user selections |
| `renderUIDemo(results)` | Renders HTML demo of the dialog |

### Dialog Workflow

1. **Extract**: Extract field values from selected items
2. **Check**: Check for already-learned mappings
3. **Generate**: Generate variants for new values
4. **Present**: Show options to user
5. **Apply**: Apply selections and store learned mappings

## CollectionManager

**File**: `src/zotero/collection-manager.js`

Integration with Zotero collections API for scope management.

### Key Methods

| Method | Description |
|--------|-------------|
| `getAvailableCollections()` | Returns all collections in the library |
| `getItemsInCollection(collectionId)` | Returns items in a specific collection |
| `getCollectionsForItem(itemId)` | Returns collections containing an item |
| `getAllItems()` | Returns all items in the library |

## Field Constants

**File**: `src/config/field-constants.js`

Configuration constants for field normalization.

```javascript
const PUBLISHER_PATTERNS = {
  'Springer-Verlag': 'Springer',
  'John Wiley & Sons': 'Wiley',
  'Elsevier BV': 'Elsevier',
  // ... publisher name mappings
};

const STATE_ABBREVIATIONS = {
  'AL': 'Alabama',
  'CA': 'California',
  // ... all US states
};

const PUBLISHER_SEPARATORS = [/\s*;\s*/, /\s*\/\s*/, /\s*&\s*/, /\s+and\s+/i, /\s*-\s*/];
const LOCATION_SEPARATORS = [/\s*;\s*/, /\s*\/\s*/, /,\s*/];
```

## Integration Points

### Zotero Menu Integration

**File**: `src/zotero/menu-integration.js`

Field normalization is integrated into Zotero's Tools menu:

```javascript
// Menu items added:
// Tools > Zotero NER > Normalize Publisher Data
// Tools > Zotero NER > Normalize Location Data
// Tools > Zotero NER > Normalize Journal Data
```

### Item Processing Pipeline

```
User selects items
       |
       v
Menu integration calls showDialog(items, fieldType)
       |
       v
FieldNormalizerDialog processes items
       |
       v
FieldItemProcessor.batchProcess()
       |
       v
FieldNormalizer.normalizeFieldValue()
       |
       +---> Parse field value
       +---> Generate variants
       +---> Check learned mappings
       |
       v
Present options to user
       |
       v
Apply normalizations
       |
       +---> Update Zotero item fields
       +---> Store in ScopedLearningEngine
```

## Testing Guidelines

### Unit Tests

Location: `tests/core/`

| Test File | Coverage |
|-----------|----------|
| `field-normalizer.test.js` | Factory pattern, lazy initialization, normalization pipeline |
| `field-variant-generator.test.js` | Variant generation for all field types |
| `field-constants.test.js` | Configuration constants |

### Integration Tests

Location: `tests/integration/`

| Test File | Coverage |
|-----------|----------|
| `field-normalization.test.js` | Full workflow with mocked Zotero |

### UI Tests

Location: `tests/ui/`

| Test File | Coverage |
|-----------|----------|
| `field-normalizer-dialog.test.js` | Dialog rendering and user interaction |

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/core/field-normalizer.test.js

# Run with coverage
npm test -- --coverage
```

### Writing New Tests

When adding new tests:

1. Follow the existing mock pattern for learning engine and variant generator
2. Test both success and error cases
3. Test edge cases (empty values, null inputs, etc.)
4. Use descriptive test names following the pattern: `should {expected behavior} when {condition}`

## Performance Considerations

### Batch Processing

- Process items in batches for large selections
- Provide progress callbacks for UI feedback
- Use `skipAlreadyNormalized` option to skip items with existing mappings

### Caching

- Field registry uses lazy initialization
- Learned mappings are cached in memory
- Scoped mappings persist in localStorage

### Memory Management

- Clear field registry when done (`processor.clearRegistry()`)
- Limit similar mappings returned (`settings.maxSuggestions`)
- Use collection scope to limit processing scope

## Error Handling

The system handles errors gracefully:

1. **Invalid input**: Returns error in normalization result
2. **Missing field**: Skips items without target field
3. **Storage errors**: Logs errors, continues processing
4. **Zotero API errors**: Catches and reports errors

```javascript
async normalizeFieldValue(rawValue, item) {
  if (!rawValue || typeof rawValue !== 'string') {
    return {
      success: false,
      error: 'Invalid input value'
    };
  }

  try {
    // Normalization logic
    return { success: true, ... };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```
