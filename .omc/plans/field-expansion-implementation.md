# Field Expansion Implementation Plan (Revised)

## Overview

This plan details the implementation of field normalization capabilities for Zotero NER, extending the existing author name normalization system to support publisher names, locations, and journal names. The implementation leverages the existing architecture patterns: Extract -> Parse -> Generate Variants -> Check Learned -> Find Similar -> Present Options -> Apply.

---

## Context

### Original Request

Expand Zotero NER normalizer to support publisher, location, and journal fields beyond existing author name normalization, using collection-based scope limitation and UI dialog integration.

### Critic's Feedback (Applied)

| Issue | Fix Applied |
|-------|-------------|
| **C1 - SYNTAX ERROR** (Line 821) | Changed `if.alreadyLearned` to `if (result.processed && result.processed.alreadyLearned)` |
| **C2 - DEPRECATED FILE** | Replaced `content/scripts/normalization-dialog-controller.js` with `content/dialog.html` |
| **C3 - SCOPE KEY COLLISION** | Removed fallback logic; scoped mappings use separate storage key |
| **C4 - ZOTERO API INCORRECT** | Fixed to `Zotero.Collections.get()` with proper iteration |
| **C5 - UNDEFINED DEPENDENCIES** | Refactored to factory pattern with lazy initialization |
| **M1 - MENU PATTERN** | Researched actual pattern - uses `Zotero.getMainWindow().document` |
| **M2 - ITEM SAVE CALL** | Fixed to iterate and call `item.save()` individually |
| **M3 - DEPENDENCY GRAPH** | ScopedLearningEngine integrated into LearningEngine |
| **M4 - TEST PATTERNS** | Follows existing Jest patterns from `tests/` directory |

### Architect's Answers (Incorporated)

**Q1 - Dialog Extension:** Option A + C (Embedded sections in dialog.html + JS class wrapper)
**Q2 - Storage Strategy:** Option A with fix - prefixed keys WITHOUT global fallback
**Q3 - Journal Database:** NLM database with heuristic expansion fallback

### Codebase Analysis Findings

**Existing Architecture (v1.2.1):**
- **LearningEngine** (`src/core/learning-engine.js`): Maps canonical keys to normalized values with localStorage persistence
- **VariantGenerator** (`src/core/variant-generator.js`): Generates name variations using pattern functions
- **NormalizerDialog** (`src/ui/normalizer-dialog.js`): UI for presenting normalization options (processor, not UI)
- **MenuIntegration** (`src/zotero/menu-integration.js`): Registers menu items and handles normalize actions
- **ItemProcessor** (`src/zotero/item-processor.js`): Processes item creators and applies normalizations
- **dialog.html** (`content/dialog.html`): 127KB HTML file with actual UI markup

**Key Patterns Identified:**
- Storage keys follow pattern: `{feature}_mappings`
- Menu registration via `Zotero.getMainWindow().document.createElement()`
- Tests use Jest with mocked Zotero global
- Dialog uses HTML/CSS with JS event handlers (not XUL)

---

## Work Objectives

### Core Objective

Implement comprehensive field normalization for publisher, location, and journal fields with collection-scoped learning capabilities.

### Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| 1 | FieldNormalizer Base System | Abstract base class and registry for field-specific normalizers |
| 2 | Publisher Normalizer | Handle ampersands, separators, abbreviations (High Priority) |
| 3 | Location Normalizer | Multi-location splitting, state abbreviation normalization |
| 4 | Journal Normalizer | Abbreviation vs full name handling with NLM database |
| 5 | Scoped Mappings | Collection-based scope for learned mappings (integrated into LearningEngine) |
| 6 | Field Normalizer Dialog | Embedded dialog sections in dialog.html |
| 7 | Menu Integration | Field-specific menu items via Zotero API |
| 8 | Field Item Processor | Unified processor for all field types |
| 9 | Comprehensive Tests | Unit, integration, and UI tests |
| 10 | Documentation | User and developer documentation |

### Definition of Done

- [ ] All three field types (publisher, location, journal) support full normalization workflow
- [ ] Collection scope limitation works correctly for learned mappings
- [ ] Learned mappings persist across sessions in localStorage
- [ ] Batch processing handles 1000+ items efficiently (< 30 seconds)
- [ ] Dialog loads in under 2 seconds with progress indicators
- [ ] All new code has 80%+ test coverage
- [ ] All existing tests pass
- [ ] Menu integration follows existing patterns
- [ ] Code reviewed and approved by at least one reviewer

---

## Must Have / Must NOT Have

### Must Have

| Category | Requirement | Rationale |
|----------|-------------|-----------|
| Functional | Publisher name normalization with separator/abbreviation handling | Core business requirement |
| Functional | Location normalization with state abbreviation support | Core business requirement |
| Functional | Journal name normalization with abbreviation support | Core business requirement |
| Functional | Collection-scoped learned mappings (separate storage, no fallback) | Differentiating feature |
| Functional | UI dialog embedded in dialog.html | UI requirement |
| Functional | Menu integration via Zotero.getMainWindow().document | Integration requirement |
| Performance | 1000 items processed in under 30 seconds | User experience requirement |
| Quality | 80% test coverage for new code | Quality requirement |
| Compatibility | Backward compatible with existing author normalization | Existing functionality |

### Must NOT Have

| Category | Constraint | Rationale |
|----------|-------------|-----------|
| Scope | No changes to Zotero core API calls | Maintain compatibility |
| Scope | No database schema changes | Simplicity |
| Performance | No UI blocking during batch processing | User experience |
| Security | No external network calls for normalization | Privacy/security |
| Architecture | No duplication of core LearningEngine logic | Maintainability |
| Architecture | Scoped mappings must NOT fall back to global | Data integrity |

---

## Task Flow and Dependencies

```
Phase 1: Foundation
    [1.1] Create FieldNormalizer Base Class (with factory pattern)
    [1.2] Create FieldVariantGenerator (extends core)
    [1.3] Create Field Constants (publisher, location, journal patterns)

Phase 2: Scoped Learning Engine (integrated into existing LearningEngine)
    [2.1] Add scoped mapping storage key and methods to LearningEngine
    [2.2] Create CollectionManager for Zotero integration
    [2.3] Implement scope-aware storage/retrieval (NO fallback to global)

Phase 3: Field-Specific Normalizers
    [3.1] Implement PublisherNormalizer (High Priority)
    [3.2] Implement LocationNormalizer (High Priority)
    [3.3] Implement JournalNormalizer (Medium Priority)

Phase 4: UI Integration (embedded in dialog.html)
    [4.1] Create FieldNormalizerDialog JS class
    [4.2] Add field selection UI sections to dialog.html
    [4.3] Add collection scope selector to dialog.html

Phase 5: Menu Integration
    [5.1] Register field-specific menu items via Zotero API
    [5.2] Implement menu handler for each field type

Phase 6: Item Processing
    [6.1] Create FieldItemProcessor for unified field handling
    [6.2] Implement batch processing with progress

Phase 7: Testing & Polish
    [7.1] Unit tests for each normalizer
    [7.2] Integration tests for dialog and menu
    [7.3] Performance testing
    [7.4] Documentation
```

### Dependency Graph

```
[1.1] ──┬──> [2.1] ──> [3.1] ──┐
         │                     │
[1.2] ──┤                     ├──> [4.1] ──> [5.1] ──> [6.1] ──> [7]
         │                     │
[1.3] ──┘                     ├──> [3.2] ──┘
                               │
                               └──> [3.3] ──┘
```

**Note:** ScopedLearningEngine methods are integrated into existing LearningEngine (Task 2.1), NOT a separate class.

---

## Detailed Implementation Tasks

### Phase 1: Foundation

#### Task 1.1: Create FieldNormalizer Base Class (Factory Pattern)
**File to Create:** `src/core/field-normalizer.js`

**Description:**
Create an abstract base class that defines the interface for field-specific normalizers. Uses factory pattern to avoid undefined dependencies.

**Implementation Details:**
```javascript
class FieldNormalizer {
  constructor(fieldType, fieldName, options = {}) {
    this.fieldType = fieldType;     // 'publisher', 'location', 'journal'
    this.fieldName = fieldName;     // 'publisher', 'place', 'publicationTitle'
    this._variantGenerator = null;  // Lazy initialization
    this._learningEngine = null;   // Lazy initialization
  }

  // Factory method for lazy initialization
  get variantGenerator() {
    if (!this._variantGenerator) {
      this._variantGenerator = new (require('./field-variant-generator.js'))();
    }
    return this._variantGenerator;
  }

  // Factory method for lazy initialization
  get learningEngine() {
    if (!this._learningEngine) {
      this._learningEngine = new (require('./learning-engine.js'))();
    }
    return this._learningEngine;
  }

  async normalizeFieldValue(rawValue, item) {
    // 1. Parse and extract field value
    const parsed = this.parseFieldValue(rawValue);

    // 2. Generate variants
    const variants = this.generateVariants(parsed);

    // 3. Check learned mappings (scoped)
    const normalized = this.learningEngine.getScopedMapping(
      rawValue, this.fieldType, item.collectionId
    );
    const alreadyLearned = normalized !== null;

    // 4. Find similar learned values
    const similars = alreadyLearned ? [] :
      this.learningEngine.findSimilar(rawValue).filter(m => m.fieldType === this.fieldType);

    // 5. Return normalization options
    return {
      original: rawValue,
      normalized: normalized || variants[0],
      variants: variants,
      similars: similars,
      alreadyLearned: alreadyLearned,
      fieldType: this.fieldType
    };
  }

  generateVariants(rawValue) { /* subclass */ }
  parseFieldValue(rawValue) { /* subclass */ }
  extractFieldValue(item) { /* subclass */ }
}
```

**Acceptance Criteria:**
- [ ] Base class defines abstract methods: `generateVariants`, `parseFieldValue`, `extractFieldValue`
- [ ] Uses factory pattern with lazy initialization (no undefined dependencies)
- [ ] Implements core normalization pipeline matching existing pattern
- [ ] Unit tests cover base class behavior
- [ ] Documentation: JSDoc comments for all public methods

**Verification:**
```bash
npm test -- --grep "FieldNormalizer"
```

---

#### Task 1.2: Create FieldVariantGenerator
**File to Create:** `src/core/field-variant-generator.js`

**Description:**
Extend the core VariantGenerator to support field-specific variant generation for non-name fields.

**Implementation Details:**
- Extend VariantGenerator class
- Add field-specific variant patterns for publisher, location, journal
- Handle separators, abbreviations, multi-value splitting

**Acceptance Criteria:**
- [ ] Extends existing VariantGenerator without breaking compatibility
- [ ] Publisher variants: handle ampersands, separators, abbreviations
- [ ] Location variants: handle multi-location splitting, state abbreviations
- [ ] Journal variants: handle abbreviations vs full names
- [ ] Unit tests cover all variant generation scenarios

**Verification:**
```bash
npm test -- --grep "FieldVariantGenerator"
```

---

#### Task 1.3: Create Field Constants
**File to Create:** `src/config/field-constants.js`

**Description:**
Define constants for field-specific normalization including:
- Publisher abbreviations and patterns
- US state abbreviations and full names
- Journal abbreviation patterns

**Implementation Details:**
```javascript
const PUBLISHER_ABBREVIATIONS = {
  'Co.': 'Company',
  'Inc.': 'Incorporated',
  'Ltd.': 'Limited',
  'Pub.': 'Publisher',
  'Corp.': 'Corporation',
  'Press': 'Press',
  'UP': 'University Press'
};

const STATE_ABBREVIATIONS = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut',
  'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii',
  'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
  'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
  'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska',
  'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
  'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island',
  'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas',
  'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington',
  'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  'DC': 'District of Columbia'
};

const PUBLISHER_PATTERNS = {
  'Springer-Verlag': 'Springer',
  'Cambridge University Press': 'Cambridge UP',
  'Oxford University Press': 'Oxford UP',
  'John Wiley & Sons': 'Wiley',
  'Wiley-Blackwell': 'Wiley'
};
```

**Acceptance Criteria:**
- [ ] All US states with abbreviations defined
- [ ] Common publisher abbreviations defined
- [ ] Publisher name patterns defined
- [ ] Constants exported for use by normalizers
- [ ] Unit tests verify mapping completeness

**Verification:**
```bash
npm test -- --grep "FieldConstants"
```

---

### Phase 2: Scoped Learning Engine

#### Task 2.1: Add Scoped Mappings to LearningEngine
**File to Modify:** `src/core/learning-engine.js`

**Description:**
Add methods to LearningEngine for storing and retrieving mappings with collection scope. Uses SEPARATE storage key - NO fallback to global mappings.

**New Methods and Constants to Add:**
```javascript
class LearningEngine {
  // ... existing code ...

  // Scoped mappings use SEPARATE storage key - orthogonal concern
  static get SCOPED_MAPPINGS_KEY() { return 'field_normalizer_scoped_mappings'; }

  constructor() {
    // ... existing initialization ...
    this.scopedMappings = new Map();  // SEPARATE map for scoped mappings
    this.loadScopedMappings();
  }

  // Load scoped mappings from separate storage
  async loadScopedMappings() {
    try {
      const storage = this.getStorage();
      const stored = storage.getItem(LearningEngine.SCOPED_MAPPINGS_KEY);
      if (stored) {
        this.scopedMappings = new Map(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading scoped mappings:', error);
      this.scopedMappings = new Map();
    }
  }

  // Save scoped mappings to separate storage
  async saveScopedMappings() {
    try {
      const storage = this.getStorage();
      const serialized = JSON.stringify([...this.scopedMappings.entries()]);
      storage.setItem(LearningEngine.SCOPED_MAPPINGS_KEY, serialized);
    } catch (error) {
      console.error('Error saving scoped mappings:', error);
    }
  }

  // Create a scope-prefixed key
  createScopedKey(rawValue, fieldType, collectionId) {
    const canonicalKey = this.createCanonicalKey(rawValue);
    const scope = collectionId || 'global';
    return `${scope}::${fieldType}::${canonicalKey}`;
  }

  // Store a SCOPED mapping - separate from global
  async storeScopedMapping(rawValue, normalizedValue, fieldType, collectionId = null) {
    const scopedKey = this.createScopedKey(rawValue, fieldType, collectionId);
    const mapping = {
      raw: rawValue,
      normalized: normalizedValue,
      fieldType: fieldType,
      collectionId: collectionId,
      timestamp: Date.now()
    };
    this.scopedMappings.set(scopedKey, mapping);
    await this.saveScopedMappings();
  }

  // Retrieve a SCOPED mapping - NO fallback to global (orthogonal concerns)
  getScopedMapping(rawValue, fieldType, collectionId = null) {
    const scopedKey = this.createScopedKey(rawValue, fieldType, collectionId);

    // Check exact scope match
    if (this.scopedMappings.has(scopedKey)) {
      return this.scopedMappings.get(scopedKey).normalized;
    }

    // Check global scope (collectionId === null) - still scoped, not global mappings
    if (collectionId !== null) {
      const globalKey = this.createScopedKey(rawValue, fieldType, null);
      if (this.scopedMappings.has(globalKey)) {
        return this.scopedMappings.get(globalKey).normalized;
      }
    }

    // NO fallback to this.getMapping() - scoped mappings are orthogonal
    return null;
  }

  // Field types enum
  static get FIELD_TYPES() {
    return {
      PUBLISHER: 'publisher',
      LOCATION: 'location',
      JOURNAL: 'journal'
    };
  }
}
```

**Acceptance Criteria:**
- [ ] `SCOPED_MAPPINGS_KEY` constant defined
- [ ] `scopedMappings` Map initialized separately from `mappings`
- [ ] `storeScopedMapping` stores with scope prefix
- [ ] `getScopedMapping` checks scoped first, then global scope (not global mappings)
- [ ] Existing `storeMapping` and `getMapping` continue to work unchanged
- [ ] Backward compatibility maintained
- [ ] Unit tests verify scope behavior

**Risks & Mitigation:**
| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing mappings | High | Scoped mappings use completely separate storage |
| Memory usage | Medium | Separate Map is fine, scoped keys are limited |

**Verification:**
```bash
npm test -- --grep "LearningEngine.*scope"
```

---

#### Task 2.2: Create CollectionManager
**File to Create:** `src/zotero/collection-manager.js`

**Description:**
Integration with Zotero API to get collections and items within collections.

**Implementation Details:**
```javascript
class CollectionManager {
  async getAvailableCollections() {
    if (typeof Zotero === 'undefined') {
      throw new Error('This feature requires Zotero context');
    }
    // CORRECT API: Zotero.Collections.get() returns ZoteroCollection objects
    const collections = Zotero.Collections.get();
    const collectionList = [];
    for (const collection of collections) {
      collectionList.push({
        key: collection.key,
        name: collection.name,
        parentKey: collection.parentKey
      });
    }
    return collectionList;
  }

  async getItemsInCollection(collectionId) {
    if (typeof Zotero === 'undefined') {
      throw new Error('This feature requires Zotero context');
    }
    const collection = Zotero.Collections.get(collectionId);
    return await collection.getItems();
  }

  async getCollectionsForItem(itemId) {
    if (typeof Zotero === 'undefined') {
      throw new Error('This feature requires Zotero context');
    }
    const item = await Zotero.Items.get(itemId);
    return await item.getCollections();
  }

  async getAllItems() {
    if (typeof Zotero === 'undefined') {
      throw new Error('This feature requires Zotero context');
    }
    return await Zotero.Items.getAll();
  }
}
```

**Acceptance Criteria:**
- [ ] `getAvailableCollections` returns all library collections using correct API
- [ ] `getItemsInCollection` returns items for a specific collection
- [ ] `getCollectionsForItem` returns collections containing an item
- [ ] Gracefully handles missing Zotero context

**Risks & Mitigation:**
| Risk | Impact | Mitigation |
|------|--------|------------|
| Zotero API changes | Medium | Use try-catch with informative errors |
| Performance with large libraries | Medium | Add caching for collection structure |

**Verification:**
```bash
npm test -- --grep "CollectionManager"
```

---

### Phase 3: Field-Specific Normalizers

#### Task 3.1: Implement PublisherNormalizer
**File to Create:** `src/core/publisher-normalizer.js`

**Description:**
Handle publisher name normalization including:
- Ampersand vs "and" variations
- Separator normalization (/, -, &)
- Common publisher abbreviations
- Company name format standardization

**Implementation Details:**
```javascript
class PublisherNormalizer extends FieldNormalizer {
  constructor() {
    super('publisher', 'publisher', 'publisher');
    this.constants = require('../config/field-constants.js');
  }

  parseFieldValue(rawValue) {
    // Split on common separators
    const publishers = rawValue.split(/[,;/]+/).map(p => p.trim());
    return {
      original: rawValue,
      publishers: publishers,
      hasMultiple: publishers.length > 1
    };
  }

  generateVariants(parsed) {
    const variants = new Set();
    variants.add(parsed.original);

    for (const publisher of parsed.publishers) {
      // Separator normalization
      variants.add(publisher.replace(/&/g, ' and ').trim());
      variants.add(publisher.replace(/\band\b/gi, '&').trim());
      variants.add(publisher.replace(/[/|-]+/g, ' ').trim());

      // Abbreviation expansion
      for (const [abbr, full] of Object.entries(this.constants.PUBLISHER_ABBREVIATIONS)) {
        if (publisher.includes(abbr)) {
          variants.add(publisher.replace(abbr, full).trim());
          variants.add(publisher.replace(abbr, '').trim());
        }
      }

      // Pattern-based normalization
      for (const [pattern, replacement] of Object.entries(this.constants.PUBLISHER_PATTERNS)) {
        if (publisher.includes(pattern)) {
          variants.add(publisher.replace(pattern, replacement).trim());
        }
      }
    }

    return Array.from(variants);
  }

  extractFieldValue(item) {
    return item.getField('publisher');
  }
}
```

**Acceptance Criteria:**
- [ ] Extends FieldNormalizer correctly
- [ ] Handles single and multi-value publisher strings
- [ ] Normalizes ampersands and separators
- [ ] Expands common abbreviations
- [ ] Applies publisher name patterns
- [ ] Unit tests cover all scenarios

**Verification:**
```bash
npm test -- --grep "PublisherNormalizer"
```

**Example Test Cases:**
```javascript
// Input: "Springer-Verlag / Cambridge University Press"
// Expected: ["Springer-Verlag / Cambridge University Press",
//            "Springer and Cambridge University Press",
//            "Springer and Cambridge UP",
//            "Springer / Cambridge UP"]

// Input: "John Wiley & Sons"
// Expected: ["John Wiley & Sons",
//            "John Wiley and Sons",
//            "Wiley"]
```

---

#### Task 3.2: Implement LocationNormalizer
**File to Create:** `src/core/location-normalizer.js`

**Description:**
Handle location normalization including:
- Multi-location splitting (semicolons, slashes)
- State/province abbreviation normalization
- Multiple location format handling
- City/state/country ordering standardization

**Implementation Details:**
```javascript
class LocationNormalizer extends FieldNormalizer {
  constructor() {
    super('location', 'place', 'place');
    this.constants = require('../config/field-constants.js');
  }

  parseFieldValue(rawValue) {
    // Split on semicolons and slashes
    const locations = rawValue.split(/[;]+|(?:\s*[/]\s*)/).map(l => l.trim());
    return {
      original: rawValue,
      locations: locations,
      hasMultiple: locations.length > 1
    };
  }

  generateVariants(parsed) {
    const variants = new Set();
    variants.add(parsed.original);

    for (const location of parsed.locations) {
      variants.add(location);

      // State abbreviation normalization
      for (const [abbr, full] of Object.entries(this.constants.STATE_ABBREVIATIONS)) {
        // Match abbreviation at end of string or after comma
        const statePattern = new RegExp(`[,]?\\s*${abbr}\\s*$`);
        if (statePattern.test(location)) {
          const expanded = location.replace(statePattern, `, ${full}`);
          variants.add(expanded);
          // Also try with state only
          variants.add(full);
        }
        // Match full state name -> abbreviation
        if (location.includes(`, ${full}`) || location.endsWith(`, ${full}`)) {
          const abbreviated = location.replace(`, ${full}`, `, ${abbr}`);
          variants.add(abbreviated);
          variants.add(abbr);
        }
      }
    }

    return Array.from(variants);
  }

  extractFieldValue(item) {
    return item.getField('place');
  }
}
```

**Acceptance Criteria:**
- [ ] Extends FieldNormalizer correctly
- [ ] Splits multi-location strings correctly
- [ ] Normalizes state abbreviations to full names
- [ ] Normalizes full names to abbreviations
- [ ] Handles edge cases (missing data, invalid format)
- [ ] Unit tests cover all scenarios

**Verification:**
```bash
npm test -- --grep "LocationNormalizer"
```

**Example Test Cases:**
```javascript
// Input: "Springfield, Ill; Chicago, IL"
// Expected: ["Springfield, Ill; Chicago, IL",
//            "Springfield, Illinois; Chicago, Illinois",
//            "Springfield, Illinois", "Chicago, Illinois"]

// Input: "Boca Raton, Florida"
// Expected: ["Boca Raton, Florida", "Boca Raton, FL", "FL"]
```

---

#### Task 3.3: Implement JournalNormalizer
**File to Create:** `src/core/journal-normalizer.js`

**Description:**
Handle journal name normalization including:
- Journal abbreviation vs full name handling
- Title case variations
- Standard journal name formats
- NLM database integration for known journals

**Implementation Details:**
```javascript
class JournalNormalizer extends FieldNormalizer {
  constructor() {
    super('journal', 'publicationTitle', 'publicationTitle');
    this.constants = require('../config/field-constants.js');
    this.nlmDatabase = null;  // Lazy loaded
  }

  async loadNLMDatabase() {
    if (!this.nlmDatabase) {
      // Load NLM journal abbreviation JSON (~2MB external data)
      // Fallback to heuristic expansion if unavailable
      try {
        const response = await fetch('resource://zotero-ner/data/nlm-journals.json');
        if (response.ok) {
          this.nlmDatabase = await response.json();
        }
      } catch (e) {
        console.warn('Could not load NLM database, using heuristics only');
        this.nlmDatabase = null;
      }
    }
  }

  parseFieldValue(rawValue) {
    return {
      original: rawValue,
      isAbbreviated: this.detectAbbreviation(rawValue)
    };
  }

  detectAbbreviation(value) {
    // Check for patterns like "J. Xxx. Yyy."
    const abbrPattern = /^[A-Z][a-z]?\.([A-Z][a-z]?\.)+[A-Z]/;
    return abbrPattern.test(value);
  }

  async generateVariants(parsed) {
    const variants = new Set();
    variants.add(parsed.original);

    const journal = parsed.original;

    // Priority 1: NLM database lookup
    await this.loadNLMDatabase();
    if (this.nlmDatabase) {
      const nlmVariant = this.nlmDatabase[journal] ||
                         Object.entries(this.nlmDatabase).find(
                           ([key, val]) => val.toLowerCase() === journal.toLowerCase()
                         )?.[0];
      if (nlmVariant) {
        variants.add(nlmVariant);
      }
    }

    // Priority 2: Heuristic expansion (fallback)
    if (parsed.isAbbreviated) {
      // Try to expand common journal abbreviations
      variants.add(this.expandAbbreviation(journal));
      // Convert to title case variant
      variants.add(this.toTitleCase(journal));
    } else {
      // Full name to abbreviation
      variants.add(this.abbreviate(journal));
      // Normalize case
      variants.add(this.toTitleCase(journal));
    }

    // Handle "The" prefix
    if (journal.toLowerCase().startsWith('the ')) {
      variants.add(journal.substring(5));  // Without "The"
      variants.add(journal + (journal.endsWith('.') ? '' : '.'));  // With period
    }

    return Array.from(variants);
  }

  expandAbbreviation(abbr) {
    // Heuristic: first letters of each word
    const words = abbr.split(/\s+/);
    const expanded = words.map(word => {
      const cleaned = word.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
      return cleaned;
    });
    return expanded.join(' ');
  }

  abbreviate(fullName) {
    // Convert "Journal of Computational Linguistics" -> "J. Comput. Linguist."
    const words = fullName.split(/\s+/);
    const abbrev = words.map(word => {
      const cleaned = word.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
      return cleaned.charAt(0).toUpperCase() + '.';
    });
    return abbrev.join(' ');
  }

  toTitleCase(value) {
    return value.replace(/\w\S*/g, txt =>
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  extractFieldValue(item) {
    return item.getField('publicationTitle');
  }
}
```

**Acceptance Criteria:**
- [ ] Extends FieldNormalizer correctly
- [ ] Lazy loads NLM database (~2MB external data)
- [ ] Falls back to heuristic expansion if NLM unavailable
- [ ] Detects abbreviated vs full journal names
- [ ] Generates abbreviations from full names
- [ ] Generates full names from abbreviations
- [ ] Handles "The" prefix variations
- [ ] Unit tests cover all scenarios

**Verification:**
```bash
npm test -- --grep "JournalNormalizer"
```

**Example Test Cases:**
```javascript
// Input: "J. Comp. Ling."
// Expected: ["J. Comp. Ling.",
//            "Journal of Computational Linguistics",
//            "Computational Linguistics"]

// Input: "IEEE Transactions on Pattern Analysis and Machine Intelligence"
// Expected: ["IEEE Transactions on Pattern Analysis and Machine Intelligence",
//            "IEEE Trans. Pattern Anal. Mach. Intell."]
```

---

### Phase 4: UI Integration

#### Task 4.1: Create FieldNormalizerDialog JS Class
**File to Create:** `src/ui/field-normalizer-dialog.js`

**Description:**
Extend NormalizerDialog to support field selection and field-specific processing.

**Implementation Details:**
```javascript
class FieldNormalizerDialog extends NormalizerDialog {
  constructor() {
    super();
    this.currentFieldNormalizer = null;
    this._fieldRegistry = null;  // Lazy initialization
    this.currentScope = null;
  }

  // Lazy initialization of field registry
  get fieldRegistry() {
    if (!this._fieldRegistry) {
      this._fieldRegistry = {
        publisher: new (require('../core/publisher-normalizer.js'))(),
        location: new (require('../core/location-normalizer.js'))(),
        journal: new (require('../core/journal-normalizer.js'))()
      };
    }
    return this._fieldRegistry;
  }

  async showDialog(items, fieldType) {
    if (!this.fieldRegistry[fieldType]) {
      throw new Error(`Unknown field type: ${fieldType}`);
    }

    this.currentFieldNormalizer = this.fieldRegistry[fieldType];
    const fieldResults = await this.processItemsForField(items, fieldType);
    return await this.presentFieldOptions(fieldResults, fieldType);
  }

  async processItemsForField(items, fieldType) {
    const results = [];
    for (const item of items) {
      const fieldValue = this.currentFieldNormalizer.extractFieldValue(item);
      if (fieldValue && fieldValue.trim()) {
        const processed = await this.currentFieldNormalizer.normalizeFieldValue(fieldValue, item);
        results.push({
          item,
          fieldType,
          fieldValue,
          processed,
          title: item.getField('title')
        });
      }
    }
    return results;
  }

  async presentFieldOptions(results, fieldType) {
    // Field-specific UI rendering
    const userSelections = [];
    for (const result of results) {
      // FIXED C1: Correct syntax for checking alreadyLearned
      if (result.processed && result.processed.alreadyLearned) {
        userSelections.push({
          itemID: result.item.id,
          fieldType,
          original: result.fieldValue,
          normalized: result.processed.normalized,
          accepted: true,
          source: 'learned'
        });
      } else {
        userSelections.push({
          itemID: result.item.id,
          fieldType,
          original: result.fieldValue,
          variants: result.processed.variants,
          similars: result.processed.similars,
          accepted: true,  // Auto-accept first variant for demo
          source: 'variant'
        });
      }
    }
    return userSelections;
  }

  setScope(collectionId) {
    this.currentScope = collectionId;
    // Update all field normalizers with new scope
    for (const normalizer of Object.values(this.fieldRegistry)) {
      normalizer.learningEngine.currentScope = collectionId;
    }
  }

  getAvailableFieldTypes() {
    return Object.keys(this.fieldRegistry);
  }
}
```

**Acceptance Criteria:**
- [ ] Extends NormalizerDialog without breaking existing functionality
- [ ] Uses lazy initialization for fieldRegistry
- [ ] Supports all three field types (publisher, location, journal)
- [ ] Implements field-specific processing
- [ ] Scope management integrated
- [ ] Unit tests cover dialog behavior

**Verification:**
```bash
npm test -- --grep "FieldNormalizerDialog"
```

---

#### Task 4.2: Add Field Selection UI to dialog.html
**File to Modify:** `content/dialog.html`

**Description:**
Add new tab/section for field normalizer in the main dialog HTML file.

**Implementation Details:**
Add new section after existing author name normalization section:

```html
<!-- Field Normalization Section -->
<div id="field-normalization-section" style="display: none;">
  <h2>Field Normalization</h2>

  <!-- Field Type Selection -->
  <div class="field-type-selector">
    <label><input type="radio" name="fieldType" value="publisher"> Publisher</label>
    <label><input type="radio" name="fieldType" value="location"> Location</label>
    <label><input type="radio" name="fieldType" value="journal"> Journal</label>
  </div>

  <!-- Collection Scope Selector -->
  <div class="scope-selector">
    <label for="collection-scope">Collection Scope:</label>
    <select id="collection-scope">
      <option value="">All Collections (Global)</option>
      <!-- Populated by JS -->
    </select>
  </div>

  <!-- Progress Indicator -->
  <div id="field-normalization-progress" style="display: none;">
    <progress id="field-progress" max="100" value="0"></progress>
    <span id="field-progress-text">Processing...</span>
  </div>

  <!-- Field Results Container -->
  <div id="field-results"></div>

  <!-- Actions -->
  <div class="field-actions">
    <button id="apply-field-normalizations">Apply Normalizations</button>
    <button id="cancel-field-normalization">Cancel</button>
  </div>
</div>
```

**Acceptance Criteria:**
- [ ] New section added to dialog.html
- [ ] Field type selection (radio buttons)
- [ ] Collection scope selector (dropdown)
- [ ] Progress indicator for batch operations
- [ ] Results container for displaying normalizations
- [ ] CSS styling matches existing dialog style

**Risks & Mitigation:**
| Risk | Impact | Mitigation |
|------|--------|------------|
| Large HTML file (127KB) | Low | Only appending new section |

---

#### Task 4.3: Add Collection Scope Selector to dialog.html
**File to Modify:** `content/dialog.html` (same file as Task 4.2)

**Description:**
Add JavaScript to populate and handle collection scope selector.

**Implementation Details:**
```javascript
// In normalization-dialog-controller.js or inline script
async function populateCollectionScopeSelector() {
  const select = document.getElementById('collection-scope');
  if (!select) return;

  try {
    const collectionManager = new CollectionManager();
    const collections = await collectionManager.getAvailableCollections();

    // Keep the default "All Collections" option
    while (select.options.length > 1) {
      select.remove(1);
    }

    for (const collection of collections) {
      const option = document.createElement('option');
      option.value = collection.key;
      option.textContent = collection.name;
      select.appendChild(option);
    }
  } catch (error) {
    console.error('Error loading collections:', error);
  }
}
```

**Acceptance Criteria:**
- [ ] Dropdown shows all available collections
- [ ] "All Collections" option for global scope
- [ ] Scope is persisted across sessions
- [ ] Visual indicator of current scope in dialog

**Verification:**
```bash
npm test -- --grep "scope.*selector"
```

---

### Phase 5: Menu Integration

#### Task 5.1: Register Field-Specific Menu Items
**File to Modify:** `src/zotero/menu-integration.js`

**Description:**
Add menu items for each field normalization type using Zotero's document API.

**Implementation Details:**
```javascript
class MenuIntegration {
  // ... existing methods ...

  registerMenuItems() {
    // Get Zotero's main window document
    const doc = Zotero.getMainWindow().document;

    // Find the tools menu or appropriate parent
    const toolsMenu = doc.querySelector('#menu_ToolsPopup') ||
                      doc.querySelector('[id$="ToolsPopup"]');

    if (!toolsMenu) {
      console.warn('Could not find Tools menu for adding items');
      return;
    }

    // Add separator
    const separator = doc.createElement('menuseparator');
    toolsMenu.appendChild(separator);

    // Add field normalization submenu
    const fieldNormMenu = doc.createElement('menu');
    fieldNormMenu.id = 'zotero-ner-field-normalization';
    fieldNormMenu.setAttribute('label', 'Normalize Field Data');
    toolsMenu.appendChild(fieldNormMenu);

    const popup = doc.createElement('menupopup');
    fieldNormMenu.appendChild(popup);

    // Publisher menu item
    const publisherItem = doc.createElement('menuitem');
    publisherItem.id = 'zotero-ner-normalize-publisher';
    publisherItem.setAttribute('label', 'Normalize Publisher Data');
    publisherItem.addEventListener('command', () => {
      this.handleFieldNormalizeAction('publisher');
    });
    popup.appendChild(publisherItem);

    // Location menu item
    const locationItem = doc.createElement('menuitem');
    locationItem.id = 'zotero-ner-normalize-location';
    locationItem.setAttribute('label', 'Normalize Location Data');
    locationItem.addEventListener('command', () => {
      this.handleFieldNormalizeAction('location');
    });
    popup.appendChild(locationItem);

    // Journal menu item
    const journalItem = doc.createElement('menuitem');
    journalItem.id = 'zotero-ner-normalize-journal';
    journalItem.setAttribute('label', 'Normalize Journal Data');
    journalItem.addEventListener('command', () => {
      this.handleFieldNormalizeAction('journal');
    });
    popup.appendChild(journalItem);

    console.log('Registered field-specific menu items');
  }

  async handleFieldNormalizeAction(fieldType) {
    try {
      // Get selected items from Zotero
      const items = Zotero.getActiveZoteroPane().getSelectedItems();

      if (!items || items.length === 0) {
        Zotero.getMainWindow().alert('Please select items to normalize.');
        return;
      }

      const fieldDialog = new FieldNormalizerDialog();
      const userSelections = await fieldDialog.showDialog(items, fieldType);

      // Apply selections
      const itemProcessor = new FieldItemProcessor();
      await itemProcessor.applyFieldNormalizations(userSelections);

      return { success: true, processed: items.length, fieldType };
    } catch (error) {
      Zotero.debug(`MenuIntegration: Error in handleFieldNormalizeAction: ${error.message}`);
      throw error;
    }
  }
}
```

**Acceptance Criteria:**
- [ ] Menu items registered for each field type
- [ ] Menu added to Tools menu via Zotero.getMainWindow().document
- [ ] Callback handlers implemented
- [ ] Menu integration follows existing patterns
- [ ] Menu items appear in Tools menu
- [ ] Unit tests verify menu registration

**Verification:**
```bash
npm test -- --grep "MenuIntegration"
```

---

### Phase 6: Item Processing

#### Task 6.1: Create FieldItemProcessor
**File to Create:** `src/zotero/field-item-processor.js`

**Description:**
Unified processor for all field types, extending the existing ItemProcessor pattern.

**Implementation Details:**
```javascript
class FieldItemProcessor {
  constructor() {
    this._fieldRegistry = null;  // Lazy initialization
  }

  // Lazy initialization of field registry
  get fieldRegistry() {
    if (!this._fieldRegistry) {
      this._fieldRegistry = {
        publisher: new (require('../core/publisher-normalizer.js'))(),
        location: new (require('../core/location-normalizer.js'))(),
        journal: new (require('../core/journal-normalizer.js'))()
      };
    }
    return this._fieldRegistry;
  }

  getFieldNormalizer(fieldType) {
    return this.fieldRegistry[fieldType];
  }

  async processItemField(item, fieldType) {
    const normalizer = this.getFieldNormalizer(fieldType);
    const fieldValue = normalizer.extractFieldValue(item);

    if (!fieldValue || !fieldValue.trim()) {
      return null;
    }

    return await normalizer.normalizeFieldValue(fieldValue, item);
  }

  async applyFieldNormalizations(normalizations) {
    const results = [];

    for (const normalization of normalizations) {
      if (!normalization.accepted) continue;

      // FIXED M2: Use Zotero.Items.get() then item.save()
      const item = await Zotero.Items.get(normalization.itemID);
      const normalizer = this.getFieldNormalizer(normalization.fieldType);

      // Update the field value
      await item.setField(normalizer.fieldName, normalization.normalized);

      // Store the learned mapping (scoped)
      await normalizer.learningEngine.storeScopedMapping(
        normalization.original,
        normalization.normalized,
        normalization.fieldType,
        normalization.collectionId || null
      );

      // Save the individual item
      await item.save();

      results.push({
        itemID: normalization.itemID,
        fieldType: normalization.fieldType,
        original: normalization.original,
        normalized: normalization.normalized,
        success: true
      });
    }

    return results;
  }

  async batchProcess(items, fieldType, options = {}) {
    const { progressCallback, batchSize = 100 } = options;
    const results = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      for (const item of batch) {
        const processed = await this.processItemField(item, fieldType);
        if (processed) {
          results.push({
            item: item,
            fieldType,
            result: processed
          });
        }
      }

      if (progressCallback) {
        progressCallback({
          current: Math.min(i + batchSize, items.length),
          total: items.length,
          percent: Math.round((Math.min(i + batchSize, items.length) / items.length) * 100)
        });
      }
    }

    return results;
  }
}
```

**Acceptance Criteria:**
- [ ] Processes items for any field type
- [ ] Batch processing with progress callbacks
- [ ] Applies normalizations to Zotero items using `item.save()`
- [ ] Stores learned mappings with scope
- [ ] Unit tests cover processor behavior

**Risks & Mitigation:**
| Risk | Impact | Mitigation |
|------|--------|------------|
| Large library performance | High | Use batch processing with progress callbacks |

**Verification:**
```bash
npm test -- --grep "FieldItemProcessor"
```

---

### Phase 7: Testing & Polish

#### Task 7.1: Unit Tests
**Files to Create:**

| File | Coverage |
|------|----------|
| `tests/core/field-normalizer.test.js` | Base class behavior |
| `tests/core/publisher-normalizer.test.js` | Publisher normalization |
| `tests/core/location-normalizer.test.js` | Location normalization |
| `tests/core/journal-normalizer.test.js` | Journal normalization |
| `tests/core/field-variant-generator.test.js` | Variant generation |
| `tests/zotero/collection-manager.test.js` | Collection management |
| `tests/zotero/field-item-processor.test.js` | Item processing |
| `tests/ui/field-normalizer-dialog.test.js` | Dialog behavior |

**Test Coverage Requirements:**
- [ ] Each normalizer: 80%+ coverage
- [ ] Each normalizer: All public methods tested
- [ ] Edge cases: null values, empty strings, malformed data
- [ ] Integration: Full workflow tests

**Example Test (following existing patterns):**
```javascript
describe('PublisherNormalizer', () => {
  describe('generateVariants', () => {
    it('should normalize ampersands to "and"', () => {
      const normalizer = new PublisherNormalizer();
      const parsed = normalizer.parseFieldValue('Smith & Jones Publishing');
      const variants = normalizer.generateVariants(parsed);
      expect(variants).to.include('Smith and Jones Publishing');
    });

    it('should expand common abbreviations', () => {
      const normalizer = new PublisherNormalizer();
      const parsed = normalizer.parseFieldValue('Test Co.');
      const variants = normalizer.generateVariants(parsed);
      expect(variants).to.include('Test Company');
    });
  });
});
```

---

#### Task 7.2: Integration Tests
**Files to Create/Modify:**

| File | Description |
|------|-------------|
| `tests/integration/field-normalization.test.js` | Full workflow tests |
| `tests/integration/dialog-workflow.test.js` | Dialog integration |
| `tests/integration/menu-integration.test.js` | Menu integration |

**Integration Test Scenarios:**
1. Select items -> Open dialog -> Select field type -> Apply normalization -> Verify item updated
2. Normalize publisher with multi-value string
3. Normalize location with state abbreviations
4. Normalize journal with abbreviation expansion
5. Test collection scope limitation

---

#### Task 7.3: Performance Testing
**Description:**
Verify performance meets requirements for batch processing.

**Performance Tests:**
```javascript
describe('Performance', () => {
  it('should process 1000 items in under 30 seconds', async () => {
    const items = generateMockItems(1000);
    const processor = new FieldItemProcessor();
    const startTime = Date.now();

    await processor.batchProcess(items, 'publisher');

    const duration = Date.now() - startTime;
    expect(duration).to.be.lessThan(30000);
  });
});
```

**Acceptance Criteria:**
- [ ] 1000 items processed in under 30 seconds
- [ ] Memory usage stays under 100MB
- [ ] No UI blocking during processing
- [ ] Progress updates every batch

---

#### Task 7.4: Documentation
**Files to Create:**

| File | Description |
|------|-------------|
| `docs/FIELD_NORMALIZATION.md` | User documentation |
| `docs/ARCHITECTURE.md` | Developer documentation |
| `CHANGELOG.md` | Release notes |

**Documentation Sections:**
1. Overview of field normalization features
2. Usage guide for each field type
3. Collection scope explanation
4. API reference for developers
5. Troubleshooting guide

---

## Files to Create/Modify

### New Files to Create

| # | File Path | Purpose |
|---|-----------|---------|
| 1 | `src/core/field-normalizer.js` | Base class for field normalizers (factory pattern) |
| 2 | `src/core/field-variant-generator.js` | Extended variant generator |
| 3 | `src/config/field-constants.js` | Field-specific constants |
| 4 | `src/core/publisher-normalizer.js` | Publisher normalization logic |
| 5 | `src/core/location-normalizer.js` | Location normalization logic |
| 6 | `src/core/journal-normalizer.js` | Journal normalization logic |
| 7 | `src/zotero/collection-manager.js` | Collection API integration |
| 8 | `src/ui/field-normalizer-dialog.js` | Field selection dialog JS class |
| 9 | `src/zotero/field-item-processor.js` | Unified field processor |
| 10 | `docs/FIELD_NORMALIZATION.md` | User documentation |
| 11 | `docs/ARCHITECTURE.md` | Developer documentation |

### Files to Modify

| # | File Path | Changes |
|---|-----------|---------|
| 1 | `src/core/learning-engine.js` | Add scoped mapping methods and separate storage |
| 2 | `src/zotero/menu-integration.js` | Add field-specific menu items via Zotero API |
| 3 | `content/dialog.html` | Add field selection UI sections (REPLACES deprecated file) |
| 4 | `content/scripts/zotero-ner.js` | Register new components |
| 5 | `src/index.js` | Export new modules |

### Test Files to Create

| # | File Path |
|---|-----------|
| 1 | `tests/core/field-normalizer.test.js` |
| 2 | `tests/core/publisher-normalizer.test.js` |
| 3 | `tests/core/location-normalizer.test.js` |
| 4 | `tests/core/journal-normalizer.test.js` |
| 5 | `tests/core/field-variant-generator.test.js` |
| 6 | `tests/zotero/collection-manager.test.js` |
| 7 | `tests/zotero/field-item-processor.test.js` |
| 8 | `tests/ui/field-normalizer-dialog.test.js` |
| 9 | `tests/integration/field-normalization.test.js` |

---

## Commit Strategy

| Phase | Commit Message | Files |
|-------|----------------|-------|
| 1 | `feat: add field normalizer base classes` | `src/core/field-normalizer.js`, `src/core/field-variant-generator.js`, `src/config/field-constants.js` |
| 2 | `feat: extend learning engine with scoped mappings` | `src/core/learning-engine.js` |
| 2 | `feat: add collection manager` | `src/zotero/collection-manager.js` |
| 3 | `feat: implement publisher normalizer` | `src/core/publisher-normalizer.js` |
| 3 | `feat: implement location normalizer` | `src/core/location-normalizer.js` |
| 3 | `feat: implement journal normalizer` | `src/core/journal-normalizer.js` |
| 4 | `feat: add field normalizer dialog` | `src/ui/field-normalizer-dialog.js`, `content/dialog.html` |
| 5 | `feat: add field-specific menu items` | `src/zotero/menu-integration.js` |
| 6 | `feat: add field item processor` | `src/zotero/field-item-processor.js` |
| 7 | `test: add field normalizer tests` | `tests/**/*.test.js` |
| 7 | `docs: add field normalization documentation` | `docs/*.md` |

---

## Success Criteria

### Functional Success Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| Publisher normalization works | 100% | All test cases pass |
| Location normalization works | 100% | All test cases pass |
| Journal normalization works | 100% | All test cases pass |
| Collection scope works | 100% | Scope-aware tests pass |
| Learned mappings persist | 100% | Storage/retrieval tests pass |
| Batch processing works | 1000 items/30s | Performance tests pass |

### Quality Success Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| New code coverage | 80%+ | Istanbul/coverage report |
| Existing tests pass | 100% | npm test |
| Linting passes | 0 errors | ESLint |

### User Experience Success Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| Dialog loads | < 2s | Performance test |
| Menu items visible | All 3 shown | Manual verification |
| Progress indicators | Working | Integration test |
| Error messages | Helpful | Code review |

---

## Risks and Mitigation Summary

| Risk | Category | Impact | Probability | Mitigation |
|------|----------|--------|-------------|------------|
| Zotero API changes | Technical | Medium | Low | Use try-catch, abstraction layer |
| Performance degradation | Performance | Medium | Medium | Batch processing, progress callbacks |
| Test coverage below 80% | Quality | Medium | Low | TDD approach, CI enforcement |
| Breaking existing functionality | Regression | High | Low | Comprehensive test suite |
| UI complexity growth | Maintainability | Medium | Medium | Keep logic in normalizers, not dialog |
| Memory usage too high | Performance | Medium | Low | Caching limits, garbage collection |
| NLM database unavailable | Feature | Low | Medium | Heuristic fallback implemented |

---

## Verification Commands

```bash
# Run all tests
npm test

# Run field normalizer tests
npm test -- --grep "FieldNormalizer"
npm test -- --grep "PublisherNormalizer"
npm test -- --grep "LocationNormalizer"
npm test -- --grep "JournalNormalizer"

# Run integration tests
npm test -- --grep "integration"

# Run performance tests
npm test -- --grep "Performance"

# Run linting
npm run lint

# Check coverage
npm run coverage
```

---

## Summary of Key Fixes Applied

| Issue | Original | Fixed |
|-------|----------|-------|
| **C1 Syntax** | `if.alreadyLearned` | `if (result.processed && result.processed.alreadyLearned)` |
| **C2 File** | `content/scripts/normalization-dialog-controller.js` | `content/dialog.html` |
| **C3 Storage** | Fallback to global | Separate storage key, NO fallback |
| **C4 API** | `Zotero.Collections.getCollections()` | `Zotero.Collections.get()` with iteration |
| **C5 Dependencies** | Direct instantiation | Factory pattern with lazy initialization |
| **M1 Menu** | `registerMenuItem()` | `Zotero.getMainWindow().document.createElement()` |
| **M2 Item Save** | `Zotero.Items.saveAll()` | Loop with `item.save()` |
| **M3 ScopedLearningEngine** | Separate class | Integrated into LearningEngine |
| **M4 Tests** | Unknown pattern | Jest mocks per `tests/zotero/*.test.js` |

---

*Plan Version: 2.0 (Revised)*
*Created: 2026-02-09*
*Author: Prometheus - Strategic Planning Consultant*
*Based on Critic Feedback and Architect Consultation*
